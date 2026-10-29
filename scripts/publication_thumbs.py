"""Create a thumbnail for every entry on publications.html that lacks one.

Run after adding an entry:  python scripts/publication_thumbs.py

For each <a class="pub-entry"> whose image file is missing (or was a placeholder
last time), it reads the article's og:image and saves a 1000px webp. If the
publisher blocks automated access, it writes a plain typographic tile (outlet
and headline on the site's cream) so the list never has a gap, records it in
images/publications/_placeholders.txt, and tries the real image again next run.
Drop your own file at the same path to override either.
"""
import html, io, os, re, sys, textwrap, urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "publications.html")
LIST = os.path.join(ROOT, "images", "publications", "_placeholders.txt")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
W, H = 1000, 563


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()


def og_image(url):
    page = get(url).decode("utf-8", "ignore")
    m = (re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', page)
         or re.search(r'content=["\']([^"\']+)["\'][^>]+property=["\']og:image', page))
    if not m:
        raise ValueError("no og:image")
    return html.unescape(m.group(1))


def font(size):
    for f in ("georgia.ttf", "times.ttf", "DejaVuSerif.ttf"):
        for d in ("C:/Windows/Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            p = os.path.join(d, f)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def tile(outlet, title, dst):
    im = Image.new("RGB", (W, H), (247, 244, 236))
    d = ImageDraw.Draw(im)
    d.text((70, 70), outlet.upper(), font=font(26), fill=(122, 98, 20))
    y = 150
    for line in textwrap.wrap(title, 30)[:6]:
        d.text((70, y), line, font=font(48), fill=(28, 26, 22))
        y += 66
    im.save(dst, "WEBP", quality=85)


def main():
    src = open(PAGE, encoding="utf-8").read()
    entries = re.findall(
        r'<a class="pub-entry" href="([^"]+)"[^>]*>\s*<div class="pub-img-wrap"><img src="([^"]+)".*?'
        r'<span class="pub-pub">(.*?)</span>\s*<span class="pub-title">(.*?)</span>', src, re.S)
    placeholders = set(open(LIST).read().split()) if os.path.exists(LIST) else set()
    for url, rel, outlet, title in entries:
        dst = os.path.join(ROOT, rel)
        if os.path.exists(dst) and rel not in placeholders:
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            im = Image.open(io.BytesIO(get(og_image(url)))).convert("RGB")
            im.thumbnail((1000, 1000))
            im.save(dst, "WEBP", quality=82)
            placeholders.discard(rel)
            print("image      ", rel)
        except Exception as e:
            if not os.path.exists(dst) or rel in placeholders:
                tile(html.unescape(outlet), html.unescape(title), dst)
                placeholders.add(rel)
                print("placeholder", rel, "-", e)
    with open(LIST, "w") as f:
        f.write("\n".join(sorted(placeholders)) + ("\n" if placeholders else ""))


if __name__ == "__main__":
    sys.exit(main())
