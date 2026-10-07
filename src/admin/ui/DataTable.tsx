"use client";

import { flexRender, stockFeatures, useTable, type ColumnDef, type RowData } from "@tanstack/react-table";

export function DataTable<T extends RowData>({
  data,
  columns,
}: {
  data: T[];
  columns: ColumnDef<any, T>[];
}) {
  const table = useTable({ features: stockFeatures, data, columns });
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
