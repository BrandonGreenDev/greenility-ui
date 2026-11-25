import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import type { SortState, Tone } from '../../utils/types';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable';

type ProjectType = 'Rooftop solar' | 'Solar farm' | 'Agrivoltaic' | 'Floating solar' | 'Battery';
type ProjectStatus = 'Planned' | 'Permitting' | 'Construction' | 'Operational' | 'Paused';

interface Project {
  id: string;
  name: string;
  region: string;
  type: ProjectType;
  /** Peak capacity in megawatts. */
  capacityMw: number;
  status: ProjectStatus;
  /** Null until the project is connected to the grid. */
  commissioned: Date | null;
  /** Estimated tonnes of CO2 avoided per year; null when not yet modelled. */
  co2Tonnes: number | null;
}

type ProjectTuple = [
  name: string,
  region: string,
  type: ProjectType,
  capacityMw: number,
  status: ProjectStatus,
  commissioned: string | null,
  co2Tonnes: number | null,
];

// Fictional portfolio, invented for these stories.
const projectData: ProjectTuple[] = [
  ['Aldermoor Fields', 'North West', 'Solar farm', 48.5, 'Operational', '2021-06-14', 21400],
  ['Brackenridge Depot', 'Midlands', 'Rooftop solar', 2.4, 'Operational', '2022-03-02', 1050],
  ['Cinder Lane Storage', 'Midlands', 'Battery', 30, 'Construction', null, null],
  ['Dunmore Orchard', 'South West', 'Agrivoltaic', 12.8, 'Operational', '2023-09-21', 5600],
  ['Eastwater Reservoir', 'East', 'Floating solar', 6.3, 'Permitting', null, 2700],
  ['Fernhollow Farm', 'Wales', 'Agrivoltaic', 9.1, 'Planned', null, null],
  ['Gorse Hill', 'South West', 'Solar farm', 35, 'Operational', '2020-11-30', 15800],
  ['Harrowgate Logistics Park', 'North East', 'Rooftop solar', 4.7, 'Construction', null, 2050],
  ['Ironbridge Works', 'Midlands', 'Rooftop solar', 1.2, 'Operational', '2019-05-08', 520],
  ['Juniper Flats', 'East', 'Solar farm', 62, 'Permitting', null, 27300],
  ['Kestrel Moor', 'Scotland', 'Solar farm', 21.6, 'Operational', '2022-08-17', 9400],
  ['Larchfield School', 'South East', 'Rooftop solar', 0.4, 'Operational', '2021-01-25', 170],
  ['Millbrook Quarry Lake', 'North West', 'Floating solar', 8.9, 'Construction', null, 3900],
  ['Nettlebed Storage', 'South East', 'Battery', 50, 'Operational', '2024-02-12', null],
  ['Oakhurst Vineyard', 'South East', 'Agrivoltaic', 3.5, 'Paused', null, 1500],
  ['Pennant Ridge', 'Wales', 'Solar farm', 27.4, 'Operational', '2023-04-03', 11900],
  ['Quarrymans Yard', 'North East', 'Rooftop solar', 0.9, 'Planned', null, null],
  ['Redwick Levels', 'Wales', 'Solar farm', 44, 'Construction', null, 19300],
  ['Saltmarsh Cooperative', 'East', 'Solar farm', 15.2, 'Operational', '2018-07-19', 6600],
  ['Thornbury Retail Park', 'South West', 'Rooftop solar', 3.1, 'Operational', '2024-06-28', 1350],
  ['Upperton Grid Battery', 'North West', 'Battery', 40, 'Permitting', null, null],
  ['Valewood Dairy', 'Scotland', 'Agrivoltaic', 5.6, 'Operational', '2022-10-05', 2400],
  ['Wexcombe Down', 'South East', 'Solar farm', 31.8, 'Paused', null, 13900],
  ['Yarrow Basin', 'Scotland', 'Floating solar', 4.2, 'Planned', null, null],
  ['Ashcombe Hospital', 'South West', 'Rooftop solar', 1.8, 'Operational', '2020-03-16', 780],
  ['Blackthorn Common', 'East', 'Solar farm', 55.5, 'Construction', null, 24400],
  ['Cleeve Valley', 'Midlands', 'Agrivoltaic', 7.7, 'Operational', '2023-12-11', 3350],
  ['Drovers Way Storage', 'Wales', 'Battery', 25, 'Operational', '2023-07-24', null],
  ['Elmstead Leisure Centre', 'East', 'Rooftop solar', 0.6, 'Operational', '2019-09-09', 260],
  ['Foxley Heath', 'North East', 'Solar farm', 18.3, 'Permitting', null, 8000],
  ['Glenarrow Loch', 'Scotland', 'Floating solar', 11, 'Construction', null, 4800],
  ['Hayfield Barns', 'North West', 'Agrivoltaic', 2.9, 'Planned', null, null],
  ['Ivydene Data Centre', 'South East', 'Rooftop solar', 5.2, 'Operational', '2024-09-02', 2250],
  ['Kingsmere Solar Park', 'Midlands', 'Solar farm', 70, 'Planned', null, 30700],
  ['Lowford Marina', 'South West', 'Floating solar', 1.5, 'Operational', '2022-05-30', 650],
  ['Marlpit Storage Hub', 'East', 'Battery', 100, 'Construction', null, null],
  ['Northcote Abbey', 'North East', 'Rooftop solar', 0.3, 'Paused', null, 130],
  ['Owlpen Meadows', 'South West', 'Agrivoltaic', 6.8, 'Operational', '2021-08-12', 2950],
  ['Pebblecombe', 'Wales', 'Solar farm', 22.5, 'Operational', '2020-06-01', 9800],
  ['Rookery Business Park', 'Midlands', 'Rooftop solar', 3.9, 'Construction', null, 1700],
  ['Stonebridge Fen', 'East', 'Solar farm', 38.2, 'Operational', '2019-11-14', 16700],
  ['Tidewater Docks', 'North West', 'Rooftop solar', 6.1, 'Operational', '2024-04-19', 2650],
];

