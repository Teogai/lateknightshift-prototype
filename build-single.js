import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const distDir = './dist';
const outputFile = './game.html';

console.log('Building single-file distribution...');

// Step 1: Run Vite build
console.log('Running Vite build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.error('Vite build failed');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  console.error('Build failed: dist folder not found');
  process.exit(1);
}

// Helper to convert files to base64
const fileToBase64 = (filePath) => {
  const data = fs.readFileSync(filePath);
  return data.toString('base64');
};

// Step 2: Read the built HTML
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Step 3: Extract and inline CSS
const cssMatch = html.match(/<link[^>]*href="([^"]*\.css)"[^>]*>/g);
if (cssMatch) {
  cssMatch.forEach((link) => {
    const hrefMatch = link.match(/href="([^"]*)"/);
    if (hrefMatch) {
      const cssFileName = hrefMatch[1];
      const cssPath = path.join(distDir, cssFileName);
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        html = html.replace(link, `<style>${cssContent}</style>`);
      }
    }
  });
}

// Step 4: Extract and inline JavaScript
const jsMatch = html.match(/<script[^>]*src="([^"]*\.js)"[^>]*><\/script>/g);
if (jsMatch) {
  jsMatch.forEach((script) => {
    const srcMatch = script.match(/src="([^"]*)"/);
    if (srcMatch) {
      const jsFileName = srcMatch[1];
      const jsPath = path.join(distDir, jsFileName);
      if (fs.existsSync(jsPath)) {
        const jsContent = fs.readFileSync(jsPath, 'utf-8');
        html = html.replace(script, `<script type="module">${jsContent}</script>`);
      }
    }
  });
}

// Step 5: Convert image sources to base64
const imageMatch = html.match(/src="([^"]*\.png)"/g);
if (imageMatch) {
  const uniqueImages = [...new Set(imageMatch)];
  uniqueImages.forEach((src) => {
    const imgPath = src.match(/src="([^"]*)"/)[1];
    const fullPath = path.join(distDir, imgPath);
    if (fs.existsSync(fullPath)) {
      const base64 = fileToBase64(fullPath);
      const dataUrl = `data:image/png;base64,${base64}`;
      html = html.replace(src, `src="${dataUrl}"`);
    }
  });
}

// Step 6: Write the single HTML file
fs.writeFileSync(outputFile, html);

const stats = fs.statSync(outputFile);
const sizeKb = (stats.size / 1024).toFixed(1);

console.log(`✓ Single-file build complete: ${outputFile} (${sizeKb}KB)`);
console.log(`\nTo use: Open ${outputFile} in any browser. No server needed.`);
