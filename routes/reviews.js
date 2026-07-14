const express = require('express');
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');
const { auth, authorize } = require('../middleware/auth');
const cache = require('../utils/cache');

const router = express.Router();

// @route   POST /api/reviews
// @desc    Submit a global review or product review
// @access  Public (Optional Auth)
router.post('/', async (req, res) => {
  try {
    const { type, rating, comment, guestInfo, productName } = req.body;

    if (!['brand', 'product'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Review type must be brand or product.' });
    }

    if (type === 'product' && !productName) {
      return res.status(400).json({ success: false, message: 'Product name must be provided for product reviews.' });
    }

    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Just fail silently for auth, treat as guest if parsing fails
      }
    }

    if (!userId && (!guestInfo || !guestInfo.name || !guestInfo.phone)) {
      return res.status(400).json({ success: false, message: 'Name and Phone are required for anonymous submissions.' });
    }

    const review = await Review.create({
      type,
      productName,
      rating,
      comment,
      user: userId,
      guestInfo: userId ? undefined : guestInfo
    });

    cache.clear('reviews:');

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Server error creating review.' });
  }
});

// @route   GET /api/reviews
// @desc    Get all reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.productName) filter.productName = req.query.productName;

    const cacheKey = `reviews:list:${JSON.stringify(req.query)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name email phone avatar')
      .sort({ createdAt: -1 });

    const responseData = { success: true, data: reviews };
    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving reviews' });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete a review
// @access  Admin
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    cache.clear('reviews:');

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting review' });
  }
});

module.exports = router;
