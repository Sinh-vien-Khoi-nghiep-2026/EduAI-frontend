import { serve } from "bun";
import index from "./index.html";

const server = serve({
  port: 8081,
  routes: { "/*": index },
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
});

console.log(`Server running at ${server.url}`);
