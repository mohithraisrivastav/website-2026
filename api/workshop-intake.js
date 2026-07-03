// ============================================================
// POST /api/workshop-intake
// Receives pre-workshop intake form responses and emails
// them to the studio as a formatted brief.
// ============================================================

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
        const {
            name,
            email,
            practice,
            location,
            medium,
            drewYou,
            hoping,
            whenGoa,
            anything,
            bookingId
        } = req.body || {};

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required' });
        }

        const subject = bookingId
            ? `Before we begin · ${name} · ${bookingId}`
            : `Before we begin · ${name}`;

        const studioHtml = `
<!DOCTYPE html><html><body style="margin:0;padding:30px 20px;background:#f5f5f5;font-family:Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="620" style="margin:0 auto;background:#fff;border:1px solid #ddd;">
    <tr><td style="padding:28px 40px;background:#1A1612;color:#F7F3ED;">
        <p style="margin:0;font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(247,243,237,0.45);font-weight:700;">Lived Space · Pre-Workshop Intake</p>
        <h2 style="margin:10px 0 0;font-family:Georgia,serif;font-size:26px;font-weight:400;letter-spacing:0.5px;">${name}</h2>
        ${bookingId ? `<p style="margin:8px 0 0;font-size:10px;letter-spacing:2px;color:rgba(207,162,70,0.8);text-transform:uppercase;">${bookingId}</p>` : ''}
    </td></tr>
    <tr><td style="padding:32px 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="100%">
            ${row('Email', `<a href="mailto:${email}" style="color:#1A1612;">${email}</a>`)}
            ${row('Practice / Role', practice)}
            ${row('Based in', location)}
            ${row('Medium', medium)}
            ${row('What drew them', drewYou)}
            ${row('Hoping to take', hoping)}
            ${row('When in Goa', whenGoa)}
            ${row('Anything else', anything)}
        </table>
    </td></tr>
    <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;">
        <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:1px;">Reply directly to this email to reach ${name}.</p>
    </td></tr>
</table>
</body></html>`;

        await sendEmail({
            to: STUDIO_EMAIL,
            subject,
            html: studioHtml,
            replyTo: email
        });

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('workshop-intake error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Submission failed' });
    }
};
