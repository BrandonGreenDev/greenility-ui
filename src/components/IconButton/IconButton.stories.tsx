import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, within } from 'storybook/test';
import { CheckIcon, CloseIcon } from '../Icon';
import { IconButton } from './IconButton';

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  // The MDX page replaces autodocs (enabled globally in .storybook/preview.tsx).
  tags: ['!autodocs'],
  args: {
    label: 'Close',
    icon: <CloseIcon />,
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    tooltip: true,
    tooltipPlacement: 'top',
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    tooltipPlacement: { control: 'inline-radio', options: ['top', 'bottom', 'start', 'end'] },
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

/**
 * The label is shown as a tooltip on hover (after a short delay) and on keyboard focus. It is
 * decorative: the name already comes from `aria-label`, so it is not announced twice.
 */
export const TooltipOn: Story = {
  args: { variant: 'ghost', label: 'Open settings' },
  // Shows the tooltip on load (keyboard focus shows it at once), so the a11y run checks it.
  play: ({ canvasElement }) => {
    within(canvasElement).getByRole('button', { name: 'Open settings' }).focus();
  },
  decorators: [
    (Story) => (
      <div style={{ paddingBlockStart: 'var(--gn-space-12)' }}>
        <Story />
      </div>
    ),
  ],
};

/** `tooltip={false}` renders the button without a bubble, e.g. when a visible label is nearby. */
export const TooltipOff: Story = {
  args: { variant: 'ghost', label: 'Open settings', tooltip: false },
};

/** `tooltipPlacement` picks the preferred side; the tooltip still flips when there is no room. */
export const TooltipPlacements: Story = {
  render: (args) => (
    <div style={{ ...row, gap: 'var(--gn-space-16)', padding: 'var(--gn-space-12)' }}>
      {(['top', 'bottom', 'start', 'end'] as const).map((placement) => (
        <IconButton
          key={placement}
          {...args}
          variant="secondary"
          label={`Close (${placement})`}
          tooltipPlacement={placement}
        />
      ))}
    </div>
  ),
};

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

/** The tooltip shown on load in the dark theme. */
export const TooltipOnDarkMode: Story = {
  ...TooltipOn,
  parameters: { theme: 'dark' },
};
