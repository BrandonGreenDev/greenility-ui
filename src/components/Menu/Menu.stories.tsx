import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button } from '../Button';
import { Dialog, DialogClose } from '../Dialog';
import { ChevronDownIcon, createIcon } from '../Icon';
import { IconButton } from '../IconButton';
import { Menu, MenuGroup, MenuItem, MenuSeparator } from './Menu';

// Story-only icons (original shapes).
const MoreIcon = createIcon(
  'MoreIcon',
  <>
    <circle cx="5.5" cy="12" r="1.25" />
    <circle cx="12" cy="12" r="1.25" />
    <circle cx="18.5" cy="12" r="1.25" />
  </>,
);
const PencilIcon = createIcon(
  'PencilIcon',
  <>
    <path d="M4.5 19.5h4l10-10-4-4-10 10v4z" />
    <path d="M12.5 7.5l4 4" />
  </>,
);
const CopyIcon = createIcon(
  'CopyIcon',
  <>
    <rect x="9" y="9" width="10.5" height="10.5" rx="2" />
    <path d="M15 5.5V5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 5v8.5A1.5 1.5 0 0 0 5.5 15H6" />
  </>,
);
const BoxIcon = createIcon(
  'BoxIcon',
  <>
    <rect x="3.5" y="4.5" width="17" height="4" rx="1" />
    <path d="M5 8.5v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-10" />
    <path d="M10 12.5h4" />
  </>,
);
const BinIcon = createIcon(
  'BinIcon',
  <>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
    <path d="M6.5 7l.8 11.6a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    <path d="M10.5 11v5" />
    <path d="M13.5 11v5" />
  </>,
);

const items = (
  <>
    <MenuItem startIcon={<PencilIcon />} onSelect={fn()}>
      Edit
    </MenuItem>
    <MenuItem startIcon={<CopyIcon />} onSelect={fn()}>
      Duplicate
    </MenuItem>
    <MenuItem startIcon={<BoxIcon />} disabled onSelect={fn()}>
      Archive
    </MenuItem>
    <MenuSeparator />
    <MenuGroup label="Danger zone">
      <MenuItem startIcon={<BinIcon />} onSelect={fn()}>
        Delete site
      </MenuItem>
    </MenuGroup>
  </>
);

