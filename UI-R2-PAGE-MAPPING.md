# Round 2 UI — Production Page Mapping

Preview file: [`design-options-gallery-v2.html`](design-options-gallery-v2.html)

**Not applied to production** until you choose a direction and say **execute**.

Structure, layout grids, Palette V5, and fonts stay fixed. Each R2 option is a **visual skin** on existing sections.

---

## Option → Page mapping

| R2 | Name | Primary production pages | Sections affected |
|----|------|--------------------------|-------------------|
| **R2-1** | Cinema strip | [`workshops.html`](workshops.html), [`resurface.html`](resurface.html), [`work.html`](work.html) | Formats timeline → horizontal filmstrip; series grids |
| **R2-2** | Magazine spread | [`workshops.html`](workshops.html) (hero/intro), [`about.html`](about.html), [`essay-01.html`](essay-01.html) … essays | Hero + intro blocks; long-form editorial |
| **R2-3** | Scrim stack | [`index.html`](index.html) (below-fold), [`workshops.html`](workshops.html) (hero alt) | Full-bleed bands instead of bordered section breaks |
| **R2-4** | Thread line | [`workshops.html`](workshops.html), [`about.html`](about.html), [`workshop-register.html`](workshop-register.html) | Included / audience / formats / FAQ rhythm |
| **R2-5** | Print room | [`shop.html`](shop.html) | Product panel + configurator chrome only (same fields, AR/3D logic unchanged) |
| **R2-6** | Deck as object | [`workshops.html`](workshops.html) | Explorer's Deck block (~lines 246–309) only |

---

## Suggested combinations

| If you want… | Combine |
|--------------|---------|
| Immersive workshop story | R2-3 hero bands + R2-4 thread for details + R2-6 deck |
| Editorial brand feel | R2-2 spreads on about/essays + R2-1 formats strip on workshops |
| Commerce as gallery | R2-5 shop + R2-1 or R2-3 on homepage |

---

## Implementation order (when you execute)

1. **Shared tokens** — optional `assets/css/r2-skins.css` with motion helpers (no tilt; `prefers-reduced-motion`).
2. **Highest impact** — workshops (R2-4 + R2-6 or R2-1) and shop (R2-5).
3. **Home** — index below-fold (R2-3) without changing hero split grid.
4. **Long tail** — about, essays (R2-2), resurface (R2-1).

---

## Out of scope for R2 apply

- Checkout math, newsletter API, blog SEO (see [`master-site-audit.md`](master-site-audit.md))
- New IA, new fonts, new palette
- `rotateY` film carousel on [`film.html`](film.html) (replace separately if needed)

---

## Your selection (fill in)

- **Primary:** R2-___
- **Accent(s):** R2-___
- **Per-page overrides:** ___

When ready: **execute** with the selection above.
