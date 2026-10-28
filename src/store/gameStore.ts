import { create } from "zustand";
import {
  ALCHEMY_CAULDRON_POS,
  ATOLL_PEARL_CHEST_POS,
  ATOLL_VICTORY_CHEST_POS,
  BIG_KEY_CHEST_POS,
  BOSS_CHEST_POS,
  BOSS_EXIT_GATE_POS,
  BOSS_MAX_LUNGE_RANGE,
  BossArmorState,
  buildInitialMapProps,
  buildObstaclesFromMapProps,
  BuriedRewardKind,
  CAVERN_CREST_KEY_POS,
  CAVERN_HAMMER_CHEST_POS,
  CAVERN_SHOVEL_CHEST_POS,
  CALDERA_BOSS_GATE_POS,
  CALDERA_EXIT_GATE_POS,
  CALDERA_FORGE_CHEST_POS,
  CALDERA_VICTORY_CHEST_POS,
  CITADEL_ARMORY_CHEST_POS,
  CITADEL_BOSS_GATE_POS,
  CITADEL_EXIT_GATE_POS,
  CITADEL_VICTORY_CHEST_POS,
  COLOSSEUM_GATE_POS,
  COMPANION_ALTAR_POS,
  computeBossChargePathLength,
  computeEnemyChargePathLength,
  computePathfindingMoveDir,
  CRYPT_SHORTCUT_DOOR_POS,
  CustomModelAsset,
  DESERT_CALDERA_GATE_POS,
  DESERT_OASIS_CHEST_POS,
  DESERT_SOLAR_KEY_POS,
  DG_SMALL_KEY_POS,
  DUNGEON_ENTRY_GATE_POS,
  DUNGEON_KEY_POS,
  DungeonRoomId,
  EAST_WING_DOOR_POS,
  EnemyKind,
  EnemyShieldArmor,
  FIRE_ROD_CHEST_POS,
  FORGE_ANVIL_POS,
  FRONTIER_BOMB_CHEST_POS,
  FRONTIER_CITADEL_GATE_POS,
  FRONTIER_HOOKSHOT_CHEST_POS,
  FRONTIER_SAPPER_NPC_POS,
  getDefaultEnemyWeight,
  GUIDE_NPC_POS,
  HEIRLOOM_NPC_POS,
  HERO_SPAWN,
  HOLLOW_SPORE_CHEST_POS,
  HOLLOW_VICTORY_CHEST_POS,
  HOMESTEAD_POS,
  INITIAL_ENEMIES,
  INITIAL_PORTALS,
  INITIAL_WORLD_RUPEES,
  LOCKED_GATE_POS,
  MapPortal,
  MapPropInstance,
  MOUNT_STABLES_POS,
  PotRewardKind,
  PropPrefabId,
  resolveArrowCollisions,
  resolveWorldCollisions,
  RIFT_ENTRANCE_POS,
  RupeeTier,
  SECRET_STASH_POS,
  SHOP_INTERACT_POS,
  SKY_CELESTIAL_CHEST_POS,
  SKY_VICTORY_CHEST_POS,
  WARP_STONE_META,
  WEATHER_OBELISK_POS,
  ZoneId,
} from "@/game/worldData";
import {
  generateProceduralRiftFloor,
  RiftBiomeId,
  RiftRoomMeta,
} from "@/game/proceduralRift";
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
  | "hookshot"
  | "hammer"
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

export type CompanionId =
  | "none"
  | "ember_phoenix"
  | "frost_owl"
  | "storm_wolf"
  | "gold_sprite";

export type RelicId =
  | "vampiric_fang"
  | "arcane_conduit"
  | "thunder_sigil"
  | "demolition_core"
  | "wind_feather"
  | "greed_crown"
  | "berserker_torc"
  | "aegis_ankh";

export type MountId =
  | "none"
  | "sun_courser"
  | "frost_stag"
  | "war_drake";

export type ColosseumTierId = "bronze" | "silver" | "gold";

export type HerbId = "sun_lotus" | "frost_cap" | "ember_root" | "starlight_dew";

export type ElixirId =
  | "none"
  | "titans_draught"
  | "gale_nectar"
  | "aegis_tonic"
  | "archmage_elixir";

export type WeatherId =
  | "clear"
  | "thunderstorm"
  | "blizzard"
  | "starfall"
  | "blood_moon";

export type HomesteadWingId =
  | "hearth_bed"
  | "herb_greenhouse"
  | "trophy_vault";

export type FishId =
  | "brook_trout"
  | "reef_snapper"
  | "magma_koi"
  | "golden_sturgeon";

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

export interface HammerShockwaveState {
  id: string;
  zone: ZoneId;
  x: number;
  z: number;
  timer: number;
  maxTimer: number;
  maxRadius: number;
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
  hasHookshot?: boolean;
  hasHammer?: boolean;
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
  monsterCores?: number;
  swordRuneTier?: 0 | 1 | 2;
  bowRuneTier?: 0 | 1 | 2;
  hammerRuneTier?: 0 | 1 | 2;
  activeCompanion?: CompanionId;
  unlockedCompanions?: CompanionId[];
  companionAttackTimer?: number;
  companionBlessTimer?: number;
  unlockedRelics?: RelicId[];
  equippedRelics?: RelicId[];
  activeMount?: MountId;
  mountedSteed?: MountId;
  unlockedMounts?: MountId[];
  mountAttackTimer?: number;
  mountTrampleCooldowns?: Record<string, number>;
  herbs?: Record<HerbId, number>;
  activeElixir?: ElixirId;
  activeElixirTimer?: number;
  elixirRegenTimer?: number;
  homesteadWings?: HomesteadWingId[];
  fishCaught?: Record<FishId, number>;
  greenhouseTimer?: number;
  dashTimer?: number;
  dashCooldown?: number;
  comboCount?: number;
  comboTimer?: number;
  maxComboStreak?: number;
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
  hookshotCooldown?: number;
  hammerCooldown?: number;
  hammerAnimTimer?: number;
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
  chillTimer?: number;
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
  burrowed?: boolean;
  questGroup?:
    | "heirloom"
    | "grove_ambush"
    | "ember_guards"
    | "frontier_sappers"
    | "cavern_wardens"
    | "desert_wardens";
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
  carryingSolarKey?: boolean;
}

export interface HookshotState {
  zone: ZoneId;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  distanceTraveled: number;
  maxLength?: number;
  state: "extending" | "retracting" | "pulling_hero";
  targetX: number;
  targetZ: number;
  carriedRupeeIds?: string[];
  carryingKey?: boolean;
  carryingDgSmallKey?: boolean;
  carryingGlacialKey?: boolean;
  carryingSolarKey?: boolean;
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
  isFrost?: boolean;
  isReflected?: boolean;
  isPiercing?: boolean;
  hitEnemyIds?: string[];
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

export interface LightningArcState {
  id: string;
  zone: ZoneId;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  timer: number;
  maxTimer: number;
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
  desertCrystalPuzzleSolved?: boolean;
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
  // Map 3 (Frontier), Map 4 (Frostpeak Caverns), Map 5 (Obsidian Citadel), Map 6 (Sunscorched Oasis) & Map 7 (Skyward Caldera) Progression Flags
  frontierSappersCleared?: boolean;
  frontierBombChestOpened?: boolean;
  frontierHookshotChestOpened?: boolean;
  frontierCitadelGateUnlocked?: boolean;
  cavernWardensCleared?: boolean;
  cavernEyeSolved?: boolean;
  cavernShovelChestOpened?: boolean;
  cavernHammerChestOpened?: boolean;
  cavernCrestKeyPickedUp?: boolean;
  hasGlacialKey?: boolean;
  cavernBossAwakened?: boolean;
  cavernBossPhase2?: boolean;
  cavernBossDefeated?: boolean;
  cavernBossHeartAwarded?: boolean;
  citadelArmoryChestOpened?: boolean;
  citadelTimedTorchSolved?: boolean;
  citadelEyeStatuesSolved?: boolean;
  citadelGateUnlocked?: boolean;
  citadelBossAwakened?: boolean;
  citadelBossPhase2?: boolean;
  citadelBossDefeated?: boolean;
  citadelBossHeartAwarded?: boolean;
  citadelVictoryChestOpened?: boolean;
  desertOasisChestOpened?: boolean;
  desertWardensCleared?: boolean;
  desertBossAwakened?: boolean;
  desertBossPhase2?: boolean;
  desertBossDefeated?: boolean;
  desertBossHeartAwarded?: boolean;
  desertSolarKeyPickedUp?: boolean;
  hasSolarKey?: boolean;
  desertCalderaGateUnlocked?: boolean;
  calderaForgeChestOpened?: boolean;
  calderaTorchPuzzleSolved?: boolean;
  calderaEyeStatuesSolved?: boolean;
  calderaPegsSolved?: boolean;
  calderaGateUnlocked?: boolean;
  calderaBossAwakened?: boolean;
  calderaBossPhase2?: boolean;
  calderaBossDefeated?: boolean;
  calderaBossHeartAwarded?: boolean;
  calderaVictoryChestOpened?: boolean;
  atollPearlChestOpened?: boolean;
  atollBossAwakened?: boolean;
  atollBossDefeated?: boolean;
  atollVictoryChestOpened?: boolean;
  hollowSporeChestOpened?: boolean;
  hollowBossAwakened?: boolean;
  hollowBossDefeated?: boolean;
  hollowVictoryChestOpened?: boolean;
  skyCelestialChestOpened?: boolean;
  skyBossAwakened?: boolean;
  skyBossDefeated?: boolean;
  skyVictoryChestOpened?: boolean;
  discoveredZones?: ZoneId[];
  awakenedWarpZones?: ZoneId[];
  // Diablo-Style Endless Procedural Rift State
  riftActive?: boolean;
  riftDepth?: number;
  highestRiftDepth?: number;
  riftSeed?: number;
  riftBiome?: RiftBiomeId;
  riftBiomeTitle?: string;
  riftFloorColorHex?: string;
  riftBossName?: string;
  riftEliteAffix?: string;
  riftRooms?: RiftRoomMeta[];
  riftShrinePos?: { x: number; z: number };
  riftShrineClaimed?: boolean;
  riftVaultChestPos?: { x: number; z: number };
  riftVaultChestOpened?: boolean;
  riftBossChestPos?: { x: number; z: number };
  riftBossChestOpened?: boolean;
  riftNextFloorPos?: { x: number; z: number };
  riftBossDefeated?: boolean;
  // Grand Colosseum Wave Survival & Boss-Rush Gauntlet State
  colosseumActive?: boolean;
  colosseumTier?: ColosseumTierId;
  colosseumWave?: number;
  colosseumTotalWaves?: number;
  colosseumCompletedTiers?: ColosseumTierId[];
  // Dynamic World Weather & Crimson Blood-Moon Eclipse State
  activeWeather?: WeatherId;
  weatherStrikeTimer?: number;
  bloodMoonInvasionsCleared?: number;
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
  hookshotPressed?: boolean;
  hammerPressed?: boolean;
  bottlePressed?: boolean;
  interactPressed?: boolean;
  bombPressed?: boolean;
  dashPressed?: boolean;
}

export interface SerializableGameState {
  phase: GamePhase;
  zone: ZoneId;
  dungeonRoom: DungeonRoomId;
  hero: HeroState;
  enemies: EnemyState[];
  boomerang: BoomerangState | null;
  hookshot: HookshotState | null;
  hammerShockwaves: HammerShockwaveState[];
  arrows: ArrowProjectileState[];
  fireballs: FireballProjectileState[];
  fireZones: FireZoneState[];
  friendlyBees: FriendlyBeeState[];
  lightningArcs: LightningArcState[];
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
  questLogOpen: boolean;
  atlasOpen: boolean;
  forgeOpen: boolean;
  riftOpen: boolean;
  sanctuaryOpen: boolean;
  stablesOpen: boolean;
  colosseumOpen: boolean;
  alchemyOpen: boolean;
  weatherOpen: boolean;
  homesteadOpen: boolean;
  warpBeamTimer: number;
  wayfinderActive: boolean;
  pinnedQuestId: string | null;
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
  setQuestLogOpen: (open: boolean) => void;
  setAtlasOpen: (open: boolean) => void;
  setForgeOpen: (open: boolean) => void;
  setRiftOpen: (open: boolean) => void;
  setSanctuaryOpen: (open: boolean) => void;
  setStablesOpen: (open: boolean) => void;
  setColosseumOpen: (open: boolean) => void;
  setAlchemyOpen: (open: boolean) => void;
  setWeatherOpen: (open: boolean) => void;
  setHomesteadOpen: (open: boolean) => void;
  setWorldWeather: (weather: WeatherId) => void;
  triggerBloodMoonInvasion: () => void;
  upgradeHomesteadWing: (wing: HomesteadWingId) => void;
  restAtHomestead: () => void;
  castFishingLine: () => void;
  grantHomesteadPlaytestBundle: () => void;
  brewAndDrinkElixir: (elixir: Exclude<ElixirId, "none">) => void;
  grantAlchemyPlaytestBundle: () => void;
  startColosseumTrial: (tier: ColosseumTierId) => void;
  grantColosseumPlaytestBundle: () => void;
  whistleToggleMount: () => void;
  summonOrUnlockMount: (mountId: MountId) => void;
  grantStablesPlaytestBundle: () => void;
  summonOrUnlockCompanion: (companionId: CompanionId) => void;
  toggleEquipRelic: (relicId: RelicId) => void;
  gambleAncientRelic: () => void;
  grantSanctuaryPlaytestBundle: () => void;
  enterProceduralRift: (depth?: number, customSeed?: number) => void;
  forgeEnchantWeapon: (slot: "sword" | "bow" | "hammer") => void;
  grantForgePlaytestBundle: () => void;
  warpToZone: (targetZone: ZoneId, forceAllow?: boolean) => void;
  toggleWayfinder: () => void;
  setPinnedQuestId: (questId: string | null) => void;
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
    burrowed: spawn.kind === "burrower",
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
      hasHookshot: false,
      hasHammer: false,
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
      monsterCores: 0,
      swordRuneTier: 0,
      bowRuneTier: 0,
      hammerRuneTier: 0,
      activeCompanion: "none",
      unlockedCompanions: ["none"],
      companionAttackTimer: 1.5,
      companionBlessTimer: 14.0,
      unlockedRelics: [],
      equippedRelics: [],
      activeMount: "sun_courser",
      mountedSteed: "none",
      unlockedMounts: ["none", "sun_courser"],
      mountAttackTimer: 1.5,
      mountTrampleCooldowns: {},
      herbs: {
        sun_lotus: 2,
        frost_cap: 2,
        ember_root: 2,
        starlight_dew: 2,
      },
      activeElixir: "none",
      activeElixirTimer: 0,
      elixirRegenTimer: 6.0,
      homesteadWings: [],
      fishCaught: {
        brook_trout: 0,
        reef_snapper: 0,
        magma_koi: 0,
        golden_sturgeon: 0,
      },
      greenhouseTimer: 25.0,
      dashTimer: 0,
      dashCooldown: 0,
      comboCount: 0,
      comboTimer: 0,
      maxComboStreak: 0,
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
      hookshotCooldown: 0,
      hammerCooldown: 0,
      hammerAnimTimer: 0,
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
      chillTimer: 0,
      knockbackLockTimer: 0,
      knockbackVx: 0,
      knockbackVz: 0,
      walkCycle: 0,
    },
    enemies: createInitialEnemies(),
    boomerang: null,
    hookshot: null,
    hammerShockwaves: [],
    arrows: [],
    fireballs: [],
    fireZones: [],
    friendlyBees: [],
    lightningArcs: [],
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
      desert: {},
      caldera: {},
      atoll: {},
      hollow: {},
      sky: {},
      rift: {},
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
      desertCrystalPuzzleSolved: false,
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
      frontierHookshotChestOpened: false,
      frontierCitadelGateUnlocked: false,
      cavernWardensCleared: false,
      cavernEyeSolved: false,
      cavernShovelChestOpened: false,
      cavernHammerChestOpened: false,
      cavernCrestKeyPickedUp: false,
      hasGlacialKey: false,
      cavernBossAwakened: false,
      cavernBossPhase2: false,
      cavernBossDefeated: false,
      cavernBossHeartAwarded: false,
      citadelArmoryChestOpened: false,
      citadelTimedTorchSolved: false,
      citadelEyeStatuesSolved: false,
      citadelGateUnlocked: false,
      citadelBossAwakened: false,
      citadelBossPhase2: false,
      citadelBossDefeated: false,
      citadelBossHeartAwarded: false,
      citadelVictoryChestOpened: false,
      desertOasisChestOpened: false,
      desertWardensCleared: false,
      desertBossAwakened: false,
      desertBossPhase2: false,
      desertBossDefeated: false,
      desertBossHeartAwarded: false,
      desertSolarKeyPickedUp: false,
      hasSolarKey: false,
      desertCalderaGateUnlocked: false,
      calderaForgeChestOpened: false,
      calderaTorchPuzzleSolved: false,
      calderaEyeStatuesSolved: false,
      calderaPegsSolved: false,
      calderaGateUnlocked: false,
      calderaBossAwakened: false,
      calderaBossPhase2: false,
      calderaBossDefeated: false,
      calderaBossHeartAwarded: false,
      calderaVictoryChestOpened: false,
      atollPearlChestOpened: false,
      atollBossAwakened: false,
      atollBossDefeated: false,
      atollVictoryChestOpened: false,
      hollowSporeChestOpened: false,
      hollowBossAwakened: false,
      hollowBossDefeated: false,
      hollowVictoryChestOpened: false,
      skyCelestialChestOpened: false,
      skyBossAwakened: false,
      skyBossDefeated: false,
      skyVictoryChestOpened: false,
      discoveredZones: ["overworld"],
      awakenedWarpZones: ["overworld"],
      activeWeather: "clear",
      weatherStrikeTimer: 3.5,
      bloodMoonInvasionsCleared: 0,
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
            text: "Chapter I: Whispers at the Crossroads",
            subtext:
              "An ancient lock seals the northern gate. Press [N] for the Golden Guiding Path, [L] for your Quest Chronicle, or [M] for the World Atlas.",
            timer: 6.5,
          }
        : null,
    nearShop: false,
    shopOpen: false,
    characterOpen: false,
    questLogOpen: false,
    atlasOpen: false,
    forgeOpen: false,
    riftOpen: false,
    sanctuaryOpen: false,
    stablesOpen: false,
    colosseumOpen: false,
    alchemyOpen: false,
    weatherOpen: false,
    homesteadOpen: false,
    warpBeamTimer: 0,
    wayfinderActive: false,
    pinnedQuestId: null,
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

const MAP_STORAGE_KEY = "zeldo-authored-map-v14";

