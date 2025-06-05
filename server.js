import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { open } from "https://deno.land/x/open@v0.0.6/index.ts";

const handler = async (req) => {
  const url = new URL(req.url);
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  try {
    const file = await Deno.readFile(`./dist${path}`);
    const contentType = path.endsWith(".html")
      ? "text/html"
      : path.endsWith(".css")
      ? "text/css"
      : path.endsWith(".js")
      ? "application/javascript"
      : "application/octet-stream";
    return new Response(file, { headers: { "content-type": contentType } });
  } catch {
    return new Response("404 Not Found", { status: 404 });
  }
};

console.log("Serveur sur http://localhost:8000");
open("http://localhost:8000");
await serve(handler, { port: 8000 });