import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import type { AlertTone } from '../../utils/types';
import { Alert } from './Alert';

const tones: AlertTone[] = ['neutral', 'info', 'success', 'warning', 'danger'];

const defaultPrefixes: [AlertTone, string][] = [
  ['info', 'Info: '],
  ['success', 'Success: '],
  ['warning', 'Warning: '],
  ['danger', 'Error: '],
];

describe('Alert', () => {
  describe('rendering', () => {
    it('renders title and body content', () => {
      render(
        <Alert live="polite" title="Saved">
          Your changes are live.
        </Alert>,
      );
      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('Saved');
      expect(region).toHaveTextContent('Your changes are live.');
    });

    it('hides the tone icon from assistive technology', () => {
      const { container } = render(<Alert>Body</Alert>);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it.each(tones)('renders a hidden tone icon for tone="%s"', (tone) => {
      const { container } = render(<Alert tone={tone}>Body</Alert>);
      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
    });

    it('never moves focus on mount, even as role="alert"', () => {
      render(
        <>
          <button type="button">Elsewhere</button>
          <Alert live="assertive" onDismiss={() => undefined}>
            Connection lost
          </Alert>
        </>,
      );
      expect(document.body).toHaveFocus();
    });

    it('does not take focus from the focused element when it mounts', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<button type="button">Elsewhere</button>);
      await user.tab();
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      expect(elsewhere).toHaveFocus();
      rerender(
        <>
          <button type="button">Elsewhere</button>
          <Alert live="assertive" onDismiss={() => undefined}>
            Connection lost
          </Alert>
        </>,
      );
      expect(elsewhere).toHaveFocus();
    });
  });

  describe('live roles', () => {
    it('has no role by default', () => {
      const { container } = render(<Alert>Body</Alert>);
      expect(container.querySelector('[role]')).toBeNull();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('has no role with live="off"', () => {
      const { container } = render(<Alert live="off">Body</Alert>);
      expect(container.querySelector('[role]')).toBeNull();
    });

    it('is a status region with live="polite"', () => {
      render(<Alert live="polite">Body</Alert>);
      expect(screen.getByRole('status')).toHaveTextContent('Body');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('is an alert with live="assertive"', () => {
      render(<Alert live="assertive">Body</Alert>);
      expect(screen.getByRole('alert')).toHaveTextContent('Body');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('keeps the same region element when its children change', () => {
      const { rerender } = render(<Alert live="polite">First</Alert>);
      const region = screen.getByRole('status');
      rerender(<Alert live="polite">Second</Alert>);
      expect(screen.getByRole('status')).toBe(region);
      expect(region).toHaveTextContent('Second');
    });
  });

  describe('tone and tone label', () => {
    it('defaults to tone="info" with the "Info: " prefix', () => {
      render(
        <Alert live="polite" data-testid="alert">
          Body
        </Alert>,
      );
      expect(screen.getByTestId('alert')).toHaveAttribute('data-tone', 'info');
      expect(screen.getByRole('status').textContent).toBe('Info: Body');
    });

    it.each(tones)('reflects tone="%s" as data-tone on the root', (tone) => {
      render(
        <Alert tone={tone} data-testid="alert">
          Body
        </Alert>,
      );
      expect(screen.getByTestId('alert')).toHaveAttribute('data-tone', tone);
    });

    it.each(defaultPrefixes)('prefixes tone="%s" with "%s"', (tone, prefix) => {
      render(
        <Alert live="polite" tone={tone}>
          Body
        </Alert>,
      );
      expect(screen.getByRole('status').textContent).toBe(`${prefix}Body`);
    });

    it('includes "Warning:" in the text for the warning tone', () => {
      render(
        <Alert live="polite" tone="warning">
          Disk almost full
        </Alert>,
      );
      expect(screen.getByRole('status')).toHaveTextContent('Warning: Disk almost full');
    });

    it('uses a custom toneLabel', () => {
      render(
        <Alert live="polite" tone="success" toneLabel="Done">
          Body
        </Alert>,
      );
      expect(screen.getByRole('status').textContent).toBe('Done: Body');
    });

    it('allows a toneLabel on the neutral tone', () => {
      render(
        <Alert live="polite" tone="neutral" toneLabel="Note">
          Body
        </Alert>,
      );
      expect(screen.getByRole('status').textContent).toBe('Note: Body');
    });

    it('has no prefix for the neutral tone', () => {
      render(
        <Alert live="polite" tone="neutral" title="Title">
          Body
        </Alert>,
      );
      expect(screen.getByRole('status').textContent).toBe('TitleBody');
    });

    it('renders the prefix once, in the title, when both title and body are given', () => {
      render(
        <Alert live="polite" tone="warning" title="Title">
          Body
        </Alert>,
      );
      expect(screen.getAllByText('Warning:')).toHaveLength(1);
      expect(screen.getByRole('status').textContent).toBe('Warning: TitleBody');
    });

    it('renders the prefix once for a title-only alert', () => {
      render(<Alert live="polite" tone="danger" title="Payment failed" />);
      expect(screen.getAllByText('Error:')).toHaveLength(1);
      expect(screen.getByRole('status').textContent).toBe('Error: Payment failed');
    });

    it('renders the prefix once for a body-only alert', () => {
      render(
        <Alert live="polite" tone="success">
          Saved
        </Alert>,
      );
      expect(screen.getAllByText('Success:')).toHaveLength(1);
      expect(screen.getByRole('status').textContent).toBe('Success: Saved');
    });
  });

  describe('dismiss', () => {
    it('shows no button without onDismiss', () => {
      render(<Alert>Body</Alert>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows a "Dismiss" button with onDismiss and calls it on click', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<Alert onDismiss={onDismiss}>Body</Alert>);
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('reaches the dismiss button with Tab and activates it with Enter and Space', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(
        <>
          <button type="button">Before</button>
          <Alert onDismiss={onDismiss}>Body</Alert>
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.tab();
      const dismiss = screen.getByRole('button', { name: 'Dismiss' });
      expect(dismiss).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onDismiss).toHaveBeenCalledTimes(1);
      await user.keyboard(' ');
      expect(onDismiss).toHaveBeenCalledTimes(2);
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('is skipped by Tab when there is no dismiss button', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Alert>Body</Alert>
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('uses a custom dismissLabel', () => {
      render(
        <Alert onDismiss={() => undefined} dismissLabel="Hide notice">
          Body
        </Alert>,
      );
      expect(screen.getByRole('button', { name: 'Hide notice' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    });

    it('does not hide itself when dismissed', async () => {
      const user = userEvent.setup();
      render(
        <Alert live="polite" onDismiss={() => undefined}>
          Body
        </Alert>,
      );
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.getByRole('status')).toBeVisible();
    });

    it('keeps the dismiss button outside the live region', () => {
      render(
        <Alert live="assertive" onDismiss={() => undefined}>
          Body
        </Alert>,
      );
      const region = screen.getByRole('alert');
      expect(region).not.toContainElement(screen.getByRole('button', { name: 'Dismiss' }));
    });

    it('does not include the dismiss label in the region text', () => {
      render(
        <Alert live="polite" tone="neutral" onDismiss={() => undefined}>
          Body
        </Alert>,
      );
      expect(screen.getByRole('status').textContent).toBe('Body');
    });
  });

  describe('props', () => {
    it('forwards the ref to the root div', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Alert ref={ref} live="polite" data-testid="alert">
          Body
        </Alert>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBe(screen.getByTestId('alert'));
      expect(ref.current).toContainElement(screen.getByRole('status'));
    });

    it('merges className with its own class on the root', () => {
      render(
        <Alert className="extra" data-testid="alert">
          Body
        </Alert>,
      );
      const root = screen.getByTestId('alert');
      expect(root).toHaveClass('extra');
      expect(root.classList.length).toBeGreaterThan(1);
    });

    it('passes native props through to the root', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Alert ref={ref} id="notice" data-testid="alert" style={{ color: 'red' }}>
          Body
        </Alert>,
      );
      const root = screen.getByTestId('alert');
      expect(root).toBe(ref.current);
      expect(root).toHaveAttribute('id', 'notice');
      expect(root).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });
  });

  describe('accessibility', () => {
    it.each(tones)('has no axe violations for tone="%s"', async (tone) => {
      const { container } = render(
        <Alert tone={tone} title="Title">
          Body
        </Alert>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it.each(['off', 'polite', 'assertive'] as const)(
      'has no axe violations with live="%s"',
      async (live) => {
        const { container } = render(
          <Alert live={live} title="Title">
            Body
          </Alert>,
        );
        expect(await axe(container)).toHaveNoViolations();
      },
    );

    const toneLiveCombos = tones.flatMap((tone) =>
      (['off', 'polite', 'assertive'] as const).map((live) => [tone, live] as const),
    );

    it.each(toneLiveCombos)(
      'has no axe violations for tone="%s" live="%s", dismissible',
      async (tone, live) => {
        const { container } = render(
          <Alert tone={tone} live={live} title="Title" onDismiss={() => undefined}>
            Body
          </Alert>,
        );
        expect(await axe(container)).toHaveNoViolations();
      },
    );

    it('has no axe violations when dismissible', async () => {
      const { container } = render(
        <Alert live="assertive" tone="danger" title="Title" onDismiss={() => undefined}>
          Body
        </Alert>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
