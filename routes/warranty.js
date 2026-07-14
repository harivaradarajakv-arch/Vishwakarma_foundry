const express = require('express');
const Warranty = require('../models/Warranty');
const Product = require('../models/Product');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/warranty/register
// @desc    Register product warranty
// @access  Private
router.post('/register', [
  auth,
  body('product').notEmpty().withMessage('Product ID is required'),
  body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
  body('purchaseDate').isISO8601().withMessage('Valid purchase date is required'),
  body('installationDate').optional().isISO8601().withMessage('Valid installation date is required'),
  body('dealerName').trim().notEmpty().withMessage('Dealer name is required'),
  body('dealerContact').trim().notEmpty().withMessage('Dealer contact is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      product,
      serialNumber,
      purchaseDate,
      installationDate,
      dealerName,
      dealerContact,
      installationAddress,
      notes
    } = req.body;

    // Verify product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if warranty already exists for this serial number
    const existingWarranty = await Warranty.findOne({ serialNumber });
    if (existingWarranty) {
      return res.status(400).json({
        success: false,
        message: 'Warranty already registered for this serial number'
      });
    }

    // Calculate warranty expiry date
    const warrantyDuration = productDoc.warranty?.duration || 12; // Default 12 months
    const warrantyExpiry = new Date(purchaseDate);
    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyDuration);

    // Generate warranty number
    const warrantyNumber = `VFW-WR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create warranty registration
    const warranty = new Warranty({
      user: req.user.id,
      product: product,
      serialNumber,
      warrantyNumber,
      purchaseDate: new Date(purchaseDate),
      installationDate: installationDate ? new Date(installationDate) : null,
      expiryDate: warrantyExpiry,
      dealerName,
      dealerContact,
      installationAddress,
      notes,
      status: 'active'
    });

    await warranty.save();

    // Send warranty registration confirmation email
    try {
      await sendEmail({
        to: req.user.email,
        subject: `Warranty Registration Confirmation - ${warrantyNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Warranty Registration Successful!</h2>
            <p>Hello ${req.user.name},</p>
            <p>Your product warranty has been successfully registered.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Warranty Number:</strong> ${warrantyNumber}</p>
              <p><strong>Product:</strong> ${productDoc.name}</p>
              <p><strong>Serial Number:</strong> ${serialNumber}</p>
              <p><strong>Warranty Period:</strong> ${warrantyDuration} months</p>
              <p><strong>Expiry Date:</strong> ${warrantyExpiry.toLocaleDateString()}</p>
            </div>
            <p>Please keep this warranty certificate safe for future reference.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending warranty confirmation email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Warranty registered successfully',
      warranty
    });
  } catch (error) {
    console.error('Register warranty error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering warranty'
    });
  }
});

// @route   GET /api/warranty
// @desc    Get user's warranties
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user.id };
    if (status) query.status = status;

    const warranties = await Warranty.find(query)
      .populate('product', 'name slug images.url specifications')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Warranty.countDocuments(query);

    res.json({
      success: true,
      count: warranties.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      warranties
    });
  } catch (error) {
    console.error('Get warranties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching warranties'
    });
  }
});

// @route   GET /api/warranty/:id
// @desc    Get warranty by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id)
      .populate('product', 'name slug images specifications warranty')
      .populate('user', 'name email phone');

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    // Check if user has permission to view this warranty
    if (req.user.role !== 'admin' && warranty.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      warranty
    });
  } catch (error) {
    console.error('Get warranty error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching warranty'
    });
  }
});

