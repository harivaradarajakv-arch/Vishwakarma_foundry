const { createMockModel } = require('../utils/dbHelper');

const Warranty = createMockModel('warranties');

// Pre-save expiry status update
const originalSave = createMockModel('warranties').prototype.save;
Warranty.prototype.save = async function() {
  if (this.expiryDate && new Date(this.expiryDate) < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  return await originalSave.call(this);
};

// Virtual properties
Object.defineProperty(Warranty.prototype, 'daysUntilExpiry', {
  get: function() {
    const now = new Date();
    const diffTime = new Date(this.expiryDate) - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
});

Object.defineProperty(Warranty.prototype, 'isExpired', {
  get: function() {
    return new Date(this.expiryDate) < new Date();
  }
});

Object.defineProperty(Warranty.prototype, 'activeClaimsCount', {
  get: function() {
    return this.claims ? this.claims.filter(claim => claim.status !== 'resolved' && claim.status !== 'rejected').length : 0;
  }
});

module.exports = Warranty;
