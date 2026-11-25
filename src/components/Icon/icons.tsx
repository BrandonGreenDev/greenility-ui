import { createIcon } from './Icon';

/** A check mark. Used by Checkbox. */
export const CheckIcon = createIcon('CheckIcon', <path d="M5 12.5l4.5 4.5L19 7.5" />);

/** A horizontal dash. Used by the indeterminate Checkbox. */
export const MinusIcon = createIcon('MinusIcon', <path d="M6 12h12" />);

/** A downward chevron. Used by NativeSelect and Select. */
export const ChevronDownIcon = createIcon('ChevronDownIcon', <path d="M6 9.5l6 6 6-6" />);

/** A cross. Used by dismiss buttons. */
export const CloseIcon = createIcon(
  'CloseIcon',
  <>
    <path d="M6.5 6.5l11 11" />
    <path d="M17.5 6.5l-11 11" />
  </>,
);

/** Info status: a circle with an "i". */
export const InfoIcon = createIcon(
  'InfoIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.75h.01" />
  </>,
);

/** Success status: a circle with a check. */
export const SuccessIcon = createIcon(
  'SuccessIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.25l2.75 2.75L16 9.5" />
  </>,
);

/** Warning status: a triangle with an exclamation mark. */
export const WarningIcon = createIcon(
  'WarningIcon',
  <>
    <path d="M12 3.75L21.25 19.5H2.75Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </>,
);

/** Danger status: an octagon with an exclamation mark. */
export const DangerIcon = createIcon(
  'DangerIcon',
  <>
    <path d="M8.25 3h7.5L21 8.25v7.5L15.75 21h-7.5L3 15.75v-7.5Z" />
    <path d="M12 8v5" />
    <path d="M12 16.25h.01" />
  </>,
);

/** A left-pointing chevron. Used by DataTable "Previous" (mirror it in RTL). */
export const ChevronLeftIcon = createIcon('ChevronLeftIcon', <path d="M14.5 6l-6 6 6 6" />);

/** A right-pointing chevron. Used by DataTable "Next" (mirror it in RTL). */
export const ChevronRightIcon = createIcon('ChevronRightIcon', <path d="M9.5 6l6 6-6 6" />);

/** An upward arrow. Marks a column sorted ascending. */
export const ArrowUpIcon = createIcon(
  'ArrowUpIcon',
  <>
    <path d="M12 19V5" />
    <path d="M6.5 10.5L12 5l5.5 5.5" />
  </>,
);

/** A downward arrow. Marks a column sorted descending. */
export const ArrowDownIcon = createIcon(
  'ArrowDownIcon',
  <>
    <path d="M12 5v14" />
    <path d="M6.5 13.5L12 19l5.5-5.5" />
  </>,
);

/** Up and down arrows side by side. Marks a sortable, unsorted column. */
export const ArrowUpDownIcon = createIcon(
  'ArrowUpDownIcon',
  <>
    <path d="M8 19V5" />
    <path d="M4.5 8.5L8 5l3.5 3.5" />
    <path d="M16 5v14" />
    <path d="M12.5 15.5L16 19l3.5-3.5" />
  </>,
);
