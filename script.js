const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

// Sunset oceanic sky and atmospheric haze
const sunsetSkyColor = 0xff8c42; // Warm sunset orange
const horizonFogColor = 0xffb787; // Soft sunset peach
scene.background = new THREE.Color(sunsetSkyColor);
scene.fog = new THREE.FogExp2(horizonFogColor, 0.0075);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(0, 11, 26);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 7;
controls.maxDistance = 55;
controls.target.set(0, 1.8, 0);

// --- Radiant Sunset Lighting ---
const hemiLight = new THREE.HemisphereLight(0xffd1b3, 0x4a7c59, 1.0);
scene.add(hemiLight);

const mainSun = new THREE.DirectionalLight(0xff5733, 4.5);
mainSun.position.set(-60, 15, 30); // Low on the horizon
scene.add(mainSun);

const seaBounceLight = new THREE.DirectionalLight(0x73c9f2, 0.5);
seaBounceLight.position.set(40, -10, -25);
scene.add(seaBounceLight);

// Sun disc sphere in distant sky
const sunDiscGeo = new THREE.SphereGeometry(18, 16, 16);
const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xffe6b3 }); // glowing yellowish white
const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
sunDisc.position.set(-360, 90, 180); // Lower for sunset
scene.add(sunDisc);

// Soft clouds
const cloudGroup = new THREE.Group();
const cloudMat = new THREE.MeshStandardMaterial({
  color: 0xffb380, // tinted by sunset
  roughness: 0.9,
  metalness: 0.05,
  flatShading: true
});

function createCloudCluster(cx, cy, cz, scale) {
  const cluster = new THREE.Group();
  const puffCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < puffCount; i++) {
    const rad = (12 + Math.random() * 16) * scale;
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), cloudMat);
    puff.position.set(
      (Math.random() - 0.5) * 45 * scale,
      (Math.random() - 0.5) * 12 * scale,
      (Math.random() - 0.5) * 35 * scale
    );
    cluster.add(puff);
  }
  cluster.position.set(cx, cy, cz);
  return cluster;
}

const cloudPositions = [
  [-180, 40, -280, 1.3],
  [80, 45, -340, 1.5],
  [-260, 45, -160, 1.2],
  [220, 35, -220, 1.1],
  [-50, 50, -380, 1.7]
];
cloudPositions.forEach(([x, y, z, s]) => {
  cloudGroup.add(createCloudCluster(x, y, z, s));
});
scene.add(cloudGroup);

const oceanDimension = 320;
const oceanRes = 180;
const oceanGeometry = new THREE.PlaneGeometry(oceanDimension, oceanDimension, oceanRes, oceanRes);
oceanGeometry.rotateX(-Math.PI / 2);

const vertexCount = oceanGeometry.attributes.position.count;
const oceanColors = new Float32Array(vertexCount * 3);
oceanGeometry.setAttribute('color', new THREE.BufferAttribute(oceanColors, 3));

// Realistic Water Material
const oceanMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x004466,
  emissive: 0x001122,
  roughness: 0.1,
  metalness: 0.9,
  reflectivity: 0.9,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  flatShading: false,
  transparent: true,
  opacity: 0.9,
});
const oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
scene.add(oceanMesh);

const posAttr = oceanGeometry.attributes.position;
const origCoords = new Float32Array(posAttr.count * 3);
for (let i = 0; i < posAttr.count; i++) {
  origCoords[i * 3 + 0] = posAttr.getX(i);
  origCoords[i * 3 + 1] = posAttr.getY(i);
  origCoords[i * 3 + 2] = posAttr.getZ(i);
}

function getWaterHeight(x, z, time) {
  const swell1 = Math.sin(x * 0.12 - time * 1.9) * 0.46;
  const swell2 = Math.cos(z * 0.15 + time * 1.5) * 0.34;
  const crossSwell = Math.sin((x * 0.08 + z * 0.11) - time * 2.1) * 0.26;
  const microRipples = Math.cos((x * 0.35 - z * 0.22) + time * 3.7) * 0.09;
  return swell1 + swell2 + crossSwell + microRipples;
}

