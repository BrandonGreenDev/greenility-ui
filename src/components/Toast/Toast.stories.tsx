import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { AlertTone } from '../../utils/types';
import { Button } from '../Button';
import { Dialog, DialogClose } from '../Dialog';
import { NativeSelect } from '../NativeSelect';
import { useToast, type ToastOptions } from './ToastContext';
import { ToastProvider } from './ToastProvider';

const sample: Record<AlertTone, ToastOptions> = {
  neutral: { tone: 'neutral', title: 'Draft saved', description: 'Last edited just now.' },
  info: { tone: 'info', title: 'Sync started', description: 'Meter readings are importing.' },
  success: { tone: 'success', title: 'Report submitted', description: 'Q3 is with the auditor.' },
  warning: {
    tone: 'warning',
    title: 'Missing readings',
    description: 'Two sites have no data for September.',
  },
  danger: { tone: 'danger', title: 'Upload failed', description: 'The file is over 20 MB.' },
};

interface ShowButtonProps {
  options: ToastOptions;
  children: string;
}

function ShowButton({ options, children }: ShowButtonProps) {
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() => {
        toast.show(options);
      }}
    >
      {children}
    </Button>
  );
}

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: 'var(--gn-space-3)',
  padding: 'var(--gn-space-6)',
} as const;

const meta = {
  title: 'Components/Toast',
  component: ToastProvider,
  args: {
    children: null,
    duration: 6000,
    max: 3,
    hotkey: 'F8',
    dismissLabel: 'Dismiss',
  },
  argTypes: {
    children: { control: false },
  },
  // Every story gets its own provider from the args; stories render only the page content.
  decorators: [
    (Story, { args, parameters }) =>
      parameters.ownProvider ? (
        <Story />
      ) : (
        <ToastProvider {...args}>
          <Story />
        </ToastProvider>
      ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Wrap the app in `ToastProvider` and call `useToast().show(options)`. Press F8 to move focus to the newest toast, and F8 again to go back.',
      },
      // One iframe per story, so each has a single provider and a single F8 listener.
      story: { inline: false, iframeHeight: 420 },
    },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const clickButton =
  (...names: string[]): Story['play'] =>
  async ({ canvas, userEvent }) => {
    for (const name of names) {
      await userEvent.click(canvas.getByRole('button', { name }));
    }
  };

function toneStory(tone: AlertTone): Story {
  const label = `Show ${tone} toast`;
  return {
    render: () => (
      <div style={row}>
        <ShowButton options={sample[tone]}>{label}</ShowButton>
      </div>
    ),
    play: clickButton(label),
  };
}

/** Auto-dismisses after 6 s plus reading time for its text. */
export const Neutral = toneStory('neutral');
export const Info = toneStory('info');
export const Success = toneStory('success');
/** Warning toasts stay until dismissed (no auto-dismiss by default). */
export const Warning = toneStory('warning');
/** Danger toasts stay until dismissed (no auto-dismiss by default). */
export const Danger = toneStory('danger');

/** Up to `max` toasts show at once; the newest is closest to the corner. */
export const AllTones: Story = {
  args: { max: 5, duration: Number.POSITIVE_INFINITY },
  render: () => (
    <div style={row}>
      {(Object.keys(sample) as AlertTone[]).map((tone) => (
        <ShowButton key={tone} options={sample[tone]}>{`Show ${tone} toast`}</ShowButton>
      ))}
    </div>
  ),
  play: clickButton(
    'Show neutral toast',
    'Show info toast',
    'Show success toast',
    'Show warning toast',
    'Show danger toast',
  ),
};

/**
 * A toast with an action does not auto-dismiss. It shows the hotkey, and its announcement
 * ends with the hotkey hint, so keyboard and screen reader users know how to reach it.
 */
export const WithAction: Story = {
  render: () => (
    <div style={row}>
      <ShowButton
        options={{
          tone: 'success',
          title: '3 invoices deleted',
          action: { label: 'Undo', onAction: fn() },
        }}
      >
        Delete invoices
      </ShowButton>
    </div>
  ),
  play: clickButton('Delete invoices'),
};

/** `duration: Infinity` keeps a toast until the user dismisses it. */
export const Persistent: Story = {
  render: () => (
    <div style={row}>
      <ShowButton
        options={{
          tone: 'info',
          title: 'New emission factors available',
          description: 'They apply from the next reporting period.',
          duration: Number.POSITIVE_INFINITY,
        }}
      >
        Show persistent toast
      </ShowButton>
    </div>
  ),
  play: clickButton('Show persistent toast'),
};

const durationChoices = [
  { value: '4000', label: 'Short (4 s)' },
  { value: '6000', label: 'Normal (6 s)' },
  { value: '12000', label: 'Long (12 s)' },
  { value: 'never', label: 'Never: keep until dismissed' },
];

/**
 * WCAG 2.2.1: apps should let users adjust or turn off the timing. Here a user preference
 * feeds the provider `duration`; "Never" passes `Infinity`.
 */
export const UserPreference: Story = {
  parameters: { ownProvider: true },
  render: function UserPreferenceStory(args) {
    const [choice, setChoice] = useState('6000');
    return (
      <ToastProvider
        {...args}
        duration={choice === 'never' ? Number.POSITIVE_INFINITY : Number(choice)}
      >
        <div style={row}>
          <NativeSelect
            label="Hide notifications after"
            value={choice}
            onValueChange={(value) => {
              setChoice(value);
            }}
          >
            {durationChoices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <ShowButton options={sample.success}>Show toast</ShowButton>
        </div>
      </ToastProvider>
    );
  },
};

/** With `max={2}`, extra toasts wait in the queue; a "more" line shows how many. */
export const Queue: Story = {
  args: { max: 2, duration: Number.POSITIVE_INFINITY },
  render: () => (
    <div style={row}>
      <ShowButton options={sample.info}>Show first</ShowButton>
      <ShowButton options={sample.success}>Show second</ShowButton>
      <ShowButton options={sample.neutral}>Show third (queued)</ShowButton>
    </div>
  ),
  play: clickButton('Show first', 'Show second', 'Show third (queued)'),
};

/** Every built-in string can be replaced, e.g. for localisation. */
export const CustomLabels: Story = {
  args: {
    label: 'Meldingen (F8)',
    dismissLabel: 'Sluiten',
    actionHint: 'Druk op F8 om naar de meldingen te gaan.',
    queueLabel: (count) => `nog ${String(count)}`,
  },
  render: () => (
    <div style={row}>
      <ShowButton
        options={{
          tone: 'success',
          toneLabel: 'Gelukt',
          title: 'Rapport verzonden',
          action: { label: 'Bekijken', onAction: fn() },
        }}
      >
        Toon melding
      </ShowButton>
    </div>
  ),
  play: clickButton('Toon melding'),
};

/**
 * While a modal Dialog is open the page is inert, so the toast region moves into the
 * dialog (at the top, clear of its footer): the toast stays clickable and is announced.
 */
export const FromInsideDialog: Story = {
  render: () => (
    <div style={row}>
      <Dialog
        title="Share report"
        description="Anyone with the link can view the Q3 report."
        trigger={<Button>Share report</Button>}
        footer={<DialogClose>Done</DialogClose>}
      >
        <ShowButton
          options={{
            tone: 'success',
            title: 'Link copied',
            action: { label: 'Undo', onAction: fn() },
          }}
        >
          Copy link
        </ShowButton>
      </Dialog>
    </div>
  ),
  play: clickButton('Share report', 'Copy link'),
};

export const DarkMode: Story = {
  ...AllTones,
  parameters: { theme: 'dark' },
};
