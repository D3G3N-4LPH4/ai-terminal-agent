/**
 * Sprite Asset Configuration for Degenerate Town
 *
 * This file configures sprite assets from CraftPix.net or similar sources.
 * Spritesheets should be placed in public/assets/sprites/
 *
 * CraftPix assets typically come as:
 * - PNG spritesheets with transparent backgrounds
 * - JSON metadata (optional) or fixed frame sizes
 * - Multiple animation states (idle, walk, attack, etc.)
 *
 * Recommended CraftPix packs for Degenerate Town:
 * - Viking/Medieval Character Sprites
 * - Magic Effects Pixel Art Pack
 * - Fire/Lightning VFX sprites
 * - Fantasy GUI elements
 */

// Asset paths (relative to public folder)
export const ASSET_PATHS = {
  sprites: '/assets/sprites/',
  effects: '/assets/effects/',
  backgrounds: '/assets/backgrounds/',
  ui: '/assets/ui/',
};

// Norse God Agent Sprite Configurations
// Each agent can have their own spritesheet or share common ones
export const AGENT_SPRITES = {
  odin_allfather: {
    // Spritesheet info
    spritesheet: 'odin_spritesheet.png',
    frameWidth: 64,
    frameHeight: 64,
    // Animation definitions
    animations: {
      idle: { startFrame: 0, endFrame: 3, speed: 0.1, loop: true },
      walk: { startFrame: 4, endFrame: 11, speed: 0.15, loop: true },
      trade: { startFrame: 12, endFrame: 17, speed: 0.2, loop: false },
      victory: { startFrame: 18, endFrame: 23, speed: 0.12, loop: false },
      defeat: { startFrame: 24, endFrame: 29, speed: 0.12, loop: false },
    },
    // Fallback if no spritesheet
    fallback: {
      color: 0xFFD700,
      symbol: 'ᛟ',
      size: 24,
    },
  },

  thor_thunderer: {
    spritesheet: 'thor_spritesheet.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { startFrame: 0, endFrame: 3, speed: 0.1, loop: true },
      walk: { startFrame: 4, endFrame: 11, speed: 0.15, loop: true },
      trade: { startFrame: 12, endFrame: 17, speed: 0.2, loop: false },
      hammer: { startFrame: 18, endFrame: 25, speed: 0.18, loop: false }, // Special: hammer swing
      lightning: { startFrame: 26, endFrame: 31, speed: 0.25, loop: false },
    },
    fallback: {
      color: 0x4169E1,
      symbol: 'ᚦ',
      size: 26,
    },
  },

  loki_trickster: {
    spritesheet: 'loki_spritesheet.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { startFrame: 0, endFrame: 5, speed: 0.12, loop: true }, // More frames for shifty idle
      walk: { startFrame: 6, endFrame: 13, speed: 0.18, loop: true },
      trade: { startFrame: 14, endFrame: 19, speed: 0.2, loop: false },
      trick: { startFrame: 20, endFrame: 27, speed: 0.15, loop: false }, // Trickery animation
      vanish: { startFrame: 28, endFrame: 35, speed: 0.2, loop: false },
    },
    fallback: {
      color: 0x32CD32,
      symbol: 'ᛚ',
      size: 22,
    },
  },

  freyja_seer: {
    spritesheet: 'freyja_spritesheet.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { startFrame: 0, endFrame: 3, speed: 0.08, loop: true }, // Graceful, slow idle
      walk: { startFrame: 4, endFrame: 11, speed: 0.12, loop: true },
      trade: { startFrame: 12, endFrame: 17, speed: 0.15, loop: false },
      divine: { startFrame: 18, endFrame: 25, speed: 0.1, loop: false }, // Divine sight
      bless: { startFrame: 26, endFrame: 31, speed: 0.12, loop: false },
    },
    fallback: {
      color: 0xFF69B4,
      symbol: 'ᚠ',
      size: 22,
    },
  },

  fenrir_wolf: {
    spritesheet: 'fenrir_spritesheet.png',
    frameWidth: 80, // Larger for wolf form
    frameHeight: 64,
    animations: {
      idle: { startFrame: 0, endFrame: 3, speed: 0.1, loop: true },
      prowl: { startFrame: 4, endFrame: 11, speed: 0.2, loop: true }, // Prowling walk
      trade: { startFrame: 12, endFrame: 17, speed: 0.25, loop: false },
      howl: { startFrame: 18, endFrame: 25, speed: 0.15, loop: false },
      rage: { startFrame: 26, endFrame: 35, speed: 0.3, loop: false }, // Aggressive
    },
    fallback: {
      color: 0x8B0000,
      symbol: 'ᚹ',
      size: 28,
    },
  },

  heimdall_watcher: {
    spritesheet: 'heimdall_spritesheet.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { startFrame: 0, endFrame: 3, speed: 0.06, loop: true }, // Very slow, watchful
      walk: { startFrame: 4, endFrame: 11, speed: 0.1, loop: true },
      trade: { startFrame: 12, endFrame: 17, speed: 0.12, loop: false },
      watch: { startFrame: 18, endFrame: 23, speed: 0.08, loop: true }, // Scanning
      alert: { startFrame: 24, endFrame: 31, speed: 0.2, loop: false },
    },
    fallback: {
      color: 0xFFFFFF,
      symbol: 'ᚺ',
      size: 24,
    },
  },

  skadi_hunter: {
    spritesheet: 'skadi_spritesheet.png',
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { startFrame: 0, endFrame: 3, speed: 0.1, loop: true },
      walk: { startFrame: 4, endFrame: 11, speed: 0.16, loop: true },
      trade: { startFrame: 12, endFrame: 17, speed: 0.2, loop: false },
      aim: { startFrame: 18, endFrame: 21, speed: 0.08, loop: false }, // Aiming bow
      shoot: { startFrame: 22, endFrame: 27, speed: 0.25, loop: false },
    },
    fallback: {
      color: 0x00CED1,
      symbol: 'ᛊ',
      size: 22,
    },
  },
};

