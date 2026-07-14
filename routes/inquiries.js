const express = require('express');
const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/inquiries
// @desc    Create new inquiry
// @access  Public
// Helper to map contact form subject values to valid inquiry type enums
const mapSubjectToType = (subject) => {
  if (!subject) return 'general';
  const s = subject.toLowerCase();
  if (s.includes('technical') || s.includes('support')) return 'technical';
  if (s.includes('warranty')) return 'warranty';
  if (s.includes('factory-visit') || s.includes('factory visit')) return 'factory-visit';
  if (s.includes('complaint')) return 'complaint';
  if (s.includes('feedback')) return 'feedback';
  if (s.includes('general')) return 'general';
  if (s.includes('quote') || s.includes('pricing')) return 'quote';
  // product-inquiry, half-dala, bhoosi-tank, balwan-tank, etc.
  return 'product';
};

router.post('/', [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('contactInfo.name').trim().notEmpty().withMessage('Name is required'),
  body('contactInfo.email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('contactInfo.phone').trim().notEmpty().withMessage('Phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { type, subject, message, priority = 'medium', product, contactInfo, metadata } = req.body;

    // Auto-derive type from subject if not explicitly provided
    const resolvedType = type && ['general', 'product', 'technical', 'warranty', 'complaint', 'feedback', 'factory-visit', 'quote'].includes(type)
      ? type
      : mapSubjectToType(subject);

    // Create inquiry
    const inquiry = new Inquiry({
      type: resolvedType,
      subject,
      message,
      priority,
      product,
      contactInfo,
      metadata: {
        ...metadata,
        source: metadata?.source || 'website',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // If user is authenticated, associate with user
    if (req.user) {
      inquiry.user = req.user.id;
    }

    await inquiry.save();

    // Send confirmation email to customer
    try {
      await sendEmail({
        to: contactInfo.email,
        subject: 'Inquiry Received - Vishwakarma Foundry Works',
        html: emailTemplates.inquiryReceived(contactInfo.name, type, subject)
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    // Send notification to admin
    try {
      await sendEmail({
        to: process.env.FROM_EMAIL,
        subject: `New Inquiry: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Inquiry Received</h2>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>From:</strong> ${contactInfo.name} (${contactInfo.email})</p>
            <p><strong>Phone:</strong> ${contactInfo.phone}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
            <a href="${process.env.FRONTEND_URL}/admin/inquiries/${inquiry._id}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Inquiry
            </a>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. We will respond within 24 hours.',
      inquiryId: inquiry._id
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting inquiry'
    });
  }
});

// @route   GET /api/inquiries
// @desc    Get all inquiries (with filtering and pagination)
// @access  Private/Admin
router.get('/', [
  auth,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Search functionality
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'contactInfo.name': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const inquiries = await Inquiry.find(query)
      .populate('user', 'name email phone')
      .populate('product', 'name slug')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Inquiry.countDocuments(query);

    res.json({
      success: true,
      count: inquiries.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      inquiries
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiries'
    });
  }
});

// @route   GET /api/inquiries/:id
// @desc    Get single inquiry by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('user', 'name email phone company')
      .populate('product', 'name slug images specifications')
      .populate('responses.responder', 'name role')
      .populate('assignedTo', 'name email')
      .populate('internalNotes.addedBy', 'name');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check if user has permission to view this inquiry
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && inquiry.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      inquiry
    });
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry'
    });
  }
});

// @route   PUT /api/inquiries/:id
// @desc    Update inquiry (status, assignment, etc.)
// @access  Private/Admin
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('status').optional().isIn(['pending', 'in-progress', 'resolved', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const updateData = req.body;

    // Add timeline entry for status change
    if (updateData.status && updateData.status !== inquiry.status) {
      inquiry.timeline.push({
        status: updateData.status,
        title: `Status changed to ${updateData.status}`,
        description: `Status updated by ${req.user.name}`,
        updatedBy: req.user.id
      });
    }

    // Update inquiry
    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      inquiry: updatedInquiry
    });
  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inquiry'
    });
  }
});

// @route   POST /api/inquiries/:id/responses
// @desc    Add response to inquiry
// @access  Private/Admin
router.post('/:id/responses', [
  auth,
  authorize('admin', 'manager'),
  body('message').trim().notEmpty().withMessage('Response message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message, attachments } = req.body;
    const inquiryId = req.params.id;

    const inquiry = await Inquiry.findById(inquiryId);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Add response
    inquiry.responses.push({
      message,
      responder: req.user.id,
      responderRole: req.user.role,
      attachments: attachments || [],
      createdAt: new Date()
    });

    // Update status to in-progress if it was pending
    if (inquiry.status === 'pending') {
      inquiry.status = 'in-progress';
      inquiry.timeline.push({
        status: 'in-progress',
        title: 'Response sent',
        description: `Response sent by ${req.user.name}`,
        updatedBy: req.user.id
      });
    }

    await inquiry.save();

    // Send email notification to customer
    try {
      await sendEmail({
        to: inquiry.contactInfo.email,
        subject: `Response to your inquiry: ${inquiry.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Response to Your Inquiry</h2>
            <p>Hello ${inquiry.contactInfo.name},</p>
            <p>We have responded to your inquiry: <strong>${inquiry.subject}</strong></p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p>${message}</p>
            </div>
            <p>You can view the full conversation on our website.</p>
            <a href="${process.env.FRONTEND_URL}/inquiries/${inquiryId}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Inquiry
            </a>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending response email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Response added successfully',
      inquiry
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding response'
    });
  }
});

// @route   POST /api/inquiries/:id/notes
// @desc    Add internal note to inquiry
// @access  Private/Admin
router.post('/:id/notes', [
  auth,
  authorize('admin', 'manager'),
  body('note').trim().notEmpty().withMessage('Note is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { note } = req.body;
    const inquiryId = req.params.id;

    const inquiry = await Inquiry.findById(inquiryId);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Add internal note
    inquiry.internalNotes.push({
      note,
      addedBy: req.user.id,
      addedAt: new Date()
    });

    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Internal note added successfully'
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding internal note'
    });
  }
});

// @route   GET /api/inquiries/user/:userId
// @desc    Get inquiries for a specific user
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Check if user is requesting their own inquiries or is admin
    if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { user: userId };
    if (status) query.status = status;

    const inquiries = await Inquiry.find(query)
      .populate('product', 'name slug images.url')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('type subject status priority createdAt product responses');

    const total = await Inquiry.countDocuments(query);

    res.json({
      success: true,
      count: inquiries.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      inquiries
    });
  } catch (error) {
    console.error('Get user inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user inquiries'
    });
  }
});

// @route   DELETE /api/inquiries/:id
// @desc    Delete inquiry
// @access  Private/Admin
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    await Inquiry.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting inquiry'
    });
  }
});

module.exports = router;
