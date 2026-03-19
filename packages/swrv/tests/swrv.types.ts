import { ref } from "vue";

import useSWRV, {
  createSWRVClient,
  hydrateSWRVSnapshot,
  mutate,
  preload,
  serializeSWRVSnapshot,
  useSWRVImmutable,
} from "../src";
import useSWRVInfinite, { unstable_serialize as unstableSerializeInfinite } from "../src/infinite";
import useSWRVMutation from "../src/mutation";
import useSWRVSubscription from "../src/subscription";
import type { SWRVConfiguration, SWRVMiddleware, TriggerWithoutArgs } from "../src";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

const tupleKey: [string, number] = ["user", 1];

const tupleResponse = useSWRV(tupleKey, async (resource, id) => ({
  resource,
  id,
}));

const refKey = ref<[string, number]>(["team", 7]);
const refResponse = useSWRV(refKey, async (resource, id) => `${resource}:${id}`);

const immutableResponse = useSWRVImmutable(tupleKey, async (resource, id) => `${resource}:${id}`);
const falseFetcherResponse = useSWRV<string>("false-fetcher", false);
const snapshotClient = hydrateSWRVSnapshot(createSWRVClient(), {
  user: { id: "1" },
});
const serializedSnapshot = serializeSWRVSnapshot(snapshotClient);

const fallbackConfig = {
  fallback: {
    user: "seed",
  },
} satisfies SWRVConfiguration<string>;

const loggerMiddleware: SWRVMiddleware = (useSWRVNext) => (key, fetcher, config) =>
  useSWRVNext(key, fetcher, config);

const middlewareConfig = {
  use: [loggerMiddleware],
} satisfies SWRVConfiguration<string>;

const middlewareResponse = useSWRV<string, never, string>(
  "middleware",
  async (key: string) => key,
  middlewareConfig,
);

const boundMutateResponse = useSWRV<string[]>("bound-mutate");
const boundMutateResult = boundMutateResponse.mutate<string>(Promise.resolve("Cherry"), {
  populateCache: (result, currentData) => [...(currentData ?? []), result],
  revalidate: false,
});

const scopedMutateResult = mutate<string[], string>("scoped-mutate", Promise.resolve("Cherry"), {
  populateCache: (result, currentData) => [...(currentData ?? []), result],
  revalidate: false,
});

const filteredMutateResult = mutate<string, string>(
  (key) => key === "filtered-mutate",
  Promise.resolve("updated"),
  { revalidate: false },
);

const preloadedTuple = preload(tupleKey, async (resource, id) => `${resource}:${id}`);
const preloadedFunctionKey = preload(
  () => tupleKey,
  async (resource, id) => `${resource}:${id}`,
);

const infiniteResponse = useSWRVInfinite<string>(
  (index, previousPageData) => {
    if (previousPageData) {
      return [previousPageData, index] as const;
    }

    return ["page", index] as const;
  },
  async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
);

const infiniteMutate = infiniteResponse.mutate(["page:0"], {
  revalidate: (page, key) => page === "page:0" && Array.isArray(key),
});

const infiniteMutateTransform = infiniteResponse.mutate<string>(Promise.resolve("updated"), {
  populateCache: (result, currentData) => [...(currentData ?? []), result],
  revalidate: false,
});

const multiPageInfiniteResponse = useSWRVInfinite<string[]>(
  (index) => ["multi-page", index] as const,
  async (...args: readonly unknown[]) => [`page:${String(args[1])}`],
);

const multiPageInfiniteMutate = multiPageInfiniteResponse.mutate<string[]>(
  Promise.resolve(["B4"]),
  {
    optimisticData: (current) => [current?.[0] ?? [], [...(current?.[1] ?? []), "optimistic"]],
    populateCache: (result, currentData) => [
      currentData?.[0] ?? [],
      [...(currentData?.[1] ?? []), ...result],
    ],
    revalidate: false,
  },
);

const infiniteSerialized = unstableSerializeInfinite<string>((index, previousPageData) => {
  if (previousPageData) {
    return [previousPageData, index] as const;
  }

  return ["page", index] as const;
});

const mutation = useSWRVMutation(
  "user",
  async (key, { arg }: { arg: { name: string } }) => `${key}:${arg.name}`,
);

const mutationWithOptions = mutation.trigger(
  { name: "alice" },
  {
    populateCache: true,
    revalidate: (data, key) => key === "user" && (data?.length ?? 0) > 0,
  },
);

