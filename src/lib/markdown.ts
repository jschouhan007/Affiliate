// Minimal, dependency-free Markdown -> HTML renderer.
// Supports: headings, bold, italic, inline code, links, lists (ul/ol),
// blockquotes, code blocks, horizontal rules, paragraphs.
// Output is intended for trusted (admin-authored) content.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Detects whether a URL points at an image (by extension or known image CDN
// query patterns). We keep it permissive because many CDNs serve images from
// extension-less URLs (e.g. Unsplash, Cloudinary, blog hosts).
function looksLikeImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i.test(url) ||
    /(images?\.|img\.|cdn\.|\/image|\/img|imgur\.com|unsplash\.com|cloudinary|googleusercontent|blogspot|bp\.blogspot|ggpht|fbcdn|githubusercontent|wp\.com|wordpress\.com|format=(jpg|png|webp))/i.test(url)
}

function imgTag(url: string, alt = ''): string {
  return `<img src="${url}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" class="rounded-lg my-4 max-w-full mx-auto block" onerror="this.style.display='none'" />`
}

function inline(text: string): string {
  let t = escapeHtml(text)
  // inline code
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  // images ![alt](url)
  t = t.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_m, alt, url) => imgTag(url, alt)
  )
  // links [text](url)
  t = t.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    '<a href="$2" class="text-indigo-600 hover:underline" target="_blank" rel="noopener">$1</a>'
  )
  // bold
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italic
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  return t
}

// Lines that are raw trusted HTML the admin pasted (img / iframe / figure /
// picture / video / source / div blocks). We pass these through untouched so
// pasted <img> tags and embeds actually render.
function isRawHtmlBlock(line: string): boolean {
  return /^\s*<(img|iframe|figure|picture|video|source|div|p|br|hr|blockquote|table|tr|td|th|tbody|thead|ul|ol|li|span|a|h[1-6])\b/i.test(line) ||
    /^\s*<\/(figure|picture|video|div|p|blockquote|table|tbody|thead|ul|ol|tr)>/i.test(line)
}

// A bare URL on its own line — if it points at an image, embed it; otherwise
// turn it into a link. This is the most common thing non-technical editors do.
function bareUrlLine(line: string): string | null {
  const m = line.trim().match(/^(https?:\/\/\S+)$/)
  if (!m) return null
  const url = m[1]
  if (looksLikeImageUrl(url)) {
    return `<figure class="my-6 text-center">${imgTag(url)}</figure>`
  }
  return `<p class="my-4 leading-relaxed text-slate-700"><a href="${url}" class="text-indigo-600 hover:underline break-all" target="_blank" rel="noopener">${url}</a></p>`
}

export function renderMarkdown(md: string): string {
  if (!md) return ''
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let inCode = false
  let codeBuf: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // fenced code blocks
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        closeList()
        inCode = true
        codeBuf = []
      } else {
        inCode = false
        out.push(
          `<pre class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto my-4"><code>${escapeHtml(
            codeBuf.join('\n')
          )}</code></pre>`
        )
      }
      i++
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      i++
      continue
    }

    // blank line
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList()
      out.push('<hr class="my-8 border-slate-200" />')
      i++
      continue
    }

    // raw trusted HTML block (pasted <img>, <iframe>, <figure>, etc.) — pass through
    if (isRawHtmlBlock(line)) {
      closeList()
      out.push(line)
      i++
      continue
    }

    // bare URL on its own line -> image embed or link
    const bare = bareUrlLine(line)
    if (bare) {
      closeList()
      out.push(bare)
      i++
      continue
    }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const level = h[1].length
      const sizes: Record<number, string> = {
        1: 'text-3xl font-bold mt-8 mb-4',
        2: 'text-2xl font-bold mt-8 mb-3',
        3: 'text-xl font-semibold mt-6 mb-2',
        4: 'text-lg font-semibold mt-4 mb-2',
        5: 'text-base font-semibold mt-4 mb-2',
        6: 'text-sm font-semibold mt-4 mb-2',
      }
      out.push(`<h${level} class="${sizes[level]}">${inline(h[2])}</h${level}>`)
      i++
      continue
    }

    // blockquote
    if (line.trim().startsWith('>')) {
      closeList()
      const quote = line.trim().replace(/^>\s?/, '')
      out.push(
        `<blockquote class="border-l-4 border-indigo-300 pl-4 italic text-slate-600 my-4">${inline(
          quote
        )}</blockquote>`
      )
      i++
      continue
    }

    // ordered list
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ol) {
      if (listType !== 'ol') {
        closeList()
        out.push('<ol class="list-decimal pl-6 space-y-1 my-4">')
        listType = 'ol'
      }
      out.push(`<li>${inline(ol[1])}</li>`)
      i++
      continue
    }

    // unordered list
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) {
      if (listType !== 'ul') {
        closeList()
        out.push('<ul class="list-disc pl-6 space-y-1 my-4">')
        listType = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      i++
      continue
    }

    // paragraph
    closeList()
    out.push(`<p class="my-4 leading-relaxed text-slate-700">${inline(line)}</p>`)
    i++
  }

  closeList()
  if (inCode && codeBuf.length) {
    out.push(
      `<pre class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto my-4"><code>${escapeHtml(
        codeBuf.join('\n')
      )}</code></pre>`
    )
  }
  return out.join('\n')
}
