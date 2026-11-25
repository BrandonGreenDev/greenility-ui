import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { isTopLayer, pushLayer } from '../utils/layerStack';

export type DismissReason = 'escape' | 'outside';

/** Escape and outside-pointer dismissal for floating layers. */
export interface UseDismissOptions {
  /** Listen only while true (usually `open`). */
  enabled: boolean;
  /** Elements counted as "inside" (trigger + floating). */
  refs: readonly RefObject<HTMLElement | null>[];
  /** Called with why the layer should close. */
  onDismiss: (reason: DismissReason) => void;
  /** Listen for outside pointerdown. Tooltip passes false. @default true */
  outsidePointer?: boolean;
}

/**
 * While enabled, pushes a layer onto the layer stack and listens on the document in the
 * capture phase:
 * - Escape (only when this is the topmost layer): `preventDefault()`, `stopPropagation()`,
 *   then `onDismiss('escape')`. Outer layers and a surrounding Dialog never see that Escape.
 * - `pointerdown` outside every ref: `onDismiss('outside')`.
 *
 * `refs` and `onDismiss` are read at event time, so they do not need to be stable.
 */
export function useDismiss({
  enabled,
  refs,
  onDismiss,
  outsidePointer = true,
}: UseDismissOptions): void {
  const latest = useRef({ refs, onDismiss });
  useLayoutEffect(() => {
    latest.current = { refs, onDismiss };
  });

  useEffect(() => {
    if (!enabled) return;
    const token = Symbol('layer');
    const popLayer = pushLayer(token);
    const doc = latest.current.refs.find((ref) => ref.current)?.current?.ownerDocument ?? document;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || !isTopLayer(token)) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current.onDismiss('escape');
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const inside = latest.current.refs.some((ref) => ref.current?.contains(target));
      if (!inside) latest.current.onDismiss('outside');
    };

    doc.addEventListener('keydown', onKeyDown, true);
    if (outsidePointer) doc.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      popLayer();
      doc.removeEventListener('keydown', onKeyDown, true);
      if (outsidePointer) doc.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [enabled, outsidePointer]);
}
