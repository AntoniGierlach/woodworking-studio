import { describe, expect, it } from "vitest";
import { moveItem } from "./reorder";

describe("moveItem", () => {
  it("moves items in both directions without mutating the original", () => {
    const original = ["a", "b", "c", "d"];
    expect(moveItem(original, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(original, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(original, 2, 2)).toEqual(original);
    expect(original).toEqual(["a", "b", "c", "d"]);
  });

  it("rejects invalid positions", () => {
    expect(() => moveItem(["a"], -1, 0)).toThrow(RangeError);
    expect(() => moveItem(["a"], 0, 1)).toThrow(RangeError);
  });
});
