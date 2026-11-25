import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Accordion, AccordionItem } from '../Accordion/Accordion';
import { Tab, TabList, TabPanel, Tabs, type TabsProps } from './Tabs';

type ExampleProps = Omit<TabsProps, 'children'> & {
  /** Value of a tab to render disabled. */
  disabled?: string;
  /** Values of the tabs (and panels) to render. */
  values?: readonly string[];
};

const LABELS: Record<string, string> = { one: 'One', two: 'Two', three: 'Three' };

function Example({ disabled, values = ['one', 'two', 'three'], ...rest }: ExampleProps) {
  return (
    <Tabs {...rest}>
      <TabList aria-label="Report">
        {values.map((v) => (
          <Tab key={v} value={v} disabled={disabled === v}>
            {LABELS[v] ?? v}
          </Tab>
        ))}
      </TabList>
      {values.map((v) => (
        <TabPanel key={v} value={v}>
          Panel {v}
        </TabPanel>
      ))}
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });
// Hidden panels: the accessible name of a `hidden` element is not computed by Testing Library,
// so reach a panel through its tab's aria-controls (the wiring itself is asserted separately).
const panel = (name: string) => {
  const el = document.getElementById(tab(name).getAttribute('aria-controls') ?? '');
  if (!el) throw new Error(`No panel for tab ${name}`);
  return el;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Tabs', () => {
  describe('rendering and wiring', () => {
    it('renders a tablist with tabs and one visible tabpanel', () => {
      render(<Example />);
      expect(screen.getByRole('tablist', { name: 'Report' })).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
      expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(3);
    });

    it('links every tab to its panel with aria-controls and aria-labelledby', () => {
      render(<Example />);
      expect(screen.getByRole('tabpanel', { name: 'One' })).toBe(panel('One'));
      const panels = screen.getAllByRole('tabpanel', { hidden: true });
      for (const [i, name] of ['One', 'Two', 'Three'].entries()) {
        const t = tab(name);
        const p = panels[i];
        if (!p) throw new Error(`Missing panel ${name}`);
        expect(t.id).not.toBe('');
        expect(p.id).not.toBe('');
        expect(t).toHaveAttribute('aria-controls', p.id);
        expect(p).toHaveAttribute('aria-labelledby', t.id);
      }
    });

    it('renders tabs as type="button" buttons', () => {
      render(<Example />);
      expect(tab('One').tagName).toBe('BUTTON');
      expect(tab('One')).toHaveAttribute('type', 'button');
    });

    it('sets aria-orientation and data-orientation', () => {
      const { container, rerender } = render(<Example />);
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
      expect(container.firstElementChild).toHaveAttribute('data-orientation', 'horizontal');
      rerender(<Example orientation="vertical" />);
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
      expect(container.firstElementChild).toHaveAttribute('data-orientation', 'vertical');
    });

    it('makes valid, resolvable ids from values with spaces and special characters', () => {
      render(
        <Tabs>
          <TabList aria-label="Report">
            <Tab value="a b">A</Tab>
            <Tab value="x_y:z">X</Tab>
          </TabList>
          <TabPanel value="a b">Panel A</TabPanel>
          <TabPanel value="x_y:z">Panel X</TabPanel>
        </Tabs>,
      );
      for (const name of ['A', 'X']) {
        const t = tab(name);
        expect(t.id).not.toMatch(/\s/);
        const controls = t.getAttribute('aria-controls') ?? '';
        expect(controls).not.toMatch(/\s/);
        expect(document.getElementById(controls)).toBe(panel(name));
      }
      expect(tab('A').id).not.toBe(tab('X').id);
    });

    it('gives two Tabs instances distinct ids', () => {
      render(
        <>
          <Example />
          <Example />
        </>,
      );
      const ones = screen.getAllByRole('tab', { name: 'One' });
      expect(ones[0]?.id).not.toBe(ones[1]?.id);
    });

    it.each([
      ['Tab', () => <Tab value="x">X</Tab>],
      [
        'TabList',
        () => (
          <TabList aria-label="x">
            <span />
          </TabList>
        ),
      ],
      ['TabPanel', () => <TabPanel value="x">X</TabPanel>],
    ])('throws when %s is rendered outside Tabs', (part, Part) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(<Part />)).toThrow(
        new RegExp(`<${part}> must be rendered inside <Tabs>`),
      );
    });
  });

  describe('props', () => {
    it('forwards refs to the root, tablist, tab and panel', () => {
      const rootRef = createRef<HTMLDivElement>();
      const listRef = createRef<HTMLDivElement>();
      const tabRef = createRef<HTMLButtonElement>();
      const panelRef = createRef<HTMLDivElement>();
      const { container } = render(
        <Tabs ref={rootRef}>
          <TabList ref={listRef} aria-label="Report">
            <Tab ref={tabRef} value="one">
              One
            </Tab>
          </TabList>
          <TabPanel ref={panelRef} value="one">
            Panel
          </TabPanel>
        </Tabs>,
      );
      expect(rootRef.current).toBe(container.firstElementChild);
      expect(listRef.current).toBe(screen.getByRole('tablist'));
      expect(tabRef.current).toBe(screen.getByRole('tab'));
      expect(panelRef.current).toBe(screen.getByRole('tabpanel'));
    });

    it('merges className on every part', () => {
      const { container } = render(
        <Tabs className="c-root">
          <TabList className="c-list" aria-label="Report">
            <Tab className="c-tab" value="one">
              One
            </Tab>
          </TabList>
          <TabPanel className="c-panel" value="one">
            Panel
          </TabPanel>
        </Tabs>,
      );
      const root = container.firstElementChild;
      expect(root).toHaveClass('c-root');
      expect(root?.classList.length).toBeGreaterThan(1);
      const list = screen.getByRole('tablist');
      expect(list).toHaveClass('c-list');
      expect(list.classList.length).toBeGreaterThan(1);
      const t = screen.getByRole('tab');
      expect(t).toHaveClass('c-tab');
      expect(t.classList.length).toBeGreaterThan(1);
      const p = screen.getByRole('tabpanel');
      expect(p).toHaveClass('c-panel');
      expect(p.classList.length).toBeGreaterThan(1);
    });

    it('passes native props through on every part', () => {
      const { container } = render(
        <Tabs id="root" data-x="root">
          <TabList data-x="list" aria-label="Report">
            <Tab value="one" data-x="tab" title="First tab">
              One
            </Tab>
          </TabList>
          <TabPanel value="one" data-x="panel" aria-describedby="root">
            Panel
          </TabPanel>
        </Tabs>,
      );
      expect(container.firstElementChild).toHaveAttribute('id', 'root');
      expect(container.firstElementChild).toHaveAttribute('data-x', 'root');
      expect(screen.getByRole('tablist')).toHaveAttribute('data-x', 'list');
      expect(screen.getByRole('tab')).toHaveAttribute('data-x', 'tab');
      expect(screen.getByRole('tab')).toHaveAttribute('title', 'First tab');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('data-x', 'panel');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-describedby', 'root');
    });

    it('keeps the managed id on a Tab (id is not a Tab prop)', () => {
      render(
        <Tabs>
          <TabList aria-label="Report">
            {/* @ts-expect-error id is managed by Tab and omitted from TabProps */}
            <Tab value="one" id="mine">
              One
            </Tab>
          </TabList>
          <TabPanel value="one">Panel</TabPanel>
        </Tabs>,
      );
      const t = screen.getByRole('tab');
      expect(t.id).not.toBe('mine');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', t.id);
    });
  });

  describe('selection and roving tabindex', () => {
    it('selects the first tab by default without calling onValueChange', () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Two')).toHaveAttribute('aria-selected', 'false');
      expect(tab('Three')).toHaveAttribute('aria-selected', 'false');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('selects the first enabled tab by default when the first is disabled', () => {
      const onValueChange = vi.fn();
      render(<Example disabled="one" onValueChange={onValueChange} />);
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      expect(panel('Two')).toBeVisible();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('honours defaultValue', () => {
      render(<Example defaultValue="three" />);
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
      expect(panel('Three')).not.toHaveAttribute('hidden');
      expect(panel('One')).toHaveAttribute('hidden');
    });

    it('shows only the selected panel; the others stay mounted with hidden', () => {
      render(<Example defaultValue="two" />);
      expect(panel('Two')).not.toHaveAttribute('hidden');
      expect(panel('Two')).toBeVisible();
      expect(panel('One')).toHaveAttribute('hidden');
      expect(panel('Three')).toHaveAttribute('hidden');
      expect(screen.getByText('Panel one')).not.toBeVisible();
      expect(screen.getByRole('tabpanel')).toBe(panel('Two'));
    });

    it('keeps hidden panel state while switching', async () => {
      const user = userEvent.setup();
      function Counter() {
        const [n, setN] = useState(0);
        return (
          <button
            type="button"
            onClick={() => {
              setN(n + 1);
            }}
          >
            Count {n}
          </button>
        );
      }
      render(
        <Tabs>
          <TabList aria-label="Report">
            <Tab value="one">One</Tab>
            <Tab value="two">Two</Tab>
          </TabList>
          <TabPanel value="one">
            <Counter />
          </TabPanel>
          <TabPanel value="two">Two content</TabPanel>
        </Tabs>,
      );
      await user.click(screen.getByRole('button', { name: 'Count 0' }));
      await user.click(tab('Two'));
      await user.click(tab('One'));
      expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
    });

    it('gives only the selected tab tabindex=0 (one tab stop)', async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="two" />);
      expect(tab('One')).toHaveAttribute('tabindex', '-1');
      expect(tab('Two')).toHaveAttribute('tabindex', '0');
      expect(tab('Three')).toHaveAttribute('tabindex', '-1');
      await user.click(tab('Three'));
      expect(tab('Two')).toHaveAttribute('tabindex', '-1');
      expect(tab('Three')).toHaveAttribute('tabindex', '0');
      expect(screen.getAllByRole('tab').filter((t) => t.tabIndex === 0)).toHaveLength(1);
    });

    it('selects a tab on click and calls onValueChange with its value only', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      await user.click(tab('Two'));
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith('two');
      expect(onValueChange.mock.calls[0]).toHaveLength(1);
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      expect(panel('Two')).toBeVisible();
    });

    it('does not call onValueChange when clicking the already selected tab', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example defaultValue="two" onValueChange={onValueChange} />);
      await user.click(tab('Two'));
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not call onValueChange when clicking the implicitly selected default tab', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      await user.click(tab('One'));
      expect(onValueChange).not.toHaveBeenCalled();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
    });

    it('does not call onValueChange when arrowing onto the already selected tab', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tabs onValueChange={onValueChange}>
          <TabList aria-label="Report">
            <Tab value="one">One</Tab>
            <Tab value="two" disabled>
              Two
            </Tab>
          </TabList>
          <TabPanel value="one">Panel one</TabPanel>
          <TabPanel value="two">Panel two</TabPanel>
        </Tabs>,
      );
      await user.tab();
      // The only enabled tab: every key lands back on the selected tab.
      await user.keyboard('{ArrowRight}{ArrowLeft}{Home}{End}');
      expect(tab('One')).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not call onValueChange for Enter on the selected tab in manual mode', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example activation="manual" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowRight}{ArrowLeft}{Enter}');
      expect(tab('One')).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('lets a consumer onClick veto selection with preventDefault', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const onClick = vi.fn((event: { preventDefault: () => void }) => {
        event.preventDefault();
      });
      render(
        <Tabs onValueChange={onValueChange}>
          <TabList aria-label="Report">
            <Tab value="one">One</Tab>
            <Tab value="two" onClick={onClick}>
              Two
            </Tab>
          </TabList>
          <TabPanel value="one">Panel one</TabPanel>
          <TabPanel value="two">Panel two</TabPanel>
        </Tabs>,
      );
      await user.click(tab('Two'));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
    });

    it('calls a consumer onClick before selecting', async () => {
      const user = userEvent.setup();
      const order: string[] = [];
      render(
        <Tabs
          onValueChange={() => {
            order.push('select');
          }}
        >
          <TabList aria-label="Report">
            <Tab value="one">One</Tab>
            <Tab
              value="two"
              onClick={() => {
                order.push('click');
              }}
            >
              Two
            </Tab>
          </TabList>
          <TabPanel value="one">Panel one</TabPanel>
          <TabPanel value="two">Panel two</TabPanel>
        </Tabs>,
      );
      await user.click(tab('Two'));
      expect(order).toEqual(['click', 'select']);
    });
  });

  describe('controlled', () => {
    it('respects a controlled value and only reports changes', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(<Example value="one" onValueChange={onValueChange} />);
      expect(onValueChange).not.toHaveBeenCalled();
      await user.click(tab('Three'));
      expect(onValueChange).toHaveBeenCalledWith('three');
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      expect(panel('One')).toBeVisible();
      rerender(<Example value="three" onValueChange={onValueChange} />);
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Three')).toHaveAttribute('tabindex', '0');
      expect(panel('Three')).toBeVisible();
      expect(panel('One')).toHaveAttribute('hidden');
    });

    it('works with state lifted into a parent', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('two');
        return (
          <>
            <output>{value}</output>
            <Example value={value} onValueChange={setValue} />
          </>
        );
      }
      render(<Controlled />);
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      await user.click(tab('Three'));
      expect(screen.getByRole('status')).toHaveTextContent('three');
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
    });

    it('selects with arrow keys in controlled mode through onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example value="one" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Two')).toHaveFocus();
      expect(onValueChange).toHaveBeenCalledWith('two');
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
    });

    it('does not move focus when the controlled value changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example value="one" />);
      await user.tab();
      expect(tab('One')).toHaveFocus();
      rerender(<Example value="three" />);
      expect(tab('One')).toHaveFocus();
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('keyboard: automatic activation', () => {
    it('Tab moves onto the selected tab', async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="three" />);
      await user.tab();
      expect(tab('Three')).toHaveFocus();
    });

    it('ArrowRight focuses and selects the next tab, wrapping from the last', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      expect(panel('Two')).toBeVisible();
      expect(onValueChange).toHaveBeenLastCalledWith('two');
      await user.keyboard('{ArrowRight}');
      expect(tab('Three')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(tab('One')).toHaveFocus();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange).toHaveBeenLastCalledWith('one');
    });

    it('ArrowLeft focuses and selects the previous tab, wrapping from the first', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{ArrowLeft}');
      expect(tab('Three')).toHaveFocus();
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowLeft}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
    });

    it('Home and End go to the first and last tab and select them', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example defaultValue="two" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{End}');
      expect(tab('Three')).toHaveFocus();
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange).toHaveBeenLastCalledWith('three');
      await user.keyboard('{Home}');
      expect(tab('One')).toHaveFocus();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange).toHaveBeenLastCalledWith('one');
    });

    it('ArrowUp and ArrowDown do nothing in horizontal mode', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowDown}{ArrowUp}');
      expect(tab('One')).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Enter and Space on the selected tab are no-ops', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(tab('One')).toHaveFocus();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('ignores arrows with a modifier key', async () => {
      const user = userEvent.setup();
      render(<Example />);
      await user.tab();
      await user.keyboard('{Control>}{ArrowRight}{/Control}');
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      await user.keyboard('{Meta>}{ArrowRight}{/Meta}');
      expect(tab('One')).toHaveFocus();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
    });

    it('lets a consumer onKeyDown on the TabList veto navigation', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn((event: { preventDefault: () => void }) => {
        event.preventDefault();
      });
      render(
        <Tabs>
          <TabList aria-label="Report" onKeyDown={onKeyDown}>
            <Tab value="one">One</Tab>
            <Tab value="two">Two</Tab>
          </TabList>
          <TabPanel value="one">Panel one</TabPanel>
          <TabPanel value="two">Panel two</TabPanel>
        </Tabs>,
      );
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(onKeyDown).toHaveBeenCalled();
      expect(tab('One')).toHaveFocus();
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('keyboard: manual activation', () => {
    it('ArrowRight/ArrowLeft move focus without selecting, with wrap', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example activation="manual" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'false');
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      expect(panel('One')).toBeVisible();
      await user.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(tab('Three')).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Home and End move focus without selecting', async () => {
      const user = userEvent.setup();
      render(<Example activation="manual" defaultValue="two" />);
      await user.tab();
      await user.keyboard('{End}');
      expect(tab('Three')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{Home}');
      expect(tab('One')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter selects the focused tab', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example activation="manual" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowRight}{Enter}');
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Two')).toHaveFocus();
      expect(panel('Two')).toBeVisible();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith('two');
    });

    it('Space selects the focused tab', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example activation="manual" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{End}');
      await user.keyboard(' ');
      expect(tab('Three')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange).toHaveBeenCalledWith('three');
    });

    it('moves the tab stop with focus, and back to the selected tab when focus leaves', async () => {
      const user = userEvent.setup();
      render(<Example activation="manual" />);
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('tabindex', '0');
      expect(tab('One')).toHaveAttribute('tabindex', '-1');
      expect(tab('Three')).toHaveAttribute('tabindex', '-1');
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      await user.tab();
      expect(panel('One')).toHaveFocus();
      expect(tab('One')).toHaveAttribute('tabindex', '0');
      expect(tab('Two')).toHaveAttribute('tabindex', '-1');
      expect(tab('Three')).toHaveAttribute('tabindex', '-1');
      await user.tab({ shift: true });
      expect(tab('One')).toHaveFocus();
    });
  });

  describe('keyboard: RTL', () => {
    it('reverses ArrowLeft and ArrowRight under a dir="rtl" ancestor', async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Example />
        </div>,
      );
      await user.tab();
      await user.keyboard('{ArrowLeft}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{ArrowRight}');
      expect(tab('One')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(tab('Three')).toHaveFocus();
    });

    it('keeps Home and End unchanged in RTL', async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Example defaultValue="two" />
        </div>,
      );
      await user.tab();
      await user.keyboard('{Home}');
      expect(tab('One')).toHaveFocus();
      await user.keyboard('{End}');
      expect(tab('Three')).toHaveFocus();
    });
  });

  describe('keyboard: vertical', () => {
    it('ArrowDown/ArrowUp move and select, with wrap', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example orientation="vertical" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange).toHaveBeenLastCalledWith('two');
      await user.keyboard('{ArrowUp}{ArrowUp}');
      expect(tab('Three')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(tab('One')).toHaveFocus();
    });

    it('ArrowLeft/ArrowRight do nothing', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example orientation="vertical" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('{ArrowRight}{ArrowLeft}');
      expect(tab('One')).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Home/End work vertically', async () => {
      const user = userEvent.setup();
      render(<Example orientation="vertical" />);
      await user.tab();
      await user.keyboard('{End}');
      expect(tab('Three')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(tab('One')).toHaveFocus();
    });

    it('manual vertical moves focus without selecting', async () => {
      const user = userEvent.setup();
      render(<Example orientation="vertical" activation="manual" />);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(tab('Two')).toHaveFocus();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'false');
      await user.keyboard('{Enter}');
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('disabled tabs', () => {
    it('are natively disabled', () => {
      render(<Example disabled="two" />);
      expect(tab('Two')).toBeDisabled();
      expect(tab('Two')).toHaveAttribute('tabindex', '-1');
    });

    it('are skipped by arrows, Home and End', async () => {
      const user = userEvent.setup();
      render(<Example disabled="three" defaultValue="two" />);
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(tab('One')).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(tab('Two')).toHaveFocus();
      await user.keyboard('{End}');
      expect(tab('Two')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(tab('One')).toHaveFocus();
    });

    it('skips a disabled first tab on Home', async () => {
      const user = userEvent.setup();
      render(<Example disabled="one" />);
      await user.tab();
      expect(tab('Two')).toHaveFocus();
      await user.keyboard('{End}{Home}');
      expect(tab('Two')).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(tab('Three')).toHaveFocus();
    });

    it('are not clickable and do not call onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example disabled="two" onValueChange={onValueChange} />);
      await user.click(tab('Two'));
      expect(onValueChange).not.toHaveBeenCalled();
      expect(tab('Two')).toHaveAttribute('aria-selected', 'false');
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
    });

    it('moves the tab stop to the first enabled tab when the selected tab is disabled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example defaultValue="two" />);
      expect(tab('Two')).toHaveAttribute('tabindex', '0');
      rerender(<Example defaultValue="two" disabled="two" />);
      expect(tab('Two')).toHaveAttribute('tabindex', '-1');
      expect(tab('One')).toHaveAttribute('tabindex', '0');
      await user.tab();
      expect(tab('One')).toHaveFocus();
    });

    it('moves the tab stop to the first enabled tab when the selected tab is removed', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example defaultValue="three" />);
      expect(tab('Three')).toHaveAttribute('tabindex', '0');
      rerender(<Example defaultValue="three" values={['one', 'two']} />);
      expect(screen.queryByRole('tab', { name: 'Three' })).not.toBeInTheDocument();
      expect(tab('One')).toHaveAttribute('tabindex', '0');
      expect(tab('Two')).toHaveAttribute('tabindex', '-1');
      await user.tab();
      expect(tab('One')).toHaveFocus();
    });

    it('moves focus to the new tab stop when the focused tab becomes disabled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example defaultValue="two" />);
      await user.tab();
      expect(tab('Two')).toHaveFocus();
      rerender(<Example defaultValue="two" disabled="two" />);
      expect(tab('One')).toHaveAttribute('tabindex', '0');
      expect(tab('One')).toHaveFocus();
    });

    it('moves focus to the new tab stop when the focused tab is unmounted', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example defaultValue="three" />);
      await user.tab();
      expect(tab('Three')).toHaveFocus();
      rerender(<Example defaultValue="three" values={['one', 'two']} />);
      expect(tab('One')).toHaveAttribute('tabindex', '0');
      expect(tab('One')).toHaveFocus();
    });

    it('does not steal focus when an unfocused tab is disabled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <>
          <Example defaultValue="two" />
          <button type="button">Elsewhere</button>
        </>,
      );
      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      rerender(
        <>
          <Example defaultValue="two" disabled="two" />
          <button type="button">Elsewhere</button>
        </>,
      );
      expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    });

    it('moves the default selection when the implicitly selected first tab is removed', () => {
      const { rerender } = render(<Example />);
      expect(tab('One')).toHaveAttribute('aria-selected', 'true');
      rerender(<Example values={['two', 'three']} />);
      expect(tab('Two')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Two')).toHaveAttribute('tabindex', '0');
      expect(panel('Two')).toBeVisible();
    });
  });

  describe('overflow', () => {
    // The hook checks once on mount; the observer callbacks are not needed here.
    class ResizeObserverStub {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('has no data-overflowing without ResizeObserver', () => {
      render(<Example />);
      expect(screen.getByRole('tablist')).not.toHaveAttribute('data-overflowing');
    });

    it('sets data-overflowing when the tabs are wider than the list', () => {
      vi.stubGlobal('ResizeObserver', ResizeObserverStub);
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.getAttribute('role') === 'tablist' ? 500 : 0;
      });
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.getAttribute('role') === 'tablist' ? 200 : 0;
      });
      render(<Example />);
      expect(screen.getByRole('tablist')).toHaveAttribute('data-overflowing');
    });

    it('has no data-overflowing when the tabs fit', () => {
      vi.stubGlobal('ResizeObserver', ResizeObserverStub);
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200);
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
      render(<Example />);
      expect(screen.getByRole('tablist')).not.toHaveAttribute('data-overflowing');
    });
  });

  describe('focus into the panel', () => {
    it('Tab moves from the selected tab to the panel (tabIndex 0)', async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="two" />);
      expect(panel('Two')).toHaveAttribute('tabindex', '0');
      await user.tab();
      expect(tab('Two')).toHaveFocus();
      await user.tab();
      expect(panel('Two')).toHaveFocus();
      await user.tab({ shift: true });
      expect(tab('Two')).toHaveFocus();
    });

    it('skips the panel when the consumer passes tabIndex={-1}', async () => {
      const user = userEvent.setup();
      render(
        <Tabs>
          <TabList aria-label="Report">
            <Tab value="one">One</Tab>
            <Tab value="two">Two</Tab>
          </TabList>
          <TabPanel value="one" tabIndex={-1}>
            <button type="button">Inside</button>
          </TabPanel>
          <TabPanel value="two">Panel two</TabPanel>
        </Tabs>,
      );
      expect(panel('One')).toHaveAttribute('tabindex', '-1');
      await user.tab();
      expect(tab('One')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
    });

    it('does not tab into hidden panels', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Example defaultValue="one" />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(panel('One')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });
  });

  describe('nesting', () => {
    it('keeps nested Tabs independent', async () => {
      const user = userEvent.setup();
      render(
        <Tabs>
          <TabList aria-label="Outer">
            <Tab value="a">Outer A</Tab>
            <Tab value="b">Outer B</Tab>
          </TabList>
          <TabPanel value="a" tabIndex={-1}>
            <Tabs>
              <TabList aria-label="Inner">
                <Tab value="x">Inner X</Tab>
                <Tab value="y">Inner Y</Tab>
              </TabList>
              <TabPanel value="x">X</TabPanel>
              <TabPanel value="y">Y</TabPanel>
            </Tabs>
          </TabPanel>
          <TabPanel value="b">B</TabPanel>
        </Tabs>,
      );
      await user.tab();
      await user.tab();
      expect(tab('Inner X')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(tab('Inner Y')).toHaveFocus();
      expect(tab('Inner Y')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Outer A')).toHaveAttribute('aria-selected', 'true');
      await user.keyboard('{End}{Home}{ArrowLeft}');
      expect(tab('Inner Y')).toHaveFocus();
      expect(tab('Outer A')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Outer A')).toHaveAttribute('tabindex', '0');
      expect(tab('Outer B')).toHaveAttribute('aria-selected', 'false');
      expect(tab('Outer B')).toHaveAttribute('tabindex', '-1');
      expect(panel('Outer A')).not.toHaveAttribute('hidden');
    });

    it('does not let an enclosing Accordion steal arrow keys from tabs', async () => {
      const user = userEvent.setup();
      render(
        <Accordion defaultValue="s">
          <AccordionItem value="s" title="Section">
            <Example />
          </AccordionItem>
          <AccordionItem value="t" title="Other">
            Other
          </AccordionItem>
        </Accordion>,
      );
      await user.tab();
      await user.tab();
      expect(tab('One')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(tab('One')).toHaveFocus();
      await user.keyboard('{End}');
      expect(tab('Three')).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations (horizontal)', async () => {
      const { container } = render(<Example />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (vertical)', async () => {
      const { container } = render(<Example orientation="vertical" defaultValue="two" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (with a disabled tab)', async () => {
      const { container } = render(<Example disabled="two" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations (manual, after keyboard selection)', async () => {
      const user = userEvent.setup();
      const { container } = render(<Example activation="manual" />);
      await user.tab();
      await user.keyboard('{ArrowRight}{Enter}');
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