const projects: Project[] = projectData.map(
  ([name, region, type, capacityMw, status, commissioned, co2Tonnes], index) => ({
    id: `p${String(index + 1).padStart(3, '0')}`,
    name,
    region,
    type,
    capacityMw,
    status,
    commissioned: commissioned === null ? null : new Date(`${commissioned}T00:00:00`),
    co2Tonnes,
  }),
);

const numberFormat = new Intl.NumberFormat('en-GB');
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

const statusTone: Record<ProjectStatus, Tone> = {
  Planned: 'neutral',
  Permitting: 'info',
  Construction: 'warning',
  Operational: 'success',
  Paused: 'danger',
};

/** Lifecycle order, used by the custom comparator. */
const statusOrder: Record<ProjectStatus, number> = {
  Planned: 0,
  Permitting: 1,
  Construction: 2,
  Operational: 3,
  Paused: 4,
};

const columns: DataTableColumn<Project>[] = [
  { id: 'name', header: 'Project', accessor: 'name', sortable: true, rowHeader: true },
  { id: 'region', header: 'Region', accessor: 'region', sortable: true },
  { id: 'type', header: 'Type', accessor: 'type', sortable: true },
  {
    id: 'capacity',
    header: 'Capacity (MW)',
    accessor: 'capacityMw',
    sortable: true,
    align: 'end',
    cell: (row) => row.capacityMw.toFixed(1),
  },
  { id: 'status', header: 'Status', accessor: 'status', sortable: true },
  {
    id: 'commissioned',
    header: 'Commissioned',
    accessor: 'commissioned',
    sortable: true,
    cell: (row) => (row.commissioned ? dateFormat.format(row.commissioned) : '—'),
  },
  {
    id: 'co2',
    header: 'CO₂ avoided (t/yr)',
    accessor: 'co2Tonnes',
    sortable: true,
    align: 'end',
    cell: (row) => (row.co2Tonnes === null ? '—' : numberFormat.format(row.co2Tonnes)),
  },
];

const badgeStatusColumn: DataTableColumn<Project> = {
  id: 'status',
  header: 'Status',
  accessor: 'status',
  sortable: true,
  cell: (row) => (
    <Badge size="sm" tone={statusTone[row.status]}>
      {row.status}
    </Badge>
  ),
};

