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
import {
  EditorEntityKind,
  sampleTerrainHeight,
  TerrainCellData,
  useGameStore,
} from "@/store/gameStore";
import {
  BOSS_CHEST_POS,
  CustomModelAsset,
  DUNGEON_KEY_POS,
  EnemyKind,
  LOCKED_GATE_POS,
  MapPortal,
  MapPropInstance,
  PropPrefabId,
  SHOP_INTERACT_POS,
  SHOP_STALL_POS,
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
  chargeCorridorRoot?: TransformNode;
  chargeCorridorMat?: StandardMaterial;
  lungeShieldMesh?: Mesh;
  stunStarsRoot?: TransformNode;
  archerAimLine?: Mesh;
}

interface PropVisualRig {
  root: TransformNode;
  prefab: PropPrefabId;
  customModelId?: string;
  colorHex?: string;
  bushFoliage?: Mesh | TransformNode;
  bushStump?: TransformNode;
}

interface BushLeafParticle {
  mesh: Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx0: number;
  ry0: number;
  rz0: number;
  wx: number;
  wy: number;
  wz: number;
  flutterFreq: number;
  flutterPhase: number;
  baseScale: Vector3;
}

interface BushBurstVisualRig {
  root: TransformNode;
  particles: BushLeafParticle[];
}

interface PortalVisualRig {
  root: TransformNode;
  disc: Mesh;
  ring: Mesh;
  pillarL: Mesh;
  pillarR: Mesh;
  color: string;
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

      const ny = vy / 0.725;
      const angle = Math.atan2(vz, vx);

      const lobeWave =
        1.0 +
        0.065 * Math.sin(angle * 5 + 0.4) +
        0.045 * Math.cos(angle * 3 - 0.7);

      let radialScale = lobeWave;
      let yOut = vy;
      let zShift = 0;

