use strict;
use warnings;

open(my $fh, '<', 'eleve-eco-resort.html') or die $!;
my $c = do { local $/; <$fh> };
close($fh);

# 1. Remove old next-project CSS block (np-link, np-left, np-photo, etc.)
$c =~ s|/\* ═+\s*NEXT PROJECT.*?(?=/\* ═+\s*FOOTER)|
|s;

# 2. Remove old footer CSS block (old .site-footer { margin-top: 12vh ...})
$c =~ s|/\* ═+\s*FOOTER.*?(?=/\* ═+\s*LIGHTBOX)|
|s;

# 3. Remove old lightbox CSS block (#lightbox, #lb-backdrop ... .lb-nav:disabled)
$c =~ s|/\* ═+\s*LIGHTBOX.*?(?=/\* ═+\s*RESPONSIVE)|
|s;

# 4. Remove old <div id="lightbox"> HTML entirely
$c =~ s|\n<!-- ── Lightbox[^>]*-->\n<div id="lightbox"[^>]*>.*?</div>\n\n||s;

# 5. Remove the new .lb HTML added by upgrade script (since we keep old lightbox)
$c =~ s|\n<div class="lb" id="lb"[^>]*>.*?</div>\n\n||s;

# 6. Remove new lightbox JS added by upgrade script
#    (from "// -- Lightbox ----" to end of newsletter form handler)
$c =~ s|\n// -- Lightbox -+\nconst lb\s.*?// -- Newsletter form -+\n.*?\}\n\}?\n||s;

# 7. Replace old next-project section (np-link structure)
my $OLD_NP = qr|<section class="next-project">\s*<a class="np-link"[^>]*>.*?</a>\s*</section>|s;
my $NEW_NP = q(<section class="next-project">
  <span class="next-label" id="nLabel">Next Project</span>
  <a href="project-02.html" class="next-link">
    <div class="next-thumb">
      <img src="../images/Chromatic Rupture.jpg" alt="Monsoon Courtyard preview" loading="lazy">
      <div class="next-thumb-overlay"></div>
    </div>
    <div class="next-text">
      <div class="next-text-left">
        <div class="next-title-clip"><span class="next-title" id="nTitle">Monsoon Courtyard</span></div>
        <span class="next-sub" id="nSub">Courtyard Document &middot; Saligao, Goa &middot; 2024</span>
      </div>
      <span class="next-cta" id="nCta">View Project &nbsp;&rarr;</span>
    </div>
  </a>
</section>);
$c =~ s/$OLD_NP/$NEW_NP/;

# 8. Replace old footer (no CTA section) with new standard footer
my $OLD_FOOTER = qr|<!-- ── Footer[^>]*-->\n<footer class="site-footer">.*?</footer>|s;
my $NEW_FOOTER = q(<footer class="site-footer">
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
</footer>);
$c =~ s/$OLD_FOOTER/$NEW_FOOTER/;

# 9. Add newsletter form handler to existing lightbox JS close (before final })
my $FORM_JS = q(

// Newsletter form
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
$c =~ s|(</script>\s*</body>)|${FORM_JS}\n$1|;

open(my $out, '>', 'eleve-eco-resort.html') or die $!;
print $out $c;
close($out);
print "done\n";
