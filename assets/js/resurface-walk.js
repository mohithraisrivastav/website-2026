/* ─────────────────────────────────────────────────────────────
   Resurface · Gallery Walk

   A WebGL exhibition room. Scroll walks you down the gallery;
   the camera turns to each wall in sequence. Every word and link
   is read from the original page markup (kept in the DOM for
   search, screen readers and the no-WebGL fallback), so the
   content has one source.

   Prints and exhibition photographs are unlit, untoned sRGB
   planes: they render exactly as photographed.
───────────────────────────────────────────────────────────── */
import * as THREE from 'three';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE_PTR = matchMedia('(pointer: coarse)').matches;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

main().catch(err => {
    console.warn('[gallery walk]', err);
    document.documentElement.classList.remove('gw-on');
    $('#gw')?.remove();
});

async function main() {
    const root = $('#gw'), stage = $('.gw-stage'), canvas = $('#gw-canvas');
    const orig = $('#gw-original');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE_PTR ? 2.5 : 2));   // phone screens are ~3x; lettering needs the density
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const FOG = new THREE.Color('#E9E4DB');
    scene.background = FOG;
    scene.fog = new THREE.Fog(FOG, 9, 34);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.05, 90);

    /* ── Read the original page ────────────────────────────── */
    const clean = s => s.replace(/\s+/g, ' ');
    const txt = el => el ? clean(el.textContent).trim() : '';
    const segs = el => {
        const out = [];
        el.childNodes.forEach(n => {
            if (n.nodeType === 3) out.push({ t: clean(n.textContent) });
            else if (n.nodeName === 'BR') out.push({ t: '\n' });
            else if (n.nodeType === 1) out.push({ t: clean(n.textContent), em: n.nodeName === 'EM' });
        });
        if (out.length) out[0].t = out[0].t.replace(/^\s+/, '');
        return out;
    };

    const C = {
        entry: { series: txt($('.entry-series', orig)), title: txt($('.entry-title', orig)), meta: $$('.entry-meta span', orig).map(txt) },
        intro: { label: txt($('.room-label', orig)), paras: $$('.intro-text p', orig).map(segs), closing: segs($('.intro-closing', orig)) },
        material: {
            heading: segs($('.material-heading', orig)),
            specs: $$('.material-spec', orig).map(s => [txt($('.spec-label', s)), txt($('.spec-value', s))]),
            notes: $$('.material-note', orig).map(segs),
        },
        views: {
            eyebrow: txt($('.views-eyebrow', orig)), title: txt($('.views-title', orig)),
            pull: txt($('.narrative-pull', orig)), body: $$('.narrative-body', orig).map(segs),
            attribution: txt($('.narrative-attribution', orig)), photos: $$('.views-mosaic img', orig),
        },
        chapter: {
            num: txt($('.chapter-divider .ch-num', orig)), name: txt($('.chapter-divider .ch-name', orig)),
            count: txt($('.chapter-divider .ch-count', orig)),
            paras: $$('.chapter-intro-text p', orig).map(segs), note: txt($('.chapter-intro-note', orig)),
        },
        works: $$('.gallery-station', orig).map(s => ({
            num: txt($('.station-num', s)), img: $('img', s), title: txt($('.label-title', s)),
            meta: txt($('.label-meta', s)), edition: txt($('.edition-signal', s)),
            scarce: $('.edition-signal', s).classList.contains('scarce'),
            acquire: $('.station-acquire', s),
        })),
        ch2: {
            num: txt($('.chapter-ii .ch-num', orig)), name: segs($('.chapter-ii .ch-name', orig)),
            note: txt($('.chapter-ii .ch-note', orig)),
        },
    };

    /* Longest side in inches, from the Resurface catalogue. Aspect comes from the file. */
    const LONG_IN = { 'Cosmic Return': 42 };
    const longSideM = t => (LONG_IN[t] || 32) * 0.0254;

    /* ── Loading ───────────────────────────────────────────── */
    const loader = new THREE.TextureLoader();
    const loaderLabel = $('.gw-loader span');
    const total = C.works.length + C.views.photos.length;
    let loaded = 0;
    const tick = () => { loaded++; if (loaderLabel) loaderLabel.textContent = `Preparing the room · ${loaded} / ${total}`; };
    const loadTex = src => new Promise((res, rej) => loader.load(src, t => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = MAX_ANISO;
        tick(); res(t);
    }, undefined, e => { tick(); rej(e); }));

    await Promise.all([
        document.fonts.load('300 64px "Cormorant Garamond"'),
        document.fonts.load('italic 300 64px "Cormorant Garamond"'),
        document.fonts.load('300 32px Inter'), document.fonts.load('500 32px Inter'), document.fonts.load('700 32px Inter'),
    ]).catch(() => {});

    const [workTex, photoTex] = await Promise.all([
        Promise.all(C.works.map(w => loadTex(w.img.currentSrc || w.img.src))),
        Promise.all(C.views.photos.map(p => loadTex(p.currentSrc || p.src).catch(() => null))),
    ]);

    /* ── Wall text: typeset onto canvas at print resolution ── */
    /* Phones in portrait: text walls are typeset as a narrow column with larger lettering */
    const COLUMN = innerWidth / innerHeight < 0.9;
    const COLUMN_W = 1.3;
    /* wall lettering is painted at the density it is seen at: a column filling a phone needs ~1000 px per metre */
    const PPM = COLUMN ? 1000 : 720;
    const SERIF = '"Cormorant Garamond", Georgia, serif', SANS = 'Inter, system-ui, sans-serif';
    const INK = a => `rgba(26,22,18,${a})`;

    function setFont(ctx, b, em) {
        ctx.font = `${em || b.italic ? 'italic ' : ''}${b.weight || 400} ${Math.round(b.size * PPM)}px ${b.family === 'serif' ? SERIF : SANS}`;
        ctx.letterSpacing = ((b.ls || 0) * b.size * PPM).toFixed(2) + 'px';
    }
    function wrap(ctx, sg, maxW, b) {
        const toks = [];
        sg.forEach(s => {
            const t = b.upper ? s.t.toUpperCase() : s.t;
            t.split(/(\n|[ \t]+)/).forEach(w => { if (w) toks.push({ w, em: s.em }); });
        });
        const lines = []; let line = [], lw = 0;
        const push = () => {
            while (line.length && line[line.length - 1].w === ' ') lw -= line.pop().width;
            lines.push({ toks: line, width: lw }); line = []; lw = 0;
        };
        for (const tk of toks) {
            if (tk.w === '\n') { push(); continue; }
            const space = /^[ \t]+$/.test(tk.w);
            if (space) { tk.w = ' '; if (!line.length) continue; }
            setFont(ctx, b, tk.em);
            tk.width = ctx.measureText(tk.w).width;
            if (!space && line.length && lw + tk.width > maxW) push();
            line.push(tk); lw += tk.width;
        }
        if (line.length) push();
        return lines;
    }
    function drawLines(ctx, lines, x, y, b, draw, boxW) {
        const px = b.size * PPM, lh = px * (b.lh || 1.45);
        if (draw) {
            ctx.fillStyle = b.color || INK(1);
            ctx.textBaseline = 'alphabetic';
            lines.forEach((ln, i) => {
                let cx = x + (b.align === 'center' ? (boxW - ln.width) / 2 : 0);
                const by = y + i * lh + lh * 0.5 + px * 0.32;
                ln.toks.forEach(tk => { setFont(ctx, b, tk.em); ctx.fillText(tk.w, cx, by); cx += tk.width; });
            });
        }
        return lines.length * lh;
    }

    function panel(widthM, blocks) {
        if (COLUMN && widthM > COLUMN_W) {
            const f = Math.max(0.42, COLUMN_W / widthM);
            const small = b => ({ ...b, size: b.size * 1.45 });                 // captions and labels up
            blocks = blocks.map(b => {
                if (b.kind === 'row') return { ...b, label: small(b.label), value: { ...b.value, size: b.value.size * 1.25 } };
                if (!b.size) return b;
                if (b.size > 0.1) return { ...b, size: Math.max(b.size * f, 0.1) };
                if (b.size < 0.035) return small(b);
                return b.size < 0.05 ? { ...b, size: b.size * 1.25 } : b;   // body copy set small on the wide wall
            });
            widthM = COLUMN_W;
        }
        const Wpx = Math.round(widthM * PPM);
        const cv = document.createElement('canvas');
        cv.width = Wpx; cv.height = 8;
        let ctx = cv.getContext('2d');
        const run = draw => {
            let y = 0;
            for (const b of blocks) {
                if (b.kind === 'gap') { y += b.h * PPM; continue; }
                if (b.kind === 'rule') {
                    if (draw) { ctx.fillStyle = b.color || INK(0.16); ctx.fillRect(0, y, b.w * PPM, Math.max(2, 0.0022 * PPM)); }
                    y += (b.mb || 0) * PPM + 3; continue;
                }
                if (b.kind === 'row') {
                    const lw = b.labelW * PPM;
                    const h1 = drawLines(ctx, wrap(ctx, [{ t: b.label.text }], lw - 0.05 * PPM, b.label), 0, y, b.label, draw);
                    const h2 = drawLines(ctx, wrap(ctx, [{ t: b.value.text }], Wpx - lw, b.value), lw, y, b.value, draw);
                    y += Math.max(h1, h2) + (b.mb || 0) * PPM; continue;
                }
                const maxW = b.maxW ? b.maxW * PPM : Wpx;
                y += drawLines(ctx, wrap(ctx, b.segs || [{ t: b.text }], maxW, b), 0, y, b, draw, Wpx) + (b.mb || 0) * PPM;
            }
            return y;
        };
        const h = Math.ceil(run(false)) + 6;
        cv.height = h;
        ctx = cv.getContext('2d');
        run(true);

        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = MAX_ANISO;
        const hM = h / PPM;
        const geo = new THREE.PlaneGeometry(widthM, hM).translate(widthM / 2, -hM / 2, 0);   // anchor top-left
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
        mesh.renderOrder = 2;
        return { mesh, w: widthM, h: hM };
    }

    /* ── Soft textures: light pools, shadows, gradients ────── */
    function radialTex(inner, outer, stops) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        const x = cv.getContext('2d');
        const g = x.createRadialGradient(128, 128, inner, 128, 128, outer);
        stops.forEach(([o, c]) => g.addColorStop(o, c));
        x.fillStyle = g; x.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(cv);
    }
    function linearTex(stops) {
        const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
        const x = cv.getContext('2d');
        const g = x.createLinearGradient(0, 0, 0, 256);
        stops.forEach(([o, c]) => g.addColorStop(o, c));
        x.fillStyle = g; x.fillRect(0, 0, cv.width, cv.height);
        return new THREE.CanvasTexture(cv);
    }
    function shadowTex() {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        const x = cv.getContext('2d');
        x.filter = 'blur(26px)';
        x.fillStyle = 'rgba(0,0,0,1)';
        x.fillRect(62, 62, 132, 132);
        return new THREE.CanvasTexture(cv);
    }
    const POOL = radialTex(0, 128, [[0, 'rgba(255,250,240,0.55)'], [0.45, 'rgba(255,248,236,0.22)'], [1, 'rgba(255,248,236,0)']]);
    const SHADOW = shadowTex();
    const AO_FLOOR = linearTex([[0, 'rgba(60,50,40,0)'], [1, 'rgba(60,50,40,0.22)']]);
    const COVE = linearTex([[0, 'rgba(255,253,248,0.65)'], [1, 'rgba(255,253,248,0)']]);

    function concreteTex() {
        const s = 512, cv = document.createElement('canvas'); cv.width = cv.height = s;
        const x = cv.getContext('2d');
        x.fillStyle = '#C9C2B6'; x.fillRect(0, 0, s, s);
        const img = x.getImageData(0, 0, s, s), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * 16;
            d[i] += n; d[i + 1] += n; d[i + 2] += n;
        }
        x.putImageData(img, 0, 0);
        /* low-frequency cloudiness, tiled so the repeat has no seam */
        const cl = document.createElement('canvas'); cl.width = cl.height = 16;
        const cx = cl.getContext('2d'), cd = cx.createImageData(16, 16);
        for (let i = 0; i < cd.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 60; cd.data[i] = cd.data[i + 1] = cd.data[i + 2] = v; cd.data[i + 3] = 255; }
        cx.putImageData(cd, 0, 0);
        x.globalAlpha = 0.07; x.globalCompositeOperation = 'overlay'; x.imageSmoothingQuality = 'high';
        for (const ox of [-s, 0]) for (const oy of [-s, 0]) x.drawImage(cl, ox + s / 2, oy + s / 2, s, s);
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = MAX_ANISO;
        return t;
    }

    /* ── Room ──────────────────────────────────────────────── */
    const HALF = 3.5, HEIGHT = 4.6, EYE = 1.62;
    const WALL = new THREE.MeshLambertMaterial({ color: '#F6F2EB' });

    class Wall {
        constructor(origin, right, normal) { this.origin = origin; this.right = right; this.normal = normal; this.q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, UP, normal)); }
        point(u, y, off = 0) { return this.origin.clone().addScaledVector(this.right, u).add(new V3(0, y, 0)).addScaledVector(this.normal, off); }
        place(obj, u, y, off = 0) { obj.position.copy(this.point(u, y, off)); obj.quaternion.copy(this.q); scene.add(obj); return obj; }
    }
    const leftWall  = z => new Wall(new V3(-HALF, 0, z), new V3(0, 0, -1), new V3(1, 0, 0));
    const rightWall = z => new Wall(new V3( HALF, 0, z), new V3(0, 0,  1), new V3(-1, 0, 0));

    function softPlane(tex, w, h, opacity = 1) {
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, toneMapped: false }));
    }
    function lightPool(wall, u, y, w, h) {
        const m = softPlane(POOL, w, h, 1);
        m.renderOrder = 1;
        wall.place(m, u, y, 0.004);
    }

    function hang(wall, tex, u, y, w, h, frameT, userData) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w + frameT * 2, h + frameT * 2, 0.035),
            new THREE.MeshLambertMaterial({ color: '#1C1A18' }));
        wall.place(frame, u, y, 0.0175);
        const sh = softPlane(SHADOW, (w + frameT * 2) * 1.55, (h + frameT * 2) * 1.6, 0.34);
        sh.renderOrder = 1;
        wall.place(sh, u, y - 0.05, 0.002);
        const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
        art.userData = userData;
        wall.place(art, u, y, 0.0356);
        return art;
    }

    /* ── Sequence the exhibition ───────────────────────────── */
    const stations = [];
    const clickable = [];
    let zc = -1.0;
    const GAP = 1.4;
    let side = 0;                                   // 0 left, 1 right
    const nextWall = span => {
        const zCenter = zc - span / 2;
        zc -= span + GAP;
        const w = side === 0 ? leftWall(zCenter) : rightWall(zCenter);
        side ^= 1;
        return w;
    };
    const sameWallNext = (span, prevWall) => {    // continue along the wall just used
        const zCenter = zc - span / 2;
        zc -= span + GAP;
        return prevWall.normal.x > 0 ? leftWall(zCenter) : rightWall(zCenter);
    };

    /* Entry */
    {
        const e = C.entry;
        const p = panel(3.4, [
            { text: e.series, family: 'sans', weight: 700, size: 0.026, ls: 0.34, upper: true, color: INK(0.34), mb: 0.07 },
            { text: e.title, family: 'serif', weight: 300, size: 0.62, lh: 1.0, color: INK(1), mb: 0.1 },
            { kind: 'rule', w: 0.2, mb: 0.08 },
            ...e.meta.map(m => ({ text: m, family: 'sans', weight: 300, size: 0.03, ls: 0.14, upper: true, color: INK(0.45), lh: 1.6 })),
        ]);
        const span = p.w + 1.2, wall = nextWall(span);
        const top = 2.5;
        wall.place(p.mesh, -p.w / 2, top, 0.006);
        lightPool(wall, 0, top - p.h / 2 + 0.3, p.w + 2.2, 3.4);
        stations.push({ key: 'entry', label: 'Entry', short: 'Entry', name: e.title, text: true, wall, cu: 0, cy: top - p.h / 2, bw: p.w, bh: p.h, eyebrow: e.series });
    }

    /* On the Work */
    {
        const i = C.intro;
        const p = panel(2.55, [
            { text: i.label, family: 'sans', weight: 700, size: 0.024, ls: 0.3, upper: true, color: INK(0.34), mb: 0.09 },
            ...i.paras.map(sg => ({ segs: sg, family: 'serif', weight: 300, size: 0.058, lh: 1.42, color: INK(0.82), mb: 0.05 })),
            { kind: 'gap', h: 0.04 },
            { segs: i.closing, family: 'sans', weight: 400, size: 0.022, ls: 0.06, lh: 1.8, color: INK(0.4) },
        ]);
        const span = p.w + 1.2, wall = nextWall(span);
        const top = Math.max(EYE + p.h / 2, p.h + 0.55);
        wall.place(p.mesh, -p.w / 2, top, 0.006);
        lightPool(wall, 0, top - p.h / 2 + 0.3, p.w + 2, p.h + 2);
        stations.push({ key: 'intro', label: 'On the Work', short: 'Statement', name: i.label, text: true, wall, cu: 0, cy: top - p.h / 2, bw: p.w, bh: p.h, eyebrow: i.label });
    }

    /* Print Decisions */
    {
        const m = C.material;
        const head = panel(1.05, [
            { segs: m.heading, family: 'serif', weight: 300, size: 0.2, lh: 0.98, color: INK(1) },
        ]);
        const body = panel(2.0, [
            ...m.specs.map(([l, v]) => ({
                kind: 'row', labelW: 0.42, mb: 0.034,
                label: { text: l, family: 'sans', weight: 700, size: 0.02, ls: 0.24, upper: true, color: INK(0.36), lh: 2.2 },
                value: { text: v, family: 'sans', weight: 300, size: 0.03, color: INK(0.78), lh: 1.5 },
            })),
            { kind: 'gap', h: 0.07 },
            ...m.notes.map(sg => ({ segs: sg, family: 'serif', weight: 300, size: 0.046, lh: 1.5, color: INK(0.74), mb: 0.04 })),
        ]);
        if (COLUMN) {
            /* heading above the specs and notes */
            const bh = head.h + 0.12 + body.h;
            const wall = nextWall(body.w + 1.2);
            const top = Math.max(EYE + bh / 2, bh + 0.55);
            wall.place(head.mesh, -body.w / 2, top, 0.006);
            wall.place(body.mesh, -body.w / 2, top - head.h - 0.12, 0.006);
            lightPool(wall, 0, top - bh / 2 + 0.3, body.w + 2, bh + 2);
            stations.push({ key: 'material', label: 'Print Decisions', short: 'Print', name: 'Print Decisions', text: true, wall, cu: 0, cy: top - bh / 2, bw: body.w, bh, eyebrow: 'Print Decisions' });
        } else {
            const total = head.w + 0.4 + body.w;
            const span = total + 1.2, wall = nextWall(span);
            const top = Math.max(EYE + body.h / 2, body.h + 0.55);
            wall.place(head.mesh, -total / 2, top, 0.006);
            wall.place(body.mesh, -total / 2 + head.w + 0.4, top, 0.006);
            lightPool(wall, 0, top - body.h / 2 + 0.3, total + 2, body.h + 2);
            stations.push({ key: 'material', label: 'Print Decisions', short: 'Print', name: 'Print Decisions', text: true, wall, cu: 0, cy: top - body.h / 2, bw: total, bh: body.h, eyebrow: 'Print Decisions' });
        }
    }

    /* Exhibition narrative, then the exhibition views on the same wall */
    let viewsWall;
    {
        const v = C.views;
        const p = panel(2.35, [
            { text: v.eyebrow, family: 'sans', weight: 700, size: 0.024, ls: 0.3, upper: true, color: INK(0.34), mb: 0.05 },
            { text: v.title, family: 'serif', weight: 300, size: 0.13, lh: 1.02, color: INK(1), mb: 0.08 },
            { text: v.pull, family: 'serif', weight: 300, italic: true, size: 0.07, lh: 1.3, color: INK(0.9), mb: 0.07 },
            ...v.body.map(sg => ({ segs: sg, family: 'serif', weight: 300, size: 0.043, lh: 1.52, color: INK(0.76), mb: 0.035 })),
            { kind: 'gap', h: 0.03 },
            { text: v.attribution, family: 'sans', weight: 500, size: 0.02, ls: 0.2, upper: true, color: INK(0.36) },
        ]);
        const span = p.w + 1.2, wall = nextWall(span);
        viewsWall = wall;
        const top = Math.max(EYE + p.h / 2, p.h + 0.5);
        wall.place(p.mesh, -p.w / 2, top, 0.006);
        lightPool(wall, 0, top - p.h / 2 + 0.3, p.w + 2, p.h + 2);
        stations.push({ key: 'story', label: v.title, short: 'GOAF', name: v.title, text: true, wall, cu: 0, cy: top - p.h / 2, bw: p.w, bh: p.h, eyebrow: v.eyebrow });
    }
    {
        /* salon hang: justified rows */
        const items = C.views.photos.map((el, i) => ({ el, tex: photoTex[i] })).filter(o => o.tex);
        const MAXW = 3.9, ROWH = 0.46, G = 0.09;
        const rows = []; let row = [], rw = 0;
        items.forEach(o => {
            o.a = o.tex.image.width / o.tex.image.height;
            const w = ROWH * o.a;
            if (row.length && rw + w > MAXW) { rows.push(row); row = []; rw = 0; }
            row.push(o); rw += w + G;
        });
        if (row.length) rows.push(row);
        const rowsH = rows.map(r => { const sum = r.reduce((s, o) => s + o.a, 0); const avail = MAXW - G * (r.length - 1); return Math.min(ROWH * 1.25, avail / sum); });
        const totalH = rowsH.reduce((s, h) => s + h, 0) + G * (rows.length - 1);
        const span = MAXW + 1.4;
        const wall = sameWallNext(span, viewsWall);
        let y = EYE + totalH / 2;
        rows.forEach((r, ri) => {
            const h = rowsH[ri];
            const rowW = r.reduce((s, o) => s + o.a * h, 0) + G * (r.length - 1);
            let u = -rowW / 2;
            r.forEach(o => {
                const w = o.a * h;
                const art = hang(wall, o.tex, u + w / 2, y - h / 2, w, h, 0.012, { kind: 'photo', el: o.el });
                clickable.push(art);
                u += w + G;
            });
            y -= h + G;
        });
        lightPool(wall, 0, EYE + 0.3, MAXW + 2, totalH + 2);
        stations.push({ key: 'views', label: 'Exhibition Views', short: 'Views', name: C.views.eyebrow, thumb: C.views.photos[0]?.currentSrc || C.views.photos[0]?.src, wall, cu: 0, cy: EYE, bw: MAXW, bh: totalH, eyebrow: C.views.eyebrow, photos: true });
    }

    /* Chapter I */
    {
        const c = C.chapter;
        const p = panel(2.4, [
            { text: c.num, family: 'sans', weight: 700, size: 0.026, ls: 0.34, upper: true, color: '#9A7630', mb: 0.05 },
            { text: c.name, family: 'serif', weight: 300, size: 0.26, lh: 1.0, color: INK(1), mb: 0.04 },
            { text: c.count, family: 'sans', weight: 500, size: 0.022, ls: 0.22, upper: true, color: INK(0.38), mb: 0.12 },
            ...c.paras.map((sg, k) => ({ segs: sg, family: 'serif', weight: 300, size: k ? 0.046 : 0.064, lh: 1.45, color: INK(k ? 0.76 : 0.9), mb: 0.045 })),
            { kind: 'gap', h: 0.02 },
            { text: c.note, family: 'sans', weight: 500, size: 0.02, ls: 0.2, upper: true, color: INK(0.36) },
        ]);
        const span = p.w + 1.2, wall = nextWall(span);
        const top = Math.max(EYE + p.h / 2, p.h + 0.55);
        wall.place(p.mesh, -p.w / 2, top, 0.006);
        lightPool(wall, 0, top - p.h / 2 + 0.3, p.w + 2, p.h + 2);
        stations.push({ key: 'chapter', label: c.num, short: 'Ch. I', name: `${c.num} · ${c.name}`, text: true, wall, cu: 0, cy: top - p.h / 2, bw: p.w, bh: p.h, eyebrow: `${c.num} · ${c.name}` });
    }

    /* The nine works */
    C.works.forEach((wk, i) => {
        const tex = workTex[i];
        const a = tex.image.width / tex.image.height;
        const L = longSideM(wk.title);
        const w = a >= 1 ? L : L * a, h = a >= 1 ? L / a : L;
        const FT = 0.026;
        const label = panel(0.7, [
            { text: wk.title, family: 'serif', weight: 300, size: 0.062, lh: 1.08, color: INK(1), mb: 0.02 },
            { text: wk.meta, family: 'sans', weight: 500, size: 0.019, ls: 0.16, upper: true, lh: 1.75, color: INK(0.44), mb: 0.022 },
            { text: wk.edition, family: 'sans', weight: 700, size: 0.019, ls: 0.2, upper: true, color: wk.scarce ? '#8C6A24' : INK(0.5) },
        ]);
        const LGAP = 0.3;
        const total = w + FT * 2 + LGAP + label.w;
        const span = Math.max(total + 1.6, 3.2), wall = nextWall(span);
        const pu = -total / 2 + FT + w / 2, py = 1.58;
        const art = hang(wall, tex, pu, py, w, h, FT, { kind: 'work', station: stations.length });
        clickable.push(art);
        const lu = -total / 2 + w + FT * 2 + LGAP;
        wall.place(label.mesh, lu, py - h / 2 + label.h, 0.006);
        lightPool(wall, pu, py + 0.35, w * 2.4 + 1.2, h * 2 + 2.2);
        stations.push({
            key: 'work' + (i + 1), label: String(i + 1).padStart(2, '0'), short: wk.title, name: wk.title, thumb: wk.img.currentSrc || wk.img.src, wall, kind: 'work', work: wk,
            cu: 0, cy: py, bw: total, bh: Math.max(h, 1), pu, py, pw: w + FT * 2, ph: h + FT * 2, eyebrow: wk.num,
        });
    });

    /* End wall: Chapter II */
    const zEnd = zc - 1.6;
    {
        const endWall = new Wall(new V3(0, 0, zEnd), new V3(1, 0, 0), new V3(0, 0, 1));
        const c2 = C.ch2;
        const ch2P = panel(1.5, [
            { text: c2.num, family: 'sans', weight: 700, size: 0.026, ls: 0.3, upper: true, color: '#9A7630', mb: 0.05 },
            { segs: c2.name, family: 'serif', weight: 300, size: 0.2, lh: 0.98, color: INK(1), mb: 0.06 },
            { text: c2.note, family: 'serif', weight: 300, italic: true, size: 0.06, color: INK(0.7) },
        ]);
        const chTop = EYE + ch2P.h / 2;
        endWall.place(ch2P.mesh, -ch2P.w / 2, chTop, 0.006);
        const pool = softPlane(POOL, 5, 3.6, 0.45); pool.renderOrder = 1;
        endWall.place(pool, 0, EYE + 0.3, 0.004);
        stations.push({ key: 'ch2', label: c2.num, short: 'Ch. II', name: c2.num, text: true, wall: endWall, cu: 0, cy: chTop - ch2P.h / 2, bw: ch2P.w, bh: ch2P.h, eyebrow: c2.num, maxD: 9 });
    }

    /* Architecture of the corridor */
    {
        const zStart = 8, len = zStart - zEnd;
        const zMid = (zStart + zEnd) / 2;
        const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

        const ct = concreteTex(); ct.repeat.set(HALF * 2 / 3, len / 3);
        const floor = plane(HALF * 2, len, new THREE.MeshLambertMaterial({ map: ct }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zMid); scene.add(floor);

        const ceil = plane(HALF * 2, len, new THREE.MeshBasicMaterial({ color: '#EAE5DD' }));
        ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HEIGHT, zMid); scene.add(ceil);

        const wl = plane(len, HEIGHT, WALL); wl.rotation.y = Math.PI / 2; wl.position.set(-HALF, HEIGHT / 2, zMid); scene.add(wl);
        const wr = plane(len, HEIGHT, WALL); wr.rotation.y = -Math.PI / 2; wr.position.set(HALF, HEIGHT / 2, zMid); scene.add(wr);
        const we = plane(HALF * 2, HEIGHT, WALL); we.position.set(0, HEIGHT / 2, zEnd); scene.add(we);
        const ws = plane(HALF * 2, HEIGHT, WALL); ws.rotation.y = Math.PI; ws.position.set(0, HEIGHT / 2, zStart); scene.add(ws);

        /* light slots in the ceiling */
        [-1.7, 1.7].forEach(x => {
            const slot = plane(0.09, len - 1, new THREE.MeshBasicMaterial({ color: '#FFFDF6', toneMapped: false }));
            slot.rotation.x = Math.PI / 2; slot.position.set(x, HEIGHT - 0.002, zMid); scene.add(slot);
        });

        /* cove wash at the top of the walls, contact shade at the floor, shadow gap */
        const band = (tex, h, y) => {
            [[-HALF + 0.003, Math.PI / 2], [HALF - 0.003, -Math.PI / 2]].forEach(([x, ry]) => {
                const m = softPlane(tex, len, h, 1);
                m.rotation.y = ry; m.position.set(x, y, zMid); scene.add(m);
            });
            const e = softPlane(tex, HALF * 2, h, 1);
            e.position.set(0, y, zEnd + 0.003); scene.add(e);
        };
        band(COVE, 1.3, HEIGHT - 0.65);
        band(AO_FLOOR, 0.55, 0.275);
        const gapMat = new THREE.MeshBasicMaterial({ color: '#2A2520' });
        [[-HALF + 0.004, Math.PI / 2], [HALF - 0.004, -Math.PI / 2]].forEach(([x, ry]) => {
            const g = plane(len, 0.012, gapMat); g.rotation.y = ry; g.position.set(x, 0.006, zMid); scene.add(g);
        });

        scene.add(new THREE.HemisphereLight('#FFFBF3', '#CFC5B6', 3.4));
        const sun = new THREE.DirectionalLight('#FFFFFF', 1.1);
        sun.position.set(0.6, 6, 0.6); scene.add(sun);
    }

    /* ── Camera path ───────────────────────────────────────── */
    const N = stations.length;
    const POSITIONS = N + 1;                 // entrance + stations
    root.style.setProperty('--gw-positions', POSITIONS);

    const opening = { pos: new V3(0, EYE + 0.05, 6.4), look: new V3(0, 1.5, -40) };
    let narrow = false;
    const reserve = { top: 80, bottom: 160, bottomTarget: 160 };   // screen space taken by the navbar and the bottom bar

    function viewOf(st, zoom) {
        const H = stage.clientHeight || innerHeight;
        const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), tanH = tanV * cam.aspect;
        const tV = tanV * clamp((H - reserve.top - reserve.bottom) / H, 0.4, 1);
        const tH = tanH * (narrow ? 1 : 0.92);
        const work = st.kind === 'work';
        /* on a narrow screen a print fills the frame; its label moves into the caption */
        const bw = work && narrow ? st.pw : st.bw;
        let cu = work && narrow ? st.pu : st.cu, cy = st.cy;
        let D = Math.max((bw * 0.5 * 1.16) / tH, (st.bh * 0.5 * 1.14) / tV);
        if (narrow && st.text) {
            /* fill the width so the lettering is readable; a tall wall is framed from its top */
            D = (st.bw * 0.5 * 1.1) / tH;
            const visH = 2 * D * tV;
            if (st.bh > visH * 0.94) cy = st.cy + st.bh / 2 - visH * 0.47;
        }
        if (work && zoom > 0.001) {
            const Dc = Math.max((st.pw * 0.5 * 1.05) / tH, (st.ph * 0.5 * 1.05) / tV);
            D = lerp(D, Dc, zoom); cu = lerp(cu, st.pu, zoom); cy = lerp(cy, st.py, zoom);
        }
        D = Math.min(D, st.maxD || HALF * 2 - 0.5);
        /* centre the subject in the space between navbar and bottom bar */
        const shift = ((reserve.bottom - reserve.top) / 2 / H) * 2 * D * tanV;
        const look = st.wall.point(cu, cy);
        const pos = look.clone().addScaledVector(st.wall.normal, D);
        pos.y = lerp(EYE, cy, 0.45) - shift;
        look.y -= shift;
        return { pos, look };
    }
    const viewAt = (i, zoom) => i < 0 ? opening : viewOf(stations[i], zoom);

    /* ── Scroll mapping ────────────────────────────────────── */
    const snaps = [];
    for (let i = 0; i < POSITIONS; i++) {
        const m = document.createElement('div');
        m.className = 'gw-snap'; m.style.top = `calc(${i} * var(--gw-step))`;
        root.appendChild(m); snaps.push(m);
    }
    let stepPx = innerHeight * 0.8;
    const measureStep = () => { stepPx = (snaps[1].offsetTop - snaps[0].offsetTop) || innerHeight * 0.8; };
    const stationTop = i => root.getBoundingClientRect().top + scrollY + (i + 1) * stepPx;

    let pTarget = -1, p = -1, zoomStation = -1, jump = null;
    const zooms = new Float32Array(N);
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };

    /* On phones the room holds still on screen: no scroll, only swipe, buttons and the strip */
    let fixed = false;
    function readScroll() {
        if (fixed) return;
        const t = clamp(-root.getBoundingClientRect().top / stepPx, 0, POSITIONS - 1) - 1;
        if (jump) {
            if (Math.abs(t - jump.to) < 0.05) return;
            p = jump.pNow; jump = null;                 // the visitor took over mid-glide
        }
        pTarget = t;
        if (zoomStation >= 0 && Math.abs(pTarget - zoomStation) > 0.12) setZoom(-1);
    }
    addEventListener('scroll', readScroll, { passive: true });

    /* ── Moving: adjacent walls glide via scroll, far walls travel the corridor ── */
    const curLook = new V3().copy(opening.look);
    function goTo(i) {
        i = clamp(Math.round(i), -1, N - 1);
        setZoom(-1);
        const dist = Math.abs(i - p);
        jump = null;
        if (!fixed) scrollTo({ top: stationTop(i), behavior: 'instant' });
        pTarget = i;
        if (REDUCED) { p = i; return; }
        if (dist <= 1.05) return;
        jump = { from: { pos: cam.position.clone(), look: curLook.clone() }, fromP: p, pNow: p, to: i,
                 t0: performance.now(), dur: Math.min(2300, 850 + dist * 95) };
    }
    const step = d => goTo(Math.round(jump ? jump.to : pTarget) + d);

    let lastW = 0;
    function resize() {
        const keep = Math.round(jump ? jump.to : pTarget);
        const widthChanged = innerWidth !== lastW; lastW = innerWidth;
        const r = root.getBoundingClientRect();
        const inWalk = r.top <= 1 && r.bottom >= innerHeight - 1;
        const w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h, false);
        cam.aspect = w / h;
        narrow = cam.aspect < 0.9;
        cam.fov = cam.aspect < 0.62 ? 60 : cam.aspect < 0.9 ? 52 : 40;
        cam.updateProjectionMatrix();
        root.classList.toggle('gw-narrow', narrow);
        fixed = COARSE_PTR && Math.min(innerWidth, innerHeight) <= 600;
        root.classList.toggle('gw-fixed', fixed);
        document.documentElement.classList.toggle('gw-fixed-on', fixed);
        reserve.top = ($('.navbar')?.offsetHeight || 70) + 8;
        reserve.bottom = reserve.bottomTarget = (bottom.offsetHeight || 150) + 12;
        measureStep();
        /* phone toolbars resize the viewport while you move; only re-seat the camera when the width really changed */
        if (widthChanged && (inWalk || fixed)) {
            jump = null; pTarget = keep; p = keep;
            if (!fixed) scrollTo({ top: stationTop(keep), behavior: 'instant' });
        }
        readScroll();
        if (!plan.hidden) drawPlan();
        setHint?.();
    }
    addEventListener('resize', resize);

    /* ── Pointer: hover, tap, swipe, pinch ─────────────────── */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function hit(x, y) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cam);
        return ray.intersectObjects(clickable, false)[0]?.object;
    }
    function activate(o) {
        if (!o) { if (zoomStation >= 0) setZoom(-1); return; }
        if (o.userData.kind === 'photo') { window.openLightbox?.(o.userData.el); return; }
        const idx = o.userData.station;
        if (Math.round(pTarget) === idx && !jump) setZoom(zoomStation === idx ? -1 : idx);
        else goTo(idx);
    }

    const touches = new Map();
    let swipe = null, pinch = null, swallowClick = false;
    canvas.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 1) swipe = { x: e.clientX, y: e.clientY, t: performance.now() };
        if (touches.size === 2) {
            const [a, b] = [...touches.values()];
            pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; swipe = null;
        }
    });
    canvas.addEventListener('pointermove', e => {
        if (e.pointerType === 'mouse') {
            const r = canvas.getBoundingClientRect();
            mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
            mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
            canvas.style.cursor = hit(e.clientX, e.clientY) ? (zoomStation >= 0 ? 'zoom-out' : 'zoom-in') : '';
            return;
        }
        if (!touches.has(e.pointerId)) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && touches.size === 2) {
            const [a, b] = [...touches.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y), ratio = d / pinch.d;
            const cur = stations[Math.round(pTarget)];
            if (cur?.kind === 'work') {
                if (ratio > 1.22) { setZoom(Math.round(pTarget)); pinch.d = d; }
                if (ratio < 0.82) { setZoom(-1); pinch.d = d; }
            }
            swallowClick = true;
        }
    });
    const endTouch = e => {
        if (e.pointerType === 'mouse') return;
        if (swipe && touches.size === 1 && e.type === 'pointerup') {
            const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, dt = performance.now() - swipe.t;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 800) { step(dx < 0 ? 1 : -1); swallowClick = true; }
            else if (fixed && Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx) * 1.4 && dt < 800) { step(dy < 0 ? 1 : -1); swallowClick = true; }
        }
        touches.delete(e.pointerId);
        if (touches.size < 2) pinch = null;
        if (!touches.size) swipe = null;
    };
    canvas.addEventListener('pointerup', endTouch);
    canvas.addEventListener('pointercancel', endTouch);
    canvas.addEventListener('click', e => {
        if (swallowClick) { swallowClick = false; return; }
        activate(hit(e.clientX, e.clientY));
    });

    addEventListener('keydown', e => {
        if (!plan.hidden || !read.hidden) { if (e.key === 'Escape') { closePlan(); closeRead(); } return; }
        const r = root.getBoundingClientRect();
        if (r.top > 1 || r.bottom < innerHeight - 1 || $('#lbOverlay')?.classList.contains('open')) return;
        if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); step(1); }
        if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
        if (e.key === 'Home') { e.preventDefault(); goTo(-1); }
        if (e.key === 'End') { e.preventDefault(); goTo(N - 1); }
        if (e.key === 'Escape' && zoomStation >= 0) setZoom(-1);
    });

    /* ── HUD ───────────────────────────────────────────────── */
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const hud = $('.gw-hud');
    $('#gwRail')?.remove();
    const cap = $('#gwCap'), hint = $('#gwHint');
    const COARSE = matchMedia('(pointer: coarse)').matches;
    const setHint = () => { hint.textContent = fixed ? 'Swipe to walk' : COARSE ? 'Swipe or scroll to walk' : 'Scroll or use the arrow keys to walk'; };

    const bottom = el('div', 'gw-bottom');
    const bar = el('div', 'gw-bar');
    const ctrl = el('div', 'gw-ctrl');
    const prev = el('button', 'gw-btn'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous wall'); prev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    const count = el('span', 'gw-count');
    const next = el('button', 'gw-btn'); next.type = 'button'; next.setAttribute('aria-label', 'Next wall'); next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    const planBtn = el('button', 'gw-planbtn', 'Plan'); planBtn.type = 'button';
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    ctrl.append(prev, count, next, planBtn);
    cap.remove(); bar.append(cap, ctrl);

    const strip = el('div', 'gw-strip'); strip.setAttribute('role', 'list'); strip.setAttribute('aria-label', 'Walls');
    const tiles = stations.map((st, i) => {
        const b = el('button', 'gw-tile'); b.type = 'button'; b.setAttribute('role', 'listitem');
        b.setAttribute('aria-label', st.name); b.title = st.name;
        if (st.thumb) { const im = el('img'); im.src = st.thumb; im.alt = ''; im.loading = 'lazy'; b.appendChild(im); }
        else b.appendChild(el('span', 'gw-tile-txt', st.short));
        b.addEventListener('click', () => goTo(i));
        strip.appendChild(b);
        return b;
    });
    bottom.append(bar, strip);
    hud.appendChild(bottom);

    /* Read panel */
    const read = el('div', 'gw-read'); read.hidden = true;
    read.innerHTML = '<div class="gw-read-sheet" role="dialog" aria-modal="true" aria-label="Wall text"><button type="button" class="gw-close">Close</button><div class="gw-read-body"></div></div>';
    const readBody = $('.gw-read-body', read);
    read.addEventListener('click', e => { if (e.target === read) closeRead(); });
    $('.gw-close', read).addEventListener('click', closeRead);
    hud.appendChild(read);

    const para = (sg, cls) => {
        const n = el('p', cls);
        sg.forEach(s => {
            if (s.t === '\n') n.appendChild(document.createElement('br'));
            else if (s.em) n.appendChild(el('em', null, s.t));
            else n.appendChild(document.createTextNode(s.t));
        });
        return n;
    };
    const T1 = t => [{ t }];
    const READ = {
        entry: () => [el('p', 'gw-r-eyebrow', C.entry.series), el('h2', 'gw-r-title', C.entry.title), ...C.entry.meta.map(m => el('p', 'gw-r-small', m))],
        intro: () => [el('p', 'gw-r-eyebrow', C.intro.label), ...C.intro.paras.map(sg => para(sg)), para(C.intro.closing, 'gw-r-small')],
        material: () => {
            const dl = el('dl', 'gw-r-specs');
            C.material.specs.forEach(([l, v]) => dl.append(el('dt', null, l), el('dd', null, v)));
            return [para(C.material.heading, 'gw-r-title'), dl, ...C.material.notes.map(sg => para(sg))];
        },
        story: () => [el('p', 'gw-r-eyebrow', C.views.eyebrow), el('h2', 'gw-r-title', C.views.title), para(T1(C.views.pull), 'gw-r-pull'),
                      ...C.views.body.map(sg => para(sg)), el('p', 'gw-r-small', C.views.attribution)],
        chapter: () => [el('p', 'gw-r-eyebrow', C.chapter.num), el('h2', 'gw-r-title', C.chapter.name), el('p', 'gw-r-small', C.chapter.count),
                        ...C.chapter.paras.map(sg => para(sg)), el('p', 'gw-r-small', C.chapter.note)],
        ch2: () => [el('p', 'gw-r-eyebrow', C.ch2.num), para(C.ch2.name, 'gw-r-title'), para(T1(C.ch2.note), 'gw-r-pull')],
    };
    let lastFocus = null;
    function openRead(key) {
        readBody.replaceChildren(...READ[key]());
        readBody.scrollTop = 0;
        lastFocus = document.activeElement;
        read.hidden = false;
        requestAnimationFrame(() => read.classList.add('in'));
        $('.gw-close', read).focus({ preventScroll: true });
    }
    function closeRead() {
        if (read.hidden) return;
        read.classList.remove('in');
        setTimeout(() => { read.hidden = true; }, 350);
        lastFocus?.focus?.({ preventScroll: true });
    }

    /* Floor plan */
    const plan = el('div', 'gw-plan'); plan.hidden = true;
    plan.innerHTML = '<div class="gw-plan-inner" role="dialog" aria-modal="true" aria-label="Floor plan"><div class="gw-plan-head"><div><p class="gw-plan-eyebrow"></p><p class="gw-plan-title">Floor plan</p></div><button type="button" class="gw-close">Close</button></div><div class="gw-plan-draw"></div></div>';
    $('.gw-plan-eyebrow', plan).textContent = `${C.entry.title} · ${C.chapter.num}`;
    const planDraw = $('.gw-plan-draw', plan);
    $('.gw-close', plan).addEventListener('click', closePlan);
    plan.addEventListener('click', e => { if (e.target === plan) closePlan(); });
    hud.appendChild(plan);
    planBtn.addEventListener('click', openPlan);

    function openPlan() {
        lastFocus = document.activeElement;
        plan.hidden = false;
        requestAnimationFrame(() => { drawPlan(); plan.classList.add('in'); });
        $('.gw-close', plan).focus({ preventScroll: true });
    }
    function closePlan() {
        if (plan.hidden) return;
        plan.classList.remove('in');
        setTimeout(() => { plan.hidden = true; }, 350);
        lastFocus?.focus?.({ preventScroll: true });
    }

    const SVGNS = 'http://www.w3.org/2000/svg';
    const svg = (tag, attrs = {}, parent) => {
        const n = document.createElementNS(SVGNS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    };
    function drawPlan() {
        planDraw.replaceChildren();
        const Wpx = planDraw.clientWidth, Hpx = planDraw.clientHeight;
        if (!Wpx || !Hpx) return;
        const zStart = 8, LEN = zStart - zEnd, WID = HALF * 2, TH = 0.28;
        const horizontal = Wpx > Hpx * 1.15;
        const labelRoom = horizontal ? 118 : Math.min(170, (Wpx - 40) * 0.38);
        const S = horizontal
            ? Math.min((Wpx - 260) / (LEN + TH * 2), (Hpx - labelRoom * 2) / (WID + TH * 2))
            : Math.min((Hpx - 90) / (LEN + TH * 2), (Wpx - labelRoom * 2) / (WID + TH * 2));
        /* plan coordinates: a along the corridor from the entrance, c across it (left wall negative) */
        const ox = horizontal ? 110 : Wpx / 2, oy = horizontal ? Hpx / 2 : Hpx - 50;
        const P = (a, c) => horizontal ? [ox + a * S, oy + c * S] : [ox + c * S, oy - a * S];
        const g = svg('svg', { width: Wpx, height: Hpx, viewBox: `0 0 ${Wpx} ${Hpx}`, class: 'gw-plan-svg' }, planDraw);
        const defs = svg('defs', {}, g);
        const mk = svg('marker', { id: 'gwArrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }, mk);

        const rect = (a0, c0, a1, c1, cls) => {
            const [x0, y0] = P(a0, c0), [x1, y1] = P(a1, c1);
            svg('rect', { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), class: cls }, g);
        };
        const line = (a0, c0, a1, c1, cls, extra = {}) => {
            const [x1, y1] = P(a0, c0), [x2, y2] = P(a1, c1);
            svg('line', { x1, y1, x2, y2, class: cls, ...extra }, g);
        };
        rect(0, -HALF - TH, LEN + TH, -HALF, 'poche');                // left wall
        rect(0, HALF, LEN + TH, HALF + TH, 'poche');                  // right wall
        rect(LEN, -HALF - TH, LEN + TH, HALF + TH, 'poche');          // end wall
        rect(-TH, -HALF - TH, 0, -1.3, 'poche');                      // entrance wall, with its opening
        rect(-TH, 1.3, 0, HALF + TH, 'poche');
        line(0.5, -1.7, LEN - 0.5, -1.7, 'slot');
        line(0.5, 1.7, LEN - 0.5, 1.7, 'slot');
        line(-2.2, 0, -0.5, 0, 'arrow', { 'marker-end': 'url(#gwArrow)' });
        {
            const [x, y] = P(-2.6, 0);
            const t = svg('text', horizontal ? { x: x - 4, y: y + 4, 'text-anchor': 'end', class: 'entrance' } : { x, y: y + 12, 'text-anchor': 'middle', class: 'entrance' }, g);
            t.textContent = 'Entrance';
        }
        /* scale bar */
        {
            const [bx, by] = horizontal ? [Wpx - 30 - 10 * S, Hpx - 16] : [18, 22];
            svg('line', { x1: bx, y1: by, x2: bx + 10 * S, y2: by, class: 'scale' }, g);
            [0, 5, 10].forEach(m => {
                svg('line', { x1: bx + m * S, y1: by - 3, x2: bx + m * S, y2: by + 3, class: 'scale' }, g);
                const t = svg('text', { x: bx + m * S, y: by - 7, class: 'scale-t', 'text-anchor': 'middle' }, g);
                t.textContent = m === 10 ? '10 m' : String(m);
            });
        }

        const active = Math.round(jump ? jump.to : pTarget);
        let endIdx = 0;
        stations.forEach((st, i) => {
            const end = Math.abs(st.wall.normal.z) > 0.5;
            const c = end ? st.cu : (st.wall.normal.x > 0 ? -HALF : HALF);
            const a = end ? LEN : zStart - st.wall.origin.z;
            const [x, y] = P(a, c);
            const grp = svg('g', { class: 'mark' + (i === active ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': st.name }, g);
            svg('circle', { cx: x, cy: y, r: 20, class: 'hit' }, grp);
            svg('circle', { cx: x, cy: y, r: i === active ? 6.5 : 4.5, class: 'dot' }, grp);
            let tx, ty, anchor;
            if (end) {
                if (horizontal) { tx = x + TH * S + 12; ty = y + 4; anchor = 'start'; endIdx++; }
                else { tx = x; ty = y - TH * S - (endIdx++ % 2 ? 26 : 10); anchor = 'middle'; }
            } else if (horizontal) { tx = x + 2; ty = c < 0 ? y - TH * S - 9 : y + TH * S + 13; anchor = 'start'; }
            else { tx = c < 0 ? x - TH * S - 10 : x + TH * S + 10; ty = y + 4; anchor = c < 0 ? 'end' : 'start'; }
            const t = svg('text', { x: tx, y: ty, 'text-anchor': anchor, class: 'lbl' }, grp);
            /* along a long corridor, letter the names at an angle, as on a drawing */
            if (horizontal && !end) t.setAttribute('transform', `rotate(${c < 0 ? -38 : 38} ${tx} ${ty})`);
            const n1 = svg('tspan', { class: 'num' }, t); n1.textContent = String(i + 1).padStart(2, '0') + ' ';
            const n2 = svg('tspan', {}, t); n2.textContent = st.short;
            const go = () => { closePlan(); setTimeout(() => goTo(i), 200); };
            grp.addEventListener('click', go);
            grp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        });
        /* you are here */
        const [cx, cy] = P(zStart - cam.position.z, cam.position.x);
        const dir = new V3(); cam.getWorldDirection(dir);
        const [dx, dy] = horizontal ? [-dir.z, dir.x] : [dir.x, dir.z];
        const ang = Math.atan2(dy, dx), spread = 0.4, R = Math.max(22, 3 * S);
        svg('path', { d: `M${cx},${cy} L${cx + Math.cos(ang - spread) * R},${cy + Math.sin(ang - spread) * R} A${R},${R} 0 0 1 ${cx + Math.cos(ang + spread) * R},${cy + Math.sin(ang + spread) * R} Z`, class: 'cone' }, g);
        svg('circle', { cx, cy, r: 4.5, class: 'you' }, g);
    }

    function setZoom(i) {
        zoomStation = i;
        const btn = $('.gw-step', cap);
        if (btn) btn.textContent = i >= 0 ? 'Step back' : 'Step closer';
    }

    let capFor = null;
    function renderCaption(i) {
        if (capFor === i) return;
        capFor = i;
        tiles.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
        const t = tiles[i];
        if (t) strip.scrollTo({ left: t.offsetLeft - strip.clientWidth / 2 + t.offsetWidth / 2, behavior: REDUCED ? 'auto' : 'smooth' });
        const pad = n => String(n).padStart(2, '0');
        count.textContent = `${pad(Math.max(0, i + 1))} / ${pad(N)}`;
        prev.disabled = i < 0; next.disabled = i >= N - 1;
        hint.classList.toggle('gone', i >= 0);
        cap.classList.remove('in');
        setTimeout(() => {
            if (capFor !== i) return;
            cap.replaceChildren();
            if (i < 0) return;
            const st = stations[i];
            cap.appendChild(el('p', 'gw-eyebrow', st.eyebrow));
            const act = el('div', 'gw-actions');
            if (st.kind === 'work') {
                cap.appendChild(el('p', 'gw-title', st.work.title));
                cap.appendChild(el('p', 'gw-ed', st.work.edition));
                const a = st.work.acquire.cloneNode(true); a.className = 'gw-link'; a.removeAttribute('onclick');
                const btn = el('button', 'gw-closer gw-step', zoomStation === i ? 'Step back' : 'Step closer'); btn.type = 'button';
                btn.addEventListener('click', () => setZoom(zoomStation === i ? -1 : i));
                act.append(a, btn);
            } else if (st.photos) {
                cap.appendChild(el('p', 'gw-note', `${COARSE ? 'Tap' : 'Click'} a photograph to enlarge`));
            }
            if (READ[st.key]) {
                const rb = el('button', 'gw-closer gw-readbtn', narrow ? 'Read the text' : 'Read'); rb.type = 'button';
                rb.addEventListener('click', () => openRead(st.key));
                act.appendChild(rb);
            }
            if (st.key === 'ch2') {
                const lv = el('button', 'gw-closer', 'Leave the gallery'); lv.type = 'button';
                lv.addEventListener('click', () => $('.site-footer')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }));
                act.appendChild(lv);
            }
            if (act.children.length) cap.appendChild(act);
            cap.classList.add('in');
            reserve.bottomTarget = bottom.offsetHeight + 12;   // the camera re-frames around the caption
        }, 240);
    }

    /* ── Loop ──────────────────────────────────────────────── */
    const dwell = x => { const g = clamp((x - 0.16) / 0.68, 0, 1); return g * g * (3 - 2 * g); };
    const inOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tmpPos = new V3(), tmpLook = new V3(), right = new V3(), ahead = new V3();
    let last = performance.now();

    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        reserve.bottom += (reserve.bottomTarget - reserve.bottom) * (1 - Math.exp(-dt * 4));
        for (let i = 0; i < N; i++) zooms[i] += ((zoomStation === i ? 1 : 0) - zooms[i]) * (1 - Math.exp(-dt * 3));

        if (jump) {
            /* travel the corridor: drift to the centre line, face the direction of travel */
            const t = clamp((now - jump.t0) / jump.dur, 0, 1), e = inOut(t);
            const B = viewAt(jump.to, 0);
            tmpPos.lerpVectors(jump.from.pos, B.pos, e);
            tmpLook.lerpVectors(jump.from.look, B.look, e);
            const mid = Math.sin(Math.PI * e);
            tmpPos.x *= 1 - 0.75 * mid;
            tmpPos.y = lerp(tmpPos.y, EYE, mid);
            const dir = Math.sign(B.pos.z - jump.from.pos.z) || -1;
            tmpLook.lerp(ahead.set(tmpPos.x * 0.2, 1.55, tmpPos.z + dir * 10), Math.min(1, mid * 1.7) * 0.9);
            jump.pNow = lerp(jump.fromP, jump.to, e);
            p = jump.pNow;
            if (t >= 1) { p = jump.to; jump = null; }
        } else {
            p += (pTarget - p) * (REDUCED ? 1 : 1 - Math.exp(-dt * 3.4));
            const i0 = clamp(Math.floor(p), -1, N - 2), f = clamp(p - i0, 0, 1);
            const e = dwell(f);
            const A = viewAt(i0, i0 >= 0 ? zooms[i0] : 0), B = viewAt(i0 + 1, zooms[i0 + 1]);
            tmpPos.lerpVectors(A.pos, B.pos, e);
            tmpLook.lerpVectors(A.look, B.look, e);
            const mid = Math.sin(Math.PI * e);
            tmpPos.x *= 1 - 0.5 * mid;
            tmpLook.lerp(ahead.set(tmpPos.x * 0.3, 1.5, tmpPos.z - 9), 0.55 * mid);
        }
        curLook.copy(tmpLook);

        mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 2.5));
        mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 2.5));
        const sway = REDUCED || COARSE ? 0 : 1;
        right.subVectors(tmpLook, tmpPos).normalize().cross(UP).normalize();
        tmpPos.addScaledVector(right, mouse.sx * 0.06 * sway).y -= mouse.sy * 0.03 * sway;
        tmpLook.addScaledVector(right, mouse.sx * 0.14 * sway).y -= mouse.sy * 0.05 * sway;

        cam.position.copy(tmpPos);
        cam.lookAt(tmpLook);
        renderer.render(scene, cam);

        if (!jump) renderCaption(Math.abs(p - Math.round(p)) < 0.3 ? Math.round(p) : (capFor ?? -1));
        requestAnimationFrame(frame);
    }

    resize();
    p = pTarget;
    requestAnimationFrame(frame);
    stage.classList.add('ready');
}
