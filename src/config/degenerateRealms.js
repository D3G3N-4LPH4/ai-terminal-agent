/**
 * Degenerate Realms Configuration
 *
 * Full RPG integration of Norse gods + Crypto trading + Terraria-style gameplay
 * This config extends degenerateTown.js with realm biomes, crypto ores, and RPG elements
 */

// Re-export base config
export * from './degenerateTown';

// ==================== REALM BIOMES ====================

export const REALM_BIOMES = {
  ASGARD: {
    id: 'asgard',
    name: 'Asgard',
    description: 'Realm of the Gods - Floating golden islands above the clouds',
    yRange: { min: 0, max: 50 },
    skyColor: 0xffd796,
    ambientColor: 0xffeedd,
    blocks: ['GOLD_BRICK', 'CLOUD', 'RAINBOW_CRYSTAL'],
    rune: 'ᚨ',
    music: 'asgard_theme',
  },
  MIDGARD: {
    id: 'midgard',
    name: 'Midgard',
    description: 'Earth Realm - The mortal trading grounds',
    yRange: { min: 50, max: 250 },
    skyColor: 0x87ceeb,
    ambientColor: 0xffffff,
    blocks: ['GRASS', 'DIRT', 'STONE', 'SOL_ORE', 'ETH_ORE'],
    rune: 'ᛗ',
    music: 'midgard_theme',
  },
  HELHEIM: {
    id: 'helheim',
    name: 'Helheim',
    description: 'Realm of the Dead - Deep underground treasures and dangers',
    yRange: { min: 250, max: 400 },
    skyColor: 0x281428,
    ambientColor: 0x442244,
    blocks: ['OBSIDIAN', 'HELLSTONE', 'FROZEN_SOUL', 'BTC_ORE'],
    rune: 'ᚾ',
    music: 'helheim_theme',
  },
};

// ==================== BLOCK TYPES ====================

export const BLOCK_TYPES = {
  // Air
  AIR: { id: 0, name: 'Air', color: 0x000000, solid: false },

  // Midgard blocks
  GRASS: { id: 1, name: 'Grass', color: 0x228b22, solid: true, hardness: 1 },
  DIRT: { id: 2, name: 'Dirt', color: 0x654321, solid: true, hardness: 1 },
  STONE: { id: 3, name: 'Stone', color: 0x696969, solid: true, hardness: 2 },
  WOOD: { id: 16, name: 'Wood', color: 0xa0522d, solid: true, hardness: 1 },

  // Asgard blocks
  GOLD_BRICK: { id: 4, name: 'Gold Brick', color: 0xdaa520, solid: true, hardness: 3 },
  CLOUD: { id: 5, name: 'Cloud', color: 0xf0f8ff, solid: true, hardness: 0.5 },
  RAINBOW_CRYSTAL: { id: 14, name: 'Rainbow Crystal', color: 0xff64ff, solid: true, hardness: 4, ore: true, value: 1.0 },

  // Helheim blocks
  OBSIDIAN: { id: 6, name: 'Obsidian', color: 0x14141e, solid: true, hardness: 5 },
  HELLSTONE: { id: 7, name: 'Hellstone', color: 0x8b0000, solid: true, hardness: 4 },
  FROZEN_SOUL: { id: 15, name: 'Frozen Soul', color: 0x96c8ff, solid: true, hardness: 3, ore: true, value: 0.5 },

  // Crypto Ores
  SOL_ORE: { id: 10, name: 'Solana Ore', color: 0x9400d3, solid: true, hardness: 3, ore: true, value: 0.1, symbol: 'SOL' },
  ETH_ORE: { id: 11, name: 'Ethereum Ore', color: 0x6464c8, solid: true, hardness: 3, ore: true, value: 0.05, symbol: 'ETH' },
  BTC_ORE: { id: 12, name: 'Bitcoin Ore', color: 0xffa500, solid: true, hardness: 4, ore: true, value: 0.2, symbol: 'BTC' },
  DEGEN_ORE: { id: 13, name: 'Degen Ore', color: 0x00ff80, solid: true, hardness: 2, ore: true, value: 0.01, symbol: 'DEGEN' },
};

// ==================== ENEMY TYPES ====================

export const ENEMY_TYPES = {
  BERSERKER: {
    id: 'berserker',
    name: 'Berserker',
    color: 0xff0000,
    width: 16,
    height: 32,
    health: 100,
    damage: 10,
    speed: 4,
    jumpForce: 12,
    chaseRange: 300,
    hostile: true,
    drops: { SOL: 0.05 },
  },
  TROLL: {
    id: 'troll',
    name: 'Cave Troll',
    color: 0x8b4513,
    width: 32,
    height: 48,
    health: 150,
    damage: 20,
    speed: 2,
    jumpForce: 10,
    chaseRange: 200,
    hostile: true,
    drops: { SOL: 0.15, DEGEN: 50 },
  },
  DRAUGR: {
    id: 'draugr',
    name: 'Draugr',
    color: 0xa9a9a9,
    width: 16,
    height: 32,
    health: 80,
    damage: 15,
    speed: 5,
    jumpForce: 14,
    chaseRange: 350,
    hostile: true,
    drops: { ETH: 0.02 },
  },
  JOTUNN: {
    id: 'jotunn',
    name: 'Frost Giant',
    color: 0x00008b,
    width: 48,
    height: 64,
    health: 200,
    damage: 30,
    speed: 1.5,
    jumpForce: 8,
    chaseRange: 250,
    hostile: true,
    drops: { BTC: 0.01, SOL: 0.3 },
  },
  VILLAGER: {
    id: 'villager',
    name: 'Viking Villager',
    color: 0x00ff00,
    width: 16,
    height: 32,
    health: 50,
    damage: 0,
    speed: 2,
    jumpForce: 10,
    chaseRange: 0,
    hostile: false,
    dialogues: [
      "Hail, traveler! The markets are volatile today.",
      "By Odin's beard, have you seen the SOL charts?",
      "Trade wisely, friend. Ragnarök comes for the unprepared.",
    ],
  },
};

