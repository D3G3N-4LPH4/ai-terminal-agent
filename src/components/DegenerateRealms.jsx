/**
 * DegenerateRealms - Norse Trading RPG
 *
 * A Terraria-style sandbox game integrated with AI trading simulation.
 * Features:
 * - Mine crypto ores that convert to trading capital
 * - Norse god NPCs with Q-Learning AI personalities
 * - Multiple realms (Asgard, Midgard, Helheim)
 * - In-game trading terminal
 * - Real-time market simulation
 */

import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { NORSE_AGENTS, NORSE_RUNES } from '../config/degenerateTown';
import {
  REALM_BIOMES,
  BLOCK_TYPES,
  ENEMY_TYPES,
  WORLD_CONFIG,
  PLAYER_CONFIG,
  VIKING_HALL_CONFIG,
  NPC_SPAWN_ZONES,
  MARKET_CONFIG,
  UI_CONFIG,
  getBlockById,
} from '../config/degenerateRealms';
import {
  SPRITE_CONFIG,
  PLAYER_SPRITES,
  TILE_SPRITES,
  ENEMY_SPRITES,
  getConnectivityMask,
  generateTileSprite,
  generatePlayerSprite,
  generateEnemySprite,
} from '../config/sprites';
import {
  LightingManager,
  LIGHTING_CONFIG,
} from '../config/gameEngine';

// ============================================================================
// GAME ENGINE CLASSES
// ============================================================================

/**
 * Q-Learning Agent for NPC trading decisions
 */
class QLearningAgent {
  constructor(agentId, config = {}) {
    this.agentId = agentId;
    this.learningRate = config.learningRate || 0.1;
    this.discountFactor = config.discountFactor || 0.95;
    this.explorationRate = config.explorationRate || 0.2;
    this.minExploration = 0.01;
    this.explorationDecay = 0.995;
    this.qTable = {};
    this.actions = ['buy', 'sell', 'hold'];
    this.totalProfit = 0;
    this.trades = 0;
    this.wins = 0;
  }

  getState(marketData) {
    const trend = marketData.trend > 0 ? 'up' : 'down';
    const volatility = marketData.volatility > 0.5 ? 'high' : 'low';
    const position = marketData.hasPosition ? 'long' : 'none';
    return `${trend}_${volatility}_${position}`;
  }

  getAction(state) {
    if (Math.random() < this.explorationRate) {
      return this.actions[Math.floor(Math.random() * this.actions.length)];
    }
    if (!this.qTable[state]) {
      this.qTable[state] = { buy: 0, sell: 0, hold: 0 };
    }
    return Object.entries(this.qTable[state]).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }

  update(state, action, reward, nextState) {
    if (!this.qTable[state]) this.qTable[state] = { buy: 0, sell: 0, hold: 0 };
    if (!this.qTable[nextState]) this.qTable[nextState] = { buy: 0, sell: 0, hold: 0 };

    const currentQ = this.qTable[state][action];
    const maxNextQ = Math.max(...Object.values(this.qTable[nextState]));
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
    this.qTable[state][action] = newQ;

    this.explorationRate = Math.max(this.minExploration, this.explorationRate * this.explorationDecay);
  }

  recordTrade(profit) {
    this.totalProfit += profit;
    this.trades++;
    if (profit > 0) this.wins++;
  }
}

/**
 * Market Simulator
 */
class MarketSimulator {
  constructor() {
    this.tokens = {};
    Object.entries(MARKET_CONFIG.tokens).forEach(([symbol, config]) => {
      this.tokens[symbol] = {
        price: config.startPrice,
        trend: 0,
        volatility: config.volatility,
        history: [config.startPrice],
      };
    });
    this.events = [];
    this.tick = 0;
  }

  update() {
    this.tick++;

    Object.entries(this.tokens).forEach(([symbol, data]) => {
      // Random walk with mean reversion
      const change = (Math.random() - 0.5) * 2 * data.volatility * 0.01 * data.price;
      data.trend = data.trend * 0.95 + (Math.random() - 0.5) * 0.2;
      data.price = Math.max(0.0000001, data.price + change + data.trend * 0.001 * data.price);
      data.history.push(data.price);
      if (data.history.length > 100) data.history.shift();
    });

    // Random events
    if (Math.random() < MARKET_CONFIG.eventProbability) {
      this.generateEvent();
    }
  }

  generateEvent() {
    const token = Object.keys(this.tokens)[Math.floor(Math.random() * Object.keys(this.tokens).length)];
    const eventTypes = ['whale', 'pump', 'dump', 'news'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const messages = {
      whale: `🐋 Whale spotted! Large ${token} movement`,
      pump: `🚀 ${token} is pumping!`,
      dump: `📉 ${token} dumping!`,
      news: `📰 Breaking news for ${token}`,
    };

    this.events.push({
      type,
      token,
      message: messages[type],
      tick: this.tick,
    });

    if (this.events.length > 20) this.events.shift();

    // Apply effect
    if (type === 'pump') {
      this.tokens[token].price *= 1 + Math.random() * 0.3;
      this.tokens[token].trend = 0.5;
    } else if (type === 'dump') {
      this.tokens[token].price *= 1 - Math.random() * 0.2;
      this.tokens[token].trend = -0.5;
    }
  }
}

/**
 * World Generator
 */
class WorldGenerator {
  static generate() {
    const { width, height, surfaceLevel } = WORLD_CONFIG;
    const world = Array(height).fill(null).map(() => Array(width).fill(0));

    // Generate surface terrain
    for (let x = 0; x < width; x++) {
      const surfaceY = surfaceLevel + Math.floor(
        Math.sin(x * 0.02) * 8 +
        Math.sin(x * 0.05) * 4 +
        (Math.random() - 0.5) * 4
      );

      for (let y = surfaceY; y < height; y++) {
        const depth = y - surfaceY;
        if (depth === 0) {
          world[y][x] = BLOCK_TYPES.GRASS.id;
        } else if (depth < 12) {
          world[y][x] = BLOCK_TYPES.DIRT.id;
        } else if (y < 170) {
          world[y][x] = BLOCK_TYPES.STONE.id;
        } else {
          world[y][x] = Math.random() < 0.3 ? BLOCK_TYPES.HELLSTONE.id : BLOCK_TYPES.OBSIDIAN.id;
        }
      }
    }

    // Add floating islands (Asgard)
    for (let i = 0; i < WORLD_CONFIG.floatingIslands.count; i++) {
      const ix = Math.floor(Math.random() * (width - 40)) + 20;
      const iy = Math.floor(Math.random() * 25) + 10;
      const iw = Math.floor(Math.random() * 15) + 10;
      const ih = Math.floor(Math.random() * 5) + 3;

      for (let dx = Math.floor(-iw / 2); dx < Math.floor(iw / 2); dx++) {
        for (let dy = 0; dy < ih; dy++) {
          const wx = Math.floor(ix + dx);
          const wy = Math.floor(iy + dy);
          if (wx >= 0 && wx < width && wy >= 0 && wy < height && world[wy]) {
            const distFromCenter = Math.abs(dx) / (iw / 2);
            if (Math.random() > distFromCenter * 0.5) {
              world[wy][wx] = dy === 0 ? BLOCK_TYPES.GOLD_BRICK.id : BLOCK_TYPES.CLOUD.id;
            }
          }
        }
      }
    }

    // Add ores
    Object.entries(WORLD_CONFIG.oreSpawnRates).forEach(([oreName, config]) => {
      const ore = BLOCK_TYPES[oreName];
      if (!ore) return;

      const minY = Math.max(0, config.minY);
      const maxY = Math.min(config.maxY, height);
      for (let y = minY; y < maxY; y++) {
        if (!world[y]) continue;
        for (let x = 0; x < width; x++) {
          if (world[y][x] === BLOCK_TYPES.STONE.id || world[y][x] === BLOCK_TYPES.OBSIDIAN.id) {
            if (Math.random() < config.rate) {
              world[y][x] = ore.id;
            }
          }
        }
      }
    });

    // Add caves
    for (let i = 0; i < WORLD_CONFIG.caves.count; i++) {
      const cx = Math.floor(Math.random() * (width - 40)) + 20;
      const cy = Math.floor(Math.random() * (height - surfaceLevel - 40)) + surfaceLevel + 20;
      const radius = Math.floor(Math.random() * (WORLD_CONFIG.caves.maxRadius - WORLD_CONFIG.caves.minRadius)) + WORLD_CONFIG.caves.minRadius;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = Math.floor(-radius / 2); dy <= Math.floor(radius / 2); dy++) {
          const dist = Math.sqrt(dx * dx + (dy * 2) ** 2);
          if (dist < radius * (0.7 + Math.random() * 0.3)) {
            const wx = cx + dx;
            const wy = cy + dy;
            if (wx >= 0 && wx < width && wy >= 0 && wy < height && world[wy]) {
              world[wy][wx] = 0;
            }
          }
        }
      }
    }

