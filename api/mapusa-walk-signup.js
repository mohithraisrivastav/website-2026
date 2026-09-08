// ============================================================
// POST /api/mapusa-walk-signup
// Receives Mapusa Market Walk sign-ups and emails them to the
// studio as a formatted brief. Free event — no payment involved.
// ============================================================

const STUDIO_EMAIL = 'updates@mohithraisrivastav.com';
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

function row(label, value) {
    if (!value) return '';
    return `
    <tr>
        <td style="padding:14px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#999;width:180px;vertical-align:top;padding-right:24px;">${label}</td>
        <td style="padding:14px 0;border-bottom:1px solid #eee;font-family:Georgia,serif;font-size:15px;color:#111;line-height:1.7;">${value}</td>
    </tr>`;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { name, mobile, email, practice, day } = req.body || {};

        if (!name || !mobile || !email || !day) {
            return res.status(400).json({ success: false, error: 'Missing required details' });
        }

        const subject = `Mapusa Market Walk · ${day} · ${name}`;

        const participantHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:30px 20px;background:#F7F3ED;font-family:Georgia,serif;">
<table cellpadding="0" cellspacing="0" width="560" style="margin:0 auto;background:#fff;border:1px solid #eee;">
    <tr><td style="padding:36px 40px 28px;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#CFA246;font-weight:700;">Mapusa Market Walk</p>
        <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#1A1612;">You're in.</h2>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#333;">I'll send you the meeting details and anything else you need before the walk.</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#333;">See you at Mapusa Market.</p>
        <table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #eee;padding-top:20px;margin-top:4px;">
            ${row('Day', day)}
            ${row('Where', 'Mapusa Market, Goa')}
        </table>
    </td></tr>
    <tr><td style="padding:18px 40px;background:#fafafa;border-top:1px solid #eee;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#bbb;letter-spacing:1px;">Questions? Reply directly to this email or write to info@mohithraisrivastav.com</p>
    </td></tr>
</table>
</body></html>`;

        const studioHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:30px 20px;background:#f5f5f5;font-family:Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="620" style="margin:0 auto;background:#fff;border:1px solid #ddd;">
    <tr><td style="padding:28px 40px;background:#1A1612;color:#F7F3ED;">
        <p style="margin:0;font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(247,243,237,0.45);font-weight:700;">Mapusa Market Walk · Sign-up</p>
        <h2 style="margin:10px 0 0;font-family:Georgia,serif;font-size:26px;font-weight:400;letter-spacing:0.5px;">${name}</h2>
        <p style="margin:8px 0 0;font-size:10px;letter-spacing:2px;color:rgba(207,162,70,0.8);text-transform:uppercase;">${day}</p>
    </td></tr>
    <tr><td style="padding:32px 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="100%">
            ${row('Email', `<a href="mailto:${email}" style="color:#1A1612;">${email}</a>`)}
            ${row('Mobile', mobile)}
            ${row('What they do', practice)}
        </table>
    </td></tr>
    <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;">
        <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:1px;">Reply directly to this email to reach ${name}.</p>
    </td></tr>
</table>
</body></html>`;

        await Promise.all([
            sendEmail({
                to: email,
                subject: `You're in · Mapusa Market Walk · ${day}`,
                html: participantHtml,
                replyTo: STUDIO_EMAIL
            }),
            sendEmail({
                to: STUDIO_EMAIL,
                subject,
                html: studioHtml,
                replyTo: email
            })
        ]);

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('mapusa-walk-signup error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Submission failed' });
    }
};
