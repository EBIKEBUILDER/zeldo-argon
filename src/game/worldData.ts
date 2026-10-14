export type ZoneId = "overworld" | "dungeon" | "frontier";
export type DungeonRoomId = "entry" | "hall" | "sanctum";
export type EnemyKind =
  | "slime"
  | "goblin"
  | "archer"
  | "knight"
  | "minion"
  | "turret"
  | "boss";
export type RupeeTier = "green" | "blue" | "red" | "heart";

export type PropPrefabId =
  | "pine_tree"
  | "bush"
  | "flower_patch"
  | "dirt_patch"
  | "clay_pot"
  | "light_rock"
  | "push_block"
  | "crystal_switch"
  | "crystal_barrier"
  | "cracked_rock"
  | "briar_barrier"
  | "spiderweb_barrier"
  | "eye_statue"
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

export type EnemyShieldArmor = "none" | "wood" | "ice";

export type BuriedRewardKind =
  | "random"
  | "rupee_green"
  | "rupee_blue"
  | "rupee_red"
  | "heart"
  | "fairy"
  | "bee"
  | "bottle"
  | "blue_mail"
  | "red_mail"
  | "swift_boots";

export type PotRewardKind =
  | "none"
  | "random"
  | "small_key"
  | "green_rupee"
  | "blue_rupee"
  | "red_rupee"
  | "heart"
  | "bombs_5";

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
  lit?: boolean;
  puzzleTarget?: "lit" | "unlit";
  // Timed Torch Puzzle (e.g., stays lit for 8s before extinguishing unless all timed torches in zone are lit!)
  timedDuration?: number;
  litTimer?: number;
  timedSolved?: boolean;
  // Burnable Overworld / Dungeon Exit Barriers (Dry Briars & Thick Spiderwebs)
  burningTimer?: number;
  // Dungeon Wall Eye Statues (Only open doors when shot with Bow & Arrow — Sword & Flame Rod bounce off!)
  eyeActivated?: boolean;
  dug?: boolean;
  buriedReward?: BuriedRewardKind;
  // Liftable Pots, Light Rocks & Explodable Cracked Rocks
  smashed?: boolean;
  potReward?: PotRewardKind;
  // Pushable Blocks (1.0s walk-against slide + block puzzle target)
  puzzleTargetX?: number;
  puzzleTargetZ?: number;
  pushedSolved?: boolean;
  slideStartX?: number;
  slideStartZ?: number;
  slideTargetX?: number;
  slideTargetZ?: number;
  slideTimer?: number;
  // Crystal Orb Switches & Retractable Crystal Barriers
  switchState?: "blue" | "orange";
  switchTarget?: "blue" | "orange";
  hitCooldown?: number;
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
  shieldArmor?: EnemyShieldArmor; // "wood" (Wooden Shield) or "ice" (Ice Armor) — blocks Sword/Arrows until burned/melted with Flame Rod (R)!
  shockArmor?: boolean; // Electrified/spiked shell that hurts on contact or melee unless stunned for 2s by the Boomerang (Q)!
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
      return 12.0; // Heavy juggernaut armor: shrugs off sword spam
    case "turret":
      return 18.0; // Stationary stone spitter turret
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
  x: -6.5,
  z: 32.0,
};

export const BOSS_EXIT_GATE_POS = {
  x: 0,
  z: 36.2,
};

export const BOSS_EXIT_PORTAL_POS = {
  x: 0,
  z: 34.8,
};

export const FRONTIER_ENTRY_SPAWN = {
  x: 0,
  z: -30.5,
};

export const FRONTIER_EXIT_PORTAL_POS = {
  x: 0,
  z: -34.8,
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
  {
    id: "portal-dg-frontier",
    zone: "dungeon",
    x: BOSS_EXIT_PORTAL_POS.x,
    z: BOSS_EXIT_PORTAL_POS.z,
    radius: 2.1,
    targetZone: "frontier",
    targetX: FRONTIER_ENTRY_SPAWN.x,
    targetZ: FRONTIER_ENTRY_SPAWN.z,
    targetFacing: 0,
    label: "Elderwood Frontier",
    sublabel: "Beyond the Sunken Sanctum — Explore the highlands or press Tab to customize with the Map Editor!",
    color: "emerald",
  },
  {
    id: "portal-fr-dungeon",
    zone: "frontier",
    x: FRONTIER_EXIT_PORTAL_POS.x,
    z: FRONTIER_EXIT_PORTAL_POS.z,
    radius: 2.0,
    targetZone: "dungeon",
    targetX: 0,
    targetZ: 31.0,
    targetFacing: Math.PI,
    label: "The Sunken Sanctum",
    sublabel: "Returned to Room III: Dread Sanctum.",
    color: "emerald",
  },
  {
    id: "portal-ow-secret-cave",
    zone: "overworld",
    x: -23.0,
    z: 33.8,
    radius: 1.8,
    targetZone: "frontier",
    targetX: -26.0,
    targetZ: 27.0,
    targetFacing: 0,
    label: "Secret Echo Grotto",
    sublabel: "You discovered the hidden cavern behind the blasted cliff rock!",
    color: "gold",
  },
  {
    id: "portal-fr-secret-cave-return",
    zone: "frontier",
    x: -26.0,
    z: 22.8,
    radius: 1.8,
    targetZone: "overworld",
    targetX: -23.0,
    targetZ: 29.5,
    targetFacing: Math.PI,
    label: "Whispering Vale Cliffside",
    sublabel: "Emerged from the Secret Echo Grotto.",
    color: "gold",
  },
];

