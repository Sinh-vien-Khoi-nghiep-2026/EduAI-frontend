import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { configureApiOrigin } from "./api/client";
import type { RuntimeConfig } from "./runtime-config";

const elem = document.getElementById("root")!;

try {
  const response = await fetch("/runtime-config.json", { cache: "no-store" });
  if (response.ok) configureApiOrigin((await response.json() as RuntimeConfig).apiBaseUrl);
} catch {
  // ConfigurationError renders when runtime configuration cannot be read.
}

(import.meta.hot.data.root ??= createRoot(elem)).render(<StrictMode><App /></StrictMode>);
