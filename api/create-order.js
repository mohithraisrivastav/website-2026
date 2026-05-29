// ============================================================
// POST /api/create-order
// Creates a Razorpay order server-side and returns order_id.
// Amount is authoritative — we recalculate server-side to prevent tampering.
// ============================================================

const Razorpay = require('razorpay');

// Server-side shipping config — must stay in sync with frontend CONFIG in checkout.js.
// GST: composite supply (CGST Act S.8) — 12% on (subtotal + shipping), domestic only.
const GST_RATE = 0.12;

// Print size → shipping tier (wooden crate dimensional weight approximations)
const PRINT_SIZE_TIERS = {
    'Cosmic Return':     'large',    // 42 × 31.5 in
    'Burnt Earth':       'standard', // 32 × 24 in
    'Chromatic Rupture': 'standard',
    'After The Fall':    'standard', // 32 × 25.5 in
    'Cracked Spectrum':  'standard', // 32 × 21.3 in
    'Still Organism':    'standard', // 24 × 32 in
    'Forgotten Skin':    'standard',
    'Erosion':           'standard',
    'Imprint':           'standard',
};

// Fixed domestic shipping per crate tier per zone (0=Goa, 1=India)
const PRINT_SHIPPING_RATES = {
    small:    { 0: 1200, 1: 2500 },
    medium:   { 0: 1800, 1: 3800 },
    standard: { 0: 2800, 1: 5500 },
    large:    { 0: 4000, 1: 8000 },
};

// Non-print domestic (books, decks) — flat per order
const NON_PRINT_DOMESTIC = { 0: 250, 1: 450 };

// Country → zone (non-print international only; prints require quote)
const COUNTRY_ZONES = {
    NP: 2, LK: 2, BD: 2, BT: 2, MV: 2,
    AE: 3, SA: 3, QA: 3, OM: 3, KW: 3, BH: 3,
    SG: 3, TH: 3, MY: 3, ID: 3, PH: 3, VN: 3, JP: 3, KR: 3, HK: 3, TW: 3, CN: 3,
    GB: 4, IE: 4, DE: 4, FR: 4, IT: 4, ES: 4, NL: 4, BE: 4, CH: 4, AT: 4,
    SE: 4, NO: 4, DK: 4, FI: 4, PT: 4, PL: 4, CZ: 4, GR: 4,
    US: 5, CA: 5, MX: 5, BR: 5, AR: 5, CL: 5, AU: 5, NZ: 5, ZA: 5
};

// Non-print international flat rates
const NON_PRINT_INTL = { 2: 1500, 3: 2000, 4: 2800, 5: 3500 };

// Digital products (no shipping)
const DIGITAL_PRODUCTS = { 'The Matter of Pause (Digital)': true };

function getItemTier(title) {
    // 1. Size name in suffix e.g. "Burnt Earth — Small (46×35 cm)" → 'small'
    const sizeMatch = (title || '').match(/[—\-–]\s*(Small|Medium|Standard|Large)\s*\(/i);
    if (sizeMatch) {
        const sizeMap = { small: 'small', medium: 'medium', standard: 'standard', large: 'large' };
        const tier = sizeMap[sizeMatch[1].toLowerCase()];
        if (tier) return tier;
    }
    // 2. Fall back to per-product lookup
    if (PRINT_SIZE_TIERS[title] !== undefined) return PRINT_SIZE_TIERS[title];
    const base = (title || '').replace(/\s+[—\-–].+$/, '').trim();
    if (PRINT_SIZE_TIERS[base] !== undefined) return PRINT_SIZE_TIERS[base];
    return null;
}

function isPrint(title) { return getItemTier(title) !== null; }

function isDigital(title) {
    if (DIGITAL_PRODUCTS[title]) return true;
    return !!DIGITAL_PRODUCTS[(title || '').replace(/\s+[—\-–].+$/, '').trim()];
}

function resolveZone(customer) {
    const country = (customer.country || 'IN').toUpperCase();
    if (country === 'IN') {
        // Normalise state: strip spaces, lowercase — matches "North Goa", "south goa", "GA" etc.
        const state  = (customer.state || '').trim().toLowerCase().replace(/\s+/g, '');
        const postal = (customer.postal || '').trim();
        if (state === 'goa' || state === 'ga' || state.includes('goa') || /^403\d{3}$/.test(postal)) return 0;
        return 1;
    }
    return COUNTRY_ZONES[country] != null ? COUNTRY_ZONES[country] : 5;
}

function computeTotal(items, customer) {
    const country      = (customer.country || 'IN').toUpperCase();
    const international = country !== 'IN';
    const zone         = resolveZone(customer);

    // International orders containing prints must never reach payment —
    // the frontend blocks them. Reject here as a server-side safety net.
    if (international && items.some(i => isPrint(i.title))) {
        throw new Error('INTL_PRINT_QUOTE_REQUIRED');
    }

    const subtotal = items.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0);

    // Shipping: fixed rate per crate tier for prints; flat per-order for non-prints
    let printCost       = 0;
    let hasNonPrintPhys = false;

    for (const item of items) {
        if (isDigital(item.title)) continue;
        const qty  = item.qty || 1;
        const tier = getItemTier(item.title);
        if (tier) {
            const rates = PRINT_SHIPPING_RATES[tier] || PRINT_SHIPPING_RATES.standard;
            printCost  += (rates[zone] !== undefined ? rates[zone] : rates[1]) * qty;
        } else {
            hasNonPrintPhys = true;
        }
    }

    let nonPrintCost = 0;
    if (hasNonPrintPhys) {
        nonPrintCost = international
            ? (NON_PRINT_INTL[zone] || NON_PRINT_INTL[5])
            : (NON_PRINT_DOMESTIC[zone] !== undefined ? NON_PRINT_DOMESTIC[zone] : NON_PRINT_DOMESTIC[1]);
    }

    const shipping = printCost + nonPrintCost;
    const gst      = !international ? Math.round((subtotal + shipping) * GST_RATE) : 0;
    const total    = subtotal + shipping + gst;

    return { subtotal, shipping, gst, total };
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
        let totals;
        try {
            totals = computeTotal(items, customer);
        } catch (e) {
            if (e.message === 'INTL_PRINT_QUOTE_REQUIRED') {
                return res.status(400).json({
                    error: 'International print shipping requires a quote. Please contact info@mohithraisrivastav.com'
                });
            }
            throw e;
        }
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
                shipping_note: 'wooden crate — fixed tier rate'
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
