// ============================================================
// POST /api/verify-workshop-payment
// Verifies Razorpay HMAC signature for workshop payment,
// sends confirmation emails to buyer and studio.
// ============================================================

const crypto = require('crypto');

const STUDIO_EMAIL = 'info@mohithraisrivastav.com';
const STUDIO_NAME  = 'Mohith Rai Srivastav';
const FROM_ADDRESS = 'orders@mohithraisrivastav.com';

// ── Airtable sync (Mohith OS) ───────────────────────────────────
// After a verified payment: increment Seats_Sold on the matching
// open batch and log the registrant into Alumni. Requires the
// AIRTABLE_TOKEN env var in Vercel; without it this is a no-op so
// payments always succeed regardless.
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app8BNPNBAoISPWO3';

const TYPE_TO_DURATION = {
    '1day': '1-Day Intensive',
    '3day': '3-Day Workshop',
    '7day': '6-Day Residency'
};

async function airtable(path, options = {}) {
    const res = await fetch('https://api.airtable.com/v0/' + AIRTABLE_BASE_ID + '/' + path, {
        ...options,
        headers: {
            'Authorization': 'Bearer ' + process.env.AIRTABLE_TOKEN,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    if (!res.ok) throw new Error('Airtable ' + res.status + ': ' + (await res.text()).slice(0, 300));
    return res.json();
}

async function syncRegistrationToAirtable({ workshopType, customer, medium, bookingId }) {
    if (!process.env.AIRTABLE_TOKEN) {
        console.warn('Airtable sync skipped: AIRTABLE_TOKEN not set');
        return;
    }
    const duration = TYPE_TO_DURATION[workshopType];

    // Find the nearest future open batch of this duration
    const today = new Date().toISOString().slice(0, 10);
    const data = await airtable('Workshops?pageSize=100');
    const batch = (data.records || [])
        .filter(r => r.fields
            && r.fields.Status === 'Open'
            && r.fields.Duration === duration
            && r.fields.Date >= today)
        .sort((a, b) => a.fields.Date.localeCompare(b.fields.Date))[0];

    if (batch) {
        await airtable('Workshops/' + batch.id, {
            method: 'PATCH',
            body: JSON.stringify({ fields: { Seats_Sold: (batch.fields.Seats_Sold || 0) + 1 } })
        });
    } else {
        console.warn('Airtable sync: no open ' + duration + ' batch found for registration ' + bookingId);
    }

    // Log the registrant so the OS agents can see them
    await airtable('Alumni', {
        method: 'POST',
        body: JSON.stringify({
            fields: {
                Name:              customer.name || '',
                Email:             customer.email || '',
                Phone:             customer.phone || '',
                Workshop_Batch:    batch ? (batch.fields.Batch_Name || batch.fields.Date) : (duration + ' (batch unmatched)'),
                Medium:            medium || '',
                City:              customer.city || '',
                Country:           customer.country || '',
                Status:            'Registered',
                Last_Contact_Date: today,
                Notes:             'Auto-logged from paid registration ' + bookingId
            }
        })
    });
}

async function sendEmail({ to, subject, html, replyTo }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from:     `${STUDIO_NAME} <${FROM_ADDRESS}>`,
            to:       Array.isArray(to) ? to : [to],
            subject,
            html,
            reply_to: replyTo || STUDIO_EMAIL
        })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Email send failed: ${res.status} ${text}`);
    }
    return res.json();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            workshopType,
            workshopLabel,
            workshopFee,
            cohort,
            customer,
            motivation,
            medium,
            experience,
            source
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Missing payment details' });
        }

        // Verify HMAC signature
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }

        const bookingId = 'WKS-' + razorpay_order_id.replace('order_', '').slice(-8).toUpperCase();
        const firstName = (customer.name || '').split(' ')[0];

        // Buyer confirmation email
        const buyerHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Georgia,serif;">
<table cellpadding="0" cellspacing="0" width="600" style="margin:0 auto;background:#fff;border:1px solid #e5e5e5;">
    <tr><td style="padding:40px 50px 30px;text-align:center;border-bottom:1px solid #eee;">
        <h1 style="margin:0;font-family:Arial,sans-serif;font-size:13px;letter-spacing:6px;text-transform:uppercase;color:#000;font-weight:900;">${STUDIO_NAME}</h1>
        <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:9px;letter-spacing:4px;color:#999;text-transform:uppercase;">Workshop Registration</p>
    </td></tr>

    <tr><td style="padding:50px 50px 30px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase;font-weight:700;">Booking Confirmed</p>
        <h2 style="margin:15px 0 25px;font-family:Georgia,serif;font-size:32px;color:#000;font-weight:400;line-height:1.2;">You're in, ${firstName}.</h2>
        <p style="margin:0 0 25px;font-family:Georgia,serif;font-size:16px;color:#444;line-height:1.7;">Your registration is confirmed and payment received. I'll be in touch closer to the date with the location, what to bring, and everything else you need.</p>

        <table cellpadding="0" cellspacing="0" width="100%" style="margin:30px 0 20px;background:#fafafa;padding:20px;">
            <tr>
                <td style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#999;text-transform:uppercase;padding-bottom:5px;">Booking ID</td>
                <td style="font-family:Georgia,serif;font-size:14px;color:#000;text-align:right;padding-bottom:5px;">${bookingId}</td>
            </tr>
            <tr>
                <td style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#999;text-transform:uppercase;padding-top:5px;">Payment ID</td>
                <td style="font-family:Georgia,serif;font-size:13px;color:#666;text-align:right;padding-top:5px;">${razorpay_payment_id}</td>
            </tr>
        </table>
    </td></tr>

    <tr><td style="padding:0 50px 30px;">
        <h3 style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#999;margin:0 0 15px;font-weight:700;">Your Booking</h3>
        <table cellpadding="0" cellspacing="0" width="100%" style="font-size:15px;color:#111;border-collapse:collapse;">
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid #eee;font-family:Georgia,serif;">${workshopLabel}</td>
                <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;font-family:Georgia,serif;">${workshopFee}</td>
            </tr>
            <tr>
                <td style="padding:12px 0;font-family:Arial,sans-serif;font-size:12px;color:#666;">Cohort</td>
                <td style="padding:12px 0;text-align:right;font-family:Georgia,serif;font-size:14px;">${cohort}</td>
            </tr>
        </table>
    </td></tr>

    <tr><td style="padding:28px 50px;border-top:1px solid #eee;background:#fafafa;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999;font-weight:700;">One more thing</p>
        <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:15px;color:#222;line-height:1.75;">Before the workshop, I like to understand who is coming and how you already see. A few short questions, nothing formal.</p>
        <a href="https://mohithraisrivastav.com/workshop-intake.html?name=${encodeURIComponent(customer.name)}&email=${encodeURIComponent(customer.email)}&booking=${bookingId}" style="display:inline-block;background:#1A1612;color:#F7F3ED;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;">Before we begin &rarr;</a>
    </td></tr>

    <tr><td style="padding:20px 50px 40px;border-top:1px solid #eee;">
        <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#444;line-height:1.7;">Location details and the pre-workshop brief will come closer to the start date. If you have any questions before then, just reply to this email.</p>
    </td></tr>

    <tr><td style="padding:25px 50px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#999;text-transform:uppercase;">Questions? Reply to this email.</p>
        <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:9px;color:#bbb;">${STUDIO_EMAIL}</p>
    </td></tr>
</table>
</body></html>`;

        // Studio notification email
        const studioHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:30px 20px;background:#f5f5f5;font-family:Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="620" style="margin:0 auto;background:#fff;border:1px solid #ddd;">
    <tr><td style="padding:25px 40px;background:#000;color:#fff;">
        <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#888;font-weight:700;">Workshop Booking · Payment Confirmed</p>
        <h2 style="margin:8px 0 0;font-size:22px;font-weight:900;letter-spacing:1px;">${bookingId}</h2>
    </td></tr>
    <tr><td style="padding:30px 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#333;">
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;width:140px;">Name</td><td style="padding:6px 0;font-weight:600;">${customer.name}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Email</td><td style="padding:6px 0;"><a href="mailto:${customer.email}" style="color:#000;">${customer.email}</a></td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Phone</td><td style="padding:6px 0;">${customer.phone || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Location</td><td style="padding:6px 0;">${customer.city || '—'}, ${customer.country || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Experience</td><td style="padding:6px 0;">${experience || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Medium</td><td style="padding:6px 0;">${medium || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Source</td><td style="padding:6px 0;">${source || '—'}</td></tr>
        </table>
    </td></tr>
    <tr><td style="padding:0 40px 20px;border-top:1px solid #eee;">
        <h3 style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#888;margin:20px 0 10px;font-weight:700;">Workshop</h3>
        <p style="margin:0;font-size:14px;font-weight:700;">${workshopLabel}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#666;">${cohort} · ${workshopFee}</p>
    </td></tr>
    <tr><td style="padding:0 40px 20px;border-top:1px solid #eee;">
        <h3 style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#888;margin:20px 0 10px;font-weight:700;">Why they applied</h3>
        <p style="margin:0;font-size:14px;color:#333;line-height:1.7;font-style:italic;">${motivation || '—'}</p>
    </td></tr>
    <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;">
        <p style="margin:0;font-size:10px;color:#999;letter-spacing:1px;">Payment: ${razorpay_payment_id}</p>
        <p style="margin:6px 0 0;font-size:10px;color:#999;letter-spacing:1px;">Razorpay Order: ${razorpay_order_id}</p>
    </td></tr>
</table>
</body></html>`;

        // Fire emails
        try {
            await Promise.all([
                sendEmail({ to: customer.email, subject: `Booking confirmed · ${bookingId} · ${workshopLabel}`, html: buyerHtml }),
                sendEmail({ to: STUDIO_EMAIL, subject: `Workshop booking · ${bookingId} · ${customer.name} · ${cohort}`, html: studioHtml, replyTo: customer.email })
            ]);
        } catch (emailErr) {
            console.error('Workshop email failed (non-fatal):', emailErr);
        }

        // Sync to Mohith OS: Seats_Sold + Alumni record. Two paths, both
        // non-fatal and idempotent (booking ID processed exactly once):
        //   1. GAS webhook (preferred — no Airtable token needed in Vercel)
        //   2. Direct Airtable write (only if AIRTABLE_TOKEN is set here)
        try {
            if (process.env.GAS_WEBHOOK_URL) {
                await fetch(process.env.GAS_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId,
                        name:         customer.name || '',
                        email:        customer.email || '',
                        phone:        customer.phone || '',
                        city:         customer.city || '',
                        country:      customer.country || '',
                        workshopType,
                        medium:       medium || ''
                    }),
                    redirect: 'follow'
                });
            } else {
                await syncRegistrationToAirtable({ workshopType, customer, medium, bookingId });
            }
        } catch (syncErr) {
            console.error('Mohith OS sync failed (non-fatal):', syncErr);
        }

        return res.status(200).json({ success: true, bookingId });

    } catch (err) {
        console.error('verify-workshop-payment error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
    }
};