const withBadges = columns.map((column) => (column.id === 'status' ? badgeStatusColumn : column));

const getRowId = (row: Project) => row.id;

const meta = {
  title: 'Components/DataTable',
  component: DataTable<Project>,
  args: {
    caption: 'Renewable projects',
    rows: projects,
    columns,
    getRowId,
    defaultSort: { columnId: 'name', direction: 'ascending' },
  },
  argTypes: {
    rows: { control: false },
    columns: { control: false },
    getRowId: { control: false },
  },
} satisfies Meta<typeof DataTable<Project>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sorted by project name. Every header is a sort button; the project name is the row header. */
export const Default: Story = {};

/** No initial sort: rows keep their source order until a header is pressed. */
export const Unsorted: Story = {
  args: { defaultSort: null },
};

/** `cell` renders any content. Here the status is a Badge; its text carries the meaning, not the colour. */
export const CustomCellRender: Story = {
  args: { columns: withBadges },
};

/** `compare` replaces the default ordering. Status sorts by project lifecycle instead of alphabetically. */
export const CustomCompare: Story = {
  args: {
    columns: withBadges.map((column) =>
      column.id === 'status'
        ? {
            ...column,
            header: 'Stage',
            compare: (a: Project, b: Project) => statusOrder[a.status] - statusOrder[b.status],
          }
        : column,
    ),
    defaultSort: { columnId: 'status', direction: 'ascending' },
  },
};

/** Numbers sort numerically; empty values (shown as a dash) stay last in both directions. */
export const SortedByNumberDescending: Story = {
  args: { defaultSort: { columnId: 'co2', direction: 'descending' } },
};

/** `pageSizeOptions` and `defaultPageSize` set the page-size choices. */
export const PageSizes: Story = {
  args: { pageSizeOptions: [5, 10, 25, 50], defaultPageSize: 5 },
};

/** Opens on a later page. A sort or page-size change returns to page 1. */
export const StartOnLastPage: Story = {
  args: { defaultPage: 5 },
};

/** `paginated={false}` shows every row and no pagination controls. */
export const NotPaginated: Story = {
  args: { paginated: false, rows: projects.slice(0, 8) },
};

/** No rows: `emptyState` fills a full-width cell. */
export const Empty: Story = {
  args: {
    rows: [],
    emptyState: 'No projects match these filters.',
  },
};

/** Loading with no rows yet: a spinner row, `aria-busy` on the table and a "Loading" announcement. */
export const Loading: Story = {
  args: { rows: [], loading: true },
};

/** Loading while the previous rows are still shown: the body is muted and a spinner sits by the range. */
export const LoadingWithRows: Story = {
  args: { loading: true },
};

/** Simulated server latency for the ManualServerMode story. */
const LATENCY_MS = 700;

/** What the fake server can sort by, keyed by column id. */
const serverComparators: Record<string, (a: Project, b: Project) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  capacity: (a, b) => a.capacityMw - b.capacityMw,
  status: (a, b) => statusOrder[a.status] - statusOrder[b.status],
};

interface ServerResult {
  key: string;
  rows: Project[];
  total: number;
}

function fetchProjects(key: string, sort: SortState | null, page: number, pageSize: number) {
  return new Promise<ServerResult>((resolve) => {
    setTimeout(() => {
      const sorted = [...projects];
      const compare = sort ? serverComparators[sort.columnId] : undefined;
      if (sort && compare) {
        const sign = sort.direction === 'ascending' ? 1 : -1;
        sorted.sort((a, b) => sign * compare(a, b));
      }
      resolve({
        key,
        rows: sorted.slice((page - 1) * pageSize, page * pageSize),
        total: sorted.length,
      });
    }, LATENCY_MS);
  });
}

const serverColumns: DataTableColumn<Project>[] = [
  { id: 'name', header: 'Project', accessor: 'name', sortable: true, rowHeader: true },
  { id: 'region', header: 'Region', accessor: 'region' },
  {
    id: 'capacity',
    header: 'Capacity (MW)',
    accessor: 'capacityMw',
    sortable: true,
    align: 'end',
    cell: (row) => row.capacityMw.toFixed(1),
  },
  { ...badgeStatusColumn, header: 'Stage' },
];

