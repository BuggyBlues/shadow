# Shadow Promo Video

Remotion source for the new Shadow / 虾豆 promotional video.

The film replaces the previous README animated walkthrough. It is now designed as an
image-sequencing project: generated campaign images, product screenshots, and the project logo are
composited in Remotion with motion, overlays, and export presets.

```bash
pnpm --filter @shadowob/promo sync-assets
pnpm --filter @shadowob/promo dev
pnpm --filter @shadowob/promo still
pnpm --filter @shadowob/promo render
```

Outputs are written to `apps/promo/out/`.

## Asset Slots

The current tracked assets in `public/materials` are placeholders. Replace them only after the visual
style is approved.

| Slot | File | Purpose |
|---|---|---|
| 1 | `public/materials/01-kingdom.svg` | Hero image for the AI kingdom concept. |
| 2 | `public/materials/02-cloud.svg` | Cloud/runtime operations image. |
| 3 | `public/materials/03-collaboration.svg` | Product collaboration surface image. |
| 4 | `public/materials/04-builder.svg` | Developer / AI Builder workflow image. |
| 5 | `public/materials/05-endcard.svg` | Final brand end card. |

`pnpm promo:sync-assets` refreshes `public/brand/Logo.svg` from `apps/web/public/Logo.svg` and copies
available product screenshots into ignored `public/product/` slots for local experiments.

## Style Approval

Generated material images should be approved before replacing the placeholders. The likely choices are:

- clean product editorial: realistic device/UI compositions, restrained color, high trust;
- cinematic cloud kingdom: more atmospheric, stronger visual metaphor, higher brand emotion;
- technical builder deck: diagrams, terminals, product UI, and less metaphor.
