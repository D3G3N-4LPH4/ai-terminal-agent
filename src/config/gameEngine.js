/**
 * Game Engine Systems for Degenerate Realms
 *
 * Based on Terraria/Godot patterns for:
 * - Chunk-based world management
 * - Dynamic 2D lighting
 * - Physics and collision layers
 * - Item and crafting systems
 */

// ==================== CHUNK SYSTEM ====================

export const CHUNK_CONFIG = {
  chunkWidth: 32,  // tiles per chunk
  chunkHeight: 32,
  loadRadius: 2,   // chunks to load around player
  unloadRadius: 4, // chunks to unload beyond this
};

/**
 * Chunk Manager - Handles loading/unloading world chunks
 * for efficient large world management
 */
export class ChunkManager {
  constructor(world, tileSize) {
    this.world = world;
    this.tileSize = tileSize;
    this.loadedChunks = new Map();
    this.chunkWidth = CHUNK_CONFIG.chunkWidth;
    this.chunkHeight = CHUNK_CONFIG.chunkHeight;
  }

  // Get chunk coordinates from world position
  getChunkCoords(worldX, worldY) {
    return {
      cx: Math.floor(worldX / (this.chunkWidth * this.tileSize)),
      cy: Math.floor(worldY / (this.chunkHeight * this.tileSize)),
    };
  }

  // Get chunk key for Map storage
  getChunkKey(cx, cy) {
    return `${cx},${cy}`;
  }

  // Load chunks around player position
  loadChunksAroundPlayer(playerX, playerY, renderer) {
    const { cx: playerCX, cy: playerCY } = this.getChunkCoords(playerX, playerY);
    const loadRadius = CHUNK_CONFIG.loadRadius;

    const chunksToLoad = [];

    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dy = -loadRadius; dy <= loadRadius; dy++) {
        const cx = playerCX + dx;
        const cy = playerCY + dy;
        const key = this.getChunkKey(cx, cy);

        if (!this.loadedChunks.has(key)) {
          chunksToLoad.push({ cx, cy, key });
        }
      }
    }

    return chunksToLoad;
  }

  // Unload chunks far from player
  unloadDistantChunks(playerX, playerY) {
    const { cx: playerCX, cy: playerCY } = this.getChunkCoords(playerX, playerY);
    const unloadRadius = CHUNK_CONFIG.unloadRadius;

    const chunksToUnload = [];

    for (const [key, chunk] of this.loadedChunks) {
      const [cx, cy] = key.split(',').map(Number);
      const dist = Math.max(Math.abs(cx - playerCX), Math.abs(cy - playerCY));

      if (dist > unloadRadius) {
        chunksToUnload.push(key);
      }
    }

    return chunksToUnload;
  }

  // Get tiles in a specific chunk
  getChunkTiles(cx, cy) {
    const tiles = [];
    const startX = cx * this.chunkWidth;
    const startY = cy * this.chunkHeight;

    for (let dy = 0; dy < this.chunkHeight; dy++) {
      for (let dx = 0; dx < this.chunkWidth; dx++) {
        const wx = startX + dx;
        const wy = startY + dy;

        if (this.world[wy]?.[wx] !== undefined) {
          tiles.push({
            x: wx,
            y: wy,
            blockId: this.world[wy][wx],
          });
        }
      }
    }

    return tiles;
  }
}

// ==================== LIGHTING SYSTEM ====================

export const LIGHTING_CONFIG = {
  ambientLight: 0.3,      // Base ambient light level
  sunlightIntensity: 1.0,
  torchRadius: 8,         // tiles
  torchIntensity: 1.0,
  torchColor: 0xffaa44,
  crystalGlowRadius: 4,
  crystalColors: [0xff64ff, 0x64ffff, 0xffff64],
  hellstoneGlowRadius: 3,
  hellstoneColor: 0xff4500,
  surfaceLevel: 50,       // Y level where sunlight stops
  lightFalloff: 0.85,     // Light intensity multiplier per tile distance
};

