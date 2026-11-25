/**
 * Open floating layers (Tooltip, Menu, Select listbox) in the order they opened. The last
 * entry is the topmost layer and gets Escape first. Entries are unique symbols, not ids or
 * counters, so nothing can collide.
 */
const layers: symbol[] = [];

/** Adds a layer on top. Returns a function that removes it (safe to call more than once). */
export function pushLayer(token: symbol): () => void {
  layers.push(token);
  return () => {
    const index = layers.lastIndexOf(token);
    if (index !== -1) layers.splice(index, 1);
  };
}

/** True when `token` is the topmost open layer. */
export function isTopLayer(token: symbol): boolean {
  return layers.at(-1) === token;
}

/** True while any floating layer is open. Dialog uses this to leave Escape to the layer. */
export function hasLayers(): boolean {
  return layers.length > 0;
}
