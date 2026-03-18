const objectTable = new WeakMap<object, number>();

let objectCounter = 0;

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export function stableHash(value: unknown): string {
  if (value === null) {
    return "null";
  }

  const valueType = typeof value;

  if (valueType === "undefined") {
    return "undefined";
  }

  if (valueType === "string") {
    return JSON.stringify(value);
  }

  if (valueType === "number" || valueType === "boolean" || valueType === "bigint") {
    return `${value as number | boolean | bigint}`;
  }

  if (valueType === "symbol") {
    return String(value as symbol);
  }

  if (valueType === "function") {
    const callable = value as object;
    if (!objectTable.has(callable)) {
      objectTable.set(callable, ++objectCounter);
    }

    return `fn:${objectTable.get(callable)}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableHash(item)).join(",")}]`;
  }

  if (value instanceof Date) {
    return `date:${value.toJSON()}`;
  }

  if (value instanceof RegExp) {
    return `regexp:${value.toString()}`;
  }

  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    const record = value as Record<string, unknown>;

    if (prototype === Object.prototype || prototype === null) {
      const entries = Object.keys(record)
        .sort()
        .filter((key) => hasOwn(record, key))
        .map((key) => `${JSON.stringify(key)}:${stableHash(record[key])}`);

      return `{${entries.join(",")}}`;
    }

    if (!objectTable.has(value)) {
      objectTable.set(value, ++objectCounter);
    }

    const constructorName = prototype?.constructor?.name ?? "object";

    return `${constructorName}:${objectTable.get(value)}`;
  }

  return JSON.stringify(value) ?? "undefined";
}
