import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import '../src/tokens/tokens.css';
import '../src/styles/base.css';
import './preview.css';

type ThemeGlobal = 'light' | 'dark' | 'side-by-side';
type ThemeName = 'light' | 'dark';

interface ThemeFrameProps {
  forced: ThemeName | undefined;
  global: ThemeGlobal;
  isDocs: boolean;
  children: (theme: ThemeName) => ReactNode;
}

function ThemeFrame({ forced, global, isDocs, children }: ThemeFrameProps) {
  // On a standalone story page, theme the whole iframe so portals
  // (dialogs, toasts, tooltips) rendered into <body> match the story.
  useEffect(() => {
    if (isDocs) return;
    document.documentElement.dataset.theme = forced ?? (global === 'dark' ? 'dark' : 'light');
  }, [forced, global, isDocs]);

  const themesToRender: ThemeName[] = forced
    ? [forced]
    : global === 'side-by-side'
      ? ['light', 'dark']
      : [global];

  const frames = themesToRender.map((theme) => (
    <div key={theme} data-theme={theme} className="sb-gn-frame" data-docs={isDocs || undefined}>
      {children(theme)}
    </div>
  ));

  return frames.length > 1 ? <div className="sb-gn-split">{frames}</div> : frames;
}

/**
 * Applies the theme. The toolbar sets the global theme. A story can force one
 * with `parameters: { theme: 'dark' }`, which is how the DarkMode stories work,
 * so they render dark even on a docs page next to light stories.
 */
const withTheme: Decorator = (Story, context) => (
  <ThemeFrame
    forced={context.parameters.theme as ThemeName | undefined}
    global={(context.globals.theme as ThemeGlobal | undefined) ?? 'light'}
    isDocs={context.viewMode === 'docs'}
  >
    {() => <Story />}
  </ThemeFrame>
);

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'side-by-side', title: 'Side by side', icon: 'sidebyside' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'fullscreen',
    controls: {
      expanded: true,
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: {
      // Report violations as errors in the a11y panel instead of warnings.
      test: 'error',
    },
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', ['Design Tokens'], 'Components', '*'],
      },
    },
  },
  tags: ['autodocs'],
};

export default preview;
