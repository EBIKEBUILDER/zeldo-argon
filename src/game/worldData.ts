export type ZoneId = "overworld" | "dungeon";
export type DungeonRoomId = "entry" | "hall" | "sanctum";
export type EnemyKind = "slime" | "goblin" | "archer" | "knight" | "minion" | "boss";
export type RupeeTier = "green" | "blue" | "red";

export interface RectObstacle {
  id: string;
  zone: ZoneId;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: "cliff" | "wall" | "water" | "tree" | "pillar" | "ruin" | "gate" | "pedestal";
  height?: number;
}

export interface EnemySpawn {
  id: string;
  kind: EnemyKind;
  zone: ZoneId;
  x: number;
  z: number;
  hp: number;
  aggroRadius: number;
  speed: number;
  damage: number; // in half-hearts (1 = 0.5 heart, 2 = 1.0 heart)
  rupeeDrop: RupeeTier | "boss";
}

export interface WorldRupeeSpawn {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  tier: RupeeTier;
  value: number;
}

export const HERO_SPAWN = {
  x: 0,
  z: -32,
  facing: 0, // facing North (+Z)
};

// Merchant Shop in the First Area (South Clearing of Overworld)
export const SHOP_STALL_POS = {
  x: 11.5,
  z: -32.2,
};

export const SHOP_INTERACT_POS = {
  x: 11.5,
  z: -29.2,
};

export const DUNGEON_KEY_POS = {
  x: -28,
  z: 11,
};

export const OVERWORLD_PORTAL_POS = {
  x: 0,
  z: 34.8,
};

export const DUNGEON_EXIT_POS = {
  x: 0,
  z: -34.5,
};

export const DUNGEON_ENTRY_SPAWN = {
  x: 0,
  z: -30.5,
};

export const OVERWORLD_RETURN_SPAWN = {
  x: 0,
  z: 30.5,
};

export const LOCKED_GATE_POS = {
  x: 0,
  z: 12,
};

export const BOSS_CHEST_POS = {
  x: 0,
  z: 33,
};

export const BOSS_MAX_LUNGE_RANGE = 14.5;

