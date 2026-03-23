export const FOCUS_EVENT = 0;
export const RECONNECT_EVENT = 1;
export const MUTATE_EVENT = 2;
export const ERROR_REVALIDATE_EVENT = 3;

export function normalizeRevalidateEvent(
  event: number | string,
):
  | typeof FOCUS_EVENT
  | typeof RECONNECT_EVENT
  | typeof MUTATE_EVENT
  | typeof ERROR_REVALIDATE_EVENT {
  if (typeof event === "number") {
    return event as
      | typeof FOCUS_EVENT
      | typeof RECONNECT_EVENT
      | typeof MUTATE_EVENT
      | typeof ERROR_REVALIDATE_EVENT;
  }

  switch (event) {
    case "focus":
      return FOCUS_EVENT;
    case "reconnect":
      return RECONNECT_EVENT;
    case "mutate":
      return MUTATE_EVENT;
    case "error-revalidate":
      return ERROR_REVALIDATE_EVENT;
    default:
      return MUTATE_EVENT;
  }
}
