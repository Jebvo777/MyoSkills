# Orbital engine

Reused with the user’s supplied MyoSkills intro v4. The original bundled Three.js r170,
GLTFLoader, Meshopt decoder, quintic flight curves, exhaust and scene effects are
retained. The countdown and full-page bootstrap are removed. A small export bridge
exposes the original scene building blocks as MYO_ORBIT_VENDOR. No CDN or build is
needed on the hosting server. Source flight/effect modules are retained under
assets/js/orbit-source; the application adapter is assets/js/orbit-experience.js.

Original models are in assets/models, compressed with Meshopt. The THREE and MESHOPT
licence notices supplied with the reference are retained here.
