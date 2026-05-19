# Ticket Priority Auto-Suggester

> A Zendesk Apps Framework v2 sidebar app that analyses ticket subject and description and suggests the correct priority — with one-click apply.

---

## What it does

The app appears in the ticket sidebar as soon as an agent opens a ticket. It reads the subject and description, runs a weighted keyword-scoring engine across 17 signal rules, and suggests one of four priorities:

- 🔴 **Urgent** — outages, data loss, security breaches, everyone affected, revenue impact
- 🟠 **High** — bugs, errors, performance issues, integration failures, escalations
- 🔵 **Normal** — how-to questions, configuration requests, general help
- ⚫ **Low** — feature requests, feedback, docs questions, no-rush language

It shows a confidence percentage and lists the top signals that drove the suggestion. The agent clicks **Apply priority** to set it on the ticket with one click — or ignores it.

---

## Features

- Weighted rule engine — urgent signals score 8×, high 4×, normal 2×, low 1×
- Confidence bar showing how strongly the signals agree
- Top 3 signal labels shown to explain the reasoning
- One-click apply via ZAF `ticket.priority` setter
- Auto re-analyses when subject or description changes
- Works fully client-side — no external API calls, no data sent anywhere
- Clean Zendesk Garden-aligned UI

---

## File structure

```
Zendesk-Ticket-Priority-Auto-Suggester/
├── manifest.json              ← ZAF app manifest
├── zcli.apps.config.json      ← Zendesk CLI config
├── assets/
│   ├── main.html              ← Sidebar UI
│   ├── main.js                ← Scoring engine + ZAF integration
│   └── main.css               ← Styles
├── translations/
│   └── en.json                ← Required i18n file
├── .gitignore
├── LICENSE
└── README.md
```

---

## Local development

### Prerequisites

```bash
npm install -g @zendesk/zcli
```

### Run locally

```bash
zcli apps:server
```

Open any Zendesk ticket and append `?zcli_apps=true` to the URL. The app will load from localhost.

### Validate

```bash
zcli apps:validate
```

### Package for upload

```bash
zcli apps:package
```

This creates a `.zip` file in the `tmp/` folder ready for upload.

---

## Install in Zendesk

1. Go to **Zendesk Admin → Apps and Integrations → Apps → Zendesk Support Apps**
2. Click **Upload private app**
3. Upload the `.zip` from `tmp/`
4. No OAuth or API keys required — app runs entirely in the browser

---

## How the scoring works

Each rule has a priority level (0–3) and a weight (1–3). When a rule matches, its weight is added to that priority's score. Scores are then multiplied by an urgency multiplier:

| Priority | Multiplier |
|---|---|
| Low | 1× |
| Normal | 2× |
| High | 4× |
| Urgent | 8× |

The priority with the highest weighted score wins. Confidence is calculated as `(winning score / total score) × 100`, capped at 97%.

### Signal categories

**Urgent:** outage/down language, access blocked, revenue impact, time-critical deadlines, all-users language

**High:** error/bug/failure language, performance issues, multiple users affected, integration failures, escalation language, data integrity

**Normal:** how-to questions, configuration requests, needs clarification

**Low:** feedback/feature requests, docs questions, no-rush language

---

## Roadmap

- [ ] Claude API integration — replace keyword rules with LLM classification
- [ ] Custom keyword configuration per Zendesk account
- [ ] Priority history log per ticket
- [ ] Bulk suggest mode (views integration)
- [ ] CSAT correlation feedback loop

---

## License

GPL-3.0 — see [LICENSE](LICENSE)