/**
 * `manual` mode: the "server" sorts (project, capacity, or stage in lifecycle order) and
 * slices, with simulated latency. DataTable renders the given page and reports
 * sort/page/page-size changes. `loading` is derived: it is true while the latest result
 * belongs to an older request. `totalRows` drives the range and page count.
 */
export const ManualServerMode: Story = {
  args: { columns: serverColumns, defaultSort: undefined },
  render: function Render(args) {
    const [sort, setSort] = useState<SortState | null>({
      columnId: 'name',
      direction: 'ascending',
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [data, setData] = useState<ServerResult>({ key: '', rows: [], total: 0 });
    const requestKey = JSON.stringify([sort, page, pageSize]);
    const loading = data.key !== requestKey;

    useEffect(() => {
      let active = true;
      void fetchProjects(requestKey, sort, page, pageSize).then((result) => {
        if (active) setData(result);
      });
      return () => {
        active = false;
      };
    }, [requestKey, sort, page, pageSize]);

    return (
      <DataTable
        {...args}
        manual
        rows={data.rows}
        totalRows={data.total}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

/** Sort, page and page size are controlled by the parent, which can also change them from outside. */
export const ControlledSortAndPage: Story = {
  args: { columns: withBadges, defaultSort: undefined },
  render: function Render(args) {
    const [sort, setSort] = useState<SortState | null>({
      columnId: 'capacity',
      direction: 'descending',
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    return (
      <div style={{ display: 'grid', gap: 'var(--gn-space-3)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gn-space-2)' }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSort({ columnId: 'commissioned', direction: 'descending' });
              setPage(1);
            }}
          >
            Newest first
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPageSize(25);
              setPage(1);
            }}
          >
            Show 25 rows
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSort(null);
              setPage(1);
            }}
          >
            Clear sort
          </Button>
        </div>
        <p style={{ margin: 0, fontSize: 'var(--gn-font-size-sm)' }}>
          Sort: {sort ? `${sort.columnId} (${sort.direction})` : 'none'} · Page: {page} · Page size:{' '}
          {pageSize}
        </p>
        <DataTable
          {...args}
          sort={sort}
          onSortChange={setSort}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>
    );
  },
};

/**
 * In a narrow container the table scrolls horizontally. While it overflows, the scroll
 * container becomes a focusable region named by the caption, so keyboard users can scroll it.
 */
export const NarrowContainer: Story = {
  args: { columns: withBadges },
  render: (args) => (
    <div style={{ maxInlineSize: '22rem' }}>
      <DataTable {...args} />
    </div>
  ),
};

/** `captionHidden` keeps the table name for assistive technology only. */
export const HiddenCaption: Story = {
  args: { captionHidden: true },
};

const frenchHeaders: Record<string, string> = {
  name: 'Projet',
  region: 'Région',
  type: 'Type',
  capacity: 'Puissance (MW)',
};

/** All built-in strings can be replaced through `messages`; headers come from the columns. */
export const CustomMessages: Story = {
  args: {
    caption: 'Projets renouvelables',
    columns: columns.slice(0, 4).map((column) => ({
      ...column,
      header: frenchHeaders[column.id] ?? column.header,
    })),
    messages: {
      range: (start, end, total) =>
        total === 0 ? 'Aucun résultat' : `${String(start)}–${String(end)} sur ${String(total)}`,
      sorted: (header, direction) =>
        `Trié par ${header}, ${direction === 'ascending' ? 'croissant' : 'décroissant'}`,
      unsorted: 'Tri supprimé',
      rowsPerPage: 'Lignes par page',
      previous: 'Page précédente',
      next: 'Page suivante',
      pagination: 'Pagination',
      loading: 'Chargement',
    },
  },
};

/** In a `dir="rtl"` container the layout mirrors and the chevrons point the reading way. */
export const RightToLeft: Story = {
  args: { columns: columns.slice(0, 4) },
  render: (args) => (
    <div dir="rtl">
      <DataTable {...args} />
    </div>
  ),
};

/** The dark theme with status badges, to check header, border and badge contrast. */
export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  args: { columns: withBadges },
};
