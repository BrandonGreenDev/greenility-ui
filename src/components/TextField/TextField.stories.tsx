import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { IconButton } from '../IconButton';
import { CloseIcon, InfoIcon } from '../Icon';
import { TextField, type TextFieldProps } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: {
    label: 'Project name',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'tel', 'url', 'number'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '20rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: 'e.g. Riverside solar farm' },
};

export const WithDescription: Story = {
  args: { description: 'Shown on reports and invoices.' },
};

export const Invalid: Story = {
  args: {
    description: 'Shown on reports and invoices.',
    invalid: true,
    errorMessage: 'Enter a project name.',
  },
};

export const Required: Story = {
  args: { required: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Riverside solar farm' },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: 'Riverside solar farm' },
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
      <TextField {...args} size="sm" label="Small" />
      <TextField {...args} size="md" label="Medium" />
      <TextField {...args} size="lg" label="Large" />
    </div>
  ),
};

export const WithAdornments: Story = {
  args: {
    label: 'Carbon offset budget (USD per tonne)',
    type: 'number',
    inputMode: 'decimal',
    startAdornment: '$',
    endAdornment: 'per t',
    defaultValue: '25',
  },
};

export const WithIconAdornment: Story = {
  args: {
    label: 'Site reference',
    description: 'Found on the meter label.',
    startAdornment: <InfoIcon />,
  },
};

function ClearableSearch(args: TextFieldProps) {
  const [value, setValue] = useState('wind');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <TextField
      {...args}
      ref={inputRef}
      type="search"
      value={value}
      onValueChange={setValue}
      endAdornment={
        value ? (
          <IconButton
            size="sm"
            variant="ghost"
            label="Clear search"
            icon={<CloseIcon />}
            onClick={() => {
              setValue('');
              // The button unmounts once the value is empty, so return focus to the input.
              inputRef.current?.focus();
            }}
          />
        ) : null
      }
    />
  );
}

/** An interactive end adornment stays in the tab order after the input. Clearing returns focus to the input. */
export const WithInteractiveAdornment: Story = {
  args: { label: 'Search projects' },
  render: (args) => <ClearableSearch {...args} />,
};

function ControlledTextField(args: TextFieldProps) {
  const [value, setValue] = useState('Riverside solar farm');
  return (
    <div style={{ display: 'grid', gap: 'var(--gn-space-2)' }}>
      <TextField {...args} value={value} onValueChange={setValue} />
      <p style={{ margin: 0 }}>Value: {value}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledTextField {...args} />,
};

export const Password: Story = {
  args: { label: 'Password', type: 'password', required: true, autoComplete: 'new-password' },
};

export const DarkMode: Story = {
  args: {
    description: 'Shown on reports and invoices.',
    placeholder: 'e.g. Riverside solar farm',
  },
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      <TextField {...args} />
      <TextField {...args} label="Budget (USD)" startAdornment="$" endAdornment="USD" />
      <TextField {...args} label="Name" invalid errorMessage="Enter a project name." />
      <TextField {...args} label="Reference" readOnly defaultValue="GN-2041" />
      <TextField {...args} label="Locked" disabled defaultValue="Riverside solar farm" />
    </div>
  ),
};
