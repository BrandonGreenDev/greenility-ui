import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import type { AlertTone } from '../../utils/types';
import { Button } from '../Button';
import { Dialog, DialogClose } from '../Dialog';
import { useToast, type ToastApi, type ToastOptions } from './ToastContext';
import { ToastProvider, type ToastProviderProps } from './ToastProvider';

/** The latest `useToast()` result, captured after render. */
const holder: { api: ToastApi | null } = { api: null };
const api: ToastApi = {
  show: (options) => {
    if (!holder.api) throw new Error('No ToastProvider rendered');
    return holder.api.show(options);
  },
  dismiss: (id) => {
    holder.api?.dismiss(id);
  },
};

function Capture() {
  const toast = useToast();
  useEffect(() => {
    holder.api = toast;
  }, [toast]);
  return null;
}

function renderProvider(props: Partial<ToastProviderProps> = {}) {
  return render(
    <ToastProvider {...props}>
      <button type="button">Elsewhere</button>
      <Capture />
    </ToastProvider>,
  );
}

function show(options: ToastOptions): string {
  let id = '';
  act(() => {
    id = api.show(options);
  });
  return id;
}

function dismiss(id: string) {
  act(() => {
    api.dismiss(id);
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Announcements are written 150 ms after the render that shows a toast. */
const ANNOUNCE_DELAY = 150;
const ANNOUNCE_LIFETIME = 1500;
const flushAnnouncements = () => {
  advance(ANNOUNCE_DELAY);
};

const NAME = 'Notifications (F8)';

/** The provider's `<section>` (unnamed, so not a region, while it is empty). */
function region(): HTMLElement {
  const section = document.querySelector('section');
  if (!section) throw new Error('No toast region');
  return section;
}
const toasts = () => within(region()).queryAllByRole('listitem');
/** The visible toast at `index`; throws when there is none. */
function toastAt(index: number): HTMLElement {
  const item = toasts()[index];
  if (!item) throw new Error(`No toast at index ${String(index)}`);
  return item;
}
/** The provider's own status region (never inside a dialog). */
function rootStatus(): HTMLElement {
  const status = screen.getAllByRole('status').find((element) => !element.closest('dialog'));
  if (!status) throw new Error('No root status region');
  return status;
}
/** The announced lines in a status region. */
const lines = (status: HTMLElement) => Array.from(status.children).map((line) => line.textContent);

const noop = () => undefined;
const undo = { label: 'Undo', onAction: noop };

afterEach(() => {
  holder.api = null;
  vi.restoreAllMocks();
});

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

  describe('region and announcer', () => {
    it('renders an unnamed section while empty and an always-mounted status region', () => {
      renderProvider();
      expect(region().tagName).toBe('SECTION');
      expect(region()).not.toHaveAttribute('aria-label');
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(within(region()).getByRole('list')).toBeEmptyDOMElement();
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(rootStatus()).toBeEmptyDOMElement();
    });

    it('is a region named "Notifications (F8)" while it has toasts', () => {
      renderProvider();
      const id = show({ title: 'Saved' });
      expect(screen.getByRole('region', { name: NAME })).toBe(region());
      dismiss(id);
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('takes a custom label, and the default name follows the hotkey', () => {
      const { unmount } = renderProvider({ label: 'Alerts' });
      show({ title: 'Saved' });
      expect(screen.getByRole('region', { name: 'Alerts' })).toBeInTheDocument();
      unmount();
      renderProvider({ hotkey: 'F9' });
      show({ title: 'Saved' });
      expect(screen.getByRole('region', { name: 'Notifications (F9)' })).toBeInTheDocument();
    });

    it('announces 150 ms after the toast appears and removes the line 1500 ms later', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ tone: 'success', title: 'Saved', description: 'All good.' });
      expect(rootStatus()).toBeEmptyDOMElement();
      advance(ANNOUNCE_DELAY - 1);
      expect(rootStatus()).toBeEmptyDOMElement();
      advance(1);
      expect(lines(rootStatus())).toEqual(['Success: Saved All good.']);
      advance(ANNOUNCE_LIFETIME - 1);
      expect(lines(rootStatus())).toHaveLength(1);
      advance(1);
      expect(rootStatus()).toBeEmptyDOMElement();
      // The toast itself stays.
      expect(toasts()).toHaveLength(1);
    });

    it('announces plain message text only, with the action hint', () => {
      renderProvider();
      show({ title: 'Deleted', description: '3 files.', action: undo });
      flushAnnouncements();
      const status = rootStatus();
      expect(lines(status)).toEqual(['Deleted 3 files. Press F8 to go to notifications.']);
      expect(status).not.toHaveTextContent('Undo');
      expect(status).not.toHaveTextContent('Dismiss');
      expect(within(status).queryByRole('button')).not.toBeInTheDocument();
      expect(within(status).queryByRole('link')).not.toBeInTheDocument();
      expect(status.querySelectorAll('*:not(span)')).toHaveLength(0);
      expect(status).not.toContainElement(region());
      expect(region()).not.toContainElement(status);
    });

    it('announces each toast once', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One' });
      flushAnnouncements();
      show({ title: 'Two' });
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual(['One', 'Two']);
      advance(ANNOUNCE_LIFETIME * 2);
      expect(rootStatus()).toBeEmptyDOMElement();
    });

    it('does not put the visible toasts in a live region', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'Saved', tone: 'danger' });
      expect(within(region()).queryByRole('status')).not.toBeInTheDocument();
      expect(within(region()).queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it.each<[AlertTone, string]>([
      ['info', 'Info: '],
      ['success', 'Success: '],
      ['warning', 'Warning: '],
      ['danger', 'Error: '],
    ])('prefixes a %s toast with its tone label', (tone, prefix) => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ tone, title: 'Message' });
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual([`${prefix}Message`]);
      expect(toastAt(0)).toHaveTextContent(`${prefix}Message`);
    });

    it('has no prefix for neutral toasts (the default tone)', () => {
      renderProvider();
      show({ title: 'Message' });
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual(['Message']);
    });

    it('uses toneLabel to override the prefix', () => {
      renderProvider();
      show({ tone: 'success', title: 'Report', toneLabel: 'Saved' });
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual(['Saved: Report']);
      expect(toastAt(0)).toHaveTextContent('Saved: Report');
    });

    it('takes a custom actionHint, and the default hint follows the hotkey', () => {
      const { unmount } = renderProvider({ actionHint: 'Use F8.' });
      show({ title: 'Deleted', action: undo });
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual(['Deleted Use F8.']);
      unmount();
      renderProvider({ hotkey: 'F9' });
      show({ title: 'Deleted', action: undo });
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual(['Deleted Press F9 to go to notifications.']);
    });

    it('renders the title, description and action inside the toast', () => {
      renderProvider();
      show({ title: 'Deleted', description: '3 files moved to the bin.', action: undo });
      const item = toastAt(0);
      expect(item).toHaveTextContent('Deleted');
      expect(item).toHaveTextContent('3 files moved to the bin.');
      expect(within(item).getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      expect(within(item).getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });

    it('shows the hotkey as a visible, aria-hidden <kbd> on action toasts only', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'Plain' });
      show({ title: 'Deleted', action: undo });
      expect(toastAt(0).querySelector('kbd')).toBeNull();
      const kbd = toastAt(1).querySelector('kbd');
      expect(kbd).toHaveTextContent('F8');
      expect(kbd).toHaveAttribute('aria-hidden', 'true');
    });

    it('lists toasts in chronological order, newest last', () => {
      renderProvider();
      show({ title: 'One' });
      show({ title: 'Two' });
      expect(toastAt(0)).toHaveTextContent('One');
      expect(toastAt(1)).toHaveTextContent('Two');
    });

    it('returns a unique id from every show()', () => {
      renderProvider();
      const ids = [show({ title: 'A' }), show({ title: 'B' }), show({ title: 'C' })];
      expect(new Set(ids).size).toBe(3);
    });

    it('never takes focus when a toast appears', () => {
      renderProvider();
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      elsewhere.focus();
      show({ title: 'Saved', action: undo });
      flushAnnouncements();
      expect(elsewhere).toHaveFocus();
    });
  });

  describe('props', () => {
    it('forwards the ref, className and props to the section', () => {
      const ref = createRef<HTMLElement>();
      renderProvider({ ref, className: 'extra', id: 'toasts' } as never);
      expect(ref.current).toBe(region());
      expect(region()).toHaveClass('extra');
      expect(region().className.split(' ').length).toBeGreaterThan(1);
      expect(region()).toHaveAttribute('id', 'toasts');
    });

    it('composes consumer onKeyDown, onFocus, onBlur and pointer handlers', () => {
      const handlers = {
        onKeyDown: vi.fn(),
        onFocus: vi.fn(),
        onBlur: vi.fn(),
        onPointerEnter: vi.fn(),
        onPointerLeave: vi.fn(),
      };
      renderProvider(handlers);
      fireEvent.keyDown(region(), { key: 'a' });
      fireEvent.focus(region());
      fireEvent.blur(region());
      fireEvent.pointerEnter(region());
      fireEvent.pointerLeave(region());
      for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1);
    });

    it('uses custom dismissLabel, actionHint and queueLabel strings', () => {
      renderProvider({
        max: 1,
        dismissLabel: 'Close notice',
        actionHint: 'Use F8.',
        queueLabel: (count) => `+${String(count)}`,
        duration: Number.POSITIVE_INFINITY,
      });
      show({ title: 'Deleted', action: undo });
      show({ title: 'Queued' });
      flushAnnouncements();
      expect(screen.getByRole('button', { name: 'Close notice' })).toBeInTheDocument();
      expect(region()).toHaveTextContent('+1');
      expect(lines(rootStatus())).toEqual(['Deleted Use F8.', '+1']);
    });
  });

  describe('timing', () => {
    it('auto-dismisses after the per-toast duration', () => {
      renderProvider();
      show({ title: 'Saved', duration: 1000 });
      advance(999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('adds 60 ms of reading time per character to the provider duration', () => {
      renderProvider({ duration: 1000 });
      // "Saved" is 5 characters: 1000 + 5 * 60.
      show({ title: 'Saved' });
      advance(1299);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('counts the tone prefix and description in the reading time', () => {
      renderProvider({ duration: 1000 });
      // "Info: Saved Done." is 17 characters: 1000 + 17 * 60.
      show({ tone: 'info', title: 'Saved', description: 'Done.' });
      advance(2019);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('caps the reading time at 10 s', () => {
      renderProvider({ duration: 1000 });
      show({ title: 'x'.repeat(1000) });
      advance(10_999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('defaults to a 6000 ms base duration', () => {
      renderProvider();
      // "Saved": 6000 + 300.
      show({ title: 'Saved' });
      advance(6299);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('keeps action, danger and warning toasts by default', () => {
      renderProvider({ duration: 1000 });
      show({ title: 'A', action: undo });
      show({ title: 'B', tone: 'danger' });
      show({ title: 'C', tone: 'warning' });
      advance(100_000);
      expect(toasts()).toHaveLength(3);
    });

    it('lets a per-toast duration make persistent toasts auto-dismiss', () => {
      renderProvider({ max: 5 });
      show({ title: 'A', action: undo, duration: 2000 });
      show({ title: 'B', tone: 'danger', duration: 2000 });
      show({ title: 'C', tone: 'warning', duration: 2000 });
      advance(2000);
      expect(toasts()).toHaveLength(0);
    });

    it('lets a per-toast duration of Infinity never dismiss', () => {
      renderProvider({ duration: 1000 });
      show({ title: 'Never', duration: Number.POSITIVE_INFINITY });
      advance(1_000_000);
      expect(toasts()).toHaveLength(1);
    });

    it('never auto-dismisses with a provider duration of Infinity', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'Saved' });
      show({ title: 'Info', tone: 'info' });
      advance(1_000_000);
      expect(toasts()).toHaveLength(2);
    });

    it('treats a delay above the setTimeout limit as never', () => {
      renderProvider();
      show({ title: 'Saved', duration: 2 ** 31 });
      advance(100_000);
      expect(toasts()).toHaveLength(1);
    });

    it('pauses while hovered and resumes with at least 2000 ms', async () => {
      const user = setupUser();
      renderProvider();
      show({ title: 'Saved', duration: 1000 });
      advance(600);
      await user.hover(toastAt(0));
      advance(5000);
      expect(toasts()).toHaveLength(1);
      await user.unhover(toastAt(0));
      // 400 ms were left; resume uses max(400, 2000).
      advance(1999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('resumes with the remaining time when more than 2000 ms are left', async () => {
      const user = setupUser();
      renderProvider();
      show({ title: 'Saved', duration: 5000 });
      advance(1000);
      await user.hover(toastAt(0));
      advance(10_000);
      await user.unhover(toastAt(0));
      advance(3999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('pauses while focus is inside the region and resumes after it leaves', async () => {
      const user = setupUser();
      renderProvider();
      show({ title: 'Saved', duration: 1000, action: undo });
      advance(600);
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      advance(10_000);
      expect(toasts()).toHaveLength(1);
      act(() => {
        screen.getByRole('button', { name: 'Elsewhere' }).focus();
      });
      advance(1999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });

    it('stays paused while focus moves between toasts', async () => {
      const user = setupUser();
      renderProvider();
      show({ title: 'One', duration: 1000 });
      show({ title: 'Two', duration: 1000, action: undo });
      await user.keyboard('{F8}');
      await user.tab({ shift: true });
      expect(within(toastAt(0)).getByRole('button')).toHaveFocus();
      advance(10_000);
      expect(toasts()).toHaveLength(2);
    });

    it('never auto-dismisses a toast while it holds focus', async () => {
      const user = setupUser();
      renderProvider();
      show({ title: 'One', duration: 1000, action: undo });
      await user.keyboard('{F8}');
      advance(60_000);
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    });

    it('pauses while the page is hidden and resumes when it is visible again', () => {
      let state: DocumentVisibilityState = 'visible';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
      try {
        renderProvider();
        show({ title: 'Saved', duration: 1000 });
        advance(600);
        state = 'hidden';
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
        advance(10_000);
        expect(toasts()).toHaveLength(1);
        state = 'visible';
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
        advance(1999);
        expect(toasts()).toHaveLength(1);
        advance(1);
        expect(toasts()).toHaveLength(0);
      } finally {
        Reflect.deleteProperty(document, 'visibilityState');
      }
    });

    it('starts a queued toast timer only once it is visible', () => {
      renderProvider({ max: 1 });
      show({ title: 'One', duration: 1000 });
      show({ title: 'Two', duration: 1000 });
      advance(1000);
      expect(toasts()).toHaveLength(1);
      expect(toastAt(0)).toHaveTextContent('Two');
      advance(999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      expect(toasts()).toHaveLength(0);
    });
  });

  describe('actions and dismissal', () => {
    it('runs the action, then dismisses', async () => {
      const user = setupUser();
      const onAction = vi.fn();
      renderProvider();
      show({ title: 'Deleted', action: { label: 'Undo', onAction } });
      const button = screen.getByRole('button', { name: 'Undo' });
      expect(button).toHaveAttribute('type', 'button');
      await user.click(button);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith();
      expect(toasts()).toHaveLength(0);
    });

    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('runs the action with %s', async (_name, key) => {
      const user = setupUser();
      const onAction = vi.fn();
      renderProvider();
      show({ title: 'Deleted', action: { label: 'Undo', onAction } });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard(key);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(toasts()).toHaveLength(0);
    });

    it('dismisses with the dismiss button and with dismiss(id)', async () => {
      const user = setupUser();
      renderProvider({ dismissLabel: 'Close notice', duration: Number.POSITIVE_INFINITY });
      show({ title: 'One' });
      const id = show({ title: 'Two' });
      dismiss(id);
      expect(toasts()).toHaveLength(1);
      expect(toastAt(0)).toHaveTextContent('One');
      await user.click(screen.getByRole('button', { name: 'Close notice' }));
      expect(toasts()).toHaveLength(0);
    });

    it('does not run the action when the dismiss button is used', async () => {
      const user = setupUser();
      const onAction = vi.fn();
      renderProvider();
      show({ title: 'Deleted', action: { label: 'Undo', onAction } });
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(onAction).not.toHaveBeenCalled();
      expect(toasts()).toHaveLength(0);
    });

    it('ignores unknown ids', () => {
      renderProvider();
      show({ title: 'One' });
      dismiss('nope');
      expect(toasts()).toHaveLength(1);
    });
  });

  describe('stacking', () => {
    it('shows at most 3 by default and queues the rest', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      const ids = ['One', 'Two', 'Three', 'Four', 'Five'].map((title) => show({ title }));
      expect(toasts()).toHaveLength(3);
      dismiss(ids[0] ?? '');
      expect(toasts()).toHaveLength(3);
      expect(toastAt(2)).toHaveTextContent('Four');
    });

    it('shows and announces the queue line when the queue grows', () => {
      renderProvider({ max: 1, duration: Number.POSITIVE_INFINITY });
      const first = show({ title: 'One' });
      flushAnnouncements();
      expect(region()).not.toHaveTextContent('more');
      show({ title: 'Two' });
      expect(region()).toHaveTextContent('1 more notification');
      flushAnnouncements();
      show({ title: 'Three' });
      expect(region()).toHaveTextContent('2 more notifications');
      flushAnnouncements();
      expect(lines(rootStatus())).toEqual(['One', '1 more notification', '2 more notifications']);

      // Shrinking announces only the toast that appears, not the queue.
      dismiss(first);
      flushAnnouncements();
      expect(region()).toHaveTextContent('1 more notification');
      expect(lines(rootStatus()).slice(3)).toEqual(['Two']);
    });

    it('does not announce queued toasts until they are shown', () => {
      renderProvider({ max: 1, duration: Number.POSITIVE_INFINITY });
      const first = show({ title: 'One' });
      show({ title: 'Two' });
      flushAnnouncements();
      expect(rootStatus()).not.toHaveTextContent('Two');
      dismiss(first);
      flushAnnouncements();
      expect(rootStatus()).toHaveTextContent('Two');
    });

    it('dismiss(id) removes a queued toast before it is shown', () => {
      renderProvider({ max: 1, duration: Number.POSITIVE_INFINITY });
      const first = show({ title: 'One' });
      const queued = show({ title: 'Two' });
      show({ title: 'Three' });
      dismiss(queued);
      expect(toasts()).toHaveLength(1);
      expect(region()).toHaveTextContent('1 more notification');
      dismiss(first);
      expect(toastAt(0)).toHaveTextContent('Three');
      expect(region()).not.toHaveTextContent('more');
      flushAnnouncements();
      expect(rootStatus()).not.toHaveTextContent('Two');
    });

    it('shows one toast at a time in compact viewports', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener: noop,
            removeEventListener: noop,
            dispatchEvent: () => false,
          }) as unknown as MediaQueryList,
      );
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One' });
      show({ title: 'Two' });
      show({ title: 'Three' });
      expect(toasts()).toHaveLength(1);
      expect(region()).toHaveTextContent('2 more notifications');
    });
  });

  describe('keyboard and focus', () => {
    it('F8 focuses the newest toast; Escape dismisses it and focus moves to the previous one', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: { label: 'Retry', onAction: noop } });
      show({ title: 'Two', action: undo });
      act(() => {
        screen.getByRole('button', { name: 'Elsewhere' }).focus();
      });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(toasts()).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    });

    it('focuses the dismiss button of the newest toast when it has no action', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: undo });
      show({ title: 'Two' });
      await user.keyboard('{F8}');
      expect(within(toastAt(1)).getByRole('button', { name: 'Dismiss' })).toHaveFocus();
    });

    it('F8 focuses the region, named, when it is empty; Escape returns focus', async () => {
      const user = setupUser();
      renderProvider();
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => {
        elsewhere.focus();
      });
      await user.keyboard('{F8}');
      expect(screen.getByRole('region', { name: NAME })).toHaveFocus();
      expect(region()).toHaveAttribute('tabindex', '-1');
      await user.keyboard('{Escape}');
      expect(elsewhere).toHaveFocus();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('Escape on the empty region is handled even with nothing to return to', async () => {
      const user = setupUser();
      const onKeyDown = vi.fn();
      render(
        <div onKeyDown={onKeyDown} role="presentation">
          <ToastProvider>
            <Capture />
          </ToastProvider>
        </div>,
      );
      await user.keyboard('{F8}');
      expect(region()).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(onKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    });

    it('F8 pressed again inside the region returns focus', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: undo });
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => {
        elsewhere.focus();
      });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard('{F8}');
      expect(elsewhere).toHaveFocus();
      expect(toasts()).toHaveLength(1);
    });

    it.each(['Control', 'Alt', 'Meta', 'Shift'])('ignores F8 with %s held', async (modifier) => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: undo });
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => {
        elsewhere.focus();
      });
      await user.keyboard(`{${modifier}>}{F8}{/${modifier}}`);
      expect(elsewhere).toHaveFocus();
    });

    it('takes a custom hotkey and ignores F8 then', async () => {
      const user = setupUser();
      renderProvider({ hotkey: 'F9' });
      show({ title: 'One', action: undo });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).not.toHaveFocus();
      await user.keyboard('{F9}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    });

    it('ignores a hotkey that was already handled', async () => {
      const user = setupUser();
      render(
        <div
          onKeyDown={(event) => {
            event.preventDefault();
          }}
          role="presentation"
        >
          <ToastProvider>
            <button type="button">Elsewhere</button>
            <Capture />
          </ToastProvider>
        </div>,
      );
      show({ title: 'One' });
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => {
        elsewhere.focus();
      });
      await user.keyboard('{F8}');
      expect(elsewhere).toHaveFocus();
    });

    it('Tab moves through the action and dismiss buttons in DOM order', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: undo });
      show({ title: 'Two' });
      await user.keyboard('{F8}');
      const first = toastAt(0);
      const second = toastAt(1);
      expect(within(second).getByRole('button', { name: 'Dismiss' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(within(first).getByRole('button', { name: 'Dismiss' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(within(first).getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.tab();
      await user.tab();
      expect(within(second).getByRole('button', { name: 'Dismiss' })).toHaveFocus();
    });

    it('moves focus to the next toast after dismissing a focused one', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: { label: 'Retry', onAction: noop } });
      show({ title: 'Two', action: undo });
      await user.keyboard('{F8}');
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(toasts()).toHaveLength(1);
      expect(toastAt(0)).toHaveTextContent('Two');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    });

    it('moves focus to a queued toast that replaces the dismissed one', async () => {
      const user = setupUser();
      renderProvider({ max: 1, duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: { label: 'Retry', onAction: noop } });
      show({ title: 'Two', action: undo });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(toasts()).toHaveLength(1);
      expect(toastAt(0)).toHaveTextContent('Two');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    });

    it('falls back to the region when nothing was stored at F8', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: undo });
      expect(document.body).toHaveFocus();
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(toasts()).toHaveLength(0);
      expect(region()).toHaveFocus();
    });

    it('falls back to the region when the element stored at F8 is gone', async () => {
      const user = setupUser();
      function Removable({ present }: { present: boolean }) {
        return (
          <ToastProvider duration={Number.POSITIVE_INFINITY}>
            {present && <button type="button">Gone soon</button>}
            <Capture />
          </ToastProvider>
        );
      }
      const { rerender } = render(<Removable present />);
      show({ title: 'One', action: undo });
      act(() => {
        screen.getByRole('button', { name: 'Gone soon' }).focus();
      });
      await user.keyboard('{F8}');
      rerender(<Removable present={false} />);
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(region()).toHaveFocus();
    });

    it('skips a stored element that became disabled', async () => {
      const user = setupUser();
      function Disableable({ disabled }: { disabled: boolean }) {
        return (
          <ToastProvider duration={Number.POSITIVE_INFINITY}>
            <button type="button" disabled={disabled}>
              Save
            </button>
            <Capture />
          </ToastProvider>
        );
      }
      const { rerender } = render(<Disableable disabled={false} />);
      show({ title: 'One', action: undo });
      act(() => {
        screen.getByRole('button', { name: 'Save' }).focus();
      });
      await user.keyboard('{F8}');
      rerender(<Disableable disabled />);
      await user.keyboard('{Escape}');
      expect(region()).toHaveFocus();
    });

    it('skips a stored element that became inert', async () => {
      const user = setupUser();
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'One', action: undo });
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => {
        elsewhere.focus();
      });
      await user.keyboard('{F8}');
      elsewhere.setAttribute('inert', '');
      await user.keyboard('{Escape}');
      expect(elsewhere).not.toHaveFocus();
      expect(region()).toHaveFocus();
    });

    it('skips a stored element outside the top dialog', async () => {
      const user = setupUser();
      render(
        <ToastProvider duration={Number.POSITIVE_INFINITY}>
          <button type="button">Behind</button>
          <Capture />
          <Dialog title="Share" defaultOpen>
            <input aria-label="Link" />
          </Dialog>
        </ToastProvider>,
      );
      show({ title: 'One', action: undo });
      // jsdom has no inert background, so focus can reach the page behind the modal.
      const behind = screen.getByRole('button', { name: 'Behind' });
      act(() => {
        behind.focus();
      });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(behind).not.toHaveFocus();
      expect(region()).toHaveFocus();
      expect(screen.getByRole('dialog')).toContainElement(region());
    });

    it('leaves focus alone when an unfocused toast is dismissed', () => {
      renderProvider({ duration: Number.POSITIVE_INFINITY });
      const id = show({ title: 'One' });
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      act(() => {
        elsewhere.focus();
      });
      dismiss(id);
      expect(elsewhere).toHaveFocus();
    });
  });

  describe('inside a Dialog', () => {
    function renderWithDialog() {
      const onOpenChange = vi.fn();
      const view = render(
        <ToastProvider duration={Number.POSITIVE_INFINITY}>
          <Capture />
          <Dialog title="Share" trigger={<Button>Open</Button>} onOpenChange={onOpenChange}>
            <input aria-label="Link" />
            <DialogClose>Done</DialogClose>
          </Dialog>
        </ToastProvider>,
      );
      return { ...view, onOpenChange };
    }

    it('moves the region into an open Dialog and back; the root status never moves', async () => {
      const user = setupUser();
      renderWithDialog();
      const root = rootStatus();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toContainElement(region());
      expect(dialog).not.toContainElement(root);
      expect(screen.getAllByRole('status')).toHaveLength(2);
      show({ title: 'Link copied' });
      expect(dialog).toContainElement(toastAt(0));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(dialog).not.toContainElement(region());
      expect(rootStatus()).toBe(root);
      expect(toasts()).toHaveLength(1);
    });

    it("writes announcements raised while open into the dialog's status region", async () => {
      const user = setupUser();
      renderWithDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      const dialogStatus = within(screen.getByRole('dialog')).getByRole('status');
      show({ tone: 'success', title: 'Link copied' });
      flushAnnouncements();
      expect(lines(dialogStatus)).toEqual(['Success: Link copied']);
      expect(rootStatus()).toBeEmptyDOMElement();
    });

    it('announces a toast shown in the same act as closing the dialog once, in the root', async () => {
      const user = setupUser();
      renderWithDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      const dialog = screen.getByRole('dialog');
      const done = screen.getByRole('button', { name: 'Done' });
      act(() => {
        api.show({ title: 'Shared' });
        done.click();
      });
      flushAnnouncements();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(lines(rootStatus())).toEqual(['Shared']);
      expect(dialog.querySelector('[data-gn-announcer]')).toBeEmptyDOMElement();
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    it('keeps toasts raised before the dialog opened', async () => {
      const user = setupUser();
      renderWithDialog();
      show({ title: 'Earlier' });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('dialog')).toContainElement(toastAt(0));
      expect(toastAt(0)).toHaveTextContent('Earlier');
    });

    it('Escape inside the region dismisses the toast without closing the Dialog', async () => {
      const user = setupUser();
      const { onOpenChange } = renderWithDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      onOpenChange.mockClear();
      show({ title: 'Link copied', action: undo });
      await user.keyboard('{F8}');
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(toasts()).toHaveLength(0);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toHaveAttribute('open');
      // Focus returns to where it was before F8, inside the dialog.
      expect(screen.getByRole('textbox', { name: 'Link' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('follows the topmost of nested dialogs', async () => {
      const user = setupUser();
      render(
        <ToastProvider>
          <Capture />
          <Dialog title="Outer" trigger={<Button>Open outer</Button>}>
            <Dialog title="Inner" trigger={<Button>Open inner</Button>}>
              <DialogClose>Close inner</DialogClose>
            </Dialog>
          </Dialog>
        </ToastProvider>,
      );
      await user.click(screen.getByRole('button', { name: 'Open outer' }));
      const outer = screen.getByRole('dialog', { name: 'Outer' });
      expect(outer).toContainElement(region());
      await user.click(screen.getByRole('button', { name: 'Open inner' }));
      const inner = screen.getByRole('dialog', { name: 'Inner' });
      expect(inner).toContainElement(region());
      show({ title: 'Nested' });
      flushAnnouncements();
      expect(lines(within(inner).getByRole('status'))).toEqual(['Nested']);
      await user.click(screen.getByRole('button', { name: 'Close inner' }));
      expect(inner).not.toContainElement(region());
      expect(outer).toContainElement(region());
    });

    it('has no axe violations with a toast inside an open Dialog', async () => {
      vi.useRealTimers();
      const { container } = render(
        <ToastProvider duration={Number.POSITIVE_INFINITY}>
          <Capture />
          <Dialog title="Share" defaultOpen>
            <DialogClose>Done</DialogClose>
          </Dialog>
        </ToastProvider>,
      );
      show({ tone: 'success', title: 'Link copied', action: undo });
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations when empty', async () => {
      vi.useRealTimers();
      const { container } = renderProvider();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with toasts of every tone, an action and a queue', async () => {
      vi.useRealTimers();
      const { container } = renderProvider({ duration: Number.POSITIVE_INFINITY, max: 6 });
      show({ title: 'Neutral' });
      show({ tone: 'info', title: 'Info', description: 'Details.' });
      show({ tone: 'success', title: 'Done' });
      show({ tone: 'warning', title: 'Careful' });
      show({ tone: 'danger', title: 'Failed' });
      show({ title: 'Deleted', action: undo });
      show({ title: 'Queued' });
      expect(toasts()).toHaveLength(6);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with an announcement written', async () => {
      const { container } = renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ tone: 'success', title: 'Saved' });
      flushAnnouncements();
      vi.useRealTimers();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with focus inside the region', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const { container } = renderProvider({ duration: Number.POSITIVE_INFINITY });
      show({ title: 'Deleted', action: undo });
      await user.keyboard('{F8}');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with the empty region focused by F8', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const { container } = renderProvider();
      await user.keyboard('{F8}');
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe('useToast', () => {
  it('throws outside a ToastProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Capture />)).toThrow(/inside a <ToastProvider>/);
  });

  it('returns a stable api across provider re-renders', () => {
    const seen: ToastApi[] = [];
    function Spy() {
      seen.push(useToast());
      return null;
    }
    function Parent() {
      const [label, setLabel] = useState('A');
      return (
        <ToastProvider label={label}>
          <Spy />
          <button
            type="button"
            onClick={() => {
              setLabel('B');
            }}
          >
            Rename
          </button>
        </ToastProvider>
      );
    }
    render(<Parent />);
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0]).toBe(seen.at(-1));
  });
});
