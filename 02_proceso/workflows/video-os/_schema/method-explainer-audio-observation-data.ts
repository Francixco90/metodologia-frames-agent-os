export const PLAIN_OBSERVATION_LIMITS = {
  maxDepth: 12,
  maxNodes: 2_048,
  maxArrayLength: 128,
  maxOwnProperties: 128,
} as const;

export const isPlainObservationData = (input: unknown): boolean => {
  const seen = new Set<object>();
  const pending: {value: unknown; depth: number}[] = [{value: input, depth: 0}];
  let scheduledNodes = 1;
  while (pending.length) {
    const {value, depth} = pending.pop()!;
    if (depth > PLAIN_OBSERVATION_LIMITS.maxDepth) return false;
    if (value === null || ['string', 'boolean'].includes(typeof value)) continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Object.is(value, -0)) return false;
      continue;
    }
    if (typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    try {
      const array = Array.isArray(value);
      if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype))
        return false;
      let arrayLength = 0;
      if (array) {
        const descriptor = Object.getOwnPropertyDescriptor(value, 'length');
        if (!descriptor || !('value' in descriptor) || !Number.isSafeInteger(descriptor.value))
          return false;
        arrayLength = descriptor.value as number;
        if (arrayLength < 0 || arrayLength > PLAIN_OBSERVATION_LIMITS.maxArrayLength) return false;
      }
      const keys = Reflect.ownKeys(value);
      const dataKeyCount = keys.length - (array ? 1 : 0);
      if (dataKeyCount < 0 || dataKeyCount > PLAIN_OBSERVATION_LIMITS.maxOwnProperties)
        return false;
      let arrayIndexes = 0;
      for (const key of keys) {
        if (typeof key !== 'string') return false;
        if (array && key === 'length') continue;
        if (array && !/^(?:0|[1-9]\d*)$/u.test(key)) return false;
        if (array && Number(key) >= arrayLength) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor) || descriptor.enumerable !== true) return false;
        if (array) arrayIndexes += 1;
        scheduledNodes += 1;
        if (scheduledNodes > PLAIN_OBSERVATION_LIMITS.maxNodes) return false;
        pending.push({value: descriptor.value, depth: depth + 1});
      }
      if (array && arrayIndexes !== arrayLength) return false;
    } catch {
      return false;
    }
  }
  return true;
};
