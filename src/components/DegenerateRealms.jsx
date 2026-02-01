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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { NORSE_AGENTS, NORSE_RUNES } from '../config/degenerateTown';
import {
  REALM_BIOMES,
  BLOCK_TYPES,
  WORLD_CONFIG,
  PLAYER_CONFIG,
  NPC_SPAWN_ZONES,
  MARKET_CONFIG,
  UI_CONFIG,
  getBlockById,
} from '../config/degenerateRealms';

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

      for (let dx = -iw / 2; dx < iw / 2; dx++) {
        for (let dy = 0; dy < ih; dy++) {
          const wx = Math.floor(ix + dx);
          const wy = Math.floor(iy + dy);
          if (wx >= 0 && wx < width && wy >= 0 && wy < height) {
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

      for (let y = config.minY; y < Math.min(config.maxY, height); y++) {
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
        for (let dy = -radius / 2; dy <= radius / 2; dy++) {
          const dist = Math.sqrt(dx * dx + (dy * 2) ** 2);
          if (dist < radius * (0.7 + Math.random() * 0.3)) {
            const wx = cx + dx;
            const wy = cy + dy;
            if (wx >= 0 && wx < width && wy >= 0 && wy < height) {
              world[wy][wx] = 0;
            }
          }
        }
      }
    }

    return world;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DegenerateRealms = ({ onClose }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const gameStateRef = useRef({
    world: null,
    player: null,
    camera: { x: 0, y: 0 },
    npcs: [],
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
      await app.init({
        width: viewWidth,
        height: viewHeight,
        backgroundColor: 0x87ceeb,
        antialias: false,
        resolution: 1,
      });

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Initialize game state
      const gs = gameStateRef.current;
      gs.world = WorldGenerator.generate();
      gs.market = new MarketSimulator();

      // Initialize player
      gs.player = {
        x: WORLD_CONFIG.width * tileSize / 4,
        y: WORLD_CONFIG.surfaceLevel * tileSize - 64,
        vx: 0,
        vy: 0,
        width: PLAYER_CONFIG.width,
        height: PLAYER_CONFIG.height,
        onGround: false,
        inventory: { ...PLAYER_CONFIG.startingInventory },
        wallet: { ...PLAYER_CONFIG.startingWallet },
        selectedBlock: 'DIRT',
      };

      // Find spawn point
      for (let y = WORLD_CONFIG.surfaceLevel - 10; y < WORLD_CONFIG.surfaceLevel + 20; y++) {
        const spawnX = Math.floor(WORLD_CONFIG.width / 4);
        if (gs.world[y] && gs.world[y][spawnX] !== 0) {
          gs.player.y = (y - 2) * tileSize;
          break;
        }
      }

      // Initialize NPCs
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
      const npcLayer = new PIXI.Container();
      const playerLayer = new PIXI.Container();
      const uiLayer = new PIXI.Container();

      app.stage.addChild(worldLayer);
      app.stage.addChild(npcLayer);
      app.stage.addChild(playerLayer);
      app.stage.addChild(uiLayer);

      // Create block textures
      const blockTextures = {};
      Object.entries(BLOCK_TYPES).forEach(([name, block]) => {
        if (block.id === 0) return;
        const g = new PIXI.Graphics();
        g.rect(0, 0, tileSize, tileSize);
        g.fill(block.color);
        g.stroke({ width: 1, color: 0x000000, alpha: 0.3 });
        blockTextures[block.id] = app.renderer.generateTexture(g);
        g.destroy();
      });

      // Create player graphics
      const playerGraphics = new PIXI.Graphics();
      playerGraphics.rect(0, 0, gs.player.width, gs.player.height);
      playerGraphics.fill(0x0096ff);
      playerGraphics.stroke({ width: 2, color: 0x0064c8 });
      // Eyes
      playerGraphics.circle(5, 6, 3);
      playerGraphics.circle(11, 6, 3);
      playerGraphics.fill(0xffffff);
      playerGraphics.circle(6, 6, 1.5);
      playerGraphics.circle(12, 6, 1.5);
      playerGraphics.fill(0x000000);
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

      // HUD elements
      const hudBg = new PIXI.Graphics();
      hudBg.rect(viewWidth - 160, 10, 150, 70);
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
      realmText.y = 45;
      uiLayer.addChild(realmText);

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

      // Game loop
      const gameLoop = (delta) => {
        if (!gs.running) return;

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

        // Update camera
        gs.camera.x = Math.max(0, Math.min(
          gs.player.x - viewWidth / 2,
          WORLD_CONFIG.width * tileSize - viewWidth
        ));
        gs.camera.y = Math.max(0, Math.min(
          gs.player.y - viewHeight / 2,
          WORLD_CONFIG.height * tileSize - viewHeight
        ));

        // Update player sprite
        playerGraphics.x = gs.player.x - gs.camera.x;
        playerGraphics.y = gs.player.y - gs.camera.y;

        // Update world tiles (only visible)
        worldSprites.removeChildren();
        const startTx = Math.max(0, Math.floor(gs.camera.x / tileSize));
        const endTx = Math.min(WORLD_CONFIG.width, startTx + Math.ceil(viewWidth / tileSize) + 2);
        const startTy = Math.max(0, Math.floor(gs.camera.y / tileSize));
        const endTy = Math.min(WORLD_CONFIG.height, startTy + Math.ceil(viewHeight / tileSize) + 2);

        for (let ty = startTy; ty < endTy; ty++) {
          for (let tx = startTx; tx < endTx; tx++) {
            const blockId = gs.world[ty]?.[tx];
            if (blockId && blockId !== 0 && blockTextures[blockId]) {
              const sprite = new PIXI.Sprite(blockTextures[blockId]);
              sprite.x = tx * tileSize - gs.camera.x;
              sprite.y = ty * tileSize - gs.camera.y;
              worldSprites.addChild(sprite);
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

        // Update React state periodically
        if (gs.market.tick % 30 === 0) {
          setStats({
            realm: currentRealm,
            wallet: { ...gs.player.wallet },
            fps: Math.round(app.ticker.FPS),
          });
          setMarketData({ ...gs.market.tokens });
        }
      };

      app.ticker.add(gameLoop);

      // Input handlers
      const handleKeyDown = (e) => {
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

      const handleMouseDown = (e) => {
        if (gs.showTerminal) return;

        const rect = app.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wx = Math.floor((mx + gs.camera.x) / tileSize);
        const wy = Math.floor((my + gs.camera.y) / tileSize);

        if (wx >= 0 && wx < WORLD_CONFIG.width && wy >= 0 && wy < WORLD_CONFIG.height) {
          if (e.button === 0) {
            // Mine
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
            }
          } else if (e.button === 2) {
            // Place
            if (gs.world[wy][wx] === 0) {
              const block = BLOCK_TYPES[gs.player.selectedBlock];
              if (block && (gs.player.inventory[gs.player.selectedBlock] || 0) > 0) {
                gs.world[wy][wx] = block.id;
                gs.player.inventory[gs.player.selectedBlock]--;
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

      // Cleanup function
      return () => {
        gs.running = false;
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        app.canvas.removeEventListener('mousedown', handleMouseDown);
        app.canvas.removeEventListener('contextmenu', handleContextMenu);
        app.destroy(true);
      };
    };

    initApp();

    return () => {
      gameStateRef.current.running = false;
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, []);

  // Player update function
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

  const updateNpc = (npc, gs, dt, tileSize) => {
    // Trading decision
    if (Math.random() < 0.01 * (1 + npc.personality.aggression)) {
      const token = Object.keys(gs.market.tokens)[Math.floor(Math.random() * Object.keys(gs.market.tokens).length)];
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

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="relative">
        {/* Game Canvas */}
        <div
          ref={containerRef}
          className="border-4 border-yellow-500 rounded-lg overflow-hidden"
          style={{ width: 800, height: 600 }}
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
