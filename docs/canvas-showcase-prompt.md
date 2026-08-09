# Learning Copilot Quiz Showcase Prompt

Use this prompt to drive the Quiz Agent Orchestration canvas during a learning demo.

## Goal
Show the end-to-end Copilot Quiz event flow from the integration source repo into the visualizer repo, then validate that the contract stays in sync.

## Repositories
- `copilot-quiz` — the integration source. This is where game events are emitted.
- `copilot-quiz-service` — the visualizer. This repo receives events, stores them in memory, and displays them live.

## Canvas flow
1. Click **Assign Plan**.
2. Run **Game Agent** to verify the quiz app emits the correct event types.
3. Run **Platform Agent** to verify the service API, dashboard, CORS, and runtime constraints.
4. Run **Integration Agent** to verify the producer and service contracts match end to end.
5. Click **Validate** to confirm the integration checks pass.
6. Click **Check Event Stream** to open the live service URL.

## What the canvas should prove
- The game sends `scoreUpdated` and `achievementCandidate` events.
- The service accepts those events on `POST /event`.
- `GET /events` returns events newest first.
- The dashboard updates live without CORS problems.
- The demo stays simple: three focused agents, one contract, one live event stream.

## Demo note
This canvas is for learning and orchestration only. Do not add gameplay logic to the service repo.
