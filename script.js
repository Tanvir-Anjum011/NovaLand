/**
 * NOVALAND — Interactive 3D Ocean & Procedural Audio Engine
 * Architecture: Modular IIFE with strict encapsulation (Environment, Ocean, Vessel, Particles, Audio)
 */
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    mobileBreakpoint: 768,
    maxPixelRatio: 1.75,
    maxFrameDelta: 0.1,
    sailingSpeed: 3.6,
    sky: {
      backgroundColor: 0xff8c42,
      fogColor: 0xffb787,
      fogDensity: 0.0075
    },
    camera: {
      fov: 45,
      near: 0.1,
      far: 1400,
      y: 11,
      zDesktop: 26,
      zPortrait: 40,
      minDistance: 12,
      maxDistance: 60,
      targetY: 1.8
    },
    ocean: {
      dimension: 320,
      resMobile: 90,
      resDesktop: 180
    },
    particles: {
      wakeCountMobile: 35,
      wakeCountDesktop: 65,
      sprayCountMobile: 20,
      sprayCountDesktop: 45
    }
  });

  /**
   * Builds sky lighting, sun disc, and low-poly cloud clusters.
   */
  function createEnvironment(scene) {
    scene.background = new THREE.Color(CONFIG.sky.backgroundColor);
    scene.fog = new THREE.FogExp2(CONFIG.sky.fogColor, CONFIG.sky.fogDensity);

    const hemiLight = new THREE.HemisphereLight(0xffd1b3, 0x4a7c59, 1.0);
    scene.add(hemiLight);

    const mainSun = new THREE.DirectionalLight(0xff5733, 4.5);
    mainSun.position.set(-60, 15, 30);
    scene.add(mainSun);

    const seaBounceLight = new THREE.DirectionalLight(0x73c9f2, 0.5);
    seaBounceLight.position.set(40, -10, -25);
    scene.add(seaBounceLight);

    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe6b3 })
    );
    sunDisc.position.set(-360, 90, 180);
    scene.add(sunDisc);

    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffb380,
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
  }

  /**
   * Builds the procedural ocean surface and manages wave displacement + vertex coloring.
   */
  function createOcean(scene, isMobile) {
    const oceanRes = isMobile ? CONFIG.ocean.resMobile : CONFIG.ocean.resDesktop;
    const oceanGeometry = new THREE.PlaneGeometry(
      CONFIG.ocean.dimension,
      CONFIG.ocean.dimension,
      oceanRes,
      oceanRes
    );
    oceanGeometry.rotateX(-Math.PI / 2);

    const posAttr = oceanGeometry.attributes.position;
    const vertexCount = posAttr.count;
    const oceanColors = new Float32Array(vertexCount * 3);
    const colorAttribute = new THREE.BufferAttribute(oceanColors, 3);
    oceanGeometry.setAttribute('color', colorAttribute);

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
      opacity: 0.9
    });

    const oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
    scene.add(oceanMesh);

    const origCoords = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      origCoords[i * 3 + 0] = posAttr.getX(i);
      origCoords[i * 3 + 1] = posAttr.getY(i);
      origCoords[i * 3 + 2] = posAttr.getZ(i);
    }

    function getWaterHeight(x, z, time) {
      const swell1 = Math.sin(x * 0.12 - time * 1.9) * 0.46;
      const swell2 = Math.cos(z * 0.15 + time * 1.5) * 0.34;
      const crossSwell = Math.sin(x * 0.08 + z * 0.11 - time * 2.1) * 0.26;
      const microRipples = Math.cos(x * 0.35 - z * 0.22 + time * 3.7) * 0.09;
      return swell1 + swell2 + crossSwell + microRipples;
    }

    function update(globalDistance, time) {
      for (let i = 0; i < vertexCount; i++) {
        const ox = origCoords[i * 3 + 0];
        const oz = origCoords[i * 3 + 2];

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
    }

    return { getWaterHeight, update };
  }

  /**
   * Generates the procedural "COMING SOON" mast flag texture.
   */
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

  /**
   * Builds the sailing vessel, crew, and animated banner flag.
   */
  function createVessel(scene) {
    const boatGroup = new THREE.Group();
    scene.add(boatGroup);

    const hullMat = new THREE.MeshStandardMaterial({ color: 0x092b4c, metalness: 0.65, roughness: 0.25, flatShading: true });
    const waterlineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const teakDeckMat = new THREE.MeshStandardMaterial({ color: 0xb57843, roughness: 0.55, metalness: 0.05 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
    const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x1b4b6b, roughness: 0.08, metalness: 0.95 });
    const stainlessSteelMat = new THREE.MeshStandardMaterial({ color: 0xe6eef5, metalness: 0.95, roughness: 0.12 });

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
    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTexture,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.05
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(-1.8, 6.8, 0);
    boatGroup.add(flagMesh);

    const sailorNavyShirt = new THREE.MeshStandardMaterial({ color: 0x0c2d48, roughness: 0.7 });
    const sailorWhiteHat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    function createSailor(x, y, z, facingAngle) {
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

    const flagPos = flagGeo.attributes.position;

    function update(globalDistance, time, getWaterHeight) {
      const boatX = 0;
      const boatZ = Math.sin(time * 0.5) * 1.5;
      boatGroup.position.x = boatX;
      boatGroup.position.z = boatZ;

      const centerH = getWaterHeight(globalDistance, boatZ, time);
      const bowH = getWaterHeight(globalDistance + 5.0, boatZ, time);
      const sternH = getWaterHeight(globalDistance - 5.0, boatZ, time);
      const portH = getWaterHeight(globalDistance, boatZ - 1.8, time);
      const stbdH = getWaterHeight(globalDistance, boatZ + 1.8, time);

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

      return { boatX, boatZ, centerH };
    }

    return { update };
  }

  /**
   * Builds and updates stern wake rings and bow spray particle pools.
   */
  function createParticles(scene, isMobile) {
    const wakeCount = isMobile ? CONFIG.particles.wakeCountMobile : CONFIG.particles.wakeCountDesktop;
    const wakeGeo = new THREE.RingGeometry(0.4, 1.8, 16);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const wakeGroup = new THREE.Group();
    scene.add(wakeGroup);

    const wakeParticles = [];
    for (let i = 0; i < wakeCount; i++) {
      const mesh = new THREE.Mesh(wakeGeo, wakeMat.clone());
      mesh.position.set(0, -20, 0);
      wakeGroup.add(mesh);
      wakeParticles.push({ mesh, life: i / wakeCount, x: 0, z: 0 });
    }

    const sprayCount = isMobile ? CONFIG.particles.sprayCountMobile : CONFIG.particles.sprayCountDesktop;
    const sprayGeo = new THREE.SphereGeometry(0.1, 6, 6);
    const sprayMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75
    });
    const sprayGroup = new THREE.Group();
    scene.add(sprayGroup);

    const sprayParticles = [];
    for (let i = 0; i < sprayCount; i++) {
      const p = new THREE.Mesh(sprayGeo, sprayMat.clone());
      p.position.set(0, -20, 0);
      sprayGroup.add(p);
      sprayParticles.push({ mesh: p, vx: 0, vy: 0, vz: 0, life: Math.random() });
    }

    function update(delta, time, globalDistance, boatState, getWaterHeight) {
      const { boatX, boatZ, centerH } = boatState;

      for (let i = 0; i < wakeParticles.length; i++) {
        const p = wakeParticles[i];
        p.life += delta * 0.62;
        if (p.life > 1.0) {
          p.life = 0;
          p.x = boatX - 5.8;
          p.z = boatZ;
          p.mesh.position.set(p.x, centerH, p.z);
          p.mesh.scale.set(0.6, 0.6, 0.6);
        } else {
          p.x -= CONFIG.sailingSpeed * delta;
          const wH = getWaterHeight(p.x + globalDistance, p.z, time);
          p.mesh.position.y = wH + 0.03;
          p.mesh.position.x = p.x;
          const s = 0.6 + p.life * 4.4;
          p.mesh.scale.set(s, s, s);
          p.mesh.material.opacity = (1.0 - p.life) * 0.45;
        }
      }

      for (let i = 0; i < sprayParticles.length; i++) {
        const sp = sprayParticles[i];
        sp.life += delta * 1.75;
        if (sp.life > 1.0) {
          sp.life = 0;
          sp.mesh.position.set(boatX + 5.2, centerH + 0.15, boatZ + (Math.random() - 0.5) * 1.0);
          sp.vx = (Math.random() - 0.3) * 1.9 + CONFIG.sailingSpeed * 0.2;
          sp.vy = 1.6 + Math.random() * 2.4;
          sp.vz = (Math.random() - 0.5) * 3.2;
        } else {
          sp.vy -= 9.8 * delta;
          sp.mesh.position.x += (sp.vx - CONFIG.sailingSpeed) * delta;
          sp.mesh.position.y += sp.vy * delta;
          sp.mesh.position.z += sp.vz * delta;
          sp.mesh.material.opacity = (1.0 - sp.life) * 0.75;
        }
      }
    }

    return { update };
  }

  /**
   * Multi-layer procedural pink-noise ocean audio engine (zero external audio files).
   */
  function createAudioEngine(canvas) {
    let audioInitialized = false;
    let audioCtx = null;
    const activationEvents = ['pointerdown', 'touchstart', 'mousedown', 'click'];

    function removeActivationListeners() {
      activationEvents.forEach((evt) => {
        window.removeEventListener(evt, start);
        if (canvas) canvas.removeEventListener(evt, start);
      });
    }

    function start() {
      if (audioInitialized) {
        if (audioCtx && audioCtx.state === 'suspended') {
          const p = audioCtx.resume();
          if (p) {
            p.then(() => {
              if (audioCtx.state === 'running') removeActivationListeners();
            }).catch(() => {});
          }
        } else if (audioCtx && audioCtx.state === 'running') {
          removeActivationListeners();
        }
        return;
      }
      audioInitialized = true;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        audioCtx = new AudioContextClass();
        audioCtx.addEventListener('statechange', () => {
          if (audioCtx.state === 'running') {
            removeActivationListeners();
          }
        });

        if (audioCtx.state === 'suspended') {
          const p = audioCtx.resume();
          if (p) p.catch(() => {});
        } else if (audioCtx.state === 'running') {
          removeActivationListeners();
        }

        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.75, audioCtx.currentTime + 1.2);
        masterGain.connect(audioCtx.destination);

        // 5-second stereo Pink Noise buffer
        const bufferSize = audioCtx.sampleRate * 5;
        const noiseBuffer = audioCtx.createBuffer(2, bufferSize, audioCtx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = noiseBuffer.getChannelData(ch);
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.76160 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
            b6 = white * 0.115926;
          }
        }

        // Layer 1: Deep Ocean Swell
        const swellSource = audioCtx.createBufferSource();
        swellSource.buffer = noiseBuffer;
        swellSource.loop = true;

        const swellFilter = audioCtx.createBiquadFilter();
        swellFilter.type = 'lowpass';
        swellFilter.frequency.setValueAtTime(160, audioCtx.currentTime);
        swellFilter.Q.setValueAtTime(4.0, audioCtx.currentTime);

        const swellLFO = audioCtx.createOscillator();
        swellLFO.frequency.setValueAtTime(0.18, audioCtx.currentTime);
        const swellLFOGain = audioCtx.createGain();
        swellLFOGain.gain.setValueAtTime(90, audioCtx.currentTime);
        swellLFO.connect(swellLFOGain);
        swellLFOGain.connect(swellFilter.frequency);

        swellSource.connect(swellFilter);
        swellFilter.connect(masterGain);
        swellSource.start();
        swellLFO.start();

        // Layer 2: Breaking Crests & Hull Wash
        const washSource = audioCtx.createBufferSource();
        washSource.buffer = noiseBuffer;
        washSource.loop = true;

        const washFilter = audioCtx.createBiquadFilter();
        washFilter.type = 'bandpass';
        washFilter.frequency.setValueAtTime(650, audioCtx.currentTime);
        washFilter.Q.setValueAtTime(1.8, audioCtx.currentTime);

        const washLFO = audioCtx.createOscillator();
        washLFO.frequency.setValueAtTime(0.35, audioCtx.currentTime);
        const washLFOGain = audioCtx.createGain();
        washLFOGain.gain.setValueAtTime(320, audioCtx.currentTime);
        washLFO.connect(washLFOGain);
        washLFOGain.connect(washFilter.frequency);

        const washAmpGain = audioCtx.createGain();
        washAmpGain.gain.setValueAtTime(0.45, audioCtx.currentTime);

        washSource.connect(washFilter);
        washFilter.connect(washAmpGain);
        washAmpGain.connect(masterGain);
        washSource.start();
        washLFO.start();

        // Layer 3: Distant Sea Wind
        const windSource = audioCtx.createBufferSource();
        windSource.buffer = noiseBuffer;
        windSource.loop = true;

        const windFilter = audioCtx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.setValueAtTime(280, audioCtx.currentTime);

        const windLFO = audioCtx.createOscillator();
        windLFO.frequency.setValueAtTime(0.08, audioCtx.currentTime);
        const windLFOGain = audioCtx.createGain();
        windLFOGain.gain.setValueAtTime(120, audioCtx.currentTime);
        windLFO.connect(windLFOGain);
        windLFOGain.connect(windFilter.frequency);

        const windAmpGain = audioCtx.createGain();
        windAmpGain.gain.setValueAtTime(0.35, audioCtx.currentTime);

        windSource.connect(windFilter);
        windFilter.connect(windAmpGain);
        windAmpGain.connect(masterGain);
        windSource.start();
        windLFO.start();
      } catch (err) {
        console.error('Audio initialization error:', err);
      }
    }

    activationEvents.forEach((evt) => {
      window.addEventListener(evt, start, { passive: true });
      if (canvas) canvas.addEventListener(evt, start, { passive: true });
    });

    return { start };
  }

  /**
   * Application entry point.
   */
  function bootstrap() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      aspect,
      CONFIG.camera.near,
      CONFIG.camera.far
    );
    camera.position.set(0, CONFIG.camera.y, aspect < 1 ? CONFIG.camera.zPortrait : CONFIG.camera.zDesktop);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      console.error('WebGL initialization failed:', err);
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = CONFIG.camera.minDistance;
    controls.maxDistance = CONFIG.camera.maxDistance;
    controls.target.set(0, CONFIG.camera.targetY, 0);

    const isMobile = window.innerWidth < CONFIG.mobileBreakpoint;

    createEnvironment(scene);
    const ocean = createOcean(scene, isMobile);
    const vessel = createVessel(scene);
    const particles = createParticles(scene, isMobile);
    const audioEngine = createAudioEngine(canvas);

    const clock = new THREE.Clock();
    let globalDistance = 0;

    function animate() {
      requestAnimationFrame(animate);
      if (document.hidden) return;

      const delta = Math.min(clock.getDelta(), CONFIG.maxFrameDelta);
      const time = clock.getElapsedTime();

      globalDistance += CONFIG.sailingSpeed * delta;

      ocean.update(globalDistance, time);
      const boatState = vessel.update(globalDistance, time, ocean.getWaterHeight);
      particles.update(delta, time, globalDistance, boatState, ocean.getWaterHeight);

      controls.update();
      renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.position.z = camera.aspect < 1 ? CONFIG.camera.zPortrait : CONFIG.camera.zDesktop;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      clock.stop();
    });

    canvas.addEventListener('webglcontextrestored', () => {
      clock.start();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clock.getDelta();
      }
    });

    animate();
    audioEngine.start();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
