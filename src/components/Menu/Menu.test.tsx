import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRef,
  useState,
  type Ref,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { CloseIcon } from '../Icon';
import { IconButton } from '../IconButton';
import { Menu, MenuGroup, MenuItem, MenuSeparator, type MenuProps } from './Menu';

/**
 * jsdom's `:focus-visible` heuristic remembers the last focus-visible element across tests,
 * and after a focused node is removed the next focus gets `<body>` as relatedTarget. Focusing
 * and blurring a scratch element resets that, keeping keyboard tests order-independent.
 */
function resetFocusVisible() {
  const scratch = document.createElement('button');
  document.body.append(scratch);
  scratch.focus();
  scratch.blur();
  scratch.remove();
}

interface TestMenuProps extends Partial<MenuProps> {
  ref?: Ref<HTMLDivElement>;
  onSelect?: () => void;
  onDisabledSelect?: () => void;
}

function TestMenu({ onSelect, onDisabledSelect, ...props }: TestMenuProps) {
  return (
    <>
      <button type="button">Before</button>
      <Menu trigger={<Button>Actions</Button>} {...props}>
        <MenuItem onSelect={onSelect}>Edit</MenuItem>
        <MenuItem>Duplicate</MenuItem>
        <MenuItem disabled onSelect={onDisabledSelect}>
          Archive
        </MenuItem>
        <MenuSeparator />
        <MenuGroup label="Danger zone">
          <MenuItem>Delete</MenuItem>
        </MenuGroup>
      </Menu>
      <button type="button">After</button>
    </>
  );
}

function getTrigger() {
  return screen.getByRole('button', { name: 'Actions' });
}

function item(name: string) {
  return screen.getByRole('menuitem', { name });
}

async function openWithClick(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getTrigger());
  return screen.getByRole('menu');
}

