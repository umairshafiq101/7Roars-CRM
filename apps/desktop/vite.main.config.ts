import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    conditions: ["node"],
    mainFields: ["module", "jsnext:main", "jsnext"],
    alias: {
      "sql.js": "sql.js/dist/sql-asm.js",
    },
  },
  build: {
    rollupOptions: {
      external: ["sharp", "uiohook-napi"],
    },
  },
});
