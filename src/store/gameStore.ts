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
  ZoneId,
} from "@/game/worldData";
import { soundEngine } from "@/audio/soundEngine";

export type GamePhase = "title" | "playing" | "gameover" | "victory";
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
  isAttacking: boolean;
  attackTimer: number;
  attackCooldown: number;
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
}

export interface SerializableGameState {
  phase: GamePhase;
  zone: ZoneId;
  dungeonRoom: DungeonRoomId;
  hero: HeroState;
  enemies: EnemyState[];
  projectiles: BossProjectileState[];
  hazards: HazardZoneState[];
  rupees: RupeeItemState[];
  flags: GameFlags;
  stats: GameStats;
  banner: BannerMessage | null;
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

function createInitialState(phase: GamePhase = "title", muted = false, fps = 60): SerializableGameState {
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
      isAttacking: false,
      attackTimer: 0,
      attackCooldown: 0,
      swingId: 0,
      invulnerableTimer: 0,
      knockbackVx: 0,
      knockbackVz: 0,
      walkCycle: 0,
    },
    enemies: createInitialEnemies(),
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
            subtext: "Find the Sanctum Key in the Western Ruins, then breach the Northern Sanctum.",
            timer: 5.0,
          }
        : null,
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

  tick: (rawDt: number, input: FrameInput) => {
    const state = get();
    if (state.phase !== "playing") return;

    const dt = Math.min(rawDt, 0.05);

    // Clone mutable slices cleanly
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

    const damageHero = (amount: number, pushX: number, pushZ: number) => {
      if (hero.invulnerableTimer > 0 || phase !== "playing") return;
      hero.hp = Math.max(0, hero.hp - amount);
      hero.invulnerableTimer = 1.05;
      stats.damageTaken += amount;
      hero.knockbackVx = pushX;
      hero.knockbackVz = pushZ;
      soundEngine.playHeroHurt();
      if (hero.hp <= 0) {
        phase = "gameover";
        soundEngine.playGameOver();
      }
    };

    let gateNoticeCooldown = Math.max(0, state.gateNoticeCooldown - dt);
    let chestNoticeCooldown = Math.max(0, state.chestNoticeCooldown - dt);
    let armorNoticeCooldown = Math.max(0, state.armorNoticeCooldown - dt);

    // 1. Update Hero timers
    hero.attackTimer = Math.max(0, hero.attackTimer - dt);
    hero.attackCooldown = Math.max(0, hero.attackCooldown - dt);
    hero.invulnerableTimer = Math.max(0, hero.invulnerableTimer - dt);
    hero.isAttacking = hero.attackTimer > 0;

    // Trigger sword swing
    if (input.attackPressed && hero.attackCooldown <= 0) {
      hero.isAttacking = true;
      hero.attackTimer = 0.25;
      hero.attackCooldown = 0.34;
      hero.swingId += 1;
      soundEngine.playSwordSwing();
    }

    // 2. Hero movement + knockback
    let mx = input.moveX;
    let mz = input.moveZ;
    const mag = Math.hypot(mx, mz);
    if (mag > 0.01) {
      mx /= mag;
      mz /= mag;
      if (!hero.isAttacking) {
        hero.facing = Math.atan2(mx, mz);
      }
      hero.walkCycle += dt * 11;
    }

    const moveSpeed = hero.isAttacking ? 4.8 : 9.0;
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
        soundEngine.playPortalTransition();
        pushBanner(
          "The Sunken Sanctum",
          "Room I: Torchlit Antechamber — Seek the Locked Gate to the North."
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
        // Projectile impacts the ground and explodes!
        if (updatedProj.zone === zone) {
          soundEngine.playBombExplode();
          const dx = hero.x - updatedProj.targetX;
          const dz = hero.z - updatedProj.targetZ;
          const dist = Math.hypot(dx, dz);
          const pushDirX = dist > 0.01 ? dx / dist : 0;
          const pushDirZ = dist > 0.01 ? dz / dist : -1;

          if (dist <= updatedProj.directHitRadius) {
            // Direct hit deals 2 half-hearts (1 full heart)
            damageHero(2, pushDirX * 13, pushDirZ * 13);
          } else if (dist <= updatedProj.aoeRadius) {
            // Splash explosion deals 1 half-heart
            damageHero(1, pushDirX * 9.5, pushDirZ * 9.5);
          }
        }

        // Spawn lingering toxic/fire ground hazard pool
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

    // Check if Hero is standing inside any active Toxic/Fire Ground Hazard
    for (const hazard of hazards) {
      if (hazard.zone !== zone) continue;
      const dx = hero.x - hazard.x;
      const dz = hero.z - hazard.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= hazard.radius) {
        const pushDirX = dist > 0.01 ? dx / dist : 0;
        const pushDirZ = dist > 0.01 ? dz / dist : -1;
        damageHero(1, pushDirX * 5.5, pushDirZ * 5.5);
      }
    }

    // 8. Update Enemies & Combat
    const rupees: RupeeItemState[] = state.rupees.map((r) => ({ ...r }));
    const enemies: EnemyState[] = state.enemies.map((e) => ({ ...e }));

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.zone !== zone || enemy.state === "dead") continue;

      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      enemy.stateTimer = Math.max(0, enemy.stateTimer - dt);

      const enemyRadius =
        enemy.kind === "boss" ? 1.35 : enemy.kind === "knight" ? 0.85 : 0.7;

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
              // Boss is invulnerable while lunging OR while his obsidian armor is intact!
              // He can ONLY be damaged while STUNNED after crashing into a wall or pillar.
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
                // Boss is STUNNED — deal full sword damage, zero knockback!
                enemy.hp -= 1;
                enemy.hitFlashTimer = 0.22;

                if (enemy.hp <= 0) {
                  enemy.hp = 0;
                  enemy.state = "dead";
                  stats.enemiesDefeated += 1;
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
                  continue;
                } else {
                  soundEngine.playEnemyHit(true);
                }
              }
            } else {
              // Standard enemy hit + knockback
              enemy.hp -= 1;
              enemy.hitFlashTimer = 0.22;

              const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
              const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);
              enemy.knockbackVx = kbDirX * 12.5;
              enemy.knockbackVz = kbDirZ * 12.5;

              if (enemy.state === "idle") {
                enemy.state = "aggro";
              }

              if (enemy.hp <= 0) {
                enemy.hp = 0;
                enemy.state = "dead";
                stats.enemiesDefeated += 1;
                soundEngine.playEnemyDefeat();
                const tier: RupeeTier =
                  enemy.rupeeDrop === "boss" ? "red" : enemy.rupeeDrop;
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
                continue;
              } else {
                soundEngine.playEnemyHit(false);
              }
            }
          }
        }
      }

      // Boss Phase 2 Minion Summon at 50% HP
      if (
        enemy.kind === "boss" &&
        enemy.hp <= Math.ceil(enemy.maxHp / 2) &&
        !flags.bossPhase2
      ) {
        flags.bossPhase2 = true;
        soundEngine.playBossRoar();
        pushBanner(
          "Malakor Channels the Eclipse!",
          "Shadow Minions rise to defend their master!",
          3.8
        );
        enemies.push(
          {
            id: "dg-minion-wave2-1",
            kind: "minion",
            zone: "dungeon",
            x: -7.5,
            z: 27.5,
            spawnX: -7.5,
            spawnZ: 27.5,
            facing: Math.PI,
            hp: 2,
            maxHp: 2,
            state: "aggro",
            stateTimer: 0,
            hitFlashTimer: 0.2,
            lastHitSwingId: -1,
            knockbackVx: 0,
            knockbackVz: 0,
            aggroRadius: 14,
            speed: 4.6,
            damage: 1,
            rupeeDrop: "green",
            chargeAngle: Math.PI,
            chargePathLength: 0,
            chargeDistanceTraveled: 0,
            actionCounter: 0,
            actionCooldown: 0,
          },
          {
            id: "dg-minion-wave2-2",
            kind: "minion",
            zone: "dungeon",
            x: 7.5,
            z: 27.5,
            spawnX: 7.5,
            spawnZ: 27.5,
            facing: Math.PI,
            hp: 2,
            maxHp: 2,
            state: "aggro",
            stateTimer: 0,
            hitFlashTimer: 0.2,
            lastHitSwingId: -1,
            knockbackVx: 0,
            knockbackVz: 0,
            aggroRadius: 14,
            speed: 4.6,
            damage: 1,
            rupeeDrop: "blue",
            chargeAngle: Math.PI,
            chargePathLength: 0,
            chargeDistanceTraveled: 0,
            actionCounter: 0,
            actionCooldown: 0,
          }
        );
      }

      const toHeroX = hero.x - enemy.x;
      const toHeroZ = hero.z - enemy.z;
      const distToHero = Math.hypot(toHeroX, toHeroZ);
      const isSanctumEnemy = enemy.zone === "dungeon" && enemy.spawnZ > 13;

      // =====================================================
      // DEDICATED BOSS AI STATE MACHINE (Charge + Lobbed Bomb)
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
          // Stalk toward hero while cooling down next special attack
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

          // Contact damage if player walks directly into armored boss
          if (distToHero <= 1.95) {
            const pushX = distToHero > 0.01 ? (toHeroX / distToHero) * 10 : 0;
            const pushZ = distToHero > 0.01 ? (toHeroZ / distToHero) * 10 : -10;
            damageHero(1, pushX, pushZ);
          }

          enemy.actionCooldown -= dt;
          if (enemy.actionCooldown <= 0) {
            if (enemy.actionCounter % 2 === 0) {
              // Ranged Lobbed Bomb Attack
              enemy.state = "lob_windup";
              enemy.stateTimer = 0.6;
              enemy.facing = Math.atan2(toHeroX, toHeroZ);
            } else {
              // Charging Lunge Attack: stop, aim at player, and charge up
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

            // In Phase 2, lob a second volatile orb slightly offset!
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
          // Boss stops and aims directly at the player, updating ground path telegraph
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
            // Lock aim direction for a short delay so player can see telegraph and dodge out of the way
            enemy.state = "charge_lock";
            enemy.stateTimer = 0.55;
          }
        } else if (enemy.state === "charge_lock") {
          // Aim is locked on the ground telegraph; short window for player to sidestep
          enemy.facing = enemy.chargeAngle;
          if (enemy.stateTimer <= 0) {
            enemy.state = "charge_lunge";
            enemy.chargeDistanceTraveled = 0;
            enemy.stateTimer = 1.25;
            soundEngine.playBossAttack();
          }
        } else if (enemy.state === "charge_lunge") {
          // High-speed lunge along locked chargeAngle; boss is invulnerable while lunging
          const lungeSpeed = 19.5;
          const stepDist = lungeSpeed * dt;
          enemy.chargeDistanceTraveled += stepDist;

          const nextBx = enemy.x + Math.sin(enemy.chargeAngle) * stepDist;
          const nextBz = enemy.z + Math.cos(enemy.chargeAngle) * stepDist;

          // Check if boss hits the Hero during the lunge
          if (distToHero <= 2.3) {
            const perpX = Math.cos(enemy.chargeAngle);
            const perpZ = -Math.sin(enemy.chargeAngle);
            damageHero(
              enemy.damage,
              (Math.sin(enemy.chargeAngle) + perpX * 0.6) * 14,
              (Math.cos(enemy.chargeAngle) + perpZ * 0.6) * 14
            );
          }

          // Check collision with Sanctum walls or pillars
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
            // Boss slammed into a wall or pillar -> STUNNED for 3.5 seconds!
            soundEngine.playBossWallCrash();
            enemy.state = "stunned";
            enemy.stateTimer = 3.5;
            enemy.actionCounter += 1;
            enemy.actionCooldown = 1.2;
            pushBanner(
              "Malakor Crashed into the Wall!",
              "His obsidian armor is shattered — strike him with your sword now!",
              3.4
            );
          } else if (
            enemy.chargeDistanceTraveled >= BOSS_MAX_LUNGE_RANGE ||
            enemy.stateTimer <= 0
          ) {
            // Reached max lunge range in the open without hitting a wall -> not stunned
            enemy.state = "recover";
            enemy.stateTimer = 0.65;
            enemy.actionCounter += 1;
            enemy.actionCooldown = 1.15;
          }
        } else if (enemy.state === "stunned") {
          // Boss is dazed and vulnerable to sword attacks
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
            enemy.actionCooldown = 0.9;
          }
        } else if (enemy.state === "recover") {
          if (enemy.stateTimer <= 0) {
            enemy.state = "aggro";
          }
        }

        continue;
      }

      // =====================================================
      // STANDARD ENEMY AI STATE MACHINE (Slime, Goblin, Knight, Minion)
      // =====================================================
      let moveVx = 0;
      let moveVz = 0;

      if (enemy.state === "idle") {
        // Gentle idle patrol around spawn point
        const patrolAngle = stats.elapsedSeconds * 1.1 + i * 1.7;
        const targetX = enemy.spawnX + Math.cos(patrolAngle) * 1.1;
        const targetZ = enemy.spawnZ + Math.sin(patrolAngle) * 1.1;
        const dx = targetX - enemy.x;
        const dz = targetZ - enemy.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          moveVx = (dx / d) * (enemy.speed * 0.32);
          moveVz = (dz / d) * (enemy.speed * 0.32);
          enemy.facing = Math.atan2(moveVx, moveVz);
        }

        // Check aggro condition (never aggro at spawn; sanctum enemies wait for gate/bossAwakened)
        const canAggro = !isSanctumEnemy || flags.bossAwakened;
        if (canAggro && distToHero <= enemy.aggroRadius) {
          enemy.state = "aggro";
        }
      } else if (enemy.state === "aggro") {
        if (!isSanctumEnemy && distToHero > enemy.aggroRadius * 2.15) {
          enemy.state = "idle";
        } else {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
            moveVx = (toHeroX / distToHero) * enemy.speed;
            moveVz = (toHeroZ / distToHero) * enemy.speed;
          }

          const triggerAttackDist = enemy.kind === "knight" ? 2.0 : 1.7;
          if (distToHero <= triggerAttackDist) {
            enemy.state = "windup";
            enemy.stateTimer = 0.38;
          }
        }
      } else if (enemy.state === "windup") {
        if (distToHero > 0.05) {
          enemy.facing = Math.atan2(toHeroX, toHeroZ);
        }
        if (enemy.stateTimer <= 0) {
          enemy.state = "attack";
          enemy.stateTimer = 0.22;
        }
      } else if (enemy.state === "attack") {
        const lungeSpeed = enemy.speed * 2.05;
        moveVx = Math.sin(enemy.facing) * lungeSpeed;
        moveVz = Math.cos(enemy.facing) * lungeSpeed;

        // Check hit on Hero
        const hitDist = 1.42;
        if (distToHero <= hitDist) {
          const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(enemy.facing);
          const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(enemy.facing);
          damageHero(enemy.damage, pushDirX * 11.5, pushDirZ * 11.5);
        }

        if (enemy.stateTimer <= 0) {
          enemy.state = "recover";
          enemy.stateTimer = 0.5;
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

      // Apply enemy movement & knockback
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

    // 9. Check if Boss and all Sanctum Minions are defeated
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

    // 10. Rupee Magnet & Pickup
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

    // 11. Boss Chest Unlock → Victory State
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
      projectiles,
      hazards,
      rupees,
      flags,
      stats,
      banner,
      gateNoticeCooldown,
      chestNoticeCooldown,
      armorNoticeCooldown,
    });
  },
}));
