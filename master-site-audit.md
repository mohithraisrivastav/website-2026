# Master Website Audit

## Executive Verdict
The brand has taste. The system underneath it keeps leaking trust, discoverability, and revenue.

This site does **not** need a total brand reset. It does need a **rewrite by section**. The visual direction is salvageable. The content architecture, shop behavior, project-page template system, and several high-intent flows are not strong enough in their current form.

**Final call:** improve the identity, rewrite the revenue and discovery infrastructure.

## What Is Genuinely Working
- The visual language is distinct. The palette, typography, and editorial-art direction feel like one person made hard choices instead of accepting defaults.
- Key flagship pages already carry real metadata and some structured data, especially `index.html`, `contact.html`, `shop.html`, essays, and workshops.
- Contact, workshop registration, and checkout are connected to actual APIs. This is not a dead brochure site.
- Most public pages now include skip links and visible focus styles through shared CSS, which is a better baseline than many visually led portfolios.
- The long-form editorial voice has real point of view in places. It does not read like generic “creative founder” sludge.

## Highest-Leverage Fixes
1. Fix checkout math parity between frontend and backend.
2. Replace fake newsletter success flows with real submission and storage.
3. Rebuild the blog/journal as indexable HTML with proper metadata and one clear heading structure.
4. Turn the project-detail pages into one shared template instead of 12+ inline-CSS clones.
5. Clean up metadata coverage, image dimensions, logo alt text, and encoding issues across the entire site.

## Ranked Top Issues
1. **[Critical] Checkout totals are not authoritative in practice**
   Lens: Website Critique Council, Yuki Tanaka; Elite Business Development Manager
   Affected: commerce flow, `js/checkout.js`, `api/create-order.js`
   Problem: Frontend and backend do not calculate totals the same way. The frontend multiplies line items by quantity and applies 12 percent GST to products plus 18 percent to shipping. The backend recomputes subtotal without quantity and applies a flat 12 percent to subtotal plus shipping. That can produce mismatched totals at payment time.
   Fix: Move pricing logic to one shared source of truth and make frontend rendering consume backend-returned totals only.

2. **[Critical] Newsletter capture is mostly theater**
   Lens: Digital & Social Media Marketing Council; Elite Business Development Manager
   Affected: shared footer/newsletter forms, `assets/js/site.js`
   Problem: The recurring newsletter form hides itself and shows “Received” after a timer check, but does not send data anywhere. It looks like list growth, but it is fake.
   Fix: Connect every newsletter form to a real endpoint, persist the lead, and expose success and error states honestly.

3. **[Critical] The journal is weak for SEO and brittle for content operations**
   Lens: SEO Sage; Rex Okonkwo; Creative Book Critique Council
   Affected: `blog.html`
   Problem: The page is missing canonical, OG, Twitter, and JSON-LD metadata. It also renders core content from a large inline JavaScript object, uses multiple H1s, and ships empty-alt cover images inside generated cards.
   Fix: Convert journal entries and notes into server-rendered or static HTML content, add full metadata, and enforce one H1 per document.

4. **[Critical] Portfolio detail pages are a maintainability trap**
   Lens: Marcus Decker; Yuki Tanaka
   Affected: `Work/project-02.html` through `Work/project-13.html`, both Eleve pages
   Problem: Each project page carries huge inline CSS and JS, duplicated nav/footer logic, repeated third-party includes, and many images without explicit dimensions. The same template logic is copied across files instead of being shared.
   Fix: Extract one reusable project template with shared CSS/JS, then keep per-project files as data and content only.

5. **[Major] Accessibility basics are inconsistent in the places that matter most**
   Lens: Ida Nielsen
   Affected: nav/logo treatment, blog cards, assets page thumbnails, modal/lightbox images
   Problem: Many pages still use `alt="Logo"` instead of a meaningful home-link label. Some content images are marked with empty alt text even when they carry product or editorial meaning. Lightbox images also use empty alt text.
   Fix: Replace generic and empty alt text with intent-based alt text, and mark only genuinely decorative imagery as decorative.

6. **[Major] The homepage heading structure is broken**
   Lens: SEO Sage; Ida Nielsen
   Affected: `index.html`
   Problem: The homepage uses three H1 elements for one hero phrase. That weakens heading semantics and makes the strongest entry page harder for assistive tech and search engines to parse.
   Fix: Collapse the hero into one H1 and style line breaks inside it.

