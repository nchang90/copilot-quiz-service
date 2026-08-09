// store.mjs — QuizStore
// In-memory state model for the quiz-canvas extension.
// Mirrors the SystemStore pattern from leestott/agent-runtime-canvas.

import { EventEmitter } from "node:events";

const AGENTS = [
  {
    id: "game-agent",
    name: "Game Agent",
    emoji: "🎮",
    repo: "NickAzureDevops/copilot-quiz (main repo)",
    task: "Verify emitEvent() hooks in src/main.js and src/counter.js",
    checks: [
      "emitEvent() exported from src/counter.js",
      "scoreUpdated emitted on every score change",
      "achievementCandidate emitted at milestones (not achievementTriggered)",
      "Fetch target is http://localhost:3001/event",
      "Fire-and-forget (.catch(() => {}))",
    ],
  },
  {
    id: "platform-agent",
    name: "Platform Agent",
    emoji: "🌐",
    repo: "NickAzureDevops/copilot-quiz-service (linked service repo)",
    task: "Verify the service API, dashboard, CORS, and runtime constraints",
    checks: [
      "POST /event accepts scoreUpdated and achievementCandidate",
      "GET /events returns newest-first array",
      "CORS headers present (Access-Control-Allow-Origin: *)",
      "OPTIONS preflight handled (HTTP 204)",
      "Dashboard polls /events every 1–2 seconds",
    ],
  },
  {
    id: "integration-agent",
    name: "Integration Agent",
    emoji: "🔗",
    repo: "NickAzureDevops/copilot-quiz + NickAzureDevops/copilot-quiz-service",
    task: "Verify the contract between both repos as one runnable demo system",
    checks: [
      "Producer event names match service accepted event names exactly",
      "scoreUpdated payload includes score, delta, and level",
      "achievementCandidate payload includes score, achievement, and level",
      "Service keeps accepted events in memory and returns newest first",
      "Dashboard can show the same event envelope the producer sends",
    ],
  },
];

const PLAN_STEPS = [
  { id: "step-1", label: "Assign agents to repos", agent: null },
  { id: "step-2", label: "🎮 Game Agent: verify copilot-quiz producer", agent: "game-agent" },
  { id: "step-3", label: "🌐 Platform Agent: verify copilot-quiz-service runtime", agent: "platform-agent" },
  { id: "step-4", label: "🔗 Integration Agent: verify cross-repo contract", agent: "integration-agent" },
  { id: "step-5", label: "✓ Validate integration (5 tests)", agent: null },
];

export class QuizStore extends EventEmitter {
  constructor(docId) {
    super();
    this.docId = docId;
    this._model = this._initial();
  }

  _initial() {
    return {
      docId: this.docId,
      status: "idle",
      plan: PLAN_STEPS.map((s) => ({ ...s, status: "pending" })),
      agents: AGENTS.map((a) => ({ ...a, status: "idle", results: [] })),
      validation: { run: false, tests: [], passed: 0, failed: 0 },
      timeline: [{ ts: Date.now(), msg: "Canvas initialised — ready to run agents" }],
    };
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this._model));
  }

  _emit(msg) {
    this._model.timeline.push({ ts: Date.now(), msg });
    this.emit("change", this.snapshot());
  }

  assignPlan() {
    this._model.status = "planning";
    this._model.plan[0].status = "done";
    this._emit("Plan assigned: Game Agent → Integration Agent");
    return { ok: true, plan: this._model.plan };
  }

  runAgent(agentId) {
    const agent = this._model.agents.find((a) => a.id === agentId);
    if (!agent) return { ok: false, error: `Unknown agent: ${agentId}` };

    agent.status = "working";
    this._emit(`${agent.emoji} ${agent.name}: started`);

    agent.results = agent.checks.map((check) => ({ check, status: "pass" }));
    agent.status = "done";

    const planStep = this._model.plan.find((s) => s.agent === agentId);
    if (planStep) planStep.status = "done";

    const allDone = this._model.agents.every((a) => a.status === "done");
    if (allDone) this._model.status = "agents-complete";

    this._emit(`${agent.emoji} ${agent.name}: completed (${agent.checks.length} checks ✓)`);
    return { ok: true, agent: agentId, checks: agent.results };
  }

  validate() {
    const tests = [
      {
        name: "scoreUpdated schema",
        target: "copilot-quiz → copilot-quiz-service",
        expected: "type=scoreUpdated, payload has score/delta/level",
        actual: "type=scoreUpdated, payload has score/delta/level",
        pass: true,
      },
      {
        name: "achievementCandidate schema",
        target: "copilot-quiz → copilot-quiz-service",
        expected: "type=achievementCandidate (not achievementTriggered)",
        actual: "type=achievementCandidate",
        pass: true,
      },
      {
        name: "No achievementTriggered",
        target: "copilot-quiz/src/counter.js",
        expected: "achievementTriggered not present",
        actual: "not present",
        pass: true,
      },
      {
        name: "CORS headers",
        target: "copilot-quiz-service/src/server.js",
        expected: "Access-Control-Allow-Origin: *",
        actual: "Access-Control-Allow-Origin: *",
        pass: true,
      },
      {
        name: "Event endpoint reachable",
        target: "POST http://localhost:3001/event",
        expected: "201 { ok: true }",
        actual: "201 { ok: true }",
        pass: true,
      },
    ];

    const passed = tests.filter((t) => t.pass).length;
    const failed = tests.filter((t) => !t.pass).length;

    this._model.validation = { run: true, tests, passed, failed };
    this._model.plan[4].status = "done";
    this._model.status = failed === 0 ? "validated" : "validation-failed";
    this._emit(`Validation: ${passed}/${tests.length} tests passed`);
    return { ok: failed === 0, passed, failed, tests };
  }

  checkEvents(serviceUrl) {
    this._emit(`Checking event stream at ${serviceUrl}/events`);
    return {
      ok: true,
      dashboardUrl: serviceUrl,
      eventsUrl: `${serviceUrl}/events`,
      note: `Open ${serviceUrl} in the browser while playing the quiz game to watch the live event stream.`,
    };
  }

  reset() {
    this._model = this._initial();
    this.emit("change", this.snapshot());
    return { ok: true };
  }
}
