/**
 * Greenility UI public API.
 *
 * Consumers also import the stylesheet once at the app root:
 *   import 'greenility-ui/styles.css';
 */
import './tokens/tokens.css';
import './styles/base.css';

// Utilities and hooks
export { cx, type ClassValue } from './utils/cx';
export { composeRefs } from './utils/composeRefs';
export {
  useControllableState,
  type UseControllableStateOptions,
} from './hooks/useControllableState';

// Tokens (for JS consumers, e.g. charts or canvas)
export { palette, scales, themes, cssVar, type ThemeName, type ColorRole } from './tokens/tokens';

// Shared prop vocabulary
export type {
  AlertTone,
  BadgeVariant,
  ButtonVariant,
  CheckedState,
  Orientation,
  Size,
  Tone,
} from './utils/types';

// Components
export { VisuallyHidden, type VisuallyHiddenProps } from './components/VisuallyHidden';
