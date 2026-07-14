const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', [
  auth,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress.name').trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingAddress.phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid Indian phone number'),
  body('shippingAddress.address.street').trim().notEmpty().withMessage('Street address is required'),
  body('shippingAddress.address.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.address.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.address.pincode').trim().notEmpty().withMessage('Pincode is required'),
  body('paymentMethod').isIn(['bank-transfer', 'cash-on-delivery', 'cheque', 'demand-draft', 'online', 'emi']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { items, shippingAddress, billingAddress, paymentMethod, installation, notes } = req.body;

    // Validate products and calculate pricing
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product} is not available`
        });
      }

      const itemTotal = item.quantity * (item.price || product.pricing.basePrice);
      subtotal += itemTotal;

      validatedItems.push({
        product: product._id,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price || product.pricing.basePrice,
        discount: item.discount || 0,
        total: itemTotal
      });
    }

    // Calculate totals
    const discount = 0; // You can implement discount logic here
    const tax = subtotal * 0.18; // 18% GST
    const shipping = 0; // You can calculate shipping based on location
    const installationCost = installation?.required ? 5000 : 0; // Example installation cost
    const total = subtotal - discount + tax + shipping + installationCost;

    // Create order
    const order = new Order({
      user: req.user.id,
      items: validatedItems,
      pricing: {
        subtotal,
        discount,
        tax,
        shipping,
        installation: installationCost,
        total
      },
      shippingAddress,
      billingAddress,
      paymentMethod,
      installation,
      notes,
      timeline: [{
        status: 'pending',
        title: 'Order Placed',
        description: 'Your order has been received and is being processed',
        updatedBy: req.user.id
      }]
    });

    await order.save();

    // Send order confirmation email
    try {
      await sendEmail({
        to: req.user.email,
        subject: `Order Confirmation #${order.orderNumber}`,
        html: emailTemplates.orderConfirmation(
          order.orderNumber,
          req.user.name,
          validatedItems.map(item => ({
            name: items.find(i => i.product === item.product._id.toString())?.name || 'Product',
            quantity: item.quantity,
            price: item.total
          }))
        )
      });
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
    }

    // Send notification to admin
    try {
      await sendEmail({
        to: process.env.FROM_EMAIL,
        subject: `New Order #${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Order Received</h2>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Customer:</strong> ${req.user.name}</p>
            <p><strong>Email:</strong> ${req.user.email}</p>
            <p><strong>Phone:</strong> ${shippingAddress.phone}</p>
            <p><strong>Total Amount:</strong> ₹${total}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <a href="${process.env.FRONTEND_URL}/admin/orders/${order._id}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Order
            </a>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error placing order'
    });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (with filtering and pagination)
// @access  Private/Admin
router.get('/', [
  auth,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      paymentMethod,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name slug images.url')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone company')
      .populate('items.product', 'name slug images specifications')
      .populate('timeline.updatedBy', 'name role')
      .populate('installation.technician', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to view this order
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status
// @access  Private/Admin
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('status').isIn(['pending', 'confirmed', 'manufacturing', 'quality-check', 'ready', 'shipped', 'delivered', 'installed', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('paymentStatus').optional().isIn(['pending', 'partial', 'paid', 'refunded', 'failed']).withMessage('Invalid payment status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const { status, paymentStatus, tracking, notes } = req.body;
    const updateData = {};

    // Update status
    if (status && status !== order.status) {
      updateData.status = status;
      
      // Add timeline entry
      const statusTitles = {
        'confirmed': 'Order Confirmed',
        'manufacturing': 'Manufacturing Started',
        'quality-check': 'Quality Check',
        'ready': 'Ready for Delivery',
        'shipped': 'Order Shipped',
        'delivered': 'Order Delivered',
        'installed': 'Installation Completed',
        'completed': 'Order Completed',
        'cancelled': 'Order Cancelled'
      };

      order.timeline.push({
        status,
        title: statusTitles[status] || `Status changed to ${status}`,
        description: `Status updated by ${req.user.name}`,
        updatedBy: req.user.id
      });
    }

    // Update payment status
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    // Update tracking information
    if (tracking) {
      updateData.tracking = { ...order.tracking, ...tracking };
    }

    // Update notes
    if (notes) {
      updateData.notes = { ...order.notes, ...notes };
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

    // Send status update email to customer
    if (status && status !== order.status) {
      try {
        await sendEmail({
          to: updatedOrder.user.email,
          subject: `Order #${updatedOrder.orderNumber} Status Update`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Order Status Update</h2>
              <p>Hello ${updatedOrder.user.name},</p>
              <p>Your order #${updatedOrder.orderNumber} status has been updated to: <strong>${status}</strong></p>
              <p>You can track your order progress on our website.</p>
              <a href="${process.env.FRONTEND_URL}/orders/${updatedOrder._id}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Track Order
              </a>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order'
    });
  }
});

// @route   GET /api/orders/user/:userId
// @desc    Get orders for a specific user
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check if user is requesting their own orders or is admin
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { user: userId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('items.product', 'name slug images.url')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('orderNumber status paymentStatus pricing.total createdAt items timeline');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user orders'
    });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.post('/:id/cancel', [
  auth,
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user can cancel this order
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'installed', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled in current status'
      });
    }

    // Update order
    order.status = 'cancelled';
    order.cancellation = {
      reason,
      requestedBy: req.user.id,
      requestedAt: new Date(),
      approvedBy: req.user.role === 'admin' || req.user.role === 'manager' ? req.user.id : null,
      approvedAt: req.user.role === 'admin' || req.user.role === 'manager' ? new Date() : null
    };

    order.timeline.push({
      status: 'cancelled',
      title: 'Order Cancelled',
      description: `Order cancelled by ${req.user.name}. Reason: ${reason}`,
      updatedBy: req.user.id
    });

    await order.save();

    // Send cancellation email
    try {
      await sendEmail({
        to: order.user.email,
        subject: `Order #${order.orderNumber} Cancelled`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Order Cancelled</h2>
            <p>Hello ${order.user.name},</p>
            <p>Your order #${order.orderNumber} has been cancelled.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
});

module.exports = router;
