import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { axe } from '../../test/axe';
import controlStyles from './control.module.css';
import { Field, FieldDescription, FieldError, FieldLabel } from './index';

interface TestFieldProps extends FieldBaseProps {
  id?: string;
  'aria-describedby'?: string;
}

/** A minimal field built the way TextField will be, to test the pieces together. */
function TestField({
  label,
  description,
  errorMessage,
  invalid,
  required,
  disabled,
  ...rest
}: TestFieldProps) {
  const field = useField({ ...rest, description, errorMessage, invalid, required, disabled });
  return (
    <Field disabled={disabled} data-testid="root">
      <FieldLabel {...field.labelProps} required={required} disabled={disabled}>
        {label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
      )}
      <div className={controlStyles.box} data-size="md">
        <input className={controlStyles.input} {...field.controlProps} />
      </div>
      {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
    </Field>
  );
}

function TestGroup(props: FieldBaseProps) {
  const field = useField(props);
  return (
    <fieldset {...field.groupProps}>
      <FieldLabel as="legend" id={field.labelId} required={props.required}>
        {props.label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{props.description}</FieldDescription>
      )}
      <input type="radio" name="g" aria-label="One" />
      {field.showError && <FieldError {...field.errorProps}>{props.errorMessage}</FieldError>}
    </fieldset>
  );
}

describe('Field', () => {
  it('links the label to the control with htmlFor', () => {
    render(<TestField label="Email" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(screen.getByText('Email').closest('label')).toHaveAttribute('for', input.id);
  });

  it('uses a consumer id', () => {
    render(<TestField label="Email" id="email" />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('id', 'email');
  });

  it('describes the control with the description only when valid', () => {
    render(<TestField label="Email" description="Work address" errorMessage="Required" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAccessibleDescription('Work address');
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('describes with description, then error, then consumer ids when invalid', () => {
    render(
      <>
        <TestField
          label="Email"
          description="Work address"
          errorMessage="Enter an email"
          invalid
          aria-describedby="hint"
        />
        <p id="hint">Extra hint</p>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Work address Enter an email Extra hint');
    const ids = input.getAttribute('aria-describedby')?.split(' ');
    expect(ids?.[0]).toBe(screen.getByText('Work address').id);
    expect(ids?.[1]).toBe(screen.getByText('Enter an email').closest('p')?.id);
    expect(ids?.[2]).toBe('hint');
  });

  it('renders the error with a decorative icon and no live region', () => {
    render(<TestField label="Email" errorMessage="Enter an email" invalid />);
    const error = screen.getByText('Enter an email').closest('p');
    expect(error?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(error).not.toHaveAttribute('role');
    expect(error).not.toHaveAttribute('aria-live');
  });

  it('omits aria-invalid when valid', () => {
    render(<TestField label="Email" />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('hides the asterisk from assistive technology and sets native required', () => {
    render(<TestField label="Email" required />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('disables the control and marks the root', () => {
    render(<TestField label="Email" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByTestId('root')).toHaveAttribute('data-disabled', 'true');
  });

  it('gives a group no aria-invalid but links its description and error', () => {
    render(<TestGroup label="Plan" description="Pick one" errorMessage="Choose a plan" invalid />);
    const group = screen.getByRole('group', { name: 'Plan' });
    expect(group).not.toHaveAttribute('aria-invalid');
    expect(group).not.toHaveAttribute('required');
    expect(group).toHaveAccessibleDescription('Pick one Choose a plan');
  });

  it('renders a legend without a for attribute', () => {
    render(<TestGroup label="Plan" required />);
    const legend = screen.getByText('Plan').closest('legend');
    expect(legend).toBeInTheDocument();
    expect(legend).not.toHaveAttribute('for');
  });

  it('merges className and forwards refs', () => {
    const rootRef = createRef<HTMLDivElement>();
    const labelRef = createRef<HTMLElement>();
    const descRef = createRef<HTMLParagraphElement>();
    const errorRef = createRef<HTMLParagraphElement>();
    render(
      <Field ref={rootRef} className="root-extra">
        <FieldLabel ref={labelRef} htmlFor="x" className="label-extra">
          Name
        </FieldLabel>
        <input id="x" />
        <FieldDescription ref={descRef}>Desc</FieldDescription>
        <FieldError ref={errorRef}>Err</FieldError>
      </Field>,
    );
    expect(rootRef.current).toHaveClass('root-extra');
    expect(labelRef.current).toBeInstanceOf(HTMLLabelElement);
    expect(labelRef.current).toHaveClass('label-extra');
    expect(descRef.current).toHaveTextContent('Desc');
    expect(errorRef.current).toHaveTextContent('Err');
  });

  it('has no axe violations in default, invalid and disabled states', async () => {
    const { container } = render(
      <>
        <TestField label="Name" description="Full name" required />
        <TestField label="Email" errorMessage="Enter an email" invalid />
        <TestField label="Phone" disabled />
        <TestGroup label="Plan" errorMessage="Choose a plan" invalid />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
