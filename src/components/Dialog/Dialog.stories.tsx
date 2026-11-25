import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '../Button';
import { TextField } from '../TextField';
import { Dialog } from './Dialog';
import { DialogClose } from './DialogClose';

const meta = {
  title: 'Components/Dialog',
  tags: ['!autodocs'],
  component: Dialog,
  args: {
    title: 'Edit site details',
    description: 'Changes apply to every report that includes this site.',
    trigger: <Button>Open dialog</Button>,
    size: 'md',
    onOpenChange: fn(),
    children: <TextField label="Site name" defaultValue="Rotterdam warehouse" />,
    footer: (
      <>
        <DialogClose>Cancel</DialogClose>
        <DialogClose variant="primary">Save</DialogClose>
      </>
    ),
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    trigger: { control: false },
    children: { control: false },
    footer: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 'var(--gn-space-6)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Opens the dialog in the canvas (and in the a11y run). Play functions do not run on the
 * docs page, so the docs page never has a modal open.
 */
const openWith =
  (name: string): Story['play'] =>
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name }));
  };

export const Default: Story = {
  play: openWith('Open dialog'),
};

export const Small: Story = {
  args: {
    size: 'sm',
    title: 'Rename report',
    description: undefined,
    children: <TextField label="Report name" defaultValue="Q3 emissions" />,
  },
  play: openWith('Open dialog'),
};

export const Large: Story = {
  args: {
    size: 'lg',
    title: 'Import meter readings',
    description: 'Upload a CSV with one row per meter and month.',
    children: (
      <p>
        Columns: site, meter id, month (YYYY-MM), reading and unit. Readings in kWh, m³ or litres
        are converted to the reporting unit on import.
      </p>
    ),
  },
  play: openWith('Open dialog'),
};

/** Without `description` there is no aria-describedby. */
export const WithoutDescription: Story = {
  args: { description: undefined },
  play: openWith('Open dialog'),
};

/** No tabbable in the body or footer: focus lands on the close button. */
export const NoFooter: Story = {
  args: {
    title: 'About emission factors',
    description: undefined,
    footer: undefined,
    children: <p>Factors come from the 2026 national inventory and are reviewed every year.</p>,
  },
  play: openWith('Open dialog'),
};

/**
 * The body scrolls between a fixed header and footer. A scrolling body becomes a tab stop
 * so keyboard users can scroll it; the page behind is scroll-locked.
 */
export const LongScrollingBody: Story = {
  args: {
    title: 'Data processing terms',
    description: 'Read the terms before you connect a new data source.',
    children: (
      <>
        {Array.from({ length: 16 }, (_, i) => (
          <p key={i}>
            {`${String(i + 1)}. The provider processes meter readings and invoices only to
            calculate emissions for the account owner. Data is stored in the EU, encrypted at
            rest, and deleted 30 days after the account is closed.`}
          </p>
        ))}
      </>
    ),
    footer: (
      <>
        <DialogClose>Decline</DialogClose>
        <DialogClose variant="primary">Accept</DialogClose>
      </>
    ),
  },
  play: openWith('Open dialog'),
};

/** `open` and `onOpenChange` from the parent, opened from anywhere (no `trigger`). */
export const Controlled: Story = {
  args: { trigger: undefined },
  render: function ControlledStory(args) {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ display: 'flex', gap: 'var(--gn-space-3)', alignItems: 'center' }}>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
          }}
        >
          Edit site
        </Button>
        <span>Dialog is {open ? 'open' : 'closed'}</span>
        <Dialog
          {...args}
          open={open}
          onOpenChange={(next) => {
            args.onOpenChange?.(next);
            setOpen(next);
          }}
        />
      </div>
    );
  },
  play: openWith('Edit site'),
};

/** `initialFocusRef` picks the field that matters most instead of the first one. */
export const InitialFocus: Story = {
  render: function InitialFocusStory(args) {
    const emailRef = useRef<HTMLInputElement>(null);
    return (
      <Dialog
        {...args}
        title="Invite a colleague"
        description="They get read access to every report."
        initialFocusRef={emailRef}
      >
        <div style={{ display: 'grid', gap: 'var(--gn-space-4)' }}>
          <TextField label="Team" defaultValue="Sustainability" />
          <TextField ref={emailRef} label="Email" type="email" />
        </div>
      </Dialog>
    );
  },
  play: openWith('Open dialog'),
};

/**
 * The trigger is removed when the row is deleted, so `returnFocusRef` sends focus to the
 * list heading instead of `<body>`.
 */
export const ReturnFocus: Story = {
  args: { trigger: undefined, children: undefined },
  render: function ReturnFocusStory(args) {
    const [sites, setSites] = useState(['Rotterdam', 'Lyon', 'Gdańsk']);
    const [pending, setPending] = useState<string | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    return (
      <section>
        <h3 ref={headingRef} tabIndex={-1} style={{ marginBlockStart: 0 }}>
          Sites ({sites.length})
        </h3>
        <ul style={{ display: 'grid', gap: 'var(--gn-space-2)', paddingInlineStart: 0 }}>
          {sites.map((site) => (
            <li key={site} style={{ display: 'flex', gap: 'var(--gn-space-3)' }}>
              <span style={{ minInlineSize: '0', flex: 1 }}>{site}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPending(site);
                }}
              >
                Remove {site}
              </Button>
            </li>
          ))}
        </ul>
        <Dialog
          {...args}
          title={`Remove ${pending ?? ''}?`}
          description="Its readings stay in past reports."
          open={pending !== null}
          onOpenChange={(next) => {
            if (!next) setPending(null);
          }}
          returnFocusRef={headingRef}
          footer={
            <>
              <DialogClose>Keep</DialogClose>
              <Button
                variant="danger"
                onClick={() => {
                  setSites((list) => list.filter((s) => s !== pending));
                  setPending(null);
                }}
              >
                Remove
              </Button>
            </>
          }
        />
      </section>
    );
  },
  play: openWith('Remove Lyon'),
};

/**
 * Escape and the backdrop close only the innermost dialog; focus returns to the button
 * that opened it.
 */
export const Nested: Story = {
  args: {
    title: 'Report settings',
    description: 'Choose what this report includes.',
    children: (
      <div style={{ display: 'grid', gap: 'var(--gn-space-4)', justifyItems: 'start' }}>
        <TextField label="Report name" defaultValue="Q3 emissions" />
        <Dialog
          title="Advanced options"
          description="Press Escape: only this dialog closes."
          size="sm"
          trigger={<Button variant="secondary">Advanced options</Button>}
          footer={<DialogClose>Done</DialogClose>}
        >
          <TextField label="Rounding (decimals)" type="number" defaultValue="2" />
        </Dialog>
      </div>
    ),
  },
  play: async (context) => {
    await openWith('Open dialog')?.(context);
    await context.userEvent.click(context.canvas.getByRole('button', { name: 'Advanced options' }));
  },
};

export const CustomCloseLabel: Story = {
  args: { closeLabel: 'Close site details' },
  play: openWith('Open dialog'),
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  play: openWith('Open dialog'),
};