      if (ny < 0) {
        yOut = vy * (0.58 + 0.18 * (1 + ny));
        radialScale *= 1.18 + 0.16 * Math.cos(ny * Math.PI * 0.5);
      } else {
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
  parent: TransformNode,
  editorMeta?: { editorKind: EditorEntityKind; editorId: string }
): Mesh | null {
  if (meshes.length === 0) return null;
  const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
  if (merged) {
    merged.name = name;
    merged.material = material;
    merged.parent = parent;
    if (editorMeta) {
      merged.metadata = editorMeta;
      merged.isPickable = true;
    }
  }
  return merged;
}

function tagHierarchyMetadata(
  root: TransformNode,
  editorKind: EditorEntityKind,
  editorId: string
) {
  root.getChildMeshes().forEach((m) => {
    m.metadata = { editorKind, editorId };
    m.isPickable = true;
  });
}

function hexToColor3(hex: string, fallback = new Color3(0.3, 0.8, 1.0)): Color3 {
  try {
    const clean = hex.replace("#", "");
    if (clean.length === 6) {
      const r = parseInt(clean.slice(0, 2), 16) / 255;
      const g = parseInt(clean.slice(2, 4), 16) / 255;
      const b = parseInt(clean.slice(4, 6), 16) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return new Color3(r, g, b);
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Applies sculpted vertex heights and painted vertex colors from `terrainCells` onto an updatable ground mesh.
 */
function applyTerrainCellsToGroundMesh(
  ground: Mesh,
  baseColor: Color3,
  cells: Record<string, TerrainCellData>
) {
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  const indices = ground.getIndices();
  const normals = ground.getVerticesData(VertexBuffer.NormalKind);
  if (!positions || !indices || !normals) return;

  const vertCount = positions.length / 3;
  let colors = ground.getVerticesData(VertexBuffer.ColorKind);
  if (!colors || colors.length !== vertCount * 4) {
    colors = new Array(vertCount * 4).fill(1);
  }

  const step = 2.0;
  for (let i = 0; i < vertCount; i++) {
    const vx = positions[i * 3];
    const vz = positions[i * 3 + 2];
    const gx = Math.round(vx / step);
    const gz = Math.round(vz / step);
    const cell = cells[`${gx},${gz}`];

    const h = cell ? cell.h : 0;
    positions[i * 3 + 1] = h;

    let r = baseColor.r;
    let g = baseColor.g;
    let b = baseColor.b;
    if (cell?.c) {
      const c3 = hexToColor3(cell.c, baseColor);
      r = c3.r;
      g = c3.g;
      b = c3.b;
    } else if (Math.abs(h) > 0.15) {
      // Subtle elevation shading on hills/valleys
      const tint = Math.max(-0.12, Math.min(0.16, h * 0.035));
      r = Math.min(1, Math.max(0, r + tint));
      g = Math.min(1, Math.max(0, g + tint));
      b = Math.min(1, Math.max(0, b + tint * 0.7));
    }

    colors[i * 4] = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 1.0;
  }

  VertexData.ComputeNormals(positions, indices, normals);
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.updateVerticesData(VertexBuffer.NormalKind, normals);
  ground.setVerticesData(VertexBuffer.ColorKind, colors, true);
  ground.refreshBoundingInfo();
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

    // Overhead Zeldo-style angled camera (fixed in Play Mode, free orbit/pan/zoom in Editor Mode!)
    const camera = new ArcRotateCamera(
      "overheadCam",
      -Math.PI / 2,
      0.72,
      25,
      new Vector3(0, 0, -32),
      scene
    );
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 80;

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
    // ZONE CONTAINERS & UPDATABLE TERRAIN MESHES
    // =========================================================
    const overworldRoot = new TransformNode("overworldRoot", scene);
    const dungeonRoot = new TransformNode("dungeonRoot", scene);

    const owBaseColor = new Color3(0.24, 0.55, 0.28);
    const dgBaseColor = new Color3(0.18, 0.19, 0.25);

    const owGroundMat = makeMat(
      "owGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.05, 0.07, 0.05)
    );
    const dgGroundMat = makeMat(
      "dgGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.08, 0.08, 0.1)
    );

    // Subdivided updatable ground meshes for real-time Terrain Brush sculpting & painting!
    const owGround = MeshBuilder.CreateGround(
      "owGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    owGround.material = owGroundMat;
    owGround.parent = overworldRoot;
    owGround.isPickable = true;
    applyTerrainCellsToGroundMesh(owGround, owBaseColor, {});

    const dgGround = MeshBuilder.CreateGround(
      "dgGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    dgGround.material = dgGroundMat;
    dgGround.parent = dungeonRoot;
    dgGround.isPickable = true;
    applyTerrainCellsToGroundMesh(dgGround, dgBaseColor, {});

    // Shared Prop Materials
    const pathMat = makeMat("owPathMat", new Color3(0.75, 0.65, 0.46), undefined, new Color3(0.08, 0.08, 0.06));
    const woodMat = makeMat("woodMat", new Color3(0.52, 0.34, 0.18));
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
    const bushMat = makeMat("bushMat", new Color3(0.22, 0.58, 0.28));
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
    const shopCanopyMat = makeMat(
      "shopCanopyMat",
      new Color3(0.82, 0.18, 0.26),
      new Color3(0.18, 0.03, 0.05)
    );
    const merchantRobeMat = makeMat(
      "merchantRobeMat",
      new Color3(0.42, 0.2, 0.68),
      new Color3(0.08, 0.03, 0.15)
    );

    // --- MERCHANT BAZAAR STALL IN SOUTH CLEARING (11.5, -32.2) ---
    const sx = SHOP_STALL_POS.x;
    const sz = SHOP_STALL_POS.z;

    const shopNode = new TransformNode("shopStallNode", scene);
    shopNode.parent = overworldRoot;

    const shopWoodParts: Mesh[] = [];
    const shopCounter = MeshBuilder.CreateBox(
      "shopCounter",
      { width: 5.2, height: 1.15, depth: 2.2 },
      scene
    );
    shopCounter.position.set(sx, 0.58, sz + 0.3);
    shopWoodParts.push(shopCounter);

    for (const px of [-2.4, 2.4]) {
      for (const pz of [-1.1, 1.1]) {
        const post = MeshBuilder.CreateCylinder(
          `shopPost-${px}-${pz}`,
          { diameter: 0.26, height: 3.4, tessellation: 10 },
          scene
        );
        post.position.set(sx + px, 1.7, sz + pz);
        shopWoodParts.push(post);
      }
    }
    mergeGroupWithMaterial("shopWoodMerged", shopWoodParts, woodMat, shopNode);

    const shopAwning = MeshBuilder.CreateCylinder(
      "shopAwning",
      { diameterTop: 0.8, diameterBottom: 6.8, height: 1.4, tessellation: 4 },
      scene
    );
    shopAwning.rotation.y = Math.PI / 4;
    shopAwning.position.set(sx, 3.85, sz);
    shopAwning.material = shopCanopyMat;
    shopAwning.parent = shopNode;

    const shopRug = MeshBuilder.CreateCylinder(
      "shopRug",
      { diameter: 4.4, height: 0.06, tessellation: 24 },
      scene
    );
    shopRug.position.set(SHOP_INTERACT_POS.x, 0.035, SHOP_INTERACT_POS.z);
    shopRug.material = goldKeyMat;
    shopRug.parent = shopNode;

    const merchantBody = MeshBuilder.CreateCylinder(
      "merchantBody",
      { diameterTop: 0.65, diameterBottom: 0.95, height: 1.25, tessellation: 14 },
      scene
    );
    merchantBody.position.set(sx, 1.1, sz - 0.65);
    merchantBody.material = merchantRobeMat;
    merchantBody.parent = shopNode;

    const merchantHead = MeshBuilder.CreateSphere(
      "merchantHead",
      { diameter: 0.72, segments: 14 },
      scene
    );
    merchantHead.position.set(sx, 1.95, sz - 0.65);
    merchantHead.material = whiteEyeMat;
    merchantHead.parent = shopNode;

    const merchantHat = MeshBuilder.CreateCylinder(
      "merchantHat",
      { diameterTop: 0.05, diameterBottom: 1.05, height: 0.95, tessellation: 12 },
      scene
    );
    merchantHat.position.set(sx, 2.55, sz - 0.65);
    merchantHat.material = merchantRobeMat;
    merchantHat.parent = shopNode;

    const displayBoomerang = MeshBuilder.CreateTorus(
      "displayBoomerang",
      { diameter: 0.75, thickness: 0.14, tessellation: 12 },
      scene
    );
    displayBoomerang.position.set(sx - 1.6, 1.32, sz + 0.4);
    displayBoomerang.material = goldKeyMat;
    displayBoomerang.parent = shopNode;

    const displayBow = MeshBuilder.CreateTorus(
      "displayBow",
      { diameter: 0.85, thickness: 0.1, tessellation: 16 },
      scene
    );
    displayBow.rotation.x = Math.PI / 2;
    displayBow.position.set(sx - 0.5, 1.38, sz + 0.4);
    displayBow.material = goldKeyMat;
    displayBow.parent = shopNode;

    const displayHeart = MeshBuilder.CreateSphere(
      "displayHeart",
      { diameter: 0.46, segments: 12 },
      scene
    );
    displayHeart.position.set(sx + 1.5, 1.38, sz + 0.4);
    displayHeart.material = glowingCrimsonMat;
    displayHeart.parent = shopNode;

    // Western Ruins Key Pedestal & Floating Golden Sanctum Key
    const keyPedestal = MeshBuilder.CreateCylinder(
      "keyPedestal",
      { diameterTop: 1.8, diameterBottom: 2.3, height: 0.7, tessellation: 12 },
      scene
    );
    keyPedestal.position.set(DUNGEON_KEY_POS.x, 0.35, DUNGEON_KEY_POS.z);
    keyPedestal.material = ruinMat;
    keyPedestal.parent = overworldRoot;

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

    // Dungeon Carpet Runner & Boss Arena Ring
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
    dgRunner.isPickable = false;

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
    bossArenaRing.isPickable = false;

    // Locked Iron Gate in Dungeon
    const lockedGateNode = new TransformNode("lockedGateNode", scene);
    lockedGateNode.parent = dungeonRoot;
    lockedGateNode.position.set(LOCKED_GATE_POS.x, 0, LOCKED_GATE_POS.z);

    {
      const h = 4.6;
      const w = 7.0;
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
    }

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

    const chestSealRing = MeshBuilder.CreateTorus(
      "chestSealRing",
      { diameter: 3.4, thickness: 0.16, tessellation: 28 },
      scene
    );
    chestSealRing.position.set(0, 1.1, 0);
    chestSealRing.material = glowingCrimsonMat;
    chestSealRing.parent = chestRoot;

    const chestUnsealedRing = MeshBuilder.CreateTorus(
      "chestUnsealedRing",
      { diameter: 3.6, thickness: 0.14, tessellation: 32 },
      scene
    );
    chestUnsealedRing.position.set(0, 0.55, 0);
    chestUnsealedRing.material = goldKeyMat;
    chestUnsealedRing.parent = chestRoot;

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
    // INDIVIDUAL PICKABLE 3D PROP PREFAB BUILDER (FOR MAP EDITOR!)
    // =========================================================
    const propRigs = new Map<string, PropVisualRig>();
    const portalRigs = new Map<string, PortalVisualRig>();

    const buildPropRig = (
      prop: MapPropInstance,
      customModels: CustomModelAsset[]
    ): PropVisualRig => {
      const root = new TransformNode(`propRoot-${prop.id}`, scene);
      const meta = { editorKind: "prop" as const, editorId: prop.id };

      let bushFoliage: Mesh | TransformNode | undefined;
      let bushStump: TransformNode | undefined;

      if (prop.prefab === "pine_tree") {
        const trunk = MeshBuilder.CreateCylinder(
          `trunk-${prop.id}`,
          { diameterTop: 0.5, diameterBottom: 0.72, height: 1.6, tessellation: 10 },
          scene
        );
        trunk.position.set(0, 0.8, 0);
        trunk.material = woodMat;
        trunk.parent = root;

        const foliageParts: Mesh[] = [];
        const c1 = MeshBuilder.CreateCylinder(
          `c1-${prop.id}`,
          { diameterTop: 0.25, diameterBottom: 2.55, height: 2.3, tessellation: 12 },
          scene
        );
        c1.position.set(0, 2.25, 0);
        foliageParts.push(c1);

        const c2 = MeshBuilder.CreateCylinder(
          `c2-${prop.id}`,
          { diameterTop: 0.12, diameterBottom: 1.95, height: 1.95, tessellation: 12 },
          scene
        );
        c2.position.set(0, 3.55, 0);
        foliageParts.push(c2);

        const c3 = MeshBuilder.CreateCylinder(
          `c3-${prop.id}`,
          { diameterTop: 0.04, diameterBottom: 1.25, height: 1.35, tessellation: 12 },
          scene
        );
        c3.position.set(0, 4.55, 0);
        foliageParts.push(c3);

        mergeGroupWithMaterial(`treeFoliage-${prop.id}`, foliageParts, foliageMat, root, meta);
      } else if (prop.prefab === "bush") {
        const bushParts: Mesh[] = [];
        const bCenter = MeshBuilder.CreateSphere(
          `bushC-${prop.id}`,
          { diameter: 1.35, segments: 10 },
          scene
        );
        bCenter.scaling.set(1.1, 0.8, 1.1);
        bCenter.position.set(0, 0.48, 0);
        bushParts.push(bCenter);

        for (const off of [
          { x: -0.45, z: 0.2, s: 0.85 },
          { x: 0.45, z: 0.15, s: 0.9 },
          { x: 0, z: -0.42, s: 0.88 },
        ]) {
          const lobe = MeshBuilder.CreateSphere(
            `bushLobe-${prop.id}-${off.x}`,
            { diameter: 1.05 * off.s, segments: 10 },
            scene
          );
          lobe.position.set(off.x, 0.38, off.z);
          bushParts.push(lobe);
        }
        bushFoliage =
          mergeGroupWithMaterial(`bushMerged-${prop.id}`, bushParts, bushMat, root, meta) ??
          undefined;

        // Low cut-grass ring & woody stem stump shown after the bush is chopped down
        const stumpNode = new TransformNode(`bushStump-${prop.id}`, scene);
        stumpNode.parent = root;

        const grassRing = MeshBuilder.CreateCylinder(
          `bushCutRing-${prop.id}`,
          { diameterTop: 1.05, diameterBottom: 1.2, height: 0.06, tessellation: 12 },
          scene
        );
        grassRing.position.set(0, 0.03, 0);
        grassRing.material = foliageMat;
        grassRing.parent = stumpNode;

        const woodyStem = MeshBuilder.CreateCylinder(
          `bushCutStem-${prop.id}`,
          { diameterTop: 0.28, diameterBottom: 0.38, height: 0.14, tessellation: 8 },
          scene
        );
        woodyStem.position.set(0, 0.07, 0);
        woodyStem.material = woodMat;
        woodyStem.parent = stumpNode;

        stumpNode.setEnabled(false);
        bushStump = stumpNode;
      } else if (prop.prefab === "flower_patch") {
        const stemParts: Mesh[] = [];
        const petalParts: Mesh[] = [];
        const offsets = [
          { x: 0, z: 0 },
          { x: -0.42, z: 0.28 },
          { x: 0.42, z: -0.25 },
          { x: -0.28, z: -0.38 },
          { x: 0.35, z: 0.38 },
        ];
        offsets.forEach((o, idx) => {
          const pad = MeshBuilder.CreateCylinder(
            `flPad-${prop.id}-${idx}`,
            { diameter: 0.38, height: 0.08, tessellation: 8 },
            scene
          );
          pad.position.set(o.x, 0.04, o.z);
          stemParts.push(pad);

          const blossom = MeshBuilder.CreateSphere(
            `flBlossom-${prop.id}-${idx}`,
            { diameter: 0.26, segments: 8 },
            scene
          );
          blossom.position.set(o.x, 0.16, o.z);
          petalParts.push(blossom);
        });
        mergeGroupWithMaterial(`flStems-${prop.id}`, stemParts, bushMat, root, meta);
        mergeGroupWithMaterial(`flPetals-${prop.id}`, petalParts, goldKeyMat, root, meta);
      } else if (prop.prefab === "boulder") {
        const rocks: Mesh[] = [];
        const mainRock = MeshBuilder.CreatePolyhedron(
          `boulderMain-${prop.id}`,
          { type: 2, size: 1.05 },
          scene
        );
        mainRock.scaling.set(1.25, 0.9, 1.15);
        mainRock.position.set(0, 0.72, 0);
        rocks.push(mainRock);

        const sideRock = MeshBuilder.CreatePolyhedron(
          `boulderSide-${prop.id}`,
          { type: 1, size: 0.65 },
          scene
        );
        sideRock.position.set(0.68, 0.42, 0.35);
        rocks.push(sideRock);
        mergeGroupWithMaterial(`boulderMerged-${prop.id}`, rocks, ruinMat, root, meta);
      } else if (prop.prefab === "ruin_pillar" || prop.prefab === "dungeon_pillar") {
        const mat = prop.prefab === "dungeon_pillar" ? dgPillarMat : ruinMat;
        const h = prop.prefab === "dungeon_pillar" ? 4.8 : 4.0;
        const w = 2.0;
        const parts: Mesh[] = [];
        const basePed = MeshBuilder.CreateCylinder(
          `pilBase-${prop.id}`,
          { diameterTop: w * 1.08, diameterBottom: w * 1.18, height: 0.55, tessellation: 14 },
          scene
        );
        basePed.position.set(0, 0.275, 0);
        parts.push(basePed);

        const col = MeshBuilder.CreateCylinder(
          `pilCol-${prop.id}`,
          { diameterTop: w * 0.86, diameterBottom: w * 0.96, height: h, tessellation: 16 },
          scene
        );
        col.position.set(0, h / 2, 0);
        parts.push(col);

        const cap = MeshBuilder.CreateCylinder(
          `pilCap-${prop.id}`,
          { diameterTop: w * 1.18, diameterBottom: w * 0.92, height: 0.5, tessellation: 14 },
          scene
        );
        cap.position.set(0, h - 0.25, 0);
        parts.push(cap);
        mergeGroupWithMaterial(`pillarMerged-${prop.id}`, parts, mat, root, meta);
      } else if (prop.prefab === "wall_torch") {
        const stand = MeshBuilder.CreateCylinder(
          `torchStand-${prop.id}`,
          { diameterTop: 0.7, diameterBottom: 0.9, height: 1.5, tessellation: 12 },
          scene
        );
        stand.position.set(0, 0.75, 0);
        stand.material = dgPillarMat;
        stand.parent = root;

        const flame = MeshBuilder.CreateSphere(
          `torchFlame-${prop.id}`,
          { diameter: 0.68, segments: 10 },
          scene
        );
        flame.scaling.set(0.85, 1.45, 0.85);
        flame.position.set(0, 1.75, 0);
        flame.material = goldKeyMat;
        flame.parent = root;
      } else if (prop.prefab === "wooden_crate") {
        const crate = MeshBuilder.CreateBox(
          `crateBox-${prop.id}`,
          { width: 1.35, height: 1.35, depth: 1.35 },
          scene
        );
        crate.position.set(0, 0.675, 0);
        crate.material = woodMat;
        crate.parent = root;

        const band = MeshBuilder.CreateBox(
          `crateBand-${prop.id}`,
          { width: 1.42, height: 0.22, depth: 1.42 },
          scene
        );
        band.position.set(0, 0.675, 0);
        band.material = ironGateMat;
        band.parent = root;
      } else if (prop.prefab === "stone_wall") {
        const wallBox = MeshBuilder.CreateBox(
          `wallBox-${prop.id}`,
          { width: 1, height: 1, depth: 1 },
          scene
        );
        wallBox.position.set(0, 0.5, 0);
        wallBox.material = prop.zone === "dungeon" ? dgWallMat : ruinMat;
        wallBox.parent = root;
      } else if (prop.prefab === "cliff_block") {
        const cliffBox = MeshBuilder.CreateBox(
          `cliffBox-${prop.id}`,
          { width: 1, height: 1, depth: 1 },
          scene
        );
        cliffBox.position.set(0, 0.5, 0);
        cliffBox.material = cliffMat;
        cliffBox.parent = root;

        const cap = MeshBuilder.CreateBox(
          `cliffCap-${prop.id}`,
          { width: 1.04, height: 0.09, depth: 1.04 },
          scene
        );
        cap.position.set(0, 1.02, 0);
        cap.material = cliffTopMat;
        cap.parent = root;
      } else if (prop.prefab === "water_tile") {
        const waterBox = MeshBuilder.CreateBox(
          `waterBox-${prop.id}`,
          { width: 1, height: 0.16, depth: 1 },
          scene
        );
        waterBox.position.set(0, 0.02, 0);
        waterBox.material = waterMat;
        waterBox.parent = root;
      } else if (prop.prefab === "path_tile") {
        const pathBox = MeshBuilder.CreateBox(
          `pathBox-${prop.id}`,
          { width: 1, height: 0.06, depth: 1 },
          scene
        );
        pathBox.position.set(0, 0.03, 0);
        pathBox.material = pathMat;
        pathBox.parent = root;
      } else if (prop.prefab === "wooden_bridge") {
        const parts: Mesh[] = [];
        const deck = MeshBuilder.CreateBox(
          `bridgeDeck-${prop.id}`,
          { width: 7.4, height: 0.28, depth: 5.2 },
          scene
        );
        deck.position.set(0, 0.16, 0);
        parts.push(deck);

        for (const side of [-3.4, 3.4]) {
          for (const zOff of [-2.1, 0, 2.1]) {
            const post = MeshBuilder.CreateCylinder(
              `bridgePost-${prop.id}-${side}-${zOff}`,
              { diameter: 0.48, height: 1.35, tessellation: 12 },
              scene
            );
            post.position.set(side, 0.65, zOff);
            parts.push(post);
          }
          const rail = MeshBuilder.CreateBox(
            `bridgeRail-${prop.id}-${side}`,
            { width: 0.22, height: 0.22, depth: 4.8 },
            scene
          );
          rail.position.set(side, 1.05, 0);
          parts.push(rail);
        }
        mergeGroupWithMaterial(`bridgeMerged-${prop.id}`, parts, woodMat, root, meta);
      } else if (prop.prefab === "temple_arch") {
        const parts: Mesh[] = [];
        for (const tx of [-3.6, 3.6]) {
          const archCol = MeshBuilder.CreateCylinder(
            `templeCol-${prop.id}-${tx}`,
            { diameterTop: 2.2, diameterBottom: 2.6, height: 5.6, tessellation: 16 },
            scene
          );
          archCol.position.set(tx, 2.8, 0);
          parts.push(archCol);
        }
        const lintel = MeshBuilder.CreateBox(
          `templeLintel-${prop.id}`,
          { width: 10.6, height: 1.5, depth: 3.2 },
          scene
        );
        lintel.position.set(0, 5.8, 0);
        parts.push(lintel);

        const crest = MeshBuilder.CreateCylinder(
          `templeCrest-${prop.id}`,
          { diameterTop: 0.4, diameterBottom: 8.5, height: 1.8, tessellation: 4 },
          scene
        );
        crest.rotation.y = Math.PI / 4;
        crest.position.set(0, 7.2, 0);
        parts.push(crest);
        mergeGroupWithMaterial(`templeArchMerged-${prop.id}`, parts, ruinMat, root, meta);
      } else if (prop.prefab === "custom_model") {
        const asset = customModels.find((m) => m.id === prop.customModelId);
        const customMesh = new Mesh(`customMesh-${prop.id}`, scene);
        if (asset && asset.positions.length >= 9 && asset.indices.length >= 3) {
          const vData = new VertexData();
          vData.positions = asset.positions;
          vData.indices = asset.indices;
          vData.normals = asset.normals;
          vData.applyToMesh(customMesh);
        } else {
          // Fallback crystal polyhedron
          const fallback = MeshBuilder.CreatePolyhedron(
            `customFallback-${prop.id}`,
            { type: 1, size: 1.2 },
            scene
          );
          fallback.position.set(0, 1.4, 0);
          fallback.parent = root;
        }
        const col = hexToColor3(prop.colorHex ?? asset?.colorHex ?? "#4fd8ff");
        customMesh.material = makeMat(
          `customMat-${prop.id}`,
          col,
          col.scale(0.25),
          new Color3(0.8, 0.9, 1.0),
          1.0,
          64
        );
        customMesh.parent = root;
      }

      tagHierarchyMetadata(root, "prop", prop.id);
      return {
        root,
        prefab: prop.prefab,
        customModelId: prop.customModelId,
        colorHex: prop.colorHex,
        bushFoliage,
        bushStump,
      };
    };

    const getPortalColors = (colorName: string): { diff: Color3; em: Color3 } => {
      switch (colorName) {
        case "gold":
          return { diff: new Color3(1.0, 0.82, 0.22), em: new Color3(0.85, 0.58, 0.08) };
        case "purple":
          return { diff: new Color3(0.75, 0.32, 1.0), em: new Color3(0.55, 0.15, 0.88) };
        case "emerald":
          return { diff: new Color3(0.22, 0.95, 0.52), em: new Color3(0.12, 0.68, 0.32) };
        case "crimson":
          return { diff: new Color3(1.0, 0.25, 0.32), em: new Color3(0.85, 0.12, 0.18) };
        default:
          return { diff: new Color3(0.2, 0.75, 1.0), em: new Color3(0.15, 0.55, 0.95) };
      }
    };

    const buildPortalRig = (portal: MapPortal): PortalVisualRig => {
      const root = new TransformNode(`portalRoot-${portal.id}`, scene);
      const { diff, em } = getPortalColors(portal.color);
      const portalMat = makeMat(
        `portalMat-${portal.id}`,
        diff,
        em,
        new Color3(0.8, 0.9, 1.0),
        0.85
      );

      const disc = MeshBuilder.CreateCylinder(
        `portalDisc-${portal.id}`,
        { diameter: portal.radius * 2, height: 0.14, tessellation: 28 },
        scene
      );
      disc.position.set(0, 0.08, 0);
      disc.material = portalMat;
      disc.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `portalRing-${portal.id}`,
        { diameter: portal.radius * 2.15, thickness: 0.14, tessellation: 28 },
        scene
      );
      ring.position.set(0, 0.18, 0);
      ring.material = goldKeyMat;
      ring.parent = root;

      const pillarL = MeshBuilder.CreateCylinder(
        `portalPilL-${portal.id}`,
        { diameterTop: 0.35, diameterBottom: 0.5, height: 2.2, tessellation: 10 },
        scene
      );
      pillarL.position.set(-portal.radius * 1.05, 1.1, 0);
      pillarL.material = ruinMat;
      pillarL.parent = root;

      const pillarR = MeshBuilder.CreateCylinder(
        `portalPilR-${portal.id}`,
        { diameterTop: 0.35, diameterBottom: 0.5, height: 2.2, tessellation: 10 },
        scene
      );
      pillarR.position.set(portal.radius * 1.05, 1.1, 0);
      pillarR.material = ruinMat;
      pillarR.parent = root;

      tagHierarchyMetadata(root, "portal", portal.id);
      return { root, disc, ring, pillarL, pillarR, color: portal.color };
    };

    // =========================================================
    // 3D MAP EDITOR SELECTION GIZMO & TERRAIN BRUSH RING
    // =========================================================
    const editorGizmoRoot = new TransformNode("editorGizmoRoot", scene);
    const selRing = MeshBuilder.CreateTorus(
      "editorSelRing",
      { diameter: 3.2, thickness: 0.14, tessellation: 32 },
      scene
    );
    selRing.position.set(0, 0.15, 0);
    selRing.material = makeMat(
      "editorSelRingMat",
      new Color3(1.0, 0.9, 0.2),
      new Color3(1.0, 0.8, 0.1)
    );
    selRing.isPickable = false;
    selRing.parent = editorGizmoRoot;

    // Red X-Axis Arrow & Blue Z-Axis Arrow (Unity Transform Gizmo feel!)
    const xAxisMat = makeMat("xAxisMat", new Color3(1.0, 0.22, 0.22), new Color3(0.9, 0.15, 0.15));
    const zAxisMat = makeMat("zAxisMat", new Color3(0.22, 0.58, 1.0), new Color3(0.15, 0.45, 0.95));

    const xAxisShaft = MeshBuilder.CreateCylinder(
      "xAxisShaft",
      { diameter: 0.12, height: 2.4, tessellation: 10 },
      scene
    );
    xAxisShaft.rotation.z = -Math.PI / 2;
    xAxisShaft.position.set(1.2, 0.45, 0);
    xAxisShaft.material = xAxisMat;
    xAxisShaft.isPickable = false;
    xAxisShaft.parent = editorGizmoRoot;

    const xAxisTip = MeshBuilder.CreateCylinder(
      "xAxisTip",
      { diameterTop: 0.02, diameterBottom: 0.36, height: 0.55, tessellation: 10 },
      scene
    );
    xAxisTip.rotation.z = -Math.PI / 2;
    xAxisTip.position.set(2.5, 0.45, 0);
    xAxisTip.material = xAxisMat;
    xAxisTip.isPickable = false;
    xAxisTip.parent = editorGizmoRoot;

    const zAxisShaft = MeshBuilder.CreateCylinder(
      "zAxisShaft",
      { diameter: 0.12, height: 2.4, tessellation: 10 },
      scene
    );
    zAxisShaft.rotation.x = Math.PI / 2;
    zAxisShaft.position.set(0, 0.45, 1.2);
    zAxisShaft.material = zAxisMat;
    zAxisShaft.isPickable = false;
    zAxisShaft.parent = editorGizmoRoot;

    const zAxisTip = MeshBuilder.CreateCylinder(
      "zAxisTip",
      { diameterTop: 0.02, diameterBottom: 0.36, height: 0.55, tessellation: 10 },
      scene
    );
    zAxisTip.rotation.x = Math.PI / 2;
    zAxisTip.position.set(0, 0.45, 2.5);
    zAxisTip.material = zAxisMat;
    zAxisTip.isPickable = false;
    zAxisTip.parent = editorGizmoRoot;
    editorGizmoRoot.setEnabled(false);

    // Terrain Brush Ring Preview
    const terrainBrushRing = MeshBuilder.CreateTorus(
      "terrainBrushRing",
      { diameter: 2.0, thickness: 0.08, tessellation: 36 },
      scene
    );
    terrainBrushRing.material = makeMat(
      "terrainBrushRingMat",
      new Color3(0.3, 1.0, 0.65),
      new Color3(0.2, 0.85, 0.5)
    );
    terrainBrushRing.isPickable = false;
    terrainBrushRing.setEnabled(false);

    // =========================================================
    // UPGRADED HERO 3D CHARACTER RIG + SHIELD BLOCK WARD
    // =========================================================
    const heroRoot = new TransformNode("heroRoot", scene);

    const tunicMat = makeMat("heroTunicMat", new Color3(0.15, 0.68, 0.32), new Color3(0.03, 0.12, 0.05));
    const skinMat = makeMat("heroSkinMat", new Color3(0.97, 0.81, 0.66));
    const shieldMat = makeMat("heroShieldMat", new Color3(0.2, 0.42, 0.8), new Color3(0.05, 0.1, 0.22));
    const bootMat = makeMat("heroBootMat", new Color3(0.38, 0.24, 0.14));

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

    const heroEyeParts: Mesh[] = [];
    for (const ex of [-0.15, 0.15]) {
      const eye = MeshBuilder.CreateSphere(`heroEye-${ex}`, { diameter: 0.13, segments: 10 }, scene);
      eye.scaling.set(0.85, 1.25, 0.6);
      eye.position.set(ex, 1.66, 0.41);
      heroEyeParts.push(eye);
    }
    mergeGroupWithMaterial("heroEyesMerged", heroEyeParts, darkEyeMat, heroRoot);

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
    mergeGroupWithMaterial("heroGoldMerged", heroGoldParts, goldKeyMat, heroRoot);

    // Articulated Kite Shield Pivot
    const heroShieldPivot = new TransformNode("heroShieldPivot", scene);
    heroShieldPivot.position.set(-0.56, 0.9, 0.24);
    heroShieldPivot.parent = heroRoot;

    const heroShield = MeshBuilder.CreateCylinder(
      "heroShield",
      { diameterTop: 0.78, diameterBottom: 0.36, height: 0.14, tessellation: 12 },
      scene
    );
    heroShield.rotation.z = Math.PI / 2;
    heroShield.material = shieldMat;
    heroShield.parent = heroShieldPivot;

    const shieldCrest = MeshBuilder.CreatePolyhedron(
      "heroShieldCrest",
      { type: 1, size: 0.16 },
      scene
    );
    shieldCrest.position.set(-0.08, 0.02, 0);
    shieldCrest.material = goldKeyMat;
    shieldCrest.parent = heroShieldPivot;

    const heroBlockWard = MeshBuilder.CreateSphere(
      "heroBlockWard",
      { diameterX: 1.85, diameterY: 1.85, diameterZ: 0.85, segments: 14 },
      scene
    );
    heroBlockWard.position.set(0, 1.0, 0.65);
    heroBlockWard.material = makeMat(
      "heroBlockWardMat",
      new Color3(0.25, 0.72, 1.0),
      new Color3(0.18, 0.55, 0.95),
      new Color3(1, 1, 1),
      0.38
    );
    heroBlockWard.parent = heroRoot;
    heroBlockWard.setEnabled(false);

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

    // --- 3D SPINNING BOOMERANG PROJECTILE ---
    const boomerangNode = new TransformNode("boomerangNode", scene);
    const wing1 = MeshBuilder.CreateBox(
      "boomWing1",
      { width: 0.95, height: 0.12, depth: 0.24 },
      scene
    );
    wing1.position.set(0.32, 0, 0.15);
    wing1.rotation.y = 0.48;
    wing1.material = goldKeyMat;
    wing1.parent = boomerangNode;

    const wing2 = MeshBuilder.CreateBox(
      "boomWing2",
      { width: 0.95, height: 0.12, depth: 0.24 },
      scene
    );
    wing2.position.set(-0.32, 0, 0.15);
    wing2.rotation.y = -0.48;
    wing2.material = goldKeyMat;
    wing2.parent = boomerangNode;

    const boomRing = MeshBuilder.CreateTorus(
      "boomRing",
      { diameter: 1.5, thickness: 0.06, tessellation: 20 },
      scene
    );
    boomRing.material = slashMat;
    boomRing.parent = boomerangNode;
    boomerangNode.setEnabled(false);

    // =========================================================
    // DYNAMIC ENEMY, ARROW, PROJECTILE, HAZARD & RUPEE REGISTRIES
    // =========================================================
    const enemyRigs = new Map<string, EnemyMeshRig>();
    const arrowRigs = new Map<string, TransformNode>();
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

    const buildArrowRig = (id: string, fromHero: boolean): TransformNode => {
      const node = new TransformNode(`arrow-${id}`, scene);
      const shaft = MeshBuilder.CreateCylinder(
        `arrowShaft-${id}`,
        { diameter: 0.08, height: 1.35, tessellation: 8 },
        scene
      );
      shaft.rotation.x = Math.PI / 2;
      shaft.material = woodMat;
      shaft.parent = node;

      const tip = MeshBuilder.CreateCylinder(
        `arrowTip-${id}`,
        { diameterTop: 0.01, diameterBottom: 0.22, height: 0.36, tessellation: 8 },
        scene
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.set(0, 0, 0.72);
      tip.material = fromHero ? slashMat : glowingCrimsonMat;
      tip.parent = node;

      return node;
    };

    const buildEnemyRig = (id: string, kind: EnemyKind, zone: ZoneId): EnemyMeshRig => {
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
      let archerAimLine: Mesh | undefined;

      if (kind === "slime") {
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
        const blobMesh = createSculptedPoringBodyMesh(`poringBlob-${id}`, scene);
        blobMesh.position.set(0, 0.56, 0);
        jellyParts.push(blobMesh);

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

        const leftShine = MeshBuilder.CreateSphere(`poringLShine-${id}`, { diameter: 0.08, segments: 8 }, scene);
        leftShine.position.set(-0.2, 0.69, 0.81);
        whiteParts.push(leftShine);

        const rightShine = MeshBuilder.CreateSphere(`poringRShine-${id}`, { diameter: 0.08, segments: 8 }, scene);
        rightShine.position.set(0.22, 0.71, 0.81);
        whiteParts.push(rightShine);

        mergeGroupWithMaterial(`poringWhites-${id}`, whiteParts, whiteEyeMat, body);

        const darkParts: Mesh[] = [];
        const leftPupil = MeshBuilder.CreateSphere(
          `poringLPupil-${id}`,
          { diameter: 0.21, segments: 12 },
          scene
        );
        leftPupil.scaling.set(0.95, 1.18, 0.5);
        leftPupil.position.set(-0.22, 0.64, 0.77);
        darkParts.push(leftPupil);

        const rightPupil = MeshBuilder.CreateSphere(
          `poringRPupil-${id}`,
          { diameter: 0.23, segments: 12 },
          scene
        );
        rightPupil.scaling.set(1.0, 1.22, 0.5);
        rightPupil.position.set(0.21, 0.6, 0.77);
        darkParts.push(rightPupil);

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
      } else if (kind === "goblin" || kind === "archer") {
        const isArcher = kind === "archer";
        const gobSkinMat = registerMat(
          `gobSkinMat-${id}`,
          isArcher
            ? new Color3(0.28, 0.62, 0.38)
            : zone === "dungeon"
            ? new Color3(0.46, 0.32, 0.62)
            : new Color3(0.42, 0.68, 0.24),
          new Color3(0.06, 0.04, 0.02)
        );
        const skinParts: Mesh[] = [];

        const torso = MeshBuilder.CreateCylinder(
          `gobTorso-${id}`,
          { diameterTop: 0.72, diameterBottom: 0.92, height: 0.95, tessellation: 14 },
          scene
        );
        torso.position.set(0, 0.82, 0);
        torso.rotation.x = 0.15;
        skinParts.push(torso);

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
        if (isArcher) {
          const quiver = MeshBuilder.CreateCylinder(
            `gobQuiver-${id}`,
            { diameter: 0.34, height: 0.85, tessellation: 10 },
            scene
          );
          quiver.position.set(-0.22, 1.05, -0.45);
          quiver.rotation.z = -0.35;
          armorParts.push(quiver);
        }
        mergeGroupWithMaterial(`gobGearMerged-${id}`, armorParts, darkObsidianMat, body);

        const eyeParts: Mesh[] = [];
        for (const ex of [-0.18, 0.18]) {
          const eye = MeshBuilder.CreateSphere(`gobEye-${id}-${ex}`, { diameter: 0.16, segments: 10 }, scene);
          eye.position.set(ex, 1.56, 0.43);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`gobEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);

        if (isArcher) {
          const bowArc = MeshBuilder.CreateTorus(
            `gobBow-${id}`,
            { diameter: 1.15, thickness: 0.1, tessellation: 18 },
            scene
          );
          bowArc.rotation.y = Math.PI / 2;
          bowArc.position.set(0, 0.98, 0.58);
          bowArc.material = woodMat;
          bowArc.parent = weapon;

          const nockedArrow = MeshBuilder.CreateCylinder(
            `gobNockedArrow-${id}`,
            { diameter: 0.06, height: 0.95, tessellation: 8 },
            scene
          );
          nockedArrow.rotation.x = Math.PI / 2;
          nockedArrow.position.set(0, 0.98, 0.72);
          nockedArrow.material = glowingCrimsonMat;
          nockedArrow.parent = weapon;

          archerAimLine = MeshBuilder.CreateBox(
            `archerAim-${id}`,
            { width: 0.1, height: 0.04, depth: 9.5 },
            scene
          );
          archerAimLine.position.set(0, 0.08, 4.8);
          archerAimLine.material = glowingCrimsonMat;
          archerAimLine.parent = root;
          archerAimLine.setEnabled(false);
        } else {
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

          // Ground Lunge Path Telegraph Corridor for Goblin Fighters
          chargeCorridorRoot = new TransformNode(`gobChargeCorridor-${id}`, scene);
          chargeCorridorMat = makeMat(
            `gobChargeMat-${id}`,
            new Color3(1.0, 0.38, 0.12),
            new Color3(0.95, 0.28, 0.08),
            new Color3(0, 0, 0),
            0.55
          );
          const gobStrip = MeshBuilder.CreateBox(
            `gobChargeStrip-${id}`,
            { width: 1.25, height: 0.04, depth: 1.0 },
            scene
          );
          gobStrip.position.set(0, 0.06, 0.5);
          gobStrip.material = chargeCorridorMat;
          gobStrip.isPickable = false;
          gobStrip.parent = chargeCorridorRoot;

          const gobTip = MeshBuilder.CreateCylinder(
            `gobChargeTip-${id}`,
            { diameterTop: 0.05, diameterBottom: 1.55, height: 0.32, tessellation: 3 },
            scene
          );
          gobTip.rotation.x = Math.PI / 2;
          gobTip.position.set(0, 0.07, 1.02);
          gobTip.material = chargeCorridorMat;
          gobTip.isPickable = false;
          gobTip.parent = chargeCorridorRoot;

          chargeCorridorRoot.setEnabled(false);
        }
      } else if (kind === "knight") {
        const armorMat = registerMat(
          `knightMat-${id}`,
          zone === "dungeon" ? new Color3(0.32, 0.38, 0.52) : new Color3(0.62, 0.22, 0.24),
          new Color3(0.08, 0.04, 0.06),
          new Color3(0.75, 0.78, 0.85),
          1.0,
          64
        );
        const armorParts: Mesh[] = [];

        for (const lx of [-0.28, 0.28]) {
          const leg = MeshBuilder.CreateCylinder(
            `knightLeg-${id}-${lx}`,
            { diameterTop: 0.36, diameterBottom: 0.4, height: 0.65, tessellation: 12 },
            scene
          );
          leg.position.set(lx, 0.32, 0);
          armorParts.push(leg);
        }

        const cuirass = MeshBuilder.CreateCylinder(
          `knightCuirass-${id}`,
          { diameterTop: 1.24, diameterBottom: 0.88, height: 1.15, tessellation: 14 },
          scene
        );
        cuirass.scaling.set(1.08, 1.0, 0.82);
        cuirass.position.set(0, 1.12, 0);
        armorParts.push(cuirass);

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

        const knightShield = MeshBuilder.CreateBox(
          `knightShield-${id}`,
          { width: 0.18, height: 1.18, depth: 0.78 },
          scene
        );
        knightShield.position.set(-0.78, 1.12, 0.25);
        knightShield.rotation.y = -0.22;
        armorParts.push(knightShield);

        mergeGroupWithMaterial(`knightArmorMerged-${id}`, armorParts, armorMat, body);

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
        const minionMat = registerMat(
          `minionMat-${id}`,
          new Color3(0.58, 0.16, 0.76),
          new Color3(0.24, 0.05, 0.34)
        );
        const wraithParts: Mesh[] = [];

        const cloak = MeshBuilder.CreateCylinder(
          `minionCloak-${id}`,
          { diameterTop: 0.42, diameterBottom: 1.25, height: 1.35, tessellation: 14 },
          scene
        );
        cloak.position.set(0, 0.85, 0);
        wraithParts.push(cloak);

        const hood = MeshBuilder.CreateSphere(
          `minionHood-${id}`,
          { diameter: 0.76, segments: 14 },
          scene
        );
        hood.position.set(0, 1.62, 0.04);
        wraithParts.push(hood);

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

        const eyeParts: Mesh[] = [];
        for (const ex of [-0.14, 0.14]) {
          const eye = MeshBuilder.CreateSphere(`minionEye-${id}-${ex}`, { diameter: 0.13, segments: 8 }, scene);
          eye.position.set(ex, 1.62, 0.36);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`minionEyes-${id}`, eyeParts, glowingYellowEyeMat, body);
      } else {
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

        const pelvis = MeshBuilder.CreateCylinder(
          `bossPelvis-${id}`,
          { diameterTop: 1.65, diameterBottom: 1.95, height: 0.75, tessellation: 14 },
          scene
        );
        pelvis.position.set(0, 1.25, 0);
        bossObsidianParts.push(pelvis);

        const torso = MeshBuilder.CreateCylinder(
          `bossTorso-${id}`,
          { diameterTop: 2.55, diameterBottom: 1.55, height: 1.65, tessellation: 18 },
          scene
        );
        torso.scaling.set(1.12, 1.0, 0.82);
        torso.position.set(0, 2.22, 0);
        bossArmorParts.push(torso);

        const cape = MeshBuilder.CreateBox(
          `bossCape-${id}`,
          { width: 2.35, height: 2.55, depth: 0.16 },
          scene
        );
        cape.position.set(0, 1.75, -0.82);
        cape.rotation.x = 0.18;
        bossObsidianParts.push(cape);

        for (const sx of [-1, 1]) {
          const pauldron = MeshBuilder.CreateSphere(
            `bossPauldron-${id}-${sx}`,
            { diameter: 1.38, segments: 16 },
            scene
          );
          pauldron.scaling.set(1.18, 0.85, 1.05);
          pauldron.position.set(sx * 1.48, 2.85, 0);
          bossArmorParts.push(pauldron);

          const pSpike = MeshBuilder.CreateCylinder(
            `bossPSpike-${id}-${sx}`,
            { diameterTop: 0.04, diameterBottom: 0.34, height: 0.95, tessellation: 12 },
            scene
          );
          pSpike.position.set(sx * 1.92, 3.32, 0);
          pSpike.rotation.z = -sx * 0.68;
          bossHornParts.push(pSpike);

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

        mergeGroupWithMaterial(`bossArmorMerged-${id}`, bossArmorParts, bossArmorMat, body);
        mergeGroupWithMaterial(`bossObsidianMerged-${id}`, bossObsidianParts, darkObsidianMat, body);
        mergeGroupWithMaterial(`bossHornsMerged-${id}`, bossHornParts, boneHornMat, body);
        mergeGroupWithMaterial(`bossCrimsonMerged-${id}`, bossCrimsonParts, glowingCrimsonMat, body);

        const axeParts: Mesh[] = [];
        const axeShaft = MeshBuilder.CreateCylinder(
          `bossAxeShaft-${id}`,
          { diameter: 0.22, height: 3.4, tessellation: 12 },
          scene
        );
        axeShaft.rotation.x = Math.PI / 2;
        axeShaft.position.set(1.55, 1.95, 0.85);
        axeParts.push(axeShaft);

        for (const bx of [-0.55, 0.55]) {
          const crescentBlade = MeshBuilder.CreateCylinder(
            `bossAxeBlade-${id}-${bx}`,
            { diameterTop: 1.45, diameterBottom: 0.45, height: 0.14, tessellation: 16 },
            scene
          );
          crescentBlade.scaling.set(1.15, 1.0, 0.65);
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

      tagHierarchyMetadata(root, "enemy", id);

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
        archerAimLine,
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
    // 3D BUSH CHOP LEAF & GRASS PARTICLE BURST BUILDER
    // =========================================================
    const bushBurstRigs = new Map<string, BushBurstVisualRig>();
    const leafBrightMat = makeMat(
      "leafBrightMat",
      new Color3(0.46, 0.94, 0.34),
      new Color3(0.12, 0.28, 0.08),
      new Color3(0.2, 0.35, 0.15)
    );
    leafBrightMat.backFaceCulling = false;

    const leafEmeraldMat = makeMat(
      "leafEmeraldMat",
      new Color3(0.22, 0.78, 0.31),
      new Color3(0.06, 0.18, 0.07),
      new Color3(0.15, 0.3, 0.12)
    );
    leafEmeraldMat.backFaceCulling = false;

    const leafDeepMat = makeMat(
      "leafDeepMat",
      new Color3(0.14, 0.56, 0.22),
      new Color3(0.03, 0.11, 0.04),
      new Color3(0.1, 0.2, 0.08)
    );
    leafDeepMat.backFaceCulling = false;

    const buildBushBurstRig = (id: string, seed: number): BushBurstVisualRig => {
      const root = new TransformNode(`bushBurstRoot-${id}`, scene);
      const particles: BushLeafParticle[] = [];
      const count = 22;

      const pseudoRand = (n: number): number => {
        const x = Math.sin(seed * 19.73 + n * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      for (let i = 0; i < count; i++) {
        const isGrassBlade = i % 3 === 0;
        let mesh: Mesh;
        let baseScale: Vector3;

        if (isGrassBlade) {
          mesh = MeshBuilder.CreateBox(
            `grassBlade-${id}-${i}`,
            { width: 0.09, height: 0.46, depth: 0.03 },
            scene
          );
          baseScale = new Vector3(
            0.85 + pseudoRand(i * 5 + 1) * 0.45,
            0.85 + pseudoRand(i * 5 + 2) * 0.65,
            1.0
          );
        } else {
          mesh = MeshBuilder.CreatePolyhedron(
            `leafPart-${id}-${i}`,
            { type: 1, size: 0.22 },
            scene
          );
          const s = 0.8 + pseudoRand(i * 7 + 1) * 0.55;
          baseScale = new Vector3(1.25 * s, 0.22 * s, 0.72 * s);
        }

        mesh.material =
          i % 3 === 0 ? leafBrightMat : i % 3 === 1 ? leafEmeraldMat : leafDeepMat;
        mesh.isPickable = false;
        mesh.parent = root;

        const angle =
          (i / count) * Math.PI * 2 + (pseudoRand(i * 11 + 3) - 0.5) * 0.48;
        const speed = 2.4 + pseudoRand(i * 13 + 4) * 4.8;
        const vy = 4.8 + pseudoRand(i * 17 + 5) * 4.6;

        particles.push({
          mesh,
          vx: Math.cos(angle) * speed,
          vy,
          vz: Math.sin(angle) * speed,
          rx0: pseudoRand(i * 19 + 1) * Math.PI * 2,
          ry0: pseudoRand(i * 23 + 2) * Math.PI * 2,
          rz0: pseudoRand(i * 29 + 3) * Math.PI * 2,
          wx: (pseudoRand(i * 31 + 4) - 0.5) * 18.0,
          wy: (pseudoRand(i * 37 + 5) - 0.5) * 18.0,
          wz: (pseudoRand(i * 41 + 6) - 0.5) * 18.0,
          flutterFreq: 10.0 + pseudoRand(i * 43 + 7) * 8.0,
          flutterPhase: pseudoRand(i * 47 + 8) * Math.PI * 2,
          baseScale,
        });
      }

      return { root, particles };
    };

    // =========================================================
    // KEYBOARD & POINTER INPUT + MAP EDITOR 3D RAYCAST INTERACTION
    // =========================================================
    const pressedKeys = new Set<string>();
    let attackTriggeredOnce = false;
    let boomerangTriggeredOnce = false;
    let bowTriggeredOnce = false;
    let rightMouseHeld = false;
    let leftMouseHeldInEditor = false;
    let isDraggingEntityInEditor = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let cursorGroundPos: { x: number; z: number } | null = null;

    const pickGroundPoint = (): { x: number; z: number } | null => {
      const snap = useGameStore.getState();
      const targetGround = snap.zone === "overworld" ? owGround : dgGround;
      const pick = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (m) => m === targetGround
      );
      if (pick?.hit && pick.pickedPoint) {
        return {
          x: Math.max(-40, Math.min(40, pick.pickedPoint.x)),
          z: Math.max(-40, Math.min(40, pick.pickedPoint.z)),
        };
      }
      return null;
    };

    const pickEditorEntity = (): { kind: EditorEntityKind; id: string } | null => {
      const pick = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (m) => m.isEnabled() && Boolean(m.metadata?.editorKind && m.metadata?.editorId)
      );
      if (pick?.hit && pick.pickedMesh?.metadata) {
        return {
          kind: pick.pickedMesh.metadata.editorKind as EditorEntityKind,
          id: pick.pickedMesh.metadata.editorId as string,
        };
      }
      return null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Do not intercept keys if user is typing in an Editor Inspector input
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const code = e.code;
      const store = useGameStore.getState();

      // F2 or Tab toggles Unity-Style Play / Map Editor Mode!
      if (code === "F2" || code === "Tab") {
        e.preventDefault();
        store.setEditorMode(!store.editorMode);
        return;
      }

      if (store.editorMode) {
        if (code === "Delete" || code === "Backspace") {
          e.preventDefault();
          store.deleteSelectedEntity();
        } else if (code === "KeyD" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          store.duplicateSelectedEntity();
        }
        pressedKeys.add(code);
        return;
      }

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
      if ((code === "KeyQ" || code === "Digit1") && !pressedKeys.has(code)) {
        boomerangTriggeredOnce = true;
      }
      if (
        (code === "KeyE" || code === "KeyF" || code === "Digit2") &&
        !pressedKeys.has(code)
      ) {
        bowTriggeredOnce = true;
      }
      pressedKeys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const onPointerDown = (e: PointerEvent) => {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const store = useGameStore.getState();

      if (store.editorMode) {
        if (e.button === 2 || e.button === 1) {
          rightMouseHeld = true;
          return;
        }
        if (e.button === 0) {
          leftMouseHeldInEditor = true;
          const tool = store.editorTool;
          if (tool === "select") {
            const hitEntity = pickEditorEntity();
            if (hitEntity) {
              store.setEditorSelected(hitEntity);
              isDraggingEntityInEditor = true;
            } else {
              store.setEditorSelected(null);
              isDraggingEntityInEditor = false;
            }
          } else if (tool === "place") {
            const pt = pickGroundPoint();
            if (pt) {
              store.placeEntityAt(pt.x, pt.z);
            }
          } else if (tool === "delete") {
            const hitEntity = pickEditorEntity();
            if (hitEntity) {
              store.deleteEntity(hitEntity.kind, hitEntity.id);
            }
          } else if (tool === "terrain") {
            const pt = pickGroundPoint();
            if (pt) {
              store.applyTerrainStroke(pt.x, pt.z, 0.05);
            }
          }
        }
        return;
      }

      if (e.button === 0) {
        attackTriggeredOnce = true;
      } else if (e.button === 2) {
        rightMouseHeld = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const store = useGameStore.getState();
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      if (!store.editorMode) return;

      // Right-click drag orbits camera in Editor Mode
      if (rightMouseHeld) {
        camera.alpha -= dx * 0.0065;
        camera.beta = Math.max(0.25, Math.min(1.38, camera.beta - dy * 0.0055));
        return;
      }

      const pt = pickGroundPoint();
      cursorGroundPos = pt;

      if (leftMouseHeldInEditor && pt) {
        if (store.editorTool === "select" && isDraggingEntityInEditor && store.editorSelected) {
          store.moveSelectedEntityTo(pt.x, pt.z);
        } else if (store.editorTool === "terrain") {
          store.applyTerrainStroke(pt.x, pt.z, 0.035);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2 || e.button === 1) {
        rightMouseHeld = false;
      }
      if (e.button === 0) {
        leftMouseHeldInEditor = false;
        isDraggingEntityInEditor = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const store = useGameStore.getState();
      if (!store.editorMode) return;
      e.preventDefault();
      camera.radius = Math.max(10, Math.min(78, camera.radius + e.deltaY * 0.025));
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);

    // =========================================================
    // MAIN BABYLON RENDER & STORE VIEW SYNC LOOP
    // =========================================================
    let lastTime = performance.now();
    let fpsUpdateAccumulator = 0;
    let syncedTerrainRevision = -1;

    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      fpsUpdateAccumulator += dt;
      if (fpsUpdateAccumulator >= 0.25) {
        fpsUpdateAccumulator = 0;
        const currentFps = Math.round(engine.getFps());
        useGameStore.getState().setFps(currentFps);
      }

      let moveX = 0;
      let moveZ = 0;
      if (pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) moveZ += 1;
      if (pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown")) moveZ -= 1;
      if (pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) moveX += 1;
      if (pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft")) moveX -= 1;

      const store = useGameStore.getState();

      if (store.editorMode) {
        // Editor Mode Free Pan with WASD / Arrow Keys (relative to camera yaw!)
        if (moveX !== 0 || moveZ !== 0) {
          const panSpeed = 24.0 * dt;
          const forwardX = -Math.cos(camera.alpha);
          const forwardZ = -Math.sin(camera.alpha);
          const rightX = Math.sin(camera.alpha);
          const rightZ = -Math.cos(camera.alpha);
          camera.target.x = Math.max(
            -42,
            Math.min(42, camera.target.x + (forwardX * moveZ + rightX * moveX) * panSpeed)
          );
          camera.target.z = Math.max(
            -42,
            Math.min(42, camera.target.z + (forwardZ * moveZ + rightZ * moveX) * panSpeed)
          );
        }
        attackTriggeredOnce = false;
        boomerangTriggeredOnce = false;
        bowTriggeredOnce = false;
      } else {
        const attackPressed =
          attackTriggeredOnce ||
          pressedKeys.has("Space") ||
          pressedKeys.has("KeyJ") ||
          pressedKeys.has("KeyZ");
        const blockHeld =
          rightMouseHeld ||
          pressedKeys.has("ShiftLeft") ||
          pressedKeys.has("ShiftRight");
        const boomerangPressed = boomerangTriggeredOnce;
        const bowPressed = bowTriggeredOnce;

        attackTriggeredOnce = false;
        boomerangTriggeredOnce = false;
        bowTriggeredOnce = false;

        if (store.phase === "playing") {
          store.tick(dt, {
            moveX,
            moveZ,
            attackPressed,
            blockHeld,
            boomerangPressed,
            bowPressed,
          });
        }
      }

      const snap = useGameStore.getState();
      const t = now * 0.001;
      const activeCells = snap.terrainCells[snap.zone];

      // 0. Sync Sculpted & Painted Terrain Vertex Buffers when modified
      if (snap.terrainRevision !== syncedTerrainRevision) {
        syncedTerrainRevision = snap.terrainRevision;
        applyTerrainCellsToGroundMesh(owGround, owBaseColor, snap.terrainCells.overworld);
        applyTerrainCellsToGroundMesh(dgGround, dgBaseColor, snap.terrainCells.dungeon);
      }

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

      // 2. Sync Individual 3D Environment Props (`snap.mapProps`)
      const activePropIds = new Set<string>();
      for (const prop of snap.mapProps) {
        activePropIds.add(prop.id);
        let pRig = propRigs.get(prop.id);
        if (
          !pRig ||
          pRig.prefab !== prop.prefab ||
          pRig.customModelId !== prop.customModelId ||
          pRig.colorHex !== prop.colorHex
        ) {
          if (pRig) pRig.root.dispose();
          pRig = buildPropRig(prop, snap.customModels);
          propRigs.set(prop.id, pRig);
        }
        const showProp = prop.zone === snap.zone;
        pRig.root.setEnabled(showProp);
        if (showProp) {
          const groundY = sampleTerrainHeight(activeCells, prop.x, prop.z);
          pRig.root.position.set(prop.x, groundY + prop.y, prop.z);
          pRig.root.rotation.y = prop.rotY;
          pRig.root.scaling.set(prop.scaleX, prop.scaleY, prop.scaleZ);

          if (prop.prefab === "bush") {
            const isCut = !snap.editorMode && snap.cutBushIds.includes(prop.id);
            if (pRig.bushFoliage) pRig.bushFoliage.setEnabled(!isCut);
            if (pRig.bushStump) pRig.bushStump.setEnabled(isCut);
          }
        }
      }
      propRigs.forEach((pRig, id) => {
        if (!activePropIds.has(id)) {
          pRig.root.dispose();
          propRigs.delete(id);
        }
      });

      // 3. Sync Portals (`snap.portals`)
      const activePortalIds = new Set<string>();
      for (const portal of snap.portals) {
        activePortalIds.add(portal.id);
        let ptRig = portalRigs.get(portal.id);
        if (!ptRig || ptRig.color !== portal.color) {
          if (ptRig) ptRig.root.dispose();
          ptRig = buildPortalRig(portal);
          portalRigs.set(portal.id, ptRig);
        }
        const showPortal = portal.zone === snap.zone;
        ptRig.root.setEnabled(showPortal);
        if (showPortal) {
          const groundY = sampleTerrainHeight(activeCells, portal.x, portal.z);
          ptRig.root.position.set(portal.x, groundY, portal.z);
          ptRig.ring.rotation.y = t * 1.8;
          const rScale = portal.radius / 2.0;
          ptRig.disc.scaling.set(rScale, 1, rScale);
          ptRig.ring.scaling.set(rScale, 1, rScale);
        }
      }
      portalRigs.forEach((ptRig, id) => {
        if (!activePortalIds.has(id)) {
          ptRig.root.dispose();
          portalRigs.delete(id);
        }
      });

      // 4. Sync Hero 3D Model, Shield Block Posture & Sword Swing
      const stride = Math.sin(snap.hero.walkCycle);
      const heroGroundY = sampleTerrainHeight(activeCells, snap.hero.x, snap.hero.z);
      heroRoot.position.set(
        snap.hero.x,
        heroGroundY + Math.abs(stride) * 0.11,
        snap.hero.z
      );
      heroRoot.rotation.y = snap.hero.facing;
      heroLeftBoot.position.z = stride * 0.22;
      heroRightBoot.position.z = -stride * 0.22;

      const heroBlinkHide =
        !snap.editorMode &&
        snap.hero.invulnerableTimer > 0 &&
        Math.floor(snap.hero.invulnerableTimer * 18) % 2 === 0;
      heroRoot.setEnabled(!heroBlinkHide);

      if (snap.hero.isBlocking) {
        heroShieldPivot.position.set(0, 0.96, 0.56);
        heroShieldPivot.rotation.y = Math.PI / 2;
        heroBlockWard.setEnabled(true);
      } else {
        heroShieldPivot.position.set(-0.56, 0.9, 0.24);
        heroShieldPivot.rotation.y = -0.25;
        heroBlockWard.setEnabled(false);
      }

      if (snap.hero.isAttacking) {
        const progress = 1 - snap.hero.attackTimer / 0.24;
        swordPivot.rotation.y = -1.25 + progress * 2.5;
        slashArc.setEnabled(true);
        slashArc.rotation.y = -0.8 + progress * 1.6;
      } else {
        swordPivot.rotation.y = 0.2;
        slashArc.setEnabled(false);
      }

      // Sync Boomerang 3D Mesh
      if (snap.boomerang && snap.boomerang.zone === snap.zone) {
        boomerangNode.setEnabled(true);
        boomerangNode.position.set(snap.boomerang.x, 1.0, snap.boomerang.z);
        boomerangNode.rotation.y = snap.boomerang.spinAngle;
      } else {
        boomerangNode.setEnabled(false);
      }

      // Sync 3D Arrows (Hero & Goblin Archer — including arrows stuck into walls!)
      const activeArrowIds = new Set<string>();
      for (const arrow of snap.arrows) {
        activeArrowIds.add(arrow.id);
        let aRig = arrowRigs.get(arrow.id);
        if (!aRig) {
          aRig = buildArrowRig(arrow.id, arrow.fromHero);
          arrowRigs.set(arrow.id, aRig);
        }
        const showArrow = arrow.zone === snap.zone;
        aRig.setEnabled(showArrow);
        if (showArrow) {
          const aGroundY = sampleTerrainHeight(activeCells, arrow.x, arrow.z);
          aRig.position.set(arrow.x, aGroundY + 1.0, arrow.z);
          aRig.rotation.y = arrow.angle;
          if (arrow.stuck) {
            const st = arrow.stuckTimer ?? 0;
            // Subtle impact vibration right after sticking into a wall
            const vib = st > 2.12 ? Math.sin(t * 72) * 0.085 * ((st - 2.12) / 0.28) : 0;
            aRig.rotation.x = vib;
            // Smooth shrink-out in the final 0.45s before disappearing
            const scaleFade = st < 0.45 ? Math.max(0.01, st / 0.45) : 1.0;
            aRig.scaling.setAll(scaleFade);
          } else {
            aRig.rotation.x = 0;
            aRig.scaling.setAll(1.0);
          }
        }
      }
      arrowRigs.forEach((aRig, id) => {
        if (!activeArrowIds.has(id)) {
          aRig.setEnabled(false);
        }
      });

      // 5. Camera Follow in Play Mode vs Free Orbit in Editor Mode
      if (!snap.editorMode) {
        camera.alpha += (-Math.PI / 2 - camera.alpha) * Math.min(1, dt * 8);
        camera.beta += (0.72 - camera.beta) * Math.min(1, dt * 8);
        camera.radius += (25 - camera.radius) * Math.min(1, dt * 8);

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
      }

      // 6. Sync Sanctum Key, Gate & Boss Chest
      keyNode.setEnabled(isOverworld && !snap.flags.keyPickedUp);
      keyBeaconRing.setEnabled(isOverworld && !snap.flags.keyPickedUp);
      if (!snap.flags.keyPickedUp) {
        keyNode.rotation.y = t * 2.2;
        keyNode.position.y = 1.6 + Math.sin(t * 3.2) * 0.2;
      }

      const targetGateY = snap.flags.gateUnlocked ? -4.8 : 0;
      lockedGateNode.position.y +=
        (targetGateY - lockedGateNode.position.y) * Math.min(1, dt * 6);

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
          if (rig.archerAimLine) rig.archerAimLine.setEnabled(false);
          continue;
        }

        let bob = 0;
        if (!snap.editorMode) {
          if (enemy.kind === "slime") {
            const hopWave = Math.sin(t * 6.2 + eIdx * 1.3);
            bob = Math.max(0, hopWave) * 0.34;
            const stretchY = 1.0 + hopWave * 0.15;
            const squashXZ = 1.0 - hopWave * 0.09;
            rig.body.scaling.set(squashXZ, stretchY, squashXZ);
          } else if (enemy.kind === "minion") {
            bob = Math.sin(t * 4.5 + eIdx) * 0.22;
          }
        } else {
          rig.body.scaling.setAll(1);
        }

        const enemyGroundY = sampleTerrainHeight(activeCells, enemy.x, enemy.z);
        rig.root.position.set(enemy.x, enemyGroundY + bob, enemy.z);
        rig.root.rotation.y = enemy.facing;

        rig.hpBarHolder.position.set(enemy.x, enemyGroundY + rig.barY + bob, enemy.z);
        // Always face camera even when orbiting in Editor Mode!
        rig.hpBarHolder.rotation.set(-camera.beta, -camera.alpha - Math.PI / 2, 0);
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        rig.hpBarFill.scaling.x = Math.max(0.001, hpRatio);
        rig.hpBarFill.position.x = -rig.barWidth * (1 - hpRatio) * 0.5;

        if (rig.archerAimLine) {
          rig.archerAimLine.setEnabled(enemy.state === "windup");
        }

        if (enemy.kind === "goblin") {
          const showGoblinCorridor = enemy.state === "windup";
          if (rig.chargeCorridorRoot && rig.chargeCorridorMat) {
            rig.chargeCorridorRoot.setEnabled(showGoblinCorridor);
            if (showGoblinCorridor) {
              rig.chargeCorridorRoot.position.set(enemy.x, enemyGroundY, enemy.z);
              rig.chargeCorridorRoot.rotation.y = enemy.chargeAngle;
              rig.chargeCorridorRoot.scaling.z = Math.max(2.5, enemy.chargePathLength || 4.0);
              const lockedAim = enemy.stateTimer <= 0.56;
              const pulse = Math.floor(t * 15) % 2 === 0;
              rig.chargeCorridorMat.emissiveColor.set(
                lockedAim && pulse ? 1.0 : 0.95,
                lockedAim && pulse ? 0.78 : 0.28,
                lockedAim && pulse ? 0.25 : 0.08
              );
              rig.chargeCorridorMat.alpha = lockedAim ? 0.68 : 0.45;
            }
          }
        } else if (enemy.kind === "boss") {
          const showCorridor =
            enemy.state === "charge_aim" || enemy.state === "charge_lock";
          if (rig.chargeCorridorRoot && rig.chargeCorridorMat) {
            rig.chargeCorridorRoot.setEnabled(showCorridor);
            if (showCorridor) {
              rig.chargeCorridorRoot.position.set(enemy.x, enemyGroundY, enemy.z);
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
          rig.weapon.rotation.x = enemy.kind === "archer" ? 0 : -0.85;
          rig.telegraphRing.scaling.setAll(1 + Math.sin(t * 18) * 0.12);
        } else if (enemy.state === "attack" || enemy.state === "charge_lunge") {
          rig.weapon.rotation.x = 0.65;
        } else {
          rig.weapon.rotation.x = 0;
        }

        const flashing = enemy.hitFlashTimer > 0 || enemy.stunTimer > 0;
        rig.materials.forEach((mat, idx) => {
          if (enemy.hitFlashTimer > 0) {
            mat.diffuseColor.set(1, 1, 1);
            mat.emissiveColor.set(0.85, 0.35, 0.2);
          } else if (flashing) {
            mat.diffuseColor.set(0.95, 0.9, 0.45);
            mat.emissiveColor.set(0.35, 0.3, 0.08);
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
          if (rig.archerAimLine) rig.archerAimLine.setEnabled(false);
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

      // 9b. Sync 3D Bush Chop Leaf & Grass Particle Bursts
      const activeBurstIds = new Set<string>();
      for (const burst of snap.bushBursts) {
        activeBurstIds.add(burst.id);
        let bRig = bushBurstRigs.get(burst.id);
        if (!bRig) {
          bRig = buildBushBurstRig(burst.id, burst.seed);
          bushBurstRigs.set(burst.id, bRig);
        }

        const showBurst = burst.zone === snap.zone && burst.timer > 0;
        bRig.root.setEnabled(showBurst);
        if (!showBurst) continue;

        const burstGroundY = sampleTerrainHeight(activeCells, burst.x, burst.z);
        bRig.root.position.set(burst.x, burstGroundY, burst.z);

        const elapsed = Math.max(0, burst.maxTimer - burst.timer);
        const progress = Math.min(1, elapsed / burst.maxTimer);
        const drag = 1 - progress * 0.36;
        const scaleFade =
          progress > 0.68 ? Math.max(0.01, (1 - progress) / 0.32) : 1.0;

        for (const p of bRig.particles) {
          const flutterX =
            Math.sin(elapsed * p.flutterFreq + p.flutterPhase) * 0.24 * progress;
          const flutterZ =
            Math.cos(elapsed * p.flutterFreq + p.flutterPhase) * 0.24 * progress;
          const px = p.vx * elapsed * drag + flutterX;
          const pz = p.vz * elapsed * drag + flutterZ;
          const py = Math.max(
            0.04,
            0.52 + p.vy * elapsed - 0.5 * 19.5 * elapsed * elapsed
          );
          p.mesh.position.set(px, py, pz);
          p.mesh.rotation.set(
            p.rx0 + p.wx * elapsed,
            p.ry0 + p.wy * elapsed,
            p.rz0 + p.wz * elapsed
          );
          p.mesh.scaling.set(
            p.baseScale.x * scaleFade,
            p.baseScale.y * scaleFade,
            p.baseScale.z * scaleFade
          );
        }
      }

      bushBurstRigs.forEach((bRig, id) => {
        if (!activeBurstIds.has(id)) {
          bRig.root.dispose();
          bushBurstRigs.delete(id);
        }
      });

      // 10. Sync Rupees (pickable in Editor Mode, with parabolic pop-up arc when dropped!)
      const activeRupeeIds = new Set<string>();
      for (const rupee of snap.rupees) {
        activeRupeeIds.add(rupee.id);
        let mesh = rupeeMeshes.get(rupee.id);
        if (!mesh) {
          mesh = MeshBuilder.CreatePolyhedron(
            `rupee-${rupee.id}`,
            { type: 1, size: 0.38 },
            scene
          );
          mesh.scaling.set(0.75, 1.35, 0.55);
          mesh.metadata = { editorKind: "rupee", editorId: rupee.id };
          mesh.isPickable = true;
          rupeeMeshes.set(rupee.id, mesh);
        }
        mesh.material =
          rupee.tier === "red"
            ? redRupeeMat
            : rupee.tier === "blue"
            ? blueRupeeMat
            : greenRupeeMat;

        const showRupee = rupee.zone === snap.zone && (!rupee.collected || snap.editorMode);
        mesh.setEnabled(showRupee);
        if (showRupee) {
          const rGroundY = sampleTerrainHeight(activeCells, rupee.x, rupee.z);
          const bounceLeft = !snap.editorMode ? rupee.spawnBounceTimer ?? 0 : 0;
          let bounceArcY = 0;
          if (bounceLeft > 0) {
            const bp = 1 - Math.min(1, bounceLeft / 0.46);
            bounceArcY = 4 * 1.35 * bp * (1 - bp);
          }
          mesh.position.set(
            rupee.x,
            rGroundY +
              0.65 +
              bounceArcY +
              (snap.editorMode ? 0 : Math.sin(t * 4.2 + rupee.x) * 0.14),
            rupee.z
          );
          mesh.rotation.y = snap.editorMode
            ? 0
            : t * (bounceLeft > 0 ? 11.0 : 3.0) + rupee.z;
        }
      }
      rupeeMeshes.forEach((mesh, id) => {
        if (!activeRupeeIds.has(id)) {
          mesh.dispose();
          rupeeMeshes.delete(id);
        }
      });

      // 11. Sync Editor Selection Gizmo & Terrain Brush Ring
      if (snap.editorMode && snap.editorSelected) {
        let selPos: { x: number; z: number } | null = null;
        if (snap.editorSelected.kind === "prop") {
          const p = snap.mapProps.find((it) => it.id === snap.editorSelected?.id);
          if (p && p.zone === snap.zone) selPos = { x: p.x, z: p.z };
        } else if (snap.editorSelected.kind === "enemy") {
          const e = snap.enemies.find((it) => it.id === snap.editorSelected?.id);
          if (e && e.zone === snap.zone) selPos = { x: e.x, z: e.z };
        } else if (snap.editorSelected.kind === "rupee") {
          const r = snap.rupees.find((it) => it.id === snap.editorSelected?.id);
          if (r && r.zone === snap.zone) selPos = { x: r.x, z: r.z };
        } else if (snap.editorSelected.kind === "portal") {
          const pt = snap.portals.find((it) => it.id === snap.editorSelected?.id);
          if (pt && pt.zone === snap.zone) selPos = { x: pt.x, z: pt.z };
        }

        if (selPos) {
          editorGizmoRoot.setEnabled(true);
          const gy = sampleTerrainHeight(activeCells, selPos.x, selPos.z);
          editorGizmoRoot.position.set(selPos.x, gy, selPos.z);
          selRing.rotation.y = t * 2.0;
        } else {
          editorGizmoRoot.setEnabled(false);
        }
      } else {
        editorGizmoRoot.setEnabled(false);
      }

      if (snap.editorMode && snap.editorTool === "terrain" && cursorGroundPos) {
        terrainBrushRing.setEnabled(true);
        const gy = sampleTerrainHeight(activeCells, cursorGroundPos.x, cursorGroundPos.z);
        terrainBrushRing.position.set(cursorGroundPos.x, gy + 0.14, cursorGroundPos.z);
        terrainBrushRing.scaling.setAll(snap.terrainBrushRadius);
      } else {
        terrainBrushRing.setEnabled(false);
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
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
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
