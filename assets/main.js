/* ─── Ticket Priority Auto-Suggester — main.js ───────────────────────────── */

const client = ZAFClient.init();

// ─── Priority scoring rules ───────────────────────────────────────────────────
// Each rule: { pattern: RegExp, priority: 0-3, weight: 1-3, label: string }
// Priority: 0=low, 1=normal, 2=high, 3=urgent

const RULES = [
  // ── Urgent signals ──────────────────────────────────────────────────────────
  { pattern: /\b(down|outage|offline|not working|broken|crash(ed|ing)?|critical|emergency|urgent|immediately|asap|right now|data loss|security breach|hacked|compromised|sev1|p1)\b/i, priority: 3, weight: 3, label: "Critical/outage language" },
  { pattern: /\b(cannot (log in|login|access|sign in)|locked out|account (suspended|banned|blocked))\b/i, priority: 3, weight: 3, label: "Access blocked" },
  { pattern: /\b(revenue|sales|client|customer|payment|billing) (impact|affected|loss|blocked|stuck)\b/i, priority: 3, weight: 3, label: "Revenue impact" },
  { pattern: /\b(deadline|go.?live|launch|tonight|today|this morning|within (the )?(hour|minutes?))\b/i, priority: 3, weight: 2, label: "Time-critical deadline" },
  { pattern: /\ball (users?|team|staff|everyone|customers?)\b/i, priority: 3, weight: 2, label: "All users affected" },

  // ── High signals ─────────────────────────────────────────────────────────────
  { pattern: /\b(not (loading|working|syncing|updating)|error|fail(ing|ed)|bug|issue|problem|incorrect|wrong|missing)\b/i, priority: 2, weight: 2, label: "Error/bug/failure" },
  { pattern: /\b(slow|performance|timeout|lag(ging)?|delay(ed)?)\b/i, priority: 2, weight: 1, label: "Performance issue" },
  { pattern: /\b(multiple (users?|people|agents?)|several (users?|accounts?))\b/i, priority: 2, weight: 2, label: "Multiple users affected" },
  { pattern: /\b(integration|api|webhook|automation|workflow) (fail|broken|not|error)\b/i, priority: 2, weight: 2, label: "Integration/automation failure" },
  { pattern: /\b(important|urgent|high priority|escalat(e|ed|ing))\b/i, priority: 2, weight: 2, label: "Escalation language" },
  { pattern: /\b(data (missing|incorrect|corrupt|wrong|not showing))\b/i, priority: 2, weight: 2, label: "Data integrity issue" },

  // ── Normal signals ────────────────────────────────────────────────────────────
  { pattern: /\b(how (do|can|to)|can (i|you)|is it possible|question|wondering|help (me|with))\b/i, priority: 1, weight: 1, label: "How-to question" },
  { pattern: /\b(update|change|edit|modify|configure|set up|setup)\b/i, priority: 1, weight: 1, label: "Configuration request" },
  { pattern: /\b(not sure|confused|unclear|understand)\b/i, priority: 1, weight: 1, label: "Needs clarification" },

  // ── Low signals ───────────────────────────────────────────────────────────────
  { pattern: /\b(feedback|suggestion|feature request|nice to have|when (you get a chance|possible)|no rush|low priority|fyi|just wondering)\b/i, priority: 0, weight: 2, label: "Low-urgency/feedback" },
  { pattern: /\b(documentation|docs|article|guide|tutorial|example)\b/i, priority: 0, weight: 1, label: "Docs/info request" },
];

const PRIORITY_LABELS = ["Low", "Normal", "High", "Urgent"];
const PRIORITY_CLASSES = ["badge-low", "badge-normal", "badge-high", "badge-urgent"];

// ─── Scoring engine ───────────────────────────────────────────────────────────

