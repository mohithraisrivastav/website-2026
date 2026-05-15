// ============================================================
// POST /api/create-order
// Creates a Razorpay order server-side and returns order_id.
// Amount is authoritative — we recalculate server-side to prevent tampering.
// ============================================================

const Razorpay = require('razorpay');

// Server-side shipping rates (must match frontend CONFIG)
const GST_RATE = 0.12;
const SHIPPING_ZONES = {
    0: { name: 'Goa (local)',           base: 300,   perKg: 150 },
    1: { name: 'India',                 base: 700,   perKg: 250 },
    2: { name: 'SAARC',                 base: 3500,  perKg: 800 },
    3: { name: 'Middle East / SE Asia', base: 6000,  perKg: 1200 },
    4: { name: 'Europe / UK',           base: 8500,  perKg: 1600 },
    5: { name: 'Americas / RoW',        base: 10500, perKg: 2000 }
};
const SHIPPING_BASE_WEIGHT = 2;
const COUNTRY_ZONES = {
    NP: 2, LK: 2, BD: 2, BT: 2, MV: 2,
    AE: 3, SA: 3, QA: 3, OM: 3, KW: 3, BH: 3,
    SG: 3, TH: 3, MY: 3, ID: 3, PH: 3, VN: 3, JP: 3, KR: 3, HK: 3, TW: 3, CN: 3,
    GB: 4, IE: 4, DE: 4, FR: 4, IT: 4, ES: 4, NL: 4, BE: 4, CH: 4, AT: 4,
    SE: 4, NO: 4, DK: 4, FI: 4, PT: 4, PL: 4, CZ: 4, GR: 4,
    US: 5, CA: 5, MX: 5, BR: 5, AR: 5, CL: 5,
    AU: 5, NZ: 5, ZA: 5
};
const PRODUCT_WEIGHTS = {
    'Cosmic Return': 2.0, 'Burnt Earth': 2.0, 'Chromatic Rupture': 2.0,
    'After The Fall': 2.0, 'Cracked Spectrum': 2.0, 'Still Organism': 2.0,
    'Forgotten Skin': 2.0, 'Erosion': 2.0, 'Imprint': 2.0,
    'The Matter of Pause (Paperback)': 0.8, 'Explorer Deck': 0.3, "Explorer's Deck": 0.3,
    'The Matter of Pause (Digital)': 0
};

function resolveZone(customer) {
    const country = (customer.country || 'IN').toUpperCase();
    if (country === 'IN') {
        const state = (customer.state || '').trim().toLowerCase();
        const postal = (customer.postal || '').trim();
        if (state === 'goa' || state === 'ga' || /^403\d{3}$/.test(postal)) return 0;
        return 1;
    }
    return COUNTRY_ZONES[country] != null ? COUNTRY_ZONES[country] : 5;
}

function computeTotal(items, customer) {
    const subtotal = items.reduce((s, i) => s + Number(i.price), 0);
    const totalWeight = items.reduce((w, i) => {
        const pw = PRODUCT_WEIGHTS[i.title];
        return w + (typeof pw === 'number' ? pw : 0.8);
    }, 0);

    let shipping = 0;
    if (totalWeight > 0) {
        const zone = SHIPPING_ZONES[resolveZone(customer)];
        const extraKg = Math.max(0, Math.ceil(totalWeight - SHIPPING_BASE_WEIGHT));
        shipping = zone.base + extraKg * zone.perKg;
    }

    const isDomestic = (customer.country || 'IN').toUpperCase() === 'IN';
    const gstBase = isDomestic ? (subtotal + shipping) : 0;
    const gst = Math.round(gstBase * GST_RATE);
    const total = subtotal + shipping + gst;

    return { subtotal, shipping, gst, total, totalWeight };
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { items, customer } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        if (!customer || !customer.email || !customer.name) {
            return res.status(400).json({ error: 'Missing customer details' });
        }

        // Recompute amount server-side (never trust frontend)
        const totals = computeTotal(items, customer);
        const amountPaise = Math.round(totals.total * 100);

        if (amountPaise < 100) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        // Short receipt (Razorpay limit: 40 chars)
        const receipt = 'mrs_' + Date.now().toString(36);

        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt,
            notes: {
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone || '',
                country: customer.country || 'IN',
                item_count: String(items.length),
                subtotal: String(totals.subtotal),
                shipping: String(totals.shipping),
                gst: String(totals.gst),
                weight_kg: String(totals.totalWeight)
            }
        });

        return res.status(200).json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            totals
        });
    } catch (err) {
        console.error('create-order error:', err);
        return res.status(500).json({ error: err.message || 'Order creation failed' });
    }
};
