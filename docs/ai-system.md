# AI System

This document describes the current AI architecture and the steps for extending it. The game uses plain browser-loaded JavaScript, so all AI constructors and helpers are global and must be loaded in dependency order from `game.html` and `tests/helpers.js`.

## Runtime Flow

AI updates are driven once per frame from `src/core/game.js`:

1. `renderNewFrame()` calls `window.game.updateAi()`.
2. `Game.updateAi()` delegates to `Stadium.updateAi()`.
3. `Stadium.updateAi()` updates each `Team`.
4. `Team.updateAi()` delegates to `TeamAi.update()`.
5. `TeamAi` chooses a team state, assigns one command per player, then calls `IndividualAi.update(context)`.
6. `IndividualAi` dispatches to the active command object.

The frame then applies human input and physics. This order matters: team AI selects the controlled home player before input code writes human velocity.

## Team AI

`src/ai/teamAi.js` owns team-level decision making.

Team state is one of:

- `kickoffUs`: home/human team has kickoff.
- `kickoffOpponent`: away/opponent team has kickoff.
- `defense`: ball is in the team's own half.
- `attack`: ball is in the opponent half.

Kickoff states are initial `TeamAi` states derived from `config.kickoffSide`.
They are kept until `Stadium.updateKickoff()` sees the ball moving faster than
`config.minVelocity`; ball position never transitions a team back into kickoff.
Formation targets come from `src/ai/formation.js`:

```js
var targets = this.formation.positions(this.state, this.team.side, this.team.players.length);
```

For each player, `TeamAi.update()` assigns a command:

- Home team closest selected player: `inactive`
- Away team selected ball attacker: `attackBall`
- Other players: `moveToPosition`

During kickoff, the non-kicking team is assigned `inactive` for every player
until kickoff is complete.

The home selected player becomes `team.humanPlayer`. If keyboard or touch input is active, AI does not zero that player's velocity; input updates it later in the frame.

## Individual AI

`src/ai/individualAi.js` is a command host. It owns shared context and helper methods, but command-specific state lives inside command objects.

`IndividualAi` owns:

- `config`, `team`, `player`
- current command name
- current target
- active command object
- shared movement/debug helpers

Shared helpers include:

- `moveTo(target)`: sets velocity toward a target and returns `moving` or `stopped`.
- `stop()`: zeros player velocity and returns `stopped`.
- `toOpponentGoal(ballPosition)`: returns a normalized vector from the ball toward the opponent goal.
- `isAlignedBehindBall(ballPosition, toGoal)`: checks attack alignment using radians.
- `draw(ctx)`: draws the current movement debug line when `sPos` and `tPos` are set.
- `debugSnapshot()`: returns the public AI debug shape.

`IndividualAi` should not store command-local state such as `commandState`, orbit direction, timers, or tactical sub-states. Put those on the command object.

## Commands

Commands live in `src/ai/commands/`.

Current commands:

- `inactiveCommand.js`: selected home human player, no AI velocity changes.
- `moveToPositionCommand.js`: move to a formation target.
- `attackBallCommand.js`: away attacker approaches, detours, or shoots through the ball.
- `commandRegistry.js`: creates one command instance per `IndividualAi`.

Command objects use this API:

```js
Command.prototype.update = function(ai, context) {
  // required
};

Command.prototype.reset = function(ai) {
  // optional, called when switching away from this command
};

Command.prototype.debugSnapshot = function(ai) {
  // optional, returns command-specific debug fields
};
```

Each `IndividualAi` gets its own command instances:

```js
function createIndividualAiCommandRegistry() {
  return {
    inactive: new InactiveCommand(),
    moveToPosition: new MoveToPositionCommand(),
    attackBall: new AttackBallCommand()
  };
}
```

This keeps command state per player. For example, each attacker has its own `AttackBallCommand.attackOrbitDir`.

## Debug Data

Debug logging depends on `debugSnapshot()`, not direct internal fields. Keep this shape stable:

```js
{
  command: "attackBall",
  state: "detour",
  target: Vector2d,
  attackOrbitDir: 1,
  teamState: "attack"
}
```

`TeamAi.debugSnapshot()` appends `teamState` to each `IndividualAi` snapshot. `src/core/debugLog.js` records these snapshots in debug frames.

When adding a command, expose only useful public/debug data from `debugSnapshot()`. Do not require callers to inspect command internals directly.

## Formation

`src/ai/formation.js` maps team state, side, and team size to target positions. It supports team sizes from 1 to 5.

Formation positions are mirrored by side:

- Home attacks toward the top goal.
- Away attacks toward the bottom goal.

`TeamAi` uses formation targets for every player not assigned to human control or direct ball attack.

## Math Conventions

Angle math uses radians everywhere.

Use `src/math/mathlib.js` helpers:

- `computeAngleRadians(x, y)`: angle in `0..2π`.
- `angleDeltaRadians(targetAngle, currentAngle)`: shortest signed delta in `-π..π`.
- `vectorLength(x, y)`.
- `distanceSquared(position1, position2)`.
- `normalizeVector(x, y, fallbackX, fallbackY)`.
- `vectorFromAngleRadians(angle, radius)`.

Comments may include degree equivalents for readability, but runtime angle values should be radians.

## Adding A New Command

To add a command:

1. Create `src/ai/commands/myCommand.js`.
2. Define a constructor in PascalCase, for example `MyCommand`.
3. Store command-private state on `this`, for example `this.state = "waiting"`.
4. Implement `update(ai, context)`.
5. Add `reset(ai)` if state must be cleared when the command changes.
6. Add `debugSnapshot(ai)` if the command has useful debug fields.
7. Register it in `createIndividualAiCommandRegistry()`.
8. Add a `<script>` tag in `game.html` before `commandRegistry.js`.
9. Add the script path in `tests/helpers.js` before `commandRegistry.js`.
10. Assign the command from `TeamAi.update()` or another team-level decision.
11. Add focused tests under `tests/ai/commands/`.

Example skeleton:

```js
var MarkOpponentCommand = function() {
  this.state = "tracking";
  this.markedPlayer = null;
};

MarkOpponentCommand.prototype.reset = function() {
  this.state = "tracking";
  this.markedPlayer = null;
};

MarkOpponentCommand.prototype.update = function(ai, context) {
  this.markedPlayer = context.opponentTeam.players[0];
  this.state = ai.moveTo(this.markedPlayer.position);
};

MarkOpponentCommand.prototype.debugSnapshot = function() {
  return {
    state: this.state
  };
};
```

## Adding Team-Level Behavior

If the new behavior requires choosing which player should run a command, change `TeamAi` first.

Typical extension points:

- Add selection logic, similar to `selectedBallAttacker()`.
- Add a new team state in `nextState()` only if formation or command assignment genuinely needs it.
- Add command assignment in the `TeamAi.update()` player loop.
- Add config values in `src/core/configuration.js` for tunable distances, angles, or hysteresis.

Keep team-level choices in `TeamAi`; keep per-player execution in commands.

## Testing Checklist

When changing AI:

- Add command-level tests for command state, target, velocity, reset behavior, and debug snapshot fields.
- Add `TeamAi` tests when command assignment or player selection changes.
- Add `Formation` tests when target positions change.
- Add `DebugLog` tests if the snapshot shape changes.
- Run:

```sh
node tests/run.js
```
