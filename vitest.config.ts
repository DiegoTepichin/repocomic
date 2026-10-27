import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The first render loads fonts and Satori's layout engine, which takes seconds on slow CI runners.
    testTimeout: 30_000,
  },
});
