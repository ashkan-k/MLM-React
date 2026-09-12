import { formatGrouped, parseGrouped } from '../lib/format'

export function MoneyInput({
  value,
  onChange,
  testId,
  required,
}: {
  value: string
  onChange: (raw: string) => void
  testId?: string
  required?: boolean
}) {
  return (
    <input
      className="input"
      inputMode="numeric"
      data-testid={testId}
      required={required}
      value={formatGrouped(value)}
      onChange={(e) => onChange(parseGrouped(e.target.value))}
    />
  )
}
