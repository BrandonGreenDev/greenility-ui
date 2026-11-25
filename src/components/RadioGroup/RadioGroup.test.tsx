import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Radio } from './Radio';
import { RadioGroup, type RadioGroupProps } from './RadioGroup';

type GroupProps = Omit<RadioGroupProps, 'label' | 'children'> & { label?: string };

function Plan(props: GroupProps) {
  const { label = 'Plan', ...rest } = props;
  return (
    <RadioGroup label={label} {...rest}>
      <Radio value="free" label="Free" />
      <Radio value="pro" label="Pro" />
      <Radio value="team" label="Team" />
    </RadioGroup>
  );
}

const radio = (name: string) => screen.getByRole('radio', { name });

describe('RadioGroup', () => {
  describe('rendering', () => {
    it('is a fieldset group named by its legend', () => {
      render(<Plan />);
      const group = screen.getByRole('group', { name: 'Plan' });
      expect(group.tagName).toBe('FIELDSET');
      expect(screen.getByText('Plan').tagName).toBe('LEGEND');
    });

    it('renders one radio per option, named by its label', () => {
      render(<Plan />);
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(radio('Free')).toHaveAttribute('value', 'free');
      expect(radio('Pro')).toHaveAttribute('value', 'pro');
      expect(radio('Team')).toHaveAttribute('value', 'team');
    });

    it('gives every radio the same generated name', () => {
      render(<Plan />);
      const names = screen.getAllByRole('radio').map((r) => r.getAttribute('name'));
      expect(names[0]).toBeTruthy();
      expect(new Set(names).size).toBe(1);
    });

    it('generates distinct names for separate groups', () => {
      render(
        <>
          <Plan label="One" />
          <Plan label="Two" />
        </>,
      );
      const [first, second] = screen.getAllByRole('group');
      const nameOf = (group: HTMLElement | undefined) =>
        group?.querySelector('input')?.getAttribute('name');
      expect(nameOf(first)).not.toBe(nameOf(second));
    });

    it('uses a consumer name', () => {
      render(<Plan name="plan" />);
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).toHaveAttribute('name', 'plan');
      });
    });

    it('hides the dot from assistive technology', () => {
      const { container } = render(<Plan />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((r) => {
        expect(r.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
      });
      expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3);
    });

    it('throws when a Radio is outside a group', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(() => render(<Radio value="a" label="A" />)).toThrow(/RadioGroup/);
      spy.mockRestore();
    });
  });

  describe('props', () => {
    it('reflects orientation, defaulting to vertical', () => {
      const { rerender } = render(<Plan />);
      const group = screen.getByRole('group', { name: 'Plan' });
      expect(group).toHaveAttribute('data-orientation', 'vertical');
      rerender(<Plan orientation="horizontal" />);
      expect(group).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('merges className on the fieldset and passes native props through', () => {
      render(<Plan className="extra" data-testid="grp" title="Choose" />);
      const group = screen.getByRole('group', { name: 'Plan' });
      expect(group).toHaveClass('extra');
      expect(group).toHaveAttribute('data-testid', 'grp');
      expect(group).toHaveAttribute('title', 'Choose');
    });

    it('puts Radio className and style on the option wrapper and other props on the input', () => {
      render(
        <RadioGroup label="Plan">
          <Radio
            value="a"
            label="A"
            className="opt"
            style={{ marginTop: 4 }}
            data-testid="in"
            id="radio-a"
          />
        </RadioGroup>,
      );
      const input = radio('A');
      const wrapper = input.closest('.opt');
      expect(wrapper).not.toBeNull();
      expect(wrapper).not.toBe(input);
      expect(wrapper).toHaveStyle({ marginTop: '4px' });
      expect(input).not.toHaveClass('opt');
      expect(input).toHaveAttribute('data-testid', 'in');
      expect(input).toHaveAttribute('id', 'radio-a');
    });

    it('forwards the group ref to the fieldset and the Radio ref to the input', () => {
      const groupRef = createRef<HTMLFieldSetElement>();
      const radioRef = createRef<HTMLInputElement>();
      render(
        <RadioGroup ref={groupRef} label="Plan">
          <Radio ref={radioRef} value="a" label="A" />
        </RadioGroup>,
      );
      expect(groupRef.current).toBe(screen.getByRole('group', { name: 'Plan' }));
      expect(radioRef.current).toBe(radio('A'));
    });
  });

  describe('selection', () => {
    it('has nothing selected by default', () => {
      render(<Plan />);
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).not.toBeChecked();
      });
    });

    it('checks the uncontrolled defaultValue', () => {
      render(<Plan defaultValue="pro" />);
      expect(radio('Pro')).toBeChecked();
      expect(radio('Free')).not.toBeChecked();
    });

    it('selects on click and keeps a single selection', async () => {
      const user = userEvent.setup();
      render(<Plan defaultValue="free" />);
      await user.click(radio('Pro'));
      expect(radio('Pro')).toBeChecked();
      expect(radio('Free')).not.toBeChecked();
      await user.click(radio('Team'));
      expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toEqual([
        radio('Team'),
      ]);
    });

    it('selects when the label is clicked', async () => {
      const user = userEvent.setup();
      render(<Plan />);
      await user.click(screen.getByText('Team'));
      expect(radio('Team')).toBeChecked();
      expect(radio('Team')).toHaveFocus();
    });

    it('respects a controlled value', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(<Plan value="free" onValueChange={onValueChange} />);
      await user.click(radio('Pro'));
      expect(onValueChange).toHaveBeenCalledWith('pro', expect.anything());
      expect(radio('Free')).toBeChecked();
      expect(radio('Pro')).not.toBeChecked();
      rerender(<Plan value="team" onValueChange={onValueChange} />);
      expect(radio('Team')).toBeChecked();
      expect(radio('Free')).not.toBeChecked();
    });

    it('works controlled with consumer state', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('free');
        return (
          <>
            <Plan value={value} onValueChange={setValue} />
            <output>{value}</output>
          </>
        );
      }
      render(<Controlled />);
      await user.click(radio('Team'));
      expect(radio('Team')).toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent('team');
    });
  });

  describe('callbacks', () => {
    it('calls onValueChange with the value and the change event', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Plan onValueChange={onValueChange} />);
      await user.click(radio('Pro'));
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(
        'pro',
        expect.objectContaining({ type: 'change', target: radio('Pro') }),
      );
    });

    it('does not call onValueChange when the checked radio is clicked again', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Plan defaultValue="pro" onValueChange={onValueChange} />);
      await user.click(radio('Pro'));
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('calls a Radio onChange before the group onValueChange', async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      render(
        <RadioGroup
          label="Plan"
          onValueChange={(value) => {
            calls.push(`group:${value}`);
          }}
        >
          <Radio
            value="a"
            label="A"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              calls.push(`radio:${event.target.value}`);
            }}
          />
        </RadioGroup>,
      );
      await user.click(radio('A'));
      expect(calls).toEqual(['radio:a', 'group:a']);
    });

    it('does not fire when the group is disabled', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Plan disabled onValueChange={onValueChange} />);
      await user.click(radio('Pro'));
      await user.click(screen.getByText('Team'));
      expect(onValueChange).not.toHaveBeenCalled();
      expect(radio('Pro')).not.toBeChecked();
    });

    it('does not fire for a disabled radio', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <RadioGroup label="Plan" onValueChange={onValueChange}>
          <Radio value="a" label="A" />
          <Radio value="b" label="B" disabled />
        </RadioGroup>,
      );
      await user.click(radio('B'));
      expect(onValueChange).not.toHaveBeenCalled();
      expect(radio('B')).not.toBeChecked();
    });
  });

  describe('keyboard and focus', () => {
    it('has one tab stop: Tab enters on the first radio when none is checked, then leaves', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Plan />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(radio('Free')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('Tab enters on the checked radio', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Plan defaultValue="team" />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(radio('Team')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(radio('Team')).toHaveFocus();
    });

    it('ArrowDown and ArrowRight move focus and selection to the next radio, wrapping', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Plan defaultValue="free" onValueChange={onValueChange} />);
      await user.tab();
      expect(radio('Free')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(radio('Pro')).toHaveFocus();
      expect(radio('Pro')).toBeChecked();
      expect(onValueChange).toHaveBeenLastCalledWith('pro', expect.anything());
      await user.keyboard('{ArrowRight}');
      expect(radio('Team')).toBeChecked();
      await user.keyboard('{ArrowDown}');
      expect(radio('Free')).toHaveFocus();
      expect(radio('Free')).toBeChecked();
    });

    it('ArrowUp and ArrowLeft move to the previous radio, wrapping', async () => {
      const user = userEvent.setup();
      render(<Plan defaultValue="free" />);
      await user.tab();
      await user.keyboard('{ArrowUp}');
      expect(radio('Team')).toHaveFocus();
      expect(radio('Team')).toBeChecked();
      await user.keyboard('{ArrowLeft}');
      expect(radio('Pro')).toHaveFocus();
      expect(radio('Pro')).toBeChecked();
    });

    it('arrow keys skip a disabled radio', async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup label="Plan" defaultValue="a">
          <Radio value="a" label="A" />
          <Radio value="b" label="B" disabled />
          <Radio value="c" label="C" />
        </RadioGroup>,
      );
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(radio('C')).toHaveFocus();
      expect(radio('C')).toBeChecked();
      expect(radio('B')).not.toBeChecked();
    });

    it('Space selects the focused unchecked radio', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Plan onValueChange={onValueChange} />);
      await user.tab();
      expect(radio('Free')).not.toBeChecked();
      await user.keyboard(' ');
      expect(radio('Free')).toBeChecked();
      expect(onValueChange).toHaveBeenCalledWith('free', expect.anything());
    });

    it('a disabled group is not focusable', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Plan disabled />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });
  });

  describe('states', () => {
    it('disables every radio with the group disabled prop', () => {
      render(<Plan disabled />);
      const group = screen.getByRole('group', { name: 'Plan' });
      expect(group).toBeDisabled();
      expect(group).toHaveAttribute('data-disabled', 'true');
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).toBeDisabled();
      });
    });

    it('disables only the radio given disabled', () => {
      render(
        <RadioGroup label="Plan">
          <Radio value="a" label="A" />
          <Radio value="b" label="B" disabled />
        </RadioGroup>,
      );
      expect(radio('A')).toBeEnabled();
      expect(radio('B')).toBeDisabled();
    });

    it('puts required on every radio', () => {
      render(<Plan required />);
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).toBeRequired();
      });
    });

    it('is not required by default', () => {
      render(<Plan />);
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).not.toBeRequired();
      });
    });

    it('puts aria-invalid on every radio and the error in the fieldset description', () => {
      render(<Plan invalid errorMessage="Pick a plan." />);
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).toHaveAttribute('aria-invalid', 'true');
      });
      const group = screen.getByRole('group', { name: 'Plan' });
      expect(group).toHaveAccessibleDescription('Pick a plan.');
      expect(group).not.toHaveAttribute('aria-invalid');
    });

    it('omits aria-invalid and the error when valid', () => {
      render(<Plan errorMessage="Pick a plan." />);
      screen.getAllByRole('radio').forEach((r) => {
        expect(r).not.toHaveAttribute('aria-invalid');
      });
      expect(screen.queryByText('Pick a plan.')).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Plan' })).not.toHaveAttribute('aria-describedby');
    });

    it('describes the fieldset with the description, then the error', () => {
      render(<Plan description="Billed monthly." invalid errorMessage="Pick a plan." />);
      expect(screen.getByRole('group', { name: 'Plan' })).toHaveAccessibleDescription(
        'Billed monthly. Pick a plan.',
      );
    });

    it('merges a consumer aria-describedby on the fieldset', () => {
      render(
        <>
          <Plan description="Billed monthly." aria-describedby="hint" />
          <p id="hint">Cancel any time.</p>
        </>,
      );
      expect(screen.getByRole('group', { name: 'Plan' })).toHaveAccessibleDescription(
        'Billed monthly. Cancel any time.',
      );
    });

    it('links a per-radio description to that radio only', () => {
      render(
        <RadioGroup label="Plan">
          <Radio value="a" label="A" description="For one person." />
          <Radio value="b" label="B" />
        </RadioGroup>,
      );
      expect(radio('A')).toHaveAccessibleDescription('For one person.');
      expect(radio('B')).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('forms', () => {
    it('submits the selected value under the group name', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Signup">
          <Plan name="plan" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Signup' });
      expect(new FormData(form).get('plan')).toBeNull();
      await user.click(radio('Pro'));
      expect(new FormData(form).getAll('plan')).toEqual(['pro']);
      await user.click(radio('Team'));
      expect(new FormData(form).getAll('plan')).toEqual(['team']);
    });

    it('submits the defaultValue', () => {
      render(
        <form aria-label="Signup">
          <Plan name="plan" defaultValue="free" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Signup' });
      expect(new FormData(form).get('plan')).toBe('free');
    });

    it('does not submit a disabled group', () => {
      render(
        <form aria-label="Signup">
          <Plan name="plan" defaultValue="free" disabled />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Signup' });
      expect(new FormData(form).get('plan')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = render(<Plan description="Billed monthly." defaultValue="pro" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when invalid and required', async () => {
      const { container } = render(<Plan required invalid errorMessage="Pick a plan." />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(
        <>
          <Plan label="Disabled group" disabled defaultValue="free" />
          <RadioGroup label="One disabled">
            <Radio value="a" label="A" description="First." />
            <Radio value="b" label="B" disabled />
          </RadioGroup>
        </>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when horizontal', async () => {
      const { container } = render(<Plan orientation="horizontal" />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
