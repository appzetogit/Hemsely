import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    {
        variants: {
            variant: {
                primary: 'bg-brand-500 text-white shadow-sm hover:bg-brand-600',
                secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
                outline: 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
                ghost: 'text-zinc-600 hover:bg-zinc-100',
                danger: 'bg-danger-500 text-white shadow-sm hover:bg-danger-600',
                dangerOutline: 'border border-danger-200 bg-danger-50 text-danger-600 hover:bg-red-100',
            },
            size: {
                sm: 'h-8 px-3 text-xs',
                md: 'h-10 px-4',
                lg: 'h-12 px-6 text-base',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

export const Button = React.forwardRef(({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

export default Button;
