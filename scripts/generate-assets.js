const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets', 'images');

// Ensure output directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Convert SVG to PNG
async function convertSvgToPng(inputFile, outputFile, width, height) {
  try {
    const inputPath = path.join(assetsDir, inputFile);
    const outputPath = path.join(assetsDir, outputFile);

    await sharp(inputPath).resize(width, height).png().toFile(outputPath);

    console.log(`✓ Generated ${outputFile} (${width}x${height})`);
  } catch (error) {
    console.error(`✗ Error generating ${outputFile}:`, error.message);
  }
}

async function generateAssets() {
  console.log('Generating app assets...\n');

  // Generate app icon (multiple sizes for different platforms)
  await convertSvgToPng('icon.svg', 'icon.png', 1024, 1024);
  await convertSvgToPng('icon.svg', 'icon-512.png', 512, 512);
  await convertSvgToPng('icon.svg', 'icon-192.png', 192, 192);
  await convertSvgToPng('icon.svg', 'favicon.png', 48, 48);

  // Generate splash screen
  await convertSvgToPng('splash.svg', 'splash.png', 1242, 2436);

  // Generate adaptive icon for Android
  await convertSvgToPng('icon.svg', 'adaptive-icon.png', 1024, 1024);

  console.log('\n✓ All assets generated successfully!');
  console.log('You can now run: npx expo start');
}

generateAssets();
