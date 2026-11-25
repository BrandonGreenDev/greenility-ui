import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '../Button';
import { AlertDialog } from './AlertDialog';

const meta = {
  title: 'Components/AlertDialog',
  tags: ['!autodocs'],
  component: AlertDialog,
  args: {
    title: 'Delete 3 files?',
    description: 'This permanently deletes the selected invoices. You cannot undo this.',
    confirmLabel: 'Delete files',
    confirmVariant: 'danger',
    trigger: <Button variant="danger">Delete files</Button>,
    onConfirm: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    confirmVariant: { control: 'inline-radio', options: ['danger', 'primary'] },
    trigger: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--gn-space-6)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const openWith =
  (name: string): Story['play'] =>
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name }));
  };

/** Focus starts on Cancel. There is no close button, and the backdrop does not close it. */
export const Danger: Story = {
  play: openWith('Delete files'),
};

/** A consequential but not destructive action. */
export const Primary: Story = {
  args: {
    title: 'Submit report for audit?',
    description: 'The report is locked for editing until the auditor responds.',
    confirmLabel: 'Submit',
    confirmVariant: 'primary',
    trigger: <Button>Submit for audit</Button>,
  },
  play: openWith('Submit for audit'),
};

export const CustomCancelLabel: Story = {
  args: { cancelLabel: 'Keep files' },
  play: openWith('Delete files'),
};

/** Extra content goes in `children`, between the description and the buttons. */
export const WithDetails: Story = {
  args: {
    children: (
      <ul style={{ margin: 0 }}>
        <li>invoice-2026-07.pdf</li>
        <li>invoice-2026-08.pdf</li>
        <li>invoice-2026-09.pdf</li>
      </ul>
    ),
  },
  play: openWith('Delete files'),
};

/**
 * Controlled: confirm starts the work and the parent ignores the close request, so the
 * dialog stays open until the work finishes.
 */
export const KeepOpenWhileWorking: Story = {
  args: { trigger: undefined },
  render: function KeepOpenStory(args) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState('3 files selected');
    const workingRef = useRef(false);
    return (
      <div style={{ display: 'flex', gap: 'var(--gn-space-3)', alignItems: 'center' }}>
        <Button
          variant="danger"
          onClick={() => {
            setOpen(true);
          }}
        >
          Delete files
        </Button>
        <span>{status}</span>
        <AlertDialog
          {...args}
          open={open}
          onOpenChange={(next) => {
            args.onOpenChange?.(next);
            // Ignore the close request from Confirm; the timeout closes it.
            if (!next && workingRef.current) return;
            setOpen(next);
          }}
          onConfirm={() => {
            args.onConfirm();
            workingRef.current = true;
            setStatus('Deleting…');
            window.setTimeout(() => {
              workingRef.current = false;
              setStatus('Files deleted');
              setOpen(false);
            }, 1500);
          }}
        />
      </div>
    );
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  play: openWith('Delete files'),
};
