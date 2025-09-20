const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../../models/userModel');       // adjust path if different
const Order = require('../../models/orderSchema');         // models/Order.js
const Transaction = require('../../models/transactionSchema'); // models/Transaction.js

const { dohash, dohashValidation, hmacProcess } = require("../../utils/hashing");
const { sendMail } = require("../../middlewares/sendmail")

// Ensure fetch exists (Node 18+ has it built-in); otherwise try node-fetch v2
let fetchImpl = global.fetch;
if (!fetchImpl) {
  try {
    fetchImpl = require('node-fetch');
  } catch (e) {
    console.warn('Global fetch not available and node-fetch not installed. Please use Node 18+ or npm i node-fetch@2');
  }
}

const FLW_SECRET = process.env.FLW_SECRET_KEY;
if (!FLW_SECRET) console.warn('FLW_SECRET_KEY not set in environment');

// small helper to produce Decimal128
function decimal128(value) {
  return mongoose.Types.Decimal128.fromString(String(Number(value || 0)));
}

// helper to generate password
function genPassword(name = '') {
  const specialchars = ["@", "!", "&", "^", "#"];
  const first = (name || 'user').split(' ')[0] || 'user';
  const randSpecial = specialchars[Math.floor(Math.random() * specialchars.length)];
  const randNum = Math.floor(Math.random() * 3000000);
  return `${first}${randSpecial}${randNum}`;
}

