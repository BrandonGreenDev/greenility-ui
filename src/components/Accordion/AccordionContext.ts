import { createContext, useContext } from 'react';

/** State `Accordion` shares with its items. Internal. */
export interface AccordionContextValue {
  /** `useId()` prefix for trigger and panel ids. */
  baseId: string;
  /** Values of the open items. */
  openValues: readonly string[];
  /** Opens or closes an item. */
  toggle: (value: string) => void;
  /** True when an open item cannot be closed (single, non-collapsible). */
  lockOpen: boolean;
  /** Heading level wrapping each trigger. */
  headingLevel: 2 | 3 | 4 | 5 | 6;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

/** Reads the enclosing `Accordion`. Throws when an item is rendered outside it. */
export function useAccordionContext(): AccordionContextValue {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Greenility: <AccordionItem> must be rendered inside an <Accordion>.');
  }
  return context;
}
