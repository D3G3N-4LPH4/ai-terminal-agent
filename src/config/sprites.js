/**
 * Sprite Configuration for Degenerate Realms
 *
 * Based on Terraria-style sprite systems with:
 * - Tile connectivity (auto-tiling based on neighbors)
 * - Player animation states
 * - Enemy animations
 * - Procedural sprite generation fallbacks
 */

// ==================== SPRITE DIMENSIONS ====================

export const SPRITE_CONFIG = {
  tileSize: 16,
  playerWidth: 16,
  playerHeight: 32,
  animationSpeed: 25, // frames per second for animations
};

// ==================== PLAYER SPRITES ====================

export const PLAYER_SPRITES = {
  // Animation states
  states: {
    IDLE: 'idle',
    WALK: 'walk',
    FALL: 'fall',
    JUMP: 'jump',
    ATTACK: 'attack',
    MINE: 'mine',
    HURT: 'hurt',
    DEAD: 'dead',
  },

  // Animation frame counts per state
  frames: {
    idle: 1,
    walk: 13,
    fall: 1,
    jump: 1,
    attack: 4,
    mine: 4,
    hurt: 1,
    dead: 1,
  },

  // Animation speeds (frames per second)
  speeds: {
    idle: 1,
    walk: 25,
    fall: 1,
    jump: 1,
    attack: 15,
    mine: 12,
    hurt: 8,
    dead: 1,
  },

  // Directions
  directions: ['left', 'right'],

  // Procedural colors for fallback rendering
  colors: {
    body: 0x0096ff,
    outline: 0x0064c8,
    skin: 0xffdbac,
    hair: 0x8b4513,
    eyes: 0x000000,
    eyeWhite: 0xffffff,
  },

  // Viking-themed accessories
  accessories: {
    helmet: {
      type: 'viking_helm',
      color: 0x808080,
      hornColor: 0xffd700,
    },
    cape: {
      color: 0x8b0000,
    },
  },
};

// ==================== TILE CONNECTIVITY SYSTEM ====================

/**
 * Tile connectivity uses a 4-bit mask:
 * Bit 0 (1): Left neighbor
 * Bit 1 (2): Right neighbor
 * Bit 2 (4): Top neighbor
 * Bit 3 (8): Bottom neighbor
 *
 * This creates 16 possible variants (0-15) per tile type
 */

export const TILE_CONNECTIVITY = {
  NONE: 0,        // 0000 - isolated
  LEFT: 1,        // 0001
  RIGHT: 2,       // 0010
  LEFT_RIGHT: 3,  // 0011 - horizontal piece
  TOP: 4,         // 0100
  LEFT_TOP: 5,    // 0101
  RIGHT_TOP: 6,   // 0110
  LEFT_RIGHT_TOP: 7, // 0111
  BOTTOM: 8,      // 1000
  LEFT_BOTTOM: 9, // 1001
  RIGHT_BOTTOM: 10, // 1010
  LEFT_RIGHT_BOTTOM: 11, // 1011
  TOP_BOTTOM: 12, // 1100 - vertical piece
  LEFT_TOP_BOTTOM: 13, // 1101
  RIGHT_TOP_BOTTOM: 14, // 1110
  ALL: 15,        // 1111 - fully surrounded
};

// Function to calculate connectivity mask
export const getConnectivityMask = (world, x, y, blockId) => {
  let mask = 0;
  const height = world.length;
  const width = world[0]?.length || 0;

  // Check left
  if (x > 0 && world[y]?.[x - 1] === blockId) mask |= 1;
  // Check right
  if (x < width - 1 && world[y]?.[x + 1] === blockId) mask |= 2;
  // Check top
  if (y > 0 && world[y - 1]?.[x] === blockId) mask |= 4;
  // Check bottom
  if (y < height - 1 && world[y + 1]?.[x] === blockId) mask |= 8;

  return mask;
};

// ==================== TILE SPRITE DEFINITIONS ====================

