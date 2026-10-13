// CodeArchaeologist — one serverless endpoint, mode-switched. Calls Gemini.
// The frontend gathers the repo's git context (commits/PRs/issues/file) and sends it here.
// Key from GEMINI_API_KEY.

const MODELS = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];

const SHAPES = {
  why:        '{"title":"short","summary":"1-2 sentence why","points":["evidence-based point"],"sources":[{"label":"commit/PR/issue","url":"..."}]}',
  fence:      '{"title":"short","summary":"why this code exists","risk":"what breaks if removed","points":["what it protects"],"sources":[{"label":"...","url":"..."}]}',
  fossil:     '{"title":"short","summary":"is this dead/orphaned and why","points":["signals it is a fossil"],"verdict":"FOSSIL|ALIVE|UNSURE","sources":[{"label":"...","url":"..."}]}',
  busfactor:  '{"title":"short","summary":"knowledge-risk read","points":["who holds this knowledge / risk"],"riskLevel":"LOW|MEDIUM|HIGH","sources":[{"label":"...","url":"..."}]}',
  whatif:     '{"title":"short","summary":"what would have happened instead","points":["consequence"],"sources":[{"label":"...","url":"..."}]}',
  timemachine:'{"title":"short","summary":"how this line evolved","layers":[{"when":"year","what":"change","why":"reason"}],"sources":[{"label":"...","url":"..."}]}',
  quest:      '{"levels":[{"title":"level name","era":"year","fact":"one real thing about the repo history","question":"quiz q","options":["a","b","c"],"answer":0}]}',
  preview:    '{"summary":"what the change would do visually","changedHtml":"the FULL modified HTML document if an original was given, else empty string","visualNotes":["concrete UI effect"],"confidence":"LOW|MED|HIGH"}'
};

const INTRO = {
  why: "You are a senior engineer explaining WHY a piece of code is the way it is, using the repo history provided. Reconstruct the reasoning from commit messages, PRs and issues.",
  fence: "You are guarding against careless deletion (Chesterton's Fence). Explain why this code exists and precisely what would break or regress if it were removed, from the history.",
  fossil: "You detect dead/orphaned 'fossil' code. From the history and context, judge whether this looks abandoned/unused and tell its story.",
  busfactor: "You assess knowledge risk (bus factor). From the authorship/history, say how concentrated the knowledge of this code is and who holds it.",
  whatif: "You explore an alternate history. Given the real decision in the history, reason about what would likely have happened if it had NOT been made.",
  timemachine: "You narrate how a single line/area evolved across its history, layer by layer, with the reason for each change.",
  quest: "You design a short learning game from a repo's real history. Produce 4-6 levels, each tied to a REAL event in the provided history, each with one fact and a simple quiz.",
  preview: "You predict the visual effect of a proposed code change on a web UI. Be concrete about what a viewer would see. Do not claim certainty."
};

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(405).json({error:"Use POST."});

  const key = process.env.GEMINI_API_KEY;
  if(!key) return res.status(500).json({error:"GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy."});

  let body = req.body; if(typeof body==="string"){ try{body=JSON.parse(body);}catch(e){body={};} }
  const mode = SHAPES[body.mode] ? body.mode : "why";
  const repo = (body.repo||"").toString().slice(0,120);
  const question = (body.question||"").toString().slice(0,600);
  const context = (body.context||"").toString().slice(0, 24000); // commit/PR/issue/file text gathered client-side

  const prompt =
`${INTRO[mode]}

Repository: ${repo || "(unknown)"}
${question ? "User question / target: " + question + "\n" : ""}
REPO HISTORY & CONTEXT (gathered from the GitHub API — commits, PRs, issues, file snippets):
---
${context || "(no context was provided)"}
---

Ground every claim in the context above. If the context doesn't support an answer, say so honestly rather than inventing history.
Return ONLY a JSON object (no markdown fences) exactly in this shape:
${SHAPES[mode]}`;

  const maxOut = mode === "preview" ? 7000 : (mode === "quest" ? 2200 : 1400);
  const payload = { contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.25, maxOutputTokens:maxOut} };

  try{
    let data=null, lastErr=null, quota=false;
    for(const model of MODELS){
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const j = await r.json();
      if(r.ok){ data=j; break; }
      lastErr=(j&&j.error&&j.error.message)?j.error.message:("HTTP "+r.status);
      if(r.status===429){ quota=true; continue; }
      if(r.status===404||r.status===403) continue;
      return res.status(502).json({error:lastErr});
    }
    if(!data) return res.status(429).json({error: quota
      ? "The free Gemini tier is rate-limited right now. Wait a minute and try again. ("+(lastErr||"quota")+")"
      : ("No usable model for this key. "+(lastErr||""))});

    const cand = data.candidates && data.candidates[0];
    let text = ((cand&&cand.content&&cand.content.parts)||[]).map(p=>p.text||"").join("").trim();
    text = text.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
    let parsed; try{ parsed=JSON.parse(text); }catch(e){ const m=text.match(/\{[\s\S]*\}/); if(m){ try{parsed=JSON.parse(m[0]);}catch(e2){} } }
    if(!parsed) return res.status(200).json({title:"",summary:text.slice(0,800),points:[],sources:[]});
    parsed._mode = mode;
    return res.status(200).json(parsed);
  }catch(err){
    return res.status(502).json({error:"Could not reach the reasoning service: "+(err&&err.message?err.message:"unknown")});
  }
}
