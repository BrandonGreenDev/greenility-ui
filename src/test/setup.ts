import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// Testing Library's asyncWrapper only advances fake timers when it detects Jest
// (a global `jest` plus a faked setTimeout). Expose Vitest's equivalent under that
// name so `await user.*` does not hang under `vi.useFakeTimers()`. It has no effect
// with real timers.
(globalThis as { jest?: unknown }).jest = {
  advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
};

afterEach(() => {
  cleanup();
});

// jsdom gaps that real browsers fill.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom 29 has no <dialog> methods, popover API or scrollIntoView. Each shim is feature-
// detected, so the real implementation takes over once jsdom ships one. They record state
// as attributes only: top layer, inert and layout cannot be observed in jsdom.
const dialogProto = HTMLDialogElement.prototype as Partial<HTMLDialogElement>;
if (typeof dialogProto.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.setAttribute('data-modal', '');
  };
}
if (typeof dialogProto.show !== 'function') {
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
}
if (typeof dialogProto.close !== 'function') {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, value?: string) {
    if (!this.hasAttribute('open')) return;
    if (value !== undefined) this.returnValue = value;
    this.removeAttribute('open');
    this.removeAttribute('data-modal');
    this.dispatchEvent(new Event('close'));
  };
}
if (!('open' in HTMLDialogElement.prototype)) {
  Object.defineProperty(HTMLDialogElement.prototype, 'open', {
    configurable: true,
    get(this: HTMLDialogElement) {
      return this.hasAttribute('open');
    },
    set(this: HTMLDialogElement, value: boolean) {
      this.toggleAttribute('open', value);
    },
  });
}

const elementProto = HTMLElement.prototype as Partial<HTMLElement>;
if (typeof elementProto.showPopover !== 'function') {
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.setAttribute('data-popover-open', '');
  };
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    this.removeAttribute('data-popover-open');
  };
  HTMLElement.prototype.togglePopover = function togglePopover(
    this: HTMLElement,
    force?: boolean | { force?: boolean },
  ) {
    const wanted = typeof force === 'object' ? force.force : force;
    const next = wanted ?? !this.hasAttribute('data-popover-open');
    this.toggleAttribute('data-popover-open', next);
    return next;
  };

  // jsdom's UA sheet hides `[popover]:not(:popover-open)`, and the shim cannot make
  // `:popover-open` match. Only an !important author rule beats that UA rule in jsdom,
  // so shim-opened popovers stay visible to role queries and axe.
  const style = document.createElement('style');
  style.textContent = '[popover][data-popover-open] { display: block !important; }';
  document.head.appendChild(style);
}

if (typeof (Element.prototype as Partial<Element>).scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => undefined;
}