export const INITIAL_ENEMIES: EnemySpawn[] = [
  // Overworld — Central Meadow (well outside hero spawn at z=-32)
  {
    id: "ow-slime-1",
    kind: "slime",
    zone: "overworld",
    x: -7,
    z: -11,
    hp: 3,
    aggroRadius: 8.5,
    speed: 4.9,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-slime-2",
    kind: "slime",
    zone: "overworld",
    x: 8,
    z: -9,
    hp: 3,
    aggroRadius: 8.5,
    speed: 4.9,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-archer-central",
    kind: "archer",
    zone: "overworld",
    x: 0,
    z: -4,
    hp: 3,
    aggroRadius: 11.5,
    speed: 4.5,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "ow-goblin-1",
    kind: "goblin",
    zone: "overworld",
    x: -6,
    z: 3,
    hp: 4,
    aggroRadius: 8.8,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-goblin-2",
    kind: "goblin",
    zone: "overworld",
    x: 7,
    z: 5,
    hp: 4,
    aggroRadius: 8.8,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
  },

  // Overworld — Eastern Whispering Grove
  {
    id: "ow-slime-3",
    kind: "slime",
    zone: "overworld",
    x: 23,
    z: -7,
    hp: 3,
    aggroRadius: 8.5,
    speed: 4.9,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-archer-east",
    kind: "archer",
    zone: "overworld",
    x: 28,
    z: 0,
    hp: 3,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "ow-goblin-3",
    kind: "goblin",
    zone: "overworld",
    x: 27,
    z: 6,
    hp: 4,
    aggroRadius: 8.8,
    speed: 5.6,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-knight-east",
    kind: "knight",
    zone: "overworld",
    x: 26,
    z: 13,
    hp: 5,
    aggroRadius: 8.2,
    speed: 4.7,
    damage: 2,
    rupeeDrop: "red",
  },

  // Overworld — Western Watchtower Ruins (guards the Sanctum Key at -28, 11)
  {
    id: "ow-goblin-west-1",
    kind: "goblin",
    zone: "overworld",
    x: -22,
    z: -4,
    hp: 4,
    aggroRadius: 8.5,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-archer-west",
    kind: "archer",
    zone: "overworld",
    x: -31,
    z: 1,
    hp: 3,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "ow-knight-west",
    kind: "knight",
    zone: "overworld",
    x: -27,
    z: 7,
    hp: 5,
    aggroRadius: 8.2,
    speed: 4.7,
    damage: 2,
    rupeeDrop: "red",
  },

  // Overworld — Northern Temple Approach
  {
    id: "ow-slime-north",
    kind: "slime",
    zone: "overworld",
    x: -6,
    z: 18,
    hp: 3,
    aggroRadius: 8.5,
    speed: 4.9,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-archer-north",
    kind: "archer",
    zone: "overworld",
    x: 6,
    z: 19,
    hp: 3,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "ow-knight-north",
    kind: "knight",
    zone: "overworld",
    x: 0,
    z: 24,
    hp: 5,
    aggroRadius: 8.2,
    speed: 4.7,
    damage: 2,
    rupeeDrop: "red",
  },

  // Dungeon Room 1 — Torchlit Antechamber (5 Poring Slimes! Safe distance from entry at 0, -30.5)
  {
    id: "dg-slime-1",
    kind: "slime",
    zone: "dungeon",
    x: -8.5,
    z: -22.5,
    hp: 3,
    aggroRadius: 7.5,
    speed: 4.9,
    damage: 1,
    rupeeDrop: "green",
  },
  {
    id: "dg-slime-2",
    kind: "slime",
    zone: "dungeon",
    x: 8.5,
    z: -22.5,
    hp: 3,
    aggroRadius: 7.5,
    speed: 4.9,
    damage: 1,
    rupeeDrop: "green",
  },
  {
    id: "dg-slime-3",
    kind: "slime",
    zone: "dungeon",
    x: -4.5,
    z: -18.5,
    hp: 3,
    aggroRadius: 7.8,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "dg-slime-4",
    kind: "slime",
    zone: "dungeon",
    x: 4.5,
    z: -18.5,
    hp: 3,
    aggroRadius: 7.8,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "dg-slime-5",
    kind: "slime",
    zone: "dungeon",
    x: 0,
    z: -16.5,
    hp: 3,
    aggroRadius: 7.8,
    speed: 5.1,
    damage: 1,
    rupeeDrop: "blue",
  },

  // Dungeon Room 2 — Hall of Pillars (Goblins + Goblin Archers + Crypt Knight)
  {
    id: "dg-goblin-1",
    kind: "goblin",
    zone: "dungeon",
    x: -11,
    z: -5,
    hp: 4,
    aggroRadius: 8.5,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "dg-goblin-2",
    kind: "goblin",
    zone: "dungeon",
    x: 11,
    z: -4,
    hp: 4,
    aggroRadius: 8.5,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "dg-archer-1",
    kind: "archer",
    zone: "dungeon",
    x: -12,
    z: 5,
    hp: 3,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "dg-archer-2",
    kind: "archer",
    zone: "dungeon",
    x: 12,
    z: 5,
    hp: 3,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "dg-knight-1",
    kind: "knight",
    zone: "dungeon",
    x: 0,
    z: 5,
    hp: 5,
    aggroRadius: 8.0,
    speed: 4.7,
    damage: 2,
    rupeeDrop: "red",
  },

  // Dungeon Room 3 — Boss Sanctum (Toughed Minions + +25% Boss Health = 25 HP)
  {
    id: "dg-minion-1",
    kind: "minion",
    zone: "dungeon",
    x: -8.5,
    z: 22,
    hp: 5,
    aggroRadius: 13.0,
    speed: 5.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "dg-minion-2",
    kind: "minion",
    zone: "dungeon",
    x: 8.5,
    z: 22,
    hp: 5,
    aggroRadius: 13.0,
    speed: 5.6,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "dg-minion-3",
    kind: "minion",
    zone: "dungeon",
    x: 0,
    z: 20.5,
    hp: 5,
    aggroRadius: 13.0,
    speed: 5.7,
    damage: 2,
    rupeeDrop: "blue",
  },
  {
    id: "dg-boss",
    kind: "boss",
    zone: "dungeon",
    x: 0,
    z: 26,
    hp: 25,
    aggroRadius: 14.0,
    speed: 3.9,
    damage: 2,
    rupeeDrop: "boss",
  },
];

