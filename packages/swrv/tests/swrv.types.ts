import { ref } from "vue";

import useSWRV, {
  SWRVConfig,
  createSWRVClient,
  hydrateSWRVSnapshot,
  mutate,
  preload,
  serializeSWRVSnapshot,
  useSWRVConfig,
  useSWRVImmutable,
} from "../src";
import useSWRVInfinite, { unstable_serialize as unstableSerializeInfinite } from "../src/infinite";
import useSWRVMutation from "../src/mutation";
import useSWRVSubscription from "../src/subscription";
import type {
  Arguments,
  Cache,
  Key,
  KeyedMutator,
  State,
  SWRVConfiguration,
  SWRVMutationConfiguration,
  SWRVMiddleware,
  TriggerWithoutArgs,
} from "../src";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

type SWRVConfigProps = InstanceType<typeof SWRVConfig>["$props"];

const tupleKey: [string, number] = ["user", 1];

const tupleResponse = useSWRV(tupleKey, async (resource, id) => ({
  resource,
  id,
}));
const readonlyTupleKey = [{ a: "1", b: { c: "3" } }, [1231, "888"]] as const;
const readonlyTupleResponse = useSWRV(readonlyTupleKey, async (resource, nested) => ({
  resource,
  nested,
}));

const refKey = ref<[string, number]>(["team", 7]);
const refResponse = useSWRV(refKey, async (resource, id) => `${resource}:${id}`);
const configAccessor = useSWRVConfig();
const maybeStringKey = Math.random() > 0.5 ? ("/api/user" as const) : null;
const maybeFalseStringKey = Math.random() > 0.5 ? ("/api/user" as const) : false;
const recordKey = { a: "1", b: { c: "3", d: 2 } };
const maybeRecordKey = Math.random() > 0.5 ? recordKey : null;
const maybeFalseRecordKey = Math.random() > 0.5 ? recordKey : false;

useSWRV("/api/user" as const, (key) => {
  type StringKey = Expect<Equal<typeof key, "/api/user">>;
  void (true as StringKey);
  return key;
});

useSWRV(maybeStringKey, (key) => {
  type MaybeStringKey = Expect<Equal<typeof key, "/api/user">>;
  void (true as MaybeStringKey);
  return key;
});

useSWRV(maybeFalseStringKey, (key) => {
  type MaybeFalseStringKey = Expect<Equal<typeof key, "/api/user">>;
  void (true as MaybeFalseStringKey);
  return key;
});

useSWRV(recordKey, (key) => {
  type RecordKey = Expect<Equal<typeof key, { a: string; b: { c: string; d: number } }>>;
  void (true as RecordKey);
  return key;
});

useSWRV(maybeRecordKey, (key) => {
  type MaybeRecordKey = Expect<Equal<typeof key, { a: string; b: { c: string; d: number } }>>;
  void (true as MaybeRecordKey);
  return key;
});

useSWRV(maybeFalseRecordKey, (key) => {
  type MaybeFalseRecordKey = Expect<Equal<typeof key, { a: string; b: { c: string; d: number } }>>;
  void (true as MaybeFalseRecordKey);
  return key;
});

useSWRV(
  () => "/api/user",
  (key) => {
    type ReturnStringKey = Expect<Equal<typeof key, string>>;
    void (true as ReturnStringKey);
    return key;
  },
);

useSWRV(
  () => (Math.random() > 0.5 ? ("/api/user" as const) : null),
  (key) => {
    type ReturnNullableStringKey = Expect<Equal<typeof key, "/api/user">>;
    void (true as ReturnNullableStringKey);
    return key;
  },
);

useSWRV(
  () => (Math.random() > 0.5 ? ("/api/user" as const) : false),
  (key) => {
    type ReturnFalseStringKey = Expect<Equal<typeof key, "/api/user">>;
    void (true as ReturnFalseStringKey);
    return key;
  },
);

