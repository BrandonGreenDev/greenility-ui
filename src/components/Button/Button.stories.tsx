import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CheckIcon, ChevronDownIcon } from '../Icon';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save changes',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    startIcon: { control: false },
    endIcon: { control: false },
  },
} satisfies Meta<typeof Button>;

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

export const Danger: Story = { args: { variant: 'danger', children: 'Delete project' } };

export const Small: Story = { args: { size: 'sm' } };

export const Medium: Story = { args: { size: 'md' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithStartIcon: Story = {
  args: { startIcon: <CheckIcon />, children: 'Approve' },
};

export const WithEndIcon: Story = {
  args: { endIcon: <ChevronDownIcon />, children: 'More options' },
};

/** Stays focusable with `aria-disabled="true"`; clicks are ignored. */
export const Loading: Story = { args: { loading: true } };

/** Native `disabled`: skipped by Tab. */
export const Disabled: Story = { args: { disabled: true } };

/** When both are set, `disabled` wins: native disabled, no spinner, no `aria-disabled`. */
export const LoadingAndDisabled: Story = { args: { loading: true, disabled: true } };

/** `loadingLabel` is exposed as the accessible description while loading. */
export const CustomLoadingLabel: Story = {
  args: { loading: true, loadingLabel: 'Saving your changes' },
};

export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
        <div key={variant} style={row}>
          <Button {...args} variant={variant}>
            {variant}
          </Button>
          <Button {...args} variant={variant} startIcon={<CheckIcon />}>
            With icon
          </Button>
          <Button {...args} variant={variant} loading>
            Loading
          </Button>
          <Button {...args} variant={variant} disabled>
            Disabled
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div style={row}>
      <Button {...args} size="sm" startIcon={<CheckIcon />}>
        Small
      </Button>
      <Button {...args} size="md" startIcon={<CheckIcon />}>
        Medium
      </Button>
      <Button {...args} size="lg" startIcon={<CheckIcon />}>
        Large
      </Button>
      <Button {...args} size="sm" loading>
        Small
      </Button>
      <Button {...args} size="md" loading>
        Medium
      </Button>
      <Button {...args} size="lg" loading>
        Large
      </Button>
    </div>
  ),
};

/** `type="submit"` submits the form; the default `type="button"` never does. */
export const InForm: Story = {
  render: (args) => (
    <form
      style={row}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Button {...args} type="submit">
        Submit
      </Button>
      <Button {...args} variant="ghost" type="reset">
        Reset
      </Button>
    </form>
  ),
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  render: AllVariants.render,
};
