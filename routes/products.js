const express = require('express');
const Product = require('../models/Product');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const cache = require('../utils/cache');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering, sorting, and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      subcategory,
      minPrice,
      maxPrice,
      featured,
      popular,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build query
    const query = { status: 'active' };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (featured === 'true') query.featured = true;
    if (popular === 'true') query.popular = true;

    // Price range filter
    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const products = await Product.find(query)
      .populate('relatedProducts', 'name slug images.url')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-reviews -internalNotes');

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    const responseData = {
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products
    };

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const cacheKey = 'products:featured';
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const products = await Product.find({ 
      status: 'active', 
      featured: true 
    })
    .select('name slug description pricing images category subcategory rating')
    .sort({ 'rating.average': -1, createdAt: -1 })
    .limit(6);

    const responseData = {
      success: true,
      products
    };

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
});

// @route   GET /api/products/admin/all
// @desc    Get all products (any status) for admin management
// @access  Private/Admin
router.get('/admin/all', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-reviews');

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products
    });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// @route   GET /api/products/:slug
// @desc    Get single product by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const cacheKey = `products:slug:${req.params.slug}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const product = await Product.findOne({ 
      slug: req.params.slug, 
      status: 'active' 
    })
    .populate('relatedProducts', 'name slug images.url pricing.basePrice')
    .populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count (you could add this field to the schema)
    // await Product.findByIdAndUpdate(product._id, { $inc: { views: 1 } });

    const responseData = {
      success: true,
      product
    };

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
});

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const cacheKey = `products:category:${category}:${JSON.stringify(req.query)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const query = { 
      category, 
      status: 'active' 
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('name slug description pricing images rating featured');

    const total = await Product.countDocuments(query);

    const responseData = {
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products
    };

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products by category'
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Admin
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['grain-processor', 'storage-tank', 'threshing-machine', 'spare-parts', 'other']).withMessage('Invalid category'),
  body('pricing.basePrice').isNumeric().withMessage('Base price must be a number'),
  body('specifications.capacity').notEmpty().withMessage('Capacity is required'),
  body('specifications.power').notEmpty().withMessage('Power requirement is required'),
  body('specifications.size').notEmpty().withMessage('Size is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const productData = req.body;

    // Generate slug if not provided
    if (!productData.slug) {
      const slugify = require('slugify');
      productData.slug = slugify(productData.name, { lower: true, strict: true });
    }

    // Check if slug already exists
    const existingProduct = await Product.findOne({ slug: productData.slug });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this slug already exists'
      });
    }

    const product = new Product(productData);
    await product.save();

    cache.clear('products:');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('pricing.basePrice').optional().isNumeric().withMessage('Base price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = req.body;

    // Update slug if name changed
    if (updateData.name && updateData.name !== product.name) {
      const slugify = require('slugify');
      updateData.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    cache.clear('products:');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Recursively gather all publicIds to delete associated files from Supabase Storage
    const pathsToDelete = [];
    const extractPublicIds = (obj) => {
      if (!obj) return;
      if (typeof obj === 'object') {
        if (obj.publicId && typeof obj.publicId === 'string') {
          pathsToDelete.push(obj.publicId);
        }
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            extractPublicIds(obj[key]);
          }
        }
      }
    };
    extractPublicIds(product);

    if (pathsToDelete.length > 0) {
      try {
        const supabase = require('../utils/supabase');
        const { error: storageError } = await supabase.storage
          .from('vishwakarma')
          .remove(pathsToDelete);
        
        if (storageError) {
          console.error('Error deleting product files from Supabase Storage:', storageError.message);
        } else {
          console.log(`Successfully deleted ${pathsToDelete.length} files from Supabase Storage for product: ${product.name}`);
        }
      } catch (err) {
        console.error('Failed to remove storage files during product deletion:', err.message || err);
      }
    }

    // Hard delete from database
    await Product.findByIdAndDelete(req.params.id);

    cache.clear('products:');

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Add review to product
// @access  Private
router.post('/:id/reviews', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { rating, comment } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.id,
      rating,
      comment,
      verified: true
    });

    // Calculate new average rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating.average = totalRating / product.reviews.length;
    product.rating.count = product.reviews.length;

    await product.save();

    cache.clear('products:');

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      rating: product.rating
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review'
    });
  }
});

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q: query, category, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const cacheKey = `products:search:${JSON.stringify(req.query)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const searchQuery = {
      $text: { $search: query },
      status: 'active'
    };

    if (category) {
      searchQuery.category = category;
    }

    const products = await Product.find(searchQuery)
      .select('name slug description pricing images rating category')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });

    const responseData = {
      success: true,
      count: products.length,
      products
    };

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products'
    });
  }
});

module.exports = router;
