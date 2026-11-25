import type { ReactNode } from 'react';

/** True when a node would render something: not `null`, `undefined` or `false`. */
export function isRenderable(node: ReactNode): boolean {
  return node != null && node !== false;
}
