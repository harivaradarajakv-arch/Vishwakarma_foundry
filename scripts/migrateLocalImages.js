const fs = require('fs');
const path = require('path');
const supabase = require('../utils/supabase');
const Product = require('../models/Product');
const Review = require('../models/Review');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const BUCKET_NAME = 'vishwakarma';

async function runMigration() {
  try {
    console.log('⏳ Starting image migration to Supabase Storage...');

    // 1. Ensure bucket exists and is public
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;
    const exists = buckets.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      console.log('Creating bucket...');
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    // 2. Read local files
    if (!fs.existsSync(UPLOADS_DIR)) {
      console.log('No uploads directory found. Nothing to migrate.');
      process.exit(0);
    }
    const files = fs.readdirSync(UPLOADS_DIR);
    console.log(`Found ${files.length} local files in uploads/.`);

    if (files.length === 0) {
      console.log('Uploads directory is empty. Nothing to migrate.');
      process.exit(0);
    }

    const fileMappings = {};

    // 3. Upload files to Supabase Storage
    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `products/${file}`;

      console.log(`Uploading ${file} to Supabase Storage...`);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error(`Failed to upload ${file}:`, error.message);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      fileMappings[file] = {
        url: publicUrl,
        publicId: storagePath
      };
      console.log(`Uploaded ${file} successfully! URL: ${publicUrl}`);
    }

    // Helper to recursively update URLs and publicIds in an object
    const updateDocumentPaths = (obj) => {
      let updated = false;
      if (!obj || typeof obj !== 'object') return updated;

      // If it's an image object containing a local URL
      if (obj.url && typeof obj.url === 'string') {
        const urlFilename = obj.url.split('/').pop();
        if (fileMappings[urlFilename]) {
          console.log(`  Replacing URL: ${obj.url} -> ${fileMappings[urlFilename].url}`);
          obj.url = fileMappings[urlFilename].url;
          obj.publicId = fileMappings[urlFilename].publicId;
          updated = true;
        }
      }

      // Recurse into children/arrays
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (typeof obj[key] === 'object') {
            const childUpdated = updateDocumentPaths(obj[key]);
            if (childUpdated) updated = true;
          }
        }
      }
      return updated;
    };

    // 4. Migrate Products
    console.log('\n⏳ Migrating products table...');
    const products = await Product.find({});
    console.log(`Found ${products.length} products to check.`);
    for (const product of products) {
      const isUpdated = updateDocumentPaths(product);
      if (isUpdated) {
        console.log(`Saving updated product: ${product.name} (${product._id})`);
        await product.save();
      }
    }

    // 5. Migrate Reviews
    console.log('\n⏳ Migrating reviews table...');
    const reviews = await Review.find({});
    console.log(`Found ${reviews.length} reviews to check.`);
    for (const review of reviews) {
      const isUpdated = updateDocumentPaths(review);
      if (isUpdated) {
        console.log(`Saving updated review: ${review._id}`);
        await review.save();
      }
    }

    console.log('\n✅ Image migration and database update completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    process.exit(1);
  }
}

runMigration();
