const { createMockModel } = require('../utils/dbHelper');

const Inquiry = createMockModel('inquiries');

// Virtual properties
Object.defineProperty(Inquiry.prototype, 'responseTime', {
  get: function() {
    if (this.responses && this.responses.length > 0) {
      const firstResponse = this.responses[0];
      return Math.floor((new Date(firstResponse.createdAt) - new Date(this.createdAt)) / (1000 * 60 * 60)); // in hours
    }
    return null;
  }
});

Object.defineProperty(Inquiry.prototype, 'isOverdue', {
  get: function() {
    const now = new Date();
    const responseTimeLimit = this.priority === 'urgent' ? 2 : this.priority === 'high' ? 8 : 24; // in hours
    const timeDiff = (now - new Date(this.createdAt)) / (1000 * 60 * 60);
    return timeDiff > responseTimeLimit && this.status === 'pending';
  }
});

module.exports = Inquiry;
