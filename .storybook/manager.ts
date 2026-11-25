import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Greenility UI',
    brandUrl: 'https://github.com',
    colorPrimary: '#0d705a',
    colorSecondary: '#0d705a',
    fontBase: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontCode: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
    appBorderRadius: 6,
    inputBorderRadius: 6,
  }),
});
