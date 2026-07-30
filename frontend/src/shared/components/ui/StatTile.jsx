import React from 'react';
import { cn } from '../../lib/utils';

// Tailwind's compiler needs literal class strings, so accents are a static
// lookup table rather than interpolated `bg-${accent}-100`.
const ACCENTS = {
    brand: { bg: 'bg-brand-100', text: 'text-brand-600' },
    success: { bg: 'bg-success-50', text: 'text-success-600' },
    danger: { bg: 'bg-danger-50', text: 'text-danger-600' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600' },
};

export const StatTile = ({ icon: Icon, label, value, hint, accent = 'brand', className }) => {
    const colors = ACCENTS[accent] || ACCENTS.brand;
    return (
        <div className={cn('rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm', className)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</span>
                {Icon && (
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', colors.bg)}>
                        <Icon className={cn('h-4.5 w-4.5', colors.text)} />
                    </div>
                )}
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
        </div>
    );
};

export default StatTile;
