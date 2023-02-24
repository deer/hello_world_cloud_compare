import { ConnInfo } from "https://deno.land/std@0.173.0/http/server.ts";
import { Context } from "netlify:edge";
import { getEnvs, handle } from "../../utils.ts";

export default async (req: Request, context: Context) => {
  const envs = getEnvs();
  return await handle(req, context, envs);
};

export const config = { path: "/" };
