import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type TableHTMLAttributes,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useIsOverflowing } from '../../hooks/useIsOverflowing';
import { cx } from '../../utils/cx';
import type { SortDirection, SortState } from '../../utils/types';
import { Button } from '../Button';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../Icon';
import { NativeSelect } from '../NativeSelect';
import { Spinner } from '../Spinner';
import { VisuallyHidden } from '../VisuallyHidden';
import styles from './DataTable.module.css';

/** A raw cell value: what an `accessor` returns, the default display and the default sort input. */
export type CellValue = string | number | bigint | boolean | Date | null | undefined;

/** Keys of `Row` whose values are a `CellValue` (objects and arrays are excluded). */
type KeysWithCellValue<Row> = {
  [K in keyof Row]-?: Row[K] extends CellValue ? K : never;
}[keyof Row];

export interface DataTableColumn<Row> {
  /** Stable column id, used in `SortState.columnId`. */
  id: string;
  /** Header text. Also used in the sort announcement, so it must be plain text. */
  header: string;
  /** Row key or function giving the cell's raw value (display default and sort input). */
  accessor?: KeysWithCellValue<Row> | ((row: Row) => CellValue);
  /** Custom cell content. Default: `String(value)`, with a Date via `toLocaleDateString()` and null/undefined as ''. */
  cell?: (row: Row) => ReactNode;
  /**
   * The header becomes a sort button. In client mode it needs `accessor` or `compare`
   * (a warning is logged otherwise and the header stays plain). In `manual` mode the
   * server sorts, so neither is needed.
   * @default false
   */
  sortable?: boolean;
  /**
   * Ascending comparator; it is negated for descending. Default: nulls last in both
   * directions, numbers/bigint/dates numeric, booleans false < true, strings with
   * `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })`.
   */
  compare?: (a: Row, b: Row) => number;
  /** Text alignment of the header and cells. Use 'end' for numbers (also turns on tabular numerals). @default 'start' */
  align?: 'start' | 'end';
  /** Render this column's cells as `<th scope="row">`, which names each row for screen readers. @default false */
  rowHeader?: boolean;
}

export interface DataTableMessages {
  /** Range text and page announcement. @default (s, e, t) => t === 0 ? '0 results' : `Showing ${s}–${e} of ${t}` */
  range: (start: number, end: number, total: number) => string;
  /** Sort announcement. @default (header, direction) => `Sorted by ${header}, ${direction}` */
  sorted: (header: string, direction: SortDirection) => string;
  /** Announcement when the sort is cleared (set to `null`). @default 'Sort cleared' */
  unsorted: string;
  /** Label of the page-size select. @default 'Rows per page' */
  rowsPerPage: string;
  /** Previous page button. @default 'Previous page' */
  previous: string;
  /** Next page button. @default 'Next page' */
  next: string;
  /** First part of the pagination group's name (the caption follows). @default 'Pagination' */
  pagination: string;
  /** Loading cell text and announcement. @default 'Loading' */
  loading: string;
}

export interface DataTableProps<Row> extends Omit<
  TableHTMLAttributes<HTMLTableElement>,
  'children'
> {
  /** Rows to show: all rows, or only the current page when `manual`. `Row` is inferred from this prop. */
  rows: readonly Row[];
  /** Column definitions, in display order. */
  columns: readonly DataTableColumn<NoInfer<Row>>[];
  /** Stable unique id per row, used as the React key. */
  getRowId: (row: NoInfer<Row>) => string;
  /** Required table name, rendered as `<caption>`. It also labels the scroll region and the pagination group. */
  caption: ReactNode;
  /** Keep the caption for assistive technology only. @default false */
  captionHidden?: boolean;
  /** Controlled sort; `null` means unsorted. */
  sort?: SortState | null;
  /** Initial sort when uncontrolled. @default null */
  defaultSort?: SortState | null;
  /** Called with the new sort. Clicking the sorted column toggles ascending/descending; a new column starts ascending. */
  onSortChange?: (sort: SortState | null) => void;
  /** Show pagination controls and slice rows into pages. With `false` every row is shown. @default true */
  paginated?: boolean;
  /** Controlled 1-based page. Out-of-range values are clamped for display, without a callback; non-finite values count as 1. */
  page?: number;
  /** Initial page when uncontrolled. @default 1 */
  defaultPage?: number;
  /**
   * Called with the new 1-based page: from Previous/Next, and with `1` after a page-size
   * change or a sort request (a sort click always returns to the first page).
   */
  onPageChange?: (page: number) => void;
  /** Controlled rows per page. Non-finite or smaller than 1 falls back to `defaultPageSize` / 1. */
  pageSize?: number;
  /** Initial rows per page when uncontrolled. @default 10 */
  defaultPageSize?: number;
  /** Called with the new rows per page. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Choices in the page-size select. The current `pageSize` is added if missing. @default [10, 25, 50] */
  pageSizeOptions?: readonly number[];
  /**
   * Rows are already sorted and paginated by the server; DataTable only renders them and
   * reports sort/page changes. Requires `totalRows`.
   * @default false
   */
  manual?: boolean;
  /** Total row count across all pages when `manual`. Falls back to `rows.length` (with a warning) when missing or non-finite. */
  totalRows?: number;
  /** Sets `aria-busy`, shows a spinner and announces `messages.loading`. @default false */
  loading?: boolean;
  /** Shown in a full-width cell when there are no rows. @default 'No results' */
  emptyState?: ReactNode;
  /** Override built-in strings. */
  messages?: Partial<DataTableMessages>;
}

