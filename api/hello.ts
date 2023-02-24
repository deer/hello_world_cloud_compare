import { getEnvs, handle } from ".././utils.ts";

export default async (req: Request, context: Context) => {
  const envs = getEnvs();
  return await handle(req, context, envs);
};
