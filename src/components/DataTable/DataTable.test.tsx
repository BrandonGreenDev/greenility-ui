import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { SortState } from '../../utils/types';
import { axe } from '../../test/axe';
import { DataTable, type CellValue, type DataTableColumn, type DataTableProps } from './DataTable';

interface Person {
  id: string;
  name: string;
  age: number;
  joined: Date | null;
}

const people: Person[] = Array.from({ length: 42 }, (_, i) => ({
  id: `id-${String(i + 1)}`,
  name: `Person ${String(i + 1)}`,
  age: 20 + ((i * 7) % 40),
  joined: i % 5 === 0 ? null : new Date(2020, i % 12, 1 + (i % 28)),
}));

const noPeople: Person[] = [];

const columns: DataTableColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true, rowHeader: true },
  { id: 'age', header: 'Age', accessor: 'age', sortable: true, align: 'end' },
  { id: 'joined', header: 'Joined', accessor: 'joined', sortable: true },
];

/** Small fixture with known orderings for the default comparator. */
const small: Person[] = [
  { id: 'a', name: 'Item 10', age: 10, joined: new Date(2021, 0, 1) },
  { id: 'b', name: 'Item 9', age: 9, joined: null },
  { id: 'c', name: 'item 2', age: 100, joined: new Date(2019, 5, 1) },
  { id: 'd', name: 'Item 1', age: 2, joined: new Date(2020, 2, 1) },
];

const getRowId = (row: Person) => row.id;

function bodyRows() {
  const [, body] = screen.getAllByRole('rowgroup');
  if (!body) throw new Error('no tbody');
  return within(body).getAllByRole('row');
}

function bodyRow(index: number) {
  const row = bodyRows()[index];
  if (!row) throw new Error(`no row ${String(index)}`);
  return row;
}

function firstCells() {
  return bodyRows().map((row) => row.firstElementChild?.textContent);
}

function rangeText(text: string) {
  return screen.getByText(text, { selector: 'p' });
}

function status() {
  return screen.getByRole('status');
}

/** Fake timers that still advance in real time, plus a matching user-event instance. */
function setupFakeTimers() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
}

/** Run past the announcement delay (150ms). */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
}

/** Records every text the status region shows. */
function recordStatus() {
  const element = status();
  const texts: string[] = [];
  const observer = new MutationObserver(() => {
    const text = element.textContent;
    if (texts.at(-1) !== text) texts.push(text);
  });
  observer.observe(element, { childList: true, characterData: true, subtree: true });
  return {
    texts,
    stop: () => {
      observer.disconnect();
    },
  };
}

let roCallbacks: (() => void)[] = [];

function stubResizeObserver() {
  roCallbacks = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        roCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
}

function setPrototypeSizes(sizes: Record<string, number>) {
  for (const [name, value] of Object.entries(sizes)) {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value });
  }
}