function createDaytimeBannerTexture() {
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 1024;
  bannerCanvas.height = 420;
  const ctx = bannerCanvas.getContext('2d');
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 420);
  bgGrad.addColorStop(0, '#f9fafb');
  bgGrad.addColorStop(0.5, '#f0f4f8');
  bgGrad.addColorStop(1, '#e5ebf2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 420);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.025)';
  for (let i = 0; i < 1024; i += 4) ctx.fillRect(i, 0, 1, 420);
  for (let j = 0; j < 420; j += 4) ctx.fillRect(0, j, 1024, 1);
  ctx.strokeStyle = '#0a2540';
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 26, 1024 - 52, 420 - 52);
  ctx.strokeStyle = 'rgba(10, 37, 64, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(34, 34, 1024 - 68, 420 - 68);
  ctx.font = '800 88px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0a2540';
  ctx.fillText('COMING SOON', 512, 210);
  const texture = new THREE.CanvasTexture(bannerCanvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

const boatGroup = new THREE.Group();
scene.add(boatGroup);

// Yacht Materials
const hullMat = new THREE.MeshStandardMaterial({ color: 0x092b4c, metalness: 0.65, roughness: 0.25, flatShading: true });
const waterlineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
const teakDeckMat = new THREE.MeshStandardMaterial({ color: 0xb57843, roughness: 0.55, metalness: 0.05 });
const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x1b4b6b, roughness: 0.08, metalness: 0.95 });
const stainlessSteelMat = new THREE.MeshStandardMaterial({ color: 0xe6eef5, metalness: 0.95, roughness: 0.12 });

// Yacht components
const hullGeo = new THREE.ConeGeometry(3.2, 11.5, 6);
hullGeo.rotateZ(-Math.PI / 2);
hullGeo.rotateX(Math.PI / 6);
const hullMesh = new THREE.Mesh(hullGeo, hullMat);
hullMesh.scale.set(1.4, 0.52, 1.15);
boatGroup.add(hullMesh);

const stripeMesh = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.16, 3.8), waterlineMat);
stripeMesh.position.y = 0.55;
boatGroup.add(stripeMesh);

const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.22, 3.7), teakDeckMat);
deckMesh.position.y = 0.75;
boatGroup.add(deckMesh);

const railingGeo = new THREE.CylinderGeometry(0.04, 0.04, 11.0, 8);
railingGeo.rotateZ(Math.PI / 2);
const railPort = new THREE.Mesh(railingGeo, stainlessSteelMat);
railPort.position.set(0, 1.25, 1.8);
boatGroup.add(railPort);
const railStarboard = new THREE.Mesh(railingGeo, stainlessSteelMat);
railStarboard.position.set(0, 1.25, -1.8);
boatGroup.add(railStarboard);

const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.5, 2.5), cabinMat);
cabinMesh.position.set(-1.8, 1.6, 0);
boatGroup.add(cabinMesh);

const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.54), windowGlassMat);
windowMesh.position.set(-0.85, 1.8, 0);
boatGroup.add(windowMesh);

const mastMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 9.2, 12), stainlessSteelMat);
mastMesh.position.set(0.6, 5.2, 0);
boatGroup.add(mastMesh);

const boomGeo = new THREE.CylinderGeometry(0.07, 0.07, 5.4, 8);
boomGeo.rotateZ(Math.PI / 2);
const boomMesh = new THREE.Mesh(boomGeo, stainlessSteelMat);
boomMesh.position.set(-1.8, 8.2, 0);
boatGroup.add(boomMesh);

const flagGeo = new THREE.PlaneGeometry(5.2, 2.5, 28, 14);
const flagTexture = createDaytimeBannerTexture();
const flagMat = new THREE.MeshStandardMaterial({ map: flagTexture, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.05 });
const flagMesh = new THREE.Mesh(flagGeo, flagMat);
flagMesh.position.set(-1.8, 6.8, 0);
boatGroup.add(flagMesh);

const sailorNavyShirt = new THREE.MeshStandardMaterial({ color: 0x0c2d48, roughness: 0.7 });
const sailorWhiteHat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