export const INITIAL_ENEMIES: EnemySpawn[] = [
  // Overworld — Narrow River Crossing Bridge Turret (shoots rocks down the bridge — hold Shield [RMB/Shift] to deflect!)
  {
    id: "ow-bridge-turret",
    kind: "turret",
    zone: "overworld",
    x: 0,
    z: -15.6,
    hp: 3,
    weight: 18.0,
    aggroRadius: 15.5,
    speed: 0,
    damage: 1,
    rupeeDrop: "red",
  },
  // Overworld — Central Meadow (well outside hero spawn at z=-32)
  // Includes Electrified Spiked Slimes (`shockArmor: true`) that hurt on contact/slash unless stunned for 2s by Boomerang [Q]!
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
    shockArmor: true,
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
    shockArmor: true,
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
    damage: 1,
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
    damage: 1,
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
    hp: 8,
    weight: 12.0,
    aggroRadius: 8.8,
    speed: 5.0,
    damage: 1,
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
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-knight-west",
    kind: "knight",
    zone: "overworld",
    x: -27,
    z: 5.5,
    hp: 8,
    weight: 12.0,
    aggroRadius: 8.8,
    speed: 5.0,
    damage: 1,
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
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "ow-knight-north",
    kind: "knight",
    zone: "overworld",
    x: 0,
    z: 24,
    hp: 8,
    weight: 12.0,
    aggroRadius: 8.8,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "red",
  },

  // Dungeon Room 1 — Torchlit Antechamber (Lightweight Purple Poring Blobs + Electrified Storm Slimes!)
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
    shockArmor: true,
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
    shockArmor: true,
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
    damage: 1,
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
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "dg-knight-1",
    kind: "knight",
    zone: "dungeon",
    x: 0,
    z: 5,
    hp: 8,
    weight: 12.0,
    aggroRadius: 8.5,
    speed: 5.0,
    damage: 1,
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
    damage: 1,
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
    damage: 1,
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
    damage: 1,
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
    damage: 1,
    rupeeDrop: "boss",
  },

  // Elderwood Frontier — Post-Boss Highland Map (features Wooden Shield & Glacial Ice Armor monsters that require the Flame Rod [R]!)
  {
    id: "fr-slime-1",
    kind: "slime",
    zone: "frontier",
    x: -9,
    z: -15,
    hp: 3,
    weight: 0.5,
    aggroRadius: 8.5,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "blue",
    shieldArmor: "ice",
  },
  {
    id: "fr-slime-2",
    kind: "slime",
    zone: "frontier",
    x: 9,
    z: -14,
    hp: 3,
    weight: 0.5,
    aggroRadius: 8.5,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "blue",
    shieldArmor: "ice",
  },
  {
    id: "fr-goblin-1",
    kind: "goblin",
    zone: "frontier",
    x: -12,
    z: -2,
    hp: 4,
    weight: 2.0,
    aggroRadius: 8.8,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
    shieldArmor: "wood",
  },
  {
    id: "fr-goblin-2",
    kind: "goblin",
    zone: "frontier",
    x: 12,
    z: 0,
    hp: 4,
    weight: 2.0,
    aggroRadius: 8.8,
    speed: 5.5,
    damage: 1,
    rupeeDrop: "blue",
    shieldArmor: "wood",
  },
  {
    id: "fr-archer-1",
    kind: "archer",
    zone: "frontier",
    x: -18,
    z: 9,
    hp: 3,
    weight: 0.6,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "fr-archer-2",
    kind: "archer",
    zone: "frontier",
    x: 18,
    z: 9,
    hp: 3,
    weight: 0.6,
    aggroRadius: 11.5,
    speed: 4.6,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "fr-minion-1",
    kind: "minion",
    zone: "frontier",
    x: 0,
    z: 10,
    hp: 5,
    weight: 2.2,
    aggroRadius: 9.5,
    speed: 5.6,
    damage: 1,
    rupeeDrop: "blue",
  },
  {
    id: "fr-knight-1",
    kind: "knight",
    zone: "frontier",
    x: -8,
    z: 20,
    hp: 8,
    weight: 12.0,
    aggroRadius: 8.8,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "red",
    shieldArmor: "ice",
  },
  {
    id: "fr-knight-2",
    kind: "knight",
    zone: "frontier",
    x: 8,
    z: 20,
    hp: 8,
    weight: 12.0,
    aggroRadius: 8.8,
    speed: 5.0,
    damage: 1,
    rupeeDrop: "red",
    shieldArmor: "ice",
  },
];

