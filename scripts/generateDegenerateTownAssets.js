// scripts/generateDegenerateTownAssets.js
// Run with: node scripts/generateDegenerateTownAssets.js
// Requires: npm install canvas

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "../public/assets");

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

console.log("🎨 Generating Degenerate Town placeholder assets...\n");

// ==================== TOWN BACKGROUND ====================
function generateTownBackground() {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");

  // Dark Norse sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, 600);
  skyGradient.addColorStop(0, "#0a0e27");
  skyGradient.addColorStop(0.5, "#1a1f3a");
  skyGradient.addColorStop(1, "#2a2f4a");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, 800, 600);

  // Mountains
  ctx.fillStyle = "#1a1f3a";
  ctx.beginPath();
  ctx.moveTo(0, 400);
  ctx.lineTo(200, 250);
  ctx.lineTo(400, 300);
  ctx.lineTo(600, 200);
  ctx.lineTo(800, 350);
  ctx.lineTo(800, 600);
  ctx.lineTo(0, 600);
  ctx.closePath();
  ctx.fill();

  // Odin's Hall (left building)
  ctx.fillStyle = "#3a3f5a";
  ctx.fillRect(50, 300, 150, 200);
  ctx.fillStyle = "#4a4f6a";
  ctx.fillRect(60, 320, 50, 60); // Window
  ctx.fillRect(140, 320, 50, 60); // Window

  // Roof
  ctx.fillStyle = "#2a2f4a";
  ctx.beginPath();
  ctx.moveTo(40, 300);
  ctx.lineTo(125, 250);
  ctx.lineTo(210, 300);
  ctx.closePath();
  ctx.fill();

  // Thor's Forge (right building)
  ctx.fillStyle = "#4a3f3a";
  ctx.fillRect(600, 350, 150, 150);
  ctx.fillStyle = "#5a4f4a";
  ctx.fillRect(620, 380, 40, 50); // Anvil window

  // Chimney
  ctx.fillStyle = "#3a2f2a";
  ctx.fillRect(720, 320, 20, 30);

  // Ground
  ctx.fillStyle = "#2a3f2a";
  ctx.fillRect(0, 500, 800, 100);

  // Ragnarok zone circle in center
  ctx.strokeStyle = "#ff000033";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(400, 300, 100, 0, Math.PI * 2);
  ctx.stroke();

  // Matrix-style "runes" (decorative)
  ctx.fillStyle = "#00ff4133";
  ctx.font = "12px monospace";
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 200;
    ctx.fillText(
      ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ"][Math.floor(Math.random() * 5)],
      x,
      y,
    );
  }

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(ASSETS_DIR, "town-bg.png"), buffer);
  console.log("✅ Generated town-bg.png (800x600)");
}

// ==================== THOR'S HAMMER ====================
function generateHammer() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext("2d");

  // Hammer head (silver/gray)
  ctx.fillStyle = "#a0a0a0";
  ctx.fillRect(8, 20, 48, 24);
  ctx.fillStyle = "#c0c0c0";
  ctx.fillRect(12, 24, 40, 16); // Highlight

  // Handle (brown wood)
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(28, 44, 8, 16);

  // Lightning effect
  ctx.strokeStyle = "#ffff00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 15);
  ctx.lineTo(25, 10);
  ctx.lineTo(22, 5);
  ctx.stroke();

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(ASSETS_DIR, "hammer.png"), buffer);
  console.log("✅ Generated hammer.png (64x64)");
}

// ==================== PARTICLE (Fire dot) ====================
function generateParticle() {
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext("2d");

  // Radial gradient for soft glow
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.3, "#ffff00");
  gradient.addColorStop(0.6, "#ff8800");
  gradient.addColorStop(1, "#ff000000");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(ASSETS_DIR, "particle.png"), buffer);
  console.log("✅ Generated particle.png (16x16)");
}

// ==================== LOKI WALK CYCLE ====================
function generateLokiWalkCycle() {
  const frames = 8;

  for (let frameNum = 0; frameNum < frames; frameNum++) {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext("2d");

    // Body (green trickster cloak)
    ctx.fillStyle = "#00aa00";
    const bodyY = 30 + Math.sin((frameNum * Math.PI) / 4) * 2; // Bob up/down
    ctx.fillRect(20, bodyY, 24, 30);

    // Head
    ctx.fillStyle = "#ffcc99";
    ctx.beginPath();
    ctx.arc(32, 20, 10, 0, Math.PI * 2);
    ctx.fill();

    // Horns (Loki's helmet)
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(24, 12, 4, 10);
    ctx.fillRect(40, 12, 4, 10);

    // Eyes
    ctx.fillStyle = "#00ff00"; // Glowing green
    ctx.fillRect(28, 18, 3, 3);
    ctx.fillRect(37, 18, 3, 3);

    // Legs (alternating walk)
    const leftLegPhase = frameNum % 4;
    const rightLegPhase = (frameNum + 2) % 4;

    ctx.fillStyle = "#006600";
    // Left leg
    ctx.fillRect(24, bodyY + 30, 8, 10 + leftLegPhase * 2);
    // Right leg
    ctx.fillRect(36, bodyY + 30, 8, 10 + rightLegPhase * 2);

    // Staff (trickster's weapon)
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 25);
    ctx.lineTo(16, 55);
    ctx.stroke();

    // Staff gem
    ctx.fillStyle = "#00ff00";
    ctx.beginPath();
    ctx.arc(16, 22, 3, 0, Math.PI * 2);
    ctx.fill();

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(
      path.join(ASSETS_DIR, `loki_walk_${frameNum}.png`),
      buffer,
    );
  }

  console.log(`✅ Generated loki_walk_0.png to loki_walk_7.png (64x64 each)`);
}

// ==================== EXECUTE ALL ====================
try {
  generateTownBackground();
  generateHammer();
  generateParticle();
  generateLokiWalkCycle();

  console.log("\n🎉 All Degenerate Town assets generated successfully!");
  console.log(`📁 Assets saved to: ${ASSETS_DIR}\n`);

  console.log("Next steps:");
  console.log("1. Run: npm install pixi.js @pixi/particle-emitter");
  console.log("2. Import DegenerateTownView into your AITerminalAgent.jsx");
  console.log("3. Pass simState prop with trade events\n");
} catch (error) {
  console.error("❌ Error generating assets:", error);
  process.exit(1);
}
