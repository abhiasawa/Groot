const sharp = require('sharp');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

function buildCloudSVG({ canvasSize, cloudScale, extraPadding }) {
  const s = canvasSize;
  const cx = s / 2;
  // Scale factor for the cloud relative to canvas
  const sc = cloudScale;
  // Vertical offset — push cloud slightly below center
  const oy = s * 0.02;

  // Cloud ellipses (relative to 1024 base, then scaled)
  function e(ecx, ecy, rx, ry) {
    return `<ellipse cx="${cx + (ecx - 512) * sc}" cy="${cx + (ecy - 512) * sc + oy}" rx="${rx * sc}" ry="${ry * sc}" />`;
  }

  const cloudEllipses = [
    e(512, 600, 280, 110),  // bottom base
    e(340, 530, 150, 140),  // left bump
    e(684, 530, 150, 140),  // right bump
    e(512, 440, 170, 160),  // top center (tallest)
    e(400, 460, 120, 120),  // top-left small
    e(624, 460, 120, 120),  // top-right small
    e(512, 540, 250, 130),  // center fill
  ].join('\n    ');

  // Face elements
  function fx(x) { return cx + (x - 512) * sc; }
  function fy(y) { return cx + (y - 512) * sc + oy; }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="cloudGrad" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="#C7D2FE"/>
      <stop offset="35%" stop-color="#A5B4FC"/>
      <stop offset="75%" stop-color="#818CF8"/>
      <stop offset="100%" stop-color="#6366F1"/>
    </linearGradient>
    <linearGradient id="highlight" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#E0E7FF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#A5B4FC" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${6 * sc}" stdDeviation="${12 * sc}" flood-color="#4338CA" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" fill="#FEFEFE"/>

  <!-- Cloud body -->
  <g fill="url(#cloudGrad)" filter="url(#shadow)">
    ${cloudEllipses}
  </g>

  <!-- Highlight on top bumps -->
  <g fill="url(#highlight)">
    <ellipse cx="${fx(512)}" cy="${fy(425)}" rx="${145 * sc}" ry="${90 * sc}" />
    <ellipse cx="${fx(380)}" cy="${fy(450)}" rx="${90 * sc}" ry="${65 * sc}" />
    <ellipse cx="${fx(640)}" cy="${fy(450)}" rx="${90 * sc}" ry="${65 * sc}" />
  </g>

  <!-- Cheeks -->
  <ellipse cx="${fx(370)}" cy="${fy(570)}" rx="${45 * sc}" ry="${30 * sc}" fill="#C4B5FD" opacity="0.3"/>
  <ellipse cx="${fx(654)}" cy="${fy(570)}" rx="${45 * sc}" ry="${30 * sc}" fill="#C4B5FD" opacity="0.3"/>

  <!-- Eyes (dot style) -->
  <circle cx="${fx(440)}" cy="${fy(505)}" r="${14 * sc}" fill="#312E81"/>
  <circle cx="${fx(584)}" cy="${fy(505)}" r="${14 * sc}" fill="#312E81"/>

  <!-- Eye highlights -->
  <circle cx="${fx(444)}" cy="${fy(499)}" r="${5 * sc}" fill="white" opacity="0.8"/>
  <circle cx="${fx(588)}" cy="${fy(499)}" r="${5 * sc}" fill="white" opacity="0.8"/>

  <!-- Gentle smile -->
  <path d="M ${fx(465)} ${fy(570)} Q ${fx(512)} ${fy(600)} ${fx(559)} ${fy(570)}"
    fill="none" stroke="#312E81" stroke-width="${7 * sc}" stroke-linecap="round"/>
</svg>`;

  return svg;
}

async function generateIcons() {
  // 1. Main app icon — full-size cloud
  const iconSVG = buildCloudSVG({ canvasSize: 1024, cloudScale: 1.0, extraPadding: 0 });
  await sharp(Buffer.from(iconSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(IMAGES_DIR, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // 2. Adaptive icon — smaller cloud with more padding for Android safe zone (~66%)
  const adaptiveSVG = buildCloudSVG({ canvasSize: 1024, cloudScale: 0.7, extraPadding: 0 });
  await sharp(Buffer.from(adaptiveSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(IMAGES_DIR, 'adaptive-icon.png'));
  console.log('Generated adaptive-icon.png (1024x1024)');

  // 3. Splash icon — smaller still, centered
  const splashSVG = buildCloudSVG({ canvasSize: 1024, cloudScale: 0.55, extraPadding: 0 });
  await sharp(Buffer.from(splashSVG))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(IMAGES_DIR, 'splash-icon.png'));
  console.log('Generated splash-icon.png (1024x1024)');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
