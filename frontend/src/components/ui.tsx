import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/* ───── Button ───── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-3/30 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink-3 text-white hover:bg-ink active:scale-[.98] shadow-[0_8px_20px_-6px_rgba(26,26,46,0.45)]',
  secondary:
    'bg-card text-ink-2 border border-line-strong hover:bg-subtle active:scale-[.98]',
  ghost:
    'bg-transparent text-ink-2 hover:bg-subtle',
  danger:
    'bg-danger text-white hover:opacity-90 active:scale-[.98]',
};

const buttonSizes: Record<ButtonSize, string> = {
  lg: 'h-13 px-6 text-[15px] rounded-[18px] min-h-[52px]',
  md: 'h-11 px-5 text-[14px] rounded-[14px]',
  sm: 'h-9 px-3.5 text-[13px] rounded-[12px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        block && 'w-full',
        className,
      )}
    >
      {iconLeft && <span className="flex shrink-0">{iconLeft}</span>}
      {children}
      {iconRight && <span className="flex shrink-0">{iconRight}</span>}
    </button>
  );
}

/* ───── Card ───── */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={clsx(
        'bg-card rounded-[28px] border border-line shadow-[0_4px_20px_-8px_rgba(31,44,65,0.08)]',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ───── Input ───── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, id, className, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[11px] font-bold text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...rest}
        className={clsx(
          'h-11 px-4 bg-subtle border border-line rounded-[14px]',
          'text-[14px] text-ink placeholder:text-muted-2',
          'transition-colors focus:outline-none focus:border-ink-3/40 focus:bg-card',
          className,
        )}
      />
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  );
}

/* ───── Badge ───── */

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warn' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  iconLeft?: ReactNode;
}

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-ink-2 border-line',
  success: 'bg-success-bg text-success border-success-line',
  danger:  'bg-danger-bg text-danger border-danger-line',
  warn:    'bg-warn-bg text-warn border-warn-line',
  info:    'bg-info-bg text-info border-info-line',
};

export function Badge({ tone = 'neutral', iconLeft, className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border',
        badgeTones[tone],
        className,
      )}
    >
      {iconLeft && <span className="flex shrink-0">{iconLeft}</span>}
      {children}
    </span>
  );
}

/* ───── IconButton ───── */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'subtle';
}

export function IconButton({ variant = 'ghost', className, children, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors',
        'text-muted hover:text-ink focus:outline-none',
        variant === 'ghost' ? 'hover:bg-subtle' : 'bg-subtle hover:bg-line',
        className,
      )}
    >
      {children}
    </button>
  );
}
