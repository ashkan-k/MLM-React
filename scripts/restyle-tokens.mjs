import fs from 'fs'
import path from 'path'

const root = path.resolve(import.meta.dirname, '..')
const pageDir = path.join(root, 'src', 'pages')
const compDir = path.join(root, 'src', 'components')
const skipComponents = new Set(['ui.tsx', 'table.tsx', 'OrgTree.tsx'])

function listTsx(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((f) => path.join(dir, f))
}

const files = [
  ...listTsx(pageDir),
  ...listTsx(compDir).filter((f) => !skipComponents.has(path.basename(f))),
]

/** @type {[RegExp | string, string][]} */
const rules = [
  // StatCard / gradient presets
  ['from-blue-500 to-blue-600', 'from-info to-info'],
  ['from-sky-500 to-sky-600', 'from-info to-info'],
  ['from-emerald-500 to-emerald-600', 'from-ok to-ok'],
  ['from-teal-500 to-emerald-600', 'from-prim to-ok'],
  ['from-amber-500 to-amber-600', 'from-warn to-acc'],
  ['from-rose-500 to-rose-600', 'from-bad to-bad'],
  ['from-rose-500 to-orange-500', 'from-bad to-acc'],
  ['from-violet-500 to-violet-600', 'from-prim to-prim2'],
  ['from-purple-500 to-purple-600', 'from-prim to-prim2'],

  // Card wrapper shortcuts
  [
    'rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900',
    'card',
  ],
  [
    'rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900',
    'card',
  ],
  ['bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700', 'card p-4'],
  ['bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700', 'card'],

  // Combined text (light + dark)
  ['text-surface-900 dark:text-surface-50', 'text-ink'],
  ['text-surface-800 dark:text-surface-100', 'text-ink'],
  ['text-surface-800 dark:text-surface-200', 'text-ink'],
  ['text-surface-700 dark:text-surface-200', 'text-ink'],
  ['text-surface-700 dark:text-surface-300', 'text-ink'],
  ['text-surface-600 dark:text-surface-400', 'text-mute'],
  ['text-surface-600 dark:text-surface-300', 'text-mute'],
  ['text-surface-500 dark:text-surface-400', 'text-mute'],
  ['text-emerald-700 dark:text-emerald-300', 'text-ok'],
  ['text-rose-700 dark:text-rose-300', 'text-bad'],
  ['text-amber-900 dark:text-amber-100', 'text-warn'],

  // Primary
  ['hover:text-primary-700', 'hover:text-prim2'],
  ['hover:text-primary-600', 'hover:text-prim2'],
  ['text-primary-700', 'text-prim'],
  ['text-primary-600', 'text-prim'],
  ['text-primary-500', 'text-prim'],
  ['bg-primary-600', 'bg-prim'],
  ['bg-primary-500', 'bg-prim'],
  ['from-primary-400 to-primary-600', 'from-prim to-prim2'],
  ['hover:border-primary-600', 'hover:border-prim'],
  ['hover:border-primary-300', 'hover:border-prim'],
  ['dark:hover:border-primary-600', ''],
  ['dark:hover:border-primary-300', ''],
  ['border-primary-200/80', 'border-prim/30'],
  ['hover:border-primary-200/80', 'hover:border-prim/30'],
  ['focus:ring-primary-500/20 focus:border-primary-500', 'focus:ring-prim/20 focus:border-prim'],
  ['accent-primary-600', 'accent-prim'],
  ['bg-primary-50 dark:bg-primary-900/20 text-primary-700', 'bg-primsoft text-prim'],
  ['bg-primary-50 dark:bg-primary-900/20', 'bg-primsoft'],
  ['hover:bg-primary-50 dark:hover:bg-primary-900/20', 'hover:bg-primsoft'],

  // Semantic colors
  ['text-emerald-600', 'text-ok'],
  ['text-rose-600', 'text-bad'],
  ['text-red-600', 'text-bad'],
  ['text-red-500', 'text-bad'],
  ['bg-emerald-500/15 text-emerald-600', 'bg-oksoft text-ok'],
  ['bg-rose-500/15 text-rose-600', 'bg-badsoft text-bad'],
  ['ring-emerald-400/40', 'ring-ok/40'],
  ['border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20', 'border-ok/30 bg-oksoft'],
  ['border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20', 'border-bad/30 bg-badsoft'],
  ['border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20', 'border-warn/30 bg-warnsoft'],
  ['border border-red-200 dark:border-red-900/40', 'border border-bad/30'],

  // Blue / sky backgrounds for quick actions
  ['bg-blue-500', 'bg-info'],

  // Borders combined
  ['border-surface-200/90 dark:border-surface-700/80', 'border-line'],
  ['border-surface-200/80 dark:border-surface-700/80', 'border-line'],
  ['border-surface-200/70 dark:border-surface-700/70', 'border-line'],
  ['border-surface-200 dark:border-surface-700', 'border-line'],
  ['border-surface-200 dark:border-surface-600', 'border-line'],
  ['border-surface-100 dark:border-surface-700', 'border-line'],
  ['border-surface-100 dark:border-surface-800', 'border-line'],
  ['border-surface-100/90 dark:border-surface-700/80', 'border-line'],
  ['border-b border-surface-200 dark:border-surface-700', 'border-b border-line'],
  ['border-t border-surface-100 dark:border-surface-800', 'border-t border-line'],
  ['border-s border-surface-200/80 dark:border-surface-700/80', 'border-s border-line'],

  // Backgrounds combined
  ['bg-surface-50/90 dark:bg-surface-800/60', 'bg-surface2'],
  ['bg-surface-50 dark:bg-surface-800/60', 'bg-surface2'],
  ['bg-surface-50 dark:bg-surface-800/50', 'bg-surface2'],
  ['bg-surface-50/80 dark:bg-surface-900/50', 'bg-surface2'],
  ['bg-surface-50 dark:bg-surface-800', 'bg-surface2'],
  ['bg-surface-100 dark:bg-surface-800', 'bg-surface3'],
  ['bg-white/70 dark:bg-surface-900/40', 'bg-surface/70'],
  ['bg-white/70 dark:bg-surface-900/50', 'bg-surface/70'],
  ['from-white via-white to-surface-50/80 dark:from-surface-900 dark:via-surface-900 dark:to-surface-800/60', 'from-surface via-surface to-surface2'],
  ['hover:bg-surface-50/70 dark:hover:bg-surface-800/35', 'hover:bg-surface2'],
  ['hover:bg-surface-50 dark:hover:bg-surface-900', 'hover:bg-surface2'],
  ['hover:bg-surface-100 dark:hover:bg-surface-800', 'hover:bg-surface3'],
  ['hover:bg-surface-100 dark:hover:bg-surface-700', 'hover:bg-surface3'],
  ['hover:bg-surface-50 dark:hover:bg-surface-700', 'hover:bg-surface2'],

  // Sticky table cells
  ['sticky start-0 bg-surface-50 dark:bg-surface-900', 'sticky start-0 bg-surface2'],
  ['sticky start-0 bg-white dark:bg-surface-800', 'sticky start-0 bg-surface'],

  // Remaining dark: text (drop dark half)
  ['dark:text-surface-300', ''],
  ['dark:text-surface-200', ''],
  ['dark:text-surface-100', ''],
  ['dark:text-surface-50', ''],
  ['dark:text-surface-400', ''],

  // Remaining dark: bg/border/hover
  ['dark:bg-surface-900', ''],
  ['dark:bg-surface-800', ''],
  ['dark:bg-surface-700', ''],
  ['dark:border-surface-700', ''],
  ['dark:border-surface-600', ''],
  ['dark:border-surface-800', ''],
  ['dark:hover:bg-surface-800', ''],
  ['dark:hover:bg-surface-700', ''],
  ['dark:hover:bg-surface-900', ''],
  ['dark:hover:text-primary-400', 'hover:text-prim'],

  // Single surface tokens
  ['text-surface-900', 'text-ink'],
  ['text-surface-800', 'text-ink'],
  ['text-surface-700', 'text-ink'],
  ['text-surface-600', 'text-mute'],
  ['text-surface-500', 'text-mute'],
  ['text-surface-400', 'text-faint'],
  ['text-surface-300', 'text-faint'],
  ['bg-surface-300', 'bg-surface3'],
  ['bg-surface-600', 'bg-surface3'],
  ['bg-surface-50', 'bg-surface2'],
  ['bg-surface-100', 'bg-surface3'],
  ['bg-white', 'bg-surface'],
  ['border-surface-200', 'border-line'],
  ['border-surface-100', 'border-line'],
  ['hover:text-primary-600', 'hover:text-prim'],
  ['hover:text-primary-400', 'hover:text-prim'],

  // Input focus leftovers
  ['focus:border-red-500', 'focus:border-bad'],
  ['border-red-500', 'border-bad'],

  // Pass 2 — leftovers
  ['bg-surface2 /', 'bg-surface2/'],
  ['bg-surface3 /', 'bg-surface3/'],
  ['hover:bg-surface2 /', 'hover:bg-surface2/'],
  ['hover:bg-surface3 /', 'hover:bg-surface3/'],
  ['from-white via-white to-surface-50/80 dark:from-surface-900 dark:via-surface-900 dark:to-surface-800/60', 'from-surface via-surface to-surface2/80'],
  ['bg-emerald-500/15 text-ok', 'bg-oksoft text-ok'],
  ['bg-rose-500/15 text-bad', 'bg-badsoft text-bad'],
  ['text-emerald-700 dark:text-emerald-400', 'text-ok'],
  ['text-amber-600 dark:text-amber-400', 'text-warn'],
  ['text-amber-700 dark:text-amber-300', 'text-warn'],
  ['text-amber-600', 'text-warn'],
  ['text-amber-800 bg-amber-50 border border-amber-200', 'text-warn bg-warnsoft border border-warn/30'],
  ['bg-primary-50 dark:bg-primary-950/40 border-s-4 border-primary-500', 'bg-primsoft border-s-4 border-prim'],
  ['divide-y divide-surface-100 dark:divide-surface-700', 'divide-y divide-line'],
  ['bg-emerald-500 text-white', 'bg-ok text-white'],
  ['bg-emerald-500', 'bg-ok'],
  ['bg-rose-500', 'bg-bad'],
  ['bg-sky-500 text-white', 'bg-info text-white'],
  ['bg-sky-500', 'bg-info'],
  ['bg-red-500 text-white', 'bg-bad text-white'],
  ['bg-red-500', 'bg-bad'],
  ['bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200', 'bg-badsoft border border-bad/30 text-bad'],
  ['text-red-800 dark:text-red-200', 'text-bad'],
  ['text-red-700 dark:text-red-300', 'text-bad'],
  ['text-red-700/80 dark:text-red-300/80', 'text-bad/80'],
  ['text-red-700', 'text-bad'],
  ['bg-violet-50/60 dark:bg-violet-950/25', 'bg-primsoft/60'],
  ['text-violet-700 dark:text-violet-300', 'text-prim'],
  ['text-violet-500', 'text-prim'],
  ['text-violet-700 dark:text-violet-200', 'text-prim'],
  ['bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-200', 'bg-primsoft text-prim'],
  ['from-rose-500 to-orange-400', 'from-bad to-acc'],
  ['from-blue-500 to-emerald-500', 'from-info to-ok'],
  ['text-bad dark:text-rose-300', 'text-bad'],
  ['bg-primary-50/80 dark:bg-primary-900/25', 'bg-primsoft/80'],
  ['text-primary-800 dark:text-primary-200', 'text-prim'],
  ['bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-100 ring-1 ring-primary-400/70', 'bg-primsoft text-prim ring-1 ring-prim/40'],
  ['bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', 'bg-oksoft text-ok'],
  ['bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', 'bg-warnsoft text-warn'],
  ['border-rose-300', 'border-bad/40'],
  ['border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-900 px-4 py-3 text-sm text-sky-900 dark:text-sky-100', 'border-info/30 bg-infosoft px-4 py-3 text-sm text-info'],
  ['dark:bg-surface-950', ''],
  ['dark:text-primary-400', ''],
  ['dark:text-primary-300', ''],
  ['bg-violet-500', 'bg-prim'],
  ['bg-purple-500', 'bg-prim'],
  ['bg-emerald-500', 'bg-ok'],
  ['bg-amber-500', 'bg-acc'],
  ['hover:bg-rose-50 hover:text-bad dark:hover:bg-rose-500/10', 'hover:bg-badsoft hover:text-bad'],
  ['hover:bg-primary-50 hover:text-prim2 dark:hover:bg-primary-900/30', 'hover:bg-primsoft hover:text-prim2'],
  ['bg-primary-50 text-prim dark:bg-primary-900/40 dark:text-primary-300', 'bg-primsoft text-prim'],
  ['bg-primary-50/70 dark:bg-primary-900/25', 'bg-primsoft/70'],
  ['border-surface-300', 'border-line2'],
  ['border-emerald-500', 'border-ok'],
  ['bg-surface-200', 'bg-surface3'],
  ['focus:ring-primary-500/20', 'focus:ring-prim/20'],
  ['text-sm text-amber-800 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800', 'text-sm text-warn bg-warnsoft border border-warn/30'],
  ['card p-4 text-sm text-amber-800 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800', 'card p-4 text-sm text-warn bg-warnsoft border border-warn/30'],
  ['bg-surface3 dark:bg-surface3', 'bg-surface3'],
  ['dark:hover:border-prim', 'hover:border-prim'],
  ['font-bold text-ink dark:text-white', 'font-bold text-ink'],
]

function applyRules(content) {
  let out = content
  for (const [from, to] of rules) {
    if (typeof from === 'string') {
      out = out.split(from).join(to)
    } else {
      out = out.replace(from, to)
    }
  }
  // collapse multiple spaces in className strings
  out = out.replace(/className="([^"]*)"/g, (_, cls) => {
    const cleaned = cls.replace(/\s+/g, ' ').trim()
    return `className="${cleaned}"`
  })
  out = out.replace(/className=\{`([^`]*)`\}/g, (_, cls) => {
    const cleaned = cls.replace(/\s+/g, ' ').trim()
    return `className={\`${cleaned}\`}`
  })
  return out
}

const stats = []
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8')
  const after = applyRules(before)
  if (after !== before) {
    const count = [...before.matchAll(/(?:primary-|surface-|blue-|emerald-|amber-|red-|rose-|sky-|slate-|purple-|violet-|teal-|orange-)/g)].length
    fs.writeFileSync(file, after)
    stats.push({ file: path.relative(root, file), approx: count })
  }
}

console.log(JSON.stringify(stats, null, 2))
