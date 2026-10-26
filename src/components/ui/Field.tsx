import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { cn } from '@/utils/cn';

interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[0.8125rem] font-medium text-chalk"
      >
        {label}
        {required && (
          <span className="text-gold" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="text-xs text-loss" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-mist-dim">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  'w-full rounded-lg border border-line bg-ink/60 px-3.5 text-sm text-chalk placeholder:text-mist-dim/80 transition-colors hover:border-line-strong focus:border-gold/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-11', invalid && 'border-loss/70', className)}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'min-h-28 py-2.5', invalid && 'border-loss/70', className)}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'select-chevron h-11 appearance-none pr-9',
        invalid && 'border-loss/70',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';

export function useFieldId(id?: string) {
  const generated = useId();
  return id ?? `field-${generated.replace(/:/g, '')}`;
}
