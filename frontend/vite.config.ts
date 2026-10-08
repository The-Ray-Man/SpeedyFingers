import { cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Copies the MediaPipe WASM runtime from the pinned npm package into
// public/mediapipe/wasm, so it is served by us and always matches the JS API.
function mediapipeWasm(): Plugin {
  return {
    name: "mediapipe-wasm",
    buildStart() {
      const require = createRequire(import.meta.url);
      const pkgDir = dirname(require.resolve("@mediapipe/tasks-vision"));
      const target = fileURLToPath(new URL("./public/mediapipe/wasm", import.meta.url));
      rmSync(target, { recursive: true, force: true });
      cpSync(resolve(pkgDir, "wasm"), target, { recursive: true });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [mediapipeWasm(), react(), tsconfigPaths()],
  server: {
    proxy: {
      // Forward all requests to the backend server
      "/api": "http://localhost:8000",
    },
  },
});
