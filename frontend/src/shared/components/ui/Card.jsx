import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ className, ...props }) => (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white shadow-sm', className)} {...props} />
);

export const CardHeader = ({ className, ...props }) => (
    <div className={cn('flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4', className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
    <h3 className={cn('text-base font-semibold text-zinc-900', className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
    <div className={cn('p-5', className)} {...props} />
);

export default Card;