/**
 * Light Source definition
 */
export class LightSource {
  constructor(x, y, radius, intensity, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.intensity = intensity;
    this.color = color;
    this.flickerPhase = Math.random() * Math.PI * 2;
  }

  // Get light intensity at a specific tile
  getIntensityAt(tileX, tileY, time = 0) {
    const dx = tileX - this.x;
    const dy = tileY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.radius) return 0;

    // Falloff calculation
    const falloff = Math.pow(LIGHTING_CONFIG.lightFalloff, dist);
    let intensity = this.intensity * falloff;

    // Torch flicker effect
    if (this.color === LIGHTING_CONFIG.torchColor) {
      intensity *= 0.9 + 0.1 * Math.sin(time * 0.01 + this.flickerPhase);
    }

    return Math.max(0, Math.min(1, intensity));
  }
}

/**
 * Lighting Manager - Calculates light levels for tiles with caching
 */
export class LightingManager {
  constructor(world, surfaceLevel) {
    this.world = world;
    this.surfaceLevel = surfaceLevel;
    this.lightSources = [];
    this.lightMap = null;
    this.width = world[0]?.length || 0;
    this.height = world.length;
    // Caching
    this.skyOcclusionCache = null; // Cache for skylight blocking
    this.lightSourceCache = new Map(); // Cache for light source contributions
    this.cacheVersion = 0;
    this.lastCameraX = -1;
    this.lastCameraY = -1;
  }

  // Initialize light map
  initLightMap() {
    this.lightMap = Array(this.height).fill(null)
      .map(() => Array(this.width).fill(LIGHTING_CONFIG.ambientLight));
    this.skyOcclusionCache = Array(this.width).fill(null);
    this.precomputeSkyOcclusion();
  }

  // Precompute sky occlusion for each column
  precomputeSkyOcclusion() {
    for (let x = 0; x < this.width; x++) {
      let firstBlockY = this.height;
      for (let y = 0; y < this.height; y++) {
        if (this.world[y]?.[x] && this.world[y][x] !== 0) {
          firstBlockY = y;
          break;
        }
      }
      this.skyOcclusionCache[x] = firstBlockY;
    }
  }

  // Invalidate cache for a column (when block is mined/placed)
  invalidateColumn(x) {
    if (x >= 0 && x < this.width) {
      let firstBlockY = this.height;
      for (let y = 0; y < this.height; y++) {
        if (this.world[y]?.[x] && this.world[y][x] !== 0) {
          firstBlockY = y;
          break;
        }
      }
      this.skyOcclusionCache[x] = firstBlockY;
      this.cacheVersion++;
    }
  }

  // Add a light source
  addLight(x, y, radius, intensity, color) {
    const light = new LightSource(x, y, radius, intensity, color);
    this.lightSources.push(light);
    return light;
  }

  // Remove a light source
  removeLight(light) {
    const index = this.lightSources.indexOf(light);
    if (index > -1) {
      this.lightSources.splice(index, 1);
    }
  }

