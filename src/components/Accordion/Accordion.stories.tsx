import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentType } from 'react';
import {
  Accordion,
  AccordionItem,
  type AccordionMultipleProps,
  type AccordionProps,
  type AccordionSingleProps,
} from './Accordion';

/**
 * AccordionProps is a union on `multiple`, which Storybook's arg types cannot express.
 * Stories use this flattened shape and render through the union.
 */
type AccordionStoryArgs = Omit<
  AccordionSingleProps,
  'multiple' | 'value' | 'defaultValue' | 'onValueChange'
> & {
  multiple?: boolean;
  value?: AccordionSingleProps['value'] | AccordionMultipleProps['value'];
  defaultValue?: AccordionSingleProps['defaultValue'] | AccordionMultipleProps['defaultValue'];
  onValueChange?: AccordionSingleProps['onValueChange'] | AccordionMultipleProps['onValueChange'];
};

const faq = [
  {
    value: 'scope',
    title: 'Which emission scopes are covered?',
    body: 'Scope 1 and 2 are calculated from your energy data. Scope 3 covers travel, waste and purchased goods.',
  },
  {
    value: 'data',
    title: 'Where does the conversion data come from?',
    body: 'Emission factors are updated every year from published national inventories.',
  },
  {
    value: 'export',
    title: 'Can I export the report?',
    body: 'Yes. Reports export to PDF and CSV from the summary page.',
  },
];

function Items({ disabled }: { disabled?: string }) {
  return (
    <>
      {faq.map((item) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          title={item.title}
          disabled={item.value === disabled}
        >
          <p style={{ margin: 0 }}>{item.body}</p>
        </AccordionItem>
      ))}
    </>
  );
}

const meta = {
  title: 'Components/Accordion',
  component: Accordion as ComponentType<AccordionStoryArgs>,
  subcomponents: { AccordionItem },
  render: (args) => <Accordion {...(args as AccordionProps)} />,
  args: {
    children: <Items />,
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '40rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<AccordionStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One item open at a time; the open item can be closed again. */
export const Single: Story = {};

/** Items open and close independently. */
export const Multiple: Story = {
  args: { multiple: true, defaultValue: ['scope', 'export'] },
};

/** One item always stays open. Its trigger is `aria-disabled` while open. */
export const NonCollapsible: Story = {
  args: { collapsible: false, defaultValue: 'scope' },
};

export const DefaultExpanded: Story = {
  args: { defaultValue: 'data' },
};

/** A disabled item cannot be opened and is skipped by the arrow keys. */
export const DisabledItem: Story = {
  args: { children: <Items disabled="data" /> },
};

/** Triggers are wrapped in `<h2>` here. Match the level to the page outline. */
export const HeadingLevel: Story = {
  args: { headingLevel: 2 },
};

export const RightToLeft: Story = {
  args: {
    defaultValue: 'one',
    children: (
      <>
        <AccordionItem value="one" title="ما النطاقات المشمولة؟">
          <p style={{ margin: 0 }}>يتم حساب النطاقين الأول والثاني من بيانات الطاقة.</p>
        </AccordionItem>
        <AccordionItem value="two" title="هل يمكنني تصدير التقرير؟">
          <p style={{ margin: 0 }}>نعم، بصيغة PDF وCSV.</p>
        </AccordionItem>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
};

/** The parent owns the open item. */
export const Controlled: Story = {
  render: function Render(args) {
    const [value, setValue] = useState('scope');
    const {
      multiple: _multiple,
      value: _value,
      defaultValue: _defaultValue,
      onValueChange: _onValueChange,
      ...base
    } = args;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
        <Accordion {...base} value={value} onValueChange={setValue} />
        <p style={{ margin: 0 }}>
          Open: <code>{value === '' ? '(none)' : value}</code>{' '}
          <button
            type="button"
            onClick={() => {
              setValue('');
            }}
          >
            Close all
          </button>
        </p>
      </div>
    );
  },
};

/** The parent owns the list of open items. */
export const ControlledMultiple: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<string[]>(['data']);
    const {
      multiple: _multiple,
      value: _value,
      defaultValue: _defaultValue,
      onValueChange: _onValueChange,
      ...base
    } = args;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gn-space-3)' }}>
        <Accordion {...base} multiple value={value} onValueChange={setValue} />
        <p style={{ margin: 0 }}>
          Open: <code>{value.length === 0 ? '(none)' : value.join(', ')}</code>{' '}
          <button
            type="button"
            onClick={() => {
              setValue(faq.map((item) => item.value));
            }}
          >
            Open all
          </button>
        </p>
      </div>
    );
  },
};

/**
 * An accordion inside an item. Closing the outer item hides the inner open one too (the
 * panel inherits visibility and is inert), and the link inside is not reachable with Tab.
 */
export const Nested: Story = {
  args: {
    defaultValue: 'outer',
    children: (
      <>
        <AccordionItem value="outer" title="Reporting guides">
          <Accordion headingLevel={4} defaultValue="inner">
            <AccordionItem value="inner" title="Scope 3 categories">
              <p style={{ margin: 0 }}>
                Read the <a href="#scope-3">Scope 3 category guide</a> before you import data.
              </p>
            </AccordionItem>
            <AccordionItem value="inner-2" title="Market-based electricity">
              <p style={{ margin: 0 }}>Use supplier-specific factors where you have them.</p>
            </AccordionItem>
          </Accordion>
        </AccordionItem>
        <AccordionItem value="other" title="Billing">
          <p style={{ margin: 0 }}>Invoices are issued monthly.</p>
        </AccordionItem>
      </>
    ),
  },
};

export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  args: { defaultValue: 'scope', children: <Items disabled="export" /> },
};
