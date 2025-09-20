const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  tx_ref: { type: String, required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: mongoose.Types.Decimal128, required: true },
  currency: { type: String, default: 'NGN' },
  status: { type: String, enum: ['pending', 'successful', 'failed', 'cancelled'], default: 'pending' },
  gateway: { type: String, default: 'flutterwave' },
  transactionId: { type: String }, // gateway's transaction id
  gatewayData: { type: Object }, // store raw gateway payload for auditing
}, {
  timestamps: true
});

transactionSchema.methods.getAmountAsNumber = function() {
  return parseFloat(this.amount ? this.amount.toString() : '0');
}

module.exports = mongoose.model('Transaction', transactionSchema);
