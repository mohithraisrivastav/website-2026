# Checkout System — Setup Guide

This guide walks you through deploying the checkout system end-to-end. One-time setup takes **~30–45 minutes**.

---

## Architecture

```
Browser → checkout.html → Vercel API → Razorpay → Resend (email)
                              ↓
                         Order verified
                              ↓
              Buyer receipt + Seller notification
```

- **Frontend:** static HTML/JS (checkout.html, checkout.js, order-success.html, order-failed.html)
- **Backend:** 2 Vercel serverless functions (create-order, verify-payment)
- **Payments:** Razorpay (UPI, cards, netbanking, EMI, wallets)
- **Email:** Resend (transactional)

---

## Step 1 — Razorpay Account

1. Sign up at **https://dashboard.razorpay.com/signup** (free, no card required)
2. You'll immediately get **test mode keys** — use these for development
3. Go to **Settings → API Keys → Generate Test Key**
4. Copy both values:
   - `Key ID` (starts with `rzp_test_`)
   - `Key Secret` (shown once — save it now)
5. For **live mode** (real money): Complete KYC (PAN, GST, bank account, business proof). Takes 1-2 business days. Once approved, generate live keys from the same page.

**Fees:** 2% + GST on domestic transactions, 3% on international.

---

## Step 2 — Resend Account (Email)

1. Sign up at **https://resend.com/signup** (free tier: 3000 emails/month, 100/day)
2. Go to **Domains → Add Domain** → enter `mohithraisrivastav.com`
3. Resend shows 3 DNS records (MX, TXT, CNAME). Add them to your domain registrar (wherever you bought `mohithraisrivastav.com`):
   - GoDaddy / Namecheap / Google Domains → DNS Management → Add Record
4. Wait 5–30 minutes, then click **Verify** in Resend
5. Go to **API Keys → Create API Key** → copy it (starts with `re_`)

**Important:** The `from` address in `api/_lib/email.js` is `orders@mohithraisrivastav.com`. Change this if you prefer a different address — must be on your verified domain.

---

## Step 3 — Local Testing (Optional but Recommended)

### Install tools
```bash
# Install Node.js 18+ from nodejs.org, then:
npm install -g vercel
npm install
```

### Create `.env.local`
Copy `.env.example` to `.env.local` and fill in your keys:
```
RAZORPAY_KEY_ID=rzp_test_abc123xyz
RAZORPAY_KEY_SECRET=your_secret_here
RESEND_API_KEY=re_abc123xyz
```

### Update frontend key
In `checkout.js`, update:
```js
RAZORPAY_KEY_ID: 'rzp_test_abc123xyz'  // same as above
```

### Run locally
```bash
vercel dev
```
Opens at `http://localhost:3000`. Add an item to cart on shop.html, click "Initiate Purchase".

**Test card:** `4111 1111 1111 1111` · CVV `123` · any future expiry
**Test UPI:** `success@razorpay`

---

## Step 4 — Deploy to Vercel

### First-time deploy
```bash
vercel login
vercel --prod
```
Vercel will ask a few questions; accept defaults. You'll get a URL like `mohith-rai-srivastav.vercel.app`.

### Add environment variables
Go to **vercel.com → your project → Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_...` (or `rzp_live_...` when going live) |
| `RAZORPAY_KEY_SECRET` | your secret |
| `RESEND_API_KEY` | `re_...` |

After adding, redeploy: `vercel --prod`

### Connect custom domain
Vercel → Settings → Domains → Add `mohithraisrivastav.com` → follow DNS instructions.

---

## Step 5 — Go Live

When you're ready to accept real payments:

1. **Complete Razorpay KYC** (dashboard banner will prompt you)
2. **Generate Live Keys** (Settings → API Keys → switch to Live mode)
3. **Update Vercel env vars:**
   - `RAZORPAY_KEY_ID` → `rzp_live_...`
   - `RAZORPAY_KEY_SECRET` → live secret
4. **Update `checkout.js`** `RAZORPAY_KEY_ID` to the live public key
5. **Redeploy:** `vercel --prod`
6. **Test with a real ₹1 transaction** to yourself before announcing

---

## Files You Need to Edit

| File | What to edit |
|---|---|
| `checkout.js` | `RAZORPAY_KEY_ID` (line 10), shipping rates (line 19-22) |
| `api/_lib/email.js` | `STUDIO_GSTIN` (line 11) — your real GST number |
| `api/verify-payment.js` | `DIGITAL_DOWNLOADS` URLs (line 9) when you upload digital files |

---

## Customising Shipping Rates

Shipping is **weight × zone** based. Formula: `base + ceil(totalWeight − 2kg) × perKg`.

**Zones:** 0 Goa · 1 India · 2 SAARC · 3 ME/SE Asia · 4 Europe · 5 Americas/RoW

Edit both files (values must match):
- `checkout.js` → `SHIPPING_ZONES`, `COUNTRY_ZONES`, `PRODUCT_WEIGHTS`
- `api/create-order.js` → same three constants at the top

**To update rates:** change the `base` and `perKg` values per zone in both files.
**To add a country:** add it to `COUNTRY_ZONES` with its zone number (0–5).
**To adjust product weight:** edit `PRODUCT_WEIGHTS` (kg, including tube/packaging).

Recommended: Get actual quotes from **Sequel Logistics** (art specialist), **DHL**, or **Blue Dart** for your typical tube dimensions (~36in tube, 2kg) and plug the real numbers in.

---

## Adding Digital Downloads

1. Upload the digital file (PDF, zip) to Google Drive, Dropbox, or Vercel Blob
2. Generate a **direct download link** (not a viewer link)
3. Edit `api/verify-payment.js`:
```js
const DIGITAL_DOWNLOADS = {
    'The Matter of Pause (Digital)': {
        url: 'https://drive.google.com/uc?id=YOUR_FILE_ID&export=download',
        title: 'The Matter of Pause (Digital Monograph)'
    }
};
```
4. Redeploy.

---

## Invoice / GST Compliance

Emails show GSTIN and GST breakdown. For formal **tax invoices**:

- Keep sequential invoice numbers in your books
- Export orders from Razorpay Dashboard → Payments → Export (CSV) for your CA
- For high-volume: integrate **Razorpay Invoices API** or **Zoho Books** webhook

**GST on exports (international shipping):** zero-rated. The code automatically sets GST=0 for non-IN country. Keep shipping proofs for LUT compliance.

---

## Order Management

Orders are currently logged via:
1. **Seller email** → `info@mohithraisrivastav.com` (immediate notification)
2. **Razorpay Dashboard** → full payment history + refunds

For a proper order database (ship status, tracking, notes), add **Supabase** (free) later. Happy to implement when needed.

---

## Refunds

Issued manually from **Razorpay Dashboard → Payments → [find order] → Refund**. Takes 5–7 business days to hit the buyer's card/UPI.

---

## Testing Checklist

Before announcing:

- [ ] Test card payment → receive both emails
- [ ] Test UPI payment → receive both emails
- [ ] Test international order (use USA address) → GST=0, shipping=international rate
- [ ] Test digital-only order → no shipping, download link in email
- [ ] Test failed payment → redirects to order-failed.html
- [ ] Test empty cart → button disabled
- [ ] Check buyer email renders correctly in Gmail + Apple Mail
- [ ] Verify seller email arrives at info@mohithraisrivastav.com

---

## Support

- Razorpay support: support@razorpay.com (24×7)
- Resend support: support@resend.com
- Vercel support: vercel.com/help