const immutableResponse = useSWRVImmutable(tupleKey, async (resource, id) => `${resource}:${id}`);
const configFetcherResponse = useSWRV("/api/config" as const, {
  fetcher: async (key) => {
    type ConfigFetcherKey = Expect<Equal<typeof key, "/api/config">>;
    void (true as ConfigFetcherKey);
    return key;
  },
});
const configTupleResponse = useSWRV(tupleKey, {
  fetcher: async (resource, id) => {
    type ConfigTupleResource = Expect<Equal<typeof resource, string>>;
    type ConfigTupleId = Expect<Equal<typeof id, number>>;
    void (true as ConfigTupleResource);
    void (true as ConfigTupleId);
    return `${resource}:${id}`;
  },
});
const immutableConfigFetcherResponse = useSWRVImmutable("immutable-config" as const, {
  fetcher: async (key) => {
    type ImmutableConfigKey = Expect<Equal<typeof key, "immutable-config">>;
    void (true as ImmutableConfigKey);
    return key;
  },
});
const fallbackOnlyResponse = useSWRV<string>("config-fallback" as const, {
  fallbackData: "fallback",
});
const fallbackFetcherResponse = useSWRV("fetcher-fallback" as const, async (key) => key, {
  fallbackData: "fallback",
});
const immutableFallbackResponse = useSWRVImmutable<string>("immutable-fallback" as const, {
  fallbackData: "fallback",
});
const objectFallbackResponse = useSWRV(
  "object-fallback" as const,
  async (key) => ({ value: key }),
  { fallbackData: { value: "fallback" } },
);
const snapshotClient = hydrateSWRVSnapshot(createSWRVClient(), {
  user: { id: "1" },
});
const serializedSnapshot = serializeSWRVSnapshot(snapshotClient);

const fallbackConfig = {
  fallback: {
    user: "seed",
    userPromise: Promise.resolve("seed"),
  },
} satisfies SWRVConfiguration<string>;
const providerConfig = {
  provider: () => new Map<string, { isLoading: boolean; isValidating: boolean }>(),
  isOnline: () => true,
  isVisible: () => true,
  initFocus: (_callback: () => void) => undefined,
  initReconnect: (_callback: () => void) => undefined,
} satisfies SWRVConfiguration<string>;
const validUndefinedConfigProps: SWRVConfigProps = {
  value: undefined,
};
const validCallbackConfigProps: SWRVConfigProps = {
  value: () => ({}),
};
const keyAliasFromRef: Key = ref("/api/root-key");
const keyAliasFromGetter: Key = () => "/api/root-getter";
const publicStateAlias: State<string, Error> = {
  data: "value",
  error: undefined,
  isLoading: false,
  isValidating: true,
};
const publicCacheAlias: Cache<string, Error> = {
  get: (_key) => publicStateAlias,
  set: (_key, _value) => undefined,
  delete: (_key) => undefined,
  keys: function* () {},
};

// @ts-expect-error SWRVConfig.value should not accept null
const _invalidNullConfigProps: SWRVConfigProps = { value: null };

// @ts-expect-error SWRVConfig.value callback should return a config object
const _invalidNumericConfigProps: SWRVConfigProps = { value: () => 0 };

const loggerMiddleware: SWRVMiddleware = (useSWRVNext) => (key, fetcher, config) =>
  useSWRVNext(key, fetcher, config);

const middlewareConfig = {
  use: [loggerMiddleware],
} satisfies SWRVConfiguration<string>;

const eventConfig = {
  initFocus: (callback: () => void) => {
    callback();
    return () => {};
  },
  initReconnect: (callback: () => void) => {
    callback();
    return () => {};
  },
} satisfies SWRVConfiguration<string>;

const typedInitFocus: NonNullable<SWRVConfiguration<string>["initFocus"]> = eventConfig.initFocus;

const middlewareResponse = useSWRV<string, never, string>(
  "middleware",
  async (key: string) => key,
  middlewareConfig,
);

const boundMutateResponse = useSWRV<string[]>("bound-mutate");
const boundMutateCallbackResult = boundMutateResponse.mutate(async () => "1");
const boundMutateNoPopulateResult = boundMutateResponse.mutate(async () => "1", {
  populateCache: false,
});
const boundMutateResult = boundMutateResponse.mutate<string>(Promise.resolve("Cherry"), {
  populateCache: (result, currentData) => [...(currentData ?? []), result],
  revalidate: false,
});