    return world;
  }

  // Build Viking Hall at specified location
  static buildVikingHall(world, centerX, tileSize) {
    const { width: hallWidth, height: hallHeight, doorHeight, roofHeight } = VIKING_HALL_CONFIG;
    const leftX = centerX - Math.floor(hallWidth / 2);
    const rightX = centerX + Math.floor(hallWidth / 2);

    // Find surface level at center
    let floorY = WORLD_CONFIG.surfaceLevel;
    for (let y = 0; y < WORLD_CONFIG.height; y++) {
      if (world[y] && world[y][centerX] !== 0) {
        floorY = y;
        break;
      }
    }

    // Wood block ID
    const woodId = BLOCK_TYPES.WOOD.id;

    // Build floor
    for (let x = leftX; x <= rightX; x++) {
      if (x >= 0 && x < WORLD_CONFIG.width && floorY < WORLD_CONFIG.height) {
        world[floorY][x] = woodId;
      }
    }

    // Build walls (with door on left)
    for (let h = 1; h <= hallHeight; h++) {
      const y = floorY - h;
      if (y >= 0) {
        // Left wall - leave door opening at bottom
        if (h > doorHeight && leftX >= 0) {
          world[y][leftX] = woodId;
        }
        // Right wall
        if (rightX < WORLD_CONFIG.width) {
          world[y][rightX] = woodId;
        }
      }
    }

    // Build triangular roof
    for (let level = 0; level < roofHeight; level++) {
      const y = floorY - hallHeight - level - 1;
      const startX = leftX + level;
      const endX = rightX - level;
      if (y >= 0) {
        for (let x = startX; x <= endX; x++) {
          if (x >= 0 && x < WORLD_CONFIG.width) {
            world[y][x] = woodId;
          }
        }
      }
    }

    // Add interior pillars
    const pillarPositions = [leftX + 5, centerX, rightX - 5];
    for (const px of pillarPositions) {
      if (px >= 0 && px < WORLD_CONFIG.width) {
        for (let h = 1; h < hallHeight; h++) {
          const y = floorY - h;
          if (y >= 0 && world[y][px] === 0) {
            world[y][px] = woodId;
          }
        }
      }
    }

    // Add central table
    const tableY = floorY - 1;
    if (tableY >= 0) {
      for (let x = centerX - 3; x <= centerX + 3; x++) {
        if (x >= 0 && x < WORLD_CONFIG.width && world[tableY][x] === 0) {
          world[tableY][x] = woodId;
        }
      }
    }

    return { floorY, leftX, rightX };
  }
}

// ============================================================================
// HELPER FUNCTIONS (defined outside component for proper scoping)
// ============================================================================

// Safe world array access with bounds checking
const getBlockAt = (world, x, y) => {
  if (!world || x < 0 || x >= WORLD_CONFIG.width || y < 0 || y >= WORLD_CONFIG.height) {
    return 0; // Return air for out-of-bounds
  }
  return world[y]?.[x] ?? 0;
};

// Find surface Y at given X
const findSurfaceY = (world, x) => {
  if (!world || x < 0 || x >= WORLD_CONFIG.width) {
    return WORLD_CONFIG.surfaceLevel;
  }
  for (let y = 0; y < WORLD_CONFIG.height; y++) {
    if (getBlockAt(world, x, y) !== 0) {
      return y;
    }
  }
  return WORLD_CONFIG.surfaceLevel;
};

// Update enemy AI and physics
const updateEnemy = (enemy, gs, dt, tileSize) => {
  const player = gs.player;

  if (enemy.hostile) {
    // Calculate distance to player
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Chase player if in range
    if (dist < enemy.chaseRange) {
      // Move towards player
      if (Math.abs(dx) > 10) {
        enemy.vx = Math.sign(dx) * enemy.speed;
      } else {
        enemy.vx = 0;
      }

      // Jump if player is above and enemy is on ground
      if (dy < -tileSize && enemy.onGround && Math.random() < 0.05) {
        enemy.vy = -enemy.jumpForce;
      }
    } else {
      // Random wandering when player not in range
      enemy.wanderTimer = (enemy.wanderTimer || 0) - 1;
      if (enemy.wanderTimer <= 0) {
        enemy.vx = (Math.random() - 0.5) * enemy.speed;
        enemy.wanderTimer = Math.floor(Math.random() * 120) + 60;
      }
    }
  } else {
    // Friendly NPC - random walking
    enemy.wanderTimer = (enemy.wanderTimer || 0) - 1;
    if (enemy.wanderTimer <= 0) {
      enemy.vx = (Math.random() - 0.5) * enemy.speed * 0.5;
      enemy.wanderTimer = Math.floor(Math.random() * 180) + 60;
      if (enemy.onGround && Math.random() < 0.1) {
        enemy.vy = -enemy.jumpForce * 0.7;
      }
    }
  }

  // Apply physics
  enemy.vx *= 0.85; // Friction
  enemy.x += enemy.vx;
  handleCollision(gs, enemy, 'x', tileSize);

  enemy.vy = Math.min((enemy.vy || 0) + PLAYER_CONFIG.gravity, 15); // Gravity
  enemy.y += enemy.vy;
  enemy.onGround = false;
  handleCollision(gs, enemy, 'y', tileSize);

  // Clamp to world bounds
  enemy.x = Math.max(0, Math.min(enemy.x, WORLD_CONFIG.width * tileSize - enemy.width));
  enemy.y = Math.max(0, Math.min(enemy.y, WORLD_CONFIG.height * tileSize - enemy.height));
};

