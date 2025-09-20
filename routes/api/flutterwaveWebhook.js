const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../../models/transactionSchema');
const Order = require('../../models/orderSchema');

// Try to get fetch (Node 18+). If running older Node, install node-fetch v2 and it will be used.
let fetchImpl = global.fetch;
if (!fetchImpl) {
  try {
    fetchImpl = require('node-fetch');
  } catch (e) {
    console.warn('Global fetch is not available and node-fetch is not installed. Please ensure Node 18+ or install node-fetch.');
  }
}

const FLW_SECRET = process.env.FLW_SECRET_KEY;
if (!FLW_SECRET) console.warn('FLW_SECRET_KEY not set in environment');

// NOTE: You can mount this router at /api/flutterwave_webhook
// Ensure your app does not double-parse JSON for the same endpoint.
router.post('/', express.json(), async (req, res) => {
  try {
    const body = req.body || {};

    // Typical payload may include data.id or data.tx_ref. Try to extract a transaction id.
    const txId = body?.data?.id || body?.data?.transaction_id || body?.id;
    const txRef = body?.data?.tx_ref || body?.data?.flw_ref || body?.tx_ref || body?.flw_ref;

    if (!txId && !txRef) {
      console.warn('Webhook missing identifiers', body);
      return res.status(400).send('missing identifiers');
    }

    if (!fetchImpl) {
      console.error('No fetch implementation available to contact Flutterwave verify endpoint.');
      return res.status(500).send('server misconfiguration');
    }

    const verifyUrl = txId ? `https://api.flutterwave.com/v3/transactions/${txId}/verify` : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;

    const verifyRes = await fetchImpl(verifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLW_SECRET}`
      }
    });

    if (!verifyRes.ok) {
      const text = await verifyRes.text().catch(() => '');
      console.error('Webhook verification failed:', verifyRes.status, text);
      return res.status(502).send('gateway verification failed');
    }

    const payload = await verifyRes.json();
    if (!payload || payload.status !== 'success' || !payload.data) return res.status(400).send('not successful');

    const fw = payload.data;
    if (fw.status !== 'successful') {
      // mark transaction as failed/cancelled
      await upsertTransaction(fw, 'failed');
      return res.status(200).send('ok');
    }

    // successful
    await upsertTransaction(fw, 'successful');

    // update order if referenced
    if (fw.tx_ref) {
      const order = await Order.findOne({ tx_ref: fw.tx_ref });
      if (order) {
        order.status = 'paid';
        order.payment = order.payment || {};
        order.payment.reference = fw.tx_ref;
        order.payment.transactionId = fw.id;
        order.payment.method = 'flutterwave';
        await order.save();
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handling error:', err);
    return res.status(500).send('server error');
  }
});

async function upsertTransaction(fw, status) {
  const txModel = require('../models/Transaction');

  const existing = await txModel.findOne({ tx_ref: fw.tx_ref });
  if (existing) {
    existing.status = status;
    existing.transactionId = fw.id;
    existing.gatewayData = fw;
    existing.amount = mongoose.Types.Decimal128.fromString(String(fw.amount));
    await existing.save();
    return existing;
  }

  const newTx = new txModel({
    tx_ref: fw.tx_ref,
    order: undefined,
    user: undefined,
    amount: mongoose.Types.Decimal128.fromString(String(fw.amount)),
    currency: fw.currency || 'NGN',
    status,
    gateway: 'flutterwave',
    transactionId: fw.id,
    gatewayData: fw
  });

  return newTx.save();
}

module.exports = router;
