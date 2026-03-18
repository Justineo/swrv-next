import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  type App,
  type EffectScope,
} from "vue";
import { afterEach, vi } from "vite-plus/test";

import { SWRVConfig, createSWRVClient, useSWRV } from "../src";

const scopes: EffectScope[] = [];
const apps: App[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
  vi.useRealTimers();

  while (scopes.length > 0) {
    scopes.pop()?.stop();
  }

  while (apps.length > 0) {
    apps.pop()?.unmount();
  }

  while (containers.length > 0) {
    containers.pop()?.remove();
  }
});

export async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

export async function settle(iterations = 3) {
  for (let index = 0; index < iterations; index += 1) {
    await flush();
  }
}

export async function waitForMacrotask() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await nextTick();
}

export function runComposable<T>(factory: () => T) {
  let value!: T;
  const scope = effectScope();
  scopes.push(scope);
  scope.run(() => {
    value = factory();
  });
  return value;
}

export function stopLastScope() {
  scopes.pop()?.stop();
}

export function registerApp(app: App) {
  apps.push(app);
  return app;
}

export function registerContainer(container: HTMLElement) {
  containers.push(container);
  return container;
}

export function mountWithClient(client: ReturnType<typeof createSWRVClient>, key: string) {
  let state!: ReturnType<typeof useSWRV<string>>;

  const Child = defineComponent({
    setup() {
      state = useSWRV<string>(key);
      return () => h("div", state.data.value ?? "");
    },
  });

  const container = registerContainer(document.createElement("div"));
  document.body.appendChild(container);

  const app = registerApp(
    createApp({
      render: () =>
        h(
          SWRVConfig,
          { value: { client } },
          {
            default: () => h(Child),
          },
        ),
    }),
  );

  app.mount(container);

  return () => state;
}

export function mountWithConfig<T>(factory: () => T, config?: Record<string, unknown>) {
  let value!: T;

  const Child = defineComponent({
    setup() {
      value = factory();
      return () => h("div");
    },
  });

  const container = registerContainer(document.createElement("div"));
  document.body.appendChild(container);

  const app = registerApp(
    createApp({
      render: () =>
        h(
          SWRVConfig,
          { value: config },
          {
            default: () => h(Child),
          },
        ),
    }),
  );

  app.mount(container);

  return () => value;
}

export function mockVisibilityState(state: DocumentVisibilityState) {
  const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(document, "visibilityState", descriptor);
      return;
    }

    Reflect.deleteProperty(document, "visibilityState");
  };
}
