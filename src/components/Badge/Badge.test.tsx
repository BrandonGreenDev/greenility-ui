import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from '../../test/axe';
import type { BadgeVariant, Size, Tone } from '../../utils/types';
import { Badge } from './Badge';

const tones: Tone[] = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const variants: BadgeVariant[] = ['subtle', 'solid'];
const sizes: Size[] = ['sm', 'md', 'lg'];

describe('Badge', () => {
  describe('rendering', () => {
    it('renders its text in a span', () => {
      render(<Badge>Draft</Badge>);
      const badge = screen.getByText('Draft');
      expect(badge.tagName).toBe('SPAN');
      expect(badge).toHaveTextContent('Draft');
    });

    it('renders rich children', () => {
      render(
        <Badge>
          <strong>3</strong> new
        </Badge>,
      );
      expect(screen.getByText('3').closest('span')).toHaveTextContent('3 new');
    });

    it('has no role and is not a live region', () => {
      render(<Badge>Draft</Badge>);
      const badge = screen.getByText('Draft');
      expect(badge).not.toHaveAttribute('role');
      expect(badge).not.toHaveAttribute('aria-live');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('is not focusable', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Badge>Draft</Badge>
          <button type="button">After</button>
        </>,
      );
      const badge = screen.getByText('Draft');
      expect(badge).not.toHaveAttribute('tabindex');
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(badge).not.toHaveFocus();
    });
  });

  describe('props', () => {
    it('defaults to neutral, subtle and md', () => {
      render(<Badge>Draft</Badge>);
      const badge = screen.getByText('Draft');
      expect(badge).toHaveAttribute('data-tone', 'neutral');
      expect(badge).toHaveAttribute('data-variant', 'subtle');
      expect(badge).toHaveAttribute('data-size', 'md');
    });

    it.each(tones)('reflects tone %s', (tone) => {
      render(<Badge tone={tone}>Label</Badge>);
      expect(screen.getByText('Label')).toHaveAttribute('data-tone', tone);
    });

    it.each(variants)('reflects variant %s', (variant) => {
      render(<Badge variant={variant}>Label</Badge>);
      expect(screen.getByText('Label')).toHaveAttribute('data-variant', variant);
    });

    it.each(sizes)('reflects size %s', (size) => {
      render(<Badge size={size}>Label</Badge>);
      expect(screen.getByText('Label')).toHaveAttribute('data-size', size);
    });

    it('merges className', () => {
      render(<Badge className="extra">Late</Badge>);
      const badge = screen.getByText('Late');
      expect(badge).toHaveClass('extra');
      expect(badge.classList.length).toBeGreaterThan(1);
    });

    it('passes native props through to the span', () => {
      render(
        <Badge id="b1" title="Status" data-testid="badge" style={{ marginTop: 4 }}>
          Late
        </Badge>,
      );
      const badge = screen.getByText('Late');
      expect(badge).toHaveAttribute('id', 'b1');
      expect(badge).toHaveAttribute('title', 'Status');
      expect(badge).toHaveAttribute('data-testid', 'badge');
      expect(badge).toHaveStyle({ marginTop: '4px' });
    });

    it('forwards the ref to the span', () => {
      const ref = createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>Late</Badge>);
      expect(ref.current).toBe(screen.getByText('Late'));
    });
  });

  describe('accessibility', () => {
    it.each(variants)('has no axe violations for every tone with variant %s', async (variant) => {
      const { container } = render(
        <p>
          {tones.map((tone) => (
            <Badge key={tone} tone={tone} variant={variant}>
              {tone} {variant}
            </Badge>
          ))}
        </p>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations for every size', async () => {
      const { container } = render(
        <p>
          {sizes.map((size) => (
            <Badge key={size} size={size}>
              {size}
            </Badge>
          ))}
        </p>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
