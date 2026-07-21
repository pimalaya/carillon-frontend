import { describe, expect, it } from "vitest";

import { daysUntil, eventMeta, formatDate, watchDisplay } from "./format";

describe("formatDate", () => {
  it("renders an absolute short date from unix seconds", () => {
    // 2026-08-03T00:00:00Z — assert the year/day survive the format.
    const out = formatDate(Date.UTC(2026, 7, 3) / 1000);
    expect(out).toContain("2026");
    expect(out).toContain("3");
  });
  it("returns an em dash for empty input", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("daysUntil", () => {
  it("counts whole days ahead", () => {
    const inThreeDays = Math.floor(Date.now() / 1000) + 3 * 86_400 + 60;
    expect(daysUntil(inThreeDays)).toBe(4);
  });
  it("is negative for a past timestamp", () => {
    const yesterday = Math.floor(Date.now() / 1000) - 86_400;
    expect(daysUntil(yesterday)!).toBeLessThanOrEqual(0);
  });
});

describe("event/watch display", () => {
  it("maps new deliveries to a success tone", () => {
    expect(eventMeta("new").tone).toBe("success");
  });
  it("shows a paused (inactive) watch as muted", () => {
    const meta = watchDisplay(false);
    expect(meta.label).toBe("Paused");
    expect(meta.tone).toBe("muted");
    expect(meta.pulse).toBe(false);
  });
  it("marks a watching connection as pulsing success", () => {
    const meta = watchDisplay(true, "watching");
    expect(meta.tone).toBe("success");
    expect(meta.pulse).toBe(true);
  });
  it("marks an error connection as non-pulsing destructive", () => {
    const meta = watchDisplay(true, "error");
    expect(meta.tone).toBe("destructive");
    expect(meta.pulse).toBe(false);
  });
});
