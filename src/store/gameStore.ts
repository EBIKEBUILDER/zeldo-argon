import { create } from "zustand";
import {
  BOSS_CHEST_POS,
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
export type EnemyAIState = "idle" | "aggro" | "windup" | "attack" | "recover" | "dead";

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
  rupees: RupeeItemState[];
  flags: GameFlags;
  stats: GameStats;
  banner: BannerMessage | null;
  gateNoticeCooldown: number;
  chestNoticeCooldown: number;
  muted: boolean;
}

export interface GameActions {
  startGame: () => void;
  restartGame: () => void;
  toggleMute: () => void;
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

function createInitialState(phase: GamePhase = "title", muted = false): SerializableGameState {
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
    muted,
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
    set((state) => createInitialState("playing", state.muted));
  },

  restartGame: () => {
    soundEngine.unlock();
    soundEngine.playKeyPickup();
    set((state) => createInitialState("playing", state.muted));
  },

  toggleMute: () => {
    const nextMuted = !get().muted;
    soundEngine.setMuted(nextMuted);
    set({ muted: nextMuted });
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

    let gateNoticeCooldown = Math.max(0, state.gateNoticeCooldown - dt);
    let chestNoticeCooldown = Math.max(0, state.chestNoticeCooldown - dt);

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
        "Defeat the Dread Warden and his minions to unseal the Sanctum Chest!",
        4.5
      );
    }

    // 7. Update Enemies & Combat
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
            enemy.hp -= 1;
            enemy.hitFlashTimer = 0.22;

            // Knockback away from hero
            const kbDirX = dist > 0.01 ? dx / dist : Math.sin(hero.facing);
            const kbDirZ = dist > 0.01 ? dz / dist : Math.cos(hero.facing);
            const kbStrength = enemy.kind === "boss" ? 5.5 : 12.5;
            enemy.knockbackVx = kbDirX * kbStrength;
            enemy.knockbackVz = kbDirZ * kbStrength;

            if (enemy.state === "idle") {
              enemy.state = "aggro";
            }

            if (enemy.hp <= 0) {
              enemy.hp = 0;
              enemy.state = "dead";
              stats.enemiesDefeated += 1;

              if (enemy.kind === "boss") {
                soundEngine.playBossDefeat();
                // Boss drops a burst of Rupees
                const bossDrops: Array<{ tier: RupeeTier; val: number; ox: number; oz: number }> = [
                  { tier: "red", val: 20, ox: 0, oz: 0 },
                  { tier: "red", val: 20, ox: -1.4, oz: 0.8 },
                  { tier: "blue", val: 5, ox: 1.4, oz: 0.8 },
                  { tier: "blue", val: 5, ox: -1.1, oz: -1.1 },
                  { tier: "green", val: 1, ox: 1.1, oz: -1.1 },
                ];
                bossDrops.forEach((drop, idx) => {
                  rupees.push({
                    id: `drop-${enemy.id}-${idx}-${ stats.elapsedSeconds.toFixed(2) }`,
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
              }
              continue;
            } else {
              soundEngine.playEnemyHit(enemy.kind === "boss");
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
          }
        );
      }

      // AI State Machine
      const toHeroX = hero.x - enemy.x;
      const toHeroZ = hero.z - enemy.z;
      const distToHero = Math.hypot(toHeroX, toHeroZ);
      const isSanctumEnemy = enemy.zone === "dungeon" && enemy.spawnZ > 13;

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
        // Leash back if hero retreats very far in overworld
        if (!isSanctumEnemy && distToHero > enemy.aggroRadius * 2.15) {
          enemy.state = "idle";
        } else {
          if (distToHero > 0.05) {
            enemy.facing = Math.atan2(toHeroX, toHeroZ);
            moveVx = (toHeroX / distToHero) * enemy.speed;
            moveVz = (toHeroZ / distToHero) * enemy.speed;
          }

          const triggerAttackDist =
            enemy.kind === "boss" ? 2.85 : enemy.kind === "knight" ? 2.0 : 1.7;
          if (distToHero <= triggerAttackDist) {
            enemy.state = "windup";
            enemy.stateTimer = enemy.kind === "boss" ? 0.52 : 0.38;
          }
        }
      } else if (enemy.state === "windup") {
        if (distToHero > 0.05) {
          enemy.facing = Math.atan2(toHeroX, toHeroZ);
        }
        if (enemy.stateTimer <= 0) {
          enemy.state = "attack";
          enemy.stateTimer = enemy.kind === "boss" ? 0.32 : 0.22;
          if (enemy.kind === "boss") {
            soundEngine.playBossAttack();
          }
        }
      } else if (enemy.state === "attack") {
        const lungeSpeed = enemy.speed * (enemy.kind === "boss" ? 2.35 : 2.05);
        moveVx = Math.sin(enemy.facing) * lungeSpeed;
        moveVz = Math.cos(enemy.facing) * lungeSpeed;

        // Check hit on Hero
        const hitDist = enemy.kind === "boss" ? 2.35 : 1.42;
        if (distToHero <= hitDist && hero.invulnerableTimer <= 0) {
          hero.hp = Math.max(0, hero.hp - enemy.damage);
          hero.invulnerableTimer = 1.1;
          stats.damageTaken += enemy.damage;
          const pushDirX = distToHero > 0.01 ? toHeroX / distToHero : Math.sin(enemy.facing);
          const pushDirZ = distToHero > 0.01 ? toHeroZ / distToHero : Math.cos(enemy.facing);
          hero.knockbackVx = pushDirX * 11.5;
          hero.knockbackVz = pushDirZ * 11.5;
          soundEngine.playHeroHurt();

          if (hero.hp <= 0) {
            phase = "gameover";
            soundEngine.playGameOver();
          }
        }

        if (enemy.stateTimer <= 0) {
          enemy.state = "recover";
          enemy.stateTimer = enemy.kind === "boss" ? 0.65 : 0.5;
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

    // 8. Check if Boss and all Sanctum Minions are defeated
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

    // 9. Rupee Magnet & Pickup
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

    // 10. Boss Chest Unlock → Victory State
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
      rupees,
      flags,
      stats,
      banner,
      gateNoticeCooldown,
      chestNoticeCooldown,
    });
  },
}));
