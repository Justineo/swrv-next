const objectTable = new WeakMap<object, string>();

let objectCounter = 0;

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

function getObjectId(value: object) {
  const current = objectTable.get(value);
  if (current) {
    return current;
  }

  const next = `ref:${++objectCounter}`;
  objectTable.set(value, next);
  return next;
}

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
    return `fn:${getObjectId(callable)}`;
  }

  if (Array.isArray(value)) {
    const current = objectTable.get(value);
    if (current) {
      return current;
    }

    getObjectId(value);
    const result = `[${value.map((item) => stableHash(item)).join(",")}]`;
    objectTable.set(value, result);
    return result;
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
      const current = objectTable.get(value);
      if (current) {
        return current;
      }

      getObjectId(value);
      const entries = Object.keys(record)
        .sort()
        .filter((key) => hasOwn(record, key))
        .map((key) => `${JSON.stringify(key)}:${stableHash(record[key])}`);

      const result = `{${entries.join(",")}}`;
      objectTable.set(value, result);
      return result;
    }

    const constructorName = prototype?.constructor?.name ?? "object";

    const current = objectTable.get(value);
    if (current) {
      return current;
    }

    const result = `${constructorName}:${getObjectId(value)}`;
    objectTable.set(value, result);
    return result;
  }

  return JSON.stringify(value) ?? "undefined";
}
