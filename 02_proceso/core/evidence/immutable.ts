function deepFreezeInPlace(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return;
  }

  for (const nested of Object.values(value)) {
    deepFreezeInPlace(nested);
  }
  Object.freeze(value);
}

export function immutableClone<Value>(value: Value): Readonly<Value> {
  const cloned = structuredClone(value);
  deepFreezeInPlace(cloned);
  return cloned;
}
