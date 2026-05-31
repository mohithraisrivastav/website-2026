/* ============================================================
   CHECKOUT LOGIC
   Handles cart display, shipping calculation, GST, Razorpay.
   ============================================================ */

// --- CONFIG ---
const CONFIG = {
  // IMPORTANT: Replace with your LIVE key before going to production.
  // Never hardcode the live secret key here — it must stay server-side only.
  RAZORPAY_KEY_ID: '',

  // '' = same-origin (Vercel serverless functions at /api/).
  // Set to full URL e.g. 'https://api.yoursite.com' if backend is separate.
  API_BASE: '',

  // GST: composite supply under CGST Act S.8 — 12% on (subtotal + shipping).
  // Shipping is ancillary to the principal supply (print); same rate applies.
  // International exports are zero-rated.
  GST_RATE: 0.12,

  // Print size → shipping tier.
  // Tiers correspond to wooden crate dimensional weights (approximate):
  //   small ~13 kg | medium ~19 kg | standard ~29 kg | large ~42 kg
  // ADD NEW PRINTS HERE when the catalogue grows.
  PRINT_SIZE_TIERS: {
    'Cosmic Return':     'large',    // 42 × 31.5 in
    'Burnt Earth':       'standard', // 32 × 24 in
    'Chromatic Rupture': 'standard', // 32 × 24 in
    'After The Fall':    'standard', // 32 × 25.5 in
    'Cracked Spectrum':  'standard', // 32 × 21.3 in
    'Still Organism':    'standard', // 24 × 32 in
    'Forgotten Skin':    'standard', // 24 × 32 in
    'Erosion':           'standard', // 24 × 32 in
    'Imprint':           'standard', // 24 × 32 in
  },

  // Fixed domestic shipping per wooden crate, per print, per zone.
  // Zones: 0 = Goa, 1 = Rest of India.
  // Update these once actual crate dimensions and courier rates are confirmed.
  PRINT_SHIPPING_RATES: {
    small:    { 0: 1200, 1: 2500 },
    medium:   { 0: 1800, 1: 3800 },
    standard: { 0: 2800, 1: 5500 },
    large:    { 0: 4000, 1: 8000 },
  },

  // Flat domestic rate for non-print physical items (books, card deck) — per order.
  NON_PRINT_DOMESTIC: { 0: 250, 1: 450 },

  // Country → zone (used only for non-print international orders).
  // Print international shipping is always contact-for-quote.
  COUNTRY_ZONES: {
    NP:2, LK:2, BD:2, BT:2, MV:2,
    AE:3, SA:3, QA:3, OM:3, KW:3, BH:3,
    SG:3, TH:3, MY:3, ID:3, PH:3, VN:3, JP:3, KR:3, HK:3, TW:3, CN:3,
    GB:4, IE:4, DE:4, FR:4, IT:4, ES:4, NL:4, BE:4, CH:4, AT:4,
    SE:4, NO:4, DK:4, FI:4, PT:4, PL:4, CZ:4, GR:4,
    US:5, CA:5, MX:5, BR:5, AR:5, CL:5, AU:5, NZ:5, ZA:5
  },

  // Flat international rate for non-print items (books, card deck) — per order.
  NON_PRINT_INTL: { 2: 1500, 3: 2000, 4: 2800, 5: 3500 },

  // Non-print products: weight = 0 means digital (no shipping).
  // Used only for digital detection — not for calculating shipping cost.
  DIGITAL_PRODUCTS: {
    'The Matter of Pause (Digital)': true,
  },
};

const RAZORPAY_KEY_FALLBACK = 'rzp_live_SnSDb6pnYeccsB';

let razorpayConfigPromise = null;
function loadRazorpayConfig() {
  if (!razorpayConfigPromise) {
    razorpayConfigPromise = fetch('/api/config')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(config => {
        CONFIG.RAZORPAY_KEY_ID = config.razorpayKeyId || RAZORPAY_KEY_FALLBACK;
      })
      .catch(() => {
        CONFIG.RAZORPAY_KEY_ID = RAZORPAY_KEY_FALLBACK;
      });
  }
  return razorpayConfigPromise;
}

