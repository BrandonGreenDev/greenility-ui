import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  args: {
    size: 'md',
    label: 'Loading',
    decorative: false,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Medium: Story = { args: { size: 'md' } };

export const Large: Story = { args: { size: 'lg' } };

const row = { display: 'flex', alignItems: 'center', gap: 'var(--gn-space-4)' } as const;

export const Sizes: Story = {
  render: (args) => (
    <div style={row}>
      <Spinner {...args} size="sm" />
      <Spinner {...args} size="md" />
      <Spinner {...args} size="lg" />
    </div>
  ),
};

export const CustomLabel: Story = {
  args: { label: 'Saving report' },
};

/** Hidden from assistive technology; the surrounding UI conveys the busy state. */
export const Decorative: Story = {
  args: { decorative: true },
};

/** The arc uses `currentColor`, so it follows the surrounding text colour. */
export const InheritsColor: Story = {
  render: (args) => (
    <span style={{ color: 'var(--gn-color-accent-solid)' }}>
      <Spinner {...args} />
    </span>
  ),
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: Sizes.render,
};