export const INITIAL_WORLD_RUPEES: WorldRupeeSpawn[] = [
  // First Area (South Clearing) treasure cache so player can test out the Shop right away!
  { id: "rupee-ow-start-1", zone: "overworld", x: -9, z: -31, tier: "blue", value: 5 },
  { id: "rupee-ow-start-2", zone: "overworld", x: -13, z: -27, tier: "red", value: 20 },
  { id: "rupee-ow-start-3", zone: "overworld", x: -6, z: -25, tier: "blue", value: 5 },
  { id: "rupee-ow-start-4", zone: "overworld", x: 18, z: -26, tier: "blue", value: 5 },
  // Overworld scenic pickups
  { id: "rupee-ow-3", zone: "overworld", x: 31, z: -12, tier: "red", value: 20 },
  { id: "rupee-ow-4", zone: "overworld", x: 29, z: 16, tier: "red", value: 20 },
  { id: "rupee-ow-5", zone: "overworld", x: -32, z: -10, tier: "blue", value: 5 },
  // Dungeon alcove pickups
  { id: "rupee-dg-1", zone: "dungeon", x: -15, z: -9, tier: "blue", value: 5 },
  { id: "rupee-dg-2", zone: "dungeon", x: 15, z: -9, tier: "blue", value: 5 },
];

