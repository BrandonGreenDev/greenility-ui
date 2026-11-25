import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '../Button';
import { Alert } from './Alert';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: {
    tone: 'info',
    live: 'off',
    title: 'Scheduled maintenance',
    children: 'Reporting will be read-only on Saturday from 02:00 to 04:00 UTC.',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'success', 'warning', 'danger', 'neutral'] },
    live: { control: 'inline-radio', options: ['off', 'polite', 'assertive'] },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: {
    tone: 'success',
    title: 'Report submitted',
    children: 'Your Q3 emissions report was sent for review.',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Missing meter readings',
    children: 'Three sites have no readings for September. Totals may be underestimated.',
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Upload failed',
    children: 'The file is larger than 20 MB. Split it and try again.',
  },
};

/** Neutral has no hidden tone prefix by default. */
export const Neutral: Story = {
  args: {
    tone: 'neutral',
    title: 'Draft',
    children: 'This report has not been shared with anyone yet.',
  },
};

export const TitleOnly: Story = {
  args: { title: 'Your changes were saved.', children: undefined, tone: 'success' },
};

export const BodyOnly: Story = {
  args: { title: undefined, children: 'Data refreshes every 15 minutes.' },
};

export const CustomToneLabel: Story = {
  args: { tone: 'warning', toneLabel: 'Caution', title: 'Estimated values' },
};

export const Dismissible: Story = {
  args: { onDismiss: fn() },
};

export const CustomDismissLabel: Story = {
  args: { onDismiss: fn(), dismissLabel: 'Hide maintenance notice' },
};

/** `role="status"`. Keep the Alert mounted and swap its content so the update is announced. */
export const LivePolite: Story = {
  render: function LivePoliteStory(args) {
    const [count, setCount] = useState(0);
    return (
      <div style={{ display: 'grid', gap: 'var(--gn-space-3)', justifyItems: 'start' }}>
        <Button
          variant="secondary"
          onClick={() => {
            setCount((c) => c + 1);
          }}
        >
          Save draft
        </Button>
        <Alert {...args} live="polite" tone="success" title={undefined}>
          {count === 0 ? 'No changes saved yet.' : `Draft saved (${String(count)}).`}
        </Alert>
      </div>
    );
  },
};

/** `role="alert"`: interrupts the user, so only for urgent, time-sensitive messages. */
export const LiveAssertive: Story = {
  args: {
    live: 'assertive',
    tone: 'danger',
    title: 'Session expiring',
    children: 'You will be signed out in 2 minutes. Save your work.',
  },
};

/** The Alert does not hide itself or manage focus; the consumer does both. */
export const DismissAndMoveFocus: Story = {
  render: function DismissStory(args) {
    const [open, setOpen] = useState(true);
    const headingRef = useRef<HTMLHeadingElement>(null);
    return (
      <section style={{ display: 'grid', gap: 'var(--gn-space-3)', justifyItems: 'start' }}>
        <h3 ref={headingRef} tabIndex={-1} style={{ margin: 0 }}>
          Site overview
        </h3>
        {open ? (
          <Alert
            {...args}
            onDismiss={() => {
              setOpen(false);
              headingRef.current?.focus();
            }}
          />
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(true);
            }}
          >
            Show notice again
          </Button>
        )}
      </section>
    );
  },
};

export const AllTones: Story = {
  args: { onDismiss: fn() },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--gn-space-3)' }}>
      {(['info', 'success', 'warning', 'danger', 'neutral'] as const).map((tone) => (
        <Alert key={tone} {...args} tone={tone} title={`${tone} title`} />
      ))}
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  args: AllTones.args,
  render: AllTones.render,
};
