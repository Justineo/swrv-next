const objectTable = new WeakMap<object, number | string>();

const objectConstructor = Object;

const getTypeName = (value: unknown) => objectConstructor.prototype.toString.call(value);

const isObjectTypeName = (typeName: string, type: string) => typeName === `[object ${type}]`;

let objectCounter = 0;

export function stableHash(value: unknown): string {
  const valueType = typeof value;
  const typeName = getTypeName(value);
  const isDate = isObjectTypeName(typeName, "Date");
  const isRegex = isObjectTypeName(typeName, "RegExp");
  const isPlainObject = isObjectTypeName(typeName, "Object");
  let result: number | string | undefined;
  let index: number | string | undefined;

  if (objectConstructor(value) === value && !isDate && !isRegex) {
    result = objectTable.get(value as object);
    if (result) {
      return result as string;
    }

    result = `${++objectCounter}~`;
    objectTable.set(value as object, result);

    if (Array.isArray(value)) {
      result = "@";
      for (index = 0; index < value.length; index += 1) {
        result += `${stableHash(value[index])},`;
      }
      objectTable.set(value, result);
    }

    if (isPlainObject) {
      result = "#";
      const keys = objectConstructor.keys(value as Record<string, unknown>).sort();
      while ((index = keys.pop()) !== undefined) {
        if ((value as Record<string, unknown>)[index] !== undefined) {
          result += `${index}:${stableHash((value as Record<string, unknown>)[index])},`;
        }
      }
      objectTable.set(value as object, result);
    }
  } else {
    result = isDate
      ? (value as Date).toJSON()
      : valueType === "symbol"
        ? (value as symbol).toString()
        : valueType === "string"
          ? JSON.stringify(value)
          : String(value);
  }

  return result as string;
}
