import { describe, expect, it } from "vitest";

import {
  isSupersededCameraExecution,
  nextCameraExecutionIntentId,
} from "@/lib/map-camera-execution";
import { nextMapNavigationIntentId } from "@/lib/map-navigation-intent";

describe("map-camera-execution", () => {
  it("marks older executions as superseded", () => {
    expect(isSupersededCameraExecution(3, 3)).toBe(false);
    expect(isSupersededCameraExecution(3, 4)).toBe(true);
  });

  it("always advances past the current execution id", () => {
    expect(nextCameraExecutionIntentId(10)).toBeGreaterThan(10);
    const first = nextCameraExecutionIntentId(0);
    const second = nextCameraExecutionIntentId(first);
    expect(second).toBeGreaterThan(first);
  });

  it("shares the global intent counter without reusing execution generations", () => {
    const before = nextMapNavigationIntentId();
    const executionId = nextCameraExecutionIntentId(before);
    expect(executionId).toBeGreaterThan(before);
  });
});