// Visual Effects Sprite Configurations
export const EFFECT_SPRITES = {
  // Trade effects
  profit_burst: {
    spritesheet: 'profit_effect.png',
    frameWidth: 64,
    frameHeight: 64,
    animation: { startFrame: 0, endFrame: 11, speed: 0.2, loop: false },
    tint: 0x00FF00,
  },
  loss_burst: {
    spritesheet: 'loss_effect.png',
    frameWidth: 64,
    frameHeight: 64,
    animation: { startFrame: 0, endFrame: 11, speed: 0.2, loop: false },
    tint: 0xFF0000,
  },

  // Market events
  ragnarok_fire: {
    spritesheet: 'fire_effect.png',
    frameWidth: 128,
    frameHeight: 128,
    animation: { startFrame: 0, endFrame: 23, speed: 0.25, loop: true },
    tint: 0xFF4400,
  },
  thor_lightning: {
    spritesheet: 'lightning_effect.png',
    frameWidth: 96,
    frameHeight: 256,
    animation: { startFrame: 0, endFrame: 7, speed: 0.3, loop: false },
    tint: 0x00AAFF,
  },
  loki_smoke: {
    spritesheet: 'smoke_effect.png',
    frameWidth: 64,
    frameHeight: 64,
    animation: { startFrame: 0, endFrame: 15, speed: 0.15, loop: false },
    tint: 0x00FF00,
  },
  freyja_sparkle: {
    spritesheet: 'sparkle_effect.png',
    frameWidth: 32,
    frameHeight: 32,
    animation: { startFrame: 0, endFrame: 11, speed: 0.12, loop: true },
    tint: 0xFF69B4,
  },
  bifrost_rainbow: {
    spritesheet: 'rainbow_effect.png',
    frameWidth: 64,
    frameHeight: 128,
    animation: { startFrame: 0, endFrame: 15, speed: 0.1, loop: true },
  },

  // Generic particles
  coin_spin: {
    spritesheet: 'coin_sprite.png',
    frameWidth: 32,
    frameHeight: 32,
    animation: { startFrame: 0, endFrame: 7, speed: 0.2, loop: true },
    tint: 0xFFD700,
  },
  rune_glow: {
    spritesheet: 'rune_glow.png',
    frameWidth: 48,
    frameHeight: 48,
    animation: { startFrame: 0, endFrame: 11, speed: 0.08, loop: true },
    tint: 0x00FF41,
  },
};

// Background and Environment Sprites
export const ENVIRONMENT_SPRITES = {
  town_background: {
    image: 'degenerate_town_bg.png',
    width: 1920,
    height: 1080,
    parallaxLayers: [
      { image: 'sky_layer.png', speed: 0.1 },
      { image: 'mountains_layer.png', speed: 0.3 },
      { image: 'buildings_layer.png', speed: 0.6 },
      { image: 'foreground_layer.png', speed: 1.0 },
    ],
  },

  // Building sprites
  odins_hall: {
    image: 'odins_hall.png',
    width: 256,
    height: 320,
    glowColor: 0xFFD700,
  },
  thors_forge: {
    image: 'thors_forge.png',
    width: 224,
    height: 256,
    glowColor: 0xFF4400,
    // Animated forge fire
    animation: {
      spritesheet: 'forge_fire.png',
      frameWidth: 64,
      frameHeight: 64,
      frames: 8,
      speed: 0.2,
    },
  },
  bifrost_bridge: {
    image: 'bifrost_bridge.png',
    width: 128,
    height: 256,
    // Rainbow shimmer effect
    animation: {
      spritesheet: 'bifrost_shimmer.png',
      frameWidth: 128,
      frameHeight: 256,
      frames: 12,
      speed: 0.1,
    },
  },
};