const defaultMessages: DataTableMessages = {
  range: (start, end, total) =>
    total === 0 ? '0 results' : `Showing ${String(start)}–${String(end)} of ${String(total)}`,
  sorted: (header, direction) => `Sorted by ${header}, ${direction}`,
  unsorted: 'Sort cleared',
  rowsPerPage: 'Rows per page',
  previous: 'Previous page',
  next: 'Next page',
  pagination: 'Pagination',
  loading: 'Loading',
};

const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50];

/**
 * Delay before a pending announcement is committed to the status region. It lets a
 * parent that starts loading right after a sort/page callback (same or next commit)
 * suppress the intermediate message, so each action is announced once.
 */
const ANNOUNCE_DELAY_MS = 150;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** `n` when it is a finite number, else `fallback`. Guards NaN/Infinity props. */
function finite(n: number | undefined, fallback: number): number {
  return n !== undefined && Number.isFinite(n) ? n : fallback;
}

type PresentValue = Exclude<CellValue, null | undefined>;

function getValue<Row>(row: Row, column: DataTableColumn<Row>): CellValue {
  const { accessor } = column;
  if (accessor === undefined) return undefined;
  if (typeof accessor === 'function') return accessor(row);
  // KeysWithCellValue guarantees the value is a CellValue; TS cannot see that generically.
  return row[accessor] as CellValue;
}

/** Null, undefined, NaN and invalid dates have no sortable value and always sort last. */
function isMissing(value: CellValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return Number.isNaN(value);
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return false;
}

function hasValue(value: CellValue): value is PresentValue {
  return !isMissing(value);
}

function toComparable(value: PresentValue): number | bigint | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/** Default ascending order of two present values. */
function compareValues(a: PresentValue, b: PresentValue): number {
  const x = toComparable(a);
  const y = toComparable(b);
  if (typeof x === 'string' || typeof y === 'string') return collator.compare(String(x), String(y));
  return x < y ? -1 : x > y ? 1 : 0;
}

