# copilot-quiz-service

Minimal **event visualizer** service for the Copilot Apps quiz demo:
- ingests quiz interaction events
- keeps them in memory
- shows a live dashboard

Main repo / integration source: https://github.com/NickAzureDevops/copilot-quiz
This service repo is the linked visualizer for that main repo.

## Run

1. `npm install`
2. `npm start`
3. Open `http://localhost:3001`

## API contract

- `POST /event` accepts:
  ```json
  {
    "type": "scoreUpdated | achievementCandidate",
    "timestamp": "ISO-8601",
    "payload": {}
  }
  ```
- accepted event types:
  - `scoreUpdated`
  - `achievementCandidate`
- `GET /events` returns all events, newest first

## Scope

This repo is only the backend service + dashboard visualizer side.

## Demo architecture (summary)

- `copilot-quiz` produces quiz events.
- `copilot-quiz-service` consumes events and visualizes them live.
- `quiz-canvas` in this repo demonstrates quiz agent orchestration for the integration flow.
- optional MCP server can coordinate cross-repo checks across both repos.

For the full multi-repo GitHub Copilot Apps story (repo roles, Canvas orchestration, and end-to-end flow), see [`docs/copilot-apps-demo-guide.md`](docs/copilot-apps-demo-guide.md).
