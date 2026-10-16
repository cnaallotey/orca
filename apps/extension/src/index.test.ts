import { describe, expect, it } from "vitest";
import { EXTENSION_VERSION } from "./index.js";

describe("extension", () => {
  it("exports extension version", () => {
    expect(EXTENSION_VERSION).toBe("0.1.0");
  });
});
