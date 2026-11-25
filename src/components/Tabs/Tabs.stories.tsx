import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

const sections = [
  {
    value: 'overview',
    label: 'Overview',
    body: 'Total footprint for the reporting period, with the change against last year.',
  },
  {
    value: 'energy',
    label: 'Energy',
    body: 'Electricity and heating use per site, split by renewable and fossil sources.',
  },
  {
    value: 'travel',
    label: 'Travel',
    body: 'Business travel by mode: rail, road and air, with distance and emissions.',
  },
  {
    value: 'waste',
    label: 'Waste',
    body: 'Landfill, recycling and compost volumes, and the diversion rate.',
  },
];

function Sections({ disabled }: { disabled?: string }) {
  return (
    <>
      <TabList aria-label="Emissions report">
        {sections.map((section) => (
          <Tab key={section.value} value={section.value} disabled={section.value === disabled}>
            {section.label}
          </Tab>
        ))}
      </TabList>
      {sections.map((section) => (
        <TabPanel key={section.value} value={section.value}>
          <p style={{ margin: 0 }}>{section.body}</p>
        </TabPanel>
      ))}
    </>
  );
}

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  subcomponents: { TabList, Tab, TabPanel },
  args: {
    children: <Sections />,
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Arrow keys move focus and select at once. */
export const AutomaticActivation: Story = {};

/** Arrow keys only move focus; Enter or Space selects the focused tab. */
export const ManualActivation: Story = {
  args: { activation: 'manual' },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: 'travel' },
};

/** The list sits beside the panels and ArrowUp/ArrowDown navigate. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

/** Disabled tabs are skipped by the arrow keys and cannot be clicked. */
export const DisabledTab: Story = {
  args: { children: <Sections disabled="energy" /> },
};

/** The first tab is disabled, so the first enabled tab is selected by default. */
export const FirstTabDisabled: Story = {
  args: { children: <Sections disabled="overview" /> },
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** More tabs than fit: the list scrolls horizontally and focused tabs scroll into view. */
export const ManyTabs: Story = {
  args: {
    children: (
      <>
        <TabList aria-label="Month">
          {months.map((month) => (
            <Tab key={month} value={month}>
              {month}
            </Tab>
          ))}
        </TabList>
        {months.map((month) => (
          <TabPanel key={month} value={month}>
            <p style={{ margin: 0 }}>Emissions recorded in {month}.</p>
          </TabPanel>
        ))}
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '24rem' }}>
        <Story />
      </div>
    ),
  ],
};

/** The selected tab starts out of view, so the list scrolls to it (the page does not). */
export const ManyTabsLateSelection: Story = {
  ...ManyTabs,
  args: { ...ManyTabs.args, defaultValue: 'October' },
};

/** Horizontal Tabs inside a vertical Tabs panel keep their own layout and keys. */
export const NestedInVertical: Story = {
  args: {
    orientation: 'vertical',
    children: (
      <>
        <TabList aria-label="Site">
          <Tab value="berlin">Berlin</Tab>
          <Tab value="lisbon">Lisbon</Tab>
        </TabList>
        <TabPanel value="berlin" tabIndex={-1}>
          <Tabs>
            <Sections />
          </Tabs>
        </TabPanel>
        <TabPanel value="lisbon">
          <p style={{ margin: 0 }}>No data for Lisbon yet.</p>
        </TabPanel>
      </>
    ),
  },
};

/** In right-to-left text ArrowLeft moves to the next tab. Direction is read from `dir`. */
export const RightToLeft: Story = {
  args: {
    children: (
      <>
        <TabList aria-label="تقرير الانبعاثات">
          <Tab value="overview">نظرة عامة</Tab>
          <Tab value="energy">الطاقة</Tab>
          <Tab value="travel">السفر</Tab>
        </TabList>
        <TabPanel value="overview">
          <p style={{ margin: 0 }}>إجمالي البصمة الكربونية لفترة التقرير.</p>
        </TabPanel>
        <TabPanel value="energy">
          <p style={{ margin: 0 }}>استهلاك الكهرباء والتدفئة لكل موقع.</p>
        </TabPanel>
        <TabPanel value="travel">
          <p style={{ margin: 0 }}>رحلات العمل حسب وسيلة النقل.</p>
        </TabPanel>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
};

export const VerticalRightToLeft: Story = {
  ...RightToLeft,
  args: { ...RightToLeft.args, orientation: 'vertical' },
};

/** The parent owns the selected value. */
export const Controlled: Story = {
  render: function Render(args) {
    const [value, setValue] = useState('energy');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
        <Tabs {...args} value={value} onValueChange={setValue} />
        <p style={{ margin: 0 }}>
          Selected: <code>{value}</code>{' '}
          <button
            type="button"
            onClick={() => {
              setValue('overview');
            }}
          >
            Reset to Overview
          </button>
        </p>
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-8)' }}>
      <Tabs {...args}>
        <Sections disabled="waste" />
      </Tabs>
      <Tabs {...args} orientation="vertical">
        <Sections />
      </Tabs>
    </div>
  ),
};
