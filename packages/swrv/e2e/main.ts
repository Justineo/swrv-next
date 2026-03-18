import { createApp, createVNode, defineComponent, h } from "vue";

import { SWRVConfig, createSWRVClient, useSWRV, useSWRVSubscription } from "../src/index.ts";

const remoteState = {
  focus: 0,
  reconnect: 0,
  mutation: "server-0",
  subscription: 0,
};

let pushSubscription: ((value: string) => void) | undefined;

function renderSection(
  title: string,
  valueTestId: string,
  value: string | undefined,
  actions: ReturnType<typeof h>[],
) {
  return h("section", { class: "panel" }, [
    h("h2", title),
    h("output", { "data-testid": valueTestId, class: "value" }, value ?? ""),
    h("div", { class: "actions" }, actions),
  ]);
}

const FocusPanel = defineComponent({
  name: "FocusPanel",
  setup() {
    const state = useSWRV<string>("focus", async () => `focus:${remoteState.focus}`, {
      dedupingInterval: 0,
      focusThrottleInterval: 0,
    });

    return () =>
      renderSection("Focus", "focus-data", state.data.value, [
        h(
          "button",
          {
            "data-testid": "focus-advance",
            onClick: () => {
              remoteState.focus += 1;
            },
            type: "button",
          },
          "Advance remote focus value",
        ),
        h(
          "button",
          {
            "data-testid": "focus-trigger",
            onClick: () => {
              window.dispatchEvent(new Event("focus"));
            },
            type: "button",
          },
          "Trigger focus revalidation",
        ),
      ]);
  },
});

const ReconnectPanel = defineComponent({
  name: "ReconnectPanel",
  setup() {
    const state = useSWRV<string>("reconnect", async () => `online:${remoteState.reconnect}`, {
      dedupingInterval: 0,
    });

    return () =>
      renderSection("Reconnect", "reconnect-data", state.data.value, [
        h(
          "button",
          {
            "data-testid": "reconnect-advance",
            onClick: () => {
              remoteState.reconnect += 1;
            },
            type: "button",
          },
          "Advance remote reconnect value",
        ),
        h(
          "button",
          {
            "data-testid": "reconnect-trigger",
            onClick: () => {
              window.dispatchEvent(new Event("online"));
            },
            type: "button",
          },
          "Trigger reconnect revalidation",
        ),
      ]);
  },
});

const MutationPanel = defineComponent({
  name: "MutationPanel",
  setup() {
    const state = useSWRV<string>("mutation", async () => remoteState.mutation, {
      dedupingInterval: 0,
    });

    const triggerMutation = async () => {
      await state.mutate(
        new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve("mutation-result");
          }, 200);
        }),
        {
          optimisticData: "optimistic",
          populateCache: (result, currentData) => `${currentData ?? "missing"}|${result}`,
          revalidate: false,
        },
      );
    };

    return () =>
      renderSection("Mutation", "mutation-data", state.data.value, [
        h(
          "button",
          {
            "data-testid": "mutation-trigger",
            onClick: () => {
              void triggerMutation();
            },
            type: "button",
          },
          "Trigger optimistic mutation",
        ),
      ]);
  },
});

const SubscriptionPanel = defineComponent({
  name: "SubscriptionPanel",
  setup() {
    const state = useSWRVSubscription<string>(
      "subscription",
      (_key, { next }) => {
        pushSubscription = (value) => {
          next(undefined, value);
        };

        return () => {
          pushSubscription = undefined;
        };
      },
      {
        fallbackData: "waiting",
      },
    );

    return () =>
      renderSection("Subscription", "subscription-data", state.data.value, [
        h(
          "button",
          {
            "data-testid": "subscription-push",
            onClick: () => {
              remoteState.subscription += 1;
              pushSubscription?.(`live:${remoteState.subscription}`);
            },
            type: "button",
          },
          "Push subscription update",
        ),
      ]);
  },
});

const App = defineComponent({
  name: "SWRVE2EApp",
  setup() {
    return () =>
      h("main", { class: "layout" }, [
        h("h1", "SWRV Browser Fixture"),
        createVNode(FocusPanel),
        createVNode(ReconnectPanel),
        createVNode(MutationPanel),
        createVNode(SubscriptionPanel),
      ]);
  },
});

const style = document.createElement("style");
style.textContent = `
  :root {
    color: #172033;
    background: linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
    font: 16px/1.5 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
  }

  body {
    margin: 0;
  }

  button {
    border: 1px solid #b7c4de;
    background: #ffffff;
    border-radius: 999px;
    color: #172033;
    cursor: pointer;
    font: inherit;
    padding: 0.6rem 1rem;
  }

  main {
    box-sizing: border-box;
    display: grid;
    gap: 1rem;
    margin: 0 auto;
    max-width: 56rem;
    min-height: 100vh;
    padding: 2rem;
  }

  h1,
  h2 {
    margin: 0;
  }

  .panel {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #d8e0ef;
    border-radius: 1rem;
    box-shadow: 0 16px 40px rgba(23, 32, 51, 0.08);
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .value {
    color: #0d4a81;
    font: 600 1rem/1.4 "SFMono-Regular", "Cascadia Code", "Menlo", monospace;
  }
`;
document.head.append(style);

createApp({
  render: () =>
    h(
      SWRVConfig,
      {
        value: {
          client: createSWRVClient(),
        },
      },
      {
        default: () => h(App),
      },
    ),
}).mount("#app");