// --- STATE ---
// FIX: localStorage wrapped in try/catch — corrupted data resets cleanly
let cart = [];
try {
  const raw = JSON.parse(localStorage.getItem('cart') || '[]');
  cart = Array.isArray(raw) ? raw : [];
} catch (e) {
  console.warn('[checkout] Cart data corrupted — resetting.', e);
  localStorage.removeItem('cart');
}

let currentTotals = { subtotal: 0, shipping: 0, gst: 0, total: 0 };

// --- HELPERS ---
function fmt(n) {
  // Use multi-currency formatter when available; fall back to INR
  if (typeof window.formatPrice === 'function') return window.formatPrice(Math.round(n));
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// Returns the shipping tier ('small'|'medium'|'standard'|'large') for a print,
// or null if the item is not a print (book, deck, digital).
//
// Priority:
//   1. Size suffix in title  e.g. "Burnt Earth — Small (46×35 cm)"  → 'small'
//   2. PRINT_SIZE_TIERS lookup by base product name (fixed-size prints)
function getItemTier(title) {
  // 1. Extract size name from suffix added by the product modal
  const sizeMatch = title.match(/[—\-–]\s*(Small|Medium|Standard|Large)\s*\(/i);
  if (sizeMatch) {
    const sizeMap = { small: 'small', medium: 'medium', standard: 'standard', large: 'large' };
    const tier = sizeMap[sizeMatch[1].toLowerCase()];
    if (tier) return tier;
  }
  // 2. Fall back to per-product lookup (for titles without a size suffix)
  if (CONFIG.PRINT_SIZE_TIERS[title] !== undefined) return CONFIG.PRINT_SIZE_TIERS[title];
  const base = title.replace(/\s+[—\-–].+$/, '').trim();
  if (CONFIG.PRINT_SIZE_TIERS[base] !== undefined) return CONFIG.PRINT_SIZE_TIERS[base];
  return null;
}

function isPrint(title) {
  return getItemTier(title) !== null;
}

function isDigital(title) {
  if (CONFIG.DIGITAL_PRODUCTS[title]) return true;
  const base = title.replace(/\s+[—\-–].+$/, '').trim();
  return !!CONFIG.DIGITAL_PRODUCTS[base];
}

function isDomestic() {
  return document.getElementById('countrySelect').value === 'IN';
}

// FIX: Goa detection normalises state input — handles spaces, caps, "North Goa" etc.
function getZone() {
  const country = document.getElementById('countrySelect').value;
  if (country === 'IN') {
    const stateEl  = document.querySelector('[name="state"]');
    const postalEl = document.querySelector('[name="postal"]');
    const state    = (stateEl?.value || '').trim().toLowerCase().replace(/\s+/g, '');
    const postal   = (postalEl?.value || '').trim();
    // Match "goa", "ga", "northgoa", "southgoa", or any 403xxx pincode
    if (state === 'goa' || state === 'ga' || state.includes('goa') || /^403\d{3}$/.test(postal)) return 0;
    return 1;
  }
  return CONFIG.COUNTRY_ZONES[country] != null ? CONFIG.COUNTRY_ZONES[country] : 5;
}

// Returns shipping cost in ₹, or null if the order contains prints shipping
// internationally (requires manual quote — payment is blocked in this case).
function calculateShipping() {
  if (cart.length === 0) return 0;

  const country      = document.getElementById('countrySelect').value;
  const international = country !== 'IN';
  const zone         = getZone(); // 0=Goa, 1=India, 2-5=international zones

  // International + any print in cart → contact-for-quote (null = blocked)
  if (international && cart.some(i => isPrint(i.title))) return null;

  let printCost        = 0;
  let hasNonPrintPhys  = false;

  for (const item of cart) {
    if (isDigital(item.title)) continue;
    const qty  = item.qty || 1;
    const tier = getItemTier(item.title);

    if (tier) {
      // Print: fixed rate per crate × qty (each print ships in its own crate)
      const rates = CONFIG.PRINT_SHIPPING_RATES[tier] || CONFIG.PRINT_SHIPPING_RATES.standard;
      const rate  = (zone in rates) ? rates[zone] : rates[1];
      printCost  += rate * qty;
    } else {
      hasNonPrintPhys = true;
    }
  }

  // Non-print physical items (books, decks): flat per-order rate, one box
  let nonPrintCost = 0;
  if (hasNonPrintPhys) {
    if (international) {
      nonPrintCost = CONFIG.NON_PRINT_INTL[zone] || CONFIG.NON_PRINT_INTL[5];
    } else {
      nonPrintCost = (zone in CONFIG.NON_PRINT_DOMESTIC)
        ? CONFIG.NON_PRINT_DOMESTIC[zone]
        : CONFIG.NON_PRINT_DOMESTIC[1];
    }
  }

  const total = printCost + nonPrintCost;
  return total > 0 ? total : 0;
}

function hasPhysicalItems() {
  return cart.some(item => !isDigital(item.title));
}

function imgPath(src) {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('images/')) return src;
  return 'images/' + src;
}

// --- RENDER ---
function renderCart() {
  const container = document.getElementById('summaryItems');
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="summary-empty">
        Your cart is empty.<br>
        <a href="shop.html" style="color:#fff;text-decoration:underline;margin-top:15px;display:inline-block">Browse Shop</a>
      </div>`;
    document.getElementById('payBtn').disabled = true;
    document.getElementById('breakdown').style.display = 'none';
    return;
  }
  // FIX: qty shown when > 1; price reflects qty multiplier
  container.innerHTML = cart.map((item, index) => {
    const qty      = item.qty || 1;
    const linePrice = item.price * qty;
    return `
      <div class="summary-item">
        <button class="remove-item" onclick="removeItem(${index})" aria-label="Remove ${item.title} from cart">&times;</button>
        <img src="${imgPath(item.img)}" alt="${item.title}">
        <div>
          <h4>${item.title}</h4>
          <div class="qty">Edition 1${qty > 1 ? ` &times; ${qty}` : ''}</div>
        </div>
        <div class="price">${fmt(linePrice)}</div>
      </div>`;
  }).join('');
  recalculate();
}

// --- REMOVE ITEM ---
function removeItem(index) {
  cart.splice(index, 1);
  try { localStorage.setItem('cart', JSON.stringify(cart)); } catch(e) {}
  renderCart();
}

// --- RECALCULATE ---
function recalculate() {
  const subtotal     = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const shipping     = calculateShipping(); // null = intl prints, needs quote
  const quoteNeeded  = shipping === null;
  const domestic     = isDomestic();

  // GST: composite supply — 12% on (subtotal + shipping), domestic only.
  // When shipping is null (quote needed), we show subtotal only — no GST yet.
  const gst   = (domestic && !quoteNeeded) ? Math.round((subtotal + shipping) * CONFIG.GST_RATE) : 0;
  const total = quoteNeeded ? subtotal : subtotal + shipping + gst;

  currentTotals = { subtotal, shipping: quoteNeeded ? 0 : shipping, gst, total };

  document.getElementById('subtotalVal').innerText = fmt(subtotal);

  if (!hasPhysicalItems()) {
    document.getElementById('shippingVal').innerText = 'Digital delivery';
  } else if (quoteNeeded) {
    document.getElementById('shippingVal').innerText = 'Quoted separately';
  } else {
    document.getElementById('shippingVal').innerText = fmt(shipping);
  }

  document.getElementById('gstVal').innerText   = fmt(gst);
  document.getElementById('totalVal').innerText  = quoteNeeded ? fmt(subtotal) + '*' : fmt(total);

  // GST row: domestic only, and only when shipping is known
  document.getElementById('gstRow').style.display = (domestic && !quoteNeeded) ? 'flex' : 'none';
  // Shipping section: hide for digital-only carts
  document.getElementById('shippingSection').style.display = hasPhysicalItems() ? 'block' : 'none';

  // Pay button: disabled and relabelled when quote is needed
  const payBtn = document.getElementById('payBtn');
  if (quoteNeeded) {
    payBtn.disabled    = true;
    payBtn.textContent = 'Contact for Shipping Quote →';
  } else {
    payBtn.disabled    = false;
    payBtn.textContent = 'Pay Securely →';
  }

  // International quote notice
  const noticeEl = document.getElementById('intlShippingNotice');
  if (noticeEl) noticeEl.style.display = quoteNeeded ? 'block' : 'none';
}

// --- VALIDATION ---
function validateForm() {
  const form     = document.getElementById('checkoutForm');
  const required = hasPhysicalItems()
    ? ['name', 'email', 'phone', 'country', 'address1', 'city', 'state', 'postal']
    : ['name', 'email', 'phone'];

  for (const field of required) {
    const el = form.querySelector(`[name="${field}"]`);
    if (!el || !el.value.trim()) {
      showError(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
      el && el.focus();
      return false;
    }
  }
  const email = form.querySelector('[name="email"]').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Please enter a valid email address.');
    return false;
  }
  return true;
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.innerText = msg;
  box.classList.add('active');
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => box.classList.remove('active'), 6000);
}

function getFormData() {
  const form = document.getElementById('checkoutForm');
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v.trim(); });
  return data;
}

// --- PAYMENT FLOW ---
async function initiatePayment() {
  if (cart.length === 0) { showError('Your cart is empty.'); return; }
  if (!validateForm()) return;

  const customer   = getFormData();
  const loader     = document.getElementById('loader');
  const loaderText = document.getElementById('loaderText');

  loader.classList.add('active');
  loaderText.innerText = 'Creating secure order…';

  try {
    await loadRazorpayConfig();

    // 1. Create Razorpay order on backend — backend validates prices from its own source
    const res = await fetch(`${CONFIG.API_BASE}/api/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:    Math.round(currentTotals.total * 100), // paise
        currency:  'INR',
        items:     cart,
        customer,
        breakdown: currentTotals
      })
    });
    if (!res.ok) throw new Error('Failed to create order. Please try again.');
    const order = await res.json();
    loader.classList.remove('active');

    // 2. Open Razorpay checkout modal
    const rzp = new Razorpay({
      key:        CONFIG.RAZORPAY_KEY_ID,
      amount:     order.amount,
      currency:   order.currency,
      order_id:   order.id,
      name:       'Mohith Rai Srivastav',
      description:'Fine Art Print Order',
      image:      'images/Mohith LOGO.png',
      prefill: {
        name:    customer.name,
        email:   customer.email,
        contact: customer.phone
      },
      notes: {
        address: customer.address1,
        city:    customer.city,
        gstin:   customer.gstin || ''
      },
      theme: { color: '#000000' },

      handler: async function(response) {
        // 3. Verify payment on backend — signature validated server-side
        loader.classList.add('active');
        loaderText.innerText = 'Confirming payment…';
        try {
          const verifyRes = await fetch(`${CONFIG.API_BASE}/api/verify-payment`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              items:     cart,
              customer,
              breakdown: currentTotals
            })
          });
          const result = await verifyRes.json();
          if (result.success) {
            localStorage.removeItem('cart');
            localStorage.setItem('lastOrder', JSON.stringify({
              orderId:   result.orderId,
              paymentId: response.razorpay_payment_id,
              email:     customer.email,
              total:     currentTotals.total,
              items:     cart,
              downloads: result.downloads || []
            }));
            window.location.href = 'order-success.html';
          } else {
            throw new Error(result.error || 'Payment verification failed.');
          }
        } catch (err) {
          loader.classList.remove('active');
          window.location.href = 'order-failed.html?reason=' + encodeURIComponent(err.message);
        }
      },

      modal: {
        ondismiss: function() { loader.classList.remove('active'); }
      }
    });

    rzp.on('payment.failed', function(response) {
      loader.classList.remove('active');
      window.location.href = 'order-failed.html?reason=' + encodeURIComponent(response.error.description);
    });

    rzp.open();

  } catch (err) {
    loader.classList.remove('active');
    showError(err.message);
  }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', renderCart);
document.getElementById('countrySelect').addEventListener('change', recalculate);

// Recalculate when state/postal changes (Goa detection)
['state', 'postal'].forEach(name => {
  const el = document.querySelector(`[name="${name}"]`);
  if (el) el.addEventListener('input', recalculate);
});
