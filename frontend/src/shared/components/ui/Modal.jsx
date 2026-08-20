import React from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export const Modal = ({ open, onClose, title, children, className }) => {
    if (!open) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed top-16 md:left-72 left-0 right-0 bottom-0 z-40 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/35"
            onClick={onClose}
        >
            <div
                className={cn('w-full max-w-lg rounded-3xl bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-6 relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', className)}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-center justify-between pb-3 mb-4">
                        <h3 className="text-base font-bold text-zinc-900">{title}</h3>
                        <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer border-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div>{children}</div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
