// ============================================================
// Email sender via Resend API.
// Sends buyer receipt + seller notification.
// ============================================================

const STUDIO_EMAIL = 'info@mohithraisrivastav.com';
const STUDIO_NAME = 'Mohith Rai Srivastav';
const FROM_ADDRESS = 'orders@mohithraisrivastav.com'; // must be verified in Resend

// Your GST number (edit this)
const STUDIO_GSTIN = '36GCLPS5619N1ZN';

function fmtINR(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

async function resendSend({ to, subject, html, replyTo }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: `${STUDIO_NAME} <${FROM_ADDRESS}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            reply_to: replyTo || STUDIO_EMAIL
        })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Resend failed: ${res.status} ${text}`);
    }
    return res.json();
}

function itemRows(items) {
    return items.map(i => `
        <tr>
            <td style="padding:14px 0; border-bottom:1px solid #eee; font-family:Georgia,serif; font-size:15px; color:#111;">${i.title}</td>
            <td style="padding:14px 0; border-bottom:1px solid #eee; text-align:right; font-family:Georgia,serif; font-size:15px; color:#111;">${fmtINR(i.price)}</td>
        </tr>
    `).join('');
}

function addressBlock(c) {
    const parts = [c.address1, c.address2, c.city, c.state, c.postal, c.country].filter(Boolean);
    return parts.join(', ');
}

