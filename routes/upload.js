const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const supabase = require('../utils/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();

const BUCKET_NAME = 'vishwakarma'; // Bucket name in Supabase Storage

// Ensure the bucket exists and is public
const ensureBucketExists = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    
    const exists = buckets.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: [
          'image/jpeg', 
          'image/png', 
          'image/webp', 
          'application/pdf', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: 10 * 1024 * 1024 // 10MB limit
      });
      if (createError) throw createError;
      console.log(`Created Supabase storage bucket: ${BUCKET_NAME}`);
    }
  } catch (err) {
    console.error('Error ensuring Supabase storage bucket exists:', err.message);
  }
};

// Check bucket on startup
ensureBucketExists();

// Multer configured to use Memory Storage so we get the file buffer
const storage = multer.memoryStorage();

const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const uploadDocument = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
});

// Generic helper to upload file buffer to Supabase Storage
const uploadToSupabase = async (buffer, folder, originalName, mimeType) => {
  // Double check bucket existence
  await ensureBucketExists();

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const extension = originalName.split('.').pop();
  const fileName = `${uniqueSuffix}.${extension}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw error;
  }

  // Retrieve the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    publicId: filePath // Keep publicId as the filePath in Supabase
  };
};

// @route   POST /api/upload/images
// @desc    Upload multiple images
// @access  Private
router.post('/images', auth, uploadImage.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const { url, publicId } = await uploadToSupabase(
        file.buffer,
        'products',
        file.originalname,
        file.mimetype
      );
      
      return {
        url: url,
        publicId: publicId,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: 'Images uploaded successfully to Supabase',
      images: uploadedImages
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images to Supabase'
    });
  }
});

// @route   POST /api/upload/documents
// @desc    Upload documents
// @access  Private
router.post('/documents', auth, uploadDocument.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No documents uploaded'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const { url, publicId } = await uploadToSupabase(
        file.buffer,
        'documents',
        file.originalname,
        file.mimetype
      );
      
      return {
        url: url,
        publicId: publicId,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    });

    const uploadedDocuments = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: 'Documents uploaded successfully to Supabase',
      documents: uploadedDocuments
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading documents to Supabase'
    });
  }
});

// @route   POST /api/upload/product-gallery
// @desc    Upload product gallery with optimization
// @access  Private
router.post('/product-gallery', auth, uploadImage.array('gallery', 8), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    // Process images with Sharp for optimization
    const processedImages = await Promise.all(
      req.files.map(async (file, index) => {
        // Upload original first
        const { url: originalUrl, publicId: originalPublicId } = await uploadToSupabase(
          file.buffer,
          'products/original',
          file.originalname,
          file.mimetype
        );

        // Create different sizes
        const sizes = [
          { name: 'thumbnail', width: 150, height: 150 },
          { name: 'medium', width: 500, height: 400 },
          { name: 'large', width: 1200, height: 800 }
        ];

        const processedSizes = {};
        
        for (const size of sizes) {
          const buffer = await sharp(file.buffer)
            .resize(size.width, size.height, { 
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 80 })
            .toBuffer();

          const { url: sizeUrl, publicId: sizePublicId } = await uploadToSupabase(
            buffer,
            `products/${size.name}`,
            `size_${size.name}_${file.originalname}`,
            'image/jpeg'
          );

          processedSizes[size.name] = {
            url: sizeUrl,
            publicId: sizePublicId,
            width: size.width,
            height: size.height
          };
        }

        return {
          original: {
            url: originalUrl,
            publicId: originalPublicId,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          },
          processed: processedSizes,
          order: index
        };
      })
    );

    res.json({
      success: true,
      message: 'Product gallery uploaded and processed successfully to Supabase',
      images: processedImages
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading gallery to Supabase'
    });
  }
});

// @route   DELETE /api/upload/*
// @desc    Delete uploaded file (wildcard to match folder paths)
// @access  Private
router.delete('/*', auth, async (req, res) => {
  try {
    const publicId = req.params[0];

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'No file path provided for deletion'
      });
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([publicId]);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'File deleted successfully from Supabase'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file from Supabase'
    });
  }
});

// @route   GET /api/upload/info/*
// @desc    Get file information (wildcard to match folder paths)
// @access  Private
router.get('/info/*', auth, async (req, res) => {
  try {
    const publicId = req.params[0];

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'No file path provided'
      });
    }

    res.json({
      success: true,
      file: {
        publicId: publicId,
        url: supabase.storage.from(BUCKET_NAME).getPublicUrl(publicId).data.publicUrl,
        format: publicId.split('.').pop(),
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file information'
    });
  }
});

module.exports = router;