  // Find and register light-emitting blocks
  scanForLightBlocks(BLOCK_TYPES) {
    this.lightSources = []; // Clear existing block lights

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const blockId = this.world[y]?.[x];
        if (!blockId) continue;

        // Find block type
        const blockType = Object.values(BLOCK_TYPES).find(b => b.id === blockId);
        if (!blockType) continue;

        // Torch
        if (blockType.name === 'Torch' || blockId === 17) {
          this.addLight(x, y, LIGHTING_CONFIG.torchRadius,
            LIGHTING_CONFIG.torchIntensity, LIGHTING_CONFIG.torchColor);
        }

        // Glowing ores
        if (blockType.ore && blockType.name?.includes('Solana')) {
          this.addLight(x, y, 3, 0.5, 0x9400d3);
        }
        if (blockType.ore && blockType.name?.includes('Bitcoin')) {
          this.addLight(x, y, 4, 0.6, 0xffa500);
        }
        if (blockType.ore && blockType.name?.includes('Degen')) {
          this.addLight(x, y, 2, 0.4, 0x00ff80);
        }

        // Rainbow Crystal
        if (blockType.name?.includes('Rainbow')) {
          this.addLight(x, y, LIGHTING_CONFIG.crystalGlowRadius, 0.8,
            LIGHTING_CONFIG.crystalColors[Math.floor(Math.random() * 3)]);
        }

        // Hellstone
        if (blockType.name?.includes('Hellstone')) {
          this.addLight(x, y, LIGHTING_CONFIG.hellstoneGlowRadius, 0.5,
            LIGHTING_CONFIG.hellstoneColor);
        }
      }
    }
  }

  // Calculate light level at a specific tile (optimized with caching)
  calculateLightAt(tileX, tileY, time = 0) {
    let totalLight = 0;

    // Sunlight (above surface)
    if (tileY < this.surfaceLevel) {
      const depthFactor = Math.max(0, 1 - (this.surfaceLevel - tileY) / 50);
      totalLight = LIGHTING_CONFIG.sunlightIntensity * depthFactor;
    } else {
      // Underground ambient
      totalLight = LIGHTING_CONFIG.ambientLight * 0.3;
    }

    // Check if tile is blocked from sky (using cached value)
    if (tileY > 0 && tileX >= 0 && tileX < this.width) {
      const firstBlockY = this.skyOcclusionCache?.[tileX] ?? 0;
      if (tileY >= firstBlockY && tileY < this.surfaceLevel) {
        totalLight *= 0.3;
      }
    }

    // Add contribution from light sources (only check nearby sources)
    for (const light of this.lightSources) {
      // Quick distance check before expensive calculation
      const dx = Math.abs(tileX - light.x);
      const dy = Math.abs(tileY - light.y);
      if (dx > light.radius || dy > light.radius) continue;

      const contribution = light.getIntensityAt(tileX, tileY, time);
      totalLight = Math.max(totalLight, contribution);
    }

    return Math.max(0, Math.min(1, totalLight));
  }

  // Update light map for visible area (with delta updates)
  updateLightMap(startX, startY, width, height, time = 0) {
    // Only recalculate if camera moved or cache invalidated
    const cameraMoved = startX !== this.lastCameraX || startY !== this.lastCameraY;

    // For torches with flicker, only update every 10 frames
    const shouldUpdateFlicker = (time % 10) === 0;

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = startX + dx;
        const ty = startY + dy;

        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
          if (!this.lightMap[ty]) this.lightMap[ty] = [];

          // Skip if we already have a cached value and camera didn't move
          if (!cameraMoved && this.lightMap[ty][tx] !== undefined && !shouldUpdateFlicker) {
            continue;
          }

          this.lightMap[ty][tx] = this.calculateLightAt(tx, ty, time);
        }
      }
    }

    this.lastCameraX = startX;
    this.lastCameraY = startY;
  }

  // Get light level at tile (from cached map)
  getLightAt(tileX, tileY) {
    return this.lightMap?.[tileY]?.[tileX] ?? LIGHTING_CONFIG.ambientLight;
  }
}

// ==================== PHYSICS SYSTEM ====================

export const PHYSICS_CONFIG = {
  gravity: 0.5,
  maxFallSpeed: 15,
  friction: 0.85,
  airFriction: 0.98,
  bounceThreshold: 5, // Minimum velocity for bounce
};

/**
 * Collision Layers - Bitwise flags for collision filtering
 */
export const COLLISION_LAYERS = {
  NONE: 0,
  WORLD: 1 << 0,      // Solid blocks
  PLAYER: 1 << 1,
  ENEMY: 1 << 2,
  PROJECTILE: 1 << 3,
  ITEM: 1 << 4,
  NPC: 1 << 5,
  PLATFORM: 1 << 6,   // One-way platforms
  LIQUID: 1 << 7,     // Water/lava
};

/**
 * Collision masks - What each layer collides with
 */
