/**
 * DegenerateTownView - Visual PixiJS Component for Norse AI Trading Simulation
 *
 * Displays an animated visualization of the Degenerate Town simulation:
 * - Norse god agents trading and moving
 * - Market events with visual effects (Ragnarok, Thor's Thunder, etc.)
 * - Real-time trade indicators
 * - Leaderboard overlay
 */

import React, { useEffect, useRef, useState } from 'react';
import degenerateTownService from '../services/DegenerateTownService';
import { NORSE_AGENTS, MARKET_EVENTS } from '../config/degenerateTown';

// Agent colors for visualization
const AGENT_COLORS = {
  odin_allfather: '#FFD700',    // Gold
  thor_thunderer: '#4169E1',    // Royal Blue
  loki_trickster: '#32CD32',    // Lime Green
  freyja_seer: '#FF69B4',       // Hot Pink
  fenrir_wolf: '#8B0000',       // Dark Red
  heimdall_watcher: '#FFFFFF',  // White
  skadi_hunter: '#00CED1',      // Cyan
};

// Agent positions in the town (percentage-based)
const AGENT_POSITIONS = {
  odin_allfather: { x: 15, y: 30 },    // Odin's Hall (left)
  thor_thunderer: { x: 85, y: 40 },    // Thor's Forge (right)
  loki_trickster: { x: 50, y: 60 },    // Center, always moving
  freyja_seer: { x: 30, y: 50 },       // Near Odin
  fenrir_wolf: { x: 50, y: 35 },       // Center arena
  heimdall_watcher: { x: 70, y: 25 },  // Bifrost Bridge
  skadi_hunter: { x: 20, y: 70 },      // Mountain slopes
};

