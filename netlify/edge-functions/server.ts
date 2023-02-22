export default function serve() {
    return new Response(
        `Hello from deno!`,
      );
}

export const config = { path: "/" }
