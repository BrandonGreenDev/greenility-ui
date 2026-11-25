import { describe, expect, it } from 'vitest';
import { hasLayers, isTopLayer, pushLayer } from './layerStack';

describe('layerStack', () => {
  it('tracks the topmost layer and empties again', () => {
    const a = Symbol('a');
    const b = Symbol('b');
    expect(hasLayers()).toBe(false);
    const popA = pushLayer(a);
    expect(isTopLayer(a)).toBe(true);
    const popB = pushLayer(b);
    expect(isTopLayer(a)).toBe(false);
    expect(isTopLayer(b)).toBe(true);
    popB();
    expect(isTopLayer(a)).toBe(true);
    popA();
    expect(hasLayers()).toBe(false);
  });

  it('removes a layer from the middle and tolerates a second pop', () => {
    const a = Symbol('a');
    const b = Symbol('b');
    const popA = pushLayer(a);
    const popB = pushLayer(b);
    popA();
    popA();
    expect(isTopLayer(b)).toBe(true);
    popB();
    expect(hasLayers()).toBe(false);
  });
});
