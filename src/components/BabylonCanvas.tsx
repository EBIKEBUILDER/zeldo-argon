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
  BOSS_EXIT_GATE_POS,
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
  chargeCorridorBody?: TransformNode;
  chargeCorridorTip?: Mesh;
  chargeCorridorMat?: StandardMaterial;
  lungeShieldMesh?: Mesh;
  stunStarsRoot?: TransformNode;
  archerAimLine?: Mesh;
}

/**
 * Builds a flat 3D arrowhead mesh lying on the ground plane whose apex points
 * strictly along +Z (0, y, +tipLen) and whose base spans (-halfWidth..+halfWidth, y, 0).
 * Because +Z is the exact direction of (Math.sin(chargeAngle), Math.cos(chargeAngle)),
 * this arrowhead never has a 90-degree cylinder-tessellation offset and never stretches.
 */
function createForwardArrowheadMesh(
  name: string,
  halfWidth: number,
  tipLength: number,
  scene: Scene
): Mesh {
  const mesh = new Mesh(name, scene);
  const yTop = 0.085;
  const yBot = 0.035;

  const positions = [
    // Top face (0, 1, 2)
    0, yTop, tipLength,
    -halfWidth, yTop, 0,
    halfWidth, yTop, 0,
    // Bottom face (3, 4, 5)
    0, yBot, tipLength,
    halfWidth, yBot, 0,
    -halfWidth, yBot, 0,
  ];
  const indices = [
    0, 1, 2,
    3, 4, 5,
    0, 2, 4, 0, 4, 3,
    0, 3, 5, 0, 5, 1,
    1, 5, 4, 1, 4, 2,
  ];
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vData = new VertexData();
  vData.positions = positions;
  vData.indices = indices;
  vData.normals = normals;
  vData.applyToMesh(mesh);
  mesh.isPickable = false;
  return mesh;
}

interface PropVisualRig {
  root: TransformNode;
  prefab: PropPrefabId;
  customModelId?: string;
  colorHex?: string;
  bushFoliage?: Mesh | TransformNode;
  bushStump?: TransformNode;
  torchFlame?: Mesh;
  dirtMound?: TransformNode;
  dirtHole?: TransformNode;
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

    // Automatically hydrate any authored Map Editor layout saved in localStorage
    useGameStore.getState().hydrateSavedMapFromStorage();

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
    const frontierRoot = new TransformNode("frontierRoot", scene);

