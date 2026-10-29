import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { 
  BuildingType, 
  DestructibleObject, 
  PlacedStructure, 
  WeatherType 
} from '../types/game';
import { 
  createContactShadowTexture, 
  createGroundTexture, 
  createStoneTexture, 
  createWoodTexture 
} from './textures';
import { sounds } from '../utils/audio';

/**
 * Heightmap function for natural rolling open-world terrain
 */
export function getTerrainHeight(x: number, z: number): number {
  // Center meadow is flat/gentle
  const distFromCenter = Math.sqrt(x * x + z * z);
  
  // Natural lake crater at (x: 25, z: -20)
  const lakeDist = Math.sqrt((x - 25) * (x - 25) + (z + 20) * (z + 20));
  if (lakeDist < 18) {
    return -1.5 + (lakeDist / 18) * 1.5;
  }

  // Gentle rolling meadows
  let h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.2 +
          Math.sin(x * 0.1 + 1.2) * 0.8 +
          Math.cos(z * 0.08) * 0.6;

  // Natural mountainous boundary cliffs (no indoor walls!)
  if (distFromCenter > 65) {
    const cliffFactor = Math.pow((distFromCenter - 65) / 25, 2);
    h += cliffFactor * 12;
  }

  return Math.max(-1.5, h);
}

// Particle pool for hit juice, splinters, sparks & dust
interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export interface EngineCallbacks {
  onResourceHarvested: (resource: 'wood' | 'stone' | 'crystals' | 'iron', amount: number, worldPos: { x: number; y: number; z: number }) => void;
  onStructureBuilt: (structure: PlacedStructure) => void;
  onPlayerPositionUpdate: (pos: { x: number; y: number; z: number; heading: number }) => void;
}

