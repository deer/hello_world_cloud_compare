import { serve, ConnInfo } from "https://deno.land/std@0.173.0/http/server.ts";
import { getEnvs, handle } from "./utils.ts";

serve (async (req: Request, connInfo: ConnInfo) => {
  const envs = getEnvs();
  return await handle(req, connInfo, envs);
}, { port: 8080 });