// --- BUYER EMAIL (receipt) ---
async function sendBuyerEmail({ orderId, paymentId, items, customer, breakdown, downloads }) {
    const isDomestic = (customer.country || 'IN') === 'IN';
    const showGst = isDomestic && breakdown.gst > 0;

    const downloadsHtml = (downloads && downloads.length) ? `
        <tr><td colspan="2" style="padding:30px 0 10px;">
            <h3 style="font-family:Arial,sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#999; margin:0 0 15px; font-weight:700;">Digital Downloads</h3>
            ${downloads.map(d => `<p style="margin:8px 0; font-family:Georgia,serif; font-size:14px;"><a href="${d.url}" style="color:#000; font-weight:600;">${d.title} →</a></p>`).join('')}
            <p style="font-family:Arial,sans-serif; font-size:11px; color:#999; margin-top:12px;">Download links valid for 7 days.</p>
        </td></tr>
    ` : '';

    const html = `
    <!DOCTYPE html><html><body style="margin:0; padding:40px 20px; background:#f5f5f5; font-family:Georgia,serif;">
    <table cellpadding="0" cellspacing="0" width="600" style="margin:0 auto; background:#fff; border:1px solid #e5e5e5;">
        <tr><td style="padding:40px 50px 30px; text-align:center; border-bottom:1px solid #eee;">
            <h1 style="margin:0; font-family:Arial,sans-serif; font-size:13px; letter-spacing:6px; text-transform:uppercase; color:#000; font-weight:900;">${STUDIO_NAME}</h1>
            <p style="margin:8px 0 0; font-family:Arial,sans-serif; font-size:9px; letter-spacing:4px; color:#999; text-transform:uppercase;">Architectural Photography</p>
        </td></tr>

        <tr><td style="padding:50px 50px 30px;">
            <p style="margin:0; font-family:Arial,sans-serif; font-size:10px; letter-spacing:3px; color:#999; text-transform:uppercase; font-weight:700;">Order Confirmed</p>
            <h2 style="margin:15px 0 25px; font-family:Georgia,serif; font-size:32px; color:#000; font-weight:400; line-height:1.2;">Thank you, ${customer.name.split(' ')[0]}.</h2>
            <p style="margin:0 0 25px; font-family:Georgia,serif; font-size:16px; color:#444; line-height:1.7;">Your order has been received and payment confirmed. Your prints will be hand-packed and dispatched within 2–3 business days.</p>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin:30px 0 20px; background:#fafafa; padding:20px;">
                <tr><td style="font-family:Arial,sans-serif; font-size:10px; letter-spacing:2px; color:#999; text-transform:uppercase; padding-bottom:5px;">Order ID</td>
                    <td style="font-family:Georgia,serif; font-size:14px; color:#000; text-align:right; padding-bottom:5px;">${orderId}</td></tr>
                <tr><td style="font-family:Arial,sans-serif; font-size:10px; letter-spacing:2px; color:#999; text-transform:uppercase; padding-top:5px;">Payment ID</td>
                    <td style="font-family:Georgia,serif; font-size:13px; color:#666; text-align:right; padding-top:5px;">${paymentId}</td></tr>
            </table>
        </td></tr>

        <tr><td style="padding:0 50px;">
            <h3 style="font-family:Arial,sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#999; margin:0 0 15px; font-weight:700;">Items</h3>
            <table cellpadding="0" cellspacing="0" width="100%">
                ${itemRows(items)}
            </table>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:25px;">
                <tr><td style="padding:8px 0; font-family:Arial,sans-serif; font-size:12px; color:#666;">Subtotal</td>
                    <td style="padding:8px 0; text-align:right; font-family:Georgia,serif; font-size:14px; color:#111;">${fmtINR(breakdown.subtotal)}</td></tr>
                <tr><td style="padding:8px 0; font-family:Arial,sans-serif; font-size:12px; color:#666;">Shipping (${isDomestic ? 'Domestic' : 'International'})</td>
                    <td style="padding:8px 0; text-align:right; font-family:Georgia,serif; font-size:14px; color:#111;">${fmtINR(breakdown.shipping)}</td></tr>
                ${showGst ? `<tr><td style="padding:8px 0; font-family:Arial,sans-serif; font-size:12px; color:#666;">GST (12%)</td>
                    <td style="padding:8px 0; text-align:right; font-family:Georgia,serif; font-size:14px; color:#111;">${fmtINR(breakdown.gst)}</td></tr>` : ''}
                <tr><td style="padding:15px 0 8px; border-top:2px solid #000; font-family:Arial,sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#000; font-weight:700;">Total Paid</td>
                    <td style="padding:15px 0 8px; border-top:2px solid #000; text-align:right; font-family:Georgia,serif; font-size:22px; color:#000; font-weight:700;">${fmtINR(breakdown.total)}</td></tr>
            </table>

            ${downloadsHtml}
        </td></tr>

        ${(customer.address1) ? `
        <tr><td style="padding:30px 50px;">
            <h3 style="font-family:Arial,sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#999; margin:0 0 10px; font-weight:700;">Shipping To</h3>
            <p style="margin:0; font-family:Georgia,serif; font-size:14px; color:#333; line-height:1.7;">
                ${customer.name}<br>${addressBlock(customer)}<br>${customer.phone}
            </p>
        </td></tr>` : ''}

        <tr><td style="padding:20px 50px 40px; border-top:1px solid #eee;">
            <h3 style="font-family:Arial,sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#999; margin:0 0 15px; font-weight:700;">Next Steps</h3>
            <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:14px; color:#444; line-height:1.7;">
                Your archival prints will be carefully rolled into a rigid shipping tube with corner protection. You'll receive a separate dispatch email with courier tracking once the package leaves the studio.
            </p>
            <p style="margin:15px 0 0; font-family:Georgia,serif; font-size:14px; color:#444; line-height:1.7;">
                Estimated delivery: <strong>${isDomestic ? '7–10 days' : '14–21 days'}</strong>. A signed certificate of authenticity is enclosed with every print.
            </p>
        </td></tr>

        <tr><td style="padding:25px 50px; background:#fafafa; border-top:1px solid #eee; text-align:center;">
            <p style="margin:0; font-family:Arial,sans-serif; font-size:10px; letter-spacing:2px; color:#999; text-transform:uppercase;">Questions? Reply to this email.</p>
            <p style="margin:10px 0 0; font-family:Arial,sans-serif; font-size:9px; color:#bbb;">${STUDIO_EMAIL} · GSTIN: ${STUDIO_GSTIN}</p>
        </td></tr>
    </table>
    </body></html>`;

    return resendSend({
        to: customer.email,
        subject: `Order confirmed · ${orderId} · ${STUDIO_NAME}`,
        html
    });
}

