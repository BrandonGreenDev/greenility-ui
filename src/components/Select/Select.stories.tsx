import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select, type SelectProps } from './Select';

const regionOptions = (
  <>
    <option value="north">North</option>
    <option value="east">East</option>
    <option value="south">South</option>
    <option value="west">West</option>
  </>
);

const meta = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    label: 'Region',
    children: regionOptions,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    children: { control: false },
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

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: 'Choose a region' },
};

export const WithDescription: Story = {
  args: { description: 'Used to pick the nearest grid operator.' },
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

export const Small: Story = {
  args: { size: 'sm' },
};

export const Medium: Story = {
  args: { size: 'md' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      <Select {...args} size="sm" label="Small" />
      <Select {...args} size="md" label="Medium" />
      <Select {...args} size="lg" label="Large" />
    </div>
  ),
};

export const WithGroups: Story = {
  args: {
    label: 'Energy source',
    placeholder: 'Choose a source',
    children: (
      <>
        <optgroup label="Renewable">
          <option value="solar">Solar</option>
          <option value="wind">Wind</option>
          <option value="hydro">Hydro</option>
        </optgroup>
        <optgroup label="Other">
          <option value="gas">Natural gas</option>
          <option value="nuclear">Nuclear</option>
        </optgroup>
      </>
    ),
  },
};

function ControlledSelect(args: SelectProps) {
  const [value, setValue] = useState('south');
  return (
    <div style={{ display: 'grid', gap: 'var(--gn-space-2)' }}>
      <Select {...args} value={value} onValueChange={setValue} />
      <p style={{ margin: 0 }}>Selected: {value}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledSelect {...args} />,
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
    </div>
  ),
};
