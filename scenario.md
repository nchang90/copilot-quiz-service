# Scenario: Shaping the Copilot Quiz Runtime with Canvas

> The point of this Canvas is not a dashboard. It is a live orchestration surface for
> validating the quiz event pipeline while it runs — across the game repo, the service repo,
> and the integration checks that connect them.

This scenario mirrors the runtime-canvas style used by Lee Stott, but keeps the story
specific to the Copilot Quiz demo.

## The system under test

You are building a two-repo quiz demo:

- `copilot-quiz` is the main repo and emits browser events when the player scores or hits a milestone.
- `copilot-quiz-service` is the linked visualizer repo; it ingests those events on `POST /event`, stores them in memory,
  and displays them live on `GET /events`.

The Canvas extension in this repo shows the orchestration loop that ties the main repo to this service repo.

## What Canvas helps you do

- **Decompose** the integration into producer, platform, and integration agents.
- **Execute** the agent checks one repo at a time.
- **Validate** the contract, CORS, dashboard polling, and event types.
- **Inspect** the live event stream URL while the game is running.
- **Reset** and rerun the flow as the implementation changes.

## The five-beat walkthrough

### Beat 1 — Assign the plan

Open the canvas and click **Assign Plan**.

This materialises the quiz execution graph:

1. Game Agent
2. Platform Agent
3. Integration Agent
4. Validation
5. Live stream check

### Beat 2 — Run the Game Agent

Click **Game Agent**.

This checks the integration source (`copilot-quiz`) for the event calls that should exist:

- `scoreUpdated`
- `achievementCandidate`
- `fetch('http://localhost:3001/event', ...)`
- fire-and-forget POST behavior

### Beat 3 — Run the Platform Agent

Click **Platform Agent**.

This verifies the visualizer side (`copilot-quiz-service`):

- `POST /event`
- `GET /events`
- in-memory storage only
- CORS enabled for the browser game
- dashboard polling every 1–2 seconds

### Beat 4 — Run the Integration Agent

Click **Integration Agent**.

This cross-checks the contract between the two repos:

- event names match exactly
- payload shape is consistent
- the dashboard stays in sync with the browser game
- the service receives events without browser CORS issues

### Beat 5 — Validate and inspect the stream

Click **Validate** and then **Check Event Stream**.

You should end up with a green validation view and a direct link to the live service URL.

## Why this works well for the quiz demo

This keeps the Canvas aligned with the actual product boundary:

- the game produces events
- the service consumes and visualises them
- the Canvas validates the integration story without adding gameplay logic here

## Replay steps

1. Start `copilot-quiz-service` on port `3001`.
2. Start `copilot-quiz`.
3. Reload extensions if needed.
4. Open the `quiz-canvas` canvas.
5. Walk through the five beats above.
