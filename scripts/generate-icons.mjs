/**
 * PWA Icon Generator
 * 
 * This script converts the CareDroid SVG logo to various PNG sizes for PWA support.
 * 
 * AUTOMATIC METHOD (requires sharp package):
 * 1. Install sharp: npm install --save-dev sharp
 * 2. Run: node scripts/generate-icons.js
 * 
 * MANUAL METHOD (if automatic fails):
 * 1. Open /public/logo.svg in your browser
 * 2. Take a high-resolution screenshot or use an online SVG to PNG converter:
 *    - https://cloudconvert.com/svg-to-png
 *    - https://svgtopng.com/
 * 3. Export at 1024x1024 resolution
 * 4. Use an image editor or online tool to resize to these dimensions:
 *    - icon-72x72.png
 *    - icon-96x96.png
 *    - icon-128x128.png
 *    - icon-144x144.png
 *    - icon-152x152.png
 *    - icon-192x192.png
 *    - icon-384x384.png
 *    - icon-512x512.png
 * 5. Save all files to /public/ directory
 * 
 * ONLINE BATCH RESIZER:
 * - https://www.iloveimg.com/resize-image
 * - https://imageresizer.com/bulk-resize
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    // Try to import sharp (optional dependency)
    const sharp = await import('sharp').catch(() => null);
    
    if (!sharp) {
      console.log('\n⚠️  Sharp package not found.');
      console.log('\n📋 MANUAL ICON GENERATION REQUIRED:\n');
      console.log('1. Install sharp package:');
      console.log('   npm install --save-dev sharp\n');
      console.log('2. Or generate icons manually:');
      console.log('   - Open /public/logo.svg in browser');
      console.log('   - Use https://cloudconvert.com/svg-to-png');
      console.log('   - Export at 1024x1024 resolution');
      console.log('   - Resize to:', ICON_SIZES.map(s => `${s}x${s}`).join(', '));
      console.log('   - Save to /public/ as icon-{size}x{size}.png\n');
      return;
    }

    const svgPath = path.join(__dirname, '../public/logo.svg');
    const publicDir = path.join(__dirname, '../public');

    console.log('🎨 Generating PWA icons from logo.svg...\n');

    for (const size of ICON_SIZES) {
      const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
      
      await sharp.default(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created: icon-${size}x${size}.png`);
    }

    // Generate apple-touch-icon
    const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
    await sharp.default(svgPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(appleTouchPath);
    
    console.log('✅ Created: apple-touch-icon.png');

    // Generate favicon.png (32x32)
    const faviconPath = path.join(publicDir, 'favicon.png');
    await sharp.default(svgPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(faviconPath);
    
    console.log('✅ Created: favicon.png (32x32)');

    console.log('\n🎉 All icons generated successfully!');
    console.log('\n📱 PWA icons are ready for deployment.');
    
  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    console.log('\n💡 Try the manual method described above.');
  }
}

generateIcons();
