# Formation-Based AI Phase 1.0 Implementation Plan

## Goal

Replace the current hybrid per-player AI with a smaller formation-based AI built around:

- team-level state and command assignment in `game/teamAi.js`
- individual command execution in `game/individualAi.js`
- formation target generation in `game/formation.js`

Phase 1.0 should be intentionally simple. It should create the architecture for later phases without carrying over aiming, detours, position swapping, advanced goalie behavior, aerial prediction, or command hysteresis.

## Constants

Add explicit phase 1.0 constants to `Configuration`:

- `aiKickoffSpotRadius = 5`
- `aiTargetReachedRadius = 1`
- `aiCenterY = config.initialBallPosition.y`

Do not use `config.stadiumHeight / 2` for AI half detection. The pitch image is not symmetric; the center line for AI state decisions should come from the initial ball position.

Phase 1.0 should not use an arrival slow radius. Commands either move at team speed toward the target or stop when the target is reached.

## Phase 1.0 Behavior

### Team AI States

`TeamAi` has three states:

- `kickoff`
- `attack`
- `defense`

State selection is based only on ball position:

- `kickoff`: ball is still at the configured initial ball position.
- `attack`: ball is in the opponent half.
- `defense`: ball is in the team's own half.

Kickoff can end as soon as the ball moves more than `config.aiKickoffSpotRadius` away from `config.initialBallPosition`.

Half detection uses `config.aiCenterY`:

- home own half: `ball.position.y > config.aiCenterY`
- home opponent half: `ball.position.y < config.aiCenterY`
- away own half: `ball.position.y < config.aiCenterY`
- away opponent half: `ball.position.y > config.aiCenterY`

State transition graph:

```text
                          ball in opponent half
                    +-----------------------------+
                    |                             v
              +----------+   ball leaves     +----------+
              | kickoff  |  kickoff spot     |  attack  |
              +----------+ ----------------> +----------+
                    |                             ^  |
                    | ball in own half            |  |
                    v                             |  |
              +----------+                        |  |
              | defense  | ----------------------+  |
              +----------+   ball in opponent half  |
                    ^                               |
                    |                               |
                    +-------------------------------+
                              ball in own half
```

Transition table:

| Current state | Condition | Next state |
| --- | --- | --- |
| `kickoff` | ball is still at kickoff spot | `kickoff` |
| `kickoff` | ball is in own half | `defense` |
| `kickoff` | ball is in opponent half | `attack` |
| `defense` | ball is in own half | `defense` |
| `defense` | ball is in opponent half | `attack` |
| `attack` | ball is in opponent half | `attack` |
| `attack` | ball is in own half | `defense` |

When the ball is exactly on `config.aiCenterY`, keep the current `attack` or `defense` state. If the current state is `kickoff`, choose `attack` after the kickoff threshold is crossed. This keeps the phase 1.0 state machine deterministic without adding hysteresis.

### Team Commands

`TeamAi.update()` is responsible for:

1. Updating its own state.
2. Requesting formation positions for the current state, side, and team size.
3. Selecting the teammate closest to the ball.
4. Assigning one command to each `IndividualAi`.
5. Updating each `IndividualAi`.

For the human-controlled team:

- The closest home player becomes `team.humanPlayer`.
- Stadium-level human-player access returns `homeTeam.humanPlayer`; do not maintain a separate mutable `stadium.humanPlayer` value.
- That player's command is `inactive`.
- That player's velocity is set to zero immediately when the AI update selects them.
- All other home players receive `moveToPosition`.

If keyboard or touch control is currently active, `TeamAi` still owns human-player selection but should not zero the selected player's velocity. `io/io.js` applies input to the already-selected `stadium.humanPlayer` after `TeamAi` updates. Off-ball teammates should still receive `moveToPosition`.

For the opponent team:

- The closest away player receives `attackBall`.
- All other away players receive `moveToPosition`.

There is no hysteresis or stickiness in phase 1.0. Closest-player selection is recalculated each update.

### Individual Commands

`IndividualAi` supports three commands:

- `moveToPosition`: move in a straight line to the assigned target.
- `attackBall`: move in a straight line to the ball.
- `inactive`: do nothing.

`attackBall` should not directly kick the ball. It only moves the player toward the ball. Kicking remains a physics responsibility through ball-player contact resolution.

