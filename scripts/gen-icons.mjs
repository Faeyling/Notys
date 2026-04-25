/**
 * Generates a maskable icon from the existing 512×512 icon.
 * A maskable icon places content inside the central 80% safe zone;
 * the outer 20% is filled with the app's theme colour.
 *
 * Run once (or after updating the source icon):
 *   node scripts/gen-icons.mjs
 */
import sharp from 'sharp';

const SIZE      = 512;
const SAFE      = Math.round(SIZE * 0.8);   // 410 px — content zone
const PAD       = Math.round((SIZE - SAFE) / 2); // 51 px each side
const BG        = { r: 255, g: 199, b: 238, alpha: 1 }; // #FFC7EE

async function run() {
  const resized = await sharp('public/icon-512.png')
    .resize(SAFE, SAFE)
    .toBuffer();

  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
    .composite([{ input: resized, top: PAD, left: PAD }])
    .png({ compressionLevel: 9 })
    .toFile('public/icon-maskable-512.png');

  console.log('✅ public/icon-maskable-512.png generated');
}

run().catch(err => { console.error(err); process.exit(1); });
