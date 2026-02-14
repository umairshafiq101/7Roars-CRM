import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="40" fill="#6366f1"/>
  <text x="128" y="175" font-family="Arial,sans-serif" font-size="140" font-weight="bold" fill="white" text-anchor="middle">7R</text>
</svg>`;

// Save SVG
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon);
console.log('SVG icon created at assets/icon.svg');

// Try to create PNG via sharp if available
try {
  const sharp = (await import('sharp')).default;
  const pngBuf = await sharp(Buffer.from(svgIcon)).resize(256, 256).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, 'icon.png'), pngBuf);
  console.log('PNG icon created at assets/icon.png');

  // Create ICO-like file (256x256 PNG wrapped — Electron accepts PNG as icon on Windows)
  // For a proper .ico, use an online converter or png-to-ico package
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), pngBuf);
  console.log('ICO icon created at assets/icon.ico (PNG format — works with Electron)');
} catch (e) {
  console.log('sharp not available in this context, SVG created. Convert to .ico manually or install sharp.');
  console.log('Online converter: https://convertio.co/png-ico/');
}
