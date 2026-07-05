/*
  Tenant Time Finder — shared-board Worker (Cloudflare)
  Stores each building's board JSON in KV under a room name, so every unit
  that opens the invite link sees and edits the same live calendar.

  ── Setup (about 5 minutes, free) ────────────────────────────────────────
  1. https://dash.cloudflare.com → Workers & Pages → Create → Worker.
  2. Replace the worker code with this file, and Deploy.
  3. Storage & Databases → KV → Create namespace, e.g. "TTF".
  4. Your Worker → Settings → Variables → KV Namespace Bindings →
     Add binding:  Variable name = TTF   Namespace = the one you made.
  5. Copy your Worker URL (https://<name>.<sub>.workers.dev).
  6. In the app → Share & collect → paste the URL, pick a Room name
     (e.g. your address), turn on live sharing, then Copy invite link
     and send it to the tenants.

  Privacy: only unit labels and marked times are stored — no names required,
  no accounts. Anyone with the room name can read/write that board, so use a
  non-obvious room name. To lock it down further, replace ALLOW_ORIGIN "*"
  with your GitHub Pages origin.
*/
const ALLOW_ORIGIN = "*"; // e.g. "https://yourname.github.io"
const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const json = (o, s = 200) =>
      new Response(JSON.stringify(o), { status: s, headers: { ...cors, "content-type": "application/json" } });

    if (req.method === "GET") {
      const room = (url.searchParams.get("room") || "default").slice(0, 60);
      const v = await env.TTF.get("room:" + room);
      return new Response(v || JSON.stringify({ board: null }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    if (req.method === "POST") {
      let body;
      try { body = await req.json(); } catch (e) { return json({ error: "bad json" }, 400); }
      const room = String(body.room || "default").slice(0, 60);
      if (!body.board || !Array.isArray(body.board.participants)) return json({ error: "no board" }, 400);
      await env.TTF.put("room:" + room, JSON.stringify({ board: body.board, at: Date.now() }));
      return json({ ok: true });
    }
    return json({ error: "method" }, 405);
  },
};
