import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Tab, TabList, TabPanel, Tabs } from '../Tabs/Tabs';
import { Accordion, AccordionItem } from './Accordion';

function items(disabled?: string) {
  return [
    <AccordionItem key="a" value="a" title="Alpha" disabled={disabled === 'a'}>
      Alpha content
    </AccordionItem>,
    <AccordionItem key="b" value="b" title="Beta" disabled={disabled === 'b'}>
      Beta content
    </AccordionItem>,
    <AccordionItem key="c" value="c" title="Gamma" disabled={disabled === 'c'}>
      Gamma content
    </AccordionItem>,
  ];
}

const trigger = (name: string) => screen.getByRole('button', { name });
const region = (name: string) => screen.getByRole('region', { name });
const panelOf = (name: string) =>
  document.getElementById(trigger(name).getAttribute('aria-controls') ?? '');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Accordion', () => {
  describe('rendering and wiring', () => {
    it('puts each trigger button inside a level-3 heading by default', () => {
      render(<Accordion>{items()}</Accordion>);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(3);
      ['Alpha', 'Beta', 'Gamma'].forEach((name, i) => {
        expect(headings[i]).toContainElement(trigger(name));
        expect(headings[i]).toHaveAccessibleName(name);
      });
      expect(trigger('Alpha')).toHaveAttribute('type', 'button');
    });

    it.each([2, 4, 5, 6] as const)('uses headingLevel=%i', (level) => {
      render(<Accordion headingLevel={level}>{items()}</Accordion>);
      const headings = screen.getAllByRole('heading', { level });
      expect(headings).toHaveLength(3);
      expect(headings[0]).toContainElement(trigger('Alpha'));
      expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    });

    it('links each trigger to a region labelled by it', () => {
      render(<Accordion>{items()}</Accordion>);
      for (const name of ['Alpha', 'Beta', 'Gamma']) {
        const t = trigger(name);
        const r = region(name);
        expect(t.id).not.toBe('');
        expect(r.id).not.toBe('');
        expect(t).toHaveAttribute('aria-controls', r.id);
        expect(r).toHaveAttribute('aria-labelledby', t.id);
      }
    });

    it('starts with everything closed by default', () => {
      render(<Accordion>{items()}</Accordion>);
      for (const name of ['Alpha', 'Beta', 'Gamma']) {
        expect(trigger(name)).toHaveAttribute('aria-expanded', 'false');
        expect(trigger(name)).not.toHaveAttribute('aria-disabled');
        expect(panelOf(name)).toHaveAttribute('data-state', 'closed');
      }
    });

    it('keeps closed panels mounted with data-state="closed" on the item and panel', () => {
      render(<Accordion defaultValue="a">{items()}</Accordion>);
      expect(screen.getByText('Beta content')).toBeInTheDocument();
      expect(panelOf('Beta')).toHaveAttribute('data-state', 'closed');
      expect(panelOf('Alpha')).toHaveAttribute('data-state', 'open');
      expect(trigger('Beta').closest('[data-state]:not([role])')).toHaveAttribute(
        'data-state',
        'closed',
      );
    });

    it('makes closed panels inert and the open panel not inert', async () => {
      const user = userEvent.setup();
      render(<Accordion defaultValue="a">{items()}</Accordion>);
      const closed = screen.getAllByRole('region', { hidden: true }).filter((r) => r.inert);
      expect(closed).toHaveLength(2);
      expect(panelOf('Alpha')?.inert).toBe(false);
      expect(panelOf('Beta')?.inert).toBe(true);
      expect(panelOf('Gamma')?.inert).toBe(true);
      await user.click(trigger('Beta'));
      expect(panelOf('Alpha')?.inert).toBe(true);
      expect(panelOf('Beta')?.inert).toBe(false);
      await user.click(trigger('Beta'));
      expect(panelOf('Beta')?.inert).toBe(true);
    });

    it('marks the root with data-accordion and each trigger with data-accordion-trigger', () => {
      const { container } = render(<Accordion>{items()}</Accordion>);
      expect(container.firstElementChild).toHaveAttribute('data-accordion');
      for (const name of ['Alpha', 'Beta', 'Gamma']) {
        expect(trigger(name)).toHaveAttribute('data-accordion-trigger');
      }
    });

    it('makes valid, resolvable ids from values with spaces', () => {
      render(
        <Accordion>
          <AccordionItem value="a b" title="Spaced">
            Content
          </AccordionItem>
        </Accordion>,
      );
      const t = trigger('Spaced');
      expect(t.id).not.toMatch(/\s/);
      expect(t.getAttribute('aria-controls')).not.toMatch(/\s/);
      expect(panelOf('Spaced')).toBe(region('Spaced'));
    });

    it('throws when AccordionItem is rendered outside Accordion', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() =>
        render(
          <AccordionItem value="a" title="Alpha">
            Content
          </AccordionItem>,
        ),
      ).toThrow(/must be rendered inside an <Accordion>/);
    });
  });

  describe('props', () => {
    it('forwards refs to the root and item divs', () => {
      const ref = createRef<HTMLDivElement>();
      const itemRef = createRef<HTMLDivElement>();
      const { container } = render(
        <Accordion ref={ref}>
          <AccordionItem ref={itemRef} value="a" title="Alpha">
            Content
          </AccordionItem>
        </Accordion>,
      );
      expect(ref.current).toBe(container.firstElementChild);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(itemRef.current).toBeInstanceOf(HTMLDivElement);
      expect(itemRef.current).toContainElement(trigger('Alpha'));
      expect(itemRef.current).toContainElement(region('Alpha'));
    });

    it('merges className on the root and item', () => {
      const ref = createRef<HTMLDivElement>();
      const itemRef = createRef<HTMLDivElement>();
      render(
        <Accordion ref={ref} className="custom">
          <AccordionItem ref={itemRef} value="a" title="Alpha" className="c-item">
            Content
          </AccordionItem>
        </Accordion>,
      );
      expect(ref.current).toHaveClass('custom');
      expect(ref.current?.classList.length).toBeGreaterThan(1);
      expect(itemRef.current).toHaveClass('c-item');
      expect(itemRef.current?.classList.length).toBeGreaterThan(1);
    });

    it('passes native props through on the root and item', () => {
      const ref = createRef<HTMLDivElement>();
      const itemRef = createRef<HTMLDivElement>();
      render(
        <Accordion ref={ref} id="faq" data-x="root">
          <AccordionItem ref={itemRef} value="a" title="Alpha" id="item-a" data-x="item">
            Content
          </AccordionItem>
        </Accordion>,
      );
      expect(ref.current).toHaveAttribute('id', 'faq');
      expect(ref.current).toHaveAttribute('data-x', 'root');
      expect(itemRef.current).toHaveAttribute('id', 'item-a');
      expect(itemRef.current).toHaveAttribute('data-x', 'item');
    });

    it('calls a consumer onKeyDown on the root', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(<Accordion onKeyDown={onKeyDown}>{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(onKeyDown).toHaveBeenCalled();
      expect(trigger('Beta')).toHaveFocus();
    });

    it('lets a consumer onKeyDown veto arrow navigation with preventDefault', async () => {
      const user = userEvent.setup();
      render(
        <Accordion
          onKeyDown={(event) => {
            event.preventDefault();
          }}
        >
          {items()}
        </Accordion>,
      );
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Alpha')).toHaveFocus();
    });
  });

  describe('single mode', () => {
    it('opens defaultValue', () => {
      render(<Accordion defaultValue="b">{items()}</Accordion>);
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
      expect(panelOf('Beta')).toHaveAttribute('data-state', 'open');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens an item on click and calls onValueChange with its value only', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Accordion onValueChange={onValueChange}>{items()}</Accordion>);
      await user.click(trigger('Alpha'));
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(panelOf('Alpha')).toHaveAttribute('data-state', 'open');
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith('a');
      expect(onValueChange.mock.calls[0]).toHaveLength(1);
    });

    it('opening B closes A', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Accordion defaultValue="a" onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      await user.click(trigger('Beta'));
      expect(onValueChange).toHaveBeenLastCalledWith('b');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
      expect(panelOf('Alpha')).toHaveAttribute('data-state', 'closed');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapsible (default): clicking the open item closes it and reports ""', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Accordion defaultValue="a" onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      expect(trigger('Alpha')).not.toHaveAttribute('aria-disabled');
      await user.click(trigger('Alpha'));
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
      expect(onValueChange).toHaveBeenCalledWith('');
      expect(
        screen.getAllByRole('button').every((b) => b.getAttribute('aria-expanded') === 'false'),
      ).toBe(true);
    });

    it('non-collapsible: the open trigger is aria-disabled and cannot be closed', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Accordion defaultValue="a" collapsible={false} onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      const alpha = trigger('Alpha');
      expect(alpha).toHaveAttribute('aria-disabled', 'true');
      expect(alpha).not.toBeDisabled();
      expect(trigger('Beta')).not.toHaveAttribute('aria-disabled');
      await user.click(alpha);
      expect(alpha).toHaveAttribute('aria-expanded', 'true');
      alpha.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(alpha).toHaveAttribute('aria-expanded', 'true');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('non-collapsible: opening another item moves aria-disabled to it', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="a" collapsible={false}>
          {items()}
        </Accordion>,
      );
      await user.click(trigger('Beta'));
      expect(trigger('Beta')).toHaveAttribute('aria-disabled', 'true');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Alpha')).not.toHaveAttribute('aria-disabled');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
    });

    it('non-collapsible keeps the locked trigger focusable', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="a" collapsible={false}>
          {items()}
        </Accordion>,
      );
      await user.tab();
      expect(trigger('Alpha')).toHaveFocus();
    });

    it('controlled: respects value and reports changes through onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(
        <Accordion value="a" onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      await user.click(trigger('Beta'));
      expect(onValueChange).toHaveBeenCalledWith('b');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'false');
      await user.click(trigger('Alpha'));
      expect(onValueChange).toHaveBeenLastCalledWith('');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      rerender(
        <Accordion value="b" onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
      rerender(
        <Accordion value="" onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      expect(
        screen.getAllByRole('button').every((b) => b.getAttribute('aria-expanded') === 'false'),
      ).toBe(true);
    });

    it('returns focus to the trigger when a controlled value closes the focused panel', async () => {
      const user = userEvent.setup();
      function linkItems() {
        return [
          <AccordionItem key="a" value="a" title="Alpha">
            <a href="#x">Alpha link</a>
          </AccordionItem>,
          <AccordionItem key="b" value="b" title="Beta">
            Beta content
          </AccordionItem>,
        ];
      }
      const { rerender } = render(<Accordion value="a">{linkItems()}</Accordion>);
      await user.tab();
      await user.tab();
      const link = screen.getByRole('link', { name: 'Alpha link' });
      expect(link).toHaveFocus();
      rerender(<Accordion value="">{linkItems()}</Accordion>);
      expect(panelOf('Alpha')?.inert).toBe(true);
      expect(trigger('Alpha')).toHaveFocus();
    });

    it('does not move focus when a controlled value closes a panel without focus', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Accordion value="a">{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{End}');
      expect(trigger('Gamma')).toHaveFocus();
      rerender(<Accordion value="b">{items()}</Accordion>);
      expect(trigger('Gamma')).toHaveFocus();
    });

    it('controlled with state lifted into a parent', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('');
        return (
          <>
            <output>{value || 'none'}</output>
            <Accordion value={value} onValueChange={setValue}>
              {items()}
            </Accordion>
          </>
        );
      }
      render(<Controlled />);
      await user.click(trigger('Gamma'));
      expect(screen.getByRole('status')).toHaveTextContent('c');
      expect(trigger('Gamma')).toHaveAttribute('aria-expanded', 'true');
      await user.click(trigger('Gamma'));
      expect(screen.getByRole('status')).toHaveTextContent('none');
      expect(trigger('Gamma')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('multiple mode', () => {
    it('opens every defaultValue item', () => {
      render(
        <Accordion multiple defaultValue={['a', 'c']}>
          {items()}
        </Accordion>,
      );
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'false');
      expect(trigger('Gamma')).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles items independently and reports the full list', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Accordion multiple defaultValue={['a']} onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      await user.click(trigger('Beta'));
      expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
      await user.click(trigger('Alpha'));
      expect(onValueChange).toHaveBeenLastCalledWith(['b']);
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
      await user.click(trigger('Beta'));
      expect(onValueChange).toHaveBeenLastCalledWith([]);
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'false');
    });

    it('never sets aria-disabled on open triggers', () => {
      render(
        <Accordion multiple defaultValue={['a', 'b']}>
          {items()}
        </Accordion>,
      );
      expect(trigger('Alpha')).not.toHaveAttribute('aria-disabled');
      expect(trigger('Beta')).not.toHaveAttribute('aria-disabled');
    });

    it('controlled: respects value and reports changes', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(
        <Accordion multiple value={['a']} onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      await user.click(trigger('Gamma'));
      expect(onValueChange).toHaveBeenCalledWith(['a', 'c']);
      expect(trigger('Gamma')).toHaveAttribute('aria-expanded', 'false');
      await user.click(trigger('Alpha'));
      expect(onValueChange).toHaveBeenLastCalledWith([]);
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      rerender(
        <Accordion multiple value={['b', 'c']} onValueChange={onValueChange}>
          {items()}
        </Accordion>,
      );
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Gamma')).toHaveAttribute('aria-expanded', 'true');
    });

    it('controlled with state lifted into a parent', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState<string[]>([]);
        return (
          <>
            <output>{value.join(',') || 'none'}</output>
            <Accordion multiple value={value} onValueChange={setValue}>
              {items()}
            </Accordion>
          </>
        );
      }
      render(<Controlled />);
      await user.click(trigger('Beta'));
      await user.click(trigger('Alpha'));
      expect(screen.getByRole('status')).toHaveTextContent('b,a');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('disabled item', () => {
    it('is natively disabled and marks the item', () => {
      render(<Accordion>{items('b')}</Accordion>);
      expect(trigger('Beta')).toBeDisabled();
      expect(trigger('Beta').closest('[data-disabled]')).not.toBeNull();
      expect(trigger('Alpha').closest('[data-disabled]')).toBeNull();
    });

    it('does not toggle or call onValueChange on click', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Accordion onValueChange={onValueChange}>{items('b')}</Accordion>);
      await user.click(trigger('Beta'));
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'false');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('is skipped by Tab', async () => {
      const user = userEvent.setup();
      render(<Accordion>{items('b')}</Accordion>);
      await user.tab();
      expect(trigger('Alpha')).toHaveFocus();
      await user.tab();
      expect(trigger('Gamma')).toHaveFocus();
    });

    it('can be open and disabled at once', () => {
      render(<Accordion defaultValue="b">{items('b')}</Accordion>);
      expect(trigger('Beta')).toBeDisabled();
      expect(trigger('Beta')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('keyboard', () => {
    it('Enter toggles the focused item and keeps focus on the trigger', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Accordion onValueChange={onValueChange}>{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{Enter}');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Alpha')).toHaveFocus();
      expect(onValueChange).toHaveBeenLastCalledWith('a');
      await user.keyboard('{Enter}');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
      expect(trigger('Alpha')).toHaveFocus();
      expect(onValueChange).toHaveBeenLastCalledWith('');
    });

    it('Space toggles the focused item and keeps focus on the trigger', async () => {
      const user = userEvent.setup();
      render(<Accordion>{items()}</Accordion>);
      await user.tab();
      await user.keyboard(' ');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Alpha')).toHaveFocus();
      await user.keyboard(' ');
      expect(trigger('Alpha')).toHaveAttribute('aria-expanded', 'false');
    });

    it('Tab moves through triggers and focusable content in open panels', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="a">
          <AccordionItem value="a" title="Alpha">
            <a href="#x">Link inside</a>
          </AccordionItem>
          <AccordionItem value="b" title="Beta">
            Beta content
          </AccordionItem>
        </Accordion>,
      );
      await user.tab();
      expect(trigger('Alpha')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('link', { name: 'Link inside' })).toHaveFocus();
      await user.tab();
      expect(trigger('Beta')).toHaveFocus();
    });

    it('ArrowDown/ArrowUp move between triggers with wrap and do not toggle', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Accordion onValueChange={onValueChange}>{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Beta')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Gamma')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Alpha')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(trigger('Gamma')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(trigger('Beta')).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Home/End go to the first and last trigger', async () => {
      const user = userEvent.setup();
      render(<Accordion>{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{End}');
      expect(trigger('Gamma')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(trigger('Alpha')).toHaveFocus();
    });

    it('skips disabled triggers with arrows, Home and End', async () => {
      const user = userEvent.setup();
      render(<Accordion>{items('b')}</Accordion>);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Gamma')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(trigger('Alpha')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(trigger('Gamma')).toHaveFocus();
    });

    it('skips disabled first and last triggers on Home and End', async () => {
      const user = userEvent.setup();
      render(
        <Accordion>
          <AccordionItem value="a" title="Alpha" disabled>
            A
          </AccordionItem>
          <AccordionItem value="b" title="Beta">
            B
          </AccordionItem>
          <AccordionItem value="c" title="Gamma">
            C
          </AccordionItem>
          <AccordionItem value="d" title="Delta" disabled>
            D
          </AccordionItem>
        </Accordion>,
      );
      await user.tab();
      expect(trigger('Beta')).toHaveFocus();
      await user.keyboard('{End}');
      expect(trigger('Gamma')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(trigger('Beta')).toHaveFocus();
    });

    it('ArrowLeft/ArrowRight do nothing', async () => {
      const user = userEvent.setup();
      render(<Accordion>{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{ArrowRight}{ArrowLeft}');
      expect(trigger('Alpha')).toHaveFocus();
    });

    it('arrows reach a locked (aria-disabled) trigger', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="b" collapsible={false}>
          {items()}
        </Accordion>,
      );
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Beta')).toHaveFocus();
    });

    it('ignores arrows when focus is inside a panel, not on a trigger', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="a">
          <AccordionItem value="a" title="Alpha">
            <button type="button">Inner action</button>
          </AccordionItem>
          <AccordionItem value="b" title="Beta">
            B
          </AccordionItem>
        </Accordion>,
      );
      await user.tab();
      await user.tab();
      const inner = screen.getByRole('button', { name: 'Inner action' });
      expect(inner).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(inner).toHaveFocus();
      await user.keyboard('{End}');
      expect(inner).toHaveFocus();
    });

    it('ignores arrows with a modifier key', async () => {
      const user = userEvent.setup();
      render(<Accordion>{items()}</Accordion>);
      await user.tab();
      await user.keyboard('{Control>}{ArrowDown}{/Control}');
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      await user.keyboard('{Meta>}{ArrowDown}{/Meta}');
      expect(trigger('Alpha')).toHaveFocus();
    });
  });

  describe('nesting', () => {
    function Nested() {
      return (
        <Accordion defaultValue="outer-a">
          <AccordionItem value="outer-a" title="Outer A">
            <Accordion>
              <AccordionItem value="inner-a" title="Inner A">
                Inner A content
              </AccordionItem>
              <AccordionItem value="inner-b" title="Inner B">
                Inner B content
              </AccordionItem>
            </Accordion>
          </AccordionItem>
          <AccordionItem value="outer-b" title="Outer B">
            Outer B content
          </AccordionItem>
        </Accordion>
      );
    }

    it('keeps arrow navigation inside the nested accordion', async () => {
      const user = userEvent.setup();
      render(<Nested />);
      await user.tab();
      expect(trigger('Outer A')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Outer B')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Outer A')).toHaveFocus();
      await user.tab();
      expect(trigger('Inner A')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Inner B')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Inner A')).toHaveFocus();
      await user.keyboard('{End}');
      expect(trigger('Inner B')).toHaveFocus();
    });

    it('keeps nested state independent', async () => {
      const user = userEvent.setup();
      render(<Nested />);
      await user.click(trigger('Inner B'));
      expect(trigger('Inner B')).toHaveAttribute('aria-expanded', 'true');
      expect(trigger('Outer A')).toHaveAttribute('aria-expanded', 'true');
      await user.click(trigger('Outer B'));
      expect(trigger('Outer A')).toHaveAttribute('aria-expanded', 'false');
      expect(trigger('Inner B')).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowDown on the last inner trigger wraps inside the inner accordion', async () => {
      const user = userEvent.setup();
      render(<Nested />);
      trigger('Inner B').focus();
      await user.keyboard('{ArrowDown}');
      expect(trigger('Inner A')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(trigger('Inner B')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(trigger('Inner A')).toHaveFocus();
      expect(trigger('Outer A')).not.toHaveFocus();
      expect(trigger('Outer B')).not.toHaveFocus();
    });

    it('lets Tabs inside a panel handle their own arrows', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="a">
          <AccordionItem value="a" title="Alpha">
            <Tabs orientation="vertical">
              <TabList aria-label="Inner tabs">
                <Tab value="x">X</Tab>
                <Tab value="y">Y</Tab>
              </TabList>
              <TabPanel value="x">X panel</TabPanel>
              <TabPanel value="y">Y panel</TabPanel>
            </Tabs>
          </AccordionItem>
          <AccordionItem value="b" title="Beta">
            B
          </AccordionItem>
        </Accordion>,
      );
      await user.tab();
      await user.tab();
      const x = screen.getByRole('tab', { name: 'X' });
      expect(x).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('tab', { name: 'Y' })).toHaveFocus();
      await user.keyboard('{Home}');
      expect(x).toHaveFocus();
      expect(trigger('Alpha')).not.toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations (all closed)', async () => {
      const { container } = render(<Accordion>{items()}</Accordion>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (one open)', async () => {
      const { container } = render(<Accordion defaultValue="a">{items()}</Accordion>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (multiple open)', async () => {
      const { container } = render(
        <Accordion multiple defaultValue={['a', 'b']}>
          {items()}
        </Accordion>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (with a disabled item)', async () => {
      const { container } = render(<Accordion defaultValue="a">{items('c')}</Accordion>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (non-collapsible, locked open item)', async () => {
      const { container } = render(
        <Accordion defaultValue="b" collapsible={false} headingLevel={2}>
          {items()}
        </Accordion>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