const DegenerateTownView = ({ simState, compact = false }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [agents, setAgents] = useState([]);
  const [trades, setTrades] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [stats, setStats] = useState(null);

  // Subscribe to DegenerateTownService events
  useEffect(() => {
    const handleTrade = (trade) => {
      setTrades(prev => [...prev.slice(-20), { ...trade, id: Date.now() }]);

      // Update agent state
      setAgents(prev => {
        const updated = [...prev];
        const agentIndex = updated.findIndex(a => a.id === trade.agentId);
        if (agentIndex !== -1) {
          updated[agentIndex] = {
            ...updated[agentIndex],
            lastAction: trade.action,
            lastPnL: trade.pnl,
            flash: true,
          };
        }
        return updated;
      });

      // Clear flash after animation
      setTimeout(() => {
        setAgents(prev => prev.map(a => ({ ...a, flash: false })));
      }, 500);
    };

    const handleMarketEvent = (event) => {
      setCurrentEvent(event);
      setTimeout(() => setCurrentEvent(null), 3000);
    };

    const handleTick = (data) => {
      setStats(data);
      if (data.agents) {
        setAgents(data.agents.map(a => ({
          ...a,
          ...AGENT_POSITIONS[a.id],
          color: AGENT_COLORS[a.id] || '#888888',
        })));
      }
    };

    degenerateTownService.on('trade', handleTrade);
    degenerateTownService.on('marketEvent', handleMarketEvent);
    degenerateTownService.on('tick', handleTick);

    // Initialize agents
    const initialAgents = NORSE_AGENTS.map(a => ({
      ...a,
      ...AGENT_POSITIONS[a.id],
      color: AGENT_COLORS[a.id] || '#888888',
      lastAction: 'idle',
      lastPnL: 0,
      flash: false,
    }));
    setAgents(initialAgents);

    return () => {
      degenerateTownService.off('trade', handleTrade);
      degenerateTownService.off('marketEvent', handleMarketEvent);
      degenerateTownService.off('tick', handleTick);
    };
  }, []);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let particles = [];

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(0.5, '#1a1f3a');
      gradient.addColorStop(1, '#0a1520');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw mountains
      ctx.fillStyle = '#1a1f3a';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      ctx.lineTo(width * 0.25, height * 0.4);
      ctx.lineTo(width * 0.5, height * 0.5);
      ctx.lineTo(width * 0.75, height * 0.35);
      ctx.lineTo(width, height * 0.6);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Draw Ragnarok zone (center)
      if (currentEvent?.type === 'RAGNAROK') {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
      } else {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.4, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Norse runes floating
      ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
      ctx.font = '14px monospace';
      const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
      for (let i = 0; i < 15; i++) {
        const x = (Date.now() / 50 + i * 60) % width;
        const y = 20 + Math.sin(Date.now() / 1000 + i) * 10;
        ctx.fillText(runes[i % runes.length], x, y);
      }

      // Draw agents
      agents.forEach((agent, index) => {
        const x = (agent.x / 100) * width;
        const y = (agent.y / 100) * height;

        // Agent glow
        if (agent.flash) {
          ctx.shadowColor = agent.lastPnL > 0 ? '#00ff00' : '#ff0000';
          ctx.shadowBlur = 20;
        }

        // Agent body
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Agent border
        ctx.strokeStyle = agent.mood === 'triumphant' ? '#ffd700' :
                          agent.mood === 'enraged' ? '#ff0000' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Agent name
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const shortName = agent.name.split(' ')[0];
        ctx.fillText(shortName, x, y + 25);

        // Action indicator
        if (agent.lastAction && agent.lastAction !== 'idle') {
          const actionEmoji = {
            buy: '📈',
            sell: '📉',
            hold: '⏸️',
            scalp: '⚡',
            short: '📊',
          }[agent.lastAction] || '❓';
          ctx.font = '14px sans-serif';
          ctx.fillText(actionEmoji, x, y - 20);
        }

        // PnL indicator
        if (agent.totalPnL) {
          ctx.fillStyle = parseFloat(agent.totalPnL) >= 0 ? '#00ff00' : '#ff0000';
          ctx.font = '9px monospace';
          const pnl = parseFloat(agent.totalPnL).toFixed(2);
          ctx.fillText(`${pnl > 0 ? '+' : ''}${pnl}`, x, y + 35);
        }
      });

      // Draw trade particles
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        ctx.fillStyle = `rgba(${p.color}, ${p.life / 100})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.y -= p.speed;
        p.life -= 2;
      });

      // Add new particles on trades
      if (trades.length > 0) {
        const latestTrade = trades[trades.length - 1];
        const agentPos = AGENT_POSITIONS[latestTrade.agentId];
        if (agentPos && Math.random() < 0.3) {
          particles.push({
            x: (agentPos.x / 100) * width + (Math.random() - 0.5) * 20,
            y: (agentPos.y / 100) * height,
            size: Math.random() * 4 + 2,
            speed: Math.random() * 2 + 1,
            life: 100,
            color: latestTrade.pnl > 0 ? '0, 255, 0' : '255, 0, 0',
          });
        }
      }

      // Draw market event banner
      if (currentEvent) {
        const eventConfig = MARKET_EVENTS[currentEvent.type] || {};
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, height / 2 - 30, width, 60);

        ctx.fillStyle = eventConfig.color || '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ ${currentEvent.type} ⚡`, width / 2, height / 2);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px monospace';
        ctx.fillText(eventConfig.description || '', width / 2, height / 2 + 20);
      }

      // Draw stats overlay
      if (stats && !compact) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, 150, 80);

        ctx.fillStyle = '#00ff41';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Tick: ${stats.currentTick || 0}`, 10, 20);
        ctx.fillText(`Trades: ${stats.totalTrades || 0}`, 10, 35);
        ctx.fillText(`Market: ${stats.marketCondition || 'neutral'}`, 10, 50);
        ctx.fillText(`Agents: ${agents.length}`, 10, 65);
        ctx.fillText(`Vol: ${stats.totalVolume || '0.0000'}`, 10, 80);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [agents, trades, currentEvent, stats, compact]);

  // Handle external simState prop (for compatibility with new AITerminalAgent.jsx)
  useEffect(() => {
    if (simState?.event) {
      setCurrentEvent({ type: simState.event });
    }
    if (simState?.agentActions?.length > 0) {
      const latestAction = simState.agentActions[simState.agentActions.length - 1];
      setTrades(prev => [...prev.slice(-20), {
        ...latestAction,
        id: Date.now(),
        agentId: latestAction.agent?.toLowerCase().replace(' ', '_'),
      }]);
    }
  }, [simState]);

  return (
    <div className="degenerate-town-view" style={{
      position: 'relative',
      width: '100%',
      height: compact ? '200px' : '400px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #333',
    }}>
      <canvas
        ref={canvasRef}
        width={compact ? 400 : 800}
        height={compact ? 200 : 400}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Leaderboard Overlay */}
      {!compact && stats?.leaderboard && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#00ff41',
          minWidth: '140px',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#ffd700' }}>
            LEADERBOARD
          </div>
          {stats.leaderboard.slice(0, 5).map((agent, i) => (
            <div key={agent.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888',
            }}>
              <span>{i + 1}. {agent.name.split(' ')[0]}</span>
              <span style={{ color: agent.totalPnL >= 0 ? '#00ff00' : '#ff0000' }}>
                {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      {!compact && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
        }}>
          <button
            onClick={() => degenerateTownService.start()}
            style={{
              padding: '5px 15px',
              background: '#00aa00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            START
          </button>
          <button
            onClick={() => degenerateTownService.stop()}
            style={{
              padding: '5px 15px',
              background: '#aa0000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            STOP
          </button>
          <button
            onClick={() => degenerateTownService.resetLearning()}
            style={{
              padding: '5px 15px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            RESET
          </button>
        </div>
      )}
    </div>
  );
};

export default DegenerateTownView;
