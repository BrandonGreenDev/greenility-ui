import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Radio } from './Radio';
import { RadioGroup } from './RadioGroup';

const options = (
  <>
    <Radio value="monthly" label="Monthly" />
    <Radio value="quarterly" label="Quarterly" />
    <Radio value="yearly" label="Yearly" />
  </>
);

const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  subcomponents: { Radio },
  tags: ['autodocs'],
  args: {
    label: 'Reporting period',
    children: options,
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: 'quarterly' },
};

export const WithDescription: Story = {
  args: {
    description: 'How often we compile your emissions summary.',
    defaultValue: 'monthly',
  },
};

export const OptionDescriptions: Story = {
  args: {
    label: 'Offset strategy',
    defaultValue: 'reforest',
    children: (
      <>
        <Radio
          value="reforest"
          label="Reforestation"
          description="Fund native tree planting projects."
        />
        <Radio value="solar" label="Solar" description="Fund community solar installations." />
        <Radio value="none" label="No offsets" description="Track emissions only." />
      </>
    ),
  },
};

export const Required: Story = {
  args: { required: true },
};

export const Invalid: Story = {
  args: {
    required: true,
    invalid: true,
    defaultValue: 'monthly',
    description: 'How often we compile your emissions summary.',
    errorMessage: 'Choose a reporting period.',
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'monthly' },
};

export const DisabledOption: Story = {
  args: {
    defaultValue: 'monthly',
    children: (
      <>
        <Radio value="monthly" label="Monthly" />
        <Radio value="quarterly" label="Quarterly" />
        <Radio value="yearly" label="Yearly (Enterprise plan)" disabled />
      </>
    ),
  },
};

export const Controlled: Story = {
  render: function Render(args) {
    const [value, setValue] = useState('yearly');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
        <RadioGroup {...args} value={value} onValueChange={setValue} />
        <p style={{ margin: 0 }}>Selected: {value}</p>
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-6)' }}>
      <RadioGroup
        {...args}
        defaultValue="monthly"
        description="How often we compile your emissions summary."
      />
      <RadioGroup {...args} orientation="horizontal" invalid errorMessage="Choose a period." />
      <RadioGroup {...args} disabled defaultValue="quarterly" />
      <RadioGroup {...args} label="Offset strategy" required defaultValue="reforest">
        <Radio
          value="reforest"
          label="Reforestation"
          description="Fund native tree planting projects."
        />
        <Radio value="solar" label="Solar" description="Fund community solar installations." />
      </RadioGroup>
      <RadioGroup {...args} defaultValue="monthly">
        <Radio value="monthly" label="Monthly" />
        <Radio value="quarterly" label="Quarterly" />
        <Radio value="yearly" label="Yearly (Enterprise plan)" disabled />
      </RadioGroup>
    </div>
  ),
};

/** Right-to-left, in both orientations: circles sit on the right and dots stay centred. */
export const Rtl: Story = {
  render: (args) => (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-6)' }}>
      <RadioGroup {...args} label="فترة التقرير" defaultValue="monthly">
        <Radio value="monthly" label="شهري" />
        <Radio value="quarterly" label="ربع سنوي" description="كل ثلاثة أشهر." />
        <Radio value="yearly" label="سنوي" />
      </RadioGroup>
      <RadioGroup {...args} label="فترة التقرير" orientation="horizontal" defaultValue="yearly">
        <Radio value="monthly" label="شهري" />
        <Radio value="quarterly" label="ربع سنوي" />
        <Radio value="yearly" label="سنوي" />
      </RadioGroup>
    </div>
  ),
};
