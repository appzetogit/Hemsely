import React from 'react';
import { cn } from '../../lib/utils';

export const Spinner = ({ className }) => (
    <div className={cn('h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin', className)} />
);

export const PageSpinner = () => (
    <div className="flex items-center justify-center py-20">
        <Spinner />
    </div>
);

export default Spinner;
