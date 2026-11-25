import { render, screen } from '@testing-library/react';
import { useContext, useEffect, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OverlayHostContext, type OverlayHost } from './overlayHost';

function Consumer() {
  const host = useContext(OverlayHostContext);
  const outlet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host || !outlet.current) return;
    return host.registerModal(outlet.current);
  }, [host]);
  return <div ref={outlet}>{host ? 'has host' : 'no host'}</div>;
}

describe('OverlayHostContext', () => {
  it('is null without a provider', () => {
    render(<Consumer />);
    expect(screen.getByText('no host')).toBeInTheDocument();
  });

  it('lets a consumer register an outlet and unregister it on unmount', () => {
    const unregister = vi.fn();
    const host: OverlayHost = { registerModal: vi.fn(() => unregister) };
    const { unmount } = render(
      <OverlayHostContext.Provider value={host}>
        <Consumer />
      </OverlayHostContext.Provider>,
    );
    expect(host.registerModal).toHaveBeenCalledWith(screen.getByText('has host'));
    unmount();
    expect(unregister).toHaveBeenCalledOnce();
  });
});
