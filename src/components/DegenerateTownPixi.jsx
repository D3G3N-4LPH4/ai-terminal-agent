/**
 * DegenerateTownPixi - PixiJS-based Visual Component for Norse AI Trading Simulation
 *
 * A rich, animated visualization using PixiJS featuring:
 * - Animated Norse god agent sprites with walk cycles
 * - Particle effects for trades and market events
 * - Dynamic lighting and glow effects
 * - Ragnarok screen-shake and fire effects
 * - Real-time leaderboard and stats overlay
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import degenerateTownService from '../services/DegenerateTownService';
import { NORSE_AGENTS, MARKET_EVENTS } from '../config/degenerateTown';

// Theme colors from CSS
const THEME = {
  background: 0x0a0e27,
  primary: 0x00ff41,
  secondary: 0x1a1f3a,
  accent: 0xffaa00,
  danger: 0xff0000,
  trade: 0xff00ff,
  text: 0x00ff41,
};

// Agent visual configurations
const AGENT_CONFIG = {
  odin_allfather: {
    color: 0xffd700,
    position: { x: 0.15, y: 0.35 },
    symbol: 'ᛟ',
    glowColor: 0xffd700,
  },
  thor_thunderer: {
    color: 0x4169e1,
    position: { x: 0.85, y: 0.45 },
    symbol: 'ᚦ',
    glowColor: 0x00aaff,
  },
  loki_trickster: {
    color: 0x32cd32,
    position: { x: 0.50, y: 0.60 },
    symbol: 'ᛚ',
    glowColor: 0x00ff00,
  },
  freyja_seer: {
    color: 0xff69b4,
    position: { x: 0.30, y: 0.50 },
    symbol: 'ᚠ',
    glowColor: 0xff69b4,
  },
  fenrir_wolf: {
    color: 0x8b0000,
    position: { x: 0.50, y: 0.38 },
    symbol: 'ᚹ',
    glowColor: 0xff0000,
  },
  heimdall_watcher: {
    color: 0xffffff,
    position: { x: 0.75, y: 0.28 },
    symbol: 'ᚺ',
    glowColor: 0xffffff,
  },
  skadi_hunter: {
    color: 0x00ced1,
    position: { x: 0.20, y: 0.70 },
    symbol: 'ᛊ',
    glowColor: 0x00ffff,
  },
};

// Norse runes for decoration
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];

const DegenerateTownPixi = ({ compact = false, onClose }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const agentSpritesRef = useRef({});
  const particlesRef = useRef([]);
  const runesRef = useRef([]);
  const [stats, setStats] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [initError, setInitError] = useState(null);

  // Initialize PixiJS application
  useEffect(() => {
    if (!containerRef.current) return;

    const width = compact ? 450 : 900;
    const height = compact ? 250 : 500;

    // Create PixiJS application
    const app = new PIXI.Application();

    const initPixi = async () => {
      try {
        await app.init({
          width,
          height,
          backgroundColor: THEME.background,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!containerRef.current) return; // Check again after async
        containerRef.current.appendChild(app.canvas);
        appRef.current = app;
        setInitError(null);
      } catch (error) {
        console.error('[DegenerateTownPixi] Init error:', error);
        setInitError(error.message || 'Failed to initialize PixiJS');
        return;
      }

      // Create layers
      const backgroundLayer = new PIXI.Container();
      const buildingLayer = new PIXI.Container();
      const agentLayer = new PIXI.Container();
      const particleLayer = new PIXI.Container();
      const uiLayer = new PIXI.Container();

      app.stage.addChild(backgroundLayer);
      app.stage.addChild(buildingLayer);
      app.stage.addChild(agentLayer);
      app.stage.addChild(particleLayer);
      app.stage.addChild(uiLayer);

      // Draw background gradient
      drawBackground(backgroundLayer, width, height);

      // Draw buildings
      drawBuildings(buildingLayer, width, height);

      // Draw Ragnarok zone
      drawRagnarokZone(buildingLayer, width, height);

      // Create floating runes
      createFloatingRunes(backgroundLayer, width, height);

      // Create agent sprites
      createAgentSprites(agentLayer, width, height);

      // Create UI overlay
      if (!compact) {
        createUIOverlay(uiLayer, width, height);
      }

      // Animation loop
      app.ticker.add((ticker) => {
        updateAnimation(ticker.deltaTime, width, height);
      });
    };

    initPixi().catch(error => {
      console.error('[DegenerateTownPixi] Async init error:', error);
      setInitError(error.message || 'Failed to initialize');
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [compact]);

  // Draw gradient background
  const drawBackground = (container, width, height) => {
    const bg = new PIXI.Graphics();

    // Sky gradient (using rectangles to simulate gradient)
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const y = ratio * height;
      const segmentHeight = height / steps + 1;

      // Interpolate colors
      const r = Math.floor(10 + ratio * 20);
      const g = Math.floor(14 + ratio * 17);
      const b = Math.floor(39 + ratio * 35);
      const color = (r << 16) | (g << 8) | b;

      bg.rect(0, y, width, segmentHeight);
      bg.fill(color);
    }

    // Stars
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.4;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.5 + 0.3;

      bg.circle(x, y, size);
      bg.fill({ color: 0xffffff, alpha });
    }

    container.addChild(bg);
  };

  // Draw Norse buildings
  const drawBuildings = (container, width, height) => {
    const buildings = new PIXI.Graphics();

    // Mountains
    buildings.moveTo(0, height * 0.7);
    buildings.lineTo(width * 0.2, height * 0.4);
    buildings.lineTo(width * 0.35, height * 0.5);
    buildings.lineTo(width * 0.5, height * 0.35);
    buildings.lineTo(width * 0.65, height * 0.45);
    buildings.lineTo(width * 0.8, height * 0.3);
    buildings.lineTo(width, height * 0.5);
    buildings.lineTo(width, height);
    buildings.lineTo(0, height);
    buildings.closePath();
    buildings.fill(0x1a1f3a);

    // Odin's Hall (left)
    const hallX = width * 0.05;
    const hallY = height * 0.45;
    const hallW = width * 0.18;
    const hallH = height * 0.35;

    buildings.rect(hallX, hallY, hallW, hallH);
    buildings.fill(0x2a2f4a);

    // Hall roof
    buildings.moveTo(hallX - 10, hallY);
    buildings.lineTo(hallX + hallW / 2, hallY - 40);
    buildings.lineTo(hallX + hallW + 10, hallY);
    buildings.closePath();
    buildings.fill(0x3a3f5a);

    // Hall windows (glowing)
    buildings.rect(hallX + 15, hallY + 20, 30, 40);
    buildings.fill({ color: 0xffaa00, alpha: 0.6 });
    buildings.rect(hallX + hallW - 45, hallY + 20, 30, 40);
    buildings.fill({ color: 0xffaa00, alpha: 0.6 });

    // Thor's Forge (right)
    const forgeX = width * 0.78;
    const forgeY = height * 0.5;
    const forgeW = width * 0.17;
    const forgeH = height * 0.3;

    buildings.rect(forgeX, forgeY, forgeW, forgeH);
    buildings.fill(0x4a3f3a);

    // Forge chimney
    buildings.rect(forgeX + forgeW - 25, forgeY - 30, 20, 30);
    buildings.fill(0x3a2f2a);

    // Forge fire glow
    buildings.circle(forgeX + forgeW / 2, forgeY + forgeH - 20, 15);
    buildings.fill({ color: 0xff4400, alpha: 0.7 });

    // Ground
    buildings.rect(0, height * 0.8, width, height * 0.2);
    buildings.fill(0x1a2a1a);

    // Bifrost bridge hint (rainbow glow)
    const bifrostX = width * 0.7;
    const bifrostY = height * 0.25;
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0000ff, 0x8b00ff];
    colors.forEach((color, i) => {
      buildings.circle(bifrostX, bifrostY - i * 3, 8 - i);
      buildings.fill({ color, alpha: 0.3 });
    });

    container.addChild(buildings);
  };

  // Draw Ragnarok zone
  const drawRagnarokZone = (container, width, height) => {
    const zone = new PIXI.Graphics();

    // Outer glow
    zone.circle(width / 2, height * 0.42, 70);
    zone.fill({ color: 0xff0000, alpha: 0.1 });

    // Inner circle
    zone.circle(width / 2, height * 0.42, 55);
    zone.stroke({ color: 0xff0000, alpha: 0.4, width: 2 });

    // Rune circle
    const runeRadius = 65;
    const centerX = width / 2;
    const centerY = height * 0.42;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * runeRadius;
      const y = centerY + Math.sin(angle) * runeRadius;

      const runeText = new PIXI.Text({
        text: RUNES[i],
        style: {
          fontFamily: 'monospace',
          fontSize: 12,
          fill: 0xff000066,
        },
      });
      runeText.anchor.set(0.5);
      runeText.position.set(x, y);
      container.addChild(runeText);
    }

    container.addChild(zone);
  };

  // Create floating runes decoration
  const createFloatingRunes = (container, width, height) => {
    runesRef.current = [];

    for (let i = 0; i < 15; i++) {
      const rune = new PIXI.Text({
        text: RUNES[Math.floor(Math.random() * RUNES.length)],
        style: {
          fontFamily: 'monospace',
          fontSize: Math.random() * 10 + 10,
          fill: 0x00ff41,
          alpha: 0.2,
        },
      });

      rune.position.set(
        Math.random() * width,
        Math.random() * height * 0.3
      );
      rune.alpha = Math.random() * 0.3 + 0.1;
      rune._speed = Math.random() * 0.3 + 0.1;
      rune._originalX = rune.position.x;

      container.addChild(rune);
      runesRef.current.push(rune);
    }
  };

  // Create agent sprites
  const createAgentSprites = (container, width, height) => {
    Object.entries(AGENT_CONFIG).forEach(([id, config]) => {
      const agentContainer = new PIXI.Container();

      // Agent glow
      const glow = new PIXI.Graphics();
      glow.circle(0, 0, 25);
      glow.fill({ color: config.glowColor, alpha: 0.2 });
      agentContainer.addChild(glow);

      // Agent body
      const body = new PIXI.Graphics();
      body.circle(0, 0, 15);
      body.fill(config.color);
      body.circle(0, 0, 15);
      body.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
      agentContainer.addChild(body);

      // Agent symbol
      const symbol = new PIXI.Text({
        text: config.symbol,
        style: {
          fontFamily: 'monospace',
          fontSize: 14,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      symbol.anchor.set(0.5);
      agentContainer.addChild(symbol);

      // Agent name
      const agent = NORSE_AGENTS.find(a => a.id === id);
      const name = new PIXI.Text({
        text: agent?.name.split(' ')[0] || id,
        style: {
          fontFamily: 'monospace',
          fontSize: compact ? 8 : 10,
          fill: 0xffffff,
        },
      });
      name.anchor.set(0.5);
      name.position.y = 28;
      agentContainer.addChild(name);

      // PnL text
      const pnl = new PIXI.Text({
        text: '+0.00',
        style: {
          fontFamily: 'monospace',
          fontSize: compact ? 7 : 9,
          fill: 0x00ff00,
        },
      });
      pnl.anchor.set(0.5);
      pnl.position.y = 40;
      agentContainer.addChild(pnl);

      // Action indicator
      const actionText = new PIXI.Text({
        text: '',
        style: {
          fontFamily: 'sans-serif',
          fontSize: 16,
        },
      });
      actionText.anchor.set(0.5);
      actionText.position.y = -30;
      agentContainer.addChild(actionText);

      // Position agent
      agentContainer.position.set(
        config.position.x * width,
        config.position.y * height
      );

      container.addChild(agentContainer);

      agentSpritesRef.current[id] = {
        container: agentContainer,
        glow,
        body,
        symbol,
        name,
        pnl,
        actionText,
        config,
        bobPhase: Math.random() * Math.PI * 2,
      };
    });
  };

  // Create UI overlay
  const createUIOverlay = (container, width, height) => {
    // Stats panel background
    const panel = new PIXI.Graphics();
    panel.roundRect(10, 10, 160, 100, 5);
    panel.fill({ color: 0x000000, alpha: 0.7 });
    panel.roundRect(10, 10, 160, 100, 5);
    panel.stroke({ color: THEME.primary, width: 1, alpha: 0.5 });
    container.addChild(panel);

    // Stats title
    const title = new PIXI.Text({
      text: 'DEGENERATE TOWN',
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xffd700,
        fontWeight: 'bold',
      },
    });
    title.position.set(20, 15);
    container.addChild(title);

    // Leaderboard panel (right side)
    const lbPanel = new PIXI.Graphics();
    lbPanel.roundRect(width - 170, 10, 160, 130, 5);
    lbPanel.fill({ color: 0x000000, alpha: 0.7 });
    lbPanel.roundRect(width - 170, 10, 160, 130, 5);
    lbPanel.stroke({ color: 0xffd700, width: 1, alpha: 0.5 });
    container.addChild(lbPanel);

    const lbTitle = new PIXI.Text({
      text: 'LEADERBOARD',
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xffd700,
        fontWeight: 'bold',
      },
    });
    lbTitle.position.set(width - 160, 15);
    container.addChild(lbTitle);
  };

  // Animation update loop
  const updateAnimation = (delta, width, height) => {
    const time = Date.now() / 1000;

    // Update floating runes
    runesRef.current.forEach((rune, i) => {
      rune.position.x = rune._originalX + Math.sin(time + i) * 20;
      rune.alpha = 0.1 + Math.sin(time * 0.5 + i) * 0.1;
    });

    // Update agent positions (bobbing)
    Object.values(agentSpritesRef.current).forEach((agent) => {
      agent.bobPhase += 0.05 * delta;
      const bobOffset = Math.sin(agent.bobPhase) * 3;

      // Keep x position, only bob y
      const baseY = agent.config.position.y * height;
      agent.container.position.y = baseY + bobOffset;

      // Pulse glow
      agent.glow.alpha = 0.15 + Math.sin(time * 2) * 0.1;
    });

    // Update particles
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.y -= particle.speed * delta;
      particle.life -= delta * 2;
      particle.alpha = particle.life / 100;

      if (particle.life <= 0) {
        particle.parent?.removeChild(particle);
        return false;
      }
      return true;
    });
  };

  // Subscribe to service events
  useEffect(() => {
    const handleTrade = (trade) => {
      const agentSprite = agentSpritesRef.current[trade.agentId];
      if (!agentSprite) return;

      // Update PnL display
      const pnlValue = parseFloat(trade.pnl);
      agentSprite.pnl.text = `${pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)}`;
      agentSprite.pnl.style.fill = pnlValue >= 0 ? 0x00ff00 : 0xff0000;

      // Update action indicator
      const actionEmoji = {
        buy: '📈',
        sell: '📉',
        hold: '⏸️',
        scalp: '⚡',
        short: '📊',
      }[trade.action] || '';
      agentSprite.actionText.text = actionEmoji;

      // Flash glow
      agentSprite.glow.alpha = 0.8;
      agentSprite.glow.tint = pnlValue >= 0 ? 0x00ff00 : 0xff0000;

      // Spawn particles
      if (appRef.current) {
        const particleLayer = appRef.current.stage.children[3];
        for (let i = 0; i < 5; i++) {
          const particle = new PIXI.Graphics();
          particle.circle(0, 0, Math.random() * 3 + 1);
          particle.fill(pnlValue >= 0 ? 0x00ff00 : 0xff0000);
          particle.position.set(
            agentSprite.container.position.x + (Math.random() - 0.5) * 30,
            agentSprite.container.position.y
          );
          particle.speed = Math.random() * 2 + 1;
          particle.life = 100;
          particleLayer.addChild(particle);
          particlesRef.current.push(particle);
        }
      }

      // Clear action after delay
      setTimeout(() => {
        agentSprite.actionText.text = '';
        agentSprite.glow.tint = agentSprite.config.glowColor;
      }, 1500);
    };

    const handleMarketEvent = (event) => {
      if (!appRef.current) return;

      if (event.type === 'RAGNAROK') {
        // Screen shake effect
        let shakeCount = 0;
        const shakeInterval = setInterval(() => {
          if (shakeCount >= 20) {
            clearInterval(shakeInterval);
            appRef.current.stage.position.set(0, 0);
            return;
          }
          appRef.current.stage.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          );
          shakeCount++;
        }, 50);

        // Flash red
        const flash = new PIXI.Graphics();
        flash.rect(0, 0, appRef.current.screen.width, appRef.current.screen.height);
        flash.fill({ color: 0xff0000, alpha: 0.3 });
        appRef.current.stage.addChild(flash);

        setTimeout(() => {
          appRef.current.stage.removeChild(flash);
        }, 500);
      }
    };

    const handleTick = (data) => {
      setStats(data);
      setIsRunning(data.isRunning);

      // Update agent states from tick data
      if (data.agents) {
        data.agents.forEach((agentData) => {
          const agentSprite = agentSpritesRef.current[agentData.id];
          if (agentSprite) {
            const pnl = parseFloat(agentData.totalPnL);
            agentSprite.pnl.text = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
            agentSprite.pnl.style.fill = pnl >= 0 ? 0x00ff00 : 0xff0000;
          }
        });
      }
    };

    degenerateTownService.on('trade', handleTrade);
    degenerateTownService.on('marketEvent', handleMarketEvent);
    degenerateTownService.on('tick', handleTick);

    // Get initial stats
    const initialStats = degenerateTownService.getStats();
    setStats(initialStats);
    setIsRunning(initialStats.isRunning);

    return () => {
      degenerateTownService.off('trade', handleTrade);
      degenerateTownService.off('marketEvent', handleMarketEvent);
      degenerateTownService.off('tick', handleTick);
    };
  }, []);

  const handleStart = useCallback(() => {
    degenerateTownService.start();
  }, []);

  const handleStop = useCallback(() => {
    degenerateTownService.stop();
  }, []);

  const handleReset = useCallback(() => {
    degenerateTownService.resetLearning();
  }, []);

  // Render error fallback if initialization failed
  if (initError) {
    return (
      <div className="degenerate-town-pixi" style={{
        position: 'relative',
        width: compact ? '450px' : '900px',
        height: compact ? '250px' : '500px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #ff4444',
        background: '#0a0e27',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#ff4444',
        padding: '20px',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>PixiJS Failed to Initialize</div>
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '15px' }}>
          {initError}
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          Try: degen view (for Canvas fallback)
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginTop: '15px',
              background: '#ff4444',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="degenerate-town-pixi" style={{
      position: 'relative',
      width: compact ? '450px' : '900px',
      height: compact ? '250px' : '500px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: `2px solid ${isRunning ? '#00ff41' : '#333'}`,
      boxShadow: isRunning ? '0 0 20px rgba(0, 255, 65, 0.3)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {/* PixiJS Canvas Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Stats Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: compact ? '10px' : '12px',
        color: '#00ff41',
        border: '1px solid #00ff4133',
      }}>
        <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '5px' }}>
          DEGENERATE TOWN
        </div>
        <div>Status: {isRunning ? '🟢 LIVE' : '🔴 STOPPED'}</div>
        <div>Tick: {stats?.currentTick || 0}</div>
        <div>Trades: {stats?.totalTrades || 0}</div>
        <div>Market: {stats?.marketCondition?.toUpperCase() || 'N/A'}</div>
      </div>

      {/* Leaderboard */}
      {!compact && stats?.leaderboard && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#00ff41',
          minWidth: '150px',
          border: '1px solid #ffd70033',
        }}>
          <div style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '8px' }}>
            LEADERBOARD
          </div>
          {stats.leaderboard.slice(0, 5).map((agent, i) => (
            <div key={agent.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '3px',
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
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
      }}>
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            padding: compact ? '4px 12px' : '8px 20px',
            background: isRunning ? '#333' : '#00aa00',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontSize: compact ? '10px' : '12px',
            transition: 'all 0.2s',
          }}
        >
          START
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            padding: compact ? '4px 12px' : '8px 20px',
            background: !isRunning ? '#333' : '#aa0000',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRunning ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontSize: compact ? '10px' : '12px',
            transition: 'all 0.2s',
          }}
        >
          STOP
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: compact ? '4px 12px' : '8px 20px',
            background: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: compact ? '10px' : '12px',
            transition: 'all 0.2s',
          }}
        >
          RESET
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: compact ? '4px 12px' : '8px 20px',
              background: '#660000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: compact ? '10px' : '12px',
            }}
          >
            CLOSE
          </button>
        )}
      </div>
    </div>
  );
};

export default DegenerateTownPixi;