function analyseText(subject, description) {
  const text = `${subject} ${description}`.toLowerCase();
  const matched = [];
  const scores = [0, 0, 0, 0]; // low, normal, high, urgent

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      scores[rule.priority] += rule.weight;
      matched.push({ label: rule.label, priority: rule.priority });
    }
  }

  // Weighted priority: urgent signals dominate
  const weighted = [
    scores[0] * 1,
    scores[1] * 2,
    scores[2] * 4,
    scores[3] * 8,
  ];

  const maxW = Math.max(...weighted);

  let suggested = 1; // default normal
  if (maxW > 0) {
    suggested = weighted.indexOf(maxW);
  }

  // Confidence: how strongly the top priority outscores the rest
  const totalW = weighted.reduce((a, b) => a + b, 0);
  const confidence = totalW > 0 ? Math.round((maxW / totalW) * 100) : 60;

  // Deduplicate signals, show top 3
  const seen = new Set();
  const signals = matched
    .filter(m => {
      if (seen.has(m.label)) return false;
      seen.add(m.label);
      return true;
    })
    .slice(0, 3);

  return { priority: suggested, confidence: Math.min(confidence, 97), signals };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showState(id) {
  ["state-loading", "state-result", "state-empty", "state-error"].forEach(s => {
    document.getElementById(s).classList.toggle("hidden", s !== id);
  });
}

function renderResult({ priority, confidence, signals }) {
  const badge = document.getElementById("priority-badge");
  badge.textContent = PRIORITY_LABELS[priority];
  badge.className = `priority-badge ${PRIORITY_CLASSES[priority]}`;

  const bar = document.getElementById("confidence-bar");
  bar.style.width = `${confidence}%`;
  bar.className = `confidence-bar conf-${priority}`;
  document.getElementById("confidence-pct").textContent = `${confidence}%`;

  const list = document.getElementById("signals-list");
  if (signals.length > 0) {
    list.innerHTML = signals.map(s =>
      `<div class="signal-item priority-signal-${s.priority}">
        <span class="signal-dot"></span>${s.label}
       </div>`
    ).join("");
  } else {
    list.innerHTML = `<div class="signal-item">No strong signals found — defaulting to Normal</div>`;
  }

  document.getElementById("applied-msg").classList.add("hidden");
  document.getElementById("btn-apply").disabled = false;

  showState("state-result");
}

// ─── ZAF integration ─────────────────────────────────────────────────────────

let currentPriority = 1;

async function run() {
  showState("state-loading");

  try {
    client.invoke("resize", { width: "100%", height: "320px" });

    const data = await client.get([
      "ticket.subject",
      "ticket.description",
    ]);

    const subject     = data["ticket.subject"]     || "";
    const description = data["ticket.description"] || "";

    if (!subject.trim() && !description.trim()) {
      showState("state-empty");
      return;
    }

    const result = analyseText(subject, description);
    currentPriority = result.priority;
    renderResult(result);

    // Re-analyse on ticket change
    client.on("ticket.subject.changed", run);
    client.on("ticket.description.changed", run);

  } catch (err) {
    console.error("[Priority Suggester]", err);
    showState("state-error");
  }
}

// ─── Apply button ─────────────────────────────────────────────────────────────

document.getElementById("btn-apply").addEventListener("click", async () => {
  const priorityMap = ["low", "normal", "high", "urgent"];
  const btn = document.getElementById("btn-apply");

  btn.disabled = true;
  btn.textContent = "Applying…";

  try {
    await client.set("ticket.priority", priorityMap[currentPriority]);
    document.getElementById("applied-msg").classList.remove("hidden");
    btn.textContent = "Applied ✓";
  } catch (err) {
    console.error("[Priority Suggester] Apply failed:", err);
    btn.textContent = "Apply priority";
    btn.disabled = false;
    alert("Could not set priority. Check app permissions in manifest.json.");
  }
});

document.getElementById("btn-refresh").addEventListener("click", run);
document.getElementById("btn-retry").addEventListener("click", run);
document.getElementById("btn-error-retry").addEventListener("click", run);

// ─── Boot ─────────────────────────────────────────────────────────────────────
run();
