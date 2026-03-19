export function getOrCreateScopedValue<Key extends object, Value>(
  storage: WeakMap<Key, Value>,
  key: Key,
  create: () => Value,
): Value {
  const current = storage.get(key);
  if (current) {
    return current;
  }

  const next = create();
  storage.set(key, next);
  return next;
}
