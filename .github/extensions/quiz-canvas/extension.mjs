// extension.mjs — quiz-canvas
//
// Canvas extension for the Copilot quiz demo.
// Mirrors the pattern from leestott/agent-runtime-canvas.
//
// Actions (callable by AI agent or human buttons in the canvas panel):
//   assign_plan          — materialise the 2-agent execution graph
//   run_game_agent       — verify emitEvent() in copilot-quiz
//   run_platform_agent   — verify copilot-quiz-service API + dashboard
//   run_integration_agent — verify copilot-quiz-service API + dashboard + contract
//   validate_integration — run 5-test validation suite
//   check_event_stream   — surface the live dashboard URL
//   reset_canvas         — reset to initial state

import { createServer } from "node:http";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { QuizStore } from "./store.mjs";
import { renderHtml } from "./ui.mjs";

const stores = new Map();
const servers = new Map();
const instanceDoc = new Map();

let sdkSession = null;
const log = (msg, level = "info") => {
  try { sdkSession?.log?.(msg, { level }); } catch { /* never throw from logging */ }
};

async function getStore(docId) {
  let store = stores.get(docId);
  if (!store) { store = new QuizStore(docId); stores.set(docId, store); }
  return store;
}

function docFor(instanceId, input) {
  return instanceDoc.get(instanceId) || (input && (input.documentId || input.docId)) || "default";
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function applyControl(store, body) {
  switch (body.action) {
    case "assign_plan":       return store.assignPlan();
    case "run_game":          return store.runAgent("game-agent");
    case "run_integration":   return store.runAgent("integration-agent");
    case "validate":          return store.validate();
    case "reset":             return store.reset();
    default:                  return null;
  }
}

async function startServer(instanceId, docId) {
  const store = await getStore(docId);
  const clients = new Set();

  const onChange = (model) => {
    const payload = `data: ${JSON.stringify(model)}\n\n`;
    for (const res of clients) {
      try { res.write(payload); } catch { clients.delete(res); }
    }
  };
  store.on("change", onChange);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const route = url.pathname.replace(/\/+$/, "") || "/";

    // CORS — canvas iframe is cross-origin from the loopback server
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (route === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(renderHtml());
      return;
    }
    if (route === "/model" && req.method === "GET") {
      return sendJson(res, 200, store.snapshot());
    }
    if (route === "/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write(`retry: 2000\n\n`);
      res.write(`data: ${JSON.stringify(store.snapshot())}\n\n`);
      clients.add(res);
      const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* ignore */ } }, 15000);
      if (typeof ping.unref === "function") ping.unref();
      req.on("close", () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (route === "/control" && req.method === "POST") {
      const body = await readBody(req);
      try { applyControl(store, body); return sendJson(res, 200, { ok: true }); }
      catch (err) { return sendJson(res, 400, { ok: false, error: String((err && err.message) || err) }); }
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return { server, url: `http://127.0.0.1:${port}/`, docId, clients, unsub: () => store.off("change", onChange) };
}

// ─── Canvas declaration ──────────────────────────────────────────────────────

const canvas = createCanvas({
  id: "quiz-canvas",
  displayName: "Quiz Agent Orchestration",
  description:
    "Live orchestration surface for the Copilot quiz demo. " +
    "Shows the 2-agent execution plan, per-agent status, validation results, " +
    "and a link to the live event stream from copilot-quiz-service.",

  inputSchema: {
    type: "object",
    properties: {
      documentId: { type: "string", description: "Model doc id (defaults to 'default')." },
    },
    additionalProperties: false,
  },

  actions: [
    {
      name: "assign_plan",
      description: "Materialise the 2-agent execution graph: Game Agent → Integration Agent.",
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, additionalProperties: true },
      handler: async (ctx) => { const s = await getStore(docFor(ctx.instanceId, ctx.input)); return s.assignPlan(); },
    },
    {
      name: "run_game_agent",
      description: "Run the Game Agent: verify emitEvent() is correctly wired in copilot-quiz with the right event types.",
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, additionalProperties: true },
      handler: async (ctx) => { const s = await getStore(docFor(ctx.instanceId, ctx.input)); return s.runAgent("game-agent"); },
    },
    {
      name: "run_integration_agent",
      description: "Run the Integration Agent: verify copilot-quiz-service API contract, CORS headers, dashboard, and repo contract.",
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, additionalProperties: true },
      handler: async (ctx) => { const s = await getStore(docFor(ctx.instanceId, ctx.input)); return s.runAgent("integration-agent"); },
    },
    {
      name: "run_platform_agent",
      description: "Run the Platform Agent: verify copilot-quiz-service API, CORS headers, dashboard, and runtime constraints.",
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, additionalProperties: true },
      handler: async (ctx) => { const s = await getStore(docFor(ctx.instanceId, ctx.input)); return s.runAgent("platform-agent"); },
    },
    {
      name: "validate_integration",
      description: "Run the 5-test integration validation suite: schema, CORS, endpoint, event types, fire-and-forget.",
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, additionalProperties: true },
      handler: async (ctx) => { const s = await getStore(docFor(ctx.instanceId, ctx.input)); return s.validate(); },
    },
    {
      name: "check_event_stream",
      description: "Surface the live event stream URL from copilot-quiz-service and the latest event count.",
      inputSchema: {
        type: "object",
        properties: {
          serviceUrl: { type: "string", description: "copilot-quiz-service base URL (default: http://localhost:3001)." },
          documentId: { type: "string" },
        },
        additionalProperties: true,
      },
      handler: async (ctx) => {
        const s = await getStore(docFor(ctx.instanceId, ctx.input));
        const url = (ctx.input && ctx.input.serviceUrl) || "http://localhost:3001";
        return s.checkEvents(url);
      },
    },
  ],

  open: async (ctx) => {
    const input = ctx.input || {};
    const docId = (input.documentId || "default").toString();
    instanceDoc.set(ctx.instanceId, docId);

    let entry = servers.get(ctx.instanceId);
    if (!entry) { entry = await startServer(ctx.instanceId, docId); servers.set(ctx.instanceId, entry); }

    const store = await getStore(docId);
    log(`quiz-canvas open (doc=${docId})`);
    return { title: "Quiz Agent Orchestration", status: store.snapshot().status, url: entry.url };
  },

  onClose: async (ctx) => {
    const entry = servers.get(ctx.instanceId);
    if (entry) {
      servers.delete(ctx.instanceId);
      try { entry.unsub(); } catch { /* ignore */ }
      for (const res of entry.clients) { try { res.end(); } catch { /* ignore */ } }
      await new Promise((resolve) => entry.server.close(() => resolve()));
    }
    instanceDoc.delete(ctx.instanceId);
  },
});

sdkSession = await joinSession({ canvases: [canvas] });
log("quiz-canvas extension ready");
