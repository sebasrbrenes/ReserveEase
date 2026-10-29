# screenstudio-alt (vendored)

`render.py` and `polish.py` from
[connerkward/screenstudio-alternative-skill](https://github.com/connerkward/screenstudio-alternative-skill)
at commit `61a0b303ce3a73d103398fee7ecb5fa31f8a0994`, unchanged, under its MIT
license (LICENSE). `build.py` uses `render.render()` for the camera: eased zooms
over the full-resolution frames, downscaled with LANCZOS. It only runs ffmpeg
locally; nothing here is part of the landing or the app.