`moveToPosition` and `attackBall` have the same command-state graph. The only difference is how the target is chosen:

- `moveToPosition` target: assigned formation position.
- `attackBall` target: current ball position.

`moveToPosition` state transition graph:

```text
                 target not reached
            +-------------------------+
            |                         v
       +---------+   target reached  +---------+
       | moving  | ----------------> | stopped |
       +---------+                   +---------+
            ^                             |
            |                             |
            +-----------------------------+
              target changes and is not reached
```

`attackBall` state transition graph:

```text
                 ball target not reached
            +------------------------------+
            |                              v
       +---------+   ball target reached  +---------+
       | moving  | ---------------------> | stopped |
       +---------+                        +---------+
            ^                                  |
            |                                  |
            +----------------------------------+
              ball moves and target is not reached
```

For both commands:

- `moving`: set player velocity toward the current target.
- `stopped`: set player velocity to zero.
- A command starts in `moving` if the target is not reached.
- A command starts in `stopped` if the target is already reached.
- Reassigning the same command with a new unreached target transitions back to `moving`.

Use `config.aiTargetReachedRadius` to decide whether a target has been reached. Do not use a slow radius in phase 1.0.

### Formation Rules

`Formation` returns an array of target positions indexed by teammate index. Phase 1.0 does not reassign positions by nearest player.

Supported team sizes:

- `1`: `0-0-1`
- `2`: `1-0-1`
- `3`: `1-1-1`
- `4`: `1-2-1`
- `5`: `1-2-2`

Roles are only used internally by the formation script to choose slot positions. In phase 1.0, goalies are not behavior-special; they simply move to their formation target.

Formation shape rules:

- `kickoff`: all non-kickoff players stay in their own half; one attacker is positioned near the kickoff area.
- `defense`: spread the shape across the playable pitch, shifted slightly toward the team's own goal.
- `attack`: spread the shape across the playable pitch, shifted slightly toward the opponent goal.
- goalies stay near their own goal in all states.

The formation function should mirror home and away sides consistently rather than duplicating unrelated constants.

## Proposed Files

### `game/formation.js`

Responsibilities:

- Define formation slot layouts for team sizes 1 through 5.
- Convert team state, side, and team size into indexed target positions.
- Provide kickoff positions used by `Team.createPlayers()` for initial player placement.
- Clamp targets to the playable field if needed.
- Keep the module mostly pure: no mutation of players, ball, or teams.

Suggested public API:

```js
var Formation = function(config) {
  this.config = config;
};

Formation.prototype.positions = function(state, side, teamSize) {
  // returns [Vector2d, ...]
};
```

### `game/individualAi.js`

Responsibilities:

- Store the controlled player.
- Store the current command and target.
- Execute the current command each update.
- Provide simple movement helpers.
- Track debug start/target positions for paused debug drawing.
- Preserve the existing AI debug feature by drawing a line from the player's command start position to the current command target for movement commands.

Suggested public API:

```js
var IndividualAi = function(config, team, player) {
  this.config = config;
  this.team = team;
  this.player = player;
};

IndividualAi.prototype.setCommand = function(command, target) {};
IndividualAi.prototype.update = function(context) {};
IndividualAi.prototype.draw = function(ctx) {};
```

### `game/teamAi.js`

Responsibilities:

- Own the team state machine.
- Internally own the team's `IndividualAi` instances without exposing them as public API.
- Select closest teammate to ball.
- Assign commands to individuals.
- Update `team.humanPlayer` for the home team.
- Preserve the existing AI debug feature by delegating debug drawing internally.

Suggested public API:

```js
var TeamAi = function(config, stadium, team, opponentTeam) {
  this.config = config;
  this.stadium = stadium;
  this.team = team;
  this.opponentTeam = opponentTeam;
};

TeamAi.prototype.update = function() {};
TeamAi.prototype.draw = function(ctx) {};
```

`TeamAi` should not expose its internal `IndividualAi` collection. Tests should verify behavior through team/player state, commands only when exposed through a narrow test helper is unavoidable, and debug drawing side effects.

### `game/team.js`

Responsibilities after the rewrite:

