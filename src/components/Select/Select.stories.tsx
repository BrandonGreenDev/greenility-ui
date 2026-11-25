import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type SyntheticEvent } from 'react';
import { userEvent, within } from 'storybook/test';
import { Button } from '../Button';
import type { SelectOption, SelectOptionGroup } from './options';
import { Select, type SelectProps } from './Select';

const regions: SelectOption[] = [
  { value: 'north', label: 'North' },
  { value: 'east', label: 'East' },
  { value: 'south', label: 'South' },
  { value: 'west', label: 'West' },
];

const sources: SelectOptionGroup[] = [
  {
    label: 'Renewable',
    options: [
      { value: 'solar', label: 'Solar' },
      { value: 'wind', label: 'Wind' },
      { value: 'hydro', label: 'Hydro' },
      { value: 'geothermal', label: 'Geothermal' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'gas', label: 'Natural gas' },
      { value: 'nuclear', label: 'Nuclear' },
      { value: 'coal', label: 'Coal', disabled: true },
    ],
  },
];

const countries: SelectOption[] = [
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Iceland',
  'Ireland',
  'Italy',
  'Latvia',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Norway',
  'Poland',
  'Portugal',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
  'Switzerland',
].map((name) => ({ value: name.toLowerCase(), label: name }));

const meta = {
  title: 'Components/Select',
  tags: ['!autodocs'],
  component: Select,
  args: {
    label: 'Region',
    options: regions,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    options: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: 'east' },
};

export const WithPlaceholder: Story = {
  args: { placeholder: 'Choose a region' },
};

export const WithDescription: Story = {
  args: {
    placeholder: 'Choose a region',
    description: 'Used to pick the nearest grid operator.',
  },
};

export const Invalid: Story = {
  args: {
    placeholder: 'Choose a region',
    description: 'Used to pick the nearest grid operator.',
    invalid: true,
    errorMessage: 'Choose a region.',
  },
};

export const Required: Story = {
  args: { placeholder: 'Choose a region', required: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'east' },
};

export const DisabledOptions: Story = {
  args: {
    label: 'Delivery slot',
    placeholder: 'Choose a slot',
    description: 'Fully booked slots are skipped by the arrow keys.',
    options: [
      { value: 'morning', label: 'Morning (8–12)' },
      { value: 'midday', label: 'Midday (12–14)', disabled: true },
      { value: 'afternoon', label: 'Afternoon (14–18)' },
      { value: 'evening', label: 'Evening (18–21)', disabled: true },
    ],
  },
};

export const WithGroups: Story = {
  args: {
    label: 'Energy source',
    placeholder: 'Choose a source',
    options: sources,
  },
};

/** Thirty-one options: the list scrolls, PageUp/PageDown move by 10 and typing jumps (try "s", "sw"). */
export const ManyOptions: Story = {
  args: {
    label: 'Country',
    placeholder: 'Choose a country',
    description: 'Type to jump to a country.',
    options: countries,
  },
};

export const Small: Story = {
  args: { size: 'sm', defaultValue: 'east' },
};

export const Medium: Story = {
  args: { size: 'md', defaultValue: 'east' },
};

export const Large: Story = {
  args: { size: 'lg', defaultValue: 'east' },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      <Select {...args} size="sm" label="Small" placeholder="Choose a region" />
      <Select {...args} size="md" label="Medium" placeholder="Choose a region" />
      <Select {...args} size="lg" label="Large" placeholder="Choose a region" />
    </div>
  ),
};

function ControlledSelect(args: SelectProps) {
  const [value, setValue] = useState('south');
  return (
    <div style={{ display: 'grid', gap: 'var(--gn-space-2)' }}>
      <Select {...args} value={value} onValueChange={setValue} />
      <p style={{ margin: 0 }}>Selected: {value || '(none)'}</p>
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setValue('');
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

export const Controlled: Story = {
  args: { placeholder: 'Choose a region' },
  render: (args) => <ControlledSelect {...args} />,
};

function FormSelect(args: SelectProps) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitted(JSON.stringify(Object.fromEntries(data.entries())));
  };
  return (
    <form
      onSubmit={onSubmit}
      onReset={() => {
        setSubmitted(null);
      }}
      style={{ display: 'grid', gap: 'var(--gn-space-4)' }}
    >
      <Select {...args} />
      <div style={{ display: 'flex', gap: 'var(--gn-space-2)' }}>
        <Button type="submit">Submit</Button>
        <Button type="reset" variant="secondary">
          Reset
        </Button>
      </div>
      <output aria-live="polite">{submitted ? `Submitted: ${submitted}` : 'Not submitted'}</output>
    </form>
  );
}

/** The value is submitted through a hidden input; Reset restores `defaultValue`. */
export const InForm: Story = {
  args: {
    label: 'Energy source',
    name: 'source',
    defaultValue: 'wind',
    options: sources,
  },
  render: (args) => <FormSelect {...args} />,
};

export const RightToLeft: Story = {
  args: {
    label: 'المنطقة',
    placeholder: 'اختر منطقة',
    description: 'تُستخدم لاختيار أقرب مشغل للشبكة.',
    options: [
      { value: 'north', label: 'الشمال' },
      { value: 'east', label: 'الشرق' },
      { value: 'south', label: 'الجنوب' },
      { value: 'west', label: 'الغرب' },
    ],
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
};

/** Placed at the bottom of the viewport: the list flips above the box when there is no room below. */
export const NearViewportBottom: Story = {
  args: {
    label: 'Country',
    placeholder: 'Choose a country',
    options: countries,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          minBlockSize: 'calc(100vh - 2 * var(--gn-space-6))',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

/**
 * Opens the list on load (selected, active, grouped and disabled options) so the a11y run
 * checks the open state. Left out of the docs page, where an open popover would cover it.
 */
export const Open: Story = {
  tags: ['!autodocs'],
  args: {
    label: 'Energy source',
    defaultValue: 'wind',
    options: sources,
  },
  play: async ({ canvasElement }) => {
    const combobox = within(canvasElement).getByRole('combobox');
    await userEvent.click(combobox);
    // Move the active option off the selected one so both styles show.
    await userEvent.keyboard('{ArrowDown}');
  },
};

export const OpenDarkMode: Story = {
  ...Open,
  parameters: { theme: 'dark' },
};

export const DarkMode: Story = {
  args: {
    placeholder: 'Choose a region',
    description: 'Used to pick the nearest grid operator.',
  },
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      <Select {...args} />
      <Select {...args} label="Region (selected)" defaultValue="west" />
      <Select {...args} label="Region (required)" required />
      <Select {...args} label="Region (invalid)" invalid errorMessage="Choose a region." />
      <Select {...args} label="Region (disabled)" disabled />
      <Select
        {...args}
        label="Energy source (groups)"
        placeholder="Choose a source"
        description="Grouped options."
        options={sources}
      />
    </div>
  ),
};
