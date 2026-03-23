export function noop(): void {}

export function isFunction<T extends (...args: any[]) => any = (...args: any[]) => any>(
  value: unknown,
): value is T {
  return typeof value === "function";
}

export function isPromiseLike<Data>(value: unknown): value is PromiseLike<Data> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof Reflect.get(value as PromiseLike<Data>, "then") === "function"
  );
}
