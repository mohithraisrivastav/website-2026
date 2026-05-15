// ============================================================
// POST /api/verify-workshop-payment
// Verifies Razorpay HMAC signature for workshop payment,
// sends confirmation emails to buyer and studio.
// ============================================================

const crypto = require('crypto');

const STUDIO_EMAIL = 'info@mohithraisrivastav.com';
const STUDIO_NAME  = 'Mohith Rai Srivastav';
const FROM_ADDRESS = 'orders@mohithraisrivastav.com';

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

        return res.status(200).json({ success: true, bookingId });

    } catch (err) {
        console.error('verify-workshop-payment error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
    }
};
