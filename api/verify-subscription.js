const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
            customer = {}
        } = req.body || {};

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Missing payment details' });
        }

        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (expected !== razorpay_signature) {
            console.error('Membership signature mismatch', { razorpay_order_id, razorpay_payment_id });
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }

        const membershipId = 'MEM-' + razorpay_order_id.replace('order_', '').slice(-8).toUpperCase();

        return res.status(200).json({
            success: true,
            membershipId,
            paymentId: razorpay_payment_id,
            plan,
            email: customer.email || ''
        });
    } catch (err) {
        console.error('verify-subscription error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Membership verification failed' });
    }
};
