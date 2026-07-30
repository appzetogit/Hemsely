import React from 'react';

export const Table = ({ children }) => (
    <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left text-zinc-600">
            {children}
        </table>
    </div>
);

export const TableHead = ({ children }) => (
    <thead className="text-xs font-semibold text-white uppercase bg-zinc-800 border-y border-zinc-800">
        {children}
    </thead>
);

export const TableRow = ({ children, className = '' }) => (
    <tr className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${className}`}>
        {children}
    </tr>
);

export const TableHeader = ({ children, className = '' }) => (
    <th scope="col" className={`px-4 py-3.5 tracking-wider ${className}`}>
        {children}
    </th>
);

export const TableCell = ({ children, className = '' }) => (
    <td className={`px-4 py-4 ${className}`}>
        {children}
    </td>
);
