import http from "node:http";
import { randomBytes } from "node:crypto";
import { validateAgroEvent } from "./index.js";

export class IdempotencyStore {
  constructor(limit = 10000) { this.limit = limit; this.ids = new Map(); }
  has(id) { return this.ids.has(id); }
  add(id) {
    this.ids.set(id, Date.now());
    while (this.ids.size > this.limit) this.ids.delete(this.ids.keys().next().value);
  }
}

export function createPairingSecret() { return randomBytes(24).toString("base64url"); }

export function createAgroBridge({ productId, port = 47821, host = "127.0.0.1", secret, onEvent = async () => {}, store = new IdempotencyStore() }) {
  if (!secret) throw new Error("Bridge exige segredo de pareamento");
  const server = http.createServer(async (req, res) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    if (req.method === "GET" && req.url === "/v1/health") return res.end(JSON.stringify({ ok:true, productId, protocol:"artisys-agro", version:"1.0" }));
    if (req.method !== "POST" || req.url !== "/v1/events") { res.statusCode=404; return res.end(JSON.stringify({error:"not_found"})); }
    if (req.headers.authorization !== `Bearer ${secret}`) { res.statusCode=401; return res.end(JSON.stringify({error:"unauthorized"})); }
    let body=""; for await (const chunk of req) body += chunk;
    try {
      const event=validateAgroEvent(JSON.parse(body));
      if (store.has(event.eventId)) return res.end(JSON.stringify({ok:true,duplicate:true,eventId:event.eventId}));
      await onEvent(event); store.add(event.eventId);
      res.end(JSON.stringify({ok:true,duplicate:false,eventId:event.eventId}));
    } catch (error) { res.statusCode=400; res.end(JSON.stringify({error:"invalid_event",message:error.message})); }
  });
  return {
    start: () => new Promise(resolve => server.listen(port,host,()=>resolve(server.address()))),
    stop: () => new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())),
    server
  };
}

export async function sendAgroEvent({ url, secret, event }) {
  validateAgroEvent(event);
  const response = await fetch(new URL("/v1/events", url), { method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${secret}`}, body:JSON.stringify(event) });
  const result=await response.json();
  if (!response.ok) throw new Error(result.message || result.error || `HTTP ${response.status}`);
  return result;
}
