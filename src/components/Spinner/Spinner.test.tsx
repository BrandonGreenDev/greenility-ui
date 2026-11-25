import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from '../../test/axe';
import type { Size } from '../../utils/types';
import { Spinner } from './Spinner';

const sizes: Size[] = ['sm', 'md', 'lg'];

describe('Spinner', () => {
  describe('rendering', () => {
    it('is a status region whose text is the default label', () => {
      render(<Spinner />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Loading');
      expect(status.tagName).toBe('SPAN');
    });

    it('takes its name from text content, not aria-label', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).not.toHaveAttribute('aria-label');
    });

    it('uses a custom label', () => {
      render(<Spinner label="Saving changes" />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Saving changes');
      expect(status).not.toHaveTextContent('Loading');
    });

    it('hides the graphic from assistive technology', () => {
      render(<Spinner />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('focusable', 'false');
    });
  });

  describe('decorative', () => {
    it('has no status role, is aria-hidden and renders no text', () => {
      const { container } = render(<Spinner decorative />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      const root = container.firstElementChild;
      expect(root).toHaveAttribute('aria-hidden', 'true');
      expect(root).not.toHaveAttribute('role');
      expect(root).toHaveTextContent('');
    });

    it('ignores label when decorative', () => {
      const { container } = render(<Spinner decorative label="Saving" />);
      expect(container).not.toHaveTextContent('Saving');
      expect(screen.queryByText('Saving')).not.toBeInTheDocument();
    });

    it('is not aria-hidden when not decorative', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('props', () => {
    it('defaults data-size to md', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveAttribute('data-size', 'md');
    });

    it.each(sizes)('reflects size="%s" as data-size', (size) => {
      render(<Spinner size={size} />);
      expect(screen.getByRole('status')).toHaveAttribute('data-size', size);
    });

    it('reflects data-size when decorative', () => {
      const { container } = render(<Spinner decorative size="sm" />);
      expect(container.firstElementChild).toHaveAttribute('data-size', 'sm');
    });

    it('merges className with its own class', () => {
      render(<Spinner className="extra" />);
      const status = screen.getByRole('status');
      expect(status).toHaveClass('extra');
      expect(status.classList.length).toBeGreaterThan(1);
    });

    it('forwards the ref to the root span', () => {
      const ref = createRef<HTMLSpanElement>();
      render(<Spinner ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current).toBe(screen.getByRole('status'));
    });

    it('forwards the ref to the root span when decorative', () => {
      const ref = createRef<HTMLSpanElement>();
      const { container } = render(<Spinner ref={ref} decorative />);
      expect(ref.current).toBe(container.firstElementChild);
    });

    it('passes native props through to the root', () => {
      render(<Spinner id="busy" data-testid="spinner" title="Busy" style={{ color: 'red' }} />);
      const status = screen.getByRole('status');
      expect(status).toBe(screen.getByTestId('spinner'));
      expect(status).toHaveAttribute('id', 'busy');
      expect(status).toHaveAttribute('title', 'Busy');
      expect(status).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });
  });

  describe('keyboard and focus', () => {
    it('is not focusable', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Spinner />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(screen.getByRole('status')).not.toHaveAttribute('tabindex');
    });
  });

  describe('accessibility', () => {
    it('has no axe violations as a status region', async () => {
      const { container } = render(<Spinner />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with a custom label', async () => {
      const { container } = render(<Spinner label="Saving" size="lg" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when decorative', async () => {
      const { container } = render(<Spinner decorative />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
