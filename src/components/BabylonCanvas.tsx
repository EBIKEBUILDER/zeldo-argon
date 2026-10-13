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
  VertexBuffer,
  VertexData,
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
  body: TransformNode;
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

/**
 * Sculpts a sphere's vertices into an organic, squishy Poring-like blobby droplet shape
 * (wider wavy flat base, plump lower cheeks, tapered droplet peak on top) and recomputes normals.
 */
function createSculptedPoringBodyMesh(name: string, scene: Scene): Mesh {
  const mesh = MeshBuilder.CreateSphere(
    name,
    { diameter: 1.45, segments: 24, updatable: true },
    scene
  );
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getIndices();
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind);

  if (positions && indices && normals) {
    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i];
      const vy = positions[i + 1];
      const vz = positions[i + 2];

      // Normalize height (-0.725 .. +0.725) -> (-1 .. +1)
      const ny = vy / 0.725;
      const angle = Math.atan2(vz, vx);

      // Organic 5-lobe + 3-lobe blobby asymmetry around the equator/skirt
      const lobeWave =
        1.0 +
        0.065 * Math.sin(angle * 5 + 0.4) +
        0.045 * Math.cos(angle * 3 - 0.7);

      // Teardrop profile: wide squishy bottom & cheeks, tapered top peak
      let radialScale = lobeWave;
      let yOut = vy;
      let zShift = 0;

      if (ny < 0) {
        // Flatten the underside so it sits like a heavy jelly drop on the ground
        yOut = vy * (0.58 + 0.18 * (1 + ny));
        radialScale *= 1.18 + 0.16 * Math.cos(ny * Math.PI * 0.5);
      } else {
        // Taper toward the top droplet peak and tilt peak slightly backward
        radialScale *= 1.16 * (1 - 0.48 * Math.pow(ny, 1.35));
        yOut = vy * 1.08 + Math.pow(ny, 2.2) * 0.14;
        zShift = -Math.pow(ny, 1.8) * 0.14;
      }

      positions[i] = vx * radialScale;
      positions[i + 1] = yOut;
      positions[i + 2] = vz * radialScale + zShift;
    }

    VertexData.ComputeNormals(positions, indices, normals);
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  }

  return mesh;
}

/**
 * Helper to merge an array of meshes sharing the same material into a single draw call.
 */