const mutationResult = mutation.trigger({ name: "alice" });

const numericMutation = useSWRVMutation<string, Error, number, string>(
  "numeric-user",
  async (_key, { arg }) => String(arg),
);

const numericMutationResult = numericMutation.trigger(1);
const numericMutationNoThrow = numericMutation.trigger(1, {
  throwOnError: false,
});

const optionalMutation = useSWRVMutation<string | undefined, Error, "foo" | undefined, string>(
  "optional-user",
  async (_key, { arg }) => arg?.toUpperCase(),
);

const optionalMutationNoArg = optionalMutation.trigger();
const optionalMutationUndefined = optionalMutation.trigger(undefined);
const optionalMutationFoo = optionalMutation.trigger("foo");

const noArgMutation = useSWRVMutation<string, Error, never, string>(
  "no-arg-user",
  async (key) => key,
);

const noArgMutationResult = noArgMutation.trigger();
const noArgMutationTrigger: TriggerWithoutArgs<string, Error, never, string> =
  noArgMutation.trigger;

const cachedDataMutation = useSWRVMutation<string, Error, "foo", string, string[]>(
  "cached-data-user",
  async (_key, { arg }) => arg.toUpperCase(),
);

const cachedDataMutationResult = cachedDataMutation.trigger<string[]>("foo", {
  optimisticData: (current) => [...(current ?? []), "optimistic"],
  populateCache: (result, current) => [...(current ?? []), result],
  revalidate: false,
});

const mutationThrowOffByDefault = useSWRVMutation<string, Error, "foo", string>(
  "throw-off",
  async (_key, { arg }) => arg.toUpperCase(),
  {
    throwOnError: false,
  },
);

const mutationThrowOffResult = mutationThrowOffByDefault.trigger("foo");

// @ts-expect-error required mutation args should stay required
void numericMutation.trigger();

// @ts-expect-error literal mutation args should be preserved
void cachedDataMutation.trigger("bar");

// @ts-expect-error no-arg mutation triggers should not accept arbitrary args
void noArgMutation.trigger("value");

// @ts-expect-error mutation responses should not expose bound mutate
void noArgMutation.mutate;

const subscription = useSWRVSubscription(
  ["room", 1] as [string, number],
  (key, { next }) => {
    next(undefined, `${key[0]}:${key[1]}`);
    return () => {};
  },
  { fallbackData: "fallback" },
);

const typedSubscriptionHandler: Parameters<
  typeof useSWRVSubscription<string, Error, [string, number]>
>[1] = (key, { next }) => {
  next(undefined, `${key[0]}:${key[1]}`);
  return () => {};
};

const maybeSubscriptionKey = Math.random() > 0.5 ? "subscription-key" : undefined;
useSWRVSubscription(maybeSubscriptionKey, (key, { next }) => {
  next(undefined, key.toUpperCase());
  return () => {};
});

const maybeSubscriptionTupleKey = Math.random() > 0.5 ? (["room", 1] as const) : undefined;
useSWRVSubscription(maybeSubscriptionTupleKey, (key, { next }) => {
  next(undefined, `${key[0]}:${key[1]}`);
  return () => {};
});

const maybeSubscriptionObjectKey = Math.random() > 0.5 ? { room: "alpha" } : undefined;
useSWRVSubscription(maybeSubscriptionObjectKey, (key, { next }) => {
  next(undefined, key.room.toUpperCase());
  return () => {};
});

// @ts-expect-error subscription handlers must return a dispose function
useSWRVSubscription("invalid", (_key, { next }) => {
  next(undefined, "value");
  return "not-a-function";
});