export const COLLISION_MASKS = {
  PLAYER: COLLISION_LAYERS.WORLD | COLLISION_LAYERS.ENEMY | COLLISION_LAYERS.PLATFORM | COLLISION_LAYERS.ITEM,
  ENEMY: COLLISION_LAYERS.WORLD | COLLISION_LAYERS.PLAYER | COLLISION_LAYERS.PLATFORM,
  PROJECTILE: COLLISION_LAYERS.WORLD | COLLISION_LAYERS.ENEMY,
  ITEM: COLLISION_LAYERS.WORLD | COLLISION_LAYERS.PLAYER,
  NPC: COLLISION_LAYERS.WORLD | COLLISION_LAYERS.PLATFORM,
};

/**
 * Physics Body - Represents a physics-enabled entity
 */
export class PhysicsBody {
  constructor(x, y, width, height, layer = COLLISION_LAYERS.NONE) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.onWall = false;
    this.onCeiling = false;
    this.layer = layer;
    this.mask = COLLISION_MASKS[this.getLayerName(layer)] || COLLISION_LAYERS.WORLD;
    this.bounce = 0;      // Bounciness factor (0-1)
    this.mass = 1;
    this.gravityScale = 1;
    this.isStatic = false;
  }

  getLayerName(layer) {
    for (const [name, value] of Object.entries(COLLISION_LAYERS)) {
      if (value === layer) return name;
    }
    return 'NONE';
  }

  // Check if this body should collide with another
  shouldCollideWith(otherLayer) {
    return (this.mask & otherLayer) !== 0;
  }

  // Apply gravity
  applyGravity(dt = 1) {
    if (this.isStatic) return;

    this.vy += PHYSICS_CONFIG.gravity * this.gravityScale * dt;
    this.vy = Math.min(this.vy, PHYSICS_CONFIG.maxFallSpeed);
  }

  // Apply friction
  applyFriction(dt = 1) {
    if (this.isStatic) return;

    const friction = this.onGround ? PHYSICS_CONFIG.friction : PHYSICS_CONFIG.airFriction;
    this.vx *= friction;
  }

  // Get bounding box
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height,
    };
  }

  // Check AABB collision with another body
  intersects(other) {
    const a = this.getBounds();
    const b = other.getBounds();

    return a.left < b.right &&
           a.right > b.left &&
           a.top < b.bottom &&
           a.bottom > b.top;
  }
}

/**
 * Physics World - Manages all physics bodies and collisions
 */
export class PhysicsWorld {
  constructor(worldData, tileSize) {
    this.worldData = worldData;
    this.tileSize = tileSize;
    this.bodies = [];
    this.width = worldData[0]?.length || 0;
    this.height = worldData.length;
  }

