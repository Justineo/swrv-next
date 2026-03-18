import { ref } from "vue";

import useSWRV, { useSWRVImmutable } from "../src";
import useSWRVInfinite, { unstable_serialize as unstableSerializeInfinite } from "../src/infinite";
import useSWRVMutation from "../src/mutation";
import useSWRVSubscription from "../src/subscription";
import type { SWRVConfiguration, SWRVMiddleware } from "../src";

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

const infiniteResponse = useSWRVInfinite<string>(
  (index, previousPageData) => {
    if (previousPageData) {
      return [previousPageData, index] as const;
    }

    return ["page", index] as const;
  },
  async (...args: readonly unknown[]) => `${String(args[0])}:${String(args[1])}`,
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
  middlewareData: true as Expect<Equal<typeof middlewareResponse.data.value, string | undefined>>,
  infiniteData: true as Expect<Equal<typeof infiniteResponse.data.value, string[] | undefined>>,
  infiniteSize: true as Expect<Equal<typeof infiniteResponse.size.value, number | undefined>>,
  infiniteSerialized: true as Expect<Equal<typeof infiniteSerialized, string>>,
  mutationArg: true as Expect<Equal<Parameters<typeof mutation.trigger>[0], { name: string }>>,
  mutationResult: true as Expect<
    Equal<Awaited<ReturnType<typeof mutation.trigger>>, string | undefined>
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
void refResponse;
void immutableResponse;
void infiniteResponse;
void mutation;
void subscription;
void typeAssertions;