const filteredNumberMutateResult = mutate<number>(
  (key) => {
    type FilteredKey = Expect<Equal<typeof key, Arguments | undefined>>;
    void (true as FilteredKey);
    return typeof key === "string" && key.startsWith("swr");
  },
  (data) => {
    type FilteredData = Expect<Equal<typeof data, number | undefined>>;
    void (true as FilteredData);
    return 0;
  },
);
const scopedStringMutateResult = mutate<string>("string", (data) => {
  type ScopedStringData = Expect<Equal<typeof data, string | undefined>>;
  void (true as ScopedStringData);
  return "0";
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

const literalPreload = preload<"value">("literal-key" as const, () =>
  Promise.resolve("value" as const),
);
const syncLiteralPreload = preload<"value">(
  () => "sync-literal-key" as const,
  () => "value" as const,
);
const explicitLiteralPreload = preload<"value">(
  () => "explicit-literal-key" as const,
  () => "value" as const,
);
const preloadedTuple = preload(tupleKey, async (resource, id) => `${resource}:${id}`);
const preloadedFunctionKey = preload(
  () => tupleKey,
  async (resource, id) => `${resource}:${id}`,
);
const optionRecordResponse = useSWRV(recordKey, {
  fetcher: async (key) => {
    type OptionRecordKey = Expect<Equal<typeof key, { a: string; b: { c: string; d: number } }>>;
    void (true as OptionRecordKey);
    return key;
  },
});
const optionStringResponse = useSWRV(
  () => (Math.random() > 0.5 ? ("/api/option-user" as const) : null),
  {
    fetcher: async (key) => {
      type OptionStringKey = Expect<Equal<typeof key, "/api/option-user">>;
      void (true as OptionStringKey);
      return key;
    },
  },
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

const infiniteConfigFetcherResponse = useSWRVInfinite<string, never, string>(
  (index) => `page-${index}`,
  {
    fetcher: async (key: string) => {
      type InfiniteConfigKey = Expect<Equal<typeof key, string>>;
      void (true as InfiniteConfigKey);
      return key;
    },
  },
);
const infiniteTupleFetcherResponse = useSWRVInfinite(
  (index) => ["typed-page", index] as const,
  async (prefix, page) => `${prefix}:${page}`,
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
const extraParamMutation = useSWRVMutation("extra-param" as const, (key, opts) => {
  type ExtraParamKey = Expect<Equal<typeof key, "extra-param">>;
  void (true as ExtraParamKey);
  void opts;
  return key;
});
const extraParamTrigger: TriggerWithoutArgs<"extra-param", unknown, "extra-param", never> =
  extraParamMutation.trigger;
const extraParamTriggerResult = extraParamMutation.trigger();

const mutationWithOptions = mutation.trigger(
  { name: "alice" },
  {
    populateCache: true,
    revalidate: (data, key) => key === "user" && (data?.length ?? 0) > 0,
  },
);

const typedMutationCallbacks: SWRVMutationConfiguration<string, Error, string, { name: string }> = {
  onError(_error, key) {
    type MutationErrorKey = Expect<Equal<typeof key, string>>;
    void (true as MutationErrorKey);
  },
  onSuccess(_data, key) {
    type MutationSuccessKey = Expect<Equal<typeof key, string>>;
    void (true as MutationSuccessKey);
  },
};
const tupleMutationCallbacks: SWRVMutationConfiguration<
  string,
  Error,
  readonly ["tuple", number],
  void
> = {
  onSuccess(_data, key) {
    type TupleMutationSuccessKey = Expect<Equal<typeof key, string>>;
    void (true as TupleMutationSuccessKey);
  },
};

const mutationResult = mutation.trigger({ name: "alice" });

const numericMutation = useSWRVMutation<string, Error, string, number>(
  "numeric-user",
  async (_key, { arg }) => String(arg),
);

const numericMutationResult = numericMutation.trigger(1);
const numericMutationNoThrow = numericMutation.trigger(1, {
  throwOnError: false,
});

const optionalMutation = useSWRVMutation<string | undefined, Error, string, "foo" | undefined>(
  "optional-user",
  async (_key, { arg }) => arg?.toUpperCase(),
);

const optionalMutationNoArg = optionalMutation.trigger();
const optionalMutationUndefined = optionalMutation.trigger(undefined);
const optionalMutationFoo = optionalMutation.trigger("foo");

const noArgMutation = useSWRVMutation<string, Error, string, never>(
  "no-arg-user",
  async (key) => key,
);

const noArgMutationResult = noArgMutation.trigger();
const noArgMutationTrigger: TriggerWithoutArgs<string, Error, string, never> =
  noArgMutation.trigger;

const cachedDataMutation = useSWRVMutation<string, Error, string, "foo", string[]>(
  "cached-data-user",
  async (_key, { arg }) => arg.toUpperCase(),
);

const cachedDataMutationResult = cachedDataMutation.trigger<string[]>("foo", {
  optimisticData: (current) => [...(current ?? []), "optimistic"],
  populateCache: (result, current) => [...(current ?? []), result],
  revalidate: false,
});

const mutationThrowOffByDefault = useSWRVMutation<string, Error, string, "foo">(
  "throw-off",
  async (_key, { arg }) => arg.toUpperCase(),
  {
    throwOnError: false,
  },
);

const mutationThrowOffResult = mutationThrowOffByDefault.trigger("foo");
const maybeMutationKey = Math.random() > 0.5 ? ("maybe-mutation" as const) : null;
const nullableMutation = useSWRVMutation<string, Error, "maybe-mutation" | null, number>(
  maybeMutationKey,
  async (key, { arg }: { arg: number }) => {
    type NullableMutationKey = Expect<Equal<typeof key, "maybe-mutation">>;
    void (true as NullableMutationKey);
    return `${key}:${arg}`;
  },
);
const nullableMutationResult = nullableMutation.trigger(1);
const boundMutateWithTrigger = useSWRV("/some/key", async () => ({
  foo: "bar",
})).mutate(
  useSWRVMutation("/some/key", async () => ({
    foo: "foo",
  })).trigger(),
  {
    optimisticData: {
      foo: "baz",
    },
  },
);

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
  readonlyTupleData: true as Expect<
    Equal<
      typeof readonlyTupleResponse.data.value,
      | {
          resource: { readonly a: "1"; readonly b: { readonly c: "3" } };
          nested: readonly [1231, "888"];
        }
      | undefined
    >
  >,
  refData: true as Expect<Equal<typeof refResponse.data.value, string | undefined>>,
  configAccessorCache: true as Expect<
    Equal<typeof configAccessor.cache, ReturnType<typeof createSWRVClient>["cache"]>
  >,
  configAccessorMutate: true as Expect<Equal<typeof configAccessor.mutate, typeof mutate>>,
  configAccessorPreload: true as Expect<Equal<typeof configAccessor.preload, typeof preload>>,
  immutableData: true as Expect<Equal<typeof immutableResponse.data.value, string | undefined>>,
  configFetcherData: true as Expect<
    Equal<typeof configFetcherResponse.data.value, "/api/config" | undefined>
  >,
  configTupleData: true as Expect<Equal<typeof configTupleResponse.data.value, string | undefined>>,
  optionRecordData: true as Expect<
    Equal<
      typeof optionRecordResponse.data.value,
      { a: string; b: { c: string; d: number } } | undefined
    >
  >,
  optionStringData: true as Expect<
    Equal<typeof optionStringResponse.data.value, "/api/option-user" | undefined>
  >,
  immutableConfigData: true as Expect<
    Equal<typeof immutableConfigFetcherResponse.data.value, "immutable-config" | undefined>
  >,
  fallbackOnlyData: true as Expect<Equal<typeof fallbackOnlyResponse.data.value, string>>,
  fallbackFetcherData: true as Expect<Equal<typeof fallbackFetcherResponse.data.value, string>>,
  immutableFallbackData: true as Expect<Equal<typeof immutableFallbackResponse.data.value, string>>,
  objectFallbackData: true as Expect<
    Equal<typeof objectFallbackResponse.data.value, { value: string }>
  >,
  snapshotClient: true as Expect<Equal<typeof snapshotClient, ReturnType<typeof createSWRVClient>>>,
  serializedSnapshot: true as Expect<Equal<typeof serializedSnapshot, Record<string, unknown>>>,
  middlewareData: true as Expect<Equal<typeof middlewareResponse.data.value, string | undefined>>,
  defaultValueRevalidate: true as Expect<
    Equal<typeof SWRVConfig.defaultValue.revalidateOnFocus, boolean>
  >,
  publicStateAlias: true as Expect<Equal<typeof publicStateAlias.data, string | undefined>>,
  publicCacheAlias: true as Expect<
    Equal<ReturnType<typeof publicCacheAlias.get>, State<string, Error> | undefined>
  >,
  eventConfigInitFocus: true as Expect<
    Equal<typeof typedInitFocus, NonNullable<SWRVConfiguration<string>["initFocus"]>>
  >,
  providerConfigProvider: true as Expect<
    Equal<
      typeof providerConfig.provider,
      () => Map<string, { isLoading: boolean; isValidating: boolean }>
    >
  >,
  boundMutateCallbackResult: true as Expect<
    Equal<Awaited<typeof boundMutateCallbackResult>, string[] | string | undefined>
  >,
  boundMutateNoPopulateResult: true as Expect<
    Equal<Awaited<typeof boundMutateNoPopulateResult>, string[] | string | undefined>
  >,
  boundMutateResult: true as Expect<
    Equal<Awaited<typeof boundMutateResult>, string[] | string | undefined>
  >,
  boundMutateAlias: true as Expect<
    Equal<typeof boundMutateResponse.mutate, KeyedMutator<string[]>>
  >,
  filteredNumberMutateResult: true as Expect<
    Equal<Awaited<typeof filteredNumberMutateResult>, Array<number | undefined>>
  >,
  scopedStringMutateResult: true as Expect<
    Equal<Awaited<typeof scopedStringMutateResult>, string | undefined>
  >,
  scopedMutateResult: true as Expect<Equal<Awaited<typeof scopedMutateResult>, string | undefined>>,
  filteredMutateResult: true as Expect<
    Equal<Awaited<typeof filteredMutateResult>, Array<string | undefined>>
  >,
  literalPreload: true as Expect<Equal<typeof literalPreload, Promise<"value"> | undefined>>,
  syncLiteralPreload: true as Expect<Equal<typeof syncLiteralPreload, "value" | undefined>>,
  explicitLiteralPreload: true as Expect<Equal<typeof explicitLiteralPreload, "value" | undefined>>,
  preloadedTuple: true as Expect<Equal<Awaited<typeof preloadedTuple>, string | undefined>>,
  preloadedFunctionKey: true as Expect<
    Equal<Awaited<typeof preloadedFunctionKey>, string | undefined>
  >,
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
  infiniteConfigFetcherData: true as Expect<
    Equal<typeof infiniteConfigFetcherResponse.data.value, string[] | undefined>
  >,
  infiniteTupleFetcherData: true as Expect<
    Equal<typeof infiniteTupleFetcherResponse.data.value, string[] | undefined>
  >,
  mutationArg: true as Expect<Equal<Parameters<typeof mutation.trigger>[0], { name: string }>>,
  extraParamMutationArg: true as Expect<
    Equal<
      typeof extraParamTrigger,
      TriggerWithoutArgs<"extra-param", unknown, "extra-param", never>
    >
  >,
  extraParamTriggerResult: true as Expect<
    Equal<Awaited<typeof extraParamTriggerResult>, "extra-param">
  >,
  mutationResult: true as Expect<Equal<Awaited<typeof mutationResult>, string>>,
  mutationWithOptions: true as Expect<Equal<Awaited<typeof mutationWithOptions>, string>>,
  typedMutationCallbacks: true as Expect<
    Equal<
      typeof typedMutationCallbacks,
      SWRVMutationConfiguration<string, Error, string, { name: string }>
    >
  >,
  tupleMutationCallbacks: true as Expect<
    Equal<
      typeof tupleMutationCallbacks,
      SWRVMutationConfiguration<string, Error, readonly ["tuple", number], void>
    >
  >,
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
    Equal<typeof noArgMutationTrigger, TriggerWithoutArgs<string, Error, string, never>>
  >,
  cachedDataMutationResult: true as Expect<Equal<Awaited<typeof cachedDataMutationResult>, string>>,
  mutationThrowOffResult: true as Expect<
    Equal<Awaited<typeof mutationThrowOffResult>, string | undefined>
  >,
  nullableMutationResult: true as Expect<Equal<Awaited<typeof nullableMutationResult>, string>>,
  boundMutateWithTrigger: true as Expect<
    Equal<Awaited<typeof boundMutateWithTrigger>, { foo: string } | undefined>
  >,
  subscriptionData: true as Expect<Equal<typeof subscription.data.value, string | undefined>>,
  subscriptionKey: true as Expect<
    Equal<Parameters<typeof typedSubscriptionHandler>[0], [string, number]>
  >,
};

void tupleResponse;
void readonlyTupleResponse;
void fallbackConfig;
void providerConfig;
void middlewareConfig;
void middlewareResponse;
void configAccessor;
void keyAliasFromRef;
void keyAliasFromGetter;
void publicStateAlias;
void publicCacheAlias;
void boundMutateResponse;
void boundMutateCallbackResult;
void boundMutateNoPopulateResult;
void boundMutateResult;
void filteredNumberMutateResult;
void scopedStringMutateResult;
void scopedMutateResult;
void filteredMutateResult;
void literalPreload;
void syncLiteralPreload;
void explicitLiteralPreload;
void preloadedTuple;
void preloadedFunctionKey;
void refResponse;
void immutableResponse;
void configFetcherResponse;
void configTupleResponse;
void optionRecordResponse;
void optionStringResponse;
void immutableConfigFetcherResponse;
void fallbackOnlyResponse;
void infiniteResponse;
void infiniteMutate;
void infiniteMutateTransform;
void multiPageInfiniteResponse;
void multiPageInfiniteMutate;
void infiniteConfigFetcherResponse;
void infiniteTupleFetcherResponse;
void mutation;
void extraParamMutation;
void extraParamTrigger;
void extraParamTriggerResult;
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
void nullableMutation;
void nullableMutationResult;
void boundMutateWithTrigger;
void subscription;
void typeAssertions;
void validUndefinedConfigProps;
void validCallbackConfigProps;