// --- SELLER EMAIL (order notification) ---
async function sendSellerEmail({ orderId, paymentId, razorpayOrderId, items, customer, breakdown }) {
    const isDomestic = (customer.country || 'IN') === 'IN';

    const html = `
    <!DOCTYPE html><html><body style="margin:0; padding:30px 20px; background:#f5f5f5; font-family:Arial,sans-serif;">
    <table cellpadding="0" cellspacing="0" width="640" style="margin:0 auto; background:#fff; border:1px solid #ddd;">
        <tr><td style="padding:25px 40px; background:#000; color:#fff;">
            <p style="margin:0; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#888; font-weight:700;">New Order · ${isDomestic ? 'Domestic' : 'International'}</p>
            <h2 style="margin:8px 0 0; font-size:22px; font-weight:900; letter-spacing:1px;">${orderId}</h2>
        </td></tr>

        <tr><td style="padding:30px 40px 20px;">
            <table cellpadding="0" cellspacing="0" width="100%" style="font-size:13px; color:#333;">
                <tr><td style="padding:6px 0; color:#888; font-size:11px; text-transform:uppercase; letter-spacing:1px; width:130px;">Customer</td><td style="padding:6px 0; font-weight:600;">${customer.name}</td></tr>
                <tr><td style="padding:6px 0; color:#888; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Email</td><td style="padding:6px 0;"><a href="mailto:${customer.email}" style="color:#000;">${customer.email}</a></td></tr>
                <tr><td style="padding:6px 0; color:#888; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Phone</td><td style="padding:6px 0;"><a href="tel:${customer.phone}" style="color:#000;">${customer.phone}</a></td></tr>
                ${customer.gstin ? `<tr><td style="padding:6px 0; color:#888; font-size:11px; text-transform:uppercase; letter-spacing:1px;">GSTIN</td><td style="padding:6px 0;">${customer.gstin}</td></tr>` : ''}
            </table>
        </td></tr>

        <tr><td style="padding:0 40px 20px;">
            <h3 style="font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#888; margin:15px 0 10px; font-weight:700;">Ship To</h3>
            <p style="margin:0; font-size:13px; color:#333; line-height:1.7;">
                ${customer.name}<br>
                ${customer.address1 || ''}${customer.address2 ? '<br>' + customer.address2 : ''}<br>
                ${customer.city || ''}, ${customer.state || ''} ${customer.postal || ''}<br>
                ${customer.country}
                ${customer.notes ? `<br><em style="color:#888; font-size:12px;">Note: ${customer.notes}</em>` : ''}
            </p>
        </td></tr>

        <tr><td style="padding:20px 40px; border-top:1px solid #eee;">
            <h3 style="font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#888; margin:0 0 15px; font-weight:700;">Items (${items.length})</h3>
            <table cellpadding="0" cellspacing="0" width="100%">
                ${itemRows(items)}
            </table>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
                <tr><td style="padding:6px 0; font-size:12px; color:#666;">Subtotal</td><td style="padding:6px 0; text-align:right; font-size:13px;">${fmtINR(breakdown.subtotal)}</td></tr>
                <tr><td style="padding:6px 0; font-size:12px; color:#666;">Shipping</td><td style="padding:6px 0; text-align:right; font-size:13px;">${fmtINR(breakdown.shipping)}</td></tr>
                ${breakdown.gst > 0 ? `<tr><td style="padding:6px 0; font-size:12px; color:#666;">GST</td><td style="padding:6px 0; text-align:right; font-size:13px;">${fmtINR(breakdown.gst)}</td></tr>` : ''}
                <tr><td style="padding:12px 0 6px; border-top:2px solid #000; font-size:11px; text-transform:uppercase; letter-spacing:2px; font-weight:700;">Total Received</td><td style="padding:12px 0 6px; border-top:2px solid #000; text-align:right; font-size:18px; font-weight:700;">${fmtINR(breakdown.total)}</td></tr>
            </table>
        </td></tr>

        <tr><td style="padding:20px 40px; background:#fafafa; border-top:1px solid #eee;">
            <p style="margin:0; font-size:10px; color:#999; letter-spacing:1px;">Payment: ${paymentId}</p>
            <p style="margin:6px 0 0; font-size:10px; color:#999; letter-spacing:1px;">Razorpay Order: ${razorpayOrderId}</p>
        </td></tr>
    </table>
    </body></html>`;

    return resendSend({
        to: STUDIO_EMAIL,
        subject: `🎨 New order · ${orderId} · ${fmtINR(breakdown.total)} · ${customer.name}`,
        html,
        replyTo: customer.email
    });
}

