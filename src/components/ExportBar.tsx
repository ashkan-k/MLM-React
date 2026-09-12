import { exportFormats, exportSheets, type ExportFormat, type ExportSheet } from '../lib/export'

export function ExportBar({ filename, sheets, testId }: { filename: string; sheets: ExportSheet[]; testId?: string }) {
  return (
    <div className="export-bar" data-testid={testId ?? 'export-bar'}>
      {exportFormats.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === 'xlsx' ? 'btn btn-primary' : 'btn btn-ghost'}
          onClick={() => exportSheets(filename, sheets, item.id as ExportFormat)}
        >
          خروجی {item.label}
        </button>
      ))}
    </div>
  )
}
