// Workshop feedback handler
// Fields: name, email, phone, workshop_date, card, deck_experience, workshop_experience, recommend, other
// Sends notification to studio only (no acknowledgement — email is optional)

const STUDIO_EMAIL = 'updates@mohithraisrivastav.com';
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
            from:     `${STUDIO_NAME} Studio <${FROM_ADDRESS}>`,
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
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, phone, workshop_date, card, deck_experience, workshop_experience, recommend, shift, other } = req.body || {};

    const shiftLabels = {
        'yes-cant-unsee':  "Yes, I can't unsee it now",
        'still-processing': 'I think so... still processing',
        'need-alone-time': 'Ask me again after some alone time',
        'not-yet':         'Honestly, not yet'
    };

    if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
    }

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1A1612;">
  <h2 style="color:#E2660F;margin-bottom:4px;">Explorer's Deck — Workshop Feedback</h2>
  <p style="color:#888;margin-top:0;">${workshop_date || 'Date not specified'}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#888;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
    <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;">${email || '—'}</td></tr>
    <tr><td style="padding:8px 0;color:#888;">Mobile</td><td style="padding:8px 0;">${phone || '—'}</td></tr>
    <tr><td style="padding:8px 0;color:#888;">Recommend?</td><td style="padding:8px 0;">${recommend || '—'}</td></tr>
    ${shift ? `<tr><td style="padding:8px 0;color:#888;">Changed how they see?</td><td style="padding:8px 0;">${shiftLabels[shift] || shift}</td></tr>` : ''}
    ${card ? `<tr><td style="padding:8px 0;color:#888;">Card received</td><td style="padding:8px 0;">${card}</td></tr>` : ''}
  </table>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
  <p style="color:#888;margin-bottom:6px;">Experience with the deck</p>
  <p style="margin:0 0 16px;white-space:pre-wrap;">${deck_experience || '—'}</p>
  ${workshop_experience ? `<p style="color:#888;margin-bottom:6px;">Workshop overall</p><p style="margin:0 0 16px;white-space:pre-wrap;">${workshop_experience}</p>` : ''}
  ${other ? `<p style="color:#888;margin-bottom:6px;">Other thoughts</p><p style="margin:0 0 16px;white-space:pre-wrap;">${other}</p>` : ''}
</div>`;

    try {
        await resendSend({
            to:      STUDIO_EMAIL,
            replyTo: email || STUDIO_EMAIL,
            subject: `Workshop Feedback — ${name}`,
            html
        });

        // Save to Google Sheets via Apps Script web app (set GOOGLE_SHEETS_WEBHOOK in Vercel env)
        if (process.env.GOOGLE_SHEETS_WEBHOOK) {
            await fetch(process.env.GOOGLE_SHEETS_WEBHOOK, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, workshop_date, card, deck_experience, workshop_experience, recommend, other })
            }).catch(err => console.error('Sheets webhook error:', err.message));
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Workshop feedback error:', err.message);
        return res.status(500).json({ error: 'Failed to send. Please try again.' });
    }
};
