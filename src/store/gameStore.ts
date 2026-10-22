import { create } from "zustand";
import {
  BIG_KEY_CHEST_POS,
  BOSS_CHEST_POS,
  BOSS_EXIT_GATE_POS,
  BOSS_MAX_LUNGE_RANGE,
  BossArmorState,
  buildInitialMapProps,
  buildObstaclesFromMapProps,
  BuriedRewardKind,
  CAVERN_CREST_KEY_POS,
  CAVERN_SHOVEL_CHEST_POS,
  CITADEL_ARMORY_CHEST_POS,
  CITADEL_BOSS_GATE_POS,
  CITADEL_EXIT_GATE_POS,
  CITADEL_VICTORY_CHEST_POS,
  computeBossChargePathLength,
  computeEnemyChargePathLength,
  computePathfindingMoveDir,
  CRYPT_SHORTCUT_DOOR_POS,
  CustomModelAsset,
  DG_SMALL_KEY_POS,
  DUNGEON_ENTRY_GATE_POS,
  DUNGEON_KEY_POS,
  DungeonRoomId,
  EAST_WING_DOOR_POS,
  EnemyKind,
  EnemyShieldArmor,
  FIRE_ROD_CHEST_POS,
  FRONTIER_BOMB_CHEST_POS,
  FRONTIER_CITADEL_GATE_POS,
  FRONTIER_SAPPER_NPC_POS,
  getDefaultEnemyWeight,
  GUIDE_NPC_POS,
  HEIRLOOM_NPC_POS,
  HERO_SPAWN,
  INITIAL_ENEMIES,
  INITIAL_PORTALS,
  INITIAL_WORLD_RUPEES,
  LOCKED_GATE_POS,
  MapPortal,
  MapPropInstance,
  PotRewardKind,
  PropPrefabId,
  resolveArrowCollisions,
  resolveWorldCollisions,
  RupeeTier,
  SECRET_STASH_POS,
  SHOP_INTERACT_POS,
  ZoneId,
} from "@/game/worldData";
import { soundEngine } from "@/audio/soundEngine";

export type GamePhase = "title" | "playing" | "gameover" | "victory";
export type ShopItemId =
  | "counter_hearts"
  | "counter_ammo_magic"
  | "counter_progression_upgrade"
  | "heart_container"
  | "boomerang"
  | "bow"
  | "arrows"
  | "bomb_bag"
  | "bombs"
  | "shovel"
  | "fire_rod"
  | "swift_boots"
  | "titan_greaves"
  | "mirror_shield"
  | "tempered_blade"
  | "blue_mail"
  | "red_mail"
  | "heart"
  | "red_potion"
  | "green_potion"
  | "blue_potion"
  | "fairy"
  | "bee"
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

export interface HeldObjectState {
  kind: "clay_pot" | "light_rock" | "bomb";
  propId?: string;
  potReward?: PotRewardKind;
  fuseTimer?: number;
  maxFuseTimer?: number;
}

export interface ThrownObjectState {
  id: string;
  kind: "clay_pot" | "light_rock";
  zone: ZoneId;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  x: number;
  z: number;
  y: number;
  flightTime: number;
  totalFlightTime: number;
  potReward?: PotRewardKind;
}

export interface BombProjectileState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  fuseTimer: number;
  maxFuseTimer: number;
  exploded?: boolean;
  explosionTimer?: number;
}

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
  bombs: number;
  maxBombs: number;
  heldObject: HeldObjectState | null;
  pushTimer: number;
  pushTargetPropId: string | null;
  interactPrompt: string | null;
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
  shieldArmor?: EnemyShieldArmor;
  initialShieldArmor?: EnemyShieldArmor;
  shockArmor?: boolean;
  initialShockArmor?: boolean;
  isBounty?: boolean;
  initialIsBounty?: boolean;
  questGroup?:
    | "heirloom"
    | "grove_ambush"
    | "ember_guards"
    | "frontier_sappers"
    | "cavern_wardens";
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
  carriedRupeeIds?: string[];
  carryingKey?: boolean;
  carryingDgSmallKey?: boolean;
  carryingGlacialKey?: boolean;
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
  isRock?: boolean;
  deflectedRock?: boolean;
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
  isCeramic?: boolean;
  isRock?: boolean;
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
  overworldTimedTorchSolved?: boolean;
  dungeonTimedTorchSolved?: boolean;
  overworldCrystalPuzzleSolved?: boolean;
  dungeonCrystalPuzzleSolved?: boolean;
  frontierCrystalPuzzleSolved?: boolean;
  cavernsCrystalPuzzleSolved?: boolean;
  dungeonEyeStatuesSolved?: boolean;
  secretStashClaimed?: boolean;
  heirloomQuestStarted?: boolean;
  heirloomMonstersCleared?: boolean;
  heirloomQuestClaimed?: boolean;
  shopProgressionBought?: boolean;
  dungeonEntryUnlocked?: boolean;
  grovePuzzleSolved?: boolean;
  bossHeartAwarded?: boolean;
  eastExitBurned?: boolean;
  // 5-Room Cross Dungeon Progression Flags
  hasSmallKey?: boolean;
  dgSmallKeyPickedUp?: boolean;
  eastWingDoorUnlocked?: boolean;
  eastWingArenaLocked?: boolean;
  eastWingCleared?: boolean;
  fireRodChestOpened?: boolean;
  hasFireRod?: boolean;
  webBarrierBurned?: boolean;
  hasBigKey?: boolean;
  bigKeyChestOpened?: boolean;
  bossState?: BossArmorState;
  bossArmorTimer?: number;
  // Map 3 (Frontier), Map 4 (Frostpeak Caverns) & Map 5 (Obsidian Citadel) Progression Flags
  frontierSappersCleared?: boolean;
  frontierBombChestOpened?: boolean;
  frontierCitadelGateUnlocked?: boolean;
  cavernWardensCleared?: boolean;
  cavernEyeSolved?: boolean;
  cavernShovelChestOpened?: boolean;
  cavernCrestKeyPickedUp?: boolean;
  hasGlacialKey?: boolean;
  citadelArmoryChestOpened?: boolean;
  citadelTimedTorchSolved?: boolean;
  citadelEyeStatuesSolved?: boolean;
  citadelGateUnlocked?: boolean;
  citadelBossAwakened?: boolean;
  citadelBossPhase2?: boolean;
  citadelBossDefeated?: boolean;
  citadelBossHeartAwarded?: boolean;
  citadelVictoryChestOpened?: boolean;
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
  interactPressed?: boolean;
  bombPressed?: boolean;
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
  thrownObjects: ThrownObjectState[];
  activeBombs: BombProjectileState[];
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
    shieldArmor: spawn.shieldArmor ?? "none",
    initialShieldArmor: spawn.shieldArmor ?? "none",
    shockArmor: spawn.shockArmor ?? false,
    initialShockArmor: spawn.shockArmor ?? false,
    isBounty: spawn.isBounty ?? false,
    initialIsBounty: spawn.isBounty ?? false,
    questGroup: spawn.questGroup,
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
    dungeonRoom: "hub",
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
      hasBoomerang: true,
      hasBow: true,
      hasFireRod: false,
      hasShovel: false,
      arrows: 20,
      bombs: 0,
      maxBombs: 0,
      heldObject: null,
      pushTimer: 0,
      pushTargetPropId: null,
      interactPrompt: null,
      equippedPrimary: "traveler_blade",
      equippedOffhand: "wooden_buckler",
      equippedTunic: "green_tunic",
      equippedBoots: "leather_boots",
      unlockedPrimaries: ["traveler_blade"],
      unlockedOffhands: ["wooden_buckler"],
      unlockedTunics: ["green_tunic"],
      unlockedBoots: ["leather_boots"],
      bottles: [],
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
    thrownObjects: [],
    activeBombs: [],
    projectiles: [],
    // Persistent floor spike traps in Room 4 (The Dark Archery Crypt) so lighting the 4 Corner Lanterns reveals the floor hazards!
    hazards: [
      {
        id: "dg-crypt-trap-w",
        zone: "dungeon",
        x: 22.5,
        z: -26.5,
        radius: 1.75,
        timer: 999999,
        maxTimer: 999999,
      },
      {
        id: "dg-crypt-trap-e",
        zone: "dungeon",
        x: 29.5,
        z: -26.5,
        radius: 1.75,
        timer: 999999,
        maxTimer: 999999,
      },
    ],
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
      grove: {},
      dungeon: {},
      frontier: {},
      caverns: {},
      citadel: {},
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
      overworldTimedTorchSolved: false,
      dungeonTimedTorchSolved: false,
      overworldCrystalPuzzleSolved: false,
      dungeonCrystalPuzzleSolved: false,
      frontierCrystalPuzzleSolved: false,
      cavernsCrystalPuzzleSolved: false,
      dungeonEyeStatuesSolved: false,
      secretStashClaimed: false,
      heirloomQuestStarted: false,
      heirloomMonstersCleared: false,
      heirloomQuestClaimed: false,
      shopProgressionBought: false,
      dungeonEntryUnlocked: false,
      grovePuzzleSolved: false,
      bossHeartAwarded: false,
      eastExitBurned: false,
      hasSmallKey: false,
      dgSmallKeyPickedUp: false,
      eastWingDoorUnlocked: false,
      eastWingArenaLocked: false,
      eastWingCleared: false,
      fireRodChestOpened: false,
      hasFireRod: false,
      webBarrierBurned: false,
      hasBigKey: false,
      bigKeyChestOpened: false,
      bossState: "ARMORED",
      bossArmorTimer: 0,
      frontierSappersCleared: false,
      frontierBombChestOpened: false,
      frontierCitadelGateUnlocked: false,
      cavernWardensCleared: false,
      cavernEyeSolved: false,
      cavernShovelChestOpened: false,
      cavernCrestKeyPickedUp: false,
      hasGlacialKey: false,
      citadelArmoryChestOpened: false,
      citadelTimedTorchSolved: false,
      citadelEyeStatuesSolved: false,
      citadelGateUnlocked: false,
      citadelBossAwakened: false,
      citadelBossPhase2: false,
      citadelBossDefeated: false,
      citadelBossHeartAwarded: false,
      citadelVictoryChestOpened: false,
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
            text: "Map 1: Whispering Crossroads (Act I — The Adventure Begins)",
            subtext:
              "West Exit -> Map 1B Grove (Sanctum Key) • North -> Map 2 Dungeon (Flame Rod) • East -> Map 3 Frontier (Bombs) • Map 4 Caverns (Shovel) • Map 5 Citadel!",
            timer: 6.5,
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

const MAP_STORAGE_KEY = "zeldo-authored-map-v9";

