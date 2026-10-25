# ROOM19 0.4 image credits

- seoul-photo.jpg: actual Seoul photograph by Yohan Cho, Unsplash. https://unsplash.com/photos/lighted-city-skyline-at-night-Mwvhyd22Lyw . Unsplash License: https://unsplash.com/license . Downloaded 2026-10-25. Photographer credit is visible in the game.
- residents-cutout.png: built-in ImageGen background-extraction edit of the project's existing fictional adult homewear-v2.png. 2048×768 RGBA; 678,578 fully transparent pixels verified. Original figures retained.
- Existing room plates and characters are photorealistic generated assets, not photographs of real residents. See LIVE-ASSETS.md and PROVENANCE.md.

## Final edit prompt (built-in ImageGen)
Use case: background-extraction. Edit target: supplied eight-person full body sprite sheet. Remove ONLY background, keep all eight fictional adults, their faces, modest clothing, poses, relative positions, scale, canvas 2048x768 and full bodies identical. Genuine transparent alpha everywhere outside each person including gaps between arms and bodies. No floor, no cast shadows, no gray background, no checkerboard baked in. This is a production game cutout atlas, eight separate non-overlapping full figures aligned exactly as source. Do not crop heads or slippers.

## Motion
Actors now translate as one intact cutout with subtle whole-body movement. This deliberately avoids synthetic joint rotations. True walking/sitting pose sequences require additional matched photographic/3D animation assets.

## 0.4.1 individual cast
Eight new fictional adult residents were generated independently with built-in ImageGen. Runtime actors and portraits now load assets/cast/man-01.png through man-04.png and woman-01.png through woman-04.png. Every file is 1024×1536 RGBA with verified transparent pixels. The prior group atlas is retained for historical reference but is no longer used by the live game. The complete per-person prompts are in cast/PROMPTS.md. Each resident receives a saved visualId; least-used selection distributes the eight appearances, with repeats possible when a gender pool exceeds four people.
