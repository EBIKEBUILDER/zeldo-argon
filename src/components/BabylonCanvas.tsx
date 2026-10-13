"use client";

import React, { useEffect, useRef } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { useGameStore } from "@/store/gameStore";
import {
  BOSS_CHEST_POS,
  DUNGEON_EXIT_POS,
  DUNGEON_KEY_POS,
  LOCKED_GATE_POS,
  OVERWORLD_PORTAL_POS,
  WORLD_OBSTACLES,
  ZoneId,
} from "@/game/worldData";

interface EnemyMeshRig {
  root: TransformNode;
  body: Mesh;
  weapon: TransformNode;
  telegraphRing: Mesh;
  hpBarHolder: TransformNode;
  hpBarBg: Mesh;
  hpBarFill: Mesh;
  barWidth: number;
  barY: number;
  materials: StandardMaterial[];
  baseColors: Color3[];
  // Boss-specific visual nodes
  chargeCorridorRoot?: TransformNode;
  chargeCorridorMat?: StandardMaterial;
  lungeShieldMesh?: Mesh;
  stunStarsRoot?: TransformNode;
}

interface ProjectileVisualRig {
  root: TransformNode;
  orb: Mesh;
  outerRing: Mesh;
  innerCoreRing: Mesh;
  fillDisc: Mesh;
  arcDots: Mesh[];
}

interface HazardVisualRig {
  root: TransformNode;
  poolDisc: Mesh;
  rimRing: Mesh;
  bubbles: Mesh[];
}

