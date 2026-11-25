import { cloneElement, version, type ReactElement, type Ref } from 'react';
import { composeRefs } from './composeRefs';
import { cx } from './cx';

type AnyProps = Record<string, unknown>;
type Handler = (...args: unknown[]) => unknown;

/** ARIA the library owns on a cloned trigger: our value wins whenever we set the key. */
const OWNED_KEYS = new Set(['aria-expanded', 'aria-controls', 'aria-haspopup']);
/** Id-reference lists that are joined, not replaced. */
const TOKEN_KEYS = new Set(['aria-describedby', 'aria-labelledby']);
const HANDLER_KEY = /^on[A-Z]/;

function isDefaultPrevented(event: unknown): boolean {
  return (
    typeof event === 'object' &&
    event !== null &&
    'defaultPrevented' in event &&
    event.defaultPrevented === true
  );
}

function joinTokens(...lists: unknown[]): string | undefined {
  const tokens = lists
    .filter((list): list is string => typeof list === 'string')
    .flatMap((list) => list.split(/\s+/))
    .filter(Boolean);
  return tokens.length > 0 ? [...new Set(tokens)].join(' ') : undefined;
}

/**
 * Merges a consumer's props (`theirs`) with the props a component adds (`ours`).
 *
 * - Event handlers: theirs run first; ours run unless theirs called `preventDefault()`.
 * - `className` is joined with `cx`; `style` is shallow-merged (ours win).
 * - `aria-describedby` / `aria-labelledby` tokens are joined and de-duplicated.
 * - `aria-expanded`, `aria-controls`, `aria-haspopup`: ours win whenever we pass the key
 *   (even as `undefined`, e.g. `aria-controls` while closed).
 * - `id` and every other key: theirs win when defined, else ours. So a component that
 *   passes an `id` must read the final id back (`theirs.id ?? ourId`).
 */
export function mergeProps<T extends object>(theirs: T, ours: AnyProps): T & AnyProps {
  const result: AnyProps = { ...(theirs as AnyProps) };
  for (const [key, ourValue] of Object.entries(ours)) {
    const theirValue = result[key];
    if (HANDLER_KEY.test(key) && typeof ourValue === 'function') {
      if (typeof theirValue === 'function') {
        const theirHandler = theirValue as Handler;
        const ourHandler = ourValue as Handler;
        result[key] = (...args: unknown[]) => {
          theirHandler(...args);
          if (!isDefaultPrevented(args[0])) ourHandler(...args);
        };
      } else {
        result[key] = ourValue;
      }
    } else if (key === 'className') {
      result[key] =
        cx(theirValue as string | undefined, ourValue as string | undefined) || undefined;
    } else if (key === 'style') {
      result[key] = { ...(theirValue as object | undefined), ...(ourValue as object | undefined) };
    } else if (TOKEN_KEYS.has(key)) {
      result[key] = joinTokens(theirValue, ourValue);
    } else if (OWNED_KEYS.has(key)) {
      result[key] = ourValue;
    } else if (theirValue === undefined) {
      result[key] = ourValue;
    }
  }
  return result as T & AnyProps;
}

const isReact19 = Number.parseInt(version, 10) >= 19;

/**
 * Reads the ref attached to a React element: `element.props.ref` in React 19, `element.ref`
 * in React 18. Reading `element.ref` in React 19 logs a warning, so it is avoided there.
 */
export function getElementRef<T = unknown>(element: ReactElement): Ref<T> | undefined {
  if (isReact19) return (element.props as { ref?: Ref<T> }).ref;
  return (element as unknown as { ref?: Ref<T> | null }).ref ?? undefined;
}

/**
 * Clones a consumer trigger with `mergeProps(element.props, ours)` and a ref composed of the
 * consumer's own ref and `ref`, so both keep working.
 */
export function cloneTrigger<T>(element: ReactElement, ours: AnyProps, ref?: Ref<T>): ReactElement {
  const props = mergeProps(element.props as AnyProps, ours);
  return cloneElement(element as ReactElement<AnyProps & { ref?: Ref<T> }>, {
    ...props,
    ref: composeRefs(getElementRef<T>(element), ref),
  });
}
