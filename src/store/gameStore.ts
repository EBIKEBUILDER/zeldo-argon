import { create } from "zustand";
import {
  BOSS_CHEST_POS,
  BOSS_EXIT_GATE_POS,
  BOSS_MAX_LUNGE_RANGE,
  buildInitialMapProps,
  buildObstaclesFromMapProps,
  BuriedRewardKind,
  computeBossChargePathLength,
  computeEnemyChargePathLength,
  computePathfindingMoveDir,
  CustomModelAsset,
  DUNGEON_KEY_POS,
  DungeonRoomId,
  EnemyKind,
  getDefaultEnemyWeight,
  HERO_SPAWN,
  INITIAL_ENEMIES,
  INITIAL_PORTALS,
  INITIAL_WORLD_RUPEES,
  LOCKED_GATE_POS,
  MapPortal,
  MapPropInstance,
  PropPrefabId,
  resolveArrowCollisions,
  resolveWorldCollisions,
  RupeeTier,
  SHOP_INTERACT_POS,
  ZoneId,
} from "@/game/worldData";
import { soundEngine } from "@/audio/soundEngine";

export type GamePhase = "title" | "playing" | "gameover" | "victory";
export type ShopItemId =
  | "boomerang"
  | "bow"
  | "arrows"
  | "heart"
  | "red_potion"
  | "green_potion"
  | "blue_potion"
  | "bottle";
export type EditorToolId = "select" | "place" | "terrain" | "delete";
export type EditorEntityKind = "prop" | "enemy" | "rupee" | "portal";
export type EditorPlaceCategory = "props" | "monsters" | "rupees" | "portals" | "custom";
export type TerrainBrushMode = "raise" | "lower" | "flatten" | "paint";

export type PrimaryHandId = "traveler_blade" | "tempered_blade";
export type OffhandId = "wooden_buckler" | "mirror_shield";
export type TunicId = "green_tunic" | "blue_mail" | "red_mail";
export type BootsId = "leather_boots" | "swift_boots" | "titan_greaves";
export type BottleContentId =
  | "empty"
  | "red_potion"
  | "green_potion"
  | "blue_potion"
  | "fairy"
  | "bee";

export interface EditorSelection {
  kind: EditorEntityKind;
  id: string;
}

export interface TerrainCellData {
  h: number;
  c?: string;
}

export type EnemyAIState =
  | "idle"
  | "aggro"
  | "windup"
  | "attack"
  | "recover"
  | "charge_aim"
  | "charge_lock"
  | "charge_lunge"
  | "stunned"
  | "lob_windup"
  | "dead";

export interface HeroState {
  x: number;
  z: number;
  facing: number;
  hp: number; // in half-hearts (10 = 5 full hearts)
  maxHp: number;
  mp: number; // Magic Power (0..maxMp)
  maxMp: number;
  damageFractionAcc: number; // Accumulates fractional half-heart damage from 50% / 75% armor mitigation
  rupees: number;
  hasDungeonKey: boolean;
  hasBoomerang: boolean;
  hasBow: boolean;
  hasFireRod: boolean;
  hasShovel: boolean;
  arrows: number;
  // Character Sheet Equipment Slots
  equippedPrimary: PrimaryHandId;
  equippedOffhand: OffhandId;
  equippedTunic: TunicId;
  equippedBoots: BootsId;
  unlockedPrimaries: PrimaryHandId[];
  unlockedOffhands: OffhandId[];
  unlockedTunics: TunicId[];
  unlockedBoots: BootsId[];
  bottles: BottleContentId[];
  shieldBlock: number; // Physical damage blocked by current shield
  swordDamage: number; // Base sword damage (1 for Traveler's Sword, 2 for Tempered Blade)
  isAttacking: boolean;
  isSpinAttacking: boolean;
  isBlocking: boolean;
  shieldAbsorbToggle: boolean;
  attackTimer: number;
  spinAttackTimer: number;
  swordChargeTimer: number;
  fireRodChargeTimer: number;
  fireRodCooldown: number;
  digAnimTimer: number;
  attackCooldown: number;
  boomerangCooldown: number;
  bowCooldown: number;
  bowAnimTimer: number;
  throwAnimTimer: number;
  weaponLockTimer: number;
  portalCooldown: number;
  swingId: number;
  invulnerableTimer: number;
  hurtFlashTimer: number;
  knockbackLockTimer: number;
  knockbackVx: number;
  knockbackVz: number;
  walkCycle: number;
}

export interface EnemyState {
  id: string;
  kind: EnemyKind;
  zone: ZoneId;
  x: number;
  z: number;
  spawnX: number;
  spawnZ: number;
  facing: number;
  hp: number;
  maxHp: number;
  weight: number; // Controls sword knockback (0.5 = light, 2.0 = medium, 12.0 = heavy, 100 = immovable)
  state: EnemyAIState;
  stateTimer: number;
  hitFlashTimer: number;
  knockbackImmunityTimer: number;
  stunTimer: number;
  lastHitSwingId: number;
  knockbackVx: number;
  knockbackVz: number;
  aggroRadius: number;
  speed: number;
  damage: number;
  rupeeDrop: RupeeTier | "boss";
  provoked?: boolean;
  // Boss & Goblin Lunge combat state
  chargeAngle: number;
  chargePathLength: number;
  chargeDistanceTraveled: number;
  actionCounter: number;
  actionCooldown: number;
}

export interface BoomerangState {
  zone: ZoneId;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  distanceTraveled: number;
  returning: boolean;
  spinAngle: number;
  hitEnemyIds: string[];
}

export interface ArrowProjectileState {
  id: string;
  zone: ZoneId;
  fromHero: boolean;
  x: number;
  z: number;
  angle: number;
  speed: number;
  damage: number;
  lifeTimer: number;
  stuck?: boolean;
  stuckTimer?: number;
  stuckEnemyId?: string;
  stuckLocalX?: number;
  stuckLocalZ?: number;
  stuckLocalAngle?: number;
  stuckInShield?: boolean;
  stuckShieldY?: number;
  stuckShieldZ?: number;
  stuckShieldYaw?: number;
}

export interface FireballProjectileState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  angle: number;
  speed: number;
  damage: number;
  radius: number;
  isCharged: boolean;
  lifeTimer: number;
}

export interface FireZoneState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
  tickTimer: number;
}

export interface FriendlyBeeState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  facing: number;
  timer: number;
  maxTimer: number;
  stingCooldown: number;
}

export interface BossProjectileState {
  id: string;
  zone: ZoneId;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  flightTime: number;
  totalFlightTime: number;
  aoeRadius: number;
  directHitRadius: number;
}

export interface HazardZoneState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
}

export interface RupeeItemState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  tier: RupeeTier;
  value: number;
  collected: boolean;
  spawnBounceTimer?: number;
}

export interface BushBurstState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  timer: number;
  maxTimer: number;
  seed: number;
  isDirt?: boolean;
}

export interface GameFlags {
  keyPickedUp: boolean;
  gateUnlocked: boolean;
  bossAwakened: boolean;
  bossPhase2: boolean;
  bossDefeated: boolean;
  chestUnlocked: boolean;
  overworldTorchPuzzleSolved?: boolean;
  dungeonTorchPuzzleSolved?: boolean;
}

export interface GameStats {
  enemiesDefeated: number;
  damageTaken: number;
  elapsedSeconds: number;
}

export interface BannerMessage {
  id: number;
  text: string;
  subtext?: string;
  timer: number;
}

export interface FrameInput {
  moveX: number;
  moveZ: number;
  attackPressed: boolean;
  attackHeld?: boolean;
  blockHeld: boolean;
  boomerangPressed: boolean;
  bowPressed: boolean;
  fireRodPressed?: boolean;
  fireRodHeld?: boolean;
  shovelPressed?: boolean;
  bottlePressed?: boolean;
}

export interface SerializableGameState {
  phase: GamePhase;
  zone: ZoneId;
  dungeonRoom: DungeonRoomId;
  hero: HeroState;
  enemies: EnemyState[];
  boomerang: BoomerangState | null;
  arrows: ArrowProjectileState[];
  fireballs: FireballProjectileState[];
  fireZones: FireZoneState[];
  friendlyBees: FriendlyBeeState[];
  projectiles: BossProjectileState[];
  hazards: HazardZoneState[];
  rupees: RupeeItemState[];
  cutBushIds: string[];
  lootedBushIds: string[];
  bushRupeesEarned: number;
  bushBursts: BushBurstState[];
  mapProps: MapPropInstance[];
  portals: MapPortal[];
  customModels: CustomModelAsset[];
  terrainCells: Record<ZoneId, Record<string, TerrainCellData>>;
  terrainRevision: number;
  flags: GameFlags;
  stats: GameStats;
  banner: BannerMessage | null;
  nearShop: boolean;
  shopOpen: boolean;
  characterOpen: boolean;
  shopDismissedOnRug: boolean;
  gateNoticeCooldown: number;
  chestNoticeCooldown: number;
  armorNoticeCooldown: number;
  muted: boolean;
  fps: number;
  // Unity-Style Live Play / Pause Map Editor State
  editorMode: boolean;
  editorTool: EditorToolId;
  editorSelected: EditorSelection | null;
  editorPlaceCategory: EditorPlaceCategory;
  editorPlacePrefab: string;
  terrainBrushMode: TerrainBrushMode;
  terrainBrushRadius: number;
  terrainBrushStrength: number;
  terrainPaintColor: string;
}

export interface GameActions {
  startGame: () => void;
  restartGame: () => void;
  toggleMute: () => void;
  setFps: (fps: number) => void;
  setShopOpen: (open: boolean) => void;
  setCharacterOpen: (open: boolean) => void;
  buyShopItem: (item: ShopItemId) => void;
  equipHeroItem: (
    slot: "primary" | "offhand" | "tunic" | "boots",
    itemId: string
  ) => void;
  useBottleSlot: (index: number) => void;
  fillBottleSlot: (index: number, content: BottleContentId, rupeeCost?: number) => void;
  addEmptyBottle: () => void;
  tick: (dt: number, input: FrameInput) => void;
  // Map Editor Actions
  setEditorMode: (enabled: boolean) => void;
  setEditorZone: (zone: ZoneId, teleportHero?: boolean, targetX?: number, targetZ?: number) => void;
  setEditorTool: (tool: EditorToolId) => void;
  setEditorSelected: (sel: EditorSelection | null) => void;
  setEditorPlaceItem: (category: EditorPlaceCategory, prefab: string) => void;
  setTerrainBrush: (
    patch: Partial<{
      mode: TerrainBrushMode;
      radius: number;
      strength: number;
      color: string;
    }>
  ) => void;
  applyTerrainStroke: (worldX: number, worldZ: number, dt: number) => void;
  placeEntityAt: (worldX: number, worldZ: number) => void;
  moveSelectedEntityTo: (worldX: number, worldZ: number) => void;
  updatePropInstance: (id: string, patch: Partial<MapPropInstance>) => void;
  updateEnemyInstance: (id: string, patch: Partial<EnemyState>) => void;
  updateRupeeInstance: (id: string, patch: Partial<RupeeItemState>) => void;
  updatePortalInstance: (id: string, patch: Partial<MapPortal>) => void;
  duplicateSelectedEntity: () => void;
  deleteEntity: (kind: EditorEntityKind, id: string) => void;
  deleteSelectedEntity: () => void;
  importCustomObjModel: (name: string, objText: string, colorHex?: string) => boolean;
  resetPlaySimulation: () => void;
  exportMapJson: () => string;
  importMapJson: (jsonText: string) => boolean;
  saveMapToBrowserStorage: () => boolean;
  hydrateSavedMapFromStorage: () => boolean;
  resetMapToDefaults: () => void;
}

export type GameStore = SerializableGameState & GameActions;

/**
 * Built-in sample custom 3D meshes so the Custom 3D Assets tab has ready-to-place meshes immediately,
 * alongside full Wavefront .OBJ file importing!
 */
function createBuiltInCustomModels(): CustomModelAsset[] {
  // Crystal Obelisk (Octagonal spire)
  const obeliskPos = [
    // Base square-ish ring (y=0)
    -0.8, 0, -0.8,  0.8, 0, -0.8,  0.8, 0, 0.8,  -0.8, 0, 0.8,
    // Mid ring (y=2.6)
    -0.55, 2.6, -0.55,  0.55, 2.6, -0.55,  0.55, 2.6, 0.55,  -0.55, 2.6, 0.55,
    // Apex point (y=4.0)
    0, 4.0, 0,
  ];
  const obeliskIdx = [
    // Sides lower
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
    // Pyramid tip
    4, 5, 8,
    5, 6, 8,
    6, 7, 8,
    7, 4, 8,
  ];
  const obeliskNorms = [
    -0.5, 0.2, -0.5,  0.5, 0.2, -0.5,  0.5, 0.2, 0.5,  -0.5, 0.2, 0.5,
    -0.5, 0.4, -0.5,  0.5, 0.4, -0.5,  0.5, 0.4, 0.5,  -0.5, 0.4, 0.5,
    0, 1, 0,
  ];

  return [
    {
      id: "custom-crystal-obelisk",
      name: "Arcane Crystal Spire",
      positions: obeliskPos,
      indices: obeliskIdx,
      normals: obeliskNorms,
      colorHex: "#4fd8ff",
    },
  ];
}

/**
 * Parses a standard Wavefront .OBJ text file into positions, indices, and normals,
 * auto-centering on X/Z, resting on Y=0, and normalizing to a ~3.0 unit height.
 */
export function parseWavefrontObj(
  name: string,
  objText: string,
  colorHex = "#d8c49a"
): CustomModelAsset | null {
  const rawVerts: Array<[number, number, number]> = [];
  const positions: number[] = [];
  const indices: number[] = [];

  const lines = objText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === "v" && parts.length >= 4) {
      const vx = parseFloat(parts[1]);
      const vy = parseFloat(parts[2]);
      const vz = parseFloat(parts[3]);
      if (Number.isFinite(vx) && Number.isFinite(vy) && Number.isFinite(vz)) {
        rawVerts.push([vx, vy, vz]);
      }
    } else if (parts[0] === "f" && parts.length >= 4) {
      const faceIndices: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const token = parts[i].split("/")[0];
        let vIdx = parseInt(token, 10);
        if (!Number.isFinite(vIdx)) continue;
        if (vIdx < 0) vIdx = rawVerts.length + vIdx;
        else vIdx = vIdx - 1;
        if (vIdx >= 0 && vIdx < rawVerts.length) {
          faceIndices.push(vIdx);
        }
      }
      for (let t = 1; t + 1 < faceIndices.length; t++) {
        const i0 = faceIndices[0];
        const i1 = faceIndices[t];
        const i2 = faceIndices[t + 1];
        const baseIdx = positions.length / 3;
        positions.push(...rawVerts[i0], ...rawVerts[i1], ...rawVerts[i2]);
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      }
    }
  }

  if (positions.length < 9 || indices.length < 3) {
    return null;
  }

  // Normalize bounding box to rest at Y=0 and have max dimension ~3.2 units
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const span = Math.max(0.001, maxX - minX, maxY - minY, maxZ - minZ);
  const scale = 3.0 / span;

  const normals: number[] = new Array(positions.length).fill(0);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - cx) * scale;
    positions[i + 1] = (positions[i + 1] - minY) * scale;
    positions[i + 2] = (positions[i + 2] - cz) * scale;
  }

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    normals[a] = nx; normals[a + 1] = ny; normals[a + 2] = nz;
    normals[b] = nx; normals[b + 1] = ny; normals[b + 2] = nz;
    normals[c] = nx; normals[c + 1] = ny; normals[c + 2] = nz;
  }

  return {
    id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    positions,
    indices,
    normals,
    colorHex,
  };
}

/**
 * Samples the sculpted terrain elevation at `(x, z)` in `zone`.
 */
export function sampleTerrainHeight(
  cells: Record<string, TerrainCellData> | undefined,
  x: number,
  z: number
): number {
  if (!cells) return 0;
  const step = 2.0;
  const gx = Math.round(x / step);
  const gz = Math.round(z / step);
  const cell = cells[`${gx},${gz}`];
  return cell ? cell.h : 0;
}

function createInitialEnemies(): EnemyState[] {
  return INITIAL_ENEMIES.map((spawn) => ({
    id: spawn.id,
    kind: spawn.kind,
    zone: spawn.zone,
    x: spawn.x,
    z: spawn.z,
    spawnX: spawn.x,
    spawnZ: spawn.z,
    facing: Math.PI,
    hp: spawn.hp,
    maxHp: spawn.hp,
    weight: spawn.weight ?? getDefaultEnemyWeight(spawn.kind),
    state: "idle",
    stateTimer: 0,
    hitFlashTimer: 0,
    knockbackImmunityTimer: 0,
    stunTimer: 0,
    lastHitSwingId: -1,
    knockbackVx: 0,
    knockbackVz: 0,
    aggroRadius: spawn.aggroRadius,
    speed: spawn.speed,
    damage: spawn.damage,
    rupeeDrop: spawn.rupeeDrop,
    chargeAngle: Math.PI,
    chargePathLength: BOSS_MAX_LUNGE_RANGE,
    chargeDistanceTraveled: 0,
    actionCounter: 0,
    actionCooldown: 1.2,
  }));
}

function createInitialRupees(): RupeeItemState[] {
  return INITIAL_WORLD_RUPEES.map((r) => ({
    id: r.id,
    zone: r.zone,
    x: r.x,
    z: r.z,
    tier: r.tier,
    value: r.value,
    collected: false,
  }));
}

function createInitialState(
  phase: GamePhase = "title",
  muted = false,
  fps = 60
): SerializableGameState {
  return {
    phase,
    zone: "overworld",
    dungeonRoom: "entry",
    hero: {
      x: HERO_SPAWN.x,
      z: HERO_SPAWN.z,
      facing: HERO_SPAWN.facing,
      hp: 10,
      maxHp: 10,
      mp: 100,
      maxMp: 100,
      damageFractionAcc: 0,
      rupees: 0,
      hasDungeonKey: false,
      hasBoomerang: false,
      hasBow: false,
      hasFireRod: true,
      hasShovel: true,
      arrows: 0,
      equippedPrimary: "traveler_blade",
      equippedOffhand: "wooden_buckler",
      equippedTunic: "green_tunic",
      equippedBoots: "leather_boots",
      unlockedPrimaries: ["traveler_blade", "tempered_blade"],
      unlockedOffhands: ["wooden_buckler", "mirror_shield"],
      unlockedTunics: ["green_tunic", "blue_mail", "red_mail"],
      unlockedBoots: ["leather_boots", "swift_boots", "titan_greaves"],
      bottles: ["red_potion", "fairy", "bee", "empty"],
      shieldBlock: 1,
      swordDamage: 1,
      isAttacking: false,
      isSpinAttacking: false,
      isBlocking: false,
      shieldAbsorbToggle: false,
      attackTimer: 0,
      spinAttackTimer: 0,
      swordChargeTimer: 0,
      fireRodChargeTimer: 0,
      fireRodCooldown: 0,
      digAnimTimer: 0,
      attackCooldown: 0,
      boomerangCooldown: 0,
      bowCooldown: 0,
      bowAnimTimer: 0,
      throwAnimTimer: 0,
      weaponLockTimer: 0,
      portalCooldown: 0,
      swingId: 0,
      invulnerableTimer: 0,
      hurtFlashTimer: 0,
      knockbackLockTimer: 0,
      knockbackVx: 0,
      knockbackVz: 0,
      walkCycle: 0,
    },
    enemies: createInitialEnemies(),
    boomerang: null,
    arrows: [],
    fireballs: [],
    fireZones: [],
    friendlyBees: [],
    projectiles: [],
    hazards: [],
    rupees: createInitialRupees(),
    cutBushIds: [],
    lootedBushIds: [],
    bushRupeesEarned: 0,
    bushBursts: [],
    mapProps: buildInitialMapProps(),
    portals: INITIAL_PORTALS.map((p) => ({ ...p })),
    customModels: createBuiltInCustomModels(),
    terrainCells: {
      overworld: {},
      dungeon: {},
      frontier: {},
    },
    terrainRevision: 1,
    flags: {
      keyPickedUp: false,
      gateUnlocked: false,
      bossAwakened: false,
      bossPhase2: false,
      bossDefeated: false,
      chestUnlocked: false,
      overworldTorchPuzzleSolved: false,
      dungeonTorchPuzzleSolved: false,
    },
    stats: {
      enemiesDefeated: 0,
      damageTaken: 0,
      elapsedSeconds: 0,
    },
    banner:
      phase === "playing"
        ? {
            id: 1,
            text: "Whispering Vale",
            subtext:
              "Hold Attack for Spin Slash • Press R/3 for Flame Rod • Press G/4 to Dig • Press C for Character Gear!",
            timer: 5.8,
          }
        : null,
    nearShop: false,
    shopOpen: false,
    characterOpen: false,
    shopDismissedOnRug: false,
    gateNoticeCooldown: 0,
    chestNoticeCooldown: 0,
    armorNoticeCooldown: 0,
    muted,
    fps,
    editorMode: false,
    editorTool: "select",
    editorSelected: null,
    editorPlaceCategory: "props",
    editorPlacePrefab: "pine_tree",
    terrainBrushMode: "raise",
    terrainBrushRadius: 5.5,
    terrainBrushStrength: 1.0,
    terrainPaintColor: "#bfa675",
  };
}