export class AetheriaEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private callbacks: EngineCallbacks;

  // Clock & loop
  private clock: THREE.Clock = new THREE.Clock();
  private isRunning: boolean = true;
  private isTitleMode: boolean = true;
  private simHitstopTime: number = 0;

  // Camera rig
  private cameraAngleH: number = 0;
  private cameraAngleV: number = 0.35;
  private cameraDistance: number = 8.5;
  private cameraTrauma: number = 0;
  private isDraggingCamera: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Input states
  public keys: { [key: string]: boolean } = {};
  public joystickVector: { x: number; y: number } = { x: 0, y: 0 };

  // World objects
  private playerGroup!: THREE.Group;
  private playerVelocityY: number = 0;
  private isGrounded: boolean = true;
  private playerHeading: number = 0;
  private playerAnimTimer: number = 0;
  private playerCapeMesh!: THREE.Mesh;
  private playerWeaponGroup!: THREE.Group;
  private playerToolMesh!: THREE.Mesh;
  private leftLegMesh!: THREE.Mesh;
  private rightLegMesh!: THREE.Mesh;
  private leftArmMesh!: THREE.Mesh;
  private rightArmMesh!: THREE.Mesh;
  private playerShadowDisc!: THREE.Mesh;

  // Environmental lighting & weather
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private weather: WeatherType = 'clear';
  private dayTime: number = 10.5; // 10:30 AM
  private rainParticlesGroup!: THREE.Points;
  private snowParticlesGroup!: THREE.Points;
  private rainCoords!: Float32Array;
  private snowCoords!: Float32Array;
  private lightningTimer: number = 0;

  // Destructible nodes & building structures
  private destructibles: DestructibleObject[] = [];
  private destructibleMeshes: Map<string, THREE.Group> = new Map();
  private placedStructures: PlacedStructure[] = [];
  private structureMeshes: Map<string, THREE.Group> = new Map();

  // Building preview ghost
  public isBuildModeActive: boolean = false;
  public selectedBuildingType: BuildingType = 'wood_foundation';
  private ghostGroup!: THREE.Group;
  private ghostMaterials: THREE.Material[] = [];
  private targetBuildPos: THREE.Vector3 = new THREE.Vector3();
  private buildRotationY: number = 0;
  public canPlaceCurrent: boolean = true;

  // Particle pool (60 particles for zero GC)
  private particlePool: Particle[] = [];
  private particlePoints!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleColors!: Float32Array;

  // Water mesh
  private waterMesh!: THREE.Mesh;

  // Pre-allocated math helpers to eliminate GC in tick
  private readonly _v1 = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _targetCamPos = new THREE.Vector3();
  private readonly _targetLookAt = new THREE.Vector3();

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.init();
  }

  private init() {
    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc8e8);
    this.scene.fog = new THREE.FogExp2(0x9fc8e8, 0.012);

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400);
    this.camera.position.set(0, 15, 25);

    // 4. Procedural Studio Environment Reflection
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Fallback if RoomEnvironment not ready
    }

    // 5. Lighting rig (Warm key + cool hemisphere fill)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.sunLight.position.set(40, 60, 30);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 160;
    const d = 45;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x7fb8f5, 0x3d4f35, 1.2);
    this.scene.add(this.hemiLight);

    // 6. Build World Geometry
    this.buildTerrain();
    this.buildWater();
    this.buildPlayer();
    this.buildGhostMesh();
    this.seedDestructibleEntities();
    this.seedCitadelRuins();
    this.setupWeatherSystems();
    this.setupParticlePool();

    // 7. Event listeners
    this.setupEventListeners();

    // 8. Start Game Loop
    this.startLoop();
  }

  // -------------------------------------------------------------
  // Terrain & World Generation
  // -------------------------------------------------------------
  private buildTerrain() {
    const segments = 120;
    const size = 200;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    const groundTex = createGroundTexture(this.renderer);
    const mat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.85,
      metalness: 0.05,
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(terrainMesh);

    // Add perimeter cliff rocks for natural outdoor boundaries
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const dist = 75 + Math.sin(i * 1.5) * 8;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = getTerrainHeight(cx, cz);
      const cliffRock = this.createRockMesh(4.5 + Math.random() * 3.5, 0x5a5f66);
      cliffRock.position.set(cx, cy, cz);
      cliffRock.rotation.y = Math.random() * Math.PI;
      this.scene.add(cliffRock);
    }
  }

  private buildWater() {
    const waterGeo = new THREE.CircleGeometry(18, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1f6d8a,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(25, -0.65, -20);
    this.scene.add(this.waterMesh);
  }

  // -------------------------------------------------------------
  // Composite 3D Player Character (3-12 parts)
  // -------------------------------------------------------------
  private buildPlayer() {
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.set(0, getTerrainHeight(0, 0), 0);

    // 1. Torso & Armor (Composite)
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x2e3846,
      roughness: 0.4,
      metalness: 0.6,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
    torsoMesh.position.y = 1.35;
    torsoMesh.castShadow = !this.isSoftwareGl;
    this.playerGroup.add(torsoMesh);

    // Gold/Steel Breastplate Trim
    const trimGeo = new THREE.BoxGeometry(0.72, 0.35, 0.47);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Burnished gold
      roughness: 0.25,
      metalness: 0.85,
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.y = 1.45;
    this.playerGroup.add(trimMesh);

    // 2. Head & Knight Visor
    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const helmMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.3,
      metalness: 0.7,
    });
    const headMesh = new THREE.Mesh(headGeo, helmMat);
    headMesh.position.y = 2.05;
    headMesh.castShadow = !this.isSoftwareGl;
    this.playerGroup.add(headMesh);

    // Glowing Cyan Visor
    const visorGeo = new THREE.BoxGeometry(0.38, 0.1, 0.15);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4e6,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 2.05, 0.22);
    this.playerGroup.add(visorMesh);

    // 3. Pauldrons (Shoulder guards)
    const pauldronGeo = new THREE.BoxGeometry(0.3, 0.22, 0.4);
    const pauldronL = new THREE.Mesh(pauldronGeo, trimMat);
    pauldronL.position.set(-0.46, 1.7, 0);
    this.playerGroup.add(pauldronL);

    const pauldronR = new THREE.Mesh(pauldronGeo, trimMat);
    pauldronR.position.set(0.46, 1.7, 0);
    this.playerGroup.add(pauldronR);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    armGeo.translate(0, -0.28, 0);
    this.leftArmMesh = new THREE.Mesh(armGeo, armorMat);
    this.leftArmMesh.position.set(-0.46, 1.6, 0);
    this.playerGroup.add(this.leftArmMesh);

    this.rightArmMesh = new THREE.Mesh(armGeo, armorMat);
    this.rightArmMesh.position.set(0.46, 1.6, 0);
    this.playerGroup.add(this.rightArmMesh);

    // 5. Weapon / Multi-Tool (Runed Aether Pickaxe & Claymore)
    this.playerWeaponGroup = new THREE.Group();
    this.playerWeaponGroup.position.set(0.46, 1.0, 0.1);

    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 });
    const handleMesh = new THREE.Mesh(handleGeo, woodMat);
    handleMesh.rotation.x = Math.PI / 2;
    this.playerWeaponGroup.add(handleMesh);

    const bladeGeo = new THREE.BoxGeometry(0.55, 0.16, 0.08);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0099cc,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.playerToolMesh = new THREE.Mesh(bladeGeo, crystalMat);
    this.playerToolMesh.position.set(0, 0, 0.5);
    this.playerWeaponGroup.add(this.playerToolMesh);

    this.playerGroup.add(this.playerWeaponGroup);

    // 6. Legs
    const legGeo = new THREE.BoxGeometry(0.26, 0.75, 0.28);
    legGeo.translate(0, -0.375, 0);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    
    this.leftLegMesh = new THREE.Mesh(legGeo, bootMat);
    this.leftLegMesh.position.set(-0.2, 0.8, 0);
    this.playerGroup.add(this.leftLegMesh);

    this.rightLegMesh = new THREE.Mesh(legGeo, bootMat);
    this.rightLegMesh.position.set(0.2, 0.8, 0);
    this.playerGroup.add(this.rightLegMesh);

    // 7. Flowing Cape (Back)
    const capeGeo = new THREE.PlaneGeometry(0.65, 1.1, 4, 4);
    capeGeo.translate(0, -0.55, 0);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x8b1e22, // Faction crimson
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    this.playerCapeMesh = new THREE.Mesh(capeGeo, capeMat);
    this.playerCapeMesh.position.set(0, 1.7, -0.25);
    this.playerGroup.add(this.playerCapeMesh);

    // 8. Contact Shadow Grounding Disc
    const shadowGeo = new THREE.CircleGeometry(0.7, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    this.playerShadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadowDisc.position.y = 0.02;
    this.playerGroup.add(this.playerShadowDisc);

    this.scene.add(this.playerGroup);
  }

  // -------------------------------------------------------------
  // Destructible World Objects (Trees, Rocks, Crystals)
  // -------------------------------------------------------------
  private seedDestructibleEntities() {
    // Seed 40 Trees across the meadows
    for (let i = 0; i < 42; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + Math.random() * 52;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Avoid lake
      const lakeDist = Math.sqrt((x - 25) * (x - 25) + (z + 20) * (z + 20));
      if (lakeDist < 19) continue;

      const y = getTerrainHeight(x, z);
      const isOak = i % 3 === 0;
      const id = `tree_${i}`;
      const scale = 0.85 + Math.random() * 0.4;
      const treeGroup = isOak ? this.createOakMesh(scale) : this.createPineMesh(scale);
      treeGroup.position.set(x, y, z);
      treeGroup.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(treeGroup);

      this.destructibles.push({
        id,
        type: 'tree',
        x,
        y,
        z,
        health: 100,
        maxHealth: 100,
        yieldResource: 'wood',
        yieldAmount: Math.round(18 * scale),
        scale,
      });
      this.destructibleMeshes.set(id, treeGroup);
    }

    // Seed 25 Iron & Stone Boulders
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 50;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const lakeDist = Math.sqrt((x - 25) * (x - 25) + (z + 20) * (z + 20));
      if (lakeDist < 19) continue;

      const y = getTerrainHeight(x, z);
      const isIron = i % 2 === 0;
      const id = `rock_${i}`;
      const scale = 1.0 + Math.random() * 0.6;
      const rockGroup = this.createOreNodeMesh(scale, isIron);
      rockGroup.position.set(x, y, z);
      rockGroup.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(rockGroup);

      this.destructibles.push({
        id,
        type: 'rock',
        x,
        y,
        z,
        health: 120,
        maxHealth: 120,
        yieldResource: isIron ? 'iron' : 'stone',
        yieldAmount: Math.round((isIron ? 14 : 22) * scale),
        scale,
      });
      this.destructibleMeshes.set(id, rockGroup);
    }

    // Seed 14 Glowing Aether Crystals
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.3;
      const radius = 22 + Math.random() * 38;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const lakeDist = Math.sqrt((x - 25) * (x - 25) + (z + 20) * (z + 20));
      if (lakeDist < 19) continue;

      const y = getTerrainHeight(x, z);
      const id = `crystal_${i}`;
      const crystalGroup = this.createCrystalClusterMesh();
      crystalGroup.position.set(x, y, z);
      this.scene.add(crystalGroup);

      this.destructibles.push({
        id,
        type: 'crystal',
        x,
        y,
        z,
        health: 80,
        maxHealth: 80,
        yieldResource: 'crystals',
        yieldAmount: 8 + Math.floor(Math.random() * 6),
        scale: 1,
      });
      this.destructibleMeshes.set(id, crystalGroup);
    }
  }

  // Multi-part procedural models:
  private createPineMesh(scale: number): THREE.Group {
    const group = new THREE.Group();

    // 1. Trunk with root flare
    const trunkGeo = new THREE.CylinderGeometry(0.25 * scale, 0.45 * scale, 2.5 * scale, 8);
    trunkGeo.translate(0, 1.25 * scale, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x483222,
      roughness: 0.85,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = !this.isSoftwareGl;
    group.add(trunk);

    // 2. Foliage Tier 1 (Base)
    const coneMat1 = new THREE.MeshStandardMaterial({
      color: 0x244f2b,
      roughness: 0.7,
    });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(2.0 * scale, 2.2 * scale, 7), coneMat1);
    cone1.position.y = 2.6 * scale;
    cone1.castShadow = !this.isSoftwareGl;
    group.add(cone1);

    // Foliage Tier 2 (Middle)
    const coneMat2 = new THREE.MeshStandardMaterial({
      color: 0x2e6136,
      roughness: 0.7,
    });
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.5 * scale, 1.9 * scale, 7), coneMat2);
    cone2.position.y = 3.8 * scale;
    cone2.castShadow = !this.isSoftwareGl;
    group.add(cone2);

    // Foliage Tier 3 (Spire)
    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(1.0 * scale, 1.6 * scale, 7), coneMat2);
    cone3.position.y = 4.8 * scale;
    cone3.castShadow = !this.isSoftwareGl;
    group.add(cone3);

    // Contact shadow
    const shadow = this.createShadowMesh(1.8 * scale);
    group.add(shadow);

    return group;
  }

  private createOakMesh(scale: number): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.5 * scale, 0.8 * scale, 3.2 * scale, 8);
    trunkGeo.translate(0, 1.6 * scale, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543c29, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = !this.isSoftwareGl;
    group.add(trunk);

    // Multi-cluster canopy
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7037, roughness: 0.75 });
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9 * scale), leafMat);
    c1.position.set(0, 4.0 * scale, 0);
    c1.castShadow = !this.isSoftwareGl;
    group.add(c1);

    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 * scale), leafMat);
    c2.position.set(1.1 * scale, 3.4 * scale, 0.4 * scale);
    group.add(c2);

    const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 * scale), leafMat);
    c3.position.set(-1.0 * scale, 3.5 * scale, -0.4 * scale);
    group.add(c3);

    const shadow = this.createShadowMesh(2.2 * scale);
    group.add(shadow);

    return group;
  }

  private createOreNodeMesh(scale: number, isIron: boolean): THREE.Group {
    const group = new THREE.Group();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x646970,
      roughness: 0.8,
    });
    const oreMat = new THREE.MeshStandardMaterial({
      color: isIron ? 0xb06437 : 0x8a9299,
      roughness: 0.35,
      metalness: 0.85,
    });

    // Central primary rock
    const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * scale), rockMat);
    mainRock.position.y = 0.8 * scale;
    mainRock.castShadow = !this.isSoftwareGl;
    group.add(mainRock);

    // Secondary sub-boulders
    const subRock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * scale), rockMat);
    subRock1.position.set(0.6 * scale, 0.5 * scale, 0.4 * scale);
    group.add(subRock1);

    const subRock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * scale), rockMat);
    subRock2.position.set(-0.5 * scale, 0.4 * scale, -0.3 * scale);
    group.add(subRock2);

    // Embedded shining ore nodules
    const ore1 = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 0.4 * scale), oreMat);
    ore1.position.set(0.3 * scale, 1.1 * scale, 0.5 * scale);
    ore1.rotation.set(0.3, 0.4, 0.2);
    group.add(ore1);

    const ore2 = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scale, 0.25 * scale, 0.35 * scale), oreMat);
    ore2.position.set(-0.4 * scale, 0.9 * scale, -0.3 * scale);
    group.add(ore2);

    const shadow = this.createShadowMesh(1.5 * scale);
    group.add(shadow);

    return group;
  }

  private createCrystalClusterMesh(): THREE.Group {
    const group = new THREE.Group();
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.7,
    });

    const heights = [2.2, 1.8, 1.4, 1.1, 0.9];
    const offsets = [
      [0, 0],
      [0.45, 0.35],
      [-0.4, 0.4],
      [0.35, -0.35],
      [-0.45, -0.3],
    ];

    heights.forEach((h, idx) => {
      const geo = new THREE.ConeGeometry(0.28, h, 6);
      geo.translate(0, h / 2, 0);
      const mesh = new THREE.Mesh(geo, crystalMat);
      const [ox, oz] = offsets[idx];
      mesh.position.set(ox, 0, oz);
      mesh.rotation.x = (Math.random() - 0.5) * 0.25;
      mesh.rotation.z = (Math.random() - 0.5) * 0.25;
      group.add(mesh);
    });

    const shadow = this.createShadowMesh(1.2);
    group.add(shadow);

    return group;
  }

  private createRockMesh(scale: number, color: number): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(scale, 1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !this.isSoftwareGl;
    return mesh;
  }

  private createShadowMesh(radius: number): THREE.Mesh {
    const shadowGeo = new THREE.CircleGeometry(radius, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    });
    const mesh = new THREE.Mesh(shadowGeo, shadowMat);
    mesh.position.y = 0.02;
    return mesh;
  }

  private seedCitadelRuins() {
    // Landmark citadel ruins in north meadow (spawn vista!)
    const ruinGroup = new THREE.Group();
    const rx = 0;
    const rz = -35;
    const ry = getTerrainHeight(rx, rz);
    ruinGroup.position.set(rx, ry, rz);

    const stoneMat = new THREE.MeshStandardMaterial({
      map: createStoneTexture(this.renderer),
      roughness: 0.8,
    });

    // 4 Ancient Pillars
    const pOffsets = [
      [-5, -5],
      [5, -5],
      [-5, 5],
      [5, 5],
    ];

    pOffsets.forEach(([px, pz]) => {
      const pGeo = new THREE.CylinderGeometry(0.8, 1.0, 7.5, 10);
      pGeo.translate(0, 3.75, 0);
      const pillar = new THREE.Mesh(pGeo, stoneMat);
      pillar.position.set(px, 0, pz);
      pillar.castShadow = !this.isSoftwareGl;
      ruinGroup.add(pillar);
    });

    // Lintel beam across top
    const beamGeo = new THREE.BoxGeometry(11.5, 1.2, 1.6);
    const beam = new THREE.Mesh(beamGeo, stoneMat);
    beam.position.set(0, 7.8, -5);
    beam.castShadow = !this.isSoftwareGl;
    ruinGroup.add(beam);

    // Central ancient faction banner / monument
    const bannerGeo = new THREE.PlaneGeometry(2.0, 4.0);
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      roughness: 0.5,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 5.0, -5);
    ruinGroup.add(banner);

    this.scene.add(ruinGroup);
  }

  // -------------------------------------------------------------
  // Modular House Building System
  // -------------------------------------------------------------
  private buildGhostMesh() {
    this.ghostGroup = new THREE.Group();
    this.updateGhostGeometry();
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);
  }

  public setBuildType(type: BuildingType) {
    this.selectedBuildingType = type;
    this.updateGhostGeometry();
  }

  public rotateBuild() {
    this.buildRotationY = (this.buildRotationY + Math.PI / 2) % (Math.PI * 2);
    if (this.ghostGroup) {
      this.ghostGroup.rotation.y = this.buildRotationY;
    }
  }

  private updateGhostGeometry() {
    // Clear existing
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }
    this.ghostMaterials = [];

    const previewMat = new THREE.MeshBasicMaterial({
      color: this.canPlaceCurrent ? 0x22c55e : 0xef4444, // Green / Red
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    this.ghostMaterials.push(previewMat);

    const mesh = this.createBuildingMesh(this.selectedBuildingType, previewMat);
    this.ghostGroup.add(mesh);
  }

  public createBuildingMesh(type: BuildingType, customMaterial?: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    const woodTex = createWoodTexture(this.renderer);
    const stoneTex = createStoneTexture(this.renderer);

    const defaultWood = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.7,
    });
    const defaultStone = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.8,
    });

    const mWood = customMaterial || defaultWood;
    const mStone = customMaterial || defaultStone;

    switch (type) {
      case 'wood_foundation': {
        // Platform box + corner pilings
        const floorGeo = new THREE.BoxGeometry(3.0, 0.35, 3.0);
        const floor = new THREE.Mesh(floorGeo, mWood);
        floor.position.y = 0.175;
        floor.castShadow = !this.isSoftwareGl;
        floor.receiveShadow = !this.isSoftwareGl;
        group.add(floor);

        const pileGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 8);
        [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]].forEach(([px, pz]) => {
          const pile = new THREE.Mesh(pileGeo, mWood);
          pile.position.set(px, -0.4, pz);
          group.add(pile);
        });
        break;
      }
      case 'stone_wall': {
        const wallGeo = new THREE.BoxGeometry(3.0, 2.6, 0.4);
        const wall = new THREE.Mesh(wallGeo, mStone);
        wall.position.y = 1.3;
        wall.castShadow = !this.isSoftwareGl;
        group.add(wall);

        // Timber top plate
        const plateGeo = new THREE.BoxGeometry(3.05, 0.2, 0.45);
        const plate = new THREE.Mesh(plateGeo, mWood);
        plate.position.y = 2.65;
        group.add(plate);
        break;
      }
      case 'wood_doorway': {
        // Left & Right posts
        const postGeo = new THREE.BoxGeometry(0.8, 2.6, 0.4);
        const postL = new THREE.Mesh(postGeo, mWood);
        postL.position.set(-1.1, 1.3, 0);
        group.add(postL);

        const postR = new THREE.Mesh(postGeo, mWood);
        postR.position.set(1.1, 1.3, 0);
        group.add(postR);

        // Lintel arch
        const lintelGeo = new THREE.BoxGeometry(3.0, 0.6, 0.42);
        const lintel = new THREE.Mesh(lintelGeo, mWood);
        lintel.position.y = 2.3;
        group.add(lintel);
        break;
      }
      case 'timber_roof': {
        const roofGeo = new THREE.ConeGeometry(2.5, 1.6, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, mWood);
        roof.position.y = 0.8;
        roof.castShadow = !this.isSoftwareGl;
        group.add(roof);
        break;
      }
      case 'defense_tower': {
        // 4 heavy legs
        const legGeo = new THREE.CylinderGeometry(0.2, 0.25, 5.0, 8);
        [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, mWood);
          leg.position.set(lx, 2.5, lz);
          group.add(leg);
        });

        // Platform deck
        const deckGeo = new THREE.BoxGeometry(3.2, 0.4, 3.2);
        const deck = new THREE.Mesh(deckGeo, mWood);
        deck.position.y = 5.0;
        group.add(deck);

        // Battlements
        const battGeo = new THREE.BoxGeometry(3.2, 0.8, 0.2);
        const battF = new THREE.Mesh(battGeo, mWood);
        battF.position.set(0, 5.5, 1.5);
        group.add(battF);

        // Glowing brazier beacon
        const fireMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const fire = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), fireMat);
        fire.position.set(0, 5.8, 0);
        group.add(fire);
        break;
      }
      case 'blacksmith_forge': {
        // Stone hearth
        const hearthGeo = new THREE.BoxGeometry(2.0, 1.0, 1.6);
        const hearth = new THREE.Mesh(hearthGeo, mStone);
        hearth.position.y = 0.5;
        group.add(hearth);

        // Glowing forge coals
        const coalMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const coal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.8), coalMat);
        coal.position.set(0, 1.05, 0);
        group.add(coal);

        // Anvil
        const anvilMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 });
        const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.35), anvilMat);
        anvil.position.set(0.9, 0.5, 0.9);
        group.add(anvil);
        break;
      }
    }

    return group;
  }

  public placeStructure(): PlacedStructure | null {
    if (!this.canPlaceCurrent) return null;

    const id = `struct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const x = this.targetBuildPos.x;
    const y = this.targetBuildPos.y;
    const z = this.targetBuildPos.z;

    const mesh = this.createBuildingMesh(this.selectedBuildingType);
    mesh.position.set(x, y, z);
    mesh.rotation.y = this.buildRotationY;
    this.scene.add(mesh);

    const structure: PlacedStructure = {
      id,
      type: this.selectedBuildingType,
      x,
      y,
      z,
      rotationY: this.buildRotationY,
      health: 300,
      maxHealth: 300,
      faction: 'vanguard',
      builtAt: Date.now(),
    };

    this.placedStructures.push(structure);
    this.structureMeshes.set(id, mesh);

    // Audio & Particle FX
    sounds.playBuildSnap();
    this.spawnParticleBurst(x, y + 0.5, z, new THREE.Color(0xd4af37), 16);

    this.callbacks.onStructureBuilt(structure);
    return structure;
  }

  // -------------------------------------------------------------
  // Harvesting & Destructible Environment
  // -------------------------------------------------------------
  public triggerPlayerAction() {
    // Tool swing animation
    this.playerWeaponGroup.rotation.x = -Math.PI / 2;
    setTimeout(() => {
      if (this.playerWeaponGroup) this.playerWeaponGroup.rotation.x = 0;
    }, 120);

    // Check closest destructible in front of player
    const px = this.playerGroup.position.x;
    const py = this.playerGroup.position.y;
    const pz = this.playerGroup.position.z;

    let closest: DestructibleObject | null = null;
    let closestDist = 3.6; // Max reach distance

    for (const obj of this.destructibles) {
      if (obj.health <= 0) continue;
      const dx = obj.x - px;
      const dz = obj.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closest = obj;
      }
    }

    if (closest) {
      this.damageDestructible(closest);
    } else {
      // Swish through the air
      sounds.playFootstep('grass');
    }
  }

  private damageDestructible(obj: DestructibleObject) {
    const damage = 35;
    obj.health = Math.max(0, obj.health - damage);

    // 1. Sim Hitstop (40ms) & Camera trauma
    this.simHitstopTime = 0.04;
    this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.35);

    // 2. Mesh flash & shake
    const mesh = this.destructibleMeshes.get(obj.id);
    if (mesh) {
      mesh.scale.set(1.08, 0.92, 1.08);
      setTimeout(() => {
        mesh.scale.set(1.0, 1.0, 1.0);
      }, 70);
    }

    // 3. Audio & Particle FX
    if (obj.yieldResource === 'wood') {
      sounds.playHarvest('wood');
      this.spawnParticleBurst(obj.x, obj.y + 1.5, obj.z, new THREE.Color(0xa67c52), 12);
    } else if (obj.yieldResource === 'crystals') {
      sounds.playHarvest('crystal');
      this.spawnParticleBurst(obj.x, obj.y + 1.2, obj.z, new THREE.Color(0x38bdf8), 16);
    } else {
      sounds.playHarvest('stone');
      this.spawnParticleBurst(obj.x, obj.y + 1.0, obj.z, new THREE.Color(0x94a3b8), 14);
    }

    // If destroyed
    if (obj.health <= 0) {
      sounds.playDestroy();
      this.spawnParticleBurst(obj.x, obj.y + 1.0, obj.z, new THREE.Color(0xf59e0b), 24);
      
      // Award resources
      this.callbacks.onResourceHarvested(obj.yieldResource, obj.yieldAmount, {
        x: obj.x,
        y: obj.y + 2.0,
        z: obj.z,
      });

      // Animate topple / sink
      if (mesh) {
        let sinkStep = 0;
        const sinkInterval = setInterval(() => {
          sinkStep++;
          mesh.position.y -= 0.12;
          mesh.scale.multiplyScalar(0.92);
          if (sinkStep > 15) {
            clearInterval(sinkInterval);
            mesh.visible = false;
          }
        }, 30);
      }

      // Respawn after 25s
      setTimeout(() => {
        obj.health = obj.maxHealth;
        if (mesh) {
          mesh.position.y = getTerrainHeight(obj.x, obj.z);
          mesh.scale.set(1, 1, 1);
          mesh.visible = true;
        }
      }, 25000);
    }
  }

  // -------------------------------------------------------------
  // Particle Pool (Zero GC Ring Buffer)
  // -------------------------------------------------------------
  private setupParticlePool() {
    const count = 60;
    this.particlePositions = new Float32Array(count * 3);
    this.particleColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        color: new THREE.Color(),
        size: 0.1,
      });
      this.particlePositions[i * 3 + 1] = -999;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.particlePoints = new THREE.Points(geo, mat);
    this.scene.add(this.particlePoints);
  }

  public spawnParticleBurst(x: number, y: number, z: number, color: THREE.Color, count: number = 12) {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = Math.random() * 4 + 2;
        p.vz = (Math.random() - 0.5) * 6;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.color.copy(color);
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private updateParticles(dt: number) {
    let needsUpdate = false;
    for (let i = 0; i < this.particlePool.length; i++) {
      const p = this.particlePool[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          this.particlePositions[i * 3 + 1] = -999;
          needsUpdate = true;
          continue;
        }

        p.vy -= 9.8 * dt; // Gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        this.particlePositions[i * 3] = p.x;
        this.particlePositions[i * 3 + 1] = p.y;
        this.particlePositions[i * 3 + 2] = p.z;

        this.particleColors[i * 3] = p.color.r;
        this.particleColors[i * 3 + 1] = p.color.g;
        this.particleColors[i * 3 + 2] = p.color.b;
        needsUpdate = true;
      }
    }

    if (needsUpdate && this.particlePoints) {
      this.particlePoints.geometry.attributes.position.needsUpdate = true;
      this.particlePoints.geometry.attributes.color.needsUpdate = true;
    }
  }

  // -------------------------------------------------------------
  // Weather Systems & Sky Lighting Cycle
  // -------------------------------------------------------------
  private setupWeatherSystems() {
    // Rain Points
    const rainCount = 450;
    this.rainCoords = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      this.rainCoords[i * 3] = (Math.random() - 0.5) * 60;
      this.rainCoords[i * 3 + 1] = Math.random() * 25;
      this.rainCoords[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainCoords, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
    });
    this.rainParticlesGroup = new THREE.Points(rainGeo, rainMat);
    this.rainParticlesGroup.visible = false;
    this.scene.add(this.rainParticlesGroup);

    // Snow Points
    const snowCount = 300;
    this.snowCoords = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      this.snowCoords[i * 3] = (Math.random() - 0.5) * 60;
      this.snowCoords[i * 3 + 1] = Math.random() * 25;
      this.snowCoords[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowCoords, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.22,
      transparent: true,
      opacity: 0.7,
    });
    this.snowParticlesGroup = new THREE.Points(snowGeo, snowMat);
    this.snowParticlesGroup.visible = false;
    this.scene.add(this.snowParticlesGroup);
  }

  public setWeather(weather: WeatherType) {
    this.weather = weather;
    sounds.updateWeatherAmbience(weather);

    this.rainParticlesGroup.visible = weather === 'rain' || weather === 'storm';
    this.snowParticlesGroup.visible = weather === 'snow';

    if (weather === 'storm') {
      const col = 0x2a3644;
      if (this.scene.background instanceof THREE.Color) this.scene.background.setHex(col);
      this.scene.fog = new THREE.FogExp2(col, 0.022);
      this.sunLight.intensity = 0.5;
      this.hemiLight.intensity = 0.4;
    } else if (weather === 'rain') {
      const col = 0x566d80;
      if (this.scene.background instanceof THREE.Color) this.scene.background.setHex(col);
      this.scene.fog = new THREE.FogExp2(col, 0.018);
      this.sunLight.intensity = 1.0;
      this.hemiLight.intensity = 0.7;
    } else if (weather === 'snow') {
      const col = 0xcde1f0;
      if (this.scene.background instanceof THREE.Color) this.scene.background.setHex(col);
      this.scene.fog = new THREE.FogExp2(col, 0.016);
      this.sunLight.intensity = 1.4;
      this.hemiLight.intensity = 1.1;
    } else {
      // Clear
      const col = 0x9fc8e8;
      if (this.scene.background instanceof THREE.Color) this.scene.background.setHex(col);
      this.scene.fog = new THREE.FogExp2(col, 0.011);
      this.sunLight.intensity = 2.0;
      this.hemiLight.intensity = 1.2;
    }
  }

  private updateWeatherAnimation(dt: number) {
    const px = this.playerGroup.position.x;
    const pz = this.playerGroup.position.z;

    // Follow player with rain/snow volume
    if (this.rainParticlesGroup.visible) {
      this.rainParticlesGroup.position.set(px, 0, pz);
      const pos = this.rainParticlesGroup.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 22 * dt;
        if (y < 0) y = 25;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    if (this.snowParticlesGroup.visible) {
      this.snowParticlesGroup.position.set(px, 0, pz);
      const pos = this.snowParticlesGroup.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 5 * dt;
        let x = pos.getX(i) + Math.sin(y * 0.4) * 2 * dt;
        if (y < 0) y = 25;
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }

    // Thunderstorm lightning flashes
    if (this.weather === 'storm') {
      this.lightningTimer += dt;
      if (this.lightningTimer > 7.0 && Math.random() < 0.04) {
        this.lightningTimer = 0;
        this.sunLight.intensity = 4.5; // Flash!
        sounds.playDestroy();
        setTimeout(() => {
          if (this.sunLight) this.sunLight.intensity = 0.5;
        }, 120);
      }
    }
  }

  // -------------------------------------------------------------
  // Controls & Camera Interaction
  // -------------------------------------------------------------
  private setupEventListeners() {
    // Keyboard listeners on window
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.tryJump();
      }
      if (e.key.toLowerCase() === 'e') {
        this.triggerPlayerAction();
      }
      if (e.key.toLowerCase() === 'r' && this.isBuildModeActive) {
        this.rotateBuild();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Clear held keys on blur per skill instructions
    window.addEventListener('blur', () => {
      this.keys = {};
      this.isDraggingCamera = false;
    });

    // Mouse drag for 3rd person orbit
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isBuildModeActive) {
        this.placeStructure();
        return;
      }
      if (e.button === 0) {
        this.triggerPlayerAction();
      }
      this.isDraggingCamera = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingCamera) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraAngleH -= dx * 0.005;
      this.cameraAngleV = Math.max(0.08, Math.min(1.2, this.cameraAngleV + dy * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingCamera = false;
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(4.0, Math.min(16.0, this.cameraDistance + e.deltaY * 0.01));
    }, { passive: false });

    // Window resize
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private tryJump() {
    if (this.isGrounded) {
      this.playerVelocityY = 6.2;
      this.isGrounded = false;
      sounds.playFootstep('grass');
      // Subtle squash & stretch
      this.playerGroup.scale.set(0.88, 1.18, 0.88);
    }
  }

  // -------------------------------------------------------------
  // Simulation Loop & Kinematics
  // -------------------------------------------------------------
  public setTitleMode(isTitle: boolean) {
    this.isTitleMode = isTitle;
    if (!isTitle) {
      this.cameraDistance = 8.5;
    }
  }

  private startLoop() {
    // Software WebGL pacing helper
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (!this.isRunning) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05); // Clamped dt

      // Advance hitstop
      if (this.simHitstopTime > 0) {
        this.simHitstopTime -= dt;
      } else {
        this.updateSimulation(dt);
      }

      this.updateCamera(dt);
      this.updateParticles(dt);
      this.updateWeatherAnimation(dt);

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private updateSimulation(dt: number) {
    // Day/Night time progression (1 real minute = 1 game hour)
    this.dayTime = (this.dayTime + dt * 0.05) % 24;
    const sunAngle = ((this.dayTime - 6) / 24) * Math.PI * 2;
    this.sunLight.position.set(
      Math.cos(sunAngle) * 60,
      Math.sin(sunAngle) * 60,
      30
    );

    if (this.isTitleMode) {
      // Cinematic orbital camera tour around the central meadow & ruins
      this.cameraAngleH += dt * 0.15;
      return;
    }

    // 1. Gather player input from WASD or virtual joystick
    let moveX = 0;
    let moveZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // Add joystick input
    if (Math.abs(this.joystickVector.x) > 0.05) moveX += this.joystickVector.x;
    if (Math.abs(this.joystickVector.y) > 0.05) moveZ += this.joystickVector.y;

    const inputLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const isMoving = inputLen > 0.1;

    // Movement speed based on weather penalty
    let speed = 5.8;
    if (this.weather === 'storm') speed *= 0.82;
    if (this.weather === 'snow') speed *= 0.88;

    if (isMoving) {
      // Transform relative to camera horizontal angle
      const forward = this._v1.set(-Math.sin(this.cameraAngleH), 0, -Math.cos(this.cameraAngleH));
      const right = this._v2.set(Math.cos(this.cameraAngleH), 0, -Math.sin(this.cameraAngleH));

      const dirX = (forward.x * (-moveZ) + right.x * moveX) / Math.max(1, inputLen);
      const dirZ = (forward.z * (-moveZ) + right.z * moveX) / Math.max(1, inputLen);

      this.playerGroup.position.x += dirX * speed * dt;
      this.playerGroup.position.z += dirZ * speed * dt;

      // Bound within 72m meadow radius (natural barriers)
      const dist = Math.sqrt(this.playerGroup.position.x ** 2 + this.playerGroup.position.z ** 2);
      if (dist > 72) {
        this.playerGroup.position.x = (this.playerGroup.position.x / dist) * 72;
        this.playerGroup.position.z = (this.playerGroup.position.z / dist) * 72;
      }

      // Smooth heading rotation
      const targetHeading = Math.atan2(dirX, dirZ);
      let diff = targetHeading - this.playerHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.playerHeading += diff * (1 - Math.exp(-12 * dt));
      this.playerGroup.rotation.y = this.playerHeading;

      // Gait & leg/arm walking animation
      this.playerAnimTimer += dt * speed * 2.2;
      const walkCycle = Math.sin(this.playerAnimTimer);
      this.leftLegMesh.rotation.x = walkCycle * 0.6;
      this.rightLegMesh.rotation.x = -walkCycle * 0.6;
      this.leftArmMesh.rotation.x = -walkCycle * 0.5;
      this.rightArmMesh.rotation.x = walkCycle * 0.5;

      // Cape billow
      this.playerCapeMesh.rotation.x = 0.35 + Math.abs(walkCycle) * 0.25;

      // Footstep sound cadence
      if (Math.sin(this.playerAnimTimer) > 0.95 && Math.random() < 0.15) {
        sounds.playFootstep('grass');
      }
    } else {
      // Idle pose
      this.leftLegMesh.rotation.x *= 0.85;
      this.rightLegMesh.rotation.x *= 0.85;
      this.leftArmMesh.rotation.x *= 0.85;
      this.rightArmMesh.rotation.x *= 0.85;
      this.playerCapeMesh.rotation.x = 0.08;
    }

    // 2. Vertical Physics (Gravity & Ground Height)
    const px = this.playerGroup.position.x;
    const pz = this.playerGroup.position.z;
    const floorY = getTerrainHeight(px, pz);

    this.playerVelocityY -= 17.0 * dt; // Gravity
    this.playerGroup.position.y += this.playerVelocityY * dt;

    if (this.playerGroup.position.y <= floorY) {
      if (!this.isGrounded && this.playerVelocityY < -3.0) {
        // Landing impact squash & sound
        this.playerGroup.scale.set(1.15, 0.85, 1.15);
        sounds.playFootstep('grass');
      }
      this.playerGroup.position.y = floorY;
      this.playerVelocityY = 0;
      this.isGrounded = true;
    }

    // Exponentially restore squash & stretch scale to 1.0
    this.playerGroup.scale.x = THREE.MathUtils.damp(this.playerGroup.scale.x, 1.0, 10, dt);
    this.playerGroup.scale.y = THREE.MathUtils.damp(this.playerGroup.scale.y, 1.0, 10, dt);
    this.playerGroup.scale.z = THREE.MathUtils.damp(this.playerGroup.scale.z, 1.0, 10, dt);

    // 3. Update Build Mode Ghost Mesh Snapping
    if (this.isBuildModeActive && this.ghostGroup) {
      this.ghostGroup.visible = true;
      // Project 4.0m in front of player
      const bx = px + Math.sin(this.playerHeading) * 4.0;
      const bz = pz + Math.cos(this.playerHeading) * 4.0;

      // Grid snap to 2.0m grid
      const snapX = Math.round(bx / 2.0) * 2.0;
      const snapZ = Math.round(bz / 2.0) * 2.0;
      const snapY = getTerrainHeight(snapX, snapZ);

      this.targetBuildPos.set(snapX, snapY, snapZ);
      this.ghostGroup.position.copy(this.targetBuildPos);
      this.ghostGroup.rotation.y = this.buildRotationY;
    } else if (this.ghostGroup) {
      this.ghostGroup.visible = false;
    }

    // Notify React HUD with coordinates (throttled)
    this.callbacks.onPlayerPositionUpdate({
      x: Math.round(px * 10) / 10,
      y: Math.round(this.playerGroup.position.y * 10) / 10,
      z: Math.round(pz * 10) / 10,
      heading: Math.round((this.playerHeading * 180) / Math.PI),
    });
  }

  private updateCamera(dt: number) {
    if (this.isTitleMode) {
      const radius = 32;
      const camX = Math.sin(this.cameraAngleH) * radius;
      const camZ = Math.cos(this.cameraAngleH) * radius;
      const camY = 12 + Math.sin(this.cameraAngleH * 2) * 3;
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(0, 3, -10);
      return;
    }

    // 3rd Person Follow Camera
    const px = this.playerGroup.position.x;
    const py = this.playerGroup.position.y + 1.8; // Chest height
    const pz = this.playerGroup.position.z;

    const hDist = this.cameraDistance * Math.cos(this.cameraAngleV);
    const vDist = this.cameraDistance * Math.sin(this.cameraAngleV);

    const desiredX = px + Math.sin(this.cameraAngleH) * hDist;
    const desiredY = py + vDist;
    const desiredZ = pz + Math.cos(this.cameraAngleH) * hDist;

    // Ground clearance safety check
    const groundClearance = getTerrainHeight(desiredX, desiredZ) + 0.8;
    const clampedY = Math.max(desiredY, groundClearance);

    this._targetCamPos.set(desiredX, clampedY, desiredZ);
    this._targetLookAt.set(px, py, pz);

    // Apply trauma shake if active
    if (this.cameraTrauma > 0.01) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.0);
      const shake = this.cameraTrauma * this.cameraTrauma * 0.45;
      this._targetCamPos.x += (Math.random() - 0.5) * shake;
      this._targetCamPos.y += (Math.random() - 0.5) * shake;
    }

    // Smooth exponential follow
    const lerpFactor = 1 - Math.exp(-9.0 * dt);
    this.camera.position.lerp(this._targetCamPos, lerpFactor);
    this.camera.lookAt(this._targetLookAt);
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.renderer.dispose();
  }
}