const typeAssertions = {
  tupleData: true as Expect<
    Equal<typeof tupleResponse.data.value, { resource: string; id: number } | undefined>
  >,
  refData: true as Expect<Equal<typeof refResponse.data.value, string | undefined>>,
  immutableData: true as Expect<Equal<typeof immutableResponse.data.value, string | undefined>>,
  falseFetcherData: true as Expect<
    Equal<typeof falseFetcherResponse.data.value, string | undefined>
  >,
  snapshotClient: true as Expect<Equal<typeof snapshotClient, ReturnType<typeof createSWRVClient>>>,
  serializedSnapshot: true as Expect<Equal<typeof serializedSnapshot, Record<string, unknown>>>,
  middlewareData: true as Expect<Equal<typeof middlewareResponse.data.value, string | undefined>>,
  boundMutateResult: true as Expect<
    Equal<Awaited<typeof boundMutateResult>, string[] | string | undefined>
  >,
  scopedMutateResult: true as Expect<Equal<Awaited<typeof scopedMutateResult>, string | undefined>>,
  filteredMutateResult: true as Expect<
    Equal<Awaited<typeof filteredMutateResult>, Array<string | undefined>>
  >,
  preloadedTuple: true as Expect<Equal<Awaited<typeof preloadedTuple>, string>>,
  preloadedFunctionKey: true as Expect<Equal<Awaited<typeof preloadedFunctionKey>, string>>,
  infiniteData: true as Expect<Equal<typeof infiniteResponse.data.value, string[] | undefined>>,
  infiniteSize: true as Expect<Equal<typeof infiniteResponse.size.value, number | undefined>>,
  infiniteMutate: true as Expect<Equal<Awaited<typeof infiniteMutate>, string[] | undefined>>,
  infiniteMutateTransform: true as Expect<
    Equal<Awaited<typeof infiniteMutateTransform>, string[] | string | undefined>
  >,
  multiPageInfiniteData: true as Expect<
    Equal<typeof multiPageInfiniteResponse.data.value, string[][] | undefined>
  >,
  multiPageInfiniteMutate: true as Expect<
    Equal<Awaited<typeof multiPageInfiniteMutate>, string[][] | string[] | undefined>
  >,
  infiniteSerialized: true as Expect<Equal<typeof infiniteSerialized, string>>,
  mutationArg: true as Expect<Equal<Parameters<typeof mutation.trigger>[0], { name: string }>>,
  mutationResult: true as Expect<Equal<Awaited<typeof mutationResult>, string>>,
  mutationWithOptions: true as Expect<Equal<Awaited<typeof mutationWithOptions>, string>>,
  numericMutationArg: true as Expect<Equal<Parameters<typeof numericMutation.trigger>[0], number>>,
  numericMutationResult: true as Expect<Equal<Awaited<typeof numericMutationResult>, string>>,
  numericMutationNoThrow: true as Expect<
    Equal<Awaited<typeof numericMutationNoThrow>, string | undefined>
  >,
  optionalMutationNoArg: true as Expect<
    Equal<Awaited<typeof optionalMutationNoArg>, string | undefined>
  >,
  optionalMutationUndefined: true as Expect<
    Equal<Awaited<typeof optionalMutationUndefined>, string | undefined>
  >,
  optionalMutationFoo: true as Expect<
    Equal<Awaited<typeof optionalMutationFoo>, string | undefined>
  >,
  noArgMutationResult: true as Expect<Equal<Awaited<typeof noArgMutationResult>, string>>,
  noArgMutationTrigger: true as Expect<
    Equal<typeof noArgMutationTrigger, TriggerWithoutArgs<string, Error, never, string>>
  >,
  cachedDataMutationResult: true as Expect<Equal<Awaited<typeof cachedDataMutationResult>, string>>,
  mutationThrowOffResult: true as Expect<
    Equal<Awaited<typeof mutationThrowOffResult>, string | undefined>
  >,
  subscriptionData: true as Expect<Equal<typeof subscription.data.value, string | undefined>>,
  subscriptionKey: true as Expect<
    Equal<Parameters<typeof typedSubscriptionHandler>[0], [string, number]>
  >,
};

void tupleResponse;
void fallbackConfig;
void middlewareConfig;
void middlewareResponse;
void boundMutateResponse;
void boundMutateResult;
void scopedMutateResult;
void filteredMutateResult;
void preloadedTuple;
void preloadedFunctionKey;
void refResponse;
void immutableResponse;
void infiniteResponse;
void infiniteMutate;
void infiniteMutateTransform;
void multiPageInfiniteResponse;
void multiPageInfiniteMutate;
void mutation;
void mutationResult;
void mutationWithOptions;
void numericMutation;
void numericMutationResult;
void numericMutationNoThrow;
void optionalMutation;
void optionalMutationNoArg;
void optionalMutationUndefined;
void optionalMutationFoo;
void noArgMutation;
void noArgMutationResult;
void cachedDataMutation;
void cachedDataMutationResult;
void mutationThrowOffByDefault;
void mutationThrowOffResult;
void subscription;
void typeAssertions;