export const WORLD_OBSTACLES: RectObstacle[] = [
  // ==========================================
  // OVERWORLD BOUNDARIES & TERRAIN
  // ==========================================
  { id: "ow-border-s", zone: "overworld", minX: -40, maxX: 40, minZ: -40, maxZ: -37.5, kind: "cliff", height: 4.5 },
  { id: "ow-border-n-w", zone: "overworld", minX: -40, maxX: -8, minZ: 36, maxZ: 40, kind: "cliff", height: 5.5 },
  { id: "ow-border-n-e", zone: "overworld", minX: 8, maxX: 40, minZ: 36, maxZ: 40, kind: "cliff", height: 5.5 },
  { id: "ow-border-n-back", zone: "overworld", minX: -8, maxX: 8, minZ: 36.5, maxZ: 40, kind: "cliff", height: 6.5 },
  { id: "ow-border-w", zone: "overworld", minX: -40, maxX: -36.5, minZ: -40, maxZ: 40, kind: "cliff", height: 4.5 },
  { id: "ow-border-e", zone: "overworld", minX: 36.5, maxX: 40, minZ: -40, maxZ: 40, kind: "cliff", height: 4.5 },

  // Merchant Shop Stall Counter in South Clearing (First Area)
  { id: "ow-shop-stall", zone: "overworld", minX: 8.8, maxX: 14.2, minZ: -33.6, maxZ: -30.8, kind: "pedestal", height: 1.3 },

  // River dividing South Clearing from Central Meadow (bridge at x: -3.8..3.8)
  { id: "ow-river-w", zone: "overworld", minX: -36.5, maxX: -3.8, minZ: -22.5, maxZ: -18.5, kind: "water", height: 0.2 },
  { id: "ow-river-e", zone: "overworld", minX: 3.8, maxX: 36.5, minZ: -22.5, maxZ: -18.5, kind: "water", height: 0.2 },

  // Western Watchtower Ruins walls (enclosing the Sanctum Key courtyard, entrance gap at z: -7..1)
  { id: "ow-ruin-w-south", zone: "overworld", minX: -34, maxX: -17, minZ: -14, maxZ: -11.5, kind: "ruin", height: 3.2 },
  { id: "ow-ruin-w-east-low", zone: "overworld", minX: -18.5, maxX: -16.5, minZ: -14, maxZ: -6.5, kind: "ruin", height: 3.2 },
  { id: "ow-ruin-w-east-high", zone: "overworld", minX: -18.5, maxX: -16.5, minZ: 1.5, maxZ: 16, kind: "ruin", height: 3.4 },
  { id: "ow-ruin-w-north", zone: "overworld", minX: -34, maxX: -16.5, minZ: 14.5, maxZ: 16.5, kind: "ruin", height: 3.8 },

  // Eastern Grove cliff dividers & forest clusters
  { id: "ow-tree-cluster-1", zone: "overworld", minX: 14, maxX: 17.5, minZ: -15, maxZ: -7, kind: "tree", height: 4.0 },
  { id: "ow-tree-cluster-2", zone: "overworld", minX: 14, maxX: 17.5, minZ: 5, maxZ: 15, kind: "tree", height: 4.0 },
  { id: "ow-tree-cluster-3", zone: "overworld", minX: -16, maxX: -12.5, minZ: 19, maxZ: 27, kind: "tree", height: 4.2 },
  { id: "ow-tree-cluster-4", zone: "overworld", minX: 12.5, maxX: 16, minZ: 19, maxZ: 27, kind: "tree", height: 4.2 },

  // Decorative stone pillars near Northern Sanctum Approach
  { id: "ow-pillar-nw", zone: "overworld", minX: -7.5, maxX: -5.5, minZ: 27, maxZ: 29, kind: "pillar", height: 4.0 },
  { id: "ow-pillar-ne", zone: "overworld", minX: 5.5, maxX: 7.5, minZ: 27, maxZ: 29, kind: "pillar", height: 4.0 },

  // ==========================================
  // DUNGEON ROOMS & WALLS
  // ==========================================
  // Room 1: Antechamber (x: -14..14, z: -36..-14), doorway at x: -3.8..3.8, z: -14
  { id: "dg-r1-south", zone: "dungeon", minX: -15, maxX: 15, minZ: -37.5, maxZ: -35.5, kind: "wall", height: 5.0 },
  { id: "dg-r1-west", zone: "dungeon", minX: -15.5, maxX: -13.5, minZ: -37, maxZ: -13.5, kind: "wall", height: 5.0 },
  { id: "dg-r1-east", zone: "dungeon", minX: 13.5, maxX: 15.5, minZ: -37, maxZ: -13.5, kind: "wall", height: 5.0 },
  { id: "dg-r1-north-w", zone: "dungeon", minX: -19.5, maxX: -3.8, minZ: -15, maxZ: -13, kind: "wall", height: 5.0 },
  { id: "dg-r1-north-e", zone: "dungeon", minX: 3.8, maxX: 19.5, minZ: -15, maxZ: -13, kind: "wall", height: 5.0 },

  // Room 2: Hall of Pillars (x: -18..18, z: -13..12), doorway at x: -3.6..3.6, z: 12
  { id: "dg-r2-west", zone: "dungeon", minX: -19.5, maxX: -17.5, minZ: -14, maxZ: 12.5, kind: "wall", height: 5.0 },
  { id: "dg-r2-east", zone: "dungeon", minX: 17.5, maxX: 19.5, minZ: -14, maxZ: 12.5, kind: "wall", height: 5.0 },
  { id: "dg-r2-pillar-sw", zone: "dungeon", minX: -7.5, maxX: -5.5, minZ: -7.5, maxZ: -5.5, kind: "pillar", height: 4.8 },
  { id: "dg-r2-pillar-se", zone: "dungeon", minX: 5.5, maxX: 7.5, minZ: -7.5, maxZ: -5.5, kind: "pillar", height: 4.8 },
  { id: "dg-r2-pillar-nw", zone: "dungeon", minX: -7.5, maxX: -5.5, minZ: 2.5, maxZ: 4.5, kind: "pillar", height: 4.8 },
  { id: "dg-r2-pillar-ne", zone: "dungeon", minX: 5.5, maxX: 7.5, minZ: 2.5, maxZ: 4.5, kind: "pillar", height: 4.8 },

  // Dividing Wall between Room 2 (Hall) and Room 3 (Boss Sanctum) at z: 11..13
  { id: "dg-r2-north-w", zone: "dungeon", minX: -19.5, maxX: -3.5, minZ: 11, maxZ: 13, kind: "wall", height: 5.2 },
  { id: "dg-r2-north-e", zone: "dungeon", minX: 3.5, maxX: 19.5, minZ: 11, maxZ: 13, kind: "wall", height: 5.2 },

  // The Locked Gate blocking doorway at z: 11.2..12.8, x: -3.5..3.5
  { id: "dg-locked-gate", zone: "dungeon", minX: -3.5, maxX: 3.5, minZ: 11.2, maxZ: 12.8, kind: "gate", height: 4.6 },

  // Room 3: Boss Sanctum (x: -17..17, z: 13..36)
  { id: "dg-r3-west", zone: "dungeon", minX: -18.5, maxX: -16.5, minZ: 12, maxZ: 37, kind: "wall", height: 5.5 },
  { id: "dg-r3-east", zone: "dungeon", minX: 16.5, maxX: 18.5, minZ: 12, maxZ: 37, kind: "wall", height: 5.5 },
  { id: "dg-r3-north", zone: "dungeon", minX: -18.5, maxX: 18.5, minZ: 35.5, maxZ: 37.5, kind: "wall", height: 5.5 },
  { id: "dg-r3-pillar-w", zone: "dungeon", minX: -11, maxX: -9, minZ: 24, maxZ: 26, kind: "pillar", height: 5.2 },
  { id: "dg-r3-pillar-e", zone: "dungeon", minX: 9, maxX: 11, minZ: 24, maxZ: 26, kind: "pillar", height: 5.2 },
];

