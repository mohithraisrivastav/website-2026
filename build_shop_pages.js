/* ============================================================
   LEGACY SHOP CATEGORY REDIRECTS
   The canonical shop is shop.html with in-page filters:
     shop.html#prints, shop.html#books, shop.html#tools

   Run when legacy redirect pages need to be refreshed:
     node build_shop_pages.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const base = 'C:/Users/sriva/Downloads/Website 2026/';

function redirectPage(title, target, label) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta http-equiv="refresh" content="0; url=${target}">
    <link rel="canonical" href="https://mohithraisrivastav.com/${target}">
    <script>window.location.replace('${target}');</script>
</head>
<body>
    <p><a href="${target}">${label}</a></p>
</body>
</html>
`;
}

const pages = [
    ['shop-books.html', 'Books | Shop | Mohith Rai Srivastav', 'shop.html#books', 'Continue to books in the shop'],
    ['shop-tools.html', 'Tools | Shop | Mohith Rai Srivastav', 'shop.html#tools', 'Continue to tools in the shop'],
    ['shop-guides.html', 'Guides | Shop | Mohith Rai Srivastav', 'shop.html#books', 'Continue to guides in the shop'],
    ['shop-digital.html', 'Shop | Mohith Rai Srivastav', 'shop.html', 'Continue to the shop']
];

pages.forEach(([filename, title, target, label]) => {
    fs.writeFileSync(path.join(base, filename), redirectPage(title, target, label), 'utf8');
    console.log(`${filename} -> ${target}`);
});
