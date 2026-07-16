# Architecture

This document explains how RageSoccer is structured, why its boundaries exist,
and how to extend the game without spreading one feature across unrelated
modules.

The architecture is intentionally small. It does not try to reproduce a large
engine or framework. Its purpose is to make ownership obvious, keep frame order
deterministic, and give new game mechanics a predictable place to live.

## Architectural Philosophy

### Prefer explicit ownership over convenient access

Every piece of mutable state should have one clear owner. Other components use
that state through a narrow interface or receive it as an explicit dependency.

Examples:

- `Team` owns its players, selected human player, and score.
- `HumanController` owns keyboard state, touch targets, and player-selection
  hysteresis.
- `MatchFlow` owns the top-level match phase.
- `RestartController` owns the active restart session.
- A restart strategy owns the rules unique to that restart type.

This is why `Stadium` does not expose kickoff methods and `TeamAi` does not read
input globals. Convenient cross-module access tends to turn into hidden
coupling: a future change must then update several modules in the correct order.

**Benefit:** a developer can usually identify the correct change location from
the behavior being changed. Tests can construct that owner directly, and a
feature is less likely to alter unrelated behavior.

### Use orchestration instead of mutual awareness

`Game` is the composition and frame-level orchestration boundary. Components do
not coordinate by reaching sideways into one another. `Game` supplies explicit
context and invokes them in a known order.

For example, AI does not ask the input module whether a key is held. `Game`
updates AI and then lets `HumanController` apply human movement. Likewise,
physics does not inspect `window.game` to decide whether the match is paused;
`Game` simply does not advance physics in that state.

**Benefit:** dependencies remain directional. Frame behavior can be understood
by reading one method, and tests can verify ordering without simulating the
browser.

### Model lifecycle with hierarchical state machines

Not every state belongs at the same level. RageSoccer separates match flow,
restart progress, team tactics, individual assignments, and command execution:

```text
MatchFlow [normalPlay | outOfPlay | restart | paused]
  -> RestartSession [positioning | waitingForInput | inProgress | complete]
    -> TeamAi [kickoffUs | kickoffOpponent | attack | defense]
      -> IndividualAi [inactive | attackBall | moveToPosition]
        -> Command-specific state [approach | detour | shoot | ...]
```

The upper levels answer broad lifecycle questions; lower levels answer local
execution questions. A command never starts a restart, and an individual player
never changes the match phase.

**Benefit:** adding a state at one level does not expand every other state
machine. A future `cornerUs` team state can be introduced without adding a
`corner` branch to `Game.update()`.

### Separate common lifecycle from variable policy

Kickoffs, throw-ins, corners, and goal kicks share a lifecycle:

```text
positioning -> waitingForInput -> inProgress -> complete
```

They differ in ball placement, formations, movement permissions, enforcement,
and completion conditions. `RestartController` implements the common lifecycle;
strategy objects such as `KickoffRestart` implement the variable rules.
Corners, goal kicks, and throw-ins may transition directly from positioning to
in-progress once their taker arrives. Cancelling the remaining positioning does
not snap unfinished players to their targets. AI-owned restarts take this early
transition automatically after the configured opponent restart delay; kickoffs
retain the full lifecycle above.

**Benefit:** future restart mechanics reuse tested lifecycle behavior without
growing a central conditional. Each mechanic can be developed and tested as a
cohesive unit.

### Prefer synchronous results over an event bus

Rule detectors return values to their caller. For example,
`GoalDetector.update()` returns the scoring side, and `Game` applies that result
to the appropriate team. A detected goal also begins a kickoff awarded to the
team that conceded, using the standard restart lifecycle:

```text
goal -> positioning -> waitingForInput -> inProgress -> normalPlay
```

Starting any restart clears held keyboard input, the active touch target, and
the controlled player's velocity. This ensures that play resumes only from
fresh input once the restart taker is ready. Kickoffs still wait for complete
positioning.

The project deliberately avoids a generic observer or event bus at its current
scale. Broadcast events make execution order and ownership harder to see, and
they complicate deterministic debug replay.

**Benefit:** cause and effect remain adjacent in code. A returned result is easy
to test, trace, log, and replay. An event mechanism can still be introduced
later if a domain event gains several genuinely independent consumers.

### Keep browser integration at the edge

The core gameplay objects do not depend on `window.game`. Browser globals are
limited to configuration/bootstrap and the animation-frame shell.
`BrowserInput` converts DOM events into calls on `Game` and `HumanController`.

**Benefit:** gameplay code runs in the Node test harness without a browser, and
DOM concerns cannot leak into AI or physics rules.

### Add abstractions only around proven variation

The restart strategy interface exists because multiple restart types share a
real lifecycle but require different policies. The project does not introduce
a general-purpose entity system, message bus, or dependency container merely
because one might eventually be useful.

