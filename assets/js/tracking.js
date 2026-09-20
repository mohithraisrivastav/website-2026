/* Site-wide marketing tags: Meta Pixel + Pinterest Tag + LinkedIn Insight Tag.
   Loaded on every page via <script src="/assets/js/tracking.js" defer></script>.
   Google Analytics stays inline in each page head and is untouched by this file.

   ---------------------------------------------------------------------------
   FILL THESE THREE VALUES IN, then push. Each tag stays completely dormant
   until its own ID is filled, so a blank one makes no third-party request.

   META_PIXEL_ID      Meta Events Manager > Data sources > your pixel.
                      Covers Instagram and Facebook together. A 15-16 digit
                      number, e.g. "1042938477261509".
   PINTEREST_TAG_ID   Pinterest Ads Manager > Ads > Conversions > Tag manager.
                      A 13-digit number, e.g. "2613799999999".
   LINKEDIN_PARTNER_ID  LinkedIn Campaign Manager > Analyze > Insight Tag.
                      A 6-7 digit number, e.g. "5842204".
   --------------------------------------------------------------------------- */

var TRACKING = {
  META_PIXEL_ID: '',
  PINTEREST_TAG_ID: '',
  LINKEDIN_PARTNER_ID: '',
  // Optional. LinkedIn Campaign Manager > Analyze > Conversion tracking.
  // Numeric conversion id fired on order-success.html. Leave blank to skip.
  LINKEDIN_PURCHASE_CONVERSION_ID: ''
};

(function () {
  'use strict';

  /* --------------------------------------------- Meta (Instagram + FB) --- */
  if (TRACKING.META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', TRACKING.META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* ---------------------------------------------------------- Pinterest --- */
  if (TRACKING.PINTEREST_TAG_ID) {
    !function (e) {
      if (!window.pintrk) {
        window.pintrk = function () {
          window.pintrk.queue.push(Array.prototype.slice.call(arguments));
        };
        var n = window.pintrk;
        n.queue = [];
        n.version = '3.0';
        var t = document.createElement('script');
        t.async = !0;
        t.src = e;
        var r = document.getElementsByTagName('script')[0];
        r.parentNode.insertBefore(t, r);
      }
    }('https://s.pinimg.com/ct/core.js');

    window.pintrk('load', TRACKING.PINTEREST_TAG_ID);
    window.pintrk('page');
  }

  /* ----------------------------------------------------------- LinkedIn --- */
  if (TRACKING.LINKEDIN_PARTNER_ID) {
    window._linkedin_partner_id = TRACKING.LINKEDIN_PARTNER_ID;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(TRACKING.LINKEDIN_PARTNER_ID);

    (function (l) {
      if (!l) {
        window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); };
        window.lintrk.q = [];
      }
      var s = document.getElementsByTagName('script')[0];
      var b = document.createElement('script');
      b.type = 'text/javascript';
      b.async = true;
      b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);
  }

  /* ------------------------------------------------- Page-level events --- */
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {

    // Completed order. Reads the same localStorage record order-success.html renders.
    if (page === 'order-success.html') {
      var order = null;
      try { order = JSON.parse(localStorage.getItem('lastOrder') || 'null'); } catch (e) { order = null; }

      if (order) {
        if (window.pintrk) {
          window.pintrk('track', 'checkout', {
            value: Number(order.total) || 0,
            order_quantity: (order.items || []).length || 1,
            currency: 'INR',
            order_id: order.orderId || undefined
          });
        }
        if (window.fbq) {
          window.fbq('track', 'Purchase', {
            value: Number(order.total) || 0,
            currency: 'INR',
            contents: (order.items || []).map(function (i) {
              return { id: i.id || i.title, quantity: 1, item_price: Number(i.price) || 0 };
            }),
            content_type: 'product'
          });
        }
        if (window.lintrk && TRACKING.LINKEDIN_PURCHASE_CONVERSION_ID) {
          window.lintrk('track', { conversion_id: TRACKING.LINKEDIN_PURCHASE_CONVERSION_ID });
        }
      }
    }

    // Reached checkout.
    if (page === 'checkout.html') {
      if (window.pintrk) { window.pintrk('track', 'addtocart'); }
      if (window.fbq) { window.fbq('track', 'InitiateCheckout'); }
    }

    // Enquiry, workshop registration, and intake forms submitted.
    if (['contact.html', 'workshop-register.html', 'workshop-intake.html', 'mapusa-market-walk-register.html'].indexOf(page) !== -1) {
      document.addEventListener('submit', function () {
        if (window.pintrk) { window.pintrk('track', 'lead'); }
        if (window.fbq) { window.fbq('track', 'Lead'); }
      }, true);
    }

    // Deck and print product pages.
    if (['explorers-deck.html', 'resurface.html', 'shop.html'].indexOf(page) !== -1) {
      if (window.pintrk) { window.pintrk('track', 'viewcategory'); }
      if (window.fbq) { window.fbq('track', 'ViewContent', { content_type: 'product' }); }
    }

    // Workshop pages. The seat-filling audience worth retargeting.
    if (['workshops.html', 'walks.html', 'mapusa-market-walk.html'].indexOf(page) !== -1 && window.fbq) {
      window.fbq('track', 'ViewContent', { content_name: 'Workshops' });
    }
  });
})();
