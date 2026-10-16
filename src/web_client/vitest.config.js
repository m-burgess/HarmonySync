import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/appLogic.js", "src/lib/transposer.js"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 85 },
    },
  },
});