export const TILE_SPRITES = {
  // Midgard blocks
  GRASS: {
    id: 1,
    baseColor: 0x228b22,
    variants: {
      // Different shades for variety
      colors: [0x228b22, 0x2d8f2d, 0x1e7a1e, 0x339933],
    },
    // Procedural details (grass blades on top)
    details: {
      topDecoration: true,
      decorationType: 'grass_blades',
      decorationColor: 0x3cb371,
    },
    connectsTo: [1, 2], // Connects to grass and dirt
  },

  DIRT: {
    id: 2,
    baseColor: 0x654321,
    variants: {
      colors: [0x654321, 0x5d3a1a, 0x6b4423, 0x593219],
    },
    details: {
      texture: 'speckled',
      speckleColor: 0x4a3219,
    },
    connectsTo: [1, 2, 3], // Connects to grass, dirt, stone
  },

  STONE: {
    id: 3,
    baseColor: 0x696969,
    variants: {
      colors: [0x696969, 0x5a5a5a, 0x787878, 0x4f4f4f],
    },
    details: {
      texture: 'cracked',
      crackColor: 0x3a3a3a,
    },
    connectsTo: [2, 3, 6, 7], // Connects to dirt, stone, obsidian, hellstone
  },

  WOOD: {
    id: 16,
    baseColor: 0xa0522d,
    variants: {
      colors: [0xa0522d, 0x8b4513, 0xb5651d, 0x964b00],
    },
    details: {
      texture: 'grain',
      grainColor: 0x6b3a1e,
      grainDirection: 'vertical',
    },
    connectsTo: [16], // Only connects to other wood
  },

  // Asgard blocks
  GOLD_BRICK: {
    id: 4,
    baseColor: 0xdaa520,
    variants: {
      colors: [0xdaa520, 0xffd700, 0xb8860b, 0xcd853f],
    },
    details: {
      texture: 'brick',
      mortarColor: 0x8b6914,
      shimmer: true,
    },
    connectsTo: [4, 5],
  },

  CLOUD: {
    id: 5,
    baseColor: 0xf0f8ff,
    variants: {
      colors: [0xf0f8ff, 0xffffff, 0xe6f2ff, 0xf5f5f5],
    },
    details: {
      texture: 'fluffy',
      transparency: 0.9,
    },
    connectsTo: [5],
    semiTransparent: true,
  },

  RAINBOW_CRYSTAL: {
    id: 14,
    baseColor: 0xff64ff,
    variants: {
      colors: [0xff64ff, 0x64ffff, 0xffff64, 0x64ff64, 0xff6464, 0x6464ff],
    },
    details: {
      texture: 'crystal',
      animated: true,
      animationSpeed: 5,
      glow: true,
      glowRadius: 2,
    },
    connectsTo: [14],
  },

  // Helheim blocks
  OBSIDIAN: {
    id: 6,
    baseColor: 0x14141e,
    variants: {
      colors: [0x14141e, 0x1a1a28, 0x0f0f14, 0x1e1e2d],
    },
    details: {
      texture: 'glassy',
      reflectionColor: 0x3a3a5a,
    },
    connectsTo: [6, 7],
  },

  HELLSTONE: {
    id: 7,
    baseColor: 0x8b0000,
    variants: {
      colors: [0x8b0000, 0xa00000, 0x700000, 0xb22222],
    },
    details: {
      texture: 'molten',
      glowColor: 0xff4500,
      animated: true,
      animationSpeed: 3,
    },
    connectsTo: [6, 7],
  },

  FROZEN_SOUL: {
    id: 15,
    baseColor: 0x96c8ff,
    variants: {
      colors: [0x96c8ff, 0x87ceeb, 0xadd8e6, 0xb0e0e6],
    },
    details: {
      texture: 'ice',
      transparency: 0.8,
      innerGlow: 0xffffff,
    },
    connectsTo: [15],
  },

  // Crypto Ores
  SOL_ORE: {
    id: 10,
    baseColor: 0x9400d3,
    variants: {
      colors: [0x9400d3, 0x8b00ff, 0x7b68ee, 0x9932cc],
    },
    details: {
      texture: 'ore',
      gemColor: 0xda70d6,
      glow: true,
      glowColor: 0x9400d3,
      glowRadius: 1,
    },
    connectsTo: [3, 10],
    symbol: '◈',
  },

  ETH_ORE: {
    id: 11,
    baseColor: 0x6464c8,
    variants: {
      colors: [0x6464c8, 0x5555b0, 0x7373d8, 0x4646a0],
    },
    details: {
      texture: 'ore',
      gemColor: 0x8888ff,
      glow: true,
      glowColor: 0x6464c8,
    },
    connectsTo: [3, 11],
    symbol: '◇',
  },

  BTC_ORE: {
    id: 12,
    baseColor: 0xffa500,
    variants: {
      colors: [0xffa500, 0xff8c00, 0xffb347, 0xe69500],
    },
    details: {
      texture: 'ore',
      gemColor: 0xffd700,
      glow: true,
      glowColor: 0xffa500,
      glowRadius: 2,
    },
    connectsTo: [3, 6, 12],
    symbol: '₿',
  },

  DEGEN_ORE: {
    id: 13,
    baseColor: 0x00ff80,
    variants: {
      colors: [0x00ff80, 0x00e070, 0x20ff90, 0x00d060],
    },
    details: {
      texture: 'ore',
      gemColor: 0x7fff00,
      animated: true,
      animationSpeed: 8,
      pulsing: true,
    },
    connectsTo: [3, 13],
    symbol: '◆',
  },
};

