import { describe, expect, it } from "vitest";
import { VIEWER_VERSION } from "./index.js";

describe("viewer", () => {
  it("exports viewer version", () => {
    expect(VIEWER_VERSION).toBe("0.1.0");
  });
});