7. **[Major] Thin redirect pages dilute search and tracking value**
   Lens: SEO Sage; Elena Torres
   Affected: `shop-books.html`, `shop-digital.html`, `shop-guides.html`, `shop-tools.html`
   Problem: Several category pages are meta-refresh shells that instantly redirect to `shop.html#...`. They add no crawl value, split measurement, and create a weak landing experience.
   Fix: Replace them with real category landing pages or 301 them permanently at the server/router layer.

8. **[Major] Third-party dependency loading is heavy and unmanaged**
   Lens: Yuki Tanaka
   Affected: most public pages, especially index, shop, blog, work, project pages
   Problem: Fonts, Lenis, GSAP, ScrollTrigger, and Razorpay are loaded from multiple third-party CDNs across the site, with no integrity attributes and no bundling strategy.
   Fix: Self-host or bundle core libraries where possible, add integrity where appropriate, and reduce page-by-page duplication.

9. **[Major] Inline event handlers are everywhere**
   Lens: Marcus Decker; Jasper Quinn
   Affected: `shop.html`, `assets.html`, `resurface.html`, project pages, contact/workshop pages
   Problem: The site still relies heavily on `onclick` in markup. The counts are especially high on commerce and interactive pages. This hurts maintainability, testing, CSP hardening, and component reuse.
   Fix: Move interaction wiring into scoped JavaScript modules with delegated listeners.

10. **[Major] Metadata quality is uneven across top-level pages**
   Lens: SEO Sage
   Affected: `blog.html`, `checkout.html`, `workshop-register.html`, `membership.html`, `photography.html`, utility pages
   Problem: Some important pages have only a title and description, while others have full canonical, OG, Twitter, and structured data. The inconsistency is especially bad on discovery and trust pages.
   Fix: Define one metadata standard and apply it to every public-facing page, including utility pages that users can share.

11. **[Major] Encoding corruption is visible in source and likely visible in UI**
   Lens: Rex Okonkwo; Livia Moreau
   Affected: multiple pages across contact, workshop, legal, checkout, project templates
   Problem: Strings like `Â·`, `â€”`, `â†’`, and `â‚¹` appear repeatedly. That is not a small polish flaw. It makes a premium brand look broken.
   Fix: normalize all files to UTF-8, replace corrupted characters, and add a content QA pass before publishing.

12. **[Major] Public internal artifacts are exposed**
   Lens: Elite Business Development Manager; Prof. Amara Diop
   Affected: `audit-report.html`, `nav-flowchart.html`
   Problem: Internal process and audit artifacts are sitting in the public surface. They do not strengthen trust. They make the production environment feel unmanaged.
   Fix: remove them from the public build or gate them behind private access.

13. **[Major] Image sizing discipline is poor across the site**
   Lens: Yuki Tanaka
   Affected: project pages, assets page, shop, homepage, editorial pages
   Problem: Many image tags omit width and height attributes. The project pages alone contain repeated image-heavy layouts with no explicit dimensions, which invites layout shift and slower rendering.
   Fix: add intrinsic dimensions or responsive image metadata to every content image and product image.

14. **[Major] The work/project system favors spectacle over findability**
   Lens: Livia Moreau; SEO Sage
   Affected: `work.html`, `Work/*.html`
   Problem: The visual direction is strong, but the system behaves like a gallery installation instead of a content platform. Structured data is absent on project pages, and the template repetition makes the portfolio harder to expand cleanly.
   Fix: keep the visual theater, but add structured project metadata, reusable templates, and cleaner discoverability paths.

15. **[Major] Trust scaffolding exists, but it is not surfaced where money changes hands**
   Lens: Viktor Kessler; Elite Business Development Manager
   Affected: shop and checkout flow
   Problem: There are legal and support pages, but the trust story is not well integrated into the product grid, cart, or checkout reassurance layer. The site asks for premium pricing without matching institutional confidence.
   Fix: surface edition policy, shipping clarity, returns logic, archival quality, payment reassurance, and contact availability earlier in the buying path.

16. **[Minor] `meta keywords` is still being used**
   Lens: SEO Sage
   Affected: multiple pages
   Problem: It adds no meaningful SEO value and signals outdated SEO habits.
   Fix: remove `meta keywords` and focus on titles, descriptions, canonicalization, structured data, and internal linking.

17. **[Minor] The workshop registration page under-delivers on premium framing**
   Lens: Elite Business Development Manager
   Affected: `workshop-register.html`
   Problem: The form is functional, but the page reads more like an application utility than a high-value cohort intake for a premium creative educator.
   Fix: strengthen social proof, cohort scarcity, outcomes, and what happens after application.

