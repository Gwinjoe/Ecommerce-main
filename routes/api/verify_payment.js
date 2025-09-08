const express = require("express");
// const fetch = require("node-fetch");
const router = express.Router();

// POST /api/verify_payment
router.post("/", async (req, res) => {
    const { transactionId, txRef } = req.body;

    if (!transactionId) {
        return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    try {
        const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.FLW_SECRET_KEY}`
            }
        });

        const data = await verifyRes.json();

        if (data.status === "success" && data.data.status === "successful" && data.data.tx_ref === txRef) {
            return res.json({ success: true, data: data.data });
        } else {
            return res.json({ success: false, message: "Transaction verification failed" });
        }
    } catch (err) {
        console.error("Verification error:", err);
        return res.status(500).json({ success: false, message: "Error verifying payment" });
    }
});

module.exports = router;