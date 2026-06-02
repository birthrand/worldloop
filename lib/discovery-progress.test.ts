import { describe, expect, it } from "vitest";

import {
  applyDailyActivity,
  computeWorldProgressPercent,
  createEmptyWeekProgress,
  resolveVisitCountryId,
} from "@/lib/discovery-progress";

describe("discovery progress helpers", () => {
  it("resolves visit id from cca2 first", () => {
    expect(resolveVisitCountryId({ name: "Japan", cca2: "JP" })).toBe("JP");
  });

  it("computes world percent from visited count", () => {
    expect(computeWorldProgressPercent(0)).toBe(0);
    expect(computeWorldProgressPercent(3)).toBe(2);
  });

  it("marks week progress without starting streak on first app open", () => {
    const result = applyDailyActivity({
      streakDays: 0,
      lastActiveDate: null,
      weekProgress: createEmptyWeekProgress(),
      today: "2026-06-01",
    });

    expect(result.streakDays).toBe(0);
    expect(result.lastActiveDate).toBe("2026-06-01");
    expect(result.weekProgress[0]).toBe(true);
  });

  it("starts streak on consecutive app-open days", () => {
    const week = createEmptyWeekProgress();
    week[0] = true;

    const result = applyDailyActivity({
      streakDays: 0,
      lastActiveDate: "2026-06-01",
      weekProgress: week,
      today: "2026-06-02",
    });

    expect(result.streakDays).toBe(1);
    expect(result.weekProgress[1]).toBe(true);
  });

  it("does not increment streak twice on the same day", () => {
    const week = createEmptyWeekProgress();
    week[0] = true;

    const result = applyDailyActivity({
      streakDays: 2,
      lastActiveDate: "2026-06-01",
      weekProgress: week,
      today: "2026-06-01",
    });

    expect(result.streakDays).toBe(2);
  });

  it("increments streak on consecutive days", () => {
    const week = createEmptyWeekProgress();
    week[0] = true;

    const result = applyDailyActivity({
      streakDays: 2,
      lastActiveDate: "2026-06-01",
      weekProgress: week,
      today: "2026-06-02",
    });

    expect(result.streakDays).toBe(3);
    expect(result.weekProgress[1]).toBe(true);
  });
});
