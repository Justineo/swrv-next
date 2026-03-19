import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { SWRVConfig } from "../src";

function createEventTarget() {
  const listeners = new Map<string, Set<() => void>>();

  return {
    addEventListener(type: string, callback: () => void) {
      const current = listeners.get(type) ?? new Set<() => void>();
      current.add(callback);
      listeners.set(type, current);
    },
    emit(type: string) {
      for (const callback of listeners.get(type) ?? []) {
        callback();
      }
    },
    removeEventListener(type: string, callback: () => void) {
      const current = listeners.get(type);
      if (!current) {
        return;
      }

      current.delete(callback);
      if (current.size === 0) {
        listeners.delete(type);
      }
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("swrv default web preset behavior", () => {
  it("uses deep equality for the default compare function", () => {
    expect(SWRVConfig.defaultValue.compare({ nested: ["a"] }, { nested: ["a"] })).toBe(true);
    expect(SWRVConfig.defaultValue.compare({ nested: ["a"] }, { nested: ["b"] })).toBe(false);
  });

  it("wires SWRVConfig.defaultValue.initFocus to window focus events", () => {
    const target = createEventTarget();
    vi.stubGlobal("window", target);
    vi.stubGlobal("document", undefined);

    const callback = vi.fn();
    const release = SWRVConfig.defaultValue.initFocus(callback);

    target.emit("focus");
    expect(callback).toHaveBeenCalledTimes(1);

    if (typeof release === "function") {
      release();
    }
    target.emit("focus");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("wires SWRVConfig.defaultValue.initFocus to document visibilitychange events", () => {
    const target = Object.assign(createEventTarget(), {
      visibilityState: "hidden" as DocumentVisibilityState,
    });
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", target);

    const callback = vi.fn();
    const release = SWRVConfig.defaultValue.initFocus(callback);

    target.emit("visibilitychange");
    expect(callback).toHaveBeenCalledTimes(1);

    if (typeof release === "function") {
      release();
    }
    target.emit("visibilitychange");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("wires SWRVConfig.defaultValue.initReconnect to window online and offline events", () => {
    const target = createEventTarget();
    vi.stubGlobal("window", target);

    const callback = vi.fn();
    const release = SWRVConfig.defaultValue.initReconnect(callback);

    target.emit("offline");
    expect(callback).toHaveBeenCalledTimes(0);
    expect(SWRVConfig.defaultValue.isOnline()).toBe(false);

    target.emit("online");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(SWRVConfig.defaultValue.isOnline()).toBe(true);

    if (typeof release === "function") {
      release();
    }
    target.emit("online");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("safely no-ops when browser globals are missing event APIs", () => {
    vi.stubGlobal("window", { dispatchEvent() {} });
    vi.stubGlobal("document", undefined);

    const onFocus = vi.fn();
    const onReconnect = vi.fn();
    const releaseFocus = SWRVConfig.defaultValue.initFocus(onFocus);
    const releaseReconnect = SWRVConfig.defaultValue.initReconnect(onReconnect);

    if (typeof releaseFocus === "function") {
      releaseFocus();
    }

    if (typeof releaseReconnect === "function") {
      releaseReconnect();
    }

    expect(onFocus).toHaveBeenCalledTimes(0);
    expect(onReconnect).toHaveBeenCalledTimes(0);
  });
});
