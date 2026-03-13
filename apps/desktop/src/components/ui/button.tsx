import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.97]',
          {
            'bg-surface-700 text-surface-100 hover:bg-surface-600 border border-surface-600':
              variant === 'default',
            'bg-accent-600 text-white hover:bg-accent-500 shadow-lg shadow-accent-600/20':
              variant === 'primary',
            'bg-transparent text-surface-300 hover:bg-surface-800 hover:text-surface-100':
              variant === 'ghost',
            'bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/20':
              variant === 'danger',
          },
          {
            'h-7 px-2.5 text-xs gap-1': size === 'sm',
            'h-9 px-4 text-sm gap-2': size === 'md',
            'h-11 px-6 text-base gap-2': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
