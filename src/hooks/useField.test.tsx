import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useField, type UseFieldOptions } from './useField';

function run(options: UseFieldOptions = {}) {
  return renderHook(() => useField(options)).result.current;
}

describe('useField', () => {
  it('generates a control id and links the label to it', () => {
    const field = run();
    expect(field.controlId).toMatch(/-control$/);
    expect(field.labelProps).toEqual({ id: field.labelId, htmlFor: field.controlId });
    expect(field.controlProps.id).toBe(field.controlId);
  });

  it('uses a consumer id for the control', () => {
    const field = run({ id: 'email' });
    expect(field.controlId).toBe('email');
    expect(field.labelProps.htmlFor).toBe('email');
    expect(field.controlProps.id).toBe('email');
  });

  it('omits aria-describedby and aria-invalid when there is nothing to link', () => {
    const field = run();
    expect(field.controlProps).not.toHaveProperty('aria-describedby');
    expect(field.controlProps).not.toHaveProperty('aria-invalid');
    expect(field.groupProps).not.toHaveProperty('aria-describedby');
    expect(field.descriptionId).toBeUndefined();
    expect(field.errorId).toBeUndefined();
  });

  it('links only the description when valid', () => {
    const field = run({ description: 'Help', errorMessage: 'Bad' });
    expect(field.descriptionId).toBeDefined();
    expect(field.showError).toBe(false);
    expect(field.errorId).toBeUndefined();
    expect(field.controlProps['aria-describedby']).toBe(field.descriptionId);
    expect(field.controlProps).not.toHaveProperty('aria-invalid');
  });

  it('orders description, error, then consumer ids when invalid', () => {
    const field = run({
      description: 'Help',
      errorMessage: 'Bad',
      invalid: true,
      'aria-describedby': 'extra',
    });
    expect(field.showError).toBe(true);
    expect(field.controlProps['aria-describedby']).toBe(
      `${String(field.descriptionId)} ${String(field.errorId)} extra`,
    );
    expect(field.controlProps['aria-invalid']).toBe(true);
  });

  it('does not show an error without a renderable message', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(run({ invalid: true }).showError).toBe(false);
    expect(run({ invalid: true, errorMessage: false }).showError).toBe(false);
    expect(run({ invalid: true, errorMessage: null }).showError).toBe(false);
    expect(run({ invalid: true }).controlProps['aria-invalid']).toBe(true);
  });

  it('treats a false description as absent', () => {
    expect(run({ description: false }).descriptionId).toBeUndefined();
  });

  it('keeps the consumer aria-describedby on its own', () => {
    expect(run({ 'aria-describedby': 'own' }).controlProps['aria-describedby']).toBe('own');
  });

  it('passes required and disabled to the control', () => {
    const field = run({ required: true, disabled: true });
    expect(field.controlProps.required).toBe(true);
    expect(field.controlProps.disabled).toBe(true);
  });

  it('gives groupProps no id, required or aria-invalid', () => {
    const field = run({
      description: 'Help',
      errorMessage: 'Bad',
      invalid: true,
      required: true,
      disabled: true,
    });
    expect(field.groupProps).toEqual({
      'aria-describedby': `${String(field.descriptionId)} ${String(field.errorId)}`,
      disabled: true,
    });
  });

  describe('missing error message warning', () => {
    function spyWarn() {
      return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    }

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['false', false],
    ] as const)('warns once when invalid and errorMessage is %s', (_name, errorMessage) => {
      const warn = spyWarn();
      run({ invalid: true, errorMessage });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/errorMessage/);
    });

    it('does not warn when invalid with a message', () => {
      const warn = spyWarn();
      run({ invalid: true, errorMessage: 'Bad' });
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when valid, with or without a message', () => {
      const warn = spyWarn();
      run();
      run({ invalid: false });
      run({ errorMessage: 'Bad' });
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns only once across rerenders with the same props', () => {
      const warn = spyWarn();
      const { rerender } = renderHook((options: UseFieldOptions) => useField(options), {
        initialProps: { invalid: true },
      });
      rerender({ invalid: true });
      rerender({ invalid: true });
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('stops warning once a message is supplied', () => {
      const warn = spyWarn();
      const initialProps: UseFieldOptions = { invalid: true };
      const { rerender } = renderHook((options: UseFieldOptions) => useField(options), {
        initialProps,
      });
      rerender({ invalid: true, errorMessage: 'Bad' });
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