export default function BabylonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.08, 0.14, 0.1, 1);

    // Overhead Zeldo-style angled camera (fixed yaw, angled pitch)
    const camera = new ArcRotateCamera(
      "overheadCam",
      -Math.PI / 2,
      0.72, // ~41 degrees from vertical for classic overhead 3D adventure feel
      25,
      new Vector3(0, 0, -32),
      scene
    );
    camera.lowerRadiusLimit = 25;
    camera.upperRadiusLimit = 25;

    // Lights
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.88;
    hemiLight.diffuse = new Color3(1.0, 0.98, 0.9);
    hemiLight.groundColor = new Color3(0.24, 0.3, 0.26);

    const dirLight = new DirectionalLight("dirLight", new Vector3(-0.45, -1.0, -0.35), scene);
    dirLight.intensity = 0.72;
    dirLight.diffuse = new Color3(1.0, 0.93, 0.78);

    const sanctumPointLight = new PointLight("sanctumLight", new Vector3(0, 5, 28), scene);
    sanctumPointLight.intensity = 0;
    sanctumPointLight.diffuse = new Color3(1.0, 0.78, 0.32);
    sanctumPointLight.range = 24;

    // Shared helper to create StandardMaterial
    const makeMat = (
      name: string,
      diffuse: Color3,
      emissive?: Color3,
      specular = new Color3(0.12, 0.12, 0.12),
      alpha = 1.0
    ): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = diffuse;
      if (emissive) m.emissiveColor = emissive;
      m.specularColor = specular;
      m.alpha = alpha;
      return m;
    };

    // =========================================================
    // ZONE CONTAINERS: OVERWORLD & DUNGEON
    // =========================================================
    const overworldRoot = new TransformNode("overworldRoot", scene);
    const dungeonRoot = new TransformNode("dungeonRoot", scene);

    // --- OVERWORLD ENVIRONMENT ---
    const owGround = MeshBuilder.CreateGround(
      "owGround",
      { width: 84, height: 84, subdivisions: 4 },
      scene
    );
    owGround.material = makeMat("owGrassMat", new Color3(0.24, 0.54, 0.27));
    owGround.parent = overworldRoot;

    // Decorative lighter meadow patches & dirt paths
    const pathMat = makeMat("owPathMat", new Color3(0.74, 0.64, 0.45));
    const stoneFloorMat = makeMat("owStoneFloorMat", new Color3(0.52, 0.53, 0.56));

    // Main North-South Road
    const mainRoad = MeshBuilder.CreateBox(
      "mainRoad",
      { width: 5.2, height: 0.06, depth: 68 },
      scene
    );
    mainRoad.position.set(0, 0.03, 0);
    mainRoad.material = pathMat;
    mainRoad.parent = overworldRoot;

    // Crossroads East-West Road
    const crossRoad = MeshBuilder.CreateBox(
      "crossRoad",
      { width: 54, height: 0.05, depth: 4.4 },
      scene
    );
    crossRoad.position.set(0, 0.025, -2.5);
    crossRoad.material = pathMat;
    crossRoad.parent = overworldRoot;

    // Western Watchtower Ruins Courtyard Floor
    const westCourtyard = MeshBuilder.CreateBox(
      "westCourtyard",
      { width: 16, height: 0.07, depth: 28 },
      scene
    );
    westCourtyard.position.set(-26, 0.035, 1);
    westCourtyard.material = stoneFloorMat;
    westCourtyard.parent = overworldRoot;

    // Wooden Bridge across the river at z = -20.5
    const woodMat = makeMat("woodMat", new Color3(0.52, 0.34, 0.18));
    const bridgeDeck = MeshBuilder.CreateBox(
      "bridgeDeck",
      { width: 7.4, height: 0.28, depth: 5.2 },
      scene
    );
    bridgeDeck.position.set(0, 0.16, -20.5);
    bridgeDeck.material = woodMat;
    bridgeDeck.parent = overworldRoot;

    for (const side of [-3.4, 3.4]) {
      for (const zOff of [-22.6, -20.5, -18.4]) {
        const post = MeshBuilder.CreateCylinder(
          `bridgePost-${side}-${zOff}`,
          { diameter: 0.45, height: 1.3 },
          scene
        );
        post.position.set(side, 0.65, zOff);
        post.material = woodMat;
        post.parent = overworldRoot;
      }
      const rail = MeshBuilder.CreateBox(
        `bridgeRail-${side}`,
        { width: 0.22, height: 0.22, depth: 4.8 },
        scene
      );
      rail.position.set(side, 1.05, -20.5);
      rail.material = woodMat;
      rail.parent = overworldRoot;
    }

    // Northern Sanctum Temple Facade & Glowing Portal at (0, 34.8)
    const templeStoneMat = makeMat("templeStoneMat", new Color3(0.46, 0.48, 0.54));
    const templeArchLeft = MeshBuilder.CreateBox(
      "templeArchLeft",
      { width: 2.6, height: 5.5, depth: 2.6 },
      scene
    );
    templeArchLeft.position.set(-3.6, 2.75, 35);
    templeArchLeft.material = templeStoneMat;
    templeArchLeft.parent = overworldRoot;

    const templeArchRight = MeshBuilder.CreateBox(
      "templeArchRight",
      { width: 2.6, height: 5.5, depth: 2.6 },
      scene
    );
    templeArchRight.position.set(3.6, 2.75, 35);
    templeArchRight.material = templeStoneMat;
    templeArchRight.parent = overworldRoot;

    const templeLintel = MeshBuilder.CreateBox(
      "templeLintel",
      { width: 10.5, height: 1.6, depth: 3.2 },
      scene
    );
    templeLintel.position.set(0, 5.8, 35);
    templeLintel.material = templeStoneMat;
    templeLintel.parent = overworldRoot;

    const overworldPortalDisc = MeshBuilder.CreateCylinder(
      "owPortalDisc",
      { diameter: 4.2, height: 0.15, tessellation: 24 },
      scene
    );
    overworldPortalDisc.position.set(OVERWORLD_PORTAL_POS.x, 0.1, OVERWORLD_PORTAL_POS.z);
    overworldPortalDisc.material = makeMat(
      "owPortalMat",
      new Color3(0.2, 0.7, 1.0),
      new Color3(0.15, 0.55, 0.95),
      new Color3(0.5, 0.8, 1.0),
      0.85
    );
    overworldPortalDisc.parent = overworldRoot;

    // Western Ruins Key Pedestal at (-28, 11)
    const keyPedestal = MeshBuilder.CreateCylinder(
      "keyPedestal",
      { diameterTop: 1.8, diameterBottom: 2.3, height: 0.7, tessellation: 8 },
      scene
    );
    keyPedestal.position.set(DUNGEON_KEY_POS.x, 0.35, DUNGEON_KEY_POS.z);
    keyPedestal.material = makeMat(
      "keyPedestalMat",
      new Color3(0.65, 0.62, 0.54),
      new Color3(0.12, 0.1, 0.04)
    );
    keyPedestal.parent = overworldRoot;

    // Floating 3D Golden Sanctum Key
    const keyNode = new TransformNode("sanctumKeyNode", scene);
    keyNode.parent = overworldRoot;
    keyNode.position.set(DUNGEON_KEY_POS.x, 1.6, DUNGEON_KEY_POS.z);

    const goldKeyMat = makeMat(
      "goldKeyMat",
      new Color3(1.0, 0.84, 0.2),
      new Color3(0.45, 0.32, 0.04),
      new Color3(1, 1, 0.8)
    );
    const keyBow = MeshBuilder.CreateTorus(
      "keyBow",
      { diameter: 0.75, thickness: 0.18, tessellation: 20 },
      scene
    );
    keyBow.rotation.x = Math.PI / 2;
    keyBow.position.set(0, 0.45, 0);
    keyBow.material = goldKeyMat;
    keyBow.parent = keyNode;

    const keyShaft = MeshBuilder.CreateCylinder(
      "keyShaft",
      { diameter: 0.18, height: 0.95 },
      scene
    );
    keyShaft.position.set(0, -0.1, 0);
    keyShaft.material = goldKeyMat;
    keyShaft.parent = keyNode;

    const keyBit1 = MeshBuilder.CreateBox(
      "keyBit1",
      { width: 0.32, height: 0.14, depth: 0.14 },
      scene
    );
    keyBit1.position.set(0.18, -0.35, 0);
    keyBit1.material = goldKeyMat;
    keyBit1.parent = keyNode;

    const keyBit2 = MeshBuilder.CreateBox(
      "keyBit2",
      { width: 0.26, height: 0.14, depth: 0.14 },
      scene
    );
    keyBit2.position.set(0.15, -0.15, 0);
    keyBit2.material = goldKeyMat;
    keyBit2.parent = keyNode;

    const keyBeaconRing = MeshBuilder.CreateTorus(
      "keyBeaconRing",
      { diameter: 2.3, thickness: 0.08, tessellation: 28 },
      scene
    );
    keyBeaconRing.position.set(DUNGEON_KEY_POS.x, 0.12, DUNGEON_KEY_POS.z);
    keyBeaconRing.material = goldKeyMat;
    keyBeaconRing.parent = overworldRoot;

    // --- DUNGEON ENVIRONMENT ---
    const dgGround = MeshBuilder.CreateGround(
      "dgGround",
      { width: 44, height: 78, subdivisions: 4 },
      scene
    );
    dgGround.material = makeMat("dgFloorMat", new Color3(0.18, 0.19, 0.25));
    dgGround.parent = dungeonRoot;

    // Dungeon ornate carpet/runner path from entrance to Boss Sanctum
    const dgRunner = MeshBuilder.CreateBox(
      "dgRunner",
      { width: 4.5, height: 0.05, depth: 66 },
      scene
    );
    dgRunner.position.set(0, 0.025, -1);
    dgRunner.material = makeMat(
      "dgRunnerMat",
      new Color3(0.42, 0.14, 0.18),
      new Color3(0.08, 0.02, 0.03)
    );
    dgRunner.parent = dungeonRoot;

    // Dungeon Return Portal at (0, -34.5)
    const dgExitDisc = MeshBuilder.CreateCylinder(
      "dgExitDisc",
      { diameter: 3.2, height: 0.12, tessellation: 24 },
      scene
    );
    dgExitDisc.position.set(DUNGEON_EXIT_POS.x, 0.08, DUNGEON_EXIT_POS.z);
    dgExitDisc.material = makeMat(
      "dgExitMat",
      new Color3(0.2, 0.75, 1.0),
      new Color3(0.12, 0.45, 0.85)
    );
    dgExitDisc.parent = dungeonRoot;

    // Boss Sanctum Arcane Floor Ring at (0, 24)
    const bossArenaRing = MeshBuilder.CreateTorus(
      "bossArenaRing",
      { diameter: 14, thickness: 0.22, tessellation: 36 },
      scene
    );
    bossArenaRing.position.set(0, 0.06, 24);
    bossArenaRing.material = makeMat(
      "bossArenaRingMat",
      new Color3(0.75, 0.2, 0.25),
      new Color3(0.35, 0.06, 0.08)
    );
    bossArenaRing.parent = dungeonRoot;

    // Build all obstacles from WORLD_OBSTACLES for both zones
    const cliffMat = makeMat("cliffMat", new Color3(0.44, 0.39, 0.34));
    const cliffTopMat = makeMat("cliffTopMat", new Color3(0.22, 0.48, 0.24));
    const waterMat = makeMat(
      "waterMat",
      new Color3(0.16, 0.52, 0.82),
      new Color3(0.05, 0.18, 0.34),
      new Color3(0.7, 0.85, 1.0)
    );
    const ruinMat = makeMat("ruinMat", new Color3(0.55, 0.54, 0.5));
    const foliageMat = makeMat("foliageMat", new Color3(0.16, 0.44, 0.2));
    const dgWallMat = makeMat("dgWallMat", new Color3(0.26, 0.28, 0.36));
    const dgPillarMat = makeMat("dgPillarMat", new Color3(0.36, 0.38, 0.48));
    const ironGateMat = makeMat(
      "ironGateMat",
      new Color3(0.28, 0.3, 0.34),
      new Color3(0.05, 0.05, 0.07),
      new Color3(0.6, 0.6, 0.65)
    );

    const lockedGateNode = new TransformNode("lockedGateNode", scene);
    lockedGateNode.parent = dungeonRoot;
    lockedGateNode.position.set(LOCKED_GATE_POS.x, 0, LOCKED_GATE_POS.z);

    WORLD_OBSTACLES.forEach((obs) => {
      const w = obs.maxX - obs.minX;
      const d = obs.maxZ - obs.minZ;
      const h = obs.height ?? 4.0;
      const cx = (obs.minX + obs.maxX) / 2;
      const cz = (obs.minZ + obs.maxZ) / 2;
      const parentNode = obs.zone === "overworld" ? overworldRoot : dungeonRoot;

      if (obs.kind === "gate") {
        // Construct detailed iron bars + golden lock plate inside lockedGateNode
        const barCount = 9;
        for (let b = 0; b < barCount; b++) {
          const bx = -3.0 + (b / (barCount - 1)) * 6.0;
          const bar = MeshBuilder.CreateCylinder(
            `gateBar-${b}`,
            { diameter: 0.26, height: h },
            scene
          );
          bar.position.set(bx, h / 2, 0);
          bar.material = ironGateMat;
          bar.parent = lockedGateNode;
        }
        const crossBeamTop = MeshBuilder.CreateBox(
          "gateBeamTop",
          { width: w, height: 0.38, depth: 0.5 },
          scene
        );
        crossBeamTop.position.set(0, h - 0.5, 0);
        crossBeamTop.material = ironGateMat;
        crossBeamTop.parent = lockedGateNode;

        const crossBeamMid = MeshBuilder.CreateBox(
          "gateBeamMid",
          { width: w, height: 0.34, depth: 0.45 },
          scene
        );
        crossBeamMid.position.set(0, h * 0.45, 0);
        crossBeamMid.material = ironGateMat;
        crossBeamMid.parent = lockedGateNode;

        const lockPlate = MeshBuilder.CreateBox(
          "gateLockPlate",
          { width: 1.1, height: 1.2, depth: 0.65 },
          scene
        );
        lockPlate.position.set(0, h * 0.45, 0);
        lockPlate.material = goldKeyMat;
        lockPlate.parent = lockedGateNode;
        return;
      }

      if (obs.kind === "tree") {
        // Render cluster of stylized pine trees inside this bounding box
        const cols = Math.max(1, Math.round(w / 2.6));
        const rows = Math.max(1, Math.round(d / 2.6));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const tx = obs.minX + ((c + 0.5) / cols) * w;
            const tz = obs.minZ + ((r + 0.5) / rows) * d;
            const trunk = MeshBuilder.CreateCylinder(
              `trunk-${obs.id}-${r}-${c}`,
              { diameter: 0.65, height: 1.6 },
              scene
            );
            trunk.position.set(tx, 0.8, tz);
            trunk.material = woodMat;
            trunk.parent = parentNode;

            const cone1 = MeshBuilder.CreateCylinder(
              `cone1-${obs.id}-${r}-${c}`,
              { diameterTop: 0.2, diameterBottom: 2.5, height: 2.4, tessellation: 7 },
              scene
            );
            cone1.position.set(tx, 2.3, tz);
            cone1.material = foliageMat;
            cone1.parent = parentNode;

            const cone2 = MeshBuilder.CreateCylinder(
              `cone2-${obs.id}-${r}-${c}`,
              { diameterTop: 0.1, diameterBottom: 1.9, height: 2.0, tessellation: 7 },
              scene
            );
            cone2.position.set(tx, 3.6, tz);
            cone2.material = foliageMat;
            cone2.parent = parentNode;
          }
        }
        return;
      }

      if (obs.kind === "pillar") {
        const col = MeshBuilder.CreateCylinder(
          `pillar-${obs.id}`,
          { diameterTop: w * 0.88, diameterBottom: w, height: h, tessellation: 12 },
          scene
        );
        col.position.set(cx, h / 2, cz);
        col.material = obs.zone === "dungeon" ? dgPillarMat : ruinMat;
        col.parent = parentNode;

        const cap = MeshBuilder.CreateBox(
          `pillarCap-${obs.id}`,
          { width: w * 1.12, height: 0.45, depth: d * 1.12 },
          scene
        );
        cap.position.set(cx, h - 0.2, cz);
        cap.material = obs.zone === "dungeon" ? dgPillarMat : ruinMat;
        cap.parent = parentNode;
        return;
      }

      const box = MeshBuilder.CreateBox(
        `obs-${obs.id}`,
        { width: w, height: h, depth: d },
        scene
      );
      box.position.set(cx, obs.kind === "water" ? 0.02 : h / 2, cz);

      if (obs.kind === "water") {
        box.material = waterMat;
      } else if (obs.kind === "cliff") {
        box.material = cliffMat;
        const grassCap = MeshBuilder.CreateBox(
          `cliffCap-${obs.id}`,
          { width: w + 0.15, height: 0.35, depth: d + 0.15 },
          scene
        );
        grassCap.position.set(cx, h + 0.1, cz);
        grassCap.material = cliffTopMat;
        grassCap.parent = parentNode;
      } else if (obs.kind === "ruin") {
        box.material = ruinMat;
      } else {
        box.material = dgWallMat;
      }

      box.parent = parentNode;
    });

    // --- BOSS CHEST & SEAL IN DUNGEON ROOM 3 (0, 33) ---
    const chestRoot = new TransformNode("bossChestRoot", scene);
    chestRoot.parent = dungeonRoot;
    chestRoot.position.set(BOSS_CHEST_POS.x, 0, BOSS_CHEST_POS.z);

    const chestDais = MeshBuilder.CreateBox(
      "chestDais",
      { width: 4.4, height: 0.45, depth: 3.4 },
      scene
    );
    chestDais.position.set(0, 0.225, 0);
    chestDais.material = dgPillarMat;
    chestDais.parent = chestRoot;

    const chestBase = MeshBuilder.CreateBox(
      "chestBase",
      { width: 2.1, height: 1.05, depth: 1.4 },
      scene
    );
    chestBase.position.set(0, 0.95, 0);
    chestBase.material = woodMat;
    chestBase.parent = chestRoot;

    const chestTrim = MeshBuilder.CreateBox(
      "chestTrim",
      { width: 2.2, height: 0.25, depth: 1.48 },
      scene
    );
    chestTrim.position.set(0, 1.38, 0);
    chestTrim.material = goldKeyMat;
    chestTrim.parent = chestRoot;

    const chestLid = MeshBuilder.CreateCylinder(
      "chestLid",
      { diameter: 1.4, height: 2.12, tessellation: 16 },
      scene
    );
    chestLid.rotation.z = Math.PI / 2;
    chestLid.position.set(0, 1.5, 0);
    chestLid.material = goldKeyMat;
    chestLid.parent = chestRoot;

    // Crimson Arcane Seal Ring around Chest (visible while Boss is alive)
    const chestSealRing = MeshBuilder.CreateTorus(
      "chestSealRing",
      { diameter: 3.4, thickness: 0.16, tessellation: 28 },
      scene
    );
    chestSealRing.position.set(0, 1.1, 0);
    chestSealRing.material = makeMat(
      "chestSealMat",
      new Color3(1.0, 0.15, 0.25),
      new Color3(0.85, 0.08, 0.18)
    );
    chestSealRing.parent = chestRoot;

    // Golden Unsealed Aura Ring (visible once Boss is defeated)
    const chestUnsealedRing = MeshBuilder.CreateTorus(
      "chestUnsealedRing",
      { diameter: 3.6, thickness: 0.14, tessellation: 32 },
      scene
    );
    chestUnsealedRing.position.set(0, 0.55, 0);
    chestUnsealedRing.material = goldKeyMat;
    chestUnsealedRing.parent = chestRoot;

    // The Zeldo Crest (3 interlocking golden diamond shards rising from chest)
    const zeldoCrestNode = new TransformNode("zeldoCrestNode", scene);
    zeldoCrestNode.parent = chestRoot;
    zeldoCrestNode.position.set(0, 2.7, 0);

    const crestOffsets = [
      { x: 0, y: 0.48 },
      { x: -0.42, y: -0.24 },
      { x: 0.42, y: -0.24 },
    ];
    crestOffsets.forEach((pos, idx) => {
      const shard = MeshBuilder.CreatePolyhedron(
        `zeldoCrestShard-${idx}`,
        { type: 1, size: 0.32 },
        scene
      );
      shard.position.set(pos.x, pos.y, 0);
      shard.material = goldKeyMat;
      shard.parent = zeldoCrestNode;
    });

    // =========================================================
    // HERO 3D CHARACTER RIG
    // =========================================================
    const heroRoot = new TransformNode("heroRoot", scene);

    const tunicMat = makeMat("heroTunicMat", new Color3(0.16, 0.68, 0.32), new Color3(0.03, 0.12, 0.05));
    const skinMat = makeMat("heroSkinMat", new Color3(0.96, 0.8, 0.64));
    const hairMat = makeMat("heroHairMat", new Color3(0.92, 0.76, 0.24));
    const shieldMat = makeMat("heroShieldMat", new Color3(0.22, 0.42, 0.78), new Color3(0.05, 0.1, 0.22));
    const bladeMat = makeMat(
      "heroBladeMat",
      new Color3(0.88, 0.94, 1.0),
      new Color3(0.3, 0.45, 0.65),
      new Color3(1, 1, 1)
    );

    const heroTorso = MeshBuilder.CreateCylinder(
      "heroTorso",
      { diameterTop: 0.72, diameterBottom: 0.95, height: 1.15, tessellation: 12 },
      scene
    );
    heroTorso.position.set(0, 0.75, 0);
    heroTorso.material = tunicMat;
    heroTorso.parent = heroRoot;

    const heroHead = MeshBuilder.CreateSphere(
      "heroHead",
      { diameter: 0.78, segments: 12 },
      scene
    );
    heroHead.position.set(0, 1.62, 0);
    heroHead.material = skinMat;
    heroHead.parent = heroRoot;

    const heroHairBand = MeshBuilder.CreateTorus(
      "heroHairBand",
      { diameter: 0.74, thickness: 0.16, tessellation: 16 },
      scene
    );
    heroHairBand.position.set(0, 1.72, -0.02);
    heroHairBand.material = hairMat;
    heroHairBand.parent = heroRoot;

    const heroCap = MeshBuilder.CreateCylinder(
      "heroCap",
      { diameterTop: 0.08, diameterBottom: 0.76, height: 0.95, tessellation: 10 },
      scene
    );
    heroCap.position.set(0, 2.05, -0.22);
    heroCap.rotation.x = -0.55;
    heroCap.material = tunicMat;
    heroCap.parent = heroRoot;

    // Shield on Left Arm
    const heroShield = MeshBuilder.CreateBox(
      "heroShield",
      { width: 0.16, height: 0.78, depth: 0.62 },
      scene
    );
    heroShield.position.set(-0.55, 0.88, 0.22);
    heroShield.rotation.y = -0.25;
    heroShield.material = shieldMat;
    heroShield.parent = heroRoot;

    // Sword Pivot on Right Side
    const swordPivot = new TransformNode("swordPivot", scene);
    swordPivot.position.set(0.45, 0.92, 0.1);
    swordPivot.parent = heroRoot;

    const swordHilt = MeshBuilder.CreateBox(
      "swordHilt",
      { width: 0.42, height: 0.12, depth: 0.14 },
      scene
    );
    swordHilt.position.set(0, 0, 0.35);
    swordHilt.material = goldKeyMat;
    swordHilt.parent = swordPivot;

    const swordBlade = MeshBuilder.CreateBox(
      "swordBlade",
      { width: 0.16, height: 0.08, depth: 1.65 },
      scene
    );
    swordBlade.position.set(0, 0, 1.2);
    swordBlade.material = bladeMat;
    swordBlade.parent = swordPivot;

    // Glowing Crescent Slash Arc (visible during sword attack)
    const slashArc = MeshBuilder.CreateTorus(
      "slashArc",
      { diameter: 4.1, thickness: 0.22, tessellation: 24 },
      scene
    );
    slashArc.position.set(0, 0.9, 0.55);
    slashArc.scaling.set(1.0, 0.25, 0.95);
    const slashMat = makeMat(
      "slashMat",
      new Color3(0.55, 0.95, 1.0),
      new Color3(0.45, 0.85, 1.0),
      new Color3(1, 1, 1),
      0.82
    );
    slashArc.material = slashMat;
    slashArc.parent = heroRoot;

    // =========================================================
    // DYNAMIC ENEMY, PROJECTILE, HAZARD & RUPEE REGISTRIES
    // =========================================================
    const enemyRigs = new Map<string, EnemyMeshRig>();
    const projectileRigs = new Map<string, ProjectileVisualRig>();
    const hazardRigs = new Map<string, HazardVisualRig>();
    const rupeeMeshes = new Map<string, Mesh>();

    const greenRupeeMat = makeMat(
      "greenRupeeMat",
      new Color3(0.18, 0.92, 0.42),
      new Color3(0.08, 0.45, 0.18),
      new Color3(0.9, 1.0, 0.9)
    );
    const blueRupeeMat = makeMat(
      "blueRupeeMat",
      new Color3(0.22, 0.58, 1.0),
      new Color3(0.1, 0.28, 0.65),
      new Color3(0.9, 0.95, 1.0)
    );
    const redRupeeMat = makeMat(
      "redRupeeMat",
      new Color3(1.0, 0.24, 0.32),
      new Color3(0.55, 0.08, 0.14),
      new Color3(1.0, 0.9, 0.9)
    );

    const buildEnemyRig = (
      id: string,
      kind: "slime" | "goblin" | "knight" | "minion" | "boss",
      zone: ZoneId
    ): EnemyMeshRig => {
      const root = new TransformNode(`enemy-${id}`, scene);
      const materials: StandardMaterial[] = [];
      const baseColors: Color3[] = [];

      const registerMat = (name: string, diff: Color3, em?: Color3) => {
        const m = makeMat(name, diff, em);
        materials.push(m);
        baseColors.push(diff.clone());
        return m;
      };

      const weapon = new TransformNode(`weapon-${id}`, scene);
      weapon.parent = root;

      let body: Mesh;
      let chargeCorridorRoot: TransformNode | undefined;
      let chargeCorridorMat: StandardMaterial | undefined;
      let lungeShieldMesh: Mesh | undefined;
      let stunStarsRoot: TransformNode | undefined;

      if (kind === "slime") {
        const isDungeon = zone === "dungeon";
        const slimeMat = registerMat(
          `slimeMat-${id}`,
          isDungeon ? new Color3(0.52, 0.26, 0.85) : new Color3(0.2, 0.78, 0.55),
          isDungeon ? new Color3(0.15, 0.05, 0.28) : new Color3(0.05, 0.22, 0.14)
        );
        body = MeshBuilder.CreateSphere(
          `slimeBody-${id}`,
          { diameter: 1.35, segments: 12 },
          scene
        );
        body.scaling.set(1.05, 0.78, 1.05);
        body.position.set(0, 0.52, 0);
        body.material = slimeMat;
        body.parent = root;
      } else if (kind === "goblin") {
        const gobMat = registerMat(
          `gobMat-${id}`,
          zone === "dungeon" ? new Color3(0.45, 0.32, 0.58) : new Color3(0.68, 0.42, 0.22),
          new Color3(0.08, 0.04, 0.02)
        );
        body = MeshBuilder.CreateCylinder(
          `gobBody-${id}`,
          { diameterTop: 0.75, diameterBottom: 1.0, height: 1.25, tessellation: 10 },
          scene
        );
        body.position.set(0, 0.65, 0);
        body.material = gobMat;
        body.parent = root;

        const head = MeshBuilder.CreateSphere(`gobHead-${id}`, { diameter: 0.76 }, scene);
        head.position.set(0, 1.48, 0);
        head.material = gobMat;
        head.parent = root;

        const club = MeshBuilder.CreateCylinder(
          `gobClub-${id}`,
          { diameterTop: 0.32, diameterBottom: 0.16, height: 1.1 },
          scene
        );
        club.rotation.x = Math.PI / 2;
        club.position.set(0.52, 0.85, 0.48);
        club.material = woodMat;
        club.parent = weapon;
      } else if (kind === "knight") {
        const armorMat = registerMat(
          `knightMat-${id}`,
          zone === "dungeon" ? new Color3(0.32, 0.36, 0.48) : new Color3(0.58, 0.24, 0.24),
          new Color3(0.08, 0.04, 0.06)
        );
        body = MeshBuilder.CreateBox(
          `knightBody-${id}`,
          { width: 1.15, height: 1.5, depth: 0.85 },
          scene
        );
        body.position.set(0, 0.85, 0);
        body.material = armorMat;
        body.parent = root;

        const helm = MeshBuilder.CreateCylinder(
          `knightHelm-${id}`,
          { diameter: 0.78, height: 0.72, tessellation: 10 },
          scene
        );
        helm.position.set(0, 1.85, 0);
        helm.material = armorMat;
        helm.parent = root;

        const halberd = MeshBuilder.CreateBox(
          `knightBlade-${id}`,
          { width: 0.22, height: 0.14, depth: 1.85 },
          scene
        );
        halberd.position.set(0.68, 1.0, 0.65);
        halberd.material = bladeMat;
        halberd.parent = weapon;
      } else if (kind === "minion") {
        const minionMat = registerMat(
          `minionMat-${id}`,
          new Color3(0.68, 0.18, 0.78),
          new Color3(0.28, 0.05, 0.35)
        );
        body = MeshBuilder.CreatePolyhedron(
          `minionBody-${id}`,
          { type: 1, size: 0.65 },
          scene
        );
        body.position.set(0, 1.05, 0);
        body.material = minionMat;
        body.parent = root;
      } else {
        // BOSS: Malakor, Warden of the Eclipse
        const bossArmorMat = registerMat(
          `bossMat-${id}`,
          new Color3(0.75, 0.14, 0.2),
          new Color3(0.28, 0.04, 0.06)
        );
        body = MeshBuilder.CreateCylinder(
          `bossBody-${id}`,
          { diameterTop: 1.8, diameterBottom: 2.3, height: 2.5, tessellation: 12 },
          scene
        );
        body.position.set(0, 1.35, 0);
        body.material = bossArmorMat;
        body.parent = root;

        const bossCrown = MeshBuilder.CreateTorus(
          `bossCrown-${id}`,
          { diameter: 1.3, thickness: 0.24, tessellation: 16 },
          scene
        );
        bossCrown.position.set(0, 2.85, 0);
        bossCrown.material = goldKeyMat;
        bossCrown.parent = root;

        const bossHammer = MeshBuilder.CreateBox(
          `bossHammer-${id}`,
          { width: 0.9, height: 0.65, depth: 2.4 },
          scene
        );
        bossHammer.position.set(1.25, 1.45, 0.95);
        bossHammer.material = goldKeyMat;
        bossHammer.parent = weapon;

        // 1. Boss Ground Lunge Path Telegraph Corridor (world-space positioned & rotated)
        chargeCorridorRoot = new TransformNode(`bossChargeCorridor-${id}`, scene);
        chargeCorridorMat = makeMat(
          `bossChargeCorridorMat-${id}`,
          new Color3(1.0, 0.35, 0.15),
          new Color3(0.95, 0.25, 0.1),
          new Color3(0, 0, 0),
          0.52
        );
        // Unit-depth box shifted by +0.5 on Z so scaling Z extends forward from the boss
        const corridorFill = MeshBuilder.CreateBox(
          `bossCorridorFill-${id}`,
          { width: 2.7, height: 0.05, depth: 1.0 },
          scene
        );
        corridorFill.position.set(0, 0.06, 0.5);
        corridorFill.material = chargeCorridorMat;
        corridorFill.parent = chargeCorridorRoot;

        const railMat = makeMat(
          `bossCorridorRailMat-${id}`,
          new Color3(1.0, 0.85, 0.25),
          new Color3(1.0, 0.7, 0.15)
        );
        for (const rx of [-1.35, 1.35]) {
          const sideRail = MeshBuilder.CreateBox(
            `bossCorridorRail-${id}-${rx}`,
            { width: 0.14, height: 0.09, depth: 1.0 },
            scene
          );
          sideRail.position.set(rx, 0.08, 0.5);
          sideRail.material = railMat;
          sideRail.parent = chargeCorridorRoot;
        }
        chargeCorridorRoot.setEnabled(false);

        // 2. Boss Invulnerable Lunge Shield Aura (visible while launching)
        lungeShieldMesh = MeshBuilder.CreateSphere(
          `bossLungeShield-${id}`,
          { diameter: 3.6, segments: 14 },
          scene
        );
        lungeShieldMesh.position.set(0, 1.4, 0);
        lungeShieldMesh.material = makeMat(
          `bossLungeShieldMat-${id}`,
          new Color3(1.0, 0.2, 0.25),
          new Color3(0.9, 0.15, 0.2),
          new Color3(1, 1, 1),
          0.42
        );
        lungeShieldMesh.parent = root;
        lungeShieldMesh.setEnabled(false);

        // 3. Boss Stunned Orbiting Stars (visible after crashing into a wall)
        stunStarsRoot = new TransformNode(`bossStunStars-${id}`, scene);
        stunStarsRoot.position.set(0, 3.25, 0);
        stunStarsRoot.parent = root;
        for (let s = 0; s < 4; s++) {
          const angle = (s / 4) * Math.PI * 2;
          const star = MeshBuilder.CreatePolyhedron(
            `stunStar-${id}-${s}`,
            { type: 1, size: 0.28 },
            scene
          );
          star.position.set(Math.cos(angle) * 1.15, 0, Math.sin(angle) * 1.15);
          star.material = goldKeyMat;
          star.parent = stunStarsRoot;
        }
        stunStarsRoot.setEnabled(false);
      }

      // Telegraph ground ring for windup / attack
      const telegraphRing = MeshBuilder.CreateTorus(
        `telegraph-${id}`,
        {
          diameter: kind === "boss" ? 4.4 : 2.1,
          thickness: kind === "boss" ? 0.18 : 0.1,
          tessellation: 24,
        },
        scene
      );
      telegraphRing.position.set(0, 0.08, 0);
      telegraphRing.material = makeMat(
        `teleMat-${id}`,
        new Color3(1.0, 0.22, 0.18),
        new Color3(0.9, 0.15, 0.1)
      );
      telegraphRing.parent = root;

      // World-space Billboard Overhead Enemy HP Bar (never rotates with enemy!)
      const barY = kind === "boss" ? 3.85 : kind === "knight" ? 2.55 : 2.15;
      const barW = kind === "boss" ? 2.6 : 1.25;
      const hpBarHolder = new TransformNode(`hpHolder-${id}`, scene);
      // Tilt slightly toward the overhead camera while keeping yaw locked at 0
      hpBarHolder.rotation.set(-0.72, 0, 0);

      const hpBarBg = MeshBuilder.CreateBox(
        `hpBg-${id}`,
        { width: barW, height: 0.16, depth: 0.06 },
        scene
      );
      hpBarBg.material = makeMat(`hpBgMat-${id}`, new Color3(0.1, 0.1, 0.14));
      hpBarBg.parent = hpBarHolder;

      const hpBarFill = MeshBuilder.CreateBox(
        `hpFill-${id}`,
        { width: barW - 0.06, height: 0.12, depth: 0.09 },
        scene
      );
      hpBarFill.material = makeMat(
        `hpFillMat-${id}`,
        new Color3(0.95, 0.25, 0.28),
        new Color3(0.45, 0.08, 0.1)
      );
      hpBarFill.parent = hpBarHolder;

      return {
        root,
        body,
        weapon,
        telegraphRing,
        hpBarHolder,
        hpBarBg,
        hpBarFill,
        barWidth: barW - 0.06,
        barY,
        materials,
        baseColors,
        chargeCorridorRoot,
        chargeCorridorMat,
        lungeShieldMesh,
        stunStarsRoot,
      };
    };

    const buildProjectileRig = (id: string, aoeRadius: number, directRadius: number): ProjectileVisualRig => {
      const root = new TransformNode(`projRoot-${id}`, scene);

      const orbMat = makeMat(
        `projOrbMat-${id}`,
        new Color3(0.55, 1.0, 0.2),
        new Color3(0.45, 0.85, 0.12)
      );
      const orb = MeshBuilder.CreateSphere(`projOrb-${id}`, { diameter: 0.85, segments: 12 }, scene);
      orb.material = orbMat;
      orb.parent = root;

      const outerRing = MeshBuilder.CreateTorus(
        `projOuterRing-${id}`,
        { diameter: aoeRadius * 2, thickness: 0.14, tessellation: 32 },
        scene
      );
      outerRing.material = makeMat(
        `projOuterMat-${id}`,
        new Color3(1.0, 0.45, 0.15),
        new Color3(0.95, 0.35, 0.1)
      );
      outerRing.parent = root;

      const innerCoreRing = MeshBuilder.CreateTorus(
        `projInnerRing-${id}`,
        { diameter: directRadius * 2, thickness: 0.12, tessellation: 24 },
        scene
      );
      innerCoreRing.material = makeMat(
        `projInnerMat-${id}`,
        new Color3(1.0, 0.15, 0.2),
        new Color3(0.95, 0.1, 0.15)
      );
      innerCoreRing.parent = root;

      const fillDisc = MeshBuilder.CreateCylinder(
        `projFillDisc-${id}`,
        { diameter: aoeRadius * 2, height: 0.04, tessellation: 28 },
        scene
      );
      fillDisc.material = makeMat(
        `projFillMat-${id}`,
        new Color3(0.95, 0.3, 0.15),
        new Color3(0.75, 0.2, 0.08),
        new Color3(0, 0, 0),
        0.32
      );
      fillDisc.parent = root;

      const arcDots: Mesh[] = [];
      for (let d = 0; d < 7; d++) {
        const dot = MeshBuilder.CreateSphere(`projArcDot-${id}-${d}`, { diameter: 0.24 }, scene);
        dot.material = orbMat;
        dot.parent = root;
        arcDots.push(dot);
      }

      return { root, orb, outerRing, innerCoreRing, fillDisc, arcDots };
    };

    const buildHazardRig = (id: string, radius: number): HazardVisualRig => {
      const root = new TransformNode(`hazardRoot-${id}`, scene);

      const poolDisc = MeshBuilder.CreateCylinder(
        `hazardPool-${id}`,
        { diameter: radius * 2, height: 0.06, tessellation: 28 },
        scene
      );
      poolDisc.material = makeMat(
        `hazardPoolMat-${id}`,
        new Color3(0.38, 0.88, 0.18),
        new Color3(0.28, 0.65, 0.1),
        new Color3(0, 0, 0),
        0.65
      );
      poolDisc.parent = root;

      const rimRing = MeshBuilder.CreateTorus(
        `hazardRim-${id}`,
        { diameter: radius * 2, thickness: 0.14, tessellation: 28 },
        scene
      );
      rimRing.material = makeMat(
        `hazardRimMat-${id}`,
        new Color3(0.95, 0.42, 0.12),
        new Color3(0.85, 0.3, 0.08)
      );
      rimRing.parent = root;

      const bubbles: Mesh[] = [];
      for (let b = 0; b < 5; b++) {
        const bub = MeshBuilder.CreateSphere(`hazardBub-${id}-${b}`, { diameter: 0.42 }, scene);
        bub.material = makeMat(
          `hazardBubMat-${id}-${b}`,
          new Color3(0.65, 1.0, 0.25),
          new Color3(0.45, 0.85, 0.15)
        );
        bub.parent = root;
        bubbles.push(bub);
      }

      return { root, poolDisc, rimRing, bubbles };
    };

    // =========================================================
    // KEYBOARD & POINTER INPUT LISTENERS
    // =========================================================
    const pressedKeys = new Set<string>();
    let attackTriggeredOnce = false;

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (
        code === "Space" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "ArrowLeft" ||
        code === "ArrowRight"
      ) {
        e.preventDefault();
      }
      if (
        (code === "Space" || code === "KeyJ" || code === "KeyZ" || code === "Enter") &&
        !pressedKeys.has(code)
      ) {
        attackTriggeredOnce = true;
      }
      pressedKeys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        attackTriggeredOnce = true;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);

    // =========================================================
    // MAIN BABYLON RENDER & STORE VIEW SYNC LOOP
    // =========================================================
    let lastTime = performance.now();

    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Gather directional input (WASD + Arrow Keys)
      let moveX = 0;
      let moveZ = 0;
      if (pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) moveZ += 1;
      if (pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown")) moveZ -= 1;
      if (pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) moveX += 1;
      if (pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft")) moveX -= 1;

      const attackPressed =
        attackTriggeredOnce ||
        pressedKeys.has("Space") ||
        pressedKeys.has("KeyJ") ||
        pressedKeys.has("KeyZ");
      attackTriggeredOnce = false;

      // Advance serializable game state
      const store = useGameStore.getState();
      if (store.phase === "playing") {
        store.tick(dt, { moveX, moveZ, attackPressed });
      }

      // Read latest serializable state to project onto Babylon 3D scene
      const snap = useGameStore.getState();
      const t = now * 0.001;

      // 1. Zone visibility & lighting atmosphere
      const isOverworld = snap.zone === "overworld";
      overworldRoot.setEnabled(isOverworld);
      dungeonRoot.setEnabled(!isOverworld);

      if (isOverworld) {
        scene.clearColor.set(0.08, 0.16, 0.11, 1);
        hemiLight.intensity = 0.92;
        dirLight.intensity = 0.75;
        sanctumPointLight.intensity = 0;
      } else {
        scene.clearColor.set(0.05, 0.05, 0.09, 1);
        hemiLight.intensity = 0.56;
        dirLight.intensity = 0.45;
        sanctumPointLight.intensity = snap.flags.bossDefeated ? 1.35 : 0.65;
      }

      // 2. Sync Hero 3D Model
      heroRoot.position.set(
        snap.hero.x,
        Math.abs(Math.sin(snap.hero.walkCycle)) * 0.12,
        snap.hero.z
      );
      heroRoot.rotation.y = snap.hero.facing;

      // Hero invulnerability blink
      const heroBlinkHide =
        snap.hero.invulnerableTimer > 0 &&
        Math.floor(snap.hero.invulnerableTimer * 18) % 2 === 0;
      heroRoot.setEnabled(!heroBlinkHide);

      // Hero Sword Swing Animation
      if (snap.hero.isAttacking) {
        const progress = 1 - snap.hero.attackTimer / 0.25;
        swordPivot.rotation.y = -1.25 + progress * 2.5;
        slashArc.setEnabled(true);
        slashArc.rotation.y = -0.8 + progress * 1.6;
      } else {
        swordPivot.rotation.y = 0.2;
        slashArc.setEnabled(false);
      }

      // 3. Smooth Camera Follow (or scenic orbit on title screen)
      if (snap.phase === "title") {
        camera.target.set(
          Math.sin(t * 0.25) * 6,
          0,
          -14 + Math.cos(t * 0.2) * 5
        );
      } else {
        camera.target.x += (snap.hero.x - camera.target.x) * Math.min(1, dt * 8);
        camera.target.z += (snap.hero.z - camera.target.z) * Math.min(1, dt * 8);
      }

      // 4. Sync Sanctum Key & Portals
      keyNode.setEnabled(isOverworld && !snap.flags.keyPickedUp);
      keyBeaconRing.setEnabled(isOverworld && !snap.flags.keyPickedUp);
      if (!snap.flags.keyPickedUp) {
        keyNode.rotation.y = t * 2.2;
        keyNode.position.y = 1.6 + Math.sin(t * 3.2) * 0.2;
      }

      // 5. Sync Locked Gate in Dungeon
      const targetGateY = snap.flags.gateUnlocked ? -4.8 : 0;
      lockedGateNode.position.y +=
        (targetGateY - lockedGateNode.position.y) * Math.min(1, dt * 6);

      // 6. Sync Boss Chest & Zeldo Crest
      chestSealRing.setEnabled(!snap.flags.bossDefeated);
      chestSealRing.rotation.y = t * 1.8;
      chestUnsealedRing.setEnabled(snap.flags.bossDefeated);
      chestUnsealedRing.scaling.setAll(1 + Math.sin(t * 4) * 0.06);

      if (snap.flags.chestUnlocked) {
        chestLid.position.set(0, 1.85, 0.45);
        zeldoCrestNode.setEnabled(true);
        zeldoCrestNode.rotation.y = t * 2.4;
        zeldoCrestNode.position.y = 2.85 + Math.sin(t * 3.0) * 0.18;
      } else {
        chestLid.position.set(0, 1.5, 0);
        zeldoCrestNode.setEnabled(false);
      }

      // 7. Sync Enemies & Billboard Floating Health Bars
      const activeEnemyIds = new Set<string>();
      for (const enemy of snap.enemies) {
        activeEnemyIds.add(enemy.id);
        let rig = enemyRigs.get(enemy.id);
        if (!rig) {
          rig = buildEnemyRig(enemy.id, enemy.kind, enemy.zone);
          enemyRigs.set(enemy.id, rig);
        }

        const visible = enemy.zone === snap.zone && enemy.state !== "dead";
        rig.root.setEnabled(visible);
        rig.hpBarHolder.setEnabled(visible);
        if (!visible) {
          if (rig.chargeCorridorRoot) rig.chargeCorridorRoot.setEnabled(false);
          continue;
        }

        const bob =
          enemy.kind === "slime"
            ? Math.abs(Math.sin(t * 5.5)) * 0.25
            : enemy.kind === "minion"
            ? Math.sin(t * 4.5) * 0.22
            : 0;

        rig.root.position.set(enemy.x, bob, enemy.z);
        rig.root.rotation.y = enemy.facing;

        // Position Floating Health Bar in world space above enemy (locked facing camera!)
        rig.hpBarHolder.position.set(enemy.x, rig.barY + bob, enemy.z);
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        rig.hpBarFill.scaling.x = Math.max(0.001, hpRatio);
        rig.hpBarFill.position.x = -rig.barWidth * (1 - hpRatio) * 0.5;

        // Boss-specific telegraph & state visuals
        if (enemy.kind === "boss") {
          const showCorridor =
            enemy.state === "charge_aim" || enemy.state === "charge_lock";
          if (rig.chargeCorridorRoot && rig.chargeCorridorMat) {
            rig.chargeCorridorRoot.setEnabled(showCorridor);
            if (showCorridor) {
              rig.chargeCorridorRoot.position.set(enemy.x, 0, enemy.z);
              rig.chargeCorridorRoot.rotation.y = enemy.chargeAngle;
              rig.chargeCorridorRoot.scaling.z = Math.max(1, enemy.chargePathLength);

              if (enemy.state === "charge_lock") {
                // Flash urgently during locked dodge delay
                const pulse = Math.floor(t * 16) % 2 === 0;
                rig.chargeCorridorMat.emissiveColor.set(
                  pulse ? 1.0 : 0.9,
                  pulse ? 0.85 : 0.15,
                  pulse ? 0.3 : 0.15
                );
                rig.chargeCorridorMat.alpha = 0.72;
              } else {
                rig.chargeCorridorMat.emissiveColor.set(0.95, 0.35, 0.1);
                rig.chargeCorridorMat.alpha = 0.48;
              }
            }
          }

          if (rig.lungeShieldMesh) {
            rig.lungeShieldMesh.setEnabled(enemy.state === "charge_lunge");
          }

          if (rig.stunStarsRoot) {
            const isStunned = enemy.state === "stunned";
            rig.stunStarsRoot.setEnabled(isStunned);
            if (isStunned) {
              rig.stunStarsRoot.rotation.y = t * 5.5;
              rig.body.rotation.x = 0.25;
            } else {
              rig.body.rotation.x = 0;
            }
          }
        }

        // Standard Windup & Attack weapon / telegraph cue
        const isWindingOrAttacking =
          enemy.state === "windup" ||
          enemy.state === "attack" ||
          enemy.state === "charge_aim" ||
          enemy.state === "charge_lock" ||
          enemy.state === "lob_windup";
        rig.telegraphRing.setEnabled(isWindingOrAttacking);
        if (
          enemy.state === "windup" ||
          enemy.state === "charge_aim" ||
          enemy.state === "charge_lock" ||
          enemy.state === "lob_windup"
        ) {
          rig.weapon.rotation.x = -0.85;
          rig.telegraphRing.scaling.setAll(1 + Math.sin(t * 18) * 0.12);
        } else if (enemy.state === "attack" || enemy.state === "charge_lunge") {
          rig.weapon.rotation.x = 0.65;
        } else {
          rig.weapon.rotation.x = 0;
        }

        // Hit Flash highlight
        const flashing = enemy.hitFlashTimer > 0;
        rig.materials.forEach((mat, idx) => {
          if (flashing) {
            mat.diffuseColor.set(1, 1, 1);
            mat.emissiveColor.set(0.85, 0.35, 0.2);
          } else {
            mat.diffuseColor.copyFrom(rig!.baseColors[idx]);
            mat.emissiveColor.set(0.08, 0.04, 0.06);
          }
        });
      }

      // Hide any enemy rigs that were removed on restart
      enemyRigs.forEach((rig, id) => {
        if (!activeEnemyIds.has(id)) {
          rig.root.setEnabled(false);
          rig.hpBarHolder.setEnabled(false);
          if (rig.chargeCorridorRoot) rig.chargeCorridorRoot.setEnabled(false);
        }
      });

      // 8. Sync Boss Arcing Projectiles & Landing AOE Telegraphs
      const activeProjIds = new Set<string>();
      for (const proj of snap.projectiles) {
        activeProjIds.add(proj.id);
        let pRig = projectileRigs.get(proj.id);
        if (!pRig) {
          pRig = buildProjectileRig(proj.id, proj.aoeRadius, proj.directHitRadius);
          projectileRigs.set(proj.id, pRig);
        }

        const showProj = proj.zone === snap.zone;
        pRig.root.setEnabled(showProj);
        if (!showProj) continue;

        const progress = Math.min(1, proj.flightTime / proj.totalFlightTime);
        const arcPeak = 6.8;
        const curX = proj.startX + (proj.targetX - proj.startX) * progress;
        const curZ = proj.startZ + (proj.targetZ - proj.startZ) * progress;
        const curY = 1.8 * (1 - progress) + 4 * arcPeak * progress * (1 - progress);

        pRig.orb.position.set(curX, curY, curZ);
        pRig.outerRing.position.set(proj.targetX, 0.08, proj.targetZ);
        pRig.innerCoreRing.position.set(proj.targetX, 0.09, proj.targetZ);
        pRig.fillDisc.position.set(proj.targetX, 0.05, proj.targetZ);
        pRig.fillDisc.scaling.setAll(0.25 + progress * 0.75);

        // Position trajectory arc preview dots along the parabola
        pRig.arcDots.forEach((dot, idx) => {
          const s = (idx + 1) / (pRig!.arcDots.length + 1);
          const dx = proj.startX + (proj.targetX - proj.startX) * s;
          const dz = proj.startZ + (proj.targetZ - proj.startZ) * s;
          const dy = 1.8 * (1 - s) + 4 * arcPeak * s * (1 - s);
          dot.position.set(dx, dy, dz);
        });
      }

      projectileRigs.forEach((pRig, id) => {
        if (!activeProjIds.has(id)) {
          pRig.root.setEnabled(false);
        }
      });

      // 9. Sync Lingering Fire / Toxin Ground Hazard Pools
      const activeHazardIds = new Set<string>();
      for (const hazard of snap.hazards) {
        activeHazardIds.add(hazard.id);
        let hRig = hazardRigs.get(hazard.id);
        if (!hRig) {
          hRig = buildHazardRig(hazard.id, hazard.radius);
          hazardRigs.set(hazard.id, hRig);
        }

        const showHazard = hazard.zone === snap.zone && hazard.timer > 0;
        hRig.root.setEnabled(showHazard);
        if (!showHazard) continue;

        const fadeScale = hazard.timer < 0.8 ? hazard.timer / 0.8 : 1.0;
        hRig.poolDisc.position.set(hazard.x, 0.04, hazard.z);
        hRig.poolDisc.scaling.set(fadeScale, 1, fadeScale);
        hRig.rimRing.position.set(hazard.x, 0.07, hazard.z);
        hRig.rimRing.scaling.setAll(fadeScale * (1 + Math.sin(t * 8) * 0.04));

        hRig.bubbles.forEach((bub, idx) => {
          const angle = idx * 1.25 + t * 1.4;
          const rad = (0.3 + ((idx * 0.17) % 0.55)) * hazard.radius * fadeScale;
          const by = 0.15 + ((t * 1.8 + idx * 0.4) % 0.75);
          bub.position.set(
            hazard.x + Math.cos(angle) * rad,
            by,
            hazard.z + Math.sin(angle) * rad
          );
        });
      }

      hazardRigs.forEach((hRig, id) => {
        if (!activeHazardIds.has(id)) {
          hRig.root.setEnabled(false);
        }
      });

      // 10. Sync Rupees
      for (const rupee of snap.rupees) {
        let mesh = rupeeMeshes.get(rupee.id);
        if (!mesh) {
          mesh = MeshBuilder.CreatePolyhedron(
            `rupee-${rupee.id}`,
            { type: 1, size: 0.38 },
            scene
          );
          mesh.scaling.set(0.75, 1.35, 0.55);
          mesh.material =
            rupee.tier === "red"
              ? redRupeeMat
              : rupee.tier === "blue"
              ? blueRupeeMat
              : greenRupeeMat;
          rupeeMeshes.set(rupee.id, mesh);
        }

        const showRupee = rupee.zone === snap.zone && !rupee.collected;
        mesh.setEnabled(showRupee);
        if (showRupee) {
          mesh.position.set(
            rupee.x,
            0.65 + Math.sin(t * 4.2 + rupee.x) * 0.14,
            rupee.z
          );
          mesh.rotation.y = t * 3.0 + rupee.z;
        }
      }

      scene.render();
    });

    const onResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full outline-none select-none cursor-crosshair"
    />
  );
}