function createSailor(x, y, z, facingAngle = 0) {
  const sailor = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.95, 8), sailorNavyShirt);
  body.position.y = 0.48;
  sailor.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), sailorWhiteHat);
  head.position.y = 1.15;
  sailor.add(head);
  sailor.position.set(x, y, z);
  sailor.rotation.y = facingAngle;
  return sailor;
}

boatGroup.add(createSailor(3.6, 0.85, 0, Math.PI / 2));
boatGroup.add(createSailor(1.2, 0.85, 1.1, Math.PI / 3));
boatGroup.add(createSailor(1.2, 0.85, -1.1, -Math.PI / 3));

const wakeCount = 65;
const wakeGeo = new THREE.RingGeometry(0.4, 1.8, 16);
wakeGeo.rotateX(-Math.PI / 2);
const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
const wakeGroup = new THREE.Group();
scene.add(wakeGroup);
const wakeParticles = [];
for (let i = 0; i < wakeCount; i++) {
  const mesh = new THREE.Mesh(wakeGeo, wakeMat.clone());
  mesh.position.set(0, -20, 0);
  wakeGroup.add(mesh);
  wakeParticles.push({ mesh: mesh, life: i / wakeCount, x: 0, z: 0 });
}

const sprayCount = 45;
const sprayGeo = new THREE.SphereGeometry(0.1, 6, 6);
const sprayMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
const sprayGroup = new THREE.Group();
scene.add(sprayGroup);
const sprayParticles = [];
for (let i = 0; i < sprayCount; i++) {
  const p = new THREE.Mesh(sprayGeo, sprayMat.clone());
  p.position.set(0, -20, 0);
  sprayGroup.add(p);
  sprayParticles.push({ mesh: p, vx: 0, vy: 0, vz: 0, life: Math.random() });
}

const clock = new THREE.Clock();
const flagPos = flagGeo.attributes.position;
const colorAttribute = oceanGeometry.attributes.color;

