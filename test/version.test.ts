import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version.js";

describe("package", () => {
  it("exposes a version", () => {
    expect(VERSION).toBeTruthy();
  });
});
