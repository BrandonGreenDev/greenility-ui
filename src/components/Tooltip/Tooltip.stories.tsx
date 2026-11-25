import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { Placement } from '../../utils/types';
import { Button } from '../Button';
import { CloseIcon } from '../Icon';
import { IconButton } from '../IconButton';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'Components/Tooltip',
  tags: ['!autodocs'],
  component: Tooltip,
  args: {
    content: 'Saves a draft you can finish later',
    placement: 'top',
    delay: 500,
    disabled: false,
    decorative: false,
    onOpenChange: fn(),
    children: <Button variant="secondary">Save draft</Button>,
  },
  argTypes: {
    placement: { control: 'inline-radio', options: ['top', 'bottom', 'start', 'end'] },
    children: { control: false },
    content: { control: 'text' },
  },
  decorators: [
    (Story) => (
      // Room on every side so each placement is visible without flipping.
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minBlockSize: 'calc(4 * var(--gn-space-16))',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover (after the delay) or Tab to the button. The tooltip text becomes its description. */
export const OnButtonWithDescription: Story = {};

/** `defaultOpen` keeps the bubble visible for the placement stories. */
export const Top: Story = { args: { placement: 'top', defaultOpen: true } };

export const Bottom: Story = { args: { placement: 'bottom', defaultOpen: true } };

/** `start` is the inline-start side: left in LTR, right in RTL. */
export const Start: Story = { args: { placement: 'start', defaultOpen: true } };

export const End: Story = { args: { placement: 'end', defaultOpen: true } };

const placements: Placement[] = ['top', 'bottom', 'start', 'end'];

export const AllPlacements: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gn-space-16)' }}>
      {placements.map((placement) => (
        <Tooltip key={placement} {...args} placement={placement} content={placement} defaultOpen>
          <Button variant="secondary">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

/** Wraps at `--gn-size-tooltip-max-width`. Keep tooltips short; long help belongs on the page. */
export const LongText: Story = {
  args: {
    defaultOpen: true,
    placement: 'bottom',
    content:
      'Scope 3 covers indirect emissions across the value chain, such as purchased goods, business travel and the use of sold products. Long hints wrap instead of overflowing the viewport.',
  },
};

/** `start`/`end` follow the nearest `[dir]`: here `start` opens on the right. */
export const RightToLeft: Story = {
  args: { placement: 'start', defaultOpen: true, content: 'يحفظ مسودة' },
  render: (args) => (
    <div dir="rtl">
      <Tooltip {...args}>
        <Button variant="secondary">حفظ المسودة</Button>
      </Tooltip>
    </div>
  ),
};

/**
 * `decorative` hides the bubble from assistive technology. Use it only when the text repeats
 * the trigger's name, as IconButton does with its label.
 */
export const Decorative: Story = {
  args: { decorative: true, content: 'Close', defaultOpen: true },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="ghost" aria-label="Close" startIcon={<CloseIcon />}>
        {null}
      </Button>
    </Tooltip>
  ),
};

/** IconButton shows its label as a decorative tooltip by default. */
export const IconButtonTooltip: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--gn-space-3)' }}>
      <IconButton variant="ghost" label="Close (tooltip on)" icon={<CloseIcon />} />
      <IconButton
        variant="ghost"
        label="Close (tooltip off)"
        icon={<CloseIcon />}
        tooltip={false}
      />
    </div>
  ),
};

/** `disabled` renders the child unchanged: no bubble and no description. */
export const Disabled: Story = { args: { disabled: true } };

/** Controlled with `open` and `onOpenChange`. Escape, leaving and blur still request a close. */
export const Controlled: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ display: 'flex', gap: 'var(--gn-space-3)', alignItems: 'center' }}>
        <Tooltip {...args} open={open} onOpenChange={setOpen}>
          <Button variant="secondary">Save draft</Button>
        </Tooltip>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {open ? 'Hide' : 'Show'} tooltip
        </Button>
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  args: { defaultOpen: true },
};
