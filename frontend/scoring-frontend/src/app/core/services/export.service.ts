import { Injectable } from '@angular/core';
import { TableColumn } from '../../shared/components/ui/data-table.component';

/**
 * Reusable export service shared by all modules (Clients, Users, Scores, Audit,
 * Dashboards). Generates an Excel-compatible CSV (UTF-8 BOM) client-side from a
 * column definition + rows. Pages with a backend .xlsx endpoint can pass their
 * own export handler to the table instead. PDF export is a future addition.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {

  /** Export rows using a table column definition (header + value accessor). */
  exportRows(filename: string, columns: TableColumn[], rows: any[]): void {
    const headers = columns.map(c => c.header);
    const lines = rows.map(r => columns.map(c => this.cell(r, c)));
    this.exportCsv(filename, headers, lines);
  }

  /** Export from explicit headers + string matrix. */
  exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private cell(row: any, col: TableColumn): string | number {
    if (col.badge) return col.badge(row).label;
    const v = col.format ? col.format(row) : row?.[col.key];
    return v ?? '';
  }
}
