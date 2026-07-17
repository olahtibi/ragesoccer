# RageSoccer
Using html5 canvas element to implement a basic soccer game.
Inspired by Sensible World Of Soccer: https://en.wikipedia.org/wiki/Sensible_World_of_Soccer

Supported platforms:
- PC: Use arrow keys to control player
- Mobile: Touch screen to control player

With debug mode enabled, press `C` to award the home team a corner on the
current ball side. Press `/` to pause and dump the recent diagnostic log.

The options page can enable throw-ins, corners, and goal kicks as one bundle or
restore the original reflective boundaries. During a throw-in, arrow or touch
direction launches the throw back into play.

Play:
https://olahtibi.github.io/ragesoccer/

Tests:
```
node tests/run.js
```

Structure:
- Runtime code: `src/`
- AI commands: `src/ai/commands/`
- Restart lifecycle and strategies: `src/core/restarts/`
- Rule detectors: `src/world/detectors/`
- Tests: `tests/`
- Images: `assets/images/`
- Styles: `styles/`

Documentation:
- [Architecture](docs/architecture.md)
- [AI system](docs/ai-system.md)
