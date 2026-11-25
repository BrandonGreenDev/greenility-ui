import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState, type MouseEvent, type Ref } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDismiss } from '../../hooks/useDismiss';
import { axe } from '../../test/axe';
import { pushLayer } from '../../utils/layerStack';
import { OverlayHostContext, type OverlayHost } from '../../utils/overlayHost';
import { Button } from '../Button';
import { AlertDialog, type AlertDialogProps } from './AlertDialog';
import { Dialog, type DialogProps } from './Dialog';
import { DialogClose } from './DialogClose';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderDialog(props: Partial<DialogProps> = {}) {
  return render(
    <Dialog
      title="Edit site"
      description="Changes apply to every report."
      trigger={<Button>Open</Button>}
      footer={<DialogClose>Cancel</DialogClose>}
      {...props}
    >
      {props.children ?? <input aria-label="Site name" />}
    </Dialog>,
  );
}

/** Dispatches the `cancel` event a browser fires on Escape (jsdom never does). */
function fireCancel(target: Element, init: EventInit = {}): Event {
  const event = new Event('cancel', { cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/** A tiny floating layer registered through useDismiss, like a Menu or Select listbox. */
function DismissLayer() {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss({
    enabled: open,
    refs: [ref],
    onDismiss: () => {
      setOpen(false);
    },
  });
  return open ? <div ref={ref}>Layer open</div> : <p>Layer closed</p>;
}

/** The panel: the parent of the header that holds the title. */
function getPanel(title = 'Edit site'): HTMLElement {
  const panel = screen.getByRole('heading', { name: title }).parentElement?.parentElement;
  if (!panel) throw new Error('No dialog panel');
  return panel;
}

/** Stubs ResizeObserver and the body's scroll metrics so useIsOverflowing can report true. */
function stubOverflow(scrollHeight: number, clientHeight: number) {
  const callbacks: ResizeObserverCallback[] = [];
  class ResizeObserverStub {
    constructor(callback: ResizeObserverCallback) {
      callbacks.push(callback);
    }
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  const scroll = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  const client = vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
  return {
    resize(nextScroll: number, nextClient: number) {
      scroll.mockReturnValue(nextScroll);
      client.mockReturnValue(nextClient);
      act(() => {
        for (const callback of callbacks) callback([], {} as ResizeObserver);
      });
    },
  };
}

describe('Dialog', () => {
  describe('rendering', () => {
    it('opens from the trigger with showModal and is named and described', async () => {
      const user = userEvent.setup();
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      renderDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(showModal).toHaveBeenCalledTimes(1);
      const dialog = screen.getByRole('dialog', { name: 'Edit site' });
      expect(dialog.tagName).toBe('DIALOG');
      expect(dialog).toHaveAccessibleDescription('Changes apply to every report.');
      expect(dialog).not.toHaveAttribute('role');
      expect(screen.getByRole('heading', { level: 2, name: 'Edit site' })).toBeInTheDocument();
    });

    it('opens on mount with defaultOpen', () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      renderDialog({ defaultOpen: true, trigger: undefined });
      expect(showModal).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('dialog', { name: 'Edit site' })).toHaveAttribute('open');
    });

    it('keeps children out of the DOM while closed', () => {
      renderDialog();
      expect(screen.queryByRole('textbox', { name: 'Site name' })).not.toBeInTheDocument();
      expect(screen.queryByText('Edit site')).not.toBeInTheDocument();
    });

    it('unmounts the content on close, so its state resets on the next open', async () => {
      const user = userEvent.setup();
      renderDialog();
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      await user.type(screen.getByRole('textbox', { name: 'Site name' }), 'Depot');
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveValue('Depot');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('textbox', { name: 'Site name' })).not.toBeInTheDocument();
      await user.click(trigger);
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveValue('');
    });

    it('has no aria-describedby without a description', () => {
      renderDialog({ description: undefined, defaultOpen: true });
      expect(screen.getByRole('dialog', { name: 'Edit site' })).not.toHaveAttribute(
        'aria-describedby',
      );
    });

    it('joins consumer aria-labelledby and aria-describedby with its own ids', () => {
      render(
        <>
          <span id="ext-label">Site</span>
          <span id="ext-desc">Extra info.</span>
          <Dialog
            title="Edit site"
            description="Changes apply to every report."
            defaultOpen
            aria-labelledby="ext-label"
            aria-describedby="ext-desc"
          >
            <input aria-label="Site name" />
          </Dialog>
        </>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Site Edit site' });
      expect(dialog).toHaveAccessibleDescription('Extra info. Changes apply to every report.');
    });

    it('renders the close button as an IconButton named by closeLabel', () => {
      renderDialog({ defaultOpen: true, closeLabel: 'Close editor' });
      const close = screen.getByRole('button', { name: 'Close editor' });
      expect(close).toHaveAttribute('aria-label', 'Close editor');
      expect(close).toHaveAttribute('type', 'button');
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    });

    it('defaults closeLabel to "Close"', () => {
      renderDialog({ defaultOpen: true });
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies size %s as data-size', (size) => {
      renderDialog({ size, defaultOpen: true });
      expect(screen.getByRole('dialog')).toHaveAttribute('data-size', size);
    });

    it('defaults to size md', () => {
      renderDialog({ defaultOpen: true });
      expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'md');
    });

    it('puts className, ref and native props on the <dialog>', () => {
      const ref = createRef<HTMLDialogElement>();
      render(
        <Dialog
          ref={ref}
          title="T"
          className="extra"
          data-testid="dlg"
          id="settings"
          trigger={<Button>Open</Button>}
        />,
      );
      const dialog = screen.getByTestId('dlg');
      expect(ref.current).toBe(dialog);
      expect(dialog).toBeInstanceOf(HTMLDialogElement);
      expect(dialog).toHaveClass('extra');
      expect(dialog.className.split(' ').length).toBeGreaterThan(1);
      expect(dialog).toHaveAttribute('id', 'settings');
      expect(dialog).not.toHaveAttribute('open');
    });

    it('composes consumer onKeyDown, onCancel, onClose, onPointerDown and onClick', () => {
      const handlers = {
        onKeyDown: vi.fn(),
        onCancel: vi.fn(),
        onClose: vi.fn(),
        onPointerDown: vi.fn(),
        onClick: vi.fn(),
      };
      renderDialog({ defaultOpen: true, trigger: undefined, ...handlers });
      const dialog = screen.getByRole<HTMLDialogElement>('dialog');
      fireEvent.keyDown(dialog, { key: 'a' });
      fireEvent.pointerDown(screen.getByText('Edit site'));
      fireEvent.click(screen.getByText('Edit site'));
      fireCancel(dialog);
      expect(handlers.onKeyDown).toHaveBeenCalledTimes(1);
      expect(handlers.onPointerDown).toHaveBeenCalledTimes(1);
      expect(handlers.onClick).toHaveBeenCalledTimes(1);
      expect(handlers.onCancel).toHaveBeenCalledTimes(1);
      expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the consumer ref on the trigger', () => {
      const triggerRef = createRef<HTMLButtonElement>();
      renderDialog({ trigger: <Button ref={triggerRef}>Open</Button> });
      expect(triggerRef.current).toBe(screen.getByRole('button', { name: 'Open' }));
    });
  });

  describe('trigger', () => {
    it("runs the consumer's onClick first, then opens", async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      renderDialog({
        trigger: <Button onClick={() => calls.push('consumer')}>Open</Button>,
        onOpenChange: (open) => calls.push(`open:${String(open)}`),
      });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(calls).toEqual(['consumer', 'open:true']);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not open when the consumer onClick calls preventDefault', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({
        onOpenChange,
        trigger: (
          <Button
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
            }}
          >
            Open
          </Button>
        ),
      });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('focuses a trigger that a click did not focus, so focus can return to it', () => {
      renderDialog();
      const trigger = screen.getByRole('button', { name: 'Open' });
      expect(trigger).not.toHaveFocus();
      // fireEvent.click does not focus, like Safari.
      fireEvent.click(trigger);
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('opens with Enter and with Space on the trigger', async () => {
      const user = userEvent.setup();
      renderDialog();
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      await user.keyboard(' ');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('focus management', () => {
    it('focuses the first body tabbable on open', async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveFocus();
    });

    it('prefers body content over the header close button', async () => {
      const user = userEvent.setup();
      renderDialog({
        children: (
          <>
            <p>Intro</p>
            <button type="button" disabled>
              Disabled
            </button>
            <a href="#help">Help</a>
          </>
        ),
      });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('link', { name: 'Help' })).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Close' })).not.toHaveFocus();
    });

    it('focuses initialFocusRef when given', async () => {
      const user = userEvent.setup();
      function Test() {
        const ref = useRef<HTMLInputElement>(null);
        return (
          <Dialog title="T" trigger={<Button>Open</Button>} initialFocusRef={ref}>
            <input aria-label="First" />
            <input aria-label="Second" ref={ref} />
          </Dialog>
        );
      }
      render(<Test />);
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('textbox', { name: 'Second' })).toHaveFocus();
    });

    it('falls back to the footer when the body has no tabbables', async () => {
      const user = userEvent.setup();
      renderDialog({ children: <p>Text only</p> });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    it('falls back to the close button when body and footer have no tabbables', async () => {
      const user = userEvent.setup();
      renderDialog({ children: <p>Text only</p>, footer: undefined });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    it('moves through the tabbables inside with Tab and Shift+Tab', async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      const field = screen.getByRole('textbox', { name: 'Site name' });
      expect(field).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(field).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    it('returns focus to the trigger after a backdrop click', async () => {
      const user = userEvent.setup();
      renderDialog();
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      await user.click(screen.getByRole('dialog'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('returns focus to the element focused before a controlled open', () => {
      const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
      const ui = (open: boolean) => (
        <>
          <button type="button">Outside</button>
          <Dialog title="T" open={open}>
            <input aria-label="Field" />
          </Dialog>
        </>
      );
      const { rerender } = render(ui(false));
      const outside = screen.getByRole('button', { name: 'Outside' });
      outside.focus();
      rerender(ui(true));
      expect(screen.getByRole('textbox', { name: 'Field' })).toHaveFocus();
      rerender(ui(false));
      expect(close).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(outside).toHaveFocus();
    });

    it('uses returnFocusRef when the trigger was removed', async () => {
      const user = userEvent.setup();
      function Test() {
        const [open, setOpen] = useState(false);
        const headingRef = useRef<HTMLHeadingElement>(null);
        return (
          <>
            <h3 ref={headingRef} tabIndex={-1}>
              Sites
            </h3>
            {!open && (
              <Button
                onClick={() => {
                  setOpen(true);
                }}
              >
                Remove
              </Button>
            )}
            <Dialog title="T" open={open} onOpenChange={setOpen} returnFocusRef={headingRef}>
              <DialogClose>Done</DialogClose>
            </Dialog>
          </>
        );
      }
      render(<Test />);
      await user.click(screen.getByRole('button', { name: 'Remove' }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByRole('heading', { name: 'Sites' })).toHaveFocus();
    });

    it('prefers returnFocusRef over the trigger', async () => {
      const user = userEvent.setup();
      function Test() {
        const ref = useRef<HTMLHeadingElement>(null);
        return (
          <>
            <h3 ref={ref} tabIndex={-1}>
              Sites
            </h3>
            <Dialog title="T" trigger={<Button>Open</Button>} returnFocusRef={ref}>
              <DialogClose>Done</DialogClose>
            </Dialog>
          </>
        );
      }
      render(<Test />);
      await user.click(screen.getByRole('button', { name: 'Open' }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByRole('heading', { name: 'Sites' })).toHaveFocus();
    });
  });

  describe('scrolling body', () => {
    it('is a tab stop only while its content overflows', async () => {
      const user = userEvent.setup();
      const overflow = stubOverflow(500, 100);
      renderDialog();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      const field = screen.getByRole('textbox', { name: 'Site name' });
      const body = screen.getByRole('group', { name: 'Edit site' });
      expect(body).toContainElement(field);
      expect(body).toHaveAttribute('tabindex', '0');
      // The first tabbable is in view (jsdom boxes are all zero), so focus lands on it.
      expect(field).toHaveFocus();

      overflow.resize(100, 100);
      expect(body).not.toHaveAttribute('tabindex');
      expect(body).not.toHaveAttribute('role');
      expect(body).not.toHaveAttribute('aria-labelledby');
      expect(screen.queryByRole('group')).not.toBeInTheDocument();

      overflow.resize(800, 100);
      expect(screen.getByRole('group', { name: 'Edit site' })).toBe(body);
      expect(body).toHaveAttribute('tabindex', '0');
    });

    it('is not a tab stop when it fits', () => {
      stubOverflow(100, 100);
      renderDialog({ defaultOpen: true });
      const body = screen.getByRole('textbox', { name: 'Site name' }).parentElement;
      expect(body).not.toHaveAttribute('tabindex');
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('focuses the body on open when its first tabbable is out of view', () => {
      stubOverflow(500, 100);
      vi.spyOn(HTMLInputElement.prototype, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 0, y: 400, width: 100, height: 20 }),
      );
      renderDialog({
        defaultOpen: true,
        children: (
          <>
            <p>Long terms</p>
            <input aria-label="Accept" />
          </>
        ),
      });
      const body = screen.getByRole('group', { name: 'Edit site' });
      expect(body).toHaveFocus();
      expect(body).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('textbox', { name: 'Accept' })).not.toHaveFocus();
    });

    it('focuses the body on open when it overflows and has no tabbables', () => {
      stubOverflow(500, 100);
      renderDialog({ defaultOpen: true, children: <p>Long read-only text</p> });
      expect(screen.getByRole('group', { name: 'Edit site' })).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveFocus();
    });

    it('gives the panel tabindex=-1 only while it is the focus target', async () => {
      const user = userEvent.setup();
      // No body; the panel itself scrolls and the close button is below the fold.
      vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(500);
      vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(100);
      vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 0, y: 400, width: 20, height: 20 }),
      );
      render(<Dialog title="Edit site" defaultOpen />);
      const panel = getPanel();
      expect(panel).toHaveFocus();
      expect(panel).toHaveAttribute('tabindex', '-1');
      await user.tab();
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
      expect(panel).not.toHaveAttribute('tabindex');
    });

    it('leaves the panel without a tabindex when another element takes focus', () => {
      renderDialog({ defaultOpen: true });
      const panel = getPanel();
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveFocus();
      expect(panel).not.toHaveAttribute('tabindex');
    });

    it('has no axe violations while the body scrolls', async () => {
      stubOverflow(500, 100);
      const { container } = renderDialog({ defaultOpen: true });
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('closing', () => {
    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('does not close on Escape when a consumer onKeyDown prevented it', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({
        defaultOpen: true,
        trigger: undefined,
        onOpenChange,
        onKeyDown: (event) => {
          if (event.key === 'Escape') event.preventDefault();
        },
      });
      await user.keyboard('{Escape}');
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes from the close button with a custom closeLabel', async () => {
      const user = userEvent.setup();
      renderDialog({ closeLabel: 'Close site' });
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      await user.click(screen.getByRole('button', { name: 'Close site' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('closes with %s on the close button', async (_name, key) => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      act(() => {
        screen.getByRole('button', { name: 'Close' }).focus();
      });
      await user.keyboard(key);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on a backdrop click but not on a click inside the panel', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      await user.click(screen.getByText('Edit site'));
      await user.click(screen.getByText('Changes apply to every report.'));
      await user.click(screen.getByRole('textbox', { name: 'Site name' }));
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('dialog'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not close when a press starts in the panel and ends on the backdrop', () => {
      renderDialog({ defaultOpen: true, trigger: undefined });
      const dialog = screen.getByRole('dialog');
      fireEvent.pointerDown(screen.getByText('Edit site'));
      fireEvent.click(dialog);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not close on a backdrop click when a consumer onClick prevented it', async () => {
      const user = userEvent.setup();
      renderDialog({
        defaultOpen: true,
        trigger: undefined,
        onClick: (event) => {
          event.preventDefault();
        },
      });
      await user.click(screen.getByRole('dialog'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('cancel event (Escape with focus outside the dialog content)', () => {
    it('always prevents the native cancel and closes through state', () => {
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      const event = fireCancel(screen.getByRole('dialog'));
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('prevents cancel but stays open while a floating layer is open', () => {
      const onOpenChange = vi.fn();
      renderDialog({
        defaultOpen: true,
        trigger: undefined,
        onOpenChange,
        children: <DismissLayer />,
      });
      expect(screen.getByText('Layer open')).toBeInTheDocument();
      const event = fireCancel(screen.getByRole('dialog'));
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toHaveAttribute('open');
    });

    it('prevents cancel in controlled mode and leaves the decision to the parent', () => {
      const onOpenChange = vi.fn();
      renderDialog({ open: true, trigger: undefined, onOpenChange });
      const dialog = screen.getByRole('dialog');
      const event = fireCancel(dialog);
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(dialog).toHaveAttribute('open');
    });

    it('ignores a cancel that bubbles from a descendant (e.g. a file input)', () => {
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      const event = fireCancel(screen.getByRole('textbox', { name: 'Site name' }), {
        bubbles: true,
      });
      expect(event.defaultPrevented).toBe(false);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Escape layering', () => {
    it('Escape in a nested dialog closes only the inner one', async () => {
      const user = userEvent.setup();
      render(
        <Dialog title="Outer" defaultOpen>
          <Dialog title="Inner" trigger={<Button>Open inner</Button>}>
            <input aria-label="Inner field" />
          </Dialog>
        </Dialog>,
      );
      const innerTrigger = screen.getByRole('button', { name: 'Open inner' });
      await user.click(innerTrigger);
      expect(screen.getByRole('dialog', { name: 'Inner' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Inner field' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
      expect(innerTrigger).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog', { name: 'Outer' })).not.toBeInTheDocument();
    });

    it('the first Escape closes only an open useDismiss layer, the second the dialog', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({
        defaultOpen: true,
        trigger: undefined,
        onOpenChange,
        children: (
          <>
            <input aria-label="Site name" />
            <DismissLayer />
          </>
        ),
      });
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.getByText('Layer closed')).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('controlled and uncontrolled', () => {
    it('stays open when controlled and the parent ignores onOpenChange(false)', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ open: true, onOpenChange, trigger: undefined });
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('dialog'));
      expect(onOpenChange).toHaveBeenCalledTimes(4);
      for (const call of onOpenChange.mock.calls) expect(call).toEqual([false]);
      expect(screen.getByRole('dialog')).toHaveAttribute('open');
    });

    it('stays closed when controlled and the parent ignores onOpenChange(true)', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ open: false, onOpenChange });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens and closes with a parent that follows onOpenChange', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      function Test() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <span>{open ? 'is open' : 'is closed'}</span>
            <Dialog
              title="T"
              open={open}
              onOpenChange={(next) => {
                onOpenChange(next);
                setOpen(next);
              }}
              trigger={<Button>Open</Button>}
            >
              <DialogClose>Done</DialogClose>
            </Dialog>
          </>
        );
      }
      render(<Test />);
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      expect(screen.getByText('is open')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByText('is closed')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
      expect(trigger).toHaveFocus();
    });

    it('reports a native close while controlled open, and shows the modal again', () => {
      const onOpenChange = vi.fn();
      renderDialog({ open: true, onOpenChange, trigger: undefined });
      const dialog = screen.getByRole<HTMLDialogElement>('dialog');
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      act(() => {
        dialog.close();
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(showModal).toHaveBeenCalledTimes(1);
      expect(dialog).toHaveAttribute('open');
      expect(screen.getByRole('textbox', { name: 'Site name' })).toBeInTheDocument();
    });

    it('syncs state after a native close when uncontrolled, and can open again', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      const dialog = screen.getByRole<HTMLDialogElement>('dialog');
      act(() => {
        dialog.close();
      });
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('textbox', { name: 'Site name' })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      await user.click(trigger);
      expect(dialog).toHaveAttribute('open');
      expect(screen.getByRole('textbox', { name: 'Site name' })).toHaveFocus();
    });
  });

  describe('DialogClose', () => {
    it('closes after its own onClick, unless that prevented default', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { unmount } = renderDialog({
        footer: <DialogClose onClick={onClick}>Done</DialogClose>,
      });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      unmount();

      renderDialog({
        footer: (
          <DialogClose
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            Done
          </DialogClose>
        ),
      });
      await user.click(screen.getByRole('button', { name: 'Open' }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('closes with %s', async (_name, key) => {
      const user = userEvent.setup();
      renderDialog({ children: <p>Text only</p> });
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
      await user.keyboard(key);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('is a secondary Button by default, takes a variant, forwards its ref and props', () => {
      const ref = createRef<HTMLButtonElement>();
      renderDialog({
        defaultOpen: true,
        footer: (
          <>
            <DialogClose ref={ref} className="extra" aria-describedby="x">
              Cancel
            </DialogClose>
            <DialogClose variant="primary">Save</DialogClose>
          </>
        ),
      });
      const cancel = screen.getByRole('button', { name: 'Cancel' });
      expect(ref.current).toBe(cancel);
      expect(cancel).toHaveAttribute('data-variant', 'secondary');
      expect(cancel).toHaveClass('extra');
      expect(cancel).toHaveAttribute('aria-describedby', 'x');
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
        'data-variant',
        'primary',
      );
    });

    it('does nothing when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderDialog({
        defaultOpen: true,
        footer: (
          <DialogClose disabled onClick={onClick}>
            Done
          </DialogClose>
        ),
      });
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClick).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('throws outside a Dialog', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(<DialogClose>Close</DialogClose>)).toThrow(/inside a <Dialog>/);
    });
  });

  describe('overlay host', () => {
    it('registers its outlet with OverlayHostContext while open', async () => {
      const user = userEvent.setup();
      const unregister = vi.fn();
      const host: OverlayHost = { registerModal: vi.fn(() => unregister) };
      render(
        <OverlayHostContext.Provider value={host}>
          <Dialog title="T" trigger={<Button>Open</Button>}>
            <DialogClose>Done</DialogClose>
          </Dialog>
        </OverlayHostContext.Provider>,
      );
      expect(host.registerModal).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(host.registerModal).toHaveBeenCalledTimes(1);
      const outlet = vi.mocked(host.registerModal).mock.calls[0]?.[0];
      expect(screen.getByRole('dialog')).toContainElement(outlet ?? null);
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(unregister).toHaveBeenCalledTimes(1);
    });

    it('unregisters when unmounted while open', () => {
      const unregister = vi.fn();
      const host: OverlayHost = { registerModal: vi.fn(() => unregister) };
      const { unmount } = render(
        <OverlayHostContext.Provider value={host}>
          <Dialog title="T" defaultOpen />
        </OverlayHostContext.Provider>,
      );
      expect(host.registerModal).toHaveBeenCalledTimes(1);
      unmount();
      expect(unregister).toHaveBeenCalledTimes(1);
    });
  });

  describe('review fixes', () => {
    it('closes the native dialog and returns focus when unmounted while open', () => {
      const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
      const ui = (mounted: boolean, open: boolean) => (
        <>
          <button type="button">Outside</button>
          {mounted && (
            <Dialog title="T" open={open}>
              <input aria-label="Field" />
            </Dialog>
          )}
        </>
      );
      const { rerender } = render(ui(true, false));
      const outside = screen.getByRole('button', { name: 'Outside' });
      act(() => {
        outside.focus();
      });
      rerender(ui(true, true));
      expect(screen.getByRole('textbox', { name: 'Field' })).toHaveFocus();
      rerender(ui(false, true));
      expect(close).toHaveBeenCalledTimes(1);
      expect(outside).toHaveFocus();
    });

    it('does not call close() when unmounted while closed', () => {
      const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
      const { unmount } = renderDialog();
      unmount();
      expect(close).not.toHaveBeenCalled();
    });

    it('refocuses the last focused element after a controlled re-show', () => {
      render(
        <Dialog title="T" open>
          <input aria-label="First" />
          <input aria-label="Second" />
        </Dialog>,
      );
      const dialog = screen.getByRole<HTMLDialogElement>('dialog');
      const second = screen.getByRole('textbox', { name: 'Second' });
      expect(screen.getByRole('textbox', { name: 'First' })).toHaveFocus();
      act(() => {
        second.focus();
      });
      act(() => {
        dialog.close();
        second.blur();
      });
      expect(dialog).toHaveAttribute('open');
      expect(second).toHaveFocus();
    });

    it('warns when there is no title and nothing else names the dialog', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { unmount } = render(<Dialog title={null} defaultOpen />);
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/no accessible name/));
      expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');
      unmount();
      warn.mockClear();

      render(<Dialog title={null} aria-label="Settings" defaultOpen />);
      expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
      render(
        <>
          <span id="ext">External</span>
          <Dialog title={null} aria-labelledby="ext" defaultOpen />
        </>,
      );
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn with a title', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      renderDialog({ defaultOpen: true });
      expect(warn).not.toHaveBeenCalled();
    });

    it('ignores Escape during IME composition', () => {
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      const field = screen.getByRole('textbox', { name: 'Site name' });
      fireEvent.keyDown(field, { key: 'Escape', isComposing: true });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(field, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('ignores a backdrop click when a floating layer was open at pointerdown', () => {
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      const dialog = screen.getByRole('dialog');
      const popLayer = pushLayer(Symbol('test layer'));
      try {
        fireEvent.pointerDown(dialog);
      } finally {
        // The press dismissed the layer, as a Menu's outside-pointer handler would.
        popLayer();
      }
      fireEvent.click(dialog);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // The next press, with no layer open, closes it.
      fireEvent.pointerDown(dialog);
      fireEvent.click(dialog);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('one Escape closes the dialog while the close button tooltip shows', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, trigger: undefined, onOpenChange });
      await user.tab({ shift: true });
      const close = screen.getByRole('button', { name: 'Close' });
      expect(close).toHaveFocus();
      // Keyboard focus shows the decorative tooltip (a popover sibling of the button).
      expect(close.nextElementSibling).toHaveAttribute('data-popover-open');
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders an empty status region in the outlet only under an OverlayHostContext', () => {
      const host: OverlayHost = { registerModal: () => () => undefined };
      const { unmount } = render(
        <OverlayHostContext.Provider value={host}>
          <Dialog title="T" defaultOpen />
        </OverlayHostContext.Provider>,
      );
      const status = within(screen.getByRole('dialog')).getByRole('status');
      expect(status).toHaveAttribute('data-gn-announcer');
      expect(status).toBeEmptyDOMElement();
      unmount();

      render(<Dialog title="T" defaultOpen />);
      expect(within(screen.getByRole('dialog')).queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations when closed', async () => {
      const { container } = renderDialog();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when open', async () => {
      const { container } = renderDialog({ defaultOpen: true });
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when open without a description or footer', async () => {
      const { container } = renderDialog({
        defaultOpen: true,
        description: undefined,
        footer: undefined,
        size: 'lg',
      });
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe('AlertDialog', () => {
  function renderAlert(props: Partial<AlertDialogProps> & { ref?: Ref<HTMLDialogElement> } = {}) {
    return render(
      <AlertDialog
        title="Delete 3 files?"
        description="This cannot be undone."
        confirmLabel="Delete files"
        onConfirm={() => undefined}
        trigger={<Button>Delete</Button>}
        {...props}
      />,
    );
  }

  it('is an alertdialog with focus on Cancel and no close button', async () => {
    const user = userEvent.setup();
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    renderAlert();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 3 files?' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing but the <dialog> while closed', () => {
    renderAlert();
    expect(screen.queryByText('Delete 3 files?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('calls onConfirm, then onOpenChange(false), and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    renderAlert({
      onConfirm: () => calls.push('confirm'),
      onOpenChange: (open) => calls.push(`open:${String(open)}`),
    });
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Delete files' }));
    expect(calls).toEqual(['open:true', 'confirm', 'open:false']);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('Cancel closes without confirming and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderAlert({ onConfirm, onOpenChange });
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('works by keyboard: Enter on Cancel closes; Tab then Enter confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderAlert({ onConfirm });
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();

    await user.keyboard(' ');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete files' })).toHaveFocus();
    await user.keyboard(' ');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not close on a backdrop click, but closes on Escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderAlert({ defaultOpen: true, trigger: undefined, onConfirm, onOpenChange });
    await user.click(screen.getByRole('alertdialog'));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // The click moved focus off the panel (jsdom blurs to <body>); Escape from Cancel.
    act(() => {
      screen.getByRole('button', { name: 'Cancel' }).focus();
    });
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('prevents the native cancel and closes through state', () => {
    renderAlert({ defaultOpen: true, trigger: undefined });
    const event = fireCancel(screen.getByRole('alertdialog'));
    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('defaults to a danger confirm button and a "Cancel" label', () => {
    renderAlert({ defaultOpen: true });
    expect(screen.getByRole('button', { name: 'Delete files' })).toHaveAttribute(
      'data-variant',
      'danger',
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'data-variant',
      'secondary',
    );
  });

  it('confirms through DialogClose, so a consumer preventDefault keeps it open', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderAlert({
      defaultOpen: true,
      trigger: undefined,
      onConfirm,
      onOpenChange,
      // Capture runs before the confirm button's own click handler.
      onClickCapture: (event) => {
        event.preventDefault();
      },
    });
    const confirm = screen.getByRole('button', { name: 'Delete files' });
    expect(confirm).toHaveAttribute('type', 'button');
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('reflects confirmVariant and cancelLabel', () => {
    renderAlert({ defaultOpen: true, confirmVariant: 'primary', cancelLabel: 'Keep' });
    expect(screen.getByRole('button', { name: 'Delete files' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus();
  });

  it('puts size, className, ref and native props on the <dialog>', () => {
    const ref = createRef<HTMLDialogElement>();
    renderAlert({ ref, size: 'sm', className: 'extra', id: 'confirm', defaultOpen: true });
    const dialog = screen.getByRole('alertdialog');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute('data-size', 'sm');
    expect(dialog).toHaveClass('extra');
    expect(dialog).toHaveAttribute('id', 'confirm');
  });

  it('stays open while working when the parent ignores the close from Confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const finish: { current: (() => void) | null } = { current: null };
    function KeepOpenWhileWorking() {
      const [open, setOpen] = useState(false);
      const [status, setStatus] = useState('3 files selected');
      const workingRef = useRef(false);
      return (
        <>
          <Button
            onClick={() => {
              setOpen(true);
            }}
          >
            Remove files
          </Button>
          <span>{status}</span>
          <AlertDialog
            title="Delete 3 files?"
            description="This cannot be undone."
            confirmLabel="Delete files"
            open={open}
            onOpenChange={(next) => {
              if (!next && workingRef.current) return;
              setOpen(next);
            }}
            onConfirm={() => {
              onConfirm();
              workingRef.current = true;
              setStatus('Deleting');
              finish.current = () => {
                workingRef.current = false;
                setStatus('Files deleted');
                setOpen(false);
              };
            }}
          />
        </>
      );
    }
    render(<KeepOpenWhileWorking />);
    const opener = screen.getByRole('button', { name: 'Remove files' });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Delete files' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Deleting')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toHaveAttribute('open');

    act(() => {
      finish.current?.();
    });
    expect(screen.getByText('Files deleted')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('has no axe violations when closed', async () => {
    const { container } = renderAlert();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when open', async () => {
    const { container } = renderAlert({ defaultOpen: true });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Dialog review follow-ups', () => {
  it('treats an empty or whitespace title as missing: warns and does not point aria-labelledby at it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Dialog title="  " defaultOpen>
        <p>Body</p>
      </Dialog>,
    );
    expect(warn).toHaveBeenCalled();
    const dialog = document.querySelector('dialog');
    expect(dialog?.getAttribute('aria-labelledby') ?? '').not.toMatch(/title/);
  });

  it('lets onConfirm keep an AlertDialog open with preventDefault', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AlertDialog
        title="Delete files?"
        description="This permanently deletes 3 files."
        confirmLabel="Delete"
        defaultOpen
        onOpenChange={onOpenChange}
        onConfirm={(event) => {
          event.preventDefault();
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.querySelector('dialog')).toHaveAttribute('open');
  });
});