// ==================== ENEMY SPRITES ====================

export const ENEMY_SPRITES = {
  BERSERKER: {
    id: 'berserker',
    width: 16,
    height: 32,
    baseColor: 0xff0000,
    animations: {
      idle: { frames: 1, speed: 1 },
      walk: { frames: 4, speed: 10 },
      attack: { frames: 3, speed: 12 },
      hurt: { frames: 1, speed: 8 },
      dead: { frames: 1, speed: 1 },
    },
    details: {
      hasHelmet: true,
      helmetColor: 0x8b0000,
      hasAxe: true,
      axeColor: 0x808080,
      eyeGlow: 0xff4444,
    },
  },

  TROLL: {
    id: 'troll',
    width: 32,
    height: 48,
    baseColor: 0x8b4513,
    animations: {
      idle: { frames: 1, speed: 1 },
      walk: { frames: 6, speed: 6 },
      attack: { frames: 4, speed: 8 },
      hurt: { frames: 1, speed: 8 },
      dead: { frames: 1, speed: 1 },
    },
    details: {
      bulky: true,
      skinTexture: 'rocky',
      hasClub: true,
      clubColor: 0x654321,
    },
  },

  DRAUGR: {
    id: 'draugr',
    width: 16,
    height: 32,
    baseColor: 0xa9a9a9,
    animations: {
      idle: { frames: 2, speed: 2 },
      walk: { frames: 4, speed: 12 },
      attack: { frames: 3, speed: 10 },
      hurt: { frames: 1, speed: 8 },
      dead: { frames: 3, speed: 4 },
    },
    details: {
      undead: true,
      glowingEyes: true,
      eyeColor: 0x00ffff,
      hasShield: true,
      hasSword: true,
      armorColor: 0x556b2f,
    },
  },

  JOTUNN: {
    id: 'jotunn',
    width: 48,
    height: 64,
    baseColor: 0x00008b,
    animations: {
      idle: { frames: 1, speed: 1 },
      walk: { frames: 8, speed: 4 },
      attack: { frames: 5, speed: 6 },
      hurt: { frames: 1, speed: 8 },
      dead: { frames: 1, speed: 1 },
    },
    details: {
      giant: true,
      frostAura: true,
      auraColor: 0x87ceeb,
      icePatches: true,
      breathFrost: true,
    },
  },

  VILLAGER: {
    id: 'villager',
    width: 16,
    height: 32,
    baseColor: 0x00ff00,
    animations: {
      idle: { frames: 2, speed: 1 },
      walk: { frames: 4, speed: 8 },
      talk: { frames: 2, speed: 4 },
    },
    details: {
      friendly: true,
      hasBeard: true,
      beardColor: 0x8b4513,
      clothColor: 0x2e8b57,
    },
  },
};

// ==================== NPC/GOD SPRITES ====================

export const NPC_SPRITES = {
  odin_allfather: {
    baseColor: 0x4a4a8a,
    details: {
      hasEyepatch: true,
      hasSpear: true,
      spearName: 'Gungnir',
      ravens: true,
      capeColor: 0x1a1a5a,
    },
  },
  thor_thunderous: {
    baseColor: 0xcc0000,
    details: {
      hasHammer: true,
      hammerName: 'Mjolnir',
      lightningEffect: true,
      armorColor: 0x808080,
    },
  },
  loki_trickster: {
    baseColor: 0x006400,
    details: {
      shapeshifter: true,
      hasHorns: true,
      hornColor: 0xffd700,
      illusionEffect: true,
    },
  },
  freyja_valiant: {
    baseColor: 0xffd700,
    details: {
      hasNecklace: true,
      necklaceName: 'Brisingamen',
      catCompanion: true,
      glowEffect: true,
    },
  },
  fenrir_unbound: {
    baseColor: 0x2f2f2f,
    details: {
      wolfForm: true,
      chainBroken: true,
      fireEyes: true,
      eyeColor: 0xff4500,
    },
  },
  heimdall_watchful: {
    baseColor: 0xffffff,
    details: {
      hasHorn: true,
      hornName: 'Gjallarhorn',
      hasSword: true,
      swordName: 'Hofund',
      rainbowBridge: true,
    },
  },
  skadi_hunter: {
    baseColor: 0x87ceeb,
    details: {
      hasBow: true,
      hasSkis: true,
      winterAura: true,
      wolfCompanion: true,
    },
  },
};