  addBody(body) {
    this.bodies.push(body);
    return body;
  }

  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }
  }

  // Check if a tile is solid
  isSolidAt(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return true; // Treat out of bounds as solid
    }
    const blockId = this.worldData[tileY]?.[tileX];
    return blockId && blockId !== 0;
  }

  // Check if a tile is a platform (one-way)
  isPlatformAt(tileX, tileY) {
    const blockId = this.worldData[tileY]?.[tileX];
    // Platform block IDs (wood platforms, etc.)
    return blockId === 20; // Assume 20 is platform
  }

  // Resolve collision for a body against world tiles
  resolveWorldCollision(body, axis) {
    const bounds = body.getBounds();
    const left = Math.floor(bounds.left / this.tileSize);
    const right = Math.floor(bounds.right / this.tileSize);
    const top = Math.floor(bounds.top / this.tileSize);
    const bottom = Math.floor(bounds.bottom / this.tileSize);

    body.onGround = false;
    body.onWall = false;
    body.onCeiling = false;

    for (let ty = Math.max(0, top); ty <= Math.min(this.height - 1, bottom); ty++) {
      for (let tx = Math.max(0, left); tx <= Math.min(this.width - 1, right); tx++) {
        if (!this.isSolidAt(tx, ty)) continue;

        // Platform check - only collide from above
        if (this.isPlatformAt(tx, ty) && body.vy <= 0) {
          continue;
        }

        const tileLeft = tx * this.tileSize;
        const tileRight = (tx + 1) * this.tileSize;
        const tileTop = ty * this.tileSize;
        const tileBottom = (ty + 1) * this.tileSize;

        if (axis === 'x') {
          if (body.vx > 0 && bounds.right > tileLeft && bounds.left < tileLeft) {
            body.x = tileLeft - body.width;
            if (body.bounce > 0 && Math.abs(body.vx) > PHYSICS_CONFIG.bounceThreshold) {
              body.vx = -body.vx * body.bounce;
            } else {
              body.vx = 0;
            }
            body.onWall = true;
          } else if (body.vx < 0 && bounds.left < tileRight && bounds.right > tileRight) {
            body.x = tileRight;
            if (body.bounce > 0 && Math.abs(body.vx) > PHYSICS_CONFIG.bounceThreshold) {
              body.vx = -body.vx * body.bounce;
            } else {
              body.vx = 0;
            }
            body.onWall = true;
          }
        } else if (axis === 'y') {
          if (body.vy > 0 && bounds.bottom > tileTop && bounds.top < tileTop) {
            body.y = tileTop - body.height;
            if (body.bounce > 0 && Math.abs(body.vy) > PHYSICS_CONFIG.bounceThreshold) {
              body.vy = -body.vy * body.bounce;
            } else {
              body.vy = 0;
            }
            body.onGround = true;
          } else if (body.vy < 0 && bounds.top < tileBottom && bounds.bottom > tileBottom) {
            body.y = tileBottom;
            if (body.bounce > 0 && Math.abs(body.vy) > PHYSICS_CONFIG.bounceThreshold) {
              body.vy = -body.vy * body.bounce;
            } else {
              body.vy = 0;
            }
            body.onCeiling = true;
          }
        }
      }
    }
  }

  // Update all bodies
  update(dt = 1) {
    for (const body of this.bodies) {
      if (body.isStatic) continue;

      // Apply forces
      body.applyGravity(dt);
      body.applyFriction(dt);

      // Move X
      body.x += body.vx * dt;
      this.resolveWorldCollision(body, 'x');

      // Move Y
      body.y += body.vy * dt;
      this.resolveWorldCollision(body, 'y');

      // Clamp to world bounds
      body.x = Math.max(0, Math.min(body.x, this.width * this.tileSize - body.width));
      body.y = Math.max(0, Math.min(body.y, this.height * this.tileSize - body.height));
    }

    // Check body-to-body collisions
    this.checkBodyCollisions();
  }

  // Check collisions between bodies
  checkBodyCollisions() {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];

        if (!a.shouldCollideWith(b.layer) && !b.shouldCollideWith(a.layer)) {
          continue;
        }

        if (a.intersects(b)) {
          // Trigger collision event (to be handled by game logic)
          a.onCollision?.(b);
          b.onCollision?.(a);
        }
      }
    }
  }
}

// ==================== ITEM SYSTEM ====================

export const ITEM_TYPES = {
  BLOCK: 'block',
  TOOL: 'tool',
  WEAPON: 'weapon',
  CONSUMABLE: 'consumable',
  MATERIAL: 'material',
  CURRENCY: 'currency',
};

export const TOOL_TYPES = {
  PICKAXE: 'pickaxe',
  AXE: 'axe',
  HAMMER: 'hammer',
  SWORD: 'sword',
  BOW: 'bow',
};

/**
 * Item definition
 */
export class Item {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type || ITEM_TYPES.MATERIAL;
    this.stackSize = config.stackSize || 999;
    this.value = config.value || 0;
    this.rarity = config.rarity || 'common';
    this.sprite = config.sprite;
    this.description = config.description || '';

    // Tool-specific
    this.toolType = config.toolType;
    this.power = config.power || 0;
    this.speed = config.speed || 1;
    this.damage = config.damage || 0;
    this.range = config.range || 40;

