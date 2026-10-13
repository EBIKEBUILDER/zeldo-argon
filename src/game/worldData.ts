export type ZoneId = "overworld" | "dungeon";
export type DungeonRoomId = "entry" | "hall" | "sanctum";
export type EnemyKind = "slime" | "goblin" | "archer" | "knight" | "minion" | "boss";
export type RupeeTier = "green" | "blue" | "red";

export type PropPrefabId =
  | "pine_tree"
  | "bush"
  | "flower_patch"
  | "boulder"
  | "ruin_pillar"
  | "dungeon_pillar"
  | "wall_torch"
  | "wooden_crate"
  | "stone_wall"
  | "cliff_block"
  | "water_tile"
  | "path_tile"
  | "wooden_bridge"
  | "temple_arch"
  | "custom_model";

export interface CustomModelAsset {
  id: string;
  name: string;
  positions: number[];
  indices: number[];
  normals: number[];
  colorHex: string;
}

export interface MapPropInstance {
  id: string;
  prefab: PropPrefabId;
  name: string;
  zone: ZoneId;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  hasCollider: boolean;
  colliderWidth: number;
  colliderDepth: number;
  colliderKind: "cliff" | "wall" | "water" | "tree" | "pillar" | "ruin";
  customModelId?: string;
  colorHex?: string;
}

export interface MapPortal {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  radius: number;
  targetZone: ZoneId;
  targetX: number;
  targetZ: number;
  targetFacing: number;
  label: string;
  sublabel: string;
  color: "cyan" | "gold" | "purple" | "emerald" | "crimson";
}

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
  weight: number; // Controls knockback resistance (0.5 = light, 2.0 = medium, 6.0 = heavy, 100 = immovable)
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