function fireResize() {
  act(() => {
    for (const callback of roCallbacks) callback();
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const name of ['scrollWidth', 'clientWidth']) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

describe('DataTable structure', () => {
  it('names the table by its caption and renders column and row headers', () => {
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Name', 'Age', 'Joined']);
    for (const header of headers) expect(header).toHaveAttribute('scope', 'col');
    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders).toHaveLength(10);
    expect(rowHeaders[0]).toHaveAttribute('scope', 'row');
    expect(rowHeaders[0]).toHaveTextContent('Person 1');
  });

  it('renders plain cells when no column is a row header', () => {
    const plain = columns.map((c) => ({ ...c, rowHeader: false }));
    render(<DataTable caption="People" rows={people} columns={plain} getRowId={getRowId} />);
    expect(screen.queryAllByRole('rowheader')).toHaveLength(0);
    expect(within(bodyRow(0)).getAllByRole('cell')).toHaveLength(3);
  });

  it('keeps the name with captionHidden', () => {
    render(
      <DataTable
        caption="People"
        captionHidden
        rows={people}
        columns={columns}
        getRowId={getRowId}
      />,
    );
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument();
  });

  it('formats default cell values: dates via toLocaleDateString, null as empty, numbers as text', () => {
    render(<DataTable caption="People" rows={small} columns={columns} getRowId={getRowId} />);
    const cells = bodyRow(0).querySelectorAll('th, td');
    expect(cells[1]).toHaveTextContent('10');
    expect(cells[2]).toHaveTextContent(new Date(2021, 0, 1).toLocaleDateString());
    expect(bodyRow(1).querySelectorAll('th, td')[2]?.textContent).toBe('');
  });

  it('uses the cell render and the accessor function for display', () => {
    const custom: DataTableColumn<Person>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: 'name',
        cell: (row) => <strong>{row.name}!</strong>,
      },
      { id: 'adult', header: 'Adult', accessor: (row) => row.age >= 18 },
    ];
    render(<DataTable caption="People" rows={small} columns={custom} getRowId={getRowId} />);
    expect(screen.getByText('Item 10!').tagName).toBe('STRONG');
    expect(within(bodyRow(3)).getByRole('cell', { name: 'false' })).toBeInTheDocument();
    expect(within(bodyRow(2)).getByRole('cell', { name: 'true' })).toBeInTheDocument();
  });

  it('sets data-align on header and cells', () => {
    render(<DataTable caption="People" rows={small} columns={columns} getRowId={getRowId} />);
    expect(screen.getByRole('columnheader', { name: 'Age' })).toHaveAttribute('data-align', 'end');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'data-align',
      'start',
    );
    expect(screen.getByRole('cell', { name: '100' })).toHaveAttribute('data-align', 'end');
  });

  it('sends className and style to the root, the ref and native props to the table', () => {
    const ref = createRef<HTMLTableElement>();
    const { container } = render(
      <DataTable
        ref={ref}
        className="custom"
        style={{ maxWidth: '10px' }}
        aria-describedby="help"
        data-testid="tbl"
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
      />,
    );
    const root = container.firstElementChild;
    expect(root).toHaveClass('custom');
    expect(root).toHaveStyle({ maxWidth: '10px' });
    const table = screen.getByRole('table');
    expect(ref.current).toBe(table);
    expect(table).toHaveAttribute('aria-describedby', 'help');
    expect(table).toHaveAttribute('data-testid', 'tbl');
    expect(table).not.toHaveClass('custom');
    expect(table.getAttribute('style')).toBeNull();
  });

  it('has a displayName', () => {
    expect(DataTable.displayName).toBe('DataTable');
  });

  it('always mounts an empty status region', () => {
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    expect(status().textContent).toBe('');
  });

  it('has no axe violations by default', async () => {
    const { container } = render(
      <DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('DataTable sorting', () => {
  it('renders sort buttons only for sortable headers', () => {
    const mixed: DataTableColumn<Person>[] = [
      { id: 'name', header: 'Name', accessor: 'name', sortable: true },
      { id: 'age', header: 'Age', accessor: 'age' },
    ];
    render(<DataTable caption="People" rows={small} columns={mixed} getRowId={getRowId} />);
    expect(screen.getByRole('button', { name: 'Name' })).toHaveAttribute('type', 'button');
    expect(screen.queryByRole('button', { name: 'Age' })).not.toBeInTheDocument();
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).not.toHaveAttribute('aria-sort');
    }
  });

  it('sorts on header click, sets aria-sort on that th only and announces it', async () => {
    const user = setupFakeTimers();
    render(<DataTable caption="People" rows={small} columns={columns} getRowId={getRowId} />);
    const button = screen.getByRole('button', { name: 'Age' });
    await user.click(button);
    const header = screen.getByRole('columnheader', { name: 'Age' });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: 'Joined' })).not.toHaveAttribute('aria-sort');
    expect(firstCells()).toEqual(['Item 1', 'Item 9', 'Item 10', 'item 2']);
    await flush();
    expect(status()).toHaveTextContent('Sorted by Age, ascending');
    expect(button).toHaveFocus();
  });

  it('cycles ascending and descending, and a new column starts ascending', async () => {
    const user = setupFakeTimers();
    const onSortChange = vi.fn();
    render(
      <DataTable
        caption="People"
        rows={small}
        columns={columns}
        getRowId={getRowId}
        onSortChange={onSortChange}
      />,
    );
    const age = screen.getByRole('columnheader', { name: 'Age' });
    await user.click(screen.getByRole('button', { name: 'Age' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'age', direction: 'ascending' });
    await user.click(screen.getByRole('button', { name: 'Age' }));
    expect(age).toHaveAttribute('aria-sort', 'descending');
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'age', direction: 'descending' });
    expect(firstCells()).toEqual(['item 2', 'Item 10', 'Item 9', 'Item 1']);
    await flush();
    expect(status()).toHaveTextContent('Sorted by Age, descending');
    await user.click(screen.getByRole('button', { name: 'Age' }));
    expect(age).toHaveAttribute('aria-sort', 'ascending');
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'ascending' });
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(age).not.toHaveAttribute('aria-sort');
    expect(onSortChange).toHaveBeenCalledTimes(4);
    await flush();
    expect(status()).toHaveTextContent('Sorted by Name, ascending');
  });

  it('applies defaultSort', () => {
    render(
      <DataTable
        caption="People"
        rows={small}
        columns={columns}
        getRowId={getRowId}
        defaultSort={{ columnId: 'age', direction: 'descending' }}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Age' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(firstCells()).toEqual(['item 2', 'Item 10', 'Item 9', 'Item 1']);
  });

  it('sorts strings with numeric, case-insensitive collation', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" rows={small} columns={columns} getRowId={getRowId} />);
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(firstCells()).toEqual(['Item 1', 'item 2', 'Item 9', 'Item 10']);
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(firstCells()).toEqual(['Item 10', 'Item 9', 'item 2', 'Item 1']);
  });

  it('sorts numbers numerically (10 after 9)', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        paginated={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Name' }));
    const names = firstCells();
    expect(names.indexOf('Person 10')).toBe(names.indexOf('Person 9') + 1);
    expect(names.slice(0, 3)).toEqual(['Person 1', 'Person 2', 'Person 3']);
  });

  it('sorts dates chronologically with nulls last in both directions', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" rows={small} columns={columns} getRowId={getRowId} />);
    const joined = screen.getByRole('button', { name: 'Joined' });
    await user.click(joined);
    expect(firstCells()).toEqual(['item 2', 'Item 1', 'Item 10', 'Item 9']);
    await user.click(joined);
    expect(firstCells()).toEqual(['Item 10', 'Item 1', 'item 2', 'Item 9']);
  });

  it('keeps nulls last both ways on a large data set', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        paginated={false}
      />,
    );
    const joined = screen.getByRole('button', { name: 'Joined' });
    for (let i = 0; i < 2; i++) {
      await user.click(joined);
      const last = bodyRows().map((row) => row.lastElementChild?.textContent);
      const firstEmpty = last.indexOf('');
      expect(firstEmpty).toBe(42 - 9);
      expect(last.slice(firstEmpty).every((text) => text === '')).toBe(true);
    }
  });

  it('sorts booleans false before true and bigints numerically', async () => {
    const user = userEvent.setup();
    const typed: DataTableColumn<Person>[] = [
      { id: 'name', header: 'Name', accessor: 'name', rowHeader: true },
      { id: 'big', header: 'Big', accessor: (row) => BigInt(row.age) * 10n, sortable: true },
      { id: 'flag', header: 'Flag', accessor: (row) => row.age > 9, sortable: true },
    ];
    render(<DataTable caption="People" rows={small} columns={typed} getRowId={getRowId} />);
    await user.click(screen.getByRole('button', { name: 'Big' }));
    expect(firstCells()).toEqual(['Item 1', 'Item 9', 'Item 10', 'item 2']);
    await user.click(screen.getByRole('button', { name: 'Flag' }));
    expect(firstCells().slice(0, 2)).toEqual(['Item 9', 'Item 1']);
    expect(firstCells().slice(2)).toEqual(['Item 10', 'item 2']);
  });

  it('uses a custom compare, negated for descending', async () => {
    const user = userEvent.setup();
    const compare = vi.fn((a: Person, b: Person) => a.id.localeCompare(b.id));
    const custom: DataTableColumn<Person>[] = [
      { id: 'name', header: 'Name', accessor: 'name', rowHeader: true },
      {
        id: 'custom',
        header: 'Custom',
        sortable: true,
        compare,
        cell: (row) => <span>{row.id}</span>,
      },
    ];
    render(<DataTable caption="People" rows={small} columns={custom} getRowId={getRowId} />);
    await user.click(screen.getByRole('button', { name: 'Custom' }));
    expect(compare).toHaveBeenCalled();
    expect(firstCells()).toEqual(['Item 10', 'Item 9', 'item 2', 'Item 1']);
    await user.click(screen.getByRole('button', { name: 'Custom' }));
    expect(firstCells()).toEqual(['Item 1', 'item 2', 'Item 9', 'Item 10']);
  });

  it('is stable: ties keep their original order in both directions', async () => {
    const user = userEvent.setup();
    const tie: DataTableColumn<Person>[] = [
      { id: 'name', header: 'Name', accessor: 'name', rowHeader: true },
      { id: 'same', header: 'Same', accessor: () => 1, sortable: true },
    ];
    render(<DataTable caption="People" rows={small} columns={tie} getRowId={getRowId} />);
    const original = ['Item 10', 'Item 9', 'item 2', 'Item 1'];
    await user.click(screen.getByRole('button', { name: 'Same' }));
    expect(firstCells()).toEqual(original);
    await user.click(screen.getByRole('button', { name: 'Same' }));
    expect(firstCells()).toEqual(original);
  });

  it('with controlled sort calls onSortChange and waits for the parent', async () => {
    const user = setupFakeTimers();
    const onSortChange = vi.fn();
    const props = { caption: 'People', rows: small, columns, getRowId, onSortChange };
    const { rerender } = render(
      <DataTable {...props} sort={{ columnId: 'age', direction: 'ascending' }} />,
    );
    const age = screen.getByRole('columnheader', { name: 'Age' });
    await user.click(screen.getByRole('button', { name: 'Age' }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'age', direction: 'descending' });
    expect(age).toHaveAttribute('aria-sort', 'ascending');
    expect(firstCells()).toEqual(['Item 1', 'Item 9', 'Item 10', 'item 2']);
    await flush();
    expect(status().textContent).toBe('');

    rerender(<DataTable {...props} sort={{ columnId: 'age', direction: 'descending' }} />);
    expect(age).toHaveAttribute('aria-sort', 'descending');
    await flush();
    expect(status()).toHaveTextContent('Sorted by Age, descending');
  });

  it('announces "Sort cleared" when a controlled sort goes to null', async () => {
    setupFakeTimers();
    const props = { caption: 'People', rows: small, columns, getRowId };
    const { rerender } = render(
      <DataTable {...props} sort={{ columnId: 'age', direction: 'ascending' }} />,
    );
    rerender(<DataTable {...props} sort={null} />);
    expect(screen.getByRole('columnheader', { name: 'Age' })).not.toHaveAttribute('aria-sort');
    expect(firstCells()).toEqual(['Item 10', 'Item 9', 'item 2', 'Item 1']);
    await flush();
    expect(status()).toHaveTextContent('Sort cleared');
  });

  it('uses a custom unsorted message', async () => {
    setupFakeTimers();
    const props = {
      caption: 'People',
      rows: small,
      columns,
      getRowId,
      messages: { unsorted: 'No sorting' },
    };
    const { rerender } = render(
      <DataTable {...props} sort={{ columnId: 'age', direction: 'ascending' }} />,
    );
    rerender(<DataTable {...props} sort={null} />);
    await flush();
    expect(status()).toHaveTextContent('No sorting');
  });

  it('resets to page 1 on a sort change and announces only the sort', async () => {
    const user = setupFakeTimers();
    const onPageChange = vi.fn();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        defaultPage={3}
        onPageChange={onPageChange}
      />,
    );
    expect(rangeText('Showing 21–30 of 42')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(rangeText('Showing 1–10 of 42')).toBeInTheDocument();
    expect(firstCells()[0]).toBe('Person 1');
    await flush();
    expect(status().textContent).toBe('Sorted by Name, ascending');
  });

  it('uses custom sorted messages', async () => {
    const user = setupFakeTimers();
    render(
      <DataTable
        caption="People"
        rows={small}
        columns={columns}
        getRowId={getRowId}
        messages={{ sorted: (header, dir) => `${header} ${dir === 'ascending' ? 'up' : 'down'}` }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Age' }));
    await flush();
    expect(status()).toHaveTextContent('Age up');
  });

  it('has no axe violations when sorted', async () => {
    const { container } = render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        defaultSort={{ columnId: 'age', direction: 'ascending' }}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('DataTable pagination', () => {
  it('shows 10 rows and the range by default, inside a labelled, described group', () => {
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    expect(bodyRows()).toHaveLength(10);
    expect(rangeText('Showing 1–10 of 42')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Pagination People' });
    expect(group).toHaveAccessibleDescription('Showing 1–10 of 42');
    const select = within(group).getByRole('combobox', { name: 'Rows per page' });
    expect(select).toHaveValue('10');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['10', '25', '50']);
    expect(within(group).getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Next page' })).toBeInTheDocument();
  });

  it('the visible range text is not a live region', () => {
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    const range = rangeText('Showing 1–10 of 42');
    expect(range).not.toHaveAttribute('aria-live');
    expect(range.closest('[role="status"], [aria-live]')).toBeNull();
  });

  it('pages with Previous/Next using aria-disabled at the bounds', async () => {
    const user = setupFakeTimers();
    const onPageChange = vi.fn();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        onPageChange={onPageChange}
      />,
    );
    const previous = screen.getByRole('button', { name: 'Previous page' });
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(next).not.toHaveAttribute('aria-disabled');

    await user.click(previous);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(previous).toHaveFocus();

    await user.click(next);
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(firstCells()[0]).toBe('Person 11');
    expect(previous).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Showing 11–20 of 42');
    await flush();
    expect(status()).toHaveTextContent('Showing 11–20 of 42');
    expect(next).toHaveFocus();

    for (let i = 0; i < 3; i++) await user.click(next);
    expect(onPageChange).toHaveBeenLastCalledWith(5);
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveFocus();
    expect(bodyRows()).toHaveLength(2);
    onPageChange.mockClear();
    await user.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(rangeText('Showing 41–42 of 42')).toBeInTheDocument();

    await user.click(previous);
    expect(onPageChange).toHaveBeenCalledWith(4);
    expect(rangeText('Showing 31–40 of 42')).toBeInTheDocument();
  });

  it('announces a repeated identical range again in a new node', async () => {
    const user = setupFakeTimers();
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    const next = screen.getByRole('button', { name: 'Next page' });
    const previous = screen.getByRole('button', { name: 'Previous page' });
    await user.click(next);
    await flush();
    expect(status()).toHaveTextContent('Showing 11–20 of 42');
    const firstNode = status().firstElementChild;
    await user.click(previous);
    await flush();
    expect(status()).toHaveTextContent('Showing 1–10 of 42');
    await user.click(next);
    await flush();
    expect(status()).toHaveTextContent('Showing 11–20 of 42');
    expect(status().firstElementChild).not.toBe(firstNode);
  });

  it('resets to page 1 on page-size change and announces the range', async () => {
    const user = setupFakeTimers();
    const onPageSizeChange = vi.fn();
    const onPageChange = vi.fn();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        defaultPage={3}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '25');
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(bodyRows()).toHaveLength(25);
    expect(rangeText('Showing 1–25 of 42')).toBeInTheDocument();
    await flush();
    expect(status()).toHaveTextContent('Showing 1–25 of 42');
  });

  it('adds a current pageSize missing from pageSizeOptions', () => {
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        pageSizeOptions={[5, 20]}
        defaultPageSize={7}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Rows per page' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['5', '7', '20']);
    expect(select).toHaveValue('7');
    expect(bodyRows()).toHaveLength(7);
  });

  it('with controlled page calls onPageChange and does not change without the parent', async () => {
    const user = setupFakeTimers();
    const onPageChange = vi.fn();
    const props = { caption: 'People', rows: people, columns, getRowId, onPageChange };
    const { rerender } = render(<DataTable {...props} page={2} />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(rangeText('Showing 11–20 of 42')).toBeInTheDocument();
    expect(firstCells()[0]).toBe('Person 11');
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    expect(rangeText('Showing 11–20 of 42')).toBeInTheDocument();
    await flush();
    expect(status().textContent).toBe('');

    rerender(<DataTable {...props} page={3} />);
    expect(rangeText('Showing 21–30 of 42')).toBeInTheDocument();
    await flush();
    expect(status()).toHaveTextContent('Showing 21–30 of 42');
  });

  it('with controlled pageSize calls onPageSizeChange and waits for the parent', async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        pageSize={10}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('10');
  });

  it('clamps an out-of-range page for display without a callback', () => {
    const onPageChange = vi.fn();
    const props = { caption: 'People', rows: people, columns, getRowId, onPageChange };
    const { rerender } = render(<DataTable {...props} page={99} />);
    expect(rangeText('Showing 41–42 of 42')).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toHaveAttribute(
      'aria-disabled',
    );

    rerender(<DataTable {...props} page={0} />);
    expect(rangeText('Showing 1–10 of 42')).toBeInTheDocument();
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('clamps the page when rows shrink', () => {
    const { rerender } = render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        defaultPage={5}
      />,
    );
    rerender(
      <DataTable
        caption="People"
        rows={people.slice(0, 15)}
        columns={columns}
        getRowId={getRowId}
        defaultPage={5}
      />,
    );
    expect(rangeText('Showing 11–15 of 15')).toBeInTheDocument();
  });

  it('falls back for non-finite page and pageSize', () => {
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        page={Number.NaN}
        pageSize={Number.NaN}
      />,
    );
    expect(rangeText('Showing 1–10 of 42')).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(10);
  });

  it('with paginated={false} shows all rows and no controls', () => {
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        paginated={false}
      />,
    );
    expect(bodyRows()).toHaveLength(42);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
  });

  it('uses custom pagination messages', async () => {
    const user = setupFakeTimers();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        messages={{
          range: (s, e, t) => `${String(s)}-${String(e)} / ${String(t)}`,
          rowsPerPage: 'Per page',
          previous: 'Back',
          next: 'Forward',
          pagination: 'Pages',
        }}
      />,
    );
    const group = screen.getByRole('group', { name: 'Pages People' });
    expect(group).toHaveAccessibleDescription('1-10 / 42');
    expect(within(group).getByRole('combobox', { name: 'Per page' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(rangeText('1-10 / 42')).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: 'Forward' }));
    await flush();
    expect(status()).toHaveTextContent('11-20 / 42');
  });
});

describe('DataTable manual mode', () => {
  it('renders rows as given, does not sort or slice, and uses totalRows', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const onPageChange = vi.fn();
    const pageRows = people.slice(0, 12).reverse();
    render(
      <DataTable
        caption="People"
        rows={pageRows}
        columns={columns}
        getRowId={getRowId}
        manual
        totalRows={300}
        defaultPage={2}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
      />,
    );
    expect(bodyRows()).toHaveLength(12);
    expect(rangeText('Showing 11–20 of 300')).toBeInTheDocument();
    const before = firstCells();
    expect(before[0]).toBe('Person 12');

    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'name', direction: 'ascending' });
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(firstCells()).toEqual(before);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    expect(firstCells()).toEqual(before);
  });

  it('calls onSortChange in controlled manual mode', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const pageRows = people.slice(0, 3).reverse();
    render(
      <DataTable
        caption="People"
        rows={pageRows}
        columns={columns}
        getRowId={getRowId}
        manual
        totalRows={300}
        sort={{ columnId: 'name', direction: 'ascending' }}
        onSortChange={onSortChange}
      />,
    );
    expect(firstCells()).toEqual(['Person 3', 'Person 2', 'Person 1']);
    expect(rangeText('Showing 1–10 of 300')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith({ columnId: 'name', direction: 'descending' });
  });

  it('allows sortable columns without accessor or compare, without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const serverColumns: DataTableColumn<Person>[] = [
      { id: 'name', header: 'Name', sortable: true, cell: (row) => row.name },
    ];
    render(
      <DataTable
        caption="People"
        rows={small}
        columns={serverColumns}
        getRowId={getRowId}
        manual
        totalRows={4}
      />,
    );
    expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to rows.length for a non-finite totalRows', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        manual
        totalRows={Number.POSITIVE_INFINITY}
      />,
    );
    expect(rangeText('Showing 1–10 of 42')).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(42);
  });
});

