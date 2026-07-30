import React from 'react';
import { cn } from '../../lib/utils';

export const Modal = ({ open, onClose, title, children, className }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close modal"
                onClick={onClose}
                className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm border-0 cursor-default"
            />
            <div className={cn('relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl', className)}>
                {title && (
                    <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
                        <button type="button" aria-label="Close" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 cursor-pointer bg-transparent border-0 text-xl leading-none">
                            ×
                        </button>
                    </div>
                )}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
