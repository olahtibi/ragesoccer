# Formation-Based AI Phase 1.1 Implementation Plan

## Goal

Improve the `attackBall` individual command so the AI tries to kick the ball toward the opponent goal instead of simply running straight at the ball.

Phase 1.1 adds:

- aiming
- detour / behind-ball positioning

Phase 1.1 should not change:

- team AI states
- formation positions
- home human-player selection
- away ball-attacker selection
- position swapping
- role-based tactical pressure

## Current Phase 1.0 Baseline

`TeamAi` selects one away `ballAttacker`. That individual receives `attackBall`; all other away players receive `moveToPosition`.

`IndividualAi.attackBall` currently:

1. Uses current ball position as target.
2. Moves in a straight line to the ball.
3. Lets physics handle ball-player contact and kicking.

This is simple, but shot direction depends only on the contact direction, so the attacker may kick sideways, backward, or into a wall.

## Desired Phase 1.1 Behavior

`attackBall` should become a small command-specific state machine:

- `approach`
- `detour`
- `shoot`

The command still does not directly apply a kick. It only chooses movement targets. Physics remains responsible for the actual ball impulse.

## AttackBall State Graph

```text
              far and not aligned
                    +-----+
                    |     |
                    v     |
              +----------+   close and not aligned   +----------+
              | approach | -------------------------> |  detour  |
              +----------+                            +----------+
                    |                                      |  ^
                    | aligned behind ball                  |  | still close
                    v                                      |  | and not aligned
              +----------+ <-------------------------------+  |
              |  shoot   |       aligned behind ball          |
              +----------+                                    |
                    |                                         |
                    | no longer aligned                       |
                    +-----------------------------------------+
                       choose approach or detour by distance
```

Transition table:

| Current state | Condition | Next state |
| --- | --- | --- |
| `approach` | aligned behind ball | `shoot` |
| `approach` | close to ball and not aligned | `detour` |
| `approach` | far from ball and not aligned | `approach` |
| `detour` | aligned behind ball | `shoot` |
| `detour` | still close and not aligned | `detour` |
| `detour` | no longer close to ball | `approach` |
| `shoot` | still aligned behind ball | `shoot` |
| `shoot` | no longer aligned behind ball | `approach` or `detour`, based on distance to ball |

## State Meanings

### `approach`

Move toward a setup area near the ball.

Use this when:

- the attacker is far from the ball
- the attacker is not yet close enough for meaningful detour logic

The approach target can be the ball position in the simplest implementation, but a better target is the behind-ball point described below.

### `detour`

Move around the ball instead of straight through it.

Use this when:

- the attacker is close to the ball
- the attacker is not aligned behind the ball relative to the opponent goal

The detour target should be a point on a small circle around the ball. This prevents the attacker from clipping the ball from the wrong side before it is aimed.

### `shoot`

Run through the ball toward the opponent goal.

Use this when:

- the attacker is aligned behind the ball within the aiming tolerance

The shoot target is beyond the ball in the direction of the opponent goal. The attacker collides with the ball while moving goalward; physics applies the kick.

## Geometry

Define opponent goal center by team side:

- home shoots toward top goal
- away shoots toward bottom goal

For a given attacker:

- `toGoal = normalize(opponentGoalCenter - ball.position)`
- `behindBall = ball.position - toGoal * setupDistance`
- `shootThrough = ball.position + toGoal * runThroughDistance`

The attacker is "behind the ball" when the vector from ball to attacker is aligned with `-toGoal` within an angle tolerance.

## Proposed Constants

Add explicit constants to `Configuration`:

- `aiAttackSetupDistance = config.ballRadius + config.playerRadius + 8`
- `aiAttackRunThroughDistance = 18`
- `aiAttackDetourStepRadians = Math.PI / 6`
- `aiAttackAimToleranceRadians = 0.15`
- `aiAttackDetourRadius = config.ballRadius + config.playerRadius + 4`
- `aiAttackCloseDistance = config.ballRadius + config.playerRadius + 20`

These values are starting points. They should be tested and tuned in gameplay.

## Target Calculation

### Behind-Ball Target

```text
behindBall = ball.position - toGoal * aiAttackSetupDistance
```

This is the desired setup point before shooting.

### Shoot Target

```text
shootTarget = ball.position + toGoal * aiAttackRunThroughDistance
```

This is the target used once the attacker is aligned.

### Detour Target

When close but not aligned:

1. Compute the attacker's angle around the ball.
2. Compute the desired behind-ball angle.
3. Step from the current angle toward the desired angle by at most `aiAttackDetourStepRadians`.
4. Place target at `aiAttackDetourRadius` around the ball.

The detour should keep a committed clockwise/counter-clockwise direction while the attacker is far from alignment, so it does not jitter around the `+PI / -PI` boundary.

## Command State Ownership

All phase 1.1 behavior belongs inside `IndividualAi`.

`TeamAi` should still only assign `attackBall` to the selected away ball attacker. It should not know whether the individual is approaching, detouring, or shooting.

`IndividualAi` may need command-local memory:

- `attackOrbitDir`
- `commandState`
- previous target for debug drawing

Reset command-local attack memory when leaving `attackBall`.

## Debugging

AI debug drawing should continue to draw current movement target lines.

For easier phase 1.1 debugging, `IndividualAi.debugSnapshot()` should include:

- `command`
- `state`
- `target`
- optionally `attackOrbitDir`

No public access to internal individual AI lists should be added.

## Tests

### `tests/individualAi.test.js`

Add coverage for:

- `attackBall` chooses a shoot-through target when already aligned behind the ball
- `attackBall` chooses a behind-ball/setup target when far and not aligned
- `attackBall` chooses a detour target when close and not aligned
- `attackBall` keeps the same detour direction across repeated updates near the opposite angle
- `attackBall` resets detour memory when command changes away from `attackBall`
- `attackBall` still does not directly mutate ball velocity

### Existing Tests

Existing phase 1.0 tests should continue passing, except tests that assert `attackBall` always targets the current ball position must be updated. After phase 1.1, `attackBall` targets a movement waypoint, not necessarily the ball itself.

## Out Of Scope For Phase 1.1

- deciding which player attacks the ball
- position swapping
- keeper-specific challenge logic
- pass selection
- teammate support runs
- direct ball velocity changes from AI
- aerial ball prediction
- avoiding teammates or opponents while detouring
- changing formation targets

## Clarifications Resolved

Phase 1.1 uses these decisions:

1. `approach` targets the behind-ball setup point, not the ball itself.
2. `detour` is used only when the attacker is close to the ball and not aligned.
3. The shot aim point is the opponent goal center.
4. No near-post/far-post selection in phase 1.1.
5. The behavior is implemented generically in `IndividualAi.attackBall`, but currently only away AI receives `attackBall` from `TeamAi`.
