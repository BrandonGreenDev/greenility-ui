import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from '../../test/axe';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DangerIcon,
  InfoIcon,
  MinusIcon,
  SuccessIcon,
  WarningIcon,
} from './index';

const icons = {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DangerIcon,
  InfoIcon,
  MinusIcon,
  SuccessIcon,
  WarningIcon,
};

describe('Icon', () => {
  it.each(Object.entries(icons))('%s is decorative by default', (name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(Icon.displayName).toBe(name);
  });

  it('is a named image when given a label', () => {
    render(<WarningIcon label="Warning" />);
    const img = screen.getByRole('img', { name: 'Warning' });
    expect(img).not.toHaveAttribute('aria-hidden');
  });

  it('reflects size in data-size, defaulting to md', () => {
    const { container, rerender } = render(<InfoIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('data-size', 'md');
    rerender(<InfoIcon size="lg" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-size', 'lg');
  });

  it('merges className and forwards the ref', () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(<CheckIcon ref={ref} className="extra" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('extra');
    expect(ref.current).toBe(svg);
  });

  it('has no axe violations, decorative or labelled', async () => {
    const { container } = render(
      <div>
        <CloseIcon />
        <SuccessIcon label="Success" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
