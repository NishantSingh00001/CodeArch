# CodeArchaeologist

**Ask *why* any line of code exists — answered from your repo's real history. Plus a time machine, change preview, and a 3D repo-history adventure game.**

CodeArchaeologist points at a public GitHub repo, reads its commits, pull requests and issues, and reconstructs the *reasoning* behind the code — the questions `git blame` can't answer. Everything is grounded in real history with links you can open.

---

## Features

| Feature | What it does |
|---|---|
| **Ask why** | Why does this code exist? Reconstructed from commits/PRs/issues, with sources. |
| **Chesterton's Fence Guard** | Before you delete code, learn why it exists and what breaks if you remove it. |
| **Fossil Finder** | Detects dead / orphaned code and the story of the abandoned feature behind it. |
| **Bus-Factor Map** | Highlights code only one person ever touched — knowledge that could walk out the door. |
| **Line Time-Machine** | Scrub a file through its whole history, with the reason for each layer. |
| **Alternate History** | "What if they hadn't done this?" — a reasoned counterfactual from the real history. |
| **Change Preview** | Real before/after render for static sites; AI-predicted description for build-step apps. |
| **Repo Quest** | A stylized **3D** tomb (Three.js/WebGL) where each relic uncovers a real piece of the repo's history, with a quiz at each checkpoint. |
| **Guided Demo** | A narrated walkthrough of everything, using sample data — no repo or key needed. |

---

## How it works

- **GitHub data** is fetched **client-side** from the public GitHub API (commits, PRs, issues, file contents). No server needed for this. An optional personal access token raises the rate limit from 60 to 5,000 requests/hour (stored only in your browser — set it in **⚙ Token** on the Explore page).
- **Reasoning** runs in one serverless function (`/api/ask`) that calls **Google Gemini**, mode-switched per feature. The key stays server-side.
- **Change Preview** fetches the HTML from `raw.githubusercontent.com`, has the AI apply your change, and renders before/after in **sandboxed iframes with scripts disabled**.
- **Repo Quest** is real WebGL 3D (Three.js): a controllable explorer, dynamic torch lighting and shadows, platforms, collectible relics, and a treasure. Load a repo to generate checkpoints from its real history, or play the demo tomb.

---

## Pages

```
codearch/
├── index.html         # Home (Terminal IDE)
├── explore.html       # Ask why · Fence Guard · Fossil Finder · Bus-Factor
├── timemachine.html   # Line Time-Machine · Alternate History
├── preview.html       # Change Preview (real render / AI mock)
├── quest.html         # 3D Repo Quest game
├── demo.html          # Guided walkthrough (no key needed)
├── app.js             # Shared GitHub + AI client helpers
├── style.css          # Shared Terminal IDE styling
├── api/
│   └── ask.js         # Serverless → Gemini (mode-switched)
└── README.md
```

---

## Deploying to Vercel (free)

1. Push this folder to a GitHub repo.
2. Vercel: **Add New → Project → Import** → Framework **Other**, build settings empty.
3. Get a free Gemini key at **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
4. Vercel → **Settings → Environment Variables** → add `GEMINI_API_KEY` = your key (Production + Preview).
5. Deploy. Vercel auto-detects `api/ask.js`.

The reasoning features need the deployed backend. In a static/local preview, use **▶ Play demo** (fully self-contained), and the **Quest** game and GitHub browsing still work without the AI key.

---

## Honest limits

- Answers are a **reading of history**, grounded in the repo's commits/PRs/issues — not gospel. Open the linked sources to verify.
- **Alternate History** is informed speculation, clearly labelled.
- **Change Preview** is a prediction; the static render is accurate for plain HTML/CSS but build-step apps only get a described mock.
- GitHub's free API is rate-limited (60/hr without a token); Gemini's free tier is rate-limited too — wait a minute if you hit a limit.
- The **3D game is stylized**, not photorealistic — real WebGL, built from code, not a AAA asset pipeline.

---

## Configuration

- **Models:** `MODELS` in `api/ask.js` (Flash-Lite → Flash → newest). The first your key can use without quota wins.

---

*git archaeology, for humans. Your codebase has a memory — go read it.*
