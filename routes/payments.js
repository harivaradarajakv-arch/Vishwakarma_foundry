const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/payments/create-payment-intent
// @desc    Create Stripe payment intent
// @access  Private
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and order ID are required'
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order || order.user._id.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'inr',
      metadata: {
        orderId: orderId,
        userId: req.user.id
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent'
    });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment and update order
// @access  Private
router.post('/confirm', auth, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID and order ID are required'
      });
    }

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    // Update order
    const order = await Order.findById(orderId);
    if (!order || order.user._id.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.paymentStatus = 'paid';
    order.paymentDetails = {
      transactionId: paymentIntent.id,
      paymentDate: new Date(),
      amount: paymentIntent.amount / 100,
      method: 'online',
      status: 'completed'
    };

    order.timeline.push({
      status: 'confirmed',
      title: 'Payment Confirmed',
      description: 'Payment received successfully',
      updatedBy: req.user.id
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      order
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment'
    });
  }
});

// @route   POST /api/payments/refund
// @desc    Process refund
// @access  Private/Admin
router.post('/refund', auth, async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
      reason: reason || 'requested_by_customer',
      metadata: {
        processedBy: req.user.id,
        processedAt: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund'
    });
  }
});

// @route   GET /api/payments/payment-methods
// @desc    Get available payment methods
// @access  Public
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'bank-transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer to our account',
        icon: 'bank',
        enabled: true
      },
      {
        id: 'cash-on-delivery',
        name: 'Cash on Delivery',
        description: 'Pay when you receive your order',
        icon: 'cash',
        enabled: true
      },
      {
        id: 'online',
        name: 'Online Payment',
        description: 'Pay securely using credit/debit cards, UPI, net banking',
        icon: 'credit-card',
        enabled: true
      },
      {
        id: 'cheque',
        name: 'Cheque',
        description: 'Pay by cheque',
        icon: 'document',
        enabled: true
      },
      {
        id: 'demand-draft',
        name: 'Demand Draft',
        description: 'Pay by demand draft',
        icon: 'document',
        enabled: true
      },
      {
        id: 'emi',
        name: 'EMI Available',
        description: 'Easy monthly installments',
        icon: 'calendar',
        enabled: true
      }
    ];

    res.json({
      success: true,
      paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods'
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Stripe webhook handler
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      
      // Update order status
      try {
        const orderId = paymentIntent.metadata.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'paid',
            paymentDetails: {
              transactionId: paymentIntent.id,
              paymentDate: new Date(),
              amount: paymentIntent.amount / 100,
              method: 'online',
              status: 'completed'
            }
          });
        }
      } catch (error) {
        console.error('Error updating order after webhook:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      console.log('PaymentIntent failed!', failedPaymentIntent.id);
      
      // Update order status
      try {
        const orderId = failedPaymentIntent.metadata.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'failed',
            paymentDetails: {
              transactionId: failedPaymentIntent.id,
              paymentDate: new Date(),
              amount: failedPaymentIntent.amount / 100,
              method: 'online',
              status: 'failed'
            }
          });
        }
      } catch (error) {
        console.error('Error updating order after failed webhook:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router;
