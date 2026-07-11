export const version = "0.0.0";

/**
 * Placeholder component so the package builds and the demo can consume it.
 * Replace this as the Fluent 2 component kit is rebuilt from scratch.
 */
export function Hello({ name = "world" }: { name?: string }) {
  return <span>Hello, {name}</span>;
}