export function resolveCircleRectCollision(
  x: number,
  z: number,
  radius: number,
  rect: RectObstacle
): { x: number; z: number; collided: boolean } {
  const closestX = Math.max(rect.minX, Math.min(x, rect.maxX));
  const closestZ = Math.max(rect.minZ, Math.min(z, rect.maxZ));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    return { x, z, collided: false };
  }

  if (distSq < 1e-6) {
    const leftPen = Math.abs(x - rect.minX);
    const rightPen = Math.abs(rect.maxX - x);
    const bottomPen = Math.abs(z - rect.minZ);
    const topPen = Math.abs(rect.maxZ - z);
    const minPen = Math.min(leftPen, rightPen, bottomPen, topPen);
    if (minPen === leftPen) return { x: rect.minX - radius, z, collided: true };
    if (minPen === rightPen) return { x: rect.maxX + radius, z, collided: true };
    if (minPen === bottomPen) return { x, z: rect.minZ - radius, collided: true };
    return { x, z: rect.maxZ + radius, collided: true };
  }

  const dist = Math.sqrt(distSq);
  const overlap = radius - dist;
  return {
    x: x + (dx / dist) * overlap,
    z: z + (dz / dist) * overlap,
    collided: true,
  };
}

export function resolveWorldCollisions(
  x: number,
  z: number,
  radius: number,
  zone: ZoneId,
  gateUnlocked: boolean
): { x: number; z: number; hitObstacle: boolean } {
  let curX = x;
  let curZ = z;
  let hitObstacle = false;
  for (const obs of WORLD_OBSTACLES) {
    if (obs.zone !== zone) continue;
    if (obs.kind === "gate" && gateUnlocked) continue;
    const res = resolveCircleRectCollision(curX, curZ, radius, obs);
    if (res.collided) {
      hitObstacle = true;
    }
    curX = res.x;
    curZ = res.z;
  }
  return { x: curX, z: curZ, hitObstacle };
}

/**
 * Computes how far a circle of `radius` can travel from `(startX, startZ)` along `angle`
 * before hitting a dungeon wall/pillar, up to `maxDist`. Used for the boss lunge path telegraph.
 */
export function computeBossChargePathLength(
  startX: number,
  startZ: number,
  angle: number,
  radius: number,
  maxDist: number = BOSS_MAX_LUNGE_RANGE
): number {
  const dirX = Math.sin(angle);
  const dirZ = Math.cos(angle);
  const step = 0.35;
  for (let d = step; d <= maxDist; d += step) {
    const testX = startX + dirX * d;
    const testZ = startZ + dirZ * d;
    if (testZ - radius < 13.0) {
      return d;
    }
    for (const obs of WORLD_OBSTACLES) {
      if (obs.zone !== "dungeon") continue;
      if (obs.kind === "gate") continue;
      const res = resolveCircleRectCollision(testX, testZ, radius, obs);
      if (res.collided) {
        return d;
      }
    }
  }
  return maxDist;
}
