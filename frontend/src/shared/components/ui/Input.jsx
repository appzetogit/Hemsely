import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={cn(
            'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500',
            className
        )}
        {...props}
    />
));
Input.displayName = 'Input';

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500',
            className
        )}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            className
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';

export const Label = ({ className, ...props }) => (
    <label className={cn('mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500', className)} {...props} />
);

export default Input;