// Check collision between player and enemies
const checkCombatCollisions = (gs, tileSize) => {
  const player = gs.player;
  const now = Date.now();

  // Skip if player is invincible
  if (player.invincibleUntil && now < player.invincibleUntil) {
    return;
  }

  for (const enemy of gs.enemies) {
    if (!enemy.hostile || enemy.health <= 0) continue;

    // AABB collision check
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      // Player takes damage
      player.health -= enemy.damage;
      player.invincibleUntil = now + PLAYER_CONFIG.invincibilityTime;

      // Knockback
      const knockbackDir = player.x < enemy.x ? -1 : 1;
      player.vx = knockbackDir * 8;
      player.vy = -5;

      // Flash effect (handled in render)
      player.damageFlash = now + 200;

      break; // Only one hit per frame
    }
  }
};

// Player attack enemies
const playerAttack = (gs, tileSize) => {
  const player = gs.player;
  const attackRange = PLAYER_CONFIG.attackRange;

  for (const enemy of gs.enemies) {
    if (enemy.health <= 0) continue;

    const dx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
    const dy = (enemy.y + enemy.height / 2) - (player.y + player.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < attackRange) {
      enemy.health -= PLAYER_CONFIG.attackDamage;

      // Knockback enemy
      enemy.vx = Math.sign(dx) * 5;
      enemy.vy = -3;

      // If enemy dies, drop loot
      if (enemy.health <= 0) {
        if (enemy.drops) {
          Object.entries(enemy.drops).forEach(([currency, amount]) => {
            player.wallet[currency] = (player.wallet[currency] || 0) + amount;
          });
        }
      }

      return true; // Only hit one enemy per attack
    }
  }
  return false;
};

const handleCollision = (gs, entity, axis, tileSize) => {
  const left = Math.floor(entity.x / tileSize);
  const right = Math.floor((entity.x + entity.width - 1) / tileSize);
  const top = Math.floor(entity.y / tileSize);
  const bottom = Math.floor((entity.y + entity.height - 1) / tileSize);

  for (let ty = Math.max(0, top); ty <= Math.min(WORLD_CONFIG.height - 1, bottom); ty++) {
    for (let tx = Math.max(0, left); tx <= Math.min(WORLD_CONFIG.width - 1, right); tx++) {
      if (gs.world[ty]?.[tx] && gs.world[ty][tx] !== 0) {
        if (axis === 'x') {
          if (entity.vx > 0) entity.x = tx * tileSize - entity.width;
          else if (entity.vx < 0) entity.x = (tx + 1) * tileSize;
          entity.vx = 0;
        } else {
          if (entity.vy > 0) {
            entity.y = ty * tileSize - entity.height;
            entity.onGround = true;
          } else if (entity.vy < 0) {
            entity.y = (ty + 1) * tileSize;
          }
          entity.vy = 0;
        }
      }
    }
  }
};

const updatePlayer = (gs, dt, tileSize) => {
  const p = gs.player;
  const speed = PLAYER_CONFIG.speed;
  const jumpForce = PLAYER_CONFIG.jumpForce;
  const gravity = PLAYER_CONFIG.gravity;
  const friction = PLAYER_CONFIG.friction;

  // Horizontal movement
  p.vx *= friction;
  if (gs.keys['KeyA'] || gs.keys['ArrowLeft']) p.vx -= speed * 0.2;
  if (gs.keys['KeyD'] || gs.keys['ArrowRight']) p.vx += speed * 0.2;
  p.vx = Math.max(-speed, Math.min(speed, p.vx));

  // Apply X movement
  p.x += p.vx;
  handleCollision(gs, p, 'x', tileSize);

  // Jump
  if ((gs.keys['KeyW'] || gs.keys['ArrowUp'] || gs.keys['Space']) && p.onGround) {
    p.vy = -jumpForce;
  }

  // Gravity
  p.vy = Math.min(p.vy + gravity, 15);

  // Apply Y movement
  p.onGround = false;
  p.y += p.vy;
  handleCollision(gs, p, 'y', tileSize);

  // Clamp to world bounds
  p.x = Math.max(0, Math.min(p.x, WORLD_CONFIG.width * tileSize - p.width));
  p.y = Math.max(0, Math.min(p.y, WORLD_CONFIG.height * tileSize - p.height));
};

const updateNpc = (npc, gs, dt, tileSize) => {
  // Trading decision
  if (Math.random() < 0.01 * (1 + npc.personality.aggression)) {
    const tokenKeys = Object.keys(gs.market.tokens);
    const token = tokenKeys[Math.floor(Math.random() * tokenKeys.length)];
    const marketData = {
      trend: gs.market.tokens[token].trend,
      volatility: gs.market.tokens[token].volatility,
      hasPosition: token in npc.positions,
    };

    const state = npc.ai.getState(marketData);
    const action = npc.ai.getAction(state);

    if (action === 'buy' && npc.portfolio > 1) {
      const amount = npc.portfolio * 0.1 * npc.personality.aggression;
      const price = gs.market.tokens[token].price;
      npc.positions[token] = (npc.positions[token] || 0) + amount / price;
      npc.portfolio -= amount;
    } else if (action === 'sell' && npc.positions[token] > 0) {
      const tokensToSell = npc.positions[token] * 0.5;
      const proceeds = tokensToSell * gs.market.tokens[token].price;
      npc.portfolio += proceeds;
      npc.positions[token] -= tokensToSell;
      npc.ai.recordTrade(proceeds - tokensToSell);
    }

    const nextState = npc.ai.getState(marketData);
    npc.ai.update(state, action, 0, nextState);
  }

  // Wandering
  npc.wanderTimer--;
  if (npc.wanderTimer <= 0) {
    npc.targetX = npc.x + (Math.random() - 0.5) * 200;
    npc.wanderTimer = Math.floor(Math.random() * 120) + 60;
  }

  if (npc.targetX !== null) {
    const dx = npc.targetX - npc.x;
    if (Math.abs(dx) > 5) {
      npc.vx = Math.sign(dx) * Math.min(Math.abs(dx) * 0.1, 1.5);
    } else {
      npc.vx = 0;
      npc.targetX = null;
    }
  }

  npc.x += npc.vx;

  // Update mood
  if (npc.portfolio > 150) npc.mood = 'euphoric';
  else if (npc.portfolio > 100) npc.mood = 'happy';
  else if (npc.portfolio > 50) npc.mood = 'neutral';
  else npc.mood = 'distressed';
};

