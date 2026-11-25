import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'Components/VisuallyHidden',
  component: VisuallyHidden,
  // The MDX page replaces autodocs (enabled globally in .storybook/preview.tsx).
  tags: ['!autodocs'],
  args: {
    children: 'for the quarterly emissions report',
  },
  render: (args) => (
    <p>
      <a href="#report">
        Download <VisuallyHidden {...args} />
      </a>
      <span style={{ display: 'block', marginBlockStart: 'var(--gn-space-2)' }}>
        The link reads as &ldquo;Download for the quarterly emissions report&rdquo; to screen
        readers, but only &ldquo;Download&rdquo; is shown.
      </span>
    </p>
  ),
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
};
