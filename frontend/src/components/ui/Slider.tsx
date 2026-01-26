import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import './Slider.css';

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  fullWidth?: boolean;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      label,
      hint,
      min,
      max,
      step = 1,
      value,
      onChange,
      showValue = true,
      valueFormatter,
      fullWidth = false,
      className = '',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hintId = `${id}-hint`;

    const wrapperClasses = ['slider-wrapper', fullWidth && 'slider-full-width']
      .filter(Boolean)
      .join(' ');

    const sliderClasses = ['slider', className].filter(Boolean).join(' ');

    // Calculate the fill percentage for the track
    const percentage = ((value - min) / (max - min)) * 100;

    const displayValue = valueFormatter ? valueFormatter(value) : value;

    return (
      <div className={wrapperClasses}>
        <div className="slider-header">
          {label && (
            <label htmlFor={id} className="slider-label">
              {label}
            </label>
          )}
          {showValue && <span className="slider-value">{displayValue}</span>}
        </div>
        <div className="slider-container">
          <input
            ref={ref}
            id={id}
            type="range"
            className={sliderClasses}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            aria-describedby={hint ? hintId : undefined}
            style={
              {
                '--slider-percentage': `${percentage}%`,
              } as React.CSSProperties
            }
            {...props}
          />
        </div>
        {hint && (
          <span id={hintId} className="slider-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';
