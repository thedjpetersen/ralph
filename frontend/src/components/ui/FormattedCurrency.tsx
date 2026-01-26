import { forwardRef, type HTMLAttributes, useMemo } from 'react';
import './FormattedCurrency.css';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'MXN' | 'BRL' | 'KRW';
export type FormattedCurrencySize = 'sm' | 'md' | 'lg';

export interface FormattedCurrencyProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  currency?: CurrencyCode;
  locale?: string;
  compact?: boolean;
  showSign?: boolean;
  colorize?: boolean;
  size?: FormattedCurrencySize;
  decimals?: number;
}

export const FormattedCurrency = forwardRef<HTMLSpanElement, FormattedCurrencyProps>(
  (
    {
      value,
      currency = 'USD',
      locale = 'en-US',
      compact = false,
      showSign = false,
      colorize = false,
      size = 'md',
      decimals,
      className = '',
      ...props
    },
    ref
  ) => {
    const formattedValue = useMemo(() => {
      const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short',
      };

      if (decimals !== undefined) {
        options.minimumFractionDigits = decimals;
        options.maximumFractionDigits = decimals;
      }

      const formatter = new Intl.NumberFormat(locale, options);
      let formatted = formatter.format(Math.abs(value));

      if (showSign && value > 0) {
        formatted = `+${formatted}`;
      } else if (value < 0) {
        formatted = `-${formatted}`;
      }

      return formatted;
    }, [value, currency, locale, compact, showSign, decimals]);

    const colorClass = colorize
      ? value > 0
        ? 'formatted-currency-positive'
        : value < 0
          ? 'formatted-currency-negative'
          : ''
      : '';

    const classes = [
      'formatted-currency',
      `formatted-currency-${size}`,
      colorClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span
        ref={ref}
        className={classes}
        data-value={value}
        data-currency={currency}
        {...props}
      >
        {formattedValue}
      </span>
    );
  }
);

FormattedCurrency.displayName = 'FormattedCurrency';
