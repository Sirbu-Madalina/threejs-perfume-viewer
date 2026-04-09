import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

document.body.classList.add('bg-default');

function setBackgroundTheme(themeClass) {
  document.body.classList.remove(
    'bg-default',
    'bg-rose',
    'bg-ocean',
    'bg-lavender',
    'bg-mint',
    'bg-amber',
    'bg-midnight'
  );

  document.body.classList.add(themeClass);
}

// Scene
const scene = new THREE.Scene();
scene.background = null;

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Intro layout
const introCameraPos = new THREE.Vector3(0.6, 0.9, 5.6);
const centeredCameraPos = new THREE.Vector3(0, 0.9, 5.2);
camera.position.copy(introCameraPos);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.body.appendChild(renderer.domElement);

// Environment
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.02).texture;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.8;
controls.maxDistance = 8;
controls.enabled = false;

const introTarget = new THREE.Vector3(-0.8, 0, 0);
const centeredTarget = new THREE.Vector3(0, 0, 0);
controls.target.copy(introTarget);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
scene.add(new THREE.HemisphereLight(0xffffff, 0xded7c8, 0.7));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
directionalLight.position.set(3, 6, 4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

// Soft shadow under bottle
const shadowTexture = new THREE.TextureLoader().load(
  'https://threejs.org/examples/textures/roundshadow.png'
);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 2.2),
  new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.18,
  })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -1.02;
scene.add(shadowPlane);

// Model + state
let model = null;
let meshParts = [];
let baseScaleFactor = 1;

let isCustomizerOpen = false;
let transitionProgress = 0;
let transitionDirection = 0; // 1 = intro -> customizer, -1 = customizer -> intro

// Bottle positions
const introModelPos = new THREE.Vector3(-2.8, -1.9, 0);
const centeredModelPos = new THREE.Vector3(0, -0.5, 0);

// Rotation
const introRotation = 0.35;
const centeredRotation = 0;

// Scale
const introScale = 3.9;
const centeredScale = 2.0;

// Load model
const loader = new GLTFLoader();
loader.load(
  '/models/perfume.glb',
  (gltf) => {
    model = gltf.scene;
    meshParts = [];

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    baseScaleFactor = 1 / maxDim;
    model.scale.setScalar(baseScaleFactor * introScale);

    model.position.copy(introModelPos);
    model.rotation.y = introRotation;
    model.rotation.x = -0.05;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          child.material = child.material.clone();
        }

        meshParts.push(child);
      }
    });

    scene.add(model);
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

// Helpers
function setBottleColor(hex) {
  if (!model) return;

  const color = new THREE.Color(hex);

  meshParts.forEach((part) => {
    if (part.material?.color) {
      part.material.color.copy(color);
      part.material.needsUpdate = true;
    }
  });
}

function updateDescription(hex) {
  const description = document.getElementById('presetDescription');
  if (!description) return;

  const map = {
    '#f2c6d2': 'Rose — soft, floral, elegant.',
    '#b7d7e8': 'Ocean — fresh, airy, modern.',
    '#d7c6f2': 'Lavender — calm, dreamy, refined.',
    '#c7e8c2': 'Mint — light, crisp, refreshing.',
    '#f4d6a0': 'Amber — warm, luminous, golden.',
    '#4b3f72': 'Midnight — bold, deep, mysterious.',
  };

  description.textContent = map[hex] ?? 'Custom shade selected.';
}

function setActiveSwatch(clickedSwatch) {
  document.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.remove('active');
  });

  clickedSwatch.classList.add('active');
}

function startCustomizer() {
  isCustomizerOpen = true;
  transitionDirection = 1;

  document.getElementById('heroOverlay')?.classList.add('hidden');
  document.getElementById('topBar')?.classList.remove('hidden');

  setTimeout(() => {
    document.getElementById('customizerBar')?.classList.remove('hidden');
  }, 300);

  controls.enabled = true;
}

function exitCustomizer() {
  isCustomizerOpen = false;
  transitionDirection = -1;

  document.getElementById('topBar')?.classList.add('hidden');
  document.getElementById('customizerBar')?.classList.add('hidden');
  setBackgroundTheme('bg-default');

  setTimeout(() => {
    document.getElementById('heroOverlay')?.classList.remove('hidden');
  }, 250);

  controls.enabled = false;
}

function resetView() {
  camera.position.copy(centeredCameraPos);
  controls.target.copy(centeredTarget);

  if (model) {
    model.position.copy(centeredModelPos);
    model.rotation.y = centeredRotation;
    model.scale.setScalar(baseScaleFactor * centeredScale);
  }

  controls.update();
}

// UI events
document.getElementById('startBtn')?.addEventListener('click', () => {
  startCustomizer();
});

document.getElementById('exitBtn')?.addEventListener('click', () => {
  exitCustomizer();
});

document.getElementById('resetViewBtn')?.addEventListener('click', () => {
  resetView();
});

document.querySelectorAll('.swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    const hex = swatch.dataset.color;
    if (!hex) return;

    setBottleColor(hex);
    updateDescription(hex);
    setActiveSwatch(swatch);

    const themeMap = {
      '#f2c6d2': 'bg-rose',
      '#b7d7e8': 'bg-ocean',
      '#d7c6f2': 'bg-lavender',
      '#c7e8c2': 'bg-mint',
      '#f4d6a0': 'bg-amber',
      '#4b3f72': 'bg-midnight',
    };

    setBackgroundTheme(themeMap[hex] ?? 'bg-default');
  });
});

// Animate
function animate() {
  requestAnimationFrame(animate);

  if (model) {
    if (!isCustomizerOpen && transitionDirection === 0) {
      model.rotation.y += 0.002;
    }

    if (transitionDirection === 1 && transitionProgress < 1) {
      transitionProgress += 0.025;

      camera.position.lerpVectors(introCameraPos, centeredCameraPos, transitionProgress);
      controls.target.lerpVectors(introTarget, centeredTarget, transitionProgress);
      model.position.lerpVectors(introModelPos, centeredModelPos, transitionProgress);
      model.rotation.y = THREE.MathUtils.lerp(
        introRotation,
        centeredRotation,
        transitionProgress
      );

      const animatedScale = THREE.MathUtils.lerp(
        introScale,
        centeredScale,
        transitionProgress
      );
      model.scale.setScalar(baseScaleFactor * animatedScale);

      if (transitionProgress >= 1) {
        transitionProgress = 1;
        transitionDirection = 0;
      }
    }

    if (transitionDirection === -1 && transitionProgress > 0) {
      transitionProgress -= 0.025;

      camera.position.lerpVectors(introCameraPos, centeredCameraPos, transitionProgress);
      controls.target.lerpVectors(introTarget, centeredTarget, transitionProgress);
      model.position.lerpVectors(introModelPos, centeredModelPos, transitionProgress);
      model.rotation.y = THREE.MathUtils.lerp(
        introRotation,
        centeredRotation,
        transitionProgress
      );

      const animatedScale = THREE.MathUtils.lerp(
        introScale,
        centeredScale,
        transitionProgress
      );
      model.scale.setScalar(baseScaleFactor * animatedScale);

      if (transitionProgress <= 0) {
        transitionProgress = 0;
        transitionDirection = 0;

        camera.position.copy(introCameraPos);
        controls.target.copy(introTarget);
        model.position.copy(introModelPos);
        model.rotation.y = introRotation;
        model.scale.setScalar(baseScaleFactor * introScale);
      }
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});