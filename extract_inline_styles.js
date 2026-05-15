const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'assets', 'css', 'pages');
fs.mkdirSync(outDir, { recursive: true });

function cssPathFor(pageName, index, total) {
    const stem = pageName.replace(/\.html$/i, '');
    return total === 1 ? `${stem}.css` : `${stem}-${index + 1}.css`;
}

function rewriteCssUrls(css) {
    return css.replace(/url\((['"]?)(images\/[^'")]+)\1\)/g, 'url($1../../$2$1)');
}

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const filePath = path.join(root, entry.name);
    let html = fs.readFileSync(filePath, 'utf8');
    const styleMatches = [...html.matchAll(/<style>\s*([\s\S]*?)\s*<\/style>/gi)];
    if (!styleMatches.length) continue;

    let styleIndex = 0;
    html = html.replace(/<style>\s*([\s\S]*?)\s*<\/style>/gi, function (_, css) {
        const cssFile = cssPathFor(entry.name, styleIndex, styleMatches.length);
        fs.writeFileSync(path.join(outDir, cssFile), rewriteCssUrls(css).trim() + '\n', 'utf8');
        styleIndex += 1;
        return `<link rel="stylesheet" href="assets/css/pages/${cssFile}">`;
    });

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`${entry.name}: extracted ${styleMatches.length} style block${styleMatches.length === 1 ? '' : 's'}`);
}