**Benefit:** the architecture remains readable and inexpensive to change. New
abstractions must remove concrete duplication or protect a real ownership
boundary.

## Runtime Composition

Runtime settings are exposed through nested configuration groups such as
`pitch`, `physics`, `player`, `ball`, `teams`, `ai`, and `restarts`. Browser
query options retain their original names but are mapped into those groups by
`Configuration`.

`createGame(config)` in `src/core/game.js` is the composition root. It constructs
the world and controllers, connects their dependencies, registers restart
strategies, and creates the initial kickoff session.

```text
Game
├── MatchFlow
│   └── RestartController
│       ├── RestartRegistry
│       ├── CutsceneController
│       └── active restart strategy
├── HumanController
├── TeamAi (home)
├── TeamAi (away)
├── Physics
├── GoalDetector
├── Camera
├── DebugLog
└── Stadium
    ├── Ball
    ├── Team (home)
    └── Team (away)
```

Constructors receive the smallest stable dependencies that let them do their
job. `TeamAi`, for example, receives teams and the ball rather than the whole
`Stadium` or `Game`.

**Benefit:** dependencies are visible at construction time, and isolated tests
do not need to manufacture unrelated objects.

## Frame Lifecycle

The browser shell calls `Game.update()` and `Game.render(ctx)`, then schedules
the next animation frame. `MatchFlow` exposes a generic simulation mode:

- `none`: paused or waiting for restart input; reset the physics clock.
- `ballOnly`: the ball continues beyond the boundary during the dead-ball delay.
- `playersOnly`: a positioning cutscene moves players while the ball is locked.
- `full`: update AI, apply human input, run physics, enforce rules, and detect
  goals or balls leaving play.

For a full simulation frame, the order is:

1. Select the human-controlled player.
2. Update both team AI controllers.
3. Apply human movement intent.
4. Advance physics.
5. Let `MatchFlow` update the active restart after physics.
6. Detect and apply scoring results, then detect out-of-play results if no goal
   occurred.
7. Record a debug snapshot.

The order is part of the architecture, not an incidental implementation detail.
AI clears the controlled player's AI velocity before human input applies the
final movement. Restart enforcement observes the post-physics world.

**Benefit:** competing systems cannot silently overwrite one another in an
order that depends on event timing. Replay and frame-order tests protect this
contract.

## Match And Restart State

### MatchFlow

`MatchFlow` decides whether the match is in normal play, out of play, a restart,
or paused. Pause remembers the previous state so resuming returns to the same
normal-play, out-of-play, or restart session.

It does not implement any restart strategy. It owns the boundary-to-restart
award policy, then delegates the resulting request to `RestartController`,
whose active session provides a simulation mode and eventually reports
completion.

### RestartController

`RestartController.begin(request, context, options)` resolves a strategy from
`RestartRegistry` and creates a session. A request contains facts about one
occurrence:

```js
{
  type: "kickoff",
  awardedTo: "home"
}
```

The controller owns common behavior:

- Assigning the strategy's relative state to each team AI.
- Starting and completing the positioning cutscene.
- Waiting for human input before resuming simulation.
- Asking the strategy which teams may move.
- Enforcing rules and checking completion after physics.
- Returning `MatchFlow` to normal play when complete.

### Restart strategies

A strategy supplies these policies:

```js
Strategy.prototype.createScene = function(context, request) {};
Strategy.prototype.teamAiState = function(team, request) {};
Strategy.prototype.canTeamMove = function(team, request) {};
Strategy.prototype.enforceRules = function(context, request) {};
Strategy.prototype.isComplete = function(context, request) {};
// Optional: interpret generic directional input when play resumes.
Strategy.prototype.resume = function(context, request, direction) {};
```

`KickoffRestart` positions the ball and teams,
assigns `kickoffUs` or `kickoffOpponent` relative to each team, restricts which
team may move, enforces the center-circle rule, and completes once the ball
exceeds the configured minimum velocity.

`ThrowInRestart`, `CornerRestart`, and `GoalKickRestart` reuse the same lifecycle
and shared set-piece positioning. Throw-ins interpret generic directional input
as an inward lofted throw. Corners and goal kicks return to ordinary
player-to-ball contact after positioning. A corner also supplies the awarded
team AI with a central penalty-area target so its taker crosses instead of
shooting directly at goal. Goal kicks explicitly select the formation's
goalkeeper as taker so another nearby player cannot be positioned beside them.

`BoundaryDetector` in `src/world/detectors/` reports the first pitch edge crossed,
its crossing position, and the ball's last-touch side. `MatchFlow` owns the
detector and converts a touchline exit to a throw-in or an end-line exit to
either a corner or goal kick. `Game` invokes detection only after confirming no
goal occurred, preserving scoring priority. Before positioning begins,
`MatchFlow` enters `outOfPlay`: a short configurable delay freezes the players
but selects ball-only physics so the ball visibly carries beyond the line
instead of snapping back immediately.

