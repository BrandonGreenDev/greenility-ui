import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from '../../test/axe';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renders its text in the DOM', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);
    expect(screen.getByText('Hidden text')).toBeInTheDocument();
  });

  it('contributes to the accessible name of a parent button', () => {
    render(
      <button type="button">
        <span aria-hidden="true">×</span>
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('merges className and spreads native props onto the span', () => {
    render(
      <VisuallyHidden className="extra" data-testid="vh">
        Text
      </VisuallyHidden>,
    );
    const span = screen.getByTestId('vh');
    expect(span.tagName).toBe('SPAN');
    expect(span).toHaveClass('extra');
    expect(span.classList.length).toBeGreaterThan(1);
  });

  it('forwards the ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<VisuallyHidden ref={ref}>Text</VisuallyHidden>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toHaveTextContent('Text');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <p>
        Read more <VisuallyHidden>about design tokens</VisuallyHidden>
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
