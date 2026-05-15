// ============================================================
// POST /api/verify-payment
// Verifies Razorpay HMAC signature, sends emails, returns order id.
// ============================================================

const crypto = require('crypto');
const { sendBuyerEmail, sendSellerEmail } = require('./_lib/email.js');

// Digital download links — edit these with real URLs after upload
const DIGITAL_DOWNLOADS = {
    'The Matter of Pause (Digital)': {
        url: 'https://your-storage.com/matter-of-pause.pdf',
        title: 'The Matter of Pause (Digital Monograph)'
    }
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            items,
            customer,
            breakdown
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Missing payment details' });
        }

        // Verify signature (prevents payment forgery)
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (expected !== razorpay_signature) {
            console.error('Signature mismatch', { razorpay_order_id, razorpay_payment_id });
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }

        // Build download links for any digital items purchased
        const downloads = (items || [])
            .filter(i => DIGITAL_DOWNLOADS[i.title])
            .map(i => DIGITAL_DOWNLOADS[i.title]);

        // Internal order reference (shorter, human-friendly)
        const orderId = 'MRS-' + razorpay_order_id.replace('order_', '').slice(-8).toUpperCase();

        // Fire emails (do not block on failure — we've already confirmed payment)
        const emailPayload = {
            orderId,
            paymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            items,
            customer,
            breakdown,
            downloads
        };

        try {
            await Promise.all([
                sendBuyerEmail(emailPayload),
                sendSellerEmail(emailPayload)
            ]);
        } catch (emailErr) {
            console.error('Email send failed (non-fatal):', emailErr);
            // Don't fail the request — payment is verified.
        }

        return res.status(200).json({
            success: true,
            orderId,
            paymentId: razorpay_payment_id,
            downloads
        });
    } catch (err) {
        console.error('verify-payment error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
    }
};
