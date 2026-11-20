import { useReducer } from "react";

/**
 * Captures the first value it receives. Useful for mount-only animation
 * configuration that must not replay when props change later.
 */
export function useMountValue<T>(value: T): T {
  const [mountedValue] = useReducer((current: T) => current, value);
  return mountedValue;
}