    // Block-specific
    this.placesBlock = config.placesBlock; // Block ID this item places
  }
}

/**
 * Inventory slot
 */
export class InventorySlot {
  constructor(item = null, quantity = 0) {
    this.item = item;
    this.quantity = quantity;
  }

  isEmpty() {
    return this.item === null || this.quantity <= 0;
  }

  canStack(item) {
    return this.item && this.item.id === item.id && this.quantity < this.item.stackSize;
  }

  add(item, quantity = 1) {
    if (this.isEmpty()) {
      this.item = item;
      this.quantity = quantity;
      return 0;
    }

    if (this.canStack(item)) {
      const space = this.item.stackSize - this.quantity;
      const toAdd = Math.min(space, quantity);
      this.quantity += toAdd;
      return quantity - toAdd;
    }

    return quantity;
  }

  remove(quantity = 1) {
    if (this.isEmpty()) return 0;

    const toRemove = Math.min(this.quantity, quantity);
    this.quantity -= toRemove;

    if (this.quantity <= 0) {
      this.item = null;
      this.quantity = 0;
    }

    return toRemove;
  }
}

/**
 * Inventory Manager
 */
export class Inventory {
  constructor(size = 40, hotbarSize = 10) {
    this.size = size;
    this.hotbarSize = hotbarSize;
    this.slots = Array(size).fill(null).map(() => new InventorySlot());
    this.selectedSlot = 0;
  }

  // Add item to inventory (returns remaining quantity)
  addItem(item, quantity = 1) {
    let remaining = quantity;

    // First try to stack with existing items
    for (const slot of this.slots) {
      if (slot.canStack(item)) {
        remaining = slot.add(item, remaining);
        if (remaining === 0) return 0;
      }
    }

    // Then try empty slots
    for (const slot of this.slots) {
      if (slot.isEmpty()) {
        remaining = slot.add(item, remaining);
        if (remaining === 0) return 0;
      }
    }

    return remaining;
  }

  // Remove item from inventory
  removeItem(itemId, quantity = 1) {
    let toRemove = quantity;

    for (const slot of this.slots) {
      if (slot.item?.id === itemId) {
        toRemove -= slot.remove(toRemove);
        if (toRemove <= 0) return quantity;
      }
    }

    return quantity - toRemove;
  }

  // Get item count
  countItem(itemId) {
    return this.slots.reduce((total, slot) => {
      if (slot.item?.id === itemId) {
        return total + slot.quantity;
      }
      return total;
    }, 0);
  }

  // Get selected item
  getSelectedItem() {
    return this.slots[this.selectedSlot];
  }

  // Select hotbar slot
  selectSlot(index) {
    if (index >= 0 && index < this.hotbarSize) {
      this.selectedSlot = index;
    }
  }

  // Swap slots
  swapSlots(indexA, indexB) {
    const temp = this.slots[indexA];
    this.slots[indexA] = this.slots[indexB];
    this.slots[indexB] = temp;
  }
}

// ==================== CRAFTING SYSTEM ====================

/**
 * Crafting Recipe
 */
export class CraftingRecipe {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.ingredients = config.ingredients; // [{itemId, quantity}]
    this.result = config.result; // {itemId, quantity}
    this.craftingStation = config.craftingStation || null;
    this.craftTime = config.craftTime || 0;
  }

  // Check if player can craft this recipe
  canCraft(inventory) {
    for (const ingredient of this.ingredients) {
      if (inventory.countItem(ingredient.itemId) < ingredient.quantity) {
        return false;
      }
    }
    return true;
  }

  // Execute craft
  craft(inventory, itemRegistry) {
    if (!this.canCraft(inventory)) return false;

    // Remove ingredients
    for (const ingredient of this.ingredients) {
      inventory.removeItem(ingredient.itemId, ingredient.quantity);
    }

    // Add result
    const resultItem = itemRegistry[this.result.itemId];
    if (resultItem) {
      inventory.addItem(resultItem, this.result.quantity);
    }

    return true;
  }
}

