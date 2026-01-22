/**
 * CraftPix Asset Setup Guide
 *
 * This script helps you organize CraftPix assets for Degenerate Town.
 *
 * RECOMMENDED CRAFTPIX ASSET PACKS:
 *
 * 1. CHARACTERS (for Norse god agents):
 *    - "Viking 2D Game Character" - https://craftpix.net/freebies/free-viking-2d-game-character/
 *    - "Knight 2D Game Character" - Good for Heimdall
 *    - "Wizard 2D Character" - Good for Odin/Freyja
 *    - "Warrior Woman Character" - Good for Skadi
 *    - "Werewolf Character Sprites" - Perfect for Fenrir
 *
 * 2. EFFECTS:
 *    - "Magic Effects Pixel Art Pack" - Particle effects
 *    - "Fire Animation Sprites" - For Ragnarok/Forge
 *    - "Lightning Effects Pack" - For Thor
 *    - "Smoke and Dust Sprites" - For Loki tricks
 *
 * 3. BACKGROUNDS:
 *    - "Fantasy Castle Background" - For buildings
 *    - "Mountain Landscape Parallax" - Background layers
 *    - "Medieval Village Tileset" - Ground and buildings
 *
 * 4. UI:
 *    - "Fantasy GUI Pack" - Frames, buttons, panels
 *    - "Medieval UI Kit" - Norse-themed interface
 *
 * Run with: node scripts/setupCraftPixAssets.js
 */

const fs = require('fs');
const path = require('path');

// Asset directory structure
const ASSET_DIRS = [
  'public/assets/sprites',
  'public/assets/sprites/agents',
  'public/assets/sprites/effects',
  'public/assets/backgrounds',
  'public/assets/backgrounds/layers',
  'public/assets/ui',
  'public/assets/ui/buttons',
  'public/assets/ui/frames',
];

// Expected asset files
const EXPECTED_ASSETS = {
  agents: [
    { file: 'odin_spritesheet.png', description: 'Odin character spritesheet (64x64 frames)', required: false },
    { file: 'thor_spritesheet.png', description: 'Thor character spritesheet (64x64 frames)', required: false },
    { file: 'loki_spritesheet.png', description: 'Loki character spritesheet (64x64 frames)', required: false },
    { file: 'freyja_spritesheet.png', description: 'Freyja character spritesheet (64x64 frames)', required: false },
    { file: 'fenrir_spritesheet.png', description: 'Fenrir wolf spritesheet (80x64 frames)', required: false },
    { file: 'heimdall_spritesheet.png', description: 'Heimdall character spritesheet (64x64 frames)', required: false },
    { file: 'skadi_spritesheet.png', description: 'Skadi character spritesheet (64x64 frames)', required: false },
  ],
  effects: [
    { file: 'profit_effect.png', description: 'Green profit burst animation (64x64, 12 frames)', required: false },
    { file: 'loss_effect.png', description: 'Red loss burst animation (64x64, 12 frames)', required: false },
    { file: 'fire_effect.png', description: 'Fire/flame animation (128x128, 24 frames)', required: false },
    { file: 'lightning_effect.png', description: 'Lightning bolt animation (96x256, 8 frames)', required: false },
    { file: 'smoke_effect.png', description: 'Smoke puff animation (64x64, 16 frames)', required: false },
    { file: 'sparkle_effect.png', description: 'Sparkle/magic effect (32x32, 12 frames)', required: false },
    { file: 'coin_sprite.png', description: 'Spinning coin animation (32x32, 8 frames)', required: false },
    { file: 'rune_glow.png', description: 'Glowing rune effect (48x48, 12 frames)', required: false },
  ],
  backgrounds: [
    { file: 'degenerate_town_bg.png', description: 'Main background image (1920x1080)', required: false },
    { file: 'sky_layer.png', description: 'Parallax sky layer', required: false },
    { file: 'mountains_layer.png', description: 'Parallax mountains layer', required: false },
    { file: 'buildings_layer.png', description: 'Parallax buildings layer', required: false },
    { file: 'odins_hall.png', description: 'Odin\'s Hall building (256x320)', required: false },
    { file: 'thors_forge.png', description: 'Thor\'s Forge building (224x256)', required: false },
  ],
  ui: [
    { file: 'leaderboard_frame.png', description: '9-slice panel frame', required: false },
    { file: 'stats_panel.png', description: '9-slice stats panel', required: false },
    { file: 'button_normal.png', description: 'Button normal state', required: false },
    { file: 'button_hover.png', description: 'Button hover state', required: false },
    { file: 'button_pressed.png', description: 'Button pressed state', required: false },
  ],
};

