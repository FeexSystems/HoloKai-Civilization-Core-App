# HoloKai 3D Lab models

Place unit glTF/GLB assets here. Paths are referenced from `client/data/units.ts` as `modelPath` (e.g. `/models/oluwa-core.glb`).

The lab renders **photoreal full-body key art** in an orbital viewer (`FullBodyOrbital`), with optional MP4 plates in dual mode. Full-body PNGs live in `/public/images/vanguard/`.

To attempt loading glTF files at runtime instead, set:

```env
VITE_LAB_LOAD_GLB=true
```

Without that flag, the lab uses full-body orbital key art (avoids 404 noise in dev).