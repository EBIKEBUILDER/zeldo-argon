import {
  EnemyKind,
  EnemyShieldArmor,
  EnemySpawn,
  getDefaultEnemyWeight,
  MapPortal,
  MapPropInstance,
  RIFT_ENTRANCE_POS,
  WorldRupeeSpawn,
} from "@/game/worldData";

export type RiftBiomeId = "catacombs" | "glacial" | "brimstone" | "void";

export type RiftRoomRole = "start" | "combat" | "elite" | "shrine" | "vault" | "boss";

export interface RiftRoomMeta {
  col: number;
  row: number;
  cx: number;
  cz: number;
  role: RiftRoomRole;
  distFromStart: number;
}

export interface GeneratedRiftFloor {
  floorDepth: number;
  seed: number;
  biome: RiftBiomeId;
  biomeTitle: string;
  floorColorHex: string;
  bossName: string;
  eliteAffixLabel: string;
  rooms: RiftRoomMeta[];
  shrinePos: { x: number; z: number };
  vaultChestPos: { x: number; z: number };
  bossChestPos: { x: number; z: number };
  nextFloorPortalPos: { x: number; z: number };
  props: MapPropInstance[];
  enemies: EnemySpawn[];
  rupees: WorldRupeeSpawn[];
  portals: MapPortal[];
}

