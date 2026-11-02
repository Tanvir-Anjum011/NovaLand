<div align="center">

  <!-- Animated Main Title -->
  <img src="https://readme-typing-svg.demolab.com?font=Plus+Jakarta+Sans&weight=800&size=34&duration=3000&pause=1000&color=0066FF&center=true&vCenter=true&multiline=false&width=520&height=65&lines=NOVALAND+-+COMING+SOON" alt="NOVALAND - COMING SOON" />

</div>

---

## Overview

**NOVALAND** ([novaland.store](https://novaland.store)) is an interactive 3D WebGL teaser experience built with **Three.js** and the **Web Audio API**. It renders a real-time sunset ocean scene with procedural wave physics, a buoyant sailing vessel flying a cloth-simulated banner, dynamic wake and bow-spray particle systems, and a multi-layer procedural ocean soundscape—all with zero external 3D model or audio file dependencies.

## Key Features

- **Procedural Ocean Simulation:** Multi-swell sine/cosine wave displacement with real-time vertex normal recomputation and dynamic crest foam vertex coloring.
- **Buoyancy & Cloth Physics:** Four-point wave sampling (bow, stern, port, starboard) driving vessel pitch, roll, and heave alongside a vertex-animated mast banner generated on an offscreen HTML5 2D canvas.
- **Procedural Web Audio Engine:** Three-layer stereo pink-noise synthesizer (Deep Ocean Swell, Breaking Crests & Hull Wash, and Distant Sea Wind) modulated via low-frequency oscillators (LFOs) and biquad filters.
- **Mobile & Desktop Adaptive:** Automatically scales ocean mesh resolution, pixel ratio, camera framing, and particle pool sizes based on viewport dimensions.
- **Hardened Security Posture:** Content Security Policy (CSP), Subresource Integrity (SRI), strict referrer policy, zero global scope pollution, and automatic event listener cleanup.

## Architecture

The client runtime in [`script.js`](script.js) is encapsulated inside a strict-mode modular IIFE organized into isolated domain factories:

| Module | Responsibility |
| :--- | :--- |
| `CONFIG` | Immutable (`Object.freeze`) configuration for camera, lighting, ocean resolution, and particle budgets. |
| `createEnvironment` | Configures scene fog, hemisphere/directional lighting, sun disc, and low-poly cloud clusters. |
| `createOcean` | Manages the `MeshPhysicalMaterial` ocean plane, wave height evaluation (`getWaterHeight`), and per-frame vertex updates. |
| `createVessel` | Builds the procedural hull, deck, cabin, crew, and offscreen 2D canvas flag texture, updating vessel buoyancy and cloth flutter each frame. |
| `createParticles` | Object-pooled stern wake rings and bow spray particles updated without runtime garbage collection spikes. |
| `createAudioEngine` | Synthesizes 3-layer stereo pink noise via Web Audio API and detaches unlock listeners once audio is active. |
| `bootstrap` | Initializes WebGL context safely, manages `resize`, `visibilitychange`, and `webglcontextlost` lifecycle events, and drives the clamped render loop. |

## Project Structure

```text
NovaLand/
├── .gitignore                        # Git ignore rules for OS, IDEs, logs, and secrets
├── CNAME                             # Custom domain configuration (novaland.store)
├── README.md                         # Project documentation
├── index.html                        # Entry document with CSP, SRI, Open Graph, and HUD markup
├── style.css                         # CSS custom properties, layout reset, and HUD styling
├── script.js                         # Modular 3D scene & procedural Web Audio engine
└── novaland-favicon/                 # Multi-resolution app icons & Web App Manifest
    ├── favicon.svg
    ├── favicon.ico
    ├── favicon-16.png
    ├── favicon-32.png
    ├── favicon-180.png
    ├── favicon-192.png
    ├── favicon-512.png
    └── site.webmanifest
```

## Local Development

Because the project requires no build step or bundler, you can serve the repository root using any static HTTP server:

```bash
# Using Python 3
python3 -m http.server 8080

# Or using Node.js (npx)
npx serve .
```

Then open `http://localhost:8080` in your browser.
