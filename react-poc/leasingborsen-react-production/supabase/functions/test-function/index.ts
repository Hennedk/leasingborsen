// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  const body = await req.text();
  return new Response(
    JSON.stringify({ echo: body || null }),
    { headers: { "content-type": "application/json" } },
  );
});

