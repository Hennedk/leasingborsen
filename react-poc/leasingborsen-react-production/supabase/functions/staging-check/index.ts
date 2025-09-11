// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((_req) =>
  new Response(
    JSON.stringify({ ok: true, ts: new Date().toISOString() }),
    { headers: { "content-type": "application/json" } },
  )
);

