use strict;
use warnings;

my %next_thumb = (
    'eleve-eco-resort.html' => '../images/Chromatic Rupture.jpg',
    'project-02.html'       => '../images/After The Fall.jpg',
    'project-03.html'       => '../images/Burnt Earth.jpg',
    'project-04.html'       => '../images/The Forgotten Skin.jpg',
    'project-05.html'       => '../images/Erosion.jpg',
    'project-06.html'       => '../images/Imprint.jpg',
    'project-07.html'       => '../images/Cracked Spectrum.jpg',
    'project-08.html'       => '../images/Burnt Earth.jpg',
    'project-09.html'       => '../images/The Still Organism.jpg',
    'project-10.html'       => '../images/After The Fall.jpg',
    'project-11.html'       => '../images/Cosmic Return.jpg',
    'project-12.html'       => '../images/Cosmic Return.jpg',
);

my $NEW_CSS = q(

/* -- Next Project card ----------------------------------------- */
.next-project { margin-top: 16vh; }
.next-label { display:block; font-size:0.62rem; font-weight:600; letter-spacing:5px; text-transform:uppercase; color:#555; padding:0 5vw; margin-bottom:3vh; }
.next-link { display:block; text-decoration:none; color:inherit; position:relative; overflow:hidden; }
.next-thumb { width:100%; height:55vh; overflow:hidden; position:relative; }
.next-thumb img { width:100%; height:100%; object-fit:cover; transition:transform 1.4s cubic-bezier(.25,.46,.45,.94), filter 1.4s ease; filter:brightness(0.28); transform:scale(1.05); }
.next-link:hover .next-thumb img { transform:scale(1.09); filter:brightness(0.52); }
.next-thumb-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.4) 50%, transparent 100%); }
.next-text { position:absolute; bottom:0; left:0; right:0; padding:5vh 5vw; display:flex; align-items:flex-end; justify-content:space-between; gap:4vw; }
.next-text-left { display:flex; flex-direction:column; gap:1.4vh; min-width:0; }
.next-title-clip { overflow:hidden; }
.next-title { font-family:'Cormorant Garamond',serif; font-size:clamp(2.8rem,6vw,6rem); font-weight:300; line-height:0.9; letter-spacing:-0.02em; display:block; color:#fff; }
.next-sub { font-size:0.7rem; letter-spacing:2.5px; text-transform:uppercase; color:rgba(255,255,255,0.45); }
.next-cta { flex-shrink:0; font-size:0.65rem; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.45); border:1px solid rgba(255,255,255,0.16); padding:14px 28px; transition:border-color 0.4s,color 0.4s; align-self:flex-end; white-space:nowrap; }
.next-link:hover .next-cta { border-color:rgba(255,255,255,0.65); color:#fff; }

/* -- Lightbox --------------------------------------------------- */
.lb { position:fixed; inset:0; background:rgba(4,4,4,0.97); z-index:20000; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity 0.32s ease; cursor:default; }
.lb.active { opacity:1; pointer-events:all; }
.lb-img { max-width:90vw; max-height:90vh; object-fit:contain; display:block; }
.lb-close { position:absolute; top:24px; right:32px; background:none; border:none; color:rgba(255,255,255,0.4); font-family:'Montserrat',sans-serif; font-size:0.58rem; font-weight:600; letter-spacing:4px; text-transform:uppercase; cursor:pointer; padding:8px 0; transition:color 0.3s; }
.lb-close:hover { color:#fff; }
.lb-nav { position:absolute; top:50%; transform:translateY(-50%); background:none; border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.35); font-size:1rem; cursor:pointer; width:48px; height:48px; display:flex; align-items:center; justify-content:center; transition:border-color 0.3s,color 0.3s; }
.lb-nav:hover { border-color:rgba(255,255,255,0.55); color:#fff; }
.lb-prev { left:24px; }
.lb-next { right:24px; }
.lb-counter { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); font-size:0.55rem; letter-spacing:4px; color:rgba(255,255,255,0.3); font-weight:600; text-transform:uppercase; white-space:nowrap; }

/* -- Site Footer ----------------------------------------------- */
.site-footer { background:#030303; border-top:1px solid #111; font-family:'Montserrat',sans-serif; }
.sf-cta { padding:clamp(60px,10vh,100px) 5vw clamp(40px,6vh,70px); border-bottom:1px solid #111; display:flex; flex-direction:column; align-items:flex-start; gap:24px; }
.sf-cta-label { font-size:0.563rem; font-weight:700; letter-spacing:5px; text-transform:uppercase; color:#444; }
.sf-heading { font-size:clamp(3rem,8vw,9rem); font-weight:900; line-height:0.88; letter-spacing:-0.04em; text-transform:uppercase; color:#fff; margin:0; }
.sf-contact-btn { display:inline-flex; align-items:center; gap:14px; background:transparent; color:#666; text-decoration:none; font-size:0.688rem; font-weight:700; letter-spacing:4px; text-transform:uppercase; border:1px solid #222; padding:16px 32px; transition:border-color 0.3s,color 0.3s,gap 0.3s; margin-top:8px; }
.sf-contact-btn:hover { border-color:#fff; color:#fff; gap:20px; }
.sf-body { display:grid; grid-template-columns:1.4fr 1fr 1.5fr; gap:60px; padding:60px 5vw; border-bottom:1px solid #0a0a0a; }
.sf-logo { height:55px; width:auto; mix-blend-mode:screen; opacity:0.45; margin-bottom:20px; display:block; transition:opacity 0.3s; }
.sf-logo:hover { opacity:0.8; }
.sf-tagline { font-size:0.813rem; font-weight:400; color:#888; line-height:1.9; letter-spacing:0.5px; }
.sf-nav-label { display:block; font-size:0.6875rem; font-weight:700; letter-spacing:5px; text-transform:uppercase; color:#666; margin-bottom:22px; }
.sf-nav { display:flex; flex-direction:column; }
.sf-nav a { font-size:0.875rem; font-weight:500; color:#aaa; text-decoration:none; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:12px; transition:color 0.3s; }
.sf-nav a:hover { color:#fff; }
.sf-newsletter-col p { font-size:0.813rem; font-weight:400; color:#888; line-height:1.8; margin-bottom:20px; max-width:320px; }
.sf-form { display:flex; border:1px solid #333; overflow:hidden; max-width:320px; }
.sf-form input { flex:1; background:transparent; border:none; color:#fff; font-family:'Montserrat',sans-serif; font-size:0.813rem; font-weight:400; padding:12px 16px; outline:none; }
.sf-form input::placeholder { color:#666; }
.sf-form input:focus { background:rgba(255,255,255,0.03); }
.sf-form button { background:#1a1a1a; border:none; color:#999; padding:12px 18px; font-size:1.125rem; cursor:pointer; transition:background 0.3s,color 0.3s; font-family:inherit; line-height:1; }
.sf-form button:hover { background:#fff; color:#000; }
.sf-form-ok { display:none; font-size:0.6875rem; font-weight:700; letter-spacing:4px; text-transform:uppercase; color:#22c55e; margin-top:14px; }
.sf-base { display:flex; justify-content:space-between; align-items:center; padding:22px 5vw; gap:20px; flex-wrap:wrap; }
.sf-copy { font-size:0.6875rem; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#666; }
.sf-social { display:flex; gap:24px; flex-wrap:wrap; }
.sf-social a { font-size:0.6875rem; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#888; text-decoration:none; transition:color 0.3s; }
.sf-social a:hover { color:#fff; }
@media (max-width:900px) { .sf-body { grid-template-columns:1fr 1fr; gap:40px; } .sf-brand { grid-column:span 2; } .next-text { flex-direction:column; align-items:flex-start; } .next-cta { align-self:flex-start; } }
@media (max-width:600px) { .sf-body { grid-template-columns:1fr; gap:36px; padding:40px 5vw; } .sf-brand { grid-column:span 1; } .sf-base { flex-direction:column; align-items:flex-start; gap:16px; } .sf-social { gap:16px; } .sf-contact-btn { width:100%; justify-content:center; } .next-thumb { height:42vh; } }
);

my $SITE_FOOTER = q(
<footer class="site-footer">
  <div class="sf-cta">
    <span class="sf-cta-label">Open for Commissions &middot; 2026</span>
    <h2 class="sf-heading">Let's Work<br>Together.</h2>
    <a href="../contact.html" class="sf-contact-btn">Initiate a Project &nbsp;&rarr;</a>
  </div>
  <div class="sf-body">
    <div class="sf-brand">
      <img src="../images/Mohith LOGO.png" alt="Mohith Rai Srivastav" class="sf-logo">
      <p class="sf-tagline">Architectural Photography<br>Goa, India &middot; Global Commissions</p>
    </div>
    <nav class="sf-nav">
      <span class="sf-nav-label">Pages</span>
      <a href="../about.html">About</a>
      <a href="../work.html">Work</a>
      <a href="../film.html">Films</a>
      <a href="../blog.html">Journal</a>
      <a href="../workshops.html">Workshops</a>
      <a href="../shop.html">Shop</a>
      <a href="../contact.html">Contact</a>
    </nav>
    <div class="sf-newsletter-col">
      <span class="sf-nav-label">Field Notes</span>
      <p>New work and workshop openings &mdash; sent rarely.</p>
      <form class="sf-form" id="sfForm">
        <input type="email" placeholder="your@email.com" required>
        <button type="submit">&#8594;</button>
      </form>
      <span class="sf-form-ok" id="sfFormOk">Received.</span>
    </div>
  </div>
  <div class="sf-base">
    <span class="sf-copy">&copy; 2026 Mohith Rai Srivastav. All rights reserved.</span>
    <div class="sf-social">
      <a href="https://www.instagram.com/mohithraisrivastav/" target="_blank" rel="noopener">Instagram</a>
      <a href="https://www.linkedin.com/in/mohithraisrivastav/" target="_blank" rel="noopener">LinkedIn</a>
      <a href="https://vimeo.com/user140494679" target="_blank" rel="noopener">Vimeo</a>
      <a href="https://wa.me/919014753403" target="_blank" rel="noopener">WhatsApp</a>
      <a href="mailto:info@mohithraisrivastav.com">Email</a>
    </div>
  </div>
</footer>
);

my $LB_HTML = q(
<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Image viewer">
  <button class="lb-close" id="lbClose">&#10005;&nbsp;&nbsp;Close</button>
  <button class="lb-nav lb-prev" id="lbPrev">&#8592;</button>
  <img class="lb-img" id="lbImg" src="" alt="">
  <button class="lb-nav lb-next" id="lbNext">&#8594;</button>
  <span class="lb-counter" id="lbCounter"></span>
</div>

);

my $LB_JS = q(
// -- Lightbox ---------------------------------------------------------
const lb       = document.getElementById('lb');
const lbImg    = document.getElementById('lbImg');
const lbCtr    = document.getElementById('lbCounter');
const lbFrames = Array.from(document.querySelectorAll('.gallery .p'));
let lbIdx = 0;

function lbOpen(idx) {
  const frame = lbFrames[idx];
  const img   = frame && frame.querySelector('img');
  if (!img) return;
  lbIdx = idx;
  lbImg.src = img.src;
  lbImg.alt = img.alt || '';
  lbCtr.textContent = String(idx + 1).padStart(2,'0') + '  /  ' + String(lbFrames.length).padStart(2,'0');
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (typeof cur !== 'undefined' && cur) cur.style.opacity = '0';
}
function lbClose() {
  lb.classList.remove('active');
  document.body.style.overflow = '';
  if (typeof cur !== 'undefined' && cur) cur.style.opacity = '1';
}
function lbShift(dir) {
  const next = (lbIdx + dir + lbFrames.length) % lbFrames.length;
  const img  = lbFrames[next].querySelector('img');
  if (!img) return;
  gsap.to(lbImg, { opacity:0, x: dir * -40, duration:0.16, onComplete() {
    lbIdx = next;
    lbImg.src = img.src;
    lbCtr.textContent = String(next + 1).padStart(2,'0') + '  /  ' + String(lbFrames.length).padStart(2,'0');
    gsap.fromTo(lbImg, { opacity:0, x: dir * 40 }, { opacity:1, x:0, duration:0.2 });
  }});
}
lbFrames.forEach((frame, i) => {
  frame.addEventListener('click', () => lbOpen(i));
});
document.getElementById('lbClose').addEventListener('click', lbClose);
document.getElementById('lbPrev').addEventListener('click',  () => lbShift(-1));
document.getElementById('lbNext').addEventListener('click',  () => lbShift(1));
lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('active')) return;
  if (e.key === 'Escape')     lbClose();
  if (e.key === 'ArrowLeft')  lbShift(-1);
  if (e.key === 'ArrowRight') lbShift(1);
});

// -- Newsletter form --------------------------------------------------
const sfForm = document.getElementById('sfForm');
if (sfForm) {
  sfForm.addEventListener('submit', e => {
    e.preventDefault();
    const ok = document.getElementById('sfFormOk');
    if (ok) ok.style.display = 'block';
    e.target.reset();
  });
}
);

my $NP_GSAP = q(
// -- Next project reveal ----------------------------------------------
gsap.set(['#nTitle', '#nSub', '#nCta', '#nLabel'], { autoAlpha: 0 });
gsap.set('#nTitle', { y: '110%' });
ScrollTrigger.create({
  trigger: '.next-project', start: 'top 88%', once: true,
  onEnter() {
    gsap.to('#nLabel', { autoAlpha: 1, duration: 0.5 });
    gsap.to('#nTitle', { y: '0%', autoAlpha: 1, duration: 1.1, ease: 'power4.out', delay: 0.15 });
    gsap.to('#nSub',   { autoAlpha: 1, duration: 0.6, delay: 0.5 });
    gsap.to('#nCta',   { autoAlpha: 1, duration: 0.6, delay: 0.7 });
  }
});

);

my @files = glob("*.html");

for my $file (@files) {
    next if $file eq 'upgrade_pages.pl';
    my $thumb = $next_thumb{$file};
    unless ($thumb) { warn "No thumb mapping for $file\n"; next; }

    open(my $fh, '<', $file) or die "Cannot read $file: $!";
    my $c = do { local $/; <$fh> };
    close($fh);

    # 1. Strip old next-project CSS block (from .next-project { through last hover rule)
    $c =~ s/\n\.next-project \{ margin-top.*?\.next-link:hover \.next-cta \{[^\}]*\}//s;

    # 2. Append new CSS before </style>
    $c =~ s|</style>|${NEW_CSS}</style>|;

    # 3. Extract existing next-project link data
    my ($np_href)  = ($c =~ /href="([^"]+)"\s+class="next-link"|class="next-link"\s+href="([^"]+)"/);
    $np_href     //= '#';
    my ($np_title) = $c =~ /id="nTitle">([^<]+)</;
    my ($np_sub)   = $c =~ /id="nSub">([^<]+)</;
    $np_title //= 'Next Project';
    $np_sub   //= '';

    # 4. Build new next-project HTML
    my $NEW_NP = "<section class=\"next-project\">\n"
               . "  <span class=\"next-label\" id=\"nLabel\">Next Project</span>\n"
               . "  <a href=\"${np_href}\" class=\"next-link\">\n"
               . "    <div class=\"next-thumb\">\n"
               . "      <img src=\"${thumb}\" alt=\"${np_title} preview\" loading=\"lazy\">\n"
               . "      <div class=\"next-thumb-overlay\"></div>\n"
               . "    </div>\n"
               . "    <div class=\"next-text\">\n"
               . "      <div class=\"next-text-left\">\n"
               . "        <div class=\"next-title-clip\"><span class=\"next-title\" id=\"nTitle\">${np_title}</span></div>\n"
               . "        <span class=\"next-sub\" id=\"nSub\">${np_sub}</span>\n"
               . "      </div>\n"
               . "      <span class=\"next-cta\" id=\"nCta\">View Project &nbsp;&rarr;</span>\n"
               . "    </div>\n"
               . "  </a>\n"
               . "</section>";

    # 5. Replace old footer.next-project
    $c =~ s|<footer class="next-project">.*?</footer>|${NEW_NP}${SITE_FOOTER}|s;

    # 6. Remove old next-project GSAP block
    $c =~ s/gsap\.set\(\['#nTitle','#nSub','#nCta','\.next-label'\].*?ScrollTrigger\.create\(\{\s*trigger: '\.next-project'.*?\}\s*\}\s*\);?//s;

    # 7. Insert updated GSAP before scroll progress listener
    $c =~ s|(window\.addEventListener\('scroll')|${NP_GSAP}$1|;

    # 8. Insert lightbox HTML before first GSAP script tag
    $c =~ s|(<script src="https://cdnjs)|${LB_HTML}$1|;

    # 9. Append lightbox + newsletter JS before closing tag
    $c =~ s|(</script>\s*</body>)|${LB_JS}\n$1|;

    open(my $out, '>', $file) or die "Cannot write $file: $!";
    print $out $c;
    close($out);

    print "done: $file\n";
}