// UI Elements
export const UI_SPRITES = {
  // Leaderboard frame
  leaderboard_frame: {
    image: 'leaderboard_frame.png',
    nineSlice: { left: 16, right: 16, top: 16, bottom: 16 },
  },
  // Stats panel
  stats_panel: {
    image: 'stats_panel.png',
    nineSlice: { left: 12, right: 12, top: 12, bottom: 12 },
  },
  // Agent info popup
  agent_popup: {
    image: 'agent_popup.png',
    nineSlice: { left: 20, right: 20, top: 20, bottom: 20 },
  },
  // Buttons
  button_normal: { image: 'button_normal.png' },
  button_hover: { image: 'button_hover.png' },
  button_pressed: { image: 'button_pressed.png' },
  // Icons
  icon_profit: { image: 'icon_profit.png', size: 24 },
  icon_loss: { image: 'icon_loss.png', size: 24 },
  icon_trade: { image: 'icon_trade.png', size: 24 },
};

// Particle emitter configurations
export const PARTICLE_CONFIGS = {
  trade_profit: {
    maxParticles: 50,
    emitterLifetime: 0.5,
    frequency: 0.01,
    particleLifetime: { min: 0.5, max: 1.0 },
    speed: { min: 100, max: 200 },
    scale: { start: 0.8, end: 0.2 },
    alpha: { start: 1, end: 0 },
    color: { start: '#00FF00', end: '#00AA00' },
    acceleration: { x: 0, y: -100 },
    rotation: { min: 0, max: 360 },
  },
  trade_loss: {
    maxParticles: 30,
    emitterLifetime: 0.5,
    frequency: 0.02,
    particleLifetime: { min: 0.3, max: 0.8 },
    speed: { min: 50, max: 150 },
    scale: { start: 0.6, end: 0.1 },
    alpha: { start: 1, end: 0 },
    color: { start: '#FF0000', end: '#880000' },
    acceleration: { x: 0, y: 50 },
  },
  ragnarok: {
    maxParticles: 200,
    emitterLifetime: -1, // Infinite
    frequency: 0.005,
    particleLifetime: { min: 1, max: 2 },
    speed: { min: 50, max: 200 },
    scale: { start: 1.5, end: 0.3 },
    alpha: { start: 0.8, end: 0 },
    color: { start: '#FF4400', end: '#FF0000' },
    acceleration: { x: 0, y: -50 },
    rotation: { min: -180, max: 180, speed: { min: -90, max: 90 } },
  },
  lightning: {
    maxParticles: 100,
    emitterLifetime: 0.2,
    frequency: 0.001,
    particleLifetime: { min: 0.1, max: 0.3 },
    speed: { min: 200, max: 500 },
    scale: { start: 0.5, end: 1.5 },
    alpha: { start: 1, end: 0 },
    color: { start: '#FFFFFF', end: '#00AAFF' },
  },
  rune_float: {
    maxParticles: 20,
    emitterLifetime: -1,
    frequency: 0.5,
    particleLifetime: { min: 5, max: 10 },
    speed: { min: 10, max: 30 },
    scale: { start: 0.3, end: 0.8 },
    alpha: { start: 0, end: 0.3, middle: 0.5 },
    color: { start: '#00FF41', end: '#00FF41' },
    acceleration: { x: 0, y: -20 },
  },
};

// Animation state mappings based on agent actions
export const ACTION_TO_ANIMATION = {
  idle: 'idle',
  buy: 'trade',
  sell: 'trade',
  hold: 'idle',
  scalp: 'trade',
  short: 'trade',
  // Mood-based animations
  triumphant: 'victory',
  enraged: 'rage',
  pleased: 'idle',
  frustrated: 'defeat',
};

// Export default configuration
export default {
  ASSET_PATHS,
  AGENT_SPRITES,
  EFFECT_SPRITES,
  ENVIRONMENT_SPRITES,
  UI_SPRITES,
  PARTICLE_CONFIGS,
  ACTION_TO_ANIMATION,
};
