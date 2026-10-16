import { describe, expect, it } from "vitest";
import { ANALYZER_VERSION } from "./index.js";

describe("analyzer", () => {
  it("exports analyzer version", () => {
    expect(ANALYZER_VERSION).toBe("0.1.0");
  });
});