function resetPropForPlaySession(p: MapPropInstance): MapPropInstance {
  if (p.prefab === "dirt_patch") {
    return { ...p, dug: false };
  }
  if (p.prefab === "clay_pot" || p.prefab === "light_rock" || p.prefab === "cracked_rock") {
    return { ...p, smashed: false, hasCollider: true };
  }
  if (p.prefab === "briar_barrier" || p.prefab === "spiderweb_barrier") {
    return { ...p, smashed: false, hasCollider: true, burningTimer: 0 };
  }
  if (p.prefab === "crystal_switch") {
    return { ...p, switchState: "blue", hitCooldown: 0 };
  }
  if (p.prefab === "crystal_barrier") {
    return { ...p, hasCollider: true, y: 0 };
  }
  if (p.prefab === "eye_statue") {
    return { ...p, eyeActivated: false };
  }
  if (p.prefab === "push_block") {
    return { ...p, slideTimer: 0 };
  }
  if (p.timedDuration && p.timedDuration > 0) {
    return { ...p, lit: false, litTimer: 0, timedSolved: false };
  }
  if (
    p.zone === "dungeon" &&
    p.prefab === "wall_torch" &&
    (p.id.startsWith("prop-dg-crypt-torch") ||
      p.id.startsWith("prop-dg-boss-torch") ||
      p.id.startsWith("prop-dg-puzzle-torch"))
  ) {
    return { ...p, lit: false };
  }
  if (p.puzzleTarget) {
    return { ...p, lit: false };
  }
  return p;
}

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
      .filter((e) => !e.id.startsWith("dg-minion-wave2-") && !e.id.startsWith("ct-minion-wave2-"))
      .map((e) => ({
        ...e,
        x: e.spawnX,
        z: e.spawnZ,
        hp: e.maxHp,
        shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
        shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
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
      version: 7,
      mapProps: state.mapProps.map(resetPropForPlaySession),
      enemies: cleanEnemies,
      rupees: cleanRupees,
      portals: state.portals,
      customModels: state.customModels,
      terrainCells: {
        overworld: state.terrainCells.overworld ?? {},
        grove: state.terrainCells.grove ?? {},
        dungeon: state.terrainCells.dungeon ?? {},
        frontier: state.terrainCells.frontier ?? {},
        caverns: state.terrainCells.caverns ?? {},
        citadel: state.terrainCells.citadel ?? {},
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
  clay_pot: { label: "Liftable Clay Pot", hasCollider: true, w: 1.15, d: 1.15, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  light_rock: { label: "Liftable Light Rock", hasCollider: true, w: 1.25, d: 1.25, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  push_block: { label: "Pushable Stone Block", hasCollider: true, w: 1.9, d: 1.9, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  crystal_switch: { label: "Crystal Switch Orb", hasCollider: true, w: 1.2, d: 1.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  crystal_barrier: { label: "Crystal Barrier Pillar", hasCollider: true, w: 1.8, d: 1.8, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  cracked_rock: { label: "Explodable Cracked Rock", hasCollider: true, w: 2.3, d: 2.3, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  briar_barrier: { label: "Dry Briar Barrier (Burnable)", hasCollider: true, w: 2.8, d: 1.6, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "tree" },
  spiderweb_barrier: { label: "Thick Spiderweb Barrier (Burnable)", hasCollider: true, w: 5.0, d: 1.6, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "wall" },
  eye_statue: { label: "Sanctum Eye Statue (Bow Target)", hasCollider: true, w: 1.6, d: 1.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "wall" },
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
      mapProps: state.mapProps.map(resetPropForPlaySession),
      enemies: state.enemies
        .filter((e) => !e.id.startsWith("dg-minion-wave2-"))
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
          shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
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
      mapProps: state.mapProps.map(resetPropForPlaySession),
      enemies: state.enemies
        .filter((e) => !e.id.startsWith("dg-minion-wave2-"))
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
          shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
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
        if (!hero.unlockedPrimaries.includes(pId)) {
          soundEngine.playGateLocked();
          return {
            banner: {
              id: Date.now() + Math.floor(Math.random() * 1000),
              text: "Weapon Locked!",
              subtext: "Purchase the Tempered Sun-Blade (500 Rupees) or Champion's Set (600 Rupees) at Bramble's Shop!",
              timer: 3.6,
            },
          };
        }
        hero.equippedPrimary = pId;
        hero.swordDamage = pId === "tempered_blade" ? 2 : 1;
        label = pId === "tempered_blade" ? "Equipped Tempered Sun-Blade" : "Equipped Traveler's Sword";
        desc =
          pId === "tempered_blade"
            ? "2 Base Damage • Charged Spin Attack deals 4 Damage!"
            : "1 Base Damage • Charged Spin Attack deals 2 Damage!";
      } else if (slot === "offhand") {
        const oId = itemId as OffhandId;
        if (!hero.unlockedOffhands.includes(oId)) {
          soundEngine.playGateLocked();
          return {
            banner: {
              id: Date.now() + Math.floor(Math.random() * 1000),
              text: "Shield Locked!",
              subtext: "Purchase the Aegis Mirror Shield (400 Rupees) or Champion's Set (600 Rupees) at Bramble's Shop!",
              timer: 3.6,
            },
          };
        }
        hero.equippedOffhand = oId;
        hero.shieldBlock = oId === "mirror_shield" ? 2 : 1;
        label = oId === "mirror_shield" ? "Equipped Aegis Mirror Shield" : "Equipped Wooden Buckler";
        desc =
          oId === "mirror_shield"
            ? "Blocks 2 Physical & Magical Damage when raised!"
            : "Blocks 1 Physical Damage when raised!";
      } else if (slot === "tunic") {
        const tId = itemId as TunicId;
        if (!hero.unlockedTunics.includes(tId)) {
          soundEngine.playGateLocked();
          return {
            banner: {
              id: Date.now() + Math.floor(Math.random() * 1000),
              text: "Tunic Locked!",
              subtext:
                tId === "blue_mail"
                  ? "Solve the Sun Shrine Torch Puzzle or buy Sapphire Mail (450 Rupees) at Bramble's Shop!"
                  : "Buy Crimson Dragon Mail (750 Rupees) at Bramble's Shop or dig up hidden treasure!",
              timer: 3.8,
            },
          };
        }
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
        if (!hero.unlockedBoots.includes(bId)) {
          soundEngine.playGateLocked();
          return {
            banner: {
              id: Date.now() + Math.floor(Math.random() * 1000),
              text: "Footwear Locked!",
              subtext:
                bId === "swift_boots"
                  ? "Buy Swiftwind Pegasus Boots (300 Rupees) at Bramble's Shop or unearth them with the Shovel!"
                  : "Buy Titan Iron Greaves (350 Rupees) at Bramble's Shop!",
              timer: 3.8,
            },
          };
        }
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
        hero.z =
          targetZ ??
          (zone === "overworld" ? -28 : zone === "grove" ? -24.5 : -30.5);
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
          : kind === "turret"
          ? 6
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
        aggroRadius: kind === "turret" ? 15.5 : kind === "archer" ? 11.5 : 8.5,
        speed:
          kind === "turret"
            ? 0
            : kind === "boss"
            ? 3.9
            : kind === "goblin" || kind === "minion"
            ? 5.5
            : 5.0,
        damage: 1,
        rupeeDrop:
          kind === "boss" ? "boss" : kind === "knight" || kind === "turret" ? "red" : "blue",
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
      const rawTier = prefabKey.replace("rupee:", "");
      const isGoldAdmin = rawTier === "gold_admin";
      const tier: RupeeTier = isGoldAdmin ? "red" : (rawTier as RupeeTier);
      const value = isGoldAdmin
        ? 500
        : tier === "heart"
        ? 2
        : tier === "red"
        ? 20
        : tier === "blue"
        ? 5
        : 1;
      const newRupee: RupeeItemState = {
        id: `ed-rupee-${rawTier}-${uid}`,
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
      ...(pId === "clay_pot" || pId === "light_rock" ? { potReward: "random" as PotRewardKind } : {}),
      ...(pId === "crystal_switch" ? { switchState: "blue" as const, switchTarget: "orange" as const } : {}),
      ...(pId === "crystal_barrier" ? { switchTarget: "orange" as const } : {}),
      ...(pId === "eye_statue" ? { eyeActivated: false } : {}),
      ...(pId === "push_block"
        ? {
            puzzleTargetX: Number((x + 2.5).toFixed(2)),
            puzzleTargetZ: z,
          }
        : {}),
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
              initialShieldArmor:
                patch.shieldArmor !== undefined
                  ? patch.shieldArmor
                  : e.initialShieldArmor,
              initialShockArmor:
                patch.shockArmor !== undefined
                  ? patch.shockArmor
                  : e.initialShockArmor,
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
      mapProps: state.mapProps.map(resetPropForPlaySession),
      enemies: state.enemies
        .filter((e) => !e.id.startsWith("dg-minion-wave2-") && !e.id.startsWith("ct-minion-wave2-"))
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
          shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
          isBounty: e.initialIsBounty ?? e.isBounty ?? false,
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
      thrownObjects: [],
      activeBombs: [],
      projectiles: [],
      hazards: [
        {
          id: "dg-crypt-trap-w",
          zone: "dungeon",
          x: 22.5,
          z: -26.5,
          radius: 1.75,
          timer: 999999,
          maxTimer: 999999,
        },
        {
          id: "dg-crypt-trap-e",
          zone: "dungeon",
          x: 29.5,
          z: -26.5,
          radius: 1.75,
          timer: 999999,
          maxTimer: 999999,
        },
      ],
      boomerang: null,
      flags: {
        ...state.flags,
        keyPickedUp: false,
        gateUnlocked: false,
        bossAwakened: false,
        bossPhase2: false,
        bossDefeated: false,
        chestUnlocked: false,
        overworldTorchPuzzleSolved: false,
        dungeonTorchPuzzleSolved: false,
        overworldTimedTorchSolved: false,
        dungeonTimedTorchSolved: false,
        overworldCrystalPuzzleSolved: false,
        dungeonCrystalPuzzleSolved: false,
        frontierCrystalPuzzleSolved: false,
        cavernsCrystalPuzzleSolved: false,
        dungeonEyeStatuesSolved: false,
        secretStashClaimed: false,
        heirloomQuestStarted: false,
        heirloomMonstersCleared: false,
        heirloomQuestClaimed: false,
        shopProgressionBought: false,
        dungeonEntryUnlocked: false,
        grovePuzzleSolved: false,
        bossHeartAwarded: false,
        eastExitBurned: false,
        hasSmallKey: false,
        dgSmallKeyPickedUp: false,
        eastWingDoorUnlocked: false,
        eastWingArenaLocked: false,
        eastWingCleared: false,
        fireRodChestOpened: false,
        hasFireRod: state.hero.hasFireRod,
        webBarrierBurned: false,
        hasBigKey: false,
        bigKeyChestOpened: false,
        bossState: "ARMORED",
        bossArmorTimer: 0,
        frontierSappersCleared: false,
        frontierBombChestOpened: false,
        frontierCitadelGateUnlocked: false,
        cavernWardensCleared: false,
        cavernEyeSolved: false,
        cavernShovelChestOpened: false,
        cavernCrestKeyPickedUp: false,
        hasGlacialKey: false,
        citadelArmoryChestOpened: false,
        citadelTimedTorchSolved: false,
        citadelEyeStatuesSolved: false,
        citadelGateUnlocked: false,
        citadelBossAwakened: false,
        citadelBossPhase2: false,
        citadelBossDefeated: false,
        citadelBossHeartAwarded: false,
        citadelVictoryChestOpened: false,
      },
      hero: {
        ...state.hero,
        hp: state.hero.maxHp,
        mp: state.hero.maxMp,
        hasBoomerang: true,
        hasBow: true,
        arrows: Math.max(state.hero.arrows, 20),
        heldObject: null,
        pushTimer: 0,
        pushTargetPropId: null,
        interactPrompt: null,
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
      version: 3,
      mapProps: state.mapProps,
      enemies: state.enemies.filter(
        (e) => !e.id.startsWith("dg-minion-wave2-") && !e.id.startsWith("ct-minion-wave2-")
      ),
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
          grove: data.terrainCells?.grove ?? state.terrainCells.grove ?? {},
          dungeon: data.terrainCells?.dungeon ?? state.terrainCells.dungeon ?? {},
          frontier: data.terrainCells?.frontier ?? state.terrainCells.frontier ?? {},
          caverns: data.terrainCells?.caverns ?? state.terrainCells.caverns ?? {},
          citadel: data.terrainCells?.citadel ?? state.terrainCells.citadel ?? {},
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
          grove: data.terrainCells?.grove ?? {},
          dungeon: data.terrainCells?.dungeon ?? {},
          frontier: data.terrainCells?.frontier ?? {},
          caverns: data.terrainCells?.caverns ?? {},
          citadel: data.terrainCells?.citadel ?? {},
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
        grove: {},
        dungeon: {},
        frontier: {},
        caverns: {},
        citadel: {},
      },
      terrainRevision: state.terrainRevision + 1,
      editorSelected: null,
    }));
  },

  // =========================================================
  // MERCHANT SHOP PURCHASE ACTION (PROGRESSIVE UNLOCKS & HIGH-TIER RUPEE PRICING!)
  // =========================================================
  buyShopItem: (item: ShopItemId) => {
    const state = get();
    const hero = {
      ...state.hero,
      bottles: [...state.hero.bottles],
      unlockedPrimaries: [...state.hero.unlockedPrimaries],
      unlockedOffhands: [...state.hero.unlockedOffhands],
      unlockedTunics: [...state.hero.unlockedTunics],
      unlockedBoots: [...state.hero.unlockedBoots],
    };
    const flags = { ...state.flags };

    const pushNotice = (text: string, subtext: string) => {
      set({
        hero,
        flags,
        banner: {
          id: Date.now() + Math.floor(Math.random() * 1000),
          text,
          subtext,
          timer: 4.5,
        },
      });
    };

    // 1. COUNTER ITEM #1: Refill Hearts / Red Potion (Cheap: 20 Rupees)
    if (item === "counter_hearts") {
      const emptyIdx = hero.bottles.findIndex((b) => b === "empty");
      if (hero.hp >= hero.maxHp && emptyIdx === -1) {
        soundEngine.playGateLocked();
        pushNotice(
          "HeartsAlready Full!",
          hero.bottles.length === 0
            ? "Your Life Hearts are at 100% (buy an Empty Glass Bottle to store extra potions)."
            : "Your Life Hearts are at 100% and all Glass Bottles are filled."
        );
        return;
      }
      if (hero.rupees < 20) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "Refill Hearts / Potion costs 20 Rupees.");
        return;
      }
      hero.rupees -= 20;
      hero.hp = hero.maxHp;
      hero.damageFractionAcc = 0;
      if (emptyIdx !== -1) {
        hero.bottles[emptyIdx] = "red_potion";
      }
      soundEngine.playShopPurchase();
      soundEngine.playPotionDrink();
      pushNotice(
        emptyIdx !== -1
          ? `Full Hearts Restored + Bottled Red Potion (#${emptyIdx + 1})!`
          : "All Life Hearts Restored to 100%!",
        emptyIdx !== -1
          ? "Your health is full AND an empty bottle was filled with a Crimson Potion!"
          : "You feel completely revitalized for the battles ahead!"
      );
      return;
    }

    // 2. COUNTER ITEM #2: Bundle of Arrows + Magic Refill (Cheap: 10 Rupees)
    if (item === "counter_ammo_magic") {
      if (hero.arrows >= 99 && hero.mp >= hero.maxMp) {
        soundEngine.playGateLocked();
        pushNotice(
          "Quiver & Magic Already Full!",
          "You already carry 99 Arrows and 100% Magic Power (MP)."
        );
        return;
      }
      if (hero.rupees < 10) {
        soundEngine.playGateLocked();
        pushNotice(
          "Not Enough Rupees!",
          "Bundle of 10 Arrows + Magic Refill costs 10 Rupees."
        );
        return;
      }
      hero.rupees -= 10;
      hero.arrows = Math.min(99, hero.arrows + 10);
      hero.mp = hero.maxMp;
      soundEngine.playShopPurchase();
      pushNotice(
        `+10 Arrows (${hero.arrows}) & 100% Magic Restored!`,
        "Your Bow quiver is restocked and your Magic meter is at 100%!"
      );
      return;
    }

    // 3. COUNTER ITEM #3: Champion's Grand Progression Set (High-Tier Goal: 600 Rupees)
    if (item === "counter_progression_upgrade") {
      if (flags.shopProgressionBought) {
        soundEngine.playGateLocked();
        pushNotice(
          "Champion's Relic Set Already Claimed!",
          "You can still purchase repeatable Heart Containers (+1 Max Heart) for 300 Rupees!"
        );
        return;
      }
      if (hero.rupees < 600) {
        soundEngine.playGateLocked();
        pushNotice(
          `Need ${600 - hero.rupees} More Rupees! (600 Rupees Required)`,
          "Save up across your quests, or drop Gold Admin Rupees (+500) in the Map Editor (Tab) to test!"
        );
        return;
      }
      hero.rupees -= 600;
      flags.shopProgressionBought = true;
      hero.maxHp += 2;
      hero.hp = hero.maxHp;
      hero.damageFractionAcc = 0;
      if (!hero.unlockedOffhands.includes("mirror_shield")) {
        hero.unlockedOffhands.push("mirror_shield");
      }
      hero.equippedOffhand = "mirror_shield";
      hero.shieldBlock = 2;
      if (!hero.unlockedPrimaries.includes("tempered_blade")) {
        hero.unlockedPrimaries.push("tempered_blade");
      }
      hero.equippedPrimary = "tempered_blade";
      hero.swordDamage = 2;
      hero.maxBombs = Math.max(hero.maxBombs || 0, 30);
      hero.bombs = hero.maxBombs;
      hero.mp = hero.maxMp;

      soundEngine.playVictoryFanfare();
      pushNotice(
        "Champion's Progression Set Unlocked! (+1 Heart, Mirror Shield, Master Blade & 30 Bombs)",
        "Your Max HP increased, Aegis Mirror Shield & Tempered Blade are equipped, and your Bomb Bag holds 30 Bombs!"
      );
      return;
    }

    // Repeatable 300-Rupee Heart Container (+1 Max Heart)
    if (item === "heart_container") {
      if (hero.rupees < 300) {
        soundEngine.playGateLocked();
        pushNotice(
          `Need ${300 - hero.rupees} More Rupees! (300 Rupees Required)`,
          "A Heart Container (+1 Max Heart) costs 300 Rupees."
        );
        return;
      }
      hero.rupees -= 300;
      hero.maxHp += 2;
      hero.hp = hero.maxHp;
      hero.damageFractionAcc = 0;
      soundEngine.playVictoryFanfare();
      pushNotice(
        `Purchased Heart Container! (${hero.maxHp / 2} Max Hearts)`,
        "Your maximum life capacity permanently increased by +1 Full Heart and all Hearts are restored!"
      );
      return;
    }

    // Progressive Adventure Tools
    if (item === "bomb_bag") {
      if ((hero.maxBombs ?? 0) >= 20) return;
      if (hero.rupees < 150) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "The Heavy Canvas Bomb Bag (20 Capacity + 10 Bombs) costs 150 Rupees.");
        return;
      }
      hero.rupees -= 150;
      hero.maxBombs = 20;
      hero.bombs = 10;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked the Bomb Bag! (+10 Bombs, Capacity: 20)",
        "Press B or 6 to place or throw Bombs and blast open Cracked Boulders blocking secret caves!"
      );
      return;
    }

    if (item === "shovel") {
      if (hero.hasShovel) return;
      if (hero.rupees < 250) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "The Explorer's Iron Shovel costs 250 Rupees.");
        return;
      }
      hero.rupees -= 250;
      hero.hasShovel = true;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked the Explorer's Shovel! (Key: G / 4)",
        "Stand on soft dirt patches across all maps and press G to dig up buried treasure, tunics, boots, & bottles!"
      );
      return;
    }

    if (item === "fire_rod") {
      if (hero.hasFireRod) return;
      if (hero.rupees < 300) {
        soundEngine.playGateLocked();
        pushNotice(
          "Not Enough Rupees!",
          "The Flame Rod costs 300 Rupees in the Shop (or claim it free inside Dungeon Room 3: The Ember Sanctum!)."
        );
        return;
      }
      hero.rupees -= 300;
      hero.hasFireRod = true;
      flags.hasFireRod = true;
      hero.mp = hero.maxMp;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked the Flame Rod! (Key: R / 3)",
        "Tap R for a fast fireball (lights lanterns, burns vines/webs, melts ice) or HOLD R for an explosive blast!"
      );
      return;
    }

    // High-Tier Weapons, Shields, Tunics & Boots
    if (item === "swift_boots") {
      if (hero.unlockedBoots.includes("swift_boots")) return;
      if (hero.rupees < 300) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "Swiftwind Pegasus Boots (+25% Speed) cost 300 Rupees.");
        return;
      }
      hero.rupees -= 300;
      hero.unlockedBoots.push("swift_boots");
      hero.equippedBoots = "swift_boots";
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked & Equipped Swiftwind Pegasus Boots! (+25% Speed)",
        "Your movement speed increased by 25%! Switch footwear anytime in Character Sheet (C)."
      );
      return;
    }

    if (item === "titan_greaves") {
      if (hero.unlockedBoots.includes("titan_greaves")) return;
      if (hero.rupees < 350) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "Titan Iron Greaves (+12% Speed & -50% Knockback) cost 350 Rupees.");
        return;
      }
      hero.rupees -= 350;
      hero.unlockedBoots.push("titan_greaves");
      hero.equippedBoots = "titan_greaves";
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked & Equipped Titan Iron Greaves!",
        "+12% Movement Speed & 50% reduced Shield Block knockback! Switch footwear anytime in Character Sheet (C)."
      );
      return;
    }

    if (item === "mirror_shield") {
      if (hero.unlockedOffhands.includes("mirror_shield")) return;
      if (hero.rupees < 400) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "The Aegis Mirror Shield (Blocks 2 Physical & Magic DMG) costs 400 Rupees.");
        return;
      }
      hero.rupees -= 400;
      hero.unlockedOffhands.push("mirror_shield");
      hero.equippedOffhand = "mirror_shield";
      hero.shieldBlock = 2;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked & Equipped Aegis Mirror Shield!",
        "Blocks 2 Physical & Magical Damage when raised! Switch shields anytime in Character Sheet (C)."
      );
      return;
    }

    if (item === "blue_mail") {
      if (hero.unlockedTunics.includes("blue_mail")) return;
      if (hero.rupees < 450) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "Sapphire Mail (-50% All Damage) costs 450 Rupees (or solve the Sun Shrine Torch Puzzle!).");
        return;
      }
      hero.rupees -= 450;
      hero.unlockedTunics.push("blue_mail");
      hero.equippedTunic = "blue_mail";
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked & Equipped Sapphire Mail! (-50% Damage)",
        "All incoming physical & magical damage is reduced by 50%! Switch tunics anytime in Character Sheet (C)."
      );
      return;
    }

    if (item === "tempered_blade") {
      if (hero.unlockedPrimaries.includes("tempered_blade")) return;
      if (hero.rupees < 500) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "The Tempered Sun-Blade (2x Sword Damage) costs 500 Rupees.");
        return;
      }
      hero.rupees -= 500;
      hero.unlockedPrimaries.push("tempered_blade");
      hero.equippedPrimary = "tempered_blade";
      hero.swordDamage = 2;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked & Equipped Tempered Sun-Blade! (2x Sword Damage)",
        "Slashes deal 2 Damage and Charged Spin Attacks deal 4 Damage! Switch blades anytime in Character Sheet (C)."
      );
      return;
    }

    if (item === "red_mail") {
      if (hero.unlockedTunics.includes("red_mail")) return;
      if (hero.rupees < 750) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "Crimson Dragon Mail (-75% All Damage) costs 750 Rupees.");
        return;
      }
      hero.rupees -= 750;
      hero.unlockedTunics.push("red_mail");
      hero.equippedTunic = "red_mail";
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked & Equipped Crimson Dragon Mail! (-75% Damage)",
        "Legendary ruby-woven armor — reduces all incoming damage by 75%! Switch tunics anytime in Character Sheet (C)."
      );
      return;
    }

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
    } else if (item === "bombs") {
      if ((hero.maxBombs ?? 0) <= 0) {
        soundEngine.playGateLocked();
        pushNotice(
          "No Bomb Bag Owned!",
          "Unlock the Bomb Bag (150 Rupees) first before buying Bomb refills!"
        );
        return;
      }
      const maxBombs = hero.maxBombs || 20;
      if ((hero.bombs ?? 0) >= maxBombs) {
        soundEngine.playGateLocked();
        pushNotice("Bomb Bag Full!", `Your Bomb Bag already holds ${maxBombs} Bombs.`);
        return;
      }
      if (hero.rupees < 25) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "A Bundle of 5 Bombs costs 25 Rupees.");
        return;
      }
      hero.rupees -= 25;
      hero.bombs = Math.min(maxBombs, (hero.bombs ?? 0) + 5);
      soundEngine.playShopPurchase();
      pushNotice(
        `Purchased 5 Bombs! (Total: ${hero.bombs}/${maxBombs})`,
        "Press B or 6 to place or throw a Bomb and blow up cracked boulders!"
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
      if (hero.rupees < 120) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", "An Empty Glass Bottle costs 120 Rupees.");
        return;
      }
      hero.rupees -= 120;
      hero.bottles.push("empty");
      soundEngine.playShopPurchase();
      pushNotice(
        `Purchased Glass Bottle #${hero.bottles.length}!`,
        "Fill it with Red/Green/Blue Potions, Fairies, or Golden Bees!"
      );
    } else if (
      item === "red_potion" ||
      item === "green_potion" ||
      item === "blue_potion" ||
      item === "fairy" ||
      item === "bee"
    ) {
      const emptyIdx = hero.bottles.findIndex((b) => b === "empty");
      if (emptyIdx === -1) {
        soundEngine.playGateLocked();
        pushNotice(
          "No Empty Bottle Available!",
          "Purchase an Empty Glass Bottle (120 Rupees) or drink an existing bottle first."
        );
        return;
      }
      const cost =
        item === "fairy"
          ? 80
          : item === "blue_potion"
          ? 60
          : item === "bee"
          ? 50
          : item === "red_potion"
          ? 30
          : 25;
      if (hero.rupees < cost) {
        soundEngine.playGateLocked();
        pushNotice("Not Enough Rupees!", `This bottled item costs ${cost} Rupees.`);
        return;
      }
      hero.rupees -= cost;
      hero.bottles[emptyIdx] = item;
      soundEngine.playShopPurchase();
      pushNotice(
        item === "fairy"
          ? "Captured Spring Fairy in Bottle!"
          : item === "bee"
          ? "Captured Golden Attack Bee in Bottle!"
          : item === "blue_potion"
          ? "Bottled Blue Elixir!"
          : item === "red_potion"
          ? "Bottled Red Potion!"
          : "Bottled Green Potion!",
        `Stored in Bottle #${emptyIdx + 1} — press V / 5 or open Character Sheet (C) to use!`
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

    const hero: HeroState = {
      ...state.hero,
      heldObject: state.hero.heldObject ? { ...state.hero.heldObject } : null,
      bottles: [...(state.hero.bottles ?? [])],
    };
    const flags: GameFlags = { ...state.flags };
    flags.bossState = flags.bossState ?? "ARMORED";
    flags.bossArmorTimer = flags.bossArmorTimer ?? 0;

    const getActiveObstacles = (props: MapPropInstance[]) => {
      return buildObstaclesFromMapProps(props).filter((obs) => {
        if (obs.id === "dg-east-key-door") {
          // Passable when unlocked with the Small Key AND not slammed shut during the Room 3 Ambush!
          return !(flags.eastWingDoorUnlocked && !flags.eastWingArenaLocked);
        }
        if (obs.id === "dg-crypt-shortcut-door") {
          // Passable once the Cyclops Eye Statue in Room 4 is pierced!
          return !flags.dungeonEyeStatuesSolved;
        }
        return true;
      });
    };
    let dynamicObstacles = getActiveObstacles(mapProps);

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
    hero.maxBombs = hero.maxBombs ?? 0;
    hero.bombs = hero.bombs ?? 0;

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
      ? {
          ...state.boomerang,
          hitEnemyIds: [...state.boomerang.hitEnemyIds],
          carriedRupeeIds: [...(state.boomerang.carriedRupeeIds ?? [])],
          carryingKey: state.boomerang.carryingKey ?? false,
          carryingDgSmallKey: state.boomerang.carryingDgSmallKey ?? false,
          carryingGlacialKey: state.boomerang.carryingGlacialKey ?? false,
        }
      : null;
    let arrows: ArrowProjectileState[] = state.arrows.map((a) => ({ ...a }));
    let fireballs: FireballProjectileState[] = (state.fireballs ?? []).map((f) => ({ ...f }));
    let fireZones: FireZoneState[] = (state.fireZones ?? []).map((fz) => ({ ...fz }));
    let friendlyBees: FriendlyBeeState[] = (state.friendlyBees ?? []).map((b) => ({ ...b }));
    let thrownObjects: ThrownObjectState[] = (state.thrownObjects ?? []).map((t) => ({ ...t }));
    let activeBombs: BombProjectileState[] = (state.activeBombs ?? []).map((b) => ({ ...b }));
    const rupees: RupeeItemState[] = state.rupees.map((r) => ({
      ...r,
      spawnBounceTimer: Math.max(0, (r.spawnBounceTimer ?? 0) - dt),
    }));
    const enemies: EnemyState[] = state.enemies.map((e) => ({ ...e }));

    // Track cut bushes, looted bushes, bush rupee cap, and active leaf/dirt/ceramic/rock bursts
    let cutBushIds = [...state.cutBushIds];
    const lootedBushIds = [...state.lootedBushIds];
    let bushRupeesEarned = state.bushRupeesEarned;
    const bushBursts: BushBurstState[] = state.bushBursts
      .map((b) => ({ ...b, timer: b.timer - dt }))
      .filter((b) => b.timer > 0);

    // Decrement Crystal Switch hit cooldowns
    for (let i = 0; i < mapProps.length; i++) {
      if ((mapProps[i].hitCooldown ?? 0) > 0) {
        ensureMutableMapProps();
        mapProps[i].hitCooldown = Math.max(0, (mapProps[i].hitCooldown ?? 0) - dt);
      }
    }

    // Helper: Smash a Clay Pot or Light Rock, spawning ceramic/stone shards and its hidden reward!
    const smashPotOrRock = (
      sx: number,
      sz: number,
      kind: "clay_pot" | "light_rock",
      potReward?: PotRewardKind,
      sourceId?: string
    ) => {
      soundEngine.playPotSmash();
      bushBursts.push({
        id: `smash-burst-${sourceId ?? stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
        zone,
        x: sx,
        z: sz,
        timer: 0.82,
        maxTimer: 0.82,
        seed: Math.floor(Math.abs(sx * 43 + sz * 79) + stats.elapsedSeconds * 120),
        isCeramic: kind === "clay_pot",
        isRock: kind === "light_rock",
      });

      const reward: PotRewardKind = potReward ?? "random";
      if (reward === "small_key") {
        flags.keyPickedUp = true;
        flags.hasSmallKey = true;
        flags.dgSmallKeyPickedUp = true;
        hero.hasDungeonKey = true;
        soundEngine.playKeyPickup();
        pushBanner(
          "Found a Small Key Inside the Clay Pot!",
          "Use this Small Key to unlock the East Door in Room 1 (Central Hub)!",
          5.2
        );
      } else if (reward === "arrows_10") {
        hero.arrows = Math.min(99, (hero.arrows ?? 0) + 10);
        hero.mp = Math.min(hero.maxMp || 100, (hero.mp ?? 0) + 50);
        soundEngine.playKeyPickup();
        pushBanner(
          `Found +10 Arrows & +50% Magic Refill! (Quiver: ${hero.arrows})`,
          "Your Bow quiver and Flame Rod Magic Power were replenished from the shattered vessel!",
          4.2
        );
      } else if (reward === "bombs_5") {
        if ((hero.maxBombs ?? 0) > 0) {
          hero.bombs = Math.min(hero.maxBombs, (hero.bombs ?? 0) + 5);
          soundEngine.playKeyPickup();
          pushBanner(
            `Found 5 Bombs! (Total: ${hero.bombs}/${hero.maxBombs})`,
            "Press B or 6 to place or throw a Bomb and blow up cracked boulders!",
            4.0
          );
        } else {
          rupees.push({
            id: `pot-drop-${sourceId ?? stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            zone,
            x: sx,
            z: sz,
            tier: "red",
            value: 20,
            collected: false,
            spawnBounceTimer: 0.45,
          });
        }
      } else if (reward === "red_rupee" || reward === "blue_rupee" || reward === "green_rupee" || reward === "heart") {
        const tier: RupeeTier =
          reward === "red_rupee"
            ? "red"
            : reward === "blue_rupee"
            ? "blue"
            : reward === "heart"
            ? "heart"
            : "green";
        const val = tier === "red" ? 20 : tier === "blue" ? 5 : tier === "heart" ? 2 : 1;
        rupees.push({
          id: `pot-drop-${sourceId ?? stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
          zone,
          x: sx,
          z: sz,
          tier,
          value: val,
          collected: false,
          spawnBounceTimer: 0.45,
        });
      } else if (reward === "random") {
        const roll = Math.random();
        if (roll >= 0.92 && (hero.maxBombs ?? 0) > 0) {
          hero.bombs = Math.min(hero.maxBombs, (hero.bombs ?? 0) + 3);
          soundEngine.playKeyPickup();
          pushBanner(`Found 3 Bombs! (Total: ${hero.bombs}/${hero.maxBombs})`, "Hidden inside the shattered vessel!", 3.0);
        } else if (roll >= 0.42) {
          const tier: RupeeTier = roll >= 0.80 ? "blue" : roll >= 0.62 ? "heart" : "green";
          const val = tier === "blue" ? 5 : tier === "heart" ? 2 : 1;
          rupees.push({
            id: `pot-drop-${sourceId ?? stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            zone,
            x: sx,
            z: sz,
            tier,
            value: val,
            collected: false,
            spawnBounceTimer: 0.44,
          });
        }
      }
    };

    // Helper: Sync Crystal Barriers and check Crystal Switch puzzles in the given zone
    const syncCrystalBarriersAndPuzzles = (targetZone: ZoneId): boolean => {
      const zoneSwitches = mapProps.filter(
        (p) => p.zone === targetZone && p.prefab === "crystal_switch"
      );
      if (zoneSwitches.length === 0) return false;

      const allMatchTarget =
        (targetZone === "grove" && Boolean(flags.grovePuzzleSolved)) ||
        zoneSwitches.every(
          (s) => (s.switchState ?? "blue") === (s.switchTarget ?? "orange")
        );
      ensureMutableMapProps();
      for (let i = 0; i < mapProps.length; i++) {
        const prop = mapProps[i];
        if (prop.zone !== targetZone || prop.prefab !== "crystal_barrier") continue;
        if (allMatchTarget) {
          prop.hasCollider = false;
          prop.y = targetZone === "grove" ? -2.45 : -2.05;
        } else {
          prop.hasCollider = true;
          prop.y = 0;
        }
      }
      dynamicObstacles = getActiveObstacles(mapProps);

      if (allMatchTarget) {
        if (targetZone === "grove" && !flags.grovePuzzleSolved) {
          flags.grovePuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `crystal-gr-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "grove",
              x: -1.4,
              z: 11.2,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `crystal-gr-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "grove",
              x: 1.4,
              z: 11.2,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Grove Crystal Switch Activated! (Shrine Barrier Lowered!)",
            "The Forest Grove Shrine is unsealed — claim the Sanctum Entry Key at the northern pedestal!",
            5.2
          );
          return true;
        }
        if (targetZone === "overworld" && !flags.overworldCrystalPuzzleSolved) {
          flags.overworldCrystalPuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `crystal-ow-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "overworld",
              x: 13.8,
              z: 12.1,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `crystal-ow-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "overworld",
              x: 13.8,
              z: 11.1,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Crystal Switch Activated! (Barriers Lowered!)",
            "The East Ruin crystal barrier pillars retracted into the ground, revealing +20 Rupees!",
            4.8
          );
          return true;
        }
        if (targetZone === "dungeon" && !flags.dungeonCrystalPuzzleSolved) {
          flags.dungeonCrystalPuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `crystal-dg-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: -19.5,
              z: 8.6,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `crystal-dg-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: -18.5,
              z: 8.6,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Chasm Crystal Switch Activated! (Bonus Alcove Unlocked!)",
            "The Crystal Barrier in Room 2 lowered — smash the Bonus Pot for +10 Arrows & Magic Refill!",
            5.0
          );
          return true;
        }
        if (targetZone === "frontier" && !flags.frontierCrystalPuzzleSolved) {
          flags.frontierCrystalPuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `crystal-fr-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "frontier",
              x: -19.2,
              z: -2.5,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `crystal-fr-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "frontier",
              x: -17.8,
              z: -2.5,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Frontier Crystal Vault Unlocked! (+40 Rupees)",
            "Both Frontier Crystal Switches are aligned — the Western Crystal Barriers lowered!",
            5.0
          );
          return true;
        }
        if (targetZone === "caverns" && !flags.cavernsCrystalPuzzleSolved) {
          flags.cavernsCrystalPuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `crystal-cv-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "caverns",
              x: 13.5,
              z: -2.5,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `crystal-cv-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "caverns",
              x: 15.0,
              z: -2.5,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Glacial Bridge Crystal Switch Activated! (East Sanctum Open!)",
            "Cross the frozen bridge into the East Glacial Sanctum, melt the Frost Wardens [R], and shoot the Eye Statue [E] for the Glacial Crest Key!",
            5.6
          );
          return true;
        }
      }
      return false;
    };

    const toggleCrystalSwitch = (propId: string): boolean => {
      ensureMutableMapProps();
      const sw = mapProps.find((p) => p.id === propId);
      if (!sw || sw.prefab !== "crystal_switch" || (sw.hitCooldown ?? 0) > 0) {
        return false;
      }
      sw.hitCooldown = 0.32;
      const nextColor = sw.switchState === "orange" ? "blue" : "orange";
      sw.switchState = nextColor;
      soundEngine.playCrystalSwitch(nextColor === "orange");
      const solvedNow = syncCrystalBarriersAndPuzzles(sw.zone);
      if (!solvedNow) {
        pushBanner(
          nextColor === "orange"
            ? "Crystal Switch Toggled → Orange!"
            : "Crystal Switch Toggled → Blue!",
          "Align all Crystal Switches in the area to Orange to lower the Crystal Barriers!",
          2.8
        );
      }
      return true;
    };

    // Helper: Pierce Cyclops Eye Statues (`eye_statue`) with an Arrow in Dungeon Room 4, Map 4 Caverns, or Map 5 Citadel!
    const activateEyeStatue = (propId: string): boolean => {
      ensureMutableMapProps();
      const eyeProp = mapProps.find((p) => p.id === propId);
      if (!eyeProp || eyeProp.prefab !== "eye_statue") return false;
      const wasAlreadyActivated = Boolean(eyeProp.eyeActivated);
      eyeProp.eyeActivated = true;
      soundEngine.playEyeStatueHit();

      const zoneEyeStatues = mapProps.filter(
        (p) => p.zone === eyeProp.zone && p.prefab === "eye_statue"
      );
      const activeCount = zoneEyeStatues.filter((p) => p.eyeActivated).length;
      const totalCount = zoneEyeStatues.length;

      if (activeCount >= totalCount && totalCount > 0) {
        if (eyeProp.zone === "dungeon" && !flags.dungeonEyeStatuesSolved) {
          flags.dungeonEyeStatuesSolved = true;
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playGateUnlock();
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `eye-statue-dg-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: BIG_KEY_CHEST_POS.x - 1.3,
              z: BIG_KEY_CHEST_POS.z - 1.4,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `eye-statue-dg-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: BIG_KEY_CHEST_POS.x + 1.3,
              z: BIG_KEY_CHEST_POS.z - 1.4,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Cyclops Eye Statue Pierced! (Big Key Chest & Shortcut Unlocked!)",
            "Claim the Big Boss Key Chest in the center of Room 4, then take the West Shortcut Door back to Room 1!",
            6.2
          );
          return true;
        } else if (eyeProp.zone === "caverns" && !flags.cavernEyeSolved) {
          flags.cavernEyeSolved = true;
          soundEngine.playGateUnlock();
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `eye-statue-cv-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "caverns",
              x: CAVERN_CREST_KEY_POS.x - 1.4,
              z: CAVERN_CREST_KEY_POS.z,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `eye-statue-cv-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "caverns",
              x: CAVERN_CREST_KEY_POS.x + 1.4,
              z: CAVERN_CREST_KEY_POS.z,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Glacial Sanctum Eye Pierced! (Glacial Crest Key Unsealed!)",
            "Claim the Glacial Crest Key at the pedestal (24, 14) and take the NE Shortcut Portal to unlock Map 5 (Obsidian Citadel)!",
            6.2
          );
          return true;
        } else if (eyeProp.zone === "citadel" && !flags.citadelEyeStatuesSolved) {
          flags.citadelEyeStatuesSolved = true;
          flags.citadelGateUnlocked = true;
          soundEngine.playGateUnlock();
          soundEngine.playSecretSolve();
          pushBanner(
            "Both Sovereign Eye Statues Pierced! (Throne Room Unsealed!)",
            "The Inner Sanctum Gate dropped — step North into the Sovereign's Throne Room to challenge Vaelkor!",
            6.0
          );
          return true;
        } else if (!wasAlreadyActivated) {
          soundEngine.playSecretSolve();
          pushBanner(
            `Eye Statue Pierced! (${activeCount}/${totalCount})`,
            "The ancient wall eye turned emerald as your arrow struck true!",
            3.5
          );
          return true;
        }
      } else {
        pushBanner(
          `Sanctum Eye Statue Pierced! (${activeCount}/${totalCount})`,
          "Shoot the remaining Wall Eye Statue with your Bow [E / 2]!",
          4.2
        );
      }
      return true;
    };

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

    // =========================================================
    // 1b. LIFTABLE POTS, LIGHT ROCKS & BOMBS (Pick Up with F / Throw with F, B, or Attack)
    // =========================================================
    let consumedAttackThisFrame = false;
    let consumedBombThisFrame = false;

    if (hero.heldObject) {
      // If holding a lit bomb overhead, tick down its fuse!
      if (hero.heldObject.kind === "bomb") {
        hero.heldObject.fuseTimer = (hero.heldObject.fuseTimer ?? 2.4) - dt;
        if (hero.heldObject.fuseTimer <= 0) {
          // Explodes right in the hero's hands!
          activeBombs.push({
            id: `bomb-hand-explode-${stats.elapsedSeconds.toFixed(3)}`,
            zone,
            x: hero.x,
            z: hero.z,
            y: 1.4,
            vx: 0,
            vz: 0,
            vy: 0,
            fuseTimer: 0,
            maxFuseTimer: hero.heldObject.maxFuseTimer ?? 2.4,
          });
          hero.heldObject = null;
        }
      }

      // Throw held object when pressing Interact (F/K/X), Attack (Space/LMB), or Bomb (B/6 when holding a bomb)
      if (
        hero.heldObject &&
        !state.shopOpen &&
        !state.characterOpen &&
        (input.interactPressed ||
          input.attackPressed ||
          (hero.heldObject.kind === "bomb" && input.bombPressed))
      ) {
        const held = hero.heldObject;
        hero.heldObject = null;
        hero.isBlocking = false;
        hero.throwAnimTimer = 0.28;
        hero.weaponLockTimer = 0.30;
        consumedAttackThisFrame = true;
        if (held.kind === "bomb") {
          consumedBombThisFrame = true;
        }
        soundEngine.playThrow();

        if (held.kind === "bomb") {
          activeBombs.push({
            id: `bomb-thrown-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            zone,
            x: hero.x + Math.sin(hero.facing) * 0.7,
            z: hero.z + Math.cos(hero.facing) * 0.7,
            y: 1.5,
            vx: Math.sin(hero.facing) * 11.2,
            vz: Math.cos(hero.facing) * 11.2,
            vy: 3.8,
            fuseTimer: Math.max(0.2, held.fuseTimer ?? 1.8),
            maxFuseTimer: held.maxFuseTimer ?? 2.4,
          });
        } else {
          const throwRange = 5.4;
          thrownObjects.push({
            id: `thrown-${held.propId ?? stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            kind: held.kind,
            zone,
            startX: hero.x,
            startZ: hero.z,
            targetX: hero.x + Math.sin(hero.facing) * throwRange,
            targetZ: hero.z + Math.cos(hero.facing) * throwRange,
            x: hero.x + Math.sin(hero.facing) * 0.5,
            z: hero.z + Math.cos(hero.facing) * 0.5,
            y: 1.55,
            flightTime: 0,
            totalFlightTime: 0.38,
            potReward: held.potReward,
          });
        }
      }
    } else if (
      input.interactPressed &&
      !state.shopOpen &&
      !state.characterOpen &&
      hero.knockbackLockTimer <= 0 &&
      hero.weaponLockTimer <= 0
    ) {
      // Try picking up an adjacent ground Bomb first, or an adjacent Clay Pot / Light Rock!
      let pickedUpBombIdx = -1;
      let bestBombDist = 2.25;
      for (let i = 0; i < activeBombs.length; i++) {
        const b = activeBombs[i];
        if (b.zone !== zone || b.exploded) continue;
        const d = Math.hypot(b.x - hero.x, b.z - hero.z);
        if (d <= bestBombDist) {
          bestBombDist = d;
          pickedUpBombIdx = i;
        }
      }

      if (pickedUpBombIdx !== -1) {
        const picked = activeBombs[pickedUpBombIdx];
        activeBombs.splice(pickedUpBombIdx, 1);
        hero.heldObject = {
          kind: "bomb",
          fuseTimer: picked.fuseTimer,
          maxFuseTimer: picked.maxFuseTimer,
        };
        hero.isBlocking = false;
        hero.weaponLockTimer = 0.22;
        soundEngine.playLift();
      } else {
        // Find the closest liftable Clay Pot or Light Rock adjacent to the Hero
        let bestProp: MapPropInstance | null = null;
        let bestScore = Infinity;
        for (const prop of mapProps) {
          if (
            prop.zone !== zone ||
            prop.smashed ||
            (prop.prefab !== "clay_pot" && prop.prefab !== "light_rock")
          ) {
            continue;
          }
          const dx = prop.x - hero.x;
          const dz = prop.z - hero.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 2.35) continue;
          const angleToProp = Math.atan2(dx, dz);
          const angleDiff = Math.abs(normalizeAngleDiff(angleToProp, hero.facing));
          if (angleDiff <= 1.65 || dist <= 1.55) {
            const score = dist + angleDiff * 0.45;
            if (score < bestScore) {
              bestScore = score;
              bestProp = prop;
            }
          }
        }

        if (bestProp) {
          ensureMutableMapProps();
          const mProp = mapProps.find((p) => p.id === bestProp!.id);
          if (mProp) {
            mProp.smashed = true;
            mProp.hasCollider = false;
            dynamicObstacles = getActiveObstacles(mapProps);
            hero.heldObject = {
              kind: mProp.prefab as "clay_pot" | "light_rock",
              propId: mProp.id,
              potReward: mProp.potReward,
            };
            hero.isBlocking = false;
            hero.weaponLockTimer = 0.22;
            soundEngine.playLift();
          }
        }
      }
    }

    // Bomb Action (Press B or 6):
    // - If standing next to a placed bomb, lifts it overhead so pressing B again (or F/Attack) throws it!
    // - Otherwise places a lit ticking Bomb at the Hero's feet (or throws if already holding a bomb).
    if (
      input.bombPressed &&
      !consumedBombThisFrame &&
      !hero.heldObject &&
      !state.shopOpen &&
      !state.characterOpen &&
      hero.knockbackLockTimer <= 0
    ) {
      let nearbyBombIdx = -1;
      let nearestDist = 1.95;
      for (let i = 0; i < activeBombs.length; i++) {
        const b = activeBombs[i];
        if (b.zone !== zone || b.exploded || b.y > 0.35) continue;
        const d = Math.hypot(b.x - hero.x, b.z - hero.z);
        if (d <= nearestDist) {
          nearestDist = d;
          nearbyBombIdx = i;
        }
      }

      if (nearbyBombIdx !== -1) {
        const picked = activeBombs[nearbyBombIdx];
        activeBombs.splice(nearbyBombIdx, 1);
        hero.heldObject = {
          kind: "bomb",
          fuseTimer: picked.fuseTimer,
          maxFuseTimer: picked.maxFuseTimer,
        };
        hero.isBlocking = false;
        hero.weaponLockTimer = 0.20;
        soundEngine.playLift();
      } else if ((hero.maxBombs ?? 0) <= 0) {
        soundEngine.playGateLocked();
        pushBanner(
          "Bomb Bag Locked!",
          "Purchase the Heavy Bomb Bag (150 Rupees) at Merchant Bramble's Shop to carry and place Bombs!",
          3.4
        );
      } else if ((hero.bombs ?? 0) <= 0) {
        soundEngine.playGateLocked();
        pushBanner(
          "Out of Bombs!",
          "Smash clay pots or buy a Bomb Bundle (+5 for 25 Rupees) at Merchant Bramble's Shop!",
          3.0
        );
      } else {
        hero.bombs = Math.max(0, (hero.bombs ?? 0) - 1);
        hero.isBlocking = false;
        soundEngine.playBombPlace();
         const placeX = hero.x + Math.sin(hero.facing) * 0.85;
        const placeZ = hero.z + Math.cos(hero.facing) * 0.85;
        const gatePassableNow =
          zone === "overworld"
            ? Boolean(flags.dungeonEntryUnlocked || flags.keyPickedUp || hero.hasDungeonKey)
            : Boolean(flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated));
        const resB = resolveWorldCollisions(
          placeX,
          placeZ,
          0.38,
          zone,
          gatePassableNow,
          dynamicObstacles,
          flags.bossDefeated
        );
        activeBombs.push({
          id: `bomb-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
          zone,
          x: resB.x,
          z: resB.z,
          y: 0,
          vx: 0,
          vz: 0,
          vy: 0,
          fuseTimer: 2.4,
          maxFuseTimer: 2.4,
        });
      }
    }

    // Charged Spin Attack Logic: Hold Attack button after swinging to charge, release at >= 0.62s for 360° Double-Damage Spin!
    const SPIN_CHARGE_THRESHOLD = 0.62;
    if (
      input.attackHeld &&
      !hero.heldObject &&
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
      if (
        !hero.heldObject &&
        (hero.swordChargeTimer ?? 0) >= SPIN_CHARGE_THRESHOLD &&
        hero.knockbackLockTimer <= 0
      ) {
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
      input.fireRodPressed &&
      !hero.hasFireRod &&
      hero.fireRodCooldown <= 0 &&
      !state.shopOpen &&
      !state.characterOpen
    ) {
      soundEngine.playGateLocked();
      hero.fireRodCooldown = 0.4;
      pushBanner(
        "Flame Rod Locked!",
        "Claim the Flame Rod inside Dungeon Room 3 (The Ember Sanctum Chest) or unlock it at Bramble's Shop (300 Rupees)!",
        3.6
      );
    } else if (
      input.fireRodHeld &&
      !hero.heldObject &&
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
      !hero.heldObject &&
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

    // Mutually exclusive weapon actions (disabled while carrying an object overhead)
    const canUseWeapon =
      !hero.heldObject &&
      !state.shopOpen &&
      !state.characterOpen &&
      hero.knockbackLockTimer <= 0 &&
      hero.weaponLockTimer <= 0 &&
      !hero.isAttacking &&
      hero.bowAnimTimer <= 0 &&
      hero.throwAnimTimer <= 0 &&
      hero.digAnimTimer <= 0;

    // Shovel Digging Action (Press G or 4)
    if (canUseWeapon && input.shovelPressed && !hero.hasShovel) {
      soundEngine.playGateLocked();
      hero.weaponLockTimer = 0.25;
      pushBanner(
        "Shovel Locked!",
        "Purchase the Explorer's Shovel (250 Rupees) at Merchant Bramble's Shop to dig up soft dirt patches!",
        3.5
      );
    } else if (canUseWeapon && input.shovelPressed && hero.hasShovel) {
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
          if (!hero.unlockedBoots.includes("swift_boots")) {
            hero.unlockedBoots = [...hero.unlockedBoots, "swift_boots"];
          }
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
            "Unlocked & equipped in your Boots slot! Open Character Sheet (C) anytime.",
            4.5
          );
        } else if (reward === "blue_mail") {
          if (!hero.unlockedTunics.includes("blue_mail")) {
            hero.unlockedTunics = [...hero.unlockedTunics, "blue_mail"];
          }
          hero.equippedTunic = "blue_mail";
          pushBanner(
            "Dug Up the Sapphire Mail! (-50% Damage)",
            "Unlocked & equipped — reduces all incoming physical & magical damage by 50%!",
            4.5
          );
        } else if (reward === "red_mail") {
          if (!hero.unlockedTunics.includes("red_mail")) {
            hero.unlockedTunics = [...hero.unlockedTunics, "red_mail"];
          }
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
            "Legendary tunic unlocked & equipped — reduces all physical & magical damage by 75%!",
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
        carriedRupeeIds: [],
        carryingKey: false,
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
      } else {
        if (hero.arrows <= 0) {
          hero.arrows = 10;
          pushBanner(
            "Ranger's Quiver Replenished! (+10 Arrows)",
            "Your quiver conjured 10 fresh arrows so you can always solve Bow puzzles!",
            2.8
          );
        }
        hero.isBlocking = false;
        hero.arrows = Math.max(0, hero.arrows - 1);
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
    } else if (
      canUseWeapon &&
      input.attackPressed &&
      !consumedAttackThisFrame &&
      hero.attackCooldown <= 0
    ) {
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

    // Right-click Shield Block (disabled while holding a pot/rock/bomb overhead)
    hero.isBlocking =
      input.blockHeld &&
      !hero.heldObject &&
      !isUsingAnyWeapon &&
      hero.knockbackLockTimer <= 0;

    // 2. Hero Movement + Boots Speed Multiplier + Knockback + Pushable Block Puzzles
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
      : hero.heldObject
      ? 7.8
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
      zone === "overworld"
        ? Boolean(flags.dungeonEntryUnlocked || flags.keyPickedUp || hero.hasDungeonKey)
        : zone === "frontier"
        ? Boolean(flags.frontierCitadelGateUnlocked || flags.hasGlacialKey || flags.cavernCrestKeyPickedUp)
        : zone === "citadel"
        ? Boolean(flags.citadelGateUnlocked && (!flags.citadelBossAwakened || flags.citadelBossDefeated))
        : Boolean(flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated));
    const initialBossExitOpen =
      zone === "citadel" ? Boolean(flags.citadelBossDefeated) : Boolean(flags.bossDefeated);
    const clampedNextHeroZ =
      (zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated) ||
      (zone === "citadel" && flags.citadelBossAwakened && !flags.citadelBossDefeated)
        ? Math.max(13.55, nextHeroZ)
        : nextHeroZ;
    const resolvedHero = resolveWorldCollisions(
      nextHeroX,
      clampedNextHeroZ,
      0.72,
      zone,
      initialGatePassable,
      dynamicObstacles,
      initialBossExitOpen
    );
    if (isKnockbackLocked && resolvedHero.hitObstacle) {
      hero.knockbackVx *= 0.45;
      hero.knockbackVz *= 0.45;
    }
    hero.x = resolvedHero.x;
    hero.z =
      (zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated) ||
      (zone === "citadel" && flags.citadelBossAwakened && !flags.citadelBossDefeated)
        ? Math.max(13.55, resolvedHero.z)
        : resolvedHero.z;

    // 2b. Update Sliding Push Blocks & Check 1.0-Second Continuous Push Against Pushable Blocks (`push_block`)
    for (let i = 0; i < mapProps.length; i++) {
      const p = mapProps[i];
      if (p.prefab !== "push_block" || (p.slideTimer ?? 0) <= 0) continue;
      ensureMutableMapProps();
      const mp = mapProps[i];
      const nextSlideTimer = Math.max(0, (mp.slideTimer ?? 0) - dt);
      mp.slideTimer = nextSlideTimer;
      const t = 1 - nextSlideTimer / 0.36;
      const sx = mp.slideStartX ?? mp.x;
      const sz = mp.slideStartZ ?? mp.z;
      const tx = mp.slideTargetX ?? mp.x;
      const tz = mp.slideTargetZ ?? mp.z;
      mp.x = Number((sx + (tx - sx) * t).toFixed(3));
      mp.z = Number((sz + (tz - sz) * t).toFixed(3));

      if (nextSlideTimer === 0) {
        mp.x = tx;
        mp.z = tz;
        if (
          mp.puzzleTargetX !== undefined &&
          mp.puzzleTargetZ !== undefined &&
          !mp.pushedSolved &&
          Math.hypot(mp.x - mp.puzzleTargetX, mp.z - mp.puzzleTargetZ) <= 0.75
        ) {
          mp.x = mp.puzzleTargetX;
          mp.z = mp.puzzleTargetZ;
          mp.pushedSolved = true;
          soundEngine.playSecretSolve();

          if (mp.zone === "overworld") {
            hero.bombs = Math.min(hero.maxBombs || 30, (hero.bombs ?? 0) + 5);
            rupees.push({
              id: `push-reward-ow-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "overworld",
              x: mp.x,
              z: mp.z + 1.85,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            });
            pushBanner(
              "Ruins Block Socket Solved! (+20 Rupees & +5 Bombs)",
              "The ancient stone block locked into its floor socket!",
              4.8
            );
          } else if (mp.zone === "dungeon") {
            rupees.push(
              {
                id: `push-reward-dg-1-${stats.elapsedSeconds.toFixed(2)}`,
                zone: "dungeon",
                x: mp.x + 1.8,
                z: mp.z,
                tier: "red",
                value: 20,
                collected: false,
                spawnBounceTimer: 0.45,
              },
              {
                id: `push-reward-dg-2-${stats.elapsedSeconds.toFixed(2)}`,
                zone: "dungeon",
                x: mp.x + 1.8,
                z: mp.z - 1.1,
                tier: "heart",
                value: 2,
                collected: false,
                spawnBounceTimer: 0.45,
              }
            );
            pushBanner(
              "Sanctum Rune Block Solved! (+20 Rupees & Heart)",
              "The heavy glyph block locked into the dungeon floor socket!",
              4.8
            );
          } else {
            rupees.push(
              {
                id: `push-reward-fr-1-${stats.elapsedSeconds.toFixed(2)}`,
                zone: "frontier",
                x: mp.x,
                z: mp.z + 1.9,
                tier: "red",
                value: 20,
                collected: false,
                spawnBounceTimer: 0.45,
              },
              {
                id: `push-reward-fr-2-${stats.elapsedSeconds.toFixed(2)}`,
                zone: "frontier",
                x: mp.x + 1.2,
                z: mp.z + 1.9,
                tier: "red",
                value: 20,
                collected: false,
                spawnBounceTimer: 0.45,
              }
            );
            pushBanner(
              "Sun Temple Block Socket Solved! (+40 Rupees)",
              "The carved monolith aligned with the Sun Temple floor glyph!",
              4.8
            );
          }
        }
      }
      dynamicObstacles = getActiveObstacles(mapProps);
    }

    if (mag > 0.15 && !hero.heldObject && !isUsingAnyWeapon && !isKnockbackLocked) {
      // Snap push direction to a cardinal axis
      const pushDirX = Math.abs(mx) >= Math.abs(mz) ? Math.sign(mx) : 0;
      const pushDirZ = Math.abs(mz) > Math.abs(mx) ? Math.sign(mz) : 0;
      const probeX = hero.x + pushDirX * 1.15;
      const probeZ = hero.z + pushDirZ * 1.15;

      const targetBlock = mapProps.find(
        (p) =>
          p.zone === zone &&
          p.prefab === "push_block" &&
          (p.slideTimer ?? 0) <= 0 &&
          Math.hypot(p.x - probeX, p.z - probeZ) <= 1.25
      );

      if (targetBlock) {
        if (hero.pushTargetPropId === targetBlock.id) {
          hero.pushTimer = (hero.pushTimer ?? 0) + dt;
        } else {
          hero.pushTargetPropId = targetBlock.id;
          hero.pushTimer = dt;
        }

        if (hero.pushTimer >= 1.0) {
          hero.pushTimer = 0;
          const slideStep = 2.5;
          let destX = Number((targetBlock.x + pushDirX * slideStep).toFixed(2));
          let destZ = Number((targetBlock.z + pushDirZ * slideStep).toFixed(2));

          if (
            targetBlock.puzzleTargetX !== undefined &&
            targetBlock.puzzleTargetZ !== undefined &&
            Math.hypot(destX - targetBlock.puzzleTargetX, destZ - targetBlock.puzzleTargetZ) <= 0.85
          ) {
            destX = targetBlock.puzzleTargetX;
            destZ = targetBlock.puzzleTargetZ;
          }

          const obstaclesWithoutSelf = getActiveObstacles(
            mapProps.filter((p) => p.id !== targetBlock.id)
          );
          const checkDest = resolveWorldCollisions(
            destX,
            destZ,
            0.82,
            zone,
            initialGatePassable,
            obstaclesWithoutSelf,
            initialBossExitOpen
          );

          if (!checkDest.hitObstacle) {
            ensureMutableMapProps();
            const mBlock = mapProps.find((p) => p.id === targetBlock.id);
            if (mBlock) {
              mBlock.slideStartX = mBlock.x;
              mBlock.slideStartZ = mBlock.z;
              mBlock.slideTargetX = destX;
              mBlock.slideTargetZ = destZ;
              mBlock.slideTimer = 0.36;
              soundEngine.playBlockSlide();
            }
          } else {
            soundEngine.playGateLocked();
          }
        }
      } else {
        hero.pushTimer = 0;
        hero.pushTargetPropId = null;
      }
    } else {
      hero.pushTimer = 0;
      hero.pushTargetPropId = null;
    }

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

    // Helper: 5-Room Spatial Cross Dungeon Room Detection
    const getDungeonRoomAt = (x: number, z: number): DungeonRoomId => {
      if (z >= 12.2) return "sanctum"; // Room 5: Boss Lair
      if (x <= -14.0) return "west_wing"; // Room 2: The Chasm Gallery (West Wing)
      if (x >= 14.0) {
        return z < -12.0 ? "crypt" : "east_wing"; // Room 4: Dark Archery Crypt vs Room 3: Ember Sanctum
      }
      return "hub"; // Room 1: Central Lantern Hub
    };

    if (zone === "dungeon") {
      dungeonRoom = getDungeonRoomAt(hero.x, hero.z);
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
                "The North Sanctuary Door is Sealed!",
                "Vanquish Ignis, the Armored Eye-Golem, to unseal the North Sanctuary Door to Map 3!",
                3.6
              );
            }
            continue;
          }
          if (
            portal.id === "portal-fr-citadel" &&
            !flags.frontierCitadelGateUnlocked &&
            !flags.hasGlacialKey &&
            !flags.cavernCrestKeyPickedUp
          ) {
            if (gateNoticeCooldown <= 0) {
              gateNoticeCooldown = 3.2;
              soundEngine.playGateLocked();
              pushBanner(
                "The North Citadel Gate is Sealed by Glacial Runes!",
                "Journey East into Map 4 (Frostpeak Caverns) to claim the Glacial Crest Key first!",
                4.2
              );
            }
            continue;
          }
          if (portal.id === "portal-ct-victory-ow" && !flags.citadelBossDefeated) {
            if (gateNoticeCooldown <= 0) {
              gateNoticeCooldown = 3.2;
              soundEngine.playGateLocked();
              pushBanner(
                "The Golden Return Portal is Sealed!",
                "Vanquish Vaelkor, the Obsidian Sovereign, to unseal the Golden Return Portal!",
                4.0
              );
            }
            continue;
          }
          zone = portal.targetZone;
          if (zone === "dungeon") {
            dungeonRoom = getDungeonRoomAt(portal.targetX, portal.targetZ);
          }
          hero.x = portal.targetX;
          hero.z = portal.targetZ;
          hero.facing = portal.targetFacing;
          hero.knockbackVx = 0;
          hero.knockbackVz = 0;
          hero.portalCooldown = 1.25;
          hero.heldObject = null;
          hero.pushTimer = 0;
          hero.pushTargetPropId = null;
          boomerang = null;
          thrownObjects = [];
          activeBombs = [];
          arrows = arrows.map((a) => (a.stuck && a.stuckInShield ? { ...a, zone } : a));
          cutBushIds = [];
          soundEngine.playPortalTransition();
          pushBanner(portal.label, portal.sublabel);
          break;
        }
      }
    }

    // 4a. Check North Exit Locked Dungeon Entrance Gate in Map 1 (`DUNGEON_ENTRY_GATE_POS = 0, 31.8` in `overworld`)
    if (zone === "overworld" && !flags.dungeonEntryUnlocked) {
      const distToEntryGate = Math.hypot(
        hero.x - DUNGEON_ENTRY_GATE_POS.x,
        hero.z - DUNGEON_ENTRY_GATE_POS.z
      );
      if (distToEntryGate < 3.4) {
        if (flags.keyPickedUp || hero.hasDungeonKey) {
          flags.dungeonEntryUnlocked = true;
          soundEngine.playGateUnlock();
          pushBanner(
            "North Dungeon Entrance Unlocked!",
            "The Key from the West Forest Grove unsealed Map 2 — step into the Sunken Sanctum!",
            4.8
          );
        } else if (gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "North Exit Locked! (Map 2: Sunken Sanctum)",
            "Explore the West Exit (Map 1B: Whispering Forest Grove) first to win the Dungeon Entry Key!",
            4.5
          );
        }
      }
    }

    // 4b. Check Sanctum Entry Key Pedestal Pickup in Map 1B (`grove`)
    if (zone === "grove" && !flags.keyPickedUp) {
      const distToKey = Math.hypot(
        hero.x - DUNGEON_KEY_POS.x,
        hero.z - DUNGEON_KEY_POS.z
      );
      if (distToKey < 1.95) {
        flags.keyPickedUp = true;
        hero.hasDungeonKey = true;
        soundEngine.playKeyPickup();
        pushBanner(
          "Acquired the Sanctum Entry Key!",
          "Return East to Map 1 Crossroads and take the North Exit to unlock Map 2 (Sunken Sanctum)!",
          5.8
        );
      }
    }

    // 4c. Room 2 (`west_wing`): Walk-up fallback for Small Key Pedestal (`DG_SMALL_KEY_POS = -31.2, 0.0`)
    if (zone === "dungeon" && !flags.dgSmallKeyPickedUp) {
      const distToDgSmallKey = Math.hypot(
        hero.x - DG_SMALL_KEY_POS.x,
        hero.z - DG_SMALL_KEY_POS.z
      );
      if (distToDgSmallKey < 1.95) {
        flags.dgSmallKeyPickedUp = true;
        flags.hasSmallKey = true;
        hero.hasDungeonKey = true;
        soundEngine.playKeyPickup();
        pushBanner(
          "Acquired the Small Key! (Room 2: Chasm Gallery)",
          "Return East to Room 1 (Central Hub) and unlock the Locked East Door into Room 3 (The Ember Sanctum)!",
          5.5
        );
      }
    }

    // 4d. Room 1 -> Room 3 East Small Key Door (`EAST_WING_DOOR_POS = 14.0, 0.0`) & Room 3 Ambush Slam!
    if (zone === "dungeon") {
      const distToEastDoor = Math.hypot(
        hero.x - EAST_WING_DOOR_POS.x,
        hero.z - EAST_WING_DOOR_POS.z
      );

      if (!flags.eastWingDoorUnlocked && distToEastDoor < 3.1) {
        if (flags.hasSmallKey || flags.dgSmallKeyPickedUp) {
          flags.eastWingDoorUnlocked = true;
          flags.hasSmallKey = false;
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playGateUnlock();
          pushBanner(
            "East Wing Door Unlocked! (Room 3: The Ember Sanctum)",
            "Your Small Key turned the lock — step East into Room 3 to claim the Flame Rod!",
            4.8
          );
        } else if (gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "Locked Small Key Door (To Room 3: East Wing)",
            "Explore the Open West Door (Room 2: The Chasm Gallery) first and throw your Boomerang [Q] across the pit to snag the Small Key!",
            4.6
          );
        }
      }

      // Stepping inside Room 3 (`east_wing`) slams the West Door shut behind the Hero!
      if (
        flags.eastWingDoorUnlocked &&
        !flags.eastWingCleared &&
        !flags.eastWingArenaLocked &&
        hero.x > 16.5 &&
        Math.abs(hero.z) < 8.5
      ) {
        flags.eastWingArenaLocked = true;
        hero.x = Math.max(16.6, hero.x);
        dynamicObstacles = getActiveObstacles(mapProps);
        soundEngine.playGateLocked();
        pushBanner(
          "Ambush in the Ember Sanctum! (West Door Slammed Shut!)",
          "Defeat the 3 Shielded Goblins (Stun with Boomerang [Q] or burn with Flame Rod [R]) to unlock the Flame Rod Chest!",
          5.4
        );
      } else if (
        flags.eastWingArenaLocked &&
        !flags.eastWingCleared &&
        distToEastDoor < 2.8 &&
        gateNoticeCooldown <= 0
      ) {
        gateNoticeCooldown = 3.2;
        soundEngine.playGateLocked();
        pushBanner(
          "The West Door Slammed Shut Behind You!",
          "Defeat the 3 guards to open the Flame Rod Chest, then shoot the 2 Unlit South Lanterns [R] to reopen the door!",
          4.2
        );
      }

      // Room 3 Center Treasure Chest (`FIRE_ROD_CHEST_POS = 26.0, 1.5`): Rewards the Flame Rod + Full Magic!
      if (!flags.fireRodChestOpened) {
        const distToFireChest = Math.hypot(
          hero.x - FIRE_ROD_CHEST_POS.x,
          hero.z - FIRE_ROD_CHEST_POS.z
        );
        const remainingEmberGuards = enemies.filter(
          (e) => e.questGroup === "ember_guards" && e.state !== "dead"
        );
        if (distToFireChest < 2.5) {
          if (remainingEmberGuards.length === 0) {
            flags.fireRodChestOpened = true;
            flags.hasFireRod = true;
            hero.hasFireRod = true;
            hero.mp = hero.maxMp;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired the Flame Rod! (+100% Magic Refill)",
              "Immediate Tutorial: Shoot the 2 Unlit South Lanterns with Flame Rod [R / 3] to reopen the West Door, and burn the South Spiderwebs into Room 4!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Flame Rod Chest is Guarded!",
              `Defeat the ${remainingEmberGuards.length} Shielded Goblin${remainingEmberGuards.length === 1 ? "" : "s"} in Room 3 (Stun with Boomerang [Q], then slash with Sword)!`,
              4.0
            );
          }
        }
      }

      // Room 4 Center Big Boss Key Chest (`BIG_KEY_CHEST_POS = 26.0, -24.0`): Unsealed after piercing the Cyclops Eye Statue!
      if (!flags.bigKeyChestOpened) {
        const distToBigKeyChest = Math.hypot(
          hero.x - BIG_KEY_CHEST_POS.x,
          hero.z - BIG_KEY_CHEST_POS.z
        );
        if (distToBigKeyChest < 2.5) {
          if (flags.dungeonEyeStatuesSolved) {
            flags.bigKeyChestOpened = true;
            flags.hasBigKey = true;
            hero.arrows = Math.min(99, (hero.arrows ?? 0) + 15);
            hero.mp = hero.maxMp;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired the Big Boss Key! (+15 Arrows & Full Magic)",
              "Take the West Shortcut Door back to Room 1, light all 4 Hub Lanterns [R] within 8s, and unlock the North Boss Door!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "Big Key Chest Sealed by the Cyclops Eye!",
              "Light the 4 Corner Lanterns [R], melt the 2 Ice-Armored Knights [R], and shoot the South Cyclops Eye Statue with your Bow [E / 2]!",
              4.4
            );
          }
        }
      }

      // Room 4 -> Room 1 West Shortcut Door (`CRYPT_SHORTCUT_DOOR_POS = 14.0, -24.0`) notice when still sealed
      if (!flags.dungeonEyeStatuesSolved) {
        const distToShortcutDoor = Math.hypot(
          hero.x - CRYPT_SHORTCUT_DOOR_POS.x,
          hero.z - CRYPT_SHORTCUT_DOOR_POS.z
        );
        if (distToShortcutDoor < 2.9 && gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "Sealed Crypt Shortcut Door (Room 4 <-> Room 1)",
            "Enter Room 4 from the South of Room 3 and shoot the Cyclops Eye Statue with your Bow [E] to open this shortcut!",
            4.2
          );
        }
      }
    }

    // 4e. Map 3 (`frontier` — Elderwood Highlands & Sunstone Quarry):
    // - SE Sapper Outpost NPC (`FRONTIER_SAPPER_NPC_POS = 16.0, -21.5`) & Bomb Bag Chest (`FRONTIER_BOMB_CHEST_POS = 24.5, -18.5`)
    // - North Glacial Seal Gate (`FRONTIER_CITADEL_GATE_POS = 0, 31.8`) leading into Map 5 (`citadel`)
    if (zone === "frontier") {
      const distToSapperNpc = Math.hypot(
        hero.x - FRONTIER_SAPPER_NPC_POS.x,
        hero.z - FRONTIER_SAPPER_NPC_POS.z
      );
      const remainingSappers = enemies.filter(
        (e) => e.questGroup === "frontier_sappers" && e.state !== "dead"
      );
      if (distToSapperNpc < 2.8 && chestNoticeCooldown <= 0) {
        chestNoticeCooldown = 4.2;
        soundEngine.playKeyPickup();
        if (!flags.frontierBombChestOpened) {
          if (remainingSappers.length > 0) {
            pushBanner(
              'Sapper Captain Vane: "Burn the Briars & Clear My Outpost!"',
              `Use your Flame Rod [R / 3] to burn the Dry Briars and defeat the ${remainingSappers.length} Outpost Raider${remainingSappers.length === 1 ? "" : "s"} to claim our Canvas Bomb Bag Chest!`,
              5.4
            );
          } else {
            pushBanner(
              'Sapper Captain Vane: "The Outpost is Saved! Claim the Bomb Bag!"',
              "Walk up to the Sapper Chest inside the outpost to receive the Canvas Bomb Bag (20 Bombs), then blast the East Quarry boulder into Map 4!",
              5.4
            );
          }
        } else {
          pushBanner(
            'Sapper Captain Vane: "Blast the East Quarry Pass into Map 4!"',
            "Throw a Bomb [B / 4] at the Cracked Quarry Boulder on the East Pass to enter Map 4: Frostpeak Caverns and recover the Glacial Crest Key!",
            5.0
          );
        }
      }

      if (!flags.frontierBombChestOpened) {
        const distToBombChest = Math.hypot(
          hero.x - FRONTIER_BOMB_CHEST_POS.x,
          hero.z - FRONTIER_BOMB_CHEST_POS.z
        );
        if (distToBombChest < 2.6) {
          if (remainingSappers.length === 0) {
            flags.frontierBombChestOpened = true;
            flags.frontierSappersCleared = true;
            hero.maxBombs = Math.max(hero.maxBombs ?? 0, 20);
            hero.bombs = Math.max(hero.bombs ?? 0, 15);
            hero.rupees += 50;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired the Canvas Bomb Bag! (15 Bombs + 50 Rupees!)",
              "Head to the East Quarry Pass and press B [or 4] to blast the Cracked Boulder blocking Map 4: Frostpeak Caverns!",
              6.8
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Sapper's Bomb Bag Chest is Guarded!",
              `Defeat the ${remainingSappers.length} Outpost Raider${remainingSappers.length === 1 ? "" : "s"} in the SE Sapper Outpost to unseal the Bomb Bag Chest!`,
              4.2
            );
          }
        }
      }

      // Check North Glacial Seal Gate (`FRONTIER_CITADEL_GATE_POS = 0, 31.8`) into Map 5 (`citadel`)
      if (!flags.frontierCitadelGateUnlocked) {
        const distToCitadelGate = Math.hypot(
          hero.x - FRONTIER_CITADEL_GATE_POS.x,
          hero.z - FRONTIER_CITADEL_GATE_POS.z
        );
        if (distToCitadelGate < 3.5) {
          if (flags.hasGlacialKey || flags.cavernCrestKeyPickedUp) {
            flags.frontierCitadelGateUnlocked = true;
            flags.hasGlacialKey = false;
            dynamicObstacles = getActiveObstacles(mapProps);
            soundEngine.playGateUnlock();
            pushBanner(
              "North Glacial Seal Gate Unlocked! (Map 5: Obsidian Citadel)",
              "The Glacial Crest Key shattered the ancient seal — step North into Map 5: The Obsidian Citadel!",
              5.6
            );
          } else if (gateNoticeCooldown <= 0) {
            gateNoticeCooldown = 3.2;
            soundEngine.playGateLocked();
            pushBanner(
              "North Gate Sealed! (Requires Glacial Crest Key)",
              "1. Claim the Bomb Bag in the SE Outpost -> 2. Blast the East Quarry Boulder [B] into Map 4 (Frostpeak Caverns) -> 3. Win the Glacial Crest Key!",
              5.0
            );
          }
        }
      }
    }

    // 4f. Map 4 (`caverns` — Frostpeak Caverns & Glacial Reliquary):
    // - NW Reliquary Vault Chest (`CAVERN_SHOVEL_CHEST_POS = -22.0, 20.0`): Unlocks Explorer's Iron Shovel (`G`) + Sapphire Mail (`blue_mail`)!
    // - East Glacial Sanctum Pedestal (`CAVERN_CREST_KEY_POS = 24.0, 14.0`): Unlocks Glacial Crest Key once the 3 Frost Wardens OR Cyclops Eye are cleared!
    if (zone === "caverns") {
      if (!flags.cavernShovelChestOpened) {
        const distToShovelChest = Math.hypot(
          hero.x - CAVERN_SHOVEL_CHEST_POS.x,
          hero.z - CAVERN_SHOVEL_CHEST_POS.z
        );
        if (distToShovelChest < 2.6) {
          flags.cavernShovelChestOpened = true;
          hero.hasShovel = true;
          if (!hero.unlockedTunics.includes("blue_mail")) {
            hero.unlockedTunics = [...hero.unlockedTunics, "blue_mail"];
          }
          if (hero.equippedTunic === "green_tunic") {
            hero.equippedTunic = "blue_mail";
          }
          hero.bombs = Math.min(hero.maxBombs || 20, (hero.bombs ?? 0) + 8);
          soundEngine.playVictoryFanfare();
          pushBanner(
            "Acquired Explorer's Iron Shovel [G] & Sapphire Mail (-50% DMG)!",
            "Dig the Soft Dirt Patches nearby with [G] for an Empty Bottle & Fairy, then cross the East Frozen Stream to win the Glacial Crest Key!",
            6.8
          );
        }
      }

      if (!flags.cavernCrestKeyPickedUp) {
        const distToCrestKey = Math.hypot(
          hero.x - CAVERN_CREST_KEY_POS.x,
          hero.z - CAVERN_CREST_KEY_POS.z
        );
        const remainingWardens = enemies.filter(
          (e) => e.questGroup === "cavern_wardens" && e.state !== "dead"
        );
        const canClaimCrestKey =
          Boolean(flags.cavernEyeSolved || flags.cavernWardensCleared) ||
          remainingWardens.length === 0;
        if (distToCrestKey < 2.25) {
          if (canClaimCrestKey) {
            flags.cavernCrestKeyPickedUp = true;
            flags.hasGlacialKey = true;
            hero.hasDungeonKey = true;
            soundEngine.playVictoryFanfare();
            soundEngine.playKeyPickup();
            pushBanner(
              "Acquired the Glacial Crest Key! (NE Shortcut Portal Open!)",
              "Step into the North-East Shortcut Portal (or return West to Map 3) and unlock the North Citadel Gate into Map 5!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Glacial Crest Key Pedestal is Ward-Sealed!",
              `Melt the ${remainingWardens.length} Frost Warden${remainingWardens.length === 1 ? "" : "s"} with your Flame Rod [R / 3] OR shoot the North Cyclops Eye Statue with your Bow [E / 2]!`,
              4.5
            );
          }
        }
      }
    }

    // 4g. Map 5 (`citadel` — The Obsidian Citadel & Sovereign's Throne):
    // - West Armory Chest (`CITADEL_ARMORY_CHEST_POS = -22.0, -6.0`): Unlocks Tempered Sun-Blade (2x DMG) & Aegis Mirror Shield!
    // - Inner Sanctum Gate (`CITADEL_BOSS_GATE_POS = 0, 12.0`): Unlocked by lighting the 4 Timed Braziers OR piercing the 2 Eye Statues!
    // - Sovereign's Throne (`z > 13.05`): Awakens Vaelkor, the Obsidian Sovereign (`ct-boss`)!
    // - Sovereign's Victory Chest (`CITADEL_VICTORY_CHEST_POS = -6.5, 32.0`): Unlocks Crimson Dragon Mail (-75% DMG), +1 Heart Container, & +200 Rupees!
    if (zone === "citadel") {
      if (!flags.citadelArmoryChestOpened) {
        const distToArmoryChest = Math.hypot(
          hero.x - CITADEL_ARMORY_CHEST_POS.x,
          hero.z - CITADEL_ARMORY_CHEST_POS.z
        );
        if (distToArmoryChest < 2.6) {
          flags.citadelArmoryChestOpened = true;
          hero.swordDamage = 2;
          if (!hero.unlockedPrimaries.includes("tempered_blade")) {
            hero.unlockedPrimaries = [...hero.unlockedPrimaries, "tempered_blade"];
          }
          hero.equippedPrimary = "tempered_blade";
          if (!hero.unlockedOffhands.includes("mirror_shield")) {
            hero.unlockedOffhands = [...hero.unlockedOffhands, "mirror_shield"];
          }
          hero.equippedOffhand = "mirror_shield";
          hero.shieldBlock = 2;
          hero.arrows = Math.min(99, (hero.arrows ?? 0) + 15);
          hero.mp = hero.maxMp;
          soundEngine.playVictoryFanfare();
          pushBanner(
            "Acquired Tempered Sun-Blade (2x DMG) & Aegis Mirror Shield!",
            "Your blade now strikes for 2x damage and your Mirror Shield blocks magical blasts! Unlock the North Inner Sanctum Gate to face Vaelkor!",
            6.8
          );
        }
      }

      if (!flags.citadelGateUnlocked) {
        const distToCitadelBossGate = Math.hypot(
          hero.x - CITADEL_BOSS_GATE_POS.x,
          hero.z - CITADEL_BOSS_GATE_POS.z
        );
        if (distToCitadelBossGate < 3.2 && gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "Inner Sanctum Gate Sealed! (Sovereign's Throne)",
            "Light all 4 Central Obsidian Braziers with Flame Rod [R / 3] within 8s OR shoot both North Eye Statues with Bow [E / 2]!",
            4.6
          );
        }
      } else if (
        flags.citadelGateUnlocked &&
        flags.citadelBossAwakened &&
        !flags.citadelBossDefeated
      ) {
        const distToCitadelBossGate = Math.hypot(
          hero.x - CITADEL_BOSS_GATE_POS.x,
          hero.z - CITADEL_BOSS_GATE_POS.z
        );
        if (distToCitadelBossGate < 2.8 && gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.5;
          soundEngine.playGateLocked();
          pushBanner(
            "The Sovereign's Throne Door is Sealed Shut!",
            "1. Burn Vaelkor's Obsidian Shell with Flame Rod [R] -> 2. Shoot Open Eye with Bow [E] -> 3. Slash with Tempered Blade [Space]!",
            4.2
          );
        }
      }

      if (
        flags.citadelGateUnlocked &&
        !flags.citadelBossAwakened &&
        hero.z > 13.05
      ) {
        flags.citadelBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        hero.z = Math.max(13.58, hero.z);
        soundEngine.playGateLocked();
        soundEngine.playBossRoar();
        pushBanner(
          "Vaelkor, the Obsidian Sovereign Awakens!",
          "Phase 1: Burn his Obsidian Shell [R] or Blast with Bomb [B] • Phase 2: Pierce Open Eye [E / Q] • Phase 3: Slash with Sword [Space]!",
          6.5
        );
      }

      if (!flags.citadelVictoryChestOpened) {
        const distToVictoryChest = Math.hypot(
          hero.x - CITADEL_VICTORY_CHEST_POS.x,
          hero.z - CITADEL_VICTORY_CHEST_POS.z
        );
        if (distToVictoryChest < 2.6) {
          if (flags.citadelBossDefeated) {
            flags.citadelVictoryChestOpened = true;
            if (!hero.unlockedTunics.includes("red_mail")) {
              hero.unlockedTunics = [...hero.unlockedTunics, "red_mail"];
            }
            hero.equippedTunic = "red_mail";
            hero.maxHp += 2;
            hero.hp = hero.maxHp;
            hero.mp = hero.maxMp;
            hero.damageFractionAcc = 0;
            hero.rupees += 200;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Sovereign's Relic Chest! (Crimson Dragon Mail + Heart + 200 Rupees!)",
              "You conquered all 5 Realms! Step through the North Golden Return Portal to travel back to Map 1 Crossroads as Champion!",
              7.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Sovereign's Relic Chest is Sealed!",
              "Vanquish Vaelkor, the Obsidian Sovereign, and his Shadow Guard to unseal the ultimate reward!",
              4.0
            );
          }
        }
      }
    }

    // 5. Check North Boss Door in Room 1 (`LOCKED_GATE_POS = 0, 12.0` -> requires 4 Lit Hub Lanterns AND Big Boss Key!)
    if (zone === "dungeon" && !flags.gateUnlocked) {
      const distToGate = Math.hypot(
        hero.x - LOCKED_GATE_POS.x,
        hero.z - LOCKED_GATE_POS.z
      );
      if (distToGate < 3.2) {
        if (flags.dungeonTimedTorchSolved && flags.hasBigKey) {
          flags.gateUnlocked = true;
          soundEngine.playGateUnlock();
          pushBanner(
            "North Boss Door Unlocked! (Room 5: Lair of Ignis)",
            "The 4 Hub Lantern iron bars dropped and your Big Boss Key turned the lock — step North to face Ignis!",
            5.2
          );
        } else if (gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          if (!flags.dungeonTimedTorchSolved && !flags.hasBigKey) {
            pushBanner(
              "North Boss Door Blocked (Iron Bars + Big Boss Key Lock)",
              "Light all 4 Central Hub Lanterns [R] within 8s AND bring the Big Boss Key from Room 4 (Dark Archery Crypt)!",
              4.6
            );
          } else if (!flags.dungeonTimedTorchSolved) {
            pushBanner(
              "Heavy Iron Bars Block the North Boss Door!",
              "You have the Big Boss Key — now light all 4 Central Hub Lanterns around the raised platform with your Flame Rod [R] within 8s!",
              4.6
            );
          } else {
            pushBanner(
              "Big Boss Lock Sealed!",
              "The 4 Hub Lantern iron bars are down! Now earn the Big Boss Key in Room 4 (South-East Dark Archery Crypt)!",
              4.6
            );
          }
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
          "The Boss Lair Door is Sealed Shut!",
          "1. Burn Ignis's Carapace with Flame Rod [R] -> 2. Shoot Open Eye with Bow [E] -> 3. Slash with Sword [Space]!",
          4.0
        );
      }
    }

    // 6. Check Boss Awakening immediately when stepping past the doorway threshold into Room 5
    if (zone === "dungeon" && flags.gateUnlocked && !flags.bossAwakened && hero.z > 13.05) {
      flags.bossAwakened = true;
      flags.bossState = "ARMORED";
      flags.bossArmorTimer = 0;
      hero.z = Math.max(13.58, hero.z);
      soundEngine.playGateLocked();
      soundEngine.playBossRoar();
      pushBanner(
        "Ignis, the Armored Eye-Golem",
        "Phase 1: Burn its Carapace with Flame Rod [R] • Phase 2: Shoot Open Eye with Bow [E] • Phase 3: Slash with Sword [Space]!",
        6.0
      );
    }

    const gatePassable =
      zone === "overworld"
        ? Boolean(flags.dungeonEntryUnlocked || flags.keyPickedUp || hero.hasDungeonKey)
        : zone === "frontier"
        ? Boolean(flags.frontierCitadelGateUnlocked || flags.hasGlacialKey || flags.cavernCrestKeyPickedUp)
        : zone === "citadel"
        ? Boolean(flags.citadelGateUnlocked && (!flags.citadelBossAwakened || flags.citadelBossDefeated))
        : Boolean(flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated));
    const bossExitOpen =
      zone === "citadel" ? Boolean(flags.citadelBossDefeated) : Boolean(flags.bossDefeated);

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

    // 8. Update Boomerang Flight (flies over low `water_tile` moats & drags snagged Rupees/Hearts & Keys back to the Hero!)
    if (boomerang) {
      if (boomerang.zone !== zone) {
        boomerang = null;
      } else {
        boomerang.spinAngle += dt * 22;
        if (!boomerang.carriedRupeeIds) {
          boomerang.carriedRupeeIds = [];
        }

        if (!boomerang.returning) {
          const speed = 16.0;
          const step = speed * dt;
          boomerang.distanceTraveled += step;
          const nextBx = boomerang.x + boomerang.dirX * step;
          const nextBz = boomerang.z + boomerang.dirZ * step;
          // Use `resolveArrowCollisions` so the Boomerang flies right over low `water_tile` gaps while bouncing off walls/pillars!
          const resB = resolveArrowCollisions(
            nextBx,
            nextBz,
            0.42,
            zone,
            gatePassable,
            dynamicObstacles
          );
          boomerang.x = resB.x;
          boomerang.z = resB.z;
          if (resB.hitObstacle || boomerang.distanceTraveled >= 11.2) {
            boomerang.returning = true;
          }
        } else {
          const toHx = hero.x - boomerang.x;
          const toHz = hero.z - boomerang.z;
          const distH = Math.hypot(toHx, toHz);
          if (distH < 1.2) {
            // Deliver any snagged Sanctum Key, Room 2 Small Key, Map 4 Glacial Key, or Rupees directly into the Hero's hands!
            if (boomerang.carryingKey && !flags.keyPickedUp) {
              flags.keyPickedUp = true;
              hero.hasDungeonKey = true;
              soundEngine.playKeyPickup();
              pushBanner(
                "Boomerang Fetched the Sanctum Entry Key!",
                "Return East to Map 1 Crossroads and take the North Exit to unlock Map 2 (Sunken Sanctum)!",
                5.5
              );
            }
            if (boomerang.carryingDgSmallKey && !flags.dgSmallKeyPickedUp) {
              flags.dgSmallKeyPickedUp = true;
              flags.hasSmallKey = true;
              hero.hasDungeonKey = true;
              soundEngine.playKeyPickup();
              pushBanner(
                "Boomerang Fetched the Small Key Across the Chasm!",
                "Return East to Room 1 (Central Hub) and unlock the Locked East Door into Room 3 (The Ember Sanctum)!",
                5.8
              );
            }
            if (boomerang.carryingGlacialKey && !flags.cavernCrestKeyPickedUp) {
              flags.cavernCrestKeyPickedUp = true;
              flags.hasGlacialKey = true;
              hero.hasDungeonKey = true;
              soundEngine.playVictoryFanfare();
              soundEngine.playKeyPickup();
              pushBanner(
                "Boomerang Fetched the Glacial Crest Key!",
                "Step into the North-East Shortcut Portal (or return West to Map 3) and unlock the North Citadel Gate into Map 5!",
                6.2
              );
            }
            for (const cId of boomerang.carriedRupeeIds) {
              const r = rupees.find((item) => item.id === cId);
              if (r && !r.collected) {
                r.collected = true;
                if (r.tier === "heart") {
                  hero.hp = Math.min(hero.maxHp, hero.hp + (r.value || 2));
                } else {
                  hero.rupees += r.value;
                }
                soundEngine.playRupeePickup(r.tier);
                if (r.id === "rupee-ow-river-gap" || r.id === "rupee-dg-water-gap") {
                  pushBanner(
                    "Boomerang Snagged Treasure Across the Chasm! (+20 Rupees)",
                    "Your Gale Boomerang pulled the distant Red Rupee right across the gap!",
                    4.0
                  );
                }
              }
            }
            boomerang = null;
          } else {
            const retSpeed = 18.5;
            boomerang.x += (toHx / distH) * retSpeed * dt;
            boomerang.z += (toHz / distH) * retSpeed * dt;
          }
        }

        // Boomerang snags & drags the Map 1B Grove Key, Room 2 Dungeon Small Key, Map 4 Glacial Key, and Rupees/Recovery Hearts in flight!
        if (boomerang) {
          if (
            zone === "grove" &&
            !flags.keyPickedUp &&
            !boomerang.carryingKey &&
            Math.hypot(DUNGEON_KEY_POS.x - boomerang.x, DUNGEON_KEY_POS.z - boomerang.z) < 1.65
          ) {
            boomerang.carryingKey = true;
            boomerang.returning = true;
            soundEngine.playLift();
            pushBanner(
              "Boomerang Snagged the Sanctum Key!",
              "Pulling the golden key from the Grove Shrine pedestal...",
              3.2
            );
          }

          if (
            zone === "dungeon" &&
            !flags.dgSmallKeyPickedUp &&
            !boomerang.carryingDgSmallKey &&
            Math.hypot(DG_SMALL_KEY_POS.x - boomerang.x, DG_SMALL_KEY_POS.z - boomerang.z) < 1.85
          ) {
            boomerang.carryingDgSmallKey = true;
            boomerang.returning = true;
            soundEngine.playLift();
            pushBanner(
              "Boomerang Snagged the Small Key Across the Chasm!",
              "Pulling the gleaming Small Key from the West Chasm pedestal...",
              3.4
            );
          }

          if (
            zone === "caverns" &&
            !flags.cavernCrestKeyPickedUp &&
            !boomerang.carryingGlacialKey &&
            (flags.cavernEyeSolved || flags.cavernWardensCleared) &&
            Math.hypot(CAVERN_CREST_KEY_POS.x - boomerang.x, CAVERN_CREST_KEY_POS.z - boomerang.z) < 1.85
          ) {
            boomerang.carryingGlacialKey = true;
            boomerang.returning = true;
            soundEngine.playLift();
            pushBanner(
              "Boomerang Snagged the Glacial Crest Key!",
              "Pulling the Glacial Crest Key from the East Sanctum pedestal...",
              3.4
            );
          }

          for (const rupee of rupees) {
            if (rupee.zone !== zone || rupee.collected) continue;
            if ((rupee.spawnBounceTimer ?? 0) > 0.12) continue;
            if (
              !boomerang.carriedRupeeIds!.includes(rupee.id) &&
              Math.hypot(rupee.x - boomerang.x, rupee.z - boomerang.z) < 1.48
            ) {
              boomerang.carriedRupeeIds!.push(rupee.id);
              boomerang.returning = true;
              soundEngine.playLift();
            }
          }

          // Visibly pull all snagged rupees along with the returning Boomerang!
          for (const cId of boomerang.carriedRupeeIds!) {
            const r = rupees.find((item) => item.id === cId);
            if (!r || r.collected) continue;
            r.x = boomerang.x;
            r.z = boomerang.z;
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

    // 8c. Crystal Switch Orb Toggling & Wall Eye Statue Deflection (Sword Swing, Spin Attack, or Boomerang)
    for (const prop of mapProps) {
      if (prop.zone !== zone) continue;
      if (prop.prefab !== "crystal_switch" && prop.prefab !== "eye_statue") continue;
      if (prop.prefab === "crystal_switch" && (prop.hitCooldown ?? 0) > 0) continue;

      let hitProp = false;
      if (hero.isAttacking && hero.attackTimer > 0.04) {
        const dx = prop.x - hero.x;
        const dz = prop.z - hero.z;
        const dist = Math.hypot(dx, dz);
        const reach = (hero.isSpinAttacking ? 3.35 : 2.95) + 0.75;
        if (dist <= reach) {
          if (hero.isSpinAttacking) {
            hitProp = true;
          } else {
            const angleToProp = Math.atan2(dx, dz);
            const angleDiff = Math.abs(normalizeAngleDiff(angleToProp, hero.facing));
            if (angleDiff <= 1.42 || dist <= 1.45) {
              hitProp = true;
            }
          }
        }
      }

      if (!hitProp && boomerang) {
        if (Math.hypot(prop.x - boomerang.x, prop.z - boomerang.z) <= 1.35) {
          hitProp = true;
          boomerang.returning = true;
        }
      }

      if (hitProp) {
        if (prop.prefab === "crystal_switch") {
          toggleCrystalSwitch(prop.id);
        } else if (prop.prefab === "eye_statue" && !prop.eyeActivated) {
          soundEngine.playArmorDeflect();
          if (armorNoticeCooldown <= 0) {
            armorNoticeCooldown = 2.8;
            pushBanner(
              "Melee & Boomerang Bounce Off the Eye Statue!",
              "Aim and shoot an Arrow with your Bow [E / 2] into its Open Eye!",
              3.5
            );
          }
        }
      }
    }

    // Helper to handle enemy defeat & rupee / recovery heart drops (including 5x Bounty Monster Fountain, Heirloom Sub-Quest, & Room 3 Ember Guards!)
    const handleEnemyDeath = (enemy: EnemyState) => {
      enemy.hp = 0;
      enemy.state = "dead";
      stats.enemiesDefeated += 1;

      if (enemy.kind === "boss") {
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
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

        if (enemy.isBounty) {
          // BOUNTY MONSTER: Drops 5x Rupees in a celebratory radial fountain!
          soundEngine.playSecretSolve();
          const bountyOffsets = [
            { ox: 0, oz: 0 },
            { ox: -0.95, oz: 0.55 },
            { ox: 0.95, oz: 0.55 },
            { ox: -0.75, oz: -0.85 },
            { ox: 0.75, oz: -0.85 },
          ];
          bountyOffsets.forEach((off, bIdx) => {
            rupees.push({
              id: `drop-bounty-${enemy.id}-${bIdx}-${stats.elapsedSeconds.toFixed(2)}`,
              zone,
              x: enemy.x + off.ox,
              z: enemy.z + off.oz,
              tier,
              value,
              collected: false,
              spawnBounceTimer: 0.44 + bIdx * 0.04,
            });
          });
          pushBanner(
            `Bounty Monster Vanquished! (5x Rupee Drop: +${value * 5} Rupees!)`,
            "Gold/Crimson Bounty Monsters drop 5x Rupees to help fund the 100-Rupee Shop Upgrade!",
            4.2
          );
        } else {
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
        }

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

      // Check if all Eastern Bandit Cave monsters (`questGroup === "heirloom"`) are now cleared!
      if (enemy.questGroup === "heirloom" && !flags.heirloomMonstersCleared) {
        const remainingHeirloomFoes = enemies.filter(
          (e) => e.questGroup === "heirloom" && e.state !== "dead"
        );
        if (remainingHeirloomFoes.length === 0) {
          flags.heirloomMonstersCleared = true;
          soundEngine.playSecretSolve();
          pushBanner(
            "Recovered Elder Rowan's Golden Heirloom!",
            "You cleared out the Eastern Bandit Cave! Return to Elder Rowan outside the cave for your 50-Rupee reward!",
            5.8
          );
        }
      }

      // Check if all 3 Map 1B Grove Ambush Monsters (`questGroup === "grove_ambush"`) are defeated!
      if (enemy.questGroup === "grove_ambush" && !flags.grovePuzzleSolved) {
        const remainingAmbushFoes = enemies.filter(
          (e) => e.questGroup === "grove_ambush" && e.state !== "dead"
        );
        if (remainingAmbushFoes.length === 0) {
          flags.grovePuzzleSolved = true;
          ensureMutableMapProps();
          for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
            const mp = mapProps[pIdx];
            if (mp.zone === "grove" && mp.prefab === "crystal_switch") {
              mp.switchState = "orange";
            } else if (mp.zone === "grove" && mp.prefab === "crystal_barrier") {
              mp.hasCollider = false;
              mp.y = -2.45;
            }
          }
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playSecretSolve();
          pushBanner(
            "Grove Ambush Cleared! (Shrine Barrier Lowered!)",
            "All 3 Forest Grove ambush monsters vanquished — claim the Sanctum Entry Key & Flame Rod at the pedestal!",
            5.5
          );
        }
      }

      // Check if all 3 Room 3 Ember Sanctum Shielded Goblins (`questGroup === "ember_guards"`) are defeated!
      if (enemy.questGroup === "ember_guards" && !flags.fireRodChestOpened) {
        const remainingEmberGuards = enemies.filter(
          (e) => e.questGroup === "ember_guards" && e.state !== "dead"
        );
        if (remainingEmberGuards.length === 0) {
          soundEngine.playSecretSolve();
          pushBanner(
            "Ember Sanctum Guards Vanquished! (Flame Rod Chest Unsealed!)",
            "Walk up to the center Treasure Chest in Room 3 to claim the Flame Rod & Full Magic!",
            5.5
          );
        }
      }

      // Check if all 3 Map 3 Frontier Sapper Outpost Raiders (`questGroup === "frontier_sappers"`) are defeated!
      if (enemy.questGroup === "frontier_sappers" && !flags.frontierBombChestOpened) {
        const remainingSappers = enemies.filter(
          (e) => e.questGroup === "frontier_sappers" && e.state !== "dead"
        );
        if (remainingSappers.length === 0) {
          flags.frontierSappersCleared = true;
          soundEngine.playSecretSolve();
          pushBanner(
            "Sapper Outpost Cleared! (Bomb Bag Chest Unsealed!)",
            "Walk up to the Sapper Chest in the SE Outpost to claim the Canvas Bomb Bag (15 Bombs + 50 Rupees)!",
            5.8
          );
        }
      }

      // Check if all 3 Map 4 Frostpeak Caverns Wardens (`questGroup === "cavern_wardens"`) are defeated!
      if (enemy.questGroup === "cavern_wardens" && !flags.cavernWardensCleared) {
        const remainingWardens = enemies.filter(
          (e) => e.questGroup === "cavern_wardens" && e.state !== "dead"
        );
        if (remainingWardens.length === 0) {
          flags.cavernWardensCleared = true;
          soundEngine.playSecretSolve();
          pushBanner(
            "Frost Wardens Vanquished! (Glacial Crest Key Unsealed!)",
            "Claim the Glacial Crest Key at the East Sanctum Pedestal (or shoot the North Cyclops Eye with Bow [E] for +20 Rupees)!",
            5.8
          );
        }
      }
    };

    const isBossRoomSealed = (e: EnemyState): boolean =>
      (e.zone === "dungeon" && (e.kind === "boss" || e.spawnZ > 13) && !flags.bossAwakened) ||
      (e.zone === "citadel" && (e.kind === "boss" || e.spawnZ > 13) && !flags.citadelBossAwakened);

    // 9. Update Arrows & Stone Spitter Turret Rock Projectiles
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

      // Check if a Hero arrow strikes a Crystal Switch Orb or Wall Eye Statue before obstacle collision!
      if (arrow.fromHero && !arrow.isRock) {
        let hitPropWithArrow = false;
        for (const prop of mapProps) {
          if (prop.zone !== zone) continue;
          if (prop.prefab === "crystal_switch" && Math.hypot(nextAx - prop.x, nextAz - prop.z) <= 0.95) {
            toggleCrystalSwitch(prop.id);
            arrow.stuck = true;
            arrow.stuckTimer = 1.8;
            arrow.x = nextAx - Math.sin(arrow.angle) * 0.12;
            arrow.z = nextAz - Math.cos(arrow.angle) * 0.12;
            soundEngine.playArrowStick();
            remainingArrows.push(arrow);
            hitPropWithArrow = true;
            break;
          } else if (
            prop.prefab === "eye_statue" &&
            Math.hypot(nextAx - prop.x, nextAz - prop.z) <= 1.2
          ) {
            activateEyeStatue(prop.id);
            arrow.stuck = true;
            arrow.stuckTimer = 3.5;
            arrow.x = prop.x;
            arrow.z = prop.z - 0.32;
            soundEngine.playArrowStick();
            remainingArrows.push(arrow);
            hitPropWithArrow = true;
            break;
          }
        }
        if (hitPropWithArrow) continue;
      }

      const resA = resolveArrowCollisions(
        nextAx,
        nextAz,
        0.22,
        zone,
        gatePassable,
        dynamicObstacles
      );
      if (resA.hitObstacle) {
        if (arrow.isRock) {
          soundEngine.playPotSmash();
          bushBursts.push({
            id: `rock-shot-shatter-${arrow.id}`,
            zone,
            x: arrow.x,
            z: arrow.z,
            timer: 0.55,
            maxTimer: 0.55,
            seed: Math.floor(Math.abs(arrow.x * 37 + arrow.z * 73) + stats.elapsedSeconds * 110),
            isRock: true,
          });
          continue;
        }
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
        // Hero arrow or Shield-deflected Turret Rock hits enemies!
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.55 : enemy.kind === "turret" ? 1.05 : 0.85;
          if (Math.hypot(enemy.x - arrow.x, enemy.z - arrow.z) <= eRad) {
            arrowConsumed = true;

            // Prevent sniping or waking the Boss/Sanctum Minions from outside the Boss Room before entering!
            if (isBossRoomSealed(enemy)) {
              soundEngine.playArmorDeflect();
              soundEngine.playArrowStick();
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.5;
                pushBanner(
                  zone === "citadel" ? "Enter the Sovereign's Throne!" : "Enter Room 5: Lair of Ignis!",
                  zone === "citadel"
                    ? "Step through the Inner Sanctum Gate to challenge Vaelkor, the Obsidian Sovereign!"
                    : "Step through the North Boss Door to challenge Ignis, the Armored Eye-Golem!",
                  3.2
                );
              }
            } else if (arrow.isRock) {
              // Deflected Turret Rock smashes into the enemy!
              enemy.provoked = true;
              soundEngine.playPotSmash();
              bushBursts.push({
                id: `rock-hit-enemy-${arrow.id}`,
                zone,
                x: enemy.x,
                z: enemy.z,
                timer: 0.65,
                maxTimer: 0.65,
                seed: Math.floor(Math.abs(enemy.x * 41 + enemy.z * 83) + stats.elapsedSeconds * 120),
                isRock: true,
              });
              if (enemy.kind === "boss") {
                soundEngine.playArmorDeflect();
              } else {
                enemy.hp -= arrow.damage;
                enemy.hitFlashTimer = 0.26;
                enemy.stunTimer = Math.max(enemy.stunTimer, 1.2);
                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                  if (enemy.kind === "turret") {
                    pushBanner(
                      "Stone Spitter Turret Shattered! (+20 Rupees)",
                      "Your Shield-deflected rock shots pulverized the Stone Spitter Turret!",
                      4.5
                    );
                  }
                } else {
                  soundEngine.playEnemyHit(false);
                  if (enemy.kind === "turret" && armorNoticeCooldown <= 0) {
                    armorNoticeCooldown = 2.6;
                    pushBanner(
                      "Deflected Rock Struck the Stone Turret! (-2 HP)",
                      "Keep walking forward with your Shield [RMB / Shift] raised!",
                      3.0
                    );
                  }
                }
              }
              break;
            } else {
              enemy.provoked = true;
              if (enemy.kind === "boss") {
                // Boss 3-Step Vulnerability Loop:
                // - ARMORED: Carapace deflects Arrows! Must burn with Flame Rod [R] first!
                // - EXPOSED_EYE: Arrow pierces the giant glowing chest Eye and crashes Boss to the floor ("STUNNED") for 4.0s!
                // - STUNNED: Arrow deals 2 damage while Boss is down!
                const bossName = zone === "citadel" ? "Vaelkor" : "Ignis";
                if (flags.bossState === "ARMORED") {
                  soundEngine.playArmorDeflect();
                  soundEngine.playArrowStick();
                  enemy.hitFlashTimer = 0.16;
                  if (armorNoticeCooldown <= 0) {
                    armorNoticeCooldown = 2.8;
                    pushBanner(
                      `${bossName}'s Outer Carapace Deflects Arrows!`,
                      `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] first to burn away its outer shell!`,
                      3.6
                    );
                  }
                } else if (flags.bossState === "EXPOSED_EYE") {
                  flags.bossState = "STUNNED";
                  enemy.state = "stunned";
                  enemy.stateTimer = 4.0;
                  enemy.hp -= 2;
                  enemy.hitFlashTimer = 0.35;
                  soundEngine.playEyeStatueHit();
                  soundEngine.playBossWallCrash();
                  if (enemy.hp <= 0) {
                    handleEnemyDeath(enemy);
                  } else {
                    soundEngine.playArrowStick();
                    pushBanner(
                      `Phase 2 Complete: Open Eye Pierced — ${bossName} Stunned! (-2 HP)`,
                      `Phase 3: Rush in and slash ${bossName} with your Sword [Space / LMB] or Charged Spin Attack while dazed on the floor!`,
                      4.4
                    );
                  }
                } else {
                  enemy.hp -= 2;
                  enemy.hitFlashTimer = 0.28;
                  soundEngine.playEyeStatueHit();
                  if (enemy.hp <= 0) {
                    handleEnemyDeath(enemy);
                  } else {
                    soundEngine.playEnemyHit(true);
                    soundEngine.playArrowStick();
                  }
                }
              } else if (enemy.shieldArmor === "wood" || enemy.shieldArmor === "ice") {
                soundEngine.playShieldBlock();
                soundEngine.playArrowStick();
                enemy.hitFlashTimer = 0.16;
                if (enemy.state === "idle" || enemy.state === "recover") {
                  enemy.state = "aggro";
                }
                if (armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 2.8;
                  pushBanner(
                    enemy.shieldArmor === "ice"
                      ? "Glacial Ice Armor Deflects Your Arrow!"
                      : "Wooden Shield Blocks Your Arrow!",
                    enemy.shieldArmor === "ice"
                      ? "Cast the Flame Rod [R / 3] to melt their Ice Armor first!"
                      : "Stun with your Boomerang [Q / 1] or burn with the Flame Rod [R / 3] first!",
                    3.4
                  );
                }
              } else {
                enemy.hp -= arrow.damage;
                enemy.hitFlashTimer = 0.22;
                if (enemy.kind !== "turret") {
                  if (enemy.state === "idle" || enemy.state === "recover") {
                    enemy.state = "aggro";
                  }
                  enemy.actionCooldown = Math.min(enemy.actionCooldown, 0.15);
                }
                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                } else {
                  soundEngine.playEnemyHit(false);
                  soundEngine.playArrowStick();
                }
              }
            }

            // Embed arrow into the enemy's body in local enemy coordinates so it moves & rotates with them!
            if (enemy.hp > 0 && !arrow.isRock) {
              const dirX = Math.sin(arrow.angle);
              const dirZ = Math.cos(arrow.angle);
              const perpX = dirZ;
              const perpZ = -dirX;
              const dx = arrow.x - enemy.x;
              const dz = arrow.z - enemy.z;
              const rawLat = dx * perpX + dz * perpZ;
              const maxLat =
                enemy.kind === "boss"
                  ? 0.35
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
        // Enemy Arrow or Stone Spitter Turret Rock hits Hero!
        if (Math.hypot(hero.x - arrow.x, hero.z - arrow.z) <= 0.95) {
          arrowConsumed = true;
          const arrowFromAngle = arrow.angle + Math.PI;
          const canBlockArrow =
            hero.isBlocking && isFacingAttack(arrowFromAngle);

          if (arrow.isRock) {
            if (canBlockArrow) {
              // SHIELD DEFLECTS TURRET ROCK SHOT BACK DOWN THE AISLE / BRIDGE!
              soundEngine.playShieldBlock();
              bushBursts.push({
                id: `rock-deflect-burst-${arrow.id}`,
                zone,
                x: hero.x + Math.sin(hero.facing) * 0.65,
                z: hero.z + Math.cos(hero.facing) * 0.65,
                timer: 0.45,
                maxTimer: 0.45,
                seed: Math.floor(stats.elapsedSeconds * 190),
                isRock: true,
              });
              hero.knockbackVx = Math.sin(arrow.angle) * 1.6;
              hero.knockbackVz = Math.cos(arrow.angle) * 1.6;
              hero.invulnerableTimer = Math.max(hero.invulnerableTimer, 0.2);

              arrow.fromHero = true;
              arrow.deflectedRock = true;
              arrow.angle = hero.facing;
              arrow.speed = 16.5;
              arrow.damage = 2;
              arrow.lifeTimer = 1.6;
              arrow.x = hero.x + Math.sin(hero.facing) * 0.88;
              arrow.z = hero.z + Math.cos(hero.facing) * 0.88;
              remainingArrows.push(arrow);

              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.2;
                pushBanner(
                  "Shield Deflected the Turret Projectile!",
                  "Keep holding Shield [RMB / Shift] while crossing to deflect turret shots right back!",
                  3.2
                );
              }
            } else {
              soundEngine.playPotSmash();
              bushBursts.push({
                id: `rock-hurt-burst-${arrow.id}`,
                zone,
                x: arrow.x,
                z: arrow.z,
                timer: 0.55,
                maxTimer: 0.55,
                seed: Math.floor(stats.elapsedSeconds * 170),
                isRock: true,
              });
              damageHero(
                arrow.damage,
                Math.sin(arrow.angle) * 10.5,
                Math.cos(arrow.angle) * 10.5,
                false,
                false,
                arrowFromAngle,
                1.2
              );
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.2;
                pushBanner(
                  "Pelted by the Stone Turret!",
                  "Hold Shield [RMB / Shift] facing the Turret to block and deflect its shots!",
                  3.8
                );
              }
            }
          } else {
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
      }

      if (!arrowConsumed) {
        remainingArrows.push(arrow);
      }
    }
    arrows = remainingArrows;

    // 9b. Torch Combination Puzzles, Timed 4-Torch Squares, Burnable Barriers, Magic Fireballs & Fire Zones
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
        // Room 3 (The Ember Sanctum): Lighting the 2 South Lanterns (`prop-dg-puzzle-torch-1..2`) reopens the West Door!
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
          flags.eastWingArenaLocked = false;
          flags.eastWingCleared = true;
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playGateUnlock();
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `dg-torch-secret-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: 24.8,
              z: -8.0,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `dg-torch-secret-heart-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: 27.2,
              z: -8.0,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Ember Sanctum Lanterns Lit! (West Door Reopened!)",
            "Now shoot the Thick Spiderwebs on the South Door with your Flame Rod [R / 3] to enter Room 4 (The Dark Archery Crypt)!",
            5.8
          );
        }
      }
    };

    // Check Timed Torch Square Puzzles (4 lanterns with `timedDuration: 8` lit simultaneously!)
    const checkTimedTorchPuzzles = () => {
      const timedTorches = mapProps.filter(
        (p) =>
          p.zone === zone &&
          p.prefab === "wall_torch" &&
          (p.timedDuration ?? 0) > 0
      );
      if (
        timedTorches.length > 0 &&
        !timedTorches.every((p) => p.timedSolved) &&
        timedTorches.every((p) => p.lit !== false)
      ) {
        ensureMutableMapProps();
        let sumX = 0;
        let sumZ = 0;
        for (let i = 0; i < mapProps.length; i++) {
          const mp = mapProps[i];
          if (mp.zone === zone && mp.prefab === "wall_torch" && (mp.timedDuration ?? 0) > 0) {
            mp.timedSolved = true;
            mp.lit = true;
            mp.litTimer = mp.timedDuration ?? 8;
            sumX += mp.x;
            sumZ += mp.z;
          }
        }
        const centerX = sumX / timedTorches.length;
        const centerZ = sumZ / timedTorches.length;
        soundEngine.playSecretSolve();

        if (zone === "dungeon") {
          flags.dungeonTimedTorchSolved = true;
          rupees.push(
            {
              id: `timed-torch-dg-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: centerX - 0.65,
              z: centerZ,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.46,
            },
            {
              id: `timed-torch-dg-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "dungeon",
              x: centerX + 0.65,
              z: centerZ,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.46,
            }
          );
          if (flags.hasBigKey && !flags.gateUnlocked) {
            flags.gateUnlocked = true;
            soundEngine.playGateUnlock();
            pushBanner(
              "4 Hub Lanterns Lit & Big Key Ready! (Boss Lair Unlocked!)",
              "The heavy iron bars dropped and your Big Boss Key unlocked the North Door — enter Room 5 to challenge Ignis!",
              6.2
            );
          } else {
            pushBanner(
              "4 Central Hub Lanterns Lit! (Iron Bars Lowered!)",
              "The heavy iron bars on the North Boss Door dropped! Now bring the Big Boss Key from Room 4 to unlock the Boss Lock!",
              5.8
            );
          }
        } else if (zone === "citadel") {
          flags.citadelTimedTorchSolved = true;
          flags.citadelGateUnlocked = true;
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playGateUnlock();
          rupees.push(
            {
              id: `timed-torch-ct-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "citadel",
              x: centerX - 0.7,
              z: centerZ,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.46,
            },
            {
              id: `timed-torch-ct-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "citadel",
              x: centerX + 0.7,
              z: centerZ,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.46,
            }
          );
          pushBanner(
            "4 Obsidian Braziers Lit! (Inner Sanctum Gate Unsealed!)",
            "The Inner Sanctum Gate is open — step North to challenge Vaelkor, the Obsidian Sovereign!",
            6.2
          );
        } else {
          flags.overworldTimedTorchSolved = true;
          rupees.push(
            {
              id: `timed-torch-ow-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone,
              x: centerX - 0.7,
              z: centerZ,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.46,
            },
            {
              id: `timed-torch-ow-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone,
              x: centerX + 0.7,
              z: centerZ,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.46,
            },
            {
              id: `timed-torch-ow-heart-${stats.elapsedSeconds.toFixed(2)}`,
              zone,
              x: centerX,
              z: centerZ + 0.65,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.46,
            }
          );
          pushBanner(
            "4-Lantern Timed Square Solved! (+40 Rupees & Heart)",
            "All 4 timed lanterns were lit simultaneously within the 8-second countdown!",
            5.2
          );
        }
      }
    };

    // Tick down 8-second Timed Torches (`litTimer`) and Burning Barriers (`burningTimer`)
    for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
      const prop = mapProps[pIdx];
      if (prop.zone !== zone) continue;

      // 1. Timed Torch 8-Second Countdown
      if (
        prop.prefab === "wall_torch" &&
        (prop.timedDuration ?? 0) > 0 &&
        prop.lit !== false &&
        !prop.timedSolved
      ) {
        ensureMutableMapProps();
        const mp = mapProps[pIdx];
        const nextTimer = Math.max(0, (mp.litTimer ?? mp.timedDuration ?? 8) - dt);
        mp.litTimer = nextTimer;
        if (nextTimer <= 0) {
          mp.lit = false;
          mp.litTimer = 0;
          soundEngine.playTorchExtinguish();
        }
      }

      // 2. Burnable Barrier (`briar_barrier` & `spiderweb_barrier`) Ash Disintegration
      if (
        (prop.prefab === "briar_barrier" || prop.prefab === "spiderweb_barrier") &&
        !prop.smashed &&
        (prop.burningTimer ?? 0) > 0
      ) {
        ensureMutableMapProps();
        const mp = mapProps[pIdx];
        const nextBurn = Math.max(0, (mp.burningTimer ?? 0) - dt);
        mp.burningTimer = nextBurn;
        if (nextBurn <= 0) {
          mp.smashed = true;
          mp.hasCollider = false;
          mp.burningTimer = 0;
          if (mp.prefab === "spiderweb_barrier") {
            flags.webBarrierBurned = true;
            flags.eastWingArenaLocked = false;
            flags.eastWingCleared = true;
          }
          dynamicObstacles = getActiveObstacles(mapProps);
          bushBursts.push({
            id: `burn-finish-${mp.id}-${stats.elapsedSeconds.toFixed(3)}`,
            zone,
            x: mp.x,
            z: mp.z,
            timer: 0.85,
            maxTimer: 0.85,
            seed: Math.floor(Math.abs(mp.x * 53 + mp.z * 89) + stats.elapsedSeconds * 120),
            isDirt: mp.prefab === "briar_barrier",
          });
          if (mp.prefab === "spiderweb_barrier") {
            pushBanner(
              "Thick Spiderwebs Incinerated! (Room 4: Dark Archery Crypt Open!)",
              "The Flame Rod burned away the web barrier — step South into Room 4 and light the 4 Corner Lanterns [R]!",
              5.4
            );
          } else if (mp.id.startsWith("prop-ow-east-exit-briar")) {
            flags.eastExitBurned = true;
            pushBanner(
              "East Exit Barrier Burned! (Map 3: Burned Pass Open!)",
              "The dry vines blocking the East Exit crumbled to ash — step through the portal into Map 3!",
              5.0
            );
          } else if (mp.id === "prop-ow-ledge-briar") {
            pushBanner(
              "Locked Ledge Vines Burned! (+40 Rupees & Heart)",
              "The Flame Rod cleared the high ledge brambles — claim the hidden Rupees & Heart!",
              4.5
            );
          } else {
            pushBanner(
              "Dry Briar Barrier Burned Away!",
              "The thorny brambles crumbled to ash under your Flame Rod!",
              4.0
            );
          }
        }
      }
    }

    const igniteBurnableBarrier = (pIdx: number): boolean => {
      const prop = mapProps[pIdx];
      if (
        !prop ||
        prop.smashed ||
        (prop.burningTimer ?? 0) > 0 ||
        (prop.prefab !== "briar_barrier" && prop.prefab !== "spiderweb_barrier")
      ) {
        return false;
      }
      ensureMutableMapProps();
      mapProps[pIdx].burningTimer = 0.55;
      soundEngine.playBurnBarrier();
      bushBursts.push({
        id: `burn-start-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
        zone,
        x: prop.x,
        z: prop.z,
        timer: 0.75,
        maxTimer: 0.75,
        seed: Math.floor(Math.abs(prop.x * 37 + prop.z * 73) + stats.elapsedSeconds * 110),
        isDirt: prop.prefab === "briar_barrier",
      });
      return true;
    };

    const meltOrBurnEnemyShield = (enemy: EnemyState): boolean => {
      if (enemy.shieldArmor !== "wood" && enemy.shieldArmor !== "ice") {
        return false;
      }
      const wasIce = enemy.shieldArmor === "ice";
      enemy.shieldArmor = "none";
      enemy.hitFlashTimer = 0.3;
      enemy.stunTimer = Math.max(enemy.stunTimer, 0.85);
      soundEngine.playBurnBarrier();
      bushBursts.push({
        id: `shield-break-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
        zone,
        x: enemy.x,
        z: enemy.z,
        timer: 0.85,
        maxTimer: 0.85,
        seed: Math.floor(Math.abs(enemy.x * 61 + enemy.z * 97) + stats.elapsedSeconds * 130),
        isRock: wasIce,
        isDirt: !wasIce,
      });
      pushBanner(
        wasIce ? "Glacial Ice Armor Melted!" : "Wooden Shield Burned Away!",
        "The monster's defense is destroyed — strike with your Sword or Bow!",
        3.5
      );
      return true;
    };

    // Helper: Burn away Boss Ignis's outer Ice/Bramble Carapace with the Flame Rod (`R`) -> transitions `bossState` from `"ARMORED"` to `"EXPOSED_EYE"` for 8.0s!
    const burnBossIgnisCarapace = (bossEnemy: EnemyState) => {
      if (flags.bossState === "ARMORED" || !flags.bossState) {
        flags.bossState = "EXPOSED_EYE";
        flags.bossArmorTimer = 8.0;
        bossEnemy.hitFlashTimer = 0.32;
        soundEngine.playBurnBarrier();
        bushBursts.push({
          id: `boss-carapace-burn-${stats.elapsedSeconds.toFixed(3)}`,
          zone,
          x: bossEnemy.x,
          z: bossEnemy.z,
          timer: 0.85,
          maxTimer: 0.85,
          seed: Math.floor(stats.elapsedSeconds * 150),
          isDirt: true,
        });
        pushBanner(
          "Phase 1 Complete: Ignis's Carapace Burned Away! (8s)",
          "Phase 2: Its Giant Chest Eye is OPEN — shoot it with your Bow [E / 2] (or Boomerang [Q]) to knock it down!",
          4.5
        );
      } else if (flags.bossState === "EXPOSED_EYE") {
        flags.bossArmorTimer = Math.max(flags.bossArmorTimer ?? 0, 7.5);
        bossEnemy.hitFlashTimer = 0.2;
        soundEngine.playBurnBarrier();
      } else if (flags.bossState === "STUNNED") {
        bossEnemy.hp -= 1;
        bossEnemy.hitFlashTimer = 0.24;
        if (bossEnemy.hp <= 0) {
          handleEnemyDeath(bossEnemy);
        } else {
          soundEngine.playEnemyHit(false);
        }
      }
    };

    const lightTorchAtPropIndex = (pIdx: number) => {
      const prop = mapProps[pIdx];
      if (!prop || prop.prefab !== "wall_torch") return;
      const wasUnlit = prop.lit === false;
      ensureMutableMapProps();
      mapProps[pIdx].lit = true;
      if ((prop.timedDuration ?? 0) > 0 && !prop.timedSolved) {
        mapProps[pIdx].litTimer = prop.timedDuration ?? 8;
      }
      if (wasUnlit) {
        soundEngine.playTorchLight();
      }
      // Lighting both East Exit Torches on the East edge of Map 1 also burns away the East Exit Dry Vines!
      if (prop.zone === "overworld" && prop.id.startsWith("prop-ow-east-exit-torch")) {
        const eastTorches = mapProps.filter(
          (mp) => mp.zone === "overworld" && mp.id.startsWith("prop-ow-east-exit-torch")
        );
        if (eastTorches.length > 0 && eastTorches.every((mp) => mp.lit !== false)) {
          for (let bIdx = 0; bIdx < mapProps.length; bIdx++) {
            if (mapProps[bIdx].id.startsWith("prop-ow-east-exit-briar")) {
              igniteBurnableBarrier(bIdx);
            }
          }
        }
      }
      checkTorchCombinationPuzzles();
      checkTimedTorchPuzzles();
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
      // Ignite any burnable barriers or torches caught in the charged explosion!
      for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
        const prop = mapProps[pIdx];
        if (prop.zone !== zone) continue;
        if (prop.prefab === "wall_torch" && Math.hypot(fx - prop.x, fz - prop.z) <= 2.75) {
          lightTorchAtPropIndex(pIdx);
        } else if (
          (prop.prefab === "briar_barrier" || prop.prefab === "spiderweb_barrier") &&
          !prop.smashed &&
          Math.hypot(fx - prop.x, fz - prop.z) <= 3.2
        ) {
          igniteBurnableBarrier(pIdx);
        }
      }
      // Immediate splash damage on explosion (also melts Ice Armor, burns Wooden Shields, & burns Boss Carapace)!
      for (const enemy of enemies) {
        if (enemy.zone !== zone || enemy.state === "dead") continue;
        const eRad = enemy.kind === "boss" ? 1.5 : 0.9;
        if (Math.hypot(enemy.x - fx, enemy.z - fz) <= 2.25 + eRad) {
          if (isBossRoomSealed(enemy)) continue;
          enemy.provoked = true;
          meltOrBurnEnemyShield(enemy);
          if (enemy.kind === "boss") {
            burnBossIgnisCarapace(enemy);
          } else {
            enemy.hp -= 2;
            enemy.hitFlashTimer = 0.26;
            if (enemy.kind !== "turret" && (enemy.state === "idle" || enemy.state === "recover")) {
              enemy.state = "aggro";
            }
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
            } else {
              soundEngine.playEnemyHit(false);
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

      // Light any unlit/timed wall_torch, ignite any briar/spiderweb barrier, or toggle any crystal_switch along the fireball's path!
      let hitSwitchOrBarrierWithFb = false;
      for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
        const prop = mapProps[pIdx];
        if (prop.zone !== zone) continue;
        if (prop.prefab === "wall_torch") {
          if (Math.hypot(nextFx - prop.x, nextFz - prop.z) <= fb.radius + 0.95) {
            if (prop.lit === false || ((prop.timedDuration ?? 0) > 0 && !prop.timedSolved)) {
              lightTorchAtPropIndex(pIdx);
            }
          }
        } else if (
          (prop.prefab === "briar_barrier" || prop.prefab === "spiderweb_barrier") &&
          !prop.smashed
        ) {
          const halfW = prop.colliderWidth * prop.scaleX * 0.5 + fb.radius + 0.35;
          const halfD = prop.colliderDepth * prop.scaleZ * 0.5 + fb.radius + 0.35;
          if (Math.abs(nextFx - prop.x) <= halfW && Math.abs(nextFz - prop.z) <= halfD) {
            igniteBurnableBarrier(pIdx);
            hitSwitchOrBarrierWithFb = true;
          }
        } else if (prop.prefab === "crystal_switch") {
          if (Math.hypot(nextFx - prop.x, nextFz - prop.z) <= fb.radius + 0.85) {
            toggleCrystalSwitch(prop.id);
            hitSwitchOrBarrierWithFb = true;
          }
        } else if (prop.prefab === "eye_statue") {
          if (Math.hypot(nextFx - prop.x, nextFz - prop.z) <= fb.radius + 1.05) {
            soundEngine.playArmorDeflect();
            if (!prop.eyeActivated && armorNoticeCooldown <= 0) {
              armorNoticeCooldown = 2.8;
              pushBanner(
                "Magic Fire Bounces Off the Eye Statue!",
                "Shoot its Open Eye with your Bow & Arrow [E / 2]!",
                3.4
              );
            }
            hitSwitchOrBarrierWithFb = true;
          }
        }
      }
      if (hitSwitchOrBarrierWithFb) {
        if (fb.isCharged) {
          spawnChargedFireZone(fb.x, fb.z);
        } else {
          soundEngine.playFireExplosion();
        }
        continue;
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
            if (isBossRoomSealed(enemy)) {
              soundEngine.playArmorDeflect();
            } else {
              enemy.provoked = true;
              meltOrBurnEnemyShield(enemy);
              if (enemy.kind === "boss") {
                burnBossIgnisCarapace(enemy);
              } else {
                enemy.hp -= fb.damage;
                enemy.hitFlashTimer = 0.24;
                if (enemy.kind !== "turret" && (enemy.state === "idle" || enemy.state === "recover")) {
                  enemy.state = "aggro";
                }
                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                } else {
                  soundEngine.playEnemyHit(false);
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

      // Also light any unlit/timed torch or burnable barrier touching the fire zone!
      for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
        const prop = mapProps[pIdx];
        if (prop.zone !== zone) continue;
        if (prop.prefab === "wall_torch" && prop.lit === false) {
          if (Math.hypot(fz.x - prop.x, fz.z - prop.z) <= fz.radius + 0.65) {
            lightTorchAtPropIndex(pIdx);
          }
        } else if (
          (prop.prefab === "briar_barrier" || prop.prefab === "spiderweb_barrier") &&
          !prop.smashed &&
          Math.hypot(fz.x - prop.x, fz.z - prop.z) <= fz.radius + 1.4
        ) {
          igniteBurnableBarrier(pIdx);
        }
      }

      fz.tickTimer -= dt;
      if (fz.tickTimer <= 0) {
        fz.tickTimer = 0.55;
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.35 : 0.75;
          if (Math.hypot(enemy.x - fz.x, enemy.z - fz.z) <= fz.radius + eRad * 0.5) {
            if (isBossRoomSealed(enemy)) continue;
            enemy.provoked = true;
            meltOrBurnEnemyShield(enemy);
            if (enemy.kind === "boss") {
              burnBossIgnisCarapace(enemy);
            } else {
              enemy.hp -= 1;
              enemy.hitFlashTimer = 0.2;
              if (enemy.kind !== "turret" && enemy.state === "idle") {
                enemy.state = "aggro";
              }
              if (enemy.hp <= 0) {
                handleEnemyDeath(enemy);
              } else {
                soundEngine.playEnemyHit(false);
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
        if (isBossRoomSealed(enemy)) continue;
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
          if (nearestEnemy.kind === "boss") {
            soundEngine.playArmorDeflect();
          } else if (nearestEnemy.shieldArmor === "wood" || nearestEnemy.shieldArmor === "ice") {
            soundEngine.playShieldBlock();
          } else {
            nearestEnemy.hp -= 1;
            nearestEnemy.hitFlashTimer = 0.18;
            if (nearestEnemy.kind !== "turret" && nearestEnemy.state === "idle") {
              nearestEnemy.state = "aggro";
            }
            if (nearestEnemy.hp <= 0) {
              handleEnemyDeath(nearestEnemy);
            } else {
              soundEngine.playEnemyHit(false);
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

    // 9c. Update Thrown Clay Pots & Light Rocks in Flight (`thrownObjects`)
    const remainingThrown: ThrownObjectState[] = [];
    for (const obj of thrownObjects) {
      if (obj.zone !== zone) continue;
      obj.flightTime += dt;
      const t = Math.min(1, obj.flightTime / obj.totalFlightTime);
      const nextX = obj.startX + (obj.targetX - obj.startX) * t;
      const nextZ = obj.startZ + (obj.targetZ - obj.startZ) * t;
      obj.y = Math.max(0, (1 - t) * 1.55 + Math.sin(t * Math.PI) * 1.35);

      let shouldSmash = t >= 1;

      // Check if thrown pot/rock hits a Crystal Switch
      for (const prop of mapProps) {
        if (prop.prefab !== "crystal_switch" || prop.zone !== zone) continue;
        if (Math.hypot(nextX - prop.x, nextZ - prop.z) <= 1.25) {
          toggleCrystalSwitch(prop.id);
          shouldSmash = true;
          break;
        }
      }

      // Check if thrown pot/rock hits an Enemy (deals 2 damage on impact, unless blocked by Wood Shield / Ice Armor!)
      if (!shouldSmash) {
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.45 : 0.85;
          if (Math.hypot(enemy.x - nextX, enemy.z - nextZ) <= eRad + 0.55) {
            shouldSmash = true;
            if (!isBossRoomSealed(enemy)) {
              enemy.provoked = true;
              if (enemy.kind === "boss") {
                soundEngine.playArmorDeflect();
                if (armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 3.2;
                  pushBanner(
                    "Boss Carapace Deflects Thrown Vessels!",
                    "Burn the carapace with Flame Rod [R / 3], then shoot the Open Eye with Bow [E / 2]!",
                    3.4
                  );
                }
              } else if (enemy.shieldArmor === "wood" || enemy.shieldArmor === "ice") {
                soundEngine.playShieldBlock();
                enemy.hitFlashTimer = 0.16;
                if (armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 2.8;
                  pushBanner(
                    enemy.shieldArmor === "ice"
                      ? "Glacial Ice Armor Deflects the Vessel!"
                      : "Wooden Shield Blocks the Vessel!",
                    "Cast the Flame Rod [R / 3] to melt or burn their defense first!",
                    3.2
                  );
                }
              } else {
                enemy.hp -= 2;
                enemy.hitFlashTimer = 0.25;
                const dx = enemy.x - obj.startX;
                const dz = enemy.z - obj.startZ;
                const d = Math.hypot(dx, dz) || 1;
                if (enemy.kind !== "turret") {
                  enemy.knockbackVx = (dx / d) * 6.5;
                  enemy.knockbackVz = (dz / d) * 6.5;
                  if (enemy.state === "idle" || enemy.state === "recover") {
                    enemy.state = "aggro";
                  }
                }
                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                } else {
                  soundEngine.playEnemyHit(false);
                }
              }
            }
            break;
          }
        }
      }

      // Check obstacle collision
      if (!shouldSmash) {
        const resT = resolveArrowCollisions(
          nextX,
          nextZ,
          0.35,
          zone,
          gatePassable,
          dynamicObstacles
        );
        if (resT.hitObstacle) {
          shouldSmash = true;
        } else {
          obj.x = nextX;
          obj.z = nextZ;
        }
      }

      if (shouldSmash) {
        smashPotOrRock(obj.x, obj.z, obj.kind, obj.potReward, obj.id);
      } else {
        remainingThrown.push(obj);
      }
    }
    thrownObjects = remainingThrown;

    // 9d. Update Active Bombs (`activeBombs` — Arc Flight, Fuse Countdown, & Explosion Blast!)
    const remainingBombs: BombProjectileState[] = [];
    for (const bomb of activeBombs) {
      if (bomb.zone !== zone) continue;

      if (bomb.exploded) {
        bomb.explosionTimer = (bomb.explosionTimer ?? 0.42) - dt;
        if (bomb.explosionTimer > 0) {
          remainingBombs.push(bomb);
        }
        continue;
      }

      // Move thrown bomb along arc if airborne or sliding
      if (bomb.y > 0 || Math.hypot(bomb.vx, bomb.vz) > 0.08) {
        const nextBx = bomb.x + bomb.vx * dt;
        const nextBz = bomb.z + bomb.vz * dt;
        const resB = resolveWorldCollisions(
          nextBx,
          nextBz,
          0.38,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        if (resB.hitObstacle) {
          bomb.vx *= -0.35;
          bomb.vz *= -0.35;
        } else {
          bomb.x = resB.x;
          bomb.z = resB.z;
        }
        bomb.vy -= 18.5 * dt;
        bomb.y = Math.max(0, bomb.y + bomb.vy * dt);
        if (bomb.y === 0) {
          bomb.vy = 0;
          bomb.vx *= Math.exp(-12 * dt);
          bomb.vz *= Math.exp(-12 * dt);
        }
      }

      bomb.fuseTimer -= dt;
      if (bomb.fuseTimer <= 0) {
        // DETONATE BOMB!
        bomb.exploded = true;
        bomb.explosionTimer = 0.44;
        bomb.y = 0;
        soundEngine.playBombExplosion();

        const blastRadius = 3.5;

        // 1. Blow up any Explodable Cracked Rocks (`cracked_rock`), Pots (`clay_pot`), or Light Rocks (`light_rock`) in blast radius!
        for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
          const prop = mapProps[pIdx];
          if (prop.zone !== zone) continue;
          const distToProp = Math.hypot(prop.x - bomb.x, prop.z - bomb.z);

          if (prop.prefab === "cracked_rock" && !prop.smashed && distToProp <= 3.85) {
            ensureMutableMapProps();
            mapProps[pIdx].smashed = true;
            mapProps[pIdx].hasCollider = false;
            bushBursts.push({
              id: `cracked-rock-burst-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: prop.x,
              z: prop.z,
              timer: 0.95,
              maxTimer: 0.95,
              seed: Math.floor(Math.abs(prop.x * 59 + prop.z * 97) + stats.elapsedSeconds * 110),
              isRock: true,
            });
            soundEngine.playSecretSolve();
            if (prop.id === "prop-ow-cracked-cave-rock") {
              pushBanner(
                "Secret Echo Cave Entrance Unsealed!",
                "Your bomb shattered the cracked boulder blocking the North-West cliffside cave (+50 Rupees inside)!",
                5.5
              );
            } else if (prop.id === "prop-ow-stash-cracked-rock") {
              pushBanner(
                "Secret Rupee Stash Cave Unsealed! (+50 Rupees Inside!)",
                "Your bomb blasted open the South-West corner cave — step inside to claim the 50-Rupee Stash Chest!",
                5.5
              );
            } else if (prop.id === "prop-fr-east-cracked-rock") {
              pushBanner(
                "East Quarry Boulder Shattered! (Map 4: Frostpeak Caverns Open!)",
                "Your bomb unsealed the East Quarry Pass — step through the portal into Map 4: Frostpeak Caverns!",
                5.5
              );
            } else if (prop.id === "prop-cv-vault-cracked-rock") {
              pushBanner(
                "Reliquary Vault Unsealed! (Iron Shovel & Sapphire Mail Inside!)",
                "Step North into the NW Reliquary Vault to claim the Explorer's Iron Shovel [G] & Sapphire Mail!",
                5.5
              );
            } else {
              pushBanner(
                "Cracked Boulder Shattered!",
                "The bomb explosion pulverized the fractured stone!",
                3.6
              );
            }
          } else if (
            (prop.prefab === "clay_pot" || prop.prefab === "light_rock") &&
            !prop.smashed &&
            distToProp <= blastRadius
          ) {
            ensureMutableMapProps();
            mapProps[pIdx].smashed = true;
            mapProps[pIdx].hasCollider = false;
            smashPotOrRock(prop.x, prop.z, prop.prefab, prop.potReward, prop.id);
          } else if (prop.prefab === "crystal_switch" && distToProp <= 3.65) {
            toggleCrystalSwitch(prop.id);
          } else if (
            prop.prefab === "bush" &&
            !cutBushIds.includes(prop.id) &&
            distToProp <= blastRadius
          ) {
            cutBushIds.push(prop.id);
            bushBursts.push({
              id: `bush-burst-bomb-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: prop.x,
              z: prop.z,
              timer: 0.85,
              maxTimer: 0.85,
              seed: Math.floor(Math.abs(prop.x * 41 + prop.z * 83) + stats.elapsedSeconds * 130),
            });
          }
        }

        if (mapPropsMutated) {
          dynamicObstacles = buildObstaclesFromMapProps(mapProps);
        }

        // 2. Deal 3 Heavy Blast Damage to Enemies in blast radius (and crack/stagger Boss!)
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.5 : 0.85;
          const dx = enemy.x - bomb.x;
          const dz = enemy.z - bomb.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= blastRadius + eRad) {
            if (isBossRoomSealed(enemy)) continue;
            enemy.provoked = true;
            if (enemy.kind === "boss") {
              if (flags.bossState === "ARMORED") {
                burnBossIgnisCarapace(enemy);
              } else {
                const bossName = zone === "citadel" ? "Vaelkor" : "Ignis";
                soundEngine.playBossWallCrash();
                flags.bossState = "STUNNED";
                flags.bossArmorTimer = 3.8;
                enemy.state = "stunned";
                enemy.stateTimer = 3.8;
                enemy.hitFlashTimer = 0.28;
                pushBanner(
                  `Bomb Blast Knocked Down ${bossName}! (Phase 3: Melee Punish!)`,
                  "Rush in and slash with your Sword [Space / LMB] before his carapace regenerates!",
                  3.6
                );
              }
            } else {
              if (enemy.shieldArmor) {
                enemy.shieldArmor = undefined;
              }
              enemy.hp -= 3;
              enemy.hitFlashTimer = 0.28;
              if (enemy.kind !== "turret") {
                const pushX = dist > 0.01 ? dx / dist : 0;
                const pushZ = dist > 0.01 ? dz / dist : 1;
                enemy.knockbackVx = pushX * 11.5;
                enemy.knockbackVz = pushZ * 11.5;
                if (enemy.state === "idle" || enemy.state === "recover") {
                  enemy.state = "aggro";
                }
              }
              if (enemy.hp <= 0) {
                handleEnemyDeath(enemy);
              } else {
                soundEngine.playEnemyHit(false);
              }
            }
          }
        }

        // 3. Damage Hero if standing right on top of the explosion
        const hDx = hero.x - bomb.x;
        const hDz = hero.z - bomb.z;
        const hDist = Math.hypot(hDx, hDz);
        if (hDist <= 2.15) {
          const pushX = hDist > 0.01 ? (hDx / hDist) * 11.5 : 0;
          const pushZ = hDist > 0.01 ? (hDz / hDist) * 11.5 : -11.5;
          const angleToBomb = Math.atan2(bomb.x - hero.x, bomb.z - hero.z);
          damageHero(1, pushX, pushZ, false, false, angleToBomb, 4.0);
        }
      }

      remainingBombs.push(bomb);
    }
    activeBombs = remainingBombs;

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
        enemy.kind === "boss" ? 1.35 : enemy.kind === "knight" || enemy.kind === "turret" ? 0.85 : 0.7;

      // Check if Boomerang hits this enemy -> stuns Electrified (`shockArmor`), Wooden-Shielded Goblins, or Boss Open Eye!
      if (boomerang && !boomerang.hitEnemyIds.includes(enemy.id)) {
        if (Math.hypot(enemy.x - boomerang.x, enemy.z - boomerang.z) <= enemyRadius + 0.65) {
          boomerang.hitEnemyIds.push(enemy.id);
          boomerang.returning = true;
          if (isBossRoomSealed(enemy)) {
            soundEngine.playArmorDeflect();
          } else {
            enemy.provoked = true;
            if (enemy.kind === "boss") {
              const bossName = zone === "citadel" ? "Vaelkor" : "Ignis";
              if (flags.bossState === "EXPOSED_EYE") {
                // Phase 2 -> Phase 3: Stunning Boss's Open Eye with the Boomerang!
                flags.bossState = "STUNNED";
                flags.bossArmorTimer = 4.0;
                enemy.state = "stunned";
                enemy.stateTimer = 4.0;
                enemy.hitFlashTimer = 0.35;
                enemy.knockbackVx = 0;
                enemy.knockbackVz = 0;
                soundEngine.playEyeStatueHit();
                soundEngine.playBossWallCrash();
                pushBanner(
                  `Boomerang Stunned ${bossName}'s Open Eye! (Phase 3: Melee Punish!)`,
                  `${bossName} crashed to the ground dazed for 4s — rush in and slash with your Sword [Space / LMB]!`,
                  4.2
                );
              } else if (flags.bossState === "STUNNED" || enemy.state === "stunned") {
                soundEngine.playEyeStatueHit();
                pushBanner(
                  `${bossName} is Stunned on the Floor!`,
                  "Phase 3: Rush in and slash with your Sword [Space / LMB] for massive damage!",
                  3.2
                );
              } else {
                soundEngine.playArmorDeflect();
                if (armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 3.2;
                  pushBanner(
                    `${bossName}'s Outer Carapace Deflects Boomerang!`,
                    `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] to burn away his outer shell first!`,
                    3.4
                  );
                }
              }
            } else if (enemy.shieldArmor === "ice") {
              soundEngine.playShieldBlock();
              enemy.hitFlashTimer = 0.16;
              if (enemy.state === "idle") {
                enemy.state = "aggro";
              }
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 2.8;
                pushBanner(
                  "Glacial Ice Armor Deflects Boomerang!",
                  "Cast the Flame Rod [R / 3] to melt their Glacial Ice Armor first!",
                  3.2
                );
              }
            } else if (enemy.shieldArmor === "wood") {
              // Boomerang stuns Wooden-Shielded Goblins for 2.0s so the player can slash past their guard in Room 3!
              enemy.stunTimer = 2.0;
              enemy.hitFlashTimer = 0.24;
              if (enemy.state !== "stunned") {
                enemy.state = "aggro";
              }
              enemy.actionCooldown = Math.min(enemy.actionCooldown, 0.2);
              soundEngine.playEyeStatueHit();
              soundEngine.playEnemyHit(false);
              pushBanner(
                "Shielded Goblin Stunned for 2 Seconds!",
                "Its wooden shield is lowered while dizzy — slash it with your Sword now!",
                3.2
              );
            } else if (enemy.shockArmor) {
              // Boomerang Utility: Stun Electrified / Spiked Enemy for 2.0 full seconds so it is safe to slash with the Sword!
              enemy.stunTimer = 2.0;
              enemy.hitFlashTimer = 0.26;
              if (enemy.state !== "stunned") {
                enemy.state = "aggro";
              }
              enemy.actionCooldown = Math.min(enemy.actionCooldown, 0.2);
              soundEngine.playEyeStatueHit();
              soundEngine.playEnemyHit(false);
              pushBanner(
                "Spiked Beetle Stunned for 2 Seconds!",
                "Its electric spike shell is disabled while dizzy — slash it with your Sword now!",
                3.4
              );
            } else {
              enemy.hp -= 1;
              enemy.hitFlashTimer = 0.22;
              // Short stagger on ranged/heavy enemies so Goblin Archers & Knights immediately fight back!
              enemy.stunTimer =
                enemy.kind === "archer" || enemy.kind === "turret"
                  ? 0.35
                  : enemy.kind === "knight"
                  ? 0.2
                  : 0.75;
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
              // Boss 3-Step Vulnerability Loop: Phase 3 Melee Punish when STUNNED!
              const bossName = zone === "citadel" ? "Vaelkor" : "Ignis";
              enemy.knockbackVx = 0;
              enemy.knockbackVz = 0;
              if (flags.bossState === "STUNNED" || enemy.state === "stunned") {
                const bossPunishDamage = strikeDamage * 3;
                enemy.hp -= bossPunishDamage;
                enemy.hitFlashTimer = 0.3;
                if (enemy.hp <= 0) {
                  flags.bossState = "DEAD";
                  handleEnemyDeath(enemy);
                  continue;
                } else {
                  soundEngine.playEnemyHit(true);
                  pushBanner(
                    isSpin
                      ? `Spin Attack Punish on ${bossName}! (-${bossPunishDamage} HP!)`
                      : `Sword Punish on Stunned ${bossName}! (-${bossPunishDamage} HP!)`,
                    "Keep slashing with your Sword before his outer carapace regenerates!",
                    2.8
                  );
                }
              } else if (flags.bossState === "EXPOSED_EYE") {
                soundEngine.playArmorDeflect();
                if (armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 3.0;
                  pushBanner(
                    `${bossName}'s Chest Eye is Open — Shoot to Stun Him First!`,
                    "Phase 2: Shoot his glowing Open Eye with your Bow [E / 2] or Boomerang [Q / 1] to knock him down!",
                    3.5
                  );
                }
              } else {
                soundEngine.playArmorDeflect();
                if (armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 3.2;
                  pushBanner(
                    `${bossName}'s Outer Carapace Deflects Your Sword!`,
                    `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] to burn away his outer shell first!`,
                    3.6
                  );
                }
              }
            } else if (enemy.shockArmor && enemy.stunTimer <= 0) {
              // Slashing an active Electrified / Spiked Enemy without stunning it with the Boomerang shocks the Hero!
              soundEngine.playElectricShock();
              enemy.hitFlashTimer = 0.18;
              const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
              const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);
              const w = Math.max(0.25, enemy.weight ?? getDefaultEnemyWeight(enemy.kind));
              damageHero(
                1,
                -kbDirX * 10.5,
                -kbDirZ * 10.5,
                false,
                false,
                angleToEnemy,
                w,
                true
              );
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.0;
                pushBanner(
                  "Shocked by Electrified Spikes!",
                  "Throw your Boomerang [Q / 1] to stun this enemy for 2 seconds before slashing!",
                  3.8
                );
              }
            } else if (
              enemy.shieldArmor === "ice" ||
              (enemy.shieldArmor === "wood" && enemy.stunTimer <= 0 && !isSpin)
            ) {
              // Glacial Ice Armor or an active Wooden Shield blocks frontal Sword strikes!
              soundEngine.playShieldBlock();
              enemy.hitFlashTimer = 0.16;
              const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
              const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);
              enemy.knockbackVx = kbDirX * 2.2;
              enemy.knockbackVz = kbDirZ * 2.2;
              if (enemy.state === "idle") {
                enemy.state = "aggro";
              }
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 2.8;
                pushBanner(
                  enemy.shieldArmor === "ice"
                    ? "Glacial Ice Armor Deflects Your Sword!"
                    : "Wooden Shield Blocks Frontal Slash!",
                  enemy.shieldArmor === "ice"
                    ? "Cast the Flame Rod [R / 3] to melt their Glacial Ice Armor first!"
                    : "Stun with Boomerang [Q], unleash a Spin Attack [Hold Space], or burn with Flame Rod [R]!",
                  3.5
                );
              }
            } else {
              // If Wooden-Shielded Goblin was hit by a Charged Spin Attack or while stunned, shatter its wooden shield!
              if (enemy.shieldArmor === "wood") {
                enemy.shieldArmor = undefined;
              }
              // Weight-based knockback system!
              enemy.hp -= strikeDamage;
              enemy.hitFlashTimer = 0.22;

              const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
              const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);
              const w = Math.max(0.25, enemy.weight ?? getDefaultEnemyWeight(enemy.kind));

              let kbImpulse = 0;
              if (w >= 50 || enemy.kind === "turret") {
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

      // Boss Rage Phase at 50% HP (spawns 2 Shadow Skeletons & intensifies Ignis / Vaelkor!)
      if (
        enemy.kind === "boss" &&
        enemy.hp <= Math.ceil(enemy.maxHp / 2) &&
        ((zone === "dungeon" && !flags.bossPhase2) ||
          (zone === "citadel" && !flags.citadelBossPhase2))
      ) {
        if (zone === "citadel") {
          flags.citadelBossPhase2 = true;
        } else {
          flags.bossPhase2 = true;
        }
        const bossName = zone === "citadel" ? "Vaelkor" : "Ignis";
        soundEngine.playBossRoar();
        pushBanner(
          `${bossName} Enters His Molten Rage Phase!`,
          "Two Shadow Guards rise in the corners — keep burning his shell [R], stunning his Eye [E], and slashing [Space]!",
          4.2
        );
        const wave2Coords = [
          { id: `${zone}-minion-wave2-1`, x: -8.5, z: 28.5 },
          { id: `${zone}-minion-wave2-2`, x: 8.5, z: 28.5 },
        ];
        wave2Coords.forEach((wc) => {
          enemies.push({
            id: wc.id,
            kind: "minion",
            zone,
            x: wc.x,
            z: wc.z,
            spawnX: wc.x,
            spawnZ: wc.z,
            facing: Math.PI,
            hp: 4,
            maxHp: 4,
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
            speed: 5.5,
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
      const isSanctumEnemy =
        (enemy.zone === "dungeon" || enemy.zone === "citadel") && enemy.spawnZ > 13;
      const enemyWeight = enemy.weight ?? getDefaultEnemyWeight(enemy.kind);

      // =====================================================
      // DEDICATED BOSS AI STATE MACHINE ("IGNIS" & "VAELKOR")
      // =====================================================
      if (enemy.kind === "boss") {
        const bossName = zone === "citadel" ? "Vaelkor" : "Ignis";
        const isCurrentBossAwakened =
          zone === "citadel" ? Boolean(flags.citadelBossAwakened) : Boolean(flags.bossAwakened);
        const isCurrentBossPhase2 =
          zone === "citadel" ? Boolean(flags.citadelBossPhase2) : Boolean(flags.bossPhase2);

        // Tick Phase 2 Exposed Eye countdown -> regenerates carapace if not stunned in time!
        if (flags.bossState === "EXPOSED_EYE" && enemy.state !== "stunned") {
          flags.bossArmorTimer = Math.max(0, (flags.bossArmorTimer ?? 0) - dt);
          if (flags.bossArmorTimer <= 0) {
            flags.bossState = "ARMORED";
            soundEngine.playArmorDeflect();
            pushBanner(
              `${bossName}'s Outer Carapace Regenerated!`,
              `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] to burn off his shell again!`,
              3.4
            );
          }
        }

        if (enemy.state === "idle") {
          if (isCurrentBossAwakened || enemy.provoked) {
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
              zone,
              startX: enemy.x,
              startZ: enemy.z,
              targetX,
              targetZ,
              flightTime: 0,
              totalFlightTime: 1.15,
              aoeRadius: 3.3,
              directHitRadius: 1.45,
            });

            if (isCurrentBossPhase2) {
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
                zone,
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
            enemy.actionCounter += 1;
            enemy.actionCooldown = 1.1;
            if (flags.bossState === "EXPOSED_EYE") {
              flags.bossState = "STUNNED";
              flags.bossArmorTimer = 3.8;
              enemy.state = "stunned";
              enemy.stateTimer = 3.8;
              pushBanner(
                `${bossName} Crashed into the Wall! (Phase 3: Melee Punish!)`,
                "He is dazed on the floor — rush in and slash with your Sword [Space / LMB]!",
                3.6
              );
            } else {
              enemy.state = "recover";
              enemy.stateTimer = 0.85;
              pushBanner(
                `${bossName} Slammed into the Wall! (Carapace Still Intact)`,
                "Phase 1: Burn his shell with the Flame Rod [R / 3], then shoot his Open Eye with Bow [E]!",
                3.5
              );
            }
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
          flags.bossState = "STUNNED";
          flags.bossArmorTimer = Math.max(0, enemy.stateTimer);
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.95;
            flags.bossState = "ARMORED";
            flags.bossArmorTimer = 0;
            soundEngine.playArmorDeflect();
            pushBanner(
              `${bossName} Recovered & Regenerated His Carapace!`,
              `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] to burn off his shell again!`,
              3.5
            );
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
        if (enemy.kind === "turret") {
          enemy.x = enemy.spawnX;
          enemy.z = enemy.spawnZ;
          enemy.knockbackVx = 0;
          enemy.knockbackVz = 0;
          continue;
        }
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
      // STONE SPITTER TURRET AI STATE MACHINE (Spits Rock Shots Down the Narrow Bridge!)
      // =====================================================
      if (enemy.kind === "turret") {
        enemy.x = enemy.spawnX;
        enemy.z = enemy.spawnZ;
        enemy.knockbackVx = 0;
        enemy.knockbackVz = 0;

        const heroInBridgeLane =
          Math.abs(hero.x - enemy.x) <= 5.5 &&
          hero.z <= enemy.z + 2.0 &&
          enemy.z - hero.z <= 17.5;
        const canFire =
          enemy.provoked || heroInBridgeLane || distToHero <= enemy.aggroRadius;

        if (enemy.state === "idle") {
          enemy.facing = Math.PI;
          if (canFire) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.25;
          }
        } else if (enemy.state === "aggro") {
          if (!canFire) {
            enemy.state = "idle";
            enemy.facing = Math.PI;
          } else {
            if (distToHero > 0.05) {
              enemy.facing = Math.atan2(toHeroX, toHeroZ);
            }
            if (enemy.actionCooldown <= 0) {
              enemy.state = "windup";
              enemy.stateTimer = 0.32;
              enemy.chargeAngle = enemy.facing;
            }
          }
        } else if (enemy.state === "windup") {
          if (distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
          if (enemy.stateTimer <= 0) {
            soundEngine.playRockSpit();
            arrows.push({
              id: `turret-rock-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              fromHero: false,
              isRock: true,
              x: enemy.x + Math.sin(enemy.facing) * 0.95,
              z: enemy.z + Math.cos(enemy.facing) * 0.95,
              angle: enemy.facing,
              speed: 13.0,
              damage: enemy.damage,
              lifeTimer: 1.85,
            });
            enemy.state = "recover";
            enemy.stateTimer = 0.25;
            enemy.actionCooldown = 0.85;
          }
        } else if (enemy.state === "recover") {
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
          }
        }

        // Prevent Hero from walking directly through the stone turret pedestal
        const tDx = hero.x - enemy.x;
        const tDz = hero.z - enemy.z;
        const tDist = Math.hypot(tDx, tDz);
        if (tDist < 1.35) {
          const pushX = tDist > 0.01 ? tDx / tDist : 0;
          const pushZ = tDist > 0.01 ? tDz / tDist : -1;
          hero.x = enemy.x + pushX * 1.35;
          hero.z = enemy.z + pushZ * 1.35;
        }
        continue;
      }

      // =====================================================
      // GOBLIN ARCHER RANGED AI STATE MACHINE
      // =====================================================
      if (enemy.kind === "archer") {
        let moveVx = 0;
        let moveVz = 0;

        if (enemy.state === "idle") {
          const canAggro = !isBossRoomSealed(enemy);
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

        const canAggro = !isBossRoomSealed(enemy);
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

          if (distToHero <= (enemy.kind === "knight" ? 1.65 : 1.44)) {
            const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(enemy.facing);
            const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(enemy.facing);
            const angleToEnemy = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
            const isShockContact = Boolean(enemy.shockArmor && enemy.stunTimer <= 0);
            if (isShockContact && hero.invulnerableTimer <= 0) {
              soundEngine.playElectricShock();
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.0;
                pushBanner(
                  "Shocked on Contact by Electrified Slime!",
                  "Throw your Boomerang [Q / 1] to stun it for 2 seconds before approaching!",
                  3.6
                );
              }
            }
            const hitRes = damageHero(
              enemy.damage,
              pushDirX * 10,
              pushDirZ * 10,
              false,
              false,
              angleToEnemy,
              enemyWeight,
              isShockContact
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
          const isShockContact = Boolean(enemy.shockArmor && enemy.stunTimer <= 0);
          if (isShockContact && hero.invulnerableTimer <= 0) {
            soundEngine.playElectricShock();
          }
          const hitRes = damageHero(
            enemy.damage,
            pushDirX * 11.5,
            pushDirZ * 11.5,
            false,
            false,
            angleToEnemy,
            enemyWeight,
            isShockContact
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
        if (enemy.shockArmor && enemy.stunTimer <= 0 && hero.invulnerableTimer <= 0) {
          soundEngine.playElectricShock();
          const angleToEnemy = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
          damageHero(
            enemy.damage,
            -pushOutX * 10,
            -pushOutZ * 10,
            false,
            false,
            angleToEnemy,
            enemyWeight,
            true
          );
          if (armorNoticeCooldown <= 0) {
            armorNoticeCooldown = 3.0;
            pushBanner(
              "Shocked on Contact by Electrified Slime!",
              "Throw your Boomerang [Q / 1] to stun it for 2 seconds before approaching!",
              3.6
            );
          }
        }
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

    // 11. Check if Boss Ignis (Map 2) or Boss Vaelkor (Map 5) and all Sanctum Minions (spawnZ > 13) are defeated!
    if (zone === "dungeon" && !flags.bossDefeated) {
      const bossEnemy = enemies.find((e) => e.zone === "dungeon" && e.kind === "boss");
      const aliveSanctumMinions = enemies.filter(
        (e) => e.zone === "dungeon" && e.kind === "minion" && e.spawnZ > 13 && e.state !== "dead"
      );
      if (bossEnemy && bossEnemy.state === "dead" && aliveSanctumMinions.length === 0) {
        flags.bossDefeated = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        if (!flags.bossHeartAwarded) {
          flags.bossHeartAwarded = true;
          hero.maxHp += 2;
          hero.hp = hero.maxHp;
          hero.damageFractionAcc = 0;
        }
        dynamicObstacles = getActiveObstacles(mapProps);
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Ignis, the Armored Eye-Golem Vanquished! (+1 Full Heart Container!)",
          "Max HP permanently increased! Claim the Sanctum Relic Chest and step through the North Sanctuary Door into Map 3: Elderwood Highlands!",
          7.0
        );
      }
    }

    if (zone === "citadel" && !flags.citadelBossDefeated) {
      const citadelBossEnemy = enemies.find((e) => e.zone === "citadel" && e.kind === "boss");
      const aliveCitadelMinions = enemies.filter(
        (e) => e.zone === "citadel" && e.kind === "minion" && e.spawnZ > 13 && e.state !== "dead"
      );
      if (
        citadelBossEnemy &&
        citadelBossEnemy.state === "dead" &&
        aliveCitadelMinions.length === 0
      ) {
        flags.citadelBossDefeated = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        dynamicObstacles = getActiveObstacles(mapProps);
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Vaelkor, the Obsidian Sovereign Vanquished! (Citadel Conquered!)",
          "Open the Sovereign's Relic Chest (Crimson Dragon Mail + Heart + 200 Rupees) and step through the North Golden Return Portal!",
          7.5
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
          hero.hp = Math.min(hero.maxHp, hero.hp + (rValue(rupee.value)));
        } else {
          hero.rupees += rupee.value;
        }
        soundEngine.playRupeePickup(rupee.tier);
      }
    }

    function rValue(v: number | undefined): number {
      return v || 2;
    }

    // 13. Boss Chest Unlock → Rewards Zeldo Crest Relic (+50 Rupees & Full Restore) while directing player through the Back Door Portal to Map 1 Crossroads!
    if (zone === "dungeon" && !flags.chestUnlocked) {
      const distToChest = Math.hypot(
        hero.x - BOSS_CHEST_POS.x,
        hero.z - BOSS_CHEST_POS.z
      );
      if (distToChest < 2.5) {
        if (flags.bossDefeated) {
          flags.chestUnlocked = true;
          if (!flags.bossHeartAwarded) {
            flags.bossHeartAwarded = true;
            hero.maxHp += 2;
          }
          hero.hp = hero.maxHp;
          hero.mp = hero.maxMp;
          hero.rupees += 50;
          soundEngine.playVictoryFanfare();
          pushBanner(
            "Claimed the Zeldo Crest Relic! (+50 Rupees & Full Restore)",
            "Step through the open North Sanctuary Door to return to Map 1 Crossroads, burn the East Exit vines [R], and enter Map 3!",
            7.5
          );
        } else if (chestNoticeCooldown <= 0) {
          chestNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "Sealed by Ignis's Curse!",
            "Defeat Ignis, the Armored Eye-Golem to unlock the Sanctum Relic Chest.",
            3.5
          );
        }
      }
    }

    // 13a. Map 1B (`grove`) Ambush Fallback Check (in case ambush monsters were killed by bombs or vessels)
    if (zone === "grove" && !flags.grovePuzzleSolved) {
      const ambushEnemies = enemies.filter((e) => e.questGroup === "grove_ambush");
      if (ambushEnemies.length > 0 && ambushEnemies.every((e) => e.state === "dead")) {
        flags.grovePuzzleSolved = true;
        ensureMutableMapProps();
        for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
          const mp = mapProps[pIdx];
          if (mp.zone === "grove" && mp.prefab === "crystal_switch") {
            mp.switchState = "orange";
          } else if (mp.zone === "grove" && mp.prefab === "crystal_barrier") {
            mp.hasCollider = false;
            mp.y = -2.45;
          }
        }
        dynamicObstacles = buildObstaclesFromMapProps(mapProps);
        soundEngine.playSecretSolve();
        pushBanner(
          "Grove Ambush Cleared! (Shrine Barrier Lowered!)",
          "All 3 Forest Grove ambush monsters vanquished — claim the Sanctum Entry Key at the pedestal!",
          5.5
        );
      }
    }

    // =========================================================
    // 13b. MAP 1 HUB & ECONOMY LOOP: SECRET RUPEE STASH CAVE (+50), ELDER ROWAN QUEST (+50) & SCOUT LYRA HUB GUIDE NPC
    // =========================================================
    if (zone === "overworld") {
      // A. South-West Corner Secret Rupee Stash Cave Chest (`SECRET_STASH_POS = -30.5, -33.2`)
      if (!flags.secretStashClaimed) {
        const distToStash = Math.hypot(
          hero.x - SECRET_STASH_POS.x,
          hero.z - SECRET_STASH_POS.z
        );
        if (distToStash <= 2.4) {
          flags.secretStashClaimed = true;
          hero.rupees += 50;
          soundEngine.playVictoryFanfare();
          pushBanner(
            "Discovered the Secret Rupee Stash! (+50 Rupees!)",
            "You claimed the hidden 50-Rupee chest in the SW Cave! Visit Bramble's Shop for the 100-Rupee Upgrade!",
            6.5
          );
        }
      }

      // B. Mini-Sub-Quest NPC: Elder Rowan (`HEIRLOOM_NPC_POS = 20.5, -29.2`) outside the Eastern Bandit Cave
      const npcDx = hero.x - HEIRLOOM_NPC_POS.x;
      const npcDz = hero.z - HEIRLOOM_NPC_POS.z;
      const distToNpc = Math.hypot(npcDx, npcDz);

      if (distToNpc < 1.05) {
        const pushX = distToNpc > 0.01 ? npcDx / distToNpc : 0;
        const pushZ = distToNpc > 0.01 ? npcDz / distToNpc : 1;
        hero.x = HEIRLOOM_NPC_POS.x + pushX * 1.05;
        hero.z = HEIRLOOM_NPC_POS.z + pushZ * 1.05;
      }

      if (!flags.heirloomMonstersCleared) {
        const heirloomEnemies = enemies.filter((e) => e.questGroup === "heirloom");
        if (
          heirloomEnemies.length > 0 &&
          heirloomEnemies.every((e) => e.state === "dead")
        ) {
          flags.heirloomMonstersCleared = true;
        }
      }

      if (distToNpc <= 2.85) {
        if (flags.heirloomMonstersCleared && !flags.heirloomQuestClaimed) {
          flags.heirloomQuestStarted = true;
          flags.heirloomQuestClaimed = true;
          hero.rupees += 50;
          soundEngine.playVictoryFanfare();
          pushBanner(
            "Elder Rowan: \"You recovered my Heirloom! Here's 50 Rupees!\"",
            "+50 Rupees earned! You now have enough to buy the 100-Rupee Progression Upgrade at Bramble's Shop!",
            6.5
          );
        } else if (
          !flags.heirloomQuestStarted ||
          (input.interactPressed && !flags.heirloomMonstersCleared)
        ) {
          flags.heirloomQuestStarted = true;
          if (chestNoticeCooldown <= 0 || input.interactPressed) {
            chestNoticeCooldown = 3.2;
            soundEngine.playKeyPickup();
            const remainingCount = enemies.filter(
              (e) => e.questGroup === "heirloom" && e.state !== "dead"
            ).length;
            pushBanner(
              "Elder Rowan: \"Monsters stole my heirloom! Clear them out and I'll pay you 50 Rupees!\"",
              `Defeat the ${remainingCount} monster${remainingCount === 1 ? "" : "s"} in the Eastern Bandit Cave just east of here!`,
              5.8
            );
          }
        } else if (flags.heirloomQuestClaimed && input.interactPressed) {
          soundEngine.playKeyPickup();
          pushBanner(
            "Elder Rowan: \"Thank you again for saving my family heirloom!\"",
            "Spend those 50 Rupees on the 100-Rupee Progression Upgrade at Merchant Bramble's Shop!",
            4.2
          );
        }
      }

      // C. Center Crossroads Hub Guide NPC: Scout Lyra (`GUIDE_NPC_POS = -4.2, -5.2`)
      const guideDx = hero.x - GUIDE_NPC_POS.x;
      const guideDz = hero.z - GUIDE_NPC_POS.z;
      const distToGuide = Math.hypot(guideDx, guideDz);

      if (distToGuide < 1.05) {
        const pushX = distToGuide > 0.01 ? guideDx / distToGuide : 0;
        const pushZ = distToGuide > 0.01 ? guideDz / distToGuide : 1;
        hero.x = GUIDE_NPC_POS.x + pushX * 1.05;
        hero.z = GUIDE_NPC_POS.z + pushZ * 1.05;
      }

      if (distToGuide <= 2.85 && input.interactPressed) {
        soundEngine.playKeyPickup();
        if (!flags.keyPickedUp) {
          pushBanner(
            "Scout Lyra: \"Take the WEST EXIT (Map 1B: Forest Grove) first!\"",
            "Hit the Crystal Switch with your Boomerang [Q] or defeat the 3 ambush monsters to claim the Dungeon Entry Key!",
            6.0
          );
        } else if (!flags.bossDefeated) {
          pushBanner(
            "Scout Lyra: \"You have the Key! Take the NORTH EXIT (Map 2: Sunken Sanctum)!\"",
            "Conquer the 5-Room Cross Dungeon, claim the Flame Rod in Room 3 & Big Key in Room 4, and defeat Ignis for +1 Heart Container!",
            6.0
          );
        } else {
          pushBanner(
            "Scout Lyra: \"Now burn the EAST EXIT vines [R] to enter Map 3 (The Burned Pass)!\"",
            "Use your Flame Rod [R] on the East Exit Dry Vines / Torches — and don't forget the Locked Ledge in the NW!",
            6.0
          );
        }
      }
    }

    // 14. Compute Contextual Interaction Prompt for HUD (`hero.interactPrompt`)
    if (hero.heldObject) {
      hero.interactPrompt =
        hero.heldObject.kind === "bomb"
          ? "Press [F] / [B] or Attack to Throw Bomb"
          : hero.heldObject.kind === "clay_pot"
          ? "Press [F] or Attack to Throw Clay Pot"
          : "Press [F] or Attack to Throw Rock";
    } else if ((hero.pushTimer ?? 0) > 0.08) {
      const pct = Math.min(100, Math.round(((hero.pushTimer ?? 0) / 1.0) * 100));
      hero.interactPrompt = `Pushing Stone Block... (${pct}%)`;
    } else {
      const nearGroundBomb = activeBombs.find(
        (b) => b.zone === zone && !b.exploded && Math.hypot(b.x - hero.x, b.z - hero.z) <= 2.2
      );
      const nearLiftable = mapProps.find(
        (p) =>
          p.zone === zone &&
          !p.smashed &&
          (p.prefab === "clay_pot" || p.prefab === "light_rock") &&
          Math.hypot(p.x - hero.x, p.z - hero.z) <= 2.35
      );
      const nearCrackedRock = mapProps.find(
        (p) =>
          p.zone === zone &&
          !p.smashed &&
          p.prefab === "cracked_rock" &&
          Math.hypot(p.x - hero.x, p.z - hero.z) <= 3.35
      );
      const nearBurnableBarrier = mapProps.find(
        (p) =>
          p.zone === zone &&
          !p.smashed &&
          (p.prefab === "briar_barrier" || p.prefab === "spiderweb_barrier") &&
          Math.hypot(p.x - hero.x, p.z - hero.z) <= 3.85
      );
      const nearUnlitTorch = mapProps.find(
        (p) =>
          p.zone === zone &&
          p.prefab === "wall_torch" &&
          p.lit === false &&
          Math.hypot(p.x - hero.x, p.z - hero.z) <= 2.95
      );
      const nearEyeStatue = mapProps.find(
        (p) =>
          p.zone === zone &&
          p.prefab === "eye_statue" &&
          !p.eyeActivated &&
          Math.hypot(p.x - hero.x, p.z - hero.z) <= 6.5
      );
      const nearBridgeTurret = enemies.find(
        (e) =>
          e.zone === zone &&
          e.kind === "turret" &&
          e.state !== "dead" &&
          Math.abs(hero.x - e.x) <= 5.0 &&
          hero.z <= e.z + 1.5 &&
          e.z - hero.z <= 13.5
      );
      const nearShockEnemy = enemies.find(
        (e) =>
          e.zone === zone &&
          e.state !== "dead" &&
          e.shockArmor &&
          e.stunTimer <= 0 &&
          Math.hypot(e.x - hero.x, e.z - hero.z) <= 4.2
      );
      const nearBountyEnemy = enemies.find(
        (e) =>
          e.zone === zone &&
          e.state !== "dead" &&
          e.isBounty &&
          Math.hypot(e.x - hero.x, e.z - hero.z) <= 5.5
      );
      const nearGroveKey =
        zone === "grove" &&
        !flags.keyPickedUp &&
        Math.hypot(DUNGEON_KEY_POS.x - hero.x, DUNGEON_KEY_POS.z - hero.z) <= 8.5;
      const nearGroveSwitch =
        zone === "grove" &&
        !flags.grovePuzzleSolved &&
        Math.hypot(-6.5 - hero.x, 6.2 - hero.z) <= 8.0;
      const nearLockedEntryGate =
        zone === "overworld" &&
        !flags.dungeonEntryUnlocked &&
        Math.hypot(DUNGEON_ENTRY_GATE_POS.x - hero.x, DUNGEON_ENTRY_GATE_POS.z - hero.z) <= 5.5;
      const nearDgSmallKeyAcrossGap =
        zone === "dungeon" &&
        !flags.dgSmallKeyPickedUp &&
        Math.hypot(DG_SMALL_KEY_POS.x - hero.x, DG_SMALL_KEY_POS.z - hero.z) <= 13.5;
      const nearDgEastDoor =
        zone === "dungeon" &&
        !flags.eastWingDoorUnlocked &&
        Math.hypot(EAST_WING_DOOR_POS.x - hero.x, EAST_WING_DOOR_POS.z - hero.z) <= 4.5;
      const nearFireRodChest =
        zone === "dungeon" &&
        !flags.fireRodChestOpened &&
        Math.hypot(FIRE_ROD_CHEST_POS.x - hero.x, FIRE_ROD_CHEST_POS.z - hero.z) <= 4.5;
      const nearBigKeyChest =
        zone === "dungeon" &&
        !flags.bigKeyChestOpened &&
        Math.hypot(BIG_KEY_CHEST_POS.x - hero.x, BIG_KEY_CHEST_POS.z - hero.z) <= 4.5;
      const nearNorthBossGate =
        zone === "dungeon" &&
        !flags.gateUnlocked &&
        Math.hypot(LOCKED_GATE_POS.x - hero.x, LOCKED_GATE_POS.z - hero.z) <= 4.8;
      const nearWaterGapRupee = rupees.find(
        (r) =>
          r.zone === zone &&
          !r.collected &&
          (r.id === "rupee-ow-river-gap" || r.id === "rupee-dg-water-gap") &&
          Math.hypot(r.x - hero.x, r.z - hero.z) <= 7.5
      );
      const nearSecretStash =
        zone === "overworld" &&
        !flags.secretStashClaimed &&
        Math.hypot(SECRET_STASH_POS.x - hero.x, SECRET_STASH_POS.z - hero.z) <= 5.5;
      const nearElderRowan =
        zone === "overworld" &&
        Math.hypot(HEIRLOOM_NPC_POS.x - hero.x, HEIRLOOM_NPC_POS.z - hero.z) <= 4.5;
      const nearScoutLyra =
        zone === "overworld" &&
        Math.hypot(GUIDE_NPC_POS.x - hero.x, GUIDE_NPC_POS.z - hero.z) <= 3.8;

      if (nearGroundBomb) {
        hero.interactPrompt = "Press [F] or [B] to Lift & Throw Bomb";
      } else if (nearLiftable) {
        hero.interactPrompt =
          nearLiftable.prefab === "clay_pot"
            ? "Press [F] to Lift Clay Pot"
            : "Press [F] to Lift Light Rock";
      } else if (nearSecretStash) {
        hero.interactPrompt =
          "Secret Rupee Stash Chest (+50 Rupees) — Walk Up to Claim Treasure!";
      } else if (nearElderRowan) {
        hero.interactPrompt = flags.heirloomQuestClaimed
          ? "Elder Rowan — Press [F] to Chat (Heirloom Sub-Quest Completed!)"
          : flags.heirloomMonstersCleared
          ? "Elder Rowan — Step Closer to Claim Your +50 Rupee Quest Reward!"
          : "Elder Rowan (NPC Quest) — Clear the Eastern Bandit Cave for +50 Rupees! [Press F]";
      } else if (nearScoutLyra) {
        hero.interactPrompt =
          "Scout Lyra (Crossroads Hub Guide) — Press [F] for West / North / East Exit Hints!";
      } else if (nearLockedEntryGate) {
        hero.interactPrompt =
          flags.keyPickedUp || hero.hasDungeonKey
            ? "North Dungeon Entrance Gate — Walk Forward to Unlock Map 2!"
            : "North Dungeon Entrance Gate (Locked) — Get the Key from West Exit (Map 1B: Forest Grove)!";
      } else if (nearDgSmallKeyAcrossGap) {
        hero.interactPrompt =
          "Small Key on Pedestal Across Chasm — Throw Boomerang [Q / 1] Across the Gap to Snag It!";
      } else if (nearDgEastDoor) {
        hero.interactPrompt = flags.hasSmallKey
          ? "Room 3 East Wing Key Door — Walk Forward to Unlock with Your Small Key!"
          : "Room 3 East Wing (Locked Small Key Door) — Fetch the Small Key in Room 2 (West Wing) via Boomerang [Q]!";
      } else if (nearFireRodChest) {
        hero.interactPrompt =
          "Ember Sanctum Chest (Flame Rod) — Defeat the 3 Shielded Goblins & Walk Up to Open!";
      } else if (nearBigKeyChest) {
        hero.interactPrompt = flags.dungeonEyeStatuesSolved
          ? "Big Boss Key Chest (Unsealed!) — Walk Up to Claim the Big Boss Key!"
          : "Big Boss Key Chest (Sealed) — Light the 4 Crypt Lanterns [R] & Shoot the South Eye Statue with Bow [E]!";
      } else if (nearNorthBossGate) {
        hero.interactPrompt =
          flags.dungeonTimedTorchSolved && flags.hasBigKey
            ? "North Boss Gate Ready — Step Forward to Unlock & Face Ignis!"
            : `North Boss Gate (Locked) — Requires 4 Hub Lanterns (${flags.dungeonTimedTorchSolved ? "DONE" : "Unlit"}) + Big Boss Key (${flags.hasBigKey ? "READY" : "In Room 4"})!`;
      } else if (nearBridgeTurret) {
        hero.interactPrompt =
          "Wall Stone Turret — Hold Shield [RMB / Shift] while crossing to deflect projectiles!";
      } else if (nearGroveKey) {
        hero.interactPrompt =
          "Sanctum Entry Key Pedestal — Walk Up or Throw Boomerang [Q / 1] to Claim!";
      } else if (nearGroveSwitch) {
        hero.interactPrompt =
          "Grove Crystal Switch — Throw Boomerang [Q / 1] Across the Stream (or Clear 3 Ambush Monsters) to Open Shrine!";
      } else if (nearWaterGapRupee) {
        hero.interactPrompt =
          "Red Rupee (+20) Across Water — Throw Boomerang [Q / 1] to Snag & Pull It Back!";
      } else if (nearEyeStatue) {
        hero.interactPrompt =
          "Cyclops Eye Statue — Shoot its Open Eye with your Bow & Arrow [E / 2]!";
      } else if (nearShockEnemy) {
        hero.interactPrompt =
          "Armored Spiked Beetle — Throw Boomerang [Q / 1] to Stun for 2s Before Slashing!";
      } else if (nearBountyEnemy) {
        hero.interactPrompt =
          "Gold/Crimson Bounty Monster — Defeat for 5x Rupee Drops!";
      } else if (nearCrackedRock) {
        hero.interactPrompt =
          nearCrackedRock.id === "prop-ow-stash-cracked-rock"
            ? "Secret Rupee Stash Cave — Press [B] to Place Bomb & Unseal (+50 Rupees)!"
            : "Cracked Boulder — Press [B] to Place Bomb!";
      } else if (nearBurnableBarrier) {
        hero.interactPrompt =
          nearBurnableBarrier.prefab === "spiderweb_barrier"
            ? "Thick Spiderwebs (To Room 4 Crypt) — Shoot with Flame Rod [R] to Burn!"
            : nearBurnableBarrier.id.startsWith("prop-ow-east-exit-briar")
            ? "East Exit Dry Vines (Map 3: Burned Pass) — Burn with Flame Rod [R] or Light Both Torches!"
            : nearBurnableBarrier.id === "prop-ow-ledge-briar"
            ? "Locked Ledge Dry Vines — Return with Flame Rod [R] to Burn & Claim +40 Rupees!"
            : "Dry Briar Thicket — Shoot with Flame Rod [R] to Burn!";
      } else if (nearUnlitTorch) {
        hero.interactPrompt =
          (nearUnlitTorch.timedDuration ?? 0) > 0
            ? `Timed Hub Lantern (${nearUnlitTorch.timedDuration}s) — Shoot with Flame Rod [R] to Light All 4!`
            : nearUnlitTorch.id.startsWith("prop-ow-east-exit-torch")
            ? "East Exit Gate Torch — Light Both Torches with Flame Rod [R] to Burn the East Barrier!"
            : "Unlit Lantern — Shoot with Flame Rod [R] to Illuminate!";
      } else {
        hero.interactPrompt = null;
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
      thrownObjects,
      activeBombs,
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
