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
  ActivationMode,
  Align,
  AlertTone,
  BadgeVariant,
  ButtonVariant,
  CheckedState,
  Orientation,
  Placement,
  Size,
  SortDirection,
  SortState,
  Tone,
} from './utils/types';

// Components
export { VisuallyHidden, type VisuallyHiddenProps } from './components/VisuallyHidden';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { Button, type ButtonProps } from './components/Button';
export { IconButton, type IconButtonProps } from './components/IconButton';
export { Alert, type AlertProps } from './components/Alert';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { RadioGroup, Radio, type RadioGroupProps, type RadioProps } from './components/RadioGroup';
export { Switch, type SwitchProps } from './components/Switch';
export { Badge, type BadgeProps } from './components/Badge';
export { TextField, type TextFieldProps } from './components/TextField';
export { TextArea, type TextAreaProps } from './components/TextArea';
export { NativeSelect, type NativeSelectProps } from './components/NativeSelect';
