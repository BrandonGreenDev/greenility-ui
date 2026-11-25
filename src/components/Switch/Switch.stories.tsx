import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from './Switch';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: {
    label: 'Low-carbon mode',
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = {
  args: { defaultChecked: true },
};

export const WithDescription: Story = {
  args: {
    description: 'Defers heavy background jobs to hours with cleaner grid energy.',
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledOn: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Controlled: Story = {
  render: function Render(args) {
    const [checked, setChecked] = useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
        <Switch {...args} checked={checked} onCheckedChange={setChecked} />
        <p style={{ margin: 0 }}>Low-carbon mode is {checked ? 'on' : 'off'}.</p>
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
      <Switch {...args} label="Off" />
      <Switch {...args} label="On" defaultChecked />
      <Switch {...args} label="With description" description="Helpful context." />
      <Switch {...args} label="Disabled" disabled />
      <Switch {...args} label="Disabled on" disabled defaultChecked />
    </div>
  ),
};

/** Right-to-left: the thumb starts on the right and slides left when on. */
export const Rtl: Story = {
  render: (args) => (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
      <Switch {...args} label="الوضع منخفض الكربون" />
      <Switch {...args} label="مفعل" defaultChecked />
      <Switch {...args} label="مع وصف" description="نص مساعد قصير." />
      <Switch {...args} label="معطل ومفعل" disabled defaultChecked />
    </div>
  ),
};
