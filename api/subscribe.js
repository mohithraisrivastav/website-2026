// ============================================================
// Newsletter subscription handler
// Fields: email
// Sends: thank-you to subscriber + notification to owner
// ============================================================

const STUDIO_EMAIL  = 'info@mohithraisrivastav.com';
const UPDATES_EMAIL = 'updates@mohithraisrivastav.com';
const FROM_ADDRESS  = 'updates@mohithraisrivastav.com';
const STUDIO_NAME   = 'Mohith Rai Srivastav';
const AUDIENCE_ID   = process.env.RESEND_AUDIENCE_ID; // set in Vercel env vars

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

// Save the subscriber to a Resend Audience (the mailing list).
// Best-effort: if no audience is configured or the call fails, signup still succeeds.
async function resendAddContact(email) {
    if (!AUDIENCE_ID) return; // audience not set up yet — skip silently
    const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
        method:  'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type':  'application/json'
        },
        body: JSON.stringify({ email, unsubscribed: false })
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend audience ${res.status}: ${err}`);
    }
    return res.json();
}

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body || {};

    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address.' });

    try {
        // 0. Save subscriber to the mailing list (best-effort — never blocks signup)
        await resendAddContact(email).catch(e => console.error('Audience add failed:', e.message));

        await Promise.all([
            // 1. Thank-you to subscriber
            resendSend({
                to:      email,
                replyTo: STUDIO_EMAIL,
                subject: "You're on the list.",
                html: [
                    '<p style="font-family:Georgia,serif;font-size:16px;line-height:1.8;color:#1A1612;">Thank you for signing up.</p>',
                    '<p style="font-family:Georgia,serif;font-size:16px;line-height:1.8;color:#1A1612;">You\'ll hear from me when there\'s new work, an upcoming workshop opening, or something worth sharing — sent rarely, never noise.</p>',
                    '<p style="font-family:Georgia,serif;font-size:16px;line-height:1.8;color:#1A1612;">— Mohith<br><a href="https://www.mohithraisrivastav.com" style="color:#CFA246;">mohithraisrivastav.com</a></p>'
                ].join('')
            }),
            // 2. Notification to owner
            resendSend({
                to:      UPDATES_EMAIL,
                replyTo: email,
                subject: `New subscriber: ${email}`,
                html:    `<p style="font-family:Georgia,serif;">${email} just subscribed via the website newsletter form.</p>`
            })
        ]);

        return res.status(200).json({ ok: true });

    } catch (err) {
        console.error('Subscribe error:', err.message);
        return res.status(500).json({ error: 'Failed to send. Please try again.' });
    }
};
