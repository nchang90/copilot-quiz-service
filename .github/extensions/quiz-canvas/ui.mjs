// ui.mjs — renderHtml()
// Canvas iframe for the quiz agent orchestration panel.
// Mirrors the dark-theme UI pattern from leestott/agent-runtime-canvas.

export function renderHtml() {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Quiz Agent Orchestration</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d0d;color:#e0e0e0;padding:16px;font-size:13px;line-height:1.4}
  h1{font-size:15px;font-weight:700;margin-bottom:12px;color:#FFD700}
  .status-bar{background:#111;border:1px solid #222;border-radius:6px;padding:6px 10px;font-size:11px;color:#666;margin-bottom:12px}
  .status-bar .val{color:#FFD700;font-weight:700}
  .controls{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
  button{background:#1e1e1e;border:1px solid #333;color:#ccc;padding:5px 11px;border-radius:5px;font-size:11px;cursor:pointer;transition:background .15s}
  button:hover{background:#2a2a2a;border-color:#555}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .card{background:#141414;border:1px solid #222;border-radius:8px;padding:12px}
  .card-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555;margin-bottom:8px}
  /* Plan */
  .step{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1c1c1c}
  .step:last-child{border-bottom:none}
  .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .dot-pending{background:#2e2e2e}
  .dot-done{background:#4ade80}
  .step-label{font-size:11px;color:#aaa}
  /* Agents */
  .agent{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #1c1c1c}
  .agent:last-child{border-bottom:none}
  .agent-icon{font-size:20px;line-height:1;flex-shrink:0}
  .agent-body{flex:1;min-width:0}
  .agent-name{font-weight:600;font-size:12px;color:#ddd}
  .agent-task{font-size:10px;color:#555;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;flex-shrink:0;margin-left:auto;align-self:flex-start;margin-top:1px}
  .b-idle{background:#1e1e1e;color:#444}
  .b-working{background:#1a2e4a;color:#60a5fa;animation:pulse 1s infinite}
  .b-done{background:#14321e;color:#4ade80}
  .b-error{background:#321414;color:#f87171}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  /* Validation */
  .v-summary{font-size:11px;margin-bottom:6px}
  .v-pass{color:#4ade80}
  .v-fail{color:#f87171}
  .test-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1c1c1c;font-size:10px;gap:4px}
  .test-row:last-child{border-bottom:none}
  .test-name{color:#999;flex:1}
  .test-result{flex-shrink:0;font-weight:700}
  /* Timeline */
  .timeline{max-height:130px;overflow-y:auto}
  .tl-row{padding:3px 0;border-bottom:1px solid #181818;font-size:10px;color:#666}
  .tl-row:last-child{border-bottom:none}
  .tl-ts{color:#333;margin-right:5px}
  .empty{font-size:10px;color:#333;font-style:italic}
</style>
</head>
<body>

<h1>&#127183; Quiz Agent Orchestration</h1>

<div class="status-bar">Status: <span id="sv" class="val">idle</span></div>

<div class="controls">
  <button onclick="ctl('assign_plan')">&#128203; Assign Plan</button>
  <button onclick="ctl('run_game')">&#127918; Game Agent</button>
  <button onclick="ctl('run_integration')">&#128279; Integration Agent</button>
  <button onclick="ctl('validate')">&#10003; Validate</button>
  <button onclick="ctl('reset')" style="margin-left:auto">&#10227; Reset</button>
</div>

<div class="grid">
  <div class="card">
    <div class="card-title">Execution Plan</div>
    <div id="plan"></div>
  </div>
  <div class="card">
    <div class="card-title">Agents</div>
    <div id="agents"></div>
  </div>
  <div class="card">
    <div class="card-title">Validation</div>
    <div id="validation"><div class="empty">Not run yet — click Validate</div></div>
  </div>
  <div class="card">
    <div class="card-title">Timeline</div>
    <div id="timeline" class="timeline"></div>
  </div>
</div>

<script>
  function ctl(action) {
    fetch('/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => {});
  }

  function render(m) {
    document.getElementById('sv').textContent = m.status;

    // Plan
    document.getElementById('plan').innerHTML = m.plan.map(s =>
      '<div class="step">' +
      '<div class="dot ' + (s.status === 'done' ? 'dot-done' : 'dot-pending') + '"></div>' +
      '<div class="step-label">' + s.label + '</div>' +
      '</div>'
    ).join('');

    // Agents
    document.getElementById('agents').innerHTML = m.agents.map(a =>
      '<div class="agent">' +
      '<div class="agent-icon">' + a.emoji + '</div>' +
      '<div class="agent-body">' +
      '<div class="agent-name">' + a.name + '</div>' +
      '<div class="agent-task">' + a.task + '</div>' +
      '</div>' +
      '<div class="badge b-' + a.status + '">' + a.status + '</div>' +
      '</div>'
    ).join('');

    // Validation
    const v = m.validation;
    if (v.run) {
      document.getElementById('validation').innerHTML =
        '<div class="v-summary">' +
        '<span class="v-pass">' + v.passed + ' passed</span>' +
        (v.failed ? ' &nbsp;/&nbsp; <span class="v-fail">' + v.failed + ' failed</span>' : '') +
        '</div>' +
        v.tests.map(t =>
          '<div class="test-row">' +
          '<span class="test-name">' + t.name + '</span>' +
          '<span class="test-result ' + (t.pass ? 'v-pass' : 'v-fail') + '">' +
          (t.pass ? '&#10003;' : '&#10007;') + '</span>' +
          '</div>'
        ).join('');
    }

    // Timeline (newest first)
    const tl = [...m.timeline].reverse();
    document.getElementById('timeline').innerHTML = tl.map(e =>
      '<div class="tl-row">' +
      '<span class="tl-ts">' + new Date(e.ts).toLocaleTimeString() + '</span>' +
      e.msg +
      '</div>'
    ).join('');
  }

  // SSE — live updates from the store
  const es = new EventSource('/events');
  es.onmessage = (e) => { try { render(JSON.parse(e.data)); } catch {} };

  // Initial fetch
  fetch('/model').then(r => r.json()).then(render).catch(() => {});
</script>
</body>
</html>`;
}
