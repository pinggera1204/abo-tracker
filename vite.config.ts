import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// GitHub Pages liefert für unbekannte Pfade die 404.html aus.
// Als Kopie der App funktionieren dadurch auch direkte Links.
function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      copyFileSync(resolve("dist/index.html"), resolve("dist/404.html"));
    },
  };
}

export default defineConfig({
  base: "/abo-tracker/",
  plugins: [react(), spaFallback()],
  server: { port: 5173, strictPort: true },
});
