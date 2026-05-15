"""Refresh legacy shop category redirects.

The canonical catalog is shop.html with in-page filters:
shop.html#prints, shop.html#books, and shop.html#tools.
"""
from pathlib import Path

BASE = Path("C:/Users/sriva/Downloads/Website 2026")


def redirect_page(title: str, target: str, label: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta http-equiv="refresh" content="0; url={target}">
    <link rel="canonical" href="https://mohithraisrivastav.com/{target}">
    <script>window.location.replace('{target}');</script>
</head>
<body>
    <p><a href="{target}">{label}</a></p>
</body>
</html>
"""


PAGES = [
    ("shop-books.html", "Books | Shop | Mohith Rai Srivastav", "shop.html#books", "Continue to books in the shop"),
    ("shop-tools.html", "Tools | Shop | Mohith Rai Srivastav", "shop.html#tools", "Continue to tools in the shop"),
    ("shop-guides.html", "Guides | Shop | Mohith Rai Srivastav", "shop.html#books", "Continue to guides in the shop"),
    ("shop-digital.html", "Shop | Mohith Rai Srivastav", "shop.html", "Continue to the shop"),
]


for filename, title, target, label in PAGES:
    (BASE / filename).write_text(redirect_page(title, target, label), encoding="utf-8")
    print(f"{filename} -> {target}")