export function getDefaultEnemyWeight(kind: EnemyKind): number {
  switch (kind) {
    case "slime":
      return 0.5; // Lightweight: easy to knock back & juggle with sword spam
    case "archer":
      return 0.6; // Lightweight: easy to knock back repeatedly once reached
    case "goblin":
      return 2.0; // Medium weight: moderate knockback resistance
    case "minion":
      return 2.2; // Medium-heavy weight
    case "knight":
      return 6.5; // Heavy armor: barely knocked back at all
    case "boss":
      return 100.0; // Immovable: zero knockback
  }
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

export const INITIAL_PORTALS: MapPortal[] = [
  {
    id: "portal-ow-sanctum",
    zone: "overworld",
    x: OVERWORLD_PORTAL_POS.x,
    z: OVERWORLD_PORTAL_POS.z,
    radius: 2.2,
    targetZone: "dungeon",
    targetX: DUNGEON_ENTRY_SPAWN.x,
    targetZ: DUNGEON_ENTRY_SPAWN.z,
    targetFacing: 0,
    label: "The Sunken Sanctum",
    sublabel: "Room I: Torchlit Antechamber — Watch out for the pack of Dungeon Porings!",
    color: "cyan",
  },
  {
    id: "portal-dg-overworld",
    zone: "dungeon",
    x: DUNGEON_EXIT_POS.x,
    z: DUNGEON_EXIT_POS.z,
    radius: 1.9,
    targetZone: "overworld",
    targetX: OVERWORLD_RETURN_SPAWN.x,
    targetZ: OVERWORLD_RETURN_SPAWN.z,
    targetFacing: Math.PI,
    label: "Whispering Vale",
    sublabel: "Returned to the sunlit overworld.",
    color: "cyan",
  },
];

export const INITIAL_ENEMIES: EnemySpawn[] = [
  // Overworld — Central Meadow (well outside hero spawn at z=-32)
  {
    id: "ow-slime-1",
    kind: "slime",
    zone: "overworld",
    x: -7,
    z: -11,
    hp: 3,
    weight: 0.5,
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
    weight: 0.5,
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
    weight: 0.6,
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
    weight: 2.0,
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
    weight: 2.0,
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
    weight: 0.5,
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
    weight: 0.6,
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
    weight: 2.0,
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
    weight: 6.5,
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
    weight: 2.0,
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
    weight: 0.6,
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
    weight: 6.5,
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
    weight: 0.5,
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
    weight: 0.6,
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
    weight: 6.5,
    aggroRadius: 8.2,
    speed: 4.7,
    damage: 2,
    rupeeDrop: "red",
  },

  // Dungeon Room 1 — Torchlit Antechamber (5 Lightweight Purple Poring Blobs)
  {
    id: "dg-slime-1",
    kind: "slime",
    zone: "dungeon",
    x: -8.5,
    z: -22.5,
    hp: 3,
    weight: 0.5,
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
    weight: 0.5,
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
    weight: 0.5,
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
    weight: 0.5,
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
    weight: 0.5,
    aggroRadius: 7.8,
    speed: 5.1,
    damage: 1,
    rupeeDrop: "blue",
  },

  // Dungeon Room 2 — Hall of Pillars (Goblins + Goblin Archers + Heavy Crypt Knight)
  {
    id: "dg-goblin-1",
    kind: "goblin",
    zone: "dungeon",
    x: -11,
    z: -5,
    hp: 4,
    weight: 2.0,
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
    weight: 2.0,
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
    weight: 0.6,
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
    weight: 0.6,
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
    weight: 6.5,
    aggroRadius: 8.0,
    speed: 4.7,
    damage: 2,
    rupeeDrop: "red",
  },

  // Dungeon Room 3 — Boss Sanctum (Minions + Immovable Boss Malakor)
  {
    id: "dg-minion-1",
    kind: "minion",
    zone: "dungeon",
    x: -8.5,
    z: 22,
    hp: 5,
    weight: 2.2,
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
    weight: 2.2,
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
    weight: 2.2,
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
    weight: 100.0,
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

/**
 * Generates the initial individual 3D environment props for both Overworld and Dungeon
 * so that every tree, bush, boulder, pillar, torch, crate, bridge, road, cliff, and wall
 * can be individually selected, moved, scaled, duplicated, or deleted in the Map Editor!
 */
export function buildInitialMapProps(): MapPropInstance[] {
  const props: MapPropInstance[] = [];

  // 1. Overworld Roads & Courtyards
  props.push(
    {
      id: "prop-ow-main-road",
      prefab: "path_tile",
      name: "Main North-South Road",
      zone: "overworld",
      x: 0,
      y: 0,
      z: 0,
      rotY: 0,
      scaleX: 5.2,
      scaleY: 1,
      scaleZ: 68,
      hasCollider: false,
      colliderWidth: 5.2,
      colliderDepth: 68,
      colliderKind: "ruin",
    },
    {
      id: "prop-ow-cross-road",
      prefab: "path_tile",
      name: "East-West Crossroads",
      zone: "overworld",
      x: 0,
      y: 0,
      z: -2.5,
      rotY: 0,
      scaleX: 54,
      scaleY: 1,
      scaleZ: 4.4,
      hasCollider: false,
      colliderWidth: 54,
      colliderDepth: 4.4,
      colliderKind: "ruin",
    },
    {
      id: "prop-ow-shop-path",
      prefab: "path_tile",
      name: "Bazaar Shop Path",
      zone: "overworld",
      x: 6,
      y: 0,
      z: -30.5,
      rotY: 0,
      scaleX: 14,
      scaleY: 1,
      scaleZ: 3.6,
      hasCollider: false,
      colliderWidth: 14,
      colliderDepth: 3.6,
      colliderKind: "ruin",
    },
    {
      id: "prop-ow-bridge",
      prefab: "wooden_bridge",
      name: "River Crossing Bridge",
      zone: "overworld",
      x: 0,
      y: 0,
      z: -20.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 7.4,
      colliderDepth: 5.2,
      colliderKind: "wall",
    },
    {
      id: "prop-ow-temple-arch",
      prefab: "temple_arch",
      name: "Sanctum Temple Facade",
      zone: "overworld",
      x: 0,
      y: 0,
      z: 35,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 10,
      colliderDepth: 3.2,
      colliderKind: "ruin",
    }
  );

  // 2. Overworld River Water Segments
  props.push(
    {
      id: "prop-ow-river-w",
      prefab: "water_tile",
      name: "Western River Stream",
      zone: "overworld",
      x: -20.15,
      y: 0,
      z: -20.5,
      rotY: 0,
      scaleX: 32.7,
      scaleY: 1,
      scaleZ: 4.0,
      hasCollider: true,
      colliderWidth: 32.7,
      colliderDepth: 4.0,
      colliderKind: "water",
    },
    {
      id: "prop-ow-river-e",
      prefab: "water_tile",
      name: "Eastern River Stream",
      zone: "overworld",
      x: 20.15,
      y: 0,
      z: -20.5,
      rotY: 0,
      scaleX: 32.7,
      scaleY: 1,
      scaleZ: 4.0,
      hasCollider: true,
      colliderWidth: 32.7,
      colliderDepth: 4.0,
      colliderKind: "water",
    }
  );

  // 3. Overworld Perimeter Cliff Ridges
  const cliffDefs = [
    { id: "ow-border-s", name: "South Cliff Ridge", minX: -40, maxX: 40, minZ: -40, maxZ: -37.5, h: 4.5 },
    { id: "ow-border-n-w", name: "North-West Cliff Ridge", minX: -40, maxX: -8, minZ: 36, maxZ: 40, h: 5.5 },
    { id: "ow-border-n-e", name: "North-East Cliff Ridge", minX: 8, maxX: 40, minZ: 36, maxZ: 40, h: 5.5 },
    { id: "ow-border-n-back", name: "Sanctum Cliff Backdrop", minX: -8, maxX: 8, minZ: 36.5, maxZ: 40, h: 6.5 },
    { id: "ow-border-w", name: "West Cliff Wall", minX: -40, maxX: -36.5, minZ: -40, maxZ: 40, h: 4.5 },
    { id: "ow-border-e", name: "East Cliff Wall", minX: 36.5, maxX: 40, minZ: -40, maxZ: 40, h: 4.5 },
  ];
  cliffDefs.forEach((c) => {
    const w = c.maxX - c.minX;
    const d = c.maxZ - c.minZ;
    props.push({
      id: `prop-${c.id}`,
      prefab: "cliff_block",
      name: c.name,
      zone: "overworld",
      x: (c.minX + c.maxX) / 2,
      y: 0,
      z: (c.minZ + c.maxZ) / 2,
      rotY: 0,
      scaleX: w,
      scaleY: c.h,
      scaleZ: d,
      hasCollider: true,
      colliderWidth: w,
      colliderDepth: d,
      colliderKind: "cliff",
    });
  });

  // 4. Western Watchtower Ruin Walls
  const ruinWalls = [
    { id: "ow-ruin-w-south", name: "Ruins South Wall", minX: -34, maxX: -17, minZ: -14, maxZ: -11.5, h: 3.2 },
    { id: "ow-ruin-w-east-low", name: "Ruins East Gate South", minX: -18.5, maxX: -16.5, minZ: -14, maxZ: -6.5, h: 3.2 },
    { id: "ow-ruin-w-east-high", name: "Ruins East Gate North", minX: -18.5, maxX: -16.5, minZ: 1.5, maxZ: 16, h: 3.4 },
    { id: "ow-ruin-w-north", name: "Ruins North Wall", minX: -34, maxX: -16.5, minZ: 14.5, maxZ: 16.5, h: 3.8 },
  ];
  ruinWalls.forEach((rw) => {
    const w = rw.maxX - rw.minX;
    const d = rw.maxZ - rw.minZ;
    props.push({
      id: `prop-${rw.id}`,
      prefab: "stone_wall",
      name: rw.name,
      zone: "overworld",
      x: (rw.minX + rw.maxX) / 2,
      y: 0,
      z: (rw.minZ + rw.maxZ) / 2,
      rotY: 0,
      scaleX: w,
      scaleY: rw.h,
      scaleZ: d,
      hasCollider: true,
      colliderWidth: w,
      colliderDepth: d,
      colliderKind: "ruin",
    });
  });

  // 5. Individual Pine Trees (split out from clusters so every tree can be moved/copied/deleted!)
  const treeCoords = [
    { x: 15.8, z: -13.5 },
    { x: 15.8, z: -10.5 },
    { x: 15.8, z: -7.8 },
    { x: 15.8, z: 6.5 },
    { x: 15.8, z: 9.8 },
    { x: 15.8, z: 13.2 },
    { x: -14.2, z: 20.5 },
    { x: -14.2, z: 23.5 },
    { x: -14.2, z: 26.2 },
    { x: 14.2, z: 20.5 },
    { x: 14.2, z: 23.5 },
    { x: 14.2, z: 26.2 },
    // Extra scenic perimeter trees
    { x: -18, z: -29 },
    { x: -24, z: -26 },
    { x: 24, z: -28 },
    { x: 32, z: -15 },
    { x: 33, z: 10 },
  ];
  treeCoords.forEach((tc, idx) => {
    props.push({
      id: `prop-tree-${idx + 1}`,
      prefab: "pine_tree",
      name: `Pine Tree #${idx + 1}`,
      zone: "overworld",
      x: tc.x,
      y: 0,
      z: tc.z,
      rotY: (idx * 1.1) % (Math.PI * 2),
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.1,
      colliderDepth: 2.1,
      colliderKind: "tree",
    });
  });

  // 6. Individual Leafy Bushes (arranged in choppable clusters!), Boulders, Flowers & Watchtower Pillars
  const bushCoords = [
    // South Clearing West Cluster (near starting path)
    { x: -5.5, z: -28.0 },
    { x: -7.1, z: -28.0 },
    { x: -6.3, z: -29.4 },
    // South Clearing East Cluster (near Merchant Shop)
    { x: 5.2, z: -26.2 },
    { x: 6.8, z: -26.2 },
    { x: 6.0, z: -24.8 },
    // South Riverbank Clusters
    { x: -10.0, z: -15.0 },
    { x: -11.6, z: -15.0 },
    { x: 10.0, z: -14.2 },
    { x: 11.6, z: -14.2 },
    // Central Meadow & Crossroads Clusters
    { x: -11.0, z: 8.0 },
    { x: -12.6, z: 8.2 },
    { x: 11.0, z: 9.0 },
    { x: 12.6, z: 9.2 },
    // Eastern Grove Cluster
    { x: 21.0, z: 2.0 },
    { x: 21.0, z: 3.7 },
    { x: 22.5, z: 2.8 },
    // Western Watchtower Ruins Cluster
    { x: -23.0, z: 11.0 },
  ];
  bushCoords.forEach((bc, idx) => {
    props.push({
      id: `prop-bush-${idx + 1}`,
      prefab: "bush",
      name: `Meadow Bush #${idx + 1}`,
      zone: "overworld",
      x: bc.x,
      y: 0,
      z: bc.z,
      rotY: idx * 0.7,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 1.4,
      colliderDepth: 1.4,
      colliderKind: "tree",
    });
  });

  const boulderCoords = [
    { x: -15, z: -24 },
    { x: 22, z: -15 },
    { x: 31, z: -4 },
    { x: -31, z: -17 },
    { x: -21, z: 22 },
    { x: 21, z: 22 },
  ];
  boulderCoords.forEach((rc, idx) => {
    props.push({
      id: `prop-boulder-${idx + 1}`,
      prefab: "boulder",
      name: `Mossy Boulder #${idx + 1}`,
      zone: "overworld",
      x: rc.x,
      y: 0,
      z: rc.z,
      rotY: idx * 1.3,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.0,
      colliderDepth: 2.0,
      colliderKind: "ruin",
    });
  });

  const flowerCoords = [
    { x: -4, z: -31 },
    { x: 4, z: -31 },
    { x: -5, z: -16 },
    { x: 5, z: -16 },
    { x: 19, z: -8 },
    { x: -9, z: 14 },
    { x: 9, z: 14 },
  ];
  flowerCoords.forEach((fc, idx) => {
    props.push({
      id: `prop-flower-${idx + 1}`,
      prefab: "flower_patch",
      name: `Wildflower Cluster #${idx + 1}`,
      zone: "overworld",
      x: fc.x,
      y: 0,
      z: fc.z,
      rotY: idx * 0.9,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 1.2,
      colliderDepth: 1.2,
      colliderKind: "tree",
    });
  });

  // Overworld Northern Sanctum Approach Pillars
  props.push(
    {
      id: "prop-ow-pillar-nw",
      prefab: "ruin_pillar",
      name: "Sanctum Approach Pillar W",
      zone: "overworld",
      x: -6.5,
      y: 0,
      z: 28,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.0,
      colliderDepth: 2.0,
      colliderKind: "pillar",
    },
    {
      id: "prop-ow-pillar-ne",
      prefab: "ruin_pillar",
      name: "Sanctum Approach Pillar E",
      zone: "overworld",
      x: 6.5,
      y: 0,
      z: 28,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.0,
      colliderDepth: 2.0,
      colliderKind: "pillar",
    }
  );

  // 7. Dungeon Walls, Carved Pillars, Flickering Torches & Crates
  const dgWallDefs = [
    { id: "dg-r1-south", name: "Antechamber South Wall", minX: -15, maxX: 15, minZ: -37.5, maxZ: -35.5, h: 5.0 },
    { id: "dg-r1-west", name: "Antechamber West Wall", minX: -15.5, maxX: -13.5, minZ: -37, maxZ: -13.5, h: 5.0 },
    { id: "dg-r1-east", name: "Antechamber East Wall", minX: 13.5, maxX: 15.5, minZ: -37, maxZ: -13.5, h: 5.0 },
    { id: "dg-r1-north-w", name: "Antechamber Divider W", minX: -19.5, maxX: -3.8, minZ: -15, maxZ: -13, h: 5.0 },
    { id: "dg-r1-north-e", name: "Antechamber Divider E", minX: 3.8, maxX: 19.5, minZ: -15, maxZ: -13, h: 5.0 },
    { id: "dg-r2-west", name: "Hall of Pillars West Wall", minX: -19.5, maxX: -17.5, minZ: -14, maxZ: 12.5, h: 5.0 },
    { id: "dg-r2-east", name: "Hall of Pillars East Wall", minX: 17.5, maxX: 19.5, minZ: -14, maxZ: 12.5, h: 5.0 },
    { id: "dg-r2-north-w", name: "Sanctum Gate Wall W", minX: -19.5, maxX: -3.5, minZ: 11, maxZ: 13, h: 5.2 },
    { id: "dg-r2-north-e", name: "Sanctum Gate Wall E", minX: 3.5, maxX: 19.5, minZ: 11, maxZ: 13, h: 5.2 },
    { id: "dg-r3-west", name: "Boss Sanctum West Wall", minX: -18.5, maxX: -16.5, minZ: 12, maxZ: 37, h: 5.5 },
    { id: "dg-r3-east", name: "Boss Sanctum East Wall", minX: 16.5, maxX: 18.5, minZ: 12, maxZ: 37, h: 5.5 },
    { id: "dg-r3-north", name: "Boss Sanctum North Wall", minX: -18.5, maxX: 18.5, minZ: 35.5, maxZ: 37.5, h: 5.5 },
  ];
  dgWallDefs.forEach((dw) => {
    const w = dw.maxX - dw.minX;
    const d = dw.maxZ - dw.minZ;
    props.push({
      id: `prop-${dw.id}`,
      prefab: "stone_wall",
      name: dw.name,
      zone: "dungeon",
      x: (dw.minX + dw.maxX) / 2,
      y: 0,
      z: (dw.minZ + dw.maxZ) / 2,
      rotY: 0,
      scaleX: w,
      scaleY: dw.h,
      scaleZ: d,
      hasCollider: true,
      colliderWidth: w,
      colliderDepth: d,
      colliderKind: "wall",
    });
  });

  const dgPillars = [
    { id: "dg-r2-pillar-sw", name: "Hall Pillar SW", x: -6.5, z: -6.5 },
    { id: "dg-r2-pillar-se", name: "Hall Pillar SE", x: 6.5, z: -6.5 },
    { id: "dg-r2-pillar-nw", name: "Hall Pillar NW", x: -6.5, z: 3.5 },
    { id: "dg-r2-pillar-ne", name: "Hall Pillar NE", x: 6.5, z: 3.5 },
    { id: "dg-r3-pillar-w", name: "Boss Sanctum Pillar W", x: -10, z: 25 },
    { id: "dg-r3-pillar-e", name: "Boss Sanctum Pillar E", x: 10, z: 25 },
  ];
  dgPillars.forEach((dp) => {
    props.push({
      id: `prop-${dp.id}`,
      prefab: "dungeon_pillar",
      name: dp.name,
      zone: "dungeon",
      x: dp.x,
      y: 0,
      z: dp.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.0,
      colliderDepth: 2.0,
      colliderKind: "pillar",
    });
  });

  const torchCoords = [
    { x: -11.5, z: -32 },
    { x: 11.5, z: -32 },
    { x: -11.5, z: -16 },
    { x: 11.5, z: -16 },
    { x: -5.2, z: 10.2 },
    { x: 5.2, z: 10.2 },
    { x: -14.5, z: 16 },
    { x: 14.5, z: 16 },
    { x: -14.5, z: 32 },
    { x: 14.5, z: 32 },
  ];
  torchCoords.forEach((tc, idx) => {
    props.push({
      id: `prop-dg-torch-${idx + 1}`,
      prefab: "wall_torch",
      name: `Sanctum Brazier #${idx + 1}`,
      zone: "dungeon",
      x: tc.x,
      y: 0,
      z: tc.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 0.9,
      colliderDepth: 0.9,
      colliderKind: "pillar",
    });
  });

  const crateCoords = [
    { x: -12, z: -30 },
    { x: 12, z: -29 },
    { x: -15.5, z: -1 },
    { x: 15.5, z: -1 },
  ];
  crateCoords.forEach((cc, idx) => {
    props.push({
      id: `prop-dg-crate-${idx + 1}`,
      prefab: "wooden_crate",
      name: `Sanctum Supply Crate #${idx + 1}`,
      zone: "dungeon",
      x: cc.x,
      y: 0,
      z: cc.z,
      rotY: idx * 0.4,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.4,
      colliderDepth: 1.4,
      colliderKind: "wall",
    });
  });

  return props;
}

/**
 * Dynamically builds the active collision obstacles from the editable `mapProps` plus fixed quest gates/stalls.
 */
export function buildObstaclesFromMapProps(mapProps: MapPropInstance[]): RectObstacle[] {
  const obstacles: RectObstacle[] = [
    // Merchant Shop Stall Counter in South Clearing
    {
      id: "ow-shop-stall",
      zone: "overworld",
      minX: SHOP_STALL_POS.x - 2.7,
      maxX: SHOP_STALL_POS.x + 2.7,
      minZ: SHOP_STALL_POS.z - 1.4,
      maxZ: SHOP_STALL_POS.z + 1.4,
      kind: "pedestal",
      height: 1.3,
    },
    // Locked Gate in Dungeon
    {
      id: "dg-locked-gate",
      zone: "dungeon",
      minX: LOCKED_GATE_POS.x - 3.5,
      maxX: LOCKED_GATE_POS.x + 3.5,
      minZ: LOCKED_GATE_POS.z - 0.8,
      maxZ: LOCKED_GATE_POS.z + 0.8,
      kind: "gate",
      height: 4.6,
    },
  ];

  for (const prop of mapProps) {
    if (!prop.hasCollider) continue;
    const isScaledBox =
      prop.prefab === "stone_wall" ||
      prop.prefab === "cliff_block" ||
      prop.prefab === "water_tile" ||
      prop.prefab === "path_tile";
    const halfW = (isScaledBox ? prop.scaleX : prop.colliderWidth * prop.scaleX) * 0.5;
    const halfD = (isScaledBox ? prop.scaleZ : prop.colliderDepth * prop.scaleZ) * 0.5;
    obstacles.push({
      id: prop.id,
      zone: prop.zone,
      minX: prop.x - halfW,
      maxX: prop.x + halfW,
      minZ: prop.z - halfD,
      maxZ: prop.z + halfD,
      kind: prop.colliderKind,
      height: prop.scaleY * 4.0,
    });
  }

  return obstacles;
}

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
    const topPen = Math.abs(z - rect.maxZ);
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
  gateUnlocked: boolean,
  dynamicObstacles?: RectObstacle[]
): { x: number; z: number; hitObstacle: boolean } {
  let curX = x;
  let curZ = z;
  let hitObstacle = false;
  const list = dynamicObstacles ?? [];
  for (const obs of list) {
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
  maxDist: number = BOSS_MAX_LUNGE_RANGE,
  dynamicObstacles?: RectObstacle[]
): number {
  const dirX = Math.sin(angle);
  const dirZ = Math.cos(angle);
  const step = 0.35;
  const list = dynamicObstacles ?? [];
  for (let d = step; d <= maxDist; d += step) {
    const testX = startX + dirX * d;
    const testZ = startZ + dirZ * d;
    if (testZ - radius < 13.0) {
      return d;
    }
    for (const obs of list) {
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
