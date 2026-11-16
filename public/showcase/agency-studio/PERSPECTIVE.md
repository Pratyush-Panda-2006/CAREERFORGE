# Perspective case-study cards

Issue #386 adds a CSS perspective wrapper to each featured case-study card.
Pointer distance sets a bounded pitch/roll target; pointer velocity adds bounded
inertia. A damped spring returns the card to rest after leaving, and a decorative
glare moves opposite the tilt. Existing case-study buttons and drawer remain usable.

Device tilt is optional. Press **Enable device tilt** in a secure context; browsers
that require sensor permission request it only from this user gesture. The first
valid reading becomes the neutral orientation. Missing/denied sensors retain
pointer controls. Touch scrolling is not intercepted. Sensor readings stay local.

Pause controls and live reduced-motion preferences reset all transforms. Hidden
pages remove the sensor listener and stop animation; offscreen cards reset.
Frames stop once springs settle. Sensor mode must be enabled again after returning
to a hidden page. No external dependency or permission is needed for pointer mode.

From the repository root:

```sh
node --test public/showcase/agency-studio/perspective.test.mjs
npm run lint
npm run build
npm run dev
```

Open `/showcase/agency-studio/index.html#work`. Move over the cards, pause/resume,
open a case study with its button, and test device tilt on supported hardware.
Tests cover spring convergence, dropped frames, orientation calibration/landscape,
touch scrolling, permission denial, late permission grants, visibility and live
reduced-motion changes. Real hardware sensor availability depends on the browser.