const getDialogue = (npc) => {
  const moodDialogues = {
    euphoric: [
      `${NORSE_RUNES.profit} VALHALLA! My gains are LEGENDARY!`,
      'The Allfather smiles upon my trades!',
    ],
    distressed: [
      `${NORSE_RUNES.loss} By Odin's beard... my portfolio...`,
      'Ragnarök comes for us all...',
    ],
  };

  if (moodDialogues[npc.mood]) {
    return moodDialogues[npc.mood][Math.floor(Math.random() * moodDialogues[npc.mood].length)];
  }
  return npc.quotes[Math.floor(Math.random() * npc.quotes.length)] || '...';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DegenerateRealms = ({ onClose }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const cleanupRef = useRef(null);
  const gameStateRef = useRef({
    world: null,
    player: null,
    camera: { x: 0, y: 0 },
    npcs: [],
    enemies: [],
    market: null,
    keys: {},
    mouse: { x: 0, y: 0, buttons: {} },
    showTerminal: false,
    dialogueNpc: null,
    running: true,
  });

  const [stats, setStats] = useState({
    realm: 'MIDGARD',
    wallet: { SOL: 1.0 },
    health: PLAYER_CONFIG.maxHealth,
    fps: 60,
  });
  const [showTerminal, setShowTerminal] = useState(false);
  const [dialogueText, setDialogueText] = useState(null);
  const [marketData, setMarketData] = useState({});

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    const { tileSize } = WORLD_CONFIG;
    const viewWidth = 800;
    const viewHeight = 600;

    // Create PIXI Application
    const app = new PIXI.Application();

    const initApp = async () => {
      try {
        await app.init({
          width: viewWidth,
          height: viewHeight,
          backgroundColor: 0x87ceeb,
          antialias: false,
          resolution: 1,
        });
      } catch (error) {
        console.error('[DegenerateRealms] PIXI initialization failed:', error.message);
        return;
      }

      if (!containerRef.current) {
        console.error('[DegenerateRealms] Container unmounted during init');
        app.destroy(true);
        return;
      }

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Initialize game state with error handling
      const gs = gameStateRef.current;
      try {
        gs.world = WorldGenerator.generate();
      } catch (error) {
        console.error('[DegenerateRealms] World generation failed:', error.message);
        gs.world = Array(WORLD_CONFIG.height).fill(null)
          .map(() => Array(WORLD_CONFIG.width).fill(0));
      }

      try {
        gs.market = new MarketSimulator();
      } catch (error) {
        console.error('[DegenerateRealms] Market initialization failed:', error.message);
        gs.market = { update: () => {}, tick: 0, tokens: {} };
      }

      // Build Viking Hall at spawn location
      const spawnTileX = Math.floor(WORLD_CONFIG.width / 4);
      const hallInfo = WorldGenerator.buildVikingHall(gs.world, spawnTileX, tileSize);

      // Initialize player
      gs.player = {
        x: spawnTileX * tileSize,
        y: (hallInfo.floorY - 2) * tileSize,
        vx: 0,
        vy: 0,
        width: PLAYER_CONFIG.width,
        height: PLAYER_CONFIG.height,
        onGround: false,
        health: PLAYER_CONFIG.maxHealth,
        invincibleUntil: 0,
        damageFlash: 0,
        inventory: { ...PLAYER_CONFIG.startingInventory },
        wallet: { ...PLAYER_CONFIG.startingWallet },
        selectedBlock: 'DIRT',
      };

      // Initialize camera to player position
      gs.camera.x = Math.max(0, Math.min(
        gs.player.x - viewWidth / 2,
        WORLD_CONFIG.width * tileSize - viewWidth
      ));
      gs.camera.y = Math.max(0, Math.min(
        gs.player.y - viewHeight / 2,
        WORLD_CONFIG.height * tileSize - viewHeight
      ));

      // Initialize lighting system
      const lightingManager = new LightingManager(gs.world, WORLD_CONFIG.surfaceLevel);
      lightingManager.initLightMap();
      lightingManager.scanForLightBlocks(BLOCK_TYPES);

      // Spawn friendly villagers in the hall
      for (let i = 0; i < VIKING_HALL_CONFIG.friendlyVillagerCount; i++) {
        const villagerType = ENEMY_TYPES.VILLAGER;
        const villagerX = (hallInfo.leftX + 2 + Math.random() * (hallInfo.rightX - hallInfo.leftX - 4)) * tileSize;
        gs.enemies.push({
          ...villagerType,
          x: villagerX,
          y: (hallInfo.floorY - 2) * tileSize,
          vx: 0,
          vy: 0,
          onGround: false,
          wanderTimer: 0,
        });
      }

      // Spawn enemies across the world
      const enemyTypes = ['BERSERKER', 'TROLL', 'DRAUGR', 'JOTUNN'];
      for (let i = 0; i < 15; i++) {
        const typeKey = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemyType = ENEMY_TYPES[typeKey];
        const spawnX = Math.floor(Math.random() * WORLD_CONFIG.width);

        // Don't spawn enemies near the Viking Hall
        if (Math.abs(spawnX - spawnTileX) < 30) continue;

        const surfaceY = findSurfaceY(gs.world, spawnX);
        gs.enemies.push({
          ...enemyType,
          x: spawnX * tileSize,
          y: (surfaceY - 2) * tileSize,
          vx: 0,
          vy: 0,
          onGround: false,
          wanderTimer: 0,
          health: enemyType.health,
        });
      }

      // Initialize trading NPCs (Norse gods)
      NORSE_AGENTS.forEach((agentConfig) => {
        const spawnZone = NPC_SPAWN_ZONES[agentConfig.id];
        if (!spawnZone) return;

        const npc = {
          ...agentConfig,
          x: (Math.random() * 100 + 50) * tileSize,
          y: spawnZone.y * tileSize,
          vx: 0,
          targetX: null,
          wanderTimer: 0,
          ai: new QLearningAgent(agentConfig.id, {
            learningRate: 0.1 * (1 + agentConfig.personality.wisdom),
            explorationRate: 0.1 + 0.3 * agentConfig.personality.aggression,
          }),
          portfolio: 100,
          positions: {},
          mood: 'neutral',
        };
        gs.npcs.push(npc);
      });

      // Create render layers
      const worldLayer = new PIXI.Container();
      const enemyLayer = new PIXI.Container();
      const npcLayer = new PIXI.Container();
      const playerLayer = new PIXI.Container();
      const uiLayer = new PIXI.Container();

      app.stage.addChild(worldLayer);
      app.stage.addChild(enemyLayer);
      app.stage.addChild(npcLayer);
      app.stage.addChild(playerLayer);
      app.stage.addChild(uiLayer);

      // Create block textures with connectivity variants (16 variants per block type)
      const blockTextures = {};
      const blockTextureVariants = {}; // blockTextureVariants[blockId][connectivity] = texture

      Object.entries(BLOCK_TYPES).forEach(([name, block]) => {
        if (block.id === 0) return;

        const tileConfig = TILE_SPRITES[name] || {
          baseColor: block.color,
          variants: { colors: [block.color] },
          details: {},
        };

        // Create 16 connectivity variants for each block
        blockTextureVariants[block.id] = {};
        for (let conn = 0; conn < 16; conn++) {
          const g = new PIXI.Graphics();
          generateTileSprite(g, tileConfig, conn, tileSize);
          blockTextureVariants[block.id][conn] = app.renderer.generateTexture(g);
          g.destroy();
        }

        // Default texture (fully connected) for backwards compatibility
        blockTextures[block.id] = blockTextureVariants[block.id][15];
      });

      // Player animation state
      const playerState = {
        direction: 'right',
        animState: 'idle',
        frame: 0,
        attackCooldown: 0,
      };

      // Create player graphics with Viking theme
      const createPlayerGraphics = (state, direction, frame) => {
        const g = new PIXI.Graphics();
        const w = gs.player.width;
        const h = gs.player.height;
        const colors = PLAYER_SPRITES.colors;

        // Body
        g.rect(0, 8, w, h - 8);
        g.fill(colors.body);
        g.stroke({ width: 2, color: colors.outline });

        // Head
        g.rect(2, 4, w - 4, 10);
        g.fill(colors.skin);

        // Viking Helmet
        g.rect(0, 0, w, 8);
        g.fill(0x808080);
        g.stroke({ width: 1, color: 0x606060 });

        // Helmet horns
        g.moveTo(2, 4);
        g.lineTo(-3, -4);
        g.lineTo(0, -2);
        g.fill(0xffd700);

        g.moveTo(w - 2, 4);
        g.lineTo(w + 3, -4);
        g.lineTo(w, -2);
        g.fill(0xffd700);

        // Eyes
        const eyeOffset = direction === 'right' ? 1 : -1;
        g.circle(5 + eyeOffset, 8, 2);
        g.circle(11 + eyeOffset, 8, 2);
        g.fill(colors.eyeWhite);
        g.circle(5 + eyeOffset * 1.5, 8, 1);
        g.circle(11 + eyeOffset * 1.5, 8, 1);
        g.fill(colors.eyes);

        // Beard
        g.rect(4, 12, 8, 4);
        g.fill(colors.hair);

        // Arm with weapon (if attacking)
        if (state === 'attack') {
          const armX = direction === 'right' ? w : 0;
          const swing = Math.sin(frame * 0.8) * 0.8;
          const weaponX = armX + (direction === 'right' ? 8 : -8) * Math.cos(swing);
          const weaponY = h / 2 + 8 * Math.sin(swing);

          // Arm
          g.moveTo(armX, h / 2);
          g.lineTo(weaponX, weaponY);
          g.stroke({ width: 3, color: colors.skin });

          // Pickaxe/Weapon
          g.moveTo(weaponX, weaponY);
          g.lineTo(weaponX + (direction === 'right' ? 6 : -6), weaponY - 6);
          g.stroke({ width: 2, color: 0x808080 });
          g.rect(weaponX + (direction === 'right' ? 4 : -8), weaponY - 8, 4, 4);
          g.fill(0xa0522d);
        }

        // Walking legs animation
        if (state === 'walk') {
          const legOffset = Math.sin(frame * 0.3) * 3;
          g.moveTo(w / 2 - 3, h);
          g.lineTo(w / 2 - 3 + legOffset, h + 2);
          g.stroke({ width: 3, color: colors.body });
          g.moveTo(w / 2 + 3, h);
          g.lineTo(w / 2 + 3 - legOffset, h + 2);
          g.stroke({ width: 3, color: colors.body });
        }

        return g;
      };

      const playerGraphics = createPlayerGraphics('idle', 'right', 0);
      playerLayer.addChild(playerGraphics);

      // Create NPC sprites
      const npcSprites = gs.npcs.map((npc) => {
        const container = new PIXI.Container();

        // Body
        const body = new PIXI.Graphics();
        const color = parseInt(npc.color.replace('#', ''), 16) || 0xffffff;
        body.rect(0, 0, 16, 32);
        body.fill(color);
        body.stroke({ width: 2, color: 0x000000 });
        container.addChild(body);

        // Name tag
        const nameText = new PIXI.Text({
          text: npc.name.split(' ')[0],
          style: { fontSize: 10, fill: 0xffffff },
        });
        nameText.anchor.set(0.5, 1);
        nameText.x = 8;
        nameText.y = -5;
        container.addChild(nameText);

        // Avatar
        const avatarText = new PIXI.Text({
          text: npc.avatar,
          style: { fontSize: 16 },
        });
        avatarText.anchor.set(0.5, 1);
        avatarText.x = 8;
        avatarText.y = -18;
        container.addChild(avatarText);

        npcLayer.addChild(container);
        return container;
      });

      // Create world tile sprites (chunked for performance)
      const worldSprites = new PIXI.Container();
      worldLayer.addChild(worldSprites);

      // Sprite pool for tile rendering (reduces GC pressure)
      const spritePool = {
        pool: [],
        activeCount: 0,
        get() {
          if (this.activeCount < this.pool.length) {
            const sprite = this.pool[this.activeCount];
            sprite.visible = true;
            this.activeCount++;
            return sprite;
          }
          const sprite = new PIXI.Sprite();
          this.pool.push(sprite);
          worldSprites.addChild(sprite);
          this.activeCount++;
          return sprite;
        },
        reset() {
          for (let i = 0; i < this.activeCount; i++) {
            this.pool[i].visible = false;
          }
          this.activeCount = 0;
        },
      };

      // Create enemy sprites with enhanced details
      const enemySprites = new Map();
      const createEnemySprite = (enemy) => {
        const container = new PIXI.Container();
        const w = enemy.width;
        const h = enemy.height;

        // Get sprite config for this enemy type
        const spriteConfig = ENEMY_SPRITES[enemy.id?.toUpperCase()] || {};
        const details = spriteConfig.details || {};

        // Body
        const body = new PIXI.Graphics();
        body.rect(0, 0, w, h);
        body.fill(enemy.color);
        body.stroke({ width: 2, color: 0x000000 });

        // Add details based on enemy type
        if (details.hasHelmet) {
          body.rect(0, 0, w, h * 0.25);
          body.fill(details.helmetColor || 0x808080);
        }

        if (details.undead) {
          // Tattered appearance
          for (let i = 0; i < 3; i++) {
            const tearX = Math.random() * w * 0.3;
            const tearY = h * 0.3 + Math.random() * h * 0.5;
            body.rect(tearX, tearY, 3, 2);
            body.fill(0x000000);
          }
        }

        if (details.giant) {
          // Ice patches for Frost Giant
          for (let i = 0; i < 4; i++) {
            const iceX = Math.random() * (w - 6) + 3;
            const iceY = Math.random() * (h - 6) + 3;
            body.circle(iceX, iceY, 4);
            body.fill(details.auraColor || 0x87ceeb);
          }
        }

        container.addChild(body);

        // Eyes
        const eyeY = h * 0.2;
        const eyeGraphics = new PIXI.Graphics();
        const eyeColor = details.glowingEyes || details.eyeGlow
          ? (details.eyeColor || details.eyeGlow || 0xff0000)
          : 0xffffff;

        eyeGraphics.circle(w * 0.3, eyeY, Math.max(2, w * 0.08));
        eyeGraphics.circle(w * 0.7, eyeY, Math.max(2, w * 0.08));
        eyeGraphics.fill(eyeColor);

        if (!details.glowingEyes && !details.eyeGlow) {
          eyeGraphics.circle(w * 0.3, eyeY, Math.max(1, w * 0.04));
          eyeGraphics.circle(w * 0.7, eyeY, Math.max(1, w * 0.04));
          eyeGraphics.fill(0x000000);
        }
        container.addChild(eyeGraphics);

        // Weapon
        if (details.hasAxe) {
          const weapon = new PIXI.Graphics();
          weapon.rect(w + 2, h * 0.2, 4, h * 0.4);
          weapon.fill(0x654321);
          weapon.rect(w + 1, h * 0.15, 6, 4);
          weapon.fill(details.axeColor || 0x808080);
          container.addChild(weapon);
        }

        if (details.hasClub) {
          const weapon = new PIXI.Graphics();
          weapon.rect(w + 2, h * 0.2, 6, h * 0.5);
          weapon.fill(details.clubColor || 0x654321);
          container.addChild(weapon);
        }

        if (details.hasSword) {
          const weapon = new PIXI.Graphics();
          weapon.rect(w + 2, h * 0.2, 3, h * 0.35);
          weapon.fill(0xc0c0c0);
          container.addChild(weapon);
        }

        if (details.hasShield) {
          const shield = new PIXI.Graphics();
          shield.rect(-6, h * 0.25, 5, h * 0.3);
          shield.fill(details.armorColor || 0x556b2f);
          shield.stroke({ width: 1, color: 0x000000 });
          container.addChild(shield);
        }

        // Friendly indicator (beard for villagers)
        if (details.friendly && details.hasBeard) {
          const beard = new PIXI.Graphics();
          beard.rect(w * 0.25, h * 0.35, w * 0.5, h * 0.15);
          beard.fill(details.beardColor || 0x8b4513);
          container.addChild(beard);
        }

        // Frost aura effect
        if (details.frostAura) {
          const aura = new PIXI.Graphics();
          aura.rect(-4, -4, w + 8, h + 8);
          aura.stroke({ width: 2, color: details.auraColor || 0x87ceeb, alpha: 0.5 });
          container.addChild(aura);
        }

        // Health bar background
        const healthBarBg = new PIXI.Graphics();
        healthBarBg.rect(0, -10, w, 6);
        healthBarBg.fill(0x333333);
        healthBarBg.stroke({ width: 1, color: 0x000000 });
        container.addChild(healthBarBg);

        // Health bar fill
        const healthBarFill = new PIXI.Graphics();
        healthBarFill.rect(1, -9, w - 2, 4);
        healthBarFill.fill(enemy.hostile ? 0xff0000 : 0x00ff00);
        container.addChild(healthBarFill);
        container.healthBar = healthBarFill;
        container.maxHealth = enemy.health;
        container.enemyWidth = w;

        // Name tag
        const nameText = new PIXI.Text({
          text: enemy.name,
          style: { fontSize: 8, fill: enemy.hostile ? 0xff6666 : 0x66ff66 },
        });
        nameText.anchor.set(0.5, 1);
        nameText.x = w / 2;
        nameText.y = -14;
        container.addChild(nameText);

        enemyLayer.addChild(container);
        return container;
      };

      // Initialize enemy sprites
      gs.enemies.forEach((enemy, i) => {
        const sprite = createEnemySprite(enemy);
        enemySprites.set(i, sprite);
      });

      // HUD elements
      const hudBg = new PIXI.Graphics();
      hudBg.rect(viewWidth - 160, 10, 150, 90);
      hudBg.fill({ color: 0x000000, alpha: 0.7 });
      hudBg.stroke({ width: 2, color: 0xffd700 });
      uiLayer.addChild(hudBg);

      const walletText = new PIXI.Text({
        text: 'SOL: 1.0000',
        style: { fontSize: 14, fill: 0x9400d3 },
      });
      walletText.x = viewWidth - 150;
      walletText.y = 20;
      uiLayer.addChild(walletText);

      const realmText = new PIXI.Text({
        text: 'Realm: MIDGARD',
        style: { fontSize: 14, fill: 0xffffff },
      });
      realmText.x = viewWidth - 150;
      realmText.y = 40;
      uiLayer.addChild(realmText);

      // Health bar
      const healthBarBgUI = new PIXI.Graphics();
      healthBarBgUI.rect(viewWidth - 150, 60, 140, 16);
      healthBarBgUI.fill(0x333333);
      healthBarBgUI.stroke({ width: 1, color: 0xff0000 });
      uiLayer.addChild(healthBarBgUI);

      const healthBarUI = new PIXI.Graphics();
      healthBarUI.rect(viewWidth - 148, 62, 136, 12);
      healthBarUI.fill(0xff0000);
      uiLayer.addChild(healthBarUI);

      const healthText = new PIXI.Text({
        text: '100/100',
        style: { fontSize: 10, fill: 0xffffff },
      });
      healthText.x = viewWidth - 110;
      healthText.y = 62;
      uiLayer.addChild(healthText);

      // Hotbar
      const hotbar = new PIXI.Container();
      hotbar.y = viewHeight - 60;
      hotbar.x = 50;
      uiLayer.addChild(hotbar);

      const hotbarBlocks = ['GRASS', 'DIRT', 'STONE', 'GOLD_BRICK'];
      hotbarBlocks.forEach((blockName, i) => {
        const block = BLOCK_TYPES[blockName];
        const slot = new PIXI.Graphics();
        slot.rect(i * 55, 0, 50, 50);
        slot.fill(block.color);
        slot.stroke({ width: 2, color: 0xffffff });
        hotbar.addChild(slot);
      });

      // Initial render of world tiles with connectivity (using sprite pool)
      const renderWorld = () => {
        spritePool.reset();
        const startTx = Math.max(0, Math.floor(gs.camera.x / tileSize));
        const endTx = Math.min(WORLD_CONFIG.width, startTx + Math.ceil(viewWidth / tileSize) + 2);
        const startTy = Math.max(0, Math.floor(gs.camera.y / tileSize));
        const endTy = Math.min(WORLD_CONFIG.height, startTy + Math.ceil(viewHeight / tileSize) + 2);

        for (let ty = startTy; ty < endTy; ty++) {
          for (let tx = startTx; tx < endTx; tx++) {
            const blockId = gs.world[ty]?.[tx];
            if (blockId && blockId !== 0) {
              // Calculate connectivity for this tile
              const connectivity = getConnectivityMask(gs.world, tx, ty, blockId);

              // Get the appropriate texture variant
              let texture;
              if (blockTextureVariants[blockId] && blockTextureVariants[blockId][connectivity]) {
                texture = blockTextureVariants[blockId][connectivity];
              } else if (blockTextures[blockId]) {
                texture = blockTextures[blockId];
              }

              if (texture) {
                const sprite = spritePool.get();
                sprite.texture = texture;
                sprite.x = tx * tileSize - gs.camera.x;
                sprite.y = ty * tileSize - gs.camera.y;
                sprite.tint = 0xffffff; // Reset tint
              }
            }
          }
        }
      };

      // Set initial player position and render first frame
      playerGraphics.x = gs.player.x - gs.camera.x;
      playerGraphics.y = gs.player.y - gs.camera.y;
      renderWorld();

      // Game loop with error handling
      const gameLoop = (delta) => {
        if (!gs.running) return;

        try {
          const dt = delta.deltaTime / 60;

          // Update market
          gs.market.update();

        // Update player physics
        updatePlayer(gs, dt, tileSize);

        // Update NPCs
        gs.npcs.forEach((npc, i) => {
          updateNpc(npc, gs, dt, tileSize);
          // Update sprite position
          npcSprites[i].x = npc.x - gs.camera.x;
          npcSprites[i].y = npc.y - gs.camera.y;
          npcSprites[i].visible = (
            npc.x > gs.camera.x - 50 &&
            npc.x < gs.camera.x + viewWidth + 50 &&
            npc.y > gs.camera.y - 50 &&
            npc.y < gs.camera.y + viewHeight + 50
          );
        });

        // Update enemies
        gs.enemies.forEach((enemy, i) => {
          if (enemy.health <= 0) {
            // Hide dead enemies
            const sprite = enemySprites.get(i);
            if (sprite) sprite.visible = false;
            return;
          }

          updateEnemy(enemy, gs, dt, tileSize);

          // Update enemy sprite position
          const sprite = enemySprites.get(i);
          if (sprite) {
            sprite.x = enemy.x - gs.camera.x;
            sprite.y = enemy.y - gs.camera.y;
            sprite.visible = (
              enemy.x > gs.camera.x - 100 &&
              enemy.x < gs.camera.x + viewWidth + 100 &&
              enemy.y > gs.camera.y - 100 &&
              enemy.y < gs.camera.y + viewHeight + 100
            );

            // Update health bar
            if (sprite.healthBar) {
              const healthPercent = enemy.health / sprite.maxHealth;
              const barWidth = sprite.enemyWidth || enemy.width;
              sprite.healthBar.clear();
              sprite.healthBar.rect(1, -9, (barWidth - 2) * healthPercent, 4);
              sprite.healthBar.fill(enemy.hostile ? 0xff0000 : 0x00ff00);
            }
          }
        });

        // Check combat collisions
        checkCombatCollisions(gs, tileSize);

        // Update camera
        gs.camera.x = Math.max(0, Math.min(
          gs.player.x - viewWidth / 2,
          WORLD_CONFIG.width * tileSize - viewWidth
        ));
        gs.camera.y = Math.max(0, Math.min(
          gs.player.y - viewHeight / 2,
          WORLD_CONFIG.height * tileSize - viewHeight
        ));

        // Update player animation state
        const isMoving = Math.abs(gs.player.vx) > 0.5;
        const isJumping = !gs.player.onGround && gs.player.vy < 0;
        const isFalling = !gs.player.onGround && gs.player.vy > 0;

        if (gs.player.vx > 0.5) playerState.direction = 'right';
        else if (gs.player.vx < -0.5) playerState.direction = 'left';

        if (playerState.attackCooldown > 0) {
          playerState.animState = 'attack';
          playerState.attackCooldown--;
        } else if (isJumping) {
          playerState.animState = 'jump';
        } else if (isFalling) {
          playerState.animState = 'fall';
        } else if (isMoving) {
          playerState.animState = 'walk';
          playerState.frame += 0.5;
        } else {
          playerState.animState = 'idle';
          playerState.frame = 0;
        }

        // Update player sprite position and graphics
        playerGraphics.x = gs.player.x - gs.camera.x;
        playerGraphics.y = gs.player.y - gs.camera.y;

        // Flip player based on direction
        playerGraphics.scale.x = playerState.direction === 'left' ? -1 : 1;
        if (playerState.direction === 'left') {
          playerGraphics.x += gs.player.width;
        }

        // Update world tiles (only visible) with connectivity and lighting
        spritePool.reset();
        const startTx = Math.max(0, Math.floor(gs.camera.x / tileSize));
        const endTx = Math.min(WORLD_CONFIG.width, startTx + Math.ceil(viewWidth / tileSize) + 2);
        const startTy = Math.max(0, Math.floor(gs.camera.y / tileSize));
        const endTy = Math.min(WORLD_CONFIG.height, startTy + Math.ceil(viewHeight / tileSize) + 2);

        // Update lighting for visible area
        const gameTime = gs.market.tick;
        lightingManager.updateLightMap(startTx, startTy, endTx - startTx, endTy - startTy, gameTime);

        for (let ty = startTy; ty < endTy; ty++) {
          for (let tx = startTx; tx < endTx; tx++) {
            const blockId = gs.world[ty]?.[tx];
            if (blockId && blockId !== 0) {
              // Calculate connectivity for this tile
              const connectivity = getConnectivityMask(gs.world, tx, ty, blockId);

              // Get the appropriate texture variant
              let texture;
              if (blockTextureVariants[blockId] && blockTextureVariants[blockId][connectivity]) {
                texture = blockTextureVariants[blockId][connectivity];
              } else if (blockTextures[blockId]) {
                texture = blockTextures[blockId];
              }

              if (texture) {
                const sprite = spritePool.get();
                sprite.texture = texture;
                sprite.x = tx * tileSize - gs.camera.x;
                sprite.y = ty * tileSize - gs.camera.y;

                // Apply lighting tint
                const lightLevel = lightingManager.getLightAt(tx, ty);
                const brightness = Math.floor(lightLevel * 255);
                sprite.tint = (brightness << 16) | (brightness << 8) | brightness;
              }
            }
          }
        }

        // Update sky color based on realm
        const playerTileY = Math.floor(gs.player.y / tileSize);
        let currentRealm = 'MIDGARD';
        if (playerTileY < 50) currentRealm = 'ASGARD';
        else if (playerTileY > 170) currentRealm = 'HELHEIM';

        const realmColors = {
          ASGARD: 0xffd796,
          MIDGARD: 0x87ceeb,
          HELHEIM: 0x281428,
        };
        app.renderer.background.color = realmColors[currentRealm];

        // Update HUD
        walletText.text = `SOL: ${gs.player.wallet.SOL.toFixed(4)}`;
        realmText.text = `Realm: ${currentRealm}`;

        // Update player health bar
        const healthPercent = Math.max(0, gs.player.health / PLAYER_CONFIG.maxHealth);
        healthBarUI.clear();
        healthBarUI.rect(viewWidth - 148, 62, 136 * healthPercent, 12);
        healthBarUI.fill(healthPercent > 0.3 ? 0xff0000 : 0xff4444);
        healthText.text = `${Math.max(0, gs.player.health)}/${PLAYER_CONFIG.maxHealth}`;

        // Damage flash effect on player
        const now = Date.now();
        if (gs.player.damageFlash && now < gs.player.damageFlash) {
          playerGraphics.tint = 0xff0000;
        } else {
          playerGraphics.tint = 0xffffff;
        }

        // Check player death
        if (gs.player.health <= 0) {
          // Respawn player
          gs.player.health = PLAYER_CONFIG.maxHealth;
          gs.player.x = Math.floor(WORLD_CONFIG.width / 4) * tileSize;
          gs.player.y = (WORLD_CONFIG.surfaceLevel - 2) * tileSize;
          gs.player.vx = 0;
          gs.player.vy = 0;
          // Lose some wallet on death
          gs.player.wallet.SOL = Math.max(0, gs.player.wallet.SOL * 0.9);
        }

        // Update React state periodically
        if (gs.market.tick % 30 === 0) {
          setStats({
            realm: currentRealm,
            wallet: { ...gs.player.wallet },
            health: gs.player.health,
            fps: Math.round(app.ticker.FPS),
          });
          setMarketData({ ...gs.market.tokens });
        }
        } catch (error) {
          console.error('[DegenerateRealms] Game loop error:', error.message);
          // Don't crash the game - just skip this frame
        }
      };

      app.ticker.add(gameLoop);

      // Input handlers - prevent default to stop events from bubbling to terminal
      const handleKeyDown = (e) => {
        // Prevent default for game control keys to stop them from affecting the terminal
        const gameKeys = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyT', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
        if (gameKeys.includes(e.code)) {
          e.preventDefault();
          e.stopPropagation();
        }

        gs.keys[e.code] = true;

        if (e.code === 'KeyT') {
          gs.showTerminal = !gs.showTerminal;
          setShowTerminal(gs.showTerminal);
        }

        if (e.code === 'KeyE') {
          // Find nearby NPC
          for (const npc of gs.npcs) {
            const dist = Math.sqrt((npc.x - gs.player.x) ** 2 + (npc.y - gs.player.y) ** 2);
            if (dist < 80) {
              setDialogueText({
                name: npc.name,
                avatar: npc.avatar,
                text: getDialogue(npc),
                portfolio: npc.portfolio,
                trades: npc.ai.trades,
                winRate: npc.ai.trades > 0 ? (npc.ai.wins / npc.ai.trades * 100).toFixed(1) : 0,
              });
              break;
            }
          }
        }

        if (e.code === 'Escape') {
          setDialogueText(null);
          setShowTerminal(false);
          gs.showTerminal = false;
        }

        if (e.code === 'Digit1') gs.player.selectedBlock = 'GRASS';
        if (e.code === 'Digit2') gs.player.selectedBlock = 'DIRT';
        if (e.code === 'Digit3') gs.player.selectedBlock = 'STONE';
        if (e.code === 'Digit4') gs.player.selectedBlock = 'GOLD_BRICK';
      };

      const handleKeyUp = (e) => {
        gs.keys[e.code] = false;
      };

      // Focus the container when component mounts to receive keyboard events
      if (containerRef.current) {
        containerRef.current.focus();
      }

      const handleMouseDown = (e) => {
        if (gs.showTerminal) return;

        const rect = app.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldX = mx + gs.camera.x;
        const worldY = my + gs.camera.y;
        const wx = Math.floor(worldX / tileSize);
        const wy = Math.floor(worldY / tileSize);

        if (e.button === 0) {
          // Left click - attack enemies first, then mine blocks
          playerState.attackCooldown = 15; // Animation frames for attack
          const hitEnemy = playerAttack(gs, tileSize);

          if (!hitEnemy && wx >= 0 && wx < WORLD_CONFIG.width && wy >= 0 && wy < WORLD_CONFIG.height) {
            // Mine block
            const blockId = gs.world[wy][wx];
            if (blockId !== 0) {
              const block = getBlockById(blockId);
              const blockName = Object.keys(BLOCK_TYPES).find(k => BLOCK_TYPES[k].id === blockId);
              if (blockName) {
                gs.player.inventory[blockName] = (gs.player.inventory[blockName] || 0) + 1;
              }
              if (block.ore && block.value) {
                gs.player.wallet.SOL = (gs.player.wallet.SOL || 0) + block.value;
              }
              gs.world[wy][wx] = 0;
              // Invalidate light cache for this column
              lightingManager.invalidateColumn(wx);
            }
          }
        } else if (e.button === 2) {
          // Right click - place block
          if (wx >= 0 && wx < WORLD_CONFIG.width && wy >= 0 && wy < WORLD_CONFIG.height) {
            if (gs.world[wy][wx] === 0) {
              const block = BLOCK_TYPES[gs.player.selectedBlock];
              if (block && (gs.player.inventory[gs.player.selectedBlock] || 0) > 0) {
                gs.world[wy][wx] = block.id;
                gs.player.inventory[gs.player.selectedBlock]--;
                // Invalidate light cache for this column
                lightingManager.invalidateColumn(wx);
              }
            }
          }
        }
      };

      const handleContextMenu = (e) => e.preventDefault();

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      app.canvas.addEventListener('mousedown', handleMouseDown);
      app.canvas.addEventListener('contextmenu', handleContextMenu);

      // Store cleanup handlers in ref for proper cleanup
      cleanupRef.current = {
        handleKeyDown,
        handleKeyUp,
        handleMouseDown,
        handleContextMenu,
      };
    };

    initApp().catch((error) => {
      console.error('[DegenerateRealms] Initialization failed:', {
        error: error.message,
        stack: error.stack,
      });
    });

    // Single cleanup function that handles everything
    return () => {
      const gs = gameStateRef.current;
      gs.running = false;

      // Remove event listeners using stored references
      const handlers = cleanupRef.current;
      if (handlers) {
        window.removeEventListener('keydown', handlers.handleKeyDown);
        window.removeEventListener('keyup', handlers.handleKeyUp);
      }

      // Safely destroy PIXI app (only once)
      if (appRef.current && !appRef.current.destroyed) {
        try {
          const canvas = appRef.current.canvas;
          if (handlers && canvas) {
            canvas.removeEventListener('mousedown', handlers.handleMouseDown);
            canvas.removeEventListener('contextmenu', handlers.handleContextMenu);
          }
          appRef.current.destroy(true);
        } catch (error) {
          console.error('[DegenerateRealms] Cleanup error:', error.message);
        }
        appRef.current = null;
      }

      cleanupRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="relative">
        {/* Game Canvas */}
        <div
          ref={containerRef}
          className="border-4 border-yellow-500 rounded-lg overflow-hidden outline-none"
          style={{ width: 800, height: 600 }}
          tabIndex={0}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded z-10"
        >
          ✕ Close
        </button>

        {/* Stats Overlay */}
        <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded text-sm">
          <div className="text-yellow-400 font-bold">DEGENERATE REALMS</div>
          <div className="text-purple-400">Realm: {stats.realm}</div>
          <div className="text-green-400">FPS: {stats.fps}</div>
        </div>

        {/* Controls Help */}
        <div className="absolute bottom-2 left-2 bg-black/80 text-white p-2 rounded text-xs">
          <div>A/D: Move | W/Space: Jump | Click: Mine | Right-click: Place</div>
          <div>T: Terminal | E: Talk to NPC | 1-4: Select block</div>
        </div>

        {/* Trading Terminal Overlay */}
        {showTerminal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-4 w-96">
              <h2 className="text-yellow-400 text-xl font-bold mb-4 text-center">
                {NORSE_RUNES.profit} BIFROST EXCHANGE {NORSE_RUNES.profit}
              </h2>

              <div className="space-y-2">
                {Object.entries(marketData).map(([symbol, data]) => (
                  <div key={symbol} className="flex justify-between text-white">
                    <span className={data.trend > 0 ? 'text-green-400' : data.trend < 0 ? 'text-red-400' : 'text-white'}>
                      {data.trend > 0 ? '📈' : data.trend < 0 ? '📉' : '➡️'} {symbol}
                    </span>
                    <span>${data.price?.toFixed(6) || '0.000000'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-yellow-400">
                  Portfolio: {stats.wallet?.SOL?.toFixed(4) || '0.0000'} SOL
                </div>
              </div>

              <div className="mt-4 text-center text-gray-400 text-sm">
                Press T or ESC to close
              </div>
            </div>
          </div>
        )}

        {/* Dialogue Overlay */}
        {dialogueText && (
          <div className="absolute bottom-20 left-4 right-4 bg-gray-900/95 border-2 border-yellow-500 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{dialogueText.avatar}</span>
              <span className="text-yellow-400 font-bold">{dialogueText.name}</span>
            </div>
            <p className="text-white mb-2">{dialogueText.text}</p>
            <div className="text-gray-400 text-sm">
              Portfolio: {dialogueText.portfolio?.toFixed(2)} SOL |
              Trades: {dialogueText.trades} |
              Win Rate: {dialogueText.winRate}%
            </div>
            <div className="text-gray-500 text-xs mt-2">Press E for new dialogue, ESC to close</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DegenerateRealms;