function resetPropForPlaySession(p: MapPropInstance): MapPropInstance {
  if (p.prefab === "dirt_patch") {
    return { ...p, dug: false };
  }
  if (p.prefab === "clay_pot" || p.prefab === "light_rock" || p.prefab === "cracked_rock") {
    return { ...p, smashed: false, hasCollider: true };
  }
  if (p.prefab === "rusted_peg") {
    return { ...p, pounded: false, hasCollider: true };
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
      .filter(
        (e) =>
          !e.id.startsWith("dg-minion-wave2-") &&
          !e.id.startsWith("cv-minion-wave2-") &&
          !e.id.startsWith("ct-minion-wave2-") &&
          !e.id.startsWith("dungeon-minion-wave2-") &&
          !e.id.startsWith("caverns-minion-wave2-") &&
          !e.id.startsWith("citadel-minion-wave2-") &&
          !e.id.startsWith("caverns-wraith-wave2-") &&
          !e.id.startsWith("desert-minion-wave2-") &&
          !e.id.startsWith("caldera-minion-wave2-")
      )
      .map((e) => ({
        ...e,
        x: e.spawnX,
        z: e.spawnZ,
        hp: e.maxHp,
        shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
        shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
        burrowed: e.kind === "burrower",
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
      version: 10,
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
        desert: state.terrainCells.desert ?? {},
        caldera: state.terrainCells.caldera ?? {},
        atoll: state.terrainCells.atoll ?? {},
        hollow: state.terrainCells.hollow ?? {},
        sky: state.terrainCells.sky ?? {},
        rift: state.terrainCells.rift ?? {},
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
  grapple_post: { label: "Grapple Anchor Post (Hookshot [H])", hasCollider: true, w: 1.1, d: 1.1, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  rusted_peg: { label: "Rusted Iron Floor Peg (War-Hammer [T])", hasCollider: true, w: 1.35, d: 1.35, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  boulder: { label: "Mossy Boulder", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "ruin" },
  ruin_pillar: { label: "Watchtower Pillar", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  dungeon_pillar: { label: "Sanctum Pillar", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  coral_pillar: { label: "Coral Reef Pillar", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
  giant_mushroom: { label: "Giant Bioluminescent Mushroom", hasCollider: true, w: 2.2, d: 2.2, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "tree" },
  cloud_pillar: { label: "Celestial Marble Column", hasCollider: true, w: 2.0, d: 2.0, scaleX: 1, scaleY: 1, scaleZ: 1, kind: "pillar" },
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

function buildColosseumWaveEnemies(tier: ColosseumTierId, wave: number): EnemyState[] {
  const mkEnemy = (
    id: string,
    kind: EnemyKind,
    x: number,
    z: number,
    hp: number,
    damage: number,
    speed: number,
    opts?: {
      shieldArmor?: EnemyShieldArmor;
      shockArmor?: boolean;
      isBounty?: boolean;
    }
  ): EnemyState => ({
    id,
    kind,
    zone: "rift",
    x,
    z,
    spawnX: x,
    spawnZ: z,
    facing: Math.PI,
    hp,
    maxHp: hp,
    weight: getDefaultEnemyWeight(kind),
    state: kind === "boss" ? "aggro" : "aggro",
    stateTimer: 0,
    hitFlashTimer: 0,
    knockbackImmunityTimer: 0,
    stunTimer: 0,
    lastHitSwingId: -1,
    knockbackVx: 0,
    knockbackVz: 0,
    aggroRadius: 24.0,
    speed,
    damage,
    rupeeDrop: kind === "boss" ? "boss" : opts?.isBounty ? "red" : "blue",
    shieldArmor: opts?.shieldArmor ?? "none",
    initialShieldArmor: opts?.shieldArmor ?? "none",
    shockArmor: opts?.shockArmor ?? false,
    initialShockArmor: opts?.shockArmor ?? false,
    isBounty: opts?.isBounty ?? false,
    initialIsBounty: opts?.isBounty ?? false,
    burrowed: kind === "burrower",
    provoked: true,
    chargeAngle: Math.PI,
    chargePathLength: 12.0,
    chargeDistanceTraveled: 0,
    actionCounter: 0,
    actionCooldown: 0.85,
  });

  if (tier === "bronze") {
    if (wave === 1) {
      return [
        mkEnemy("col-br-w1-1", "goblin", -7.5, 4.5, 4, 1, 5.4, { shieldArmor: "wood" }),
        mkEnemy("col-br-w1-2", "goblin", 7.5, 4.5, 4, 1, 5.4, { shieldArmor: "wood" }),
        mkEnemy("col-br-w1-3", "archer", -5.5, 9.5, 3, 1, 4.6),
        mkEnemy("col-br-w1-4", "slime", 5.5, 9.5, 3, 1, 5.0, { shockArmor: true }),
      ];
    }
    if (wave === 2) {
      return [
        mkEnemy("col-br-w2-1", "knight", -6.5, 6.0, 7, 1, 5.0),
        mkEnemy("col-br-w2-2", "knight", 6.5, 6.0, 7, 1, 5.0),
        mkEnemy("col-br-w2-3", "wraith", 0, 10.5, 4, 1, 5.2),
        mkEnemy("col-br-w2-4", "burrower", 0, 2.5, 5, 1, 5.4),
      ];
    }
    return [
      mkEnemy("col-br-w3-boss", "boss", 0, 7.5, 15, 2, 4.4),
      mkEnemy("col-br-w3-g1", "goblin", -8.0, 5.0, 4, 1, 5.6, { isBounty: true }),
      mkEnemy("col-br-w3-g2", "goblin", 8.0, 5.0, 4, 1, 5.6, { isBounty: true }),
    ];
  }

  if (tier === "silver") {
    if (wave === 1) {
      return [
        mkEnemy("col-si-w1-1", "goblin", -8.0, 4.5, 5, 1, 5.6, { shieldArmor: "ice" }),
        mkEnemy("col-si-w1-2", "goblin", 8.0, 4.5, 5, 1, 5.6, { shieldArmor: "ice" }),
        mkEnemy("col-si-w1-3", "wraith", -5.5, 9.8, 5, 1, 5.5),
        mkEnemy("col-si-w1-4", "wraith", 5.5, 9.8, 5, 1, 5.5),
        mkEnemy("col-si-w1-5", "bomber", 0, 11.2, 5, 2, 5.2),
      ];
    }
    if (wave === 2) {
      return [
        mkEnemy("col-si-w2-1", "knight", -7.2, 6.2, 9, 2, 5.2, { shockArmor: true }),
        mkEnemy("col-si-w2-2", "knight", 7.2, 6.2, 9, 2, 5.2, { shieldArmor: "ice" }),
        mkEnemy("col-si-w2-3", "slime", -4.5, 2.5, 4, 1, 5.4, { shockArmor: true }),
        mkEnemy("col-si-w2-4", "slime", 4.5, 2.5, 4, 1, 5.4, { shockArmor: true }),
        mkEnemy("col-si-w2-5", "burrower", 0, 8.5, 6, 2, 5.6, { isBounty: true }),
      ];
    }
    return [
      mkEnemy("col-si-w3-boss", "boss", 0, 8.0, 21, 2, 4.7),
      mkEnemy("col-si-w3-k1", "knight", -8.2, 5.5, 8, 2, 5.2, { isBounty: true }),
      mkEnemy("col-si-w3-k2", "knight", 8.2, 5.5, 8, 2, 5.2, { isBounty: true }),
    ];
  }

  // Gold Tier: Sovereign Boss-Rush Gauntlet!
  if (wave === 1) {
    return [
      mkEnemy("col-go-w1-boss", "boss", 0, 7.5, 18, 2, 4.6),
      mkEnemy("col-go-w1-m1", "minion", -7.8, 5.0, 5, 1, 5.8),
      mkEnemy("col-go-w1-m2", "minion", 7.8, 5.0, 5, 1, 5.8),
    ];
  }
  if (wave === 2) {
    return [
      mkEnemy("col-go-w2-boss", "boss", 0, 8.0, 21, 2, 4.9),
      mkEnemy("col-go-w2-k1", "knight", -8.0, 5.5, 9, 2, 5.4, { shieldArmor: "ice" }),
      mkEnemy("col-go-w2-k2", "knight", 8.0, 5.5, 9, 2, 5.4, { shockArmor: true }),
    ];
  }
  return [
    mkEnemy("col-go-w3-boss", "boss", 0, 8.5, 27, 2, 5.1),
    mkEnemy("col-go-w3-k1", "knight", -8.5, 5.5, 10, 2, 5.5, { isBounty: true }),
    mkEnemy("col-go-w3-k2", "knight", 8.5, 5.5, 10, 2, 5.5, { isBounty: true }),
    mkEnemy("col-go-w3-w1", "wraith", 0, 12.0, 6, 2, 5.8, { isBounty: true }),
  ];
}

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
        .filter(
          (e) =>
            !e.id.startsWith("dg-minion-wave2-") &&
            !e.id.startsWith("cv-minion-wave2-") &&
            !e.id.startsWith("ct-minion-wave2-") &&
            !e.id.startsWith("dungeon-minion-wave2-") &&
            !e.id.startsWith("caverns-minion-wave2-") &&
            !e.id.startsWith("citadel-minion-wave2-") &&
            !e.id.startsWith("caverns-wraith-wave2-") &&
            !e.id.startsWith("desert-minion-wave2-") &&
            !e.id.startsWith("caldera-minion-wave2-")
        )
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
          shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
          burrowed: e.kind === "burrower",
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
        .filter(
          (e) =>
            !e.id.startsWith("dg-minion-wave2-") &&
            !e.id.startsWith("cv-minion-wave2-") &&
            !e.id.startsWith("ct-minion-wave2-") &&
            !e.id.startsWith("dungeon-minion-wave2-") &&
            !e.id.startsWith("caverns-minion-wave2-") &&
            !e.id.startsWith("citadel-minion-wave2-") &&
            !e.id.startsWith("caverns-wraith-wave2-") &&
            !e.id.startsWith("desert-minion-wave2-") &&
            !e.id.startsWith("caldera-minion-wave2-")
        )
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
          shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
          burrowed: e.kind === "burrower",
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
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      shopDismissedOnRug: !open && state.nearShop,
    }));
  },

  setCharacterOpen: (open: boolean) => {
    set((state) => ({
      characterOpen: open,
      shopOpen: open ? false : state.shopOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
    }));
  },

  setQuestLogOpen: (open: boolean) => {
    set((state) => ({
      questLogOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      atlasOpen: open ? false : state.atlasOpen,
    }));
  },

  setAtlasOpen: (open: boolean) => {
    set((state) => ({
      atlasOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      forgeOpen: open ? false : state.forgeOpen,
    }));
  },

  setForgeOpen: (open: boolean) => {
    set((state) => ({
      forgeOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      riftOpen: open ? false : state.riftOpen,
    }));
  },

  setRiftOpen: (open: boolean) => {
    set((state) => ({
      riftOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      sanctuaryOpen: open ? false : state.sanctuaryOpen,
    }));
  },

  setSanctuaryOpen: (open: boolean) => {
    set((state) => ({
      sanctuaryOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      riftOpen: open ? false : state.riftOpen,
      stablesOpen: open ? false : state.stablesOpen,
    }));
  },

  setStablesOpen: (open: boolean) => {
    set((state) => ({
      stablesOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      riftOpen: open ? false : state.riftOpen,
      sanctuaryOpen: open ? false : state.sanctuaryOpen,
      colosseumOpen: open ? false : state.colosseumOpen,
    }));
  },

  setColosseumOpen: (open: boolean) => {
    set((state) => ({
      colosseumOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      riftOpen: open ? false : state.riftOpen,
      sanctuaryOpen: open ? false : state.sanctuaryOpen,
      stablesOpen: open ? false : state.stablesOpen,
      alchemyOpen: open ? false : state.alchemyOpen,
    }));
  },

  setAlchemyOpen: (open: boolean) => {
    set((state) => ({
      alchemyOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      riftOpen: open ? false : state.riftOpen,
      sanctuaryOpen: open ? false : state.sanctuaryOpen,
      stablesOpen: open ? false : state.stablesOpen,
      colosseumOpen: open ? false : state.colosseumOpen,
      weatherOpen: open ? false : state.weatherOpen,
    }));
  },

  setWeatherOpen: (open: boolean) => {
    set((state) => ({
      weatherOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      riftOpen: open ? false : state.riftOpen,
      sanctuaryOpen: open ? false : state.sanctuaryOpen,
      stablesOpen: open ? false : state.stablesOpen,
      colosseumOpen: open ? false : state.colosseumOpen,
      alchemyOpen: open ? false : state.alchemyOpen,
      homesteadOpen: open ? false : state.homesteadOpen,
    }));
  },

  setHomesteadOpen: (open: boolean) => {
    set((state) => ({
      homesteadOpen: open,
      shopOpen: open ? false : state.shopOpen,
      characterOpen: open ? false : state.characterOpen,
      questLogOpen: open ? false : state.questLogOpen,
      atlasOpen: open ? false : state.atlasOpen,
      forgeOpen: open ? false : state.forgeOpen,
      riftOpen: open ? false : state.riftOpen,
      sanctuaryOpen: open ? false : state.sanctuaryOpen,
      stablesOpen: open ? false : state.stablesOpen,
      colosseumOpen: open ? false : state.colosseumOpen,
      alchemyOpen: open ? false : state.alchemyOpen,
      weatherOpen: open ? false : state.weatherOpen,
    }));
  },

  upgradeHomesteadWing: (wing: HomesteadWingId) => {
    const state = get();
    const currentWings = [...(state.hero.homesteadWings ?? [])];
    if (currentWings.includes(wing)) return;

    const WING_META: Record<
      HomesteadWingId,
      { cores: number; rupees: number; name: string; desc: string }
    > = {
      hearth_bed: {
        cores: 2,
        rupees: 100,
        name: "Sovereign's Hearth & Feather Bed",
        desc: "Permanently grants +1 Full Heart Container (+2 Max HP) and unlocks free 100% HP/MP Rest at the Manor!",
      },
      herb_greenhouse: {
        cores: 3,
        rupees: 150,
        name: "Alchemist's Glass Greenhouse",
        desc: "Passively cultivates +1 Random Biome Herb every 25s while exploring & immediately harvests +4 of all Herbs!",
      },
      trophy_vault: {
        cores: 4,
        rupees: 220,
        name: "Grand Reliquary & Trophy Gallery",
        desc: "Permanently grants +1 Sword & Bow Damage and +25% Bonus Rupee Spoils across all realms!",
      },
    };

    const meta = WING_META[wing];
    const cores = state.hero.monsterCores ?? 0;
    if (cores < meta.cores || state.hero.rupees < meta.rupees) {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now(),
          text: "Insufficient Homestead Building Materials!",
          subtext: `Constructing ${meta.name} requires ${meta.cores} Monster Cores and ${meta.rupees} Rupees.`,
          timer: 3.4,
        },
      });
      return;
    }

    currentWings.push(wing);
    const nextHero: HeroState = {
      ...state.hero,
      monsterCores: cores - meta.cores,
      rupees: state.hero.rupees - meta.rupees,
      homesteadWings: currentWings,
    };

    if (wing === "hearth_bed") {
      nextHero.maxHp = Math.min(40, nextHero.maxHp + 2);
      nextHero.hp = nextHero.maxHp;
      nextHero.mp = nextHero.maxMp;
    } else if (wing === "herb_greenhouse") {
      const prevHerbs = nextHero.herbs ?? {
        sun_lotus: 0,
        frost_cap: 0,
        ember_root: 0,
        starlight_dew: 0,
      };
      nextHero.herbs = {
        sun_lotus: (prevHerbs.sun_lotus ?? 0) + 4,
        frost_cap: (prevHerbs.frost_cap ?? 0) + 4,
        ember_root: (prevHerbs.ember_root ?? 0) + 4,
        starlight_dew: (prevHerbs.starlight_dew ?? 0) + 4,
      };
      nextHero.greenhouseTimer = 25.0;
    } else if (wing === "trophy_vault") {
      nextHero.swordDamage = (nextHero.swordDamage ?? 1) + 1;
    }

    soundEngine.unlock();
    soundEngine.playPegPound();
    soundEngine.playVictoryFanfare();
    set({
      hero: nextHero,
      banner: {
        id: Date.now(),
        text: `🏡 Constructed Manor Wing: ${meta.name}!`,
        subtext: meta.desc,
        timer: 4.8,
      },
    });
  },

  restAtHomestead: () => {
    const state = get();
    soundEngine.unlock();
    soundEngine.playFairyRevive();
    set({
      hero: {
        ...state.hero,
        hp: state.hero.maxHp,
        mp: state.hero.maxMp,
        chillTimer: 0,
      },
      banner: {
        id: Date.now(),
        text: "🏡 Rested by the Homestead Hearth! (100% HP & MP Restored)",
        subtext: "Your Hearts and Magic Power are completely replenished!",
        timer: 3.6,
      },
    });
  },

  castFishingLine: () => {
    const state = get();
    const prevFish: Record<FishId, number> = {
      brook_trout: 0,
      reef_snapper: 0,
      magma_koi: 0,
      golden_sturgeon: 0,
      ...(state.hero.fishCaught ?? {}),
    };

    const roll = Math.random();
    const caught: FishId =
      roll >= 0.84
        ? "golden_sturgeon"
        : roll >= 0.58
        ? "magma_koi"
        : roll >= 0.3
        ? "reef_snapper"
        : "brook_trout";

    const firstSturgeon = caught === "golden_sturgeon" && (prevFish.golden_sturgeon ?? 0) === 0;
    prevFish[caught] = (prevFish[caught] ?? 0) + 1;

    const nextHero: HeroState = {
      ...state.hero,
      fishCaught: prevFish,
    };

    let bannerTitle = "";
    let bannerSub = "";

    if (caught === "brook_trout") {
      nextHero.hp = Math.min(nextHero.maxHp, nextHero.hp + 4);
      nextHero.mp = Math.min(nextHero.maxMp, (nextHero.mp ?? 100) + 25);
      nextHero.rupees += 25;
      bannerTitle = "🎣 Reeled In: Silver Brook-Trout!";
      bannerSub = "Restored +2 Hearts & +25 MP, plus +25 Rupees from Master Angler Corin!";
    } else if (caught === "reef_snapper") {
      nextHero.rupees += 50;
      const prevHerbs = nextHero.herbs ?? {
        sun_lotus: 0,
        frost_cap: 0,
        ember_root: 0,
        starlight_dew: 0,
      };
      nextHero.herbs = {
        ...prevHerbs,
        frost_cap: (prevHerbs.frost_cap ?? 0) + 1,
        starlight_dew: (prevHerbs.starlight_dew ?? 0) + 1,
      };
      bannerTitle = "🎣 Reeled In: Azure Reef-Snapper!";
      bannerSub = "Earned +50 Rupees, +1 Glacial Frost-Cap, and +1 Starlight-Dew!";
    } else if (caught === "magma_koi") {
      nextHero.rupees += 85;
      nextHero.monsterCores = (nextHero.monsterCores ?? 0) + 2;
      bannerTitle = "🎣 Reeled In: Molten Magma-Koi! (Rare Catch)";
      bannerSub = "Earned +85 Rupees and +2 Crystallized Monster Cores (✦)!";
    } else {
      nextHero.rupees += 150;
      nextHero.monsterCores = (nextHero.monsterCores ?? 0) + 3;
      if (firstSturgeon) {
        nextHero.maxHp = Math.min(40, nextHero.maxHp + 2);
      }
      nextHero.hp = nextHero.maxHp;
      bannerTitle = "👑 LEGENDARY CATCH: Leviathan Golden Sturgeon!";
      bannerSub = firstSturgeon
        ? "First-Catch Jackpot: +1 Permanent Heart Container, +3 Monster Cores (✦) & +150 Rupees!"
        : "Legendary Prize: +3 Monster Cores (✦), +150 Rupees & 100% Full Heal!";
    }

    soundEngine.unlock();
    soundEngine.playSecretSolve();
    if (caught === "golden_sturgeon") {
      soundEngine.playVictoryFanfare();
    } else {
      soundEngine.playRupeePickup("red");
    }

    set({
      hero: nextHero,
      banner: {
        id: Date.now(),
        text: bannerTitle,
        subtext: bannerSub,
        timer: 4.5,
      },
    });
  },

  grantHomesteadPlaytestBundle: () => {
    soundEngine.unlock();
    soundEngine.playVictoryFanfare();
    set((state) => {
      const hadBed = (state.hero.homesteadWings ?? []).includes("hearth_bed");
      const hadVault = (state.hero.homesteadWings ?? []).includes("trophy_vault");
      const prevFish = state.hero.fishCaught ?? {
        brook_trout: 0,
        reef_snapper: 0,
        magma_koi: 0,
        golden_sturgeon: 0,
      };
      return {
        hero: {
          ...state.hero,
          maxHp: Math.min(40, state.hero.maxHp + (hadBed ? 0 : 2)),
          hp: Math.min(40, state.hero.maxHp + (hadBed ? 0 : 2)),
          mp: state.hero.maxMp,
          swordDamage: (state.hero.swordDamage ?? 1) + (hadVault ? 0 : 1),
          monsterCores: (state.hero.monsterCores ?? 0) + 12,
          rupees: state.hero.rupees + 600,
          homesteadWings: ["hearth_bed", "herb_greenhouse", "trophy_vault"],
          fishCaught: {
            brook_trout: (prevFish.brook_trout ?? 0) + 2,
            reef_snapper: (prevFish.reef_snapper ?? 0) + 2,
            magma_koi: (prevFish.magma_koi ?? 0) + 2,
            golden_sturgeon: (prevFish.golden_sturgeon ?? 0) + 1,
          },
        },
        banner: {
          id: Date.now(),
          text: "🏡 Hero's Homestead Fully Upgraded & All 4 Fish Species Caught!",
          subtext:
            "All 3 Manor Wings constructed (+1 Heart Container, Greenhouse Auto-Herbs & +1 Sword/Bow DMG) + +12 Cores & +600 Rupees!",
          timer: 4.8,
        },
      };
    });
  },

  setWorldWeather: (weather: WeatherId) => {
    const WEATHER_META: Record<
      WeatherId,
      { title: string; sub: string }
    > = {
      clear: {
        title: "☀️ Celestial Sundial: Sunlit Zenith (Clear Skies)",
        sub: "Calm skies and balanced natural illumination restored across the realm.",
      },
      thunderstorm: {
        title: "⛈️ Celestial Sundial: Tempest Thunderstorm Unleashed!",
        sub: "Sky-Bolts strike nearby enemies for 2 DMG + Stun every 3.8s, and Chain-Lightning deals +1 Storm DMG!",
      },
      blizzard: {
        title: "❄️ Celestial Sundial: Rimefrost Blizzard Unleashed!",
        sub: "Chills non-boss monsters (-25% Speed), grants -25% Damage Taken, and adds +1 Frost DMG to Bow Arrows!",
      },
      starfall: {
        title: "🌠 Celestial Sundial: Astral Starfall Shower Unleashed!",
        sub: "+8 MP/s Cosmic Mana Surge, +50% Rupee Value, and Starlight Shards heal +1 HP & +12 MP every 6s!",
      },
      blood_moon: {
        title: "🌑 CRIMSON BLOOD-MOON ECLIPSE AWAKENED!",
        sub: "+1 All Weapon DMG, +1 Extra Monster Core per Kill & 2x Rupee Spoils! Fallen monsters stir beneath the scarlet sky...",
      },
    };

    soundEngine.unlock();
    if (weather === "blood_moon") {
      soundEngine.playBossRoar();
    } else if (weather === "thunderstorm") {
      soundEngine.playElectricShock();
    } else {
      soundEngine.playFairyRevive();
    }

    set((state) => ({
      flags: {
        ...state.flags,
        activeWeather: weather,
        weatherStrikeTimer: weather === "thunderstorm" ? 1.8 : 4.5,
      },
      banner: {
        id: Date.now(),
        text: WEATHER_META[weather].title,
        subtext: WEATHER_META[weather].sub,
        timer: 4.8,
      },
    }));
  },

  triggerBloodMoonInvasion: () => {
    const state = get();
    soundEngine.unlock();
    soundEngine.playBossRoar();
    soundEngine.playGateUnlock();

    const activeZone = state.zone;
    const hx = state.hero.x;
    const hz = state.hero.z;

    // Resurrect fallen non-boss monsters in the current zone AND spawn 3 Elite Blood-Moon Champions near the Hero!
    const revivedEnemies = state.enemies.map((e) => {
      if (e.zone === activeZone && e.state === "dead" && e.kind !== "boss") {
        return {
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          state: "idle" as EnemyAIState,
          stateTimer: 0,
          hitFlashTimer: 0.4,
          stunTimer: 0,
          isBounty: true,
        };
      }
      return e;
    });

    const filteredEnemies = revivedEnemies.filter(
      (e) => !e.id.startsWith("blood-moon-invader-")
    );

    const offsets = [
      { ox: -5.2, oz: 4.8, kind: "knight" as EnemyKind, hp: 9 },
      { ox: 5.2, oz: 4.8, kind: "wraith" as EnemyKind, hp: 6 },
      { ox: 0, oz: 6.4, kind: "goblin" as EnemyKind, hp: 6 },
    ];

    const invasionPack: EnemyState[] = offsets.map((spec, idx) => {
      const sx = Math.max(-28, Math.min(28, Number((hx + spec.ox).toFixed(2))));
      const sz = Math.max(-28, Math.min(28, Number((hz + spec.oz).toFixed(2))));
      return {
        id: `blood-moon-invader-${idx}-${Date.now()}`,
        kind: spec.kind,
        zone: activeZone,
        x: sx,
        z: sz,
        spawnX: sx,
        spawnZ: sz,
        facing: Math.PI,
        hp: spec.hp,
        maxHp: spec.hp,
        weight: getDefaultEnemyWeight(spec.kind),
        state: "aggro",
        stateTimer: 0,
        hitFlashTimer: 0.45,
        knockbackImmunityTimer: 0,
        stunTimer: 0,
        lastHitSwingId: -1,
        knockbackVx: 0,
        knockbackVz: 0,
        aggroRadius: 22.0,
        speed: spec.kind === "knight" ? 5.2 : 5.6,
        damage: 2,
        rupeeDrop: "red",
        shieldArmor: idx === 2 ? "ice" : "none",
        initialShieldArmor: idx === 2 ? "ice" : "none",
        shockArmor: idx === 0,
        initialShockArmor: idx === 0,
        isBounty: true,
        initialIsBounty: true,
        burrowed: false,
        provoked: true,
        chargeAngle: Math.PI,
        chargePathLength: 11.0,
        chargeDistanceTraveled: 0,
        actionCounter: 0,
        actionCooldown: 0.9,
      };
    });

    const clearedCount = (state.flags.bloodMoonInvasionsCleared ?? 0) + 1;

    set({
      weatherOpen: false,
      enemies: [...filteredEnemies, ...invasionPack],
      hero: {
        ...state.hero,
        hp: state.hero.maxHp,
        mp: state.hero.maxMp,
        monsterCores: (state.hero.monsterCores ?? 0) + 4,
        rupees: state.hero.rupees + 150,
      },
      flags: {
        ...state.flags,
        activeWeather: "blood_moon",
        weatherStrikeTimer: 3.5,
        bloodMoonInvasionsCleared: clearedCount,
      },
      banner: {
        id: Date.now(),
        text: "🌑 CRIMSON BLOOD-MOON WORLD INVASION UNLEASHED!",
        subtext:
          "3 Crowned Blood-Moon Champions materialized nearby & fallen foes rose again! (+4 Monster Cores & +150 Rupees Tribute + Double Spoils Active!)",
        timer: 5.8,
      },
    });
  },

  brewAndDrinkElixir: (elixir: Exclude<ElixirId, "none">) => {
    const state = get();
    const currentHerbs: Record<HerbId, number> = {
      sun_lotus: 0,
      frost_cap: 0,
      ember_root: 0,
      starlight_dew: 0,
      ...(state.hero.herbs ?? {}),
    };

    const RECIPES: Record<
      Exclude<ElixirId, "none">,
      {
        name: string;
        desc: string;
        duration: number;
        rupeeCost: number;
        herbCosts: Partial<Record<HerbId, number>>;
      }
    > = {
      titans_draught: {
        name: "Titan's Fury Draught",
        desc: "+1 Sword & Hammer DMG and +25% Critical Hit Chance for 90s!",
        duration: 90,
        rupeeCost: 30,
        herbCosts: { ember_root: 2, sun_lotus: 1 },
      },
      gale_nectar: {
        name: "Zephyr Gale Nectar",
        desc: "+30% Movement Speed and -50% Dash & Boomerang Cooldowns for 90s!",
        duration: 90,
        rupeeCost: 30,
        herbCosts: { sun_lotus: 2, starlight_dew: 1 },
      },
      aegis_tonic: {
        name: "Sovereign Aegis Tonic",
        desc: "-40% All Damage Taken and regenerates +1 HP every 6.0s for 90s!",
        duration: 90,
        rupeeCost: 35,
        herbCosts: { frost_cap: 2, sun_lotus: 1 },
      },
      archmage_elixir: {
        name: "Archmage Ley-Font Elixir",
        desc: "Zero MP Flame Rod Cost and +15 MP/s Arcane Regeneration for 90s!",
        duration: 90,
        rupeeCost: 40,
        herbCosts: { starlight_dew: 2, frost_cap: 1 },
      },
    };

    const recipe = RECIPES[elixir];
    for (const [hKey, needed] of Object.entries(recipe.herbCosts) as Array<
      [HerbId, number]
    >) {
      if ((currentHerbs[hKey] ?? 0) < needed) {
        soundEngine.playGateLocked();
        set({
          banner: {
            id: Date.now(),
            text: "Insufficient Foraged Herbs for Brew!",
            subtext: `Forage wild herbs by chopping bushes or defeating monsters across the realm (or click Playtest Bundle)!`,
            timer: 3.6,
          },
        });
        return;
      }
    }

    if (state.hero.rupees < recipe.rupeeCost) {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now(),
          text: "Insufficient Rupees for Cauldron Distillation!",
          subtext: `Brewing ${recipe.name} requires ${recipe.rupeeCost} Rupees.`,
          timer: 3.2,
        },
      });
      return;
    }

    for (const [hKey, needed] of Object.entries(recipe.herbCosts) as Array<
      [HerbId, number]
    >) {
      currentHerbs[hKey] = Math.max(0, (currentHerbs[hKey] ?? 0) - needed);
    }

    soundEngine.unlock();
    soundEngine.playPotionDrink();
    soundEngine.playFairyRevive();

    set({
      hero: {
        ...state.hero,
        rupees: state.hero.rupees - recipe.rupeeCost,
        herbs: currentHerbs,
        activeElixir: elixir,
        activeElixirTimer: recipe.duration,
        elixirRegenTimer: 6.0,
        hp: Math.min(state.hero.maxHp, state.hero.hp + 4),
        mp: Math.min(state.hero.maxMp, (state.hero.mp ?? 100) + 40),
      },
      banner: {
        id: Date.now(),
        text: `⚗ Brewed & Quaffed: ${recipe.name} (90s)!`,
        subtext: `${recipe.desc} (+2 Hearts & +40 MP instant refreshment!)`,
        timer: 4.8,
      },
    });
  },

  grantAlchemyPlaytestBundle: () => {
    soundEngine.unlock();
    soundEngine.playVictoryFanfare();
    set((state) => {
      const prevHerbs = state.hero.herbs ?? {
        sun_lotus: 0,
        frost_cap: 0,
        ember_root: 0,
        starlight_dew: 0,
      };
      return {
        hero: {
          ...state.hero,
          rupees: state.hero.rupees + 400,
          herbs: {
            sun_lotus: (prevHerbs.sun_lotus ?? 0) + 12,
            frost_cap: (prevHerbs.frost_cap ?? 0) + 12,
            ember_root: (prevHerbs.ember_root ?? 0) + 12,
            starlight_dew: (prevHerbs.starlight_dew ?? 0) + 12,
          },
          activeElixir:
            state.hero.activeElixir && state.hero.activeElixir !== "none"
              ? state.hero.activeElixir
              : "titans_draught",
          activeElixirTimer: 90,
          elixirRegenTimer: 6.0,
        },
        banner: {
          id: Date.now(),
          text: "Apothecary Satchel Restocked! (+12 of All 4 Biome Herbs & +400 Rupees)",
          subtext: "Brew & quaff any Alchemical Elixir at Apothecary Selene's Cauldron!",
          timer: 4.4,
        },
      };
    });
  },

  startColosseumTrial: (tier: ColosseumTierId) => {
    const state = get();
    soundEngine.unlock();
    soundEngine.playPortalTransition();
    soundEngine.playGateUnlock();

    const nonRiftProps = state.mapProps.filter((p) => p.zone !== "rift");
    const nonRiftEnemies = state.enemies.filter((e) => e.zone !== "rift");
    const nonRiftRupees = state.rupees.filter((r) => r.zone !== "rift");
    const nonRiftPortals = state.portals.filter((pt) => pt.zone !== "rift");

    // Build a Circular Gladiatorial Colosseum Amphitheater in `zone: "rift"`
    const colosseumProps: MapPropInstance[] = [];
    const pillarCount = 16;
    const ringRadius = 18.8;
    for (let i = 0; i < pillarCount; i++) {
      const ang = (i / pillarCount) * Math.PI * 2;
      // Leave South Exit Portal opening clear
      if (Math.abs(Math.sin(ang)) < 0.22 && Math.cos(ang) < -0.85) continue;
      const px = Number((Math.sin(ang) * ringRadius).toFixed(2));
      const pz = Number((Math.cos(ang) * ringRadius).toFixed(2));
      colosseumProps.push({
        id: `colosseum-pillar-${i}`,
        name: `Colosseum Pillar ${i + 1}`,
        zone: "rift",
        prefab: "dungeon_pillar",
        x: px,
        y: 0,
        z: pz,
        rotY: ang,
        scaleX: 1.25,
        scaleY: 1.35,
        scaleZ: 1.25,
        hasCollider: true,
        colliderWidth: 2.2,
        colliderDepth: 2.2,
        colliderKind: "pillar",
      });
      if (i % 2 === 0) {
        colosseumProps.push({
          id: `colosseum-torch-${i}`,
          name: `Colosseum Brazier ${i + 1}`,
          zone: "rift",
          prefab: "wall_torch",
          x: Number((Math.sin(ang) * (ringRadius - 1.55)).toFixed(2)),
          y: 0,
          z: Number((Math.cos(ang) * (ringRadius - 1.55)).toFixed(2)),
          rotY: ang + Math.PI,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
          hasCollider: true,
          colliderWidth: 0.9,
          colliderDepth: 0.9,
          colliderKind: "pillar",
          lit: true,
        });
      }
    }

    // 4 Tactical Hookshot Grapple Posts around the arena perimeter
    const grappleCoords = [
      { x: -11.5, z: -11.5 },
      { x: 11.5, z: -11.5 },
      { x: -11.5, z: 11.5 },
      { x: 11.5, z: 11.5 },
    ];
    grappleCoords.forEach((gp, idx) => {
      colosseumProps.push({
        id: `colosseum-grapple-${idx}`,
        name: `Arena Grapple Post ${idx + 1}`,
        zone: "rift",
        prefab: "grapple_post",
        x: gp.x,
        y: 0,
        z: gp.z,
        rotY: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        hasCollider: true,
        colliderWidth: 1.1,
        colliderDepth: 1.1,
        colliderKind: "pillar",
      });
    });

    // 4 Arena Supply Clay Pots (Hearts & Rupees)
    const potCoords = [
      { x: -13.8, z: 0, reward: "heart" as PotRewardKind },
      { x: 13.8, z: 0, reward: "heart" as PotRewardKind },
      { x: -6.5, z: -14.2, reward: "blue" as PotRewardKind },
      { x: 6.5, z: -14.2, reward: "red" as PotRewardKind },
    ];
    potCoords.forEach((pt, idx) => {
      colosseumProps.push({
        id: `colosseum-pot-${idx}`,
        name: `Colosseum Supply Pot ${idx + 1}`,
        zone: "rift",
        prefab: "clay_pot",
        x: pt.x,
        y: 0,
        z: pt.z,
        rotY: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        hasCollider: true,
        colliderWidth: 1.15,
        colliderDepth: 1.15,
        colliderKind: "ruin",
        potReward: pt.reward,
      });
    });

    const colosseumExitPortal: MapPortal = {
      id: "portal-colosseum-exit",
      zone: "rift",
      x: 0,
      z: -16.8,
      radius: 1.9,
      targetZone: "overworld",
      targetX: COLOSSEUM_GATE_POS.x,
      targetZ: COLOSSEUM_GATE_POS.z - 2.6,
      targetFacing: Math.PI,
      label: "Return to Crossroads Village Plaza",
      sublabel: "Grand Colosseum Exit",
      color: "gold",
    };

    const wave1Enemies = buildColosseumWaveEnemies(tier, 1);

    const TIER_META: Record<
      ColosseumTierId,
      { title: string; bossName: string; floorHex: string }
    > = {
      bronze: {
        title: "Grand Colosseum • Bronze Vanguard Trial",
        bossName: "Kragmos, the Bronze Pit-Warlord",
        floorHex: "#4a3828",
      },
      silver: {
        title: "Grand Colosseum • Silver Blood-Pit Trial",
        bossName: "Vaelkor's Blood-Pit Colossus",
        floorHex: "#2d3748",
      },
      gold: {
        title: "Grand Colosseum • Gold Sovereign Boss-Rush",
        bossName: "Astraea Ultima, Sovereign of the Arena",
        floorHex: "#443216",
      },
    };
    const meta = TIER_META[tier];

    set({
      zone: "rift",
      colosseumOpen: false,
      riftOpen: false,
      atlasOpen: false,
      shopOpen: false,
      characterOpen: false,
      questLogOpen: false,
      forgeOpen: false,
      sanctuaryOpen: false,
      stablesOpen: false,
      warpBeamTimer: 1.4,
      hero: {
        ...state.hero,
        hp: state.hero.maxHp,
        mp: state.hero.maxMp,
        x: 0,
        z: -11.5,
        facing: 0,
        knockbackVx: 0,
        knockbackVz: 0,
        knockbackLockTimer: 0,
        portalCooldown: 1.2,
      },
      boomerang: null,
      hookshot: null,
      arrows: [],
      fireballs: [],
      projectiles: [],
      mapProps: [...nonRiftProps, ...colosseumProps],
      enemies: [...nonRiftEnemies, ...wave1Enemies],
      rupees: nonRiftRupees,
      portals: [...nonRiftPortals, colosseumExitPortal],
      terrainRevision: state.terrainRevision + 1,
      flags: {
        ...state.flags,
        bossState: "ARMORED",
        bossArmorTimer: 0,
        riftActive: true,
        riftDepth: tier === "gold" ? 5 : tier === "silver" ? 3 : 1,
        riftSeed: tier === "gold" ? 999 : tier === "silver" ? 555 : 111,
        riftBiome: tier === "gold" ? "pharaoh" : tier === "silver" ? "glacial" : "brimstone",
        riftBiomeTitle: `${meta.title} (Wave 1/3)`,
        riftFloorColorHex: meta.floorHex,
        riftBossName: meta.bossName,
        riftEliteAffix: "Gladiatorial Arena",
        riftRooms: [
          {
            col: 1,
            row: 1,
            cx: 0,
            cz: 0,
            role: "boss",
            distFromStart: 0,
          },
        ],
        riftShrinePos: { x: 0, z: -13.5 },
        riftShrineClaimed: false,
        riftVaultChestPos: undefined,
        riftVaultChestOpened: true,
        riftBossChestPos: { x: 0, z: 0 },
        riftBossChestOpened: false,
        riftNextFloorPos: undefined,
        riftBossDefeated: false,
        colosseumActive: true,
        colosseumTier: tier,
        colosseumWave: 1,
        colosseumTotalWaves: 3,
      },
      banner: {
        id: Date.now(),
        text: `⚔ ${meta.title.toUpperCase()} — WAVE 1/3 BEGINS!`,
        subtext:
          "Defeat all gladiatorial challengers in each wave! Between waves you recover +2 Hearts & +40 MP!",
        timer: 5.5,
      },
    });
  },

  grantColosseumPlaytestBundle: () => {
    soundEngine.unlock();
    soundEngine.playVictoryFanfare();
    set((state) => ({
      hero: {
        ...state.hero,
        maxHp: Math.min(40, state.hero.maxHp + 4),
        hp: Math.min(40, state.hero.maxHp + 4),
        maxMp: Math.max(125, state.hero.maxMp),
        mp: Math.max(125, state.hero.maxMp),
        swordDamage: Math.max(3, state.hero.swordDamage ?? 1),
        monsterCores: (state.hero.monsterCores ?? 0) + 18,
        rupees: state.hero.rupees + 1000,
      },
      flags: {
        ...state.flags,
        colosseumCompletedTiers: ["bronze", "silver", "gold"],
      },
      banner: {
        id: Date.now(),
        text: "Grand Colosseum Champion Bundle Unlocked!",
        subtext:
          "All 3 Gladiatorial Trial Crowns awarded (+2 Heart Containers, +18 Monster Cores, +1,000 Rupees & +1 Sword DMG)!",
        timer: 4.8,
      },
    }));
  },

  whistleToggleMount: () => {
    const state = get();
    if (state.phase !== "playing") return;
    const hero = { ...state.hero };
    const currentMounted = hero.mountedSteed ?? "none";

    if (currentMounted !== "none") {
      hero.mountedSteed = "none";
      soundEngine.unlock();
      soundEngine.playCrystalSwitch(false);
      set({
        hero,
        banner: {
          id: Date.now(),
          text: "Dismounted Steed",
          subtext: "Press [V] anytime to whistle and summon your 3D Steed!",
          timer: 2.8,
        },
      });
      return;
    }

    const active =
      hero.activeMount && hero.activeMount !== "none"
        ? hero.activeMount
        : "sun_courser";
    const unlocked = hero.unlockedMounts ?? ["none", "sun_courser"];
    const targetMount = unlocked.includes(active) ? active : "sun_courser";

    hero.activeMount = targetMount;
    hero.mountedSteed = targetMount;
    hero.mountAttackTimer = 1.0;

    const MOUNT_NAMES: Record<Exclude<MountId, "none">, { title: string; sub: string }> = {
      sun_courser: {
        title: "🐎 Whistled: Sun-Mane Courser Mounted!",
        sub: "+65% Gallop Speed & Cavalry Trample (gallop through foes for 2 DMG + heavy knockback)!",
      },
      frost_stag: {
        title: "🦌 Whistled: Glacial Dire-Stag Mounted!",
        sub: "+55% Speed, Frost-Walk across rivers/lagoons, Cavalry Trample & Rime Hoof-Bolts every 2.4s!",
      },
      war_drake: {
        title: "🐉 Whistled: Obsidian War-Drake Mounted!",
        sub: "+50% Glide Speed over water, -30% Damage Taken, Trample & Homing Drakefire Breath every 1.8s!",
      },
    };

    soundEngine.unlock();
    soundEngine.playFairyRevive();
    set({
      hero,
      banner: {
        id: Date.now(),
        text: MOUNT_NAMES[targetMount].title,
        subtext: `${MOUNT_NAMES[targetMount].sub} Press [V] to dismount.`,
        timer: 4.0,
      },
    });
  },

  summonOrUnlockMount: (mountId: MountId) => {
    const state = get();
    const hero = {
      ...state.hero,
      unlockedMounts: [...(state.hero.unlockedMounts ?? ["none", "sun_courser"])],
    };

    if (mountId === "none") {
      hero.mountedSteed = "none";
      soundEngine.unlock();
      soundEngine.playCrystalSwitch(false);
      set({
        hero,
        banner: {
          id: Date.now(),
          text: "Dismounted & Returned Steed to Paddock",
          subtext: "Press [V] anytime in the field to whistle your active steed!",
          timer: 3.0,
        },
      });
      return;
    }

    const MOUNT_META: Record<
      Exclude<MountId, "none">,
      { cores: number; rupees: number; name: string; desc: string }
    > = {
      sun_courser: {
        cores: 0,
        rupees: 0,
        name: "Solarius, the Sun-Mane Courser",
        desc: "+65% Gallop Speed & Cavalry Trample (galloping into monsters deals 2 DMG + heavy knockback)!",
      },
      frost_stag: {
        cores: 4,
        rupees: 140,
        name: "Boreas, the Glacial Dire-Stag",
        desc: "+55% Gallop Speed, Frost-Walk across rivers/lagoons, Cavalry Trample & Rime Hoof-Bolts every 2.4s!",
      },
      war_drake: {
        cores: 7,
        rupees: 240,
        name: "Ignivar, the Obsidian War-Drake",
        desc: "+50% Glide Speed over water, -30% Damage Taken, Cavalry Trample & Homing Drakefire Breath every 1.8s!",
      },
    };

    const meta = MOUNT_META[mountId];
    const alreadyUnlocked = hero.unlockedMounts.includes(mountId);
    if (!alreadyUnlocked) {
      const cores = hero.monsterCores ?? 0;
      if (cores < meta.cores || hero.rupees < meta.rupees) {
        soundEngine.playGateLocked();
        set({
          banner: {
            id: Date.now(),
            text: "Insufficient Royal Stables Tribute!",
            subtext: `Taming ${meta.name} requires ${meta.cores} Monster Cores and ${meta.rupees} Rupees.`,
            timer: 3.4,
          },
        });
        return;
      }
      hero.monsterCores = cores - meta.cores;
      hero.rupees -= meta.rupees;
      hero.unlockedMounts.push(mountId);
    }

    hero.activeMount = mountId;
    hero.mountedSteed = mountId;
    hero.mountAttackTimer = 0.8;
    soundEngine.unlock();
    soundEngine.playFairyRevive();
    soundEngine.playVictoryFanfare();
    set({
      hero,
      banner: {
        id: Date.now(),
        text: alreadyUnlocked
          ? `Mounted ${meta.name}!`
          : `Tamed & Mounted ${meta.name}!`,
        subtext: meta.desc,
        timer: 4.5,
      },
    });
  },

  grantStablesPlaytestBundle: () => {
    soundEngine.unlock();
    soundEngine.playVictoryFanfare();
    set((state) => ({
      hero: {
        ...state.hero,
        monsterCores: (state.hero.monsterCores ?? 0) + 12,
        rupees: state.hero.rupees + 600,
        unlockedMounts: ["none", "sun_courser", "frost_stag", "war_drake"],
        activeMount:
          state.hero.activeMount && state.hero.activeMount !== "none"
            ? state.hero.activeMount
            : "war_drake",
        mountedSteed:
          state.hero.mountedSteed && state.hero.mountedSteed !== "none"
            ? state.hero.mountedSteed
            : "war_drake",
      },
      banner: {
        id: Date.now(),
        text: "Royal Stables Playtest Unlocked! (All 3 Steeds Ready!)",
        subtext: "Ride Solarius (Courser), Boreas (Glacial Stag), or Ignivar (Obsidian War-Drake) anytime with [V]!",
        timer: 4.4,
      },
    }));
  },

  summonOrUnlockCompanion: (companionId: CompanionId) => {
    const state = get();
    const hero = {
      ...state.hero,
      unlockedCompanions: [...(state.hero.unlockedCompanions ?? ["none"])],
    };

    if (companionId === "none") {
      hero.activeCompanion = "none";
      soundEngine.unlock();
      soundEngine.playCrystalSwitch(false);
      set({
        hero,
        banner: {
          id: Date.now(),
          text: "Spirit Companion Dismissed",
          subtext: "Press [K] anytime to summon an Elemental Spirit Companion!",
          timer: 3.0,
        },
      });
      return;
    }

    const COMP_COSTS: Record<
      Exclude<CompanionId, "none">,
      { cores: number; rupees: number; name: string; desc: string }
    > = {
      ember_phoenix: {
        cores: 3,
        rupees: 120,
        name: "Pyra, the Ember Phoenix",
        desc: "Orbits you in 3D and launches homing Fireballs every 2.2s (melts Ice Armor & lights torches)!",
      },
      frost_owl: {
        cores: 3,
        rupees: 140,
        name: "Glacia, the Rimefeather Owl",
        desc: "Fires Frost Bolts every 2.4s (chills & stuns foes) and grants +1 Shield Block!",
      },
      storm_wolf: {
        cores: 4,
        rupees: 160,
        name: "Voltaris, the Astral Storm-Wolf",
        desc: "Grants +15% Movement Speed and zaps nearby monsters with 3D Chain Lightning every 2.0s!",
      },
      gold_sprite: {
        cores: 4,
        rupees: 180,
        name: "Aurelia, the Treasure Sprite",
        desc: "Pulls Rupees & Hearts from 8.5m away, boosts Rupee value +50%, and heals +1 Heart & +20 MP every 14s!",
      },
    };

    const meta = COMP_COSTS[companionId];
    const alreadyUnlocked = hero.unlockedCompanions.includes(companionId);
    if (!alreadyUnlocked) {
      const cores = hero.monsterCores ?? 0;
      if (cores < meta.cores || hero.rupees < meta.rupees) {
        soundEngine.playGateLocked();
        set({
          banner: {
            id: Date.now(),
            text: "Insufficient Sanctuary Offerings!",
            subtext: `Summoning ${meta.name} requires ${meta.cores} Monster Cores and ${meta.rupees} Rupees.`,
            timer: 3.4,
          },
        });
        return;
      }
      hero.monsterCores = cores - meta.cores;
      hero.rupees -= meta.rupees;
      hero.unlockedCompanions.push(companionId);
    }

    hero.activeCompanion = companionId;
    hero.companionAttackTimer = 0.6;
    soundEngine.unlock();
    soundEngine.playFairyRevive();
    soundEngine.playVictoryFanfare();
    set({
      hero,
      banner: {
        id: Date.now(),
        text: alreadyUnlocked
          ? `Summoned ${meta.name}!`
          : `Awakened & Summoned ${meta.name}!`,
        subtext: meta.desc,
        timer: 4.5,
      },
    });
  },

  toggleEquipRelic: (relicId: RelicId) => {
    const state = get();
    const unlocked = state.hero.unlockedRelics ?? [];
    if (!unlocked.includes(relicId)) return;
    const equipped = [...(state.hero.equippedRelics ?? [])];
    const idx = equipped.indexOf(relicId);
    soundEngine.unlock();
    if (idx !== -1) {
      equipped.splice(idx, 1);
      soundEngine.playCrystalSwitch(false);
      set({
        hero: { ...state.hero, equippedRelics: equipped },
      });
    } else {
      if (equipped.length >= 3) {
        equipped.shift();
      }
      equipped.push(relicId);
      soundEngine.playCrystalSwitch(true);
      set({
        hero: { ...state.hero, equippedRelics: equipped },
      });
    }
  },

  gambleAncientRelic: () => {
    const state = get();
    const allRelics: RelicId[] = [
      "vampiric_fang",
      "arcane_conduit",
      "thunder_sigil",
      "demolition_core",
      "wind_feather",
      "greed_crown",
      "berserker_torc",
      "aegis_ankh",
    ];
    const unlocked = [...(state.hero.unlockedRelics ?? [])];
    const locked = allRelics.filter((r) => !unlocked.includes(r));
    if (locked.length === 0) {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now(),
          text: "All 8 Ancient Relics Already Discovered!",
          subtext: "Equip any 3 Relics in the Sanctuary Vault [K] to customize your Hero build!",
          timer: 3.4,
        },
      });
      return;
    }

    const coreCost = 2;
    const rupeeCost = 90;
    const cores = state.hero.monsterCores ?? 0;
    if (cores < coreCost || state.hero.rupees < rupeeCost) {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now(),
          text: "Insufficient Offerings to Roll Ancient Relic!",
          subtext: `Requires ${coreCost} Monster Cores and ${rupeeCost} Rupees.`,
          timer: 3.2,
        },
      });
      return;
    }

    const rolled = locked[Math.floor(Math.random() * locked.length)];
    unlocked.push(rolled);
    const equipped = [...(state.hero.equippedRelics ?? [])];
    if (equipped.length < 3) {
      equipped.push(rolled);
    }

    const RELIC_NAMES: Record<RelicId, string> = {
      vampiric_fang: "Crimson Leech Fang (+1 HP & +8 MP on Kill)",
      arcane_conduit: "Archmage's Ley-Crystal (2x MP Regen & -40% Flame Cost)",
      thunder_sigil: "Tempest Thorns Sigil (Shield Block Zaps Attackers for 2 DMG)",
      demolition_core: "Sapper's Cluster Core (+40% Bomb Radius & +2 Bomb DMG)",
      wind_feather: "Zephyr Gale Plume (+18% Speed & -35% Dash Cooldown)",
      greed_crown: "Sovereign's Greed Crown (+50% Rupees & +1 Extra Boss/Elite Core)",
      berserker_torc: "Bloodforged War-Torc (+1 Sword/Hammer DMG & +35% Charge Speed)",
      aegis_ankh: "Immortal Phoenix Ankh (-25% DMG Taken & Auto-Revive Rebirth)",
    };

    soundEngine.unlock();
    soundEngine.playSecretSolve();
    soundEngine.playVictoryFanfare();
    set({
      hero: {
        ...state.hero,
        monsterCores: cores - coreCost,
        rupees: state.hero.rupees - rupeeCost,
        unlockedRelics: unlocked,
        equippedRelics: equipped,
      },
      banner: {
        id: Date.now(),
        text: `Unearthed Ancient Relic: ${RELIC_NAMES[rolled]}!`,
        subtext:
          equipped.includes(rolled)
            ? "Automatically attuned into your Active Relic Loadout!"
            : "Added to your Relic Vault — click to equip in one of your 3 Relic Slots!",
        timer: 4.8,
      },
    });
  },

  grantSanctuaryPlaytestBundle: () => {
    soundEngine.unlock();
    soundEngine.playVictoryFanfare();
    const allRelics: RelicId[] = [
      "vampiric_fang",
      "arcane_conduit",
      "thunder_sigil",
      "demolition_core",
      "wind_feather",
      "greed_crown",
      "berserker_torc",
      "aegis_ankh",
    ];
    set((state) => ({
      hero: {
        ...state.hero,
        monsterCores: (state.hero.monsterCores ?? 0) + 15,
        rupees: state.hero.rupees + 800,
        unlockedCompanions: [
          "none",
          "ember_phoenix",
          "frost_owl",
          "storm_wolf",
          "gold_sprite",
        ],
        activeCompanion:
          state.hero.activeCompanion && state.hero.activeCompanion !== "none"
            ? state.hero.activeCompanion
            : "ember_phoenix",
        unlockedRelics: allRelics,
        equippedRelics:
          (state.hero.equippedRelics ?? []).length > 0
            ? state.hero.equippedRelics
            : ["vampiric_fang", "berserker_torc", "wind_feather"],
      },
      banner: {
        id: Date.now(),
        text: "Sanctuary Playtest Unlocked! (All 4 Companions & All 8 Relics!)",
        subtext: "Switch 3D Spirit Companions & customize your 3 Active Relics anytime!",
        timer: 4.2,
      },
    }));
  },

  enterProceduralRift: (depth = 1, customSeed?: number) => {
    const state = get();
    const targetDepth = Math.max(1, Math.floor(depth));
    const seed =
      customSeed !== undefined
        ? customSeed
        : Math.floor(100000 + Math.random() * 899999);
    const gen = generateProceduralRiftFloor(targetDepth, seed);

    soundEngine.unlock();
    soundEngine.playPortalTransition();

    const nonRiftProps = state.mapProps.filter((p) => p.zone !== "rift");
    const nonRiftEnemies = state.enemies.filter((e) => e.zone !== "rift");
    const nonRiftRupees = state.rupees.filter((r) => r.zone !== "rift");
    const nonRiftPortals = state.portals.filter((pt) => pt.zone !== "rift");

    const spawnedEnemies: EnemyState[] = gen.enemies.map((sp) => ({
      id: sp.id,
      kind: sp.kind,
      zone: "rift",
      x: sp.x,
      z: sp.z,
      spawnX: sp.x,
      spawnZ: sp.z,
      facing: Math.PI,
      hp: sp.hp,
      maxHp: sp.hp,
      weight: sp.weight,
      state: "idle",
      stateTimer: 0,
      hitFlashTimer: 0,
      knockbackImmunityTimer: 0,
      stunTimer: 0,
      lastHitSwingId: -1,
      knockbackVx: 0,
      knockbackVz: 0,
      aggroRadius: sp.aggroRadius,
      speed: sp.speed,
      damage: sp.damage,
      rupeeDrop: sp.rupeeDrop,
      shieldArmor: sp.shieldArmor ?? "none",
      initialShieldArmor: sp.shieldArmor ?? "none",
      shockArmor: sp.shockArmor ?? false,
      initialShockArmor: sp.shockArmor ?? false,
      isBounty: sp.isBounty ?? false,
      initialIsBounty: sp.isBounty ?? false,
      burrowed: sp.kind === "burrower",
      provoked: false,
      chargeAngle: Math.PI,
      chargePathLength: 12.0,
      chargeDistanceTraveled: 0,
      actionCounter: 0,
      actionCooldown: 0.9,
    }));

    const spawnedRupees: RupeeItemState[] = gen.rupees.map((r) => ({
      id: r.id,
      zone: "rift",
      x: r.x,
      z: r.z,
      tier: r.tier,
      value: r.value,
      collected: false,
      spawnBounceTimer: 0,
    }));

    const nextDiscovered = Array.from(
      new Set([...(state.flags.discoveredZones ?? ["overworld"]), "rift" as ZoneId])
    );
    const nextAwakened = Array.from(
      new Set([...(state.flags.awakenedWarpZones ?? ["overworld"]), "rift" as ZoneId])
    );

    set({
      zone: "rift",
      riftOpen: false,
      colosseumOpen: false,
      atlasOpen: false,
      shopOpen: false,
      characterOpen: false,
      questLogOpen: false,
      forgeOpen: false,
      warpBeamTimer: 1.4,
      hero: {
        ...state.hero,
        x: 0,
        z: -22.5,
        facing: 0,
        knockbackVx: 0,
        knockbackVz: 0,
        knockbackLockTimer: 0,
        portalCooldown: 1.2,
      },
      boomerang: null,
      hookshot: null,
      arrows: [],
      fireballs: [],
      projectiles: [],
      mapProps: [...nonRiftProps, ...gen.props],
      enemies: [...nonRiftEnemies, ...spawnedEnemies],
      rupees: [...nonRiftRupees, ...spawnedRupees],
      portals: [...nonRiftPortals, ...gen.portals],
      terrainRevision: state.terrainRevision + 1,
      flags: {
        ...state.flags,
        discoveredZones: nextDiscovered,
        awakenedWarpZones: nextAwakened,
        bossState: "ARMORED",
        bossArmorTimer: 0,
        riftActive: true,
        riftDepth: targetDepth,
        riftSeed: seed,
        riftBiome: gen.biome,
        riftBiomeTitle: gen.biomeTitle,
        riftFloorColorHex: gen.floorColorHex,
        riftBossName: gen.bossName,
        riftEliteAffix: gen.eliteAffixLabel,
        riftRooms: gen.rooms,
        riftShrinePos: gen.shrinePos,
        riftShrineClaimed: false,
        riftVaultChestPos: gen.vaultChestPos,
        riftVaultChestOpened: false,
        riftBossChestPos: gen.bossChestPos,
        riftBossChestOpened: false,
        riftNextFloorPos: gen.nextFloorPortalPos,
        riftBossDefeated: false,
        colosseumActive: false,
      },
      banner: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `Abyssal Rift — Depth ${targetDepth}: ${gen.biomeTitle}`,
        subtext: `Seed #${seed} • ${gen.rooms.length} Procedural Chambers • Affix: ${gen.eliteAffixLabel}`,
        timer: 5.2,
      },
    });
  },

  grantForgePlaytestBundle: () => {
    soundEngine.unlock();
    soundEngine.playShopPurchase();
    set((state) => ({
      hero: {
        ...state.hero,
        monsterCores: (state.hero.monsterCores ?? 0) + 12,
        rupees: state.hero.rupees + 600,
        hasHammer: true,
        hasBow: true,
      },
      banner: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: "Playtest Forge Supply Granted! (+12 Cores & +600 Rupees)",
        subtext: "Infuse your Sword, Bow, and War-Hammer with Tier I & Tier II Elemental Runes!",
        timer: 3.8,
      },
    }));
  },

  forgeEnchantWeapon: (slot: "sword" | "bow" | "hammer") => {
    const state = get();
    const hero = { ...state.hero };
    const cores = hero.monsterCores ?? 0;

    if (slot === "sword") {
      const cur = hero.swordRuneTier ?? 0;
      if (cur >= 2) return;
      const nextTier = (cur + 1) as 1 | 2;
      const coreCost = nextTier === 1 ? 3 : 6;
      const rupeeCost = nextTier === 1 ? 120 : 280;
      if (cores < coreCost || hero.rupees < rupeeCost) {
        soundEngine.playGateLocked();
        set({
          banner: {
            id: Date.now(),
            text: "Insufficient Forge Materials!",
            subtext: `Requires ${coreCost} Monster Cores and ${rupeeCost} Rupees.`,
            timer: 3.2,
          },
        });
        return;
      }
      hero.monsterCores = cores - coreCost;
      hero.rupees -= rupeeCost;
      hero.swordRuneTier = nextTier;
      soundEngine.unlock();
      soundEngine.playPegPound();
      soundEngine.playVictoryFanfare();
      set({
        hero,
        banner: {
          id: Date.now(),
          text:
            nextTier === 1
              ? "Forged Sword Rune I: Tempest Chain-Lightning!"
              : "Forged Sword Rune II: Sovereign Thunder-Cleaver!",
          subtext:
            nextTier === 1
              ? "Every Sword slash arcs Chain Lightning to 2 nearby monsters (+1 DMG & Stagger)!"
              : "Arcs Chain Lightning to 4 monsters (+2 DMG) and flips Spiked Beetles!",
          timer: 4.6,
        },
      });
    } else if (slot === "bow") {
      const cur = hero.bowRuneTier ?? 0;
      if (cur >= 2) return;
      const nextTier = (cur + 1) as 1 | 2;
      const coreCost = nextTier === 1 ? 3 : 6;
      const rupeeCost = nextTier === 1 ? 140 : 300;
      if (cores < coreCost || hero.rupees < rupeeCost) {
        soundEngine.playGateLocked();
        set({
          banner: {
            id: Date.now(),
            text: "Insufficient Forge Materials!",
            subtext: `Requires ${coreCost} Monster Cores and ${rupeeCost} Rupees.`,
            timer: 3.2,
          },
        });
        return;
      }
      hero.monsterCores = cores - coreCost;
      hero.rupees -= rupeeCost;
      hero.bowRuneTier = nextTier;
      hero.hasBow = true;
      soundEngine.unlock();
      soundEngine.playPegPound();
      soundEngine.playVictoryFanfare();
      set({
        hero,
        banner: {
          id: Date.now(),
          text:
            nextTier === 1
              ? "Forged Bow Rune I: Twin-Hawk 3-Arrow Volley!"
              : "Forged Bow Rune II: Starlight Piercer Volley!",
          subtext:
            nextTier === 1
              ? "Firing your Bow [E] now launches a 3-Arrow Spread Volley for the cost of 1 arrow!"
              : "3-Arrow Volley now pierces through enemies (+1 Bonus DMG) and ignites unlit Braziers!",
          timer: 4.6,
        },
      });
    } else if (slot === "hammer") {
      const cur = hero.hammerRuneTier ?? 0;
      if (cur >= 2) return;
      const nextTier = (cur + 1) as 1 | 2;
      const coreCost = nextTier === 1 ? 3 : 6;
      const rupeeCost = nextTier === 1 ? 150 : 320;
      if (cores < coreCost || hero.rupees < rupeeCost) {
        soundEngine.playGateLocked();
        set({
          banner: {
            id: Date.now(),
            text: "Insufficient Forge Materials!",
            subtext: `Requires ${coreCost} Monster Cores and ${rupeeCost} Rupees.`,
            timer: 3.2,
          },
        });
        return;
      }
      hero.monsterCores = cores - coreCost;
      hero.rupees -= rupeeCost;
      hero.hammerRuneTier = nextTier;
      hero.hasHammer = true;
      soundEngine.unlock();
      soundEngine.playPegPound();
      soundEngine.playVictoryFanfare();
      set({
        hero,
        banner: {
          id: Date.now(),
          text:
            nextTier === 1
              ? "Forged Hammer Rune I: Permafrost Quake Nova!"
              : "Forged Hammer Rune II: Cataclysmic Frostfire Impact!",
          subtext:
            nextTier === 1
              ? "War-Hammer slams [T] unleash a 5.0m Frost-Nova (+1 DMG & longer freeze stun)!"
              : "6.2m Quake Nova (+2 Bonus DMG) that erupts 4 radial Elemental Seekers on impact!",
          timer: 4.6,
        },
      });
    }
  },

  warpToZone: (targetZone: ZoneId, forceAllow = false) => {
    const state = get();
    const awakened = state.flags.awakenedWarpZones ?? ["overworld"];
    if (!forceAllow && !awakened.includes(targetZone)) {
      soundEngine.playGateLocked();
      set({
        banner: {
          id: Date.now() + Math.floor(Math.random() * 1000),
          text: "Warp Monolith Dormant",
          subtext: "Discover and approach that region's Warp Monolith on foot to awaken it for Fast-Travel!",
          timer: 3.6,
        },
      });
      return;
    }

    const meta = WARP_STONE_META[targetZone];
    soundEngine.unlock();
    soundEngine.playPortalTransition();

    const nextDiscovered = Array.from(
      new Set([...(state.flags.discoveredZones ?? ["overworld"]), targetZone])
    );
    const nextAwakened = Array.from(
      new Set([...awakened, targetZone])
    );

    set({
      zone: targetZone,
      dungeonRoom: targetZone === "dungeon" ? "hub" : state.dungeonRoom,
      atlasOpen: false,
      warpBeamTimer: 1.4,
      hero: {
        ...state.hero,
        x: meta.arrivalX,
        z: meta.arrivalZ,
        facing: 0,
        knockbackVx: 0,
        knockbackVz: 0,
        knockbackLockTimer: 0,
        portalCooldown: 1.0,
      },
      boomerang: null,
      hookshot: null,
      arrows: [],
      fireballs: [],
      projectiles: [],
      flags: {
        ...state.flags,
        discoveredZones: nextDiscovered,
        awakenedWarpZones: nextAwakened,
      },
      banner: {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: `Warped to ${meta.regionName}`,
        subtext: `${meta.title} • Press [M] anytime to open the World Atlas.`,
        timer: 3.8,
      },
    });
  },

  toggleWayfinder: () => {
    soundEngine.unlock();
    const nextActive = !get().wayfinderActive;
    if (nextActive) {
      soundEngine.playHeartPickup();
    }
    set({
      wayfinderActive: nextActive,
      banner: nextActive
        ? {
            id: Date.now() + Math.floor(Math.random() * 1000),
            text: "Golden Wayfinder Summoned",
            subtext:
              "Follow the shimmering golden trail toward your next lead. Press [N] anytime to dismiss.",
            timer: 3.2,
          }
        : null,
    });
  },

  setPinnedQuestId: (questId: string | null) => {
    soundEngine.unlock();
    soundEngine.playHeartPickup();
    set({
      pinnedQuestId: questId,
      wayfinderActive: true,
    });
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
          : kind === "turret" || kind === "burrower"
          ? 6
          : kind === "minion" || kind === "wraith" || kind === "bomber"
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
        aggroRadius:
          kind === "turret"
            ? 15.5
            : kind === "wraith" || kind === "archer" || kind === "bomber"
            ? 11.8
            : kind === "burrower"
            ? 11.0
            : 8.5,
        speed:
          kind === "turret"
            ? 0
            : kind === "boss"
            ? 3.9
            : kind === "burrower"
            ? 4.2
            : kind === "bomber"
            ? 4.6
            : kind === "wraith"
            ? 4.8
            : kind === "goblin" || kind === "minion"
            ? 5.5
            : 5.0,
        damage: 1,
        rupeeDrop:
          kind === "boss"
            ? "boss"
            : kind === "knight" ||
              kind === "turret" ||
              kind === "wraith" ||
              kind === "bomber" ||
              kind === "burrower"
            ? "red"
            : "blue",
        burrowed: kind === "burrower",
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
        .filter(
          (e) =>
            !e.id.startsWith("dg-minion-wave2-") &&
            !e.id.startsWith("cv-minion-wave2-") &&
            !e.id.startsWith("ct-minion-wave2-") &&
            !e.id.startsWith("dungeon-minion-wave2-") &&
            !e.id.startsWith("caverns-minion-wave2-") &&
            !e.id.startsWith("citadel-minion-wave2-") &&
            !e.id.startsWith("caverns-wraith-wave2-") &&
            !e.id.startsWith("desert-minion-wave2-") &&
            !e.id.startsWith("caldera-minion-wave2-")
        )
        .map((e) => ({
          ...e,
          x: e.spawnX,
          z: e.spawnZ,
          hp: e.maxHp,
          shieldArmor: e.initialShieldArmor ?? e.shieldArmor ?? "none",
          shockArmor: e.initialShockArmor ?? e.shockArmor ?? false,
          isBounty: e.initialIsBounty ?? e.isBounty ?? false,
          burrowed: e.kind === "burrower",
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
      hookshot: null,
      hammerShockwaves: [],
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
        desertCrystalPuzzleSolved: false,
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
        frontierHookshotChestOpened: false,
        frontierCitadelGateUnlocked: false,
        cavernWardensCleared: false,
        cavernEyeSolved: false,
        cavernShovelChestOpened: false,
        cavernHammerChestOpened: false,
        cavernCrestKeyPickedUp: false,
        hasGlacialKey: false,
        cavernBossAwakened: false,
        cavernBossPhase2: false,
        cavernBossDefeated: false,
        cavernBossHeartAwarded: false,
        citadelArmoryChestOpened: false,
        citadelTimedTorchSolved: false,
        citadelEyeStatuesSolved: false,
        citadelGateUnlocked: false,
        citadelBossAwakened: false,
        citadelBossPhase2: false,
        citadelBossDefeated: false,
        citadelBossHeartAwarded: false,
        citadelVictoryChestOpened: false,
        desertOasisChestOpened: false,
        desertWardensCleared: false,
        desertBossAwakened: false,
        desertBossPhase2: false,
        desertBossDefeated: false,
        desertBossHeartAwarded: false,
        desertSolarKeyPickedUp: false,
        hasSolarKey: false,
        desertCalderaGateUnlocked: false,
        calderaForgeChestOpened: false,
        calderaTorchPuzzleSolved: false,
        calderaEyeStatuesSolved: false,
        calderaPegsSolved: false,
        calderaGateUnlocked: false,
        calderaBossAwakened: false,
        calderaBossPhase2: false,
        calderaBossDefeated: false,
        calderaBossHeartAwarded: false,
        calderaVictoryChestOpened: false,
        atollPearlChestOpened: false,
        atollBossAwakened: false,
        atollBossDefeated: false,
        atollVictoryChestOpened: false,
        hollowSporeChestOpened: false,
        hollowBossAwakened: false,
        hollowBossDefeated: false,
        hollowVictoryChestOpened: false,
        skyCelestialChestOpened: false,
        skyBossAwakened: false,
        skyBossDefeated: false,
        skyVictoryChestOpened: false,
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
        hookshotCooldown: 0,
        hammerCooldown: 0,
        hammerAnimTimer: 0,
        digAnimTimer: 0,
        attackCooldown: 0,
        boomerangCooldown: 0,
        bowCooldown: 0,
        bowAnimTimer: 0,
        throwAnimTimer: 0,
        weaponLockTimer: 0,
        invulnerableTimer: 0,
        hurtFlashTimer: 0,
        chillTimer: 0,
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
        (e) =>
          !e.id.startsWith("dg-minion-wave2-") &&
          !e.id.startsWith("cv-minion-wave2-") &&
          !e.id.startsWith("ct-minion-wave2-") &&
          !e.id.startsWith("dungeon-minion-wave2-") &&
          !e.id.startsWith("caverns-minion-wave2-") &&
          !e.id.startsWith("citadel-minion-wave2-") &&
          !e.id.startsWith("caverns-wraith-wave2-") &&
          !e.id.startsWith("desert-minion-wave2-") &&
          !e.id.startsWith("caldera-minion-wave2-")
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
          desert: data.terrainCells?.desert ?? state.terrainCells.desert ?? {},
          caldera: data.terrainCells?.caldera ?? state.terrainCells.caldera ?? {},
          atoll: data.terrainCells?.atoll ?? state.terrainCells.atoll ?? {},
          hollow: data.terrainCells?.hollow ?? state.terrainCells.hollow ?? {},
          sky: data.terrainCells?.sky ?? state.terrainCells.sky ?? {},
          rift: data.terrainCells?.rift ?? state.terrainCells.rift ?? {},
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
          desert: data.terrainCells?.desert ?? {},
          caldera: data.terrainCells?.caldera ?? {},
          atoll: data.terrainCells?.atoll ?? {},
          hollow: data.terrainCells?.hollow ?? {},
          sky: data.terrainCells?.sky ?? {},
          rift: data.terrainCells?.rift ?? {},
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
        desert: {},
        caldera: {},
        atoll: {},
        hollow: {},
        sky: {},
        rift: {},
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
      hero.hasHookshot = true;
      hero.hasHammer = true;
      hero.maxBombs = Math.max(hero.maxBombs || 0, 30);
      hero.bombs = hero.maxBombs;
      hero.mp = hero.maxMp;

      soundEngine.playVictoryFanfare();
      pushNotice(
        "Champion's Progression Set Unlocked! (+1 Heart, Mirror Shield, Master Blade, Hookshot, War-Hammer & 30 Bombs)",
        "Your Max HP increased, Aegis Mirror Shield, Tempered Blade, Hookshot [H] & War-Hammer [T] are equipped, and your Bomb Bag holds 30 Bombs!"
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

    if (item === "hookshot") {
      if (hero.hasHookshot) return;
      if (hero.rupees < 180) {
        soundEngine.playGateLocked();
        pushNotice(
          "Not Enough Rupees!",
          "The Grappling Hookshot costs 180 Rupees (or claim it free inside Map 3's NW Cliffside Reliquary Chest!)."
        );
        return;
      }
      hero.rupees -= 180;
      hero.hasHookshot = true;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked the Grappling Hookshot! (Key: H / 7)",
        "Press H or 7 to grapple across chasms onto Wooden Grapple Posts & Trees, rip shields off Goblins, or snag distant Rupees & Keys!"
      );
      return;
    }

    if (item === "hammer") {
      if (hero.hasHammer) return;
      if (hero.rupees < 220) {
        soundEngine.playGateLocked();
        pushNotice(
          "Not Enough Rupees!",
          "The Titan War-Hammer costs 220 Rupees (or claim it free inside Map 4's SW Glacial Forge Chest!)."
        );
        return;
      }
      hero.rupees -= 220;
      hero.hasHammer = true;
      soundEngine.playVictoryFanfare();
      pushNotice(
        "Unlocked the Titan War-Hammer! (Key: T / 8)",
        "Press T or 8 to slam the ground with a seismic shockwave — pound Rusted Stakes flat, smash Cracked Boulders & Pots, and shatter Ice/Wood Armor!"
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

    const hasRelic = (r: RelicId): boolean =>
      Boolean(hero.equippedRelics && hero.equippedRelics.includes(r));

    // Update Active Alchemical Elixir Timer & Sovereign Aegis Tonic HP Regeneration
    if ((hero.activeElixirTimer ?? 0) > 0) {
      hero.activeElixirTimer = Math.max(0, (hero.activeElixirTimer ?? 0) - dt);
      if (hero.activeElixir === "aegis_tonic") {
        hero.elixirRegenTimer = (hero.elixirRegenTimer ?? 6.0) - dt;
        if (hero.elixirRegenTimer <= 0) {
          hero.elixirRegenTimer = 6.0;
          if (hero.hp < hero.maxHp) {
            hero.hp = Math.min(hero.maxHp, hero.hp + 1);
          }
        }
      }
      if (hero.activeElixirTimer <= 0) {
        hero.activeElixir = "none";
      }
    } else {
      hero.activeElixir = "none";
    }

    const activeElixir: ElixirId = hero.activeElixir ?? "none";
    const activeWeather: WeatherId = flags.activeWeather ?? "clear";
    const hasHomesteadWing = (w: HomesteadWingId): boolean =>
      Boolean(hero.homesteadWings && hero.homesteadWings.includes(w));

    // Passive Greenhouse Herb Cultivation (`herb_greenhouse` wing grows +1 random Biome Herb every 25s!)
    if (hasHomesteadWing("herb_greenhouse")) {
      hero.greenhouseTimer = (hero.greenhouseTimer ?? 25.0) - dt;
      if (hero.greenhouseTimer <= 0) {
        hero.greenhouseTimer = 25.0;
        const allHerbs: HerbId[] = [
          "sun_lotus",
          "frost_cap",
          "ember_root",
          "starlight_dew",
        ];
        const grown = allHerbs[Math.floor(Math.random() * allHerbs.length)];
        hero.herbs = {
          sun_lotus: 0,
          frost_cap: 0,
          ember_root: 0,
          starlight_dew: 0,
          ...(hero.herbs ?? {}),
        };
        hero.herbs[grown] = (hero.herbs[grown] ?? 0) + 1;
      }
    }

    // Passive Magic Power regeneration (2.5 MP/s base, 5.0 MP/s with Archmage's Ley-Crystal, +15.0 MP/s with Archmage Ley-Font Elixir, +8.0 MP/s during Starfall!)
    const mpRegenRate =
      (hasRelic("arcane_conduit") ? 5.0 : 2.5) +
      (activeElixir === "archmage_elixir" ? 15.0 : 0) +
      (activeWeather === "starfall" ? 8.0 : 0);
    hero.maxMp = hero.maxMp || 100;
    hero.mp = Math.min(hero.maxMp, (hero.mp ?? 100) + dt * mpRegenRate);
    hero.maxBombs = hero.maxBombs ?? 0;
    hero.bombs = hero.bombs ?? 0;

    // Tunic, Relic, Steed, Elixir & Blizzard damage multiplier:
    const getTunicDamageMultiplier = (): number => {
      const baseMult =
        hero.equippedTunic === "red_mail"
          ? 0.25
          : hero.equippedTunic === "blue_mail"
          ? 0.5
          : 1.0;
      const relicMult = hasRelic("aegis_ankh") ? baseMult * 0.75 : baseMult;
      const steedMult = hero.mountedSteed === "war_drake" ? relicMult * 0.7 : relicMult;
      const elixirMult = activeElixir === "aegis_tonic" ? steedMult * 0.6 : steedMult;
      return activeWeather === "blizzard" ? elixirMult * 0.75 : elixirMult;
    };

    // Helper: check if hero died and auto-revive with Bottled Fairy OR Immortal Phoenix Ankh (`aegis_ankh`)!
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
      } else if (hasRelic("aegis_ankh")) {
        // Immortal Phoenix Ankh triggers Phoenix Rebirth (100% HP + 100% MP + 2.5s Invulnerability) and shatters!
        hero.equippedRelics = (hero.equippedRelics ?? []).filter((r) => r !== "aegis_ankh");
        hero.unlockedRelics = (hero.unlockedRelics ?? []).filter((r) => r !== "aegis_ankh");
        hero.hp = hero.maxHp;
        hero.mp = hero.maxMp;
        hero.damageFractionAcc = 0;
        hero.invulnerableTimer = 2.5;
        soundEngine.playFairyRevive();
        soundEngine.playVictoryFanfare();
        pushBanner(
          "🔥 Immortal Phoenix Ankh Triggered Rebirth! (100% HP & MP!)",
          "Your Phoenix Ankh shattered in a blaze of golden light to restore your life and grant 2.5s Invulnerability!",
          5.5
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

    const lightningArcs: LightningArcState[] = (state.lightningArcs ?? [])
      .map((arc) => ({ ...arc, timer: arc.timer - dt }))
      .filter((arc) => arc.timer > 0);
    const enemies: EnemyState[] = state.enemies.map((e) => ({ ...e }));

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

      const companionBlockBonus = hero.activeCompanion === "frost_owl" ? 1 : 0;
      const shieldPower = Math.max(1, (hero.shieldBlock ?? 1) + companionBlockBonus);
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

        // Tempest Thorns Sigil (`thunder_sigil`): Blocking an attack zaps up to 3 nearby foes within 4.5m with Chain Lightning!
        if (hasRelic("thunder_sigil")) {
          let zapped = 0;
          for (const e of enemies) {
            if (zapped >= 3) break;
            if (
              e.zone !== zone ||
              e.state === "dead" ||
              (e.kind === "burrower" && e.burrowed) ||
              e.kind === "boss"
            ) {
              continue;
            }
            if (Math.hypot(e.x - hero.x, e.z - hero.z) <= 4.5) {
              zapped++;
              e.provoked = true;
              e.hp -= 2;
              e.hitFlashTimer = 0.28;
              e.stunTimer = Math.max(e.stunTimer, 1.2);
              if (e.kind !== "turret") {
                e.state = "stunned";
                e.stateTimer = Math.max(e.stateTimer, 1.2);
              }
              lightningArcs.push({
                id: `thorns-arc-${e.id}-${stats.elapsedSeconds.toFixed(3)}`,
                zone,
                x1: hero.x,
                z1: hero.z,
                x2: e.x,
                z2: e.z,
                timer: 0.28,
                maxTimer: 0.28,
              });
              if (e.hp <= 0) {
                e.hp = 0;
                e.state = "dead";
                stats.enemiesDefeated += 1;
                hero.monsterCores = (hero.monsterCores ?? 0) + 1;
                soundEngine.playEnemyDefeat();
              }
            }
          }
          if (zapped > 0) {
            soundEngine.playElectricShock();
          }
        }

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

    // 1. Update Hero Timers, Charged Spin Attack, Shield Block, Boomerang, Hookshot, War-Hammer, Bow, Flame Rod & Shovel
    hero.attackTimer = Math.max(0, hero.attackTimer - dt);
    hero.spinAttackTimer = Math.max(0, (hero.spinAttackTimer ?? 0) - dt);
    hero.attackCooldown = Math.max(0, hero.attackCooldown - dt);
    hero.boomerangCooldown = Math.max(0, (hero.boomerangCooldown ?? 0) - dt);
    hero.hookshotCooldown = Math.max(0, (hero.hookshotCooldown ?? 0) - dt);
    hero.hammerCooldown = Math.max(0, (hero.hammerCooldown ?? 0) - dt);
    hero.hammerAnimTimer = Math.max(0, (hero.hammerAnimTimer ?? 0) - dt);
    hero.bowCooldown = Math.max(0, hero.bowCooldown - dt);
    hero.fireRodCooldown = Math.max(0, (hero.fireRodCooldown ?? 0) - dt);
    hero.bowAnimTimer = Math.max(0, (hero.bowAnimTimer ?? 0) - dt);
    hero.throwAnimTimer = Math.max(0, (hero.throwAnimTimer ?? 0) - dt);
    hero.digAnimTimer = Math.max(0, (hero.digAnimTimer ?? 0) - dt);
    hero.weaponLockTimer = Math.max(0, (hero.weaponLockTimer ?? 0) - dt);
    hero.portalCooldown = Math.max(0, hero.portalCooldown - dt);
    hero.invulnerableTimer = Math.max(0, hero.invulnerableTimer - dt);
    hero.hurtFlashTimer = Math.max(0, (hero.hurtFlashTimer ?? 0) - dt);
    hero.chillTimer = Math.max(0, (hero.chillTimer ?? 0) - dt);
    hero.knockbackLockTimer = Math.max(0, (hero.knockbackLockTimer ?? 0) - dt);
    hero.dashTimer = Math.max(0, (hero.dashTimer ?? 0) - dt);
    hero.dashCooldown = Math.max(0, (hero.dashCooldown ?? 0) - dt);
    if ((hero.comboTimer ?? 0) > 0) {
      hero.comboTimer = Math.max(0, (hero.comboTimer ?? 0) - dt);
      if (hero.comboTimer <= 0) {
        hero.comboCount = 0;
      }
    }
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
          carryingSolarKey: state.boomerang.carryingSolarKey ?? false,
        }
      : null;
    let hookshot: HookshotState | null = state.hookshot
      ? {
          ...state.hookshot,
          carriedRupeeIds: [...(state.hookshot.carriedRupeeIds ?? [])],
          carryingKey: state.hookshot.carryingKey ?? false,
          carryingDgSmallKey: state.hookshot.carryingDgSmallKey ?? false,
          carryingGlacialKey: state.hookshot.carryingGlacialKey ?? false,
          carryingSolarKey: state.hookshot.carryingSolarKey ?? false,
        }
      : null;
    const hammerShockwaves: HammerShockwaveState[] = (state.hammerShockwaves ?? [])
      .map((sw) => ({ ...sw, timer: sw.timer - dt }))
      .filter((sw) => sw.timer > 0);
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
        if (targetZone === "desert" && !flags.desertCrystalPuzzleSolved) {
          flags.desertCrystalPuzzleSolved = true;
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `crystal-ds-reward-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "desert",
              x: 14.5,
              z: 6.0,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `crystal-ds-reward-2-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "desert",
              x: 16.0,
              z: 6.0,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Sun Temple Crystal Switch Activated! (East Sun Temple Open!)",
            "Cross the oasis bridge into the East Sun Temple and challenge Skorpius, the Sunscorched Dune-Colossus, for the Solar Crest Key!",
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

    // Helper: Pierce Cyclops Eye Statues (`eye_statue`) with an Arrow in Dungeon Room 4, Map 4 Caverns, Map 5 Citadel, or Map 7 Caldera!
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
        } else if (eyeProp.zone === "caldera" && !flags.calderaEyeStatuesSolved) {
          flags.calderaEyeStatuesSolved = true;
          flags.calderaGateUnlocked = true;
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playGateUnlock();
          soundEngine.playSecretSolve();
          pushBanner(
            "Both Caldera Eye Statues Pierced! (Dragon's Peak Unsealed!)",
            "The Dragon's Peak Sanctum Gate dropped — step North to challenge Pyrax, the Skyward Dragon-Titan!",
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
        const isSapperBomb = picked.id.startsWith("sapper-bomb-");
        hero.heldObject = {
          kind: "bomb",
          fuseTimer: isSapperBomb ? Math.max(picked.fuseTimer, 1.65) : picked.fuseTimer,
          maxFuseTimer: picked.maxFuseTimer,
        };
        hero.isBlocking = false;
        hero.weaponLockTimer = 0.22;
        soundEngine.playLift();
        if (isSapperBomb) {
          pushBanner(
            "Caught the Sapper Gremlin's Live Bomb!",
            "Press [F / B / Space] to hurl it right back at monsters or cracked boulders!",
            3.2
          );
        }
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
        const isSapperBomb = picked.id.startsWith("sapper-bomb-");
        hero.heldObject = {
          kind: "bomb",
          fuseTimer: isSapperBomb ? Math.max(picked.fuseTimer, 1.65) : picked.fuseTimer,
          maxFuseTimer: picked.maxFuseTimer,
        };
        hero.isBlocking = false;
        hero.weaponLockTimer = 0.20;
        soundEngine.playLift();
        if (isSapperBomb) {
          pushBanner(
            "Caught the Sapper Gremlin's Live Bomb!",
            "Press [F / B / Space] to hurl it right back at monsters or cracked boulders!",
            3.2
          );
        }
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
    const chargeSpeedMult = hasRelic("berserker_torc") ? 1.35 : 1.0;
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
      hero.swordChargeTimer = Math.min(1.6, prevCharge + dt * chargeSpeedMult);
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
      hero.fireRodChargeTimer = Math.min(1.6, prevFire + dt * chargeSpeedMult);
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
      const mpCost =
        activeElixir === "archmage_elixir"
          ? 0
          : hasRelic("arcane_conduit")
          ? isCharged
            ? 10
            : 5
          : isCharged
          ? 16
          : 8;
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
      hero.digAnimTimer <= 0 &&
      (hero.hammerAnimTimer ?? 0) <= 0;
    let hammerSlamImpactPos: { x: number; z: number } | null = null;

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
        // Check if digging near a burrowed Subterranean Tunnel Wyrm (`burrower`) -> unearths & stuns it for 3.5s!
        let unearthedWyrm = false;
        for (const enemy of enemies) {
          if (
            enemy.zone === zone &&
            enemy.kind === "burrower" &&
            enemy.state !== "dead" &&
            enemy.burrowed &&
            (Math.hypot(enemy.x - digX, enemy.z - digZ) <= 2.95 ||
              Math.hypot(enemy.x - hero.x, enemy.z - hero.z) <= 2.95)
          ) {
            unearthedWyrm = true;
            enemy.burrowed = false;
            enemy.provoked = true;
            enemy.stunTimer = 3.5;
            enemy.state = "stunned";
            enemy.stateTimer = 3.5;
            enemy.hitFlashTimer = 0.35;
            enemy.hp -= 1;
            bushBursts.push({
              id: `wyrm-unearth-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: enemy.x,
              z: enemy.z,
              timer: 0.9,
              maxTimer: 0.9,
              seed: Math.floor(Math.abs(enemy.x * 59 + enemy.z * 97) + stats.elapsedSeconds * 130),
              isDirt: true,
            });
            if (enemy.hp <= 0) {
              enemy.hp = 1; // Let the player finish it off above ground or kill if already at 1
            }
          }
        }
        if (unearthedWyrm) {
          soundEngine.playShovelDig(true);
          soundEngine.playBossWallCrash();
          pushBanner(
            "Shovel Unearthed the Tunnel Wyrm! (Stunned for 3.5s!)",
            "You dug the Subterranean Wyrm right out of the earth — slash it with your Sword [Space] while stunned!",
            4.2
          );
        } else {
          soundEngine.playShovelDig(false);
        }
      }
    } else if (
      canUseWeapon &&
      input.hammerPressed &&
      (hero.hammerCooldown ?? 0) <= 0
    ) {
      // Trigger Titan War-Hammer Overhead Slam + Radial Seismic Shockwave (T or 8)
      if (!hero.hasHammer) {
        soundEngine.playGateLocked();
        pushBanner(
          "No Titan War-Hammer Equipped!",
          "Claim the Titan War-Hammer in the SW Glacial Forge of Map 4 (Frostpeak Caverns) or buy it at Bramble's Shop!",
          3.2
        );
        hero.hammerCooldown = 0.4;
      } else {
        hero.isBlocking = false;
        hero.hammerAnimTimer = 0.42;
        hero.weaponLockTimer = 0.42;
        hero.hammerCooldown = 0.72;
        const slamX = hero.x + Math.sin(hero.facing) * 1.3;
        const slamZ = hero.z + Math.cos(hero.facing) * 1.3;
        const hRune = hero.hammerRuneTier ?? 0;
        const swRadius = hRune === 2 ? 6.2 : hRune === 1 ? 5.0 : 3.8;
        hammerSlamImpactPos = { x: slamX, z: slamZ };
        soundEngine.playHammerSlam();
        hammerShockwaves.push({
          id: `hammer-sw-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
          zone,
          x: slamX,
          z: slamZ,
          timer: 0.48,
          maxTimer: 0.48,
          maxRadius: swRadius,
        });
        if (hRune === 2) {
          // Tier 2 Hammer Rune: Erupts 4 radial Elemental Seekers in a cross pattern!
          [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((ang, idx) => {
            fireballs.push({
              id: `hammer-fb-${idx}-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
              zone,
              x: slamX + Math.sin(ang) * 0.5,
              z: slamZ + Math.cos(ang) * 0.5,
              angle: ang,
              speed: 11.5,
              damage: 2,
              radius: 0.52,
              isCharged: false,
              lifeTimer: 0.95,
            });
          });
        }
        bushBursts.push({
          id: `hammer-burst-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
          zone,
          x: slamX,
          z: slamZ,
          timer: 0.75,
          maxTimer: 0.75,
          seed: Math.floor(Math.abs(slamX * 67 + slamZ * 103) + stats.elapsedSeconds * 140),
          isRock: true,
        });
      }
    } else if (
      canUseWeapon &&
      input.hookshotPressed &&
      !hookshot &&
      (hero.hookshotCooldown ?? 0) <= 0
    ) {
      // Trigger Grappling Hookshot (H or 7)
      if (!hero.hasHookshot) {
        pushBanner(
          "No Grappling Hookshot Equipped!",
          "Claim the Grappling Hookshot in the NW Cliffside Reliquary of Map 3 (Elderwood Highlands) or buy it at Bramble's Shop!",
          3.0
        );
        hero.hookshotCooldown = 0.4;
      } else {
        hero.isBlocking = false;
        hero.throwAnimTimer = 0.26;
        hero.weaponLockTimer = 0.28;
        hero.hookshotCooldown = 0.45;
        soundEngine.playHookshotShoot();
        hookshot = {
          zone,
          x: hero.x + Math.sin(hero.facing) * 0.9,
          z: hero.z + Math.cos(hero.facing) * 0.9,
          dirX: Math.sin(hero.facing),
          dirZ: Math.cos(hero.facing),
          distanceTraveled: 0,
          state: "extending",
          targetX: hero.x,
          targetZ: hero.z,
          carriedRupeeIds: [],
          carryingKey: false,
          carryingDgSmallKey: false,
          carryingGlacialKey: false,
          carryingSolarKey: false,
        };
      }
    } else if (
      canUseWeapon &&
      input.boomerangPressed &&
      hero.hasBoomerang &&
      !boomerang &&
      hero.boomerangCooldown <= 0
    ) {
      // Trigger Boomerang Throw (Q or 1) — 2.0 second cooldown prevents close-range spam (1.0s with Zephyr Gale Nectar)!
      hero.isBlocking = false;
      hero.throwAnimTimer = 0.28;
      hero.weaponLockTimer = 0.34;
      hero.boomerangCooldown = activeElixir === "gale_nectar" ? 1.0 : 2.0;
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
        carryingSolarKey: false,
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
        const bRune = hero.bowRuneTier ?? 0;
        const spreadAngles = bRune >= 1 ? [-0.18, 0, 0.18] : [0];
        const arrowDmg =
          (bRune === 2 ? 3 : 2) +
          (activeWeather === "blizzard" ? 1 : 0) +
          (hasHomesteadWing("trophy_vault") ? 1 : 0);
        spreadAngles.forEach((offsetAngle, idx) => {
          const shotAngle = hero.facing + offsetAngle;
          arrows.push({
            id: `hero-arrow-${idx}-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            zone,
            fromHero: true,
            x: hero.x + Math.sin(shotAngle) * 0.95,
            z: hero.z + Math.cos(shotAngle) * 0.95,
            angle: shotAngle,
            speed: bRune === 2 ? 24.0 : 21.0,
            damage: arrowDmg,
            lifeTimer: 1.5,
            isPiercing: bRune === 2,
            hitEnemyIds: [],
          });
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
      hero.digAnimTimer > 0 ||
      (hero.hammerAnimTimer ?? 0) > 0 ||
      Boolean(hookshot);

    // Right-click Shield Block (disabled while holding a pot/rock/bomb overhead)
    hero.isBlocking =
      input.blockHeld &&
      !hero.heldObject &&
      !isUsingAnyWeapon &&
      (hero.dashTimer ?? 0) <= 0 &&
      hero.knockbackLockTimer <= 0;

    // Tactical Dash-Evade Roll (Press X or Alt): 0.22s speed burst + 0.28s invulnerability frames!
    if (
      input.dashPressed &&
      (hero.dashCooldown ?? 0) <= 0 &&
      (hero.dashTimer ?? 0) <= 0 &&
      !hero.heldObject &&
      hero.knockbackLockTimer <= 0 &&
      !state.shopOpen &&
      !state.characterOpen &&
      !state.sanctuaryOpen
    ) {
      hero.dashTimer = 0.22;
      const baseDashCd = hasRelic("wind_feather") ? 0.58 : 0.9;
      hero.dashCooldown = activeElixir === "gale_nectar" ? baseDashCd * 0.5 : baseDashCd;
      hero.invulnerableTimer = Math.max(hero.invulnerableTimer, 0.28);
      hero.isBlocking = false;
      if (Math.hypot(input.moveX, input.moveZ) > 0.05) {
        hero.facing = Math.atan2(input.moveX, input.moveZ);
      }
      soundEngine.playSwordSwing();
    }

    // 2. Hero Movement + Boots / Relic / Companion / Dash Speed Multiplier + Knockback + Hookshot Grapple Pull + Pushable Block Puzzles
    const isKnockbackLocked = hero.knockbackLockTimer > 0;
    const isDashing = (hero.dashTimer ?? 0) > 0;
    let mx = isKnockbackLocked ? 0 : isDashing ? Math.sin(hero.facing) : input.moveX;
    let mz = isKnockbackLocked ? 0 : isDashing ? Math.cos(hero.facing) : input.moveZ;
    const mag = Math.hypot(mx, mz);
    const chillMultiplier = (hero.chillTimer ?? 0) > 0 ? 0.68 : 1.0;
    const relicSpeedMult = hasRelic("wind_feather") ? 1.18 : 1.0;
    const companionSpeedMult = hero.activeCompanion === "storm_wolf" ? 1.15 : 1.0;
    const mountSpeedMult =
      hero.mountedSteed === "sun_courser"
        ? 1.65
        : hero.mountedSteed === "frost_stag"
        ? 1.55
        : hero.mountedSteed === "war_drake"
        ? 1.5
        : 1.0;
    const dashSpeedMult = isDashing ? 2.25 : 1.0;
    const elixirSpeedMult = activeElixir === "gale_nectar" ? 1.3 : 1.0;
    const bootsMultiplier =
      (hero.equippedBoots === "swift_boots"
        ? 1.25
        : hero.equippedBoots === "titan_greaves"
        ? 1.12
        : 1.0) *
      chillMultiplier *
      relicSpeedMult *
      companionSpeedMult *
      mountSpeedMult *
      elixirSpeedMult *
      dashSpeedMult;

    const initialGatePassable =
      zone === "overworld"
        ? Boolean(flags.dungeonEntryUnlocked || flags.keyPickedUp || hero.hasDungeonKey)
        : zone === "frontier"
        ? Boolean(flags.frontierCitadelGateUnlocked || flags.hasGlacialKey || flags.cavernCrestKeyPickedUp)
        : zone === "citadel"
        ? Boolean(flags.citadelGateUnlocked && (!flags.citadelBossAwakened || flags.citadelBossDefeated))
        : zone === "desert"
        ? Boolean(flags.desertCalderaGateUnlocked || flags.hasSolarKey || flags.desertSolarKeyPickedUp)
        : zone === "caldera"
        ? Boolean(flags.calderaGateUnlocked && (!flags.calderaBossAwakened || flags.calderaBossDefeated))
        : Boolean(flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated));
    const initialBossExitOpen =
      zone === "caldera"
        ? Boolean(flags.calderaBossDefeated)
        : zone === "citadel"
        ? Boolean(flags.citadelBossDefeated)
        : Boolean(flags.bossDefeated);

    if (hookshot && hookshot.zone === zone && hookshot.state === "pulling_hero") {
      const toTx = hookshot.targetX - hero.x;
      const toTz = hookshot.targetZ - hero.z;
      const distToTarget = Math.hypot(toTx, toTz);
      const pullSpeed = 24.0;
      const pullStep = pullSpeed * dt;
      hero.knockbackVx = 0;
      hero.knockbackVz = 0;

      if (distToTarget <= Math.max(0.45, pullStep)) {
        const resolvedLand = resolveWorldCollisions(
          hookshot.targetX,
          hookshot.targetZ,
          0.68,
          zone,
          initialGatePassable,
          dynamicObstacles,
          initialBossExitOpen,
          true
        );
        hero.x = resolvedLand.x;
        hero.z = resolvedLand.z;
        hookshot = null;
      } else {
        const pullDirX = toTx / distToTarget;
        const pullDirZ = toTz / distToTarget;
        hero.facing = Math.atan2(pullDirX, pullDirZ);
        const nextPullX = hero.x + pullDirX * pullStep;
        const nextPullZ = hero.z + pullDirZ * pullStep;
        const resolvedPull = resolveWorldCollisions(
          nextPullX,
          nextPullZ,
          0.68,
          zone,
          initialGatePassable,
          dynamicObstacles,
          initialBossExitOpen,
          true
        );
        hero.x = resolvedPull.x;
        hero.z = resolvedPull.z;
        if (resolvedPull.hitObstacle) {
          hookshot = null;
        }
      }
    } else {
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

      const clampedNextHeroZ =
        (zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated) ||
        (zone === "citadel" && flags.citadelBossAwakened && !flags.citadelBossDefeated) ||
        (zone === "caldera" && flags.calderaBossAwakened && !flags.calderaBossDefeated)
          ? Math.max(13.55, nextHeroZ)
          : nextHeroZ;
      const mountIgnoresWater =
        hero.mountedSteed === "frost_stag" || hero.mountedSteed === "war_drake";
      const resolvedHero = resolveWorldCollisions(
        nextHeroX,
        clampedNextHeroZ,
        0.72,
        zone,
        initialGatePassable,
        dynamicObstacles,
        initialBossExitOpen,
        mountIgnoresWater
      );
      if (isKnockbackLocked && resolvedHero.hitObstacle) {
        hero.knockbackVx *= 0.45;
        hero.knockbackVz *= 0.45;
      }
      hero.x = resolvedHero.x;
      hero.z =
        (zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated) ||
        (zone === "citadel" && flags.citadelBossAwakened && !flags.citadelBossDefeated) ||
        (zone === "caldera" && flags.calderaBossAwakened && !flags.calderaBossDefeated)
          ? Math.max(13.55, resolvedHero.z)
          : resolvedHero.z;
    }

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
                zone: mp.zone,
                x: mp.x,
                z: mp.z + 1.9,
                tier: "red",
                value: 20,
                collected: false,
                spawnBounceTimer: 0.45,
              },
              {
                id: `push-reward-fr-2-${stats.elapsedSeconds.toFixed(2)}`,
                zone: mp.zone,
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
          if (
            portal.id === "portal-ds-caldera" &&
            !flags.desertCalderaGateUnlocked &&
            !flags.hasSolarKey &&
            !flags.desertSolarKeyPickedUp
          ) {
            if (gateNoticeCooldown <= 0) {
              gateNoticeCooldown = 3.2;
              soundEngine.playGateLocked();
              pushBanner(
                "The East Sun-Gate is Sealed by Solar Runes!",
                "Vanquish Skorpius in the East Sun Temple to claim the Solar Crest Key first!",
                4.2
              );
            }
            continue;
          }
          if (portal.id === "portal-ca-overworld-victory" && !flags.calderaBossDefeated) {
            if (gateNoticeCooldown <= 0) {
              gateNoticeCooldown = 3.2;
              soundEngine.playGateLocked();
              pushBanner(
                "The Dragon's Peak Return Portal is Sealed!",
                "Vanquish Pyrax, the Skyward Dragon-Titan, to unseal the Golden Return Portal!",
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
          hookshot = null;
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
    // - NW Cliffside Grapple Reliquary Chest (`FRONTIER_HOOKSHOT_CHEST_POS = -24.5, 22.0`)
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

      // NW Cliffside Grapple Reliquary Chest (`FRONTIER_HOOKSHOT_CHEST_POS = -24.5, 22.0`)
      if (!flags.frontierHookshotChestOpened) {
        const distToHookshotChest = Math.hypot(
          hero.x - FRONTIER_HOOKSHOT_CHEST_POS.x,
          hero.z - FRONTIER_HOOKSHOT_CHEST_POS.z
        );
        const reliquaryGuard = enemies.find(
          (e) => e.id === "fr-hookshot-guard" && e.state !== "dead"
        );
        if (distToHookshotChest < 2.65) {
          if (!reliquaryGuard) {
            flags.frontierHookshotChestOpened = true;
            hero.hasHookshot = true;
            hero.rupees += 20;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired the Grappling Hookshot! (+20 Rupees!)",
              "Press H [or 7] to grapple to Anchor Posts, Trees, Crates & Torches across chasms, rip off Wooden Shields, or snag distant Treasure!",
              6.8
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Grapple Reliquary Chest is Guarded!",
              "Defeat the Wooden-Shielded Reliquary Guard in the NW Cliffside Alcove to claim the Grappling Hookshot!",
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
    // - SW Glacial Forge Chest (`CAVERN_HAMMER_CHEST_POS = -24.5, -18.5`): Unlocks Titan War-Hammer (`T / 8`)!
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

      if (!flags.cavernHammerChestOpened) {
        const distToHammerChest = Math.hypot(
          hero.x - CAVERN_HAMMER_CHEST_POS.x,
          hero.z - CAVERN_HAMMER_CHEST_POS.z
        );
        const hammerGuard = enemies.find(
          (e) => e.id === "cv-hammer-guard" && e.state !== "dead"
        );
        if (distToHammerChest < 2.65) {
          if (!hammerGuard) {
            flags.cavernHammerChestOpened = true;
            hero.hasHammer = true;
            hero.rupees += 20;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired the Titan War-Hammer [T / 8]! (+20 Rupees!)",
              "Press T [or 8] to slam the earth — pound Rusted Iron Stakes flat, smash Cracked Boulders & Pots, and shatter Ice/Wood Armor in one blow!",
              7.0
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Glacial Forge Chest is Guarded!",
              "Melt the SW Forge Sentinel's Ice Armor with your Flame Rod [R / 3] and defeat him to claim the Titan War-Hammer!",
              4.4
            );
          }
        }
      }

      if (
        !flags.cavernBossAwakened &&
        !flags.cavernBossDefeated &&
        hero.x > 13.5 &&
        hero.z > 5.5
      ) {
        flags.cavernBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        soundEngine.playBossRoar();
        pushBanner(
          "Cryos, the Glacial Colossus Awakens!",
          "Phase 1: Crack his Permafrost Shell with a Bomb [B] or Flame Rod [R] • Phase 2: Pierce Open Eye [E / Q] • Phase 3: Slash with Sword [Space]!",
          6.5
        );
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
          Boolean(
            flags.cavernEyeSolved ||
              flags.cavernWardensCleared ||
              flags.cavernBossDefeated
          ) || remainingWardens.length === 0;
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
              `Defeat Cryos & the ${remainingWardens.length} Frost Warden${remainingWardens.length === 1 ? "" : "s"} [B / R] OR shoot the North Cyclops Eye Statue with your Bow [E / 2]!`,
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
              "Step East across the Magma Bridge into Map 7: Skyward Caldera, or take the North Golden Return Portal!",
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

    // 4h. Map 6 (`desert` — Sunscorched Oasis & Shifting Sands):
    // - SW Mirage Reliquary Chest (`DESERT_OASIS_CHEST_POS = -23.5, -21.0`): Unlocks Swiftwind Pegasus Boots (`swift_boots`), Bottled Blue Elixir (`blue_potion`), & +75 Rupees!
    // - East Sun Temple (`x > 13.5 && z > 5.5`): Awakens Skorpius, the Sunscorched Dune-Colossus (`ds-boss`)!
    // - East Sun Pedestal (`DESERT_SOLAR_KEY_POS = 22.0, 10.5`): Unlocks the Solar Crest Key (`hasSolarKey`) once Skorpius / Desert Wardens are vanquished!
    // - East Sun-Gate (`DESERT_CALDERA_GATE_POS = 31.8, 0`): Unlocks the East Canyon Pass into Map 7 (`caldera`)!
    if (zone === "desert") {
      if (!flags.desertOasisChestOpened) {
        const distToOasisChest = Math.hypot(
          hero.x - DESERT_OASIS_CHEST_POS.x,
          hero.z - DESERT_OASIS_CHEST_POS.z
        );
        const oasisWyrm = enemies.find(
          (e) => e.id === "ds-oasis-wyrm" && e.state !== "dead"
        );
        if (distToOasisChest < 2.65) {
          if (!oasisWyrm) {
            flags.desertOasisChestOpened = true;
            if (!hero.unlockedBoots.includes("swift_boots")) {
              hero.unlockedBoots = [...hero.unlockedBoots, "swift_boots"];
            }
            hero.equippedBoots = "swift_boots";
            const emptyBottleIdx = hero.bottles.findIndex((b) => b === "empty");
            if (emptyBottleIdx !== -1) {
              hero.bottles[emptyBottleIdx] = "blue_potion";
            } else if (hero.bottles.length < 6) {
              hero.bottles = [...hero.bottles, "blue_potion"];
            }
            hero.rupees += 75;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired Swiftwind Pegasus Boots (+25% Speed), Blue Elixir & +75 Rupees!",
              "You now sprint 25% faster and carry a Bottled Blue Elixir! Hit the Crystal Switch (12.5, 6) to enter the East Sun Temple!",
              7.0
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Mirage Reliquary Chest is Guarded!",
              "Unearth and defeat the SW Oasis Sand Wyrm [G / T / B] to unseal the Mirage Reliquary Chest!",
              4.2
            );
          }
        }
      }

      if (
        !flags.desertBossAwakened &&
        !flags.desertBossDefeated &&
        hero.x > 13.5 &&
        hero.z > 5.5
      ) {
        flags.desertBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        soundEngine.playBossRoar();
        pushBanner(
          "Skorpius, the Sunscorched Dune-Colossus Awakens!",
          "Phase 1: Crack his Chitin Shell [R / B / T] • Phase 2: Pierce Open Eye [E / Q / H] • Phase 3: Slash with Sword [Space]!",
          6.5
        );
      }

      if (!flags.desertSolarKeyPickedUp) {
        const distToSolarKey = Math.hypot(
          hero.x - DESERT_SOLAR_KEY_POS.x,
          hero.z - DESERT_SOLAR_KEY_POS.z
        );
        const remainingDesertWardens = enemies.filter(
          (e) => e.questGroup === "desert_wardens" && e.state !== "dead"
        );
        const canClaimSolarKey =
          Boolean(flags.desertWardensCleared || flags.desertBossDefeated) ||
          remainingDesertWardens.length === 0;
        if (distToSolarKey < 2.25) {
          if (canClaimSolarKey) {
            flags.desertSolarKeyPickedUp = true;
            flags.hasSolarKey = true;
            hero.hasDungeonKey = true;
            soundEngine.playVictoryFanfare();
            soundEngine.playKeyPickup();
            pushBanner(
              "Acquired the Solar Crest Key!",
              "Head to the East Sun-Gate (31.8, 0) to unlock the East Canyon Pass into Map 7: Skyward Caldera!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Solar Crest Key Pedestal is Sealed!",
              "Vanquish Skorpius, the Sunscorched Dune-Colossus, in the East Sun Temple to unseal the Solar Crest Key!",
              4.5
            );
          }
        }
      }

      if (!flags.desertCalderaGateUnlocked) {
        const distToCalderaGate = Math.hypot(
          hero.x - DESERT_CALDERA_GATE_POS.x,
          hero.z - DESERT_CALDERA_GATE_POS.z
        );
        if (distToCalderaGate < 3.5) {
          if (flags.hasSolarKey || flags.desertSolarKeyPickedUp) {
            flags.desertCalderaGateUnlocked = true;
            flags.hasSolarKey = false;
            dynamicObstacles = getActiveObstacles(mapProps);
            soundEngine.playGateUnlock();
            pushBanner(
              "East Sun-Gate Unlocked! (Map 7: Skyward Caldera)",
              "The Solar Crest Key unsealed the volcanic pass — step East into Map 7: Skyward Caldera & Dragon's Peak!",
              5.8
            );
          } else if (gateNoticeCooldown <= 0) {
            gateNoticeCooldown = 3.2;
            soundEngine.playGateLocked();
            pushBanner(
              "East Sun-Gate Sealed! (Requires Solar Crest Key)",
              "Hit the Crystal Switch (12.5, 6), cross into the East Sun Temple, and defeat Skorpius to win the Solar Crest Key!",
              5.0
            );
          }
        }
      }
    }

    // 4i. Map 7 (`caldera` — Skyward Caldera & Dragon's Peak):
    // - NW Dragon Forge Chest (`CALDERA_FORGE_CHEST_POS = -22.5, 20.0`): Unlocks Crimson Dragon Mail (-75% DMG), Titan Iron Greaves, & +100 Rupees!
    // - North Dragon's Peak Sanctum Gate (`CALDERA_BOSS_GATE_POS = 0, 12.0`): Unlocked by pounding 2 Seal Stakes [T], piercing 2 Eye Statues [E], OR lighting 2 Braziers [R]!
    // - Dragon's Peak Sanctum (`z > 13.05`): Awakens Pyrax, the Skyward Dragon-Titan (`ca-boss`)!
    // - Dragon's Peak Victory Chest (`CALDERA_VICTORY_CHEST_POS = -6.5, 32.0`): Awards +1 Heart Container & +300 Rupees!
    if (zone === "caldera") {
      if (!flags.calderaForgeChestOpened) {
        const distToForgeChest = Math.hypot(
          hero.x - CALDERA_FORGE_CHEST_POS.x,
          hero.z - CALDERA_FORGE_CHEST_POS.z
        );
        const forgeKnight = enemies.find(
          (e) => e.id === "ca-forge-knight" && e.state !== "dead"
        );
        if (distToForgeChest < 2.65) {
          if (!forgeKnight) {
            flags.calderaForgeChestOpened = true;
            if (!hero.unlockedTunics.includes("red_mail")) {
              hero.unlockedTunics = [...hero.unlockedTunics, "red_mail"];
            }
            hero.equippedTunic = "red_mail";
            if (!hero.unlockedBoots.includes("titan_greaves")) {
              hero.unlockedBoots = [...hero.unlockedBoots, "titan_greaves"];
            }
            if (hero.equippedBoots === "leather_boots") {
              hero.equippedBoots = "titan_greaves";
            }
            hero.rupees += 100;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Acquired Crimson Dragon Mail (-75% DMG), Titan Greaves & +100 Rupees!",
              "You forged the ultimate armor in the NW Dragon Forge! Now unseal the North Dragon's Peak Gate (0, 12) to challenge Pyrax!",
              7.0
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Dragon Forge Chest is Guarded!",
              "Defeat the NW Forge Sentinel Knight to claim the Crimson Dragon Mail & Titan Greaves!",
              4.2
            );
          }
        }
      }

      if (!flags.calderaGateUnlocked) {
        const distToCalderaBossGate = Math.hypot(
          hero.x - CALDERA_BOSS_GATE_POS.x,
          hero.z - CALDERA_BOSS_GATE_POS.z
        );
        if (distToCalderaBossGate < 3.2 && gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.2;
          soundEngine.playGateLocked();
          pushBanner(
            "Dragon's Peak Sanctum Gate Sealed!",
            "Pound the 2 Rusted Seal Stakes with War-Hammer [T / 8], shoot both Eye Statues with Bow [E / 2], OR light both Seal Braziers with Flame Rod [R / 3]!",
            4.8
          );
        }
      } else if (
        flags.calderaGateUnlocked &&
        flags.calderaBossAwakened &&
        !flags.calderaBossDefeated
      ) {
        const distToCalderaBossGate = Math.hypot(
          hero.x - CALDERA_BOSS_GATE_POS.x,
          hero.z - CALDERA_BOSS_GATE_POS.z
        );
        if (distToCalderaBossGate < 2.8 && gateNoticeCooldown <= 0) {
          gateNoticeCooldown = 3.5;
          soundEngine.playGateLocked();
          pushBanner(
            "The Dragon's Peak Sanctum Door is Sealed Shut!",
            "1. Crack Pyrax's Dragon Scales [R / B / T] -> 2. Pierce Open Eye [E / Q / H] -> 3. Slash with Tempered Blade [Space]!",
            4.2
          );
        }
      }

      if (
        flags.calderaGateUnlocked &&
        !flags.calderaBossAwakened &&
        hero.z > 13.05
      ) {
        flags.calderaBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        hero.z = Math.max(13.58, hero.z);
        soundEngine.playGateLocked();
        soundEngine.playBossRoar();
        pushBanner(
          "Pyrax, the Skyward Dragon-Titan Awakens!",
          "Phase 1: Crack his Molten Dragon Scales [R / B / T] • Phase 2: Pierce Open Eye [E / Q / H] • Phase 3: Slash with Sword [Space]!",
          6.8
        );
      }

      if (!flags.calderaVictoryChestOpened) {
        const distToCalderaVictoryChest = Math.hypot(
          hero.x - CALDERA_VICTORY_CHEST_POS.x,
          hero.z - CALDERA_VICTORY_CHEST_POS.z
        );
        if (distToCalderaVictoryChest < 2.6) {
          if (flags.calderaBossDefeated) {
            flags.calderaVictoryChestOpened = true;
            hero.maxHp += 2;
            hero.hp = hero.maxHp;
            hero.mp = hero.maxMp;
            hero.damageFractionAcc = 0;
            hero.rupees += 300;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Dragon's Peak Victory Chest! (+1 Heart Container & +300 Rupees!)",
              "You conquered all 7 Realms of Zeldo! Step through the North Golden Return Portal to return to Map 1 Crossroads as Grand Champion!",
              8.0
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Dragon's Peak Victory Chest is Sealed!",
              "Vanquish Pyrax, the Skyward Dragon-Titan, and his Caldera Wyrms to unseal the grand finale chest!",
              4.0
            );
          }
        }
      }
    }

    // 4j. Maps 8, 9 & 10 (Sunken Coral Atoll, Bioluminescent Mycelial Hollow & Astral Sky-Isles):
    if (zone === "atoll") {
      if (!flags.atollPearlChestOpened) {
        const distToPearlChest = Math.hypot(
          hero.x - ATOLL_PEARL_CHEST_POS.x,
          hero.z - ATOLL_PEARL_CHEST_POS.z
        );
        const pearlGuard = enemies.find(
          (e) => e.id === "at-pearl-guard" && e.state !== "dead"
        );
        if (distToPearlChest < 2.65) {
          if (!pearlGuard) {
            flags.atollPearlChestOpened = true;
            if (!hero.unlockedTunics.includes("blue_mail")) {
              hero.unlockedTunics = [...hero.unlockedTunics, "blue_mail"];
              if (hero.equippedTunic === "green_tunic") {
                hero.equippedTunic = "blue_mail";
              }
            }
            hero.monsterCores = (hero.monsterCores ?? 0) + 2;
            hero.rupees += 100;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Sunken Pearl Reliquary! (+2 Monster Cores, Sapphire Mail & +100 Rupees!)",
              "Cross the North Coral Bridge or grapple the Anchor Posts [H] to challenge Nereus, the Abyssal Leviathan!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Sunken Pearl Reliquary is Guarded!",
              "Vanquish the SW Coral Sentinel Knight to unseal the Sunken Pearl Chest!",
              4.0
            );
          }
        }
      }

      if (
        !flags.atollBossAwakened &&
        !flags.atollBossDefeated &&
        hero.z > 12.5
      ) {
        flags.atollBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        soundEngine.playBossRoar();
        pushBanner(
          "Nereus, the Abyssal Leviathan Awakens!",
          "Phase 1: Crack his Coral Carapace [R / B / T] • Phase 2: Pierce Open Eye [E / Q / H] • Phase 3: Slash with Sword [Space]!",
          6.5
        );
      }

      if (!flags.atollVictoryChestOpened) {
        const distToAtollVictory = Math.hypot(
          hero.x - ATOLL_VICTORY_CHEST_POS.x,
          hero.z - ATOLL_VICTORY_CHEST_POS.z
        );
        if (distToAtollVictory < 2.6) {
          if (flags.atollBossDefeated) {
            flags.atollVictoryChestOpened = true;
            hero.maxHp += 2;
            hero.hp = hero.maxHp;
            hero.mp = hero.maxMp;
            hero.damageFractionAcc = 0;
            hero.monsterCores = (hero.monsterCores ?? 0) + 3;
            hero.rupees += 150;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Leviathan's Tidal Hoard! (+1 Heart Container, +3 Cores & +150 Rupees!)",
              "You conquered the Sunken Coral Atoll! Use the Warp Monolith [M] or Coastal Portals to continue your odyssey!",
              7.0
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Leviathan's Tidal Hoard is Sealed!",
              "Vanquish Nereus, the Abyssal Leviathan, in the North Lagoon Arena to unseal this chest!",
              4.0
            );
          }
        }
      }
    }

    if (zone === "hollow") {
      if (!flags.hollowSporeChestOpened) {
        const distToSporeChest = Math.hypot(
          hero.x - HOLLOW_SPORE_CHEST_POS.x,
          hero.z - HOLLOW_SPORE_CHEST_POS.z
        );
        const sporeGuard = enemies.find(
          (e) => e.id === "hl-spore-guard" && e.state !== "dead"
        );
        if (distToSporeChest < 2.65) {
          if (!sporeGuard) {
            flags.hollowSporeChestOpened = true;
            const emptyIdx = hero.bottles.findIndex((b) => b === "empty");
            if (emptyIdx !== -1) {
              hero.bottles[emptyIdx] = "fairy";
            } else if (hero.bottles.length < 6) {
              hero.bottles = [...hero.bottles, "fairy"];
            }
            hero.monsterCores = (hero.monsterCores ?? 0) + 2;
            hero.rupees += 120;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Luminous Spore Reliquary! (+2 Monster Cores, Bottled Fairy & +120 Rupees!)",
              "Head North into the Fungal Overlord's Grotto to challenge Mycelion, the Spore Behemoth!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Luminous Spore Reliquary is Guarded!",
              "Vanquish the NW Mycelial Sentinel Knight to unseal the Spore Reliquary Chest!",
              4.0
            );
          }
        }
      }

      if (
        !flags.hollowBossAwakened &&
        !flags.hollowBossDefeated &&
        hero.z > 12.5
      ) {
        flags.hollowBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        soundEngine.playBossRoar();
        pushBanner(
          "Mycelion, the Spore Behemoth Awakens!",
          "Phase 1: Burn or Crack his Fungal Cap [R / B / T] • Phase 2: Pierce Open Eye [E / Q / H] • Phase 3: Slash with Sword [Space]!",
          6.5
        );
      }

      if (!flags.hollowVictoryChestOpened) {
        const distToHollowVictory = Math.hypot(
          hero.x - HOLLOW_VICTORY_CHEST_POS.x,
          hero.z - HOLLOW_VICTORY_CHEST_POS.z
        );
        if (distToHollowVictory < 2.6) {
          if (flags.hollowBossDefeated) {
            flags.hollowVictoryChestOpened = true;
            hero.maxHp += 2;
            hero.hp = hero.maxHp;
            hero.mp = hero.maxMp;
            hero.damageFractionAcc = 0;
            hero.monsterCores = (hero.monsterCores ?? 0) + 3;
            hero.rupees += 200;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Mycelial Crown Hoard! (+1 Heart Container, +3 Cores & +200 Rupees!)",
              "You conquered the Bioluminescent Mycelial Hollow! Use the Warp Monolith [M] or Grotto Portals to explore further!",
              7.0
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Mycelial Crown Hoard is Sealed!",
              "Vanquish Mycelion, the Spore Behemoth, in the North Grotto Sanctum to unseal this chest!",
              4.0
            );
          }
        }
      }
    }

    if (zone === "sky") {
      if (!flags.skyCelestialChestOpened) {
        const distToCelestialChest = Math.hypot(
          hero.x - SKY_CELESTIAL_CHEST_POS.x,
          hero.z - SKY_CELESTIAL_CHEST_POS.z
        );
        const celestialGuard = enemies.find(
          (e) => e.id === "sk-celestial-guard" && e.state !== "dead"
        );
        if (distToCelestialChest < 2.65) {
          if (!celestialGuard) {
            flags.skyCelestialChestOpened = true;
            if (!hero.unlockedBoots.includes("swift_boots")) {
              hero.unlockedBoots = [...hero.unlockedBoots, "swift_boots"];
              hero.equippedBoots = "swift_boots";
            }
            hero.monsterCores = (hero.monsterCores ?? 0) + 3;
            hero.rupees += 150;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Celestial Reliquary! (+3 Monster Cores, Swiftwind Boots & +150 Rupees!)",
              "Ascend to the North Starlight Pantheon to challenge Astraea, the Starlight Archon!",
              6.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Celestial Reliquary Chest is Guarded!",
              "Vanquish the NW Astral Sentinel Knight to unseal the Celestial Reliquary!",
              4.0
            );
          }
        }
      }

      if (
        !flags.skyBossAwakened &&
        !flags.skyBossDefeated &&
        hero.z > 12.5
      ) {
        flags.skyBossAwakened = true;
        flags.bossState = "ARMORED";
        flags.bossArmorTimer = 0;
        soundEngine.playBossRoar();
        pushBanner(
          "Astraea, the Starlight Archon Awakens!",
          "Phase 1: Shatter her Aetherial Aegis [R / B / T] • Phase 2: Pierce Open Eye [E / Q / H] • Phase 3: Slash with Sword [Space]!",
          6.8
        );
      }

      if (!flags.skyVictoryChestOpened) {
        const distToSkyVictory = Math.hypot(
          hero.x - SKY_VICTORY_CHEST_POS.x,
          hero.z - SKY_VICTORY_CHEST_POS.z
        );
        if (distToSkyVictory < 2.6) {
          if (flags.skyBossDefeated) {
            flags.skyVictoryChestOpened = true;
            hero.maxHp += 2;
            hero.hp = hero.maxHp;
            hero.mp = hero.maxMp;
            hero.damageFractionAcc = 0;
            hero.monsterCores = (hero.monsterCores ?? 0) + 5;
            hero.rupees += 350;
            soundEngine.playVictoryFanfare();
            pushBanner(
              "Claimed the Starlight Pantheon Hoard! (+1 Heart Container, +5 Cores & +350 Rupees!)",
              "You conquered the Astral Sky-Isles! Take the North Golden Return Portal back to Whispering Vale Crossroads!",
              7.5
            );
          } else if (chestNoticeCooldown <= 0) {
            chestNoticeCooldown = 3.0;
            soundEngine.playGateLocked();
            pushBanner(
              "The Starlight Pantheon Hoard is Sealed!",
              "Vanquish Astraea, the Starlight Archon, in the North Pantheon Arena to unseal this chest!",
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
        : zone === "desert"
        ? Boolean(flags.desertCalderaGateUnlocked || flags.hasSolarKey || flags.desertSolarKeyPickedUp)
        : zone === "caldera"
        ? Boolean(flags.calderaGateUnlocked && (!flags.calderaBossAwakened || flags.calderaBossDefeated))
        : Boolean(flags.gateUnlocked && (!flags.bossAwakened || flags.bossDefeated));
    const bossExitOpen =
      zone === "caldera"
        ? Boolean(flags.calderaBossDefeated)
        : zone === "citadel"
        ? Boolean(flags.citadelBossDefeated)
        : Boolean(flags.bossDefeated);

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
            // Deliver any snagged Sanctum Key, Room 2 Small Key, Map 4 Glacial Key, Map 6 Solar Key, or Rupees directly into the Hero's hands!
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
            if (boomerang.carryingSolarKey && !flags.desertSolarKeyPickedUp) {
              flags.desertSolarKeyPickedUp = true;
              flags.hasSolarKey = true;
              hero.hasDungeonKey = true;
              soundEngine.playVictoryFanfare();
              soundEngine.playKeyPickup();
              pushBanner(
                "Boomerang Fetched the Solar Crest Key!",
                "Head to the East Sun-Gate (31.8, 0) to unlock the East Canyon Pass into Map 7: Skyward Caldera!",
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

        // Boomerang snags & drags the Map 1B Grove Key, Room 2 Dungeon Small Key, Map 4 Glacial Key, Map 6 Solar Key, and Rupees/Recovery Hearts in flight!
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
            (flags.cavernEyeSolved || flags.cavernWardensCleared || flags.cavernBossDefeated) &&
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

          if (
            zone === "desert" &&
            !flags.desertSolarKeyPickedUp &&
            !boomerang.carryingSolarKey &&
            (flags.desertWardensCleared || flags.desertBossDefeated) &&
            Math.hypot(DESERT_SOLAR_KEY_POS.x - boomerang.x, DESERT_SOLAR_KEY_POS.z - boomerang.z) < 1.85
          ) {
            boomerang.carryingSolarKey = true;
            boomerang.returning = true;
            soundEngine.playLift();
            pushBanner(
              "Boomerang Snagged the Solar Crest Key!",
              "Pulling the Solar Crest Key from the East Sun Pedestal...",
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

        // Forage wild Biome Herbs when chopping bushes for the first time!
        if (!alreadyCutOnce && Math.random() < 0.45) {
          const herbPool: HerbId[] =
            zone === "caverns" || zone === "atoll"
              ? ["frost_cap", "starlight_dew"]
              : zone === "caldera" || zone === "desert" || zone === "citadel"
              ? ["ember_root", "sun_lotus"]
              : zone === "sky" || zone === "hollow" || zone === "rift"
              ? ["starlight_dew", "frost_cap"]
              : ["sun_lotus", "ember_root"];
          const pickedHerb = herbPool[Math.floor(Math.random() * herbPool.length)];
          hero.herbs = {
            sun_lotus: 0,
            frost_cap: 0,
            ember_root: 0,
            starlight_dew: 0,
            ...(hero.herbs ?? {}),
          };
          hero.herbs[pickedHerb] = (hero.herbs[pickedHerb] ?? 0) + 1;
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

    // Kill-Streak Combo & Critical Hit Mastery helpers
    const registerComboHit = () => {
      hero.comboCount = (hero.comboCount ?? 0) + 1;
      hero.comboTimer = 6.5;
      hero.maxComboStreak = Math.max(hero.maxComboStreak ?? 0, hero.comboCount);
    };

    const rollComboCritBonus = (): number => {
      const bloodMoonBonus = activeWeather === "blood_moon" ? 1 : 0;
      const elixirCritBonus = activeElixir === "titans_draught" ? 0.25 : 0;
      const critChance = Math.min(0.65, (hero.comboCount ?? 0) * 0.04 + elixirCritBonus);
      if (critChance > 0 && Math.random() < critChance) {
        return 1 + bloodMoonBonus;
      }
      return bloodMoonBonus;
    };

    // Helper to handle enemy defeat & rupee / recovery heart drops (including 5x Bounty Monster Fountain, Heirloom Sub-Quest, & Room 3 Ember Guards!)
    const handleEnemyDeath = (enemy: EnemyState) => {
      enemy.hp = 0;
      enemy.state = "dead";
      stats.enemiesDefeated += 1;
      registerComboHit();

      // Monsters also drop Alchemical Biome Herbs (100% on Boss/Bounty, 40% on regular foes)
      if (enemy.kind === "boss" || enemy.isBounty || Math.random() < 0.4) {
        const herbByZone: HerbId =
          zone === "caverns" || zone === "atoll"
            ? "frost_cap"
            : zone === "caldera" || zone === "citadel" || zone === "desert"
            ? "ember_root"
            : zone === "sky" || zone === "hollow" || zone === "rift"
            ? "starlight_dew"
            : "sun_lotus";
        hero.herbs = {
          sun_lotus: 0,
          frost_cap: 0,
          ember_root: 0,
          starlight_dew: 0,
          ...(hero.herbs ?? {}),
        };
        const herbQty = enemy.kind === "boss" ? 2 : 1;
        hero.herbs[herbByZone] = (hero.herbs[herbByZone] ?? 0) + herbQty;
      }
      const greedCoreBonus =
        hasRelic("greed_crown") &&
        (enemy.kind === "boss" || enemy.isBounty || enemy.kind === "knight")
          ? 1
          : 0;
      const bloodMoonCoreBonus = activeWeather === "blood_moon" ? 1 : 0;
      const coreGain =
        (enemy.kind === "boss"
          ? 5
          : enemy.isBounty || enemy.kind === "knight"
          ? 2
          : 1) +
        greedCoreBonus +
        bloodMoonCoreBonus;
      hero.monsterCores = (hero.monsterCores ?? 0) + coreGain;

      // Crimson Leech Fang (`vampiric_fang`): +1 HP (Half-Heart) & +8 MP on every monster kill!
      if (hasRelic("vampiric_fang")) {
        hero.hp = Math.min(hero.maxHp, hero.hp + 1);
        hero.mp = Math.min(hero.maxMp, (hero.mp ?? 0) + 8);
      }

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

      // Check if all 3 Map 6 Sunscorched Oasis Wardens (`questGroup === "desert_wardens"`) are defeated!
      if (enemy.questGroup === "desert_wardens" && !flags.desertWardensCleared) {
        const remainingDesertWardens = enemies.filter(
          (e) => e.questGroup === "desert_wardens" && e.state !== "dead"
        );
        if (remainingDesertWardens.length === 0) {
          flags.desertWardensCleared = true;
          soundEngine.playSecretSolve();
          pushBanner(
            "Sun Temple Wardens Vanquished! (Solar Crest Key Unsealed!)",
            "Claim the Solar Crest Key at the East Sun Temple Pedestal (or toggle the 2 Solar Crystal Switches for +20 Rupees)!",
            5.8
          );
        }
      }

      if (enemy.id === "fr-hookshot-guard" && !flags.frontierHookshotChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Reliquary Guard Vanquished! (Hookshot Chest Unsealed!)",
          "Walk up to the NW Cliffside Reliquary Chest to claim the Grappling Hookshot [H / 7]!",
          5.5
        );
      }

      if (enemy.id === "cv-hammer-guard" && !flags.cavernHammerChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Glacial Forge Sentinel Vanquished! (War-Hammer Chest Unsealed!)",
          "Walk up to the SW Glacial Forge Chest to claim the Titan War-Hammer [T / 8]!",
          5.5
        );
      }

      if (enemy.id === "ds-oasis-wyrm" && !flags.desertOasisChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Mirage Wyrm Vanquished! (Oasis Reliquary Chest Unsealed!)",
          "Walk up to the SW Mirage Oasis Chest to claim +1 Heart Container, Fairy in a Bottle, & +100 Rupees!",
          5.5
        );
      }

      if (enemy.id === "ca-forge-knight" && !flags.calderaForgeChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Magma Forge Sentinel Vanquished! (NW Magma Forge Chest Unsealed!)",
          "Walk up to the NW Magma Forge Chest to claim Crimson Dragon Mail (-75% Damage) & +100 Rupees!",
          5.5
        );
      }

      if (enemy.id === "at-pearl-guard" && !flags.atollPearlChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Coral Sentinel Vanquished! (Sunken Pearl Chest Unsealed!)",
          "Walk up to the SW Sunken Pearl Chest to claim +2 Monster Cores, Sapphire Mail & +100 Rupees!",
          5.5
        );
      }

      if (enemy.id === "hl-spore-guard" && !flags.hollowSporeChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Mycelial Sentinel Vanquished! (Luminous Spore Chest Unsealed!)",
          "Walk up to the NW Luminous Spore Chest to claim +2 Monster Cores, Bottled Fairy & +120 Rupees!",
          5.5
        );
      }

      if (enemy.id === "sk-celestial-guard" && !flags.skyCelestialChestOpened) {
        soundEngine.playSecretSolve();
        pushBanner(
          "Astral Sentinel Vanquished! (Celestial Reliquary Chest Unsealed!)",
          "Walk up to the NW Celestial Reliquary Chest to claim +3 Monster Cores, Swiftwind Boots & +150 Rupees!",
          5.5
        );
      }

      if (zone === "rift" && enemy.kind === "boss" && !flags.riftBossDefeated) {
        flags.riftBossDefeated = true;
        const curDepth = flags.riftDepth ?? 1;
        flags.highestRiftDepth = Math.max(flags.highestRiftDepth ?? 0, curDepth);
        soundEngine.playVictoryFanfare();
        pushBanner(
          `Rift Guardian Vanquished! (Depth ${curDepth} Cleared!)`,
          `Claim the Rift Hoard Chest and step into the Descent Portal to generate Floor ${
            curDepth + 1
          }!`,
          6.0
        );
      }
    };

    const getBossName = (z: ZoneId = zone): string =>
      z === "rift"
        ? flags.riftBossName ?? "Rift Guardian"
        : z === "sky"
        ? "Astraea"
        : z === "hollow"
        ? "Mycelion"
        : z === "atoll"
        ? "Nereus"
        : z === "caldera"
        ? "Pyrax"
        : z === "desert"
        ? "Skorpius"
        : z === "citadel"
        ? "Vaelkor"
        : z === "caverns"
        ? "Cryos"
        : "Ignis";

    const isBossRoomSealed = (e: EnemyState): boolean =>
      (e.zone === "dungeon" && (e.kind === "boss" || e.spawnZ > 13) && !flags.bossAwakened) ||
      (e.zone === "citadel" && (e.kind === "boss" || e.spawnZ > 13) && !flags.citadelBossAwakened) ||
      (e.zone === "caldera" && (e.kind === "boss" || e.spawnZ > 13) && !flags.calderaBossAwakened) ||
      (e.zone === "caverns" && e.kind === "boss" && !flags.cavernBossAwakened) ||
      (e.zone === "desert" && e.kind === "boss" && !flags.desertBossAwakened) ||
      (e.zone === "atoll" && e.kind === "boss" && !flags.atollBossAwakened) ||
      (e.zone === "hollow" && e.kind === "boss" && !flags.hollowBossAwakened) ||
      (e.zone === "sky" && e.kind === "boss" && !flags.skyBossAwakened);

    // 8c-2. Resolve Titan War-Hammer Overhead Slam + Radial Seismic Shockwave (`hammerSlamImpactPos`)
    if (hammerSlamImpactPos) {
      const { x: sx, z: sz } = hammerSlamImpactPos;
      let poundedPegCount = 0;
      let smashedBoulderCount = 0;

      // 1) Environmental Props: Pound `rusted_peg` stakes flat, smash `cracked_rock` / `clay_pot` / `light_rock`, and toggle `crystal_switch`!
      for (let i = 0; i < mapProps.length; i++) {
        const prop = mapProps[i];
        if (prop.zone !== zone) continue;
        const dist = Math.hypot(prop.x - sx, prop.z - sz);

        if (prop.prefab === "rusted_peg" && !prop.pounded && dist <= 2.95) {
          ensureMutableMapProps();
          mapProps[i].pounded = true;
          mapProps[i].hasCollider = false;
          poundedPegCount++;
          soundEngine.playPegPound();
          bushBursts.push({
            id: `peg-pound-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
            zone,
            x: prop.x,
            z: prop.z,
            timer: 0.65,
            maxTimer: 0.65,
            seed: Math.floor(Math.abs(prop.x * 73 + prop.z * 89) + stats.elapsedSeconds * 110),
            isRock: true,
          });
        } else if (prop.prefab === "cracked_rock" && !prop.smashed && dist <= 3.15) {
          ensureMutableMapProps();
          mapProps[i].smashed = true;
          mapProps[i].hasCollider = false;
          smashedBoulderCount++;
          soundEngine.playBombExplode();
          soundEngine.playSecretSolve();
          bushBursts.push({
            id: `hammer-rock-${prop.id}-${stats.elapsedSeconds.toFixed(3)}`,
            zone,
            x: prop.x,
            z: prop.z,
            timer: 0.9,
            maxTimer: 0.9,
            seed: Math.floor(Math.abs(prop.x * 59 + prop.z * 97) + stats.elapsedSeconds * 130),
            isRock: true,
          });
        } else if (
          (prop.prefab === "clay_pot" || prop.prefab === "light_rock") &&
          !prop.smashed &&
          dist <= 2.95
        ) {
          ensureMutableMapProps();
          mapProps[i].smashed = true;
          mapProps[i].hasCollider = false;
          smashPotOrRock(prop.x, prop.z, prop.prefab, prop.potReward, prop.id);
        } else if (
          prop.prefab === "crystal_switch" &&
          (prop.hitCooldown ?? 0) <= 0 &&
          dist <= 3.6
        ) {
          toggleCrystalSwitch(prop.id);
        }
      }

      if (poundedPegCount > 0 || smashedBoulderCount > 0) {
        dynamicObstacles = getActiveObstacles(mapProps);
      }
      if (poundedPegCount > 0) {
        // Check if pounding Rusted Iron Stakes in Map 7 (`caldera`) solved the Sanctum Seal!
        if (zone === "caldera" && !flags.calderaPegsSolved) {
          const calderaSealPegs = mapProps.filter(
            (p) =>
              p.zone === "caldera" &&
              (p.id === "prop-ca-seal-peg-1" || p.id === "prop-ca-seal-peg-2")
          );
          if (calderaSealPegs.length > 0 && calderaSealPegs.every((p) => p.pounded)) {
            flags.calderaPegsSolved = true;
            flags.calderaGateUnlocked = true;
            dynamicObstacles = getActiveObstacles(mapProps);
            soundEngine.playGateUnlock();
            soundEngine.playSecretSolve();
            pushBanner(
              "Both Sanctum Iron Stakes Pounded! (Dragon's Peak Sanctum Gate Unsealed!)",
              "Step North through the open Sanctum Gate to challenge Pyrax, the Magma Wyrm!",
              6.0
            );
          } else {
            soundEngine.playSecretSolve();
            pushBanner(
              "Pounded a Sanctum Iron Stake Flat! (1 of 2)",
              "Pound the other Rusted Iron Stake with your War-Hammer [T] to unseal the Dragon's Peak Sanctum Gate!",
              4.2
            );
          }
        } else {
          soundEngine.playSecretSolve();
          pushBanner(
            poundedPegCount > 1
              ? `Pounded ${poundedPegCount} Rusted Iron Stakes Flat!`
              : "Pounded the Rusted Iron Stake Flat!",
            "The barrier stake was driven flush into the earth — the path is clear!",
            3.8
          );
        }
      } else if (smashedBoulderCount > 0) {
        pushBanner(
          "War-Hammer Shattered the Cracked Boulder!",
          "Your Titan War-Hammer pulverized the stone seal without using a single Bomb!",
          4.0
        );
      }

      // 2) Enemy Combat Impact: Unearth burrowed Wyrms, shatter Ice/Wood Armor, flip Spiked Beetles, crack Boss Carapace, & deal 3 Damage!
      for (const enemy of enemies) {
        if (enemy.zone !== zone || enemy.state === "dead") continue;
        if (isBossRoomSealed(enemy)) continue;
        const dx = enemy.x - sx;
        const dz = enemy.z - sz;
        const dist = Math.hypot(dx, dz);

        // Unearth Burrowed Tunnel Wyrms within 3.8m seismic shockwave!
        if (enemy.kind === "burrower" && enemy.burrowed) {
          if (dist <= 3.8) {
            enemy.burrowed = false;
            enemy.provoked = true;
            enemy.stunTimer = 3.8;
            enemy.state = "stunned";
            enemy.stateTimer = 3.8;
            enemy.hp -= 2;
            enemy.hitFlashTimer = 0.45;
            soundEngine.playBossWallCrash();
            bushBursts.push({
              id: `hammer-wyrm-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: enemy.x,
              z: enemy.z,
              timer: 0.85,
              maxTimer: 0.85,
              seed: Math.floor(Math.abs(enemy.x * 59 + enemy.z * 97) + stats.elapsedSeconds * 130),
              isDirt: true,
            });
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
            } else {
              pushBanner(
                "Seismic Slam Unearthed the Tunnel Wyrm! (-2 HP & Stunned!)",
                "The War-Hammer's shockwave blasted the burrowed Wyrm out of the ground!",
                4.0
              );
            }
          }
          continue;
        }

        const hRune = hero.hammerRuneTier ?? 0;
        const hitRadius =
          (enemy.kind === "boss" ? 3.8 : 3.45) +
          (hRune === 2 ? 2.4 : hRune === 1 ? 1.25 : 0);
        if (dist > hitRadius) continue;

        enemy.provoked = true;
        if (enemy.kind === "boss") {
          const bossName = getBossName(zone);
          if (flags.bossState === "ARMORED") {
            flags.bossState = "EXPOSED_EYE";
            flags.bossArmorTimer = 8.0;
            enemy.hitFlashTimer = 0.45;
            soundEngine.playPegPound();
            soundEngine.playBossWallCrash();
            pushBanner(
              `War-Hammer Cracked ${bossName}'s Outer Carapace! (Eye Exposed!)`,
              `Shoot ${bossName}'s Open Eye with Bow [E], Boomerang [Q], or Hookshot [H] to stun him!`,
              4.8
            );
          } else if (flags.bossState === "EXPOSED_EYE") {
            flags.bossState = "STUNNED";
            enemy.state = "stunned";
            enemy.stateTimer = 4.5;
            enemy.hp -= 3;
            enemy.hitFlashTimer = 0.42;
            soundEngine.playBossWallCrash();
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
            } else {
              soundEngine.playEnemyHit(true);
              pushBanner(
                `War-Hammer Crushed ${bossName}! (-3 HP & Stunned!)`,
                `Follow up while ${bossName} is stunned on the floor!`,
                4.2
              );
            }
          } else if (flags.bossState === "STUNNED") {
            enemy.hp -= 3;
            enemy.hitFlashTimer = 0.4;
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
            } else {
              soundEngine.playEnemyHit(true);
            }
          }
          continue;
        }

        // Shatter Wooden Shield or Glacial Ice Armor in one blow!
        const hadArmor = enemy.shieldArmor && enemy.shieldArmor !== "none" ? enemy.shieldArmor : null;
        if (hadArmor) {
          enemy.shieldArmor = "none";
          soundEngine.playPegPound();
          soundEngine.playPotSmash();
        }

        // Flip Spiked Electric Beetles onto their backs without shocking the Hero!
        if (enemy.shockArmor) {
          enemy.stunTimer = Math.max(enemy.stunTimer, 3.2);
        }

        const hammerBonusDmg =
          (hRune === 2 ? 2 : hRune === 1 ? 1 : 0) +
          (hasRelic("berserker_torc") ? 1 : 0) +
          rollComboCritBonus();
        const hammerBonusStun = hRune >= 1 ? 1.4 : 0;
        registerComboHit();
        enemy.hp -= 3 + hammerBonusDmg;
        enemy.hitFlashTimer = 0.38;
        enemy.stunTimer = Math.max(enemy.stunTimer, 1.85 + hammerBonusStun);
        if (enemy.kind !== "turret") {
          enemy.state = "stunned";
          enemy.stateTimer = Math.max(enemy.stateTimer, 1.85 + hammerBonusStun);
          const pushDirX = dist > 0.05 ? dx / dist : Math.sin(hero.facing);
          const pushDirZ = dist > 0.05 ? dz / dist : Math.cos(hero.facing);
          const kb = 16.5 / Math.max(0.6, Math.sqrt(enemy.weight || 1));
          enemy.knockbackVx = pushDirX * kb;
          enemy.knockbackVz = pushDirZ * kb;
        }

        if (enemy.hp <= 0) {
          handleEnemyDeath(enemy);
        } else {
          soundEngine.playEnemyHit(true);
          if (hadArmor === "ice") {
            pushBanner(
              "War-Hammer Shattered the Glacial Ice Armor! (-3 HP)",
              "Your Titan War-Hammer pulverized their frozen armor in a single blow!",
              3.8
            );
          } else if (hadArmor === "wood") {
            pushBanner(
              "War-Hammer Splintered the Wooden Shield! (-3 HP)",
              "The goblin's shield shattered into splinters under your War-Hammer!",
              3.8
            );
          }
        }
      }
    }

    // 8d. Update Grappling Hookshot Flight (`extending` / `retracting`)
    if (hookshot) {
      if (hookshot.zone !== zone) {
        hookshot = null;
      } else if (hookshot.state === "extending" || hookshot.state === "retracting") {
        if (!hookshot.carriedRupeeIds) {
          hookshot.carriedRupeeIds = [];
        }

        if (hookshot.state === "extending") {
          const extendSpeed = 28.0;
          const step = extendSpeed * dt;
          hookshot.distanceTraveled += step;
          const nextHx = hookshot.x + hookshot.dirX * step;
          const nextHz = hookshot.z + hookshot.dirZ * step;

          // 1) Check Grapple Anchor Props (`grapple_post`, `pine_tree`, `wooden_crate`, `wall_torch`) & `crystal_switch`
          let latchedOrBounced = false;
          for (const prop of mapProps) {
            if (prop.zone !== zone || prop.smashed) continue;
            if (
              prop.prefab === "grapple_post" ||
              prop.prefab === "pine_tree" ||
              prop.prefab === "wooden_crate" ||
              prop.prefab === "wall_torch"
            ) {
              const hitRadius =
                prop.prefab === "grapple_post"
                  ? 1.05
                  : prop.prefab === "pine_tree"
                  ? 1.1
                  : 0.92;
              if (Math.hypot(nextHx - prop.x, nextHz - prop.z) <= hitRadius) {
                soundEngine.playHookshotLatch();
                hookshot.x = prop.x;
                hookshot.z = prop.z;
                hookshot.targetX = prop.x - hookshot.dirX * 1.05;
                hookshot.targetZ = prop.z - hookshot.dirZ * 1.05;
                hookshot.state = "pulling_hero";
                latchedOrBounced = true;
                break;
              }
            } else if (
              prop.prefab === "crystal_switch" &&
              (prop.hitCooldown ?? 0) <= 0 &&
              Math.hypot(nextHx - prop.x, nextHz - prop.z) <= 1.15
            ) {
              toggleCrystalSwitch(prop.id);
              soundEngine.playHookshotLatch();
              hookshot.x = prop.x;
              hookshot.z = prop.z;
              hookshot.state = "retracting";
              latchedOrBounced = true;
              break;
            }
          }

          // 2) Check Enemy Combat Interactions (Strip Wooden Shield, Pierce Boss Eye & Pull Hero, or Stun Enemies)
          if (!latchedOrBounced) {
            for (const enemy of enemies) {
              if (enemy.zone !== zone || enemy.state === "dead") continue;
              if (enemy.kind === "burrower" && enemy.burrowed) continue;
              const eRad =
                enemy.kind === "boss" ? 1.65 : enemy.kind === "turret" ? 1.08 : 0.92;
              if (Math.hypot(enemy.x - nextHx, enemy.z - nextHz) <= eRad) {
                latchedOrBounced = true;
                hookshot.x = enemy.x;
                hookshot.z = enemy.z;

                if (isBossRoomSealed(enemy)) {
                  soundEngine.playArmorDeflect();
                  hookshot.state = "retracting";
                } else if (enemy.kind === "boss") {
                  const bossName = getBossName(zone);
                  enemy.provoked = true;
                  if (flags.bossState === "EXPOSED_EYE") {
                    flags.bossState = "STUNNED";
                    enemy.state = "stunned";
                    enemy.stateTimer = 4.5;
                    enemy.hp -= 2;
                    enemy.hitFlashTimer = 0.38;
                    soundEngine.playHookshotLatch();
                    soundEngine.playEyeStatueHit();
                    soundEngine.playBossWallCrash();
                    if (enemy.hp <= 0) {
                      handleEnemyDeath(enemy);
                      hookshot.state = "retracting";
                    } else {
                      hookshot.targetX = enemy.x - hookshot.dirX * 1.85;
                      hookshot.targetZ = enemy.z - hookshot.dirZ * 1.85;
                      hookshot.state = "pulling_hero";
                      pushBanner(
                        `Hookshot Pierced ${bossName}'s Open Eye & Pulled You In! (-2 HP)`,
                        `Slash ${bossName} at point-blank range while stunned on the floor!`,
                        4.4
                      );
                    }
                  } else if (flags.bossState === "STUNNED") {
                    enemy.hp -= 1;
                    enemy.hitFlashTimer = 0.25;
                    soundEngine.playHookshotLatch();
                    if (enemy.hp <= 0) {
                      handleEnemyDeath(enemy);
                    } else {
                      soundEngine.playEnemyHit(true);
                    }
                    hookshot.state = "retracting";
                  } else {
                    soundEngine.playArmorDeflect();
                    enemy.hitFlashTimer = 0.15;
                    hookshot.state = "retracting";
                    if (armorNoticeCooldown <= 0) {
                      armorNoticeCooldown = 2.8;
                      pushBanner(
                        `${bossName}'s Outer Carapace Deflects the Hookshot!`,
                        `Crack ${bossName}'s shell first, then grapple his Exposed Eye [H / 7] to stun & pull yourself in!`,
                        3.8
                      );
                    }
                  }
                } else if (enemy.shieldArmor === "wood") {
                  // Rips the Wooden Shield right off the Goblin's arm!
                  enemy.shieldArmor = "none";
                  enemy.provoked = true;
                  enemy.stunTimer = 2.4;
                  enemy.state = "stunned";
                  enemy.stateTimer = 2.4;
                  enemy.hitFlashTimer = 0.32;
                  soundEngine.playHookshotLatch();
                  soundEngine.playPotSmash();
                  hookshot.state = "retracting";
                  pushBanner(
                    "Hookshot Ripped Off the Goblin's Wooden Shield!",
                    "The goblin is now permanently shieldless and stunned for 2.4s — slash away!",
                    4.0
                  );
                } else if (enemy.shieldArmor === "ice") {
                  soundEngine.playArmorDeflect();
                  enemy.hitFlashTimer = 0.16;
                  hookshot.state = "retracting";
                  if (armorNoticeCooldown <= 0) {
                    armorNoticeCooldown = 2.8;
                    pushBanner(
                      "Glacial Ice Armor Deflects the Hookshot!",
                      "Melt their Ice Armor with the Flame Rod [R / 3] first!",
                      3.4
                    );
                  }
                } else {
                  enemy.provoked = true;
                  enemy.hp -= 1;
                  enemy.hitFlashTimer = 0.28;
                  enemy.stunTimer = Math.max(enemy.stunTimer, 2.4);
                  if (enemy.kind !== "turret") {
                    enemy.state = "stunned";
                    enemy.stateTimer = Math.max(enemy.stateTimer, 2.4);
                  }
                  soundEngine.playHookshotLatch();
                  if (enemy.hp <= 0) {
                    handleEnemyDeath(enemy);
                  } else {
                    soundEngine.playEnemyHit(true);
                  }
                  hookshot.state = "retracting";
                }
                break;
              }
            }
          }

          // 3) Wall/Obstacle Check & Max Range Check (13.5m)
          if (!latchedOrBounced && hookshot) {
            const resH = resolveArrowCollisions(
              nextHx,
              nextHz,
              0.32,
              zone,
              gatePassable,
              dynamicObstacles
            );
            hookshot.x = resH.x;
            hookshot.z = resH.z;
            if (resH.hitObstacle || hookshot.distanceTraveled >= 13.5) {
              if (resH.hitObstacle) {
                soundEngine.playArmorDeflect();
              }
              hookshot.state = "retracting";
            }
          }
        } else if (hookshot.state === "retracting") {
          const toHx = hero.x - hookshot.x;
          const toHz = hero.z - hookshot.z;
          const distH = Math.hypot(toHx, toHz);
          if (distH < 1.25) {
            if (hookshot.carryingKey && !flags.keyPickedUp) {
              flags.keyPickedUp = true;
              hero.hasDungeonKey = true;
              soundEngine.playKeyPickup();
              pushBanner(
                "Hookshot Snagged the Sanctum Entry Key!",
                "Return East to Map 1 Crossroads and take the North Exit to unlock Map 2 (Sunken Sanctum)!",
                5.5
              );
            }
            if (hookshot.carryingDgSmallKey && !flags.dgSmallKeyPickedUp) {
              flags.dgSmallKeyPickedUp = true;
              flags.hasSmallKey = true;
              hero.hasDungeonKey = true;
              soundEngine.playKeyPickup();
              pushBanner(
                "Hookshot Snagged the Small Key Across the Chasm!",
                "Return East to Room 1 (Central Hub) and unlock the Locked East Door into Room 3!",
                5.5
              );
            }
            if (hookshot.carryingGlacialKey && !flags.cavernCrestKeyPickedUp) {
              flags.cavernCrestKeyPickedUp = true;
              flags.hasGlacialKey = true;
              hero.hasDungeonKey = true;
              soundEngine.playVictoryFanfare();
              soundEngine.playKeyPickup();
              pushBanner(
                "Hookshot Snagged the Glacial Crest Key!",
                "Step into the North-East Shortcut Portal and unlock the North Citadel Gate into Map 5!",
                5.8
              );
            }
            if (hookshot.carryingSolarKey && !flags.desertSolarKeyPickedUp) {
              flags.desertSolarKeyPickedUp = true;
              flags.hasSolarKey = true;
              hero.hasDungeonKey = true;
              soundEngine.playVictoryFanfare();
              soundEngine.playKeyPickup();
              pushBanner(
                "Hookshot Snagged the Solar Crest Key!",
                "Head to the East Caldera Gate to unlock Map 7: Skyward Caldera & Dragon's Peak!",
                5.8
              );
            }
            for (const cId of hookshot.carriedRupeeIds) {
              const r = rupees.find((item) => item.id === cId);
              if (r && !r.collected) {
                r.collected = true;
                if (r.tier === "heart") {
                  hero.hp = Math.min(hero.maxHp, hero.hp + (r.value || 2));
                } else {
                  hero.rupees += r.value;
                }
                soundEngine.playRupeePickup(r.tier);
              }
            }
            hookshot = null;
          } else {
            const retractSpeed = 30.0;
            hookshot.x += (toHx / distH) * retractSpeed * dt;
            hookshot.z += (toHz / distH) * retractSpeed * dt;
          }
        }

        // Snag Keys & Rupees/Hearts along the Hookshot claw's path!
        if (hookshot && (hookshot.state === "extending" || hookshot.state === "retracting")) {
          if (
            zone === "grove" &&
            !flags.keyPickedUp &&
            !hookshot.carryingKey &&
            Math.hypot(DUNGEON_KEY_POS.x - hookshot.x, DUNGEON_KEY_POS.z - hookshot.z) < 1.65
          ) {
            hookshot.carryingKey = true;
            hookshot.state = "retracting";
            soundEngine.playHookshotLatch();
          }
          if (
            zone === "dungeon" &&
            !flags.dgSmallKeyPickedUp &&
            !hookshot.carryingDgSmallKey &&
            Math.hypot(DG_SMALL_KEY_POS.x - hookshot.x, DG_SMALL_KEY_POS.z - hookshot.z) < 1.85
          ) {
            hookshot.carryingDgSmallKey = true;
            hookshot.state = "retracting";
            soundEngine.playHookshotLatch();
          }
          if (
            zone === "caverns" &&
            !flags.cavernCrestKeyPickedUp &&
            !hookshot.carryingGlacialKey &&
            (flags.cavernEyeSolved || flags.cavernWardensCleared || flags.cavernBossDefeated) &&
            Math.hypot(CAVERN_CREST_KEY_POS.x - hookshot.x, CAVERN_CREST_KEY_POS.z - hookshot.z) < 1.85
          ) {
            hookshot.carryingGlacialKey = true;
            hookshot.state = "retracting";
            soundEngine.playHookshotLatch();
          }
          if (
            zone === "desert" &&
            !flags.desertSolarKeyPickedUp &&
            !hookshot.carryingSolarKey &&
            (flags.desertCrystalPuzzleSolved || flags.desertWardensCleared || flags.desertBossDefeated) &&
            Math.hypot(DESERT_SOLAR_KEY_POS.x - hookshot.x, DESERT_SOLAR_KEY_POS.z - hookshot.z) < 1.85
          ) {
            hookshot.carryingSolarKey = true;
            hookshot.state = "retracting";
            soundEngine.playHookshotLatch();
          }
          for (const rupee of rupees) {
            if (rupee.zone !== zone || rupee.collected) continue;
            if ((rupee.spawnBounceTimer ?? 0) > 0.12) continue;
            if (
              !hookshot.carriedRupeeIds!.includes(rupee.id) &&
              Math.hypot(rupee.x - hookshot.x, rupee.z - hookshot.z) < 1.48
            ) {
              hookshot.carriedRupeeIds!.push(rupee.id);
              hookshot.state = "retracting";
              soundEngine.playHookshotLatch();
            }
          }
          for (const cId of hookshot.carriedRupeeIds!) {
            const r = rupees.find((item) => item.id === cId);
            if (!r || r.collected) continue;
            r.x = hookshot.x;
            r.z = hookshot.z;
          }
        }
      }
    }

    // 9. Update Arrows, Frost Bolts & Stone Spitter Turret Rock Projectiles
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
        if (arrow.isRock || arrow.isFrost) {
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
        // Hero arrow, Mirror-Shield reflected bolt, or Shield-deflected Turret Rock hits enemies!
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          if (enemy.kind === "burrower" && enemy.burrowed) continue; // Arrows fly over submerged Tunnel Wyrms!
          if (arrow.hitEnemyIds?.includes(enemy.id)) continue;
          const eRad = enemy.kind === "boss" ? 1.55 : enemy.kind === "turret" ? 1.05 : 0.85;
          if (Math.hypot(enemy.x - arrow.x, enemy.z - arrow.z) <= eRad) {
            if (arrow.isPiercing && enemy.kind !== "boss") {
              arrow.hitEnemyIds = [...(arrow.hitEnemyIds ?? []), enemy.id];
            } else {
              arrowConsumed = true;
            }

            // Prevent sniping or waking the Boss/Sanctum Minions from outside the Boss Room before entering!
            if (isBossRoomSealed(enemy)) {
              soundEngine.playArmorDeflect();
              soundEngine.playArrowStick();
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.5;
                pushBanner(
                  zone === "caldera"
                    ? "Enter Dragon's Peak Sanctum!"
                    : zone === "desert"
                    ? "Cross into the East Sun Temple!"
                    : zone === "citadel"
                    ? "Enter the Sovereign's Throne!"
                    : zone === "caverns"
                    ? "Cross into the East Glacial Sanctum!"
                    : "Enter Room 5: Lair of Ignis!",
                  zone === "caldera"
                    ? "Step through the Sanctum Gate to challenge Pyrax, the Magma Wyrm!"
                    : zone === "desert"
                    ? "Grapple across to the East Sun Temple to challenge Skorpius, the Sun-Scorpion Behemoth!"
                    : zone === "citadel"
                    ? "Step through the Inner Sanctum Gate to challenge Vaelkor, the Obsidian Sovereign!"
                    : zone === "caverns"
                    ? "Step across the frozen bridge to challenge Cryos, the Glacial Colossus!"
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
                // - ARMORED: Carapace deflects normal Arrows, UNLESS it's a Mirror-Shield Reflected Bolt (`arrow.isReflected`), which shatters the carapace!
                // - EXPOSED_EYE: Arrow pierces the giant glowing chest Eye and crashes Boss to the floor ("STUNNED") for 4.0s!
                // - STUNNED: Arrow deals 2 damage while Boss is down!
                const bossName = getBossName(zone);
                if (flags.bossState === "ARMORED") {
                  if (arrow.isReflected) {
                    flags.bossState = "EXPOSED_EYE";
                    flags.bossArmorTimer = 8.0;
                    enemy.hitFlashTimer = 0.35;
                    soundEngine.playBurnBarrier();
                    pushBanner(
                      `Mirror Shield Reflection Cracked ${bossName}'s Shell! (8s)`,
                      `Phase 2: ${bossName}'s Giant Chest Eye is OPEN — shoot it with your Bow [E / 2] to stun him!`,
                      4.5
                    );
                  } else {
                    soundEngine.playArmorDeflect();
                    soundEngine.playArrowStick();
                    enemy.hitFlashTimer = 0.16;
                    if (armorNoticeCooldown <= 0) {
                      armorNoticeCooldown = 2.8;
                      pushBanner(
                        `${bossName}'s Outer Carapace Deflects Arrows!`,
                        `Phase 1: Crack ${bossName}'s shell with Flame Rod [R], a Bomb [B], or a Mirror-Shield Reflected Bolt!`,
                        3.6
                      );
                    }
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
            if (arrowConsumed && enemy.hp > 0 && !arrow.isRock && !arrow.isFrost) {
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
            if (arrowConsumed) {
              break;
            }
          }
        }
      } else {
        // Enemy Arrow, Frost Wraith Bolt, or Stone Spitter Turret Rock hits Hero!
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
                  "Pelted by Stone Projectile!",
                  "Hold Shield [RMB / Shift] facing the attacker to block and deflect shots!",
                  3.8
                );
              }
            }
          } else if (canBlockArrow && hero.equippedOffhand === "mirror_shield") {
            // AEGIS MIRROR SHIELD REFLECTS ENEMY ARROWS & FROST BOLTS 180° BACK AT THE ATTACKER!
            soundEngine.playShieldBlock();
            soundEngine.playCrystalSwitch(true);
            hero.knockbackVx = Math.sin(arrow.angle) * 1.2;
            hero.knockbackVz = Math.cos(arrow.angle) * 1.2;
            hero.invulnerableTimer = Math.max(hero.invulnerableTimer, 0.22);

            arrow.fromHero = true;
            arrow.isReflected = true;
            arrow.angle = hero.facing;
            arrow.speed = 19.5;
            arrow.damage = 2;
            arrow.lifeTimer = 1.65;
            arrow.x = hero.x + Math.sin(hero.facing) * 0.88;
            arrow.z = hero.z + Math.cos(hero.facing) * 0.88;
            remainingArrows.push(arrow);

            if (armorNoticeCooldown <= 0) {
              armorNoticeCooldown = 3.0;
              pushBanner(
                arrow.isFrost
                  ? "Aegis Mirror Shield Reflected the Frost Bolt!"
                  : "Aegis Mirror Shield Reflected the Projectile!",
                "Your Mirror Shield bounces enemy bolts right back at them (and cracks Boss armor)!",
                3.2
              );
            }
          } else {
            const hitRes = damageHero(
              arrow.damage,
              Math.sin(arrow.angle) * 9.5,
              Math.cos(arrow.angle) * 9.5,
              false,
              false,
              arrowFromAngle,
              0.65,
              Boolean(arrow.isFrost)
            );

            if (canBlockArrow) {
              if (!hitRes.triggered) {
                soundEngine.playShieldBlock();
              }
              if (!arrow.isFrost) {
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
            } else if (arrow.isFrost && hitRes.triggered) {
              hero.chillTimer = 2.5;
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.2;
                pushBanner(
                  "Chilled by Frost Wraith Bolt! (-32% Speed for 2.5s)",
                  "Block with your Shield [RMB] or vaporize Frost Wraiths with your Flame Rod [R] for 2x damage!",
                  3.6
                );
              }
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
      } else if (zone === "caldera" && !flags.calderaTorchPuzzleSolved) {
        // Map 7 (Skyward Caldera): Lighting the 2 Sanctum Seal Braziers (`prop-ca-seal-torch-w`, `prop-ca-seal-torch-e`) unseals Dragon's Peak Sanctum Gate!
        const caPuzzleTorches = mapProps.filter(
          (p) =>
            p.zone === "caldera" &&
            p.prefab === "wall_torch" &&
            (p.puzzleTarget === "lit" || p.puzzleTarget === "unlit")
        );
        if (
          caPuzzleTorches.length > 0 &&
          caPuzzleTorches.every(
            (p) => (p.lit !== false ? "lit" : "unlit") === p.puzzleTarget
          )
        ) {
          flags.calderaTorchPuzzleSolved = true;
          flags.calderaGateUnlocked = true;
          dynamicObstacles = getActiveObstacles(mapProps);
          soundEngine.playGateUnlock();
          soundEngine.playSecretSolve();
          rupees.push(
            {
              id: `ca-torch-secret-1-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "caldera",
              x: -0.8,
              z: 10.0,
              tier: "red",
              value: 20,
              collected: false,
              spawnBounceTimer: 0.45,
            },
            {
              id: `ca-torch-secret-heart-${stats.elapsedSeconds.toFixed(2)}`,
              zone: "caldera",
              x: 0.8,
              z: 10.0,
              tier: "heart",
              value: 2,
              collected: false,
              spawnBounceTimer: 0.45,
            }
          );
          pushBanner(
            "Both Sanctum Seal Braziers Lit! (Dragon's Peak Sanctum Gate Unsealed!)",
            "The Dragon's Peak Sanctum Gate is open — step North to challenge Pyrax, the Magma Wyrm!",
            6.0
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

    // Helper: Burn away Boss Carapace with the Flame Rod (`R`) -> transitions `bossState` from `"ARMORED"` to `"EXPOSED_EYE"` for 8.0s!
    const burnBossIgnisCarapace = (bossEnemy: EnemyState) => {
      const bName = getBossName(zone);
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
          `Phase 1 Complete: ${bName}'s Carapace Burned Away! (8s)`,
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
      // Immediate splash damage on explosion (also melts Ice Armor, burns Wooden Shields, unearths Tunnel Wyrms, & burns Boss Carapace)!
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
            if (enemy.kind === "burrower" && enemy.burrowed) {
              enemy.burrowed = false;
              enemy.stunTimer = 3.0;
              enemy.state = "stunned";
              enemy.stateTimer = 3.0;
            }
            const fireSplashDmg = enemy.kind === "wraith" ? 4 : 2;
            enemy.hp -= fireSplashDmg;
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
        if (!fb.isCharged && enemy.kind === "burrower" && enemy.burrowed) continue;
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
                const fireDmg = enemy.kind === "wraith" ? fb.damage * 2 : fb.damage;
                enemy.hp -= fireDmg;
                enemy.hitFlashTimer = 0.24;
                if (enemy.kind === "wraith" && armorNoticeCooldown <= 0) {
                  armorNoticeCooldown = 3.0;
                  pushBanner(
                    "Frost Wraith Scorched by Flame Rod! (2x Fire Damage!)",
                    "Glacial Specters take double damage from fire magic!",
                    3.0
                  );
                }
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
          if (enemy.kind === "burrower" && enemy.burrowed) continue;
          const eRad = enemy.kind === "boss" ? 1.35 : 0.75;
          if (Math.hypot(enemy.x - fz.x, enemy.z - fz.z) <= fz.radius + eRad * 0.5) {
            if (isBossRoomSealed(enemy)) continue;
            enemy.provoked = true;
            meltOrBurnEnemyShield(enemy);
            if (enemy.kind === "boss") {
              burnBossIgnisCarapace(enemy);
            } else {
              enemy.hp -= enemy.kind === "wraith" ? 2 : 1;
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
        if (enemy.kind === "burrower" && enemy.burrowed) continue;
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

    // 9b-2. Update 3D Elemental Spirit Companion AI (`hero.activeCompanion`)
    if (hero.activeCompanion && phase === "playing") {
      hero.companionAttackTimer = Math.max(0, (hero.companionAttackTimer ?? 0) - dt);
      hero.companionBlessTimer = Math.max(0, (hero.companionBlessTimer ?? 0) - dt);

      const orbitAngle = stats.elapsedSeconds * 2.1;
      const compX = hero.x + Math.cos(orbitAngle) * 1.45;
      const compZ = hero.z + Math.sin(orbitAngle) * 1.45;

      if (hero.activeCompanion === "gold_sprite") {
        // Aurelia, the Treasure Sprite: Pulses +2 HP (1 Full Heart) & +20 MP every 14.0s!
        if ((hero.companionBlessTimer ?? 0) <= 0) {
          hero.companionBlessTimer = 14.0;
          if (hero.hp < hero.maxHp || hero.mp < hero.maxMp) {
            hero.hp = Math.min(hero.maxHp, hero.hp + 2);
            hero.mp = Math.min(hero.maxMp, (hero.mp ?? 0) + 20);
            soundEngine.playHeartPickup();
          }
        }
      } else if ((hero.companionAttackTimer ?? 0) <= 0) {
        const maxRange =
          hero.activeCompanion === "frost_owl"
            ? 10.0
            : hero.activeCompanion === "ember_phoenix"
            ? 9.5
            : 6.5;
        let targetFoe: EnemyState | null = null;
        let bestDist = maxRange;
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          if (enemy.kind === "burrower" && enemy.burrowed) continue;
          if (isBossRoomSealed(enemy)) continue;
          const d = Math.hypot(enemy.x - hero.x, enemy.z - hero.z);
          if (d < bestDist) {
            bestDist = d;
            targetFoe = enemy;
          }
        }

        if (hero.activeCompanion === "ember_phoenix") {
          if (targetFoe) {
            hero.companionAttackTimer = 2.2;
            const shotAngle = Math.atan2(targetFoe.x - compX, targetFoe.z - compZ);
            soundEngine.playFireballShoot(false);
            fireballs.push({
              id: `phoenix-fb-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
              zone,
              x: compX,
              z: compZ,
              angle: shotAngle,
              speed: 13.5,
              damage: 1,
              radius: 0.44,
              isCharged: false,
              lifeTimer: 1.35,
            });
          } else {
            // Also check for nearby unlit braziers within 6.5m!
            const unlitTorch = mapProps.find(
              (p) =>
                p.zone === zone &&
                p.prefab === "wall_torch" &&
                p.lit === false &&
                Math.hypot(p.x - hero.x, p.z - hero.z) <= 6.5
            );
            if (unlitTorch) {
              hero.companionAttackTimer = 2.4;
              const shotAngle = Math.atan2(unlitTorch.x - compX, unlitTorch.z - compZ);
              soundEngine.playFireballShoot(false);
              fireballs.push({
                id: `phoenix-torch-fb-${stats.elapsedSeconds.toFixed(3)}`,
                zone,
                x: compX,
                z: compZ,
                angle: shotAngle,
                speed: 13.5,
                damage: 1,
                radius: 0.44,
                isCharged: false,
                lifeTimer: 1.2,
              });
            }
          }
        } else if (hero.activeCompanion === "frost_owl" && targetFoe) {
          hero.companionAttackTimer = 2.4;
          const shotAngle = Math.atan2(targetFoe.x - compX, targetFoe.z - compZ);
          soundEngine.playBowShoot();
          arrows.push({
            id: `owl-frost-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
            zone,
            fromHero: true,
            isFrost: true,
            x: compX,
            z: compZ,
            angle: shotAngle,
            speed: 19.5,
            damage: 2,
            lifeTimer: 1.35,
          });
        } else if (hero.activeCompanion === "storm_wolf" && targetFoe) {
          hero.companionAttackTimer = 2.0;
          soundEngine.playElectricShock();
          targetFoe.provoked = true;
          if (targetFoe.kind !== "boss") {
            targetFoe.hp -= 2;
            targetFoe.hitFlashTimer = 0.28;
            targetFoe.stunTimer = Math.max(targetFoe.stunTimer, 1.1);
            if (targetFoe.kind !== "turret") {
              targetFoe.state = "stunned";
              targetFoe.stateTimer = Math.max(targetFoe.stateTimer, 1.1);
            }
            if (targetFoe.hp <= 0) {
              handleEnemyDeath(targetFoe);
            }
          } else if (flags.bossState === "STUNNED") {
            targetFoe.hp -= 2;
            targetFoe.hitFlashTimer = 0.28;
            if (targetFoe.hp <= 0) {
              handleEnemyDeath(targetFoe);
            }
          }
          lightningArcs.push({
            id: `wolf-arc-${targetFoe.id}-${stats.elapsedSeconds.toFixed(3)}`,
            zone,
            x1: compX,
            z1: compZ,
            x2: targetFoe.x,
            z2: targetFoe.z,
            timer: 0.28,
            maxTimer: 0.28,
          });
        }
      }
    }

    // 9b-2. Mounted 3D Steed Mechanics: Cavalry Trample, Frost-Stag Hoof Bolts & War-Drake Breath (`hero.mountedSteed`)
    if (hero.mountedSteed && hero.mountedSteed !== "none") {
      // Update per-target trample cooldowns
      const nextTrampleCds: Record<string, number> = {};
      for (const [eid, cd] of Object.entries(hero.mountTrampleCooldowns ?? {})) {
        if (cd - dt > 0) {
          nextTrampleCds[eid] = cd - dt;
        }
      }
      hero.mountTrampleCooldowns = nextTrampleCds;

      // 1. Cavalry Trample when galloping (`mag > 0.05` or `isDashing`)
      if (mag > 0.05 || isDashing) {
        const trampleDmg = hasRelic("berserker_torc") ? 3 : 2;
        for (const enemy of enemies) {
          if (
            enemy.zone !== zone ||
            enemy.state === "dead" ||
            enemy.kind === "boss" ||
            (enemy.kind === "burrower" && enemy.burrowed) ||
            (hero.mountTrampleCooldowns[enemy.id] ?? 0) > 0 ||
            isBossRoomSealed(enemy)
          ) {
            continue;
          }
          const dist = Math.hypot(enemy.x - hero.x, enemy.z - hero.z);
          if (dist <= 1.72) {
            hero.mountTrampleCooldowns[enemy.id] = 0.85;
            enemy.provoked = true;
            if (enemy.shieldArmor === "ice" && hero.mountedSteed === "war_drake") {
              enemy.shieldArmor = "none";
            }
            enemy.hp -= trampleDmg;
            enemy.hitFlashTimer = 0.26;
            const stunDur = hero.mountedSteed === "frost_stag" ? 1.6 : 1.1;
            enemy.stunTimer = Math.max(enemy.stunTimer, stunDur);
            if (enemy.kind !== "turret") {
              enemy.state = "stunned";
              enemy.stateTimer = Math.max(enemy.stateTimer, stunDur);
              const pushAngle = Math.atan2(enemy.x - hero.x, enemy.z - hero.z);
              const kbStrength = 13.5 / Math.max(0.5, enemy.weight || 1.0);
              enemy.knockbackVx = Math.sin(pushAngle) * kbStrength;
              enemy.knockbackVz = Math.cos(pushAngle) * kbStrength;
            }
            hero.comboCount = (hero.comboCount ?? 0) + 1;
            hero.comboTimer = 6.5;
            hero.maxComboStreak = Math.max(hero.maxComboStreak ?? 0, hero.comboCount);
            soundEngine.playPegPound();
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
            }
          }
        }
      }

      // 2. Glacial Dire-Stag Rime Hoof-Bolts & Obsidian War-Drake Homing Fireballs
      if (hero.mountedSteed === "frost_stag" || hero.mountedSteed === "war_drake") {
        hero.mountAttackTimer = (hero.mountAttackTimer ?? 1.2) - dt;
        if (hero.mountAttackTimer <= 0) {
          const maxRange = hero.mountedSteed === "war_drake" ? 9.5 : 8.5;
          let targetFoe: EnemyState | null = null;
          let bestDist = maxRange;
          for (const e of enemies) {
            if (
              e.zone !== zone ||
              e.state === "dead" ||
              (e.kind === "burrower" && e.burrowed) ||
              isBossRoomSealed(e)
            ) {
              continue;
            }
            const d = Math.hypot(e.x - hero.x, e.z - hero.z);
            if (d <= bestDist) {
              bestDist = d;
              targetFoe = e;
            }
          }

          const headX = hero.x + Math.sin(hero.facing) * 1.1;
          const headZ = hero.z + Math.cos(hero.facing) * 1.1;

          if (hero.mountedSteed === "frost_stag") {
            hero.mountAttackTimer = 2.4;
            if (targetFoe) {
              const shotAngle = Math.atan2(targetFoe.x - headX, targetFoe.z - headZ);
              soundEngine.playBowShoot();
              arrows.push({
                id: `stag-frost-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
                zone,
                fromHero: true,
                isFrost: true,
                x: headX,
                z: headZ,
                angle: shotAngle,
                speed: 20.0,
                damage: 2,
                lifeTimer: 1.35,
              });
            }
          } else if (hero.mountedSteed === "war_drake") {
            hero.mountAttackTimer = 1.8;
            if (targetFoe) {
              const shotAngle = Math.atan2(targetFoe.x - headX, targetFoe.z - headZ);
              soundEngine.playFireballShoot(false);
              fireballs.push({
                id: `drake-fb-${stats.elapsedSeconds.toFixed(3)}-${Math.random().toFixed(3)}`,
                zone,
                x: headX,
                z: headZ,
                angle: shotAngle,
                speed: 14.0,
                damage: 2,
                radius: 0.48,
                isCharged: false,
                lifeTimer: 1.35,
              });
            } else {
              const unlitTorch = mapProps.find(
                (p) =>
                  p.zone === zone &&
                  p.prefab === "wall_torch" &&
                  p.lit === false &&
                  Math.hypot(p.x - hero.x, p.z - hero.z) <= 6.5
              );
              if (unlitTorch) {
                const shotAngle = Math.atan2(unlitTorch.x - headX, unlitTorch.z - headZ);
                soundEngine.playFireballShoot(false);
                fireballs.push({
                  id: `drake-torch-fb-${stats.elapsedSeconds.toFixed(3)}`,
                  zone,
                  x: headX,
                  z: headZ,
                  angle: shotAngle,
                  speed: 14.0,
                  damage: 1,
                  radius: 0.46,
                  isCharged: false,
                  lifeTimer: 1.2,
                });
              }
            }
          }
        }
      }
    }

    // 9b-3. Dynamic Weather Periodic Synergies (`thunderstorm` Sky-Bolts & `starfall` Cosmic Shards)
    if (activeWeather === "thunderstorm" || activeWeather === "starfall") {
      flags.weatherStrikeTimer = (flags.weatherStrikeTimer ?? 3.8) - dt;
      if (flags.weatherStrikeTimer <= 0) {
        if (activeWeather === "thunderstorm") {
          flags.weatherStrikeTimer = 3.8;
          let stormTarget: EnemyState | null = null;
          let bestDist = 11.5;
          for (const e of enemies) {
            if (
              e.zone !== zone ||
              e.state === "dead" ||
              (e.kind === "burrower" && e.burrowed) ||
              isBossRoomSealed(e)
            ) {
              continue;
            }
            const d = Math.hypot(e.x - hero.x, e.z - hero.z);
            if (d <= bestDist) {
              bestDist = d;
              stormTarget = e;
            }
          }
          if (stormTarget) {
            soundEngine.playElectricShock();
            stormTarget.provoked = true;
            if (stormTarget.kind !== "boss") {
              stormTarget.hp -= 2;
              stormTarget.hitFlashTimer = 0.32;
              stormTarget.stunTimer = Math.max(stormTarget.stunTimer, 1.25);
              if (stormTarget.kind !== "turret") {
                stormTarget.state = "stunned";
                stormTarget.stateTimer = Math.max(stormTarget.stateTimer, 1.25);
              }
              if (stormTarget.hp <= 0) {
                handleEnemyDeath(stormTarget);
              }
            } else if (flags.bossState === "STUNNED") {
              stormTarget.hp -= 2;
              stormTarget.hitFlashTimer = 0.32;
              if (stormTarget.hp <= 0) {
                handleEnemyDeath(stormTarget);
              }
            }
            lightningArcs.push({
              id: `sky-bolt-${stormTarget.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x1: hero.x,
              z1: hero.z,
              x2: stormTarget.x,
              z2: stormTarget.z,
              timer: 0.32,
              maxTimer: 0.32,
            });
          }
        } else if (activeWeather === "starfall") {
          flags.weatherStrikeTimer = 6.0;
          if (hero.hp < hero.maxHp || (hero.mp ?? 0) < hero.maxMp) {
            hero.hp = Math.min(hero.maxHp, hero.hp + 1);
            hero.mp = Math.min(hero.maxMp, (hero.mp ?? 0) + 12);
          }
        }
      }
    }

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
          if (enemy.kind === "burrower" && enemy.burrowed) continue;
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

        const blastRadius = hasRelic("demolition_core") ? 4.9 : 3.5;
        const bombHitDamage = hasRelic("demolition_core") ? 5 : 3;

        // 1. Blow up any Explodable Cracked Rocks (`cracked_rock`), Pots (`clay_pot`), or Light Rocks (`light_rock`) in blast radius!
        for (let pIdx = 0; pIdx < mapProps.length; pIdx++) {
          const prop = mapProps[pIdx];
          if (prop.zone !== zone) continue;
          const distToProp = Math.hypot(prop.x - bomb.x, prop.z - bomb.z);

          if (prop.prefab === "cracked_rock" && !prop.smashed && distToProp <= Math.max(3.85, blastRadius)) {
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
            } else if (prop.id === "prop-ds-temple-cracked-rock") {
              pushBanner(
                "East Sun Temple Shortcut Unsealed!",
                "The cracked sandstone boulder blocking the East Sun Temple bridge is shattered!",
                5.0
              );
            } else if (prop.id === "prop-ca-forge-cracked-rock") {
              pushBanner(
                "NW Magma Forge Entrance Unsealed!",
                "Defeat the Magma Forge Sentinel inside to claim Crimson Dragon Mail & +100 Rupees!",
                5.2
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

        // 2. Deal 3 Heavy Blast Damage to Enemies in blast radius (and crack/stagger Boss or unearth Tunnel Wyrms!)
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
                const bossName = getBossName(zone);
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
              if (enemy.kind === "burrower" && enemy.burrowed) {
                enemy.burrowed = false;
                enemy.stunTimer = 3.5;
                enemy.state = "stunned";
                enemy.stateTimer = 3.5;
                pushBanner(
                  "Bomb Blast Unearthed & Stunned the Tunnel Wyrm! (3.5s)",
                  "The explosion blew it out of the ground — slash it while it's dazed!",
                  3.6
                );
              }
              enemy.hp -= bombHitDamage;
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
          } else if (enemy.kind === "burrower" && enemy.burrowed) {
            soundEngine.playArmorDeflect();
            if (armorNoticeCooldown <= 0) {
              armorNoticeCooldown = 3.0;
              pushBanner(
                "Tunnel Wyrm is Burrowed Underground!",
                "Dig near it with your Iron Shovel [G] or blast it with a Bomb [B] to unearth it!",
                3.4
              );
            }
          } else {
            enemy.provoked = true;
            if (enemy.kind === "boss") {
              const bossName = getBossName(zone);
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
                    `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] or Bomb [B / 4] to crack his outer shell first!`,
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
                enemy.kind === "archer" ||
                enemy.kind === "turret" ||
                enemy.kind === "wraith" ||
                enemy.kind === "bomber"
                  ? 0.35
                  : enemy.kind === "knight" || enemy.kind === "burrower"
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
            if (enemy.kind === "burrower" && enemy.burrowed) {
              soundEngine.playArmorDeflect();
              if (armorNoticeCooldown <= 0) {
                armorNoticeCooldown = 3.0;
                pushBanner(
                  "Tunnel Wyrm is Burrowed Underground!",
                  "Wait for it to surface OR unearth & stun it with your Iron Shovel [G] or a Bomb [B]!",
                  3.5
                );
              }
            } else {
              enemy.provoked = true;
              const relicSwordBonus =
                (hasRelic("berserker_torc") ? 1 : 0) +
                (activeElixir === "titans_draught" ? 1 : 0);
              const critBonus = rollComboCritBonus();
              const strikeDamage =
                ((hero.swordDamage || 1) + relicSwordBonus) * (isSpin ? 2 : 1) + critBonus;
              registerComboHit();

              if (enemy.kind === "boss") {
                // Boss 3-Step Vulnerability Loop: Phase 3 Melee Punish when STUNNED!
                const bossName = getBossName(zone);
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
                      `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] or Bomb [B / 4] to crack his outer shell first!`,
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

              // Sword Enchantment: Tempest Chain-Lightning Rune (Tier 1 & Tier 2)
              const sRune = hero.swordRuneTier ?? 0;
              if (sRune >= 1) {
                const maxTargets = sRune === 2 ? 4 : 2;
                const arcRange = sRune === 2 ? 6.2 : 4.8;
                const arcDamage = sRune === 2 ? 2 : 1;
                let chainedCount = 0;
                for (const other of enemies) {
                  if (chainedCount >= maxTargets) break;
                  if (
                    other.id === enemy.id ||
                    other.zone !== zone ||
                    other.state === "dead" ||
                    (other.kind === "burrower" && other.burrowed) ||
                    other.kind === "boss"
                  ) {
                    continue;
                  }
                  const dChain = Math.hypot(other.x - enemy.x, other.z - enemy.z);
                  if (dChain <= arcRange) {
                    chainedCount++;
                    other.provoked = true;
                    other.hp -= arcDamage;
                    other.hitFlashTimer = 0.28;
                    other.stunTimer = Math.max(other.stunTimer, sRune === 2 ? 1.45 : 0.85);
                    if (other.kind !== "turret") {
                      other.state = "stunned";
                      other.stateTimer = Math.max(other.stateTimer, sRune === 2 ? 1.45 : 0.85);
                    }
                    lightningArcs.push({
                      id: `arc-${enemy.id}-${other.id}-${stats.elapsedSeconds.toFixed(3)}`,
                      zone,
                      x1: enemy.x,
                      z1: enemy.z,
                      x2: other.x,
                      z2: other.z,
                      timer: 0.34,
                      maxTimer: 0.34,
                    });
                    if (other.hp <= 0) {
                      handleEnemyDeath(other);
                    }
                  }
                }
                if (chainedCount > 0) {
                  soundEngine.playElectricShock();
                }
              }

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
      }

      // Boss Rage Phase at 50% HP (spawns 2 Guards & intensifies Ignis / Cryos / Vaelkor / Skorpius / Pyrax!)
      if (
        enemy.kind === "boss" &&
        enemy.hp <= Math.ceil(enemy.maxHp / 2) &&
        ((zone === "dungeon" && !flags.bossPhase2) ||
          (zone === "caverns" && !flags.cavernBossPhase2) ||
          (zone === "citadel" && !flags.citadelBossPhase2) ||
          (zone === "desert" && !flags.desertBossPhase2) ||
          (zone === "caldera" && !flags.calderaBossPhase2))
      ) {
        if (zone === "caldera") {
          flags.calderaBossPhase2 = true;
        } else if (zone === "desert") {
          flags.desertBossPhase2 = true;
        } else if (zone === "citadel") {
          flags.citadelBossPhase2 = true;
        } else if (zone === "caverns") {
          flags.cavernBossPhase2 = true;
        } else {
          flags.bossPhase2 = true;
        }
        const bossName = getBossName(zone);
        soundEngine.playBossRoar();
        pushBanner(
          zone === "caverns"
            ? `${bossName} Enters His Blizzard Rage Phase!`
            : zone === "desert"
            ? `${bossName} Enters His Sandstorm Rage Phase!`
            : `${bossName} Enters His Molten Rage Phase!`,
          zone === "caverns"
            ? "Two Frost Wraiths materialize in the sanctum — melt his ice shell [R / B], stun his Eye [E], and slash [Space]!"
            : zone === "desert"
            ? "Two Dune Sentinels emerge in the Sun Temple — crack his chitin [T / B / R], stun his Eye [E / H], and slash [Space]!"
            : "Two Shadow Guards rise in the corners — keep burning his shell [R], stunning his Eye [E], and slashing [Space]!",
          4.2
        );
        const wave2Coords =
          zone === "caverns"
            ? [
                { id: `${zone}-wraith-wave2-1`, x: 18.5, z: 24.5, kind: "wraith" as EnemyKind },
                { id: `${zone}-wraith-wave2-2`, x: 29.5, z: 24.5, kind: "wraith" as EnemyKind },
              ]
            : zone === "desert"
            ? [
                { id: `${zone}-minion-wave2-1`, x: 18.5, z: 24.5, kind: "minion" as EnemyKind },
                { id: `${zone}-minion-wave2-2`, x: 29.5, z: 24.5, kind: "minion" as EnemyKind },
              ]
            : [
                { id: `${zone}-minion-wave2-1`, x: -8.5, z: 28.5, kind: "minion" as EnemyKind },
                { id: `${zone}-minion-wave2-2`, x: 8.5, z: 28.5, kind: "minion" as EnemyKind },
              ];
        wave2Coords.forEach((wc) => {
          enemies.push({
            id: wc.id,
            kind: wc.kind,
            zone,
            x: wc.x,
            z: wc.z,
            spawnX: wc.x,
            spawnZ: wc.z,
            facing: Math.PI,
            hp: 4,
            maxHp: 4,
            weight: getDefaultEnemyWeight(wc.kind),
            state: "aggro",
            stateTimer: 0,
            hitFlashTimer: 0.2,
            knockbackImmunityTimer: 0,
            stunTimer: 0,
            lastHitSwingId: -1,
            knockbackVx: 0,
            knockbackVz: 0,
            aggroRadius: 15,
            speed: wc.kind === "wraith" ? 5.2 : 5.5,
            damage: 1,
            rupeeDrop: "blue",
            provoked: true,
            chargeAngle: Math.PI,
            chargePathLength: 0,
            chargeDistanceTraveled: 0,
            actionCounter: 0,
            actionCooldown: 0.4,
          });
        });
      }

      const toHeroX = hero.x - enemy.x;
      const toHeroZ = hero.z - enemy.z;
      const distToHero = Math.hypot(toHeroX, toHeroZ);
      const isSanctumEnemy =
        ((enemy.zone === "dungeon" ||
          enemy.zone === "citadel" ||
          enemy.zone === "caldera" ||
          enemy.zone === "atoll" ||
          enemy.zone === "hollow" ||
          enemy.zone === "sky") &&
          enemy.spawnZ > 13) ||
        ((enemy.zone === "caverns" || enemy.zone === "desert") &&
          enemy.spawnX > 13.5 &&
          enemy.spawnZ > 5.5);
      const enemyWeight = enemy.weight ?? getDefaultEnemyWeight(enemy.kind);

      // =====================================================
      // DEDICATED BOSS AI STATE MACHINE ("IGNIS", "CRYOS", "VAELKOR", "SKORPIUS", "PYRAX", "NEREUS", "MYCELION", & "ASTRAEA")
      // =====================================================
      if (enemy.kind === "boss") {
        const bossName = getBossName(zone);
        const isCurrentBossAwakened =
          zone === "rift"
            ? distToHero <= 11.5 || Boolean(enemy.provoked)
            : zone === "sky"
            ? Boolean(flags.skyBossAwakened)
            : zone === "hollow"
            ? Boolean(flags.hollowBossAwakened)
            : zone === "atoll"
            ? Boolean(flags.atollBossAwakened)
            : zone === "caldera"
            ? Boolean(flags.calderaBossAwakened)
            : zone === "desert"
            ? Boolean(flags.desertBossAwakened)
            : zone === "citadel"
            ? Boolean(flags.citadelBossAwakened)
            : zone === "caverns"
            ? Boolean(flags.cavernBossAwakened)
            : Boolean(flags.bossAwakened);
        const isCurrentBossPhase2 =
          zone === "rift" || zone === "atoll" || zone === "hollow" || zone === "sky"
            ? enemy.hp <= Math.ceil(enemy.maxHp / 2)
            : zone === "caldera"
            ? Boolean(flags.calderaBossPhase2)
            : zone === "desert"
            ? Boolean(flags.desertBossPhase2)
            : zone === "citadel"
            ? Boolean(flags.citadelBossPhase2)
            : zone === "caverns"
            ? Boolean(flags.cavernBossPhase2)
            : Boolean(flags.bossPhase2);
        const isEastSanctumBoss = zone === "caverns" || zone === "desert";
        const bossMinX =
          zone === "rift" ? enemy.spawnX - 8.2 : isEastSanctumBoss ? 13.8 : -14.5;
        const bossMaxX =
          zone === "rift" ? enemy.spawnX + 8.2 : isEastSanctumBoss ? 31.5 : 14.5;
        const bossMinZ =
          zone === "rift" ? enemy.spawnZ - 8.2 : isEastSanctumBoss ? 6.5 : 14.5;
        const bossMaxZ =
          zone === "rift" ? enemy.spawnZ + 8.2 : isEastSanctumBoss ? 29.5 : 33.5;

        // Tick Phase 2 Exposed Eye countdown -> regenerates carapace if not stunned in time!
        if (flags.bossState === "EXPOSED_EYE" && enemy.state !== "stunned") {
          flags.bossArmorTimer = Math.max(0, (flags.bossArmorTimer ?? 0) - dt);
          if (flags.bossArmorTimer <= 0) {
            flags.bossState = "ARMORED";
            soundEngine.playArmorDeflect();
            pushBanner(
              `${bossName}'s Outer Carapace Regenerated!`,
              `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3], War-Hammer [T / 8], or Bomb [B / 4] to crack his shell again!`,
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

          const nextBx = Math.max(bossMinX, Math.min(bossMaxX, enemy.x + stalkVx * dt));
          const nextBz = Math.max(bossMinZ, Math.min(bossMaxZ, enemy.z + stalkVz * dt));
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
            const targetX = Math.max(bossMinX, Math.min(bossMaxX, hero.x));
            const targetZ = Math.max(bossMinZ + 0.5, Math.min(bossMaxZ, hero.z));
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

            // Cryos (Map 4), Vaelkor (Map 5), Skorpius (Map 6), & Pyrax (Map 7) also fire a direct Bolt that can be blocked or Mirror-Shield Reflected!
            if (
              zone === "caverns" ||
              zone === "citadel" ||
              zone === "desert" ||
              zone === "caldera"
            ) {
              arrows.push({
                id: `boss-bolt-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
                zone,
                fromHero: false,
                isFrost: zone === "caverns",
                x: enemy.x + Math.sin(enemy.facing) * 1.35,
                z: enemy.z + Math.cos(enemy.facing) * 1.35,
                angle: enemy.facing,
                speed: 13.5,
                damage: enemy.damage,
                lifeTimer: 2.2,
              });
            }

            if (isCurrentBossPhase2) {
              const offsetAngle = enemy.facing + 0.45;
              const tX2 = Math.max(
                bossMinX,
                Math.min(bossMaxX, hero.x + Math.sin(offsetAngle) * 3.8)
              );
              const tZ2 = Math.max(
                bossMinZ + 0.5,
                Math.min(bossMaxZ, hero.z + Math.cos(offsetAngle) * 3.8)
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

          const minBarrierZ = isEastSanctumBoss ? 6.0 : 12.85;
          const hitArenaBoundary =
            nextBz - enemyRadius < minBarrierZ ||
            (isEastSanctumBoss && nextBx - enemyRadius < bossMinX);
          const resolvedB = resolveWorldCollisions(
            isEastSanctumBoss ? Math.max(bossMinX + enemyRadius, nextBx) : nextBx,
            Math.max(minBarrierZ + enemyRadius, nextBz),
            enemyRadius,
            zone,
            gatePassable,
            dynamicObstacles,
            bossExitOpen
          );
          enemy.x = resolvedB.x;
          enemy.z = resolvedB.z;

          if (resolvedB.hitObstacle || hitArenaBoundary) {
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
                "Phase 1: Burn his shell with the Flame Rod [R / 3] or Bomb [B / 4], then shoot his Open Eye with Bow [E]!",
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
              `Phase 1: Shoot ${bossName} with your Flame Rod [R / 3] or Bomb [B / 4] to crack his shell again!`,
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
            Math.max(bossMinX, hero.x + pushOutX * minBossSep),
            Math.max(bossMinZ, hero.z + pushOutZ * minBossSep),
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

      // If stunned by Hero's Boomerang, Shovel, or Bomb, hold position briefly then resume aggro
      if (enemy.stunTimer > 0) {
        if (enemy.kind === "burrower") {
          enemy.burrowed = false;
        }
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
      // FROST WRAITH AI STATE MACHINE (Glides & Fires Chilling Frost Bolts!)
      // =====================================================
      if (enemy.kind === "wraith") {
        let moveVx = 0;
        let moveVz = 0;

        if (enemy.state === "idle") {
          const hoverAngle = stats.elapsedSeconds * 1.4 + i * 2.1;
          moveVx = Math.cos(hoverAngle) * (enemy.speed * 0.35);
          moveVz = Math.sin(hoverAngle) * (enemy.speed * 0.35);
          enemy.facing = Math.atan2(moveVx, moveVz);
          if (enemy.provoked || (!isBossRoomSealed(enemy) && distToHero <= enemy.aggroRadius)) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.4;
          }
        } else if (enemy.state === "aggro") {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          // Orbit & maintain 4.2..8.0 range while strafing
          const strafeSign = i % 2 === 0 ? 1 : -1;
          const perpX = distToHero > 0.05 ? (toHeroZ / distToHero) * strafeSign : 0;
          const perpZ = distToHero > 0.05 ? (-toHeroX / distToHero) * strafeSign : 0;
          if (distToHero < 4.2 && distToHero > 0.05) {
            moveVx = (-toHeroX / distToHero) * (enemy.speed * 0.85) + perpX * (enemy.speed * 0.45);
            moveVz = (-toHeroZ / distToHero) * (enemy.speed * 0.85) + perpZ * (enemy.speed * 0.45);
          } else if (distToHero > 8.0 && distToHero > 0.05) {
            moveVx = (toHeroX / distToHero) * (enemy.speed * 0.9) + perpX * (enemy.speed * 0.4);
            moveVz = (toHeroZ / distToHero) * (enemy.speed * 0.9) + perpZ * (enemy.speed * 0.4);
          } else {
            moveVx = perpX * (enemy.speed * 0.65);
            moveVz = perpZ * (enemy.speed * 0.65);
          }

          if (enemy.actionCooldown <= 0 && (distToHero <= 15.5 || enemy.provoked)) {
            enemy.state = "windup";
            enemy.stateTimer = 0.48;
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
        } else if (enemy.state === "windup") {
          if (distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
          if (enemy.stateTimer <= 0) {
            soundEngine.playFireballShoot(false);
            arrows.push({
              id: `wraith-frost-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              fromHero: false,
              isFrost: true,
              x: enemy.x + Math.sin(enemy.facing) * 0.85,
              z: enemy.z + Math.cos(enemy.facing) * 0.85,
              angle: enemy.facing,
              speed: 12.6,
              damage: enemy.damage,
              lifeTimer: 1.9,
            });
            enemy.state = "recover";
            enemy.stateTimer = 0.4;
            enemy.actionCooldown = 1.45;
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
        const resolvedWraith = resolveWorldCollisions(
          nextEx,
          nextEz,
          enemyRadius,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        enemy.x = resolvedWraith.x;
        enemy.z = resolvedWraith.z;
        continue;
      }

      // =====================================================
      // SAPPER GREMLIN ("bomber") AI STATE MACHINE (Lobs Live Catchable Bombs!)
      // =====================================================
      if (enemy.kind === "bomber") {
        let moveVx = 0;
        let moveVz = 0;

        if (enemy.state === "idle") {
          if (enemy.provoked || (!isBossRoomSealed(enemy) && distToHero <= enemy.aggroRadius)) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.55;
          }
        } else if (enemy.state === "aggro") {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          if (distToHero < 5.0 && distToHero > 0.05) {
            const kiteX = enemy.x - (toHeroX / distToHero) * 4.5;
            const kiteZ = enemy.z - (toHeroZ / distToHero) * 4.5;
            const nav = computePathfindingMoveDir(
              enemy.x,
              enemy.z,
              kiteX,
              kiteZ,
              enemyRadius,
              zone,
              gatePassable,
              dynamicObstacles
            );
            moveVx = nav.dirX * (enemy.speed * 0.92);
            moveVz = nav.dirZ * (enemy.speed * 0.92);
          } else if (distToHero > 9.5) {
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

          if (enemy.actionCooldown <= 0 && distToHero <= 12.5) {
            enemy.state = "windup";
            enemy.stateTimer = 0.62;
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
        } else if (enemy.state === "windup") {
          if (distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
          if (enemy.stateTimer <= 0) {
            soundEngine.playBombPlace();
            const throwDist = Math.min(8.5, Math.max(2.8, distToHero * 0.88));
            const flightTime = 0.72;
            const dirX = Math.sin(enemy.facing);
            const dirZ = Math.cos(enemy.facing);
            activeBombs.push({
              id: `sapper-bomb-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: enemy.x + dirX * 0.65,
              z: enemy.z + dirZ * 0.65,
              y: 1.05,
              vx: (dirX * throwDist) / flightTime,
              vz: (dirZ * throwDist) / flightTime,
              vy: 6.4,
              fuseTimer: 2.25,
              maxFuseTimer: 2.25,
              exploded: false,
            });
            enemy.state = "recover";
            enemy.stateTimer = 0.65;
            enemy.actionCooldown = 2.65;
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
        const resolvedBomber = resolveWorldCollisions(
          nextEx,
          nextEz,
          enemyRadius,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        enemy.x = resolvedBomber.x;
        enemy.z = resolvedBomber.z;
        continue;
      }

      // =====================================================
      // SUBTERRANEAN TUNNEL WYRM ("burrower") AI STATE MACHINE
      // =====================================================
      if (enemy.kind === "burrower") {
        let moveVx = 0;
        let moveVz = 0;

        if (enemy.state === "idle") {
          enemy.burrowed = true;
          if (enemy.provoked || (!isBossRoomSealed(enemy) && distToHero <= enemy.aggroRadius)) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.85;
          }
        } else if (enemy.state === "aggro") {
          enemy.burrowed = true;
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          if (distToHero > 4.2) {
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
          } else if (distToHero < 2.6 && distToHero > 0.05) {
            moveVx = (-toHeroX / distToHero) * (enemy.speed * 0.75);
            moveVz = (-toHeroZ / distToHero) * (enemy.speed * 0.75);
          }

          if (enemy.actionCooldown <= 0 && distToHero <= 11.5) {
            // Pop up from underground!
            enemy.burrowed = false;
            enemy.state = "windup";
            enemy.stateTimer = 0.75;
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
            soundEngine.playShovelDig(false);
            bushBursts.push({
              id: `wyrm-surface-${enemy.id}-${stats.elapsedSeconds.toFixed(3)}`,
              zone,
              x: enemy.x,
              z: enemy.z,
              timer: 0.65,
              maxTimer: 0.65,
              seed: Math.floor(stats.elapsedSeconds * 130),
              isDirt: true,
            });
          }
        } else if (enemy.state === "windup") {
          enemy.burrowed = false;
          if (distToHero > 0.05) {
            enemy.chargeAngle = Math.atan2(toHeroX, toHeroZ);
            enemy.facing = enemy.chargeAngle;
          }
          if (enemy.stateTimer <= 0) {
            enemy.state = "attack";
            enemy.stateTimer = 0.25;
            soundEngine.playRockSpit();
            const spreadOffsets = [-0.26, 0, 0.26];
            for (const angleOff of spreadOffsets) {
              const shotAngle = enemy.facing + angleOff;
              arrows.push({
                id: `wyrm-rock-${enemy.id}-${angleOff}-${stats.elapsedSeconds.toFixed(3)}`,
                zone,
                fromHero: false,
                isRock: true,
                x: enemy.x + Math.sin(shotAngle) * 0.85,
                z: enemy.z + Math.cos(shotAngle) * 0.85,
                angle: shotAngle,
                speed: 11.8,
                damage: enemy.damage,
                lifeTimer: 1.75,
              });
            }
          }
        } else if (enemy.state === "attack") {
          enemy.burrowed = false;
          if (enemy.stateTimer <= 0) {
            enemy.state = "recover";
            enemy.stateTimer = 1.15;
            enemy.actionCooldown = 1.75;
          }
        } else if (enemy.state === "recover") {
          enemy.burrowed = false;
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
            enemy.burrowed = true;
            soundEngine.playShovelDig(false);
          }
        } else if (enemy.state === "stunned") {
          enemy.burrowed = false;
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
            enemy.actionCooldown = 1.1;
          }
        }

        const nextEx = enemy.x + (moveVx + enemy.knockbackVx) * dt;
        const nextEz = enemy.z + (moveVz + enemy.knockbackVz) * dt;
        enemy.knockbackVx *= Math.exp(-10 * dt);
        enemy.knockbackVz *= Math.exp(-10 * dt);
        const resolvedWyrm = resolveWorldCollisions(
          nextEx,
          nextEz,
          enemyRadius,
          zone,
          gatePassable,
          dynamicObstacles,
          bossExitOpen
        );
        enemy.x = resolvedWyrm.x;
        enemy.z = resolvedWyrm.z;
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

    // 11. Check if Boss Ignis (Map 2), Boss Cryos (Map 4), or Boss Vaelkor (Map 5) are defeated!
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

    if (zone === "caverns" && !flags.cavernBossDefeated) {
      const cavernBossEnemy = enemies.find((e) => e.zone === "caverns" && e.kind === "boss");
      if (cavernBossEnemy && cavernBossEnemy.state === "dead") {
        flags.cavernBossDefeated = true;
        flags.cavernWardensCleared = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        if (!flags.cavernBossHeartAwarded) {
          flags.cavernBossHeartAwarded = true;
          hero.maxHp += 2;
          hero.hp = hero.maxHp;
          hero.damageFractionAcc = 0;
        }
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Cryos, the Glacial Colossus Vanquished! (+1 Full Heart Container!)",
          "Max HP permanently increased & the Glacial Crest Key Pedestal is unsealed! Claim the key at the East Sanctum Pedestal!",
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

    if (zone === "desert" && !flags.desertBossDefeated) {
      const desertBossEnemy = enemies.find((e) => e.zone === "desert" && e.kind === "boss");
      if (desertBossEnemy && desertBossEnemy.state === "dead") {
        flags.desertBossDefeated = true;
        flags.desertWardensCleared = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        if (!flags.desertBossHeartAwarded) {
          flags.desertBossHeartAwarded = true;
          hero.maxHp += 2;
          hero.hp = hero.maxHp;
          hero.damageFractionAcc = 0;
        }
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Skorpius, the Sun-Scorpion Behemoth Vanquished! (+1 Full Heart Container!)",
          "Max HP permanently increased & the Solar Crest Key Pedestal is unsealed! Claim the key at the East Sun Temple Pedestal!",
          7.0
        );
      }
    }

    if (zone === "caldera" && !flags.calderaBossDefeated) {
      const calderaBossEnemy = enemies.find((e) => e.zone === "caldera" && e.kind === "boss");
      const aliveCalderaMinions = enemies.filter(
        (e) => e.zone === "caldera" && e.kind === "minion" && e.spawnZ > 13 && e.state !== "dead"
      );
      if (
        calderaBossEnemy &&
        calderaBossEnemy.state === "dead" &&
        aliveCalderaMinions.length === 0
      ) {
        flags.calderaBossDefeated = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        if (!flags.calderaBossHeartAwarded) {
          flags.calderaBossHeartAwarded = true;
          hero.maxHp += 2;
          hero.hp = hero.maxHp;
          hero.damageFractionAcc = 0;
        }
        dynamicObstacles = getActiveObstacles(mapProps);
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Pyrax, the Magma Wyrm Vanquished! (+1 Full Heart Container!)",
          "Open Dragon's Peak Relic Chest (+1 Heart Container + 300 Rupees) and step through the North Golden Return Portal!",
          7.5
        );
      }
    }

    if (zone === "atoll" && !flags.atollBossDefeated) {
      const atollBossEnemy = enemies.find((e) => e.zone === "atoll" && e.kind === "boss");
      if (atollBossEnemy && atollBossEnemy.state === "dead") {
        flags.atollBossDefeated = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Nereus, the Abyssal Leviathan Vanquished!",
          "The Leviathan's Tidal Hoard Chest (-6.5, 31.5) is unsealed — claim +1 Heart Container, +3 Monster Cores & +150 Rupees!",
          7.0
        );
      }
    }

    if (zone === "hollow" && !flags.hollowBossDefeated) {
      const hollowBossEnemy = enemies.find((e) => e.zone === "hollow" && e.kind === "boss");
      if (hollowBossEnemy && hollowBossEnemy.state === "dead") {
        flags.hollowBossDefeated = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Mycelion, the Spore Behemoth Vanquished!",
          "The Mycelial Crown Hoard Chest (-6.5, 31.5) is unsealed — claim +1 Heart Container, +3 Monster Cores & +200 Rupees!",
          7.0
        );
      }
    }

    if (zone === "sky" && !flags.skyBossDefeated) {
      const skyBossEnemy = enemies.find((e) => e.zone === "sky" && e.kind === "boss");
      if (skyBossEnemy && skyBossEnemy.state === "dead") {
        flags.skyBossDefeated = true;
        flags.bossState = "DEAD";
        flags.bossArmorTimer = 0;
        soundEngine.playVictoryFanfare();
        soundEngine.playGateUnlock();
        pushBanner(
          "Astraea, the Starlight Archon Vanquished!",
          "The Starlight Pantheon Hoard Chest (-6.5, 31.5) is unsealed — claim +1 Heart Container, +5 Monster Cores & +350 Rupees!",
          7.5
        );
      }
    }

    // 12. Rupee & Recovery Heart Magnet & Pickup (waits until initial pop-up bounce settles so player sees drops!)
    const magnetRange = hero.activeCompanion === "gold_sprite" ? 8.5 : 2.6;
    const magnetSpeed = hero.activeCompanion === "gold_sprite" ? 12.5 : 7.5;
    const rupeeValueMult =
      1 +
      (hero.activeCompanion === "gold_sprite" ? 0.5 : 0) +
      (hasRelic("greed_crown") ? 0.5 : 0) +
      (hasHomesteadWing("trophy_vault") ? 0.25 : 0) +
      (activeWeather === "starfall" ? 0.5 : 0) +
      (activeWeather === "blood_moon" ? 1.0 : 0);

    for (const rupee of rupees) {
      if (rupee.zone !== zone || rupee.collected) continue;
      if ((rupee.spawnBounceTimer ?? 0) > 0.14) continue;
      const dx = hero.x - rupee.x;
      const dz = hero.z - rupee.z;
      const dist = Math.hypot(dx, dz);
      if (dist < magnetRange && dist > 0.05) {
        rupee.x += (dx / dist) * magnetSpeed * dt;
        rupee.z += (dz / dist) * magnetSpeed * dt;
      }
      if (dist < 1.25) {
        rupee.collected = true;
        if (rupee.tier === "heart") {
          hero.hp = Math.min(hero.maxHp, hero.hp + (rValue(rupee.value)));
        } else {
          hero.rupees += Math.max(1, Math.round(rupee.value * rupeeValueMult));
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
      const nearHookshotChest =
        zone === "frontier" &&
        !flags.frontierHookshotChestOpened &&
        Math.hypot(FRONTIER_HOOKSHOT_CHEST_POS.x - hero.x, FRONTIER_HOOKSHOT_CHEST_POS.z - hero.z) <= 5.5;
      const nearHammerChest =
        zone === "caverns" &&
        !flags.cavernHammerChestOpened &&
        Math.hypot(CAVERN_HAMMER_CHEST_POS.x - hero.x, CAVERN_HAMMER_CHEST_POS.z - hero.z) <= 5.5;
      const nearDesertOasisChest =
        zone === "desert" &&
        !flags.desertOasisChestOpened &&
        Math.hypot(DESERT_OASIS_CHEST_POS.x - hero.x, DESERT_OASIS_CHEST_POS.z - hero.z) <= 5.5;
      const nearDesertSolarKey =
        zone === "desert" &&
        !flags.desertSolarKeyPickedUp &&
        Math.hypot(DESERT_SOLAR_KEY_POS.x - hero.x, DESERT_SOLAR_KEY_POS.z - hero.z) <= 6.5;
      const nearDesertCalderaGate =
        zone === "desert" &&
        !flags.desertCalderaGateUnlocked &&
        Math.hypot(DESERT_CALDERA_GATE_POS.x - hero.x, DESERT_CALDERA_GATE_POS.z - hero.z) <= 5.5;
      const nearCalderaForgeChest =
        zone === "caldera" &&
        !flags.calderaForgeChestOpened &&
        Math.hypot(CALDERA_FORGE_CHEST_POS.x - hero.x, CALDERA_FORGE_CHEST_POS.z - hero.z) <= 5.5;
      const nearCalderaBossGate =
        zone === "caldera" &&
        !flags.calderaGateUnlocked &&
        Math.hypot(CALDERA_BOSS_GATE_POS.x - hero.x, CALDERA_BOSS_GATE_POS.z - hero.z) <= 5.5;
      const nearCalderaVictoryChest =
        zone === "caldera" &&
        !flags.calderaVictoryChestOpened &&
        Math.hypot(CALDERA_VICTORY_CHEST_POS.x - hero.x, CALDERA_VICTORY_CHEST_POS.z - hero.z) <= 5.5;
      const nearRustedPeg = mapProps.find(
        (p) =>
          p.zone === zone &&
          p.prefab === "rusted_peg" &&
          !p.pounded &&
          Math.hypot(p.x - hero.x, p.z - hero.z) <= 3.6
      );
      const nearGrapplePost =
        hero.hasHookshot &&
        mapProps.find(
          (p) =>
            p.zone === zone &&
            p.prefab === "grapple_post" &&
            Math.hypot(p.x - hero.x, p.z - hero.z) >= 2.2 &&
            Math.hypot(p.x - hero.x, p.z - hero.z) <= 13.0
        );

      if (nearGroundBomb) {
        hero.interactPrompt = "Press [F] or [B] to Lift & Throw Bomb";
      } else if (nearLiftable) {
        hero.interactPrompt =
          nearLiftable.prefab === "clay_pot"
            ? "Press [F] to Lift Clay Pot"
            : "Press [F] to Lift Light Rock";
      } else if (nearHookshotChest) {
        hero.interactPrompt =
          "Cliffside Reliquary Chest — Defeat the Ridge Sentry & Walk Up to Open!";
      } else if (nearHammerChest) {
        hero.interactPrompt =
          "Glacial Forge Reliquary Chest — Defeat the Ice Sentinel & Walk Up to Open!";
      } else if (nearDesertOasisChest) {
        hero.interactPrompt =
          "Mirage Oasis Chest — Clear the Subterranean Guardian & Walk Up to Open!";
      } else if (nearDesertSolarKey) {
        hero.interactPrompt =
          flags.desertCrystalPuzzleSolved || flags.desertWardensCleared || flags.desertBossDefeated
            ? "Solar Crest Key Pedestal — Walk Up or Snag from Afar!"
            : "Solar Crest Key Pedestal (Sealed) — Solve the East Pyramid Trials to Unseal!";
      } else if (nearDesertCalderaGate) {
        hero.interactPrompt =
          flags.hasSolarKey || flags.desertSolarKeyPickedUp
            ? "Eastern Canyon Gate Ready — Walk Forward to Unlock!"
            : "Eastern Canyon Gate (Locked) — Requires the Solar Crest Key from the Eastern Pyramid!";
      } else if (nearCalderaForgeChest) {
        hero.interactPrompt =
          "Magma Forge Reliquary Chest — Defeat the Forge Sentinel & Walk Up to Open!";
      } else if (nearCalderaBossGate) {
        hero.interactPrompt =
          "Northern Peak Sanctum Gate — Complete the Central Caldera Trials to Unseal!";
      } else if (nearCalderaVictoryChest) {
        hero.interactPrompt = flags.calderaBossDefeated
          ? "Northern Peak Reliquary Chest (Unsealed!) — Walk Up to Claim!"
          : "Northern Peak Reliquary Chest (Sealed) — Overcome the Peak's Guardian to Unseal!";
      } else if (nearRustedPeg) {
        hero.interactPrompt = hero.hasHammer
          ? "Rusted Iron Stake — Press [T] or [8] to Pound Flat!"
          : "Rusted Iron Stake — Requires a Heavy Forged Relic to Pound Flat.";
      } else if (nearSecretStash) {
        hero.interactPrompt =
          "Hidden Cliffside Chest — Walk Up to Claim Treasure!";
      } else if (nearElderRowan) {
        hero.interactPrompt = flags.heirloomQuestClaimed
          ? "Elder Rowan — Press [F] to Chat (Heirloom Recovered!)"
          : flags.heirloomMonstersCleared
          ? "Elder Rowan — Step Closer to Return the Recovered Heirloom!"
          : "Elder Rowan — Press [F] to Hear His Request";
      } else if (nearScoutLyra) {
        hero.interactPrompt =
          "Scout Lyra (Wayfinder Guide) — Press [F] for Regional Rumors, or [N] for the Golden Path!";
      } else if (nearLockedEntryGate) {
        hero.interactPrompt =
          flags.keyPickedUp || hero.hasDungeonKey
            ? "Northern Sanctum Gate — Walk Forward to Unlock!"
            : "Northern Sanctum Gate (Locked) — Seek the Key in the Western Forest Grove!";
      } else if (nearDgSmallKeyAcrossGap) {
        hero.interactPrompt =
          "Small Key on Pedestal Across Chasm — Use a Ranged Tool to Snag Across the Gap!";
      } else if (nearDgEastDoor) {
        hero.interactPrompt = flags.hasSmallKey
          ? "East Wing Door — Walk Forward to Unlock with Your Small Key!"
          : "East Wing Door (Locked) — Requires a Small Key from the Western Gallery!";
      } else if (nearFireRodChest) {
        hero.interactPrompt =
          "Sealed Sanctum Reliquary — Defeat the Chamber's 3 Defenders & Walk Up to Open!";
      } else if (nearBigKeyChest) {
        hero.interactPrompt = flags.dungeonEyeStatuesSolved
          ? "Ornate Vault Chest (Unsealed!) — Walk Up to Open!"
          : "Ornate Vault Chest (Sealed) — Illuminate the Crypt & Pierce the Watchful Stone Eye!";
      } else if (nearNorthBossGate) {
        hero.interactPrompt =
          flags.dungeonTimedTorchSolved && flags.hasBigKey
            ? "Inner Sanctum Gate Ready — Step Forward to Unlock!"
            : `Inner Sanctum Gate (Locked) — Requires 4 Hub Braziers (${flags.dungeonTimedTorchSolved ? "LIT" : "Unlit"}) + Ornate Sanctum Key (${flags.hasBigKey ? "READY" : "Missing"})!`;
      } else if (nearBridgeTurret) {
        hero.interactPrompt =
          "Stone Spitter Turret — Hold Shield [RMB / Shift] while crossing to deflect projectiles!";
      } else if (nearGroveKey) {
        hero.interactPrompt =
          "Shrine Key Pedestal — Walk Up or Snag from Afar to Claim!";
      } else if (nearGroveSwitch) {
        hero.interactPrompt =
          "Grove Crystal Switch — Strike the Orb Across the Stream (or Clear the Ambush) to Open the Shrine!";
      } else if (nearWaterGapRupee) {
        hero.interactPrompt =
          "Gem Across the Water — Use a Ranged Tool to Snag It!";
      } else if (nearEyeStatue) {
        hero.interactPrompt =
          "Watchful Stone Eye — Pierce its Open Gaze with a Ranged Shot [E / 2]!";
      } else if (nearShockEnemy) {
        hero.interactPrompt =
          "Armored Spiked Beetle — Stun Before Slashing!";
      } else if (nearBountyEnemy) {
        hero.interactPrompt =
          "Golden Bounty Monster — Defeat for Rich Rupee Spoils!";
      } else if (nearCrackedRock) {
        hero.interactPrompt =
          hero.hasHammer
            ? "Cracked Boulder — Shatter with Heavy Impact [T] or Explosive [B]!"
            : (hero.maxBombs ?? 0) > 0
            ? "Cracked Boulder — Press [B] to Place an Explosive!"
            : "Cracked Boulder — Fractured stone that could be shattered with explosives or heavy force.";
      } else if (nearBurnableBarrier) {
        hero.interactPrompt =
          nearBurnableBarrier.prefab === "spiderweb_barrier"
            ? hero.hasFireRod
              ? "Thick Cobwebs — Ignite with Fire [R] to Clear the Passage!"
              : "Thick Cobwebs — Dry webs that could be burned away with fire."
            : hero.hasFireRod
            ? "Dry Briar Thicket — Ignite with Fire [R] to Clear!"
            : "Dry Briar Thicket — Parched thorns that could be burned away with fire.";
      } else if (nearUnlitTorch) {
        hero.interactPrompt =
          (nearUnlitTorch.timedDuration ?? 0) > 0
            ? `Timed Ritual Brazier (${nearUnlitTorch.timedDuration}s) — Ignite All 4 Before the Flames Fade!`
            : hero.hasFireRod
            ? "Unlit Brazier — Shoot with Fire [R] to Ignite!"
            : "Unlit Brazier — Cold iron waiting for a spark of flame.";
      } else if (nearGrapplePost) {
        hero.interactPrompt =
          "Anchor Post — Face Post & Press [H] or [7] to Grapple Across!";
      } else {
        const warpMeta = WARP_STONE_META[zone];
        if (Math.hypot(warpMeta.x - hero.x, warpMeta.z - hero.z) <= 3.6) {
          hero.interactPrompt =
            "Ancient Warp Monolith (Awakened) — Press [M] or [F] to Open World Atlas & Fast-Travel!";
        } else if (
          zone === "overworld" &&
          Math.hypot(FORGE_ANVIL_POS.x - hero.x, FORGE_ANVIL_POS.z - hero.z) <= 3.6
        ) {
          hero.interactPrompt =
            "Master Smith Torvin's Runic Anvil — Press [U] or [F] to Enchant Weapons with Monster Cores!";
        } else if (
          zone === "overworld" &&
          Math.hypot(RIFT_ENTRANCE_POS.x - hero.x, RIFT_ENTRANCE_POS.z - hero.z) <= 3.6
        ) {
          hero.interactPrompt =
            "Abyssal Rift Obelisk — Press [P] or [F] to Enter the Endless Procedural Labyrinth!";
        } else if (
          zone === "overworld" &&
          Math.hypot(COMPANION_ALTAR_POS.x - hero.x, COMPANION_ALTAR_POS.z - hero.z) <= 3.6
        ) {
          hero.interactPrompt =
            "Spirit Companion Sanctuary & Ancient Relic Vault — Press [K] or [F] to Summon Companions & Equip Relics!";
        } else if (
          zone === "overworld" &&
          Math.hypot(MOUNT_STABLES_POS.x - hero.x, MOUNT_STABLES_POS.z - hero.z) <= 3.8
        ) {
          hero.interactPrompt =
            "Crossroads Royal Stables (Stablemaster Garrick) — Press [F] to Open Stables, or [Y] to Whistle Your Steed!";
        } else if (
          zone === "overworld" &&
          Math.hypot(COLOSSEUM_GATE_POS.x - hero.x, COLOSSEUM_GATE_POS.z - hero.z) <= 3.8
        ) {
          hero.interactPrompt =
            "Grand Colosseum War-Gate & Horn Monument — Press [F] or [O] to Enter the 3-Tier Gladiatorial Boss-Rush & Wave Survival Gauntlet!";
        } else if (
          zone === "overworld" &&
          Math.hypot(ALCHEMY_CAULDRON_POS.x - hero.x, ALCHEMY_CAULDRON_POS.z - hero.z) <= 3.8
        ) {
          hero.interactPrompt =
            "Apothecary Selene's Alchemy Cauldron — Press [F] or [ [ ] to Brew & Quaff 90s Buff Elixirs from Foraged Herbs!";
        } else if (
          zone === "overworld" &&
          Math.hypot(WEATHER_OBELISK_POS.x - hero.x, WEATHER_OBELISK_POS.z - hero.z) <= 3.8
        ) {
          hero.interactPrompt =
            "Sky-Seer Lyra's Celestial Weather & Blood-Moon Sundial — Press [F] or [ ] ] to Command World Weather & Invasions!";
        } else if (
          zone === "overworld" &&
          Math.hypot(HOMESTEAD_POS.x - hero.x, HOMESTEAD_POS.z - hero.z) <= 4.0
        ) {
          hero.interactPrompt =
            "Hero's Homestead Manor, Boss Trophy Hall & 3D Fishing Pond — Press [F] or [ \\ ] to Enter Manor & Cast Fishing Line!";
        } else if (
          zone === "rift" &&
          flags.riftNextFloorPos &&
          Math.hypot(flags.riftNextFloorPos.x - hero.x, flags.riftNextFloorPos.z - hero.z) <= 3.4
        ) {
          hero.interactPrompt = flags.riftBossDefeated
            ? `Descent Portal Ready — Step In or Press [F] to Descend to Floor ${(flags.riftDepth ?? 1) + 1}!`
            : "Descent Portal (Sealed) — Vanquish the Floor's Rift Guardian Boss to Unseal!";
        } else {
          hero.interactPrompt = null;
        }
      }
    }

    let warpBeamTimer = Math.max(0, (state.warpBeamTimer ?? 0) - dt);
    let atlasOpen = state.atlasOpen;
    let forgeOpen = state.forgeOpen;
    let riftOpen = state.riftOpen;
    let sanctuaryOpen = state.sanctuaryOpen;
    let stablesOpen = state.stablesOpen;
    let colosseumOpen = state.colosseumOpen;
    let alchemyOpen = state.alchemyOpen;
    let weatherOpen = state.weatherOpen;
    let homesteadOpen = state.homesteadOpen;
    if (
      zone === "overworld" &&
      Math.hypot(FORGE_ANVIL_POS.x - hero.x, FORGE_ANVIL_POS.z - hero.z) <= 3.5 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      forgeOpen = true;
      atlasOpen = false;
      shopOpen = false;
      riftOpen = false;
      sanctuaryOpen = false;
      stablesOpen = false;
      colosseumOpen = false;
      alchemyOpen = false;
      weatherOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(RIFT_ENTRANCE_POS.x - hero.x, RIFT_ENTRANCE_POS.z - hero.z) <= 3.5 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      riftOpen = true;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
      sanctuaryOpen = false;
      stablesOpen = false;
      colosseumOpen = false;
      alchemyOpen = false;
      weatherOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(COMPANION_ALTAR_POS.x - hero.x, COMPANION_ALTAR_POS.z - hero.z) <= 3.5 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      sanctuaryOpen = true;
      riftOpen = false;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
      stablesOpen = false;
      colosseumOpen = false;
      alchemyOpen = false;
      weatherOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(MOUNT_STABLES_POS.x - hero.x, MOUNT_STABLES_POS.z - hero.z) <= 3.8 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      stablesOpen = true;
      sanctuaryOpen = false;
      riftOpen = false;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
      colosseumOpen = false;
      alchemyOpen = false;
      weatherOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(COLOSSEUM_GATE_POS.x - hero.x, COLOSSEUM_GATE_POS.z - hero.z) <= 3.8 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      colosseumOpen = true;
      stablesOpen = false;
      sanctuaryOpen = false;
      riftOpen = false;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
      alchemyOpen = false;
      weatherOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(ALCHEMY_CAULDRON_POS.x - hero.x, ALCHEMY_CAULDRON_POS.z - hero.z) <= 3.8 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      alchemyOpen = true;
      colosseumOpen = false;
      stablesOpen = false;
      sanctuaryOpen = false;
      riftOpen = false;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
      weatherOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(WEATHER_OBELISK_POS.x - hero.x, WEATHER_OBELISK_POS.z - hero.z) <= 3.8 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      weatherOpen = true;
      alchemyOpen = false;
      colosseumOpen = false;
      stablesOpen = false;
      sanctuaryOpen = false;
      riftOpen = false;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
      homesteadOpen = false;
    } else if (
      zone === "overworld" &&
      Math.hypot(HOMESTEAD_POS.x - hero.x, HOMESTEAD_POS.z - hero.z) <= 4.0 &&
      input.interactPressed &&
      !hero.heldObject
    ) {
      homesteadOpen = true;
      weatherOpen = false;
      alchemyOpen = false;
      colosseumOpen = false;
      stablesOpen = false;
      sanctuaryOpen = false;
      riftOpen = false;
      forgeOpen = false;
      atlasOpen = false;
      shopOpen = false;
    }

    // =========================================================
    // DIABLO-STYLE PROCEDURAL RIFT & GRAND COLOSSEUM INTERACTIONS
    // =========================================================
    if (zone === "rift") {
      if (flags.colosseumActive) {
        const aliveColosseumFoes = enemies.filter(
          (e) => e.zone === "rift" && e.state !== "dead"
        );
        if (aliveColosseumFoes.length === 0) {
          const curWave = flags.colosseumWave ?? 1;
          const totalWaves = flags.colosseumTotalWaves ?? 3;
          const tier: ColosseumTierId = flags.colosseumTier ?? "bronze";
          if (curWave < totalWaves) {
            const nextWave = curWave + 1;
            flags.colosseumWave = nextWave;
            flags.bossState = "ARMORED";
            flags.bossArmorTimer = 0;
            flags.riftBossDefeated = false;
            const baseTitle =
              tier === "gold"
                ? "Grand Colosseum • Gold Sovereign Boss-Rush"
                : tier === "silver"
                ? "Grand Colosseum • Silver Blood-Pit Trial"
                : "Grand Colosseum • Bronze Vanguard Trial";
            flags.riftBiomeTitle = `${baseTitle} (Wave ${nextWave}/${totalWaves})`;

            hero.hp = Math.min(hero.maxHp, hero.hp + 4);
            hero.mp = Math.min(hero.maxMp, (hero.mp ?? 100) + 40);
            const nextWaveEnemies = buildColosseumWaveEnemies(tier, nextWave);
            for (let idx = enemies.length - 1; idx >= 0; idx--) {
              if (enemies[idx].zone === "rift") {
                enemies.splice(idx, 1);
              }
            }
            enemies.push(...nextWaveEnemies);
            soundEngine.playSecretSolve();
            soundEngine.playGateUnlock();
            banner = {
              id: Date.now(),
              text:
                nextWave === totalWaves
                  ? `👑 COLOSSEUM FINAL WAVE ${nextWave}/${totalWaves}: ARENA CHAMPION AWAKENS!`
                  : `⚔ COLOSSEUM WAVE ${nextWave}/${totalWaves} UNLEASHED! (+2 Hearts & +40 MP Restored)`,
              subtext:
                nextWave === totalWaves
                  ? `Crack ${flags.riftBossName ?? "the Champion"}'s shell [R/T/B], shoot the Open Eye [E/Q], and punish with your Sword!`
                  : "Vanquish all challengers to advance to the Final Champion Wave!",
              timer: 5.2,
            };
          } else {
            flags.colosseumActive = false;
            flags.riftBossDefeated = true;
            flags.bossState = "DEAD";
            const prevCompleted = flags.colosseumCompletedTiers ?? [];
            const isFirstClear = !prevCompleted.includes(tier);
            if (isFirstClear) {
              flags.colosseumCompletedTiers = [...prevCompleted, tier];
            }

            const rewardCores = tier === "gold" ? 12 : tier === "silver" ? 7 : 4;
            const rewardRupees = tier === "gold" ? 800 : tier === "silver" ? 450 : 250;
            hero.monsterCores = (hero.monsterCores ?? 0) + rewardCores;
            hero.rupees += rewardRupees;

            let firstClearBonusText = "";
            if (isFirstClear) {
              hero.maxHp = Math.min(40, hero.maxHp + 2);
              if (tier === "silver") {
                hero.maxMp = (hero.maxMp || 100) + 25;
                firstClearBonusText = " + First-Clear: +1 Heart Container & +25 Max MP!";
              } else if (tier === "gold") {
                hero.swordDamage = (hero.swordDamage ?? 1) + 1;
                firstClearBonusText =
                  " + First-Clear: +1 Heart Container & +1 Permanent Sword DMG!";
              } else {
                firstClearBonusText = " + First-Clear: +1 Heart Container!";
              }
            }
            hero.hp = hero.maxHp;
            hero.mp = hero.maxMp;
            soundEngine.playVictoryFanfare();
            soundEngine.playGateUnlock();
            banner = {
              id: Date.now(),
              text: `🏆 GRAND COLOSSEUM ${tier.toUpperCase()} TRIAL CONQUERED!`,
              subtext: `Earned +${rewardCores} Monster Cores (✦) & +${rewardRupees} Rupees${firstClearBonusText} Open the Center Hoard Chest!`,
              timer: 6.8,
            };
          }
        }
      }
      if (
        flags.riftShrinePos &&
        !flags.riftShrineClaimed &&
        Math.hypot(flags.riftShrinePos.x - hero.x, flags.riftShrinePos.z - hero.z) <= 2.2
      ) {
        flags.riftShrineClaimed = true;
        hero.hp = hero.maxHp;
        hero.mp = hero.maxMp;
        hero.rupees += 35;
        hero.monsterCores = (hero.monsterCores ?? 0) + 2;
        soundEngine.playFairyRevive();
        banner = {
          id: Date.now(),
          text: "Abyssal Blessing Shrine Activated!",
          subtext: "Restored 100% Hearts & MP, +2 Monster Cores (✦), and +35 Rupees!",
          timer: 4.5,
        };
      }

      if (
        flags.riftVaultChestPos &&
        !flags.riftVaultChestOpened &&
        Math.hypot(flags.riftVaultChestPos.x - hero.x, flags.riftVaultChestPos.z - hero.z) <= 2.2
      ) {
        flags.riftVaultChestOpened = true;
        hero.rupees += 75;
        hero.arrows += 10;
        hero.maxBombs = Math.max(hero.maxBombs || 20, 20);
        hero.bombs = Math.min(hero.maxBombs, (hero.bombs ?? 0) + 5);
        hero.monsterCores = (hero.monsterCores ?? 0) + 2;
        soundEngine.playVictoryFanfare();
        banner = {
          id: Date.now(),
          text: "Opened the Procedural Vault Chest!",
          subtext: "+75 Rupees, +2 Monster Cores (✦), +5 Bombs, and +10 Arrows!",
          timer: 4.5,
        };
      }

      if (
        flags.riftBossChestPos &&
        !flags.riftBossChestOpened &&
        Math.hypot(flags.riftBossChestPos.x - hero.x, flags.riftBossChestPos.z - hero.z) <= 2.3
      ) {
        if (flags.riftBossDefeated) {
          flags.riftBossChestOpened = true;
          const depth = flags.riftDepth ?? 1;
          const bonusRupees = 80 + depth * 35;
          hero.rupees += bonusRupees;
          hero.monsterCores = (hero.monsterCores ?? 0) + 4;
          hero.maxHp = Math.min(40, hero.maxHp + 2);
          hero.hp = hero.maxHp;
          soundEngine.playVictoryFanfare();
          banner = {
            id: Date.now(),
            text: `Claimed Depth ${depth} Rift Guardian Hoard!`,
            subtext: `+1 Heart Container, +4 Monster Cores (✦), and +${bonusRupees} Rupees! Step into the Descent Portal for Floor ${
              depth + 1
            }!`,
            timer: 5.5,
          };
        } else if (chestNoticeCooldown <= 0) {
          chestNoticeCooldown = 3.0;
          soundEngine.playGateLocked();
          banner = {
            id: Date.now(),
            text: "Rift Guardian Hoard Chest Sealed!",
            subtext: "Vanquish this floor's Rift Guardian Boss to unseal the hoard and Descent Portal!",
            timer: 3.5,
          };
        }
      }

      if (
        flags.riftNextFloorPos &&
        flags.riftBossDefeated &&
        hero.portalCooldown <= 0 &&
        Math.hypot(flags.riftNextFloorPos.x - hero.x, flags.riftNextFloorPos.z - hero.z) <= 2.1
      ) {
        const nextDepth = (flags.riftDepth ?? 1) + 1;
        set({
          hero,
          flags,
          stats,
        });
        get().enterProceduralRift(nextDepth);
        return;
      }
    }

    if (!flags.discoveredZones?.includes(zone)) {
      flags.discoveredZones = Array.from(
        new Set([...(flags.discoveredZones ?? ["overworld"]), zone])
      );
    }
    const currentWarpMeta = WARP_STONE_META[zone];
    if (Math.hypot(currentWarpMeta.x - hero.x, currentWarpMeta.z - hero.z) <= 3.4) {
      if (!flags.awakenedWarpZones?.includes(zone)) {
        flags.awakenedWarpZones = Array.from(
          new Set([...(flags.awakenedWarpZones ?? ["overworld"]), zone])
        );
        warpBeamTimer = 1.6;
        soundEngine.playHeartPickup();
        banner = {
          id: Math.floor(stats.elapsedSeconds * 1000) + Math.floor(Math.random() * 1000),
          text: `${currentWarpMeta.title} Awakened!`,
          subtext: `Press [M] anytime to Fast-Travel to ${currentWarpMeta.regionName} via the World Atlas!`,
          timer: 4.2,
        };
      } else if (input.interactPressed && !hero.heldObject) {
        atlasOpen = true;
      }
    }

    set({
      phase,
      zone,
      dungeonRoom,
      hero,
      enemies,
      boomerang,
      hookshot,
      hammerShockwaves,
      arrows,
      fireballs,
      fireZones,
      friendlyBees,
      lightningArcs,
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
      atlasOpen,
      forgeOpen,
      riftOpen,
      sanctuaryOpen,
      stablesOpen,
      colosseumOpen,
      alchemyOpen,
      weatherOpen,
      homesteadOpen,
      warpBeamTimer,
      shopDismissedOnRug,
      gateNoticeCooldown,
      chestNoticeCooldown,
      armorNoticeCooldown,
      ...(mapPropsMutated ? { mapProps } : {}),
    });
  },
}));
