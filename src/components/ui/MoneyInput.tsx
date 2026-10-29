import { forwardRef } from 'react';
import { Input, type InputProps } from '@/components/ui/Field';
import { maskMoneyInput } from '@/utils/money';

export interface MoneyInputProps
  extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, ...props }, ref) => (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(event) => onValueChange(maskMoneyInput(event.target.value))}
      {...props}
    />
  ),
);

MoneyInput.displayName = 'MoneyInput';
