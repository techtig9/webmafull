import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  esbuild: {
    // tsconfig.json sets "jsx": "preserve" for Next's own SWC compiler, which
    // defaults to the automatic runtime — but vitest's esbuild transform doesn't
    // read that, so .tsx test/component files need it spelled out explicitly or
    // every file using JSX (like Toast.tsx) fails with "React is not defined".
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
