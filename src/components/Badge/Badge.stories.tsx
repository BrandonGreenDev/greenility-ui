import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BadgeVariant, Size, Tone } from '../../utils/types';
import { Badge } from './Badge';

const tones: Tone[] = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const variants: BadgeVariant[] = ['subtle', 'solid'];
const sizes: Size[] = ['sm', 'md', 'lg'];

const labels: Record<Tone, string> = {
  neutral: 'Draft',
  accent: 'New',
  success: 'Verified',
  warning: 'Expiring',
  danger: 'Over budget',
  info: 'Beta',
};

const meta = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Verified',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NeutralSubtle: Story = {
  args: { tone: 'neutral', variant: 'subtle', children: 'Draft' },
};
export const NeutralSolid: Story = {
  args: { tone: 'neutral', variant: 'solid', children: 'Draft' },
};
export const AccentSubtle: Story = { args: { tone: 'accent', variant: 'subtle', children: 'New' } };
export const AccentSolid: Story = { args: { tone: 'accent', variant: 'solid', children: 'New' } };
export const SuccessSubtle: Story = {
  args: { tone: 'success', variant: 'subtle', children: 'Verified' },
};
export const SuccessSolid: Story = {
  args: { tone: 'success', variant: 'solid', children: 'Verified' },
};
export const WarningSubtle: Story = {
  args: { tone: 'warning', variant: 'subtle', children: 'Expiring' },
};
export const WarningSolid: Story = {
  args: { tone: 'warning', variant: 'solid', children: 'Expiring' },
};
export const DangerSubtle: Story = {
  args: { tone: 'danger', variant: 'subtle', children: 'Over budget' },
};
export const DangerSolid: Story = {
  args: { tone: 'danger', variant: 'solid', children: 'Over budget' },
};
export const InfoSubtle: Story = { args: { tone: 'info', variant: 'subtle', children: 'Beta' } };
export const InfoSolid: Story = { args: { tone: 'info', variant: 'solid', children: 'Beta' } };

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };

/** Every tone and variant at every size. */
export const Matrix: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-4)' }}>
      {sizes.map((size) =>
        variants.map((variant) => (
          <div
            key={`${size}-${variant}`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--gn-space-2)',
            }}
          >
            {tones.map((tone) => (
              <Badge key={tone} {...args} tone={tone} variant={variant} size={size}>
                {labels[tone]}
              </Badge>
            ))}
          </div>
        )),
      )}
    </div>
  ),
};

export const DarkMode: Story = {
  ...Matrix,
  parameters: { theme: 'dark' },
};