    const owBaseColor = new Color3(0.24, 0.55, 0.28);
    const dgBaseColor = new Color3(0.18, 0.19, 0.25);
    const frBaseColor = new Color3(0.18, 0.46, 0.32);

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
    const frGroundMat = makeMat(
      "frGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.06, 0.09, 0.07)
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

    const frGround = MeshBuilder.CreateGround(
      "frGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    frGround.material = frGroundMat;
    frGround.parent = frontierRoot;
    frGround.isPickable = true;
    applyTerrainCellsToGroundMesh(frGround, frBaseColor, {});

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

    // Locked Iron Gate in Dungeon (Southern entry to Room 3)
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

    // Northern Sanctum Exit Gate (unseals when Boss Malakor is defeated, opening the path to the Elderwood Frontier!)
    const bossExitGateNode = new TransformNode("bossExitGateNode", scene);
    bossExitGateNode.parent = dungeonRoot;
    bossExitGateNode.position.set(BOSS_EXIT_GATE_POS.x, 0, BOSS_EXIT_GATE_POS.z);

    {
      const h = 4.8;
      const w = 7.4;
      const exitIronParts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `exitGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        exitIronParts.push(bar);
      }
      const crossBeamTop = MeshBuilder.CreateBox(
        "exitGateBeamTop",
        { width: w, height: 0.4, depth: 0.52 },
        scene
      );
      crossBeamTop.position.set(0, h - 0.5, 0);
      exitIronParts.push(crossBeamTop);

      const crossBeamMid = MeshBuilder.CreateBox(
        "exitGateBeamMid",
        { width: w, height: 0.34, depth: 0.48 },
        scene
      );
      crossBeamMid.position.set(0, h * 0.45, 0);
      exitIronParts.push(crossBeamMid);

      mergeGroupWithMaterial("mergedExitGateIron", exitIronParts, ironGateMat, bossExitGateNode);

      const sealEmblem = MeshBuilder.CreateTorus(
        "exitGateSealEmblem",
        { diameter: 1.5, thickness: 0.18, tessellation: 20 },
        scene
      );
      sealEmblem.rotation.x = Math.PI / 2;
      sealEmblem.position.set(0, h * 0.48, 0);
      sealEmblem.material = glowingCrimsonMat;
      sealEmblem.parent = bossExitGateNode;
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

    const dirtSoilMat = makeMat(
      "dirtSoilMat",
      new Color3(0.46, 0.31, 0.17),
      new Color3(0.06, 0.03, 0.01),
      new Color3(0.08, 0.06, 0.04)
    );
    const dirtPitMat = makeMat(
      "dirtPitMat",
      new Color3(0.24, 0.16, 0.09),
      new Color3(0.02, 0.01, 0.01),
      new Color3(0.05, 0.04, 0.03)
    );

    const buildPropRig = (
      prop: MapPropInstance,
      customModels: CustomModelAsset[]
    ): PropVisualRig => {
      const root = new TransformNode(`propRoot-${prop.id}`, scene);
      const meta = { editorKind: "prop" as const, editorId: prop.id };

      let bushFoliage: Mesh | TransformNode | undefined;
      let bushStump: TransformNode | undefined;
      let torchFlame: Mesh | undefined;
      let dirtMound: TransformNode | undefined;
      let dirtHole: TransformNode | undefined;

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
          { diameterTop: 0.72, diameterBottom: 0.92, height: 1.48, tessellation: 12 },
          scene
        );
        stand.position.set(0, 0.74, 0);
        stand.material = dgPillarMat;
        stand.parent = root;

        const bowl = MeshBuilder.CreateCylinder(
          `torchBowl-${prop.id}`,
          { diameterTop: 1.05, diameterBottom: 0.65, height: 0.28, tessellation: 12 },
          scene
        );
        bowl.position.set(0, 1.44, 0);
        bowl.material = ironGateMat;
        bowl.parent = root;

        // Puzzle pedestal ring indicator if this torch is part of a Torch Combination Puzzle!
        if (prop.puzzleTarget === "lit" || prop.puzzleTarget === "unlit") {
          const hintMat =
            prop.puzzleTarget === "lit" ? goldKeyMat : darkObsidianMat;
          const hintRing = MeshBuilder.CreateTorus(
            `torchHintRing-${prop.id}`,
            { diameter: 1.48, thickness: 0.12, tessellation: 20 },
            scene
          );
          hintRing.position.set(0, 0.08, 0);
          hintRing.material = hintMat;
          hintRing.parent = root;
        }

        const flame = MeshBuilder.CreateSphere(
          `torchFlame-${prop.id}`,
          { diameter: 0.74, segments: 12 },
          scene
        );
        flame.scaling.set(0.88, 1.52, 0.88);
        flame.position.set(0, 1.78, 0);
        flame.material = goldKeyMat;
        flame.parent = root;
        torchFlame = flame;
      } else if (prop.prefab === "dirt_patch") {
        // Soft Dirt Patch that can be dug up with the Shovel (G / 4)!
        const moundNode = new TransformNode(`dirtMound-${prop.id}`, scene);
        moundNode.parent = root;

        const moundParts: Mesh[] = [];
        const baseDisc = MeshBuilder.CreateCylinder(
          `dirtBase-${prop.id}`,
          { diameterTop: 1.45, diameterBottom: 1.68, height: 0.14, tessellation: 14 },
          scene
        );
        baseDisc.position.set(0, 0.07, 0);
        moundParts.push(baseDisc);

        for (const clod of [
          { x: 0, z: 0, s: 0.52, y: 0.16 },
          { x: -0.34, z: 0.18, s: 0.38, y: 0.13 },
          { x: 0.36, z: -0.14, s: 0.4, y: 0.14 },
          { x: 0.12, z: 0.34, s: 0.34, y: 0.12 },
          { x: -0.22, z: -0.3, s: 0.36, y: 0.12 },
        ]) {
          const cMesh = MeshBuilder.CreatePolyhedron(
            `dirtClod-${prop.id}-${clod.x}`,
            { type: 2, size: clod.s },
            scene
          );
          cMesh.scaling.set(1.2, 0.62, 1.15);
          cMesh.position.set(clod.x, clod.y, clod.z);
          moundParts.push(cMesh);
        }
        mergeGroupWithMaterial(`dirtMoundMerged-${prop.id}`, moundParts, dirtSoilMat, moundNode, meta);

        // Subtle golden treasure glint on soft dirt patches
        const glint = MeshBuilder.CreatePolyhedron(
          `dirtGlint-${prop.id}`,
          { type: 1, size: 0.14 },
          scene
        );
        glint.position.set(0.08, 0.32, -0.05);
        glint.material = goldKeyMat;
        glint.parent = moundNode;
        dirtMound = moundNode;

        // Excavated pit shown after digging with the Shovel!
        const holeNode = new TransformNode(`dirtHole-${prop.id}`, scene);
        holeNode.parent = root;

        const pitRim = MeshBuilder.CreateTorus(
          `dirtPitRim-${prop.id}`,
          { diameter: 1.48, thickness: 0.24, tessellation: 16 },
          scene
        );
        pitRim.scaling.set(1.0, 0.55, 1.0);
        pitRim.position.set(0, 0.05, 0);
        pitRim.material = dirtSoilMat;
        pitRim.parent = holeNode;

        const pitCenter = MeshBuilder.CreateCylinder(
          `dirtPitCenter-${prop.id}`,
          { diameter: 1.32, height: 0.05, tessellation: 14 },
          scene
        );
        pitCenter.position.set(0, 0.025, 0);
        pitCenter.material = dirtPitMat;
        pitCenter.parent = holeNode;

        holeNode.setEnabled(false);
        dirtHole = holeNode;
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
        torchFlame,
        dirtMound,
        dirtHole,
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
    // UPGRADED HERO 3D CHARACTER RIG + SHIELD BLOCK WARD + TOOLS
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

    // 360° Charged Spin Attack Whirlwind Ring & Charge Aura Ring
    const spinSlashRing = MeshBuilder.CreateTorus(
      "spinSlashRing",
      { diameter: 6.2, thickness: 0.32, tessellation: 36 },
      scene
    );
    spinSlashRing.position.set(0, 0.92, 0);
    spinSlashRing.scaling.set(1.0, 0.3, 1.0);
    spinSlashRing.material = makeMat(
      "spinSlashMat",
      new Color3(1.0, 0.88, 0.26),
      new Color3(1.0, 0.72, 0.14),
      new Color3(1, 1, 1),
      0.86
    );
    spinSlashRing.parent = heroRoot;
    spinSlashRing.setEnabled(false);

    const chargeAuraMat = makeMat(
      "chargeAuraMat",
      new Color3(1.0, 0.82, 0.22),
      new Color3(0.95, 0.65, 0.12),
      new Color3(1, 1, 1),
      0.65
    );
    const chargeAuraRing = MeshBuilder.CreateTorus(
      "chargeAuraRing",
      { diameter: 2.35, thickness: 0.13, tessellation: 28 },
      scene
    );
    chargeAuraRing.position.set(0, 0.16, 0);
    chargeAuraRing.material = chargeAuraMat;
    chargeAuraRing.parent = heroRoot;
    chargeAuraRing.setEnabled(false);

    // --- 3D MAGIC FIRE ROD ON HERO (SHOWN WHEN CHARGING / CASTING FIREBALLS) ---
    const heroFireRodNode = new TransformNode("heroFireRodNode", scene);
    heroFireRodNode.position.set(0.46, 0.96, 0.28);
    heroFireRodNode.parent = heroRoot;

    const fireRodShaft = MeshBuilder.CreateCylinder(
      "fireRodShaft",
      { diameterTop: 0.12, diameterBottom: 0.09, height: 1.35, tessellation: 10 },
      scene
    );
    fireRodShaft.rotation.x = Math.PI / 2;
    fireRodShaft.position.set(0, 0, 0.55);
    fireRodShaft.material = glowingCrimsonMat;
    fireRodShaft.parent = heroFireRodNode;

    const fireRodCrown = MeshBuilder.CreatePolyhedron(
      "fireRodCrown",
      { type: 1, size: 0.22 },
      scene
    );
    fireRodCrown.position.set(0, 0, 1.28);
    fireRodCrown.material = goldKeyMat;
    fireRodCrown.parent = heroFireRodNode;
    heroFireRodNode.setEnabled(false);

    // --- 3D SHOVEL ON HERO (SHOWN WHEN DIGGING SOFT DIRT PATCHES) ---
    const heroShovelNode = new TransformNode("heroShovelNode", scene);
    heroShovelNode.position.set(0.42, 0.88, 0.35);
    heroShovelNode.parent = heroRoot;

    const shovelHandle = MeshBuilder.CreateCylinder(
      "shovelHandle",
      { diameter: 0.09, height: 1.25, tessellation: 8 },
      scene
    );
    shovelHandle.rotation.x = Math.PI / 2.6;
    shovelHandle.position.set(0, 0.12, 0.42);
    shovelHandle.material = woodMat;
    shovelHandle.parent = heroShovelNode;

    const shovelScoop = MeshBuilder.CreateCylinder(
      "shovelScoop",
      { diameterTop: 0.44, diameterBottom: 0.14, height: 0.48, tessellation: 6 },
      scene
    );
    shovelScoop.rotation.x = Math.PI / 2.6;
    shovelScoop.scaling.set(1.0, 1.0, 0.32);
    shovelScoop.position.set(0, -0.34, 0.96);
    shovelScoop.material = bladeMat;
    shovelScoop.parent = heroShovelNode;
    heroShovelNode.setEnabled(false);

    // --- 3D RANGER'S BOW ON HERO (SHOWN WHEN SHOOTING ARROWS) ---
    const heroBowNode = new TransformNode("heroBowNode", scene);
    heroBowNode.position.set(0, 0.96, 0.62);
    heroBowNode.parent = heroRoot;

    const heroBowArc = MeshBuilder.CreateTorus(
      "heroBowArc",
      { diameter: 1.15, thickness: 0.1, tessellation: 18 },
      scene
    );
    heroBowArc.rotation.y = Math.PI / 2;
    heroBowArc.material = goldKeyMat;
    heroBowArc.parent = heroBowNode;

    const heroBowString = MeshBuilder.CreateCylinder(
      "heroBowString",
      { diameter: 0.025, height: 1.08, tessellation: 6 },
      scene
    );
    heroBowString.position.set(0, 0, -0.08);
    heroBowString.material = whiteEyeMat;
    heroBowString.parent = heroBowNode;
    heroBowNode.setEnabled(false);

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
    const heartPickupMat = makeMat(
      "heartPickupMat",
      new Color3(1.0, 0.18, 0.38),
      new Color3(0.62, 0.06, 0.18),
      new Color3(1.0, 0.92, 0.95)
    );

    const buildPickupMesh = (id: string, isHeart: boolean): Mesh => {
      if (isHeart) {
        const leftLobe = MeshBuilder.CreateSphere(
          `heartLobeL-${id}`,
          { diameter: 0.44, segments: 12 },
          scene
        );
        leftLobe.position.set(-0.14, 0.14, 0);

        const rightLobe = MeshBuilder.CreateSphere(
          `heartLobeR-${id}`,
          { diameter: 0.44, segments: 12 },
          scene
        );
        rightLobe.position.set(0.14, 0.14, 0);

        const bottomPoint = MeshBuilder.CreateCylinder(
          `heartTip-${id}`,
          { diameterTop: 0.54, diameterBottom: 0.02, height: 0.48, tessellation: 16 },
          scene
        );
        bottomPoint.position.set(0, -0.1, 0);

        const merged =
          Mesh.MergeMeshes([leftLobe, rightLobe, bottomPoint], true, true) ??
          MeshBuilder.CreateSphere(`heartFallback-${id}`, { diameter: 0.6 }, scene);
        merged.name = `heart-${id}`;
        merged.scaling.set(1.08, 1.08, 0.58);
        merged.metadata = { editorKind: "rupee", editorId: id, isHeart: true };
        merged.isPickable = true;
        return merged;
      }

      const mesh = MeshBuilder.CreatePolyhedron(
        `rupee-${id}`,
        { type: 1, size: 0.38 },
        scene
      );
      mesh.scaling.set(0.75, 1.35, 0.55);
      mesh.metadata = { editorKind: "rupee", editorId: id, isHeart: false };
      mesh.isPickable = true;
      return mesh;
    };

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

      const fletchH = MeshBuilder.CreateBox(
        `arrowFletchH-${id}`,
        { width: 0.26, height: 0.03, depth: 0.28 },
        scene
      );
      fletchH.position.set(0, 0, -0.52);
      fletchH.material = fromHero ? slashMat : glowingCrimsonMat;
      fletchH.parent = node;

      const fletchV = MeshBuilder.CreateBox(
        `arrowFletchV-${id}`,
        { width: 0.03, height: 0.26, depth: 0.28 },
        scene
      );
      fletchV.position.set(0, 0, -0.52);
      fletchV.material = fromHero ? slashMat : glowingCrimsonMat;
      fletchV.parent = node;

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
      let chargeCorridorBody: TransformNode | undefined;
      let chargeCorridorTip: Mesh | undefined;
      let chargeCorridorMat: StandardMaterial | undefined;
      let lungeShieldMesh: Mesh | undefined;
      let stunStarsRoot: TransformNode | undefined;
      let archerAimLine: Mesh | undefined;

      const buildCorridorRig = (corridorWidth: number, tipLength: number) => {
        const cRoot = new TransformNode(`chargeCorridorRoot-${id}`, scene);
        const cBody = new TransformNode(`chargeCorridorBody-${id}`, scene);
        cBody.parent = cRoot;

        const cMat = makeMat(
          `chargeCorridorMat-${id}`,
          new Color3(1.0, 0.36, 0.14),
          new Color3(0.95, 0.26, 0.08),
          new Color3(0, 0, 0),
          0.54
        );

        const strip = MeshBuilder.CreateBox(
          `chargeStrip-${id}`,
          { width: corridorWidth, height: 0.04, depth: 1.0 },
          scene
        );
        strip.position.set(0, 0.055, 0.5);
        strip.material = cMat;
        strip.isPickable = false;
        strip.parent = cBody;

        const railMat = makeMat(
          `chargeRailMat-${id}`,
          new Color3(1.0, 0.86, 0.26),
          new Color3(1.0, 0.72, 0.16)
        );
        const railParts: Mesh[] = [];
        const halfW = corridorWidth * 0.5;
        for (const rx of [-halfW, halfW]) {
          const rail = MeshBuilder.CreateBox(
            `chargeRail-${id}-${rx}`,
            { width: 0.1, height: 0.075, depth: 1.0 },
            scene
          );
          rail.position.set(rx, 0.07, 0.5);
          rail.isPickable = false;
          railParts.push(rail);
        }
        const mergedRails = mergeGroupWithMaterial(
          `chargeRailsMerged-${id}`,
          railParts,
          railMat,
          cBody
        );
        if (mergedRails) mergedRails.isPickable = false;

        // Forward-pointing +Z arrowhead parented directly to cRoot so scaling cBody.scaling.z never stretches the triangle!
        const cTip = createForwardArrowheadMesh(
          `chargeArrowTip-${id}`,
          corridorWidth * 0.68,
          tipLength,
          scene
        );
        cTip.material = cMat;
        cTip.parent = cRoot;

        cRoot.setEnabled(false);
        chargeCorridorRoot = cRoot;
        chargeCorridorBody = cBody;
        chargeCorridorTip = cTip;
        chargeCorridorMat = cMat;
      };

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

          // Ground Lunge Path Telegraph Corridor for Goblin Fighters (with +Z aligned arrowhead!)
          buildCorridorRig(1.25, 0.85);
        }
      } else if (kind === "knight") {
        // =====================================================
        // MARIO RPG-INSPIRED HIGH-DEFINITION LOW-POLY SENTINEL KNIGHT
        // Keeps the iconic chunky knight silhouette while adding multi-tone
        // enameled plate, polished silver trim, gilded gold crown/crests,
        // dark chainmail, heraldic heater shield, and glowing visor eyes!
        // =====================================================
        const knightPrimaryMat = registerMat(
          `knightPrimaryMat-${id}`,
          zone === "dungeon"
            ? new Color3(0.22, 0.42, 0.84)
            : zone === "frontier"
            ? new Color3(0.16, 0.62, 0.52)
            : new Color3(0.82, 0.16, 0.22),
          new Color3(0.08, 0.03, 0.05),
          new Color3(0.85, 0.88, 0.95),
          1.0,
          72
        );
        const knightSilverMat = registerMat(
          `knightSilverMat-${id}`,
          new Color3(0.86, 0.9, 0.96),
          new Color3(0.08, 0.09, 0.12),
          new Color3(1.0, 1.0, 1.0),
          1.0,
          96
        );
        const knightGoldMat = registerMat(
          `knightGoldMat-${id}`,
          new Color3(1.0, 0.82, 0.2),
          new Color3(0.28, 0.18, 0.02),
          new Color3(1.0, 0.95, 0.75),
          1.0,
          80
        );
        const knightPlumeMat = registerMat(
          `knightPlumeMat-${id}`,
          zone === "dungeon"
            ? new Color3(0.95, 0.28, 0.42)
            : new Color3(0.98, 0.22, 0.26),
          new Color3(0.32, 0.05, 0.08)
        );

        const primaryParts: Mesh[] = [];
        const silverParts: Mesh[] = [];
        const goldParts: Mesh[] = [];
        const chainmailParts: Mesh[] = [];
        const plumeParts: Mesh[] = [];
        const eyeParts: Mesh[] = [];

        // 1. Articulated Sabatons, Greaves, Knee Poleyns & Thigh Cuisses
        for (const lx of [-0.3, 0.3]) {
          const sabaton = MeshBuilder.CreateBox(
            `knightSabaton-${id}-${lx}`,
            { width: 0.38, height: 0.22, depth: 0.56 },
            scene
          );
          sabaton.position.set(lx, 0.11, 0.08);
          silverParts.push(sabaton);

          const sabatonToe = MeshBuilder.CreateCylinder(
            `knightToe-${id}-${lx}`,
            { diameterTop: 0.24, diameterBottom: 0.36, height: 0.2, tessellation: 12 },
            scene
          );
          sabatonToe.rotation.x = Math.PI / 2;
          sabatonToe.position.set(lx, 0.1, 0.38);
          silverParts.push(sabatonToe);

          const greave = MeshBuilder.CreateCylinder(
            `knightGreave-${id}-${lx}`,
            { diameterTop: 0.38, diameterBottom: 0.34, height: 0.52, tessellation: 14 },
            scene
          );
          greave.position.set(lx, 0.42, 0);
          primaryParts.push(greave);

          const kneePoleyn = MeshBuilder.CreatePolyhedron(
            `knightPoleyn-${id}-${lx}`,
            { type: 1, size: 0.18 },
            scene
          );
          kneePoleyn.scaling.set(1.15, 1.1, 0.75);
          kneePoleyn.position.set(lx, 0.62, 0.22);
          silverParts.push(kneePoleyn);
        }

        // 2. Chainmail Hauberk Skirt & Segmented Silver Tassets / Faulds
        const mailSkirt = MeshBuilder.CreateCylinder(
          `knightMailSkirt-${id}`,
          { diameterTop: 0.88, diameterBottom: 1.02, height: 0.38, tessellation: 16 },
          scene
        );
        mailSkirt.position.set(0, 0.68, 0);
        chainmailParts.push(mailSkirt);

        const waistFauld = MeshBuilder.CreateCylinder(
          `knightWaistFauld-${id}`,
          { diameterTop: 0.94, diameterBottom: 1.08, height: 0.22, tessellation: 16 },
          scene
        );
        waistFauld.scaling.set(1.06, 1.0, 0.86);
        waistFauld.position.set(0, 0.84, 0);
        silverParts.push(waistFauld);

        // Golden Royal Belt & Buckle
        const belt = MeshBuilder.CreateCylinder(
          `knightBelt-${id}`,
          { diameterTop: 0.98, diameterBottom: 0.98, height: 0.12, tessellation: 16 },
          scene
        );
        belt.scaling.set(1.07, 1.0, 0.87);
        belt.position.set(0, 0.94, 0);
        goldParts.push(belt);

        const beltBuckle = MeshBuilder.CreateBox(
          `knightBuckle-${id}`,
          { width: 0.28, height: 0.22, depth: 0.12 },
          scene
        );
        beltBuckle.position.set(0, 0.94, 0.42);
        goldParts.push(beltBuckle);

        // 3. Broad Barrel Cuirass + Silver Plackart V-Guard + Gilded Sun Emblem
        const cuirass = MeshBuilder.CreateCylinder(
          `knightCuirass-${id}`,
          { diameterTop: 1.32, diameterBottom: 0.94, height: 0.88, tessellation: 18 },
          scene
        );
        cuirass.scaling.set(1.08, 1.0, 0.84);
        cuirass.position.set(0, 1.32, 0);
        primaryParts.push(cuirass);

        const plackart = MeshBuilder.CreateCylinder(
          `knightPlackart-${id}`,
          { diameterTop: 1.18, diameterBottom: 0.86, height: 0.52, tessellation: 12 },
          scene
        );
        plackart.scaling.set(1.04, 1.0, 0.88);
        plackart.position.set(0, 1.18, 0.04);
        silverParts.push(plackart);

        const chestEmblem = MeshBuilder.CreatePolyhedron(
          `knightChestEmblem-${id}`,
          { type: 1, size: 0.22 },
          scene
        );
        chestEmblem.scaling.set(1.15, 1.35, 0.55);
        chestEmblem.position.set(0, 1.42, 0.52);
        goldParts.push(chestEmblem);

        // Flowing Heraldic Back Mantle Cape
        const cape = MeshBuilder.CreateBox(
          `knightCape-${id}`,
          { width: 1.18, height: 1.28, depth: 0.1 },
          scene
        );
        cape.position.set(0, 1.12, -0.48);
        cape.rotation.x = 0.2;
        plumeParts.push(cape);

        // 4. Layered Spherical Pauldrons with Silver Rims, Gold Spikes & Armored Gauntlets
        for (const side of [-1, 1]) {
          const px = side * 0.76;
          const pauldron = MeshBuilder.CreateSphere(
            `knightPauldron-${id}-${side}`,
            { diameter: 0.68, segments: 16 },
            scene
          );
          pauldron.scaling.set(1.14, 0.9, 1.04);
          pauldron.position.set(px, 1.58, 0);
          primaryParts.push(pauldron);

          const pauldronRim = MeshBuilder.CreateTorus(
            `knightPauldronRim-${id}-${side}`,
            { diameter: 0.66, thickness: 0.09, tessellation: 18 },
            scene
          );
          pauldronRim.rotation.z = -side * 0.35;
          pauldronRim.position.set(px, 1.48, 0);
          silverParts.push(pauldronRim);

          const pauldronSpike = MeshBuilder.CreateCylinder(
            `knightPauldronSpike-${id}-${side}`,
            { diameterTop: 0.02, diameterBottom: 0.18, height: 0.34, tessellation: 10 },
            scene
          );
          pauldronSpike.position.set(px + side * 0.18, 1.84, 0);
          pauldronSpike.rotation.z = -side * 0.52;
          goldParts.push(pauldronSpike);

          const upperArm = MeshBuilder.CreateCylinder(
            `knightArm-${id}-${side}`,
            { diameterTop: 0.28, diameterBottom: 0.24, height: 0.48, tessellation: 12 },
            scene
          );
          upperArm.position.set(px, 1.24, 0.1);
          chainmailParts.push(upperArm);

          const gauntlet = MeshBuilder.CreateCylinder(
            `knightGauntlet-${id}-${side}`,
            { diameterTop: 0.3, diameterBottom: 0.34, height: 0.38, tessellation: 12 },
            scene
          );
          gauntlet.rotation.x = Math.PI / 3;
          gauntlet.position.set(px, 1.06, 0.26);
          silverParts.push(gauntlet);
        }

        // 5. Armored Gorget, Great-Helm, Sculpted Silver Bevor Faceplate, Gilded Crown & Glowing Visor Eyes
        const gorget = MeshBuilder.CreateCylinder(
          `knightGorget-${id}`,
          { diameterTop: 0.82, diameterBottom: 0.96, height: 0.2, tessellation: 16 },
          scene
        );
        gorget.position.set(0, 1.78, 0);
        silverParts.push(gorget);

        const helmBarrel = MeshBuilder.CreateCylinder(
          `knightHelm-${id}`,
          { diameterTop: 0.76, diameterBottom: 0.84, height: 0.68, tessellation: 18 },
          scene
        );
        helmBarrel.position.set(0, 2.1, 0);
        primaryParts.push(helmBarrel);

        const helmDome = MeshBuilder.CreateSphere(
          `knightHelmDome-${id}`,
          { diameter: 0.78, segments: 16 },
          scene
        );
        helmDome.scaling.set(1.0, 0.88, 1.0);
        helmDome.position.set(0, 2.4, 0);
        primaryParts.push(helmDome);

        // Silver V-Bevor Lower Faceguard & Brow Visor Ridge
        const bevorGuard = MeshBuilder.CreateCylinder(
          `knightBevor-${id}`,
          { diameterTop: 0.82, diameterBottom: 0.74, height: 0.36, tessellation: 12 },
          scene
        );
        bevorGuard.position.set(0, 1.94, 0.08);
        silverParts.push(bevorGuard);

        const browRidge = MeshBuilder.CreateBox(
          `knightBrow-${id}`,
          { width: 0.66, height: 0.1, depth: 0.24 },
          scene
        );
        browRidge.position.set(0, 2.22, 0.34);
        silverParts.push(browRidge);

        // Deep Dark Visor Recess + Glowing Mario-RPG Amber Eyes Inside!
        const visorRecess = MeshBuilder.CreateBox(
          `knightVisorRecess-${id}`,
          { width: 0.58, height: 0.16, depth: 0.18 },
          scene
        );
        visorRecess.position.set(0, 2.13, 0.34);
        chainmailParts.push(visorRecess);

        for (const ex of [-0.14, 0.14]) {
          const visorEye = MeshBuilder.CreateSphere(
            `knightEye-${id}-${ex}`,
            { diameter: 0.13, segments: 10 },
            scene
          );
          visorEye.scaling.set(1.2, 0.85, 0.6);
          visorEye.position.set(ex, 2.13, 0.42);
          eyeParts.push(visorEye);
        }

        // Gilded Royal Crown Circlet + 4 Crown Peaks atop the Helmet
        const crownBand = MeshBuilder.CreateTorus(
          `knightCrownBand-${id}`,
          { diameter: 0.78, thickness: 0.08, tessellation: 20 },
          scene
        );
        crownBand.position.set(0, 2.38, 0);
        goldParts.push(crownBand);

        for (let c = 0; c < 4; c++) {
          const ca = (c / 4) * Math.PI * 2;
          const peak = MeshBuilder.CreatePolyhedron(
            `knightCrownPeak-${id}-${c}`,
            { type: 1, size: 0.11 },
            scene
          );
          peak.scaling.set(0.8, 1.45, 0.8);
          peak.position.set(Math.sin(ca) * 0.37, 2.48, Math.cos(ca) * 0.37);
          goldParts.push(peak);
        }

        // Ornate Golden Plume Holder + Sweeping Two-Tone Plume Crest
        const plumeSocket = MeshBuilder.CreateCylinder(
          `knightPlumeSocket-${id}`,
          { diameterTop: 0.22, diameterBottom: 0.16, height: 0.22, tessellation: 10 },
          scene
        );
        plumeSocket.position.set(0, 2.66, -0.04);
        goldParts.push(plumeSocket);

        const mainPlume = MeshBuilder.CreateCylinder(
          `knightPlumeMain-${id}`,
          { diameterTop: 0.12, diameterBottom: 0.46, height: 0.82, tessellation: 12 },
          scene
        );
        mainPlume.position.set(0, 2.86, -0.24);
        mainPlume.rotation.x = -0.62;
        plumeParts.push(mainPlume);

        const plumeTail = MeshBuilder.CreateSphere(
          `knightPlumeTail-${id}`,
          { diameter: 0.38, segments: 12 },
          scene
        );
        plumeTail.scaling.set(0.65, 1.35, 1.1);
        plumeTail.position.set(0, 2.68, -0.56);
        plumeTail.rotation.x = 0.5;
        goldParts.push(plumeTail);

        // 6. Heraldic Heater Shield (Silver Frame, Primary Enamel Face, Gold Sun Boss & Corner Studs)
        const shieldFrame = MeshBuilder.CreateBox(
          `knightShieldFrame-${id}`,
          { width: 0.16, height: 1.26, depth: 0.88 },
          scene
        );
        shieldFrame.position.set(-0.84, 1.16, 0.28);
        shieldFrame.rotation.y = -0.25;
        silverParts.push(shieldFrame);

        const shieldFace = MeshBuilder.CreateBox(
          `knightShieldFace-${id}`,
          { width: 0.19, height: 1.06, depth: 0.7 },
          scene
        );
        shieldFace.position.set(-0.86, 1.16, 0.28);
        shieldFace.rotation.y = -0.25;
        primaryParts.push(shieldFace);

        const shieldBoss = MeshBuilder.CreatePolyhedron(
          `knightShieldBoss-${id}`,
          { type: 1, size: 0.22 },
          scene
        );
        shieldBoss.scaling.set(0.55, 1.25, 1.05);
        shieldBoss.position.set(-0.95, 1.18, 0.31);
        shieldBoss.rotation.y = -0.25;
        goldParts.push(shieldBoss);

        // Merge Knight body groups by material to keep draw calls minimal!
        mergeGroupWithMaterial(`knightPrimaryMerged-${id}`, primaryParts, knightPrimaryMat, body);
        mergeGroupWithMaterial(`knightSilverMerged-${id}`, silverParts, knightSilverMat, body);
        mergeGroupWithMaterial(`knightGoldMerged-${id}`, goldParts, knightGoldMat, body);
        mergeGroupWithMaterial(`knightChainmailMerged-${id}`, chainmailParts, darkObsidianMat, body);
        mergeGroupWithMaterial(`knightPlumeMerged-${id}`, plumeParts, knightPlumeMat, body);
        mergeGroupWithMaterial(`knightEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);

        // 7. Ornate Royal Halberd on `weapon` Pivot
        const halberdSilverParts: Mesh[] = [];
        const halberdGoldParts: Mesh[] = [];

        const shaft = MeshBuilder.CreateCylinder(
          `halberdShaft-${id}`,
          { diameter: 0.13, height: 2.45, tessellation: 12 },
          scene
        );
        shaft.rotation.x = Math.PI / 2;
        shaft.position.set(0.8, 1.1, 0.68);
        shaft.material = darkObsidianMat;
        shaft.parent = weapon;

        for (const gz of [0.25, 1.15, 1.68]) {
          const ring = MeshBuilder.CreateTorus(
            `halberdRing-${id}-${gz}`,
            { diameter: 0.22, thickness: 0.06, tessellation: 14 },
            scene
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0.8, 1.1, gz);
          halberdGoldParts.push(ring);
        }

        const axeHead = MeshBuilder.CreateCylinder(
          `halberdAxe-${id}`,
          { diameterTop: 0.88, diameterBottom: 0.22, height: 0.1, tessellation: 16 },
          scene
        );
        axeHead.rotation.z = Math.PI / 2;
        axeHead.scaling.set(1.15, 1.0, 0.72);
        axeHead.position.set(0.8, 1.32, 1.48);
        halberdSilverParts.push(axeHead);

        const rearSpike = MeshBuilder.CreateCylinder(
          `halberdRearSpike-${id}`,
          { diameterTop: 0.02, diameterBottom: 0.16, height: 0.36, tessellation: 10 },
          scene
        );
        rearSpike.position.set(0.8, 0.88, 1.48);
        rearSpike.rotation.x = Math.PI;
        halberdSilverParts.push(rearSpike);

        const spearTip = MeshBuilder.CreateCylinder(
          `halberdTip-${id}`,
          { diameterTop: 0.02, diameterBottom: 0.25, height: 0.62, tessellation: 12 },
          scene
        );
        spearTip.rotation.x = Math.PI / 2;
        spearTip.position.set(0.8, 1.1, 2.04);
        halberdSilverParts.push(spearTip);

        mergeGroupWithMaterial(`knightHalberdSilver-${id}`, halberdSilverParts, bladeMat, weapon);
        mergeGroupWithMaterial(`knightHalberdGold-${id}`, halberdGoldParts, knightGoldMat, weapon);

        // Ground Lunge Path Telegraph Corridor for Sentinel Knights (with +Z aligned arrowhead!)
        buildCorridorRig(1.48, 0.95);
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
        // =====================================================
        // MARIO RPG-INSPIRED HIGH-DEFINITION LOW-POLY BOSS MALAKOR
        // Preserves Malakor's iconic horned Eclipse Warden silhouette while
        // adding multi-tone enameled royal plate, polished silver trim,
        // gilded imperial gold details, clawed sabatons, fluted greaves,
        // segmented tassets, sculpted rib plackart, recessed eclipse core,
        // gold-banded curved horns, orbiting halo shards & Dread Greataxe!
        // =====================================================
        const bossArmorMat = registerMat(
          `bossMat-${id}`,
          new Color3(0.76, 0.11, 0.19),
          new Color3(0.24, 0.03, 0.06),
          new Color3(0.92, 0.72, 0.72),
          1.0,
          76
        );
        const bossSilverMat = registerMat(
          `bossSilverMat-${id}`,
          new Color3(0.84, 0.88, 0.96),
          new Color3(0.08, 0.09, 0.14),
          new Color3(1.0, 1.0, 1.0),
          1.0,
          96
        );
        const bossGoldMat = registerMat(
          `bossGoldMat-${id}`,
          new Color3(1.0, 0.82, 0.22),
          new Color3(0.32, 0.2, 0.03),
          new Color3(1.0, 0.95, 0.78),
          1.0,
          84
        );
        const bossCapeMat = registerMat(
          `bossCapeMat-${id}`,
          new Color3(0.34, 0.07, 0.44),
          new Color3(0.11, 0.02, 0.16),
          new Color3(0.45, 0.28, 0.55),
          1.0,
          42
        );

        const bossArmorParts: Mesh[] = [];
        const bossSilverParts: Mesh[] = [];
        const bossGoldParts: Mesh[] = [];
        const bossObsidianParts: Mesh[] = [];
        const bossCapeParts: Mesh[] = [];
        const bossHornParts: Mesh[] = [];
        const bossCrimsonParts: Mesh[] = [];

        // 1. Articulated Clawed Sabatons, Fluted Greaves, Diamond Knee Poleyns & Thigh Cuisses
        for (const lx of [-0.64, 0.64]) {
          const sabatonBase = MeshBuilder.CreateBox(
            `bossSabaton-${id}-${lx}`,
            { width: 0.76, height: 0.34, depth: 1.08 },
            scene
          );
          sabatonBase.position.set(lx, 0.17, 0.14);
          bossSilverParts.push(sabatonBase);

          for (const clawOff of [-0.2, 0, 0.2]) {
            const claw = MeshBuilder.CreateCylinder(
              `bossClaw-${id}-${lx}-${clawOff}`,
              { diameterTop: 0.02, diameterBottom: 0.18, height: 0.32, tessellation: 8 },
              scene
            );
            claw.rotation.x = Math.PI / 2;
            claw.position.set(lx + clawOff, 0.14, 0.74);
            bossGoldParts.push(claw);
          }

          const greave = MeshBuilder.CreateCylinder(
            `bossGreave-${id}-${lx}`,
            { diameterTop: 0.72, diameterBottom: 0.82, height: 1.05, tessellation: 16 },
            scene
          );
          greave.position.set(lx, 0.68, 0);
          bossObsidianParts.push(greave);

          const shinPlate = MeshBuilder.CreateCylinder(
            `bossShinPlate-${id}-${lx}`,
            { diameterTop: 0.58, diameterBottom: 0.48, height: 0.88, tessellation: 12 },
            scene
          );
          shinPlate.scaling.set(0.95, 1.0, 0.65);
          shinPlate.position.set(lx, 0.68, 0.22);
          bossArmorParts.push(shinPlate);

          const kneeGuard = MeshBuilder.CreatePolyhedron(
            `bossKnee-${id}-${lx}`,
            { type: 1, size: 0.32 },
            scene
          );
          kneeGuard.scaling.set(1.18, 1.25, 0.78);
          kneeGuard.position.set(lx, 1.12, 0.42);
          bossSilverParts.push(kneeGuard);

          const kneeSpike = MeshBuilder.CreateCylinder(
            `bossKneeSpike-${id}-${lx}`,
            { diameterTop: 0.02, diameterBottom: 0.18, height: 0.32, tessellation: 10 },
            scene
          );
          kneeSpike.rotation.x = Math.PI / 2 - 0.22;
          kneeSpike.position.set(lx, 1.16, 0.62);
          bossGoldParts.push(kneeSpike);
        }

        // 2. Armored Pelvis, Segmented Tasset Plates & Imperial Gilded War-Belt
        const pelvis = MeshBuilder.CreateCylinder(
          `bossPelvis-${id}`,
          { diameterTop: 1.72, diameterBottom: 2.02, height: 0.78, tessellation: 16 },
          scene
        );
        pelvis.position.set(0, 1.28, 0);
        bossObsidianParts.push(pelvis);

        for (let tIdx = -2; tIdx <= 2; tIdx++) {
          const angle = tIdx * 0.45;
          const tasset = MeshBuilder.CreateBox(
            `bossTasset-${id}-${tIdx}`,
            { width: 0.52, height: 0.56, depth: 0.16 },
            scene
          );
          tasset.position.set(
            Math.sin(angle) * 0.92,
            1.18,
            Math.cos(angle) * 0.78
          );
          tasset.rotation.y = angle;
          tasset.rotation.x = -0.18;
          if (Math.abs(tIdx) === 1) {
            bossSilverParts.push(tasset);
          } else {
            bossArmorParts.push(tasset);
          }
        }

        const warBelt = MeshBuilder.CreateCylinder(
          `bossWarBelt-${id}`,
          { diameterTop: 1.88, diameterBottom: 1.88, height: 0.24, tessellation: 18 },
          scene
        );
        warBelt.scaling.set(1.08, 1.0, 0.85);
        warBelt.position.set(0, 1.56, 0);
        bossGoldParts.push(warBelt);

        const beltBuckle = MeshBuilder.CreatePolyhedron(
          `bossBeltBuckle-${id}`,
          { type: 1, size: 0.34 },
          scene
        );
        beltBuckle.scaling.set(1.2, 0.95, 0.55);
        beltBuckle.position.set(0, 1.56, 0.84);
        bossSilverParts.push(beltBuckle);

        const beltGem = MeshBuilder.CreateSphere(
          `bossBeltGem-${id}`,
          { diameter: 0.26, segments: 12 },
          scene
        );
        beltGem.position.set(0, 1.56, 0.94);
        bossCrimsonParts.push(beltGem);

        // 3. Sculpted Barrel Torso, Silver Rib Plackart, Gilded Filigree & Glowing Eclipse Chest Core
        const torso = MeshBuilder.CreateCylinder(
          `bossTorso-${id}`,
          { diameterTop: 2.62, diameterBottom: 1.62, height: 1.68, tessellation: 20 },
          scene
        );
        torso.scaling.set(1.14, 1.0, 0.84);
        torso.position.set(0, 2.26, 0);
        bossArmorParts.push(torso);

        const plackart = MeshBuilder.CreateCylinder(
          `bossPlackart-${id}`,
          { diameterTop: 2.24, diameterBottom: 1.52, height: 0.98, tessellation: 16 },
          scene
        );
        plackart.scaling.set(1.08, 1.0, 0.88);
        plackart.position.set(0, 2.02, 0.06);
        bossSilverParts.push(plackart);

        for (const ribY of [1.88, 2.15, 2.42]) {
          const ribBand = MeshBuilder.CreateTorus(
            `bossRib-${id}-${ribY}`,
            { diameter: 1.92 + (ribY - 1.88) * 0.55, thickness: 0.09, tessellation: 20 },
            scene
          );
          ribBand.scaling.set(1.1, 1.0, 0.82);
          ribBand.position.set(0, ribY, 0.05);
          bossGoldParts.push(ribBand);
        }

        // Royal Velvet Mantle Cape with Gilded Trim & High Collar
        const cape = MeshBuilder.CreateBox(
          `bossCape-${id}`,
          { width: 2.48, height: 2.65, depth: 0.16 },
          scene
        );
        cape.position.set(0, 1.78, -0.86);
        cape.rotation.x = 0.19;
        bossCapeParts.push(cape);

        const capeTrimBottom = MeshBuilder.CreateBox(
          `bossCapeTrim-${id}`,
          { width: 2.54, height: 0.22, depth: 0.2 },
          scene
        );
        capeTrimBottom.position.set(0, 0.56, -1.09);
        capeTrimBottom.rotation.x = 0.19;
        bossGoldParts.push(capeTrimBottom);

        const highCollar = MeshBuilder.CreateCylinder(
          `bossCollar-${id}`,
          { diameterTop: 1.68, diameterBottom: 1.42, height: 0.46, tessellation: 16 },
          scene
        );
        highCollar.position.set(0, 3.08, -0.18);
        highCollar.rotation.x = -0.25;
        bossGoldParts.push(highCollar);

        // 4. Multi-Tiered Floating Pauldrons with Silver Rims, Gold Trim & Ivory Spikes
        for (const sx of [-1, 1]) {
          const pauldron = MeshBuilder.CreateSphere(
            `bossPauldron-${id}-${sx}`,
            { diameter: 1.44, segments: 18 },
            scene
          );
          pauldron.scaling.set(1.2, 0.88, 1.08);
          pauldron.position.set(sx * 1.52, 2.88, 0);
          bossArmorParts.push(pauldron);

          const pauldronUpper = MeshBuilder.CreateSphere(
            `bossPauldronUpper-${id}-${sx}`,
            { diameter: 1.12, segments: 16 },
            scene
          );
          pauldronUpper.scaling.set(1.15, 0.78, 1.02);
          pauldronUpper.position.set(sx * 1.38, 3.12, 0);
          bossSilverParts.push(pauldronUpper);

          const pauldronRim = MeshBuilder.CreateTorus(
            `bossPauldronRim-${id}-${sx}`,
            { diameter: 1.38, thickness: 0.14, tessellation: 20 },
            scene
          );
          pauldronRim.rotation.z = -sx * 0.32;
          pauldronRim.position.set(sx * 1.52, 2.74, 0);
          bossGoldParts.push(pauldronRim);

          const pSpike = MeshBuilder.CreateCylinder(
            `bossPSpike-${id}-${sx}`,
            { diameterTop: 0.04, diameterBottom: 0.36, height: 0.98, tessellation: 12 },
            scene
          );
          pSpike.position.set(sx * 1.95, 3.36, 0);
          pSpike.rotation.z = -sx * 0.68;
          bossHornParts.push(pSpike);

          const pSubSpike = MeshBuilder.CreateCylinder(
            `bossPSubSpike-${id}-${sx}`,
            { diameterTop: 0.03, diameterBottom: 0.24, height: 0.58, tessellation: 10 },
            scene
          );
          pSubSpike.position.set(sx * 1.56, 3.48, 0);
          pSubSpike.rotation.z = -sx * 0.36;
          bossGoldParts.push(pSubSpike);

          const arm = MeshBuilder.CreateCylinder(
            `bossArm-${id}-${sx}`,
            { diameterTop: 0.58, diameterBottom: 0.48, height: 1.15, tessellation: 14 },
            scene
          );
          arm.position.set(sx * 1.52, 2.12, 0.24);
          arm.rotation.z = -sx * 0.18;
          arm.rotation.x = -0.35;
          bossObsidianParts.push(arm);

          const vambrace = MeshBuilder.CreateCylinder(
            `bossVambrace-${id}-${sx}`,
            { diameterTop: 0.62, diameterBottom: 0.68, height: 0.68, tessellation: 14 },
            scene
          );
          vambrace.position.set(sx * 1.58, 1.72, 0.46);
          vambrace.rotation.x = Math.PI / 3.2;
          bossSilverParts.push(vambrace);

          const gauntletCuff = MeshBuilder.CreateTorus(
            `bossCuff-${id}-${sx}`,
            { diameter: 0.66, thickness: 0.1, tessellation: 16 },
            scene
          );
          gauntletCuff.position.set(sx * 1.58, 1.88, 0.36);
          gauntletCuff.rotation.x = Math.PI / 3.2;
          bossGoldParts.push(gauntletCuff);
        }

        // 5. Crowned Obsidian Great-Helm, Sculpted Silver Faceplate, Gold Crown Peaks & Twin Curved Horns
        const bossHelm = MeshBuilder.CreateSphere(
          `bossHelm-${id}`,
          { diameter: 1.24, segments: 18 },
          scene
        );
        bossHelm.scaling.set(0.98, 1.14, 1.04);
        bossHelm.position.set(0, 3.42, 0.12);
        bossObsidianParts.push(bossHelm);

        const faceplate = MeshBuilder.CreateCylinder(
          `bossFaceplate-${id}`,
          { diameterTop: 0.96, diameterBottom: 0.72, height: 0.68, tessellation: 12 },
          scene
        );
        faceplate.position.set(0, 3.24, 0.26);
        bossArmorParts.push(faceplate);

        const silverBevor = MeshBuilder.CreateCylinder(
          `bossSilverBevor-${id}`,
          { diameterTop: 0.92, diameterBottom: 0.66, height: 0.38, tessellation: 12 },
          scene
        );
        silverBevor.position.set(0, 3.08, 0.31);
        bossSilverParts.push(silverBevor);

        const browGuard = MeshBuilder.CreateBox(
          `bossBrowGuard-${id}`,
          { width: 0.92, height: 0.14, depth: 0.32 },
          scene
        );
        browGuard.position.set(0, 3.54, 0.5);
        bossGoldParts.push(browGuard);

        const helmCrownRing = MeshBuilder.CreateTorus(
          `bossHelmCrown-${id}`,
          { diameter: 1.14, thickness: 0.11, tessellation: 20 },
          scene
        );
        helmCrownRing.position.set(0, 3.74, 0.12);
        bossGoldParts.push(helmCrownRing);

        for (let c = 0; c < 5; c++) {
          const ca = (c / 5) * Math.PI * 2;
          const crownSpike = MeshBuilder.CreatePolyhedron(
            `bossCrownSpike-${id}-${c}`,
            { type: 1, size: 0.18 },
            scene
          );
          crownSpike.scaling.set(0.85, 1.6, 0.85);
          crownSpike.position.set(
            Math.sin(ca) * 0.54,
            3.92,
            0.12 + Math.cos(ca) * 0.54
          );
          bossGoldParts.push(crownSpike);
        }

        for (const hx of [-1, 1]) {
          const hornPath = [
            new Vector3(hx * 0.44, 3.58, 0.08),
            new Vector3(hx * 0.98, 3.76, 0.18),
            new Vector3(hx * 1.36, 4.12, 0.44),
            new Vector3(hx * 1.2, 4.58, 0.72),
          ];
          const horn = MeshBuilder.CreateTube(
            `bossHorn-${id}-${hx}`,
            {
              path: hornPath,
              radiusFunction: (idx) => 0.26 * (1 - idx * 0.27),
              tessellation: 14,
              cap: Mesh.CAP_ALL,
            },
            scene
          );
          bossHornParts.push(horn);

          // Golden Horn Collar Ring at base of each horn
          const hornCollar = MeshBuilder.CreateTorus(
            `bossHornCollar-${id}-${hx}`,
            { diameter: 0.54, thickness: 0.1, tessellation: 14 },
            scene
          );
          hornCollar.position.set(hx * 0.56, 3.62, 0.12);
          hornCollar.rotation.z = hx * 1.15;
          bossGoldParts.push(hornCollar);
        }

        // 6. Recessed Eclipse Core Frame, Glowing Chest Crystal, Fierce Slanted Eyes & Spiked Eclipse Halo
        const coreBezel = MeshBuilder.CreateTorus(
          `bossCoreBezel-${id}`,
          { diameter: 0.86, thickness: 0.14, tessellation: 18 },
          scene
        );
        coreBezel.rotation.x = Math.PI / 2;
        coreBezel.position.set(0, 2.38, 0.82);
        bossGoldParts.push(coreBezel);

        const chestCore = MeshBuilder.CreatePolyhedron(
          `bossChestCore-${id}`,
          { type: 1, size: 0.39 },
          scene
        );
        chestCore.position.set(0, 2.38, 0.88);
        bossCrimsonParts.push(chestCore);

        for (const ex of [-0.23, 0.23]) {
          const eye = MeshBuilder.CreateBox(
            `bossEye-${id}-${ex}`,
            { width: 0.26, height: 0.11, depth: 0.16 },
            scene
          );
          eye.position.set(ex, 3.43, 0.64);
          eye.rotation.z = ex > 0 ? -0.26 : 0.26;
          bossCrimsonParts.push(eye);
        }

        const eclipseHalo = MeshBuilder.CreateTorus(
          `bossEclipseHalo-${id}`,
          { diameter: 2.1, thickness: 0.17, tessellation: 28 },
          scene
        );
        eclipseHalo.rotation.x = Math.PI / 2;
        eclipseHalo.position.set(0, 3.68, -0.48);
        bossCrimsonParts.push(eclipseHalo);

        for (let hIdx = 0; hIdx < 6; hIdx++) {
          const ha = (hIdx / 6) * Math.PI * 2;
          const haloRay = MeshBuilder.CreatePolyhedron(
            `bossHaloRay-${id}-${hIdx}`,
            { type: 1, size: 0.2 },
            scene
          );
          haloRay.position.set(
            Math.cos(ha) * 1.18,
            3.68 + Math.sin(ha) * 1.18,
            -0.48
          );
          bossGoldParts.push(haloRay);
        }

        // Merge Malakor body groups by material to keep draw calls ultra-fast!
        mergeGroupWithMaterial(`bossArmorMerged-${id}`, bossArmorParts, bossArmorMat, body);
        mergeGroupWithMaterial(`bossSilverMerged-${id}`, bossSilverParts, bossSilverMat, body);
        mergeGroupWithMaterial(`bossGoldMerged-${id}`, bossGoldParts, bossGoldMat, body);
        mergeGroupWithMaterial(`bossObsidianMerged-${id}`, bossObsidianParts, darkObsidianMat, body);
        mergeGroupWithMaterial(`bossCapeMerged-${id}`, bossCapeParts, bossCapeMat, body);
        mergeGroupWithMaterial(`bossHornsMerged-${id}`, bossHornParts, boneHornMat, body);
        mergeGroupWithMaterial(`bossCrimsonMerged-${id}`, bossCrimsonParts, glowingCrimsonMat, body);

        // 7. Ornate Dread Cleaver Greataxe (Gilded Shaft, Polished Silver Twin Crescent Blades & Crimson Core)
        const axeGoldParts: Mesh[] = [];
        const axeSilverParts: Mesh[] = [];
        const axeCrimsonParts: Mesh[] = [];

        const axeShaft = MeshBuilder.CreateCylinder(
          `bossAxeShaft-${id}`,
          { diameter: 0.22, height: 3.55, tessellation: 14 },
          scene
        );
        axeShaft.rotation.x = Math.PI / 2;
        axeShaft.position.set(1.55, 1.95, 0.88);
        axeShaft.material = darkObsidianMat;
        axeShaft.parent = weapon;

        for (const gz of [-0.55, 0.35, 1.35, 2.25]) {
          const gripRing = MeshBuilder.CreateTorus(
            `bossAxeRing-${id}-${gz}`,
            { diameter: 0.34, thickness: 0.08, tessellation: 14 },
            scene
          );
          gripRing.rotation.x = Math.PI / 2;
          gripRing.position.set(1.55, 1.95, gz);
          axeGoldParts.push(gripRing);
        }

        const axeCollar = MeshBuilder.CreateBox(
          `bossAxeCollar-${id}`,
          { width: 0.56, height: 0.42, depth: 0.68 },
          scene
        );
        axeCollar.position.set(1.55, 1.95, 1.88);
        axeGoldParts.push(axeCollar);

        const axeCoreGem = MeshBuilder.CreatePolyhedron(
          `bossAxeGem-${id}`,
          { type: 1, size: 0.24 },
          scene
        );
        axeCoreGem.position.set(1.55, 2.18, 1.88);
        axeCrimsonParts.push(axeCoreGem);

        for (const bx of [-0.62, 0.62]) {
          const innerBlade = MeshBuilder.CreateCylinder(
            `bossAxeInner-${id}-${bx}`,
            { diameterTop: 1.24, diameterBottom: 0.42, height: 0.16, tessellation: 16 },
            scene
          );
          innerBlade.scaling.set(1.12, 1.0, 0.64);
          innerBlade.position.set(1.55 + bx * 0.82, 1.95, 1.88);
          axeGoldParts.push(innerBlade);

          const crescentBlade = MeshBuilder.CreateCylinder(
            `bossAxeBlade-${id}-${bx}`,
            { diameterTop: 1.56, diameterBottom: 0.48, height: 0.12, tessellation: 18 },
            scene
          );
          crescentBlade.scaling.set(1.22, 1.0, 0.68);
          crescentBlade.position.set(1.55 + bx, 1.95, 1.88);
          axeSilverParts.push(crescentBlade);
        }

        const axeSpike = MeshBuilder.CreateCylinder(
          `bossAxeSpike-${id}`,
          { diameterTop: 0.03, diameterBottom: 0.36, height: 0.82, tessellation: 12 },
          scene
        );
        axeSpike.rotation.x = Math.PI / 2;
        axeSpike.position.set(1.55, 1.95, 2.82);
        axeSilverParts.push(axeSpike);

        const pommelCrystal = MeshBuilder.CreatePolyhedron(
          `bossAxePommel-${id}`,
          { type: 1, size: 0.24 },
          scene
        );
        pommelCrystal.position.set(1.55, 1.95, -0.95);
        axeGoldParts.push(pommelCrystal);

        mergeGroupWithMaterial(`bossAxeGold-${id}`, axeGoldParts, bossGoldMat, weapon);
        mergeGroupWithMaterial(`bossAxeSilver-${id}`, axeSilverParts, bladeMat, weapon);
        mergeGroupWithMaterial(`bossAxeCrimson-${id}`, axeCrimsonParts, glowingCrimsonMat, weapon);

        // Ground Lunge Path Telegraph Corridor for Boss Malakor (with +Z aligned arrowhead!)
        buildCorridorRig(2.7, 1.35);

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
      }

      // Overhead Spinning Stun Stars for Boss & Charging Monsters when they crash into a wall/obstacle!
      if (kind !== "archer") {
        const starY =
          kind === "boss" ? 4.35 : kind === "knight" ? 2.95 : kind === "goblin" ? 2.18 : 1.95;
        const starOrbitRad = kind === "boss" ? 1.25 : kind === "knight" ? 0.82 : 0.68;
        const starSize = kind === "boss" ? 0.3 : 0.2;

        stunStarsRoot = new TransformNode(`stunStars-${id}`, scene);
        stunStarsRoot.position.set(0, starY, 0);
        stunStarsRoot.parent = root;
        const starParts: Mesh[] = [];
        for (let s = 0; s < 4; s++) {
          const angle = (s / 4) * Math.PI * 2;
          const star = MeshBuilder.CreatePolyhedron(
            `stunStar-${id}-${s}`,
            { type: 1, size: starSize },
            scene
          );
          star.position.set(Math.cos(angle) * starOrbitRad, 0, Math.sin(angle) * starOrbitRad);
          star.isPickable = false;
          starParts.push(star);
        }
        const mergedStars = mergeGroupWithMaterial(
          `stunStarsMerged-${id}`,
          starParts,
          goldKeyMat,
          stunStarsRoot
        );
        if (mergedStars) mergedStars.isPickable = false;
        stunStarsRoot.setEnabled(false);
      }

      const telegraphRing = MeshBuilder.CreateTorus(
        `telegraph-${id}`,
        {
          diameter: kind === "boss" ? 4.6 : kind === "knight" ? 2.5 : 2.1,
          thickness: kind === "boss" ? 0.18 : 0.11,
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

      const barY = kind === "boss" ? 4.85 : kind === "knight" ? 3.2 : 2.25;
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
        chargeCorridorBody,
        chargeCorridorTip,
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
    // 3D MAGIC FIREBALL, BURNING GROUND FIRE ZONE & GOLDEN BEE BUILDERS
    // =========================================================
    const fireballRigs = new Map<string, TransformNode>();
    const fireZoneRigs = new Map<
      string,
      { root: TransformNode; disc: Mesh; ring: Mesh; flames: Mesh[] }
    >();
    const beeRigs = new Map<
      string,
      { root: TransformNode; wingL: Mesh; wingR: Mesh }
    >();

    const fireballCoreMat = makeMat(
      "fireballCoreMat",
      new Color3(1.0, 0.92, 0.28),
      new Color3(1.0, 0.78, 0.18)
    );
    const fireballCoronaMat = makeMat(
      "fireballCoronaMat",
      new Color3(1.0, 0.36, 0.12),
      new Color3(0.95, 0.25, 0.06),
      new Color3(0, 0, 0),
      0.68
    );

    const buildFireballRig = (id: string, isCharged: boolean): TransformNode => {
      const root = new TransformNode(`fireball-${id}`, scene);
      const scale = isCharged ? 1.55 : 1.0;

      const core = MeshBuilder.CreateSphere(
        `fbCore-${id}`,
        { diameter: 0.56 * scale, segments: 12 },
        scene
      );
      core.material = fireballCoreMat;
      core.isPickable = false;
      core.parent = root;

      const corona = MeshBuilder.CreateSphere(
        `fbCorona-${id}`,
        { diameter: 0.88 * scale, segments: 12 },
        scene
      );
      corona.scaling.set(0.95, 0.95, 1.35);
      corona.position.set(0, 0, -0.14 * scale);
      corona.material = fireballCoronaMat;
      corona.isPickable = false;
      corona.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `fbRing-${id}`,
        { diameter: 0.92 * scale, thickness: 0.1 * scale, tessellation: 18 },
        scene
      );
      ring.rotation.x = Math.PI / 2;
      ring.material = goldKeyMat;
      ring.isPickable = false;
      ring.parent = root;

      return root;
    };

    const buildFireZoneRig = (id: string, radius: number) => {
      const root = new TransformNode(`fireZoneRoot-${id}`, scene);

      const disc = MeshBuilder.CreateCylinder(
        `fzDisc-${id}`,
        { diameter: radius * 2, height: 0.06, tessellation: 28 },
        scene
      );
      disc.position.set(0, 0.035, 0);
      disc.material = makeMat(
        `fzDiscMat-${id}`,
        new Color3(1.0, 0.34, 0.08),
        new Color3(0.92, 0.22, 0.04),
        new Color3(0, 0, 0),
        0.58
      );
      disc.isPickable = false;
      disc.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `fzRing-${id}`,
        { diameter: radius * 2, thickness: 0.16, tessellation: 28 },
        scene
      );
      ring.position.set(0, 0.08, 0);
      ring.material = fireballCoreMat;
      ring.isPickable = false;
      ring.parent = root;

      const flames: Mesh[] = [];
      for (let f = 0; f < 7; f++) {
        const tongue = MeshBuilder.CreateCylinder(
          `fzTongue-${id}-${f}`,
          { diameterTop: 0.04, diameterBottom: 0.56, height: 1.05, tessellation: 10 },
          scene
        );
        tongue.material = f % 2 === 0 ? fireballCoreMat : fireballCoronaMat;
        tongue.isPickable = false;
        tongue.parent = root;
        flames.push(tongue);
      }

      return { root, disc, ring, flames };
    };

    const buildBeeRig = (id: string) => {
      const root = new TransformNode(`beeRoot-${id}`, scene);

      const abdomen = MeshBuilder.CreateSphere(
        `beeBody-${id}`,
        { diameter: 0.42, segments: 12 },
        scene
      );
      abdomen.scaling.set(0.88, 0.82, 1.32);
      abdomen.material = goldKeyMat;
      abdomen.isPickable = false;
      abdomen.parent = root;

      const stripe = MeshBuilder.CreateTorus(
        `beeStripe-${id}`,
        { diameter: 0.38, thickness: 0.09, tessellation: 14 },
        scene
      );
      stripe.rotation.x = Math.PI / 2;
      stripe.material = darkObsidianMat;
      stripe.isPickable = false;
      stripe.parent = root;

      const stinger = MeshBuilder.CreateCylinder(
        `beeStinger-${id}`,
        { diameterTop: 0.01, diameterBottom: 0.12, height: 0.22, tessellation: 8 },
        scene
      );
      stinger.rotation.x = -Math.PI / 2;
      stinger.position.set(0, 0, -0.32);
      stinger.material = darkObsidianMat;
      stinger.isPickable = false;
      stinger.parent = root;

      const wingMat = makeMat(
        `beeWingMat-${id}`,
        new Color3(0.88, 0.96, 1.0),
        new Color3(0.45, 0.65, 0.85),
        new Color3(1, 1, 1),
        0.72
      );
      const wingL = MeshBuilder.CreateBox(
        `beeWingL-${id}`,
        { width: 0.36, height: 0.03, depth: 0.22 },
        scene
      );
      wingL.position.set(-0.22, 0.16, 0.04);
      wingL.material = wingMat;
      wingL.isPickable = false;
      wingL.parent = root;

      const wingR = MeshBuilder.CreateBox(
        `beeWingR-${id}`,
        { width: 0.36, height: 0.03, depth: 0.22 },
        scene
      );
      wingR.position.set(0.22, 0.16, 0.04);
      wingR.material = wingMat;
      wingR.isPickable = false;
      wingR.parent = root;

      return { root, wingL, wingR };
    };

    // =========================================================
    // 3D BUSH CHOP LEAF & SHOVEL DIRT CLOD PARTICLE BURST BUILDER
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

    const buildBushBurstRig = (
      id: string,
      seed: number,
      isDirt = false
    ): BushBurstVisualRig => {
      const root = new TransformNode(`bushBurstRoot-${id}`, scene);
      const particles: BushLeafParticle[] = [];
      const count = 22;

      const pseudoRand = (n: number): number => {
        const x = Math.sin(seed * 19.73 + n * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      for (let i = 0; i < count; i++) {
        const isGrassBlade = !isDirt && i % 3 === 0;
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
            { type: isDirt ? 2 : 1, size: isDirt ? 0.18 : 0.22 },
            scene
          );
          const s = 0.8 + pseudoRand(i * 7 + 1) * 0.55;
          baseScale = isDirt
            ? new Vector3(0.95 * s, 0.78 * s, 0.9 * s)
            : new Vector3(1.25 * s, 0.22 * s, 0.72 * s);
        }

        mesh.material = isDirt
          ? i % 3 === 0
            ? dirtPitMat
            : dirtSoilMat
          : i % 3 === 0
          ? leafBrightMat
          : i % 3 === 1
          ? leafEmeraldMat
          : leafDeepMat;
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
    let fireRodTriggeredOnce = false;
    let shovelTriggeredOnce = false;
    let bottleTriggeredOnce = false;
    let leftMouseHeldInPlay = false;
    let rightMouseHeld = false;
    let leftMouseHeldInEditor = false;
    let isDraggingEntityInEditor = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let cursorGroundPos: { x: number; z: number } | null = null;

    const pickGroundPoint = (): { x: number; z: number } | null => {
      const snap = useGameStore.getState();
      const targetGround =
        snap.zone === "overworld"
          ? owGround
          : snap.zone === "frontier"
          ? frGround
          : dgGround;
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

      // C or I toggles Character Equipment & Glass Bottles Screen
      if ((code === "KeyC" || code === "KeyI") && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setCharacterOpen(!store.characterOpen);
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
      if ((code === "KeyR" || code === "Digit3") && !pressedKeys.has(code)) {
        fireRodTriggeredOnce = true;
      }
      if ((code === "KeyG" || code === "Digit4") && !pressedKeys.has(code)) {
        shovelTriggeredOnce = true;
      }
      if ((code === "KeyV" || code === "Digit5") && !pressedKeys.has(code)) {
        bottleTriggeredOnce = true;
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
        leftMouseHeldInPlay = true;
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
        leftMouseHeldInPlay = false;
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
          const rightX = -Math.sin(camera.alpha);
          const rightZ = Math.cos(camera.alpha);
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
        fireRodTriggeredOnce = false;
        shovelTriggeredOnce = false;
        bottleTriggeredOnce = false;
      } else {
        const attackPressed = attackTriggeredOnce;
        const attackHeld =
          leftMouseHeldInPlay ||
          pressedKeys.has("Space") ||
          pressedKeys.has("KeyJ") ||
          pressedKeys.has("KeyZ") ||
          pressedKeys.has("Enter");
        const blockHeld =
          rightMouseHeld ||
          pressedKeys.has("ShiftLeft") ||
          pressedKeys.has("ShiftRight");
        const boomerangPressed = boomerangTriggeredOnce;
        const bowPressed = bowTriggeredOnce;
        const fireRodPressed = fireRodTriggeredOnce;
        const fireRodHeld =
          pressedKeys.has("KeyR") || pressedKeys.has("Digit3");
        const shovelPressed = shovelTriggeredOnce;
        const bottlePressed = bottleTriggeredOnce;

        attackTriggeredOnce = false;
        boomerangTriggeredOnce = false;
        bowTriggeredOnce = false;
        fireRodTriggeredOnce = false;
        shovelTriggeredOnce = false;
        bottleTriggeredOnce = false;

        if (store.phase === "playing") {
          store.tick(dt, {
            moveX,
            moveZ,
            attackPressed,
            attackHeld,
            blockHeld,
            boomerangPressed,
            bowPressed,
            fireRodPressed,
            fireRodHeld,
            shovelPressed,
            bottlePressed,
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
        applyTerrainCellsToGroundMesh(frGround, frBaseColor, snap.terrainCells.frontier ?? {});
      }

      // 1. Zone visibility & lighting atmosphere
      const isOverworld = snap.zone === "overworld";
      const isDungeon = snap.zone === "dungeon";
      const isFrontier = snap.zone === "frontier";
      overworldRoot.setEnabled(isOverworld);
      dungeonRoot.setEnabled(isDungeon);
      frontierRoot.setEnabled(isFrontier);

      if (isOverworld) {
        scene.clearColor.set(0.08, 0.16, 0.11, 1);
        hemiLight.intensity = 0.92;
        dirLight.intensity = 0.76;
        sanctumPointLight.intensity = 0;
      } else if (isFrontier) {
        scene.clearColor.set(0.06, 0.14, 0.12, 1);
        hemiLight.intensity = 0.88;
        dirLight.intensity = 0.74;
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
          } else if (prop.prefab === "wall_torch") {
            const isLit = prop.lit !== false;
            if (pRig.torchFlame) {
              pRig.torchFlame.setEnabled(isLit);
              if (isLit) {
                const flicker = 1 + Math.sin(t * 14 + prop.x) * 0.14;
                pRig.torchFlame.scaling.set(flicker, 1.45 + Math.cos(t * 18) * 0.18, flicker);
              }
            }
          } else if (prop.prefab === "dirt_patch") {
            const isDug = Boolean(prop.dug) && !snap.editorMode;
            if (pRig.dirtMound) pRig.dirtMound.setEnabled(!isDug);
            if (pRig.dirtHole) pRig.dirtHole.setEnabled(isDug);
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

      // 4. Sync Hero 3D Model, Equipped Armor/Gear Colors, Shield Block, Spin Attack & Tools
      if (snap.hero.equippedTunic === "red_mail") {
        tunicMat.diffuseColor.set(0.84, 0.14, 0.18);
        tunicMat.emissiveColor.set(0.18, 0.03, 0.04);
      } else if (snap.hero.equippedTunic === "blue_mail") {
        tunicMat.diffuseColor.set(0.16, 0.44, 0.88);
        tunicMat.emissiveColor.set(0.04, 0.1, 0.24);
      } else {
        tunicMat.diffuseColor.set(0.15, 0.68, 0.32);
        tunicMat.emissiveColor.set(0.03, 0.12, 0.05);
      }

      if (snap.hero.equippedOffhand === "mirror_shield") {
        shieldMat.diffuseColor.set(0.85, 0.9, 0.98);
        shieldMat.emissiveColor.set(0.18, 0.24, 0.35);
      } else {
        shieldMat.diffuseColor.set(0.2, 0.42, 0.8);
        shieldMat.emissiveColor.set(0.05, 0.1, 0.22);
      }

      if (snap.hero.equippedBoots === "swift_boots") {
        bootMat.diffuseColor.set(0.18, 0.65, 0.88);
        bootMat.emissiveColor.set(0.04, 0.14, 0.22);
      } else if (snap.hero.equippedBoots === "titan_greaves") {
        bootMat.diffuseColor.set(0.54, 0.58, 0.66);
        bootMat.emissiveColor.set(0.08, 0.09, 0.12);
      } else {
        bootMat.diffuseColor.set(0.38, 0.24, 0.14);
        bootMat.emissiveColor.set(0, 0, 0);
      }

      const stride = Math.sin(snap.hero.walkCycle);
      const heroGroundY = sampleTerrainHeight(activeCells, snap.hero.x, snap.hero.z);
      const kbLock = snap.hero.knockbackLockTimer ?? 0;
      const launchProgress = kbLock > 0 ? 1 - Math.min(1, kbLock / 0.65) : 0;
      const launchArcY = kbLock > 0 ? Math.sin(launchProgress * Math.PI) * 1.15 : 0;

      const spinTimer = snap.hero.spinAttackTimer ?? 0;
      const isSpinning = spinTimer > 0;
      const spinProgress = isSpinning ? 1 - spinTimer / 0.38 : 0;

      heroRoot.position.set(
        snap.hero.x,
        heroGroundY + (kbLock > 0 ? launchArcY : Math.abs(stride) * 0.11),
        snap.hero.z
      );
      heroRoot.rotation.y = isSpinning
        ? snap.hero.facing + spinProgress * Math.PI * 4
        : snap.hero.facing;
      heroRoot.rotation.x = kbLock > 0 ? -Math.sin(launchProgress * Math.PI) * 0.42 : 0;
      heroLeftBoot.position.z = kbLock > 0 ? 0.16 : stride * 0.22;
      heroRightBoot.position.z = kbLock > 0 ? -0.16 : -stride * 0.22;

      const heroHurtTimer = snap.hero.hurtFlashTimer ?? 0;
      const heroBlinkHide =
        !snap.editorMode &&
        heroHurtTimer > 0 &&
        Math.floor(heroHurtTimer * 18) % 2 === 0;
      heroRoot.setEnabled(!heroBlinkHide);

      if (snap.hero.isBlocking || kbLock > 0) {
        heroShieldPivot.position.set(0, 0.96, 0.56);
        heroShieldPivot.rotation.y = Math.PI / 2;
        heroBlockWard.setEnabled(true);
      } else {
        heroShieldPivot.position.set(-0.56, 0.9, 0.24);
        heroShieldPivot.rotation.y = -0.25;
        heroBlockWard.setEnabled(false);
      }

      const isBowPose = (snap.hero.bowAnimTimer ?? 0) > 0;
      const isThrowPose = (snap.hero.throwAnimTimer ?? 0) > 0;
      const isFireRodPose =
        (snap.hero.fireRodCooldown ?? 0) > 0.12 || (snap.hero.fireRodChargeTimer ?? 0) > 0;
      const isShovelPose = (snap.hero.digAnimTimer ?? 0) > 0;

      heroBowNode.setEnabled(isBowPose);
      heroFireRodNode.setEnabled(isFireRodPose);
      heroShovelNode.setEnabled(isShovelPose);
      if (isShovelPose) {
        const digProg = 1 - (snap.hero.digAnimTimer ?? 0) / 0.34;
        heroShovelNode.rotation.x = 0.35 + Math.sin(digProg * Math.PI) * 0.85;
      }

      const showSword = !isBowPose && !isThrowPose && !isFireRodPose && !isShovelPose;
      swordPivot.setEnabled(showSword);

      // Sync Charged Spin Attack Aura & Whirlwind Ring
      spinSlashRing.setEnabled(isSpinning);
      if (isSpinning) {
        spinSlashRing.rotation.y = t * 22;
        spinSlashRing.scaling.set(1.0 + spinProgress * 0.18, 0.32, 1.0 + spinProgress * 0.18);
      }

      const swordCharge = snap.hero.swordChargeTimer ?? 0;
      const fireCharge = snap.hero.fireRodChargeTimer ?? 0;
      const showChargeAura = swordCharge > 0.12 || fireCharge > 0.12;
      chargeAuraRing.setEnabled(showChargeAura);
      if (showChargeAura) {
        const isReady = swordCharge >= 0.62 || fireCharge >= 0.55;
        const pulseScale = isReady ? 1.15 + Math.sin(t * 20) * 0.16 : 0.65 + Math.min(1, Math.max(swordCharge, fireCharge)) * 0.45;
        chargeAuraRing.scaling.setAll(pulseScale);
        if (fireCharge > 0.12) {
          chargeAuraMat.diffuseColor.set(1.0, 0.45, 0.12);
          chargeAuraMat.emissiveColor.set(1.0, 0.32, 0.05);
        } else {
          chargeAuraMat.diffuseColor.set(0.35, 0.92, 1.0);
          chargeAuraMat.emissiveColor.set(0.25, 0.8, 1.0);
        }
      }

      if (snap.hero.equippedPrimary === "tempered_blade") {
        slashMat.diffuseColor.set(1.0, 0.85, 0.28);
        slashMat.emissiveColor.set(1.0, 0.72, 0.18);
      } else {
        slashMat.diffuseColor.set(0.55, 0.95, 1.0);
        slashMat.emissiveColor.set(0.45, 0.85, 1.0);
      }

      if (isSpinning && showSword) {
        swordPivot.rotation.y = 1.15;
        slashArc.setEnabled(false);
      } else if (snap.hero.isAttacking && showSword) {
        const progress = 1 - snap.hero.attackTimer / 0.24;
        swordPivot.rotation.y = -1.25 + progress * 2.5;
        slashArc.setEnabled(true);
        slashArc.rotation.y = -0.8 + progress * 1.6;
      } else if (swordCharge > 0.12 && showSword) {
        swordPivot.rotation.y = -1.35 + Math.sin(t * 24) * 0.06;
        slashArc.setEnabled(false);
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

      // 6. Sync Sanctum Key, Gate, Northern Frontier Exit Gate & Boss Chest
      keyNode.setEnabled(isOverworld && !snap.flags.keyPickedUp);
      keyBeaconRing.setEnabled(isOverworld && !snap.flags.keyPickedUp);
      if (!snap.flags.keyPickedUp) {
        keyNode.rotation.y = t * 2.2;
        keyNode.position.y = 1.6 + Math.sin(t * 3.2) * 0.2;
      }

      const isGateOpen =
        snap.flags.gateUnlocked &&
        (!snap.flags.bossAwakened || snap.flags.bossDefeated);
      const targetGateY = isGateOpen ? -4.8 : 0;
      lockedGateNode.position.y +=
        (targetGateY - lockedGateNode.position.y) *
        Math.min(1, dt * (isGateOpen ? 6 : 26));

      const targetExitGateY = snap.flags.bossDefeated ? -5.0 : 0;
      bossExitGateNode.position.y +=
        (targetExitGateY - bossExitGateNode.position.y) * Math.min(1, dt * 6);

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
          if (rig.stunStarsRoot) rig.stunStarsRoot.setEnabled(false);
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

        if (enemy.kind === "goblin" || enemy.kind === "knight") {
          const showCorridor = enemy.state === "windup";
          if (
            rig.chargeCorridorRoot &&
            rig.chargeCorridorBody &&
            rig.chargeCorridorTip &&
            rig.chargeCorridorMat
          ) {
            rig.chargeCorridorRoot.setEnabled(showCorridor);
            if (showCorridor) {
              const pathLen = Math.max(
                2.0,
                enemy.chargePathLength || (enemy.kind === "knight" ? 5.2 : 4.5)
              );
              const tipLen = enemy.kind === "knight" ? 0.95 : 0.85;
              const bodyLen = Math.max(0.6, pathLen - tipLen * 0.5);

              rig.chargeCorridorRoot.position.set(enemy.x, enemyGroundY, enemy.z);
              rig.chargeCorridorRoot.rotation.y = enemy.chargeAngle;
              rig.chargeCorridorBody.scaling.z = bodyLen;
              rig.chargeCorridorTip.position.z = bodyLen;

              const lockThreshold = enemy.kind === "knight" ? 0.58 : 0.54;
              const lockedAim = enemy.stateTimer <= lockThreshold;
              const pulse = Math.floor(t * 15) % 2 === 0;
              rig.chargeCorridorMat.emissiveColor.set(
                lockedAim && pulse ? 1.0 : 0.95,
                lockedAim && pulse ? 0.78 : 0.28,
                lockedAim && pulse ? 0.25 : 0.08
              );
              rig.chargeCorridorMat.alpha = lockedAim ? 0.7 : 0.46;
            }
          }
        } else if (enemy.kind === "boss") {
          const showCorridor =
            enemy.state === "charge_aim" || enemy.state === "charge_lock";
          if (
            rig.chargeCorridorRoot &&
            rig.chargeCorridorBody &&
            rig.chargeCorridorTip &&
            rig.chargeCorridorMat
          ) {
            rig.chargeCorridorRoot.setEnabled(showCorridor);
            if (showCorridor) {
              const pathLen = Math.max(2.0, enemy.chargePathLength || 10.0);
              const bodyLen = Math.max(1.0, pathLen - 0.7);
              rig.chargeCorridorRoot.position.set(enemy.x, enemyGroundY, enemy.z);
              rig.chargeCorridorRoot.rotation.y = enemy.chargeAngle;
              rig.chargeCorridorBody.scaling.z = bodyLen;
              rig.chargeCorridorTip.position.z = bodyLen;

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
        }

        // Sync spinning overhead stun stars & dizzy forward tilt for ANY monster stunned by crashing into a wall!
        if (rig.stunStarsRoot) {
          const isStunned = enemy.state === "stunned";
          rig.stunStarsRoot.setEnabled(isStunned);
          if (isStunned) {
            rig.stunStarsRoot.rotation.y = t * 5.8;
            rig.body.rotation.x = 0.24;
          } else {
            rig.body.rotation.x = 0;
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

      // 7b. Sync 3D Arrows (Hero & Goblin Archer — including arrows stuck into walls, enemies & the Hero's Shield!)
      const activeArrowIds = new Set<string>();
      for (const arrow of snap.arrows) {
        let aRig = arrowRigs.get(arrow.id);
        if (!aRig) {
          aRig = buildArrowRig(arrow.id, arrow.fromHero);
          arrowRigs.set(arrow.id, aRig);
        }

        if (arrow.zone !== snap.zone && !arrow.stuckInShield) {
          aRig.setEnabled(false);
          continue;
        }

        if (arrow.stuck && arrow.stuckInShield) {
          activeArrowIds.add(arrow.id);
          aRig.setEnabled(true);
          if (aRig.parent !== heroShieldPivot) {
            aRig.parent = heroShieldPivot;
          }

          const ry = Math.PI / 2 + (arrow.stuckShieldYaw ?? 0);
          const embedDepth = 0.6;
          const sy = arrow.stuckShieldY ?? 0;
          const sz = arrow.stuckShieldZ ?? 0;
          aRig.position.set(
            -0.06 - Math.sin(ry) * embedDepth,
            sy,
            sz - Math.cos(ry) * embedDepth
          );

          const st = arrow.stuckTimer ?? 0;
          const vib = st > 4.22 ? Math.sin(t * 72) * 0.085 * ((st - 4.22) / 0.28) : 0;
          aRig.rotation.set(vib, ry, 0);
          const scaleFade = st < 0.45 ? Math.max(0.01, st / 0.45) : 1.0;
          aRig.scaling.setAll(scaleFade);
          continue;
        }

        if (aRig.parent) {
          aRig.parent = null;
        }

        if (arrow.stuck && arrow.stuckEnemyId) {
          const hostEnemy = snap.enemies.find((e) => e.id === arrow.stuckEnemyId);
          const hostRig = enemyRigs.get(arrow.stuckEnemyId);
          if (!hostEnemy || hostEnemy.zone !== snap.zone || hostEnemy.state === "dead" || !hostRig) {
            aRig.setEnabled(false);
            continue;
          }
          activeArrowIds.add(arrow.id);
          aRig.setEnabled(true);

          const cosF = Math.cos(hostEnemy.facing);
          const sinF = Math.sin(hostEnemy.facing);
          const lx = arrow.stuckLocalX ?? 0;
          const lz = arrow.stuckLocalZ ?? 0;
          const squashXZ = hostEnemy.kind === "slime" ? hostRig.body.scaling.x : 1.0;
          const stretchY = hostEnemy.kind === "slime" ? hostRig.body.scaling.y : 1.0;
          const wx = hostEnemy.x + (lx * cosF + lz * sinF) * squashXZ;
          const wz = hostEnemy.z + (-lx * sinF + lz * cosF) * squashXZ;
          const bodyHitY =
            hostEnemy.kind === "boss"
              ? 1.45
              : hostEnemy.kind === "knight"
              ? 1.12
              : hostEnemy.kind === "slime"
              ? 0.64 * stretchY
              : 0.96;

          aRig.position.set(wx, hostRig.root.position.y + bodyHitY, wz);
          aRig.rotation.y = hostEnemy.facing + (arrow.stuckLocalAngle ?? 0);

          const st = arrow.stuckTimer ?? 0;
          const vib = st > 3.72 ? Math.sin(t * 72) * 0.085 * ((st - 3.72) / 0.28) : 0;
          aRig.rotation.x = vib;
          const scaleFade = st < 0.45 ? Math.max(0.01, st / 0.45) : 1.0;
          aRig.scaling.setAll(scaleFade);
          continue;
        }

        activeArrowIds.add(arrow.id);
        aRig.setEnabled(true);
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
      arrowRigs.forEach((aRig, id) => {
        if (!activeArrowIds.has(id)) {
          aRig.dispose();
          arrowRigs.delete(id);
        }
      });

      // 7c. Sync Magic Fire Rod Fireballs (`snap.fireballs`)
      const activeFireballIds = new Set<string>();
      for (const fb of snap.fireballs) {
        activeFireballIds.add(fb.id);
        let fbRig = fireballRigs.get(fb.id);
        if (!fbRig) {
          fbRig = buildFireballRig(fb.id, fb.isCharged);
          fireballRigs.set(fb.id, fbRig);
        }
        const showFb = fb.zone === snap.zone;
        fbRig.setEnabled(showFb);
        if (showFb) {
          const fbGroundY = sampleTerrainHeight(activeCells, fb.x, fb.z);
          fbRig.position.set(fb.x, fbGroundY + 1.15, fb.z);
          fbRig.rotation.y = fb.angle;
          fbRig.rotation.z = t * 14.0;
          const pulse = 1.0 + Math.sin(t * 22) * 0.14;
          fbRig.scaling.setAll(pulse);
        }
      }
      fireballRigs.forEach((fbRig, id) => {
        if (!activeFireballIds.has(id)) {
          fbRig.dispose();
          fireballRigs.delete(id);
        }
      });

      // 7d. Sync Charged Fireball Burning Ground Patches (`snap.fireZones`)
      const activeFireZoneIds = new Set<string>();
      for (const fz of snap.fireZones) {
        activeFireZoneIds.add(fz.id);
        let fzRig = fireZoneRigs.get(fz.id);
        if (!fzRig) {
          fzRig = buildFireZoneRig(fz.id, fz.radius);
          fireZoneRigs.set(fz.id, fzRig);
        }
        const showFz = fz.zone === snap.zone && fz.timer > 0;
        fzRig.root.setEnabled(showFz);
        if (!showFz) continue;

        const fzGroundY = sampleTerrainHeight(activeCells, fz.x, fz.z);
        const fade = fz.timer < 0.7 ? Math.max(0.05, fz.timer / 0.7) : 1.0;
        fzRig.disc.position.set(fz.x, fzGroundY + 0.05, fz.z);
        fzRig.disc.scaling.set(fade, 1, fade);
        fzRig.ring.position.set(fz.x, fzGroundY + 0.09, fz.z);
        fzRig.ring.scaling.setAll(fade * (1 + Math.sin(t * 14) * 0.06));

        fzRig.flames.forEach((fl, idx) => {
          const ang = idx * 0.92 + t * 3.4;
          const rad = (0.22 + ((idx * 0.21) % 0.58)) * fz.radius * fade;
          const flickH = 0.8 + Math.sin(t * 18 + idx * 1.7) * 0.35;
          fl.position.set(
            fz.x + Math.cos(ang) * rad,
            fzGroundY + 0.38 * flickH,
            fz.z + Math.sin(ang) * rad
          );
          fl.scaling.set(fade, flickH * fade, fade);
        });
      }
      fireZoneRigs.forEach((fzRig, id) => {
        if (!activeFireZoneIds.has(id)) {
          fzRig.root.dispose();
          fireZoneRigs.delete(id);
        }
      });

      // 7e. Sync Friendly Bottled Golden Bees (`snap.friendlyBees`)
      const activeBeeIds = new Set<string>();
      for (const bee of snap.friendlyBees) {
        activeBeeIds.add(bee.id);
        let bRig = beeRigs.get(bee.id);
        if (!bRig) {
          bRig = buildBeeRig(bee.id);
          beeRigs.set(bee.id, bRig);
        }
        const showBee = bee.zone === snap.zone && bee.timer > 0;
        bRig.root.setEnabled(showBee);
        if (showBee) {
          const bGroundY = sampleTerrainHeight(activeCells, bee.x, bee.z);
          bRig.root.position.set(
            bee.x,
            bGroundY + 1.45 + Math.sin(t * 18) * 0.22,
            bee.z
          );
          bRig.root.rotation.y = bee.facing;
          const wingFlap = Math.sin(t * 52) * 0.42;
          bRig.wingL.rotation.z = 0.25 + wingFlap;
          bRig.wingR.rotation.z = -0.25 - wingFlap;
        }
      }
      beeRigs.forEach((bRig, id) => {
        if (!activeBeeIds.has(id)) {
          bRig.root.dispose();
          beeRigs.delete(id);
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

      // 9b. Sync 3D Bush Chop Leaf & Shovel Dirt Clod Particle Bursts
      const activeBurstIds = new Set<string>();
      for (const burst of snap.bushBursts) {
        activeBurstIds.add(burst.id);
        let bRig = bushBurstRigs.get(burst.id);
        if (!bRig) {
          bRig = buildBushBurstRig(burst.id, burst.seed, Boolean(burst.isDirt));
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

      // 10. Sync Rupees & Heart Health Pickups (pickable in Editor Mode, with parabolic pop-up arc when dropped!)
      const activeRupeeIds = new Set<string>();
      for (const rupee of snap.rupees) {
        activeRupeeIds.add(rupee.id);
        const isHeart = rupee.tier === "heart";
        let mesh = rupeeMeshes.get(rupee.id);
        if (mesh && Boolean(mesh.metadata?.isHeart) !== isHeart) {
          mesh.dispose();
          mesh = undefined;
        }
        if (!mesh) {
          mesh = buildPickupMesh(rupee.id, isHeart);
          rupeeMeshes.set(rupee.id, mesh);
        }
        mesh.material =
          rupee.tier === "heart"
            ? heartPickupMat
            : rupee.tier === "red"
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