// @route   POST /api/warranty/:id/claim
// @desc    File warranty claim
// @access  Private
router.post('/:id/claim', [
  auth,
  body('issue').trim().notEmpty().withMessage('Issue description is required'),
  body('issueType').isIn(['manufacturing-defect', 'performance-issue', 'damage', 'other']).withMessage('Invalid issue type'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { issue, issueType, priority, description, attachments } = req.body;
    const warrantyId = req.params.id;

    const warranty = await Warranty.findById(warrantyId);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    // Check if user has permission
    if (req.user.role !== 'admin' && warranty.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if warranty is still valid
    if (warranty.status !== 'active' || warranty.expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Warranty is not active or has expired'
      });
    }

    // Add claim to warranty
    warranty.claims.push({
      issue,
      issueType,
      priority,
      description,
      attachments: attachments || [],
      status: 'pending',
      submittedAt: new Date()
    });

    warranty.status = 'claim-pending';
    await warranty.save();

    // Send claim confirmation email
    try {
      await sendEmail({
        to: req.user.email,
        subject: `Warranty Claim Received - ${warranty.warrantyNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Warranty Claim Received</h2>
            <p>Hello ${req.user.name},</p>
            <p>Your warranty claim has been received and is being processed.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Claim ID:</strong> ${warranty.claims[warranty.claims.length - 1]._id}</p>
              <p><strong>Warranty Number:</strong> ${warranty.warrantyNumber}</p>
              <p><strong>Issue Type:</strong> ${issueType}</p>
              <p><strong>Priority:</strong> ${priority}</p>
              <p><strong>Status:</strong> Pending</p>
            </div>
            <p>We will contact you within 24 hours to discuss your claim.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending claim confirmation email:', emailError);
    }

    // Send notification to admin
    try {
      await sendEmail({
        to: process.env.FROM_EMAIL,
        subject: `New Warranty Claim - ${warranty.warrantyNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Warranty Claim</h2>
            <p><strong>Warranty Number:</strong> ${warranty.warrantyNumber}</p>
            <p><strong>Customer:</strong> ${req.user.name}</p>
            <p><strong>Issue Type:</strong> ${issueType}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Issue:</strong> ${issue}</p>
            <a href="${process.env.FRONTEND_URL}/admin/warranty/${warrantyId}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Claim
            </a>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Warranty claim submitted successfully',
      claimId: warranty.claims[warranty.claims.length - 1]._id
    });
  } catch (error) {
    console.error('File warranty claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Error filing warranty claim'
    });
  }
});

// @route   GET /api/warranty/admin/all
// @desc    Get all warranties (admin only)
// @access  Private/Admin
router.get('/admin/all', [
  auth,
  require('../middleware/auth').authorize('admin')
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      claimStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (claimStatus) query['claims.status'] = claimStatus;

    // Search functionality
    if (search) {
      query.$or = [
        { warrantyNumber: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const warranties = await Warranty.find(query)
      .populate('user', 'name email phone')
      .populate('product', 'name slug images.url')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Warranty.countDocuments(query);

    res.json({
      success: true,
      count: warranties.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      warranties
    });
  } catch (error) {
    console.error('Get all warranties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching warranties'
    });
  }
});

// @route   PUT /api/warranty/admin/:id/claim/:claimId
// @desc    Update warranty claim status (admin only)
// @access  Private/Admin
router.put('/admin/:id/claim/:claimId', [
  auth,
  require('../middleware/auth').authorize('admin'),
  require('express-validator').body('status').isIn(['pending', 'in-progress', 'resolved', 'rejected']).withMessage('Invalid status'),
  require('express-validator').body('resolution').optional().trim().notEmpty().withMessage('Resolution cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, resolution, notes } = req.body;
    const { id, claimId } = req.params;

    const warranty = await Warranty.findById(id);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    // Find and update the specific claim
    const claim = warranty.claims.id(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    claim.status = status;
    claim.resolvedAt = status === 'resolved' ? new Date() : null;
    claim.resolvedBy = req.user.id;
    claim.resolution = resolution;
    claim.notes = notes;

    // Update warranty status if all claims are resolved
    const allClaimsResolved = warranty.claims.every(c => c.status === 'resolved');
    if (allClaimsResolved) {
      warranty.status = 'active';
    } else if (warranty.claims.some(c => c.status === 'in-progress')) {
      warranty.status = 'claim-in-progress';
    }

    await warranty.save();

    // Send status update email to customer
    try {
      await sendEmail({
        to: warranty.user.email,
        subject: `Warranty Claim Update - ${warranty.warrantyNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Warranty Claim Update</h2>
            <p>Hello ${warranty.user.name},</p>
            <p>Your warranty claim status has been updated to: <strong>${status}</strong></p>
            ${resolution ? `<p><strong>Resolution:</strong> ${resolution}</p>` : ''}
            <p>You can track your claim status on our website.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending claim update email:', emailError);
    }

    res.json({
      success: true,
      message: 'Claim status updated successfully',
      warranty
    });
  } catch (error) {
    console.error('Update warranty claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating warranty claim'
    });
  }
});

module.exports = router;