describe('DataTable announcement sequencing', () => {
  const serverRows = people.slice(0, 10);

  /** A controlled server table whose sort callback starts loading in the same commit. */
  function ServerTable() {
    const [sort, setSort] = useState<SortState | null>({
      columnId: 'name',
      direction: 'ascending',
    });
    const [loading, setLoading] = useState(false);
    return (
      <>
        <DataTable
          caption="People"
          rows={serverRows}
          columns={columns}
          getRowId={getRowId}
          manual
          totalRows={300}
          sort={sort}
          loading={loading}
          onSortChange={(next) => {
            setSort(next);
            setLoading(true);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setLoading(false);
          }}
        >
          Finish
        </button>
      </>
    );
  }

  it('announces a sort that starts loading once, together with the range', async () => {
    const user = setupFakeTimers();
    render(<ServerTable />);
    const recorder = recordStatus();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    await flush();
    expect(status().textContent).toBe('');

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await flush();
    expect(status().textContent).toBe('Sorted by Name, descending. Showing 1–10 of 300');
    recorder.stop();
    expect(recorder.texts).not.toContain('Showing 1–10 of 300');
    expect(recorder.texts).not.toContain('Loading');
    expect(recorder.texts).not.toContain('Sorted by Name, descending');
  });

  it('holds a sort when loading starts in a later render', async () => {
    setupFakeTimers();
    const props = {
      caption: 'People',
      rows: serverRows,
      columns,
      getRowId,
      manual: true,
      totalRows: 300,
    };
    const { rerender } = render(
      <DataTable {...props} sort={{ columnId: 'name', direction: 'ascending' }} />,
    );
    const recorder = recordStatus();
    const descending: SortState = { columnId: 'name', direction: 'descending' };
    rerender(<DataTable {...props} sort={descending} />);
    rerender(<DataTable {...props} sort={descending} loading />);
    await flush();
    expect(status().textContent).toBe('');
    rerender(<DataTable {...props} sort={descending} />);
    await flush();
    expect(status().textContent).toBe('Sorted by Name, descending. Showing 1–10 of 300');
    recorder.stop();
    expect(recorder.texts).toEqual(['Sorted by Name, descending. Showing 1–10 of 300']);
  });

  it('announces Loading and then the range when no action is pending', async () => {
    setupFakeTimers();
    const props = { caption: 'People', rows: people, columns, getRowId };
    const { rerender } = render(<DataTable {...props} />);
    rerender(<DataTable {...props} loading />);
    await flush();
    expect(status().textContent).toBe('Loading');
    rerender(<DataTable {...props} />);
    await flush();
    expect(status().textContent).toBe('Showing 1–10 of 42');
  });

  it('announces a page change made during loading once, when loading ends', async () => {
    const user = setupFakeTimers();
    const props = { caption: 'People', rows: people, columns, getRowId };
    const { rerender } = render(<DataTable {...props} />);
    rerender(<DataTable {...props} loading />);
    await flush();
    expect(status().textContent).toBe('Loading');
    const recorder = recordStatus();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await flush();
    expect(status().textContent).toBe('Loading');
    rerender(<DataTable {...props} />);
    await flush();
    recorder.stop();
    expect(recorder.texts).toEqual(['Showing 11–20 of 42']);
  });

  it('announces Loading after mounting while loading and leaves the range empty', async () => {
    setupFakeTimers();
    render(
      <DataTable caption="People" rows={noPeople} columns={columns} getRowId={getRowId} loading />,
    );
    await flush();
    expect(status().textContent).toBe('Loading');
    const range = screen.getByRole('group').querySelector('p');
    expect(range?.textContent).toBe('');
    expect(screen.queryByText('0 results')).not.toBeInTheDocument();
  });
});

