# Reader Loading and Large Image UI Design

## Scope

- Remove image-loading progress bars in normal and immersive reader modes.
- Keep the immersive auto-turn countdown bar and reduce it to a visible 2 px line.
- Show only a centered page-switch label and request/decode hint while an image is pending.
- Preserve original image quality while reducing large-image decode and gesture-render overhead.
- Keep thumbnail generation text stable across retry attempts.
- Animate a wide archive card appearing from its placeholder without changing grid sizing.
- Make settings help bubbles opaque and rewrite help copy into concise purpose/condition/effect lines.

## Design

Reader loading uses one visual state: `PageImage` supplies the centered two-line status in normal mode; immersive mode renders the same status over a black stage. Fake percentage state and its timer are deleted. Auto-turn remains independent and uses the existing timer with a thinner bar.

Large-image work stays on native browser paths. `PageImage` assigns the resolved URL directly to the mounted image and treats its `load`/`decode()` completion as readiness instead of decoding a second off-DOM image first. Immersive zoom and pan batch transform writes through `requestAnimationFrame`, avoiding a full Reader render for every pointer event. No downsampling or new dependency is introduced.

Queued drawer thumbnails keep the `queued` state during polling. Wide cards use a short compositor-only `transform`/`opacity` reveal with a reduced-motion override. Settings hints use solid theme surfaces, a constrained readable width, preserved line breaks, and revised copy that separates purpose from prerequisites and side effects.

## Verification

- A source-level Node regression check verifies removed fake loading progress, stable queued retries, RAF transform batching, opaque help surfaces, revised copy, and reduced-motion wide-card animation.
- Run existing reader/archive/history checks, production build, and `git diff --check`.
- Review touched UI against current Web Interface Guidelines.