export const INITIAL_WORLD_RUPEES: WorldRupeeSpawn[] = [
  // First Area (South Clearing) treasure cache so player can test out the Shop right away!
  { id: "rupee-ow-start-1", zone: "overworld", x: -9, z: -31, tier: "blue", value: 5 },
  { id: "rupee-ow-start-2", zone: "overworld", x: -13, z: -27, tier: "red", value: 20 },
  { id: "rupee-ow-start-3", zone: "overworld", x: -6, z: -25, tier: "blue", value: 5 },
  { id: "rupee-ow-start-4", zone: "overworld", x: 18, z: -26, tier: "blue", value: 5 },
  // Big Red Rupee (+20) perched in the middle of the River Stream — unreachable on foot, fetch with Boomerang [Q]!
  { id: "rupee-ow-river-gap", zone: "overworld", x: 7.5, z: -20.5, tier: "red", value: 20 },
  // Overworld scenic pickups
  { id: "rupee-ow-3", zone: "overworld", x: 31, z: -12, tier: "red", value: 20 },
  { id: "rupee-ow-4", zone: "overworld", x: 29, z: 16, tier: "red", value: 20 },
  { id: "rupee-ow-5", zone: "overworld", x: -32, z: -10, tier: "blue", value: 5 },
  // Dungeon Room 1 Big Red Rupee (+20) behind low water blocks — fetch with Boomerang [Q]!
  { id: "rupee-dg-water-gap", zone: "dungeon", x: 12.4, z: -28.5, tier: "red", value: 20 },
  // Dungeon alcove pickups
  { id: "rupee-dg-1", zone: "dungeon", x: -15, z: -9, tier: "blue", value: 5 },
  { id: "rupee-dg-2", zone: "dungeon", x: 15, z: -9, tier: "blue", value: 5 },
  // Elderwood Frontier pickups
  { id: "rupee-fr-1", zone: "frontier", x: -16, z: -12, tier: "blue", value: 5 },
  { id: "rupee-fr-2", zone: "frontier", x: 16, z: -12, tier: "blue", value: 5 },
  { id: "rupee-fr-3", zone: "frontier", x: 0, z: 26, tier: "red", value: 20 },
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
    { id: "dg-r3-north-w", name: "Boss Sanctum North Wall W", minX: -18.5, maxX: -3.5, minZ: 35.5, maxZ: 37.5, h: 5.5 },
    { id: "dg-r3-north-e", name: "Boss Sanctum North Wall E", minX: 3.5, maxX: 18.5, minZ: 35.5, maxZ: 37.5, h: 5.5 },
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
    // Room 2 (Hall of Pillars, z = 10.2) starts unlit so the Dark Room visibility mechanic is active!
    const isDarkHallTorch = Math.abs(tc.z - 10.2) < 0.5;
    props.push({
      id: `prop-dg-torch-${idx + 1}`,
      prefab: "wall_torch",
      name: isDarkHallTorch
        ? `Dark Hall Brazier #${idx + 1} (Light with Flame Rod [R]!)`
        : `Sanctum Brazier #${idx + 1}`,
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
      lit: !isDarkHallTorch,
    });
  });

  // Overworld Torch Combination Shrine (Just north of the river bridge on the East Meadow)
  // Combination: Light the 3 Golden Sun Torches (#1, #3, #4) with the Flame Rod (R / 3), leave #2 Unlit!
  const owPuzzleTorches: Array<{
    id: string;
    name: string;
    x: number;
    z: number;
    lit: boolean;
    target: "lit" | "unlit";
    tileColor: string;
  }> = [
    {
      id: "prop-ow-puzzle-torch-1",
      name: "Sun Shrine Brazier I (Light Me!)",
      x: 7.5,
      z: -14.8,
      lit: false,
      target: "lit",
      tileColor: "#f2c14e",
    },
    {
      id: "prop-ow-puzzle-torch-2",
      name: "Eclipse Brazier II (Keep Unlit!)",
      x: 10.0,
      z: -14.8,
      lit: false,
      target: "unlit",
      tileColor: "#2c2538",
    },
    {
      id: "prop-ow-puzzle-torch-3",
      name: "Sun Shrine Brazier III (Light Me!)",
      x: 12.5,
      z: -14.8,
      lit: false,
      target: "lit",
      tileColor: "#f2c14e",
    },
    {
      id: "prop-ow-puzzle-torch-4",
      name: "Sun Shrine Brazier IV (Light Me!)",
      x: 15.0,
      z: -14.8,
      lit: false,
      target: "lit",
      tileColor: "#f2c14e",
    },
  ];
  owPuzzleTorches.forEach((pt) => {
    // Rune floor marker tile beneath each puzzle torch showing the combination!
    props.push({
      id: `${pt.id}-rune`,
      prefab: "path_tile",
      name: `${pt.name} Floor Rune`,
      zone: "overworld",
      x: pt.x,
      y: 0.02,
      z: pt.z,
      rotY: 0,
      scaleX: 1.7,
      scaleY: 1,
      scaleZ: 1.7,
      hasCollider: false,
      colliderWidth: 1.7,
      colliderDepth: 1.7,
      colliderKind: "ruin",
      colorHex: pt.tileColor,
    });
    props.push({
      id: pt.id,
      prefab: "wall_torch",
      name: pt.name,
      zone: "overworld",
      x: pt.x,
      y: 0,
      z: pt.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 0.9,
      colliderDepth: 0.9,
      colliderKind: "pillar",
      lit: pt.lit,
      puzzleTarget: pt.target,
    });
  });

  // Dungeon Antechamber Twin Unlit Braziers Puzzle
  [
    { id: "prop-dg-puzzle-torch-1", name: "Antechamber West Unlit Brazier", x: -5.5, z: -24.5 },
    { id: "prop-dg-puzzle-torch-2", name: "Antechamber East Unlit Brazier", x: 5.5, z: -24.5 },
  ].forEach((dt) => {
    props.push({
      id: dt.id,
      prefab: "wall_torch",
      name: dt.name,
      zone: "dungeon",
      x: dt.x,
      y: 0,
      z: dt.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 0.9,
      colliderDepth: 0.9,
      colliderKind: "pillar",
      lit: false,
      puzzleTarget: "lit",
    });
  });

  // Soft Dirt Patches (Diggable with the Shovel — press G or 4!)
  const dirtPatches: Array<{
    id: string;
    name: string;
    zone: ZoneId;
    x: number;
    z: number;
    reward: BuriedRewardKind;
  }> = [
    {
      id: "prop-ow-dirt-1",
      name: "South Meadow Soft Dirt (Golden Bee)",
      zone: "overworld",
      x: -5.8,
      z: -29.2,
      reward: "bee",
    },
    {
      id: "prop-ow-dirt-2",
      name: "Bazaar Clearing Soft Dirt (Red Rupee)",
      zone: "overworld",
      x: 5.2,
      z: -27.8,
      reward: "rupee_red",
    },
    {
      id: "prop-ow-dirt-3",
      name: "Riverbank Soft Dirt (Swiftwind Boots)",
      zone: "overworld",
      x: -11.5,
      z: -14.5,
      reward: "swift_boots",
    },
    {
      id: "prop-ow-dirt-4",
      name: "East Grove Soft Dirt (Bottled Fairy)",
      zone: "overworld",
      x: 18.5,
      z: -6.5,
      reward: "fairy",
    },
    {
      id: "prop-ow-dirt-5",
      name: "Ancient Watchtower Soft Dirt (Crimson Mail)",
      zone: "overworld",
      x: -19.5,
      z: 15.5,
      reward: "red_mail",
    },
    {
      id: "prop-dg-dirt-1",
      name: "Sanctum Loam Patch (Glass Bottle)",
      zone: "dungeon",
      x: -8.5,
      z: -26.5,
      reward: "bottle",
    },
    {
      id: "prop-fr-dirt-1",
      name: "Frontier West Soft Dirt",
      zone: "frontier",
      x: -6.5,
      z: -16.0,
      reward: "rupee_red",
    },
    {
      id: "prop-fr-dirt-2",
      name: "Frontier East Soft Dirt",
      zone: "frontier",
      x: 6.5,
      z: -16.0,
      reward: "fairy",
    },
  ];
  dirtPatches.forEach((dp) => {
    props.push({
      id: dp.id,
      prefab: "dirt_patch",
      name: dp.name,
      zone: dp.zone,
      x: dp.x,
      y: 0,
      z: dp.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 1.5,
      colliderDepth: 1.5,
      colliderKind: "ruin",
      dug: false,
      buriedReward: dp.reward,
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

  // 8. Elderwood Frontier (New Post-Boss Map — perimeter cliffs, entrance road & starter props ready for Map Editor!)
  const frCliffDefs = [
    { id: "fr-border-s-w", name: "Frontier South-West Ridge", minX: -40, maxX: -7, minZ: -40, maxZ: -36.5, h: 4.8 },
    { id: "fr-border-s-e", name: "Frontier South-East Ridge", minX: 7, maxX: 40, minZ: -40, maxZ: -36.5, h: 4.8 },
    { id: "fr-border-s-back", name: "Frontier Gate Backdrop", minX: -7, maxX: 7, minZ: -40, maxZ: -37.2, h: 5.5 },
    { id: "fr-border-n", name: "Frontier North Ridge", minX: -40, maxX: 40, minZ: 36.5, maxZ: 40, h: 5.2 },
    { id: "fr-border-w", name: "Frontier West Ridge", minX: -40, maxX: -36.5, minZ: -40, maxZ: 40, h: 4.8 },
    { id: "fr-border-e", name: "Frontier East Ridge", minX: 36.5, maxX: 40, minZ: -40, maxZ: 40, h: 4.8 },
  ];
  frCliffDefs.forEach((fc) => {
    const w = fc.maxX - fc.minX;
    const d = fc.maxZ - fc.minZ;
    props.push({
      id: `prop-${fc.id}`,
      prefab: "cliff_block",
      name: fc.name,
      zone: "frontier",
      x: (fc.minX + fc.maxX) / 2,
      y: 0,
      z: (fc.minZ + fc.maxZ) / 2,
      rotY: 0,
      scaleX: w,
      scaleY: fc.h,
      scaleZ: d,
      hasCollider: true,
      colliderWidth: w,
      colliderDepth: d,
      colliderKind: "cliff",
    });
  });

  props.push(
    {
      id: "prop-fr-entry-arch",
      prefab: "temple_arch",
      name: "Sanctum Exit Archway",
      zone: "frontier",
      x: 0,
      y: 0,
      z: -35.2,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 10,
      colliderDepth: 3.2,
      colliderKind: "ruin",
    },
    {
      id: "prop-fr-main-road",
      prefab: "path_tile",
      name: "Frontier Highland Road",
      zone: "frontier",
      x: 0,
      y: 0,
      z: -6,
      rotY: 0,
      scaleX: 5.2,
      scaleY: 1,
      scaleZ: 54,
      hasCollider: false,
      colliderWidth: 5.2,
      colliderDepth: 54,
      colliderKind: "ruin",
    }
  );

  const frTrees = [
    { x: -16, z: -24 },
    { x: 16, z: -24 },
    { x: -25, z: -8 },
    { x: 25, z: -8 },
    { x: -22, z: 16 },
    { x: 22, z: 16 },
  ];
  frTrees.forEach((ft, idx) => {
    props.push({
      id: `prop-fr-tree-${idx + 1}`,
      prefab: "pine_tree",
      name: `Frontier Pine #${idx + 1}`,
      zone: "frontier",
      x: ft.x,
      y: 0,
      z: ft.z,
      rotY: idx * 1.1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.1,
      colliderDepth: 2.1,
      colliderKind: "tree",
    });
  });

  const frBushes = [
    { x: -5.5, z: -24 },
    { x: -7.1, z: -24 },
    { x: 5.5, z: -24 },
    { x: 7.1, z: -24 },
    { x: -8, z: 5 },
    { x: 8, z: 5 },
  ];
  frBushes.forEach((fb, idx) => {
    props.push({
      id: `prop-fr-bush-${idx + 1}`,
      prefab: "bush",
      name: `Frontier Bush #${idx + 1}`,
      zone: "frontier",
      x: fb.x,
      y: 0,
      z: fb.z,
      rotY: idx * 0.8,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 1.4,
      colliderDepth: 1.4,
      colliderKind: "tree",
    });
  });

  const frPillars = [
    { x: -6.5, z: 15 },
    { x: 6.5, z: 15 },
  ];
  frPillars.forEach((fp, idx) => {
    props.push({
      id: `prop-fr-pillar-${idx + 1}`,
      prefab: "ruin_pillar",
      name: `Highland Ruin Pillar #${idx + 1}`,
      zone: "frontier",
      x: fp.x,
      y: 0,
      z: fp.z,
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

  // =========================================================
  // 9. LIFTABLE CLAY POTS & LIGHT ROCKS (F / K TO LIFT & THROW — SMASHES ON IMPACT!)
  // =========================================================
  const potSpawns: Array<{
    id: string;
    name: string;
    zone: ZoneId;
    x: number;
    z: number;
    reward: PotRewardKind;
  }> = [
    // Overworld South Clearing Pots (right near hero spawn for immediate testing!)
    {
      id: "prop-ow-pot-1",
      name: "Village Clay Pot (Blue Rupee)",
      zone: "overworld",
      x: -3.6,
      z: -28.5,
      reward: "blue_rupee",
    },
    {
      id: "prop-ow-pot-2",
      name: "Village Clay Pot (Bomb Bundle +5)",
      zone: "overworld",
      x: -3.6,
      z: -26.8,
      reward: "bombs_5",
    },
    {
      id: "prop-ow-pot-3",
      name: "Bazaar Stall Pot (Recovery Heart)",
      zone: "overworld",
      x: 15.2,
      z: -30.5,
      reward: "heart",
    },
    // Dungeon Antechamber Pots — INCLUDING THE HIDDEN SANCTUM SMALL KEY POT!
    {
      id: "prop-dg-pot-key",
      name: "Ancient Sealed Pot (Hides Sanctum Small Key!)",
      zone: "dungeon",
      x: 9.8,
      z: -27.5,
      reward: "small_key",
    },
    {
      id: "prop-dg-pot-2",
      name: "Antechamber Pot (Recovery Heart)",
      zone: "dungeon",
      x: 9.8,
      z: -25.6,
      reward: "heart",
    },
    {
      id: "prop-dg-pot-3",
      name: "Antechamber Pot (Bomb Bundle +5)",
      zone: "dungeon",
      x: -9.8,
      z: -27.5,
      reward: "bombs_5",
    },
    {
      id: "prop-dg-pot-4",
      name: "Hall of Pillars Pot (Blue Rupee)",
      zone: "dungeon",
      x: -14.5,
      z: -7.5,
      reward: "blue_rupee",
    },
    {
      id: "prop-dg-pot-5",
      name: "Hall of Pillars Pot (Recovery Heart)",
      zone: "dungeon",
      x: 14.5,
      z: -7.5,
      reward: "heart",
    },
    // Secret Echo Grotto Pots (inside Frontier NW grotto)
    {
      id: "prop-fr-grotto-pot-1",
      name: "Echo Grotto Pot (Red Rupee +20)",
      zone: "frontier",
      x: -29.0,
      z: 31.0,
      reward: "red_rupee",
    },
    {
      id: "prop-fr-grotto-pot-2",
      name: "Echo Grotto Pot (Red Rupee +20)",
      zone: "frontier",
      x: -23.0,
      z: 31.0,
      reward: "red_rupee",
    },
  ];
  potSpawns.forEach((ps) => {
    props.push({
      id: ps.id,
      prefab: "clay_pot",
      name: ps.name,
      zone: ps.zone,
      x: ps.x,
      y: 0,
      z: ps.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.15,
      colliderDepth: 1.15,
      colliderKind: "ruin",
      smashed: false,
      potReward: ps.reward,
    });
  });

  const lightRockSpawns: Array<{
    id: string;
    name: string;
    zone: ZoneId;
    x: number;
    z: number;
    reward: PotRewardKind;
  }> = [
    {
      id: "prop-ow-light-rock-1",
      name: "Liftable Field Stone (Green Rupee)",
      zone: "overworld",
      x: 3.6,
      z: -27.5,
      reward: "green_rupee",
    },
    {
      id: "prop-ow-light-rock-2",
      name: "Riverbank Liftable Stone (Blue Rupee)",
      zone: "overworld",
      x: -7.5,
      z: -16.5,
      reward: "blue_rupee",
    },
    {
      id: "prop-ow-light-rock-3",
      name: "Ruins Courtyard Liftable Stone (Bombs +5)",
      zone: "overworld",
      x: -21.0,
      z: 3.5,
      reward: "bombs_5",
    },
  ];
  lightRockSpawns.forEach((lr) => {
    props.push({
      id: lr.id,
      prefab: "light_rock",
      name: lr.name,
      zone: lr.zone,
      x: lr.x,
      y: 0,
      z: lr.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.25,
      colliderDepth: 1.25,
      colliderKind: "ruin",
      smashed: false,
      potReward: lr.reward,
    });
  });

  // =========================================================
  // 10. PUSHABLE STONE BLOCKS (WALK AGAINST FOR 1 SECOND TO SLIDE!)
  // =========================================================
  // Overworld Push Block Puzzle (South-West Clearing / Ruins Approach)
  props.push(
    {
      id: "prop-ow-push-target-1",
      prefab: "path_tile",
      name: "Overworld Block Socket Rune",
      zone: "overworld",
      x: -9.5,
      y: 0.03,
      z: -21.0,
      rotY: 0,
      scaleX: 2.1,
      scaleY: 1,
      scaleZ: 2.1,
      hasCollider: false,
      colliderWidth: 2.1,
      colliderDepth: 2.1,
      colliderKind: "ruin",
      colorHex: "#4fd8ff",
    },
    {
      id: "prop-ow-push-block-1",
      prefab: "push_block",
      name: "Runed Pushable Block (Push North onto Socket!)",
      zone: "overworld",
      x: -9.5,
      y: 0,
      z: -23.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.9,
      colliderDepth: 1.9,
      colliderKind: "wall",
      puzzleTargetX: -9.5,
      puzzleTargetZ: -21.0,
      pushedSolved: false,
    },
    // Dungeon Push Block Puzzle (Antechamber North-West)
    {
      id: "prop-dg-push-target-1",
      prefab: "path_tile",
      name: "Sanctum Block Socket Rune",
      zone: "dungeon",
      x: -6.5,
      y: 0.03,
      z: -16.5,
      rotY: 0,
      scaleX: 2.1,
      scaleY: 1,
      scaleZ: 2.1,
      hasCollider: false,
      colliderWidth: 2.1,
      colliderDepth: 2.1,
      colliderKind: "ruin",
      colorHex: "#4fd8ff",
    },
    {
      id: "prop-dg-push-block-1",
      prefab: "push_block",
      name: "Sanctum Runed Push Block (Push North onto Socket!)",
      zone: "dungeon",
      x: -6.5,
      y: 0,
      z: -19.0,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.9,
      colliderDepth: 1.9,
      colliderKind: "wall",
      puzzleTargetX: -6.5,
      puzzleTargetZ: -16.5,
      pushedSolved: false,
    }
  );

  // =========================================================
  // 11. CRYSTAL ORB SWITCHES & RETRACTABLE CRYSTAL BARRIERS
  // (Hit with Sword, Boomerang, or Bow to toggle Blue <-> Orange!)
  // =========================================================
  props.push(
    {
      id: "prop-ow-crystal-switch-1",
      prefab: "crystal_switch",
      name: "Vale Crystal Orb Switch (Strike to Toggle!)",
      zone: "overworld",
      x: 16.5,
      y: 0,
      z: -24.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.3,
      colliderDepth: 1.3,
      colliderKind: "pillar",
      switchState: "blue",
      switchTarget: "orange",
    },
    {
      id: "prop-ow-crystal-barrier-1",
      prefab: "crystal_barrier",
      name: "Vale Retractable Crystal Barrier",
      zone: "overworld",
      x: 20.5,
      y: 0,
      z: -24.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.2,
      colliderDepth: 2.2,
      colliderKind: "wall",
      switchState: "blue",
    },
    // Dungeon Crystal Orb Switches & Barrier in Hall of Pillars
    {
      id: "prop-dg-crystal-switch-1",
      prefab: "crystal_switch",
      name: "Sanctum West Crystal Orb Switch",
      zone: "dungeon",
      x: -9.5,
      y: 0,
      z: -1.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.3,
      colliderDepth: 1.3,
      colliderKind: "pillar",
      switchState: "blue",
      switchTarget: "orange",
    },
    {
      id: "prop-dg-crystal-switch-2",
      prefab: "crystal_switch",
      name: "Sanctum East Crystal Orb Switch",
      zone: "dungeon",
      x: 9.5,
      y: 0,
      z: -1.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.3,
      colliderDepth: 1.3,
      colliderKind: "pillar",
      switchState: "blue",
      switchTarget: "orange",
    },
    {
      id: "prop-dg-crystal-barrier-1",
      prefab: "crystal_barrier",
      name: "Sanctum Hall Crystal Barrier",
      zone: "dungeon",
      x: 0,
      y: 0,
      z: -1.5,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.4,
      colliderDepth: 2.4,
      colliderKind: "wall",
      switchState: "blue",
    }
  );

  // =========================================================
  // 12. EXPLODABLE CRACKED ROCKS & SECRET CAVE ENTRANCE (BLOW UP WITH BOMBS — KEY B!)
  // =========================================================
  props.push(
    // Framing arch & cliffs around the Secret Echo Cave Entrance in Overworld North-West (x=-23, z=33.8)
    {
      id: "prop-ow-secret-cave-arch",
      prefab: "temple_arch",
      name: "Secret Echo Cave Entrance Arch",
      zone: "overworld",
      x: -23.0,
      y: 0,
      z: 34.2,
      rotY: 0,
      scaleX: 0.72,
      scaleY: 0.78,
      scaleZ: 0.85,
      hasCollider: false,
      colliderWidth: 7.2,
      colliderDepth: 2.6,
      colliderKind: "ruin",
    },
    {
      id: "prop-ow-secret-cave-wall-l",
      prefab: "boulder",
      name: "Secret Cave Frame Boulder W",
      zone: "overworld",
      x: -25.4,
      y: 0,
      z: 32.0,
      rotY: 0.4,
      scaleX: 1.3,
      scaleY: 1.4,
      scaleZ: 1.3,
      hasCollider: true,
      colliderWidth: 2.4,
      colliderDepth: 2.4,
      colliderKind: "cliff",
    },
    {
      id: "prop-ow-secret-cave-wall-r",
      prefab: "boulder",
      name: "Secret Cave Frame Boulder E",
      zone: "overworld",
      x: -20.6,
      y: 0,
      z: 32.0,
      rotY: -0.4,
      scaleX: 1.3,
      scaleY: 1.4,
      scaleZ: 1.3,
      hasCollider: true,
      colliderWidth: 2.4,
      colliderDepth: 2.4,
      colliderKind: "cliff",
    },
    {
      id: "prop-ow-cracked-cave-rock",
      prefab: "cracked_rock",
      name: "Explodable Cave Entrance Rock (Use Bomb [B]!)",
      zone: "overworld",
      x: -23.0,
      y: 0,
      z: 31.4,
      rotY: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      scaleZ: 1.35,
      hasCollider: true,
      colliderWidth: 3.1,
      colliderDepth: 2.8,
      colliderKind: "cliff",
      smashed: false,
      potReward: "red_rupee",
    },
    // Second Explodable Cracked Rock in South Clearing so player can test Bombs immediately!
    {
      id: "prop-ow-cracked-south-rock",
      prefab: "cracked_rock",
      name: "Cracked Fissure Boulder (Use Bomb [B]!)",
      zone: "overworld",
      x: -12.5,
      y: 0,
      z: -30.5,
      rotY: 0.3,
      scaleX: 1.15,
      scaleY: 1.15,
      scaleZ: 1.15,
      hasCollider: true,
      colliderWidth: 2.4,
      colliderDepth: 2.4,
      colliderKind: "ruin",
      smashed: false,
      potReward: "red_rupee",
    },
    // Dungeon Explodable Cracked Rock
    {
      id: "prop-dg-cracked-rock-1",
      prefab: "cracked_rock",
      name: "Sanctum Cracked Wall Boulder (Use Bomb [B]!)",
      zone: "dungeon",
      x: -11.5,
      y: 0,
      z: -21.0,
      rotY: 0,
      scaleX: 1.15,
      scaleY: 1.15,
      scaleZ: 1.15,
      hasCollider: true,
      colliderWidth: 2.4,
      colliderDepth: 2.4,
      colliderKind: "wall",
      smashed: false,
      potReward: "heart",
    }
  );

  // =========================================================
  // 13. TIMED TORCH SQUARE PUZZLES (8-SECOND COUNTDOWN — LIGHT ALL 4 SIMULTANEOUSLY!)
  // =========================================================
  // Dungeon Room 2 (Hall of Pillars) — 4 unlit timed lanterns in a square.
  // Lighting them illuminates the Dark Room AND if all 4 are lit simultaneously within 8s,
  // they lock in permanently, unlock the Boss Sanctum Gate, and spawn a treasure chest reward!
  const dgTimedSquare = [
    { id: "prop-dg-timed-torch-sw", name: "Hall Timed Lantern SW (8s Timer)", x: -4.2, z: -7.8 },
    { id: "prop-dg-timed-torch-se", name: "Hall Timed Lantern SE (8s Timer)", x: 4.2, z: -7.8 },
    { id: "prop-dg-timed-torch-nw", name: "Hall Timed Lantern NW (8s Timer)", x: -4.2, z: -3.2 },
    { id: "prop-dg-timed-torch-ne", name: "Hall Timed Lantern NE (8s Timer)", x: 4.2, z: -3.2 },
  ];
  dgTimedSquare.forEach((tt) => {
    props.push({
      id: tt.id,
      prefab: "wall_torch",
      name: tt.name,
      zone: "dungeon",
      x: tt.x,
      y: 0,
      z: tt.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 0.9,
      colliderDepth: 0.9,
      colliderKind: "pillar",
      lit: false,
      timedDuration: 8,
      litTimer: 0,
      timedSolved: false,
    });
  });

  // Overworld West Meadow — 4 unlit timed lanterns in a square (8s countdown)
  const owTimedSquare = [
    { id: "prop-ow-timed-torch-sw", name: "Meadow Timed Lantern SW (8s Timer)", x: -14.0, z: -10.5 },
    { id: "prop-ow-timed-torch-se", name: "Meadow Timed Lantern SE (8s Timer)", x: -9.8, z: -10.5 },
    { id: "prop-ow-timed-torch-nw", name: "Meadow Timed Lantern NW (8s Timer)", x: -14.0, z: -6.3 },
    { id: "prop-ow-timed-torch-ne", name: "Meadow Timed Lantern NE (8s Timer)", x: -9.8, z: -6.3 },
  ];
  owTimedSquare.forEach((tt) => {
    props.push({
      id: tt.id,
      prefab: "wall_torch",
      name: tt.name,
      zone: "overworld",
      x: tt.x,
      y: 0,
      z: tt.z,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: false,
      colliderWidth: 0.9,
      colliderDepth: 0.9,
      colliderKind: "pillar",
      lit: false,
      timedDuration: 8,
      litTimer: 0,
      timedSolved: false,
    });
  });

  // =========================================================
  // 14. BURNABLE BARRIERS (SPIDERWEBS & DRY BRIARS — BURN AWAY WITH FLAME ROD [R]!)
  // =========================================================
  props.push(
    // Thick Spiderweb Barrier blocking the Dungeon North Exit into Map 3 (Elderwood Frontier)!
    {
      id: "prop-dg-exit-spiderweb",
      prefab: "spiderweb_barrier",
      name: "Sanctum Exit Thick Spiderweb (Burn with Flame Rod [R]!)",
      zone: "dungeon",
      x: 0,
      y: 0,
      z: 33.4,
      rotY: 0,
      scaleX: 1.35,
      scaleY: 1.2,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 5.2,
      colliderDepth: 1.6,
      colliderKind: "wall",
      smashed: false,
    },
    // Overworld South-West Dry Briar Thicket (right near spawn so player can test burning briars immediately!)
    {
      id: "prop-ow-south-briar",
      prefab: "briar_barrier",
      name: "South Clearing Dry Briars (Burn with Flame Rod [R]!)",
      zone: "overworld",
      x: -13.0,
      y: 0,
      z: -25.2,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 2.8,
      colliderDepth: 1.6,
      colliderKind: "tree",
      smashed: false,
    },
    // Overworld East Grove Dry Briar Barrier guarding the Bottled Fairy dirt cache
    {
      id: "prop-ow-east-briar",
      prefab: "briar_barrier",
      name: "East Grove Thorny Briars (Burn with Flame Rod [R]!)",
      zone: "overworld",
      x: 18.5,
      y: 0,
      z: -8.5,
      rotY: 0,
      scaleX: 1.15,
      scaleY: 1.05,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 3.0,
      colliderDepth: 1.6,
      colliderKind: "tree",
      smashed: false,
    },
    // Elderwood Frontier Entrance Dry Briar Barrier
    {
      id: "prop-fr-entry-briar",
      prefab: "briar_barrier",
      name: "Frontier Highland Briar Barrier (Burn with Flame Rod [R]!)",
      zone: "frontier",
      x: 0,
      y: 0,
      z: -22.5,
      rotY: 0,
      scaleX: 1.4,
      scaleY: 1.15,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 3.4,
      colliderDepth: 1.6,
      colliderKind: "tree",
      smashed: false,
    },
    // =========================================================
    // 15. LOW WATER BLOCKS FOR BOOMERANG FETCH-OVER-GAP PUZZLES
    // =========================================================
    // Sunken Water Moat surrounding the Sanctum Key Pedestal (-28, 11) in the Western Ruins
    // Blocks the Hero from walking onto the pedestal — throw the Boomerang [Q] across the water to snag the Key!
    {
      id: "prop-ow-key-moat-s",
      prefab: "water_tile",
      name: "Sanctum Key Moat South (Throw Boomerang [Q] Across!)",
      zone: "overworld",
      x: -28.0,
      y: 0,
      z: 8.1,
      rotY: 0,
      scaleX: 6.2,
      scaleY: 1,
      scaleZ: 1.8,
      hasCollider: true,
      colliderWidth: 6.2,
      colliderDepth: 1.8,
      colliderKind: "water",
    },
    {
      id: "prop-ow-key-moat-n",
      prefab: "water_tile",
      name: "Sanctum Key Moat North",
      zone: "overworld",
      x: -28.0,
      y: 0,
      z: 13.7,
      rotY: 0,
      scaleX: 6.2,
      scaleY: 1,
      scaleZ: 1.5,
      hasCollider: true,
      colliderWidth: 6.2,
      colliderDepth: 1.5,
      colliderKind: "water",
    },
    {
      id: "prop-ow-key-moat-e",
      prefab: "water_tile",
      name: "Sanctum Key Moat East (Throw Boomerang [Q] Across!)",
      zone: "overworld",
      x: -25.1,
      y: 0,
      z: 11.0,
      rotY: 0,
      scaleX: 1.8,
      scaleY: 1,
      scaleZ: 5.8,
      hasCollider: true,
      colliderWidth: 1.8,
      colliderDepth: 5.8,
      colliderKind: "water",
    },
    {
      id: "prop-ow-key-moat-w",
      prefab: "water_tile",
      name: "Sanctum Key Moat West",
      zone: "overworld",
      x: -30.9,
      y: 0,
      z: 11.0,
      rotY: 0,
      scaleX: 1.8,
      scaleY: 1,
      scaleZ: 5.8,
      hasCollider: true,
      colliderWidth: 1.8,
      colliderDepth: 5.8,
      colliderKind: "water",
    },
    // Dungeon Room 1 Sunken Water Channel blocking the East Alcove Big Red Rupee (+20)
    {
      id: "prop-dg-water-gap",
      prefab: "water_tile",
      name: "Antechamber Water Trench (Fetch Rupee with Boomerang [Q]!)",
      zone: "dungeon",
      x: 9.8,
      y: 0,
      z: -28.5,
      rotY: 0,
      scaleX: 2.0,
      scaleY: 1,
      scaleZ: 6.4,
      hasCollider: true,
      colliderWidth: 2.0,
      colliderDepth: 6.4,
      colliderKind: "water",
    },
    // =========================================================
    // 16. DUNGEON WALL EYE STATUES (BOW & ARROW [E] PUZZLE — SWORD & FIRE BOUNCE OFF!)
    // =========================================================
    {
      id: "prop-dg-eye-statue-w",
      prefab: "eye_statue",
      name: "Sanctum West Wall Eye Statue (Shoot with Bow [E]!)",
      zone: "dungeon",
      x: -6.4,
      y: 0,
      z: 10.65,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.6,
      colliderDepth: 1.2,
      colliderKind: "wall",
      eyeActivated: false,
    },
    {
      id: "prop-dg-eye-statue-e",
      prefab: "eye_statue",
      name: "Sanctum East Wall Eye Statue (Shoot with Bow [E]!)",
      zone: "dungeon",
      x: 6.4,
      y: 0,
      z: 10.65,
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.6,
      colliderDepth: 1.2,
      colliderKind: "wall",
      eyeActivated: false,
    }
  );

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
    // Locked Gate in Dungeon (South Boss Sanctum Entrance)
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
    // Boss Exit Gate in Dungeon (North Boss Sanctum Exit to Elderwood Frontier — unlocks when Boss dies!)
    {
      id: "dg-boss-exit-gate",
      zone: "dungeon",
      minX: BOSS_EXIT_GATE_POS.x - 3.5,
      maxX: BOSS_EXIT_GATE_POS.x + 3.5,
      minZ: BOSS_EXIT_GATE_POS.z - 0.8,
      maxZ: BOSS_EXIT_GATE_POS.z + 0.8,
      kind: "gate",
      height: 4.6,
    },
  ];

  for (const prop of mapProps) {
    if (!prop.hasCollider || prop.smashed) continue;
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
  dynamicObstacles?: RectObstacle[],
  bossExitUnlocked = false
): { x: number; z: number; hitObstacle: boolean } {
  let curX = x;
  let curZ = z;
  let hitObstacle = false;
  const list = dynamicObstacles ?? [];
  for (const obs of list) {
    if (obs.zone !== zone) continue;
    if (obs.id === "dg-locked-gate" && gateUnlocked) continue;
    if (obs.id === "dg-boss-exit-gate" && bossExitUnlocked) continue;
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
 * before hitting a wall, pillar, tree, or boulder, up to `maxDist`.
 * Used for Boss, Sentinel Knight, and Goblin Fighter ground lunge path telegraphs!
 */
export function computeEnemyChargePathLength(
  startX: number,
  startZ: number,
  angle: number,
  radius: number,
  maxDist: number,
  zone: ZoneId,
  gateUnlocked: boolean,
  dynamicObstacles?: RectObstacle[],
  bossExitUnlocked = false
): number {
  const dirX = Math.sin(angle);
  const dirZ = Math.cos(angle);
  const step = 0.3;
  const list = dynamicObstacles ?? [];
  for (let d = step; d <= maxDist; d += step) {
    const testX = startX + dirX * d;
    const testZ = startZ + dirZ * d;
    if (Math.abs(testX) >= 39.0 - radius || Math.abs(testZ) >= 39.0 - radius) {
      return d;
    }
    for (const obs of list) {
      if (obs.zone !== zone) continue;
      if (obs.id === "dg-locked-gate" && gateUnlocked) continue;
      if (obs.id === "dg-boss-exit-gate" && bossExitUnlocked) continue;
      const res = resolveCircleRectCollision(testX, testZ, radius, obs);
      if (res.collided) {
        return d;
      }
    }
  }
  return maxDist;
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
    if (testZ - radius < 12.85) {
      return d;
    }
    for (const obs of list) {
      if (obs.zone !== "dungeon") continue;
      const res = resolveCircleRectCollision(testX, testZ, radius, obs);
      if (res.collided) {
        return d;
      }
    }
  }
  return maxDist;
}

/**
 * Checks arrow collisions against solid walls, cliffs, pillars, trees, ruins, and gates
 * (flying cleanly over low water tiles) so arrows can stick into solid surfaces!
 */
export function resolveArrowCollisions(
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
    if (obs.kind === "water") continue; // Arrows fly over water!
    if (obs.kind === "gate" && gateUnlocked) continue;
    const res = resolveCircleRectCollision(curX, curZ, radius, obs);
    if (res.collided) {
      hitObstacle = true;
    }
    curX = res.x;
    curZ = res.z;
  }
  if (Math.abs(curX) >= 39.2 || Math.abs(curZ) >= 39.2) {
    hitObstacle = true;
  }
  return { x: curX, z: curZ, hitObstacle };
}

/**
 * Checks whether a circle of `clearanceRadius` has an unobstructed straight-line path
 * from `(x0, z0)` to `(x1, z1)` in `zone`.
 */
export function hasClearLineOfSight(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  clearanceRadius: number,
  zone: ZoneId,
  gateUnlocked: boolean,
  dynamicObstacles?: RectObstacle[]
): boolean {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.25) return true;
  const steps = Math.max(2, Math.ceil(dist / 0.55));
  const list = dynamicObstacles ?? [];
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    for (const obs of list) {
      if (obs.zone !== zone) continue;
      if (obs.kind === "gate" && gateUnlocked) continue;
      if (resolveCircleRectCollision(px, pz, clearanceRadius, obs).collided) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Hybrid A* Navigation Grid + 11-Ray Local Context Steering Pathfinder for Enemies & Boss!
 * - First checks if direct line-of-sight is clear.
 * - If blocked by a pillar, wall, room divider, tree, boulder, or river, runs an 8-directional
 *   A* search over a 2.0-unit navigation grid with string-pulling smoothing to find the next
 *   unobstructed waypoint around the obstacle.
 * - Then applies 11-ray local context steering with lookahead probes so wide-bodied enemies
 *   (especially Malakor the Boss and Iron Sentinel Knights) smoothly glide around pillar corners
 *   and doorway edges without ever getting stuck.
 */
export function computePathfindingMoveDir(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  radius: number,
  zone: ZoneId,
  gateUnlocked: boolean,
  dynamicObstacles?: RectObstacle[]
): { dirX: number; dirZ: number; angle: number } {
  const toTargetX = targetX - startX;
  const toTargetZ = targetZ - startZ;
  const directDist = Math.hypot(toTargetX, toTargetZ);
  if (directDist < 0.05) {
    return { dirX: 0, dirZ: 0, angle: 0 };
  }

  const list = dynamicObstacles ?? [];
  const navClearance = radius + 0.16;

  let desiredX = targetX;
  let desiredZ = targetZ;

  // 1. If direct line-of-sight is blocked, run 8-directional A* on 2.0-unit grid
  if (
    directDist > 1.2 &&
    !hasClearLineOfSight(
      startX,
      startZ,
      targetX,
      targetZ,
      navClearance,
      zone,
      gateUnlocked,
      list
    )
  ) {
    const CELL = 2.0;
    const HALF = 40.0;
    const GRID_N = 41; // -40..40 in steps of 2.0

    const toGrid = (v: number): number =>
      Math.max(0, Math.min(GRID_N - 1, Math.round((v + HALF) / CELL)));
    const toWorld = (idx: number): number => -HALF + idx * CELL;

    const sx = toGrid(startX);
    const sz = toGrid(startZ);
    const gx = toGrid(targetX);
    const gz = toGrid(targetZ);

    const isCellWalkable = (cx: number, cz: number): boolean => {
      if (cx <= 0 || cx >= GRID_N - 1 || cz <= 0 || cz >= GRID_N - 1) return false;
      if ((cx === sx && cz === sz) || (cx === gx && cz === gz)) return true;
      const wx = toWorld(cx);
      const wz = toWorld(cz);
      for (const obs of list) {
        if (obs.zone !== zone) continue;
        if (obs.kind === "gate" && gateUnlocked) continue;
        if (resolveCircleRectCollision(wx, wz, radius + 0.1, obs).collided) {
          return false;
        }
      }
      return true;
    };

    const totalCells = GRID_N * GRID_N;
    const gScore = new Float32Array(totalCells).fill(1e9);
    const fScore = new Float32Array(totalCells).fill(1e9);
    const cameFrom = new Int16Array(totalCells).fill(-1);
    const closed = new Uint8Array(totalCells);
    const openList: number[] = [];

    const startId = sz * GRID_N + sx;
    const goalId = gz * GRID_N + gx;

    const octile = (x0: number, z0: number, x1: number, z1: number): number => {
      const dx = Math.abs(x1 - x0);
      const dz = Math.abs(z1 - z0);
      return dx + dz + (1.4142 - 2) * Math.min(dx, dz);
    };

    gScore[startId] = 0;
    fScore[startId] = octile(sx, sz, gx, gz);
    openList.push(startId);

    const dirs = [
      [0, 1, 1.0],
      [1, 0, 1.0],
      [0, -1, 1.0],
      [-1, 0, 1.0],
      [1, 1, 1.4142],
      [1, -1, 1.4142],
      [-1, 1, 1.4142],
      [-1, -1, 1.4142],
    ];

    let bestNode = startId;
    let bestH = fScore[startId];
    let iterations = 0;
    const maxIterations = 520;

    while (openList.length > 0 && iterations < maxIterations) {
      iterations++;
      let minIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (fScore[openList[i]] < fScore[openList[minIdx]]) {
          minIdx = i;
        }
      }
      const current = openList[minIdx];
      openList[minIdx] = openList[openList.length - 1];
      openList.pop();

      if (current === goalId) {
        bestNode = goalId;
        break;
      }
      if (closed[current]) continue;
      closed[current] = 1;

      const cx = current % GRID_N;
      const cz = Math.floor(current / GRID_N);
      const hCur = octile(cx, cz, gx, gz);
      if (hCur < bestH && current !== startId) {
        bestH = hCur;
        bestNode = current;
      }

      for (const [ox, oz, stepCost] of dirs) {
        const nx = cx + ox;
        const nz = cz + oz;
        if (!isCellWalkable(nx, nz)) continue;
        // Prevent diagonal corner clipping through obstacle corners
        if (ox !== 0 && oz !== 0) {
          if (!isCellWalkable(cx + ox, cz) || !isCellWalkable(cx, cz + oz)) {
            continue;
          }
        }
        const nId = nz * GRID_N + nx;
        if (closed[nId]) continue;

        const tentativeG = gScore[current] + stepCost;
        if (tentativeG < gScore[nId]) {
          cameFrom[nId] = current;
          gScore[nId] = tentativeG;
          fScore[nId] = tentativeG + octile(nx, nz, gx, gz);
          if (!openList.includes(nId)) {
            openList.push(nId);
          }
        }
      }
    }

    if (bestNode !== startId) {
      const pathNodes: Array<{ x: number; z: number }> = [];
      let cur = bestNode;
      while (cur !== -1 && cur !== startId) {
        const px = toWorld(cur % GRID_N);
        const pz = toWorld(Math.floor(cur / GRID_N));
        pathNodes.push({ x: px, z: pz });
        cur = cameFrom[cur];
      }
      pathNodes.reverse();

      if (pathNodes.length > 0) {
        desiredX = pathNodes[0].x;
        desiredZ = pathNodes[0].z;
        // String-pulling: pick the furthest visible waypoint up to 5 steps ahead
        const maxLook = Math.min(pathNodes.length - 1, 5);
        for (let k = maxLook; k >= 1; k--) {
          if (
            hasClearLineOfSight(
              startX,
              startZ,
              pathNodes[k].x,
              pathNodes[k].z,
              radius * 0.9,
              zone,
              gateUnlocked,
              list
            )
          ) {
            desiredX = pathNodes[k].x;
            desiredZ = pathNodes[k].z;
            break;
          }
        }
      }
    }
  }

  const baseAngle = Math.atan2(desiredX - startX, desiredZ - startZ);

  // 2. 11-Ray Local Context Steering & Corner Unsticking
  const steerOffsets = [
    0,
    0.32,
    -0.32,
    0.65,
    -0.65,
    0.98,
    -0.98,
    1.32,
    -1.32,
    1.68,
    -1.68,
  ];

  const probeRadius = radius + 0.08;
  let chosenAngle = baseAngle;

  for (const offset of steerOffsets) {
    const candAngle = baseAngle + offset;
    const dx = Math.sin(candAngle);
    const dz = Math.cos(candAngle);

    let clear = true;
    for (const lookDist of [0.65, 1.35]) {
      const tx = startX + dx * lookDist;
      const tz = startZ + dz * lookDist;
      for (const obs of list) {
        if (obs.zone !== zone) continue;
        if (obs.kind === "gate" && gateUnlocked) continue;
        if (resolveCircleRectCollision(tx, tz, probeRadius, obs).collided) {
          clear = false;
          break;
        }
      }
      if (!clear) break;
    }

    if (clear) {
      chosenAngle = candAngle;
      break;
    }
  }

  return {
    dirX: Math.sin(chosenAngle),
    dirZ: Math.cos(chosenAngle),
    angle: chosenAngle,
  };
}