// ==================== PROCEDURAL SPRITE GENERATOR ====================

/**
 * Generate a procedural tile sprite based on connectivity
 */
export const generateTileSprite = (graphics, tileConfig, connectivity, size = 16) => {
  const { baseColor, variants, details } = tileConfig;

  // Pick a variant color based on position hash or random
  const colorIndex = Math.floor(Math.random() * (variants?.colors?.length || 1));
  const color = variants?.colors?.[colorIndex] || baseColor;

  // Base fill
  graphics.rect(0, 0, size, size);
  graphics.fill(color);

  // Add texture based on type
  if (details?.texture === 'speckled') {
    // Add random speckles
    for (let i = 0; i < 4; i++) {
      const sx = Math.random() * (size - 2) + 1;
      const sy = Math.random() * (size - 2) + 1;
      graphics.circle(sx, sy, 1);
      graphics.fill(details.speckleColor || 0x000000);
    }
  } else if (details?.texture === 'cracked') {
    // Add crack lines
    graphics.moveTo(Math.random() * size, 0);
    graphics.lineTo(Math.random() * size, size);
    graphics.stroke({ width: 1, color: details.crackColor || 0x000000, alpha: 0.3 });
  } else if (details?.texture === 'grain') {
    // Wood grain
    for (let i = 2; i < size; i += 4) {
      graphics.moveTo(i, 0);
      graphics.lineTo(i + (Math.random() - 0.5) * 2, size);
      graphics.stroke({ width: 1, color: details.grainColor || 0x000000, alpha: 0.4 });
    }
  } else if (details?.texture === 'ore') {
    // Ore gems embedded in stone
    const gemCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < gemCount; i++) {
      const gx = Math.random() * (size - 4) + 2;
      const gy = Math.random() * (size - 4) + 2;
      graphics.rect(gx - 1, gy - 1, 3, 3);
      graphics.fill(details.gemColor || 0xffffff);
    }
  } else if (details?.texture === 'brick') {
    // Brick pattern
    graphics.moveTo(0, size / 2);
    graphics.lineTo(size, size / 2);
    graphics.moveTo(size / 2, 0);
    graphics.lineTo(size / 2, size / 2);
    graphics.stroke({ width: 1, color: details.mortarColor || 0x808080 });
  }

  // Add edge borders based on connectivity
  const borderColor = 0x000000;
  const borderAlpha = 0.3;

  // No top neighbor - add top border
  if (!(connectivity & 4)) {
    graphics.moveTo(0, 0);
    graphics.lineTo(size, 0);
    graphics.stroke({ width: 1, color: borderColor, alpha: borderAlpha });
  }
  // No bottom neighbor - add bottom border
  if (!(connectivity & 8)) {
    graphics.moveTo(0, size);
    graphics.lineTo(size, size);
    graphics.stroke({ width: 1, color: borderColor, alpha: borderAlpha });
  }
  // No left neighbor - add left border
  if (!(connectivity & 1)) {
    graphics.moveTo(0, 0);
    graphics.lineTo(0, size);
    graphics.stroke({ width: 1, color: borderColor, alpha: borderAlpha });
  }
  // No right neighbor - add right border
  if (!(connectivity & 2)) {
    graphics.moveTo(size, 0);
    graphics.lineTo(size, size);
    graphics.stroke({ width: 1, color: borderColor, alpha: borderAlpha });
  }

  // Top decoration for grass
  if (details?.topDecoration && !(connectivity & 4)) {
    for (let i = 0; i < 5; i++) {
      const bx = Math.random() * size;
      const bh = Math.random() * 3 + 2;
      graphics.moveTo(bx, 0);
      graphics.lineTo(bx, -bh);
      graphics.stroke({ width: 1, color: details.decorationColor || 0x00ff00 });
    }
  }

  return graphics;
};

/**
 * Generate a procedural player sprite
 */
