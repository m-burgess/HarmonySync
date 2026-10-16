import { describe, expect, it } from "vitest";
import {
  nashvilleToStandard,
  getCapoFret,
  suggestCapoKey,
  toCagedLeadShape,
} from "./transposer";

describe("Nashville chord transposition", () => {
  it("transposes scale degrees and slash bass degrees", () => {
    expect(nashvilleToStandard("1", "C")).toBe("C");
    expect(nashvilleToStandard("6m", "C")).toBe("Am");
    expect(nashvilleToStandard("5", "D")).toBe("A");
    expect(nashvilleToStandard("4maj7", "G")).toBe("Cmaj7");
    expect(nashvilleToStandard("1/3", "C")).toBe("C/E");
    expect(nashvilleToStandard("4/5", "G")).toBe("C/D");
    expect(nashvilleToStandard("6m7/5", "D")).toBe("Bm7/A");
  });

  it("preserves invalid input and handles empty values", () => {
    expect(nashvilleToStandard("N.C.", "C")).toBe("N.C.");
    expect(nashvilleToStandard("1", "H")).toBe("1");
    expect(nashvilleToStandard("", "C")).toBe("");
    expect(nashvilleToStandard("1", "")).toBe("1");
  });
});

describe("capo and CAGED helpers", () => {
  it("suggests capo keys and fret positions", () => {
    expect(suggestCapoKey("E")).toBe("C");
    expect(suggestCapoKey("A")).toBe("G");
    expect(suggestCapoKey("H")).toBe("C");
    expect(getCapoFret("E", "C")).toBe(4);
    expect(getCapoFret("A", "G")).toBe(2);
    expect(getCapoFret("H", "C")).toBe(0);
  });

  it("chooses a lead shape and preserves unrecognized chords", () => {
    expect(toCagedLeadShape("C")).toBe("C [C-shape fret 0]");
    expect(toCagedLeadShape("G")).toBe("G [D-shape fret 5]");
    expect(toCagedLeadShape("D")).toBe("D [A-shape fret 5]");
    expect(toCagedLeadShape("N.C.")).toBe("N.C.");
    expect(toCagedLeadShape("")).toBe("");
  });
});
