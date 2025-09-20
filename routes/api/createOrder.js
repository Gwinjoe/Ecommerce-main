const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Transaction = require('../../models/transactionSchema');

// Create an order and associated pending transaction, return tx_ref + flwpubkey
// Expected request body:
// { customerId, products: [{ productId, quantity, price }], coupon, totals: { subtotal, discountAmount, shippingCost, total } }
router.post('/', async (req, res) => {
  try {
    const { customerId, products, coupon, totals } = req.body;
    if (!customerId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const txRef = `ORD_SWISS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // build product lines for order
    const productLines = products.map(p => {
      return {
        product: p.productId,
        quantity: p.quantity || 1,
        totalPrice: mongoose.Types.Decimal128.fromString(String((p.price || 0) * (p.quantity || 1)))
      };
    });

    const order = new Order({
      tx_ref: txRef,
      status: 'pending',
      products: productLines,
      customer: customerId,
      coupon: coupon || null,
      totalPrice: mongoose.Types.Decimal128.fromString(String(totals.total || 0)),
    });

    await order.save();

    const txn = new Transaction({
      tx_ref: txRef,
      order: order._id,
      user: order.customer,
      amount: mongoose.Types.Decimal128.fromString(String(totals.total || 0)),
      currency: 'NGN',
      status: 'pending',
      gateway: 'flutterwave'
    });

    await txn.save();

    // Return txRef and public key for frontend to start checkout
    return res.json({ success: true, tx_ref: txRef, flwpubkey: process.env.FLUTTERWAVEPUBKEY || null });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