- Create players from kickoff formation positions.
- Attach to stadium and opponent team.
- Own a single `teamAi` instance.
- Delegate AI update/draw to `teamAi`.
- Keep `findClosestPlayerToBall` or move equivalent logic into `TeamAi`.

Remove role assignment methods once `TeamAi` owns command assignment.

Do not keep `Team.selectHumanPlayer()` or `Stadium.selectHumanPlayer()`. Human-player selection belongs to `TeamAi` only.

### `io/io.js`

Responsibilities after the rewrite:

- Read `stadium.humanPlayer`.
- Apply keyboard velocity to the selected human player.
- Keep touch-target continuation and arrival stopping.
- Never choose or assign the human player.

### `game/game.js`

Responsibilities after the rewrite:

- Orchestrate frame order only.
- Run AI before human input so `TeamAi` selects `team.humanPlayer`, then `io` applies input to that selected player, then physics advances.
- Do not contain human-player selection or touch-control logic.

### `game/ai.js`

Delete the current file during the phase 1.0 rewrite. Remove it from browser script loading, test helper loading, and any dead references.

## Test Plan

Delete and replace current AI/team tests that assert the old role-based behavior.

### New `tests/formation.test.js`

Cover:

- returns exactly `teamSize` positions for sizes 1 through 5
- home and away positions are mirrored into correct halves
- kickoff includes one attacker near kickoff area
- defense shifts toward own goal
- attack shifts toward opponent goal
- goalie slot remains near own goal for sizes that include a goalie
- formation and team state logic use `config.aiCenterY`, not `config.stadiumHeight / 2`

### New `tests/individualAi.test.js`

Cover:

- `moveToPosition` sets velocity toward target
- `moveToPosition` stops at/near target
- `attackBall` sets velocity toward ball
- `attackBall` stops at/near target
- `inactive` leaves velocity unchanged
- debug draw has start and target positions after movement command

### New `tests/teamAi.test.js`

Cover:

- state becomes `kickoff` near initial ball position
- state becomes `attack` when ball is in opponent half
- state becomes `defense` when ball is in own half
- state uses `config.aiCenterY` for half detection
- home team assigns `inactive` to closest player
- home team sets the selected human player's velocity to zero
- home team assigns `moveToPosition` to other players
- away team assigns `attackBall` to closest player
- away team assigns `moveToPosition` to other players
- team AI disabled skips team AI updates
- tests do not depend on public access to `TeamAi` internals

### Existing Tests To Update

- `tests/helpers.js`: load new AI scripts in browser order.
- `tests/run.js`: include the new test files and remove old AI tests if replaced.
- `tests/html.test.js`: assert new script tags if script coverage becomes more specific.
- `tests/team.test.js`: keep only player creation, attach, and delegation tests that still apply.
- `tests/stadium.test.js` and `tests/game.test.js`: update only if they reference old AI controller fields.
- remove tests that depend on `team.aiControllers`, role assignment, or `game/ai.js`.

## Browser Script Order

Because the project loads scripts directly, add new files before code that constructs them.

Recommended `game.html` order:

1. math/config/core model files
2. `game/formation.js`
3. `game/individualAi.js`
4. `game/teamAi.js`
5. `game/team.js`
6. stadium/game/physics/io files

Mirror the same order in `tests/helpers.js`.

## Out Of Scope For Phase 1.0

- aiming shots toward goal
- detouring around the ball
- orbiting / behind-ball alignment
- position swapping
- closest-player hysteresis
- special goalie challenge behavior
- aerial ball prediction
- off-ball spacing from ball or teammates
- advanced attack/defense state transitions
- set pieces other than the simple kickoff formation state
- public access to `TeamAi`'s internal `IndividualAi` objects

## Implementation Sequence

1. Add `Formation` with tests.
2. Add `IndividualAi` with tests.
3. Add `TeamAi` with tests using simple stub players/ball where practical.
4. Refactor `Team` to own `teamAi` instead of `aiControllers`.
5. Update `Stadium`, `Game`, script loading, and test helpers for the new files.
6. Delete `game/ai.js` and clean up dead references.
7. Remove or replace old role-based AI tests.
8. Run `node tests/run.js`.
9. Manually open `game.html` and verify basic play:
   - home closest player is controllable
   - other home players hold formation
   - away closest player chases the ball
   - other away players hold formation
