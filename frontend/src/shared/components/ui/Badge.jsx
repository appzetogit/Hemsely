import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
    {
        variants: {
            variant: {
                neutral: 'bg-zinc-100 text-zinc-700',
                brand: 'bg-brand-100 text-brand-700',
                success: 'bg-success-50 text-success-600',
                danger: 'bg-danger-50 text-danger-600',
                warning: 'bg-warning-50 text-warning-600',
            },
        },
        defaultVariants: { variant: 'neutral' },
    }
);

export const Badge = ({ className, variant, ...props }) => (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export default Badge;
