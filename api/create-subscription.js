const Razorpay = require('razorpay');

const PLANS = {
    monthly: { label: 'Monthly Access', amount: 49900, gstAmount: 8982, total: 58882 },
    annual:  { label: 'Annual Access',  amount: 399900, gstAmount: 71982, total: 471882 }
};

function resolveAmount(planKey, country) {
    const plan = PLANS[planKey];
    if (!plan) return null;
    const domestic = (country || 'IN').toUpperCase() === 'IN';
    return {
        plan,
        amount: domestic ? plan.total : plan.amount
    };
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { plan: planKey, currency = 'INR', customer = {} } = req.body || {};
        const resolved = resolveAmount(planKey, customer.country);

        if (!resolved) {
            return res.status(400).json({ error: 'Invalid membership plan' });
        }
        if (!customer.name || !customer.email || !customer.phone) {
            return res.status(400).json({ error: 'Missing customer details' });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const receipt = 'mem_' + Date.now().toString(36);
        const order = await razorpay.orders.create({
            amount: resolved.amount,
            currency,
            receipt,
            notes: {
                type: 'membership',
                plan: planKey,
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                gstin: customer.gstin || ''
            }
        });

        return res.status(200).json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            plan: {
                key: planKey,
                label: resolved.plan.label
            }
        });
    } catch (err) {
        console.error('create-subscription error:', err);
        return res.status(500).json({ error: err.message || 'Membership order creation failed' });
    }
};