describe('DataTable warnings', () => {
  it('does not warn for a valid configuration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once for manual without totalRows and falls back to rows.length', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props: DataTableProps<Person> = {
      caption: 'People',
      rows: small,
      columns,
      getRowId,
      manual: true,
    };
    const { rerender } = render(<DataTable {...props} />);
    rerender(<DataTable {...props} rows={[...small]} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/totalRows/);
    expect(rangeText('Showing 1–4 of 4')).toBeInTheDocument();
  });

  it('warns once per instance for sortable columns without accessor or compare', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad: DataTableColumn<Person>[] = [
      ...columns,
      { id: 'notes', header: 'Notes', sortable: true, cell: () => 'x' },
    ];
    const { rerender } = render(
      <DataTable caption="People" rows={small} columns={bad} getRowId={getRowId} />,
    );
    expect(screen.queryByRole('button', { name: 'Notes' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Notes' })).toBeInTheDocument();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/notes/);

    rerender(<DataTable caption="People" rows={small} columns={[...bad]} getRowId={getRowId} />);
    const worse: DataTableColumn<Person>[] = [
      ...bad,
      { id: 'extra', header: 'Extra', sortable: true },
    ];
    rerender(<DataTable caption="People" rows={small} columns={worse} getRowId={getRowId} />);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('DataTable empty and loading', () => {
  it('renders the default empty state across all columns', async () => {
    const { container } = render(
      <DataTable caption="People" rows={noPeople} columns={columns} getRowId={getRowId} />,
    );
    const cell = screen.getByRole('cell', { name: 'No results' });
    expect(cell).toHaveAttribute('colspan', '3');
    expect(rangeText('0 results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders a custom emptyState node', () => {
    render(
      <DataTable
        caption="People"
        rows={noPeople}
        columns={columns}
        getRowId={getRowId}
        emptyState={<em>Nobody here</em>}
      />,
    );
    const cell = screen.getByRole('cell', { name: 'Nobody here' });
    expect(cell).toHaveAttribute('colspan', '3');
    expect(within(cell).getByText('Nobody here').tagName).toBe('EM');
  });

  it('shows a loading cell with a decorative spinner when loading with no rows', async () => {
    const { container } = render(
      <DataTable caption="People" rows={noPeople} columns={columns} getRowId={getRowId} loading />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    const cell = screen.getByRole('cell', { name: 'Loading' });
    expect(cell).toHaveAttribute('colspan', '3');
    expect(screen.queryByRole('cell', { name: 'No results' })).not.toBeInTheDocument();
    expect(cell.querySelector('[aria-hidden="true"]')).not.toBeNull();
    // Only the always-mounted announcer is a status region; the spinner is decorative.
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps rows while loading, marks busy and shows a spinner by the range', async () => {
    const props = { caption: 'People', rows: people, columns, getRowId };
    const { rerender, container } = render(<DataTable {...props} />);
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
    rerender(<DataTable {...props} loading />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(bodyRows()).toHaveLength(10);
    expect(rangeText('Showing 1–10 of 42').querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();

    rerender(<DataTable {...props} />);
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
    expect(rangeText('Showing 1–10 of 42').querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('keeps aria-busy="true" while loading even if aria-busy={false} is passed', () => {
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        loading
        aria-busy={false}
      />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });

  it('honours a consumer aria-busy when not loading', () => {
    render(
      <DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} aria-busy />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });

  it('uses a custom loading message', async () => {
    setupFakeTimers();
    const props = {
      caption: 'People',
      rows: noPeople,
      columns,
      getRowId,
      messages: { loading: 'Fetching' },
    };
    const { rerender } = render(<DataTable {...props} />);
    rerender(<DataTable {...props} loading />);
    expect(screen.getByRole('cell', { name: 'Fetching' })).toBeInTheDocument();
    await flush();
    expect(status()).toHaveTextContent('Fetching');
  });
});

describe('DataTable scroll region', () => {
  it('is a plain container without ResizeObserver', () => {
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('table').parentElement).not.toHaveAttribute('tabindex');
  });

  it('is a plain container when not overflowing', () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollWidth: 400, clientWidth: 400 });
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('table').parentElement).not.toHaveAttribute('tabindex');
  });

  it('becomes a focusable region named by the caption while overflowing', async () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollWidth: 800, clientWidth: 400 });
    const { container } = render(
      <DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />,
    );
    const region = screen.getByRole('region', { name: 'People' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('adds the region to the tab order (it wraps the table, so it precedes the sort buttons)', async () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollWidth: 800, clientWidth: 400 });
    const user = userEvent.setup();
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    const order = [
      screen.getByRole('region', { name: 'People' }),
      screen.getByRole('button', { name: 'Name' }),
      screen.getByRole('button', { name: 'Age' }),
      screen.getByRole('button', { name: 'Joined' }),
      screen.getByRole('combobox', { name: 'Rows per page' }),
    ];
    for (const element of order) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('drops the region role and tab stop when overflow ends', () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollWidth: 800, clientWidth: 400 });
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    const region = screen.getByRole('region', { name: 'People' });
    setPrototypeSizes({ scrollWidth: 400, clientWidth: 400 });
    fireResize();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(region).not.toHaveAttribute('tabindex');
    expect(region).not.toHaveAttribute('aria-labelledby');
  });

  it('keeps the region while it has focus after overflow ends, and drops it on blur', () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollWidth: 500, clientWidth: 200 });
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    const region = screen.getByRole('region', { name: 'People' });
    act(() => {
      region.focus();
    });
    expect(region).toHaveFocus();
    setPrototypeSizes({ scrollWidth: 100 });
    fireResize();
    expect(screen.getByRole('region', { name: 'People' })).toBe(region);
    expect(region).toHaveFocus();
    act(() => {
      region.blur();
    });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

describe('DataTable keyboard', () => {
  it('tabs through sort buttons, page size, Previous and Next', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" rows={people} columns={columns} getRowId={getRowId} />);
    const order = [
      screen.getByRole('button', { name: 'Name' }),
      screen.getByRole('button', { name: 'Age' }),
      screen.getByRole('button', { name: 'Joined' }),
      screen.getByRole('combobox', { name: 'Rows per page' }),
      screen.getByRole('button', { name: 'Previous page' }),
      screen.getByRole('button', { name: 'Next page' }),
    ];
    for (const element of order) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('Enter and Space toggle sort and keep focus on the sort button', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" rows={small} columns={columns} getRowId={getRowId} />);
    await user.tab();
    await user.tab();
    const button = screen.getByRole('button', { name: 'Age' });
    expect(button).toHaveFocus();
    const header = screen.getByRole('columnheader', { name: 'Age' });
    await user.keyboard('{Enter}');
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(button).toHaveFocus();
    await user.keyboard(' ');
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(button).toHaveFocus();
    expect(firstCells()).toEqual(['item 2', 'Item 10', 'Item 9', 'Item 1']);
  });

  it('Enter and Space on Previous/Next change page, keep focus and no-op at the bounds', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={getRowId}
        onPageChange={onPageChange}
      />,
    );
    const previous = screen.getByRole('button', { name: 'Previous page' });
    const next = screen.getByRole('button', { name: 'Next page' });

    previous.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onPageChange).not.toHaveBeenCalled();
    expect(previous).toHaveFocus();

    next.focus();
    await user.keyboard('{Enter}');
    expect(rangeText('Showing 11–20 of 42')).toBeInTheDocument();
    expect(next).toHaveFocus();
    await user.keyboard(' ');
    expect(rangeText('Showing 21–30 of 42')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(onPageChange).toHaveBeenCalledTimes(4);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onPageChange).toHaveBeenCalledTimes(4);
    expect(next).toHaveFocus();

    await user.tab({ shift: true });
    expect(previous).toHaveFocus();
    await user.keyboard(' ');
    expect(rangeText('Showing 31–40 of 42')).toBeInTheDocument();
    expect(previous).toHaveFocus();
  });
});

describe('DataTable types', () => {
  it('infers Row and rejects invalid columns and props', () => {
    interface WithObject {
      id: string;
      meta: { tags: string[] };
    }
    const objectColumns: DataTableColumn<WithObject>[] = [
      // @ts-expect-error `meta` is an object, not a CellValue.
      { id: 'meta', header: 'Meta', accessor: 'meta' },
      // @ts-expect-error `missing` is not a key of the row.
      { id: 'missing', header: 'Missing', accessor: 'missing' },
      // @ts-expect-error an accessor function must return a CellValue.
      { id: 'fn', header: 'Fn', accessor: (row) => row.meta },
    ];
    expect(objectColumns).toHaveLength(3);

    // @ts-expect-error getRowId is required.
    const missingRowId = <DataTable caption="People" rows={people} columns={columns} />;
    expect(missingRowId).toBeTruthy();

    // @ts-expect-error caption is required.
    const missingCaption = <DataTable rows={people} columns={columns} getRowId={getRowId} />;
    expect(missingCaption).toBeTruthy();

    // Row is inferred from rows: a column for another row type is an error.
    const wrong = (
      <DataTable
        caption="People"
        rows={people}
        getRowId={getRowId}
        // @ts-expect-error columns must match Person.
        columns={objectColumns}
      />
    );
    expect(wrong).toBeTruthy();

    const inferred = (
      <DataTable
        caption="People"
        rows={people}
        columns={columns}
        getRowId={(row) => {
          expectTypeOf(row).toEqualTypeOf<Person>();
          return row.id;
        }}
      />
    );
    expect(inferred).toBeTruthy();

    expectTypeOf<DataTableColumn<Person>['accessor']>().toEqualTypeOf<
      'id' | 'name' | 'age' | 'joined' | ((row: Person) => CellValue) | undefined
    >();
  });
});