// POST /api/verify_payment
// Expects body: { transactionId, txRef, order: { customer:{ userId?, name, email, phone, address, city, state, postalCode, country }, items:[{productId, quantity, price, name, image}], coupon, totals:{subtotal, discountAmount, shippingCost, total} } }
router.post('/', async (req, res) => {
  const { transactionId, txRef, order: orderPayload } = req.body;

  if (!transactionId && !txRef) {
    return res.status(400).json({ success: false, message: 'transactionId or txRef required' });
  }

  // We expect order payload because we create order only after verification
  if (!orderPayload || !Array.isArray(orderPayload.items) || orderPayload.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order payload with items is required' });
  }

  // require at least email and name (we will create user if not present)
  const customerInfo = orderPayload.customer || {};
  if (!customerInfo.email || !customerInfo.name) {
    return res.status(400).json({ success: false, message: 'Customer name and email are required in order payload' });
  }

  try {
    // Idempotency checks: existing transaction or existing order by tx_ref
    let existingTxn = null;
    if (txRef) existingTxn = await Transaction.findOne({ tx_ref: txRef });
    if (!existingTxn && transactionId) existingTxn = await Transaction.findOne({ transactionId });

    // If a successful transaction already exists, return existing order if possible
    if (existingTxn && existingTxn.status === 'successful') {
      let existingOrder = null;
      if (existingTxn.order) existingOrder = await Order.findById(existingTxn.order);
      if (!existingOrder && existingTxn.tx_ref) existingOrder = await Order.findOne({ tx_ref: existingTxn.tx_ref });
      return res.json({ success: true, message: 'Already verified', transaction: existingTxn, order: existingOrder || null });
    }

    if (!fetchImpl) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: missing fetch implementation' });
    }

    // call flutterwave verify endpoint
    const verifyUrl = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`;
    const verifyRes = await fetchImpl(verifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLW_SECRET}`
      }
    });

    if (!verifyRes.ok) {
      const text = await verifyRes.text().catch(() => '');
      console.error('Flutterwave verify HTTP failure:', verifyRes.status, text);
      return res.status(502).json({ success: false, message: 'Failed to verify with Flutterwave', details: text });
    }

    const payload = await verifyRes.json();
    if (!payload || payload.status !== 'success' || !payload.data) {
      return res.status(400).json({ success: false, message: 'Payment not successful according to gateway', payload });
    }

    const fw = payload.data;

    // if gateway says transaction not successful -> store failed txn and return
    if (fw.status !== 'successful') {
      // create or update a failed transaction record for auditing
      const failedTxn = existingTxn || new Transaction({
        tx_ref: fw.tx_ref || txRef,
        order: undefined,
        user: customerInfo.userId || undefined,
        amount: decimal128(fw.amount || 0),
        currency: fw.currency || 'NGN',
        status: 'failed',
        gateway: 'flutterwave',
        transactionId: fw.id || transactionId,
        gatewayData: fw
      });

      failedTxn.status = 'failed';
      failedTxn.transactionId = fw.id || transactionId;
      failedTxn.gatewayData = fw;
      failedTxn.amount = decimal128(fw.amount || 0);
      await failedTxn.save();

      return res.status(200).json({ success: false, message: 'Payment not successful', data: fw });
    }

    // At this point fw.status === 'successful'
    // Validate tx_ref if client provided one
    if (txRef && fw.tx_ref && fw.tx_ref !== txRef) {
      console.warn('tx_ref mismatch between client and gateway', { clientTxRef: txRef, gatewayTxRef: fw.tx_ref });
      return res.status(400).json({ success: false, message: 'tx_ref mismatch', gateway_tx_ref: fw.tx_ref });
    }

    // Validate that gateway amount matches client-provided totals if provided
    const expectedTotal = Number(orderPayload.totals?.total);
    const fwAmount = parseFloat(fw.amount || 0);
    if (isFinite(expectedTotal) && Math.abs(expectedTotal - fwAmount) > 0.01) {
      console.error('Amount mismatch: expected %s got %s', expectedTotal, fwAmount);
      return res.status(400).json({ success: false, message: 'Amount mismatch between client order totals and gateway', expectedTotal, gatewayAmount: fwAmount });
    }

    // --- Create or update user (guest account creation if needed) ---
    const email = (customerInfo.email || '').toLowerCase();
    const name = customerInfo.name || '';
    const phone = customerInfo.phone || '';
    const address = customerInfo.address || '';
    const city = customerInfo.city || '';
    const state = customerInfo.state || '';
    const postalCode = customerInfo.postalCode || '';
    const country = customerInfo.country || 'Nigeria';

    let user = await User.findOne({ email });

    if (!user) {
      // create new user (guest account)
      const password = genPassword(name);
      const hashedPassword = await dohash(password, 12);
      const newUser = new User({
        email,
        name,
        phone,
        address: {
          address: address || '',
          country,
          city: city || '',
          postalCode: postalCode || '',
          state: state || ''
        },
        password: hashedPassword
      });

      user = await newUser.save();

      // Send welcome and guest-welcome emails (best-effort)
      try {
        await sendMail({
          to: email,
          subject: 'Welcome to SWISStools',
          template: 'welcome',
          data: { name: user.name || name, verification_link: `https://swisstools.store/verify/${user._id}` }
        });
        await sendMail({
          to: email,
          subject: 'Account created for you',
          template: 'guest-welcome',
          data: { name: user.name || name, password: password, login_link: 'https://swisstools.store/login' }
        });
      } catch (mailErr) {
        console.warn('Failed to send user creation emails', mailErr);
      }
    } else {
      // update contact details
      user.phone = phone || user.phone;
      user.address = {
        address: address || user.address?.address || '',
        country: country || user.address?.country || '',
        city: city || user.address?.city || '',
        postalCode: postalCode || user.address?.postalCode || '',
        state: state || user.address?.state || ''
      };
      user = await user.save();
    }

    // --- Create / upsert transaction (mark successful) ---
    let txn = existingTxn;
    if (!txn) {
      txn = new Transaction({
        tx_ref: fw.tx_ref || txRef,
        order: undefined,
        user: user ? user._id : undefined,
        amount: decimal128(fw.amount || 0),
        currency: fw.currency || 'NGN',
        status: 'successful',
        gateway: 'flutterwave',
        transactionId: fw.id || transactionId,
        gatewayData: fw
      });
    } else {
      txn.status = 'successful';
      txn.transactionId = fw.id || transactionId;
      txn.gatewayData = fw;
      txn.amount = decimal128(fw.amount || 0);
      txn.user = user ? user._id : txn.user;
    }
    await txn.save();

    // --- Build order document and save ---
    const productLines = (orderPayload.items || []).map(it => {
      return {
        product: it.productId ? mongoose.Types.ObjectId(it.productId) : null,
        quantity: Number(it.quantity || 1),
        totalPrice: decimal128((Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2))
      };
    });

    const orderDoc = new Order({
      tx_ref: fw.tx_ref || txRef,
      status: 'paid',
      products: productLines,
      customer: mongoose.Types.ObjectId(user._id),
      coupon: orderPayload.coupon || null,
      totalPrice: decimal128(orderPayload.totals?.total || fwAmount),
      payment: {
        reference: fw.tx_ref || txRef,
        transactionId: fw.id || transactionId,
        method: 'flutterwave'
      },
      paymentMethod: 'flutterwave'
    });

    const savedOrder = await orderDoc.save();

    // Link transaction to order
    txn.order = savedOrder._id;
    await txn.save();

    // Send order confirmation email (best-effort)
    try {
      let html = '';
      (orderPayload.items || []).forEach(item => {
        const h = `<li><img src="${item.image || ''}" alt="image" style="margin-right:10px; width:40px; height:40px; object-fit:cover;" /><span>${item.name || ''} x${item.quantity}</span></li>`;
        html += h;
      });

      await sendMail({
        to: email,
        subject: 'Your order is received',
        template: 'order-confirmation',
        data: {
          name: name || user.name || '',
          order_id: savedOrder.payment?.reference || savedOrder._id.toString(),
          order_total: (savedOrder.totalPrice || '').toString(),
          order_items: `<ul>${html}</ul>`,
          order_link: 'https://swisstools.store/orders/'
        }
      });
    } catch (mailErr) {
      console.warn('Failed to send order confirmation email', mailErr);
    }

    // Success response
    return res.json({
      success: true,
      message: 'Payment verified, user (created/updated), transaction and order created',
      order: savedOrder,
      transaction: txn,
      gateway: fw
    });
  } catch (err) {
    console.error('verifyPayment/create order error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

module.exports = router;