describe('Menu', () => {
  beforeEach(() => {
    resetFocusVisible();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('trigger and opening', () => {
    it('wires the trigger as a collapsed menu button and mounts nothing while closed', () => {
      render(<TestMenu />);
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger.id).not.toBe('');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    it('click opens the menu, named by the trigger, and focuses the first item', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      const trigger = getTrigger();
      await user.click(trigger);
      const menu = screen.getByRole('menu', { name: 'Actions' });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-controls', menu.id);
      expect(menu).toHaveAttribute('aria-labelledby', trigger.id);
      expect(menu).toHaveAttribute('popover', 'manual');
      expect(menu).toHaveAttribute('data-popover-open');
      expect(menu).toBeVisible();
      expect(trigger.nextElementSibling).toBe(menu);
      expect(item('Edit')).toHaveFocus();
    });

    it('calls showPopover on the menu when it opens', async () => {
      const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover');
      const user = userEvent.setup();
      render(<TestMenu />);
      expect(showPopover).not.toHaveBeenCalled();
      const menu = await openWithClick(user);
      expect(showPopover).toHaveBeenCalledTimes(1);
      expect(showPopover.mock.contexts[0]).toBe(menu);
    });

    it.each(['{Enter}', ' ', '{ArrowDown}'])(
      '%s on the trigger opens to the first item',
      async (key) => {
        const user = userEvent.setup();
        render(<TestMenu />);
        await user.tab();
        await user.tab();
        expect(getTrigger()).toHaveFocus();
        await user.keyboard(key);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
        expect(item('Edit')).toHaveFocus();
      },
    );

    it('ArrowUp on the trigger opens to the last item', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(item('Delete')).toHaveFocus();
    });

    it('clicking the trigger again closes the menu', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.click(getTrigger());
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      expect(getTrigger()).not.toHaveAttribute('aria-controls');
    });

    it('keeps a consumer trigger id and labels the menu with it', async () => {
      const user = userEvent.setup();
      render(
        <Menu trigger={<Button id="actions">Actions</Button>}>
          <MenuItem>Edit</MenuItem>
        </Menu>,
      );
      expect(getTrigger()).toHaveAttribute('id', 'actions');
      const menu = await openWithClick(user);
      expect(menu).toHaveAttribute('aria-labelledby', 'actions');
      expect(menu).toHaveAccessibleName('Actions');
    });

    it('runs the consumer trigger onClick and onKeyDown first', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onKeyDown = vi.fn();
      render(
        <Menu
          trigger={
            <Button onClick={onClick} onKeyDown={onKeyDown}>
              Actions
            </Button>
          }
        >
          <MenuItem>Edit</MenuItem>
        </Menu>,
      );
      await user.click(getTrigger());
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      await user.keyboard('{ArrowDown}');
      expect(onKeyDown).toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('does not open when the consumer trigger onClick calls preventDefault', async () => {
      const user = userEvent.setup();
      render(
        <Menu
          trigger={
            <Button
              onClick={(event) => {
                event.preventDefault();
              }}
            >
              Actions
            </Button>
          }
        >
          <MenuItem>Edit</MenuItem>
        </Menu>,
      );
      await user.click(getTrigger());
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown and ArrowUp move through every item, disabled included, and wrap', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      expect(item('Edit')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(item('Duplicate')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(item('Archive')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(item('Delete')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(item('Edit')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(item('Delete')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(item('Archive')).toHaveFocus();
    });

    it('Home and End move to the first and last item', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.keyboard('{End}');
      expect(item('Delete')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(item('Edit')).toHaveFocus();
    });

    it('marks the focused item active', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      expect(item('Edit')).toHaveAttribute('data-active');
      await user.keyboard('{ArrowDown}');
      expect(item('Edit')).not.toHaveAttribute('data-active');
      expect(item('Duplicate')).toHaveAttribute('data-active');
    });

    it('typeahead moves to the item starting with the typed character, case-insensitively', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.keyboard('A');
      expect(item('Archive')).toHaveFocus();
    });

    it('typeahead: a repeated letter cycles through matches and wraps', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.keyboard('d');
      expect(item('Duplicate')).toHaveFocus();
      await user.keyboard('d');
      expect(item('Delete')).toHaveFocus();
      await user.keyboard('d');
      expect(item('Duplicate')).toHaveFocus();
    });

    it('typeahead: a multi-character search matches a prefix', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.keyboard('de');
      expect(item('Delete')).toHaveFocus();
    });

    it('typeahead: the buffer resets 500ms after the last key', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      render(<TestMenu />);
      await openWithClick(user);
      await user.keyboard('de');
      expect(item('Delete')).toHaveFocus();
      // Within the timeout "e" extends the buffer to "dee": no match, focus stays.
      await user.keyboard('e');
      expect(item('Delete')).toHaveFocus();
      act(() => {
        vi.advanceTimersByTime(499);
      });
      await user.keyboard('e');
      expect(item('Delete')).toHaveFocus();
      act(() => {
        vi.advanceTimersByTime(500);
      });
      // After the reset "e" is a fresh search.
      await user.keyboard('e');
      expect(item('Edit')).toHaveFocus();
    });

    it('typeahead uses textValue when given', async () => {
      const user = userEvent.setup();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem>Edit</MenuItem>
          <MenuItem textValue="Rename">
            <strong>R</strong>ename
          </MenuItem>
          <MenuItem textValue="Zoom">Magnify</MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      expect(item('Rename')).toHaveAttribute('data-text-value', 'Rename');
      await user.keyboard('z');
      expect(item('Magnify')).toHaveFocus();
    });

    it('hovering an item focuses it so the keyboard continues from there', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.hover(item('Archive'));
      expect(item('Archive')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(item('Delete')).toHaveFocus();
    });

    it('ignores touch pointer moves on items', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      fireEvent.pointerMove(item('Archive'), { pointerType: 'touch' });
      expect(item('Edit')).toHaveFocus();
    });

    it('runs a consumer onKeyDown on the menu and lets it cancel navigation', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn((event: ReactKeyboardEvent) => {
        if (event.key === 'ArrowDown') event.preventDefault();
      });
      render(<TestMenu onKeyDown={onKeyDown} />);
      await openWithClick(user);
      await user.keyboard('{ArrowDown}');
      expect(onKeyDown).toHaveBeenCalled();
      expect(item('Edit')).toHaveFocus();
      await user.keyboard('{End}');
      expect(item('Delete')).toHaveFocus();
    });
  });

  describe('activation', () => {
    it.each([
      ['click', null],
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('%s calls onSelect after closing, with focus on the trigger', async (_label, key) => {
      const user = userEvent.setup();
      let focusedDuringSelect: Element | null = null;
      let closeRequestedBeforeSelect = false;
      const onOpenChange = vi.fn();
      const onSelect = vi.fn(() => {
        focusedDuringSelect = document.activeElement;
        closeRequestedBeforeSelect = onOpenChange.mock.lastCall?.[0] === false;
      });
      render(<TestMenu onSelect={onSelect} onOpenChange={onOpenChange} />);
      await openWithClick(user);
      if (key === null) await user.click(item('Edit'));
      else await user.keyboard(key);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith();
      expect(focusedDuringSelect).toBe(getTrigger());
      // The close is requested before onSelect runs; the menu is gone afterwards.
      expect(closeRequestedBeforeSelect).toBe(true);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes and refocuses the trigger for an item without onSelect', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.click(item('Duplicate'));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
    });

    it('runs a consumer onClick first and lets preventDefault veto the selection', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onClick = vi.fn((event: ReactMouseEvent) => {
        event.preventDefault();
      });
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem onClick={onClick} onSelect={onSelect}>
            Edit
          </MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      await user.click(item('Edit'));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('disabled items', () => {
    it('are focusable by arrows and marked aria-disabled', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.keyboard('{ArrowDown}{ArrowDown}');
      const archive = item('Archive');
      expect(archive).toHaveFocus();
      expect(archive).toHaveAttribute('aria-disabled', 'true');
      expect(archive).toBeEnabled();
      expect(item('Edit')).not.toHaveAttribute('aria-disabled');
    });

    it('do nothing on click', async () => {
      const user = userEvent.setup();
      const onDisabledSelect = vi.fn();
      const onOpenChange = vi.fn();
      render(<TestMenu onDisabledSelect={onDisabledSelect} onOpenChange={onOpenChange} />);
      await openWithClick(user);
      onOpenChange.mockClear();
      await user.click(item('Archive'));
      expect(onDisabledSelect).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it.each(['{Enter}', ' '])('do nothing on %j', async (key) => {
      const user = userEvent.setup();
      const onDisabledSelect = vi.fn();
      render(<TestMenu onDisabledSelect={onDisabledSelect} />);
      await openWithClick(user);
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(item('Archive')).toHaveFocus();
      await user.keyboard(key);
      expect(onDisabledSelect).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(item('Archive')).toHaveFocus();
    });

    it('do not run a consumer onClick', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem disabled onClick={onClick}>
            Archive
          </MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      await user.click(item('Archive'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('Escape closes and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<TestMenu onOpenChange={onOpenChange} />);
      await openWithClick(user);
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(onOpenChange).toHaveBeenCalledTimes(2);
    });

    it('Tab closes and moves focus to the next element', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.tab();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shift+Tab closes and moves focus back', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.tab({ shift: true });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('an outside click closes without refocusing the trigger', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.click(screen.getByRole('button', { name: 'After' }));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).not.toHaveFocus();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('a click on empty page space closes it', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      await user.click(document.body);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).not.toHaveFocus();
    });

    it('closes when focus moves elsewhere programmatically', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      act(() => {
        screen.getByRole('button', { name: 'After' }).focus();
      });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('calls the consumer onBlur on the menu', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(<TestMenu onBlur={onBlur} />);
      await openWithClick(user);
      await user.tab();
      expect(onBlur).toHaveBeenCalled();
    });

    it('lets Escape through to the document while closed', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn((event: KeyboardEvent) => event.defaultPrevented);
      document.addEventListener('keydown', onKeyDown);
      render(<TestMenu />);
      getTrigger().focus();
      await user.keyboard('{Escape}');
      document.removeEventListener('keydown', onKeyDown);
      expect(onKeyDown.mock.results[0]?.value).toBe(false);
    });
  });

  describe('inside a Dialog', () => {
    it('Escape closes only the menu, then the dialog', async () => {
      const user = userEvent.setup();
      render(
        <Dialog title="Settings" defaultOpen>
          <Menu trigger={<Button>Actions</Button>}>
            <MenuItem>Edit</MenuItem>
          </Menu>
        </Dialog>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Settings' });
      await user.click(getTrigger());
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(dialog).toHaveAttribute('open');
      expect(getTrigger()).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(dialog).not.toHaveAttribute('open');
    });
  });

  describe('controlled and uncontrolled', () => {
    it('supports defaultOpen and focuses the first item', () => {
      render(<TestMenu defaultOpen />);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(item('Edit')).toHaveFocus();
    });

    it('follows a controlled open prop', () => {
      const { rerender } = render(<TestMenu open={false} />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      rerender(<TestMenu open />);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
      expect(item('Edit')).toHaveFocus();
      rerender(<TestMenu open={false} />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('requests changes through onOpenChange without changing a controlled state', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(<TestMenu open={false} onOpenChange={onOpenChange} />);
      await user.click(getTrigger());
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      rerender(<TestMenu open onOpenChange={onOpenChange} />);
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('works fully controlled through state', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <TestMenu open={open} onOpenChange={setOpen} onSelect={onSelect} />
            <output>{open ? 'open' : 'closed'}</output>
          </>
        );
      }
      render(<Controlled />);
      await user.click(getTrigger());
      expect(screen.getByRole('status')).toHaveTextContent('open');
      expect(item('Edit')).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('status')).toHaveTextContent('closed');
      expect(getTrigger()).toHaveFocus();
    });
  });

  describe('props and refs', () => {
    it('forwards the ref to the menu element, null while closed', async () => {
      const user = userEvent.setup();
      const ref = createRef<HTMLDivElement>();
      render(<TestMenu ref={ref} />);
      expect(ref.current).toBeNull();
      const menu = await openWithClick(user);
      expect(ref.current).toBe(menu);
      await user.keyboard('{Escape}');
      expect(ref.current).toBeNull();
    });

    it('merges className and passes native props and id to the menu', async () => {
      const user = userEvent.setup();
      render(<TestMenu id="actions-menu" className="extra" data-testid="menu" />);
      const menu = await openWithClick(user);
      expect(menu).toBe(screen.getByTestId('menu'));
      expect(menu).toHaveClass('extra');
      expect(menu.classList.length).toBeGreaterThan(1);
      expect(menu).toHaveAttribute('id', 'actions-menu');
      expect(getTrigger()).toHaveAttribute('aria-controls', 'actions-menu');
    });

    it('reflects the placement on the menu', async () => {
      const user = userEvent.setup();
      render(<TestMenu placement="top" />);
      const menu = await openWithClick(user);
      expect(menu).toHaveAttribute('data-placement', 'top');
    });

    it('defaults to bottom placement', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      const menu = await openWithClick(user);
      expect(menu).toHaveAttribute('data-placement', 'bottom');
    });

    it('MenuItem renders a non-tabbable button, forwards its ref and merges className', async () => {
      const user = userEvent.setup();
      const ref = createRef<HTMLButtonElement>();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem ref={ref} className="extra" data-testid="edit" title="Edit it">
            Edit
          </MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      const edit = item('Edit');
      expect(ref.current).toBe(edit);
      expect(edit.tagName).toBe('BUTTON');
      expect(edit).toHaveAttribute('type', 'button');
      expect(edit).toHaveAttribute('tabindex', '-1');
      expect(edit).toHaveClass('extra');
      expect(edit).toBe(screen.getByTestId('edit'));
      expect(edit).toHaveAttribute('title', 'Edit it');
    });

    it('MenuItem icons are decorative', async () => {
      const user = userEvent.setup();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem startIcon={<CloseIcon label="Close icon" />}>Remove</MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      const remove = screen.getByRole('menuitem', { name: 'Remove' });
      const svg = remove.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('MenuItem composes consumer focus, blur and pointer handlers', async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onPointerMove = vi.fn();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem onFocus={onFocus} onBlur={onBlur} onPointerMove={onPointerMove}>
            Edit
          </MenuItem>
          <MenuItem>Copy</MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      expect(onFocus).toHaveBeenCalledTimes(1);
      await user.keyboard('{ArrowDown}');
      expect(onBlur).toHaveBeenCalledTimes(1);
      await user.hover(item('Edit'));
      expect(onPointerMove).toHaveBeenCalled();
      expect(item('Edit')).toHaveFocus();
    });
  });

  describe('structure', () => {
    it('names groups by their label and keeps their items in the menu order', async () => {
      const user = userEvent.setup();
      const ref = createRef<HTMLDivElement>();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem>Edit</MenuItem>
          <MenuGroup ref={ref} label="Danger zone" className="extra">
            <MenuItem>Delete</MenuItem>
          </MenuGroup>
        </Menu>,
      );
      await openWithClick(user);
      const group = screen.getByRole('group', { name: 'Danger zone' });
      expect(ref.current).toBe(group);
      expect(group).toHaveClass('extra');
      expect(group).toContainElement(item('Delete'));
      expect(screen.getAllByRole('menuitem')).toHaveLength(2);
      await user.keyboard('{ArrowDown}');
      expect(item('Delete')).toHaveFocus();
    });

    it('renders separators that are not focusable', async () => {
      const user = userEvent.setup();
      const ref = createRef<HTMLDivElement>();
      render(
        <Menu trigger={<Button>Actions</Button>}>
          <MenuItem>Edit</MenuItem>
          <MenuSeparator ref={ref} className="extra" />
          <MenuItem>Delete</MenuItem>
        </Menu>,
      );
      await openWithClick(user);
      const separator = screen.getByRole('separator');
      expect(ref.current).toBe(separator);
      expect(separator).toHaveClass('extra');
      expect(separator).not.toHaveAttribute('tabindex');
      await user.keyboard('{ArrowDown}');
      expect(item('Delete')).toHaveFocus();
    });

    it.each([
      ['MenuItem', () => <MenuItem>Orphan</MenuItem>],
      [
        'MenuGroup',
        () => (
          <MenuGroup label="Group">
            <span>x</span>
          </MenuGroup>
        ),
      ],
      ['MenuSeparator', () => <MenuSeparator />],
    ])('%s throws outside a Menu', (name, make) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(make())).toThrow(new RegExp(`${name} must be rendered inside a Menu`));
    });
  });

  describe('trigger click while open', () => {
    it('closes and focuses the trigger when focus was lost to the body (Safari)', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      // Safari does not focus a clicked button: simulate focus falling back to <body>.
      act(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
      expect(document.activeElement).toBe(document.body);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.click(getTrigger());
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
    });

    it('a normal second click leaves focus on the trigger', async () => {
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      expect(item('Edit')).toHaveFocus();
      await user.click(getTrigger());
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
    });
  });

  describe('scrolling the panel', () => {
    const ITEM_HEIGHT = 40;
    const PANEL_HEIGHT = 100;

    /**
     * Stubs a 100px-tall panel at the top of the viewport holding 40px items, so the panel
     * scrolls. Item rects follow `menu.scrollTop`, as in a real scroll container.
     */
    function stubLayout() {
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.getAttribute('role') === 'menu' ? PANEL_HEIGHT : 0;
      });
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.getAttribute('role') !== 'menu') return 0;
        return this.querySelectorAll('[role="menuitem"]').length * ITEM_HEIGHT;
      });
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.getAttribute('role') === 'menu') return PANEL_HEIGHT;
        return this.getAttribute('role') === 'menuitem' ? ITEM_HEIGHT : 0;
      });
      vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.getAttribute('role') !== 'menuitem') return 0;
        const menu = this.closest('[role="menu"]');
        const items = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')) : [];
        return items.indexOf(this) * ITEM_HEIGHT;
      });
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
      ) {
        const role = this.getAttribute('role');
        if (role === 'menu') return new DOMRect(0, 0, 200, PANEL_HEIGHT);
        if (role === 'menuitem') {
          const menu = this.closest<HTMLElement>('[role="menu"]');
          const items = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')) : [];
          const top = items.indexOf(this) * ITEM_HEIGHT - (menu?.scrollTop ?? 0);
          return new DOMRect(0, top, 200, ITEM_HEIGHT);
        }
        // jsdom has no layout: everything else is an empty rect.
        return new DOMRect();
      });
    }

    function isFullyVisible(menu: HTMLElement, name: string) {
      const index = screen.getAllByRole('menuitem').indexOf(item(name));
      const top = index * ITEM_HEIGHT - menu.scrollTop;
      return top >= 0 && top + ITEM_HEIGHT <= PANEL_HEIGHT;
    }

    it('ArrowUp from the trigger scrolls the last item into view', async () => {
      stubLayout();
      const user = userEvent.setup();
      render(<TestMenu />);
      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowUp}');
      const menu = screen.getByRole('menu');
      expect(item('Delete')).toHaveFocus();
      // 4 items x 40px in a 100px panel: the last item ends at 160px.
      expect(menu.scrollTop).toBe(60);
      expect(isFullyVisible(menu, 'Delete')).toBe(true);
    });

    it('Home, End and typeahead keep the focused item in view', async () => {
      stubLayout();
      const user = userEvent.setup();
      render(<TestMenu />);
      const menu = await openWithClick(user);
      expect(menu.scrollTop).toBe(0);
      await user.keyboard('{End}');
      expect(menu.scrollTop).toBe(60);
      await user.keyboard('{Home}');
      expect(menu.scrollTop).toBe(0);
      expect(isFullyVisible(menu, 'Edit')).toBe(true);
      await user.keyboard('a');
      expect(item('Archive')).toHaveFocus();
      expect(isFullyVisible(menu, 'Archive')).toBe(true);
      expect(menu.scrollTop).toBeGreaterThan(0);
    });

    it('focuses items with preventScroll', async () => {
      const focus = vi.spyOn(HTMLElement.prototype, 'focus');
      const user = userEvent.setup();
      render(<TestMenu />);
      await openWithClick(user);
      const calls = () =>
        focus.mock.contexts
          .map((context, index) => ({ context, args: focus.mock.calls[index] }))
          .filter(({ context }) => (context as HTMLElement).getAttribute('role') === 'menuitem');
      expect(calls().at(-1)).toEqual({ context: item('Edit'), args: [{ preventScroll: true }] });
      await user.keyboard('{End}');
      expect(calls().at(-1)).toEqual({
        context: item('Delete'),
        args: [{ preventScroll: true }],
      });
      await user.keyboard('d');
      expect(calls().at(-1)).toEqual({
        context: item('Duplicate'),
        args: [{ preventScroll: true }],
      });
    });
  });

  describe('controlled close and focus loss', () => {
    it('a controlled close with focus on an item returns focus to the trigger', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<TestMenu open />);
      await user.keyboard('{ArrowDown}');
      expect(item('Duplicate')).toHaveFocus();
      rerender(<TestMenu open={false} />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveFocus();
    });

    it('a controlled close after Tab does not move focus back to the trigger', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(<TestMenu open onOpenChange={onOpenChange} />);
      expect(item('Edit')).toHaveFocus();
      await user.tab();
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      const after = screen.getByRole('button', { name: 'After' });
      expect(after).toHaveFocus();
      rerender(<TestMenu open={false} onOpenChange={onOpenChange} />);
      expect(after).toHaveFocus();
      expect(getTrigger()).not.toHaveFocus();
    });

    it('a controlled close after an outside click does not move focus back', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { rerender } = render(<TestMenu open onOpenChange={onOpenChange} />);
      const before = screen.getByRole('button', { name: 'Before' });
      await user.click(before);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      rerender(<TestMenu open={false} onOpenChange={onOpenChange} />);
      expect(before).toHaveFocus();
      expect(getTrigger()).not.toHaveFocus();
    });

    it('stays open when the menu blurs with no relatedTarget', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<TestMenu onOpenChange={onOpenChange} />);
      await openWithClick(user);
      onOpenChange.mockClear();
      fireEvent.blur(item('Edit'), { relatedTarget: null });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('controlled open with focus on the trigger: Tab away requests a close', () => {
      const onOpenChange = vi.fn();
      render(<TestMenu open onOpenChange={onOpenChange} />);
      act(() => {
        getTrigger().focus();
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      onOpenChange.mockClear();
      act(() => {
        screen.getByRole('button', { name: 'After' }).focus();
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('a controlled parent can veto a close; a second Escape asks again', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      function Veto() {
        const [open, setOpen] = useState(false);
        return (
          <TestMenu
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              if (next) setOpen(true); // Ignores every close request.
            }}
          />
        );
      }
      render(<Veto />);
      await openWithClick(user);
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledTimes(3);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('types', () => {
    it('rejects popover and hidden, and keeps a trigger id that labels the menu', async () => {
      const user = userEvent.setup();
      const elements = [
        // @ts-expect-error `popover` is managed by the Menu.
        <Menu key="a" trigger={<Button>A</Button>} popover="auto">
          <MenuItem>Edit</MenuItem>
        </Menu>,
        // @ts-expect-error `hidden` is managed by the Menu.
        <Menu key="b" trigger={<Button>B</Button>} hidden>
          <MenuItem>Edit</MenuItem>
        </Menu>,
      ];
      expect(elements).toHaveLength(2);

      render(
        <Menu trigger={<Button id="my-trigger">Actions</Button>}>
          <MenuItem>Edit</MenuItem>
        </Menu>,
      );
      expect(getTrigger()).toHaveAttribute('id', 'my-trigger');
      const menu = await openWithClick(user);
      expect(menu).toHaveAttribute('aria-labelledby', 'my-trigger');
      expect(menu).toHaveAccessibleName('Actions');
    });
  });

  describe('IconButton trigger', () => {
    it('keeps its name, labels the menu and hides its tooltip on open', async () => {
      const user = userEvent.setup();
      render(
        <Menu trigger={<IconButton label="More actions" icon={<CloseIcon />} />}>
          <MenuItem>Edit</MenuItem>
        </Menu>,
      );
      const trigger = screen.getByRole('button', { name: 'More actions' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      await user.click(trigger);
      expect(screen.getByRole('menu', { name: 'More actions' })).toBeInTheDocument();
      expect(trigger).toHaveAccessibleName('More actions');
      // The tooltip bubble is the trigger's sibling; it stays hidden while the menu is open.
      expect(trigger.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
      expect(trigger.nextElementSibling).not.toBeVisible();
      expect(item('Edit')).toHaveFocus();
    });

    it('shows no tooltip when the trigger is hovered while the menu is open', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      render(
        <>
          <Menu trigger={<IconButton label="More actions" icon={<CloseIcon />} />}>
            <MenuItem>Edit</MenuItem>
          </Menu>
          <p>Elsewhere</p>
        </>,
      );
      const trigger = screen.getByRole('button', { name: 'More actions' });
      await user.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.hover(screen.getByText('Elsewhere'));
      await user.hover(trigger);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(trigger.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
      expect(trigger.nextElementSibling).not.toBeVisible();
    });

    it('opens from the keyboard, hides the tooltip and returns focus on Escape', async () => {
      const user = userEvent.setup();
      render(
        <Menu trigger={<IconButton label="More actions" icon={<CloseIcon />} />}>
          <MenuItem>Edit</MenuItem>
          <MenuItem>Copy</MenuItem>
        </Menu>,
      );
      const trigger = screen.getByRole('button', { name: 'More actions' });
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(item('Edit')).toHaveFocus();
      expect(screen.queryByText('More actions', { selector: '[aria-hidden]' })).not.toBeVisible();
      await user.keyboard('{End}{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations closed', async () => {
      const { container } = render(<TestMenu />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations open with a group, a separator and a disabled item', async () => {
      const user = userEvent.setup();
      const { container } = render(<TestMenu />);
      await openWithClick(user);
      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByRole('separator')).toBeInTheDocument();
      expect(item('Archive')).toHaveAttribute('aria-disabled', 'true');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations open with an IconButton trigger and item icons', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Menu trigger={<IconButton label="More actions" icon={<CloseIcon />} />}>
          <MenuItem startIcon={<CloseIcon />}>Remove</MenuItem>
        </Menu>,
      );
      await user.click(screen.getByRole('button', { name: 'More actions' }));
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
