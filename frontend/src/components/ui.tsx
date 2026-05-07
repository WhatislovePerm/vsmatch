import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/* ───── Button ───── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ink-3]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[--color-ink-3] text-white hover:bg-[--color-ink] active:scale-[.98] shadow-[0_4px_14px_rgba(26,26,46,0.18)]',
  secondary:
    'bg-[--color-card] text-[--color-ink-2] border border-[--color-line-strong] hover:bg-[--color-subtle] active:scale-[.98]',
  ghost:
    'bg-transparent text-[--color-ink-2] hover:bg-[--color-subtle]',
  danger:
    'bg-[--color-danger] text-white hover:opacity-90 active:scale-[.98]',
};

const buttonSizes: Record<ButtonSize, string> = {
  md: 'px-5 py-3 text-[14px]',
  sm: 'px-3.5 py-2 text-[13px] rounded-[12px]',
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
        'bg-[--color-card] rounded-[32px] border border-[--color-line]',
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
        <label htmlFor={inputId} className="text-[12px] font-medium text-[--color-muted] uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...rest}
        className={clsx(
          'h-11 px-4 bg-[--color-subtle] border border-[--color-line] rounded-[14px]',
          'text-[14px] text-[--color-ink] placeholder:text-[--color-muted-2]',
          'transition-colors focus:outline-none focus:border-[--color-ink-3]/40 focus:bg-[--color-card]',
          className,
        )}
      />
      {hint && <span className="text-[12px] text-[--color-muted]">{hint}</span>}
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
  neutral: 'bg-[--color-subtle] text-[--color-ink-2] border-[--color-line]',
  success: 'bg-[#e8f6ec] text-[#1f7a3a] border-[#cfeed9]',
  danger:  'bg-[#fdecec] text-[#b91c1c] border-[#f8c9c9]',
  warn:    'bg-[#fcf3da] text-[#9a6b00] border-[#f1dca0]',
  info:    'bg-[#e8edf6] text-[#1f2c41] border-[#cfd6e6]',
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

/* ───── IconButton (квадратная иконочная кнопка) ───── */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'subtle';
}

export function IconButton({ variant = 'ghost', className, children, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors',
        'text-[--color-muted] hover:text-[--color-ink] focus:outline-none',
        variant === 'ghost' ? 'hover:bg-[--color-subtle]' : 'bg-[--color-subtle] hover:bg-[--color-line]',
        className,
      )}
    >
      {children}
    </button>
  );
}