function createSeededRng(seed: number): () => number {
  let a = (seed >>> 0) || 1337;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BIOME_CONFIGS: Record<
  RiftBiomeId,
  {
    title: string;
    floorHex: string;
    wallHex: string;
    pillarHex: string;
    bossNames: string[];
    eliteAffixes: string[];
    fodderPool: EnemyKind[];
    heavyPool: EnemyKind[];
  }
> = {
  catacombs: {
    title: "Bloodstone Catacombs",
    floorHex: "#2a1824",
    wallHex: "#4a2a3a",
    pillarHex: "#6e3b52",
    bossNames: [
      "MALakor, the Bloodstone Butcher",
      "VORGATH, the Catacomb Dreadlord",
      "KRAXIS, the Crimson Executioner",
    ],
    eliteAffixes: [
      "Blood-Frenzied • Shieldbreaker",
      "Vampiric • Ironclad Pack",
      "Cursed • Berserker Horde",
    ],
    fodderPool: ["goblin", "archer", "slime"],
    heavyPool: ["knight", "minion"],
  },
  glacial: {
    title: "Permafrost Abyss",
    floorHex: "#18283b",
    wallHex: "#2d4c6e",
    pillarHex: "#4c7ca8",
    bossNames: [
      "GLACIUS, the Rime Sovereign",
      "BOREALIS, the Hoarfrost Titan",
      "WINTERMAW, the Frozen Behemoth",
    ],
    eliteAffixes: [
      "Permafrost • Chilling Nova",
      "Glacial-Armored • Frostbolt Volley",
      "Blizzard-Bound • Shatter Pack",
    ],
    fodderPool: ["wraith", "goblin", "archer"],
    heavyPool: ["knight", "wraith"],
  },
  brimstone: {
    title: "Brimstone Caldera Vaults",
    floorHex: "#2e1c16",
    wallHex: "#543226",
    pillarHex: "#7d4834",
    bossNames: [
      "ASHMAW, the Cinder Behemoth",
      "VULKANOR, the Hellfire Forgemaster",
      "SCORCHAX, the Magma Tyrant",
    ],
    eliteAffixes: [
      "Molten • Sapper Bombardiers",
      "Subterranean • Quake Tremor",
      "Pyre-Forged • Explosive Pack",
    ],
    fodderPool: ["bomber", "goblin", "burrower"],
    heavyPool: ["burrower", "knight"],
  },
  void: {
    title: "Obsidian Void Sanctum",
    floorHex: "#1d1730",
    wallHex: "#382a5c",
    pillarHex: "#58428f",
    bossNames: [
      "XAL'KETH, the Void Sovereign",
      "NYXAROS, the Abyssal Watcher",
      "MORVATH, the Shadow Architect",
    ],
    eliteAffixes: [
      "Thunder-Spiked • Arcane Ward",
      "Shadow-Cloaked • Turret Matrix",
      "Void-Touched • Mirror Sentinel",
    ],
    fodderPool: ["minion", "archer", "slime"],
    heavyPool: ["knight", "turret"],
  },
};

export function generateProceduralRiftFloor(
  floorDepth: number,
  seed: number
): GeneratedRiftFloor {
  const depth = Math.max(1, Math.floor(floorDepth));
  const combinedSeed = (seed ^ Math.imul(depth, 2654435761)) >>> 0;
  const rng = createSeededRng(combinedSeed);

  const biomeOrder: RiftBiomeId[] = ["catacombs", "glacial", "brimstone", "void"];
  const biome = biomeOrder[Math.floor(rng() * biomeOrder.length)];
  const bCfg = BIOME_CONFIGS[biome];

  const bossName =
    bCfg.bossNames[Math.floor(rng() * bCfg.bossNames.length)] + ` (Depth ${depth})`;
  const eliteAffixLabel =
    bCfg.eliteAffixes[Math.floor(rng() * bCfg.eliteAffixes.length)];

  // 1. Generate a 3x3 Procedural Room Graph starting at South-Center (col=1, row=0 -> x=0, z=-22)
  const COLS = 3;
  const ROWS = 3;
  const CELL_STEP = 22;
  const cellCenter = (col: number, row: number) => ({
    cx: (col - 1) * CELL_STEP,
    cz: (row - 1) * CELL_STEP,
  });

  const visited = new Map<string, { col: number; row: number; dist: number }>();
  const edges = new Set<string>();
  const edgeKey = (c1: number, r1: number, c2: number, r2: number) => {
    const a = `${c1},${r1}`;
    const b = `${c2},${r2}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  };

  const startKey = "1,0";
  visited.set(startKey, { col: 1, row: 0, dist: 0 });
  const frontier: Array<{ col: number; row: number; dist: number }> = [
    { col: 1, row: 0, dist: 0 },
  ];

  const targetRoomCount = Math.min(9, 6 + Math.floor(rng() * 3)); // 6 to 8 rooms per floor
  while (visited.size < targetRoomCount && frontier.length > 0) {
    const pickIdx = Math.floor(rng() * frontier.length);
    const curr = frontier[pickIdx];
    const dirs = [
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 0, dr: -1 },
    ].sort(() => rng() - 0.5);

    let expanded = false;
    for (const d of dirs) {
      const nc = curr.col + d.dc;
      const nr = curr.row + d.dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      const nKey = `${nc},${nr}`;
      if (!visited.has(nKey)) {
        const nextNode = { col: nc, row: nr, dist: curr.dist + 1 };
        visited.set(nKey, nextNode);
        edges.add(edgeKey(curr.col, curr.row, nc, nr));
        frontier.push(nextNode);
        expanded = true;
        break;
      } else if (rng() < 0.22) {
        // Occasional loop corridor for true Diablo dungeon feel!
        edges.add(edgeKey(curr.col, curr.row, nc, nr));
      }
    }
    if (!expanded) {
      frontier.splice(pickIdx, 1);
    }
  }

  // Assign Room Roles:
  // - (1,0) is always "start"
  // - Furthest room is "boss"
  // - Second furthest / side rooms become "vault", "shrine", "elite", and "combat"
  const roomNodes = Array.from(visited.values()).sort((a, b) => b.dist - a.dist);
  const bossNode = roomNodes[0];
  const nonStartNonBoss = roomNodes
    .slice(1)
    .filter((n) => !(n.col === 1 && n.row === 0));

  const vaultNode = nonStartNonBoss[0] ?? bossNode;
  const shrineNode = nonStartNonBoss[1] ?? nonStartNonBoss[0] ?? bossNode;
  const eliteNode = nonStartNonBoss[2] ?? nonStartNonBoss[0] ?? bossNode;

  const rooms: RiftRoomMeta[] = roomNodes.map((n) => {
    const { cx, cz } = cellCenter(n.col, n.row);
    let role: RiftRoomRole = "combat";
    if (n.col === 1 && n.row === 0) role = "start";
    else if (n.col === bossNode.col && n.row === bossNode.row) role = "boss";
    else if (n.col === vaultNode.col && n.row === vaultNode.row) role = "vault";
    else if (n.col === shrineNode.col && n.row === shrineNode.row) role = "shrine";
    else if (n.col === eliteNode.col && n.row === eliteNode.row) role = "elite";
    return {
      col: n.col,
      row: n.row,
      cx,
      cz,
      role,
      distFromStart: n.dist,
    };
  });

  const props: MapPropInstance[] = [];
  const enemies: EnemySpawn[] = [];
  const rupees: WorldRupeeSpawn[] = [];

  const pushWall = (
    id: string,
    x: number,
    z: number,
    scaleX: number,
    scaleZ: number
  ) => {
    props.push({
      id,
      prefab: "stone_wall",
      name: "Abyssal Wall",
      zone: "rift",
      x: Number(x.toFixed(2)),
      y: 0,
      z: Number(z.toFixed(2)),
      rotY: 0,
      scaleX: Number(scaleX.toFixed(2)),
      scaleY: 1.35,
      scaleZ: Number(scaleZ.toFixed(2)),
      hasCollider: true,
      colliderWidth: Number((scaleX * 2.1).toFixed(2)),
      colliderDepth: Number((scaleZ * 2.1).toFixed(2)),
      colliderKind: "wall",
      colorHex: bCfg.wallHex,
    });
  };

  const pushPillar = (id: string, x: number, z: number) => {
    props.push({
      id,
      prefab: "dungeon_pillar",
      name: "Abyssal Pillar",
      zone: "rift",
      x: Number(x.toFixed(2)),
      y: 0,
      z: Number(z.toFixed(2)),
      rotY: 0,
      scaleX: 1,
      scaleY: 1.25,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 1.5,
      colliderDepth: 1.5,
      colliderKind: "pillar",
      colorHex: bCfg.pillarHex,
    });
  };

  const pushTorch = (id: string, x: number, z: number, lit = true) => {
    props.push({
      id,
      prefab: "wall_torch",
      name: "Abyssal Brazier",
      zone: "rift",
      x: Number(x.toFixed(2)),
      y: 0,
      z: Number(z.toFixed(2)),
      rotY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      hasCollider: true,
      colliderWidth: 0.9,
      colliderDepth: 0.9,
      colliderKind: "pillar",
      lit,
    });
  };

  // 2. Build Procedural Room Walls, Doorways & Connecting Hallways
  const HALF = 9.0; // Room inner radius (-9..+9 around cx,cz)
  for (const rm of rooms) {
    const { col, row, cx, cz, role } = rm;
    const tag = `r${col}${row}`;

    // Corner Pillars & Atmospheric Braziers inside each room
    pushPillar(`prop-rift-${tag}-pil-nw`, cx - 7.4, cz + 7.4);
    pushPillar(`prop-rift-${tag}-pil-ne`, cx + 7.4, cz + 7.4);
    pushPillar(`prop-rift-${tag}-pil-sw`, cx - 7.4, cz - 7.4);
    pushPillar(`prop-rift-${tag}-pil-se`, cx + 7.4, cz - 7.4);

    if (role === "start" || role === "boss" || role === "shrine") {
      pushTorch(`prop-rift-${tag}-torch-w`, cx - 5.2, cz + 5.2, true);
      pushTorch(`prop-rift-${tag}-torch-e`, cx + 5.2, cz + 5.2, true);
    } else {
      pushTorch(`prop-rift-${tag}-torch-c`, cx - 5.5, cz - 5.5, rng() > 0.25);
    }

    // Check 4 cardinal walls (North +Z, South -Z, East +X, West -X)
    const hasNorth = edges.has(edgeKey(col, row, col, row + 1));
    const hasSouth = edges.has(edgeKey(col, row, col, row - 1));
    const hasEast = edges.has(edgeKey(col, row, col + 1, row));
    const hasWest = edges.has(edgeKey(col, row, col - 1, row));

    // NORTH WALL (+Z)
    if (!hasNorth) {
      pushWall(`prop-rift-${tag}-wall-n`, cx, cz + HALF, 8.8, 0.75);
    } else {
      pushWall(`prop-rift-${tag}-wall-nl`, cx - 6.0, cz + HALF, 3.2, 0.75);
      pushWall(`prop-rift-${tag}-wall-nr`, cx + 6.0, cz + HALF, 3.2, 0.75);
      // Corridor side walls bridging to (col, row+1)
      pushWall(`prop-rift-${tag}-corr-nl`, cx - 3.3, cz + 11.0, 0.65, 1.8);
      pushWall(`prop-rift-${tag}-corr-nr`, cx + 3.3, cz + 11.0, 0.65, 1.8);
    }

    // SOUTH WALL (-Z)
    if (!hasSouth) {
      pushWall(`prop-rift-${tag}-wall-s`, cx, cz - HALF, 8.8, 0.75);
    } else {
      pushWall(`prop-rift-${tag}-wall-sl`, cx - 6.0, cz - HALF, 3.2, 0.75);
      pushWall(`prop-rift-${tag}-wall-sr`, cx + 6.0, cz - HALF, 3.2, 0.75);
    }

    // EAST WALL (+X)
    if (!hasEast) {
      pushWall(`prop-rift-${tag}-wall-e`, cx + HALF, cz, 0.75, 8.8);
    } else {
      pushWall(`prop-rift-${tag}-wall-et`, cx + HALF, cz + 6.0, 0.75, 3.2);
      pushWall(`prop-rift-${tag}-wall-eb`, cx + HALF, cz - 6.0, 0.75, 3.2);
      // Corridor side walls bridging to (col+1, row)
      pushWall(`prop-rift-${tag}-corr-et`, cx + 11.0, cz + 3.3, 1.8, 0.65);
      pushWall(`prop-rift-${tag}-corr-eb`, cx + 11.0, cz - 3.3, 1.8, 0.65);
    }

    // WEST WALL (-X)
    if (!hasWest) {
      pushWall(`prop-rift-${tag}-wall-w`, cx - HALF, cz, 0.75, 8.8);
    } else {
      pushWall(`prop-rift-${tag}-wall-wt`, cx - HALF, cz + 6.0, 0.75, 3.2);
      pushWall(`prop-rift-${tag}-wall-wb`, cx - HALF, cz - 6.0, 0.75, 3.2);
    }
  }

  // 3. Populate Each Room Based on Role!
  const hpScale = 1 + (depth - 1) * 0.28;

  for (const rm of rooms) {
    const { col, row, cx, cz, role } = rm;
    const tag = `r${col}${row}`;

    if (role === "start") {
      // Breakable supply pots in the Start Chamber
      props.push(
        {
          id: `prop-rift-${tag}-pot-1`,
          prefab: "clay_pot",
          name: "Rift Supply Pot",
          zone: "rift",
          x: cx + 4.8,
          y: 0,
          z: cz - 3.5,
          rotY: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
          hasCollider: true,
          colliderWidth: 1.0,
          colliderDepth: 1.0,
          colliderKind: "ruin",
          potReward: "heart",
        },
        {
          id: `prop-rift-${tag}-pot-2`,
          prefab: "clay_pot",
          name: "Rift Supply Pot",
          zone: "rift",
          x: cx + 6.2,
          y: 0,
          z: cz - 3.5,
          rotY: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
          hasCollider: true,
          colliderWidth: 1.0,
          colliderDepth: 1.0,
          colliderKind: "ruin",
          potReward: "arrows_10",
        }
      );
    } else if (role === "combat" || role === "elite") {
      const packCount = role === "elite" ? 4 : 3;
      const offsets = [
        { ox: -3.6, oz: -2.8 },
        { ox: 3.6, oz: -2.8 },
        { ox: -3.2, oz: 3.2 },
        { ox: 3.2, oz: 3.2 },
      ];

      for (let i = 0; i < packCount; i++) {
        const isChampion = role === "elite" && i === packCount - 1;
        const pool = isChampion ? bCfg.heavyPool : bCfg.fodderPool;
        const kind = pool[Math.floor(rng() * pool.length)];
        const baseHp =
          kind === "knight"
            ? 7
            : kind === "burrower" || kind === "turret"
            ? 5
            : 4;
        const scaledHp = Math.max(3, Math.round(baseHp * hpScale) + (isChampion ? 3 : 0));

        let shieldArmor: EnemyShieldArmor = "none";
        if (biome === "glacial" && (kind === "goblin" || kind === "knight") && rng() < 0.55) {
          shieldArmor = "ice";
        } else if (kind === "goblin" && rng() < 0.4) {
          shieldArmor = "wood";
        }

        const shockArmor =
          biome === "void" && kind === "slime" && rng() < 0.65;

        enemies.push({
          id: `rift-en-${tag}-${i}-f${depth}`,
          kind,
          zone: "rift",
          x: Number((cx + offsets[i].ox).toFixed(2)),
          z: Number((cz + offsets[i].oz).toFixed(2)),
          hp: scaledHp,
          weight: getDefaultEnemyWeight(kind),
          aggroRadius: 10.5,
          speed: kind === "turret" ? 0 : isChampion ? 5.8 : 5.2,
          damage: depth >= 3 && isChampion ? 2 : 1,
          rupeeDrop: isChampion ? "red" : rng() > 0.45 ? "blue" : "green",
          shieldArmor,
          shockArmor,
          isBounty: isChampion,
        });
      }

      // Add a soft dirt patch or explosive boulder in combat rooms
      if (rng() > 0.4) {
        props.push({
          id: `prop-rift-${tag}-dirt`,
          prefab: "dirt_patch",
          name: "Abyssal Dirt Mound",
          zone: "rift",
          x: cx,
          y: 0,
          z: cz,
          rotY: 0,
          scaleX: 1.15,
          scaleY: 1,
          scaleZ: 1.15,
          hasCollider: false,
          colliderWidth: 0,
          colliderDepth: 0,
          colliderKind: "ruin",
          buriedReward: rng() > 0.5 ? "rupee_red" : "heart",
        });
      }
    } else if (role === "vault") {
      // Treasure Vault: guarded by pots, rupees, and 2 Elite Sentries!
      rupees.push(
        {
          id: `rift-rupee-${tag}-1`,
          zone: "rift",
          x: cx - 2.4,
          z: cz + 2.2,
          tier: "red",
          value: 20,
        },
        {
          id: `rift-rupee-${tag}-2`,
          zone: "rift",
          x: cx + 2.4,
          z: cz + 2.2,
          tier: "red",
          value: 20,
        },
        {
          id: `rift-rupee-${tag}-3`,
          zone: "rift",
          x: cx,
          z: cz - 2.6,
          tier: "heart",
          value: 2,
        }
      );

      props.push(
        {
          id: `prop-rift-${tag}-pot-v1`,
          prefab: "clay_pot",
          name: "Vault Treasure Pot",
          zone: "rift",
          x: cx - 4.2,
          y: 0,
          z: cz,
          rotY: 0,
          scaleX: 1.1,
          scaleY: 1.1,
          scaleZ: 1.1,
          hasCollider: true,
          colliderWidth: 1.0,
          colliderDepth: 1.0,
          colliderKind: "ruin",
          potReward: "red_rupee",
        },
        {
          id: `prop-rift-${tag}-pot-v2`,
          prefab: "clay_pot",
          name: "Vault Bomb Pot",
          zone: "rift",
          x: cx + 4.2,
          y: 0,
          z: cz,
          rotY: 0,
          scaleX: 1.1,
          scaleY: 1.1,
          scaleZ: 1.1,
          hasCollider: true,
          colliderWidth: 1.0,
          colliderDepth: 1.0,
          colliderKind: "ruin",
          potReward: "bombs_5",
        }
      );

      enemies.push({
        id: `rift-vault-warden-${tag}-f${depth}`,
        kind: "knight",
        zone: "rift",
        x: cx,
        z: cz + 3.2,
        hp: Math.round(7 * hpScale),
        weight: 12.0,
        aggroRadius: 9.5,
        speed: 5.3,
        damage: 1,
        rupeeDrop: "red",
        isBounty: true,
      });
    } else if (role === "shrine") {
      // Shrine room has 2 Guardians protecting the Abyssal Blessing Shrine
      enemies.push(
        {
          id: `rift-shrine-guard-1-${tag}-f${depth}`,
          kind: bCfg.fodderPool[0],
          zone: "rift",
          x: cx - 3.5,
          z: cz + 2.5,
          hp: Math.round(4 * hpScale),
          weight: 2.0,
          aggroRadius: 9.5,
          speed: 5.2,
          damage: 1,
          rupeeDrop: "blue",
        },
        {
          id: `rift-shrine-guard-2-${tag}-f${depth}`,
          kind: bCfg.fodderPool[1] ?? "archer",
          zone: "rift",
          x: cx + 3.5,
          z: cz + 2.5,
          hp: Math.round(4 * hpScale),
          weight: 1.5,
          aggroRadius: 9.5,
          speed: 5.2,
          damage: 1,
          rupeeDrop: "blue",
        }
      );
    } else if (role === "boss") {
      // Rift Guardian Boss Room!
      const bossHp = Math.min(24, 9 + (depth - 1) * 3);
      enemies.push(
        {
          id: `rift-boss-f${depth}`,
          kind: "boss",
          zone: "rift",
          x: cx,
          z: cz + 1.5,
          hp: bossHp,
          weight: 100.0,
          aggroRadius: 15.0,
          speed: 4.8 + Math.min(1.2, (depth - 1) * 0.2),
          damage: depth >= 3 ? 2 : 1,
          rupeeDrop: "boss",
        },
        {
          id: `rift-boss-guard-1-f${depth}`,
          kind: bCfg.fodderPool[0],
          zone: "rift",
          x: cx - 4.8,
          z: cz - 2.5,
          hp: Math.round(4 * hpScale),
          weight: 2.0,
          aggroRadius: 12.5,
          speed: 5.2,
          damage: 1,
          rupeeDrop: "blue",
        },
        {
          id: `rift-boss-guard-2-f${depth}`,
          kind: bCfg.fodderPool[1] ?? "minion",
          zone: "rift",
          x: cx + 4.8,
          z: cz - 2.5,
          hp: Math.round(4 * hpScale),
          weight: 2.0,
          aggroRadius: 12.5,
          speed: 5.2,
          damage: 1,
          rupeeDrop: "blue",
        }
      );
    }
  }

  const shrinePos = {
    x: (shrineNode.col - 1) * CELL_STEP,
    z: (shrineNode.row - 1) * CELL_STEP,
  };
  const vaultChestPos = {
    x: (vaultNode.col - 1) * CELL_STEP,
    z: (vaultNode.row - 1) * CELL_STEP,
  };
  const bossRoomCenter = {
    x: (bossNode.col - 1) * CELL_STEP,
    z: (bossNode.row - 1) * CELL_STEP,
  };
  const bossChestPos = {
    x: bossRoomCenter.x - 4.2,
    z: bossRoomCenter.z + 5.2,
  };
  const nextFloorPortalPos = {
    x: bossRoomCenter.x + 4.2,
    z: bossRoomCenter.z + 5.2,
  };

  const portals: MapPortal[] = [
    // Portal in Start Chamber (0, -26.5) returning to Crossroads Village
    {
      id: "portal-rift-exit-overworld",
      zone: "rift",
      x: 0,
      z: -27.2,
      radius: 1.85,
      targetZone: "overworld",
      targetX: RIFT_ENTRANCE_POS.x,
      targetZ: RIFT_ENTRANCE_POS.z - 2.6,
      targetFacing: Math.PI,
      label: "RETURN TO CROSSROADS VILLAGE",
      sublabel: "Keep All Spoils, Rupees & Monster Cores",
      color: "cyan",
    },
  ];

  return {
    floorDepth: depth,
    seed,
    biome,
    biomeTitle: bCfg.title,
    floorColorHex: bCfg.floorHex,
    bossName,
    eliteAffixLabel,
    rooms,
    shrinePos,
    vaultChestPos,
    bossChestPos,
    nextFloorPortalPos,
    props,
    enemies,
    rupees,
    portals,
  };
}
