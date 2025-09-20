const mongoose = require('mongoose');

const productSubSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  // store per-line total as Decimal128 (calculated server-side when creating/updating orders)
  totalPrice: {
    type: mongoose.Types.Decimal128,
    required: true,
    default: mongoose.Types.Decimal128.fromString('0')
  }
});

const orderSchema = new mongoose.Schema({
  tx_ref: { // transaction reference associated with this order (generated server-side or client-side)
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending'
  },
  products: [productSubSchema],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coupon: {
    type: String,
  },
  // store total as Decimal128
  totalPrice: {
    type: mongoose.Types.Decimal128,
    required: true,
    default: mongoose.Types.Decimal128.fromString('0'),
  },
  payment: {
    reference: String,
    transactionId: String,
    method: String,
  },
  paymentMethod: {
    type: String,
  }
}, {
  timestamps: true,
});

// helper to get JS Number from Decimal128
orderSchema.methods.getTotalAsNumber = function() {
  return parseFloat(this.totalPrice ? this.totalPrice.toString() : '0');
}

module.exports = mongoose.model('Order', orderSchema);
