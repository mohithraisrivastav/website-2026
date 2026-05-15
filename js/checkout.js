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

  // GST rates — products 12%, shipping 18% (SAC 996812)
  GST_RATE_PRODUCT:  0.12,
  GST_RATE_SHIPPING: 0.18,

  // Shipping rate card (₹): base covers first 2 kg, then per extra kg.
  // Zones: 0=Goa, 1=India, 2=SAARC, 3=ME/SEAsia, 4=Europe, 5=Americas/RoW
  SHIPPING_ZONES: {
    0: { name: 'Goa (local)',            base: 300,   perKg: 150  },
    1: { name: 'India',                  base: 700,   perKg: 250  },
    2: { name: 'SAARC',                  base: 3500,  perKg: 800  },
    3: { name: 'Middle East / SE Asia',  base: 6000,  perKg: 1200 },
    4: { name: 'Europe / UK',            base: 8500,  perKg: 1600 },
    5: { name: 'Americas / RoW',         base: 10500, perKg: 2000 }
  },
  SHIPPING_BASE_WEIGHT: 2, // kg included in base rate

  // Country → zone mapping (IN handled separately for Goa detection)
  COUNTRY_ZONES: {
    NP:2, LK:2, BD:2, BT:2, MV:2,
    AE:3, SA:3, QA:3, OM:3, KW:3, BH:3,
    SG:3, TH:3, MY:3, ID:3, PH:3, VN:3, JP:3, KR:3, HK:3, TW:3, CN:3,
    GB:4, IE:4, DE:4, FR:4, IT:4, ES:4, NL:4, BE:4, CH:4, AT:4,
    SE:4, NO:4, DK:4, FI:4, PT:4, PL:4, CZ:4, GR:4,
    US:5, CA:5, MX:5, BR:5, AR:5, CL:5, AU:5, NZ:5, ZA:5
  },

  // Product shipping weights in kg (including packaging / rigid tube)
  // ADD NEW PRODUCTS HERE — missing entries fall back to 0.8kg with a console warning
  PRODUCT_WEIGHTS: {
    'Cosmic Return':              2.0,
    'Burnt Earth':                2.0,
    'Chromatic Rupture':          2.0,
    'After The Fall':             2.0,
    'Cracked Spectrum':           2.0,
    'Still Organism':             2.0,
    'Forgotten Skin':             2.0,
    'Erosion':                    2.0,
    'Imprint':                    2.0,
    'The Matter of Pause (Paperback)':0.8,
    'Explorer Deck':              0.3,
    'The Explorer\'s Deck':        0.3,
    'The Matter of Pause (Digital)':  0     // zero = digital, no shipping
  }
};

let razorpayConfigPromise = null;
function loadRazorpayConfig() {
  if (!razorpayConfigPromise) {
    razorpayConfigPromise = fetch('/api/config')
      .then(res => {
        if (!res.ok) throw new Error('Unable to load payment configuration.');
        return res.json();
      })
      .then(config => {
        CONFIG.RAZORPAY_KEY_ID = config.razorpayKeyId || '';
        if (!CONFIG.RAZORPAY_KEY_ID) throw new Error('Razorpay key is not configured.');
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

// FIX: console.warn when product weight is missing — prevents silent undercharging
// Handles dimension-suffixed names e.g. "After The Fall — Small (30×20 cm)"
function getItemWeight(title) {
  if (typeof CONFIG.PRODUCT_WEIGHTS[title] === 'number') return CONFIG.PRODUCT_WEIGHTS[title];
  // Strip dimension suffix added at cart-add time (e.g. " — Small (30×20 cm)")
  const base = title.replace(/\s+[—\-–].+$/, '').trim();
  if (typeof CONFIG.PRODUCT_WEIGHTS[base] === 'number') return CONFIG.PRODUCT_WEIGHTS[base];
  console.warn(`[checkout] Unknown product weight for: "${title}" — using 0.8 kg fallback. Add it to CONFIG.PRODUCT_WEIGHTS.`);
  return 0.8;
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

// FIX: weight now multiplied by qty so shipping is correct for multiple units
function calculateShipping() {
  if (cart.length === 0) return 0;
  const totalWeight = cart.reduce((w, i) => w + getItemWeight(i.title) * (i.qty || 1), 0);
  if (totalWeight <= 0) return 0; // all digital
  const zone    = CONFIG.SHIPPING_ZONES[getZone()];
  const extraKg = Math.max(0, Math.ceil(totalWeight - CONFIG.SHIPPING_BASE_WEIGHT));
  return zone.base + extraKg * zone.perKg;
}

function hasPhysicalItems() {
  return cart.some(item => getItemWeight(item.title) > 0);
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
  // FIX: subtotal respects qty per item
  const subtotal = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const shipping = calculateShipping();

  // FIX: separate GST rates — 12% on products, 18% on shipping (SAC 996812)
  // Export / international orders are zero-rated
  const productGST  = isDomestic() ? subtotal * CONFIG.GST_RATE_PRODUCT  : 0;
  const shippingGST = isDomestic() ? shipping * CONFIG.GST_RATE_SHIPPING : 0;
  const gst         = productGST + shippingGST;
  const total       = subtotal + shipping + gst;

  currentTotals = { subtotal, shipping, gst, total };

  document.getElementById('subtotalVal').innerText = fmt(subtotal);

  // FIX: clear digital-only label when no physical items
  if (!hasPhysicalItems()) {
    document.getElementById('shippingVal').innerText = 'Digital delivery';
  } else {
    document.getElementById('shippingVal').innerText = shipping === 0 ? 'Calculating…' : fmt(shipping);
  }

  document.getElementById('gstVal').innerText  = fmt(gst);
  document.getElementById('totalVal').innerText = fmt(total);

  // Hide GST row for international (export zero-rated)
  document.getElementById('gstRow').style.display = isDomestic() ? 'flex' : 'none';
  // Hide shipping section entirely for digital-only orders
  document.getElementById('shippingSection').style.display = hasPhysicalItems() ? 'block' : 'none';
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
