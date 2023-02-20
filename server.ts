import { serve } from "https://deno.land/std@0.173.0/http/server.ts";

serve(() => {
  return new Response(
    `Hello from deno.`,
  );
}, { port: 8080 });