// ==================== PREDEFINED ITEMS ====================

export const ITEMS = {
  // Tools
  WOODEN_PICKAXE: new Item({
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    type: ITEM_TYPES.TOOL,
    toolType: TOOL_TYPES.PICKAXE,
    power: 35,
    speed: 1,
    damage: 5,
    stackSize: 1,
    rarity: 'common',
  }),

  IRON_PICKAXE: new Item({
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    type: ITEM_TYPES.TOOL,
    toolType: TOOL_TYPES.PICKAXE,
    power: 55,
    speed: 1.2,
    damage: 8,
    stackSize: 1,
    rarity: 'uncommon',
  }),

  MJOLNIR: new Item({
    id: 'mjolnir',
    name: 'Mjölnir',
    type: ITEM_TYPES.WEAPON,
    toolType: TOOL_TYPES.HAMMER,
    power: 100,
    speed: 0.8,
    damage: 50,
    stackSize: 1,
    rarity: 'legendary',
    description: 'Thor\'s legendary hammer. Summons lightning on hit.',
  }),

  GUNGNIR: new Item({
    id: 'gungnir',
    name: 'Gungnir',
    type: ITEM_TYPES.WEAPON,
    toolType: TOOL_TYPES.SWORD,
    power: 80,
    speed: 1.5,
    damage: 35,
    range: 60,
    stackSize: 1,
    rarity: 'legendary',
    description: 'Odin\'s spear. Never misses its target.',
  }),

  // Currencies
  SOL_COIN: new Item({
    id: 'sol_coin',
    name: 'Solana Coin',
    type: ITEM_TYPES.CURRENCY,
    value: 1,
    rarity: 'uncommon',
  }),

  DEGEN_COIN: new Item({
    id: 'degen_coin',
    name: 'Degen Coin',
    type: ITEM_TYPES.CURRENCY,
    value: 0.01,
    rarity: 'common',
  }),

  // Materials
  WOOD: new Item({
    id: 'wood',
    name: 'Wood',
    type: ITEM_TYPES.BLOCK,
    placesBlock: 16,
    rarity: 'common',
  }),

  STONE: new Item({
    id: 'stone',
    name: 'Stone',
    type: ITEM_TYPES.BLOCK,
    placesBlock: 3,
    rarity: 'common',
  }),

  // Consumables
  MEAD: new Item({
    id: 'mead',
    name: 'Viking Mead',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'common',
    description: 'Restores 50 health. Sköl!',
  }),

  GOLDEN_APPLE: new Item({
    id: 'golden_apple',
    name: 'Iðunn\'s Apple',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: 'rare',
    description: 'Grants temporary invincibility and regeneration.',
  }),
};

// ==================== PREDEFINED RECIPES ====================

export const RECIPES = [
  new CraftingRecipe({
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    ingredients: [{ itemId: 'wood', quantity: 10 }],
    result: { itemId: 'wooden_pickaxe', quantity: 1 },
  }),

  new CraftingRecipe({
    id: 'workbench',
    name: 'Workbench',
    ingredients: [{ itemId: 'wood', quantity: 20 }],
    result: { itemId: 'workbench', quantity: 1 },
  }),

  new CraftingRecipe({
    id: 'torch',
    name: 'Torch',
    ingredients: [{ itemId: 'wood', quantity: 1 }],
    result: { itemId: 'torch', quantity: 3 },
  }),
];

export default {
  CHUNK_CONFIG,
  ChunkManager,
  LIGHTING_CONFIG,
  LightSource,
  LightingManager,
  PHYSICS_CONFIG,
  COLLISION_LAYERS,
  COLLISION_MASKS,
  PhysicsBody,
  PhysicsWorld,
  ITEM_TYPES,
  TOOL_TYPES,
  Item,
  InventorySlot,
  Inventory,
  CraftingRecipe,
  ITEMS,
  RECIPES,
};