const MAP_STORAGE_KEY = "zeldo-authored-map-v2";

function persistAuthoredMapToStorage(state: {
  mapProps: MapPropInstance[];
  enemies: EnemyState[];
  rupees: RupeeItemState[];
  portals: MapPortal[];
  customModels: CustomModelAsset[];
  terrainCells: Record<ZoneId, Record<string, TerrainCellData>>;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cleanEnemies = state.enemies
      .filter((e) => !e.id.startsWith("dg-minion-wave2-"))
      .map((e) => ({
        ...e,
        x: e.spawnX,
        z: e.spawnZ,
        hp: e.maxHp,
        state: "idle" as EnemyAIState,
        stateTimer: 0,
        hitFlashTimer: 0,
        knockbackImmunityTimer: 0,
        stunTimer: 0,
        knockbackVx: 0,
        knockbackVz: 0,
        provoked: false,
        actionCounter: 0,
        actionCooldown: 1.0,
      }));
    const cleanRupees = state.rupees
      .filter((r) => !r.id.startsWith("drop-") && !r.id.startsWith("bush-drop-"))
      .map((r) => ({ ...r, collected: false, spawnBounceTimer: 0 }));

    const payload = {
      version: 2,
      mapProps: state.mapProps,
      enemies: cleanEnemies,
      rupees: cleanRupees,
      portals: state.portals,
      customModels: state.customModels,
      terrainCells: {
        overworld: state.terrainCells.overworld ?? {},
        dungeon: state.terrainCells.dungeon ?? {},
        frontier: state.terrainCells.frontier ?? {},
      },
    };
    window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function normalizeAngleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

const DEFAULT_PROP_META: Record<
  PropPrefabId,
  {
    label: string;
    hasCollider: boolean;
    w: number;
    d: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    kind: "cliff" | "wall" | "water" | "tree" | "pillar" | "ruin";
  }
> = {
  pine_tree: { label: "Pine Tree", hasCollider: true, w: 2.1, d: 2.1, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "tree" },
  bush: { label: "Meadow Bush", hasCollider: false, w: 1.4, d: 1.4, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "tree" },
  flower_patch: { label: "Wildflower Patch", hasCollider: false, w: 1.2, d: 1.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "tree" },
  dirt_patch: { label: "Soft Dirt Patch", hasCollider: false, w: 1.5, d: 1.5, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  boulder: { label: "Mossy Boulder", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  ruin_pillar: { label: "Watchtower Pillar", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  dungeon_pillar: { label: "Sanctum Pillar", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  wall_torch: { label: "Flame Brazier", hasCollider: false, w: 0.9, d: 0.9, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  wooden_crate: { label: "Supply Crate", hasCollider: true, w: 1.4, d: 1.4, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "wall" },
  stone_wall: { label: "Stone Wall Block", hasCollider: true, w: 4.0, d: 2.0, scaleX: 4.0, scaleY: 3.6, scaleZ: 2.0, kind: "wall" },
  cliff_block: { label: "Cliff Ridge Block", hasCollider: true, w: 6.0, d: 3.0, scaleX: 6.0, scaleY: 4.5, scaleZ: 3.0, kind: "cliff" },
  water_tile: { label: "Water Stream Tile", hasCollider: true, w: 6.0, d: 4.0, scaleX: 6.0, scaleY: 1.0, scaleZ: 4.0, kind: "water" },
  path_tile: { label: "Cobblestone Path", hasCollider: false, w: 5.0, d: 5.0, scaleX: 5.0, scaleY: 1.0, scaleZ: 5.0, kind: "ruin" },
  wooden_bridge: { label: "Wooden Bridge", hasCollider: false, w: 7.4, d: 5.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "wall" },
  temple_arch: { label: "Temple Archway", hasCollider: false, w: 10.0, d: 3.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  custom_model: { label: "Custom 3D Mesh", hasCollider: true, w: 2.2, d: 2.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState("title", false),

  startGame: () => {
    soundEngine.unlock();
    soundEngine.playKeyPickup();
    set((state) => ({
      ...createInitialState("playing", state.muted, state.fps),
      // Preserve all authored map edits (props, enemies, rupees, portals, custom models, terrain)!
      mapProps: state.mapProps.map((p) =>
        p.prefab === "dirt_patch"
          ? { ...p, dug: false }
          : p.puzzleTarget
          ? { ...p, lit: false }
          : p
      ),
      enemies: state.enemies
        .filter((e) => !e.id.startsWith("dg-minion-wave2-"))
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          state: "idle",
          stateTimer: 0,
          hitFlashTimer: 0,
          knockbackImmunityTimer: 0,
          stunTimer: 0,
          knockbackVx: 0,
          knockbackVz: 0,
          provoked: false,
          actionCounter: 0,
          actionCooldown: 1.0,
        })),
      rupees: state.rupees
        .filter((r) => !r.id.startsWith("drop-") && !r.id.startsWith("bush-drop-"))
        .map((r) => ({ ...r, collected: false, spawnBounceTimer: 0 })),
      portals: state.portals,
      customModels: state.customModels,
      terrainCells: state.terrainCells,
      terrainRevision: state.terrainRevision + 1,
    }));
  },

  restartGame: () => {
    soundEngine.unlock();
    soundEngine.playKeyPickup();
    set((state) => ({
      ...createInitialState("playing", state.muted, state.fps),
      mapProps: state.mapProps.map((p) =>
        p.prefab === "dirt_patch"
          ? { ...p, dug: false }
          : p.puzzleTarget
          ? { ...p, lit: false }
          : p
      ),
      enemies: state.enemies
        .filter((e) => !e.id.startsWith("dg-minion-wave2-"))
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          state: "idle",
          stateTimer: 0,
          hitFlashTimer: 0,
          knockbackImmunityTimer: 0,
          stunTimer: 0,
          knockbackVx: 0,
          knockbackVz: 0,
          provoked: false,
          actionCounter: 0,
          actionCooldown: 1.0,
        })),
      rupees: state.rupees
        .filter((r) => !r.id.startsWith("drop-") && !r.id.startsWith("bush-drop-"))
        .map((r) => ({ ...r, collected: false, spawnBounceTimer: 0 })),
      portals: state.portals,
      customModels: state.customModels,
      terrainCells: state.terrainCells,
      terrainRevision: state.terrainRevision + 1,
    }));
  },

  toggleMute: () => {
    const nextMuted = !get().muted;
    soundEngine.setMuted(nextMuted);
    set({ muted: nextMuted });
  },

  setFps: (fps: number) => {
    if (get().fps !== fps) {
      set({ fps });
    }
  },

  setShopOpen: (open: boolean) => {
    set((state) => ({
      shopOpen: open,
      characterOpen: open ? false : state.characterOpen,
      shopDismissedOnRug: !open && state.nearShop,
    }));
  },

  setCharacterOpen: (open: boolean) => {
    set((state) => ({
      characterOpen: open,
      shopOpen: open ? false : state.shopOpen,
    }));
  },

  equipHeroItem: (slot, itemId) => {
    set((state) => {
      const hero = { ...state.hero };
      let label = "";
      let desc = "";

      if (slot === "primary") {
        const pId = itemId as PrimaryHandId;
        hero.equippedPrimary = pId;
        hero.swordDamage = pId === "tempered_blade" ? 2 : 1;
        label = pId === "tempered_blade" ? "Equipped Tempered Sun-Blade" : "Equipped Traveler's Sword";
        desc =
          pId === "tempered_blade"
            ? "2 Base Damage • Charged Spin Attack deals 4 Damage!"
            : "1 Base Damage • Charged Spin Attack deals 2 Damage!";
      } else if (slot === "offhand") {
        const oId = itemId as OffhandId;
        hero.equippedOffhand = oId;
        hero.shieldBlock = oId === "mirror_shield" ? 2 : 1;
        label = oId === "mirror_shield" ? "Equipped Aegis Mirror Shield" : "Equipped Wooden Buckler";
        desc =
          oId === "mirror_shield"
            ? "Blocks 2 Physical & Magical Damage when raised!"
            : "Blocks 1 Physical Damage when raised!";
      } else if (slot === "tunic") {
        const tId = itemId as TunicId;
        hero.equippedTunic = tId;
        if (tId === "red_mail") {
          label = "Equipped Crimson Dragon Mail";
          desc = "Reduces ALL incoming physical & magical damage by 75%!";
        } else if (tId === "blue_mail") {
          label = "Equipped Sapphire Mail";
          desc = "Reduces ALL incoming physical & magical damage by 50%!";
        } else {
          label = "Equipped Forest Green Tunic";
          desc = "Standard traveler's tunic (0% damage reduction — baseline damage).";
        }
      } else if (slot === "boots") {
        const bId = itemId as BootsId;
        hero.equippedBoots = bId;
        if (bId === "swift_boots") {
          label = "Equipped Swiftwind Boots";
          desc = "Increases movement & sprinting speed by +25%!";
        } else if (bId === "titan_greaves") {
          label = "Equipped Titan Iron Greaves";
          desc = "+12% Movement Speed & reduces Shield Block knockback by 50%!";
        } else {
          label = "Equipped Traveler's Leather Boots";
          desc = "Standard baseline movement speed (1.0x).";
        }
      }

      soundEngine.playShopPurchase();
      return {
        hero,
        banner: {
          id: Date.now() + Math.floor(Math.random() * 1000),
          text: label,
          subtext: desc,
          timer: 3.4,
        },
      };
    });
  },

  useBottleSlot: (index: number) => {
    const state = get();
    const hero = { ...state.hero, bottles: [...state.hero.bottles] };
    const friendlyBees = [...state.friendlyBees];
    const content = hero.bottles[index];
    if (!content || content === "empty") {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now(),
          text: `Bottle #${index + 1} is Empty!`,
          subtext: "Fill it with a Red/Green/Blue Potion, Fairy, or Golden Bee in the Character Sheet or Shop.",
          timer: 3.2,
        },
      });
      return;
    }

    let text = "";
    let subtext = "";

    if (content === "red_potion") {
      hero.hp = hero.maxHp;
      hero.damageFractionAcc = 0;
      hero.bottles[index] = "empty";
      soundEngine.playPotionDrink();
      text = "Drank Red Potion!";
      subtext = "All Life Hearts completely restored! The bottle is now empty.";
    } else if (content === "green_potion") {
      hero.mp = hero.maxMp;
      hero.bottles[index] = "empty";
      soundEngine.playPotionDrink();
      text = "Drank Green Magic Potion!";
      subtext = "100% Magic Power (MP) restored for your Flame Rod! The bottle is now empty.";
    } else if (content === "blue_potion") {
      hero.hp = hero.maxHp;
      hero.mp = hero.maxMp;
      hero.damageFractionAcc = 0;
      hero.bottles[index] = "empty";
      soundEngine.playPotionDrink();
      text = "Drank Blue Elixir!";
      subtext = "All Life Hearts AND 100% Magic Power restored! The bottle is now empty.";
    } else if (content === "fairy") {
      hero.hp = Math.min(hero.maxHp, hero.hp + 14); // Heals up to 7 Full Hearts (14 half-hearts)!
      hero.damageFractionAcc = 0;
      hero.bottles[index] = "empty";
      soundEngine.playFairyRevive();
      text = "Released Bottled Fairy!";
      subtext = "Restored up to 7 Full Hearts! (Fairies also auto-revive you upon death!)";
    } else if (content === "bee") {
      hero.bottles[index] = "empty";
      soundEngine.playBeeBuzz();
      friendlyBees.push({
        id: `bee-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        zone: state.zone,
        x: hero.x + Math.sin(hero.facing) * 1.1,
        z: hero.z + Math.cos(hero.facing) * 1.1,
        facing: hero.facing,
        timer: 15.0,
        maxTimer: 15.0,
        stingCooldown: 0.1,
      });
      text = "Unleashed the Golden Attack Bee!";
      subtext = "The friendly bee will hunt down and sting nearby monsters for 15 seconds!";
    }

    set({
      hero,
      friendlyBees,
      banner: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text,
        subtext,
        timer: 3.8,
      },
    });
  },

  fillBottleSlot: (index: number, content: BottleContentId, rupeeCost = 0) => {
    const state = get();
    const hero = { ...state.hero, bottles: [...state.hero.bottles] };
    if (index < 0 || index >= hero.bottles.length) return;
    if (rupeeCost > 0 && hero.rupees < rupeeCost) {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now(),
          text: "Not Enough Rupees!",
          subtext: `Filling this bottle requires ${rupeeCost} Rupees.`,
          timer: 3.0,
        },
      });
      return;
    }
    hero.rupees = Math.max(0, hero.rupees - rupeeCost);
    hero.bottles[index] = content;
    soundEngine.playShopPurchase();

    const names: Record<BottleContentId, string> = {
      empty: "Emptied Bottle",
      red_potion: "Red Potion (Restores All Hearts)",
      green_potion: "Green Potion (Restores All Magic Power)",
      blue_potion: "Blue Potion (Restores All Hearts & Magic)",
      fairy: "Captured Fairy (Heals 7 Hearts or Auto-Revives on Death)",
      bee: "Captured Golden Bee (Unleash to Attack Enemies)",
    };

    set({
      hero,
      banner: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `Bottle #${index + 1}: ${names[content]}`,
        subtext: "Click 'Use' in the Character Sheet or press V / 5 to use your first filled bottle!",
        timer: 3.4,
      },
    });
  },

  addEmptyBottle: () => {
    set((state) => {
      if (state.hero.bottles.length >= 6) return {};
      const hero = {
        ...state.hero,
        bottles: [...state.hero.bottles, "empty" as BottleContentId],
      };
      soundEngine.playKeyPickup();
      return {
        hero,
        banner: {
          id: Date.now(),
          text: `Acquired Glass Bottle #${hero.bottles.length}!`,
          subtext: "You can store Potions, Fairies, or Golden Bees inside your bottles!",
          timer: 3.5,
        },
      };
    });
  },

  // =========================================================
  // UNITY-STYLE MAP EDITOR ACTIONS (WITH AUTOMATIC BROWSER STORAGE PERSISTENCE!)
  // =========================================================
  setEditorMode: (enabled: boolean) => {
    set((state) => {
      if (!enabled) {
        persistAuthoredMapToStorage(state);
      }
      return {
        editorMode: enabled,
        shopOpen: enabled ? false : state.shopOpen,
        characterOpen: enabled ? false : state.characterOpen,
        phase: state.phase === "title" && enabled ? "playing" : state.phase,
      };
    });
  },

  setEditorZone: (zone: ZoneId, teleportHero = false, targetX?: number, targetZ?: number) => {
    set((state) => {
      const hero = { ...state.hero };
      if (teleportHero) {
        hero.x = targetX ?? 0;
        hero.z = targetZ ?? (zone === "overworld" ? -28 : -30.5);
      }
      return {
        zone,
        hero,
        editorSelected: null,
        terrainRevision: state.terrainRevision + 1,
      };
    });
  },

  setEditorTool: (tool: EditorToolId) => {
    set({ editorTool: tool });
  },

  setEditorSelected: (sel: EditorSelection | null) => {
    set({ editorSelected: sel });
  },

  setEditorPlaceItem: (category: EditorPlaceCategory, prefab: string) => {
    set({
      editorPlaceCategory: category,
      editorPlacePrefab: prefab,
      editorTool: "place",
    });
  },

  setTerrainBrush: (patch) => {
    set((state) => ({
      terrainBrushMode: patch.mode ?? state.terrainBrushMode,
      terrainBrushRadius: patch.radius ?? state.terrainBrushRadius,
      terrainBrushStrength: patch.strength ?? state.terrainBrushStrength,
      terrainPaintColor: patch.color ?? state.terrainPaintColor,
    }));
  },

  applyTerrainStroke: (worldX: number, worldZ: number, dt: number) => {
    const state = get();
    const zone = state.zone;
    const radius = state.terrainBrushRadius;
    const strength = state.terrainBrushStrength;
    const mode = state.terrainBrushMode;
    const paintColor = state.terrainPaintColor;

    const step = 2.0;
    const minGx = Math.ceil((worldX - radius) / step);
    const maxGx = Math.floor((worldX + radius) / step);
    const minGz = Math.ceil((worldZ - radius) / step);
    const maxGz = Math.floor((worldZ + radius) / step);

    const nextZoneCells: Record<string, TerrainCellData> = {
      ...state.terrainCells[zone],
    };
    let changed = false;

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        const vx = gx * step;
        const vz = gz * step;
        const dist = Math.hypot(vx - worldX, vz - worldZ);
        if (dist > radius) continue;

        const falloff = 0.5 * (1 + Math.cos((dist / radius) * Math.PI));
        const key = `${gx},${gz}`;
        const prev = nextZoneCells[key] ?? { h: 0 };
        let nextH = prev.h;
        let nextC = prev.c;

        if (mode === "raise") {
          nextH = Math.min(8.0, prev.h + falloff * strength * dt * 4.5);
        } else if (mode === "lower") {
          nextH = Math.max(-4.5, prev.h - falloff * strength * dt * 4.5);
        } else if (mode === "flatten") {
          nextH = prev.h * Math.max(0, 1 - falloff * strength * dt * 6.0);
          if (Math.abs(nextH) < 0.02) nextH = 0;
        } else if (mode === "paint") {
          if (falloff > 0.25) {
            nextC = paintColor;
          }
        }

        if (nextH !== prev.h || nextC !== prev.c) {
          changed = true;
          if (nextH === 0 && !nextC) {
            delete nextZoneCells[key];
          } else {
            nextZoneCells[key] = { h: Number(nextH.toFixed(3)), c: nextC };
          }
        }
      }
    }

    if (changed) {
      const nextTerrainCells = {
        ...state.terrainCells,
        [zone]: nextZoneCells,
      };
      set({
        terrainCells: nextTerrainCells,
        terrainRevision: state.terrainRevision + 1,
      });
      persistAuthoredMapToStorage({ ...state, terrainCells: nextTerrainCells });
    }
  },

  placeEntityAt: (worldX: number, worldZ: number) => {
    const state = get();
    const zone = state.zone;
    const x = Number(worldX.toFixed(2));
    const z = Number(worldZ.toFixed(2));
    const prefabKey = state.editorPlacePrefab;
    const uid = `${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;

    if (prefabKey.startsWith("enemy:")) {
      const kind = prefabKey.replace("enemy:", "") as EnemyKind;
      const defaultHp =
        kind === "boss"
          ? 25
          : kind === "knight"
          ? 8
          : kind === "minion"
          ? 5
          : kind === "goblin"
          ? 4
          : 3;
      const defaultWeight = getDefaultEnemyWeight(kind);
      const newEnemy: EnemyState = {
        id: `ed-enemy-${kind}-${uid}`,
        kind,
        zone,
        x,
        z,
        spawnX: x,
        spawnZ: z,
        facing: Math.PI,
        hp: defaultHp,
        maxHp: defaultHp,
        weight: defaultWeight,
        state: "idle",
        stateTimer: 0,
        hitFlashTimer: 0,
        knockbackImmunityTimer: 0,
        stunTimer: 0,
        lastHitSwingId: -1,
        knockbackVx: 0,
        knockbackVz: 0,
        aggroRadius: kind === "archer" ? 11.5 : 8.5,
        speed: kind === "boss" ? 3.9 : kind === "goblin" || kind === "minion" ? 5.5 : 5.0,
        damage: 1,
        rupeeDrop: kind === "boss" ? "boss" : kind === "knight" ? "red" : "blue",
        chargeAngle: Math.PI,
        chargePathLength: BOSS_MAX_LUNGE_RANGE,
        chargeDistanceTraveled: 0,
        actionCounter: 0,
        actionCooldown: 1.0,
      };
      const nextEnemies = [...state.enemies, newEnemy];
      set({
        enemies: nextEnemies,
        editorSelected: { kind: "enemy", id: newEnemy.id },
      });
      persistAuthoredMapToStorage({ ...state, enemies: nextEnemies });
      return;
    }

    if (prefabKey.startsWith("rupee:")) {
      const tier = prefabKey.replace("rupee:", "") as RupeeTier;
      const value = tier === "heart" ? 2 : tier === "red" ? 20 : tier === "blue" ? 5 : 1;
      const newRupee: RupeeItemState = {
        id: `ed-rupee-${tier}-${uid}`,
        zone,
        x,
        z,
        tier,
        value,
        collected: false,
      };
      const nextRupees = [...state.rupees, newRupee];
      set({
        rupees: nextRupees,
        editorSelected: { kind: "rupee", id: newRupee.id },
      });
      persistAuthoredMapToStorage({ ...state, rupees: nextRupees });
      return;
    }

    if (prefabKey.startsWith("portal:")) {
      const targetZone: ZoneId =
        zone === "overworld" ? "dungeon" : zone === "dungeon" ? "frontier" : "overworld";
      const newPortal: MapPortal = {
        id: `ed-portal-${uid}`,
        zone,
        x,
        z,
        radius: 2.0,
        targetZone,
        targetX: 0,
        targetZ: -30.5,
        targetFacing: 0,
        label:
          targetZone === "dungeon"
            ? "Enter Sunken Sanctum"
            : targetZone === "frontier"
            ? "Enter Elderwood Frontier"
            : "Return to Whispering Vale",
        sublabel: "Linked Portal Transition",
        color: targetZone === "frontier" ? "emerald" : "purple",
      };
      const nextPortals = [...state.portals, newPortal];
      set({
        portals: nextPortals,
        editorSelected: { kind: "portal", id: newPortal.id },
      });
      persistAuthoredMapToStorage({ ...state, portals: nextPortals });
      return;
    }

    if (prefabKey.startsWith("custom:")) {
      const customId = prefabKey.replace("custom:", "");
      const model = state.customModels.find((m) => m.id === customId);
      const newProp: MapPropInstance = {
        id: `ed-custom-${uid}`,
        prefab: "custom_model",
        name: model ? model.name : "Custom 3D Object",
        zone,
        x,
        y: 0,
        z,
        rotY: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        hasCollider: true,
        colliderWidth: 2.2,
        colliderDepth: 2.2,
        colliderKind: "ruin",
        customModelId: customId,
        colorHex: model?.colorHex ?? "#4fd8ff",
      };
      const nextProps = [...state.mapProps, newProp];
      set({
        mapProps: nextProps,
        editorSelected: { kind: "prop", id: newProp.id },
      });
      persistAuthoredMapToStorage({ ...state, mapProps: nextProps });
      return;
    }

    // Standard 3D Prop Prefab
    const pId = prefabKey as PropPrefabId;
    const meta = DEFAULT_PROP_META[pId] ?? DEFAULT_PROP_META.pine_tree;
    const newProp: MapPropInstance = {
      id: `ed-prop-${pId}-${uid}`,
      prefab: pId,
      name: meta.label,
      zone,
      x,
      y: 0,
      z,
      rotY: 0,
      scaleX: meta.scaleX,
      scaleY: meta.scaleY,
      scaleZ: meta.scaleZ,
      hasCollider: meta.hasCollider,
      colliderWidth: meta.w,
      colliderDepth: meta.d,
      colliderKind: meta.kind,
    };
    const nextProps = [...state.mapProps, newProp];
    set({
      mapProps: nextProps,
      editorSelected: { kind: "prop", id: newProp.id },
    });
    persistAuthoredMapToStorage({ ...state, mapProps: nextProps });
  },

  moveSelectedEntityTo: (worldX: number, worldZ: number) => {
    const state = get();
    const sel = state.editorSelected;
    if (!sel) return;
    const x = Number(worldX.toFixed(2));
    const z = Number(worldZ.toFixed(2));

    if (sel.kind === "prop") {
      const nextProps = state.mapProps.map((p) => (p.id === sel.id ? { ...p, x, z } : p));
      set({ mapProps: nextProps });
      persistAuthoredMapToStorage({ ...state, mapProps: nextProps });
    } else if (sel.kind === "enemy") {
      const nextEnemies = state.enemies.map((e) =>
        e.id === sel.id ? { ...e, x, z, spawnX: x, spawnZ: z } : e
      );
      set({ enemies: nextEnemies });
      persistAuthoredMapToStorage({ ...state, enemies: nextEnemies });
    } else if (sel.kind === "rupee") {
      const nextRupees = state.rupees.map((r) => (r.id === sel.id ? { ...r, x, z } : r));
      set({ rupees: nextRupees });
      persistAuthoredMapToStorage({ ...state, rupees: nextRupees });
    } else if (sel.kind === "portal") {
      const nextPortals = state.portals.map((pt) => (pt.id === sel.id ? { ...pt, x, z } : pt));
      set({ portals: nextPortals });
      persistAuthoredMapToStorage({ ...state, portals: nextPortals });
    }
  },

  updatePropInstance: (id: string, patch: Partial<MapPropInstance>) => {
    set((state) => {
      const nextProps = state.mapProps.map((p) => (p.id === id ? { ...p, ...patch } : p));
      persistAuthoredMapToStorage({ ...state, mapProps: nextProps });
      return { mapProps: nextProps };
    });
  },

  updateEnemyInstance: (id: string, patch: Partial<EnemyState>) => {
    set((state) => {
      const nextEnemies = state.enemies.map((e) =>
        e.id === id
          ? {
              ...e,
              ...patch,
              spawnX: patch.x !== undefined ? patch.x : e.spawnX,
              spawnZ: patch.z !== undefined ? patch.z : e.spawnZ,
            }
          : e
      );
      persistAuthoredMapToStorage({ ...state, enemies: nextEnemies });
      return { enemies: nextEnemies };
    });
  },

  updateRupeeInstance: (id: string, patch: Partial<RupeeItemState>) => {
    set((state) => {
      const nextRupees = state.rupees.map((r) => (r.id === id ? { ...r, ...patch } : r));
      persistAuthoredMapToStorage({ ...state, rupees: nextRupees });
      return { rupees: nextRupees };
    });
  },

  updatePortalInstance: (id: string, patch: Partial<MapPortal>) => {
    set((state) => {
      const nextPortals = state.portals.map((pt) => (pt.id === id ? { ...pt, ...patch } : pt));
      persistAuthoredMapToStorage({ ...state, portals: nextPortals });
      return { portals: nextPortals };
    });
  },

  duplicateSelectedEntity: () => {
    const state = get();
    const sel = state.editorSelected;
    if (!sel) return;
    const uid = `${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;

    if (sel.kind === "prop") {
      const orig = state.mapProps.find((p) => p.id === sel.id);
      if (!orig) return;
      const copy: MapPropInstance = {
        ...orig,
        id: `${orig.id}-copy-${uid}`,
        name: `${orig.name} (Copy)`,
        x: Number((orig.x + 2.0).toFixed(2)),
        z: Number((orig.z + 2.0).toFixed(2)),
      };
      const nextProps = [...state.mapProps, copy];
      set({
        mapProps: nextProps,
        editorSelected: { kind: "prop", id: copy.id },
      });
      persistAuthoredMapToStorage({ ...state, mapProps: nextProps });
    } else if (sel.kind === "enemy") {
      const orig = state.enemies.find((e) => e.id === sel.id);
      if (!orig) return;
      const copy: EnemyState = {
        ...orig,
        id: `${orig.id}-copy-${uid}`,
        x: Number((orig.x + 2.0).toFixed(2)),
        z: Number((orig.z + 2.0).toFixed(2)),
        spawnX: Number((orig.x + 2.0).toFixed(2)),
        spawnZ: Number((orig.z + 2.0).toFixed(2)),
      };
      const nextEnemies = [...state.enemies, copy];
      set({
        enemies: nextEnemies,
        editorSelected: { kind: "enemy", id: copy.id },
      });
      persistAuthoredMapToStorage({ ...state, enemies: nextEnemies });
    } else if (sel.kind === "rupee") {
      const orig = state.rupees.find((r) => r.id === sel.id);
      if (!orig) return;
      const copy: RupeeItemState = {
        ...orig,
        id: `${orig.id}-copy-${uid}`,
        x: Number((orig.x + 1.5).toFixed(2)),
        z: Number((orig.z + 1.5).toFixed(2)),
      };
      const nextRupees = [...state.rupees, copy];
      set({
        rupees: nextRupees,
        editorSelected: { kind: "rupee", id: copy.id },
      });
      persistAuthoredMapToStorage({ ...state, rupees: nextRupees });
    } else if (sel.kind === "portal") {
      const orig = state.portals.find((p) => p.id === sel.id);
      if (!orig) return;
      const copy: MapPortal = {
        ...orig,
        id: `${orig.id}-copy-${uid}`,
        x: Number((orig.x + 2.5).toFixed(2)),
        z: Number((orig.z + 2.5).toFixed(2)),
      };
      const nextPortals = [...state.portals, copy];
      set({
        portals: nextPortals,
        editorSelected: { kind: "portal", id: copy.id },
      });
      persistAuthoredMapToStorage({ ...state, portals: nextPortals });
    }
  },

  deleteEntity: (kind: EditorEntityKind, id: string) => {
    set((state) => {
      const clearSel =
        state.editorSelected?.kind === kind && state.editorSelected?.id === id
          ? null
          : state.editorSelected;
      if (kind === "prop") {
        const nextProps = state.mapProps.filter((p) => p.id !== id);
        persistAuthoredMapToStorage({ ...state, mapProps: nextProps });
        return {
          mapProps: nextProps,
          editorSelected: clearSel,
        };
      }
      if (kind === "enemy") {
        const nextEnemies = state.enemies.filter((e) => e.id !== id);
        persistAuthoredMapToStorage({ ...state, enemies: nextEnemies });
        return {
          enemies: nextEnemies,
          editorSelected: clearSel,
        };
      }
      if (kind === "rupee") {
        const nextRupees = state.rupees.filter((r) => r.id !== id);
        persistAuthoredMapToStorage({ ...state, rupees: nextRupees });
        return {
          rupees: nextRupees,
          editorSelected: clearSel,
        };
      }
      const nextPortals = state.portals.filter((pt) => pt.id !== id);
      persistAuthoredMapToStorage({ ...state, portals: nextPortals });
      return {
        portals: nextPortals,
        editorSelected: clearSel,
      };
    });
  },

  deleteSelectedEntity: () => {
    const sel = get().editorSelected;
    if (!sel) return;
    get().deleteEntity(sel.kind, sel.id);
  },

  importCustomObjModel: (name: string, objText: string, colorHex = "#4fd8ff") => {
    const parsed = parseWavefrontObj(name, objText, colorHex);
    if (!parsed) return false;
    set((state) => {
      const nextCustomModels = [...state.customModels, parsed];
      persistAuthoredMapToStorage({ ...state, customModels: nextCustomModels });
      return {
        customModels: nextCustomModels,
        editorPlaceCategory: "custom",
        editorPlacePrefab: `custom:${parsed.id}`,
        editorTool: "place",
      };
    });
    return true;
  },

  resetPlaySimulation: () => {
    set((state) => ({
      phase: "playing",
      mapProps: state.mapProps.map((p) =>
        p.prefab === "dirt_patch"
          ? { ...p, dug: false }
          : p.puzzleTarget
          ? { ...p, lit: false }
          : p
      ),
      enemies: state.enemies
        .filter((e) => !e.id.startsWith("dg-minion-wave2-"))
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          state: "idle",
          stateTimer: 0,
          hitFlashTimer: 0,
          knockbackImmunityTimer: 0,
          stunTimer: 0,
          knockbackVx: 0,
          knockbackVz: 0,
          provoked: false,
          actionCounter: 0,
          actionCooldown: 1.0,
        })),
      rupees: state.rupees
        .filter((r) => !r.id.startsWith("drop-") && !r.id.startsWith("bush-drop-"))
        .map((r) => ({ ...r, collected: false, spawnBounceTimer: 0 })),
      cutBushIds: [],
      lootedBushIds: [],
      bushRupeesEarned: 0,
      bushBursts: [],
      arrows: [],
      fireballs: [],
      fireZones: [],
      friendlyBees: [],
      projectiles: [],
      hazards: [],
      boomerang: null,
      flags: {
        ...state.flags,
        bossAwakened: false,
        bossPhase2: false,
        bossDefeated: false,
        chestUnlocked: false,
        overworldTorchPuzzleSolved: false,
        dungeonTorchPuzzleSolved: false,
      },
      hero: {
        ...state.hero,
        hp: state.hero.maxHp,
        mp: state.hero.maxMp,
        damageFractionAcc: 0,
        attackTimer: 0,
        spinAttackTimer: 0,
        swordChargeTimer: 0,
        fireRodChargeTimer: 0,
        fireRodCooldown: 0,
        digAnimTimer: 0,
        attackCooldown: 0,
        boomerangCooldown: 0,
        bowCooldown: 0,
        bowAnimTimer: 0,
        throwAnimTimer: 0,
        weaponLockTimer: 0,
        invulnerableTimer: 0,
        hurtFlashTimer: 0,
        knockbackLockTimer: 0,
        knockbackVx: 0,
        knockbackVz: 0,
      },
    }));
  },

  exportMapJson: () => {
    const state = get();
    const payload = {
      version: 2,
      mapProps: state.mapProps,
      enemies: state.enemies.filter((e) => !e.id.startsWith("dg-minion-wave2-")),
      rupees: state.rupees.filter(
        (r) => !r.id.startsWith("drop-") && !r.id.startsWith("bush-drop-")
      ),
      portals: state.portals,
      customModels: state.customModels,
      terrainCells: state.terrainCells,
    };
    return JSON.stringify(payload, null, 2);
  },

  importMapJson: (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText);
      if (!data || !Array.isArray(data.mapProps)) return false;
      set((state) => {
        const nextTerrain = {
          overworld: data.terrainCells?.overworld ?? state.terrainCells.overworld ?? {},
          dungeon: data.terrainCells?.dungeon ?? state.terrainCells.dungeon ?? {},
          frontier: data.terrainCells?.frontier ?? state.terrainCells.frontier ?? {},
        };
        const nextState = {
          mapProps: data.mapProps,
          enemies: Array.isArray(data.enemies) ? data.enemies : state.enemies,
          rupees: Array.isArray(data.rupees) ? data.rupees : state.rupees,
          portals: Array.isArray(data.portals) ? data.portals : state.portals,
          customModels: Array.isArray(data.customModels)
            ? data.customModels
            : state.customModels,
          terrainCells: nextTerrain,
          terrainRevision: state.terrainRevision + 1,
          editorSelected: null,
        };
        persistAuthoredMapToStorage(nextState);
        return nextState;
      });
      return true;
    } catch {
      return false;
    }
  },

  saveMapToBrowserStorage: () => {
    return persistAuthoredMapToStorage(get());
  },

  hydrateSavedMapFromStorage: () => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(MAP_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.mapProps)) return false;
      set((state) => ({
        mapProps: data.mapProps,
        enemies: Array.isArray(data.enemies) ? data.enemies : state.enemies,
        rupees: Array.isArray(data.rupees) ? data.rupees : state.rupees,
        portals: Array.isArray(data.portals) ? data.portals : state.portals,
        customModels: Array.isArray(data.customModels)
          ? data.customModels
          : state.customModels,
        terrainCells: {
          overworld: data.terrainCells?.overworld ?? {},
          dungeon: data.terrainCells?.dungeon ?? {},
          frontier: data.terrainCells?.frontier ?? {},
        },
        terrainRevision: state.terrainRevision + 1,
      }));
      return true;
    } catch {
      return false;
    }
  },

  resetMapToDefaults: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(MAP_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    set((state) => ({
      mapProps: buildInitialMapProps(),
      enemies: createInitialEnemies(),
      rupees: createInitialRupees(),
      portals: INITIAL_PORTALS.map((p) => ({ ...p })),
      customModels: createBuiltInCustomModels(),
      terrainCells: {
        overworld: {},
        dungeon: {},
        frontier: {},
      },
      terrainRevision: state.terrainRevision + 1,
      editorSelected: null,
    }));
  },

  // =========================================================
  // MERCHANT SHOP PURCHASE ACTION
  // =========================================================
  buyShopItem: (item: ShopItemId) => {
    const state = get();
    const hero = { ...state.hero, bottles: [...state.hero.bottles] };

    const pushNotice = (text: string, subtext: string) => {
      set({
        hero,
        banner: {
          id: Date.now() + Math.floor(Math.random() * 1000),
          text,
          subtext,
          timer: 4.2,
        },
      });
    };

    if (item === "boomerang") {
      if (hero.hasBoomerang) return;
      if (hero.rupees < 15) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "The Gale Boomerang costs 15 Rupees.");
        return;
      }
      hero.rupees -= 15;
      hero.hasBoomerang = true;
      soundEngine.playShopPurchase();
      pushNotice(
        "Purchased the Gale Boomerang!",
        "Press Q or 1 to hurl a returning boomerang that damages & stuns foes!"
      );
    } else if (item === "bow") {
      if (hero.hasBow) return;
      if (hero.rupees < 20) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "The Ranger's Bow costs 20 Rupees.");
        return;
      }
      hero.rupees -= 20;
      hero.hasBow = true;
      soundEngine.playShopPurchase();
      pushNotice(
        "Purchased the Ranger's Bow!",
        "Buy Arrow Bundles separately, then press E or 2 to fire ranged arrows!"
      );
    } else if (item === "arrows") {
      if (hero.rupees < 10) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "A Bundle of 10 Arrows costs 10 Rupees.");
        return;
      }
      hero.rupees -= 10;
      hero.arrows = Math.min(99, hero.arrows + 10);
      soundEngine.playShopPurchase();
      pushNotice(
        `Purchased 10 Arrows! (Total: ${hero.arrows})`,
        hero.hasBow
          ? "Press E or 2 to shoot arrows with your bow!"
          : "Remember to purchase the Ranger's Bow to shoot these arrows!"
      );
    } else if (item === "heart") {
      if (hero.hp >= hero.maxHp) {
        soundEngine.playGateLocked();
        pushNotice("Full Health!", "Your life hearts are already full.");
        return;
      }
      if (hero.rupees < 10) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "A Heart Elixir costs 10 Rupees.");
        return;
      }
      hero.rupees -= 10;
      hero.hp = Math.min(hero.maxHp, hero.hp + 4);
      soundEngine.playShopPurchase();
      pushNotice("Restored 2 Full Hearts!", "You feel invigorated for the battles ahead.");
    } else if (item === "bottle") {
      if (hero.bottles.length >= 6) {
        soundEngine.playGateLocked();
        pushNotice("Max Bottles Reached!", "Your belt already holds 6 Glass Bottles.");
        return;
      }
      if (hero.rupees < 20) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "An Empty Glass Bottle costs 20 Rupees.");
        return;
      }
      hero.rupees -= 20;
      hero.bottles.push("empty");
      soundEngine.playShopPurchase();
      pushNotice(
        `Purchased Glass Bottle #${hero.bottles.length}!`,
        "Fill it with Red/Green/Blue Potions, Fairies, or Golden Bees!"
      );
    } else if (
      item === "red_potion" ||
      item === "green_potion" ||
      item === "blue_potion"
    ) {
      const emptyIdx = hero.bottles.findIndex((b) => b === "empty");
      if (emptyIdx === -1) {
        soundEngine.playGateLocked();
        pushNotice(
          "No Empty Bottle Available!",
          "Use an existing bottle or acquire an Empty Glass Bottle first."
        );
        return;
      }
      const cost = item === "blue_potion" ? 25 : item === "red_potion" ? 15 : 12;
      if (hero.rupees < cost) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", `This potion costs ${cost} Rupees.`);
        return;
      }
      hero.rupees -= cost;
      hero.bottles[emptyIdx] = item;
      soundEngine.playShopPurchase();
      pushNotice(
        item === "blue_potion"
          ? "Bottled Blue Potion!"
          : item === "red_potion"
          ? "Bottled Red Potion!"
          : "Bottled Green Potion!",
        `Stored in Bottle #${emptyIdx + 1} — press V / 5 or open Character Sheet (C) to drink!`
      );
    }
  },

  // =========================================================
  // LIVE GAMEPLAY SIMULATION TICK (PAUSED WHEN editorMode IS TRUE)
  // =========================================================
  tick: (rawDt: number, input: FrameInput) => {
    const state = get();
    if (state.phase !== "playing" || state.editorMode) return;

    const dt = Math.min(rawDt, 0.05);
    let mapProps = state.mapProps;
    let mapPropsMutated = false;
    const ensureMutableMapProps = () => {
      if (!mapPropsMutated) {
        mapProps = state.mapProps.map((p) => ({ ...p }));
        mapPropsMutated = true;
      }
    };
    const dynamicObstacles = buildObstaclesFromMapProps(mapProps);

    const hero: HeroState = {
      ...state.hero,
      bottles: [...(state.hero.bottles ?? ["red_potion", "fairy", "bee", "empty"])],
    };
    const flags: GameFlags = { ...state.flags };
    const stats: GameStats = {
      ...state.stats,
      elapsedSeconds: state.stats.elapsedSeconds + dt,
    };
    let zone: ZoneId = state.zone;
    let dungeonRoom: DungeonRoomId = state.dungeonRoom;
    let phase: GamePhase = state.phase;
    let banner: BannerMessage | null = state.banner
      ? { ...state.banner, timer: state.banner.timer - dt }
      : null;
    if (banner && banner.timer <= 0) {
      banner = null;
    }

    const pushBanner = (text: string, subtext?: string, duration = 4.0) => {
      banner = {
        id: Math.floor(stats.elapsedSeconds * 1000) + Math.floor(Math.random() * 1000),
        text,
        subtext,
        timer: duration,
      };
    };

    // Passive Magic Power regeneration (2.5 MP/s)
    hero.maxMp = hero.maxMp || 100;
    hero.mp = Math.min(hero.maxMp, (hero.mp ?? 100) + dt * 2.5);

    // Tunic damage multiplier:
    // - Forest Green Tunic (default): 1.0x (0% physical/magical reduction)
    // - Sapphire Mail (blue_mail): 0.5x (50% physical & magical damage reduction!)
    // - Crimson Dragon Mail (red_mail): 0.25x (75% physical & magical damage reduction!)
    const getTunicDamageMultiplier = (): number => {
      if (hero.equippedTunic === "red_mail") return 0.25;
      if (hero.equippedTunic === "blue_mail") return 0.5;
      return 1.0;
    };

    // Helper: check if hero died and auto-revive with a Bottled Fairy if one is in a bottle!
    const checkHeroDeathOrFairyRevive = () => {
      if (hero.hp > 0) return;
      const fairyIdx = hero.bottles.findIndex((b) => b === "fairy");
      if (fairyIdx !== -1) {
        hero.bottles[fairyIdx] = "empty";
        hero.hp = Math.min(hero.maxHp, 14); // Revives with up to 7 Full Hearts (14 half-hearts)!
        hero.damageFractionAcc = 0;
        hero.invulnerableTimer = 1.6;
        soundEngine.playFairyRevive();
        pushBanner(
          "Bottled Fairy Revived You! (+7 Hearts)",
          `Your Fairy burst from Bottle #${fairyIdx + 1} and restored your life!`,
          4.5
        );
      } else {
        phase = "gameover";
        soundEngine.playGameOver();
      }
    };

    // Shield only blocks when the player is actively holding it up AND facing the incoming attack (~75° half-angle frontal cone)
    const SHIELD_BLOCK_HALF_ANGLE = Math.PI * 0.42;
    const isFacingAttack = (attackFromAngle: number): boolean => {
      return (
        Math.abs(normalizeAngleDiff(hero.facing, attackFromAngle)) <=
        SHIELD_BLOCK_HALF_ANGLE
      );
    };

    const damageHero = (
      rawAmount: number,
      pushX: number,
      pushZ: number,
      isGroundHazard = false,
      isBossLunge = false,
      attackFromAngle?: number,
      attackerWeight = 1.0,
      isMagical = false
    ): { triggered: boolean; blocked: boolean } => {
      if (hero.invulnerableTimer > 0 || phase !== "playing") {
        return { triggered: false, blocked: false };
      }

      const shieldPower = Math.max(1, hero.shieldBlock ?? 1);
      let finalDamage = rawAmount;
      const kbScale = hero.equippedBoots === "titan_greaves" ? 0.5 : 1.0;
      let blocked = false;

      const incomingAngle =
        attackFromAngle !== undefined
          ? attackFromAngle
          : Math.hypot(pushX, pushZ) > 0.001
            ? Math.atan2(-pushX, -pushZ)
            : hero.facing;
      const canBlock =
        hero.isBlocking &&
        !isGroundHazard &&
        (!isMagical || hero.equippedOffhand === "mirror_shield") &&
        isFacingAttack(incomingAngle);

      if (canBlock) {
        blocked = true;
        soundEngine.playShieldBlock();

        if (isBossLunge) {
          finalDamage = Math.max(0, rawAmount - Math.max(shieldPower, rawAmount));
          soundEngine.playBossWallCrash();
          hero.knockbackLockTimer = 0.65;
          hero.invulnerableTimer = 0.95;
          hero.knockbackVx = pushX * kbScale;
          hero.knockbackVz = pushZ * kbScale;
          const pushMag = Math.hypot(pushX, pushZ);
          if (pushMag > 0.01) {
            hero.facing = Math.atan2(-pushX / pushMag, -pushZ / pushMag);
          }
          return { triggered: true, blocked: true };
        }

        finalDamage = Math.max(0, rawAmount - shieldPower);
        if (finalDamage > 0) {
          soundEngine.playHeroHurt();
        }

        const weightClamp = Math.max(0.4, Math.min(30, attackerWeight));
        const weightBlockImpulse =
          (attackerWeight >= 50
            ? 20.5
            : attackerWeight >= 8.0
            ? 17.2
            : 4.5 + Math.sqrt(weightClamp) * 3.8) * kbScale;
        const pushMag = Math.hypot(pushX, pushZ);
        const dirX = pushMag > 0.01 ? pushX / pushMag : -Math.sin(incomingAngle);
        const dirZ = pushMag > 0.01 ? pushZ / pushMag : -Math.cos(incomingAngle);

        const mitigated = finalDamage * getTunicDamageMultiplier();
        hero.damageFractionAcc = (hero.damageFractionAcc ?? 0) + mitigated;
        const hpLoss = Math.floor(hero.damageFractionAcc + 1e-6);
        hero.damageFractionAcc = Math.max(0, hero.damageFractionAcc - hpLoss);

        hero.hp = Math.max(0, hero.hp - hpLoss);
        hero.invulnerableTimer = finalDamage === 0 ? 0.42 : 0.9;
        if (finalDamage > 0) {
          hero.hurtFlashTimer = 0.9;
        }
        stats.damageTaken += mitigated;
        hero.knockbackVx = dirX * weightBlockImpulse;
        hero.knockbackVz = dirZ * weightBlockImpulse;
        if (attackerWeight >= 8.0) {
          hero.knockbackLockTimer = Math.max(hero.knockbackLockTimer, 0.16);
        }

        checkHeroDeathOrFairyRevive();
        return { triggered: true, blocked: true };
      } else {
        soundEngine.playHeroHurt();
      }

      const mitigated = finalDamage * getTunicDamageMultiplier();
      hero.damageFractionAcc = (hero.damageFractionAcc ?? 0) + mitigated;
      const hpLoss = Math.floor(hero.damageFractionAcc + 1e-6);
      hero.damageFractionAcc = Math.max(0, hero.damageFractionAcc - hpLoss);

      hero.hp = Math.max(0, hero.hp - hpLoss);
      hero.invulnerableTimer = 0.95;
      if (finalDamage > 0) {
        hero.hurtFlashTimer = 0.95;
      }
      stats.damageTaken += mitigated;
      hero.knockbackVx = pushX * kbScale;
      hero.knockbackVz = pushZ * kbScale;

      checkHeroDeathOrFairyRevive();
      return { triggered: true, blocked };
    };

    let gateNoticeCooldown = Math.max(0, state.gateNoticeCooldown - dt);
    let chestNoticeCooldown = Math.max(0, state.chestNoticeCooldown - dt);
    let armorNoticeCooldown = Math.max(0, state.armorNoticeCooldown - dt);

    // 1. Update Hero Timers, Charged Spin Attack, Shield Block, Boomerang, Bow, Flame Rod & Shovel
    hero.attackTimer = Math.max(0, hero.attackTimer - dt);
    hero.spinAttackTimer = Math.max(0, (hero.spinAttackTimer ?? 0) - dt);
    hero.attackCooldown = Math.max(0, hero.attackCooldown - dt);
    hero.boomerangCooldown = Math.max(0, (hero.boomerangCooldown ?? 0) - dt);
    hero.bowCooldown = Math.max(0, hero.bowCooldown - dt);
    hero.fireRodCooldown = Math.max(0, (hero.fireRodCooldown ?? 0) - dt);
    hero.bowAnimTimer = Math.max(0, (hero.bowAnimTimer ?? 0) - dt);
    hero.throwAnimTimer = Math.max(0, (hero.throwAnimTimer ?? 0) - dt);
    hero.digAnimTimer = Math.max(0, (hero.digAnimTimer ?? 0) - dt);
    hero.weaponLockTimer = Math.max(0, (hero.weaponLockTimer ?? 0) - dt);
    hero.portalCooldown = Math.max(0, hero.portalCooldown - dt);
    hero.invulnerableTimer = Math.max(0, hero.invulnerableTimer - dt);
    hero.hurtFlashTimer = Math.max(0, (hero.hurtFlashTimer ?? 0) - dt);
    hero.knockbackLockTimer = Math.max(0, (hero.knockbackLockTimer ?? 0) - dt);
    hero.isSpinAttacking = hero.spinAttackTimer > 0;
    hero.isAttacking = hero.attackTimer > 0 || hero.spinAttackTimer > 0;

    let boomerang: BoomerangState | null = state.boomerang
      ? { ...state.boomerang, hitEnemyIds: [...state.boomerang.hitEnemyIds] }
      : null;
    let arrows: ArrowProjectileState[] = state.arrows.map((a) => ({ ...a }));
    let fireballs: FireballProjectileState[] = (state.fireballs ?? []).map((f) => ({ ...f }));
    let fireZones: FireZoneState[] = (state.fireZones ?? []).map((fz) => ({ ...fz }));
    let friendlyBees: FriendlyBeeState[] = (state.friendlyBees ?? []).map((b) => ({ ...b }));
    const rupees: RupeeItemState[] = state.rupees.map((r) => ({
      ...r,
      spawnBounceTimer: Math.max(0, (r.spawnBounceTimer ?? 0) - dt),
    }));
    const enemies: EnemyState[] = state.enemies.map((e) => ({ ...e }));

    // Track cut bushes, looted bushes, bush rupee cap, and active leaf/dirt bursts
    let cutBushIds = [...state.cutBushIds];
    const lootedBushIds = [...state.lootedBushIds];
    let bushRupeesEarned = state.bushRupeesEarned;
    const bushBursts: BushBurstState[] = state.bushBursts
      .map((b) => ({ ...b, timer: b.timer - dt }))
      .filter((b) => b.timer > 0);

    // Quick-Use Bottle Hotkey (V or 5): uses the first non-empty bottle!
    if (input.bottlePressed && !state.shopOpen && !state.characterOpen) {
      const firstFilledIdx = hero.bottles.findIndex((b) => b !== "empty");
      if (firstFilledIdx !== -1) {
        const content = hero.bottles[firstFilledIdx];
        if (content === "red_potion") {
          hero.hp = hero.maxHp;
          hero.damageFractionAcc = 0;
          hero.bottles[firstFilledIdx] = "empty";
          soundEngine.playPotionDrink();
          pushBanner("Drank Red Potion!", "All Life Hearts restored!", 3.2);
        } else if (content === "green_potion") {
          hero.mp = hero.maxMp;
          hero.bottles[firstFilledIdx] = "empty";
          soundEngine.playPotionDrink();
          pushBanner("Drank Green Potion!", "100% Magic Power restored!", 3.2);
        } else if (content === "blue_potion") {
          hero.hp = hero.maxHp;
          hero.mp = hero.maxMp;
          hero.damageFractionAcc = 0;
          hero.bottles[firstFilledIdx] = "empty";
          soundEngine.playPotionDrink();
          pushBanner("Drank Blue Elixir!", "All Hearts & Magic Power restored!", 3.2);
        } else if (content === "fairy") {
          hero.hp = Math.min(hero.maxHp, hero.hp + 14);
          hero.damageFractionAcc = 0;
          hero.bottles[firstFilledIdx] = "empty";
          soundEngine.playFairyRevive();
          pushBanner("Released Bottled Fairy!", "Restored 7 Full Hearts!", 3.2);
        } else if (content === "bee") {
          hero.bottles[firstFilledIdx] = "empty";
          soundEngine.playBeeBuzz();
          friendlyBees.push({
            id: `bee-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            zone,
            x: hero.x + Math.sin(hero.facing) * 1.1,
            z: hero.z + Math.cos(hero.facing) * 1.1,
            facing: hero.facing,
            timer: 15.0,
            maxTimer: 15.0,
            stingCooldown: 0.1,
          });
          pushBanner("Unleashed Golden Attack Bee!", "The friendly bee is hunting nearby foes!", 3.4);
        }
      } else {
        soundEngine.playGateLocked();
        pushBanner("All Bottles Empty!", "Press C to open Character Sheet and fill a bottle!", 2.8);
      }
    }

    // Charged Spin Attack Logic: Hold Attack button after swinging to charge, release at >= 0.62s for 360° Double-Damage Spin!
    const SPIN_CHARGE_THRESHOLD = 0.62;
    if (
      input.attackHeld &&
      !state.shopOpen &&
      !state.characterOpen &&
      hero.knockbackLockTimer <= 0 &&
      hero.spinAttackTimer <= 0
    ) {
      const prevCharge = hero.swordChargeTimer ?? 0;
      hero.swordChargeTimer = Math.min(1.6, prevCharge + dt);
      if (prevCharge < SPIN_CHARGE_THRESHOLD && hero.swordChargeTimer >= SPIN_CHARGE_THRESHOLD) {
        soundEngine.playSpinChargeReady();
      }
    } else {
      if ((hero.swordChargeTimer ?? 0) >= SPIN_CHARGE_THRESHOLD && hero.knockbackLockTimer <= 0) {
        // Unleash 360° Charged Spin Attack (Double Sword Damage!)
        hero.spinAttackTimer = 0.38;
        hero.attackTimer = 0.38;
        hero.isSpinAttacking = true;
        hero.isAttacking = true;
        hero.isBlocking = false;
        hero.attackCooldown = 0.42;
        hero.weaponLockTimer = 0.38;
        hero.swingId += 1;
        soundEngine.playSpinAttack();
      }
      hero.swordChargeTimer = 0;
    }

    // Flame Rod Charge & Fireball Cast Logic (Press/Hold R or 3):
    // - Quick Tap (< 0.55s): Shoots a Small Fireball (1 Damage, fast, lights torches)
    // - Charged Hold (>= 0.55s): Shoots a Big Slow Fireball (2 Damage, explodes on impact & leaves burning fire on the ground!)
    const FIRE_CHARGE_THRESHOLD = 0.55;
    if (
      input.fireRodHeld &&
      hero.hasFireRod &&
      !state.shopOpen &&
      !state.characterOpen &&
      hero.knockbackLockTimer <= 0
    ) {
      const prevFire = hero.fireRodChargeTimer ?? 0;
      hero.fireRodChargeTimer = Math.min(1.6, prevFire + dt);
      if (prevFire < FIRE_CHARGE_THRESHOLD && hero.fireRodChargeTimer >= FIRE_CHARGE_THRESHOLD) {
        soundEngine.playSpinChargeReady();
      }
    } else if (
      ((hero.fireRodChargeTimer ?? 0) > 0.02 || input.fireRodPressed) &&
      hero.hasFireRod &&
      hero.fireRodCooldown <= 0 &&
      !state.shopOpen &&
      !state.characterOpen
    ) {
      const isCharged = (hero.fireRodChargeTimer ?? 0) >= FIRE_CHARGE_THRESHOLD;
      hero.fireRodChargeTimer = 0;
      const mpCost = isCharged ? 16 : 8;
      if (hero.mp < mpCost) {
        soundEngine.playGateLocked();
        hero.fireRodCooldown = 0.35;
        pushBanner(
          "Out of Magic Power (MP)!",
          "Drink a Green or Blue Potion from a Bottle (Press V or C) to restore MP!",
          3.2
        );
      } else {
        hero.mp = Math.max(0, hero.mp - mpCost);
        hero.isBlocking = false;
        hero.throwAnimTimer = 0.28;
        hero.weaponLockTimer = 0.28;
        hero.fireRodCooldown = 0.32;
        soundEngine.playFireballShoot(isCharged);
        fireballs.push({
          id: `fb-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
          zone,
          x: hero.x + Math.sin(hero.facing) * 0.95,
          z: hero.z + Math.cos(hero.facing) * 0.95,
          angle: hero.facing,
          speed: isCharged ? 7.4 : 12.4,
          damage: isCharged ? 2 : 1,
          radius: isCharged ? 0.78 : 0.4,
          isCharged,
          lifeTimer: isCharged ? 2.1 : 1.55,
        });
      }
    } else if (!input.fireRodHeld) {
      hero.fireRodChargeTimer = 0;
    }

    // Mutually exclusive weapon actions
    const canUseWeapon =
      !state.shopOpen &&
      !state.characterOpen &&
      hero.knockbackLockTimer <= 0 &&
      hero.weaponLockTimer <= 0 &&
      !hero.isAttacking &&
      hero.bowAnimTimer <= 0 &&
      hero.throwAnimTimer <= 0 &&
      hero.digAnimTimer <= 0;

    // Shovel Digging Action (Press G or 4)
    if (canUseWeapon && input.shovelPressed && hero.hasShovel) {
      hero.isBlocking = false;
      hero.digAnimTimer = 0.36;
      hero.weaponLockTimer = 0.34;
      const digX = hero.x + Math.sin(hero.facing) * 0.85;
      const digZ = hero.z + Math.cos(hero.facing) * 0.85;

      // Spawn flying brown dirt clod particle burst!
      bushBursts.push({
        id: `dirt-burst-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
        zone,
        x: digX,
        z: digZ,
        timer: 0.78,
        maxTimer: 0.78,
        seed: Math.floor(Math.abs(digX * 53 + digZ * 97) + stats.elapsedSeconds * 140),
        isDirt: true,
      });

      // Check if standing near an un-dug soft dirt patch (`dirt_patch`)
      const targetPatch = mapProps.find(
        (p) =>
          p.prefab === "dirt_patch" &&
          p.zone === zone &&
          !p.dug &&
          (Math.hypot(p.x - digX, p.z - digZ) <= 1.75 ||
            Math.hypot(p.x - hero.x, p.z - hero.z) <= 1.95)
      );

      if (targetPatch) {
        ensureMutableMapProps();
        const mutablePatch = mapProps.find((p) => p.id === targetPatch.id);
        if (mutablePatch) {
          mutablePatch.dug = true;
        }
        soundEngine.playShovelDig(true);

        const reward: BuriedRewardKind = targetPatch.buriedReward ?? "random";
        if (reward === "swift_boots") {
          hero.equippedBoots = "swift_boots";
          rupees.push({
            id: `dig-drop-${targetPatch.id}`,
            zone,
            x: targetPatch.x,
            z: targetPatch.z,
            tier: "blue",
            value: 5,
            collected: false,
            spawnBounceTimer: 0.48,
          });
          pushBanner(
            "Dug Up the Swiftwind Boots! (+25% Speed)",
            "Automatically equipped in your Boots slot! Open Character Sheet (C) anytime.",
            4.5
          );
        } else if (reward === "blue_mail") {
          hero.equippedTunic = "blue_mail";
          pushBanner(
            "Dug Up the Sapphire Mail! (-50% Damage)",
            "Reduces all incoming physical & magical damage by 50%!",
            4.5
          );
        } else if (reward === "red_mail") {
          hero.equippedTunic = "red_mail";
          rupees.push({
            id: `dig-drop-${targetPatch.id}`,
            zone,
            x: targetPatch.x,
            z: targetPatch.z,
            tier: "red",
            value: 20,
            collected: false,
            spawnBounceTimer: 0.48,
          });
          pushBanner(
            "Dug Up the Crimson Dragon Mail! (-75% Damage)",
            "Legendary tunic equipped — reduces all physical & magical damage by 75%!",
            4.8
          );
        } else if (reward === "bottle") {
          if (hero.bottles.length < 6) {
            hero.bottles.push("empty");
          }
          rupees.push({
            id: `dig-drop-${targetPatch.id}`,
            zone,
            x: targetPatch.x,
            z: targetPatch.z,
            tier: "blue",
            value: 5,
            collected: false,
            spawnBounceTimer: 0.48,
          });
          pushBanner(
            `Dug Up an Ancient Glass Bottle! (Total: ${hero.bottles.length})`,
            "Store Red/Green/Blue Potions, Fairies, or Golden Bees in your bottles!",
            4.5
          );
        } else if (reward === "fairy") {
          const emptyIdx = hero.bottles.findIndex((b) => b === "empty");
          if (emptyIdx !== -1) {
            hero.bottles[emptyIdx] = "fairy";
            soundEngine.playFairyRevive();
            pushBanner(
              `Captured a Wild Fairy in Bottle #${emptyIdx + 1}!`,
              "Heals 7 Hearts when released or automatically revives you upon death!",
              4.5
            );
          } else {
            hero.hp = Math.min(hero.maxHp, hero.hp + 14);
            soundEngine.playFairyRevive();
            pushBanner(
              "Unearthed a Woodland Fairy! (+7 Hearts)",
              "The fairy blessed you with 7 Full Hearts of healing!",
              4.2
            );
          }
        } else if (reward === "bee") {
          const emptyIdx = hero.bottles.findIndex((b) => b === "empty");
          if (emptyIdx !== -1) {
            hero.bottles[emptyIdx] = "bee";
            soundEngine.playBeeBuzz();
            pushBanner(
              `Captured a Golden Bee in Bottle #${emptyIdx + 1}!`,
              "Press V / 5 or use it in the Character Sheet (C) to unleash it on enemies!",
              4.5
            );
          } else {
            soundEngine.playBeeBuzz();
            friendlyBees.push({
              id: `bee-dig-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: targetPatch.x,
              z: targetPatch.z,
              facing: hero.facing,
              timer: 15.0,
              maxTimer: 15.0,
              stingCooldown: 0.1,
            });
            pushBanner(
              "Unearthed a Golden Attack Bee!",
              "The friendly bee buzzed out of the earth to attack nearby monsters!",
              4.0
            );
          }
        } else {
          // Rupee or Recovery Heart treasure pop!
          let tier: RupeeTier = "blue";
          let val = 5;
          if (reward === "rupee_red") {
            tier = "red";
            val = 20;
          } else if (reward === "rupee_green") {
            tier = "green";
            val = 1;
          } else if (reward === "heart") {
            tier = "heart";
            val = 2;
          } else {
            const roll = Math.random();
            if (roll > 0.75) {
              tier = "red";
              val = 20;
            } else if (roll > 0.35) {
              tier = "blue";
              val = 5;
            } else {
              tier = "heart";
              val = 2;
            }
          }
          rupees.push({
            id: `dig-drop-${targetPatch.id}-${stats.elapsedSeconds.toFixed(2)}`,
            zone,
            x: targetPatch.x,
            z: targetPatch.z,
            tier,
            value: val,
            collected: false,
            spawnBounceTimer: 0.48,
          });
          pushBanner(
            tier === "red"
              ? "Dug Up a Red Rupee! (+20)"
              : tier === "heart"
              ? "Dug Up a Recovery Heart!"
              : "Dug Up Buried Treasure! (+5 Rupees)",
            "Your shovel uncovered loot hidden beneath the soft earth!",
            3.4
          );
        }
      } else {
        soundEngine.playShovelDig(false);
      }
    } else if (
      canUseWeapon &&
      input.boomerangPressed &&
      hero.hasBoomerang &&
      !boomerang &&
      hero.boomerangCooldown <= 0
    ) {
      // Trigger Boomerang Throw (Q or 1) — 2.0 second cooldown prevents close-range spam!
      hero.isBlocking = false;
      hero.throwAnimTimer = 0.28;
      hero.weaponLockTimer = 0.34;
      hero.boomerangCooldown = 2.0;
      soundEngine.playBoomerangThrow();
      boomerang = {
        zone,
        x: hero.x + Math.sin(hero.facing) * 0.9,
        z: hero.z + Math.cos(hero.facing) * 0.9,
        dirX: Math.sin(hero.facing),
        dirZ: Math.cos(hero.facing),
        distanceTraveled: 0,
        returning: false,
        spinAngle: 0,
        hitEnemyIds: [],
      };
    } else if (canUseWeapon && input.bowPressed && hero.bowCooldown <= 0) {
      // Trigger Hero Bow & Arrow Shot (E or 2)
      if (!hero.hasBow) {
        pushBanner(
          "No Bow Equipped!",
          "Buy the Ranger's Bow at Merchant Bramble's Shop in the South Clearing.",
          2.8
        );
        hero.bowCooldown = 0.4;
      } else if (hero.arrows <= 0) {
        soundEngine.playGateLocked();
        pushBanner(
          "Out of Arrows!",
          "Buy a Bundle of Arrows at the Shop in the South Clearing.",
          2.8
        );
        hero.bowCooldown = 0.4;
      } else {
        hero.isBlocking = false;
        hero.arrows -= 1;
        hero.bowAnimTimer = 0.32;
        hero.weaponLockTimer = 0.38;
        hero.bowCooldown = 0.42;
        soundEngine.playBowShoot();
        arrows.push({
          id: `hero-arrow-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
          zone,
          fromHero: true,
          x: hero.x + Math.sin(hero.facing) * 0.95,
          z: hero.z + Math.cos(hero.facing) * 0.95,
          angle: hero.facing,
          speed: 21.0,
          damage: 2,
          lifeTimer: 1.5,
        });
      }
    } else if (canUseWeapon && input.attackPressed && hero.attackCooldown <= 0) {
      // Trigger Sword Swing
      hero.isAttacking = true;
      hero.isSpinAttacking = false;
      hero.isBlocking = false;
      hero.attackTimer = 0.24;
      hero.attackCooldown = 0.35;
      hero.weaponLockTimer = 0.35;
      hero.swingId += 1;
      soundEngine.playSwordSwing();
    }

    const isUsingAnyWeapon =
      hero.isAttacking ||
      hero.bowAnimTimer > 0 ||
      hero.throwAnimTimer > 0 ||
      hero.digAnimTimer > 0;

    // Right-click Shield Block
    hero.isBlocking =
      input.blockHeld && !isUsingAnyWeapon && hero.knockbackLockTimer <= 0;

    // 2. Hero Movement + Boots Speed Multiplier + Knockback
    const isKnockbackLocked = hero.knockbackLockTimer > 0;
    let mx = isKnockbackLocked ? 0 : input.moveX;
    let mz = isKnockbackLocked ? 0 : input.moveZ;
    const mag = Math.hypot(mx, mz);
    const bootsMultiplier =
      hero.equippedBoots === "swift_boots"
        ? 1.25
        : hero.equippedBoots === "titan_greaves"
        ? 1.12
        : 1.0;

    if (mag > 0.01) {
      mx /= mag;
      mz /= mag;
      if (!isUsingAnyWeapon) {
        hero.facing = Math.atan2(mx, mz);
      }
      hero.walkCycle += dt * (hero.isBlocking ? 7 : 11) * bootsMultiplier;
    }

    const baseMoveSpeed = isUsingAnyWeapon
      ? 4.8
      : (hero.swordChargeTimer ?? 0) > 0.25 || (hero.fireRodChargeTimer ?? 0) > 0.2
      ? 6.4
      : hero.isBlocking
      ? 5.4
      : 9.0;
    const moveSpeed = baseMoveSpeed * bootsMultiplier;
    const nextHeroX = hero.x + (mx * moveSpeed + hero.knockbackVx) * dt;
    const nextHeroZ = hero.z + (mz * moveSpeed + hero.knockbackVz) * dt;

    const kbDecay = isKnockbackLocked ? Math.exp(-2.8 * dt) : Math.exp(-10 * dt);
    hero.knockbackVx *= kbDecay;
    hero.knockbackVz *= kbDecay;

    const initialGatePassable =
      flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated);
    const clampedNextHeroZ =
      zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated
        ? Math.max(13.55, nextHeroZ)
        : nextHeroZ;
    const resolvedHero = resolveWorldCollisions(
      nextHeroX,
      clampedNextHeroZ,
      0.72,
      zone,
      initialGatePassable,
      dynamicObstacles,
      flags.bossDefeated
    );
    if (isKnockbackLocked && resolvedHero.hitObstacle) {
      hero.knockbackVx *= 0.45;
      hero.knockbackVz *= 0.45;
    }
    hero.x = resolvedHero.x;
    hero.z =
      zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated
        ? Math.max(13.55, resolvedHero.z)
        : resolvedHero.z;

    // Check proximity to Merchant Shop Stall in South Clearing
    const distToShop =
      zone === "overworld"
        ? Math.hypot(hero.x - SHOP_INTERACT_POS.x, hero.z - SHOP_INTERACT_POS.z)
        : 999;
    const nearShop = distToShop < 3.1;
    let shopOpen = state.shopOpen;
    let shopDismissedOnRug = state.shopDismissedOnRug;
    if (nearShop && !shopOpen && !shopDismissedOnRug && !state.characterOpen) {
      shopOpen = true;
    } else if (!nearShop) {
      shopOpen = false;
      shopDismissedOnRug = false;
    }

    // Update Dungeon Room indicator
    if (zone === "dungeon") {
      if (hero.z < -13.5) {
        dungeonRoom = "entry";
      } else if (hero.z < 12.2) {
        dungeonRoom = "hall";
      } else {
        dungeonRoom = "sanctum";
      }
    }

    // 3. Check Dynamic Portal Transitions
    if (hero.portalCooldown <= 0) {
      for (const portal of state.portals) {
        if (portal.zone !== zone) continue;
        const distToPortal = Math.hypot(hero.x - portal.x, hero.z - portal.z);
        if (distToPortal <= portal.radius) {
          if (portal.id === "portal-dg-frontier" && !flags.bossDefeated) {
            if (gateNoticeCooldown <= 0) {
              gateNoticeCooldown = 3.2;
              soundEngine.playGateLocked();
              pushBanner(
                "The Northern Sanctum Exit is Sealed!",
                "Vanquish Malakor and his minions to unseal the passage to the Elderwood Frontier.",
                3.6
              );
            }
            continue;
          }
          zone = portal.targetZone;
          if (zone === "dungeon") {
            dungeonRoom = portal.targetZ < -13.5 ? "entry" : portal.targetZ < 12.2 ? "hall" : "sanctum";
          }
          hero.x = portal.targetX;
          hero.z = portal.targetZ;
          hero.facing = portal.targetFacing;
          hero.knockbackVx = 0;
          hero.knockbackVz = 0;
          hero.portalCooldown = 1.25;
          boomerang = null;
          arrows = arrows.map((a) => (a.stuck && a.stuckInShield ? { ...a, zone } : a));
          cutBushIds = [];
          soundEngine.playPortalTransition();
          pushBanner(portal.label, portal.sublabel);
          break;
        }
      }
    }

    // 4. Check Sanctum Key Pickup in Overworld
    if (zone === "overworld" && !flags.keyPickedUp) {
      const distToKey = Math.hypot(
        hero.x - DUNGEON_KEY_POS.x,
        hero.z - DUNGEON_KEY_POS.z
      );
      if (distToKey < 1.85) {
        flags.keyPickedUp = true;
        hero.hasDungeonKey = true;
        soundEngine.playKeyPickup();
        pushBanner(
          "Acquired the Sanctum Key!",
          "Journey to the Northern Temple Portal and unlock the Sanctum Gate.",
          5.0
        );
      }
    }

    // 5. Check Locked Gate in Dungeon
    if (zone === "dungeon" && !flags.gateUnlocked) {
      const distToGate = Math.hypot(
        hero.x - LOCKED_GATE_POS.x,
        hero.z - LOCKED_GATE_POS.z
      );
      if (distToGate < 3.1) {
        if (hero.hasDungeonKey) {
          flags.gateUnlocked = true;
          hero.hasDungeonKey = false;
          soundEngine.playGateUnlock();
          pushBanner(
            "Sanctum Gate Unlocked!",
            "The iron bars descend. Enter the Sanctum of the Dread Warden!",
            4.5
          );
        } else if (gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "The Sanctum Gate is Locked",
            "Find the golden Sanctum Key in the Western Watchtower Ruins of the Overworld.",
            4.0
          );
        }
      }
    } else if (
      zone === "dungeon" &&
      flags.gateUnlocked &&
      flags.bossAwakened &&
      !flags.bossDefeated
    ) {
      const distToGate = Math.hypot(
        hero.x - LOCKED_GATE_POS.x,
        hero.z - LOCKED_GATE_POS.z
      );
      if (distToGate < 2.8 && gateNoticeCooldown <= 0) {
        gateNoticeCooldown = 3.5;
        soundEngine.playGateLocked();
        pushBanner(
          "The Sanctum Gate is Sealed Shut!",
          "You are locked in with Malakor — defeat him and his minions to reopen the gate!",
          3.6
        );
      }
    }

    // 6. Check Boss Awakening immediately when stepping past the doorway threshold into Room 3
    if (zone === "dungeon" && flags.gateUnlocked && !flags.bossAwakened && hero.z > 13.05) {
      flags.bossAwakened = true;
      hero.z = Math.max(13.58, hero.z);
      soundEngine.playGateLocked();
      soundEngine.playBossRoar();
      pushBanner(
        "Malakor, Warden of the Eclipse",
        "The Sanctum Gate slams shut behind you! Bait his charge into a wall or pillar to stun him!",
        5.0
      );
    }

    const gatePassable =
      flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated);
    const bossExitOpen = flags.bossDefeated;

    // 7. Update Arcing Boss Projectiles & Toxic Ground Hazards (Magical Damage!)
    const projectiles: BossProjectileState[] = [];
    const hazards: HazardZoneState[] = state.hazards
      .map((h) => ({ ...h, timer: h.timer - dt }))
      .filter((h) => h.timer > 0);

    for (const proj of state.projectiles) {
      const updatedProj: BossProjectileState = {
        ...proj,
        flightTime: proj.flightTime + dt,
      };
      if (updatedProj.flightTime >= updatedProj.totalFlightTime) {
        if (updatedProj.zone === zone) {
          soundEngine.playBombExplode();
          const dx = hero.x - updatedProj.targetX;
          const dz = hero.z - updatedProj.targetZ;
          const dist = Math.hypot(dx, dz);
          const pushDirX = dist > 0.01 ? dx / dist : 0;
          const pushDirZ = dist > 0.01 ? dz / dist : -1;

          if (dist <= updatedProj.directHitRadius) {
            const angleToProjOrigin = Math.atan2(
              updatedProj.startX - hero.x,
              updatedProj.startZ - hero.z
            );
            const angleToImpact =
              dist > 0.25
                ? Math.atan2(
                    updatedProj.targetX - hero.x,
                    updatedProj.targetZ - hero.z
                  )
                : angleToProjOrigin;
            const projIncomingAngle = isFacingAttack(angleToProjOrigin)
              ? angleToProjOrigin
              : angleToImpact;
            damageHero(
              1,
              pushDirX * 13,
              pushDirZ * 13,
              false,
              false,
              projIncomingAngle,
              6.0,
              true
            );
          } else if (dist <= updatedProj.aoeRadius) {
            damageHero(1, pushDirX * 9.5, pushDirZ * 9.5, true, false, undefined, 1.0, true);
          }
        }

        hazards.push({
          id: `hazard-${updatedProj.id}`,
          zone: updatedProj.zone,
          x: updatedProj.targetX,
          z: updatedProj.targetZ,
          radius: updatedProj.aoeRadius,
          timer: 5.2,
          maxTimer: 5.2,
        });
      } else {
        projectiles.push(updatedProj);
      }
    }

    for (const hazard of hazards) {
      if (hazard.zone !== zone) continue;
      const dx = hero.x - hazard.x;
      const dz = hero.z - hazard.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= hazard.radius) {
        const pushDirX = dist > 0.01 ? dx / dist : 0;
        const pushDirZ = dist > 0.01 ? dz / dist : -1;
        damageHero(1, pushDirX * 5.5, pushDirZ * 5.5, true, false, undefined, 1.0, true);
      }
    }

    // 8. Update Boomerang Flight
    if (boomerang) {
      if (boomerang.zone !== zone) {
        boomerang = null;
      } else {
        boomerang.spinAngle += dt * 22;
        if (!boomerang.returning) {
          const speed = 16.0;
          const step = speed * dt;
          boomerang.distanceTraveled += step;
          const nextBx = boomerang.x + boomerang.dirX * step;
          const nextBz = boomerang.z + boomerang.dirZ * step;
          const resB = resolveWorldCollisions(
            nextBx,
            nextBz,
            0.45,
            zone,
            gatePassable,
            dynamicObstacles
          );
          boomerang.x = resB.x;
          boomerang.z = resB.z;
          if (resB.hitObstacle || boomerang.distanceTraveled >= 10.5) {
            boomerang.returning = true;
          }
        } else {
          const toHx = hero.x - boomerang.x;
          const toHz = hero.z - boomerang.z;
          const distH = Math.hypot(toHx, toHz);
          if (distH < 1.1) {
            boomerang = null;
          } else {
            const retSpeed = 18.0;
            boomerang.x += (toHx / distH) * retSpeed * dt;
            boomerang.z += (toHz / distH) * retSpeed * dt;
          }
        }

        // Boomerang collects rupees & recovery hearts in flight!
        if (boomerang) {
          for (const rupee of rupees) {
            if (rupee.zone !== zone || rupee.collected) continue;
            if ((rupee.spawnBounceTimer ?? 0) > 0.12) continue;
            if (Math.hypot(rupee.x - boomerang.x, rupee.z - boomerang.z) < 1.35) {
              rupee.collected = true;
              if (rupee.tier === "heart") {
                hero.hp = Math.min(hero.maxHp, hero.hp + (rupee.value || 2));
              } else {
                hero.rupees += rupee.value;
              }
              soundEngine.playRupeePickup(rupee.tier);
            }
          }
        }
      }
    }

    // 8b. Bush Chopping (via Sword Swing, 360° Spin Attack, or Boomerang)
    const MAX_BUSH_RUPEES_CAP = 32;
    let playedBushCutThisFrame = false;

    for (const prop of mapProps) {
      if (prop.prefab !== "bush" || prop.zone !== zone) continue;
      if (cutBushIds.includes(prop.id)) continue;

      const bushRadius = 0.72 * Math.max(prop.scaleX, prop.scaleZ);
      let hitBush = false;

      if (hero.isAttacking && hero.attackTimer > 0.04) {
        const dx = prop.x - hero.x;
        const dz = prop.z - hero.z;
        const dist = Math.hypot(dx, dz);
        const reach = (hero.isSpinAttacking ? 3.25 : 2.85) + bushRadius;
        if (dist <= reach) {
          if (hero.isSpinAttacking) {
            hitBush = true;
          } else {
            const angleToBush = Math.atan2(dx, dz);
            const angleDiff = Math.abs(normalizeAngleDiff(angleToBush, hero.facing));
            if (angleDiff <= 1.42 || dist <= 1.35) {
              hitBush = true;
            }
          }
        }
      }

      if (!hitBush && boomerang) {
        if (Math.hypot(prop.x - boomerang.x, prop.z - boomerang.z) <= bushRadius + 0.65) {
          hitBush = true;
        }
      }

      if (hitBush) {
        cutBushIds.push(prop.id);
        if (!playedBushCutThisFrame) {
          playedBushCutThisFrame = true;
          soundEngine.playBushCut();
        }

        bushBursts.push({
          id: `bush-burst-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
          zone,
          x: prop.x,
          z: prop.z,
          timer: 0.88,
          maxTimer: 0.88,
          seed: Math.floor(Math.abs(prop.x * 41 + prop.z * 83) + stats.elapsedSeconds * 130),
        });

        const alreadyCutOnce = lootedBushIds.includes(prop.id);
        if (!alreadyCutOnce) {
          lootedBushIds.push(prop.id);
        }

        if (bushRupeesEarned < MAX_BUSH_RUPEES_CAP) {
          const dropChance = alreadyCutOnce ? 0.05 : 0.38;
          if (Math.random() < dropChance) {
            let tier: RupeeTier = "green";
            let value = 1;

            if (!alreadyCutOnce) {
              const tierRoll = Math.random();
              if (tierRoll >= 0.94 && bushRupeesEarned + 20 <= MAX_BUSH_RUPEES_CAP + 8) {
                tier = "red";
                value = 20;
              } else if (tierRoll >= 0.74) {
                tier = "blue";
                value = 5;
              }
            }

            bushRupeesEarned += value;
            rupees.push({
              id: `bush-drop-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: prop.x,
              z: prop.z,
              tier,
              value,
              collected: false,
              spawnBounceTimer: 0.46,
            });

            if (tier === "red") {
              pushBanner(
                "Lucky Bush Jackpot! (+20 Red Rupee)",
                "A rare crimson crystal rupee leaped out of the foliage!",
                3.6
              );
            }
          }
        }
      }
    }

    // Helper to handle enemy defeat & rupee / recovery heart drops
    const handleEnemyDeath = (enemy: EnemyState) => {
      enemy.hp = 0;
      enemy.state = "dead";
      stats.enemiesDefeated += 1;

      if (enemy.kind === "boss") {
        soundEngine.playBossDefeat();
        const bossDrops: Array<{
          tier: RupeeTier;
          val: number;
          ox: number;
          oz: number;
        }> = [
          { tier: "red", val: 20, ox: 0, oz: 0 },
          { tier: "red", val: 20, ox: -1.4, oz: 0.8 },
          { tier: "blue", val: 5, ox: 1.4, oz: 0.8 },
          { tier: "blue", val: 5, ox: -1.1, oz: -1.1 },
          { tier: "heart", val: 2, ox: 1.1, oz: -1.1 },
        ];
        bossDrops.forEach((drop, idx) => {
          rupees.push({
            id: `drop-${enemy.id}-${idx}-${stats.elapsedSeconds.toFixed(2)}`,
            zone,
            x: enemy.x + drop.ox,
            z: enemy.z + drop.oz,
            tier: drop.tier,
            value: drop.val,
            collected: false,
            spawnBounceTimer: 0.42,
          });
        });
      } else {
        soundEngine.playEnemyDefeat();
        const tier: RupeeTier = enemy.rupeeDrop === "boss" ? "red" : enemy.rupeeDrop;
        const value =
          tier === "heart" ? 2 : tier === "red" ? 20 : tier === "blue" ? 5 : 1;
        rupees.push({
          id: `drop-${enemy.id}-${stats.elapsedSeconds.toFixed(2)}`,
          zone,
          x: enemy.x,
          z: enemy.z,
          tier,
          value,
          collected: false,
          spawnBounceTimer: 0.36,
        });

        // Enemies also sometimes drop a Recovery Heart (especially when hero is hurt)
        const heartDropChance = hero.hp < hero.maxHp ? 0.38 : 0.18;
        if (tier !== "heart" && Math.random() < heartDropChance) {
          rupees.push({
            id: `drop-heart-${enemy.id}-${stats.elapsedSeconds.toFixed(2)}`,
            zone,
            x: enemy.x + 0.75,
            z: enemy.z + 0.35,
            tier: "heart",
            value: 2,
            collected: false,
            spawnBounceTimer: 0.42,
          });
        }
      }
    };

    // 9. Update Arrows (both Hero Arrows & Goblin Archer Arrows — stick into walls on impact!)
    const remainingArrows: ArrowProjectileState[] = [];
    for (const arrow of arrows) {
      if (arrow.zone !== zone) continue;

      if (arrow.stuck) {
        arrow.stuckTimer = (arrow.stuckTimer ?? 0) - dt;
        if ((arrow.stuckTimer ?? 0) > 0) {
          remainingArrows.push(arrow);
        }
        continue;
      }

      arrow.lifeTimer -= dt;
      if (arrow.lifeTimer <= 0) continue;

      const nextAx = arrow.x + Math.sin(arrow.angle) * arrow.speed * dt;
      const nextAz = arrow.z + Math.cos(arrow.angle) * arrow.speed * dt;
      const resA = resolveArrowCollisions(
        nextAx,
        nextAz,
        0.22,
        zone,
        gatePassable,
        dynamicObstacles
      );
      if (resA.hitObstacle) {
        arrow.stuck = true;
        arrow.stuckTimer = 2.4;
        arrow.x = nextAx - Math.sin(arrow.angle) * 0.14;
        arrow.z = nextAz - Math.cos(arrow.angle) * 0.14;
        soundEngine.playArrowStick();
        remainingArrows.push(arrow);
        continue;
      }

      arrow.x = nextAx;
      arrow.z = nextAz;

      let arrowConsumed = false;
      if (arrow.fromHero) {
        // Hero arrow hits enemies -> sticks into enemy & provokes/aggroes them to fight back!
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.45 : 0.85;
          if (Math.hypot(enemy.x - arrow.x, enemy.z - arrow.z) <= eRad) {
            arrowConsumed = true;
            const isSanctumFoe =
              enemy.zone === "dungeon" && (enemy.kind === "boss" || enemy.spawnZ > 13);

            // Prevent sniping or waking the Boss/Sanctum Minions from outside the Boss Room before entering!
            if (isSanctumFoe && !flags.bossAwakened) {
              soundEngine.playArmorDeflect();
              soundEngine.playArrowStick();
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.5;
                pushBanner(
                  "Enter the Dread Sanctum!",
                  "Step through the Sanctum Gate to challenge Malakor and his minions!",
                  3.2
                );
              }
            } else {
              enemy.provoked = true;
              if (enemy.kind === "boss" && enemy.state !== "stunned") {
                soundEngine.playArmorDeflect();
                soundEngine.playArrowStick();
              } else {
                enemy.hp -= arrow.damage;
                enemy.hitFlashTimer = 0.22;
                if (enemy.kind !== "boss") {
                  if (enemy.state === "idle" || enemy.state === "recover") {
                    enemy.state = "aggro";
                  }
                  enemy.actionCooldown = Math.min(enemy.actionCooldown, 0.15);
                }
                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                } else {
                  soundEngine.playEnemyHit(enemy.kind === "boss");
                  soundEngine.playArrowStick();
                }
              }
            }

            // Embed arrow into the enemy's body in local enemy coordinates so it moves & rotates with them!
            if (enemy.hp > 0) {
              const dirX = Math.sin(arrow.angle);
              const dirZ = Math.cos(arrow.angle);
              const perpX = dirZ;
              const perpZ = -dirX;
              const dx = arrow.x - enemy.x;
              const dz = arrow.z - enemy.z;
              const rawLat = dx * perpX + dz * perpZ;
              const maxLat =
                enemy.kind === "boss"
                  ? 0.55
                  : enemy.kind === "knight"
                  ? 0.35
                  : enemy.kind === "slime"
                  ? 0.32
                  : 0.25;
              const lat = Math.max(-maxLat, Math.min(maxLat, rawLat));
              const embedDist =
                enemy.kind === "boss"
                  ? 1.15
                  : enemy.kind === "knight"
                  ? 0.72
                  : enemy.kind === "slime"
                  ? 0.62
                  : 0.55;

              const worldOffX = -dirX * embedDist + perpX * lat;
              const worldOffZ = -dirZ * embedDist + perpZ * lat;
              const cosF = Math.cos(enemy.facing);
              const sinF = Math.sin(enemy.facing);

              arrow.stuck = true;
              arrow.stuckTimer = 4.0;
              arrow.stuckEnemyId = enemy.id;
              arrow.stuckLocalX = worldOffX * cosF - worldOffZ * sinF;
              arrow.stuckLocalZ = worldOffX * sinF + worldOffZ * cosF;
              arrow.stuckLocalAngle = arrow.angle - enemy.facing;
              arrow.x = enemy.x + worldOffX;
              arrow.z = enemy.z + worldOffZ;
              remainingArrows.push(arrow);
            }
            break;
          }
        }
      } else {
        // Goblin Archer arrow hits Hero
        if (Math.hypot(hero.x - arrow.x, hero.z - arrow.z) <= 0.95) {
          arrowConsumed = true;
          const arrowFromAngle = arrow.angle + Math.PI;
          const canBlockArrow =
            hero.isBlocking && isFacingAttack(arrowFromAngle);
          const hitRes = damageHero(
            arrow.damage,
            Math.sin(arrow.angle) * 9.5,
            Math.cos(arrow.angle) * 9.5,
            false,
            false,
            arrowFromAngle,
            0.65
          );

          if (canBlockArrow) {
            if (!hitRes.triggered) {
              soundEngine.playShieldBlock();
            }
            soundEngine.playArrowStick();

            const rightX = Math.cos(hero.facing);
            const rightZ = -Math.sin(hero.facing);
            const dx = arrow.x - hero.x;
            const dz = arrow.z - hero.z;
            const rawLat = dx * rightX + dz * rightZ;
            const clampedZ = Math.max(-0.22, Math.min(0.22, rawLat));
            const randY = Math.sin(stats.elapsedSeconds * 37.3 + arrow.x * 13.7) * 0.16;
            const relYaw = Math.max(
              -0.38,
              Math.min(0.38, normalizeAngleDiff(arrow.angle, hero.facing + Math.PI))
            );

            arrow.stuck = true;
            arrow.stuckTimer = 4.5;
            arrow.stuckInShield = true;
            arrow.stuckShieldY = randY;
            arrow.stuckShieldZ = clampedZ;
            arrow.stuckShieldYaw = relYaw;
            arrow.x = hero.x + Math.sin(hero.facing) * 0.56;
            arrow.z = hero.z + Math.cos(hero.facing) * 0.56;
            remainingArrows.push(arrow);
          }
        }
      }

      if (!arrowConsumed) {
        remainingArrows.push(arrow);
      }
    }
    arrows = remainingArrows;

    // 9b. Torch Combination Puzzles, Magic Fireballs, Burning Ground Fire Zones & Friendly Golden Bees
    const checkTorchCombinationPuzzles = () => {
      if (zone === "overworld" && !flags.overworldTorchPuzzleSolved) {
        const owPuzzleTorches = mapProps.filter(
          (p) =>
            p.zone === "overworld" &&
            p.prefab === "wall_torch" &&
            (p.puzzleTarget === "lit" || p.puzzleTarget === "unlit")
        );
        if (
          owPuzzleTorches.length > 0 &&
          owPuzzleTorches.every(
            (p) => (p.lit !== false ? "lit" : "unlit") === p.puzzleTarget
          )
        ) {
          flags.overworldTorchPuzzleSolved = true;
          soundEngine.playSecretSolve();
          if (!hero.unlockedTunics.includes("blue_mail")) {
            hero.unlockedTunics = [...hero.unlockedTunics, "blue_mail"];
          }
          if (hero.equippedTunic === "green_tunic") {
            hero.equippedTunic = "blue_mail";
          }
          rupees.push(
            {
              id: `torch-secret-rupee-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "overworld",
              x: 10.4,
              z: -13.2,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `torch-secret-rupee-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "overworld",
              x: 12.1,
              z: -13.2,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `torch-secret-heart-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "overworld",
              x: 11.25,
              z: -12.6,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Sun Shrine Torch Combination Solved! (Sapphire Mail Unlocked!)",
            "Sapphire Mail (-50% Damage Taken) unlocked & equipped, plus +40 Rupees! Press C for Character Sheet.",
            6.5
          );
        }
      } else if (zone === "dungeon" && !flags.dungeonTorchPuzzleSolved) {
        const dgPuzzleTorches = mapProps.filter(
          (p) =>
            p.zone === "dungeon" &&
            p.prefab === "wall_torch" &&
            (p.puzzleTarget === "lit" || p.puzzleTarget === "unlit")
        );
        if (
          dgPuzzleTorches.length > 0 &&
          dgPuzzleTorches.every(
            (p) => (p.lit !== false ? "lit" : "unlit") === p.puzzleTarget
          )
        ) {
          flags.dungeonTorchPuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `dg-torch-secret-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: -1.2,
              z: -12.6,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `dg-torch-secret-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: 1.2,
              z: -12.6,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `dg-torch-secret-heart-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: 0,
              z: -12.2,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Sanctum Brazier Secret Solved!",
            "The twin dungeon braziers flare to life, revealing +40 Rupees & a Recovery Heart!",
            5.5
          );
        }
      }
    };

    // Allow sword swing or boomerang to fan out / extinguish a lit puzzle torch so the player can adjust combinations!
    if (
      (hero.isAttacking && hero.attackTimer > 0.14) ||
      boomerang !== null
    ) {
      for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
        const prop = mapProps[pIdx];
        if (
          prop.zone !== zone ||
          prop.prefab !== "wall_torch" ||
          (prop.puzzleTarget !== "lit" && prop.puzzleTarget !== "unlit") ||
          prop.lit === false
        ) {
          continue;
        }
        const hitByBoomerang =
          boomerang !== null &&
          Math.hypot(boomerang.x - prop.x, boomerang.z - prop.z) <= 1.25;
        const hitBySword =
          hero.isAttacking &&
          hero.attackTimer > 0.18 &&
          Math.hypot(
            hero.x + Math.sin(hero.facing) * 1.35 - prop.x,
            hero.z + Math.cos(hero.facing) * 1.35 - prop.z
          ) <= 1.35;
        if (hitByBoomerang || hitBySword) {
          if (!mapPropsMutated) {
            mapProps = mapProps.map((mp) => ({ ...mp }));
            mapPropsMutated = true;
          }
          mapProps[pIdx].lit = false;
          checkTorchCombinationPuzzles();
        }
      }
    }

    // Update Magic Fireballs
    const spawnChargedFireZone = (fx: number, fz: number) => {
      soundEngine.playFireExplosion();
      fireZones.push({
        id: `fire-zone-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toString(36).slice(2, 6)}`,
        zone,
        x: fx,
        z: fz,
        radius: 2.35,
        timer: 3.8,
        maxTimer: 3.8,
        tickTimer: 0.12,
      });
      // Immediate splash damage on explosion!
      for (const enemy of enemies) {
        if (enemy.zone !== zone || enemy.state === "dead") continue;
        const eRad = enemy.kind === "boss" ? 1.5 : 0.9;
        if (Math.hypot(enemy.x - fx, enemy.z - fz) <= 2.25 + eRad) {
          const isSanctumFoe =
            enemy.zone === "dungeon" && (enemy.kind === "boss" || enemy.spawnZ > 13);
          if (isSanctumFoe && !flags.bossAwakened) continue;
          enemy.provoked = true;
          if (enemy.kind === "boss" && enemy.state !== "stunned") {
            soundEngine.playArmorDeflect();
          } else {
            enemy.hp -= 2;
            enemy.hitFlashTimer = 0.26;
            if (enemy.kind !== "boss" && (enemy.state === "idle" || enemy.state === "recover")) {
              enemy.state = "aggro";
            }
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
            } else {
              soundEngine.playEnemyHit(enemy.kind === "boss");
            }
          }
        }
      }
    };

    const remainingFireballs: FireballProjectileState[] = [];
    for (const fb of fireballs) {
      if (fb.zone !== zone) continue;
      fb.lifeTimer -= dt;
      if (fb.lifeTimer <= 0) {
        if (fb.isCharged) {
          spawnChargedFireZone(fb.x, fb.z);
        }
        continue;
      }

      const nextFx = fb.x + Math.sin(fb.angle) * fb.speed * dt;
      const nextFz = fb.z + Math.cos(fb.angle) * fb.speed * dt;

      // Light any unlit wall_torch along the fireball's path!
      for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
        const prop = mapProps[pIdx];
        if (prop.zone !== zone || prop.prefab !== "wall_torch") continue;
        if (Math.hypot(nextFx - prop.x, nextFz - prop.z) <= fb.radius + 0.95) {
          if (prop.lit === false) {
            if (!mapPropsMutated) {
              mapProps = mapProps.map((mp) => ({ ...mp }));
              mapPropsMutated = true;
            }
            mapProps[pIdx].lit = true;
            soundEngine.playTorchLight();
            checkTorchCombinationPuzzles();
          }
        }
      }

      // Check if fireball burns any bushes along its path!
      for (const prop of mapProps) {
        if (prop.prefab !== "bush" || prop.zone !== zone) continue;
        if (cutBushIds.includes(prop.id)) continue;
        if (Math.hypot(nextFx - prop.x, nextFz - prop.z) <= fb.radius + 0.85) {
          cutBushIds.push(prop.id);
          soundEngine.playBushCut();
          bushBursts.push({
            id: `bush-burst-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
            zone,
            x: prop.x,
            z: prop.z,
            timer: 0.88,
            maxTimer: 0.88,
            seed: Math.floor(Math.abs(prop.x * 41 + prop.z * 83) + stats.elapsedSeconds * 130),
          });
        }
      }

      const resFb = resolveArrowCollisions(
        nextFx,
        nextFz,
        0.26,
        zone,
        gatePassable,
        dynamicObstacles
      );
      if (resFb.hitObstacle) {
        if (fb.isCharged) {
          spawnChargedFireZone(fb.x, fb.z);
        } else {
          soundEngine.playFireExplosion();
        }
        continue;
      }

      fb.x = nextFx;
      fb.z = nextFz;

      let fbConsumed = false;
      for (const enemy of enemies) {
        if (enemy.zone !== zone || enemy.state === "dead") continue;
        const eRad = enemy.kind === "boss" ? 1.45 : 0.88;
        if (Math.hypot(enemy.x - fb.x, enemy.z - fb.z) <= eRad + fb.radius) {
          fbConsumed = true;
          if (fb.isCharged) {
            spawnChargedFireZone(fb.x, fb.z);
          } else {
            const isSanctumFoe =
              enemy.zone === "dungeon" && (enemy.kind === "boss" || enemy.spawnZ > 13);
            if (isSanctumFoe && !flags.bossAwakened) {
              soundEngine.playArmorDeflect();
            } else {
              enemy.provoked = true;
              if (enemy.kind === "boss" && enemy.state !== "stunned") {
                soundEngine.playArmorDeflect();
              } else {
                enemy.hp -= fb.damage;
                enemy.hitFlashTimer = 0.24;
                if (enemy.kind !== "boss" && (enemy.state === "idle" || enemy.state === "recover")) {
                  enemy.state = "aggro";
                }
                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                } else {
                  soundEngine.playEnemyHit(enemy.kind === "boss");
                }
              }
            }
          }
          break;
        }
      }

      if (!fbConsumed) {
        remainingFireballs.push(fb);
      }
    }
    fireballs = remainingFireballs;

    // Update Burning Ground Fire Zones (from Charged Fire Rod blasts)
    const remainingFireZones: FireZoneState[] = [];
    for (const fz of fireZones) {
      if (fz.zone !== zone) continue;
      fz.timer -= dt;
      if (fz.timer <= 0) continue;

      // Also light any unlit torch touching the fire zone!
      for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
        const prop = mapProps[pIdx];
        if (prop.zone !== zone || prop.prefab !== "wall_torch" || prop.lit !== false) continue;
        if (Math.hypot(fz.x - prop.x, fz.z - prop.z) <= fz.radius + 0.65) {
          if (!mapPropsMutated) {
            mapProps = mapProps.map((mp) => ({ ...mp }));
            mapPropsMutated = true;
          }
          mapProps[pIdx].lit = true;
          soundEngine.playTorchLight();
          checkTorchCombinationPuzzles();
        }
      }

      fz.tickTimer -= dt;
      if (fz.tickTimer <= 0) {
        fz.tickTimer = 0.55;
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.35 : 0.75;
          if (Math.hypot(enemy.x - fz.x, enemy.z - fz.z) <= fz.radius + eRad * 0.5) {
            const isSanctumFoe =
              enemy.zone === "dungeon" && (enemy.kind === "boss" || enemy.spawnZ > 13);
            if (isSanctumFoe && !flags.bossAwakened) continue;
            enemy.provoked = true;
            if (enemy.kind === "boss" && enemy.state !== "stunned") {
              soundEngine.playArmorDeflect();
            } else {
              enemy.hp -= 1;
              enemy.hitFlashTimer = 0.2;
              if (enemy.kind !== "boss" && enemy.state === "idle") {
                enemy.state = "aggro";
              }
              if (enemy.hp <= 0) {
                handleEnemyDeath(enemy);
              } else {
                soundEngine.playEnemyHit(enemy.kind === "boss");
              }
            }
          }
        }
      }
      remainingFireZones.push(fz);
    }
    fireZones = remainingFireZones;

    // Update Friendly Golden Bees (released from Glass Bottles!)
    const remainingBees: FriendlyBeeState[] = [];
    for (const bee of friendlyBees) {
      if (bee.zone !== zone) continue;
      bee.timer -= dt;
      if (bee.timer <= 0) continue;
      bee.stingCooldown = Math.max(0, bee.stingCooldown - dt);

      let nearestEnemy: EnemyState | null = null;
      let nearestDist = 16.0;
      for (const enemy of enemies) {
        if (enemy.zone !== zone || enemy.state === "dead") continue;
        const isSanctumFoe =
          enemy.zone === "dungeon" && (enemy.kind === "boss" || enemy.spawnZ > 13);
        if (isSanctumFoe && !flags.bossAwakened) continue;
        const d = Math.hypot(enemy.x - bee.x, enemy.z - bee.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) {
        const dx = nearestEnemy.x - bee.x;
        const dz = nearestEnemy.z - bee.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
          bee.facing = Math.atan2(dx, dz);
          bee.x += (dx / dist) * 10.2 * dt;
          bee.z += (dz / dist) * 10.2 * dt;
        }
        if (dist <= 1.25 && bee.stingCooldown <= 0) {
          bee.stingCooldown = 0.52;
          soundEngine.playBeeBuzz();
          nearestEnemy.provoked = true;
          if (nearestEnemy.kind === "boss" && nearestEnemy.state !== "stunned") {
            soundEngine.playArmorDeflect();
          } else {
            nearestEnemy.hp -= 1;
            nearestEnemy.hitFlashTimer = 0.18;
            if (nearestEnemy.kind !== "boss" && nearestEnemy.state === "idle") {
              nearestEnemy.state = "aggro";
            }
            if (nearestEnemy.hp <= 0) {
              handleEnemyDeath(nearestEnemy);
            } else {
              soundEngine.playEnemyHit(nearestEnemy.kind === "boss");
            }
          }
        }
      } else {
        // Orbit playfully around the Hero when no enemies are nearby
        const orbitAngle = stats.elapsedSeconds * 4.2;
        const targetX = hero.x + Math.cos(orbitAngle) * 1.35;
        const targetZ = hero.z + Math.sin(orbitAngle) * 1.35;
        const dx = targetX - bee.x;
        const dz = targetZ - bee.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          bee.facing = Math.atan2(dx, dz);
          bee.x += (dx / d) * Math.min(d, 8.5 * dt);
          bee.z += (dz / d) * Math.min(d, 8.5 * dt);
        }
      }

      remainingBees.push(bee);
    }
    friendlyBees = remainingBees;

    // 10. Update Enemies, Pathfinding & Weight-Balanced Combat Knockback
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.zone !== zone || enemy.state === "dead") continue;

      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      enemy.stateTimer = Math.max(0, enemy.stateTimer - dt);
      enemy.knockbackImmunityTimer = Math.max(0, enemy.knockbackImmunityTimer - dt);
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      enemy.actionCooldown = Math.max(0, enemy.actionCooldown - dt);

      const enemyRadius =
        enemy.kind === "boss" ? 1.35 : enemy.kind === "knight" ? 0.85 : 0.7;

      // Check if Boomerang hits this enemy -> provokes & aggroes them to fight back!
      if (boomerang && !boomerang.hitEnemyIds.includes(enemy.id)) {
        if (Math.hypot(enemy.x - boomerang.x, enemy.z - boomerang.z) <= enemyRadius + 0.65) {
          boomerang.hitEnemyIds.push(enemy.id);
          boomerang.returning = true;
          const isSanctumFoe =
            enemy.zone === "dungeon" && (enemy.kind === "boss" || enemy.spawnZ > 13);
          if (isSanctumFoe && !flags.bossAwakened) {
            soundEngine.playArmorDeflect();
          } else {
            enemy.provoked = true;
            if (enemy.kind === "boss") {
              soundEngine.playArmorDeflect();
            } else {
              enemy.hp -= 1;
              enemy.hitFlashTimer = 0.22;
              // Short stagger on ranged/heavy enemies so Goblin Archers & Knights immediately fight back!
              enemy.stunTimer =
                enemy.kind === "archer" ? 0.35 : enemy.kind === "knight" ? 0.2 : 0.75;
              if (enemy.state !== "stunned") {
                enemy.state = "aggro";
              }
              enemy.actionCooldown = Math.min(enemy.actionCooldown, 0.12);
              if (enemy.hp <= 0) {
                handleEnemyDeath(enemy);
                continue;
              } else {
                soundEngine.playEnemyHit(false);
              }
            }
          }
        }
      }

      // Check if Hero's active sword swing or 360° Charged Spin Attack hits this enemy
      const isSpin = hero.isSpinAttacking || hero.spinAttackTimer > 0;
      if (
        (hero.isAttacking || isSpin) &&
        (hero.attackTimer > 0.05 || hero.spinAttackTimer > 0.04) &&
        enemy.lastHitSwingId !== hero.swingId
      ) {
        const dx = enemy.x - hero.x;
        const dz = enemy.z - hero.z;
        const dist = Math.hypot(dx, dz);
        const reach = (isSpin ? 3.55 : 2.95) + enemyRadius;

        if (dist <= reach) {
          const angleToEnemy = Math.atan2(dx, dz);
          const angleDiff = Math.abs(normalizeAngleDiff(angleToEnemy, hero.facing));
          if (isSpin || angleDiff <= 1.35 || dist <= 1.35) {
            enemy.lastHitSwingId = hero.swingId;
            enemy.provoked = true;
            const strikeDamage = (hero.swordDamage || 1) * (isSpin ? 2 : 1);

            if (enemy.kind === "boss") {
              // Boss has weight 100 (immovable) — zero knockback ever!
              enemy.knockbackVx = 0;
              enemy.knockbackVz = 0;
              if (enemy.state !== "stunned") {
                soundEngine.playArmorDeflect();
                if (enemy.state !== "charge_lunge" && armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 4.0;
                  pushBanner(
                    "Malakor's Armor Deflects Your Blade!",
                    "Bait his telegraphed charge into a wall or pillar to stun him!",
                    3.6
                  );
                }
              } else {
                enemy.hp -= strikeDamage;
                enemy.hitFlashTimer = 0.22;

                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                  continue;
                } else {
                  soundEngine.playEnemyHit(true);
                }
              }
            } else {
              // Weight-based knockback system!
              // - Lightweight (weight <= 0.85: Purple/Pink Slimes 0.5 & Goblin Archers 0.6):
              //   Knocked back strongly (~15-17 impulse), no poise immunity, and windup is interrupted so sword spam keeps knocking them back!
              // - Medium weight (0.85 < weight < 4.0: Goblin Fighters 2.0 & Minions 2.2):
              //   Moderate knockback (~4.2 impulse, reduced to ~1.5 during poise/windup).
              // - Heavy weight (weight >= 4.0: Knights 12.0):
              //   Armored juggernaut — virtually zero knockback, and hitting him while he is ready triggers his telegraphed lunge windup!
              enemy.hp -= strikeDamage;
              enemy.hitFlashTimer = 0.22;

              const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
              const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);
              const w = Math.max(0.25, enemy.weight ?? getDefaultEnemyWeight(enemy.kind));

              let kbImpulse = 0;
              if (w >= 50) {
                kbImpulse = 0;
              } else if (w <= 0.85) {
                // Lightweight (Slimes & Goblin Archers): easily knocked back repeatedly!
                kbImpulse = (isSpin ? 10.2 : 8.6) / w;
                enemy.knockbackImmunityTimer = 0;
                if (enemy.state === "windup") {
                  enemy.state = "aggro";
                  enemy.stateTimer = 0.2;
                  enemy.actionCooldown = 0.45;
                }
              } else if (w >= 4.0 || enemy.kind === "knight") {
                // Heavy Sentinel Knights: shrug off knockback; if not stunned/recovering/attacking and off cooldown, begin full telegraphed windup!
                const inAttack = enemy.state === "windup" || enemy.state === "attack";
                kbImpulse = inAttack ? 0 : isSpin ? 0.45 : 0.22;
                enemy.knockbackImmunityTimer = 1.2;
                if (
                  (enemy.state === "idle" || enemy.state === "aggro") &&
                  enemy.actionCooldown <= 0.25
                ) {
                  enemy.state = "windup";
                  enemy.stateTimer = 0.78;
                  enemy.chargeAngle = Math.atan2(hero.x - enemy.x, hero.z - enemy.z);
                  enemy.facing = enemy.chargeAngle;
                  enemy.chargePathLength = computeEnemyChargePathLength(
                    enemy.x,
                    enemy.z,
                    enemy.chargeAngle,
                    enemyRadius,
                    5.8,
                    zone,
                    gatePassable,
                    dynamicObstacles,
                    bossExitOpen
                  );
                }
              } else {
                // Medium (Goblin Fighters & Minions): moderate knockback
                const hasPoise =
                  enemy.state === "windup" ||
                  enemy.state === "attack" ||
                  enemy.knockbackImmunityTimer > 0;
                kbImpulse = (hasPoise ? 2.4 : isSpin ? 10.2 : 8.4) / w;
                enemy.knockbackImmunityTimer = 0.65;
              }

              enemy.knockbackVx = kbDirX * kbImpulse;
              enemy.knockbackVz = kbDirZ * kbImpulse;

              if (enemy.state === "idle") {
                enemy.state = "aggro";
              }

              if (enemy.hp <= 0) {
                handleEnemyDeath(enemy);
                continue;
              } else {
                soundEngine.playEnemyHit(false);
              }
            }
          }
        }
      }

      // Boss Phase 2 Minion Summon at 50% HP (spawns 3 tougher Eclipse Minions!)
      if (
        enemy.kind === "boss" &&
        enemy.hp <= Math.ceil(enemy.maxHp / 2) &&
        !flags.bossPhase2
      ) {
        flags.bossPhase2 = true;
        soundEngine.playBossRoar();
        pushBanner(
          "Malakor Channels the Eclipse!",
          "Three Elite Shadow Minions rise to defend their master!",
          3.8
        );
        const wave2Coords = [
          { id: "dg-minion-wave2-1", x: -7.5, z: 27.5 },
          { id: "dg-minion-wave2-2", x: 7.5, z: 27.5 },
          { id: "dg-minion-wave2-3", x: 0, z: 29.5 },
        ];
        wave2Coords.forEach((wc) => {
          enemies.push({
            id: wc.id,
            kind: "minion",
            zone: "dungeon",
            x: wc.x,
            z: wc.z,
            spawnX: wc.x,
            spawnZ: wc.z,
            facing: Math.PI,
            hp: 5,
            maxHp: 5,
            weight: 2.2,
            state: "aggro",
            stateTimer: 0,
            hitFlashTimer: 0.2,
            knockbackImmunityTimer: 0,
            stunTimer: 0,
            lastHitSwingId: -1,
            knockbackVx: 0,
            knockbackVz: 0,
            aggroRadius: 15,
            speed: 5.7,
            damage: 1,
            rupeeDrop: "blue",
            provoked: true,
            chargeAngle: Math.PI,
            chargePathLength: 0,
            chargeDistanceTraveled: 0,
            actionCounter: 0,
            actionCooldown: 0,
          });
        });
      }

      const toHeroX = hero.x - enemy.x;
      const toHeroZ = hero.z - enemy.z;
      const distToHero = Math.hypot(toHeroX, toHeroZ);
      const isSanctumEnemy = enemy.zone === "dungeon" && enemy.spawnZ > 13;
      const enemyWeight = enemy.weight ?? getDefaultEnemyWeight(enemy.kind);

      // =====================================================
      // DEDICATED BOSS AI STATE MACHINE (WITH A* + STEERING PATHFINDING)
      // =====================================================
      if (enemy.kind === "boss") {
        if (enemy.state === "idle") {
          if (flags.bossAwakened || enemy.provoked) {
            enemy.state = "aggro";
            enemy.actionCooldown = 1.0;
          }
        } else if (enemy.state === "aggro") {
          let stalkVx = 0;
          let stalkVz = 0;
          if (distToHero > 2.45) {
            const nav = computePathfindingMoveDir(
              enemy.x,
              enemy.z,
              hero.x,
              hero.z,
              enemyRadius,
              zone,
              gatePassable,
              dynamicObstacles
            );
            stalkVx = nav.dirX * enemy.speed;
            stalkVz = nav.dirZ * enemy.speed;
            enemy.facing = nav.angle;
          } else if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }

          const nextBx = enemy.x + stalkVx * dt;
          const nextBz = Math.max(14.5, enemy.z + stalkVz * dt);
          const resolvedB = resolveWorldCollisions(
            nextBx,
            nextBz,
            enemyRadius,
            zone,
            gatePassable,
            dynamicObstacles,
            bossExitOpen
          );
          enemy.x = resolvedB.x;
          enemy.z = resolvedB.z;

          if (distToHero <= 2.15) {
            const pushX = distToHero > 0.01 ? (toHeroX / distToHero) * 10 : 0;
            const pushZ = distToHero > 0.01 ? (toHeroZ / distToHero) * 10 : -10;
            const angleToBoss = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
            damageHero(
              1,
              pushX,
              pushZ,
              false,
              false,
              angleToBoss,
              enemyWeight
            );
          }

          if (enemy.actionCooldown <= 0) {
            if (enemy.actionCounter % 2 === 0) {
              enemy.state = "lob_windup";
              enemy.stateTimer = 0.6;
              enemy.facing = Math.atan2(toHeroX, toHeroZ);
            } else {
              enemy.state = "charge_aim";
              enemy.stateTimer = 0.72;
              enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
              enemy.facing = enemy.chargeAngle;
              enemy.chargePathLength = computeBossChargePathLength(
                enemy.x,
                enemy.z,
                enemy.chargeAngle,
                enemyRadius,
                BOSS_MAX_LUNGE_RANGE,
                dynamicObstacles
              );
              soundEngine.playBossChargeAim();
            }
          }
        } else if (enemy.state === "lob_windup") {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          if (enemy.stateTimer <= 0) {
            soundEngine.playBossLob();
            const targetX = Math.max(-14.5, Math.min(14.5, hero.x));
            const targetZ = Math.max(15.0, Math.min(33.5, hero.z));
            projectiles.push({
              id: `proj-${stats.elapsedSeconds.toFixed(3)}-1`,
              zone: "dungeon",
              startX: enemy.x,
              startZ: enemy.z,
              targetX,
              targetZ,
              flightTime: 0,
              totalFlightTime: 1.15,
              aoeRadius: 3.3,
              directHitRadius: 1.45,
            });

            if (flags.bossPhase2) {
              const offsetAngle = enemy.facing + 0.45;
              const tX2 = Math.max(
                -14.5,
                Math.min(14.5, hero.x + Math.sin(offsetAngle) * 3.8)
              );
              const tZ2 = Math.max(
                15.0,
                Math.min(33.5, hero.z + Math.cos(offsetAngle) * 3.8)
              );
              projectiles.push({
                id: `proj-${stats.elapsedSeconds.toFixed(3)}-2`,
                zone: "dungeon",
                startX: enemy.x,
                startZ: enemy.z,
                targetX: tX2,
                targetZ: tZ2,
                flightTime: 0,
                totalFlightTime: 1.3,
                aoeRadius: 3.1,
                directHitRadius: 1.4,
              });
            }

            enemy.actionCounter += 1;
            enemy.state = "recover";
            enemy.stateTimer = 0.55;
            enemy.actionCooldown = 1.05;
          }
        } else if (enemy.state === "charge_aim") {
          if (distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
          enemy.chargePathLength = computeBossChargePathLength(
            enemy.x,
            enemy.z,
            enemy.chargeAngle,
            enemyRadius,
            BOSS_MAX_LUNGE_RANGE,
            dynamicObstacles
          );
          if (enemy.stateTimer <= 0) {
            enemy.state = "charge_lock";
            enemy.stateTimer = 0.55;
          }
        } else if (enemy.state === "charge_lock") {
          enemy.facing = enemy.chargeAngle;
          if (enemy.stateTimer <= 0) {
            enemy.state = "charge_lunge";
            enemy.chargeDistanceTraveled = 0;
            enemy.stateTimer = 1.25;
            soundEngine.playBossAttack();
          }
        } else if (enemy.state === "charge_lunge") {
          const lungeSpeed = 19.5;
          const stepDist = lungeSpeed * dt;
          enemy.chargeDistanceTraveled += stepDist;

          const nextBx = enemy.x + Math.sin(enemy.chargeAngle) * stepDist;
          const nextBz = enemy.z + Math.cos(enemy.chargeAngle) * stepDist;

          if (distToHero <= 2.3) {
            const forwardX = Math.sin(enemy.chargeAngle);
            const forwardZ = Math.cos(enemy.chargeAngle);
            const perpX = Math.cos(enemy.chargeAngle);
            const perpZ = -Math.sin(enemy.chargeAngle);
            const sideDot = toHeroX * perpX + toHeroZ * perpZ;
            const sideSign = Math.abs(sideDot) > 0.08 ? Math.sign(sideDot) : 1;

            const angleToBoss = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
            const lungeIncomingAngle = isFacingAttack(angleToBoss)
              ? angleToBoss
              : enemy.chargeAngle + Math.PI;
            const isBlockingLunge =
              hero.isBlocking && isFacingAttack(lungeIncomingAngle);

            if (isBlockingLunge) {
              // Blocking the Boss Lunge prevents the damage like regular, but sends the hero flying backwards uncontrollably!
              let launchDirX = forwardX + perpX * sideSign * 0.26;
              let launchDirZ = forwardZ + perpZ * sideSign * 0.26;
              const launchLen = Math.hypot(launchDirX, launchDirZ) || 1;
              launchDirX /= launchLen;
              launchDirZ /= launchLen;
              damageHero(
                enemy.damage,
                launchDirX * 28.5,
                launchDirZ * 28.5,
                false,
                true,
                lungeIncomingAngle,
                enemyWeight
              );
            } else {
              damageHero(
                enemy.damage,
                (forwardX + perpX * sideSign * 0.6) * 14,
                (forwardZ + perpZ * sideSign * 0.6) * 14,
                false,
                true,
                lungeIncomingAngle,
                enemyWeight
              );
            }
          }

          const hitSouthBarrier = nextBz - enemyRadius < 12.85;
          const resolvedB = resolveWorldCollisions(
            nextBx,
            Math.max(12.85 + enemyRadius, nextBz),
            enemyRadius,
            zone,
            gatePassable,
            dynamicObstacles,
            bossExitOpen
          );
          enemy.x = resolvedB.x;
          enemy.z = resolvedB.z;

          if (resolvedB.hitObstacle || hitSouthBarrier) {
            soundEngine.playBossWallCrash();
            enemy.state = "stunned";
            enemy.stateTimer = 3.3;
            enemy.actionCounter += 1;
            enemy.actionCooldown = 1.1;
            pushBanner(
              "Malakor Crashed into the Wall!",
              "His obsidian armor is shattered — strike him now!",
              3.2
            );
          } else if (
            enemy.chargeDistanceTraveled >= BOSS_MAX_LUNGE_RANGE ||
            enemy.stateTimer <= 0
          ) {
            enemy.state = "recover";
            enemy.stateTimer = 0.6;
            enemy.actionCounter += 1;
            enemy.actionCooldown = 1.1;
          }
        } else if (enemy.state === "stunned") {
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.85;
          }
        } else if (enemy.state === "recover") {
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
          }
        }

        // Prevent Boss from overlapping/stacking directly on top of the player
        const bDx = enemy.x - hero.x;
        const bDz = enemy.z - hero.z;
        const bDist = Math.hypot(bDx, bDz);
        const minBossSep = 1.9;
        if (bDist < minBossSep && enemy.state !== "charge_lunge") {
          const pushOutX = bDist > 0.01 ? bDx / bDist : -Math.sin(hero.facing);
          const pushOutZ = bDist > 0.01 ? bDz / bDist : -Math.cos(hero.facing);
          const sepB = resolveWorldCollisions(
            hero.x + pushOutX * minBossSep,
            Math.max(14.5, hero.z + pushOutZ * minBossSep),
            enemyRadius,
            zone,
            gatePassable,
            dynamicObstacles,
            bossExitOpen
          );
          enemy.x = sepB.x;
          enemy.z = sepB.z;
        }

        continue;
      }

      // If stunned by Hero's Boomerang, hold position briefly then resume aggro
      if (enemy.stunTimer > 0) {
        const nextEx = enemy.x + enemy.knockbackVx * dt;
        const nextEz = enemy.z + enemy.knockbackVz * dt;
        enemy.knockbackVx *= Math.exp(-10 * dt);
        enemy.knockbackVz *= Math.exp(-10 * dt);
        const resolvedStun = resolveWorldCollisions(
          nextEx,
          nextEz,
          enemyRadius,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        enemy.x = resolvedStun.x;
        enemy.z = resolvedStun.z;
        continue;
      }

      // =====================================================
      // GOBLIN ARCHER RANGED AI STATE MACHINE
      // =====================================================
      if (enemy.kind === "archer") {
        let moveVx = 0;
        let moveVz = 0;

        if (enemy.state === "idle") {
          const canAggro = !isSanctumEnemy || flags.bossAwakened;
          if (enemy.provoked || (canAggro && distToHero <= enemy.aggroRadius)) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.25;
          }
        } else if (enemy.state === "aggro") {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          if (distToHero < 4.5 && distToHero > 0.05) {
            const kiteTargetX = enemy.x - (toHeroX / distToHero) * 4.0;
            const kiteTargetZ = enemy.z - (toHeroZ / distToHero) * 4.0;
            const nav = computePathfindingMoveDir(
              enemy.x,
              enemy.z,
              kiteTargetX,
              kiteTargetZ,
              enemyRadius,
              zone,
              gatePassable,
              dynamicObstacles
            );
            moveVx = nav.dirX * (enemy.speed * 0.85);
            moveVz = nav.dirZ * (enemy.speed * 0.85);
          } else if (distToHero > 8.2) {
            const nav = computePathfindingMoveDir(
              enemy.x,
              enemy.z,
              hero.x,
              hero.z,
              enemyRadius,
              zone,
              gatePassable,
              dynamicObstacles
            );
            moveVx = nav.dirX * enemy.speed;
            moveVz = nav.dirZ * enemy.speed;
          }

          if (enemy.actionCooldown <= 0 && (distToHero <= 16.5 || enemy.provoked)) {
            enemy.state = "windup";
            enemy.stateTimer = 0.55;
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
        } else if (enemy.state === "windup") {
          if (distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
          if (enemy.stateTimer <= 0) {
            soundEngine.playBowShoot();
            arrows.push({
              id: `enemy-arrow-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              fromHero: false,
              x: enemy.x + Math.sin(enemy.facing) * 0.8,
              z: enemy.z + Math.cos(enemy.facing) * 0.8,
              angle: enemy.facing,
              speed: 14.0,
              damage: enemy.damage,
              lifeTimer: 1.8,
            });
            enemy.state = "recover";
            enemy.stateTimer = 0.45;
            enemy.actionCooldown = 1.35;
          }
        } else if (enemy.state === "recover") {
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
          }
        }

        const nextEx = enemy.x + (moveVx + enemy.knockbackVx) * dt;
        const nextEz = enemy.z + (moveVz + enemy.knockbackVz) * dt;
        enemy.knockbackVx *= Math.exp(-10 * dt);
        enemy.knockbackVz *= Math.exp(-10 * dt);
        const resolvedArcher = resolveWorldCollisions(
          nextEx,
          nextEz,
          enemyRadius,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        enemy.x = resolvedArcher.x;
        enemy.z = resolvedArcher.z;
        continue;
      }

      // =====================================================
      // STANDARD MELEE ENEMY AI (Slime, Goblin, Knight, Minion)
      // =====================================================
      let moveVx = 0;
      let moveVz = 0;
      const wasAttacking = enemy.state === "attack";

      if (enemy.state === "idle") {
        const patrolAngle = stats.elapsedSeconds * 1.2 + i * 1.7;
        const targetX = enemy.spawnX + Math.cos(patrolAngle) * 1.1;
        const targetZ = enemy.spawnZ + Math.sin(patrolAngle) * 1.1;
        const dx = targetX - enemy.x;
        const dz = targetZ - enemy.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          moveVx = (dx / d) * (enemy.speed * 0.35);
          moveVz = (dz / d) * (enemy.speed * 0.35);
          enemy.facing = Math.atan2(moveVx, moveVz);
        }

        const canAggro = !isSanctumEnemy || flags.bossAwakened;
        if (enemy.provoked || (canAggro && distToHero <= enemy.aggroRadius)) {
          enemy.state = "aggro";
          enemy.actionCooldown = 0.25;
        }
      } else if (enemy.state === "aggro") {
        if (!enemy.provoked && !isSanctumEnemy && distToHero > enemy.aggroRadius * 2.5) {
          enemy.state = "idle";
        } else {
          // Personal-space standoff distance prevents enemies from walking right onto the player's center when blocking!
          const standOffDist =
            enemy.kind === "knight" ? 1.95 : enemy.kind === "goblin" ? 1.72 : 1.55;

          if (distToHero > standOffDist) {
            const nav = computePathfindingMoveDir(
              enemy.x,
              enemy.z,
              hero.x,
              hero.z,
              enemyRadius,
              zone,
              gatePassable,
              dynamicObstacles
            );
            enemy.facing = nav.angle;
            moveVx = nav.dirX * enemy.speed;
            moveVz = nav.dirZ * enemy.speed;
          } else if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
            if (distToHero < standOffDist - 0.22) {
              moveVx = -(toHeroX / distToHero) * 2.4;
              moveVz = -(toHeroZ / distToHero) * 2.4;
            }
          }

          if (distToHero <= (enemy.kind === "knight" ? 1.65 : 1.38)) {
            const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(enemy.facing);
            const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(enemy.facing);
            const angleToEnemy = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
            const hitRes = damageHero(
              enemy.damage,
              pushDirX * 10,
              pushDirZ * 10,
              false,
              false,
              angleToEnemy,
              enemyWeight
            );
            if (hitRes.blocked) {
              enemy.knockbackVx = -pushDirX * (enemy.kind === "knight" ? 3.2 : 5.6);
              enemy.knockbackVz = -pushDirZ * (enemy.kind === "knight" ? 3.2 : 5.6);
              enemy.actionCooldown = Math.max(enemy.actionCooldown, 0.35);
            }
          }

          const triggerAttackDist =
            enemy.kind === "knight" ? 3.35 : enemy.kind === "goblin" ? 3.05 : 2.1;
          if (distToHero <= triggerAttackDist && enemy.actionCooldown <= 0) {
            enemy.state = "windup";
            enemy.chargeDistanceTraveled = 0;
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
            if (enemy.kind === "knight") {
              // Sentinel Knight: slightly faster 0.78s telegraphed windup with ground corridor!
              enemy.stateTimer = 0.78;
              enemy.chargePathLength = computeEnemyChargePathLength(
                enemy.x,
                enemy.z,
                enemy.chargeAngle,
                enemyRadius,
                5.8,
                zone,
                gatePassable,
                dynamicObstacles,
                bossExitOpen
              );
            } else if (enemy.kind === "goblin") {
              // Goblin Fighter: slightly faster 0.72s telegraphed lunge windup with ground corridor!
              enemy.stateTimer = 0.72;
              enemy.chargePathLength = computeEnemyChargePathLength(
                enemy.x,
                enemy.z,
                enemy.chargeAngle,
                enemyRadius,
                5.2,
                zone,
                gatePassable,
                dynamicObstacles,
                bossExitOpen
              );
            } else {
              // Slime / Minion: 0.55s windup so charges are readable and fair
              enemy.stateTimer = 0.55;
              enemy.chargePathLength = 4.2;
            }
          }
        }
      } else if (enemy.state === "windup") {
        // Monsters stand still while charging up their lunge and lock their ground telegraph before firing!
        moveVx = 0;
        moveVz = 0;
        if (enemy.kind === "knight") {
          // Track player for the first 0.20s, then lock the ground telegraph corridor for 0.58s!
          if (enemy.stateTimer > 0.58 && distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
          }
          enemy.facing = enemy.chargeAngle;
          enemy.chargePathLength = computeEnemyChargePathLength(
            enemy.x,
            enemy.z,
            enemy.chargeAngle,
            enemyRadius,
            5.8,
            zone,
            gatePassable,
            dynamicObstacles,
            bossExitOpen
          );
        } else if (enemy.kind === "goblin") {
          // Track player for the first 0.18s, then lock the ground telegraph corridor for 0.54s!
          if (enemy.stateTimer > 0.54 && distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
          }
          enemy.facing = enemy.chargeAngle;
          enemy.chargePathLength = computeEnemyChargePathLength(
            enemy.x,
            enemy.z,
            enemy.chargeAngle,
            enemyRadius,
            5.2,
            zone,
            gatePassable,
            dynamicObstacles,
            bossExitOpen
          );
        } else {
          if (enemy.stateTimer > 0.38 && distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
          }
          enemy.facing = enemy.chargeAngle;
        }

        if (enemy.stateTimer <= 0) {
          enemy.state = "attack";
          enemy.chargeDistanceTraveled = 0;
          enemy.stateTimer =
            enemy.kind === "knight" ? 0.43 : enemy.kind === "goblin" ? 0.41 : 0.34;
        }
      } else if (enemy.state === "attack") {
        const lungeAngle = enemy.chargeAngle;
        enemy.facing = lungeAngle;
        const lungeSpeed =
          enemy.kind === "knight"
            ? 13.8
            : enemy.kind === "goblin"
            ? 13.0
            : 10.5;
        moveVx = Math.sin(lungeAngle) * lungeSpeed;
        moveVz = Math.cos(lungeAngle) * lungeSpeed;
        enemy.chargeDistanceTraveled =
          (enemy.chargeDistanceTraveled || 0) + lungeSpeed * dt;

        const hitDist = enemy.kind === "knight" ? 2.15 : 1.55;
        if (distToHero <= hitDist) {
          const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(lungeAngle);
          const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(lungeAngle);
          const angleToEnemy = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
          const hitRes = damageHero(
            enemy.damage,
            pushDirX * 11.5,
            pushDirZ * 11.5,
            false,
            false,
            angleToEnemy,
            enemyWeight
          );
          if (hitRes.blocked) {
            // Blocking a lunge stops the monster's charge and forces them into recovery pause
            enemy.state = "recover";
            enemy.stateTimer =
              enemy.kind === "knight" ? 0.86 : enemy.kind === "goblin" ? 0.74 : 0.68;
            enemy.actionCooldown =
              enemy.kind === "knight" ? 1.1 : enemy.kind === "goblin" ? 0.92 : 0.85;
            moveVx = 0;
            moveVz = 0;
            enemy.knockbackVx = -pushDirX * (enemy.kind === "knight" ? 3.8 : 6.8);
            enemy.knockbackVz = -pushDirZ * (enemy.kind === "knight" ? 3.8 : 6.8);
          }
        }

        if (enemy.state === "attack" && enemy.stateTimer <= 0) {
          // Missed charge without hitting a wall: monster pauses in recovery (slightly shorter pause) before chasing again!
          enemy.state = "recover";
          enemy.stateTimer =
            enemy.kind === "knight" ? 0.92 : enemy.kind === "goblin" ? 0.76 : 0.72;
          enemy.actionCooldown =
            enemy.kind === "knight" ? 1.12 : enemy.kind === "goblin" ? 0.96 : 0.9;
          moveVx = 0;
          moveVz = 0;
        }
      } else if (enemy.state === "stunned") {
        // Wall-crash stun: completely unable to move or attack while dizzy stars spin overhead!
        moveVx = 0;
        moveVz = 0;
        if (enemy.stateTimer <= 0) {
          enemy.state = "aggro";
          enemy.actionCooldown = 0.85;
        }
      } else if (enemy.state === "recover") {
        // Post-charge pause: monster catches its breath and cannot move or attack
        moveVx = 0;
        moveVz = 0;
        if (enemy.stateTimer <= 0) {
          enemy.state = "aggro";
        }
      }

      // Soft separation between nearby enemies
      if (enemy.state !== "stunned" && enemy.state !== "recover" && enemy.state !== "windup") {
        for (let j = 0; j < enemies.length; j++) {
          if (i === j) continue;
          const other = enemies[j];
          if (other.zone !== zone || other.state === "dead") continue;
          const sx = enemy.x - other.x;
          const sz = enemy.z - other.z;
          const sDist = Math.hypot(sx, sz);
          const minSep = enemyRadius + (other.kind === "boss" ? 1.35 : 0.75);
          if (sDist > 0.01 && sDist < minSep) {
            const push = (minSep - sDist) * 3.0;
            moveVx += (sx / sDist) * push;
            moveVz += (sz / sDist) * push;
          }
        }
      }

      const nextEx = enemy.x + (moveVx + enemy.knockbackVx) * dt;
      const nextEz = enemy.z + (moveVz + enemy.knockbackVz) * dt;
      enemy.knockbackVx *= Math.exp(-10 * dt);
      enemy.knockbackVz *= Math.exp(-10 * dt);

      const resolvedEnemy = resolveWorldCollisions(
        nextEx,
        nextEz,
        enemyRadius,
        zone,
        gatePassable,
        dynamicObstacles,
        bossExitOpen
      );
      enemy.x = resolvedEnemy.x;
      enemy.z = resolvedEnemy.z;

      // If a charging monster collides with a wall, pillar, boulder, tree, or gate during its lunge -> STUNNED!
      if (wasAttacking && resolvedEnemy.hitObstacle) {
        soundEngine.playBossWallCrash();
        enemy.state = "stunned";
        enemy.stateTimer =
          enemy.kind === "knight" ? 2.1 : enemy.kind === "goblin" ? 1.78 : 1.55;
        enemy.actionCooldown = 1.1;
        enemy.knockbackVx = -Math.sin(enemy.chargeAngle) * 3.2;
        enemy.knockbackVz = -Math.cos(enemy.chargeAngle) * 3.2;
      }

      // Enforce Hero-Enemy Personal Space so enemies never walk up and stack directly on top of the player!
      const hDx = enemy.x - hero.x;
      const hDz = enemy.z - hero.z;
      const hDist = Math.hypot(hDx, hDz);
      const minHeroSep = enemy.kind === "knight" ? 1.48 : 1.32;
      if (hDist < minHeroSep) {
        const pushOutX = hDist > 0.01 ? hDx / hDist : -Math.sin(hero.facing);
        const pushOutZ = hDist > 0.01 ? hDz / hDist : -Math.cos(hero.facing);
        const sepResolved = resolveWorldCollisions(
          hero.x + pushOutX * minHeroSep,
          hero.z + pushOutZ * minHeroSep,
          enemyRadius,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        enemy.x = sepResolved.x;
        enemy.z = sepResolved.z;
      }
    }

    // 10b. Sync arrows stuck in enemies or the hero's shield to their host's updated position & facing
    arrows = arrows.filter((arrow) => {
      if (!arrow.stuck) return true;
      if (arrow.stuckInShield) {
        arrow.x = hero.x + Math.sin(hero.facing) * 0.56;
        arrow.z = hero.z + Math.cos(hero.facing) * 0.56;
        arrow.angle = hero.facing + Math.PI + (arrow.stuckShieldYaw ?? 0);
        return true;
      }
      if (!arrow.stuckEnemyId) return true;
      const host = enemies.find((e) => e.id === arrow.stuckEnemyId);
      if (!host || host.zone !== zone || host.state === "dead") {
        return false;
      }
      const cosF = Math.cos(host.facing);
      const sinF = Math.sin(host.facing);
      const lx = arrow.stuckLocalX ?? 0;
      const lz = arrow.stuckLocalZ ?? 0;
      arrow.x = host.x + lx * cosF + lz * sinF;
      arrow.z = host.z - lx * sinF + lz * cosF;
      arrow.angle = host.facing + (arrow.stuckLocalAngle ?? 0);
      return true;
    });

    // 11. Check if Boss and all Sanctum Minions are defeated
    if (!flags.bossDefeated) {
      const bossEnemy = enemies.find((e) => e.kind === "boss");
      const aliveSanctumMinions = enemies.filter(
        (e) => e.zone === "dungeon" && e.kind === "minion" && e.state !== "dead"
      );
      if (bossEnemy && bossEnemy.state === "dead" && aliveSanctumMinions.length === 0) {
        flags.bossDefeated = true;
        soundEngine.playGateUnlock();
        pushBanner(
          "Dread Warden Malakor Vanquished!",
          "The Northern Sanctum Exit unseals to the Elderwood Frontier, and the Golden Chest is unlocked!",
          6.0
        );
      }
    }

    // 12. Rupee & Recovery Heart Magnet & Pickup (waits until initial pop-up bounce settles so player sees drops!)
    for (const rupee of rupees) {
      if (rupee.zone !== zone || rupee.collected) continue;
      if ((rupee.spawnBounceTimer ?? 0) > 0.14) continue;
      const dx = hero.x - rupee.x;
      const dz = hero.z - rupee.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.6 && dist > 0.05) {
        rupee.x += (dx / dist) * 7.5 * dt;
        rupee.z += (dz / dist) * 7.5 * dt;
      }
      if (dist < 1.25) {
        rupee.collected = true;
        if (rupee.tier === "heart") {
          hero.hp = Math.min(hero.maxHp, hero.hp + (rupee.value || 2));
        } else {
          hero.rupees += rupee.value;
        }
        soundEngine.playRupeePickup(rupee.tier);
      }
    }

    // 13. Boss Chest Unlock → Rewards Zeldo Crest (+1 Heart Container & +50 Rupees) while keeping gameplay active so player can explore the Elderwood Frontier!
    if (zone === "dungeon" && !flags.chestUnlocked) {
      const distToChest = Math.hypot(
        hero.x - BOSS_CHEST_POS.x,
        hero.z - BOSS_CHEST_POS.z
      );
      if (distToChest < 2.5) {
        if (flags.bossDefeated) {
          flags.chestUnlocked = true;
          hero.maxHp += 2;
          hero.hp = hero.maxHp;
          hero.rupees += 50;
          soundEngine.playVictoryFanfare();
          pushBanner(
            "The Zeldo Crest is Yours! (+1 Heart & +50 Rupees)",
            "Journey through the open Northern Sanctum Gate into the Elderwood Frontier!",
            7.5
          );
        } else if (chestNoticeCooldown <= 0) {
          chestNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "Sealed by the Warden's Curse!",
            "Defeat Malakor and his minions to unlock the Sanctum Chest.",
            3.5
          );
        }
      }
    }

    set({
      phase,
      zone,
      dungeonRoom,
      hero,
      enemies,
      boomerang,
      arrows,
      fireballs,
      fireZones,
      friendlyBees,
      projectiles,
      hazards,
      rupees,
      cutBushIds,
      lootedBushIds,
      bushRupeesEarned,
      bushBursts,
      flags,
      stats,
      banner,
      nearShop,
      shopOpen,
      shopDismissedOnRug,
      gateNoticeCooldown,
      chestNoticeCooldown,
      armorNoticeCooldown,
      ...(mapPropsMutated ? { mapProps } : {}),
    });
  },
}));
