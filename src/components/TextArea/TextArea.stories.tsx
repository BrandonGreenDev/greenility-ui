import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextArea, type TextAreaProps } from './TextArea';

const meta = {
  title: 'Components/TextArea',
  component: TextArea,
  tags: ['autodocs'],
  args: {
    label: 'Site notes',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: 'Access details, hazards, contact on site' },
};

export const WithDescription: Story = {
  args: { description: 'Visible to everyone on the project.' },
};

export const Invalid: Story = {
  args: {
    description: 'Visible to everyone on the project.',
    invalid: true,
    errorMessage: 'Notes must be 500 characters or fewer.',
  },
};

export const Required: Story = {
  args: { required: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Gate code is on the site board.' },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: 'Gate code is on the site board.' },
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
      <TextArea {...args} size="sm" label="Small" />
      <TextArea {...args} size="md" label="Medium" />
      <TextArea {...args} size="lg" label="Large" />
    </div>
  ),
};

export const CustomRows: Story = {
  args: { rows: 6 },
};

/** Grows with its content in browsers that support `field-sizing: content`. */
export const AutoResize: Story = {
  args: {
    autoResize: true,
    rows: 2,
    description: 'Type several lines: the box grows instead of scrolling.',
    defaultValue: 'Line one\nLine two\nLine three',
  },
};

function ControlledTextArea(args: TextAreaProps) {
  const [value, setValue] = useState('Gate code is on the site board.');
  return (
    <div style={{ display: 'grid', gap: 'var(--gn-space-2)' }}>
      <TextArea {...args} value={value} onValueChange={setValue} />
      <p style={{ margin: 0 }}>Characters: {value.length}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledTextArea {...args} />,
};

export const DarkMode: Story = {
  args: {
    description: 'Visible to everyone on the project.',
    placeholder: 'Access details, hazards, contact on site',
  },
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      <TextArea {...args} />
      <TextArea {...args} label="Summary" invalid errorMessage="Add a summary." />
      <TextArea {...args} label="Archive" readOnly defaultValue="Read-only archive." />
      <TextArea {...args} label="Locked" disabled defaultValue="Disabled field." />
    </div>
  ),
};
