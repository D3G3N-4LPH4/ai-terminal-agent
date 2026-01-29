/**
 * DegenerateTownUltimate - The Ultimate Norse AI Trading Visualization
 *
 * Combines the best features from all previous implementations:
 * - PixiJS-based rendering with optimized layers
 * - Interactive town zones (Market Square, Valhalla, Helheim, Bifrost, Asgard)
 * - Clickable agents with Q-table display and detailed stats
 * - Rich particle systems for trades and market events
 * - Animated Norse buildings (Odin's Hall, Thor's Forge)
 * - Dynamic realm-based agent positioning based on performance
 * - Ragnarok screen effects (shake, flash, fire particles)
 * - Real-time leaderboard and market HUD
 * - Floating runes and twinkling stars
 * - Sound-ready event hooks
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import degenerateTownService from '../services/DegenerateTownService';
import { NORSE_AGENTS, MARKET_EVENTS, REALM_TYPES, NORSE_RUNES } from '../config/degenerateTown';

// ============================================================================
// CONFIGURATION
// ============================================================================

const THEME = {
  background: 0x0a0e17,
  primary: 0x00ff41,
  secondary: 0x1a1f3a,
  accent: 0xffaa00,
  danger: 0xff0000,
  success: 0x00ff00,
  gold: 0xffd700,
  silver: 0xc0c0c0,
  bronze: 0xcd7f32,
};

// Town Zones - Interactive areas where agents congregate
const ZONES = {
  ASGARD: {
    name: 'Asgard',
    rune: 'ᚨ',
    color: 0x2a2f4a,
    description: 'Realm of the Gods',
    position: { x: 0.5, y: 0.12 },
    size: { w: 0.25, h: 0.12 },
  },
  VALHALLA: {
    name: 'Valhalla',
    rune: 'ᚠ',
    color: 0x3a2f1a,
    description: 'Hall of Champions',
    position: { x: 0.82, y: 0.18 },
    size: { w: 0.16, h: 0.18 },
  },
  MARKET_SQUARE: {
    name: 'Market Square',
    rune: 'ᛗ',
    color: 0x1a3a2a,
    description: 'Trading Arena',
    position: { x: 0.5, y: 0.48 },
    size: { w: 0.35, h: 0.25 },
  },
  BIFROST: {
    name: 'Bifrost Bridge',
    rune: 'ᛒ',
    color: 0x1a2a3a,
    description: 'Rainbow Crossing',
    position: { x: 0.72, y: 0.35 },
    size: { w: 0.12, h: 0.08 },
  },
  HELHEIM: {
    name: 'Helheim',
    rune: 'ᚾ',
    color: 0x2a1a2a,
    description: 'Realm of Losses',
    position: { x: 0.15, y: 0.72 },
    size: { w: 0.18, h: 0.15 },
  },
};

// Agent visual configurations with Norse mythology accuracy
const AGENT_CONFIG = {
  odin_allfather: {
    color: 0xffd700,
    glowColor: 0xffd700,
    symbol: 'ᛟ',
    homeZone: 'ASGARD',
    avatar: '👁️',
  },
  thor_thunderous: {
    color: 0x4169e1,
    glowColor: 0x00aaff,
    symbol: 'ᚦ',
    homeZone: 'MARKET_SQUARE',
    avatar: '⚡',
  },
  loki_trickster: {
    color: 0x32cd32,
    glowColor: 0x00ff00,
    symbol: 'ᛚ',
    homeZone: 'BIFROST',
    avatar: '🎭',
  },
  freyja_valiant: {
    color: 0xff69b4,
    glowColor: 0xff69b4,
    symbol: 'ᚠ',
    homeZone: 'VALHALLA',
    avatar: '💎',
  },
  fenrir_unbound: {
    color: 0x8b0000,
    glowColor: 0xff0000,
    symbol: 'ᚹ',
    homeZone: 'HELHEIM',
    avatar: '🐺',
  },
  heimdall_watchful: {
    color: 0x9400d3,
    glowColor: 0xffffff,
    symbol: 'ᚺ',
    homeZone: 'BIFROST',
    avatar: '🔭',
  },
  skadi_hunter: {
    color: 0x00ced1,
    glowColor: 0x00ffff,
    symbol: 'ᛊ',
    homeZone: 'HELHEIM',
    avatar: '🏹',
  },
};

// All Norse runes for decoration
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const hexToString = (hex) => '#' + hex.toString(16).padStart(6, '0');

const lerp = (a, b, t) => a + (b - a) * t;

const getZonePosition = (zoneName, width, height) => {
  const zone = ZONES[zoneName];
  if (!zone) return { x: width / 2, y: height / 2 };
  return {
    x: zone.position.x * width + (Math.random() - 0.5) * zone.size.w * width * 0.6,
    y: zone.position.y * height + (Math.random() - 0.5) * zone.size.h * height * 0.6,
  };
};

const getPerformanceZone = (pnl) => {
  if (pnl > 0.5) return 'VALHALLA';
  if (pnl < -0.5) return 'HELHEIM';
  return 'MARKET_SQUARE';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DegenerateTownUltimate = ({ compact = false, onClose }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const layersRef = useRef({});
  const agentsRef = useRef({});
  const particlesRef = useRef([]);
  const starsRef = useRef([]);
  const runesRef = useRef([]);
  const zonesRef = useRef({});
  const uiElementsRef = useRef({});

  const [stats, setStats] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [marketEvents, setMarketEvents] = useState([]);

  const width = compact ? 600 : 1100;
  const height = compact ? 350 : 650;

  // ============================================================================
  // PIXI INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (!containerRef.current) return;

    const initPixi = async () => {
      const app = new PIXI.Application();

      try {
        await app.init({
          width,
          height,
          backgroundColor: THEME.background,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
      } catch (error) {
        console.error('[DegenerateTownUltimate] Failed to init PixiJS:', error);
        return;
      }

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Create layered architecture
      layersRef.current = {
        sky: new PIXI.Container(),
        mountains: new PIXI.Container(),
        buildings: new PIXI.Container(),
        zones: new PIXI.Container(),
        agents: new PIXI.Container(),
        effects: new PIXI.Container(),
        particles: new PIXI.Container(),
        ui: new PIXI.Container(),
        overlay: new PIXI.Container(),
      };

      Object.values(layersRef.current).forEach(layer => app.stage.addChild(layer));

      // Build the scene
      createSkyAndStars();
      createMountains();
      createBuildings();
      createZones();
      createRagnarokArena();
      createFloatingRunes();
      createAgents();
      if (!compact) createUI();

      // Animation loop
      let time = 0;
      app.ticker.add((ticker) => {
        time += ticker.deltaTime / 60;
        updateScene(ticker.deltaTime, time);
      });
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [compact, width, height]);

  // ============================================================================
  // SCENE CREATION
  // ============================================================================

  const createSkyAndStars = () => {
    const { sky } = layersRef.current;

    // Gradient sky
    const gradient = new PIXI.Graphics();
    const steps = 25;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = Math.floor(10 + ratio * 18);
      const g = Math.floor(14 + ratio * 16);
      const b = Math.floor(39 + ratio * 32);
      gradient.rect(0, ratio * height, width, height / steps + 1);
      gradient.fill((r << 16) | (g << 8) | b);
    }
    sky.addChild(gradient);

    // Twinkling stars
    starsRef.current = [];
    for (let i = 0; i < 80; i++) {
      const star = new PIXI.Graphics();
      const size = Math.random() * 2.5 + 0.5;
      star.circle(0, 0, size);
      star.fill({ color: 0xffffff, alpha: Math.random() * 0.5 + 0.3 });
      star.position.set(Math.random() * width, Math.random() * height * 0.45);
      star._twinkleSpeed = Math.random() * 3 + 1;
      star._twinklePhase = Math.random() * Math.PI * 2;
      star._baseAlpha = star.alpha;
      sky.addChild(star);
      starsRef.current.push(star);
    }

    // Bifrost rainbow hint
    const bifrost = new PIXI.Graphics();
    const bfX = width * 0.72;
    const bfY = height * 0.22;
    [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0077ff, 0x9900ff].forEach((color, i) => {
      bifrost.circle(bfX, bfY - i * 5, 12 - i * 1.5);
      bifrost.fill({ color, alpha: 0.2 });
    });
    sky.addChild(bifrost);
  };

  const createMountains = () => {
    const { mountains } = layersRef.current;

    // Distant mountains
    const bg = new PIXI.Graphics();
    bg.moveTo(0, height * 0.6);
    bg.lineTo(width * 0.12, height * 0.38);
    bg.lineTo(width * 0.28, height * 0.48);
    bg.lineTo(width * 0.42, height * 0.32);
    bg.lineTo(width * 0.58, height * 0.42);
    bg.lineTo(width * 0.72, height * 0.28);
    bg.lineTo(width * 0.88, height * 0.38);
    bg.lineTo(width, height * 0.48);
    bg.lineTo(width, height);
    bg.lineTo(0, height);
    bg.closePath();
    bg.fill(0x151a30);
    mountains.addChild(bg);

    // Foreground mountains
    const fg = new PIXI.Graphics();
    fg.moveTo(0, height * 0.72);
    fg.lineTo(width * 0.2, height * 0.52);
    fg.lineTo(width * 0.35, height * 0.62);
    fg.lineTo(width * 0.5, height * 0.48);
    fg.lineTo(width * 0.65, height * 0.58);
    fg.lineTo(width * 0.8, height * 0.42);
    fg.lineTo(width, height * 0.55);
    fg.lineTo(width, height);
    fg.lineTo(0, height);
    fg.closePath();
    fg.fill(0x1a1f3a);
    mountains.addChild(fg);

    // Ground
    const ground = new PIXI.Graphics();
    ground.rect(0, height * 0.82, width, height * 0.18);
    ground.fill(0x1a2a1a);
    mountains.addChild(ground);
  };

  const createBuildings = () => {
    const { buildings } = layersRef.current;

    // Odin's Hall (left side)
    const hallX = width * 0.06;
    const hallY = height * 0.48;
    const hallW = width * 0.16;
    const hallH = height * 0.32;

    const hall = new PIXI.Graphics();
    hall.rect(hallX, hallY, hallW, hallH);
    hall.fill(0x2a2f4a);
    hall.moveTo(hallX - 12, hallY);
    hall.lineTo(hallX + hallW / 2, hallY - 50);
    hall.lineTo(hallX + hallW + 12, hallY);
    hall.closePath();
    hall.fill(0x3a3f5a);

    // Glowing windows
    hall.rect(hallX + 18, hallY + 25, 35, 45);
    hall.fill({ color: 0xffaa00, alpha: 0.6 });
    hall.rect(hallX + hallW - 53, hallY + 25, 35, 45);
    hall.fill({ color: 0xffaa00, alpha: 0.6 });

    // Door
    hall.rect(hallX + hallW / 2 - 15, hallY + hallH - 50, 30, 50);
    hall.fill(0x4a3520);

    buildings.addChild(hall);

    // Hall label
    if (!compact) {
      const hallLabel = new PIXI.Text({
        text: "ODIN'S HALL",
        style: { fontFamily: 'monospace', fontSize: 11, fill: '#ffd700' },
      });
      hallLabel.anchor.set(0.5);
      hallLabel.position.set(hallX + hallW / 2, hallY - 62);
      buildings.addChild(hallLabel);
    }

    // Thor's Forge (right side)
    const forgeX = width * 0.78;
    const forgeY = height * 0.52;
    const forgeW = width * 0.15;
    const forgeH = height * 0.28;

    const forge = new PIXI.Graphics();
    forge.rect(forgeX, forgeY, forgeW, forgeH);
    forge.fill(0x4a3f3a);

    // Chimney
    forge.rect(forgeX + forgeW - 28, forgeY - 35, 22, 35);
    forge.fill(0x3a2f2a);

    // Fire glow
    forge.circle(forgeX + forgeW / 2, forgeY + forgeH - 25, 18);
    forge.fill({ color: 0xff4400, alpha: 0.7 });

    // Anvil hint
    forge.rect(forgeX + 20, forgeY + forgeH - 15, 25, 10);
    forge.fill(0x333333);

    buildings.addChild(forge);

    // Forge label
    if (!compact) {
      const forgeLabel = new PIXI.Text({
        text: "THOR'S FORGE",
        style: { fontFamily: 'monospace', fontSize: 11, fill: '#ff6600' },
      });
      forgeLabel.anchor.set(0.5);
      forgeLabel.position.set(forgeX + forgeW / 2, forgeY - 18);
      buildings.addChild(forgeLabel);
    }
  };

  const createZones = () => {
    const { zones } = layersRef.current;

    Object.entries(ZONES).forEach(([key, zone]) => {
      const x = zone.position.x * width;
      const y = zone.position.y * height;
      const w = zone.size.w * width;
      const h = zone.size.h * height;

      const zoneGfx = new PIXI.Graphics();
      zoneGfx.roundRect(x - w / 2, y - h / 2, w, h, 8);
      zoneGfx.fill({ color: zone.color, alpha: 0.35 });
      zoneGfx.roundRect(x - w / 2, y - h / 2, w, h, 8);
      zoneGfx.stroke({ color: THEME.primary, alpha: 0.3, width: 1 });
      zones.addChild(zoneGfx);

      // Zone label
      const label = new PIXI.Text({
        text: `${zone.rune} ${zone.name}`,
        style: { fontFamily: 'monospace', fontSize: compact ? 9 : 11, fill: '#00ff41' },
      });
      label.anchor.set(0.5);
      label.alpha = 0.7;
      label.position.set(x, y - h / 2 + 12);
      zones.addChild(label);

      zonesRef.current[key] = { graphics: zoneGfx, label, config: zone };
    });
  };

  const createRagnarokArena = () => {
    const { zones } = layersRef.current;

    const centerX = width * 0.5;
    const centerY = height * 0.48;

    // Outer glow ring
    const arena = new PIXI.Graphics();
    arena.circle(centerX, centerY, 75);
    arena.fill({ color: 0xff0000, alpha: 0.08 });
    arena.circle(centerX, centerY, 60);
    arena.stroke({ color: 0xff0000, alpha: 0.25, width: 2 });
    arena.circle(centerX, centerY, 45);
    arena.stroke({ color: 0xff4400, alpha: 0.3, width: 1 });
    zones.addChild(arena);

    // Rune circle around arena
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const runeText = new PIXI.Text({
        text: RUNES[i],
        style: { fontFamily: 'monospace', fontSize: 14, fill: '#ff0000' },
      });
      runeText.anchor.set(0.5);
      runeText.alpha = 0.35;
      runeText.position.set(
        centerX + Math.cos(angle) * 68,
        centerY + Math.sin(angle) * 68
      );
      zones.addChild(runeText);
    }
  };

  const createFloatingRunes = () => {
    const { sky } = layersRef.current;
    runesRef.current = [];

    for (let i = 0; i < 18; i++) {
      const rune = new PIXI.Text({
        text: RUNES[Math.floor(Math.random() * RUNES.length)],
        style: { fontFamily: 'monospace', fontSize: Math.random() * 12 + 10, fill: '#00ff41' },
      });
      rune.alpha = Math.random() * 0.2 + 0.08;
      rune.position.set(Math.random() * width, Math.random() * height * 0.4);
      rune._floatSpeed = Math.random() * 0.4 + 0.15;
      rune._floatPhase = Math.random() * Math.PI * 2;
      rune._baseX = rune.position.x;
      sky.addChild(rune);
      runesRef.current.push(rune);
    }
  };

  const createAgents = () => {
    const { agents } = layersRef.current;

    Object.entries(AGENT_CONFIG).forEach(([id, config]) => {
      const agentData = NORSE_AGENTS.find(a => a.id === id);
      const homeZone = ZONES[config.homeZone];
      const startPos = getZonePosition(config.homeZone, width, height);

      const container = new PIXI.Container();
      container.position.set(startPos.x, startPos.y);
      container.interactive = true;
      container.cursor = 'pointer';

      // Glow effect
      const glow = new PIXI.Graphics();
      glow.circle(0, 0, 28);
      glow.fill({ color: config.glowColor, alpha: 0.15 });
      container.addChild(glow);

      // Body
      const body = new PIXI.Graphics();
      body.circle(0, 0, 18);
      body.fill(config.color);
      body.circle(0, 0, 18);
      body.stroke({ color: 0xffffff, width: 2, alpha: 0.7 });
      container.addChild(body);

      // Symbol
      const symbol = new PIXI.Text({
        text: config.symbol,
        style: { fontFamily: 'monospace', fontSize: 16, fill: '#ffffff', fontWeight: 'bold' },
      });
      symbol.anchor.set(0.5);
      container.addChild(symbol);

      // Name label
      const name = new PIXI.Text({
        text: agentData?.name.split(' ')[0] || id,
        style: { fontFamily: 'monospace', fontSize: compact ? 9 : 11, fill: '#ffffff' },
      });
      name.anchor.set(0.5);
      name.position.y = 32;
      container.addChild(name);

      // PnL display
      const pnl = new PIXI.Text({
        text: '+0.00',
        style: { fontFamily: 'monospace', fontSize: compact ? 8 : 10, fill: '#00ff00' },
      });
      pnl.anchor.set(0.5);
      pnl.position.y = 45;
      container.addChild(pnl);

      // Action indicator
      const action = new PIXI.Text({
        text: '',
        style: { fontFamily: 'sans-serif', fontSize: 18 },
      });
      action.anchor.set(0.5);
      action.position.y = -32;
      container.addChild(action);

      // Click handler
      container.on('pointerdown', () => {
        handleAgentClick(id);
      });

      container.on('pointerover', () => {
        container.scale.set(1.15);
        glow.alpha = 0.4;
      });

      container.on('pointerout', () => {
        container.scale.set(1);
        glow.alpha = 0.15;
      });

      agents.addChild(container);

      agentsRef.current[id] = {
        container,
        glow,
        body,
        symbol,
        name,
        pnl,
        action,
        config,
        bobPhase: Math.random() * Math.PI * 2,
        targetPos: { ...startPos },
        currentPos: { ...startPos },
        homeZone: config.homeZone,
      };
    });
  };

  const createUI = () => {
    const { ui } = layersRef.current;

    // Stats panel (top-left)
    const statsPanel = new PIXI.Graphics();
    statsPanel.roundRect(12, 12, 175, 115, 6);
    statsPanel.fill({ color: 0x000000, alpha: 0.85 });
    statsPanel.roundRect(12, 12, 175, 115, 6);
    statsPanel.stroke({ color: THEME.primary, alpha: 0.4, width: 1 });
    ui.addChild(statsPanel);

    const statsTitle = new PIXI.Text({
      text: '⚔️ DEGENERATE TOWN',
      style: { fontFamily: 'monospace', fontSize: 12, fill: '#ffd700', fontWeight: 'bold' },
    });
    statsTitle.position.set(20, 18);
    ui.addChild(statsTitle);

    uiElementsRef.current.statusText = new PIXI.Text({
      text: 'Status: 🔴 STOPPED',
      style: { fontFamily: 'monospace', fontSize: 11, fill: '#00ff41' },
    });
    uiElementsRef.current.statusText.position.set(20, 40);
    ui.addChild(uiElementsRef.current.statusText);

    uiElementsRef.current.tickText = new PIXI.Text({
      text: 'Tick: 0',
      style: { fontFamily: 'monospace', fontSize: 11, fill: '#888888' },
    });
    uiElementsRef.current.tickText.position.set(20, 56);
    ui.addChild(uiElementsRef.current.tickText);

    uiElementsRef.current.tradesText = new PIXI.Text({
      text: 'Trades: 0',
      style: { fontFamily: 'monospace', fontSize: 11, fill: '#888888' },
    });
    uiElementsRef.current.tradesText.position.set(20, 72);
    ui.addChild(uiElementsRef.current.tradesText);

    uiElementsRef.current.marketText = new PIXI.Text({
      text: 'Market: NEUTRAL',
      style: { fontFamily: 'monospace', fontSize: 11, fill: '#ffaa00' },
    });
    uiElementsRef.current.marketText.position.set(20, 88);
    ui.addChild(uiElementsRef.current.marketText);

    uiElementsRef.current.volumeText = new PIXI.Text({
      text: 'Volume: 0.0000 SOL',
      style: { fontFamily: 'monospace', fontSize: 11, fill: '#888888' },
    });
    uiElementsRef.current.volumeText.position.set(20, 104);
    ui.addChild(uiElementsRef.current.volumeText);

    // Leaderboard panel (top-right)
    const lbPanel = new PIXI.Graphics();
    lbPanel.roundRect(width - 185, 12, 173, 145, 6);
    lbPanel.fill({ color: 0x000000, alpha: 0.85 });
    lbPanel.roundRect(width - 185, 12, 173, 6);
    lbPanel.stroke({ color: THEME.gold, alpha: 0.4, width: 1 });
    ui.addChild(lbPanel);

    const lbTitle = new PIXI.Text({
      text: '🏆 LEADERBOARD',
      style: { fontFamily: 'monospace', fontSize: 12, fill: '#ffd700', fontWeight: 'bold' },
    });
    lbTitle.position.set(width - 175, 18);
    ui.addChild(lbTitle);

    uiElementsRef.current.leaderboardTexts = [];
    for (let i = 0; i < 5; i++) {
      const lbEntry = new PIXI.Text({
        text: '',
        style: { fontFamily: 'monospace', fontSize: 11, fill: '#888888' },
      });
      lbEntry.position.set(width - 175, 40 + i * 20);
      ui.addChild(lbEntry);
      uiElementsRef.current.leaderboardTexts.push(lbEntry);
    }

    // Events panel (bottom-right)
    const eventsPanel = new PIXI.Graphics();
    eventsPanel.roundRect(width - 185, height - 105, 173, 93, 6);
    eventsPanel.fill({ color: 0x000000, alpha: 0.85 });
    eventsPanel.roundRect(width - 185, height - 105, 173, 93, 6);
    eventsPanel.stroke({ color: THEME.accent, alpha: 0.4, width: 1 });
    ui.addChild(eventsPanel);

    const eventsTitle = new PIXI.Text({
      text: '📜 RECENT EVENTS',
      style: { fontFamily: 'monospace', fontSize: 11, fill: '#ffaa00' },
    });
    eventsTitle.position.set(width - 175, height - 98);
    ui.addChild(eventsTitle);

    uiElementsRef.current.eventsTexts = [];
    for (let i = 0; i < 4; i++) {
      const eventText = new PIXI.Text({
        text: '',
        style: { fontFamily: 'monospace', fontSize: 9, fill: '#666666' },
      });
      eventText.position.set(width - 175, height - 78 + i * 18);
      ui.addChild(eventText);
      uiElementsRef.current.eventsTexts.push(eventText);
    }
  };

  // ============================================================================
  // ANIMATION & UPDATE
  // ============================================================================

  const updateScene = (delta, time) => {
    // Twinkle stars
    starsRef.current.forEach(star => {
      star.alpha = star._baseAlpha * (0.5 + 0.5 * Math.sin(time * star._twinkleSpeed + star._twinklePhase));
    });

    // Float runes
    runesRef.current.forEach(rune => {
      rune.position.x = rune._baseX + Math.sin(time * rune._floatSpeed + rune._floatPhase) * 25;
      rune.alpha = 0.08 + Math.sin(time * 0.5 + rune._floatPhase) * 0.08;
    });

    // Update agents
    Object.values(agentsRef.current).forEach(agent => {
      // Bobbing
      agent.bobPhase += 0.04 * delta;
      const bobOffset = Math.sin(agent.bobPhase) * 4;
      agent.container.position.y = agent.currentPos.y + bobOffset;

      // Glow pulse
      agent.glow.alpha = 0.12 + Math.sin(time * 2.5) * 0.08;

      // Move towards target
      const dx = agent.targetPos.x - agent.currentPos.x;
      const dy = agent.targetPos.y - agent.currentPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        const speed = 1.5;
        agent.currentPos.x += (dx / dist) * speed * delta;
        agent.currentPos.y += (dy / dist) * speed * delta;
        agent.container.position.x = agent.currentPos.x;
      }
    });

    // Update particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.life -= delta * 2;
      p.y -= p.speed * delta;
      p.alpha = Math.max(0, p.life / 100);
      p.scale.set(p.life / 100);

      if (p.life <= 0) {
        p.parent?.removeChild(p);
        p.destroy();
        return false;
      }
      return true;
    });
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleAgentClick = useCallback((agentId) => {
    const agent = agentsRef.current[agentId];
    const agentData = degenerateTownService.getAgentStats?.(agentId);
    const agentConfig = NORSE_AGENTS.find(a => a.id === agentId);

    setSelectedAgent({
      id: agentId,
      ...agentConfig,
      ...agentData,
      qTable: degenerateTownService.getAgentQTable?.(agentId),
    });
  }, []);

  const spawnTradeParticles = useCallback((x, y, isProfit) => {
    if (!layersRef.current.particles) return;

    const color = isProfit ? 0x00ff00 : 0xff0000;
    for (let i = 0; i < 8; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, Math.random() * 4 + 2);
      particle.fill(color);
      particle.position.set(x + (Math.random() - 0.5) * 30, y);
      particle.speed = Math.random() * 2.5 + 1.5;
      particle.life = 100;
      layersRef.current.particles.addChild(particle);
      particlesRef.current.push(particle);
    }
  }, []);

  const triggerRagnarok = useCallback(() => {
    if (!appRef.current) return;

    // Screen shake
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      if (shakeCount >= 25 || !appRef.current) {
        clearInterval(shakeInterval);
        if (appRef.current) appRef.current.stage.position.set(0, 0);
        return;
      }
      appRef.current.stage.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
      shakeCount++;
    }, 45);

    // Red flash
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, width, height);
    flash.fill({ color: 0xff0000, alpha: 0.35 });
    layersRef.current.overlay.addChild(flash);

    // Fire particles from center
    const centerX = width / 2;
    const centerY = height * 0.48;
    for (let i = 0; i < 30; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, Math.random() * 5 + 3);
      particle.fill([0xff0000, 0xff4400, 0xff8800][Math.floor(Math.random() * 3)]);
      particle.position.set(centerX + (Math.random() - 0.5) * 60, centerY);
      particle.speed = Math.random() * 4 + 2;
      particle.life = 150;
      layersRef.current.particles.addChild(particle);
      particlesRef.current.push(particle);
    }

    setTimeout(() => {
      layersRef.current.overlay.removeChild(flash);
    }, 800);
  }, [width, height]);

  // ============================================================================
  // SERVICE SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    const handleTrade = (trade) => {
      const agent = agentsRef.current[trade.agentId];
      if (!agent) return;

      // Update PnL display
      const pnlValue = parseFloat(trade.pnl);
      agent.pnl.text = `${pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)}`;
      agent.pnl.style.fill = pnlValue >= 0 ? '#00ff00' : '#ff0000';

      // Show action emoji
      const emoji = { buy: '📈', sell: '📉', hold: '⏸️', scalp: '⚡', short: '📊' }[trade.action] || '';
      agent.action.text = emoji;
      setTimeout(() => { agent.action.text = ''; }, 1800);

      // Flash glow
      agent.glow.alpha = 0.7;
      agent.glow.tint = pnlValue >= 0 ? 0x00ff00 : 0xff0000;
      setTimeout(() => {
        agent.glow.tint = 0xffffff;
        agent.glow.alpha = 0.15;
      }, 600);

      // Spawn particles
      spawnTradeParticles(agent.container.position.x, agent.container.position.y, pnlValue >= 0);

      // Move to market square on trade
      const marketPos = getZonePosition('MARKET_SQUARE', width, height);
      agent.targetPos = marketPos;

      // Track recent trades
      setRecentTrades(prev => [...prev.slice(-4), { ...trade, timestamp: Date.now() }]);
    };

    const handleMarketEvent = (event) => {
      if (event.type === 'RAGNAROK' || event.type === 'RUGPULL') {
        triggerRagnarok();
      }

      setMarketEvents(prev => [...prev.slice(-3), { ...event, timestamp: Date.now() }]);

      // Update events UI
      if (uiElementsRef.current.eventsTexts) {
        const allEvents = [...marketEvents, event].slice(-4);
        allEvents.forEach((evt, i) => {
          if (uiElementsRef.current.eventsTexts[i]) {
            const icon = MARKET_EVENTS[evt.type]?.icon || '📢';
            uiElementsRef.current.eventsTexts[i].text = `${icon} ${evt.type}`;
            uiElementsRef.current.eventsTexts[i].style.fill = '#00ff41';
          }
        });
      }
    };

    const handleTick = (data) => {
      setStats(data);
      setIsRunning(data.isRunning || degenerateTownService.isRunning);

      // Update UI elements
      if (uiElementsRef.current.statusText) {
        uiElementsRef.current.statusText.text = `Status: ${data.isRunning ? '🟢 LIVE' : '🔴 STOPPED'}`;
      }
      if (uiElementsRef.current.tickText) {
        uiElementsRef.current.tickText.text = `Tick: ${data.currentTick || 0}`;
      }
      if (uiElementsRef.current.tradesText) {
        uiElementsRef.current.tradesText.text = `Trades: ${data.totalTrades || 0}`;
      }
      if (uiElementsRef.current.marketText) {
        const condition = data.marketCondition?.toUpperCase() || 'NEUTRAL';
        uiElementsRef.current.marketText.text = `Market: ${condition}`;
        uiElementsRef.current.marketText.style.fill =
          condition === 'BULLISH' ? '#00ff00' :
          condition === 'BEARISH' ? '#ff0000' : '#ffaa00';
      }
      if (uiElementsRef.current.volumeText) {
        uiElementsRef.current.volumeText.text = `Volume: ${data.totalVolume || '0.0000'} SOL`;
      }

      // Update leaderboard
      if (data.leaderboard && uiElementsRef.current.leaderboardTexts) {
        data.leaderboard.slice(0, 5).forEach((agent, i) => {
          const text = uiElementsRef.current.leaderboardTexts[i];
          if (text) {
            const pnl = parseFloat(agent.totalPnL);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            text.text = `${medal} ${agent.name?.split(' ')[0]}: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
            text.style.fill = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888888';
          }
        });
      }

      // Update agent states and positions based on performance
      if (data.agents) {
        data.agents.forEach(agentData => {
          const agent = agentsRef.current[agentData.id];
          if (!agent) return;

          const pnl = parseFloat(agentData.totalPnL);
          agent.pnl.text = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
          agent.pnl.style.fill = pnl >= 0 ? '#00ff00' : '#ff0000';

          // Move to performance-based zone occasionally
          if (Math.random() < 0.05) {
            const perfZone = getPerformanceZone(pnl);
            agent.targetPos = getZonePosition(perfZone, width, height);
          }
        });
      }
    };

    degenerateTownService.on('trade', handleTrade);
    degenerateTownService.on('marketEvent', handleMarketEvent);
    degenerateTownService.on('tick', handleTick);

    // Get initial state
    const initialStats = degenerateTownService.getStats();
    setStats(initialStats);
    setIsRunning(initialStats?.isRunning || degenerateTownService.isRunning);

    return () => {
      degenerateTownService.off('trade', handleTrade);
      degenerateTownService.off('marketEvent', handleMarketEvent);
      degenerateTownService.off('tick', handleTick);
    };
  }, [spawnTradeParticles, triggerRagnarok, width, height, marketEvents]);

  // ============================================================================
  // CONTROLS
  // ============================================================================

  const handleStart = useCallback(async () => {
    await degenerateTownService.start();
    setIsRunning(true);
  }, []);

  const handleStop = useCallback(async () => {
    await degenerateTownService.stop();
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    degenerateTownService.resetLearning?.();
    setRecentTrades([]);
    setMarketEvents([]);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="degenerate-town-ultimate" style={{
      position: 'relative',
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: '12px',
      overflow: 'hidden',
      border: `2px solid ${isRunning ? '#00ff41' : '#333'}`,
      boxShadow: isRunning ? '0 0 35px rgba(0, 255, 65, 0.4)' : 'none',
      transition: 'all 0.3s ease',
      background: '#0a0e17',
    }}>
      {/* PixiJS Canvas */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        role="img"
        aria-label="Degenerate Town - Norse AI Trading Visualization showing agents, market zones, and trading activity"
      />

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
      }}>
        {[
          { label: '▶ START', onClick: handleStart, disabled: isRunning, bg: '#00aa00' },
          { label: '⏹ STOP', onClick: handleStop, disabled: !isRunning, bg: '#aa0000' },
          { label: '↺ RESET', onClick: handleReset, disabled: false, bg: '#555' },
          ...(onClose ? [{ label: '✕ CLOSE', onClick: onClose, disabled: false, bg: '#440000' }] : []),
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            disabled={btn.disabled}
            style={{
              padding: compact ? '6px 14px' : '8px 18px',
              background: btn.disabled ? '#333' : btn.bg,
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: btn.disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              fontSize: compact ? '10px' : '12px',
              fontWeight: 'bold',
              opacity: btn.disabled ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Agent Details Panel */}
      {selectedAgent && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid #00ff41',
          borderRadius: '8px',
          padding: '16px 20px',
          minWidth: '380px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#00ff41',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: '#ffd700', fontWeight: 'bold' }}>
              {selectedAgent.avatar} {selectedAgent.name}
            </span>
            <button
              onClick={() => setSelectedAgent(null)}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ color: '#888', marginBottom: '10px' }}>{selectedAgent.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>Strategy: <span style={{ color: '#ffaa00' }}>{selectedAgent.strategy?.type}</span></div>
            <div>Risk: <span style={{ color: '#ff6666' }}>{((selectedAgent.strategy?.riskTolerance || 0) * 100).toFixed(0)}%</span></div>
            <div>PnL: <span style={{ color: (selectedAgent.totalPnL || 0) >= 0 ? '#00ff00' : '#ff0000' }}>
              {(selectedAgent.totalPnL || 0) >= 0 ? '+' : ''}{(selectedAgent.totalPnL || 0).toFixed(4)} SOL
            </span></div>
            <div>Trades: <span style={{ color: '#00aaff' }}>{selectedAgent.trades || 0}</span></div>
            <div>Wins: <span style={{ color: '#00ff00' }}>{selectedAgent.wins || 0}</span></div>
            <div>Win Rate: <span style={{ color: '#ffaa00' }}>
              {selectedAgent.trades ? ((selectedAgent.wins / selectedAgent.trades) * 100).toFixed(1) : 0}%
            </span></div>
          </div>

          {/* Q-Table Preview */}
          {selectedAgent.qTable && (
            <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' }}>
              <div style={{ color: '#888', marginBottom: '6px' }}>Q-Table (Top Actions):</div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                {Object.entries(selectedAgent.qTable).slice(0, 3).map(([state, actions]) => {
                  const best = Object.entries(actions).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <div key={state}>
                      {state}: <span style={{ color: '#00ff41' }}>{best?.[0]}</span> ({best?.[1]?.toFixed(2)})
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Volatile Market Banner */}
      {stats?.marketCondition === 'volatile' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 68, 0, 0.9)',
          padding: '12px 35px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#fff',
          fontWeight: 'bold',
          animation: 'pulse 0.8s infinite',
          pointerEvents: 'none',
        }}>
          ⚡ VOLATILE MARKET ⚡
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default DegenerateTownUltimate;
