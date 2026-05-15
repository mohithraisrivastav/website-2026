// ============================================================
// POST /api/create-workshop-order
// Creates a Razorpay order for a workshop registration.
// ============================================================

const Razorpay = require('razorpay');

// Workshop fees in paise (INR × 100) — keep in sync with frontend
const WORKSHOP_FEES = {
    '1day': 360000,   // ₹3,600
    '3day': 1140000,  // ₹11,400
    '7day': 2400000   // ₹24,000
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { workshopType, workshopLabel, cohort, customer } = req.body;

        if (!workshopType || !WORKSHOP_FEES[workshopType]) {
            return res.status(400).json({ error: 'Invalid workshop type' });
        }
        if (!customer || !customer.email || !customer.name) {
            return res.status(400).json({ error: 'Missing customer details' });
        }

        const amountPaise = WORKSHOP_FEES[workshopType];

        const razorpay = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const receipt = 'wks_' + Date.now().toString(36);

        const order = await razorpay.orders.create({
            amount:   amountPaise,
            currency: 'INR',
            receipt,
            notes: {
                type:            workshopType,
                workshop:        workshopLabel || workshopType,
                cohort:          cohort || '',
                customer_name:   customer.name,
                customer_email:  customer.email,
                customer_phone:  customer.phone || ''
            }
        });

        return res.status(200).json({
            id:       order.id,
            amount:   order.amount,
            currency: order.currency,
            receipt:  order.receipt
        });

    } catch (err) {
        console.error('create-workshop-order error:', err);
        const detail = err?.error?.description || err?.message || 'Order creation failed';
        return res.status(500).json({ error: detail });
    }
};
