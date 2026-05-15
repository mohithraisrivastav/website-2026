module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(200).json({
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
    });
};
