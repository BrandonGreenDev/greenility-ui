import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    label: 'Email me the monthly impact report',
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { defaultChecked: 'indeterminate', label: 'All reports' },
};

export const WithDescription: Story = {
  args: {
    description: 'Sent on the first working day of each month. Unsubscribe at any time.',
  },
};

export const Required: Story = {
  args: { label: 'I accept the data processing terms', required: true },
};

export const Invalid: Story = {
  args: {
    label: 'I accept the data processing terms',
    required: true,
    invalid: true,
    errorMessage: 'Accept the terms to continue.',
  },
};

export const InvalidWithDescription: Story = {
  args: {
    label: 'I accept the data processing terms',
    description: 'We only use your data to calculate your footprint.',
    required: true,
    invalid: true,
    errorMessage: 'Accept the terms to continue.',
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const DisabledIndeterminate: Story = {
  args: { disabled: true, defaultChecked: 'indeterminate' },
};

const reports = ['Energy', 'Water', 'Waste'] as const;

/** A controlled "select all" parent whose state is derived from its children. */
export const ControlledSelectAll: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<string[]>(['Energy']);
    const all = selected.length === reports.length;
    const none = selected.length === 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-2)' }}>
        <Checkbox
          label="All reports"
          checked={all ? true : none ? false : 'indeterminate'}
          onCheckedChange={(checked) => {
            setSelected(checked ? [...reports] : []);
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--gn-space-2)',
            paddingInlineStart: 'var(--gn-space-6)',
          }}
        >
          {reports.map((report) => (
            <Checkbox
              key={report}
              label={report}
              checked={selected.includes(report)}
              onCheckedChange={(checked) => {
                setSelected((prev) =>
                  checked ? [...prev, report] : prev.filter((item) => item !== report),
                );
              }}
            />
          ))}
        </div>
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
      <Checkbox {...args} label="Unchecked" />
      <Checkbox {...args} label="Checked" defaultChecked />
      <Checkbox {...args} label="Indeterminate" defaultChecked="indeterminate" />
      <Checkbox {...args} label="With description" description="Helpful context." />
      <Checkbox
        {...args}
        label="Invalid"
        invalid
        required
        errorMessage="Accept the terms to continue."
      />
      <Checkbox {...args} label="Disabled" disabled />
      <Checkbox {...args} label="Disabled checked" disabled defaultChecked />
      <Checkbox {...args} label="Disabled indeterminate" disabled defaultChecked="indeterminate" />
    </div>
  ),
};

/** Right-to-left: the box sits on the right and the glyphs stay centred. */
export const Rtl: Story = {
  render: (args) => (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
      <Checkbox {...args} label="غير محدد" />
      <Checkbox {...args} label="محدد" defaultChecked />
      <Checkbox {...args} label="جزئي" defaultChecked="indeterminate" />
      <Checkbox {...args} label="مع وصف" description="نص مساعد قصير." />
      <Checkbox {...args} label="غير صالح" invalid errorMessage="هذا الحقل مطلوب." />
    </div>
  ),
};
