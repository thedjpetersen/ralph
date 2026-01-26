import {
  forwardRef,
  createContext,
  useContext,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from 'react';
import './Radio.css';

export type RadioSize = 'sm' | 'md' | 'lg';

// RadioGroup context
interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: RadioSize;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

// RadioGroup component
export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: RadioSize;
  label?: string;
  error?: string;
  hint?: string;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
  className?: string;
}

export const RadioGroup = ({
  name,
  value,
  onChange,
  disabled,
  size = 'md',
  label,
  error,
  hint,
  orientation = 'vertical',
  children,
  className = '',
}: RadioGroupProps) => {
  const generatedId = useId();
  const groupId = `radio-group-${generatedId}`;
  const errorId = `${groupId}-error`;
  const hintId = `${groupId}-hint`;

  const wrapperClasses = [
    'radio-group',
    disabled && 'radio-group-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const optionsClasses = [
    'radio-group-options',
    `radio-group-${orientation}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled, size }}>
      <fieldset
        className={wrapperClasses}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
      >
        {label && <legend className="radio-group-label">{label}</legend>}
        <div className={optionsClasses} role="radiogroup">
          {children}
        </div>
        {error && (
          <span id={errorId} className="radio-error-message" role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className="radio-hint">
            {hint}
          </span>
        )}
      </fieldset>
    </RadioGroupContext.Provider>
  );
};

RadioGroup.displayName = 'RadioGroup';

// Radio component
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  size?: RadioSize;
  value: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      size: sizeProp,
      value,
      className = '',
      id: providedId,
      disabled: disabledProp,
      name: nameProp,
      checked: checkedProp,
      onChange: onChangeProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const groupContext = useContext(RadioGroupContext);

    const name = nameProp || groupContext?.name || '';
    const size = sizeProp || groupContext?.size || 'md';
    const disabled = disabledProp || groupContext?.disabled;

    // Determine if checked from context or prop
    const isChecked = groupContext
      ? groupContext.value === value
      : checkedProp;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (groupContext?.onChange) {
        groupContext.onChange(value);
      }
      if (onChangeProp) {
        onChangeProp(e);
      }
    };

    const wrapperClasses = [
      'radio-wrapper',
      disabled && 'radio-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const radioClasses = [
      'radio',
      `radio-${size}`,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        <label className="radio-label">
          <input
            ref={ref}
            type="radio"
            id={id}
            name={name}
            value={value}
            className={radioClasses}
            disabled={disabled}
            checked={isChecked}
            onChange={handleChange}
            {...props}
          />
          <span className={`radio-indicator radio-indicator-${size}`} aria-hidden="true">
            <span className="radio-dot" />
          </span>
          {label && <span className="radio-text">{label}</span>}
        </label>
      </div>
    );
  }
);

Radio.displayName = 'Radio';
