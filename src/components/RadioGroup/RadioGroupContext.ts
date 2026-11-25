import { createContext, useContext, type ChangeEvent } from 'react';

/** State a `RadioGroup` shares with its `Radio` children. Internal. */
export interface RadioGroupContextValue {
  /** Shared native `name`. */
  name: string;
  /** Controlled selected value; `undefined` when the group is uncontrolled. */
  value: string | undefined;
  /** Initial selected value when uncontrolled. */
  defaultValue: string | undefined;
  /** Puts aria-invalid="true" on every radio. */
  invalid: boolean;
  /** Puts native `required` on every radio. */
  required: boolean;
  /** Called from each radio's native change event. */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

/** Reads the enclosing group. Throws when a `Radio` is rendered outside a `RadioGroup`. */
export function useRadioGroupContext(): RadioGroupContextValue {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('Greenility: <Radio> must be rendered inside a <RadioGroup>.');
  }
  return context;
}
