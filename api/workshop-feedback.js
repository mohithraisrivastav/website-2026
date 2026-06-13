// Workshop feedback handler
// Fields: name, email (optional), workshop_date, rating, valuable, improve, recommend, other
// Sends notification to studio only (no acknowledgement — email is optional)

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

    const { name, email, workshop_date, rating, valuable, improve, recommend, other } = req.body || {};

    if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
    }

    const stars = '★'.repeat(parseInt(rating) || 0) + '☆'.repeat(5 - (parseInt(rating) || 0));

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1A1612;">
  <h2 style="color:#E2660F;margin-bottom:4px;">Workshop Feedback</h2>
  <p style="color:#888;margin-top:0;">${workshop_date || 'Date not specified'}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#888;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
    <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;">${email || '—'}</td></tr>
    <tr><td style="padding:8px 0;color:#888;">Rating</td><td style="padding:8px 0;font-size:1.2em;">${stars} (${rating || '?'}/5)</td></tr>
    <tr><td style="padding:8px 0;color:#888;">Recommend?</td><td style="padding:8px 0;">${recommend || '—'}</td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
  <p style="color:#888;margin-bottom:6px;">Most valuable</p>
  <p style="margin:0 0 16px;white-space:pre-wrap;">${valuable || '—'}</p>
  <p style="color:#888;margin-bottom:6px;">What could improve</p>
  <p style="margin:0 0 16px;white-space:pre-wrap;">${improve || '—'}</p>
  ${other ? `<p style="color:#888;margin-bottom:6px;">Other thoughts</p><p style="margin:0 0 16px;white-space:pre-wrap;">${other}</p>` : ''}
</div>`;

    try {
        await resendSend({
            to:      STUDIO_EMAIL,
            replyTo: email || STUDIO_EMAIL,
            subject: `Workshop Feedback — ${rating ? rating + '/5 · ' : ''}${name}`,
            html
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Workshop feedback error:', err.message);
        return res.status(500).json({ error: 'Failed to send. Please try again.' });
    }
};
