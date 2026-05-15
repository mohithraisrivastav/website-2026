// ============================================================
// Contact form handler
// Fields: name, email, inquiry_type, message, budget
// Sends: notification to studio + acknowledgement to sender
// ============================================================

const { buildOwnerEmail, buildAcknowledgementEmail } = require('./_lib/email.js');

const STUDIO_EMAIL = 'info@mohithraisrivastav.com';
const FROM_ADDRESS = 'studio@mohithraisrivastav.com';
const STUDIO_NAME  = 'Mohith Rai Srivastav';

async function resendSend({ to, subject, html, replyTo }) {
    const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type':  'application/json'
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
        const err = await res.text();
        throw new Error(`Resend ${res.status}: ${err}`);
    }
    return res.json();
}

module.exports = async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, inquiry_type, message, budget } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }

    try {
        await Promise.all([
            // ── 1. Notification to studio ─────────────────────────────
            resendSend({
                to:      STUDIO_EMAIL,
                replyTo: email,
                subject: `New Enquiry: ${inquiry_type || 'General'} — ${name}`,
                html:    buildOwnerEmail({ name, email, inquiry_type, message, budget })
            }),
            // ── 2. Acknowledgement to sender ──────────────────────────
            resendSend({
                to:      email,
                replyTo: STUDIO_EMAIL,
                subject: `Received — ${STUDIO_NAME}`,
                html:    buildAcknowledgementEmail({ name })
            })
        ]);

        return res.status(200).json({ ok: true });

    } catch (err) {
        console.error('Contact email error:', err.message);
        return res.status(500).json({ error: 'Failed to send. Please try again or email directly.' });
    }
};
