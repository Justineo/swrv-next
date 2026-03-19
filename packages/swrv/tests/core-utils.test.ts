import { describe, expect, it } from "vite-plus/test";

import { SWRVConfig } from "../src";
import { stableHash } from "../src/_internal";
import { mergeConfiguration } from "../src/config";
import type { SWRVMiddleware } from "../src";

describe("swrv core utility behavior", () => {
  it("generates stable hashes for primitives, structured values, and references", () => {
    expect(stableHash([1, "key", null, undefined, false])).toBe(
      stableHash([1, "key", null, undefined, false]),
    );
    expect(stableHash([{ x: 1, y: 2 }])).toBe(stableHash([{ y: 2, x: 1 }]));
    expect(stableHash([{ x: { y: 2 }, z: undefined }])).toBe(
      stableHash([{ z: undefined, x: { y: 2 } }]),
    );

    const firstFunction = () => {};
    const secondFunction = () => {};
    expect(stableHash([firstFunction])).toBe(stableHash([firstFunction]));
    expect(stableHash([firstFunction])).not.toBe(stableHash([secondFunction]));

    const firstSet = new Set();
    const secondSet = new Set();
    expect(stableHash([firstSet])).toBe(stableHash([firstSet]));
    expect(stableHash([firstSet])).not.toBe(stableHash([secondSet]));

    const firstBuffer = new ArrayBuffer(0);
    const secondBuffer = new ArrayBuffer(0);
    expect(stableHash([firstBuffer])).toBe(stableHash([firstBuffer]));
    expect(stableHash([firstBuffer])).not.toBe(stableHash([secondBuffer]));

    expect(stableHash([new Date(1234)])).toBe(stableHash([new Date(1234)]));
    expect(stableHash([/test/])).toBe(stableHash([/test/]));
    expect(stableHash([Symbol("key")])).toBe(stableHash([Symbol("key")]));
  });

  it("stays stable for circular structures while distinguishing other shapes", () => {
    const circularObject: { self?: unknown } = {};
    circularObject.self = circularObject;

    const circularArray: unknown[] = [];
    circularArray.push(circularArray);

    expect(stableHash([circularObject])).toBe(stableHash([circularObject]));
    expect(stableHash([circularArray])).toBe(stableHash([circularArray]));
    expect(stableHash([circularObject])).not.toBe(stableHash([{}]));
    expect(stableHash([circularArray])).not.toBe(stableHash([[]]));
  });

  it("merges fallback and middleware like swr mergeConfigs", () => {
    const middlewareA: SWRVMiddleware = (useSWRVNext) => (key, fetcher, config) =>
      useSWRVNext(key, fetcher, config);
    const middlewareB: SWRVMiddleware = (useSWRVNext) => (key, fetcher, config) =>
      useSWRVNext(key, fetcher, config);
    const initFocus = () => () => {};
    const initReconnect = () => () => {};

    const merged = mergeConfiguration(
      mergeConfiguration(SWRVConfig.defaultValue, {
        fallback: { a: 1 },
        use: [middlewareA],
      }),
      {
        fallback: { b: 2 },
        initFocus,
        initReconnect,
        use: [middlewareB],
      },
    );

    expect(merged.fallback).toEqual({ a: 1, b: 2 });
    expect(merged.use).toEqual([middlewareA, middlewareB]);
    expect(merged.initFocus).toBe(initFocus);
    expect(merged.initReconnect).toBe(initReconnect);
  });
});