// Constant forward movement speed
const sailingSpeed = 3.6;
let globalDistance = 0; // Tracks the boat's "travel" distance

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  
  // Continuously advance global distance to create the illusion of endless sailing
  globalDistance += sailingSpeed * delta;

  // The boat stays stationary in the world center while the ocean surface scrolls underneath it
  for (let i = 0; i < posAttr.count; i++) {
    const ox = origCoords[i * 3 + 0];
    const oz = origCoords[i * 3 + 2];
    
    // We add globalDistance to ox to sample the waves further ahead
    const h = getWaterHeight(ox + globalDistance, oz, time);
    posAttr.setY(i, h);

    const swellFactor = THREE.MathUtils.clamp((h + 0.45) / 1.05, 0.0, 1.0);
    const crestFactor = THREE.MathUtils.clamp((h - 0.52) / 0.45, 0.0, 1.0);

    let r = THREE.MathUtils.lerp(0.01, 0.08, swellFactor);
    let g = THREE.MathUtils.lerp(0.48, 0.72, swellFactor);
    let b = THREE.MathUtils.lerp(0.78, 0.94, swellFactor);

    if (crestFactor > 0) {
      r = THREE.MathUtils.lerp(r, 0.98, crestFactor);
      g = THREE.MathUtils.lerp(g, 0.99, crestFactor);
      b = THREE.MathUtils.lerp(b, 1.0, crestFactor);
    }
    oceanColors[i * 3 + 0] = r;
    oceanColors[i * 3 + 1] = g;
    oceanColors[i * 3 + 2] = b;
  }
  colorAttribute.needsUpdate = true;
  oceanGeometry.computeVertexNormals();
  posAttr.needsUpdate = true;

  // Boat is mostly stationary, but bobs with the waves at (0, 0)
  const boatX = 0;
  const boatZ = Math.sin(time * 0.5) * 1.5; // slight gentle swaying side-to-side
  boatGroup.position.x = boatX;
  boatGroup.position.z = boatZ;

  const centerH = getWaterHeight(globalDistance, boatZ, time);
  const bowH    = getWaterHeight(globalDistance + 5.0, boatZ, time);
  const sternH  = getWaterHeight(globalDistance - 5.0, boatZ, time);
  const portH   = getWaterHeight(globalDistance, boatZ - 1.8, time);
  const stbdH   = getWaterHeight(globalDistance, boatZ + 1.8, time);

  boatGroup.position.y = centerH + 0.25;

  const pitch = Math.atan2(bowH - sternH, 10.0);
  boatGroup.rotation.z = pitch * 0.72;

  const roll = Math.atan2(stbdH - portH, 3.6);
  boatGroup.rotation.x = roll * 0.65;

  for (let i = 0; i < flagPos.count; i++) {
    const u = flagPos.getX(i);
    const flutter = Math.sin(u * 2.1 - time * 5.6) * 0.22 * ((u + 2.6) / 5.2);
    flagPos.setZ(i, flutter);
  }
  flagGeo.computeVertexNormals();
  flagPos.needsUpdate = true;

  wakeParticles.forEach((p) => {
    p.life += delta * 0.62;
    if (p.life > 1.0) {
      p.life = 0;
      // Spawn at the back of the boat
      p.x = boatX - 5.8;
      p.z = boatZ;
      p.mesh.position.set(p.x, centerH, p.z);
      p.mesh.scale.set(0.6, 0.6, 0.6);
    } else {
      // Move wake backwards relative to boat speed
      p.x -= sailingSpeed * delta;
      
      // Sample water height taking into account the global offset
      const wH = getWaterHeight(p.x + globalDistance, p.z, time);
      p.mesh.position.y = wH + 0.03;
      p.mesh.position.x = p.x;
      const s = 0.6 + p.life * 4.4;
      p.mesh.scale.set(s, s, s);
      p.mesh.material.opacity = (1.0 - p.life) * 0.45;
    }
  });

  sprayParticles.forEach((sp) => {
    sp.life += delta * 1.75;
    if (sp.life > 1.0) {
      sp.life = 0;
      sp.mesh.position.set(boatX + 5.2, centerH + 0.15, boatZ + (Math.random() - 0.5) * 1.0);
      sp.vx = (Math.random() - 0.3) * 1.9 + (sailingSpeed * 0.2);
      sp.vy = 1.6 + Math.random() * 2.4;
      sp.vz = (Math.random() - 0.5) * 3.2;
    } else {
      sp.vy -= 9.8 * delta;
      // move backwards relatively because the boat is moving forward
      sp.mesh.position.x += (sp.vx - sailingSpeed) * delta;
      sp.mesh.position.y += sp.vy * delta;
      sp.mesh.position.z += sp.vz * delta;
      sp.mesh.material.opacity = (1.0 - sp.life) * 0.75;
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

window.onload = function() {
  animate();
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const notifyForm = document.getElementById('notify-form');
const notifyToast = document.getElementById('notify-toast');
const notifyEmail = document.getElementById('notify-email');

notifyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!notifyEmail.value) return;
  notifyToast.classList.remove('hidden');
  notifyEmail.value = '';
  setTimeout(() => {
    notifyToast.classList.add('hidden');
  }, 4000);
});

// Realistic Audio
let oceanAudio = null;
let isPlayingAudio = false;
const soundBtn = document.getElementById('sound-btn');
const soundLabel = document.getElementById('sound-label');

function toggleDaytimeSeaAudio() {
  if (!oceanAudio) {
    oceanAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/01/18/audio_03d2192135.mp3');
    oceanAudio.loop = true;
    oceanAudio.volume = 0.5;
  }
  if (!isPlayingAudio) {
    oceanAudio.play().catch(e => console.log('Audio play failed:', e));
    isPlayingAudio = true;
    soundLabel.textContent = 'Mute';
    soundBtn.classList.add('bg-white/90');
  } else {
    oceanAudio.pause();
    isPlayingAudio = false;
    soundLabel.textContent = 'Sound';
    soundBtn.classList.remove('bg-white/90');
  }
}
soundBtn.addEventListener('click', toggleDaytimeSeaAudio);
