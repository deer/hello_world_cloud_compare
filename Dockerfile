FROM denoland/deno:1.30.3 as base

USER deno

WORKDIR /app

COPY . ./

RUN deno cache server.ts

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "server.ts"]