function sortRows<Row>(
  rows: readonly Row[],
  column: DataTableColumn<Row>,
  direction: SortDirection,
): Row[] {
  const sign = direction === 'ascending' ? 1 : -1;
  const { compare } = column;
  // Array.prototype.sort is stable, and negating keeps ties at 0, so equal rows keep their order.
  if (compare) return [...rows].sort((a, b) => sign * compare(a, b));
  // Decorate, sort, undecorate: each accessor runs once per row, not once per comparison.
  return rows
    .map((row, index) => ({ row, index, value: getValue(row, column) }))
    .sort((a, b) => {
      const x = a.value;
      const y = b.value;
      if (hasValue(x) && hasValue(y)) return sign * compareValues(x, y) || a.index - b.index;
      if (hasValue(x)) return -1;
      if (hasValue(y)) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

function formatValue(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

function getRange(page: number, pageSize: number, total: number, paginated: boolean) {
  if (total === 0) return { start: 0, end: 0 };
  if (!paginated) return { start: 1, end: total };
  return { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total) };
}

const sortIcons = {
  ascending: ArrowUpIcon,
  descending: ArrowDownIcon,
} as const;

/** Values the announcer compares between renders to detect a change. */
interface Seen {
  sortKey: string;
  page: number;
  pageSize: number;
  loading: boolean;
}

/** Changes detected but not yet announced. */
interface Pending {
  /** Sort message (sorted or cleared), held until it can be announced. */
  sort: string | null;
  /** The page or page size changed. */
  range: boolean;
  /** Loading started. */
  loading: boolean;
  /** Loading ended: announce the range (after a pending sort message). */
  afterLoading: boolean;
}

const NO_PENDING: Pending = { sort: null, range: false, loading: false, afterLoading: false };

function normalize(pending: Pending): Pending {
  return pending.sort === null && !pending.range && !pending.loading && !pending.afterLoading
    ? NO_PENDING
    : pending;
}

interface AnnouncerState {
  seen: Seen;
  pending: Pending;
  /** The nonce remounts the inner span, so identical text is announced again. */
  current: { text: string; nonce: number };
}

function DataTableInner<Row>(
  {
    rows,
    columns,
    getRowId,
    caption,
    captionHidden = false,
    sort: sortProp,
    defaultSort = null,
    onSortChange,
    paginated = true,
    page: pageProp,
    defaultPage = 1,
    onPageChange,
    pageSize: pageSizeProp,
    defaultPageSize = 10,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    manual = false,
    totalRows,
    loading = false,
    emptyState = 'No results',
    messages: messagesProp,
    className,
    style,
    'aria-busy': ariaBusy,
    ...rest
  }: DataTableProps<Row>,
  ref: ForwardedRef<HTMLTableElement>,
) {
  const messages = { ...defaultMessages, ...messagesProp };
  const baseId = useId();
  const captionId = `${baseId}-caption`;
  const paginationLabelId = `${baseId}-pagination`;
  const rangeId = `${baseId}-range`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const overflowing = useIsOverflowing(scrollRef, 'inline');
  const [regionFocused, setRegionFocused] = useState(false);
  // Native focus/blur do not bubble, so they only fire for the scroll container itself.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onFocus = () => {
      setRegionFocused(true);
    };
    const onBlur = () => {
      setRegionFocused(false);
    };
    element.addEventListener('focus', onFocus);
    element.addEventListener('blur', onBlur);
    return () => {
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
    };
  }, []);

  const [sort, setSort] = useControllableState<SortState | null>({
    value: sortProp,
    defaultValue: defaultSort,
    onChange: onSortChange,
  });
  const [rawPage, setPage] = useControllableState({
    value: pageProp,
    defaultValue: defaultPage,
    onChange: onPageChange,
  });
  const [rawPageSize, setPageSize] = useControllableState({
    value: pageSizeProp,
    defaultValue: defaultPageSize,
    onChange: onPageSizeChange,
  });

  // Warnings fire once per instance (refs survive StrictMode's double effects).
  const warnedTotal = useRef(false);
  const missingTotal = manual && !Number.isFinite(totalRows);
  useEffect(() => {
    if (missingTotal && !warnedTotal.current) {
      warnedTotal.current = true;
      console.warn(
        'DataTable: `manual` is set without a finite `totalRows`, so the range and page count fall back to the rows of the current page. Pass the server total in `totalRows`.',
      );
    }
  }, [missingTotal]);

  const canSort = (column: DataTableColumn<Row>) =>
    column.sortable === true &&
    (manual || column.accessor !== undefined || column.compare !== undefined);

  const warnedColumns = useRef(false);
  const unsortableIds = manual
    ? ''
    : columns
        .filter((c) => c.sortable === true && c.accessor === undefined && c.compare === undefined)
        .map((c) => c.id)
        .join(', ');
  useEffect(() => {
    if (unsortableIds && !warnedColumns.current) {
      warnedColumns.current = true;
      console.warn(
        `DataTable: column(s) ${unsortableIds} are \`sortable\` but have neither \`accessor\` nor \`compare\`, so their headers are not sortable.`,
      );
    }
  }, [unsortableIds]);

  const sortColumn = sort ? columns.find((c) => c.id === sort.columnId) : undefined;
  const sortDirection = sort?.direction;

  const sortedRows = useMemo(
    () =>
      manual || !sortColumn || !sortDirection ? rows : sortRows(rows, sortColumn, sortDirection),
    [manual, rows, sortColumn, sortDirection],
  );

  const total = Math.max(0, Math.floor(manual ? finite(totalRows, rows.length) : rows.length));
  const pageSize = Math.max(1, Math.floor(finite(rawPageSize, finite(defaultPageSize, 10))));
  const pageCount = paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const page = Math.min(Math.max(1, Math.floor(finite(rawPage, 1))), pageCount);
  const { start, end } = getRange(page, pageSize, total, paginated);
  const visibleRows =
    manual || !paginated ? sortedRows : sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;
  const rangeText = messages.range(start, end, total);
  const loadingText = messages.loading;

  // --- Announcements -------------------------------------------------------------------
  // Changes are detected during render (React's "adjust state while rendering" pattern, so
  // a controlled parent that ignores a callback is never misreported) and held as pending.
  // An effect commits them after a short delay. If loading starts first, a pending sort is
  // held and announced together with the range when loading ends: one message per action.
  const sortKey = sort ? `${sort.columnId}:${sort.direction}` : '';
  const [announcer, setAnnouncer] = useState<AnnouncerState>(() => ({
    // `loading: false` so a table that mounts while loading still announces it after mount.
    seen: { sortKey, page, pageSize, loading: false },
    pending: NO_PENDING,
    current: { text: '', nonce: 0 },
  }));
  const { seen } = announcer;
  const sortChanged = seen.sortKey !== sortKey;
  const pageChanged = !Object.is(seen.page, page) || !Object.is(seen.pageSize, pageSize);
  const loadingChanged = seen.loading !== loading;
  if (sortChanged || pageChanged || loadingChanged) {
    const next = { ...announcer.pending };
    if (sortChanged) {
      const message = !sort
        ? messages.unsorted
        : sortColumn && sortDirection
          ? messages.sorted(sortColumn.header, sortDirection)
          : null;
      next.sort = message;
      // A sort supersedes a page reset in the same action; an unknown column falls back to the range.
      next.range = message === null;
    } else if (pageChanged) {
      next.range = true;
    }
    if (loadingChanged) {
      next.loading = loading;
      next.afterLoading = !loading;
    }
    setAnnouncer({
      ...announcer,
      seen: { sortKey, page, pageSize, loading },
      pending: normalize(next),
    });
  }

  const { pending } = announcer;
  useEffect(() => {
    if (pending === NO_PENDING) return;
    // While loading, hold everything. "Loading" is only announced when no sort or page
    // message is waiting (e.g. on mount or a parent-driven refresh); after a user action
    // the result is announced once, when loading ends.
    if (loading && (pending.sort !== null || pending.range || !pending.loading)) return;
    const timer = setTimeout(() => {
      let text: string | null;
      let rest: Pending = NO_PENDING;
      if (loading) {
        text = loadingText;
        rest = normalize({ ...pending, loading: false });
      } else if (pending.afterLoading) {
        text = pending.sort === null ? rangeText : `${pending.sort}. ${rangeText}`;
      } else {
        text = pending.sort ?? (pending.range ? rangeText : null);
      }
      setAnnouncer((prev) =>
        prev.pending !== pending
          ? prev
          : {
              ...prev,
              pending: rest,
              current: text === null ? prev.current : { text, nonce: prev.current.nonce + 1 },
            },
      );
    }, ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [pending, loading, rangeText, loadingText]);

  // --- Handlers --------------------------------------------------------------------------
  const handleSort = (column: DataTableColumn<Row>) => {
    const direction: SortDirection =
      sort?.columnId === column.id && sort.direction === 'ascending' ? 'descending' : 'ascending';
    setSort({ columnId: column.id, direction });
    setPage(1);
  };

  const handlePageSize = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const sizeChoices = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  const columnCount = Math.max(1, columns.length);
  // Keep the region semantics while it has focus, so focus never sits on an unnamed element.
  const isRegion = overflowing || regionFocused;
  const scrollProps = isRegion
    ? { role: 'region', 'aria-labelledby': captionId, tabIndex: 0 }
    : undefined;
  const busy = loading || ariaBusy === true || ariaBusy === 'true';
  const showRows = visibleRows.length > 0;

  let body: ReactNode;
  if (!showRows) {
    body = (
      <tr>
        <td colSpan={columnCount} className={styles.message}>
          {loading ? (
            <span className={styles.loading}>
              <Spinner decorative size="sm" />
              {messages.loading}
            </span>
          ) : (
            emptyState
          )}
        </td>
      </tr>
    );
  } else {
    body = visibleRows.map((row) => (
      <tr key={getRowId(row)}>
        {columns.map((column) => {
          const content = column.cell ? column.cell(row) : formatValue(getValue(row, column));
          const align = column.align ?? 'start';
          return column.rowHeader ? (
            <th key={column.id} scope="row" className={styles.cell} data-align={align}>
              {content}
            </th>
          ) : (
            <td key={column.id} className={styles.cell} data-align={align}>
              {content}
            </td>
          );
        })}
      </tr>
    ));
  }

  return (
    <div className={cx(styles.root, className)} style={style}>
      <div ref={scrollRef} className={styles.scroll} {...scrollProps}>
        <table ref={ref} className={styles.table} {...rest} aria-busy={busy || undefined}>
          <caption id={captionId} className={captionHidden ? undefined : styles.caption}>
            {captionHidden ? <VisuallyHidden>{caption}</VisuallyHidden> : caption}
          </caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const align = column.align ?? 'start';
                const sortable = canSort(column);
                const isSorted = sortColumn?.id === column.id && sortDirection !== undefined;
                const SortIcon = isSorted ? sortIcons[sortDirection] : ArrowUpDownIcon;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={styles.headerCell}
                    data-align={align}
                    data-sortable={sortable || undefined}
                    aria-sort={isSorted ? sortDirection : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={styles.sortButton}
                        data-sorted={isSorted || undefined}
                        onClick={() => {
                          handleSort(column);
                        }}
                      >
                        <span className={styles.sortLabel}>{column.header}</span>
                        <SortIcon size="sm" className={styles.sortIcon} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={styles.body} data-loading={loading || undefined}>
            {body}
          </tbody>
        </table>
      </div>
      {paginated && (
        <div
          className={styles.pagination}
          role="group"
          aria-labelledby={`${paginationLabelId} ${captionId}`}
          aria-describedby={rangeId}
        >
          <VisuallyHidden id={paginationLabelId}>{messages.pagination}</VisuallyHidden>
          <NativeSelect
            size="sm"
            label={messages.rowsPerPage}
            className={styles.pageSize}
            value={String(pageSize)}
            onValueChange={handlePageSize}
          >
            {sizeChoices.map((option) => (
              <option key={option} value={String(option)}>
                {option}
              </option>
            ))}
          </NativeSelect>
          <p id={rangeId} className={styles.range}>
            {loading && showRows && <Spinner decorative size="sm" />}
            {/* While the first load runs there is no range yet; the loading cell says so. */}
            {loading && !showRows ? null : rangeText}
          </p>
          <div className={styles.nav}>
            <Button
              variant="secondary"
              size="sm"
              className={styles.navButton}
              startIcon={<ChevronLeftIcon />}
              aria-disabled={atStart || undefined}
              onClick={() => {
                if (!atStart) setPage(page - 1);
              }}
            >
              {messages.previous}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={styles.navButton}
              endIcon={<ChevronRightIcon />}
              aria-disabled={atEnd || undefined}
              onClick={() => {
                if (!atEnd) setPage(page + 1);
              }}
            >
              {messages.next}
            </Button>
          </div>
        </div>
      )}
      <VisuallyHidden role="status">
        <span key={announcer.current.nonce}>{announcer.current.text}</span>
      </VisuallyHidden>
    </div>
  );
}

const ForwardedDataTable = forwardRef(DataTableInner);
ForwardedDataTable.displayName = 'DataTable';

/**
 * A typed, sortable, paginated table built on a native `<table>` (APG sortable table:
 * a `<button>` in each sortable header and `aria-sort` on the sorted column only).
 *
 * `className` and `style` go to the outer wrapper. The ref and every other prop go to the
 * `<table>`. `Row` is inferred from `rows`; `columns` and `getRowId` are checked against it.
 *
 * Sort, page, page-size and loading changes are announced once each, after a short delay,
 * through an always-mounted polite status region. When the table overflows horizontally,
 * its scroll container becomes a focusable region named by the caption.
 */
export const DataTable = ForwardedDataTable as unknown as (<Row>(
  props: DataTableProps<Row> & { ref?: Ref<HTMLTableElement> },
) => ReactElement) & { displayName?: string };
