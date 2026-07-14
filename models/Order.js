const { createMockModel } = require('../utils/dbHelper');

const Order = createMockModel('orders');

// Pre-save orderNumber auto-generation
const originalSave = Order.prototype.save;
Order.prototype.save = async function() {
  if (!this.id && !this._id && !this.orderNumber) {
    const count = await Order.countDocuments();
    this.orderNumber = `VFW${String(count + 1).padStart(6, '0')}`;
  }
  return await originalSave.call(this);
};

// Virtual properties
Object.defineProperty(Order.prototype, 'totalItems', {
  get: function() {
    return this.items ? this.items.reduce((total, item) => total + item.quantity, 0) : 0;
  }
});

Object.defineProperty(Order.prototype, 'progressPercentage', {
  get: function() {
    const statusProgress = {
      'pending': 0,
      'confirmed': 10,
      'manufacturing': 30,
      'quality-check': 50,
      'ready': 70,
      'shipped': 85,
      'delivered': 90,
      'installed': 95,
      'completed': 100,
      'cancelled': 0
    };
    return statusProgress[this.status] || 0;
  }
});

module.exports = Order;
