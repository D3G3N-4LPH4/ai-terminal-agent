/**
 * DegenerateTownAnimated - Fully Animated PixiJS Visualization
 *
 * Enhanced version with support for:
 * - CraftPix spritesheet animations
 * - Character walk cycles and action animations
 * - Particle systems for trading effects
 * - Dynamic lighting and glow effects
 * - Parallax backgrounds
 * - Screen effects (shake, flash, filters)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import degenerateTownService from '../services/DegenerateTownService';
import { NORSE_AGENTS, MARKET_EVENTS } from '../config/degenerateTown';
import {
  AGENT_SPRITES,
  EFFECT_SPRITES,
  PARTICLE_CONFIGS,
  ACTION_TO_ANIMATION,
  ASSET_PATHS,
} from '../config/spriteAssets';

// Theme colors
const THEME = {
  background: 0x0a0e27,
  primary: 0x00ff41,
  secondary: 0x1a1f3a,
  accent: 0xffaa00,
  danger: 0xff0000,
};

// Norse runes for decoration
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];

/**
 * Animated Sprite Class - Handles spritesheet animations
 */
class AnimatedAgent {
  constructor(app, config, agentId, position) {
    this.app = app;
    this.config = config;
    this.agentId = agentId;
    this.container = new PIXI.Container();
    this.currentAnimation = 'idle';
    this.frameIndex = 0;
    this.frameTime = 0;
    this.isPlaying = true;
    this.sprite = null;
    this.textures = {};
    this.useFallback = true;

    // Position
    this.targetPosition = { ...position };
    this.currentPosition = { ...position };

    // Create the agent
    this.create();
  }

  async create() {
    const spriteConfig = AGENT_SPRITES[this.agentId];

    // Try to load spritesheet
    try {
      const spritesheetPath = `${ASSET_PATHS.sprites}${spriteConfig.spritesheet}`;
      const texture = await PIXI.Assets.load(spritesheetPath);

      if (texture) {
        this.useFallback = false;
        this.createFromSpritesheet(texture, spriteConfig);
      }
    } catch (error) {
      console.log(`[AnimatedAgent] Using fallback for ${this.agentId}`);
      this.createFallback(spriteConfig.fallback);
    }

    // Add UI elements
    this.createUIElements();

    // Position container
    this.container.position.set(this.currentPosition.x, this.currentPosition.y);
  }

  createFromSpritesheet(baseTexture, config) {
    const { frameWidth, frameHeight, animations } = config;

    // Create textures for each animation
    Object.entries(animations).forEach(([animName, animConfig]) => {
      this.textures[animName] = [];

      for (let i = animConfig.startFrame; i <= animConfig.endFrame; i++) {
        const col = i % (baseTexture.width / frameWidth);
        const row = Math.floor(i / (baseTexture.width / frameWidth));

        const frame = new PIXI.Rectangle(
          col * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight
        );

        const texture = new PIXI.Texture({
          source: baseTexture.source,
          frame,
        });

        this.textures[animName].push(texture);
      }
    });

    // Create animated sprite
    this.sprite = new PIXI.AnimatedSprite(this.textures.idle);
    this.sprite.anchor.set(0.5);
    this.sprite.animationSpeed = animations.idle.speed;
    this.sprite.loop = animations.idle.loop;
    this.sprite.play();

    this.container.addChild(this.sprite);
  }

  createFallback(fallback) {
    // Glow effect
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, fallback.size + 10);
    glow.fill({ color: fallback.color, alpha: 0.2 });
    this.glow = glow;
    this.container.addChild(glow);

    // Body
    const body = new PIXI.Graphics();
    body.circle(0, 0, fallback.size);
    body.fill(fallback.color);
    body.circle(0, 0, fallback.size);
    body.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
    this.body = body;
    this.container.addChild(body);

