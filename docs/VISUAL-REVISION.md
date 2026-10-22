# Visual revision — 22.10.2026

Based on all fifteen supplied screenshots and the supplied MyoSkills intro v4.

- The five-stage route is a responsive ordered timeline. The connector and rocket
  occupy their own rail, clear of text. Scroll position controls progress in both
  directions. The central dental constellation remains as the sticky visual.
- Journey and service cards use four new coherent pearl / mint / lilac illustrations,
  consistent baselines, image spaces and icon sizes.
- The doctor feature combines the orbital medical station with a readable console,
  filling the composition rather than leaving an empty right-hand area.
- Six labelled fictional interface reviews are shown in demo mode. Real approved
  reviews are retained. The carousel supports arrows, keyboard, touch and dragging.
- The Star Child is a complete articulated Three.js constellation figure. Arm,
  elbow, wrist, hand and fingers form one hierarchy. No bitmap pieces are cut out.
- A full flyby scene uses the supplied intro’s rocket, six planet models, smooth
  quintic trajectories, engine plume, landing and star effects. Authentication and
  the patient cockpit use the same original models. Scenes lazy-load, pause out of
  view and in hidden tabs, and retain an image fallback. Reduced motion is respected.
- Pointer tilt is damped; jaw drift follows elapsed time. Background stars are
  quieter so they do not compete with content.
- Header contrast, search and language sizes, demo labels, mission metadata,
  empty-state alignment, date-select spacing, photo-grid spacing and referral rows
  are corrected. The missing direction icon had a duplicated file extension.

## Assets

New generated assets: assets/images/route-observatory.webp, video-relay.webp,
care-constellation.webp and orbital-medical-station.webp. Built-in image generation
was used; all prompts are in assets/images/orbit-prompts.json. The WebP exports
preserve transparency. The original PNGs are not required for hosting.

The supplied rocket and planet GLBs are in assets/models. The source effects and
flight modules are retained under assets/js/orbit-source. The prebundled local
engine, Three.js and Meshopt licence notices are under assets/vendor. No external
CDN, npm install or build is required on shared hosting. The server CSP permits
WebAssembly compilation for the bundled Meshopt decoder without allowing JS eval.

## Installation

Replace application files while preserving config.local.php and storage/files.
No database structure or existing patient data is changed. No SQL is required.
Demo review examples are presentation data, not fabricated database submissions.
Per the user request, no separate test or browser verification run was performed.