// ============================================================
// Contact email HTML builders (used by api/contact.js)
// ============================================================

function buildOwnerEmail({ name, email, inquiry_type, message, budget }) {
    const now = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const safeMsg = (message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#f0f0f0;font-family:Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="600" style="margin:0 auto;background:#fff;border:1px solid #ddd;">
  <tr><td style="padding:28px 40px;background:#000;">
    <p style="margin:0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#888;font-weight:700;">Incoming Enquiry</p>
    <h2 style="margin:8px 0 0;font-size:20px;color:#fff;font-weight:900;letter-spacing:1px;">${inquiry_type || 'General'}</h2>
  </td></tr>
  <tr><td style="padding:32px 40px 20px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:#333;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;width:120px;border-bottom:1px solid #f0f0f0;">From</td>
        <td style="padding:10px 0;font-weight:700;border-bottom:1px solid #f0f0f0;">${name}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #f0f0f0;">Email</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><a href="mailto:${email}" style="color:#000;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #f0f0f0;">Inquiry Type</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">${inquiry_type || '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #f0f0f0;">Budget</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">${budget || '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;">Received</td>
        <td style="padding:10px 0;">${now} IST</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 40px 32px;">
    <p style="margin:0 0 10px;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;font-weight:700;">Message</p>
    <div style="background:#fafafa;border-left:3px solid #000;padding:20px 24px;font-size:15px;line-height:1.75;color:#222;white-space:pre-wrap;">${safeMsg}</div>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
    <a href="mailto:${email}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:14px 28px;">Reply to ${name.split(' ')[0]} →</a>
  </td></tr>
</table>
</body></html>`;
}

function buildAcknowledgementEmail({ name }) {
    return `
<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#f0f0f0;font-family:Georgia,serif;">
<table cellpadding="0" cellspacing="0" width="600" style="margin:0 auto;background:#fff;border:1px solid #ddd;">
  <tr><td style="padding:36px 50px 28px;text-align:center;border-bottom:1px solid #eee;">
    <h1 style="margin:0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#000;font-weight:900;">${STUDIO_NAME}</h1>
    <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:8px;letter-spacing:4px;color:#999;text-transform:uppercase;">Architectural Photography · Goa, India</p>
  </td></tr>
  <tr><td style="padding:50px 50px 30px;">
    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:9px;letter-spacing:4px;color:#999;text-transform:uppercase;font-weight:700;">Acknowledgement</p>
    <h2 style="margin:16px 0 24px;font-size:30px;font-weight:400;line-height:1.2;color:#000;">Received,<br>${name.split(' ')[0]}.</h2>
    <p style="margin:0 0 20px;font-size:16px;font-weight:300;color:#555;line-height:1.8;">Thank you for reaching out. Your message has been received at the studio and I will personally respond within 24–48 hours.</p>
    <p style="margin:0;font-size:15px;font-weight:300;color:#888;line-height:1.8;font-style:italic;">Every project begins with a conversation — I look forward to ours.</p>
  </td></tr>
  <tr><td style="padding:24px 50px;border-top:1px solid #eee;">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="font-family:Arial,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#bbb;padding-bottom:6px;">Direct contact</td></tr>
      <tr><td style="font-family:Georgia,serif;font-size:14px;color:#333;">
        <a href="mailto:${STUDIO_EMAIL}" style="color:#000;font-weight:600;">${STUDIO_EMAIL}</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="https://wa.me/919014753403" style="color:#000;">+91 90147 53403</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 50px 28px;text-align:center;background:#000;">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#555;">Goa, India · Global Commissions</p>
  </td></tr>
</table>
</body></html>`;
}

module.exports = { sendBuyerEmail, sendSellerEmail, buildOwnerEmail, buildAcknowledgementEmail };
