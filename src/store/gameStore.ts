import { create } from "zustand";
import {
  BOSS_CHEST_POS,
  BOSS_MAX_LUNGE_RANGE,
  computeBossChargePathLength,
  DUNGEON_ENTRY_SPAWN,
  DUNGEON_EXIT_POS,
  DUNGEON_KEY_POS,
  DungeonRoomId,
  EnemyKind,
  HERO_SPAWN,
  INITIAL_ENEMIES,
  INITIAL_WORLD_RUPEES,
  LOCKED_GATE_POS,
  OVERWORLD_PORTAL_POS,
  OVERWORLD_RETURN_SPAWN,
  resolveWorldCollisions,
  RupeeTier,
  SHOP_INTERACT_POS,
  ZoneId,
} from "@/game/worldData";
import { soundEngine } from "@/audio/soundEngine";

export type GamePhase = "title" | "playing" | "gameover" | "victory";
export type ShopItemId = "boomerang" | "bow" | "arrows" | "heart";
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
  rupees: number;
  hasDungeonKey: boolean;
  hasBoomerang: boolean;
  hasBow: boolean;
  arrows: number;
  isAttacking: boolean;
  isBlocking: boolean;
  shieldAbsorbToggle: boolean;
  attackTimer: number;
  attackCooldown: number;
  bowCooldown: number;
  swingId: number;
  invulnerableTimer: number;
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
  // Boss-specific serializable combat state
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
}

export interface GameFlags {
  keyPickedUp: boolean;
  gateUnlocked: boolean;
  bossAwakened: boolean;
  bossPhase2: boolean;
  bossDefeated: boolean;
  chestUnlocked: boolean;
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
  blockHeld: boolean;
  boomerangPressed: boolean;
  bowPressed: boolean;
}

export interface SerializableGameState {
  phase: GamePhase;
  zone: ZoneId;
  dungeonRoom: DungeonRoomId;
  hero: HeroState;
  enemies: EnemyState[];
  boomerang: BoomerangState | null;
  arrows: ArrowProjectileState[];
  projectiles: BossProjectileState[];
  hazards: HazardZoneState[];
  rupees: RupeeItemState[];
  flags: GameFlags;
  stats: GameStats;
  banner: BannerMessage | null;
  nearShop: boolean;
  shopOpen: boolean;
  shopDismissedOnRug: boolean;
  gateNoticeCooldown: number;
  chestNoticeCooldown: number;
  armorNoticeCooldown: number;
  muted: boolean;
  fps: number;
}

export interface GameActions {
  startGame: () => void;
  restartGame: () => void;
  toggleMute: () => void;
  setFps: (fps: number) => void;
  setShopOpen: (open: boolean) => void;
  buyShopItem: (item: ShopItemId) => void;
  tick: (dt: number, input: FrameInput) => void;
}

export type GameStore = SerializableGameState & GameActions;

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
      rupees: 0,
      hasDungeonKey: false,
      hasBoomerang: false,
      hasBow: false,
      arrows: 0,
      isAttacking: false,
      isBlocking: false,
      shieldAbsorbToggle: false,
      attackTimer: 0,
      attackCooldown: 0,
      bowCooldown: 0,
      swingId: 0,
      invulnerableTimer: 0,
      knockbackVx: 0,
      knockbackVz: 0,
      walkCycle: 0,
    },
    enemies: createInitialEnemies(),
    boomerang: null,
    arrows: [],
    projectiles: [],
    hazards: [],
    rupees: createInitialRupees(),
    flags: {
      keyPickedUp: false,
      gateUnlocked: false,
      bossAwakened: false,
      bossPhase2: false,
      bossDefeated: false,
      chestUnlocked: false,
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
              "Visit Merchant Bramble's Shop to the East, find the Sanctum Key in the West, then breach the Northern Sanctum!",
            timer: 5.5,
          }
        : null,
    nearShop: false,
    shopOpen: false,
    shopDismissedOnRug: false,
    gateNoticeCooldown: 0,
    chestNoticeCooldown: 0,
    armorNoticeCooldown: 0,
    muted,
    fps,
  };
}

function normalizeAngleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState("title", false),

  startGame: () => {
    soundEngine.unlock();
    soundEngine.playKeyPickup();
    set((state) => createInitialState("playing", state.muted, state.fps));
  },

  restartGame: () => {
    soundEngine.unlock();
    soundEngine.playKeyPickup();
    set((state) => createInitialState("playing", state.muted, state.fps));
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
      shopDismissedOnRug: !open && state.nearShop,
    }));
  },

  buyShopItem: (item: ShopItemId) => {
    const state = get();
    const hero = { ...state.hero };

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
    }
  },

  tick: (rawDt: number, input: FrameInput) => {
    const state = get();
    if (state.phase !== "playing") return;

    const dt = Math.min(rawDt, 0.05);

    const hero: HeroState = { ...state.hero };
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

    const damageHero = (
      rawAmount: number,
      pushX: number,
      pushZ: number,
      isGroundHazard = false
    ) => {
      if (hero.invulnerableTimer > 0 || phase !== "playing") return;

      let finalDamage = rawAmount;
      let kbScale = 1.0;

      // Shield Block reduces normal attack & projectile damage by 50%
      if (hero.isBlocking && !isGroundHazard) {
        soundEngine.playShieldBlock();
        kbScale = 0.35;
        if (rawAmount >= 2) {
          finalDamage = Math.ceil(rawAmount * 0.5);
        } else {
          // For 1 half-heart attacks, alternate absorbing 0 and taking 1 (50% reduction!)
          hero.shieldAbsorbToggle = !hero.shieldAbsorbToggle;
          finalDamage = hero.shieldAbsorbToggle ? 0 : 1;
        }
      } else {
        soundEngine.playHeroHurt();
      }

      hero.hp = Math.max(0, hero.hp - finalDamage);
      hero.invulnerableTimer = 0.95;
      stats.damageTaken += finalDamage;
      hero.knockbackVx = pushX * kbScale;
      hero.knockbackVz = pushZ * kbScale;

      if (hero.hp <= 0) {
        phase = "gameover";
        soundEngine.playGameOver();
      }
    };

    let gateNoticeCooldown = Math.max(0, state.gateNoticeCooldown - dt);
    let chestNoticeCooldown = Math.max(0, state.chestNoticeCooldown - dt);
    let armorNoticeCooldown = Math.max(0, state.armorNoticeCooldown - dt);

    // 1. Update Hero Timers, Sword Attack, Shield Block, Boomerang & Bow
    hero.attackTimer = Math.max(0, hero.attackTimer - dt);
    hero.attackCooldown = Math.max(0, hero.attackCooldown - dt);
    hero.bowCooldown = Math.max(0, hero.bowCooldown - dt);
    hero.invulnerableTimer = Math.max(0, hero.invulnerableTimer - dt);
    hero.isAttacking = hero.attackTimer > 0;

    // Right-click Shield Block (active when holding right-click and not mid-sword-swing)
    hero.isBlocking = input.blockHeld && !hero.isAttacking;

    // Trigger Sword Swing
    if (input.attackPressed && hero.attackCooldown <= 0 && !state.shopOpen) {
      hero.isAttacking = true;
      hero.isBlocking = false;
      hero.attackTimer = 0.24;
      hero.attackCooldown = 0.35;
      hero.swingId += 1;
      soundEngine.playSwordSwing();
    }

    // Trigger Boomerang Throw (Q or 1)
    let boomerang: BoomerangState | null = state.boomerang
      ? { ...state.boomerang, hitEnemyIds: [...state.boomerang.hitEnemyIds] }
      : null;

    if (input.boomerangPressed && hero.hasBoomerang && !boomerang && !state.shopOpen) {
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
    }

    // Trigger Hero Bow & Arrow Shot (E or 2)
    let arrows: ArrowProjectileState[] = state.arrows.map((a) => ({ ...a }));
    if (input.bowPressed && !state.shopOpen && hero.bowCooldown <= 0) {
      if (!hero.hasBow) {
        pushBanner("No Bow Equipped!", "Buy the Ranger's Bow at Merchant Bramble's Shop in the South Clearing.", 2.8);
        hero.bowCooldown = 0.4;
      } else if (hero.arrows <= 0) {
        soundEngine.playGateLocked();
        pushBanner("Out of Arrows!", "Buy a Bundle of Arrows at the Shop in the South Clearing.", 2.8);
        hero.bowCooldown = 0.4;
      } else {
        hero.arrows -= 1;
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
    }

    // 2. Hero Movement + Knockback
    let mx = input.moveX;
    let mz = input.moveZ;
    const mag = Math.hypot(mx, mz);
    if (mag > 0.01) {
      mx /= mag;
      mz /= mag;
      if (!hero.isAttacking) {
        hero.facing = Math.atan2(mx, mz);
      }
      hero.walkCycle += dt * (hero.isBlocking ? 7 : 11);
    }

    const moveSpeed = hero.isAttacking ? 4.8 : hero.isBlocking ? 5.4 : 9.0;
    const nextHeroX = hero.x + (mx * moveSpeed + hero.knockbackVx) * dt;
    const nextHeroZ = hero.z + (mz * moveSpeed + hero.knockbackVz) * dt;

    hero.knockbackVx *= Math.exp(-10 * dt);
    hero.knockbackVz *= Math.exp(-10 * dt);

    const resolvedHero = resolveWorldCollisions(
      nextHeroX,
      nextHeroZ,
      0.72,
      zone,
      flags.gateUnlocked
    );
    hero.x = resolvedHero.x;
    hero.z = resolvedHero.z;

    // Check proximity to Merchant Shop Stall in South Clearing
    const distToShop =
      zone === "overworld"
        ? Math.hypot(hero.x - SHOP_INTERACT_POS.x, hero.z - SHOP_INTERACT_POS.z)
        : 999;
    const nearShop = distToShop < 3.1;
    let shopOpen = state.shopOpen;
    let shopDismissedOnRug = state.shopDismissedOnRug;
    if (nearShop && !shopOpen && !shopDismissedOnRug) {
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

    // 3. Check Zone Portal Transitions
    if (zone === "overworld") {
      const distToPortal = Math.hypot(
        hero.x - OVERWORLD_PORTAL_POS.x,
        hero.z - OVERWORLD_PORTAL_POS.z
      );
      if (distToPortal < 2.2) {
        zone = "dungeon";
        dungeonRoom = "entry";
        hero.x = DUNGEON_ENTRY_SPAWN.x;
        hero.z = DUNGEON_ENTRY_SPAWN.z;
        hero.facing = 0;
        hero.knockbackVx = 0;
        hero.knockbackVz = 0;
        boomerang = null;
        soundEngine.playPortalTransition();
        pushBanner(
          "The Sunken Sanctum",
          "Room I: Torchlit Antechamber — Watch out for the pack of Dungeon Porings!"
        );
      }
    } else if (zone === "dungeon") {
      const distToExit = Math.hypot(
        hero.x - DUNGEON_EXIT_POS.x,
        hero.z - DUNGEON_EXIT_POS.z
      );
      if (distToExit < 1.85) {
        zone = "overworld";
        hero.x = OVERWORLD_RETURN_SPAWN.x;
        hero.z = OVERWORLD_RETURN_SPAWN.z;
        hero.facing = Math.PI;
        hero.knockbackVx = 0;
        hero.knockbackVz = 0;
        boomerang = null;
        soundEngine.playPortalTransition();
        pushBanner("Whispering Vale", "Returned to the sunlit overworld.");
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
    }

    // 6. Check Boss Awakening when entering Room 3
    if (zone === "dungeon" && flags.gateUnlocked && !flags.bossAwakened && hero.z > 14.0) {
      flags.bossAwakened = true;
      soundEngine.playBossRoar();
      pushBanner(
        "Malakor, Warden of the Eclipse",
        "Bait his charging lunge into a wall or pillar to shatter his armor and stun him!",
        5.0
      );
    }

    // 7. Update Arcing Boss Projectiles & Toxic/Fire Ground Hazards
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
            damageHero(2, pushDirX * 13, pushDirZ * 13, false);
          } else if (dist <= updatedProj.aoeRadius) {
            damageHero(1, pushDirX * 9.5, pushDirZ * 9.5, false);
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
        damageHero(1, pushDirX * 5.5, pushDirZ * 5.5, true);
      }
    }

    // 8. Update Boomerang Flight
    const rupees: RupeeItemState[] = state.rupees.map((r) => ({ ...r }));
    const enemies: EnemyState[] = state.enemies.map((e) => ({ ...e }));

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
          const resB = resolveWorldCollisions(nextBx, nextBz, 0.45, zone, flags.gateUnlocked);
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

        // Boomerang collects rupees in flight!
        if (boomerang) {
          for (const rupee of rupees) {
            if (rupee.zone !== zone || rupee.collected) continue;
            if (Math.hypot(rupee.x - boomerang.x, rupee.z - boomerang.z) < 1.35) {
              rupee.collected = true;
              hero.rupees += rupee.value;
              soundEngine.playRupeePickup(rupee.tier);
            }
          }
        }
      }
    }

    // Helper to handle enemy defeat & rupee drop
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
          { tier: "green", val: 1, ox: 1.1, oz: -1.1 },
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
          });
        });
      } else {
        soundEngine.playEnemyDefeat();
        const tier: RupeeTier = enemy.rupeeDrop === "boss" ? "red" : enemy.rupeeDrop;
        const value = tier === "red" ? 20 : tier === "blue" ? 5 : 1;
        rupees.push({
          id: `drop-${enemy.id}-${stats.elapsedSeconds.toFixed(2)}`,
          zone,
          x: enemy.x,
          z: enemy.z,
          tier,
          value,
          collected: false,
        });
      }
    };

    // 9. Update Arrows (both Hero Arrows & Goblin Archer Arrows)
    const remainingArrows: ArrowProjectileState[] = [];
    for (const arrow of arrows) {
      if (arrow.zone !== zone) continue;
      arrow.lifeTimer -= dt;
      if (arrow.lifeTimer <= 0) continue;

      const nextAx = arrow.x + Math.sin(arrow.angle) * arrow.speed * dt;
      const nextAz = arrow.z + Math.cos(arrow.angle) * arrow.speed * dt;
      const resA = resolveWorldCollisions(nextAx, nextAz, 0.25, zone, flags.gateUnlocked);
      if (resA.hitObstacle) continue;

      arrow.x = nextAx;
      arrow.z = nextAz;

      let arrowConsumed = false;
      if (arrow.fromHero) {
        // Hero arrow hits enemies
        for (const enemy of enemies) {
          if (enemy.zone !== zone || enemy.state === "dead") continue;
          const eRad = enemy.kind === "boss" ? 1.45 : 0.85;
          if (Math.hypot(enemy.x - arrow.x, enemy.z - arrow.z) <= eRad) {
            arrowConsumed = true;
            if (enemy.kind === "boss" && enemy.state !== "stunned") {
              soundEngine.playArmorDeflect();
            } else {
              enemy.hp -= arrow.damage;
              enemy.hitFlashTimer = 0.22;
              if (enemy.state === "idle") enemy.state = "aggro";
              if (enemy.hp <= 0) {
                handleEnemyDeath(enemy);
              } else {
                soundEngine.playEnemyHit(enemy.kind === "boss");
              }
            }
            break;
          }
        }
      } else {
        // Goblin Archer arrow hits Hero
        if (Math.hypot(hero.x - arrow.x, hero.z - arrow.z) <= 0.95) {
          arrowConsumed = true;
          damageHero(
            arrow.damage,
            Math.sin(arrow.angle) * 9.5,
            Math.cos(arrow.angle) * 9.5,
            false
          );
        }
      }

      if (!arrowConsumed) {
        remainingArrows.push(arrow);
      }
    }
    arrows = remainingArrows;

    // 10. Update Enemies & Combat
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.zone !== zone || enemy.state === "dead") continue;

      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      enemy.stateTimer = Math.max(0, enemy.stateTimer - dt);
      enemy.knockbackImmunityTimer = Math.max(0, enemy.knockbackImmunityTimer - dt);
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);

      const enemyRadius =
        enemy.kind === "boss" ? 1.35 : enemy.kind === "knight" ? 0.85 : 0.7;

      // Check if Boomerang hits this enemy
      if (boomerang && !boomerang.hitEnemyIds.includes(enemy.id)) {
        if (Math.hypot(enemy.x - boomerang.x, enemy.z - boomerang.z) <= enemyRadius + 0.65) {
          boomerang.hitEnemyIds.push(enemy.id);
          boomerang.returning = true;
          if (enemy.kind === "boss") {
            soundEngine.playArmorDeflect();
          } else {
            enemy.hp -= 1;
            enemy.hitFlashTimer = 0.22;
            enemy.stunTimer = 1.9;
            if (enemy.state === "idle") enemy.state = "aggro";
            if (enemy.hp <= 0) {
              handleEnemyDeath(enemy);
              continue;
            } else {
              soundEngine.playEnemyHit(false);
            }
          }
        }
      }

      // Check if Hero's active sword swing hits this enemy
      if (
        hero.isAttacking &&
        hero.attackTimer > 0.05 &&
        enemy.lastHitSwingId !== hero.swingId
      ) {
        const dx = enemy.x - hero.x;
        const dz = enemy.z - hero.z;
        const dist = Math.hypot(dx, dz);
        const reach = 2.95 + enemyRadius;

        if (dist <= reach) {
          const angleToEnemy = Math.atan2(dx, dz);
          const angleDiff = Math.abs(normalizeAngleDiff(angleToEnemy, hero.facing));
          if (angleDiff <= 1.35 || dist <= 1.35) {
            enemy.lastHitSwingId = hero.swingId;

            if (enemy.kind === "boss") {
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
                enemy.hp -= 1;
                enemy.hitFlashTimer = 0.22;

                if (enemy.hp <= 0) {
                  handleEnemyDeath(enemy);
                  continue;
                } else {
                  soundEngine.playEnemyHit(true);
                }
              }
            } else {
              // Standard enemy hit with poise/anti-infinite-knockback!
              enemy.hp -= 1;
              enemy.hitFlashTimer = 0.22;

              const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
              const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);

              // If enemy is mid-windup/attack or recently knocked back, it resists knockback so it can still hit the player!
              const hasPoise =
                enemy.state === "windup" ||
                enemy.state === "attack" ||
                enemy.knockbackImmunityTimer > 0 ||
                enemy.kind === "knight" ||
                enemy.kind === "minion";
              const kbImpulse = hasPoise ? 1.8 : 4.8;
              enemy.knockbackVx = kbDirX * kbImpulse;
              enemy.knockbackVz = kbDirZ * kbImpulse;
              enemy.knockbackImmunityTimer = 0.95;

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
            damage: 2,
            rupeeDrop: "blue",
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

      // =====================================================
      // DEDICATED BOSS AI STATE MACHINE
      // =====================================================
      if (enemy.kind === "boss") {
        if (enemy.state === "idle") {
          if (flags.bossAwakened) {
            enemy.state = "aggro";
            enemy.actionCooldown = 1.0;
          }
        } else if (enemy.state === "aggro") {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          const stalkVx = distToHero > 2.5 ? (toHeroX / distToHero) * enemy.speed : 0;
          const stalkVz = distToHero > 2.5 ? (toHeroZ / distToHero) * enemy.speed : 0;
          const nextBx = enemy.x + stalkVx * dt;
          const nextBz = Math.max(14.5, enemy.z + stalkVz * dt);
          const resolvedB = resolveWorldCollisions(
            nextBx,
            nextBz,
            enemyRadius,
            zone,
            flags.gateUnlocked
          );
          enemy.x = resolvedB.x;
          enemy.z = resolvedB.z;

          if (distToHero <= 1.95) {
            const pushX = distToHero > 0.01 ? (toHeroX / distToHero) * 10 : 0;
            const pushZ = distToHero > 0.01 ? (toHeroZ / distToHero) * 10 : -10;
            damageHero(1, pushX, pushZ, false);
          }

          enemy.actionCooldown -= dt;
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
                BOSS_MAX_LUNGE_RANGE
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
            BOSS_MAX_LUNGE_RANGE
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
            const perpX = Math.cos(enemy.chargeAngle);
            const perpZ = -Math.sin(enemy.chargeAngle);
            damageHero(
              enemy.damage,
              (Math.sin(enemy.chargeAngle) + perpX * 0.6) * 14,
              (Math.cos(enemy.chargeAngle) + perpZ * 0.6) * 14,
              false
            );
          }

          const hitSouthBarrier = nextBz - enemyRadius < 13.0;
          const resolvedB = resolveWorldCollisions(
            nextBx,
            Math.max(13.0 + enemyRadius, nextBz),
            enemyRadius,
            zone,
            flags.gateUnlocked
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

        continue;
      }

      // If stunned by Hero's Boomerang, hold position
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
          flags.gateUnlocked
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
          if (canAggro && distToHero <= enemy.aggroRadius) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.7;
          }
        } else if (enemy.state === "aggro") {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
          }
          // Maintain ranged spacing (retreat if < 4.5, advance if > 8.2)
          if (distToHero < 4.5 && distToHero > 0.05) {
            moveVx = -(toHeroX / distToHero) * (enemy.speed * 0.85);
            moveVz = -(toHeroZ / distToHero) * (enemy.speed * 0.85);
          } else if (distToHero > 8.2) {
            moveVx = (toHeroX / distToHero) * enemy.speed;
            moveVz = (toHeroZ / distToHero) * enemy.speed;
          }

          enemy.actionCooldown -= dt;
          if (enemy.actionCooldown <= 0 && distToHero <= 12.5) {
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
              lifeTimer: 1.6,
            });
            enemy.state = "recover";
            enemy.stateTimer = 0.5;
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
        const resolvedArcher = resolveWorldCollisions(
          nextEx,
          nextEz,
          enemyRadius,
          zone,
          flags.gateUnlocked
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
        if (canAggro && distToHero <= enemy.aggroRadius) {
          enemy.state = "aggro";
        }
      } else if (enemy.state === "aggro") {
        if (!isSanctumEnemy && distToHero > enemy.aggroRadius * 2.2) {
          enemy.state = "idle";
        } else {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
            moveVx = (toHeroX / distToHero) * enemy.speed;
            moveVz = (toHeroZ / distToHero) * enemy.speed;
          }

          // Contact damage if enemy presses right up against the hero
          if (distToHero <= 1.28) {
            const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(enemy.facing);
            const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(enemy.facing);
            damageHero(enemy.damage, pushDirX * 10, pushDirZ * 10, false);
          }

          const triggerAttackDist = enemy.kind === "knight" ? 2.3 : 1.95;
          if (distToHero <= triggerAttackDist) {
            enemy.state = "windup";
            enemy.stateTimer = 0.26;
          }
        }
      } else if (enemy.state === "windup") {
        if (distToHero > 0.05) {
          enemy.facing = Math.atan2(toHeroX, toHeroZ);
        }
        if (enemy.stateTimer <= 0) {
          enemy.state = "attack";
          enemy.stateTimer = 0.25;
        }
      } else if (enemy.state === "attack") {
        const lungeSpeed = enemy.speed * 2.45;
        moveVx = Math.sin(enemy.facing) * lungeSpeed;
        moveVz = Math.cos(enemy.facing) * lungeSpeed;

        const hitDist = 1.55;
        if (distToHero <= hitDist) {
          const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(enemy.facing);
          const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(enemy.facing);
          damageHero(enemy.damage, pushDirX * 11.5, pushDirZ * 11.5, false);
        }

        if (enemy.stateTimer <= 0) {
          enemy.state = "recover";
          enemy.stateTimer = 0.32;
        }
      } else if (enemy.state === "recover") {
        if (enemy.stateTimer <= 0) {
          enemy.state = "aggro";
        }
      }

      // Soft separation between nearby enemies
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

      const nextEx = enemy.x + (moveVx + enemy.knockbackVx) * dt;
      const nextEz = enemy.z + (moveVz + enemy.knockbackVz) * dt;
      enemy.knockbackVx *= Math.exp(-10 * dt);
      enemy.knockbackVz *= Math.exp(-10 * dt);

      const resolvedEnemy = resolveWorldCollisions(
        nextEx,
        nextEz,
        enemyRadius,
        zone,
        flags.gateUnlocked
      );
      enemy.x = resolvedEnemy.x;
      enemy.z = resolvedEnemy.z;
    }

    // 11. Check if Boss and all Sanctum Minions are defeated
    if (!flags.bossDefeated) {
      const bossEnemy = enemies.find((e) => e.kind === "boss");
      const aliveSanctumMinions = enemies.filter(
        (e) => e.kind === "minion" && e.state !== "dead"
      );
      if (bossEnemy && bossEnemy.state === "dead" && aliveSanctumMinions.length === 0) {
        flags.bossDefeated = true;
        pushBanner(
          "Dread Warden Malakor Vanquished!",
          "The crimson seal shatters! Open the Golden Chest at the North Altar!",
          5.5
        );
      }
    }

    // 12. Rupee Magnet & Pickup
    for (const rupee of rupees) {
      if (rupee.zone !== zone || rupee.collected) continue;
      const dx = hero.x - rupee.x;
      const dz = hero.z - rupee.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.6 && dist > 0.05) {
        rupee.x += (dx / dist) * 7.5 * dt;
        rupee.z += (dz / dist) * 7.5 * dt;
      }
      if (dist < 1.25) {
        rupee.collected = true;
        hero.rupees += rupee.value;
        soundEngine.playRupeePickup(rupee.tier);
      }
    }

    // 13. Boss Chest Unlock → Victory State
    if (zone === "dungeon" && !flags.chestUnlocked) {
      const distToChest = Math.hypot(
        hero.x - BOSS_CHEST_POS.x,
        hero.z - BOSS_CHEST_POS.z
      );
      if (distToChest < 2.5) {
        if (flags.bossDefeated) {
          flags.chestUnlocked = true;
          phase = "victory";
          soundEngine.playVictoryFanfare();
          pushBanner(
            "The Zeldo Crest is Restored!",
            "Light returns to the Whispering Vale!",
            8.0
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
      projectiles,
      hazards,
      rupees,
      flags,
      stats,
      banner,
      nearShop,
      shopOpen,
      shopDismissedOnRug,
      gateNoticeCooldown,
      chestNoticeCooldown,
      armorNoticeCooldown,
    });
  },
}));