// Spritesheet format guide
const SPRITESHEET_FORMAT = `
SPRITESHEET FORMAT GUIDE
========================

CraftPix spritesheets typically use horizontal strip format.
Our system expects the following frame layout:

CHARACTER SPRITESHEETS (64x64 per frame):
-----------------------------------------
Row 1: Idle animation (frames 0-3)
Row 2: Walk animation (frames 4-11)
Row 3: Trade/Action animation (frames 12-17)
Row 4: Victory animation (frames 18-23)
Row 5: Defeat animation (frames 24-29)
Row 6: Special animation (frames 30+)

EFFECT SPRITESHEETS:
--------------------
Single row horizontal strip, left to right.

HOW TO CONVERT CRAFTPIX ASSETS:
-------------------------------
1. Download the asset pack from CraftPix
2. Extract the PNG spritesheets
3. If needed, combine multiple sheets into one using:
   - ImageMagick: montage idle.png walk.png -tile 1x -geometry +0+0 combined.png
   - Or use online tool like https://www.leshylabs.com/apps/sstool/
4. Rename to match expected file names
5. Place in appropriate directory

ANIMATION SPEEDS:
-----------------
- Idle: 0.08-0.12 (slow, relaxed)
- Walk: 0.12-0.18 (moderate)
- Trade: 0.15-0.25 (quick action)
- Special: varies by effect
`;

console.log('🎮 CraftPix Asset Setup for Degenerate Town\n');
console.log('=' .repeat(50));

// Create directories
console.log('\n📁 Creating asset directories...\n');

ASSET_DIRS.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✅ Created: ${dir}`);
  } else {
    console.log(`  ✓ Exists: ${dir}`);
  }
});

// Check for existing assets
console.log('\n📦 Checking for assets...\n');

let missingCount = 0;
let foundCount = 0;

Object.entries(EXPECTED_ASSETS).forEach(([category, assets]) => {
  console.log(`\n${category.toUpperCase()}:`);

  assets.forEach(asset => {
    let assetPath;
    if (category === 'agents') {
      assetPath = path.join(process.cwd(), 'public/assets/sprites', asset.file);
    } else if (category === 'effects') {
      assetPath = path.join(process.cwd(), 'public/assets/sprites/effects', asset.file);
    } else {
      assetPath = path.join(process.cwd(), `public/assets/${category}`, asset.file);
    }

    if (fs.existsSync(assetPath)) {
      console.log(`  ✅ ${asset.file}`);
      foundCount++;
    } else {
      console.log(`  ❌ ${asset.file}`);
      console.log(`     └─ ${asset.description}`);
      missingCount++;
    }
  });
});

// Summary
console.log('\n' + '=' .repeat(50));
console.log(`\n📊 SUMMARY: ${foundCount} found, ${missingCount} missing\n`);

if (missingCount > 0) {
  console.log('💡 The visualization will use fallback graphics for missing assets.');
  console.log('   Download sprites from CraftPix.net to enable full animations.\n');

  console.log('RECOMMENDED CRAFTPIX PACKS:');
  console.log('  • Viking Character Sprites (free)');
  console.log('  • Magic Effects Pack');
  console.log('  • Medieval UI Kit');
  console.log('  • Fire & Lightning VFX\n');
}

// Write format guide
const guidePath = path.join(process.cwd(), 'public/assets/ASSET_GUIDE.txt');
fs.writeFileSync(guidePath, SPRITESHEET_FORMAT);
console.log(`📝 Asset format guide written to: public/assets/ASSET_GUIDE.txt\n`);

// Create placeholder config
const placeholderConfig = {
  version: '1.0.0',
  lastChecked: new Date().toISOString(),
  assetsFound: foundCount,
  assetsMissing: missingCount,
  useFallbacks: missingCount > 0,
};

const configPath = path.join(process.cwd(), 'public/assets/config.json');
fs.writeFileSync(configPath, JSON.stringify(placeholderConfig, null, 2));
console.log(`⚙️ Asset config written to: public/assets/config.json\n`);

console.log('✨ Setup complete! Run "npm run build" to test.\n');