The `outOfPlayRestartsEnabled` option controls the three restart types as one
bundle. It defaults to enabled. When disabled, physics preserves the original
reflective pitch boundaries and no out-of-play requests are created.

### Adding another restart

To add another restart:

1. Create one strategy implementing the restart policy methods.
2. Add any required relative team AI states and formation behavior.
3. Register the strategy type in the composition root.
4. Have the relevant rule detector return occurrence facts and let `MatchFlow`
   create the restart request.
5. Start the request through `MatchFlow.beginRestart()`.
6. Add strategy and lifecycle integration tests.

Do not add restart-specific branches to `Game.update()`, `Stadium`, or
`BrowserInput`.

## Input And Human Control

`BrowserInput` is a DOM adapter. It records key/touch events, translates screen
touches into world coordinates, handles global commands, and forwards movement
intent.

`HumanController` owns gameplay-level human control:

- Held movement keys.
- The active touch target.
- Selecting the closest home player with hysteresis.
- Stopping the old player when selection changes.
- Applying normalized keyboard or touch velocity.
- Respecting movement permission supplied by match flow.

Team AI only marks `team.humanPlayer` as AI-inactive. It does not inspect input
state or decide whether human control is active.

**Benefit:** keyboard, touch, AI selection, and restart restrictions no longer
form a circular dependency. Alternative input adapters can reuse the same human
controller.

## AI Layers

`TeamAi` makes tactical assignments for an entire team. It chooses attack or
defense during normal play, preserves the assigned relative state during a
restart, selects the away ball attacker, and assigns one command per player.

`IndividualAi` hosts the selected command for one player. Command objects own
their local execution state. For example, `AttackBallCommand` owns whether it is
approaching, detouring, or shooting.

Formation states are relative to the team. During a home kickoff:

```text
Home TeamAi: kickoffUs
Away TeamAi: kickoffOpponent
```

During an away kickoff those values reverse. Relative states let the same team
logic and formation code work for either side.

**Benefit:** team tactics, player assignments, and movement execution can evolve
independently. Command-local state cannot accidentally become shared across
players.

See [AI System](ai-system.md) for command and formation extension details.

## World, Rules, And Rendering

`Stadium` is a world aggregate and renderer. It exposes the ball, teams, and
flattened player collection needed by physics and drawing. It does not own AI,
restart state, or scoring rules.

`Team` owns durable team data. Scores live on teams because a score describes a
team, not the detector that noticed a goal.

`GoalDetector` is a synchronous rule detector. It reports a scoring side once
when the ball enters a goal and prevents duplicate reports while the ball
remains there.

`Camera` reads team scores for its overlay and receives FPS explicitly from
`Game.render()`.

**Benefit:** nouns hold their own durable data, detectors remain reusable and
stateless with respect to match results, and rendering does not reach into
unrelated controllers.

## Debugging And Determinism

`DebugLog` records the match state, active restart type and phase, team scores,
ball and player state, and AI command snapshots. Input events are recorded by
the browser adapter and can be replayed without rendering.

Debug code reads public snapshots rather than command internals. When new state
affects behavior, expose it through the relevant `debugSnapshot()` method.

**Benefit:** regressions can be investigated using the same explicit lifecycle
that drives the game. Hidden callbacks and unordered event delivery do not make
replays diverge from live execution.

## Module And Dependency Rules

The project currently uses classic browser scripts without a build step.
Dependencies must be loaded in order in both `game.html` and `tests/helpers.js`.

When adding a module:

1. Put it in the directory matching its responsibility.
2. Give it one clear owner-level purpose.
3. Inject dependencies through its constructor or update context.
4. Avoid reading `window.game` outside bootstrap code.
5. Add it to browser and test script loading in dependency order.
6. Add focused tests at its public boundary.

The lack of ES modules is a loading constraint, not permission to use arbitrary
globals. Global constructors are used for loading; runtime state still follows
the ownership rules described above.

## Architectural Review Checklist

Before adding a feature, ask:

- Which existing component should own this state?
- Is this a match phase, restart phase, team state, player assignment, or command
  state?
- Can the behavior return a synchronous result instead of mutating another
  module?
- Is variation better expressed as a focused strategy than another central
  conditional?
- Does `Game.update()` remain generic and is its ordering still explicit?
- Can the new logic be tested without `window.game` or DOM events?
- Does debug output expose enough state to reproduce a failure?

If ownership is unclear, resolve that before implementation. Most regression
bugs in stateful games come from two systems believing they control the same
state or velocity at the same time.