const meta = {
  title: 'Components/Menu',
  tags: ['!autodocs'],
  component: Menu,
  subcomponents: { MenuItem, MenuGroup, MenuSeparator },
  args: {
    placement: 'bottom',
    align: 'start',
    onOpenChange: fn(),
    trigger: (
      <Button variant="secondary" endIcon={<ChevronDownIcon />}>
        Actions
      </Button>
    ),
    children: items,
  },
  argTypes: {
    placement: { control: 'inline-radio', options: ['top', 'bottom', 'start', 'end'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    trigger: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click, Enter, Space or ArrowDown opens the menu and focuses the first item. */
export const Default: Story = {};

/**
 * Open on load (icons, a disabled item, a separator and a group), so the a11y run checks
 * the open state. Left out of the docs page, where the open menu would cover other examples.
 */
export const Open: Story = {
  tags: ['!autodocs'],
  args: { defaultOpen: true },
};

/** Plain-text items without icons, groups or separators. */
export const Simple: Story = {
  args: {
    children: (
      <>
        <MenuItem onSelect={fn()}>Rename</MenuItem>
        <MenuItem onSelect={fn()}>Move to folder</MenuItem>
        <MenuItem onSelect={fn()}>Download CSV</MenuItem>
      </>
    ),
  },
};

/**
 * Groups are named by their label, the separator is not focusable, and the disabled item
 * stays focusable (announced as unavailable) but cannot be activated.
 */
export const GroupsSeparatorAndDisabled: Story = {
  tags: ['!autodocs'],
  args: {
    defaultOpen: true,
    children: (
      <>
        <MenuGroup label="Report">
          <MenuItem startIcon={<PencilIcon />}>Edit</MenuItem>
          <MenuItem startIcon={<CopyIcon />}>Duplicate</MenuItem>
          <MenuItem startIcon={<BoxIcon />} disabled>
            Archive (locked)
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup label="Export">
          <MenuItem>PDF</MenuItem>
          <MenuItem>CSV</MenuItem>
        </MenuGroup>
      </>
    ),
  },
};

/** An IconButton trigger keeps its name; its tooltip hides as the menu opens. */
export const OpenedByIconButton: Story = {
  args: {
    trigger: <IconButton variant="ghost" label="More actions" icon={<MoreIcon />} />,
  },
};

export const PlacementTop: Story = {
  args: { placement: 'top' },
  render: (args) => (
    <div style={{ paddingBlockStart: 'calc(3 * var(--gn-space-16))' }}>
      <Menu {...args} />
    </div>
  ),
};

export const PlacementStart: Story = {
  args: { placement: 'start' },
  render: (args) => (
    <div style={{ paddingInlineStart: 'calc(4 * var(--gn-space-16))' }}>
      <Menu {...args} />
    </div>
  ),
};

export const PlacementEnd: Story = { args: { placement: 'end' } };

export const AlignEnd: Story = {
  args: { align: 'end' },
  render: (args) => (
    <div style={{ paddingInlineStart: 'calc(4 * var(--gn-space-16))' }}>
      <Menu {...args} />
    </div>
  ),
};

/**
 * The trigger sits in the bottom-end corner. There is no room below or to the end, so the
 * menu flips to the top and shifts back inside the viewport.
 */
export const NearViewportEdge: Story = {
  args: { trigger: <IconButton variant="secondary" label="More actions" icon={<MoreIcon />} /> },
  render: (args) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        minBlockSize: 'calc(100vh - 2 * var(--gn-space-6))',
      }}
    >
      <Menu {...args} />
    </div>
  ),
};

/** `start`/`end` and `align` follow the nearest `[dir]`. */
export const RightToLeft: Story = {
  args: {
    trigger: (
      <Button variant="secondary" endIcon={<ChevronDownIcon />}>
        إجراءات
      </Button>
    ),
    children: (
      <>
        <MenuItem startIcon={<PencilIcon />}>تعديل</MenuItem>
        <MenuItem startIcon={<CopyIcon />}>تكرار</MenuItem>
        <MenuSeparator />
        <MenuItem startIcon={<BinIcon />}>حذف</MenuItem>
      </>
    ),
  },
  render: (args) => (
    <div dir="rtl">
      <Menu {...args} />
    </div>
  ),
};

/** Long menus scroll inside the panel; typeahead jumps to an item by its first letters. */
export const ManyItems: Story = {
  args: {
    children: (
      <>
        {[
          'Amsterdam',
          'Berlin',
          'Copenhagen',
          'Dublin',
          'Edinburgh',
          'Frankfurt',
          'Geneva',
          'Helsinki',
          'Istanbul',
          'Lisbon',
          'Madrid',
          'Oslo',
          'Paris',
          'Rome',
          'Stockholm',
          'Vienna',
          'Warsaw',
          'Zurich',
        ].map((city) => (
          <MenuItem key={city}>{city}</MenuItem>
        ))}
      </>
    ),
  },
};

/**
 * `onSelect` runs after focus is back on the trigger, so a Dialog opened from a menu item
 * returns focus to the menu button when it closes.
 */
export const SelectOpensDialog: Story = {
  render: function Render(args) {
    const [dialogOpen, setDialogOpen] = useState(false);
    return (
      <>
        <Menu {...args}>
          <MenuItem startIcon={<PencilIcon />}>Edit</MenuItem>
          <MenuItem
            startIcon={<BinIcon />}
            onSelect={() => {
              setDialogOpen(true);
            }}
          >
            Delete site…
          </MenuItem>
        </Menu>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Delete Site A?"
          description="Its readings and reports are removed. This cannot be undone."
          footer={
            <>
              <DialogClose>Cancel</DialogClose>
              <DialogClose variant="danger">Delete</DialogClose>
            </>
          }
        />
      </>
    );
  },
};

/** Controlled with `open` and `onOpenChange`. */
export const Controlled: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [last, setLast] = useState('nothing yet');
    return (
      <div style={{ display: 'grid', gap: 'var(--gn-space-3)', justifyItems: 'start' }}>
        <Menu {...args} open={open} onOpenChange={setOpen}>
          {['Edit', 'Duplicate', 'Delete'].map((action) => (
            <MenuItem
              key={action}
              onSelect={() => {
                setLast(action);
              }}
            >
              {action}
            </MenuItem>
          ))}
        </Menu>
        <p style={{ margin: 0 }}>
          Open: {String(open)}. Last action: {last}.
        </p>
      </div>
    );
  },
};

/** Open on load in the dark theme (left out of the docs page, like `Open`). */
export const DarkMode: Story = {
  tags: ['!autodocs'],
  parameters: { theme: 'dark' },
  args: { defaultOpen: true },
};