// Block ID lookup table (O(1) instead of O(n))
const BLOCK_ID_LOOKUP = Object.values(BLOCK_TYPES).reduce((acc, block) => {
  acc[block.id] = block;
  return acc;
}, {});

// Get block by ID (O(1) lookup)
export const getBlockById = (id) => {
  return BLOCK_ID_LOOKUP[id] || BLOCK_TYPES.AIR;
};

// ==================== WORLD GENERATION CONFIG ====================

export const WORLD_CONFIG = {
  width: 300,       // tiles wide
  height: 200,      // tiles tall
  tileSize: 16,     // pixels per tile
  surfaceLevel: 50, // Y level where surface starts

  // Ore spawn rates by depth
  oreSpawnRates: {
    SOL_ORE: { rate: 0.003, minY: 60, maxY: 150 },
    ETH_ORE: { rate: 0.004, minY: 80, maxY: 180 },
    BTC_ORE: { rate: 0.001, minY: 150, maxY: 200 },
    DEGEN_ORE: { rate: 0.008, minY: 50, maxY: 200 },
    RAINBOW_CRYSTAL: { rate: 0.0005, minY: 5, maxY: 40 },
    FROZEN_SOUL: { rate: 0.002, minY: 170, maxY: 200 },
  },

  // Cave generation
  caves: {
    count: 30,
    minRadius: 5,
    maxRadius: 15,
  },

  // Floating islands (Asgard)
  floatingIslands: {
    count: 5,
    minY: 10,
    maxY: 35,
    minWidth: 15,
    maxWidth: 30,
  },
};

// ==================== PLAYER CONFIG ====================

export const PLAYER_CONFIG = {
  width: 16,
  height: 32,
  speed: 4,
  jumpForce: 12,
  gravity: 0.5,
  friction: 0.85,
  maxHealth: 100,
  attackDamage: 10,
  attackRange: 40,
  invincibilityTime: 1000, // ms of invincibility after being hit

  startingInventory: {
    DIRT: 50,
    STONE: 20,
    WOOD: 50,
  },

  startingWallet: {
    SOL: 1.0,
    ETH: 0,
    BTC: 0,
    DEGEN: 0,
  },
};

// ==================== VIKING HALL CONFIG ====================

export const VIKING_HALL_CONFIG = {
  width: 20,
  height: 5,
  doorHeight: 2,
  roofHeight: 3,
  spawnAtPlayerStart: true,
  friendlyVillagerCount: 3,
};

// ==================== NPC SPAWN LOCATIONS ====================

export const NPC_SPAWN_ZONES = {
  odin_allfather: { realm: 'ASGARD', y: 30 },
  thor_thunderous: { realm: 'MIDGARD', y: 48 },
  loki_trickster: { realm: 'MIDGARD', y: 48 },
  freyja_valiant: { realm: 'ASGARD', y: 25 },
  fenrir_unbound: { realm: 'HELHEIM', y: 175 },
  heimdall_watchful: { realm: 'ASGARD', y: 35 },
  skadi_hunter: { realm: 'HELHEIM', y: 180 },
};

// ==================== MARKET SIMULATION ====================

export const MARKET_CONFIG = {
  tokens: {
    SOL: { startPrice: 100, volatility: 0.3 },
    DEGEN: { startPrice: 0.001, volatility: 0.8 },
    PUMP: { startPrice: 0.0001, volatility: 0.95 },
    MOON: { startPrice: 0.00001, volatility: 0.99 },
  },

  eventProbability: 0.01, // Chance of market event per tick

  events: [
    { type: 'whale', weight: 20, impact: { min: 0.1, max: 0.3 } },
    { type: 'pump', weight: 15, impact: { min: 0.1, max: 0.5 } },
    { type: 'dump', weight: 15, impact: { min: -0.3, max: -0.05 } },
    { type: 'news', weight: 30, impact: { min: -0.1, max: 0.1 } },
    { type: 'rug', weight: 5, impact: { min: -0.9, max: -0.5 } },
    { type: 'moon', weight: 5, impact: { min: 0.5, max: 2.0 } },
  ],
};

// ==================== UI CONFIG ====================

export const UI_CONFIG = {
  hotbarSlots: 4,
  terminalWidth: 400,
  terminalHeight: 300,

  colors: {
    background: 0x0a0e17,
    panel: 0x1a1f3a,
    border: 0xffd700,
    text: 0xffffff,
    textMuted: 0x888888,
    success: 0x00ff41,
    danger: 0xff4444,
    warning: 0xffaa00,
  },
};

// ==================== KEYBINDINGS ====================

export const KEYBINDINGS = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'],
  openTerminal: ['KeyT'],
  interact: ['KeyE'],
  selectBlock1: ['Digit1'],
  selectBlock2: ['Digit2'],
  selectBlock3: ['Digit3'],
  selectBlock4: ['Digit4'],
  toggleOverlay: ['Tab'],
  escape: ['Escape'],
};

export default {
  REALM_BIOMES,
  BLOCK_TYPES,
  ENEMY_TYPES,
  WORLD_CONFIG,
  PLAYER_CONFIG,
  VIKING_HALL_CONFIG,
  NPC_SPAWN_ZONES,
  MARKET_CONFIG,
  UI_CONFIG,
  KEYBINDINGS,
  getBlockById,
};
