const { createMockModel } = require('../utils/dbHelper');
const slugify = require('slugify');

const Product = createMockModel('products');

// Pre-save slug generation
const originalSave = Product.prototype.save;
Product.prototype.save = async function() {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  return await originalSave.call(this);
};

// Virtual properties
Object.defineProperty(Product.prototype, 'discountedPrice', {
  get: function() {
    if (this.pricing && this.pricing.discountPrice && this.pricing.discountPrice < this.pricing.basePrice) {
      return this.pricing.discountPrice;
    }
    return this.pricing ? this.pricing.basePrice : 0;
  }
});

Object.defineProperty(Product.prototype, 'discountPercentage', {
  get: function() {
    if (this.pricing && this.pricing.discountPrice && this.pricing.discountPrice < this.pricing.basePrice) {
      return Math.round(((this.pricing.basePrice - this.pricing.discountPrice) / this.pricing.basePrice) * 100);
    }
    return 0;
  }
});

module.exports = Product;
