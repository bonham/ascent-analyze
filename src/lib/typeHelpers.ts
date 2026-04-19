/**
 * Function to check if value is not null, an object and has a property
 * @param x value to check
 * @param prop property name as string
 * @returns Type guard
 */
function hasProperty<T extends object, K extends PropertyKey>(
  x: unknown,
  prop: K
): x is T & Record<K, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x) && prop in x;
}

export { hasProperty }

