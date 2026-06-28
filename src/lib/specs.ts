// ============================================================
// Product specification parsing & rendering
// ------------------------------------------------------------
// Retailer-pasted spec sheets arrive in messy shapes:
//   * clean    : "Material composition: Poly Cotton"
//   * tabbed   : "Material composition\tPoly Cotton"
//   * JAMMED   : "Material compositionPOLYY COTTON"  (label & value run together
//                with NO delimiter — the exact bug the user reported)
// This module normalises all of those into clean {label, value} pairs so the
// review page can render a proper spec table instead of a garbled paragraph
// with a giant drop-cap.
// ============================================================

export interface Spec {
  label: string
  value: string
}

// A dictionary of spec labels we commonly see from Indian retailers (Amazon /
// Flipkart / Myntra product detail pages). Longest-first so multi-word labels
// match before their prefixes (e.g. "Sleeve type" before "Sleeve").
const KNOWN_LABELS = [
  'Material composition',
  'Country of Origin',
  'Country of origin',
  'Net Quantity',
  'Item Dimensions',
  'Item dimensions LxWxH',
  'Item Weight',
  'Generic Name',
  'Care Instructions',
  'Care instructions',
  'Closure Type',
  'Closure type',
  'Collar style',
  'Collar Style',
  'Sleeve type',
  'Sleeve Style',
  'Sleeve length',
  'Fit type',
  'Fabric type',
  'Fabric type',
  'Pattern',
  'Style',
  'Length',
  'Neck style',
  'Neck Style',
  'Occasion',
  'Pockets',
  'Number of Items',
  'Model Name',
  'Model name',
  'Brand',
  'Colour',
  'Color',
  'Size',
  'Department',
  'Manufacturer',
  'Packer',
  'Importer',
  'ASIN',
  'Special Feature',
  'Special feature',
  'Capacity',
  'Wattage',
  'Voltage',
  'Power Source',
  'Battery',
  'Connectivity',
  'Display',
  'Processor',
  'RAM',
  'Storage',
  'Operating System',
  'Screen Size',
  'Resolution',
  'Warranty',
  'Warranty Description',
  'Included Components',
  'Form Factor',
  'Type',
].sort((a, b) => b.length - a.length)

// Build a regex that matches any known label at the START of a string.
const LABEL_AT_START = new RegExp(
  '^(' + KNOWN_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\s*',
  'i'
)

// Split a single jammed line "Material compositionPOLYY COTTON" into
// label + value using the known-label dictionary. Falls back to camel-case /
// lower→Upper boundary detection when no dictionary label matches.
function splitJammedLine(raw: string): Spec | null {
  const line = raw.trim()
  if (!line) return null

  // 1) Explicit delimiters first (cleanest): "Label: Value" or "Label - Value"
  //    or a tab. We require the value to be non-empty.
  const delim = line.match(/^([^:\t]{2,40}?)\s*[:\t]\s*(.+)$/)
  if (delim && delim[2].trim()) {
    return { label: cleanLabel(delim[1]), value: delim[2].trim() }
  }

  // 2) Known label glued to its value with no delimiter.
  const known = line.match(LABEL_AT_START)
  if (known) {
    const label = known[1]
    const value = line.slice(label.length).trim()
    if (value) return { label: cleanLabel(label), value }
  }

  // 3) Heuristic: a run of Title-Case words (the label) followed by the value.
  //    e.g. "Closure TypeButton" -> label "Closure Type", value "Button".
  //    We look for the LAST lower→Upper transition that produces a plausible
  //    value (so "compositionPOLYY" splits before the ALL-CAPS value).
  const h = line.match(/^([A-Z][a-zA-Z ]+?)([A-Z][A-Za-z0-9].*)$/)
  if (h && h[1].trim().length >= 3 && h[2].trim()) {
    // Avoid splitting a normal sentence — only treat as spec if the label part
    // looks like a short field name (<= 4 words).
    if (h[1].trim().split(/\s+/).length <= 4) {
      return { label: cleanLabel(h[1]), value: h[2].trim() }
    }
  }

  return null
}

function cleanLabel(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    // Title-case the first letter, keep the rest as-is.
    .replace(/^([a-z])/, (m) => m.toUpperCase())
}

// Tidy a value: collapse whitespace, drop trailing "NA"/"N/A" noise, fix a few
// obvious typos seen in pasted data.
function cleanValue(s: string): string {
  let v = s.trim().replace(/\s+/g, ' ')
  // "Standard Length NA" -> "Standard Length" (retailers append NA for blanks)
  v = v.replace(/\s+N\/?A$/i, '')
  return v
}

// Parse a whole spec blob into an ordered list of {label, value} specs.
export function parseSpecs(blob: string | undefined | null): Spec[] {
  if (!blob) return []
  const lines = blob
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const specs: Spec[] = []
  for (const line of lines) {
    const s = splitJammedLine(line)
    if (s) {
      const value = cleanValue(s.value)
      if (value) specs.push({ label: s.label, value })
    }
  }
  return specs
}

// Heuristic: does this description look like a spec sheet (vs. prose)?
// True when most non-empty lines parse into label/value pairs and lines are
// short — i.e. it's a key/value dump, not a paragraph of sentences.
export function looksLikeSpecSheet(blob: string | undefined | null): boolean {
  if (!blob) return false
  const lines = blob
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return false

  let specLike = 0
  let longProse = 0
  for (const line of lines) {
    if (line.length > 140 || /[.!?]\s+[A-Z]/.test(line)) longProse++
    if (splitJammedLine(line)) specLike++
  }
  // Require the majority of lines to be spec-like AND no long prose lines.
  return longProse === 0 && specLike >= Math.ceil(lines.length * 0.6)
}

// Render specs as a clean, accessible two-column table.
export function renderSpecTable(specs: Spec[], opts: { title?: string } = {}): string {
  if (!specs.length) return ''
  const rows = specs
    .map(
      (s) => `<tr class="spec-row">
        <th scope="row" class="spec-key">${escapeHtml(s.label)}</th>
        <td class="spec-val">${escapeHtml(s.value)}</td>
      </tr>`
    )
    .join('')
  const heading = opts.title
    ? `<h3 class="font-serif text-2xl text-ink mb-5">${escapeHtml(opts.title)}</h3>`
    : ''
  return `${heading}<div class="spec-table-wrap"><table class="spec-table"><tbody>${rows}</tbody></table></div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