    // Symbol
    const symbol = new PIXI.Text({
      text: fallback.symbol,
      style: {
        fontFamily: 'monospace',
        fontSize: fallback.size * 0.8,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    symbol.anchor.set(0.5);
    this.container.addChild(symbol);
  }

  createUIElements() {
    const agent = NORSE_AGENTS.find(a => a.id === this.agentId);

    // Name label
    this.nameText = new PIXI.Text({
      text: agent?.name.split(' ')[0] || this.agentId,
      style: {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0xffffff,
      },
    });
    this.nameText.anchor.set(0.5);
    this.nameText.position.y = 35;
    this.container.addChild(this.nameText);

    // PnL display
    this.pnlText = new PIXI.Text({
      text: '+0.00',
      style: {
        fontFamily: 'monospace',
        fontSize: 9,
        fill: 0x00ff00,
      },
    });
    this.pnlText.anchor.set(0.5);
    this.pnlText.position.y = 48;
    this.container.addChild(this.pnlText);

    // Action indicator
    this.actionText = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'sans-serif',
        fontSize: 18,
      },
    });
    this.actionText.anchor.set(0.5);
    this.actionText.position.y = -35;
    this.container.addChild(this.actionText);
  }

  playAnimation(animName) {
    if (this.useFallback || !this.textures[animName]) return;

    const spriteConfig = AGENT_SPRITES[this.agentId];
    const animConfig = spriteConfig.animations[animName];

    if (!animConfig) return;

    this.currentAnimation = animName;
    this.sprite.textures = this.textures[animName];
    this.sprite.animationSpeed = animConfig.speed;
    this.sprite.loop = animConfig.loop;
    this.sprite.gotoAndPlay(0);

    // Return to idle after non-looping animation
    if (!animConfig.loop) {
      this.sprite.onComplete = () => {
        this.playAnimation('idle');
      };
    }
  }

  updatePnL(pnl) {
    const value = parseFloat(pnl);
    this.pnlText.text = `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
    this.pnlText.style.fill = value >= 0 ? 0x00ff00 : 0xff0000;
  }

  showAction(action) {
    const emoji = {
      buy: '📈',
      sell: '📉',
      hold: '⏸️',
      scalp: '⚡',
      short: '📊',
    }[action] || '';

    this.actionText.text = emoji;

    // Clear after delay
    setTimeout(() => {
      this.actionText.text = '';
    }, 1500);
  }

  flash(color) {
    if (this.glow) {
      const originalAlpha = this.glow.alpha;
      this.glow.tint = color;
      this.glow.alpha = 0.8;

      setTimeout(() => {
        this.glow.tint = 0xffffff;
        this.glow.alpha = originalAlpha;
      }, 500);
    }
  }

  update(delta, time) {
    // Bobbing animation
    const bobOffset = Math.sin(time * 2 + this.agentId.length) * 3;
    this.container.position.y = this.currentPosition.y + bobOffset;

    // Glow pulse
    if (this.glow) {
      this.glow.alpha = 0.15 + Math.sin(time * 3) * 0.1;
    }

    // Move towards target
    const dx = this.targetPosition.x - this.currentPosition.x;
    const dy = this.targetPosition.y - this.currentPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const speed = 2;
      this.currentPosition.x += (dx / dist) * speed * delta;
      this.currentPosition.y += (dy / dist) * speed * delta;
      this.container.position.x = this.currentPosition.x;

      // Face direction of movement
      if (this.sprite && dx !== 0) {
        this.sprite.scale.x = dx > 0 ? 1 : -1;
      }
    }
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}

/**
 * Particle System Class
 */
class ParticleSystem {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.particles = [];
    this.emitting = false;
    this.lifetime = config.emitterLifetime;
    this.elapsed = 0;
    this.lastEmit = 0;
  }

  start(x, y) {
    this.x = x;
    this.y = y;
    this.emitting = true;
    this.elapsed = 0;
  }

  stop() {
    this.emitting = false;
  }

  emit() {
    if (this.particles.length >= this.config.maxParticles) return;

    const particle = new PIXI.Graphics();
    const size = Math.random() * 4 + 2;

    // Parse color
    let color = this.config.color.start;
    if (typeof color === 'string') {
      color = parseInt(color.replace('#', ''), 16);
    }

    particle.circle(0, 0, size);
    particle.fill(color);

    particle.position.set(
      this.x + (Math.random() - 0.5) * 20,
      this.y + (Math.random() - 0.5) * 20
    );

    // Velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = this.config.speed.min + Math.random() * (this.config.speed.max - this.config.speed.min);
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;

    // Lifetime
    particle.life = this.config.particleLifetime.min +
      Math.random() * (this.config.particleLifetime.max - this.config.particleLifetime.min);
    particle.maxLife = particle.life;

    // Scale
    particle.startScale = this.config.scale.start;
    particle.endScale = this.config.scale.end;

    this.container.addChild(particle);
    this.particles.push(particle);
  }

  update(delta) {
    const dt = delta / 60; // Convert to seconds

    // Emit new particles
    if (this.emitting) {
      this.elapsed += dt;
      this.lastEmit += dt;

      if (this.lastEmit >= this.config.frequency) {
        this.emit();
        this.lastEmit = 0;
      }

      // Check lifetime
      if (this.lifetime > 0 && this.elapsed >= this.lifetime) {
        this.emitting = false;
      }
    }

    // Update particles
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;

      if (particle.life <= 0) {
        this.container.removeChild(particle);
        particle.destroy();
        return false;
      }

      // Movement
      particle.position.x += particle.vx * dt;
      particle.position.y += particle.vy * dt;

      // Acceleration
      if (this.config.acceleration) {
        particle.vy += this.config.acceleration.y * dt;
        particle.vx += this.config.acceleration.x * dt;
      }

      // Scale
      const lifeRatio = particle.life / particle.maxLife;
      const scale = particle.endScale + (particle.startScale - particle.endScale) * lifeRatio;
      particle.scale.set(scale);

      // Alpha
      particle.alpha = lifeRatio;

      return true;
    });
  }

  destroy() {
    this.particles.forEach(p => {
      this.container.removeChild(p);
      p.destroy();
    });
    this.particles = [];
  }
}

/**
 * Main Component
 */
const DegenerateTownAnimated = ({ compact = false, onClose }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const agentsRef = useRef({});
  const particleSystemsRef = useRef({});
  const layersRef = useRef({});
  const [stats, setStats] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const width = compact ? 500 : 1000;
    const height = compact ? 300 : 600;

    const initPixi = async () => {
      const app = new PIXI.Application();

      await app.init({
        width,
        height,
        backgroundColor: THEME.background,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Create layers
      layersRef.current = {
        background: new PIXI.Container(),
        buildings: new PIXI.Container(),
        agents: new PIXI.Container(),
        effects: new PIXI.Container(),
        particles: new PIXI.Container(),
        ui: new PIXI.Container(),
      };

      Object.values(layersRef.current).forEach(layer => {
        app.stage.addChild(layer);
      });

      // Draw environment
      await drawEnvironment(width, height);

      // Create agents
      await createAgents(width, height);

      // Create particle systems
      createParticleSystems();

      // Animation loop
      let time = 0;
      app.ticker.add((ticker) => {
        time += ticker.deltaTime / 60;
        updateScene(ticker.deltaTime, time);
      });

      setAssetsLoaded(true);
    };

    initPixi();

    return () => {
      // Cleanup
      Object.values(agentsRef.current).forEach(agent => agent.destroy());
      Object.values(particleSystemsRef.current).forEach(ps => ps.destroy());

      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [compact]);

  // Draw environment
  const drawEnvironment = async (width, height) => {
    const { background, buildings } = layersRef.current;

    // Gradient sky
    const sky = new PIXI.Graphics();
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const y = ratio * height;
      const r = Math.floor(10 + ratio * 22);
      const g = Math.floor(14 + ratio * 20);
      const b = Math.floor(39 + ratio * 40);
      const color = (r << 16) | (g << 8) | b;
      sky.rect(0, y, width, height / steps + 1);
      sky.fill(color);
    }
    background.addChild(sky);

    // Stars
    for (let i = 0; i < 80; i++) {
      const star = new PIXI.Graphics();
      const size = Math.random() * 2 + 0.5;
      star.circle(0, 0, size);
      star.fill({ color: 0xffffff, alpha: Math.random() * 0.6 + 0.2 });
      star.position.set(Math.random() * width, Math.random() * height * 0.5);
      star._twinkleSpeed = Math.random() * 2 + 1;
      star._twinkleOffset = Math.random() * Math.PI * 2;
      background.addChild(star);
    }

    // Mountains
    const mountains = new PIXI.Graphics();
    mountains.moveTo(0, height * 0.65);
    mountains.lineTo(width * 0.15, height * 0.35);
    mountains.lineTo(width * 0.3, height * 0.45);
    mountains.lineTo(width * 0.45, height * 0.3);
    mountains.lineTo(width * 0.6, height * 0.4);
    mountains.lineTo(width * 0.75, height * 0.28);
    mountains.lineTo(width * 0.9, height * 0.38);
    mountains.lineTo(width, height * 0.5);
    mountains.lineTo(width, height);
    mountains.lineTo(0, height);
    mountains.closePath();
    mountains.fill(0x1a1f3a);
    buildings.addChild(mountains);

    // Odin's Hall
    drawBuilding(buildings, {
      x: width * 0.08,
      y: height * 0.45,
      width: width * 0.18,
      height: height * 0.35,
      roofHeight: 50,
      color: 0x2a2f4a,
      roofColor: 0x3a3f5a,
      windowColor: 0xffaa00,
      glowColor: 0xffd700,
      name: "ODIN'S HALL",
    });

    // Thor's Forge
    drawBuilding(buildings, {
      x: width * 0.75,
      y: height * 0.5,
      width: width * 0.17,
      height: height * 0.3,
      roofHeight: 0,
      color: 0x4a3f3a,
      windowColor: 0xff4400,
      glowColor: 0xff6600,
      name: "THOR'S FORGE",
      hasChimney: true,
    });

    // Ragnarok Arena (center)
    const arena = new PIXI.Graphics();
    const arenaX = width / 2;
    const arenaY = height * 0.42;

    // Outer glow
    arena.circle(arenaX, arenaY, 80);
    arena.fill({ color: 0xff0000, alpha: 0.1 });

    // Rune circle
    arena.circle(arenaX, arenaY, 65);
    arena.stroke({ color: 0xff0000, alpha: 0.3, width: 2 });

    // Inner circle
    arena.circle(arenaX, arenaY, 50);
    arena.stroke({ color: 0xff4400, alpha: 0.4, width: 1 });

    buildings.addChild(arena);

    // Arena runes
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const runeText = new PIXI.Text({
        text: RUNES[i],
        style: { fontFamily: 'monospace', fontSize: 14, fill: 0xff000066 },
      });
      runeText.anchor.set(0.5);
      runeText.position.set(
        arenaX + Math.cos(angle) * 72,
        arenaY + Math.sin(angle) * 72
      );
      buildings.addChild(runeText);
    }

    // Ground
    const ground = new PIXI.Graphics();
    ground.rect(0, height * 0.78, width, height * 0.22);
    ground.fill(0x1a2a1a);
    buildings.addChild(ground);

    // Bifrost hint
    const bifrost = new PIXI.Graphics();
    const bfX = width * 0.72;
    const bfY = height * 0.22;
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0077ff, 0x8800ff];
    colors.forEach((color, i) => {
      bifrost.circle(bfX, bfY - i * 4, 10 - i);
      bifrost.fill({ color, alpha: 0.25 });
    });
    buildings.addChild(bifrost);

    // Floating runes
    for (let i = 0; i < 20; i++) {
      const rune = new PIXI.Text({
        text: RUNES[Math.floor(Math.random() * RUNES.length)],
        style: {
          fontFamily: 'monospace',
          fontSize: Math.random() * 12 + 10,
          fill: 0x00ff41,
        },
      });
      rune.alpha = Math.random() * 0.25 + 0.1;
      rune.position.set(Math.random() * width, Math.random() * height * 0.35);
      rune._floatSpeed = Math.random() * 0.5 + 0.2;
      rune._floatOffset = Math.random() * Math.PI * 2;
      rune._baseX = rune.position.x;
      background.addChild(rune);
    }
  };

  // Draw a building
  const drawBuilding = (container, config) => {
    const building = new PIXI.Container();

    // Main structure
    const main = new PIXI.Graphics();
    main.rect(config.x, config.y, config.width, config.height);
    main.fill(config.color);
    building.addChild(main);

    // Roof
    if (config.roofHeight > 0) {
      const roof = new PIXI.Graphics();
      roof.moveTo(config.x - 10, config.y);
      roof.lineTo(config.x + config.width / 2, config.y - config.roofHeight);
      roof.lineTo(config.x + config.width + 10, config.y);
      roof.closePath();
      roof.fill(config.roofColor);
      building.addChild(roof);
    }

    // Windows
    const windowSize = config.width * 0.2;
    const windowY = config.y + 20;

    [0.2, 0.6].forEach(xRatio => {
      const win = new PIXI.Graphics();
      win.rect(
        config.x + config.width * xRatio,
        windowY,
        windowSize,
        windowSize * 1.3
      );
      win.fill({ color: config.windowColor, alpha: 0.7 });
      building.addChild(win);
    });

    // Chimney
    if (config.hasChimney) {
      const chimney = new PIXI.Graphics();
      chimney.rect(config.x + config.width - 30, config.y - 35, 25, 35);
      chimney.fill(0x3a2f2a);
      building.addChild(chimney);

      // Fire glow
      const fire = new PIXI.Graphics();
      fire.circle(config.x + config.width / 2, config.y + config.height - 25, 20);
      fire.fill({ color: 0xff4400, alpha: 0.6 });
      building.addChild(fire);
    }

    // Name label
    if (config.name && !compact) {
      const label = new PIXI.Text({
        text: config.name,
        style: {
          fontFamily: 'monospace',
          fontSize: 10,
          fill: config.glowColor,
        },
      });
      label.anchor.set(0.5);
      label.position.set(config.x + config.width / 2, config.y - (config.roofHeight || 0) - 15);
      building.addChild(label);
    }

    container.addChild(building);
  };

  // Create agents
  const createAgents = async (width, height) => {
    const positions = {
      odin_allfather: { x: width * 0.17, y: height * 0.4 },
      thor_thunderer: { x: width * 0.83, y: height * 0.48 },
      loki_trickster: { x: width * 0.5, y: height * 0.58 },
      freyja_seer: { x: width * 0.32, y: height * 0.52 },
      fenrir_wolf: { x: width * 0.5, y: height * 0.4 },
      heimdall_watcher: { x: width * 0.72, y: height * 0.3 },
      skadi_hunter: { x: width * 0.22, y: height * 0.68 },
    };

    for (const [agentId, position] of Object.entries(positions)) {
      const agent = new AnimatedAgent(
        appRef.current,
        AGENT_SPRITES[agentId],
        agentId,
        position
      );

      agentsRef.current[agentId] = agent;
      layersRef.current.agents.addChild(agent.container);
    }
  };

  // Create particle systems
  const createParticleSystems = () => {
    particleSystemsRef.current = {
      profit: new ParticleSystem(layersRef.current.particles, PARTICLE_CONFIGS.trade_profit),
      loss: new ParticleSystem(layersRef.current.particles, PARTICLE_CONFIGS.trade_loss),
      ragnarok: new ParticleSystem(layersRef.current.particles, PARTICLE_CONFIGS.ragnarok),
      lightning: new ParticleSystem(layersRef.current.particles, PARTICLE_CONFIGS.lightning),
      runes: new ParticleSystem(layersRef.current.particles, PARTICLE_CONFIGS.rune_float),
    };
  };

  // Update scene
  const updateScene = (delta, time) => {
    // Update agents
    Object.values(agentsRef.current).forEach(agent => {
      agent.update(delta, time);
    });

    // Update particle systems
    Object.values(particleSystemsRef.current).forEach(ps => {
      ps.update(delta);
    });

    // Update floating runes
    if (layersRef.current.background) {
      layersRef.current.background.children.forEach(child => {
        if (child._floatSpeed) {
          child.position.x = child._baseX + Math.sin(time * child._floatSpeed + child._floatOffset) * 25;
          child.alpha = 0.1 + Math.sin(time * 0.5 + child._floatOffset) * 0.1;
        }
        // Twinkle stars
        if (child._twinkleSpeed) {
          child.alpha = 0.3 + Math.sin(time * child._twinkleSpeed + child._twinkleOffset) * 0.3;
        }
      });
    }
  };

  // Handle trade event
  const handleTrade = useCallback((trade) => {
    const agent = agentsRef.current[trade.agentId];
    if (!agent) return;

    // Update agent
    agent.updatePnL(trade.pnl);
    agent.showAction(trade.action);
    agent.playAnimation(ACTION_TO_ANIMATION[trade.action] || 'trade');

    // Flash effect
    const color = trade.pnl >= 0 ? 0x00ff00 : 0xff0000;
    agent.flash(color);

    // Spawn particles
    const ps = trade.pnl >= 0 ? particleSystemsRef.current.profit : particleSystemsRef.current.loss;
    if (ps) {
      ps.start(agent.container.position.x, agent.container.position.y);
    }
  }, []);

  // Handle market event
  const handleMarketEvent = useCallback((event) => {
    if (!appRef.current) return;

    if (event.type === 'RAGNAROK') {
      // Screen shake
      let shakeCount = 0;
      const shakeInterval = setInterval(() => {
        if (shakeCount >= 30 || !appRef.current) {
          clearInterval(shakeInterval);
          if (appRef.current) appRef.current.stage.position.set(0, 0);
          return;
        }
        appRef.current.stage.position.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );
        shakeCount++;
      }, 40);

      // Red flash
      const flash = new PIXI.Graphics();
      flash.rect(0, 0, appRef.current.screen.width, appRef.current.screen.height);
      flash.fill({ color: 0xff0000, alpha: 0.4 });
      appRef.current.stage.addChild(flash);

      // Start ragnarok particles
      particleSystemsRef.current.ragnarok?.start(
        appRef.current.screen.width / 2,
        appRef.current.screen.height / 2
      );

      setTimeout(() => {
        if (appRef.current) {
          appRef.current.stage.removeChild(flash);
        }
        particleSystemsRef.current.ragnarok?.stop();
      }, 3000);
    }

    if (event.type === 'THOR_THUNDER') {
      // Lightning effect
      const { width, height } = appRef.current.screen;
      particleSystemsRef.current.lightning?.start(width / 2, height * 0.2);

      // Flash
      const flash = new PIXI.Graphics();
      flash.rect(0, 0, width, height);
      flash.fill({ color: 0xffffff, alpha: 0.6 });
      appRef.current.stage.addChild(flash);

      setTimeout(() => {
        if (appRef.current) appRef.current.stage.removeChild(flash);
      }, 100);
    }
  }, []);

  // Subscribe to service events
  useEffect(() => {
    const handleTick = (data) => {
      setStats(data);
      setIsRunning(data.isRunning || false);

      // Update agent PnL from tick data
      if (data.agents) {
        data.agents.forEach((agentData) => {
          const agent = agentsRef.current[agentData.id];
          if (agent) {
            agent.updatePnL(agentData.totalPnL);
          }
        });
      }
    };

    degenerateTownService.on('trade', handleTrade);
    degenerateTownService.on('marketEvent', handleMarketEvent);
    degenerateTownService.on('tick', handleTick);

    const initialStats = degenerateTownService.getStats();
    setStats(initialStats);
    setIsRunning(initialStats.isRunning);

    return () => {
      degenerateTownService.off('trade', handleTrade);
      degenerateTownService.off('marketEvent', handleMarketEvent);
      degenerateTownService.off('tick', handleTick);
    };
  }, [handleTrade, handleMarketEvent]);

  const handleStart = () => degenerateTownService.start();
  const handleStop = () => degenerateTownService.stop();
  const handleReset = () => degenerateTownService.resetLearning();

  return (
    <div className="degenerate-town-animated" style={{
      position: 'relative',
      width: compact ? '500px' : '1000px',
      height: compact ? '300px' : '600px',
      borderRadius: '10px',
      overflow: 'hidden',
      border: `2px solid ${isRunning ? '#00ff41' : '#333'}`,
      boxShadow: isRunning ? '0 0 30px rgba(0, 255, 65, 0.4)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {/* Loading indicator */}
      {!assetsLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00ff41',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}>
          Loading Degenerate Town...
        </div>
      )}

      {/* PixiJS Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Stats Overlay */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '12px 16px',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: compact ? '10px' : '12px',
        color: '#00ff41',
        border: '1px solid #00ff4144',
        minWidth: '140px',
      }}>
        <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '8px', fontSize: compact ? '11px' : '13px' }}>
          DEGENERATE TOWN
        </div>
        <div>Status: {isRunning ? '🟢 LIVE' : '🔴 STOPPED'}</div>
        <div>Tick: {stats?.currentTick || 0}</div>
        <div>Trades: {stats?.totalTrades || 0}</div>
        <div>Market: {stats?.marketCondition?.toUpperCase() || 'N/A'}</div>
        <div>Volume: {stats?.totalVolume || '0.0000'} SOL</div>
      </div>

      {/* Leaderboard */}
      {!compact && stats?.leaderboard && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0, 0, 0, 0.85)',
          padding: '12px 16px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#00ff41',
          minWidth: '160px',
          border: '1px solid #ffd70044',
        }}>
          <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '10px' }}>
            LEADERBOARD
          </div>
          {stats.leaderboard.slice(0, 5).map((agent, i) => (
            <div key={agent.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
              color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888',
            }}>
              <span>{i + 1}. {agent.name?.split(' ')[0]}</span>
              <span style={{ color: agent.totalPnL >= 0 ? '#00ff00' : '#ff0000' }}>
                {agent.totalPnL >= 0 ? '+' : ''}{parseFloat(agent.totalPnL).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
      }}>
        {[
          { label: 'START', onClick: handleStart, disabled: isRunning, color: '#00aa00' },
          { label: 'STOP', onClick: handleStop, disabled: !isRunning, color: '#aa0000' },
          { label: 'RESET', onClick: handleReset, disabled: false, color: '#555' },
          ...(onClose ? [{ label: 'CLOSE', onClick: onClose, disabled: false, color: '#660000' }] : []),
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            disabled={btn.disabled}
            style={{
              padding: compact ? '6px 14px' : '8px 20px',
              background: btn.disabled ? '#333' : btn.color,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: btn.disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              fontSize: compact ? '10px' : '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              opacity: btn.disabled ? 0.5 : 1,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Market Event Banner */}
      {stats?.marketCondition === 'volatile' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.8)',
          padding: '10px 30px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '18px',
          color: 'white',
          fontWeight: 'bold',
          animation: 'pulse 1s infinite',
          pointerEvents: 'none',
        }}>
          ⚡ VOLATILE MARKET ⚡
        </div>
      )}
    </div>
  );
};

export default DegenerateTownAnimated;
