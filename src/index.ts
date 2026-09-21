import { serve } from "bun";
import index from "./index.html";

const port = Number(process.env.PORT ?? 8081);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a TCP port from 1 through 65535.");

const server = serve({
  port,
  routes: { "/*": index },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});

console.log(`Server running at ${server.url}`);