export const generatePlayerSprite = (graphics, state, direction, frame, config = PLAYER_SPRITES) => {
  const { playerWidth: w, playerHeight: h } = SPRITE_CONFIG;
  const colors = config.colors;
  const flip = direction === 'left' ? -1 : 1;

  // Body
  graphics.rect(0, 0, w, h);
  graphics.fill(colors.body);
  graphics.stroke({ width: 2, color: colors.outline });

  // Head/Face
  const headY = 4;
  const eyeY = headY + 2;

  // Eyes
  const eye1X = direction === 'right' ? 4 : 10;
  const eye2X = direction === 'right' ? 10 : 4;

  graphics.circle(eye1X, eyeY, 2);
  graphics.circle(eye2X, eyeY, 2);
  graphics.fill(colors.eyeWhite);

  graphics.circle(eye1X + (direction === 'right' ? 0.5 : -0.5), eyeY, 1);
  graphics.circle(eye2X + (direction === 'right' ? 0.5 : -0.5), eyeY, 1);
  graphics.fill(colors.eyes);

  // Viking helmet
  if (config.accessories?.helmet) {
    const helmet = config.accessories.helmet;
    graphics.rect(0, 0, w, 8);
    graphics.fill(helmet.color);

    // Horns
    graphics.moveTo(2, 2);
    graphics.lineTo(-2, -4);
    graphics.stroke({ width: 2, color: helmet.hornColor });

    graphics.moveTo(w - 2, 2);
    graphics.lineTo(w + 2, -4);
    graphics.stroke({ width: 2, color: helmet.hornColor });
  }

  // Animation state modifications
  if (state === 'walk') {
    // Leg animation
    const legOffset = Math.sin(frame * 0.5) * 2;
    graphics.moveTo(w / 2 - 2, h);
    graphics.lineTo(w / 2 - 2 + legOffset, h + 4);
    graphics.moveTo(w / 2 + 2, h);
    graphics.lineTo(w / 2 + 2 - legOffset, h + 4);
    graphics.stroke({ width: 2, color: colors.body });
  }

  if (state === 'attack') {
    // Arm swing animation
    const armAngle = (frame / 4) * Math.PI;
    const armX = direction === 'right' ? w : 0;
    const armEndX = armX + Math.cos(armAngle) * 12 * flip;
    const armEndY = h / 2 + Math.sin(armAngle) * 8;
    graphics.moveTo(armX, h / 2);
    graphics.lineTo(armEndX, armEndY);
    graphics.stroke({ width: 3, color: colors.skin });

    // Weapon/tool at end of arm
    graphics.rect(armEndX - 2, armEndY - 4, 4, 8);
    graphics.fill(0x808080);
  }

  return graphics;
};

/**
 * Generate a procedural enemy sprite
 */
export const generateEnemySprite = (graphics, enemyConfig, state = 'idle', frame = 0) => {
  const { width: w, height: h, baseColor, details } = enemyConfig;

  // Body
  graphics.rect(0, 0, w, h);
  graphics.fill(baseColor);
  graphics.stroke({ width: 2, color: 0x000000 });

  // Eyes
  const eyeY = h * 0.2;
  if (details?.glowingEyes || details?.eyeGlow) {
    const eyeColor = details.eyeColor || details.eyeGlow || 0xff0000;
    graphics.circle(w * 0.3, eyeY, 2);
    graphics.circle(w * 0.7, eyeY, 2);
    graphics.fill(eyeColor);
  } else {
    graphics.circle(w * 0.3, eyeY, 2);
    graphics.circle(w * 0.7, eyeY, 2);
    graphics.fill(0xffffff);
    graphics.circle(w * 0.3, eyeY, 1);
    graphics.circle(w * 0.7, eyeY, 1);
    graphics.fill(0x000000);
  }

  // Special details
  if (details?.hasHelmet) {
    graphics.rect(0, 0, w, h * 0.3);
    graphics.fill(details.helmetColor || 0x808080);
  }

  if (details?.hasAxe || details?.hasClub) {
    graphics.rect(w + 2, h * 0.3, 4, h * 0.4);
    graphics.fill(details.axeColor || details.clubColor || 0x654321);
  }

  if (details?.undead) {
    // Tattered appearance
    for (let i = 0; i < 3; i++) {
      const tearY = Math.random() * h;
      const tearW = Math.random() * 4 + 2;
      graphics.rect(0, tearY, tearW, 2);
      graphics.fill(0x000000);
    }
  }

  if (details?.giant) {
    // Ice patches for Frost Giant
    for (let i = 0; i < 5; i++) {
      const iceX = Math.random() * w;
      const iceY = Math.random() * h;
      graphics.circle(iceX, iceY, 3);
      graphics.fill(details.auraColor || 0x87ceeb);
    }
  }

  if (details?.frostAura) {
    // Frost aura effect
    graphics.rect(-4, -4, w + 8, h + 8);
    graphics.stroke({ width: 2, color: details.auraColor || 0x87ceeb, alpha: 0.5 });
  }

  return graphics;
};

export default {
  SPRITE_CONFIG,
  PLAYER_SPRITES,
  TILE_CONNECTIVITY,
  TILE_SPRITES,
  ENEMY_SPRITES,
  NPC_SPRITES,
  getConnectivityMask,
  generateTileSprite,
  generatePlayerSprite,
  generateEnemySprite,
};
