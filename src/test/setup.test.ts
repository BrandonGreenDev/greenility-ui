import { describe, expect, it, vi } from 'vitest';

describe('jsdom shims', () => {
  it('showModal sets open and data-modal; close removes them and fires close', () => {
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    const onClose = vi.fn();
    dialog.addEventListener('close', onClose);
    dialog.showModal();
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveAttribute('data-modal');
    dialog.close();
    expect(dialog.open).toBe(false);
    expect(dialog).not.toHaveAttribute('data-modal');
    expect(onClose).toHaveBeenCalledOnce();
    dialog.close();
    expect(onClose).toHaveBeenCalledOnce();
    dialog.remove();
  });

  it('popover methods toggle data-popover-open', () => {
    const element = document.createElement('div');
    element.showPopover();
    expect(element).toHaveAttribute('data-popover-open');
    element.hidePopover();
    expect(element).not.toHaveAttribute('data-popover-open');
    expect(element.togglePopover()).toBe(true);
    expect(element.togglePopover(true)).toBe(true);
    expect(element.togglePopover()).toBe(false);
  });

  it('scrollIntoView exists', () => {
    expect(() => {
      document.createElement('div').scrollIntoView({ block: 'nearest' });
    }).not.toThrow();
  });
});
