# ROOM19 project instructions

- Use `qwen/qwen-image-2.1-turbo` through the server-side OpenRouter Image API for all future game image generation and editing, as requested by the owner. Do not silently substitute a model.
- Resident images must use that resident's existing `assets/cast/woman-*.png` portrait as an input reference and preserve her adult age and identity.
- Keep OpenRouter credentials in ignored local environment files and production secret settings only. Never expose them in browser bundles, Git, prompts, logs, or screenshots.
- Preserve the existing photographic Yongsan atmosphere, women-only adult cast, and saved game compatibility.
- New resident base portraits are created only by `scripts/generate-cast.mjs` with the same Qwen model; add a person to `scripts/cast-roster.mjs` and `cast.js` together, and never list a portrait in `cast-ready.js` before its image file exists.
- Room photo requests may only use the server-side `ROOM_STYLES` and `LIGHT_STYLES` whitelists; do not pass client text into the setting part of the prompt.
