import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CheckIcon, CloseIcon } from '../Icon';
import { IconButton } from './IconButton';

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    label: 'Close',
    icon: <CloseIcon />,
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: false },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--gn-space-3)',
} as const;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Danger: Story = { args: { variant: 'danger', label: 'Remove item' } };

export const Small: Story = { args: { size: 'sm' } };

export const Medium: Story = { args: { size: 'md' } };

export const Large: Story = { args: { size: 'lg' } };

/** Keeps its name and focus while loading; clicks are ignored. */
export const Loading: Story = { args: { loading: true } };

export const Disabled: Story = { args: { disabled: true } };

export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
        <div key={variant} style={row}>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <IconButton
              key={size}
              {...args}
              variant={variant}
              size={size}
              label={`Approve (${variant}, ${size})`}
              icon={<CheckIcon />}
            />
          ))}
          <IconButton {...args} variant={variant} loading />
          <IconButton {...args} variant={variant} disabled />
        </div>
      ))}
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: AllVariants.render,
};
