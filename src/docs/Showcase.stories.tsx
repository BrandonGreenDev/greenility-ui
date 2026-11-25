import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Select,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
  type DataTableColumn,
} from '../index';
import styles from './Showcase.module.css';

/** A small original dataset, consistent with the DataTable stories. */
interface Site {
  id: string;
  name: string;
  type: 'Solar' | 'Wind' | 'Storage';
  capacityMw: number;
  status: 'Operational' | 'Construction' | 'Permitting';
}

const sites: Site[] = [
  { id: 's1', name: 'Riverside Solar', type: 'Solar', capacityMw: 48.5, status: 'Operational' },
  { id: 's2', name: 'North Ridge Wind', type: 'Wind', capacityMw: 120, status: 'Construction' },
  { id: 's3', name: 'Harbor Storage', type: 'Storage', capacityMw: 30, status: 'Permitting' },
  { id: 's4', name: 'Valley Solar II', type: 'Solar', capacityMw: 72.2, status: 'Operational' },
  { id: 's5', name: 'Coastal Wind', type: 'Wind', capacityMw: 95.4, status: 'Operational' },
  { id: 's6', name: 'Mesa Storage', type: 'Storage', capacityMw: 25, status: 'Construction' },
];

const statusTone = {
  Operational: 'success',
  Construction: 'warning',
  Permitting: 'info',
} as const;

const columns: DataTableColumn<Site>[] = [
  { id: 'name', header: 'Site', accessor: 'name', sortable: true, rowHeader: true },
  { id: 'type', header: 'Type', accessor: 'type', sortable: true },
  {
    id: 'capacity',
    header: 'Capacity (MW)',
    accessor: 'capacityMw',
    sortable: true,
    align: 'end',
    cell: (row) => row.capacityMw.toFixed(1),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    sortable: true,
    cell: (row) => (
      <Badge size="sm" tone={statusTone[row.status]}>
        {row.status}
      </Badge>
    ),
  },
];

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function Showcase() {
  const [alerts, setAlerts] = useState(true);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Site portfolio</h1>
          <p className={styles.subtitle}>Six sites · 391 MW installed</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary">Export</Button>
          <Button>Add site</Button>
          <Menu trigger={<IconButton variant="ghost" label="More actions" icon={<MoreIcon />} />}>
            <MenuItem>Rename portfolio</MenuItem>
            <MenuItem>Duplicate</MenuItem>
            <MenuSeparator />
            <MenuItem disabled>Archive</MenuItem>
          </Menu>
        </div>
      </header>

      <Alert tone="success" title="Riverside Solar is back online">
        Output returned to forecast at 09:40.
      </Alert>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="showcase-new-site">
          <h2 id="showcase-new-site" className={styles.cardTitle}>
            New site
          </h2>
          <TextField label="Site name" placeholder="e.g. Lakeside Solar" />
          <Select
            label="Technology"
            placeholder="Choose a technology"
            options={[
              { value: 'solar', label: 'Solar' },
              { value: 'wind', label: 'Wind' },
              { value: 'storage', label: 'Battery storage' },
            ]}
          />
          <TextField
            label="Capacity"
            description="In megawatts (MW)."
            invalid
            errorMessage="Enter a number above 0."
            defaultValue="0"
          />
          <Checkbox label="Grid connection approved" defaultChecked />
          <Switch label="Email me status alerts" checked={alerts} onCheckedChange={setAlerts} />
        </section>

        <section className={styles.card} aria-labelledby="showcase-sites">
          <h2 id="showcase-sites" className={styles.cardTitle}>
            Sites
          </h2>
          <Tabs defaultValue="all">
            <TabList aria-label="Filter sites">
              <Tab value="all">All</Tab>
              <Tab value="operational">Operational</Tab>
              <Tab value="pipeline">Pipeline</Tab>
            </TabList>
            <TabPanel value="all">
              <DataTable
                caption="All sites"
                captionHidden
                rows={sites}
                columns={columns}
                getRowId={(row) => row.id}
                defaultSort={{ columnId: 'capacity', direction: 'descending' }}
                defaultPageSize={5}
                pageSizeOptions={[5, 10]}
              />
            </TabPanel>
            <TabPanel value="operational">
              <DataTable
                caption="Operational sites"
                captionHidden
                rows={sites.filter((site) => site.status === 'Operational')}
                columns={columns}
                getRowId={(row) => row.id}
                paginated={false}
              />
            </TabPanel>
            <TabPanel value="pipeline">
              <DataTable
                caption="Sites in the pipeline"
                captionHidden
                rows={sites.filter((site) => site.status !== 'Operational')}
                columns={columns}
                getRowId={(row) => row.id}
                paginated={false}
              />
            </TabPanel>
          </Tabs>
        </section>
      </div>
    </div>
  );
}

const meta = {
  title: 'Showcase',
  component: Showcase,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Many components working together on one realistic screen. Use the toolbar to switch themes. */
export const Light: Story = {};

export const Dark: Story = { parameters: { theme: 'dark' } };