18. **[Minor] Legal and support pages are structurally fine, emotionally dead**
   Lens: Rex Okonkwo; Livia Moreau
   Affected: `privacy.html`, `terms.html`, `shipping.html`, `returns.html`, `support.html`
   Problem: These pages exist, which is good. They do not help the brand feel more careful or more trustworthy.
   Fix: tighten copy, improve scannability, and connect them back to actual buyer concerns.

## Cluster Findings

### Brand Core
- `index.html` has the strongest visual point of view, but it is doing too much with raw inline CSS and too little with clean hierarchy. The three-H1 hero is an avoidable structural mistake.
- `about.html`, `contact.html`, `film.html`, and `photography.html` preserve the premium tone, but the shared nav/footer pattern still carries generic logo alt text and JS-heavy behavior.
- `work.html` has a bold split-panel concept, but it relies on heavyweight external scripts and custom styling that are hard to scale as the portfolio grows.
- `contact.html` is commercially useful. It has direct channels and a real API-backed form. It still inherits fake newsletter behavior from the shared footer.

### Commerce
- `shop.html` is the biggest opportunity and the biggest liability. It has ambition, real catalog logic, and useful detail modules, but it is overloaded with inline handlers, modal complexity, missing image dimensions, and trust work that happens too late.
- `checkout.html` is where the most serious engineering risk lives. The total-calculation mismatch between `js/checkout.js` and `api/create-order.js` is not acceptable on a live commerce path.
- Category redirect pages are thin shells, not useful landing pages.
- `membership.html` and order status pages feel disconnected from the rest of the funnel strategy.

### Content / Editorial
- `blog.html` needs a structural rebuild. The writing voice has potential, but the delivery system is weak for SEO, maintenance, and accessibility.
- The essay pages have better metadata discipline than the journal index, which is backwards. The index should be the strongest discovery surface.
- `resurface.html` appears feature-rich, but it carries a high interaction and asset burden, plus the same repeated structural issues seen elsewhere.

### Portfolio Detail
- The work detail pages look deliberate, but the code is repetitive and expensive. One update now means updating a dozen hand-managed documents.
- The recent controlled masonry work improved visual layout, but it was layered over the old gallery rules in multiple files, which leaves dead CSS and more maintenance debt.
- The portfolio system should feel handcrafted in presentation, not handcrafted in source duplication.

### Trust / Utility
- Policy and support pages are present and linked, which is good. They are not yet a trust advantage.
- `audit-report.html` and `nav-flowchart.html` should not live in the public layer without a reason.
- `order-success.html` and `order-failed.html` need tighter post-transaction reassurance and next-step guidance.

## Cross-Site Systemic Issues
- Shared footer newsletter behavior is misleading.
- Shared nav/logo implementation is semantically weak.
- Shared third-party dependency strategy is bloated.
- Shared image handling lacks consistent dimensions and alt-text rules.
- Shared metadata discipline is incomplete.
- Shared interaction model still leans on inline handlers instead of modular scripts.
- Shared template system does not exist where it most needs to: project pages and some high-value landing surfaces.

## Sections That Need Redesign vs Cleanup

### Redesign
- Shop/catalog interaction layer
- Checkout calculation architecture
- Blog/journal architecture
- Project detail template system
- Public taxonomy/category landing strategy

### Cleanup
- Homepage heading semantics and metadata hygiene
- About/contact/workshop premium-positioning polish
- Policy/support copy and scan structure
- Logo alt text, image alt text, image dimensions
- Encoding and typography QA

## Priority Roadmap

### Immediate
- Fix frontend/backend checkout math mismatch.
- Replace fake newsletter success states with real capture.
- Remove public internal artifacts.
- Repair encoding corruption.
- Standardize logo alt text and critical image alt text.

### Near-Term
- Rebuild `blog.html` into proper static/indexable content.
- Standardize metadata across every public page.
- Refactor project pages into one shared template.
- Remove inline event handlers from shop and shared UI patterns.
- Add width/height to all important images.

### Later
- Replace redirect category pages with real landing pages.
- Build a shared component/layout system for nav, footer, galleries, and forms.
- Reduce third-party runtime dependence and bundle common assets.
- Deepen trust, authority, and premium conversion storytelling across commerce and workshops.

## Representative Evidence
- Checkout logic mismatch: `js/checkout.js`, `api/create-order.js`
- Fake newsletter flow: `assets/js/site.js`
- Weak journal architecture: `blog.html`
- Template duplication and image sizing debt: `Work/project-04.html` and sibling project pages
- Thin redirect pages: `shop-books.html`