function mergeGroupWithMaterial(
  name: string,
  meshes: Mesh[],
  material: StandardMaterial,
  parent: TransformNode
): Mesh | null {
  if (meshes.length === 0) return null;
  const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
  if (merged) {
    merged.name = name;
    merged.material = material;
    merged.parent = parent;
  }
  return merged;
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
    scene.blockMaterialDirtyMechanism = false;

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
    hemiLight.intensity = 0.9;
    hemiLight.diffuse = new Color3(1.0, 0.98, 0.92);
    hemiLight.groundColor = new Color3(0.26, 0.32, 0.28);

    const dirLight = new DirectionalLight("dirLight", new Vector3(-0.45, -1.0, -0.35), scene);
    dirLight.intensity = 0.76;
    dirLight.diffuse = new Color3(1.0, 0.94, 0.8);

    const sanctumPointLight = new PointLight("sanctumLight", new Vector3(0, 5.5, 28), scene);
    sanctumPointLight.intensity = 0;
    sanctumPointLight.diffuse = new Color3(1.0, 0.78, 0.32);
    sanctumPointLight.range = 26;

    // Shared helper to create clean StandardMaterials with specular control
    const makeMat = (
      name: string,
      diffuse: Color3,
      emissive?: Color3,
      specular = new Color3(0.18, 0.18, 0.18),
      alpha = 1.0,
      specularPower = 32
    ): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = diffuse;
      if (emissive) m.emissiveColor = emissive;
      m.specularColor = specular;
      m.specularPower = specularPower;
      m.alpha = alpha;
      return m;
    };

    // Shared palette materials for characters & environment
    const darkEyeMat = makeMat(
      "darkEyeMat",
      new Color3(0.06, 0.05, 0.09),
      new Color3(0.02, 0.02, 0.04),
      new Color3(0.9, 0.9, 0.95),
      1.0,
      96
    );
    const whiteEyeMat = makeMat(
      "whiteEyeMat",
      new Color3(0.98, 0.98, 1.0),
      new Color3(0.22, 0.22, 0.25),
      new Color3(0.6, 0.6, 0.6),
      1.0,
      48
    );
    const blushMat = makeMat(
      "blushMat",
      new Color3(1.0, 0.36, 0.55),
      new Color3(0.35, 0.08, 0.16)
    );
    const glowingYellowEyeMat = makeMat(
      "glowingYellowEyeMat",
      new Color3(1.0, 0.92, 0.2),
      new Color3(0.85, 0.65, 0.05)
    );
    const glowingCrimsonMat = makeMat(
      "glowingCrimsonMat",
      new Color3(1.0, 0.18, 0.24),
      new Color3(0.92, 0.12, 0.18)
    );
    const boneHornMat = makeMat(
      "boneHornMat",
      new Color3(0.92, 0.87, 0.74),
      new Color3(0.12, 0.1, 0.07),
      new Color3(0.45, 0.42, 0.35)
    );
    const darkObsidianMat = makeMat(
      "darkObsidianMat",
      new Color3(0.16, 0.15, 0.22),
      new Color3(0.04, 0.03, 0.07),
      new Color3(0.55, 0.55, 0.65),
      1.0,
      64
    );

    // =========================================================
    // ZONE CONTAINERS: OVERWORLD & DUNGEON (DRAW-CALL BATCHED)
    // =========================================================
    const overworldRoot = new TransformNode("overworldRoot", scene);
    const dungeonRoot = new TransformNode("dungeonRoot", scene);

    const owGrassMat = makeMat("owGrassMat", new Color3(0.24, 0.55, 0.28), undefined, new Color3(0.06, 0.08, 0.06));
    const pathMat = makeMat("owPathMat", new Color3(0.75, 0.65, 0.46), undefined, new Color3(0.08, 0.08, 0.06));
    const stoneFloorMat = makeMat("owStoneFloorMat", new Color3(0.54, 0.55, 0.59));
    const woodMat = makeMat("woodMat", new Color3(0.52, 0.34, 0.18));
    const templeStoneMat = makeMat("templeStoneMat", new Color3(0.48, 0.5, 0.56));
    const goldKeyMat = makeMat(
      "goldKeyMat",
      new Color3(1.0, 0.84, 0.22),
      new Color3(0.42, 0.3, 0.04),
      new Color3(1, 0.95, 0.75),
      1.0,
      64
    );
    const cliffMat = makeMat("cliffMat", new Color3(0.45, 0.39, 0.34));
    const cliffTopMat = makeMat("cliffTopMat", new Color3(0.21, 0.49, 0.25));
    const waterMat = makeMat(
      "waterMat",
      new Color3(0.16, 0.54, 0.85),
      new Color3(0.06, 0.2, 0.38),
      new Color3(0.75, 0.9, 1.0),
      1.0,
      64
    );
    const ruinMat = makeMat("ruinMat", new Color3(0.56, 0.55, 0.51));
    const foliageMat = makeMat("foliageMat", new Color3(0.16, 0.46, 0.22));
    const dgWallMat = makeMat("dgWallMat", new Color3(0.25, 0.27, 0.35));
    const dgPillarMat = makeMat("dgPillarMat", new Color3(0.37, 0.39, 0.49));
    const ironGateMat = makeMat(
      "ironGateMat",
      new Color3(0.28, 0.3, 0.35),
      new Color3(0.05, 0.05, 0.07),
      new Color3(0.65, 0.65, 0.7),
      1.0,
      64
    );
    const bladeMat = makeMat(
      "heroBladeMat",
      new Color3(0.88, 0.94, 1.0),
      new Color3(0.28, 0.42, 0.62),
      new Color3(1, 1, 1),
      1.0,
      96
    );

    // Batching buckets to merge static environment geometry per material (huge draw-call optimization!)
    const owPathBuckets: Mesh[] = [];
    const owWoodBuckets: Mesh[] = [];
    const owFoliageBuckets: Mesh[] = [];
    const owCliffBuckets: Mesh[] = [];
    const owCliffCapBuckets: Mesh[] = [];
    const owRuinBuckets: Mesh[] = [];
    const owWaterBuckets: Mesh[] = [];

    const dgWallBuckets: Mesh[] = [];
    const dgPillarBuckets: Mesh[] = [];
    const dgGoldBuckets: Mesh[] = [];

    // --- OVERWORLD STATIC GEOMETRY ---
    const owGround = MeshBuilder.CreateGround(
      "owGround",
      { width: 84, height: 84, subdivisions: 2 },
      scene
    );
    owGround.material = owGrassMat;
    owGround.parent = overworldRoot;
    owGround.freezeWorldMatrix();

    const mainRoad = MeshBuilder.CreateBox("mainRoad", { width: 5.2, height: 0.06, depth: 68 }, scene);
    mainRoad.position.set(0, 0.03, 0);
    owPathBuckets.push(mainRoad);

    const crossRoad = MeshBuilder.CreateBox("crossRoad", { width: 54, height: 0.05, depth: 4.4 }, scene);
    crossRoad.position.set(0, 0.025, -2.5);
    owPathBuckets.push(crossRoad);

    // Crossroads cobblestone plaza medallion
    const plazaDisc = MeshBuilder.CreateCylinder(
      "plazaDisc",
      { diameter: 8.5, height: 0.07, tessellation: 24 },
      scene
    );
    plazaDisc.position.set(0, 0.035, -2.5);
    owRuinBuckets.push(plazaDisc);

    const westCourtyard = MeshBuilder.CreateBox(
      "westCourtyard",
      { width: 16, height: 0.07, depth: 28 },
      scene
    );
    westCourtyard.position.set(-26, 0.035, 1);
    owRuinBuckets.push(westCourtyard);

    // Wooden Bridge across the river at z = -20.5
    const bridgeDeck = MeshBuilder.CreateBox(
      "bridgeDeck",
      { width: 7.4, height: 0.28, depth: 5.2 },
      scene
    );
    bridgeDeck.position.set(0, 0.16, -20.5);
    owWoodBuckets.push(bridgeDeck);

    for (const side of [-3.4, 3.4]) {
      for (const zOff of [-22.6, -20.5, -18.4]) {
        const post = MeshBuilder.CreateCylinder(
          `bridgePost-${side}-${zOff}`,
          { diameter: 0.48, height: 1.35, tessellation: 12 },
          scene
        );
        post.position.set(side, 0.65, zOff);
        owWoodBuckets.push(post);
      }
      const rail = MeshBuilder.CreateBox(
        `bridgeRail-${side}`,
        { width: 0.22, height: 0.22, depth: 4.8 },
        scene
      );
      rail.position.set(side, 1.05, -20.5);
      owWoodBuckets.push(rail);
    }

    // Northern Sanctum Temple Facade
    for (const sx of [-3.6, 3.6]) {
      const archCol = MeshBuilder.CreateCylinder(
        `templeArchCol-${sx}`,
        { diameterTop: 2.2, diameterBottom: 2.6, height: 5.6, tessellation: 16 },
        scene
      );
      archCol.position.set(sx, 2.8, 35);
      owRuinBuckets.push(archCol);
    }
    const templeLintel = MeshBuilder.CreateBox(
      "templeLintel",
      { width: 10.6, height: 1.5, depth: 3.2 },
      scene
    );
    templeLintel.position.set(0, 5.8, 35);
    owRuinBuckets.push(templeLintel);

    const templeCrest = MeshBuilder.CreateCylinder(
      "templeCrest",
      { diameterTop: 0.4, diameterBottom: 8.5, height: 1.8, tessellation: 4 },
      scene
    );
    templeCrest.rotation.y = Math.PI / 4;
    templeCrest.position.set(0, 7.2, 35);
    owRuinBuckets.push(templeCrest);

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
    overworldPortalDisc.freezeWorldMatrix();

    // Western Ruins Key Pedestal at (-28, 11)
    const keyPedestal = MeshBuilder.CreateCylinder(
      "keyPedestal",
      { diameterTop: 1.8, diameterBottom: 2.3, height: 0.7, tessellation: 12 },
      scene
    );
    keyPedestal.position.set(DUNGEON_KEY_POS.x, 0.35, DUNGEON_KEY_POS.z);
    owRuinBuckets.push(keyPedestal);

    // Floating 3D Golden Sanctum Key (merged into a single mesh)
    const keyNode = new TransformNode("sanctumKeyNode", scene);
    keyNode.parent = overworldRoot;
    keyNode.position.set(DUNGEON_KEY_POS.x, 1.6, DUNGEON_KEY_POS.z);

    const keyParts: Mesh[] = [];
    const keyBow = MeshBuilder.CreateTorus(
      "keyBow",
      { diameter: 0.75, thickness: 0.18, tessellation: 20 },
      scene
    );
    keyBow.rotation.x = Math.PI / 2;
    keyBow.position.set(0, 0.45, 0);
    keyParts.push(keyBow);

    const keyShaft = MeshBuilder.CreateCylinder(
      "keyShaft",
      { diameter: 0.18, height: 0.95, tessellation: 12 },
      scene
    );
    keyShaft.position.set(0, -0.1, 0);
    keyParts.push(keyShaft);

    const keyBit1 = MeshBuilder.CreateBox("keyBit1", { width: 0.32, height: 0.14, depth: 0.14 }, scene);
    keyBit1.position.set(0.18, -0.35, 0);
    keyParts.push(keyBit1);

    const keyBit2 = MeshBuilder.CreateBox("keyBit2", { width: 0.26, height: 0.14, depth: 0.14 }, scene);
    keyBit2.position.set(0.15, -0.15, 0);
    keyParts.push(keyBit2);

    mergeGroupWithMaterial("mergedSanctumKey", keyParts, goldKeyMat, keyNode);

    const keyBeaconRing = MeshBuilder.CreateTorus(
      "keyBeaconRing",
      { diameter: 2.3, thickness: 0.08, tessellation: 28 },
      scene
    );
    keyBeaconRing.position.set(DUNGEON_KEY_POS.x, 0.12, DUNGEON_KEY_POS.z);
    keyBeaconRing.material = goldKeyMat;
    keyBeaconRing.parent = overworldRoot;

    // --- DUNGEON STATIC ENVIRONMENT ---
    const dgGround = MeshBuilder.CreateGround(
      "dgGround",
      { width: 44, height: 78, subdivisions: 2 },
      scene
    );
    dgGround.material = makeMat("dgFloorMat", new Color3(0.18, 0.19, 0.25));
    dgGround.parent = dungeonRoot;
    dgGround.freezeWorldMatrix();

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
    dgRunner.freezeWorldMatrix();

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
    dgExitDisc.freezeWorldMatrix();

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
    bossArenaRing.freezeWorldMatrix();

    // Locked Gate Node (iron bars merged into 1 draw call!)
    const lockedGateNode = new TransformNode("lockedGateNode", scene);
    lockedGateNode.parent = dungeonRoot;
    lockedGateNode.position.set(LOCKED_GATE_POS.x, 0, LOCKED_GATE_POS.z);

    WORLD_OBSTACLES.forEach((obs) => {
      const w = obs.maxX - obs.minX;
      const d = obs.maxZ - obs.minZ;
      const h = obs.height ?? 4.0;
      const cx = (obs.minX + obs.maxX) / 2;
      const cz = (obs.minZ + obs.maxZ) / 2;

      if (obs.kind === "gate") {
        const ironParts: Mesh[] = [];
        const barCount = 9;
        for (let b = 0; b < barCount; b++) {
          const bx = -3.0 + (b / (barCount - 1)) * 6.0;
          const bar = MeshBuilder.CreateCylinder(
            `gateBar-${b}`,
            { diameter: 0.26, height: h, tessellation: 12 },
            scene
          );
          bar.position.set(bx, h / 2, 0);
          ironParts.push(bar);
        }
        const crossBeamTop = MeshBuilder.CreateBox(
          "gateBeamTop",
          { width: w, height: 0.38, depth: 0.5 },
          scene
        );
        crossBeamTop.position.set(0, h - 0.5, 0);
        ironParts.push(crossBeamTop);

        const crossBeamMid = MeshBuilder.CreateBox(
          "gateBeamMid",
          { width: w, height: 0.34, depth: 0.45 },
          scene
        );
        crossBeamMid.position.set(0, h * 0.45, 0);
        ironParts.push(crossBeamMid);

        mergeGroupWithMaterial("mergedGateIron", ironParts, ironGateMat, lockedGateNode);

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
        const cols = Math.max(1, Math.round(w / 2.6));
        const rows = Math.max(1, Math.round(d / 2.6));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const tx = obs.minX + ((c + 0.5) / cols) * w;
            const tz = obs.minZ + ((r + 0.5) / rows) * d;
            const trunk = MeshBuilder.CreateCylinder(
              `trunk-${obs.id}-${r}-${c}`,
              { diameterTop: 0.5, diameterBottom: 0.72, height: 1.6, tessellation: 10 },
              scene
            );
            trunk.position.set(tx, 0.8, tz);
            owWoodBuckets.push(trunk);

            const cone1 = MeshBuilder.CreateCylinder(
              `cone1-${obs.id}-${r}-${c}`,
              { diameterTop: 0.25, diameterBottom: 2.55, height: 2.3, tessellation: 12 },
              scene
            );
            cone1.position.set(tx, 2.25, tz);
            owFoliageBuckets.push(cone1);

            const cone2 = MeshBuilder.CreateCylinder(
              `cone2-${obs.id}-${r}-${c}`,
              { diameterTop: 0.12, diameterBottom: 1.95, height: 1.95, tessellation: 12 },
              scene
            );
            cone2.position.set(tx, 3.55, tz);
            owFoliageBuckets.push(cone2);

            const cone3 = MeshBuilder.CreateCylinder(
              `cone3-${obs.id}-${r}-${c}`,
              { diameterTop: 0.04, diameterBottom: 1.25, height: 1.35, tessellation: 12 },
              scene
            );
            cone3.position.set(tx, 4.55, tz);
            owFoliageBuckets.push(cone3);
          }
        }
        return;
      }

      if (obs.kind === "pillar") {
        const targetBucket = obs.zone === "dungeon" ? dgPillarBuckets : owRuinBuckets;
        const basePed = MeshBuilder.CreateCylinder(
          `pillarBase-${obs.id}`,
          { diameterTop: w * 1.08, diameterBottom: w * 1.18, height: 0.55, tessellation: 14 },
          scene
        );
        basePed.position.set(cx, 0.275, cz);
        targetBucket.push(basePed);

        const col = MeshBuilder.CreateCylinder(
          `pillar-${obs.id}`,
          { diameterTop: w * 0.86, diameterBottom: w * 0.96, height: h, tessellation: 16 },
          scene
        );
        col.position.set(cx, h / 2, cz);
        targetBucket.push(col);

        const cap = MeshBuilder.CreateCylinder(
          `pillarCap-${obs.id}`,
          { diameterTop: w * 1.18, diameterBottom: w * 0.92, height: 0.5, tessellation: 14 },
          scene
        );
        cap.position.set(cx, h - 0.25, cz);
        targetBucket.push(cap);
        return;
      }

      const box = MeshBuilder.CreateBox(
        `obs-${obs.id}`,
        { width: w, height: h, depth: d },
        scene
      );
      box.position.set(cx, obs.kind === "water" ? 0.02 : h / 2, cz);

      if (obs.kind === "water") {
        owWaterBuckets.push(box);
      } else if (obs.kind === "cliff") {
        owCliffBuckets.push(box);
        const grassCap = MeshBuilder.CreateBox(
          `cliffCap-${obs.id}`,
          { width: w + 0.2, height: 0.36, depth: d + 0.2 },
          scene
        );
        grassCap.position.set(cx, h + 0.1, cz);
        owCliffCapBuckets.push(grassCap);
      } else if (obs.kind === "ruin") {
        owRuinBuckets.push(box);
      } else {
        dgWallBuckets.push(box);
      }
    });

    // Decorative Dungeon Torch Braziers along the chambers (merged into dungeon buckets)
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
      const stand = MeshBuilder.CreateCylinder(
        `torchStand-${idx}`,
        { diameterTop: 0.7, diameterBottom: 0.9, height: 1.5, tessellation: 12 },
        scene
      );
      stand.position.set(tc.x, 0.75, tc.z);
      dgPillarBuckets.push(stand);

      const flame = MeshBuilder.CreateSphere(
        `torchFlame-${idx}`,
        { diameter: 0.68, segments: 10 },
        scene
      );
      flame.scaling.set(0.85, 1.45, 0.85);
      flame.position.set(tc.x, 1.75, tc.z);
      dgGoldBuckets.push(flame);
    });

    // Merge all static Overworld & Dungeon buckets by material (1 draw call per material!)
    mergeGroupWithMaterial("owMergedPaths", owPathBuckets, pathMat, overworldRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("owMergedWood", owWoodBuckets, woodMat, overworldRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("owMergedFoliage", owFoliageBuckets, foliageMat, overworldRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("owMergedCliffs", owCliffBuckets, cliffMat, overworldRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("owMergedCliffCaps", owCliffCapBuckets, cliffTopMat, overworldRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("owMergedRuins", owRuinBuckets, ruinMat, overworldRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("owMergedWater", owWaterBuckets, waterMat, overworldRoot)?.freezeWorldMatrix();

    mergeGroupWithMaterial("dgMergedWalls", dgWallBuckets, dgWallMat, dungeonRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("dgMergedPillars", dgPillarBuckets, dgPillarMat, dungeonRoot)?.freezeWorldMatrix();
    mergeGroupWithMaterial("dgMergedFlames", dgGoldBuckets, goldKeyMat, dungeonRoot)?.freezeWorldMatrix();

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
      { diameter: 1.4, height: 2.12, tessellation: 18 },
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
    chestSealRing.material = glowingCrimsonMat;
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

    // The Zeldo Crest (3 interlocking golden diamond shards rising from chest, merged into 1 draw call)
    const zeldoCrestNode = new TransformNode("zeldoCrestNode", scene);
    zeldoCrestNode.parent = chestRoot;
    zeldoCrestNode.position.set(0, 2.7, 0);

    const crestParts: Mesh[] = [];
    const crestOffsets = [
      { x: 0, y: 0.48 },
      { x: -0.42, y: -0.24 },
      { x: 0.42, y: -0.24 },
    ];
    crestOffsets.forEach((pos, idx) => {
      const shard = MeshBuilder.CreatePolyhedron(
        `zeldoCrestShard-${idx}`,
        { type: 1, size: 0.34 },
        scene
      );
      shard.position.set(pos.x, pos.y, 0);
      crestParts.push(shard);
    });
    mergeGroupWithMaterial("mergedZeldoCrest", crestParts, goldKeyMat, zeldoCrestNode);

    // =========================================================
    // UPGRADED HERO 3D CHARACTER RIG (Batch-Merged Static Parts)
    // =========================================================
    const heroRoot = new TransformNode("heroRoot", scene);

    const tunicMat = makeMat("heroTunicMat", new Color3(0.15, 0.68, 0.32), new Color3(0.03, 0.12, 0.05));
    const skinMat = makeMat("heroSkinMat", new Color3(0.97, 0.81, 0.66));
    const hairMat = makeMat("heroHairMat", new Color3(0.95, 0.78, 0.24));
    const shieldMat = makeMat("heroShieldMat", new Color3(0.2, 0.42, 0.8), new Color3(0.05, 0.1, 0.22));
    const bootMat = makeMat("heroBootMat", new Color3(0.38, 0.24, 0.14));

    // Articulated stride boots
    const heroLeftBoot = MeshBuilder.CreateCylinder(
      "heroLeftBoot",
      { diameterTop: 0.28, diameterBottom: 0.34, height: 0.52, tessellation: 12 },
      scene
    );
    heroLeftBoot.position.set(-0.22, 0.26, 0);
    heroLeftBoot.material = bootMat;
    heroLeftBoot.parent = heroRoot;

    const heroRightBoot = MeshBuilder.CreateCylinder(
      "heroRightBoot",
      { diameterTop: 0.28, diameterBottom: 0.34, height: 0.52, tessellation: 12 },
      scene
    );
    heroRightBoot.position.set(0.22, 0.26, 0);
    heroRightBoot.material = bootMat;
    heroRightBoot.parent = heroRoot;

    // Tunic & Cap group (1 draw call)
    const heroTunicParts: Mesh[] = [];
    const heroTorso = MeshBuilder.CreateCylinder(
      "heroTorso",
      { diameterTop: 0.7, diameterBottom: 1.02, height: 1.05, tessellation: 16 },
      scene
    );
    heroTorso.position.set(0, 0.85, 0);
    heroTunicParts.push(heroTorso);

    const heroShoulders = MeshBuilder.CreateSphere(
      "heroShoulders",
      { diameterX: 1.05, diameterY: 0.45, diameterZ: 0.72, segments: 14 },
      scene
    );
    heroShoulders.position.set(0, 1.25, 0);
    heroTunicParts.push(heroShoulders);

    const heroCap = MeshBuilder.CreateCylinder(
      "heroCap",
      { diameterTop: 0.06, diameterBottom: 0.82, height: 1.08, tessellation: 14 },
      scene
    );
    heroCap.position.set(0, 2.1, -0.26);
    heroCap.rotation.x = -0.62;
    heroTunicParts.push(heroCap);
    mergeGroupWithMaterial("heroTunicMerged", heroTunicParts, tunicMat, heroRoot);

    // Skin Head + Pointed Ears (1 draw call)
    const heroSkinParts: Mesh[] = [];
    const heroHead = MeshBuilder.CreateSphere(
      "heroHead",
      { diameter: 0.82, segments: 16 },
      scene
    );
    heroHead.position.set(0, 1.66, 0.04);
    heroSkinParts.push(heroHead);

    for (const ex of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(
        `heroEar-${ex}`,
        { diameterTop: 0.03, diameterBottom: 0.2, height: 0.42, tessellation: 10 },
        scene
      );
      ear.position.set(ex * 0.46, 1.68, 0.02);
      ear.rotation.z = -ex * 1.15;
      ear.rotation.y = ex * 0.25;
      heroSkinParts.push(ear);
    }
    mergeGroupWithMaterial("heroSkinMerged", heroSkinParts, skinMat, heroRoot);

    // Eyes (1 draw call)
    const heroEyeParts: Mesh[] = [];
    for (const ex of [-0.15, 0.15]) {
      const eye = MeshBuilder.CreateSphere(`heroEye-${ex}`, { diameter: 0.13, segments: 10 }, scene);
      eye.scaling.set(0.85, 1.25, 0.6);
      eye.position.set(ex, 1.66, 0.41);
      heroEyeParts.push(eye);
    }
    mergeGroupWithMaterial("heroEyesMerged", heroEyeParts, darkEyeMat, heroRoot);

    // Golden Hair & Belt Buckle + Shield Trim (1 draw call)
    const heroGoldParts: Mesh[] = [];
    const heroHairBand = MeshBuilder.CreateTorus(
      "heroHairBand",
      { diameter: 0.78, thickness: 0.18, tessellation: 18 },
      scene
    );
    heroHairBand.position.set(0, 1.78, 0.02);
    heroGoldParts.push(heroHairBand);

    const beltBuckle = MeshBuilder.CreateBox(
      "heroBeltBuckle",
      { width: 0.28, height: 0.18, depth: 0.12 },
      scene
    );
    beltBuckle.position.set(0, 0.72, 0.44);
    heroGoldParts.push(beltBuckle);

    const shieldCrest = MeshBuilder.CreatePolyhedron(
      "heroShieldCrest",
      { type: 1, size: 0.16 },
      scene
    );
    shieldCrest.position.set(-0.62, 0.92, 0.25);
    heroGoldParts.push(shieldCrest);
    mergeGroupWithMaterial("heroGoldMerged", heroGoldParts, goldKeyMat, heroRoot);

    // Kite Shield on Left Arm
    const heroShield = MeshBuilder.CreateCylinder(
      "heroShield",
      { diameterTop: 0.72, diameterBottom: 0.35, height: 0.14, tessellation: 12 },
      scene
    );
    heroShield.rotation.z = Math.PI / 2;
    heroShield.rotation.y = -0.25;
    heroShield.position.set(-0.56, 0.9, 0.24);
    heroShield.material = shieldMat;
    heroShield.parent = heroRoot;

    // Sword Pivot on Right Side
    const swordPivot = new TransformNode("swordPivot", scene);
    swordPivot.position.set(0.45, 0.92, 0.1);
    swordPivot.parent = heroRoot;

    const swordHilt = MeshBuilder.CreateBox(
      "swordHilt",
      { width: 0.48, height: 0.12, depth: 0.14 },
      scene
    );
    swordHilt.position.set(0, 0, 0.35);
    swordHilt.material = goldKeyMat;
    swordHilt.parent = swordPivot;

    const swordBlade = MeshBuilder.CreateCylinder(
      "swordBlade",
      { diameterTop: 0.03, diameterBottom: 0.22, height: 1.72, tessellation: 6 },
      scene
    );
    swordBlade.rotation.x = Math.PI / 2;
    swordBlade.scaling.set(1.0, 1.0, 0.38);
    swordBlade.position.set(0, 0, 1.24);
    swordBlade.material = bladeMat;
    swordBlade.parent = swordPivot;

    // Glowing Crescent Slash Arc (visible during sword attack)
    const slashArc = MeshBuilder.CreateTorus(
      "slashArc",
      { diameter: 4.1, thickness: 0.22, tessellation: 28 },
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
      const body = new TransformNode(`enemyBodyNode-${id}`, scene);
      body.parent = root;

      const materials: StandardMaterial[] = [];
      const baseColors: Color3[] = [];

      const registerMat = (
        name: string,
        diff: Color3,
        em?: Color3,
        spec = new Color3(0.22, 0.22, 0.22),
        alpha = 1.0,
        specPow = 42
      ) => {
        const m = makeMat(name, diff, em, spec, alpha, specPow);
        materials.push(m);
        baseColors.push(diff.clone());
        return m;
      };

      const weapon = new TransformNode(`weapon-${id}`, scene);
      weapon.parent = body;

      let chargeCorridorRoot: TransformNode | undefined;
      let chargeCorridorMat: StandardMaterial | undefined;
      let lungeShieldMesh: Mesh | undefined;
      let stunStarsRoot: TransformNode | undefined;

      if (kind === "slime") {
        // =====================================================
        // PORING-INSPIRED BLOBBY JELLY CREATURE WITH BIG GOOFY EYES
        // =====================================================
        const isDungeon = zone === "dungeon";
        const poringJellyMat = registerMat(
          `poringMat-${id}`,
          isDungeon ? new Color3(0.68, 0.36, 0.98) : new Color3(1.0, 0.48, 0.7),
          isDungeon ? new Color3(0.18, 0.06, 0.34) : new Color3(0.32, 0.08, 0.18),
          new Color3(0.95, 0.95, 1.0),
          0.93,
          80
        );

        const jellyParts: Mesh[] = [];
        // Sculpted non-spherical blobby droplet body
        const blobMesh = createSculptedPoringBodyMesh(`poringBlob-${id}`, scene);
        blobMesh.position.set(0, 0.56, 0);
        jellyParts.push(blobMesh);

        // Cute droplet stem & round tip bead on top of the Poring's head
        const stemNeck = MeshBuilder.CreateCylinder(
          `poringStem-${id}`,
          { diameterTop: 0.1, diameterBottom: 0.28, height: 0.28, tessellation: 12 },
          scene
        );
        stemNeck.position.set(0, 1.38, -0.14);
        stemNeck.rotation.x = -0.35;
        jellyParts.push(stemNeck);

        const stemBall = MeshBuilder.CreateSphere(
          `poringTipBall-${id}`,
          { diameter: 0.28, segments: 14 },
          scene
        );
        stemBall.position.set(0, 1.54, -0.2);
        jellyParts.push(stemBall);

        mergeGroupWithMaterial(`poringJellyMerged-${id}`, jellyParts, poringJellyMat, body);

        // Big Goofy White Sclera Eyes + Catchlight Sparkles (1 draw call)
        const whiteParts: Mesh[] = [];
        const leftSclera = MeshBuilder.CreateSphere(
          `poringLeftEyeW-${id}`,
          { diameter: 0.36, segments: 14 },
          scene
        );
        leftSclera.scaling.set(1.05, 1.28, 0.55);
        leftSclera.position.set(-0.27, 0.62, 0.68);
        leftSclera.rotation.y = -0.22;
        leftSclera.rotation.z = 0.08;
        whiteParts.push(leftSclera);

        const rightSclera = MeshBuilder.CreateSphere(
          `poringRightEyeW-${id}`,
          { diameter: 0.38, segments: 14 },
          scene
        );
        rightSclera.scaling.set(1.1, 1.32, 0.55);
        rightSclera.position.set(0.27, 0.64, 0.68);
        rightSclera.rotation.y = 0.22;
        rightSclera.rotation.z = -0.1;
        whiteParts.push(rightSclera);

        // Eye shine catchlights
        const leftShine = MeshBuilder.CreateSphere(`poringLShine-${id}`, { diameter: 0.08, segments: 8 }, scene);
        leftShine.position.set(-0.2, 0.69, 0.81);
        whiteParts.push(leftShine);

        const rightShine = MeshBuilder.CreateSphere(`poringRShine-${id}`, { diameter: 0.08, segments: 8 }, scene);
        rightShine.position.set(0.22, 0.71, 0.81);
        whiteParts.push(rightShine);

        mergeGroupWithMaterial(`poringWhites-${id}`, whiteParts, whiteEyeMat, body);

        // Big Goofy Cross-Eyed Pupils + Cute Mouth (1 draw call)
        const darkParts: Mesh[] = [];
        const leftPupil = MeshBuilder.CreateSphere(
          `poringLPupil-${id}`,
          { diameter: 0.21, segments: 12 },
          scene
        );
        leftPupil.scaling.set(0.95, 1.18, 0.5);
        // Slightly inward/upward for goofy expression
        leftPupil.position.set(-0.22, 0.64, 0.77);
        darkParts.push(leftPupil);

        const rightPupil = MeshBuilder.CreateSphere(
          `poringRPupil-${id}`,
          { diameter: 0.23, segments: 12 },
          scene
        );
        rightPupil.scaling.set(1.0, 1.22, 0.5);
        // Slightly inward/downward for asymmetrical goofy look
        rightPupil.position.set(0.21, 0.6, 0.77);
        darkParts.push(rightPupil);

        // Cute happy little mouth
        const mouthL = MeshBuilder.CreateTorus(
          `poringMouthL-${id}`,
          { diameter: 0.16, thickness: 0.04, tessellation: 12 },
          scene
        );
        mouthL.rotation.x = Math.PI / 2;
        mouthL.position.set(-0.06, 0.44, 0.76);
        darkParts.push(mouthL);

        const mouthR = MeshBuilder.CreateTorus(
          `poringMouthR-${id}`,
          { diameter: 0.16, thickness: 0.04, tessellation: 12 },
          scene
        );
        mouthR.rotation.x = Math.PI / 2;
        mouthR.position.set(0.06, 0.44, 0.76);
        darkParts.push(mouthR);

        mergeGroupWithMaterial(`poringPupils-${id}`, darkParts, darkEyeMat, body);

        // Rosy Blush Cheeks (1 draw call)
        const blushParts: Mesh[] = [];
        for (const bx of [-0.44, 0.44]) {
          const cheek = MeshBuilder.CreateSphere(
            `poringCheek-${id}-${bx}`,
            { diameter: 0.18, segments: 10 },
            scene
          );
          cheek.scaling.set(1.3, 0.75, 0.5);
          cheek.position.set(bx, 0.48, 0.64);
          cheek.rotation.y = bx > 0 ? 0.35 : -0.35;
          blushParts.push(cheek);
        }
        mergeGroupWithMaterial(`poringBlush-${id}`, blushParts, blushMat, body);
      } else if (kind === "goblin") {
        // =====================================================
        // SCULPTED GOBLIN RAIDERS (Ears, Snout, Brow, Spiked Club)
        // =====================================================
        const gobSkinMat = registerMat(
          `gobSkinMat-${id}`,
          zone === "dungeon" ? new Color3(0.46, 0.32, 0.62) : new Color3(0.42, 0.68, 0.24),
          new Color3(0.06, 0.04, 0.02)
        );
        const skinParts: Mesh[] = [];

        // Hunched torso & pot-belly
        const torso = MeshBuilder.CreateCylinder(
          `gobTorso-${id}`,
          { diameterTop: 0.72, diameterBottom: 0.92, height: 0.95, tessellation: 14 },
          scene
        );
        torso.position.set(0, 0.82, 0);
        torso.rotation.x = 0.15;
        skinParts.push(torso);

        // Muscular shoulders & arms
        for (const sx of [-0.48, 0.48]) {
          const arm = MeshBuilder.CreateCylinder(
            `gobArm-${id}-${sx}`,
            { diameterTop: 0.28, diameterBottom: 0.22, height: 0.65, tessellation: 10 },
            scene
          );
          arm.position.set(sx, 0.88, 0.12);
          arm.rotation.z = -sx * 0.35;
          skinParts.push(arm);
        }

        // Sculpted Goblin Head + Long Pointed Snout + Big Bat-Like Ears
        const head = MeshBuilder.CreateSphere(
          `gobHead-${id}`,
          { diameter: 0.82, segments: 16 },
          scene
        );
        head.scaling.set(1.06, 0.92, 1.02);
        head.position.set(0, 1.52, 0.08);
        skinParts.push(head);

        const snout = MeshBuilder.CreateCylinder(
          `gobSnout-${id}`,
          { diameterTop: 0.08, diameterBottom: 0.28, height: 0.38, tessellation: 10 },
          scene
        );
        snout.rotation.x = Math.PI / 2 + 0.15;
        snout.position.set(0, 1.46, 0.54);
        skinParts.push(snout);

        for (const ex of [-1, 1]) {
          const ear = MeshBuilder.CreateCylinder(
            `gobEar-${id}-${ex}`,
            { diameterTop: 0.04, diameterBottom: 0.28, height: 0.68, tessellation: 10 },
            scene
          );
          ear.position.set(ex * 0.58, 1.58, 0.02);
          ear.rotation.z = -ex * 1.22;
          ear.rotation.y = ex * 0.2;
          skinParts.push(ear);
        }

        mergeGroupWithMaterial(`gobSkinMerged-${id}`, skinParts, gobSkinMat, body);

        // Armor Tunic / Loincloth & Boots (1 draw call)
        const armorParts: Mesh[] = [];
        const loin = MeshBuilder.CreateCylinder(
          `gobLoin-${id}`,
          { diameterTop: 0.88, diameterBottom: 1.04, height: 0.48, tessellation: 12 },
          scene
        );
        loin.position.set(0, 0.45, 0);
        armorParts.push(loin);

        for (const lx of [-0.24, 0.24]) {
          const boot = MeshBuilder.CreateCylinder(
            `gobBoot-${id}-${lx}`,
            { diameterTop: 0.26, diameterBottom: 0.32, height: 0.42, tessellation: 10 },
            scene
          );
          boot.position.set(lx, 0.21, 0);
          armorParts.push(boot);
        }
        mergeGroupWithMaterial(`gobGearMerged-${id}`, armorParts, darkObsidianMat, body);

        // Glowing Yellow Eyes (1 draw call)
        const eyeParts: Mesh[] = [];
        for (const ex of [-0.18, 0.18]) {
          const eye = MeshBuilder.CreateSphere(`gobEye-${id}-${ex}`, { diameter: 0.16, segments: 10 }, scene);
          eye.position.set(ex, 1.56, 0.43);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`gobEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);

        // Spiked Wooden Club on Weapon Node
        const clubShaft = MeshBuilder.CreateCylinder(
          `gobClub-${id}`,
          { diameterTop: 0.38, diameterBottom: 0.16, height: 1.25, tessellation: 12 },
          scene
        );
        clubShaft.rotation.x = Math.PI / 2;
        clubShaft.position.set(0.55, 0.9, 0.55);
        clubShaft.material = woodMat;
        clubShaft.parent = weapon;

        const spikeParts: Mesh[] = [];
        for (let s = 0; s < 4; s++) {
          const a = (s / 4) * Math.PI * 2;
          const spike = MeshBuilder.CreateCylinder(
            `gobSpike-${id}-${s}`,
            { diameterTop: 0.02, diameterBottom: 0.12, height: 0.28, tessellation: 8 },
            scene
          );
          spike.position.set(0.55 + Math.cos(a) * 0.22, 0.9 + Math.sin(a) * 0.22, 0.88);
          spike.rotation.z = -Math.cos(a) * (Math.PI / 2);
          spike.rotation.x = Math.sin(a) * (Math.PI / 2);
          spikeParts.push(spike);
        }
        mergeGroupWithMaterial(`gobSpikes-${id}`, spikeParts, bladeMat, weapon);
      } else if (kind === "knight") {
        // =====================================================
        // GOTHIC PLATE-ARMORED SENTINEL KNIGHT (Plumed Greathelm, Shield & Halberd)
        // =====================================================
        const armorMat = registerMat(
          `knightMat-${id}`,
          zone === "dungeon" ? new Color3(0.32, 0.38, 0.52) : new Color3(0.62, 0.22, 0.24),
          new Color3(0.08, 0.04, 0.06),
          new Color3(0.75, 0.78, 0.85),
          1.0,
          64
        );
        const armorParts: Mesh[] = [];

        // Greave legs
        for (const lx of [-0.28, 0.28]) {
          const leg = MeshBuilder.CreateCylinder(
            `knightLeg-${id}-${lx}`,
            { diameterTop: 0.36, diameterBottom: 0.4, height: 0.65, tessellation: 12 },
            scene
          );
          leg.position.set(lx, 0.32, 0);
          armorParts.push(leg);
        }

        // V-Tapered Breastplate Cuirass
        const cuirass = MeshBuilder.CreateCylinder(
          `knightCuirass-${id}`,
          { diameterTop: 1.24, diameterBottom: 0.88, height: 1.15, tessellation: 14 },
          scene
        );
        cuirass.scaling.set(1.08, 1.0, 0.82);
        cuirass.position.set(0, 1.12, 0);
        armorParts.push(cuirass);

        // Domed Shoulder Pauldrons
        for (const px of [-0.72, 0.72]) {
          const pauldron = MeshBuilder.CreateSphere(
            `knightPauldron-${id}-${px}`,
            { diameter: 0.62, segments: 12 },
            scene
          );
          pauldron.scaling.set(1.1, 0.85, 1.0);
          pauldron.position.set(px, 1.52, 0);
          armorParts.push(pauldron);
        }

        // Visored Greathelm
        const helm = MeshBuilder.CreateCylinder(
          `knightHelm-${id}`,
          { diameterTop: 0.72, diameterBottom: 0.82, height: 0.78, tessellation: 14 },
          scene
        );
        helm.position.set(0, 1.98, 0);
        armorParts.push(helm);

        const helmDome = MeshBuilder.CreateSphere(
          `knightHelmDome-${id}`,
          { diameter: 0.74, segments: 12 },
          scene
        );
        helmDome.position.set(0, 2.32, 0);
        armorParts.push(helmDome);

        // Left Arm Tower Shield
        const knightShield = MeshBuilder.CreateBox(
          `knightShield-${id}`,
          { width: 0.18, height: 1.18, depth: 0.78 },
          scene
        );
        knightShield.position.set(-0.78, 1.12, 0.25);
        knightShield.rotation.y = -0.22;
        armorParts.push(knightShield);

        mergeGroupWithMaterial(`knightArmorMerged-${id}`, armorParts, armorMat, body);

        // Glowing Visor Eye Slit & Helmet Plume Crest (1 draw call)
        const crimsonParts: Mesh[] = [];
        const visorSlit = MeshBuilder.CreateBox(
          `knightVisor-${id}`,
          { width: 0.52, height: 0.1, depth: 0.16 },
          scene
        );
        visorSlit.position.set(0, 2.04, 0.36);
        crimsonParts.push(visorSlit);

        const plume = MeshBuilder.CreateCylinder(
          `knightPlume-${id}`,
          { diameterTop: 0.08, diameterBottom: 0.42, height: 0.75, tessellation: 10 },
          scene
        );
        plume.position.set(0, 2.68, -0.18);
        plume.rotation.x = -0.55;
        crimsonParts.push(plume);
        mergeGroupWithMaterial(`knightCrimsonMerged-${id}`, crimsonParts, glowingCrimsonMat, body);

        // Polearm Halberd on Weapon Node
        const halberdParts: Mesh[] = [];
        const shaft = MeshBuilder.CreateCylinder(
          `halberdShaft-${id}`,
          { diameter: 0.12, height: 2.35, tessellation: 10 },
          scene
        );
        shaft.rotation.x = Math.PI / 2;
        shaft.position.set(0.75, 1.08, 0.65);
        halberdParts.push(shaft);

        const axeHead = MeshBuilder.CreateCylinder(
          `halberdAxe-${id}`,
          { diameterTop: 0.75, diameterBottom: 0.15, height: 0.08, tessellation: 12 },
          scene
        );
        axeHead.rotation.z = Math.PI / 2;
        axeHead.position.set(0.75, 1.25, 1.45);
        halberdParts.push(axeHead);

        const spearTip = MeshBuilder.CreateCylinder(
          `halberdTip-${id}`,
          { diameterTop: 0.02, diameterBottom: 0.22, height: 0.52, tessellation: 10 },
          scene
        );
        spearTip.rotation.x = Math.PI / 2;
        spearTip.position.set(0.75, 1.08, 1.95);
        halberdParts.push(spearTip);

        mergeGroupWithMaterial(`knightHalberd-${id}`, halberdParts, bladeMat, weapon);
      } else if (kind === "minion") {
        // =====================================================
        // HOODED ECLIPSE WRAITH MINION WITH ORBITING SHARDS
        // =====================================================
        const minionMat = registerMat(
          `minionMat-${id}`,
          new Color3(0.58, 0.16, 0.76),
          new Color3(0.24, 0.05, 0.34)
        );
        const wraithParts: Mesh[] = [];

        // Tattered Wraith Cloak Cone
        const cloak = MeshBuilder.CreateCylinder(
          `minionCloak-${id}`,
          { diameterTop: 0.42, diameterBottom: 1.25, height: 1.35, tessellation: 14 },
          scene
        );
        cloak.position.set(0, 0.85, 0);
        wraithParts.push(cloak);

        // Cowl Hood
        const hood = MeshBuilder.CreateSphere(
          `minionHood-${id}`,
          { diameter: 0.76, segments: 14 },
          scene
        );
        hood.position.set(0, 1.62, 0.04);
        wraithParts.push(hood);

        // Orbiting Arcane Shards
        for (let s = 0; s < 3; s++) {
          const a = (s / 3) * Math.PI * 2;
          const shard = MeshBuilder.CreatePolyhedron(
            `minionShard-${id}-${s}`,
            { type: 1, size: 0.22 },
            scene
          );
          shard.position.set(Math.cos(a) * 0.85, 1.15, Math.sin(a) * 0.85);
          wraithParts.push(shard);
        }
        mergeGroupWithMaterial(`minionWraithMerged-${id}`, wraithParts, minionMat, body);

        // Glowing Eyes inside the Cowl
        const eyeParts: Mesh[] = [];
        for (const ex of [-0.14, 0.14]) {
          const eye = MeshBuilder.CreateSphere(`minionEye-${id}-${ex}`, { diameter: 0.13, segments: 8 }, scene);
          eye.position.set(ex, 1.62, 0.36);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`minionEyes-${id}`, eyeParts, glowingYellowEyeMat, body);
      } else {
        // =====================================================
        // CUSTOM SCULPTED BOSS MODEL: MALAKOR, WARDEN OF THE ECLIPSE
        // =====================================================
        const bossArmorMat = registerMat(
          `bossMat-${id}`,
          new Color3(0.72, 0.12, 0.18),
          new Color3(0.26, 0.04, 0.06),
          new Color3(0.85, 0.65, 0.65),
          1.0,
          64
        );

        const bossArmorParts: Mesh[] = [];
        const bossObsidianParts: Mesh[] = [];
        const bossHornParts: Mesh[] = [];
        const bossCrimsonParts: Mesh[] = [];

        // 1. Wide-Planted Armored Greaves & Sabatons
        for (const lx of [-0.62, 0.62]) {
          const greave = MeshBuilder.CreateCylinder(
            `bossGreave-${id}-${lx}`,
            { diameterTop: 0.68, diameterBottom: 0.78, height: 1.15, tessellation: 14 },
            scene
          );
          greave.position.set(lx, 0.58, 0);
          bossObsidianParts.push(greave);

          const kneeGuard = MeshBuilder.CreatePolyhedron(
            `bossKnee-${id}-${lx}`,
            { type: 1, size: 0.28 },
            scene
          );
          kneeGuard.position.set(lx, 1.05, 0.36);
          bossArmorParts.push(kneeGuard);
        }

        // 2. Armored Pelvis & Waist Tassets
        const pelvis = MeshBuilder.CreateCylinder(
          `bossPelvis-${id}`,
          { diameterTop: 1.65, diameterBottom: 1.95, height: 0.75, tessellation: 14 },
          scene
        );
        pelvis.position.set(0, 1.25, 0);
        bossObsidianParts.push(pelvis);

        // 3. Broad V-Tapered Demon-Lord Breastplate Cuirass
        const torso = MeshBuilder.CreateCylinder(
          `bossTorso-${id}`,
          { diameterTop: 2.55, diameterBottom: 1.55, height: 1.65, tessellation: 18 },
          scene
        );
        torso.scaling.set(1.12, 1.0, 0.82);
        torso.position.set(0, 2.22, 0);
        bossArmorParts.push(torso);

        // Flowing Tattered Royal Cape on Back
        const cape = MeshBuilder.CreateBox(
          `bossCape-${id}`,
          { width: 2.35, height: 2.55, depth: 0.16 },
          scene
        );
        cape.position.set(0, 1.75, -0.82);
        cape.rotation.x = 0.18;
        bossObsidianParts.push(cape);

        // 4. Massive Layered Shoulder Pauldrons & Muscular Arms
        for (const sx of [-1, 1]) {
          const pauldron = MeshBuilder.CreateSphere(
            `bossPauldron-${id}-${sx}`,
            { diameter: 1.38, segments: 16 },
            scene
          );
          pauldron.scaling.set(1.18, 0.85, 1.05);
          pauldron.position.set(sx * 1.48, 2.85, 0);
          bossArmorParts.push(pauldron);

          // Curved Pauldron Spikes
          const pSpike = MeshBuilder.CreateCylinder(
            `bossPSpike-${id}-${sx}`,
            { diameterTop: 0.04, diameterBottom: 0.34, height: 0.95, tessellation: 12 },
            scene
          );
          pSpike.position.set(sx * 1.92, 3.32, 0);
          pSpike.rotation.z = -sx * 0.68;
          bossHornParts.push(pSpike);

          // Muscular Gauntleted Forearms
          const arm = MeshBuilder.CreateCylinder(
            `bossArm-${id}-${sx}`,
            { diameterTop: 0.56, diameterBottom: 0.48, height: 1.25, tessellation: 12 },
            scene
          );
          arm.position.set(sx * 1.52, 2.05, 0.28);
          arm.rotation.z = -sx * 0.18;
          arm.rotation.x = -0.35;
          bossObsidianParts.push(arm);
        }

        // 5. Sculpted Demon-Helm Head & Sweeping Curved Bull Horns
        const bossHelm = MeshBuilder.CreateSphere(
          `bossHelm-${id}`,
          { diameter: 1.18, segments: 16 },
          scene
        );
        bossHelm.scaling.set(0.96, 1.12, 1.02);
        bossHelm.position.set(0, 3.38, 0.12);
        bossObsidianParts.push(bossHelm);

        const faceplate = MeshBuilder.CreateCylinder(
          `bossFaceplate-${id}`,
          { diameterTop: 0.92, diameterBottom: 0.68, height: 0.65, tessellation: 10 },
          scene
        );
        faceplate.position.set(0, 3.22, 0.25);
        bossArmorParts.push(faceplate);

        // Two Sweeping 3D Curved Bull Horns using CreateTube
        for (const hx of [-1, 1]) {
          const hornPath = [
            new Vector3(hx * 0.42, 3.55, 0.08),
            new Vector3(hx * 0.95, 3.72, 0.18),
            new Vector3(hx * 1.32, 4.08, 0.42),
            new Vector3(hx * 1.18, 4.52, 0.68),
          ];
          const horn = MeshBuilder.CreateTube(
            `bossHorn-${id}-${hx}`,
            {
              path: hornPath,
              radiusFunction: (idx) => 0.24 * (1 - idx * 0.28),
              tessellation: 12,
              cap: Mesh.CAP_ALL,
            },
            scene
          );
          bossHornParts.push(horn);
        }

        // Glowing Heart Core in Chest + Burning Eyes + Floating Eclipse Halo
        const chestCore = MeshBuilder.CreatePolyhedron(
          `bossChestCore-${id}`,
          { type: 1, size: 0.36 },
          scene
        );
        chestCore.position.set(0, 2.35, 0.85);
        bossCrimsonParts.push(chestCore);

        for (const ex of [-0.22, 0.22]) {
          const eye = MeshBuilder.CreateBox(
            `bossEye-${id}-${ex}`,
            { width: 0.24, height: 0.1, depth: 0.14 },
            scene
          );
          eye.position.set(ex, 3.42, 0.62);
          eye.rotation.z = ex > 0 ? -0.25 : 0.25;
          bossCrimsonParts.push(eye);
        }

        const eclipseHalo = MeshBuilder.CreateTorus(
          `bossEclipseHalo-${id}`,
          { diameter: 1.95, thickness: 0.16, tessellation: 24 },
          scene
        );
        eclipseHalo.rotation.x = Math.PI / 2;
        eclipseHalo.position.set(0, 3.65, -0.45);
        bossCrimsonParts.push(eclipseHalo);

        // Merge Boss Body into 4 clean material meshes
        mergeGroupWithMaterial(`bossArmorMerged-${id}`, bossArmorParts, bossArmorMat, body);
        mergeGroupWithMaterial(`bossObsidianMerged-${id}`, bossObsidianParts, darkObsidianMat, body);
        mergeGroupWithMaterial(`bossHornsMerged-${id}`, bossHornParts, boneHornMat, body);
        mergeGroupWithMaterial(`bossCrimsonMerged-${id}`, bossCrimsonParts, glowingCrimsonMat, body);

        // 6. Massive Twin-Bladed Eclipse Greataxe on Weapon Node
        const axeParts: Mesh[] = [];
        const axeShaft = MeshBuilder.CreateCylinder(
          `bossAxeShaft-${id}`,
          { diameter: 0.22, height: 3.4, tessellation: 12 },
          scene
        );
        axeShaft.rotation.x = Math.PI / 2;
        axeShaft.position.set(1.55, 1.95, 0.85);
        axeParts.push(axeShaft);

        // Double Crescent Battleaxe Blades
        for (const bx of [-0.55, 0.55]) {
          const crescentBlade = MeshBuilder.CreateCylinder(
            `bossAxeBlade-${id}-${bx}`,
            { diameterTop: 1.45, diameterBottom: 0.45, height: 0.14, tessellation: 16 },
            scene
          );
          crescentBlade. scaling.set(1.15, 1.0, 0.65);
          crescentBlade.position.set(1.55 + bx, 1.95, 1.85);
          axeParts.push(crescentBlade);
        }

        const axeSpike = MeshBuilder.CreateCylinder(
          `bossAxeSpike-${id}`,
          { diameterTop: 0.03, diameterBottom: 0.34, height: 0.75, tessellation: 12 },
          scene
        );
        axeSpike.rotation.x = Math.PI / 2;
        axeSpike.position.set(1.55, 1.95, 2.75);
        axeParts.push(axeSpike);

        mergeGroupWithMaterial(`bossGreataxeMerged-${id}`, axeParts, goldKeyMat, weapon);

        // 7. Boss Ground Lunge Path Telegraph Corridor
        chargeCorridorRoot = new TransformNode(`bossChargeCorridor-${id}`, scene);
        chargeCorridorMat = makeMat(
          `bossChargeCorridorMat-${id}`,
          new Color3(1.0, 0.35, 0.15),
          new Color3(0.95, 0.25, 0.1),
          new Color3(0, 0, 0),
          0.52
        );
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
        const railParts: Mesh[] = [];
        for (const rx of [-1.35, 1.35]) {
          const sideRail = MeshBuilder.CreateBox(
            `bossCorridorRail-${id}-${rx}`,
            { width: 0.14, height: 0.09, depth: 1.0 },
            scene
          );
          sideRail.position.set(rx, 0.08, 0.5);
          railParts.push(sideRail);
        }
        mergeGroupWithMaterial(`bossCorridorRails-${id}`, railParts, railMat, chargeCorridorRoot);
        chargeCorridorRoot.setEnabled(false);

        // 8. Boss Invulnerable Lunge Shield Aura (visible while launching)
        lungeShieldMesh = MeshBuilder.CreateSphere(
          `bossLungeShield-${id}`,
          { diameter: 4.2, segments: 16 },
          scene
        );
        lungeShieldMesh.position.set(0, 1.9, 0);
        lungeShieldMesh.material = makeMat(
          `bossLungeShieldMat-${id}`,
          new Color3(1.0, 0.2, 0.25),
          new Color3(0.9, 0.15, 0.2),
          new Color3(1, 1, 1),
          0.42
        );
        lungeShieldMesh.parent = root;
        lungeShieldMesh.setEnabled(false);

        // 9. Boss Stunned Orbiting Stars (merged into 1 draw call!)
        stunStarsRoot = new TransformNode(`bossStunStars-${id}`, scene);
        stunStarsRoot.position.set(0, 4.35, 0);
        stunStarsRoot.parent = root;
        const starParts: Mesh[] = [];
        for (let s = 0; s < 4; s++) {
          const angle = (s / 4) * Math.PI * 2;
          const star = MeshBuilder.CreatePolyhedron(
            `stunStar-${id}-${s}`,
            { type: 1, size: 0.3 },
            scene
          );
          star.position.set(Math.cos(angle) * 1.25, 0, Math.sin(angle) * 1.25);
          starParts.push(star);
        }
        mergeGroupWithMaterial(`bossStunStarsMerged-${id}`, starParts, goldKeyMat, stunStarsRoot);
        stunStarsRoot.setEnabled(false);
      }

      // Telegraph ground ring for windup / attack
      const telegraphRing = MeshBuilder.CreateTorus(
        `telegraph-${id}`,
        {
          diameter: kind === "boss" ? 4.6 : 2.1,
          thickness: kind === "boss" ? 0.18 : 0.1,
          tessellation: 28,
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
      const barY = kind === "boss" ? 4.85 : kind === "knight" ? 2.95 : 2.25;
      const barW = kind === "boss" ? 2.8 : 1.25;
      const hpBarHolder = new TransformNode(`hpHolder-${id}`, scene);
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

    const buildProjectileRig = (
      id: string,
      aoeRadius: number,
      directRadius: number
    ): ProjectileVisualRig => {
      const root = new TransformNode(`projRoot-${id}`, scene);

      const orbMat = makeMat(
        `projOrbMat-${id}`,
        new Color3(0.55, 1.0, 0.2),
        new Color3(0.45, 0.85, 0.12)
      );
      const orb = MeshBuilder.CreateSphere(
        `projOrb-${id}`,
        { diameter: 0.88, segments: 14 },
        scene
      );
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
        const dot = MeshBuilder.CreateSphere(
          `projArcDot-${id}-${d}`,
          { diameter: 0.24, segments: 8 },
          scene
        );
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

      const bubMat = makeMat(
        `hazardBubMat-${id}`,
        new Color3(0.65, 1.0, 0.25),
        new Color3(0.45, 0.85, 0.15)
      );
      const bubbles: Mesh[] = [];
      for (let b = 0; b < 5; b++) {
        const bub = MeshBuilder.CreateSphere(
          `hazardBub-${id}-${b}`,
          { diameter: 0.42, segments: 10 },
          scene
        );
        bub.material = bubMat;
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
    let fpsUpdateAccumulator = 0;

    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Update live FPS counter in HUD every 0.25s
      fpsUpdateAccumulator += dt;
      if (fpsUpdateAccumulator >= 0.25) {
        fpsUpdateAccumulator = 0;
        const currentFps = Math.round(engine.getFps());
        useGameStore.getState().setFps(currentFps);
      }

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
        dirLight.intensity = 0.76;
        sanctumPointLight.intensity = 0;
      } else {
        scene.clearColor.set(0.05, 0.05, 0.09, 1);
        hemiLight.intensity = 0.58;
        dirLight.intensity = 0.48;
        sanctumPointLight.intensity = snap.flags.bossDefeated ? 1.35 : 0.72;
      }

      // 2. Sync Hero 3D Model & Boot Stride Animation
      const stride = Math.sin(snap.hero.walkCycle);
      heroRoot.position.set(snap.hero.x, Math.abs(stride) * 0.11, snap.hero.z);
      heroRoot.rotation.y = snap.hero.facing;
      heroLeftBoot.position.z = stride * 0.22;
      heroRightBoot.position.z = -stride * 0.22;

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
      for (let eIdx = 0; eIdx < snap.enemies.length; eIdx++) {
        const enemy = snap.enemies[eIdx];
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

        // Poring squash-and-stretch hop animation vs standard bob
        let bob = 0;
        if (enemy.kind === "slime") {
          const hopWave = Math.sin(t * 5.8 + eIdx * 1.3);
          bob = Math.max(0, hopWave) * 0.34;
          const stretchY = 1.0 + hopWave * 0.15;
          const squashXZ = 1.0 - hopWave * 0.09;
          rig.body.scaling.set(squashXZ, stretchY, squashXZ);
        } else if (enemy.kind === "minion") {
          bob = Math.sin(t * 4.5 + eIdx) * 0.22;
        }

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

        // Windup & Attack weapon / telegraph cue
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
