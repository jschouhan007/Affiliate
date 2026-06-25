import { html, raw } from 'hono/html'
import { SITE, type Category, type Post, type Deal } from '../types'
import { formatPrice } from '../lib/format'

// Standalone, minimal admin shell (does NOT use the public Layout).
function shell(title: string, body: string, opts: { flash?: string; error?: string } = {}) {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${title} · ${SITE.name} Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background:#0D111C; color:#EDF2FA; }
    h1,h2,h3 { font-family:'Playfair Display', serif; }
    .ad-input { background:#101624; border:1px solid #283249; border-radius:.6rem; padding:.65rem .9rem; width:100%; color:#EDF2FA; outline:none; transition:border-color .2s; }
    .ad-input:focus { border-color:#818CF8; }
    .ad-label { font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#9BA8C0; font-weight:600; margin-bottom:.4rem; display:block; }
    .ad-btn { display:inline-flex; align-items:center; gap:.5rem; font-weight:600; padding:.6rem 1.1rem; border-radius:.6rem; cursor:pointer; transition:transform .15s, background .2s; font-size:.9rem; }
    .ad-btn:active { transform:scale(.97); }
    .ad-primary { background:linear-gradient(135deg,#22D3EE,#818CF8 50%,#FB7185); color:#fff; }
    .ad-line { border:1px solid #283249; color:#EDF2FA; }
    .ad-line:hover { border-color:#818CF8; color:#818CF8; }
    .ad-danger { color:#F87171; border:1px solid #4a2222; }
    .ad-danger:hover { background:#3a1a1a; }
    .card { background:#151B2B; border:1px solid #28324A; border-radius:1rem; }
  </style>
</head>
<body class="min-h-screen">
  ${raw(opts.flash ? `<div class="bg-emerald-900/40 border-b border-emerald-700/40 text-emerald-200 text-sm px-5 py-3 text-center">${escapeHtml(opts.flash)}</div>` : '')}
  ${raw(opts.error ? `<div class="bg-red-900/40 border-b border-red-700/40 text-red-200 text-sm px-5 py-3 text-center">${escapeHtml(opts.error)}</div>` : '')}
  ${raw(body)}
</body>
</html>`
}

export function AdminLogin(opts: { error?: string } = {}) {
  const body = `
  <main class="min-h-screen flex items-center justify-center px-5">
    <div class="card p-10 w-full max-w-sm">
      <div class="text-center mb-8">
        <i class="fas fa-fire-flame-curved text-3xl" style="color:#818CF8"></i>
        <h1 class="text-2xl mt-3">${SITE.name} Admin</h1>
        <p class="text-sm text-[#9BA8C0] mt-1">Restricted area — sign in to continue</p>
      </div>
      <form method="post" action="/admin/login" class="space-y-5">
        <div>
          <label class="ad-label">Password</label>
          <input type="password" name="password" required autofocus class="ad-input" placeholder="••••••••" />
        </div>
        <button type="submit" class="ad-primary ad-btn w-full justify-center">Sign in <i class="fas fa-arrow-right text-xs"></i></button>
      </form>
      <a href="/" class="block text-center text-xs text-[#9BA8C0] hover:text-[#818CF8] mt-6">← Back to site</a>
    </div>
  </main>`
  return shell('Sign in', body, { error: opts.error })
}

function topbar(active: string): string {
  return `<header class="border-b border-[#28324A] sticky top-0 bg-[#0D111C]/90 backdrop-blur z-10">
    <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="/admin" class="flex items-center gap-2.5"><i class="fas fa-fire-flame-curved" style="color:#818CF8"></i><span class="font-semibold">${SITE.name} Admin</span></a>
      <nav class="flex items-center gap-5 text-sm">
        <a href="/admin" class="${active === 'dash' ? 'text-[#818CF8]' : 'text-[#CBD5E6] hover:text-white'}">Posts</a>
        <a href="/admin/products" class="${active === 'products' ? 'text-[#818CF8]' : 'text-[#CBD5E6] hover:text-white'}">Products</a>
        <a href="/admin/categories" class="${active === 'categories' ? 'text-[#818CF8]' : 'text-[#CBD5E6] hover:text-white'}">Categories</a>
        <a href="/admin/carousel" class="${active === 'carousel' ? 'text-[#818CF8]' : 'text-[#CBD5E6] hover:text-white'}">Carousel</a>
        <a href="/admin/new" class="${active === 'new' ? 'text-[#818CF8]' : 'text-[#CBD5E6] hover:text-white'}">New post</a>
        <a href="/" target="_blank" class="text-[#CBD5E6] hover:text-white">View site <i class="fas fa-arrow-up-right-from-square text-[0.6rem]"></i></a>
        <form method="post" action="/admin/logout" class="inline"><button class="text-[#9BA8C0] hover:text-red-300">Log out</button></form>
      </nav>
    </div>
  </header>`
}

export function AdminDashboard(data: { posts: Post[]; flash?: string }) {
  const total = data.posts.length
  const published = data.posts.filter((p) => p.published).length
  const drafts = total - published
  const guides = data.posts.filter((p) => p.pillar).length

  const statCard = (label: string, value: number, icon: string, color: string) =>
    `<div class="card p-5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-semibold" style="font-family:'Playfair Display',serif">${value}</div>
          <div class="text-xs text-[#9BA8C0] uppercase tracking-wider mt-1">${label}</div>
        </div>
        <i class="${icon} text-xl" style="color:${color}"></i>
      </div>
    </div>`

  const rows = data.posts
    .map(
      (p) => `<tr class="post-row border-t border-[#28324A] hover:bg-[#101624] transition"
        data-status="${p.published ? 'published' : 'draft'}"
        data-title="${escapeAttr(p.title.toLowerCase())}"
        data-slug="${escapeAttr(p.slug.toLowerCase())}">
      <td class="py-3.5 px-5">
        <div class="font-medium text-[#EDF2FA] break-words">${escapeHtml(p.title)}</div>
        <a href="/blog/${p.slug}" target="_blank" class="text-xs text-[#9BA8C0] hover:text-[#818CF8] break-all">/blog/${p.slug} <i class="fas fa-arrow-up-right-from-square text-[0.55rem]"></i></a>
      </td>
      <td class="py-3.5 pr-3 text-sm text-[#CBD5E6] whitespace-nowrap">${p.category_name || '—'}</td>
      <td class="py-3.5 pr-3 text-sm whitespace-nowrap">${p.pillar ? '<span class="text-[#818CF8]">Guide</span>' : `<span class="text-[#9BA8C0] capitalize">${p.post_type}</span>`}</td>
      <td class="py-3.5 pr-3 whitespace-nowrap">
        <form method="post" action="/admin/toggle/${p.id}" class="inline">
          <button title="Click to ${p.published ? 'unpublish' : 'publish'}" class="text-xs cursor-pointer hover:underline ${p.published ? 'text-emerald-400' : 'text-amber-400'}">${p.published ? '● Published' : '○ Draft'}</button>
        </form>
      </td>
      <td class="py-3.5 px-5 text-right whitespace-nowrap">
        <a href="/admin/edit/${p.id}" class="ad-btn ad-line !py-1.5 !px-2.5 text-xs">Edit</a>
        <form method="post" action="/admin/duplicate/${p.id}" class="inline"><button title="Duplicate" class="ad-btn ad-line !py-1.5 !px-2.5 text-xs ml-1"><i class="fas fa-copy"></i></button></form>
        <form method="post" action="/admin/delete/${p.id}" class="inline" onsubmit="return confirm('Delete &quot;${escapeAttr(p.title)}&quot;? This cannot be undone.')">
          <button title="Delete" class="ad-btn ad-danger !py-1.5 !px-2.5 text-xs ml-1"><i class="fas fa-trash"></i></button>
        </form>
      </td>
    </tr>`
    )
    .join('')

  const body = `${topbar('dash')}
  <main class="max-w-5xl mx-auto px-5 py-10">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl">Dashboard</h1>
        <p class="text-[#9BA8C0] text-sm mt-1">Manage your blog posts, drafts &amp; SEO</p>
      </div>
      <a href="/admin/new" class="ad-primary ad-btn"><i class="fas fa-plus"></i> New post</a>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      ${statCard('Total posts', total, 'fas fa-newspaper', '#8ab4f8')}
      ${statCard('Published', published, 'fas fa-circle-check', '#34d399')}
      ${statCard('Drafts', drafts, 'fas fa-pen-ruler', '#fbbf24')}
      ${statCard('Guides', guides, 'fas fa-compass', '#818CF8')}
    </div>

    <div class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#28324A]">
        <div class="flex items-center gap-1.5 text-sm" id="status-tabs">
          <button data-filter="all" class="filter-tab active px-3 py-1.5 rounded-md">All <span class="opacity-60">${total}</span></button>
          <button data-filter="published" class="filter-tab px-3 py-1.5 rounded-md">Published <span class="opacity-60">${published}</span></button>
          <button data-filter="draft" class="filter-tab px-3 py-1.5 rounded-md">Drafts <span class="opacity-60">${drafts}</span></button>
        </div>
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#7A87A0]"></i>
          <input id="post-search" type="text" placeholder="Search posts…" class="ad-input !py-2 !pl-9 !w-56 text-sm" />
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-[#9BA8C0] text-xs uppercase tracking-wider"><th class="py-3 px-5">Title</th><th>Category</th><th>Type</th><th>Status</th><th class="px-5 text-right">Actions</th></tr></thead>
          <tbody id="posts-tbody">${rows || '<tr><td colspan="5" class="py-12 text-center text-[#9BA8C0]">No posts yet. <a href="/admin/new" class="text-[#818CF8] underline">Create your first post →</a></td></tr>'}</tbody>
        </table>
        <div id="no-results" class="hidden py-12 text-center text-[#9BA8C0]">No posts match your filter.</div>
      </div>
    </div>
  </main>
  <style>
    .filter-tab { color:#9BA8C0; transition:all .2s; }
    .filter-tab:hover { color:#EDF2FA; }
    .filter-tab.active { background:#28324A; color:#818CF8; }
  </style>
  <script>
  (function(){
    var search=document.getElementById('post-search');
    var tabs=document.querySelectorAll('.filter-tab');
    var rows=Array.prototype.slice.call(document.querySelectorAll('.post-row'));
    var noRes=document.getElementById('no-results');
    var filter='all';
    function apply(){
      var q=(search.value||'').toLowerCase().trim();
      var visible=0;
      rows.forEach(function(r){
        var matchStatus = filter==='all' || r.dataset.status===filter;
        var matchText = !q || r.dataset.title.indexOf(q)>-1 || r.dataset.slug.indexOf(q)>-1;
        var show=matchStatus && matchText;
        r.style.display = show ? '' : 'none';
        if(show) visible++;
      });
      if(noRes) noRes.classList.toggle('hidden', visible>0 || rows.length===0);
    }
    if(search) search.addEventListener('input',apply);
    tabs.forEach(function(t){ t.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('active');});
      t.classList.add('active'); filter=t.dataset.filter; apply();
    });});
  })();
  </script>`
  return shell('Dashboard', body, { flash: data.flash })
}

export function AdminEditor(data: { post?: Post; categories: Category[]; error?: string }) {
  const p = data.post
  const isEdit = !!p
  const catSelect = categorySelect(data.categories, p ? p.category_id : null, { name: 'category_id' })

  const typeOpts = ['blog', 'review', 'comparison', 'guide']
    .map((t) => `<option value="${t}" ${p && p.post_type === t ? 'selected' : ''}>${t}</option>`)
    .join('')

  const body = `${topbar(isEdit ? 'dash' : 'new')}
  <main class="max-w-3xl mx-auto px-5 py-10">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl">${isEdit ? 'Edit post' : 'New post'}</h1>
      <a href="/admin" class="text-sm text-[#9BA8C0] hover:text-white">← All posts</a>
    </div>
    <form method="post" action="${isEdit ? `/admin/edit/${p!.id}` : '/admin/new'}" class="space-y-6">
      <div>
        <label class="ad-label">Title *</label>
        <input name="title" required class="ad-input" value="${p ? escapeAttr(p.title) : ''}" placeholder="Best Wireless Earbuds Under ₹2,000" oninput="if(!this.dataset.t){var s=document.querySelector('[name=slug]');if(s&&!s.value){s.value=this.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}}" />
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="ad-label">Slug * <span class="text-[#7A87A0] normal-case">(/blog/…)</span></label>
          <input name="slug" required class="ad-input" value="${p ? escapeAttr(p.slug) : ''}" placeholder="best-wireless-earbuds" />
        </div>
        <div>
          <label class="ad-label">Cover image URL</label>
          <input name="cover_image" class="ad-input" value="${p ? escapeAttr(p.cover_image || '') : ''}" placeholder="https://…" />
        </div>
      </div>
      <div>
        <label class="ad-label">Dek <span class="text-[#7A87A0] normal-case">(italic standfirst under the title)</span></label>
        <input name="dek" class="ad-input" value="${p ? escapeAttr(p.dek || '') : ''}" />
      </div>
      <div>
        <label class="ad-label">Excerpt <span class="text-[#7A87A0] normal-case">(meta description / card preview)</span></label>
        <textarea name="excerpt" rows="2" class="ad-input">${p ? escapeHtml(p.excerpt || '') : ''}</textarea>
      </div>
      <div>
        <label class="ad-label">Body (Markdown) *</label>
        <textarea name="body" rows="18" required class="ad-input font-mono text-sm leading-relaxed" placeholder="## The short answer&#10;Write your review in Markdown…">${p ? escapeHtml(p.body) : ''}</textarea>
        <p class="text-xs text-[#7A87A0] mt-1.5">Supports Markdown: ## headings, **bold**, lists, [links](url), &gt; quotes, tables.</p>
      </div>
      <div class="grid sm:grid-cols-3 gap-4">
        <div>
          <label class="ad-label">Category</label>
          ${catSelect}
        </div>
        <div>
          <label class="ad-label">Type</label>
          <select name="post_type" class="ad-input">${typeOpts}</select>
        </div>
        <div>
          <label class="ad-label">Read minutes</label>
          <input name="read_minutes" type="number" min="1" class="ad-input" value="${p && p.read_minutes ? p.read_minutes : ''}" placeholder="6" />
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="ad-label">Author</label>
          <input name="author" class="ad-input" value="${p ? escapeAttr(p.author || '') : 'DealSpot Editorial'}" />
        </div>
        <div>
          <label class="ad-label">Author role</label>
          <input name="author_role" class="ad-input" value="${p ? escapeAttr(p.author_role || '') : 'Editorial'}" />
        </div>
      </div>
      <div class="flex items-center gap-6 pt-2">
        <label class="flex items-center gap-2.5 cursor-pointer text-sm"><input type="checkbox" name="published" value="1" ${!p || p.published ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#818CF8" /> Published</label>
        <label class="flex items-center gap-2.5 cursor-pointer text-sm"><input type="checkbox" name="pillar" value="1" ${p && p.pillar ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#818CF8" /> Buying guide (pillar)</label>
      </div>

      <!-- ============ SEO PANEL ============ -->
      <section class="card p-6 mt-2">
        <div class="flex items-center gap-2.5 mb-1">
          <i class="fas fa-magnifying-glass-chart" style="color:#818CF8"></i>
          <h2 class="text-xl">Search &amp; Social (SEO)</h2>
        </div>
        <p class="text-xs text-[#9BA8C0] mb-6">Control exactly how this post appears on Google and when shared. Leave blank to fall back to the title &amp; excerpt.</p>

        <!-- Live Google preview -->
        <div class="rounded-lg p-4 mb-6" style="background:#101624;border:1px solid #28324A">
          <div class="text-[0.7rem] text-[#7A87A0] uppercase tracking-wider mb-2">Google preview</div>
          <div id="seo-prev-url" style="color:#9aa0a6;font-size:.8rem">${SITE.url}/blog/${p ? escapeHtml(p.slug) : 'your-post'}</div>
          <div id="seo-prev-title" style="color:#8ab4f8;font-size:1.05rem;line-height:1.3;margin:.15rem 0">${escapeHtml((p && (p.meta_title || p.title)) || 'Your post title')}</div>
          <div id="seo-prev-desc" style="color:#bdc1c6;font-size:.82rem;line-height:1.45">${escapeHtml((p && (p.meta_description || p.excerpt)) || 'Your meta description will appear here. Aim for 150–160 characters that summarise the post and entice the click.')}</div>
        </div>

        <div class="space-y-5">
          <div>
            <div class="flex items-center justify-between">
              <label class="ad-label !mb-0">Meta title</label>
              <span id="mt-count" class="text-[0.68rem] text-[#7A87A0]">0 / 60</span>
            </div>
            <input id="seo-meta-title" name="meta_title" maxlength="70" class="ad-input mt-1.5" value="${p ? escapeAttr(p.meta_title || '') : ''}" placeholder="Defaults to the post title" />
          </div>
          <div>
            <div class="flex items-center justify-between">
              <label class="ad-label !mb-0">Meta description</label>
              <span id="md-count" class="text-[0.68rem] text-[#7A87A0]">0 / 160</span>
            </div>
            <textarea id="seo-meta-desc" name="meta_description" rows="2" maxlength="200" class="ad-input mt-1.5" placeholder="Defaults to the excerpt">${p ? escapeHtml(p.meta_description || '') : ''}</textarea>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="ad-label">Focus keywords <span class="text-[#7A87A0] normal-case">(comma separated)</span></label>
              <input name="meta_keywords" class="ad-input" value="${p ? escapeAttr(p.meta_keywords || '') : ''}" placeholder="wireless earbuds, budget, review" />
            </div>
            <div>
              <label class="ad-label">Social share image (OG) URL</label>
              <input name="og_image" class="ad-input" value="${p ? escapeAttr(p.og_image || '') : ''}" placeholder="Defaults to cover image" />
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-4 items-end">
            <div>
              <label class="ad-label">Canonical URL <span class="text-[#7A87A0] normal-case">(optional)</span></label>
              <input name="canonical_url" class="ad-input" value="${p ? escapeAttr(p.canonical_url || '') : ''}" placeholder="Leave blank for default" />
            </div>
            <label class="flex items-center gap-2.5 cursor-pointer text-sm pb-1.5"><input type="checkbox" name="noindex" value="1" ${p && p.noindex ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#818CF8" /> Hide from search engines (noindex)</label>
          </div>
        </div>
      </section>

      <div class="flex items-center gap-3 pt-4 border-t border-[#28324A]">
        <button type="submit" class="ad-primary ad-btn"><i class="fas fa-floppy-disk"></i> ${isEdit ? 'Save changes' : 'Create post'}</button>
        <a href="/admin" class="ad-btn ad-line">Cancel</a>
      </div>
    </form>
  </main>
  <script>
  (function(){
    var title=document.querySelector('[name=title]');
    var slug=document.querySelector('[name=slug]');
    var excerpt=document.querySelector('[name=excerpt]');
    var mt=document.getElementById('seo-meta-title');
    var md=document.getElementById('seo-meta-desc');
    var pvTitle=document.getElementById('seo-prev-title');
    var pvDesc=document.getElementById('seo-prev-desc');
    var pvUrl=document.getElementById('seo-prev-url');
    var mtCount=document.getElementById('mt-count');
    var mdCount=document.getElementById('md-count');
    function count(el,out,max){ if(!el||!out)return; var n=(el.value||'').length; out.textContent=n+' / '+max; out.style.color=n>max?'#F87171':(n>max*0.92?'#FBBF24':'#7A87A0'); }
    function refresh(){
      var t=(mt&&mt.value)|| (title&&title.value) || 'Your post title';
      var d=(md&&md.value)|| (excerpt&&excerpt.value) || 'Your meta description will appear here.';
      if(pvTitle) pvTitle.textContent=t;
      if(pvDesc) pvDesc.textContent=d;
      if(pvUrl&&slug) pvUrl.textContent='${SITE.url}/blog/'+(slug.value||'your-post');
      count(mt,mtCount,60); count(md,mdCount,160);
    }
    [title,slug,excerpt,mt,md].forEach(function(el){ if(el){ el.addEventListener('input',refresh); }});
    refresh();
  })();
  </script>`
  return shell(isEdit ? 'Edit post' : 'New post', body, { error: data.error })
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] as string))
}
function escapeAttr(s: string): string {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string))
}

// Build a hierarchical <select> for choosing a category. Accepts EITHER a flat
// list (with parent_id) OR a tree (roots with .children) — it normalises to a
// flat ordered list, then renders parents as bold headings and their children
// indented underneath, so admins can clearly pick a leaf subcategory.
function flattenCategories(cats: Category[]): { cat: Category; depth: number }[] {
  // Detect tree vs flat: if any node has children we treat the input as a tree.
  const hasTree = cats.some((c) => Array.isArray((c as any).children) && (c as any).children!.length)
  const out: { cat: Category; depth: number }[] = []
  if (hasTree) {
    const walk = (list: Category[], depth: number) => {
      for (const c of list) {
        out.push({ cat: c, depth })
        if (c.children && c.children.length) walk(c.children, depth + 1)
      }
    }
    walk(cats, 0)
    return out
  }
  // Flat list with parent_id → reconstruct ordering (roots, then their kids).
  const byParent = new Map<number | null, Category[]>()
  for (const c of cats) {
    const key = c.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(c)
  }
  const walk = (parent: number | null, depth: number) => {
    for (const c of byParent.get(parent) || []) {
      out.push({ cat: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  // Any category whose parent_id points outside the set falls through as a root.
  if (!out.length) for (const c of cats) out.push({ cat: c, depth: 0 })
  return out
}

function categorySelect(cats: Category[], selectedId?: number | null, opts: { name?: string; allowNone?: boolean } = {}): string {
  const name = opts.name || 'category_id'
  const flat = flattenCategories(cats)
  const none = opts.allowNone === false ? '' : `<option value="" ${selectedId == null ? 'selected' : ''}>— None —</option>`
  const options = flat
    .map(({ cat, depth }) => {
      const indent = depth === 0 ? '' : depth === 1 ? '\u00A0\u00A0└\u00A0' : '\u00A0\u00A0\u00A0\u00A0└\u00A0'
      const isParent = flat.some((f) => f.cat.parent_id === cat.id)
      const label = `${indent}${escapeHtml(cat.name)}${isParent && depth === 0 ? '' : ''}`
      const style = depth === 0 && isParent ? ' style="font-weight:600"' : ''
      return `<option value="${cat.id}" ${selectedId === cat.id ? 'selected' : ''}${style}>${label}</option>`
    })
    .join('')
  return `<select name="${name}" class="ad-input">${none}${options}</select>`
}

// Cheapest offer = best price (mirrors the public-site logic)
function bestOffer(d: Deal) {
  const offers = (d.offers || []).filter((o) => o.price != null)
  if (!offers.length) return undefined
  return offers.slice().sort((a, b) => (a.price as number) - (b.price as number))[0]
}

function thumb(d: Deal, size = 'w-12 h-12'): string {
  if (d.image_url) {
    return `<img src="${escapeAttr(d.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="${size} object-contain bg-[#101624] rounded-lg border border-[#28324A] shrink-0" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="${size} hidden items-center justify-center bg-[#101624] rounded-lg border border-[#28324A] text-[#566080] shrink-0"><i class="fas fa-image"></i></span>`
  }
  return `<span class="${size} flex items-center justify-center bg-[#101624] rounded-lg border border-[#28324A] text-[#566080] shrink-0"><i class="fas fa-box-open"></i></span>`
}

// ============ PRODUCTS LIST ============
export function AdminProducts(data: { deals: Deal[]; flash?: string }) {
  const total = data.deals.length
  const published = data.deals.filter((d) => d.published).length
  const drafts = total - published
  const featured = data.deals.filter((d) => d.featured).length

  const statCard = (label: string, value: number, icon: string, color: string) =>
    `<div class="card p-5"><div class="flex items-center justify-between"><div><div class="text-3xl font-semibold" style="font-family:'Playfair Display',serif">${value}</div><div class="text-xs text-[#9BA8C0] uppercase tracking-wider mt-1">${label}</div></div><i class="${icon} text-xl" style="color:${color}"></i></div></div>`

  const rows = data.deals
    .map((d) => {
      const bo = bestOffer(d)
      const price = bo ? formatPrice(bo.price, bo.currency) : '—'
      return `<tr class="prod-row border-t border-[#28324A] hover:bg-[#101624] transition"
        data-status="${d.published ? 'published' : 'draft'}"
        data-title="${escapeAttr((d.title + ' ' + (d.brand || '')).toLowerCase())}"
        data-slug="${escapeAttr(d.slug.toLowerCase())}">
      <td class="py-3 px-5">
        <div class="flex items-center gap-3">
          ${thumb(d)}
          <div class="min-w-0">
            <div class="font-medium text-[#EDF2FA] break-words">${escapeHtml(d.title)}</div>
            <a href="/reviews/${d.slug}" target="_blank" class="text-xs text-[#9BA8C0] hover:text-[#818CF8] break-all">${d.brand ? escapeHtml(d.brand) + ' · ' : ''}/reviews/${d.slug} <i class="fas fa-arrow-up-right-from-square text-[0.55rem]"></i></a>
          </div>
        </div>
      </td>
      <td class="py-3 pr-3 text-sm text-[#CBD5E6] whitespace-nowrap">${d.category_name || '—'}</td>
      <td class="py-3 pr-3 text-sm text-[#EDF2FA] font-semibold whitespace-nowrap">${price}</td>
      <td class="py-3 pr-3 text-sm whitespace-nowrap text-center">
        <form method="post" action="/admin/products/feature/${d.id}" class="inline">
          <button title="Toggle featured" class="text-base ${d.featured ? 'text-amber-400' : 'text-[#566080] hover:text-amber-300'}"><i class="fa${d.featured ? 's' : 'r'} fa-star"></i></button>
        </form>
      </td>
      <td class="py-3 pr-3 whitespace-nowrap">
        <form method="post" action="/admin/products/toggle/${d.id}" class="inline">
          <button title="Click to ${d.published ? 'unpublish' : 'publish'}" class="text-xs cursor-pointer hover:underline ${d.published ? 'text-emerald-400' : 'text-amber-400'}">${d.published ? '● Live' : '○ Draft'}</button>
        </form>
      </td>
      <td class="py-3 px-5 text-right whitespace-nowrap">
        <a href="/admin/products/edit/${d.id}" class="ad-btn ad-line !py-1.5 !px-2.5 text-xs">Edit</a>
        <form method="post" action="/admin/products/delete/${d.id}" class="inline" onsubmit="return confirm('Delete &quot;${escapeAttr(d.title)}&quot;? This removes the product and its offers permanently.')">
          <button title="Delete" class="ad-btn ad-danger !py-1.5 !px-2.5 text-xs ml-1"><i class="fas fa-trash"></i></button>
        </form>
      </td>
    </tr>`
    })
    .join('')

  const body = `${topbar('products')}
  <main class="max-w-5xl mx-auto px-5 py-10">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl">Products</h1>
        <p class="text-[#9BA8C0] text-sm mt-1">Your full product catalogue — names, images, prices &amp; buy links</p>
      </div>
      <a href="/admin/products/new" class="ad-primary ad-btn"><i class="fas fa-plus"></i> New product</a>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      ${statCard('Total', total, 'fas fa-box', '#8ab4f8')}
      ${statCard('Live', published, 'fas fa-circle-check', '#34d399')}
      ${statCard('Drafts', drafts, 'fas fa-pen-ruler', '#fbbf24')}
      ${statCard('Featured', featured, 'fas fa-star', '#f59e0b')}
    </div>
    <div class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#28324A]">
        <div class="flex items-center gap-1.5 text-sm" id="status-tabs">
          <button data-filter="all" class="filter-tab active px-3 py-1.5 rounded-md">All <span class="opacity-60">${total}</span></button>
          <button data-filter="published" class="filter-tab px-3 py-1.5 rounded-md">Live <span class="opacity-60">${published}</span></button>
          <button data-filter="draft" class="filter-tab px-3 py-1.5 rounded-md">Drafts <span class="opacity-60">${drafts}</span></button>
        </div>
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#7A87A0]"></i>
          <input id="prod-search" type="text" placeholder="Search products…" class="ad-input !py-2 !pl-9 !w-56 text-sm" />
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-[#9BA8C0] text-xs uppercase tracking-wider"><th class="py-3 px-5">Product</th><th>Category</th><th>Best price</th><th class="text-center">★</th><th>Status</th><th class="px-5 text-right">Actions</th></tr></thead>
          <tbody id="prod-tbody">${rows || '<tr><td colspan="6" class="py-12 text-center text-[#9BA8C0]">No products yet. <a href="/admin/products/new" class="text-[#818CF8] underline">Add your first product →</a></td></tr>'}</tbody>
        </table>
        <div id="no-results" class="hidden py-12 text-center text-[#9BA8C0]">No products match your filter.</div>
      </div>
    </div>
  </main>
  <style>
    .filter-tab { color:#9BA8C0; transition:all .2s; }
    .filter-tab:hover { color:#EDF2FA; }
    .filter-tab.active { background:#28324A; color:#818CF8; }
  </style>
  <script>
  (function(){
    var search=document.getElementById('prod-search');
    var tabs=document.querySelectorAll('.filter-tab');
    var rows=Array.prototype.slice.call(document.querySelectorAll('.prod-row'));
    var noRes=document.getElementById('no-results');
    var filter='all';
    function apply(){
      var q=(search.value||'').toLowerCase().trim();
      var visible=0;
      rows.forEach(function(r){
        var matchStatus = filter==='all' || r.dataset.status===filter;
        var matchText = !q || r.dataset.title.indexOf(q)>-1 || r.dataset.slug.indexOf(q)>-1;
        var show=matchStatus && matchText;
        r.style.display = show ? '' : 'none';
        if(show) visible++;
      });
      if(noRes) noRes.classList.toggle('hidden', visible>0 || rows.length===0);
    }
    if(search) search.addEventListener('input',apply);
    tabs.forEach(function(t){ t.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('active');});
      t.classList.add('active'); filter=t.dataset.filter; apply();
    });});
  })();
  </script>`
  return shell('Products', body, { flash: data.flash })
}

// ============ PRODUCT EDITOR ============
export function AdminProductEditor(data: { deal?: Deal; categories: Category[]; error?: string }) {
  const d = data.deal
  const isEdit = !!d
  const catSelect = categorySelect(data.categories, d ? d.category_id : null, { name: 'category_id' })

  // Existing offers (with their buy URLs) become editable rows.
  const offers = (d?.offers || []).map((o) => ({
    retailer: o.retailer || 'amazon',
    price: o.price ?? '',
    original_price: o.original_price ?? '',
    buy_url: o.dest_url || '',
    in_stock: o.in_stock == null ? 1 : o.in_stock,
  }))
  if (!offers.length) offers.push({ retailer: 'amazon', price: '', original_price: '', buy_url: '', in_stock: 1 })

  const retailerOpts = (sel: string) =>
    ['amazon', 'flipkart', 'myntra', 'ajio', 'croma', 'other']
      .map((r) => `<option value="${r}" ${r === sel ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`)
      .join('')

  const offerRow = (o: any, i: number) => `
    <div class="offer-row card p-4 mb-3" style="background:#101624">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs uppercase tracking-wider text-[#9BA8C0] font-semibold">Offer ${i + 1}</span>
        <button type="button" class="offer-remove text-[#F87171] hover:text-red-300 text-xs"><i class="fas fa-times"></i> Remove</button>
      </div>
      <div class="grid sm:grid-cols-4 gap-3">
        <div>
          <label class="ad-label">Retailer</label>
          <select name="offer_retailer" class="ad-input">${retailerOpts(o.retailer)}</select>
        </div>
        <div>
          <label class="ad-label">Price (₹)</label>
          <input name="offer_price" type="number" step="0.01" min="0" class="ad-input" value="${o.price}" placeholder="1999" />
        </div>
        <div>
          <label class="ad-label">M.R.P. (₹)</label>
          <input name="offer_original" type="number" step="0.01" min="0" class="ad-input" value="${o.original_price}" placeholder="2999" />
        </div>
        <div class="flex items-end pb-1.5">
          <label class="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="offer_instock" value="1" ${o.in_stock ? 'checked' : ''} style="width:1.05rem;height:1.05rem;accent-color:#818CF8" /> In stock</label>
        </div>
      </div>
      <div class="mt-3">
        <label class="ad-label">Buy Now link <span class="text-[#7A87A0] normal-case">(direct product page URL)</span></label>
        <input name="offer_url" class="ad-input" value="${escapeAttr(o.buy_url)}" placeholder="https://www.amazon.in/dp/XXXXXXXX?tag=yourtag-21" />
      </div>
    </div>`

  const offerRows = offers.map((o, i) => offerRow(o, i)).join('')

  const body = `${topbar('products')}
  <main class="max-w-3xl mx-auto px-5 py-10">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl">${isEdit ? 'Edit product' : 'New product'}</h1>
      <a href="/admin/products" class="text-sm text-[#9BA8C0] hover:text-white">← All products</a>
    </div>
    <form method="post" action="${isEdit ? `/admin/products/edit/${d!.id}` : '/admin/products/new'}" class="space-y-6">
      <div>
        <label class="ad-label">Product name *</label>
        <input name="title" required class="ad-input" value="${d ? escapeAttr(d.title) : ''}" placeholder="boAt Airdopes 141 TWS Earbuds" oninput="var s=document.querySelector('[name=slug]');if(s&&!s.dataset.touched){s.value=this.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-\$/g,'')}" />
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="ad-label">Slug * <span class="text-[#7A87A0] normal-case">(/reviews/…)</span></label>
          <input name="slug" required class="ad-input" value="${d ? escapeAttr(d.slug) : ''}" placeholder="boat-airdopes-141" oninput="this.dataset.touched='1'" />
        </div>
        <div>
          <label class="ad-label">Brand</label>
          <input name="brand" class="ad-input" value="${d ? escapeAttr(d.brand || '') : ''}" placeholder="boAt" />
        </div>
      </div>

      <!-- Image with LIVE preview so you can confirm it actually loads -->
      <div>
        <label class="ad-label">Product image URL</label>
        <div class="flex gap-4 items-start">
          <input id="img-url" name="image_url" class="ad-input" value="${d ? escapeAttr(d.image_url || '') : ''}" placeholder="https://…/product.jpg  (paste any image link)" />
          <div id="img-preview-wrap" class="shrink-0 w-24 h-24 rounded-lg border border-[#28324A] bg-[#101624] flex items-center justify-center overflow-hidden">
            <img id="img-preview" referrerpolicy="no-referrer" class="w-full h-full object-contain" style="display:none" />
            <i id="img-placeholder" class="fas fa-image text-2xl text-[#566080]"></i>
            <span id="img-error" class="hidden text-[0.6rem] text-red-400 px-1 text-center">Can't load — try another link</span>
          </div>
        </div>
        <p class="text-xs text-[#7A87A0] mt-1.5">Paste a direct image link. The preview confirms it loads before you save. If a blog/CDN link won't show, right-click the image → "Copy image address".</p>
      </div>

      <div>
        <label class="ad-label">Short description <span class="text-[#7A87A0] normal-case">(one line — used on cards &amp; the carousel)</span></label>
        <input name="short_desc" class="ad-input" value="${d ? escapeAttr(d.short_desc || '') : ''}" placeholder="Punchy bass, 42h playback, IPX4 — unbeatable under ₹1,500" />
      </div>
      <div>
        <label class="ad-label">Full description (Markdown)</label>
        <textarea name="description" rows="8" class="ad-input font-mono text-sm leading-relaxed" placeholder="## Verdict&#10;Write the full review… You can paste image links on their own line and they'll embed.">${d ? escapeHtml(d.description || '') : ''}</textarea>
        <p class="text-xs text-[#7A87A0] mt-1.5">Markdown supported. Paste a bare image URL on its own line to embed it, or use ![alt](url).</p>
      </div>
      <div class="grid sm:grid-cols-3 gap-4">
        <div>
          <label class="ad-label">Category</label>
          ${catSelect}
        </div>
        <div>
          <label class="ad-label">Our rating (0–5)</label>
          <input name="rating" type="number" step="0.1" min="0" max="5" class="ad-input" value="${d && d.rating != null ? d.rating : ''}" placeholder="4.5" />
        </div>
        <div>
          <label class="ad-label">Rating count</label>
          <input name="rating_count" type="number" min="0" class="ad-input" value="${d && d.rating_count ? d.rating_count : ''}" placeholder="1280" />
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="ad-label">Pros <span class="text-[#7A87A0] normal-case">(one per line)</span></label>
          <textarea name="pros" rows="4" class="ad-input text-sm">${d ? escapeHtml(d.pros || '') : ''}</textarea>
        </div>
        <div>
          <label class="ad-label">Cons <span class="text-[#7A87A0] normal-case">(one per line)</span></label>
          <textarea name="cons" rows="4" class="ad-input text-sm">${d ? escapeHtml(d.cons || '') : ''}</textarea>
        </div>
      </div>

      <!-- ============ OFFERS / BUY LINKS ============ -->
      <section class="card p-6">
        <div class="flex items-center gap-2.5 mb-1">
          <i class="fas fa-tags" style="color:#818CF8"></i>
          <h2 class="text-xl">Prices &amp; Buy links</h2>
        </div>
        <p class="text-xs text-[#9BA8C0] mb-5">Add one row per store. The lowest price becomes the "best price" shown on the site &amp; carousel. The Buy Now button links to your URL (tracked via /go/).</p>
        <div id="offers-list">${offerRows}</div>
        <button type="button" id="add-offer" class="ad-btn ad-line text-sm"><i class="fas fa-plus"></i> Add another store</button>
      </section>

      <div class="flex items-center gap-6 pt-2">
        <label class="flex items-center gap-2.5 cursor-pointer text-sm"><input type="checkbox" name="published" value="1" ${!d || d.published ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#818CF8" /> Published (live)</label>
        <label class="flex items-center gap-2.5 cursor-pointer text-sm"><input type="checkbox" name="featured" value="1" ${d && d.featured ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#818CF8" /> Featured</label>
      </div>

      <div class="flex items-center gap-3 pt-4 border-t border-[#28324A]">
        <button type="submit" class="ad-primary ad-btn"><i class="fas fa-floppy-disk"></i> ${isEdit ? 'Save product' : 'Create product'}</button>
        <a href="/admin/products" class="ad-btn ad-line">Cancel</a>
      </div>
    </form>
  </main>
  <template id="offer-template">${offerRow({ retailer: 'amazon', price: '', original_price: '', buy_url: '', in_stock: 1 }, 0).replace(/Offer 1/, 'Offer')}</template>
  <script>
  (function(){
    // Live image preview
    var url=document.getElementById('img-url');
    var prev=document.getElementById('img-preview');
    var ph=document.getElementById('img-placeholder');
    var err=document.getElementById('img-error');
    function showImg(){
      var v=(url.value||'').trim();
      if(!v){ prev.style.display='none'; ph.style.display=''; err.classList.add('hidden'); return; }
      ph.style.display='none'; err.classList.add('hidden');
      prev.style.display=''; prev.src=v;
    }
    if(prev){ prev.onerror=function(){ prev.style.display='none'; ph.style.display='none'; err.classList.remove('hidden'); }; }
    if(url){ url.addEventListener('input', function(){ clearTimeout(url._t); url._t=setTimeout(showImg,400); }); showImg(); }

    // Dynamic offer rows
    var list=document.getElementById('offers-list');
    var addBtn=document.getElementById('add-offer');
    var tpl=document.getElementById('offer-template');
    function renumber(){
      var rows=list.querySelectorAll('.offer-row');
      rows.forEach(function(r,i){ var lbl=r.querySelector('span'); if(lbl) lbl.textContent='Offer '+(i+1); });
    }
    function bindRemove(row){
      var btn=row.querySelector('.offer-remove');
      if(btn) btn.addEventListener('click',function(){
        if(list.querySelectorAll('.offer-row').length<=1){ row.querySelectorAll('input').forEach(function(inp){if(inp.type!=='checkbox')inp.value='';}); return; }
        row.remove(); renumber();
      });
    }
    list.querySelectorAll('.offer-row').forEach(bindRemove);
    if(addBtn) addBtn.addEventListener('click',function(){
      var div=document.createElement('div');
      div.innerHTML=tpl.innerHTML.trim();
      var row=div.firstChild;
      list.appendChild(row); bindRemove(row); renumber();
    });
  })();
  </script>`
  return shell(isEdit ? 'Edit product' : 'New product', body, { error: data.error })
}

// ============ CAROUSEL MANAGER ============
export function AdminCarousel(data: { deals: Deal[]; selectedIds: number[]; flash?: string; error?: string }) {
  const selectedSet = new Set(data.selectedIds)
  // Ordered selected list first (in saved order), then the rest as the pool.
  const selectedDeals = data.selectedIds
    .map((id) => data.deals.find((d) => d.id === id))
    .filter(Boolean) as Deal[]
  const poolDeals = data.deals.filter((d) => !selectedSet.has(d.id))

  const card = (d: Deal, selected: boolean) => {
    const bo = bestOffer(d)
    const price = bo ? formatPrice(bo.price, bo.currency) : ''
    return `<div class="pick-card ${selected ? 'is-selected' : ''}" data-id="${d.id}"
        data-title="${escapeAttr((d.title + ' ' + (d.brand || '') + ' ' + (d.category_name || '')).toLowerCase())}">
      <div class="flex items-center gap-3">
        ${thumb(d, 'w-14 h-14')}
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium text-[#EDF2FA] truncate">${escapeHtml(d.title)}</div>
          <div class="text-xs text-[#9BA8C0] truncate">${d.category_name ? escapeHtml(d.category_name) : 'Uncategorised'}${price ? ' · ' + price : ''}</div>
        </div>
        <button type="button" class="pick-toggle shrink-0">${selected ? '<i class="fas fa-check"></i> Added' : '<i class="fas fa-plus"></i> Add'}</button>
      </div>
    </div>`
  }

  const body = `${topbar('carousel')}
  <main class="max-w-5xl mx-auto px-5 py-10">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
      <div>
        <h1 class="text-3xl">Hero carousel</h1>
        <p class="text-[#9BA8C0] text-sm mt-1">Pick &amp; order the products shown in the homepage carousel.</p>
      </div>
      <div class="text-right">
        <div id="count-pill" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold" style="background:#28324A;color:#818CF8"><i class="fas fa-images"></i> <span id="sel-count">0</span> / 8 selected</div>
      </div>
    </div>
    <p class="text-xs text-[#7A87A0] mb-6">Drag the chosen products to reorder. Up to 8 appear; if you pick fewer, featured products fill the rest automatically.</p>

    <form method="post" action="/admin/carousel" id="carousel-form">
      <input type="hidden" name="ids" id="ids-field" value="${escapeAttr(data.selectedIds.join(','))}" />
      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Chosen (ordered, draggable) -->
        <section class="card p-5">
          <h2 class="text-lg mb-1">In the carousel <span class="text-xs text-[#7A87A0] normal-case">(drag to reorder)</span></h2>
          <p class="text-xs text-[#9BA8C0] mb-4">Top = first slide.</p>
          <div id="chosen-list" class="space-y-2 min-h-[6rem]">
            ${selectedDeals.map((d) => chosenRow(d)).join('') || '<div id="chosen-empty" class="text-sm text-[#7A87A0] py-8 text-center border border-dashed border-[#28324A] rounded-lg">Nothing chosen yet — add products from the right →</div>'}
          </div>
        </section>

        <!-- Pool / picker -->
        <section class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg">All products</h2>
            <div class="relative">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#7A87A0]"></i>
              <input id="pick-search" type="text" placeholder="Search…" class="ad-input !py-1.5 !pl-9 !w-44 text-sm" />
            </div>
          </div>
          <div id="pool-list" class="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            ${poolDeals.map((d) => card(d, false)).join('') || '<div class="text-sm text-[#7A87A0] py-8 text-center">No products found. <a href="/admin/products/new" class="text-[#818CF8] underline">Add products →</a></div>'}
          </div>
          <div id="pool-empty" class="hidden text-sm text-[#7A87A0] py-6 text-center">No products match.</div>
        </section>
      </div>

      <div class="flex items-center gap-3 pt-6 mt-6 border-t border-[#28324A]">
        <button type="submit" class="ad-primary ad-btn"><i class="fas fa-floppy-disk"></i> Save carousel</button>
        <a href="/" target="_blank" class="ad-btn ad-line"><i class="fas fa-eye"></i> Preview homepage</a>
        <span id="overflow-warn" class="hidden text-sm text-amber-400"><i class="fas fa-triangle-exclamation"></i> Only the first 8 will be used.</span>
      </div>
    </form>
  </main>
  <style>
    .pick-card { background:#101624; border:1px solid #28324A; border-radius:.75rem; padding:.7rem .85rem; cursor:pointer; transition:border-color .2s, background .2s; }
    .pick-card:hover { border-color:#3d4763; }
    .pick-card.is-selected { opacity:.45; }
    .pick-toggle { display:inline-flex; align-items:center; gap:.35rem; font-size:.72rem; font-weight:600; padding:.4rem .7rem; border-radius:.5rem; background:#28324A; color:#818CF8; transition:all .2s; }
    .pick-toggle:hover { background:#818CF8; color:#fff; }
    .chosen-row { background:#101624; border:1px solid #28324A; border-radius:.75rem; padding:.65rem .8rem; display:flex; align-items:center; gap:.7rem; }
    .chosen-row.dragging { opacity:.5; }
    .chosen-list-over { outline:2px dashed #818CF8; outline-offset:3px; border-radius:.75rem; }
    .drag-handle { cursor:grab; color:#566080; }
    .drag-handle:active { cursor:grabbing; }
  </style>
  <script>
  (function(){
    var form=document.getElementById('carousel-form');
    var idsField=document.getElementById('ids-field');
    var chosen=document.getElementById('chosen-list');
    var pool=document.getElementById('pool-list');
    var poolEmpty=document.getElementById('pool-empty');
    var search=document.getElementById('pick-search');
    var countEl=document.getElementById('sel-count');
    var countPill=document.getElementById('count-pill');
    var overflow=document.getElementById('overflow-warn');
    var MAX=8;

    function chosenIds(){
      return Array.prototype.slice.call(chosen.querySelectorAll('.chosen-row')).map(function(r){return r.dataset.id;});
    }
    function updateCount(){
      var ids=chosenIds();
      idsField.value=ids.join(',');
      countEl.textContent=ids.length;
      countPill.style.background = ids.length>MAX ? '#3a2418' : '#28324A';
      countPill.style.color = ids.length>MAX ? '#FBBF24' : '#818CF8';
      overflow.classList.toggle('hidden', ids.length<=MAX);
      var empty=document.getElementById('chosen-empty');
      if(empty) empty.style.display = ids.length ? 'none' : '';
    }
    function makeChosenRow(id,title,thumbHtml,sub){
      var div=document.createElement('div');
      div.className='chosen-row'; div.dataset.id=id; div.draggable=true;
      div.innerHTML='<span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>'+thumbHtml+
        '<div class="min-w-0 flex-1"><div class="text-sm font-medium text-[#EDF2FA] truncate">'+title+'</div><div class="text-xs text-[#9BA8C0] truncate">'+(sub||'')+'</div></div>'+
        '<button type="button" class="chosen-remove text-[#F87171] hover:text-red-300 text-sm shrink-0"><i class="fas fa-times"></i></button>';
      bindChosen(div);
      return div;
    }
    function addToChosen(card){
      if(chosenIds().length>=MAX){ alert('You can pick up to 8 products. Remove one first.'); return; }
      var id=card.dataset.id;
      var thumbHtml=card.querySelector('img,span').outerHTML;
      // grab thumb wrapper (img or placeholder span) — take the first media node
      var media=card.querySelector('.flex > *:first-child');
      var titleEl=card.querySelector('.text-sm');
      var subEl=card.querySelector('.text-xs');
      var row=makeChosenRow(id, titleEl?titleEl.textContent:'', media?media.outerHTML:'', subEl?subEl.textContent:'');
      var empty=document.getElementById('chosen-empty'); if(empty) empty.remove();
      chosen.appendChild(row);
      card.classList.add('is-selected');
      card.querySelector('.pick-toggle').innerHTML='<i class="fas fa-check"></i> Added';
      updateCount();
    }
    function removeFromChosen(id){
      var row=chosen.querySelector('.chosen-row[data-id="'+id+'"]');
      if(row) row.remove();
      var card=pool.querySelector('.pick-card[data-id="'+id+'"]');
      if(card){ card.classList.remove('is-selected'); card.querySelector('.pick-toggle').innerHTML='<i class="fas fa-plus"></i> Add'; }
      if(!chosen.querySelector('.chosen-row') && !document.getElementById('chosen-empty')){
        var e=document.createElement('div'); e.id='chosen-empty'; e.className='text-sm text-[#7A87A0] py-8 text-center border border-dashed border-[#28324A] rounded-lg'; e.textContent='Nothing chosen yet — add products from the right →'; chosen.appendChild(e);
      }
      updateCount();
    }
    function bindChosen(row){
      var rm=row.querySelector('.chosen-remove');
      if(rm) rm.addEventListener('click',function(){ removeFromChosen(row.dataset.id); });
      row.addEventListener('dragstart',function(e){ row.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      row.addEventListener('dragend',function(){ row.classList.remove('dragging'); updateCount(); });
    }
    chosen.addEventListener('dragover',function(e){
      e.preventDefault();
      var dragging=chosen.querySelector('.dragging'); if(!dragging) return;
      var after=getAfter(chosen,e.clientY);
      if(after==null) chosen.appendChild(dragging); else chosen.insertBefore(dragging,after);
    });
    function getAfter(container,y){
      var els=Array.prototype.slice.call(container.querySelectorAll('.chosen-row:not(.dragging)'));
      return els.reduce(function(closest,child){
        var box=child.getBoundingClientRect();
        var offset=y-box.top-box.height/2;
        if(offset<0 && offset>closest.offset) return {offset:offset,element:child};
        return closest;
      },{offset:-Infinity}).element || null;
    }
    pool.addEventListener('click',function(e){
      var card=e.target.closest('.pick-card'); if(!card) return;
      if(card.classList.contains('is-selected')){ removeFromChosen(card.dataset.id); }
      else { addToChosen(card); }
    });
    // existing chosen rows
    Array.prototype.slice.call(chosen.querySelectorAll('.chosen-row')).forEach(bindChosen);
    // mark pool cards already chosen
    chosenIds().forEach(function(id){ var c=pool.querySelector('.pick-card[data-id="'+id+'"]'); if(c){ c.classList.add('is-selected'); c.querySelector('.pick-toggle').innerHTML='<i class="fas fa-check"></i> Added'; } });

    if(search) search.addEventListener('input',function(){
      var q=(search.value||'').toLowerCase().trim(); var vis=0;
      pool.querySelectorAll('.pick-card').forEach(function(c){ var show=!q||c.dataset.title.indexOf(q)>-1; c.style.display=show?'':'none'; if(show)vis++; });
      poolEmpty.classList.toggle('hidden', vis>0);
    });
    form.addEventListener('submit',function(){ idsField.value=chosenIds().slice(0,MAX).join(','); });
    updateCount();
  })();
  </script>`
  return shell('Carousel', body, { flash: data.flash, error: data.error })
}

function chosenRow(d: Deal): string {
  const bo = bestOffer(d)
  const sub = `${d.category_name ? escapeHtml(d.category_name) : 'Uncategorised'}${bo ? ' · ' + formatPrice(bo.price, bo.currency) : ''}`
  return `<div class="chosen-row" data-id="${d.id}" draggable="true">
    <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
    ${thumb(d, 'w-12 h-12')}
    <div class="min-w-0 flex-1">
      <div class="text-sm font-medium text-[#EDF2FA] truncate">${escapeHtml(d.title)}</div>
      <div class="text-xs text-[#9BA8C0] truncate">${sub}</div>
    </div>
    <button type="button" class="chosen-remove text-[#F87171] hover:text-red-300 text-sm shrink-0"><i class="fas fa-times"></i></button>
  </div>`
}

// ============ CATEGORIES MANAGER ============
export interface AdminCategoryRow {
  id: number
  slug: string
  name: string
  icon?: string | null
  parent_id?: number | null
  sort_order?: number
  deals: number
  posts: number
  depth: number
}

export function AdminCategories(data: { rows: AdminCategoryRow[]; flash?: string; error?: string; editId?: number }) {
  const roots = data.rows.filter((r) => r.depth === 0)
  const totalCats = data.rows.length
  const totalSub = data.rows.filter((r) => r.depth > 0).length

  // Parent <select> for the add/edit forms — only roots & their direct children
  // can be parents (we keep the tree at most 3 levels deep: root → sub → leaf).
  const parentOptions = (selected?: number | null, excludeId?: number) => {
    const opts = data.rows
      .filter((r) => r.id !== excludeId && r.depth < 2)
      .map((r) => {
        const indent = r.depth === 0 ? '' : '\u00A0\u00A0└\u00A0'
        return `<option value="${r.id}" ${selected === r.id ? 'selected' : ''}>${indent}${escapeHtml(r.name)}</option>`
      })
      .join('')
    return `<option value="" ${selected == null ? 'selected' : ''}>— Top level —</option>${opts}`
  }

  const rowHtml = (r: AdminCategoryRow) => {
    const pad = r.depth === 0 ? 0 : r.depth === 1 ? 1.5 : 3
    const icon = r.icon ? `<i class="${escapeAttr(r.icon)} w-4 text-center" style="color:#818CF8"></i>` : '<i class="fas fa-folder w-4 text-center text-[#566080]"></i>'
    const isEditing = data.editId === r.id
    if (isEditing) {
      return `<tr class="border-t border-[#28324A] bg-[#101624]">
        <td colspan="5" class="px-5 py-4">
          <form method="post" action="/admin/categories/edit/${r.id}" class="grid sm:grid-cols-12 gap-3 items-end">
            <div class="sm:col-span-3"><label class="ad-label">Name</label><input name="name" required class="ad-input" value="${escapeAttr(r.name)}" /></div>
            <div class="sm:col-span-3"><label class="ad-label">Slug</label><input name="slug" required class="ad-input" value="${escapeAttr(r.slug)}" /></div>
            <div class="sm:col-span-2"><label class="ad-label">Icon</label><input name="icon" class="ad-input" value="${escapeAttr(r.icon || '')}" placeholder="fas fa-shirt" /></div>
            <div class="sm:col-span-2"><label class="ad-label">Parent</label><select name="parent_id" class="ad-input">${parentOptions(r.parent_id, r.id)}</select></div>
            <div class="sm:col-span-1"><label class="ad-label">Order</label><input name="sort_order" type="number" class="ad-input" value="${r.sort_order ?? 0}" /></div>
            <div class="sm:col-span-1 flex gap-2">
              <button type="submit" class="ad-primary ad-btn !px-3"><i class="fas fa-check"></i></button>
              <a href="/admin/categories" class="ad-btn ad-line !px-3">✕</a>
            </div>
          </form>
        </td>
      </tr>`
    }
    return `<tr class="border-t border-[#28324A] hover:bg-[#101624] transition">
      <td class="py-3 px-5">
        <div class="flex items-center gap-2.5" style="padding-left:${pad}rem">
          ${r.depth > 0 ? '<span class="text-[#566080] text-xs">└</span>' : ''}
          ${icon}
          <span class="font-medium text-[#EDF2FA] ${r.depth === 0 ? '' : 'text-sm'}">${escapeHtml(r.name)}</span>
        </div>
      </td>
      <td class="py-3 pr-3"><a href="/category/${r.slug}" target="_blank" class="text-xs text-[#9BA8C0] hover:text-[#818CF8]">/${escapeHtml(r.slug)}</a></td>
      <td class="py-3 pr-3 text-sm text-[#CBD5E6] text-center">${r.deals}</td>
      <td class="py-3 pr-3 text-sm text-[#CBD5E6] text-center">${r.posts}</td>
      <td class="py-3 px-5 text-right whitespace-nowrap">
        <a href="/admin/categories?edit=${r.id}" class="ad-btn ad-line !py-1.5 !px-2.5 text-xs">Edit</a>
        <form method="post" action="/admin/categories/delete/${r.id}" class="inline" onsubmit="return confirm('Delete &quot;${escapeAttr(r.name)}&quot;? Its products &amp; posts become Uncategorised and any sub-categories move to the top level.')">
          <button title="Delete" class="ad-btn ad-danger !py-1.5 !px-2.5 text-xs ml-1"><i class="fas fa-trash"></i></button>
        </form>
      </td>
    </tr>`
  }

  const rows = data.rows.map(rowHtml).join('')

  const body = `${topbar('categories')}
  <main class="max-w-5xl mx-auto px-5 py-10">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl">Categories</h1>
        <p class="text-[#9BA8C0] text-sm mt-1">Organise the store. Parents (Fashion), sub-categories (Men's) &amp; leaves (T-Shirts) build the site nav &amp; filters.</p>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
      <div class="card p-5"><div class="flex items-center justify-between"><div><div class="text-3xl font-semibold" style="font-family:'Playfair Display',serif">${roots.length}</div><div class="text-xs text-[#9BA8C0] uppercase tracking-wider mt-1">Top level</div></div><i class="fas fa-folder-tree text-xl" style="color:#8ab4f8"></i></div></div>
      <div class="card p-5"><div class="flex items-center justify-between"><div><div class="text-3xl font-semibold" style="font-family:'Playfair Display',serif">${totalSub}</div><div class="text-xs text-[#9BA8C0] uppercase tracking-wider mt-1">Sub-categories</div></div><i class="fas fa-sitemap text-xl" style="color:#818CF8"></i></div></div>
      <div class="card p-5"><div class="flex items-center justify-between"><div><div class="text-3xl font-semibold" style="font-family:'Playfair Display',serif">${totalCats}</div><div class="text-xs text-[#9BA8C0] uppercase tracking-wider mt-1">Total</div></div><i class="fas fa-tags text-xl" style="color:#34d399"></i></div></div>
    </div>

    <!-- Add new category -->
    <section class="card p-6 mb-8">
      <div class="flex items-center gap-2.5 mb-4"><i class="fas fa-plus" style="color:#818CF8"></i><h2 class="text-xl">Add a category</h2></div>
      <form method="post" action="/admin/categories/new" class="grid sm:grid-cols-12 gap-3 items-end">
        <div class="sm:col-span-3"><label class="ad-label">Name *</label><input name="name" required class="ad-input" placeholder="Footwear" oninput="var s=this.form.querySelector('[name=slug]');if(s&&!s.dataset.touched){s.value=this.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}" /></div>
        <div class="sm:col-span-3"><label class="ad-label">Slug *</label><input name="slug" required class="ad-input" placeholder="footwear" oninput="this.dataset.touched='1'" /></div>
        <div class="sm:col-span-2"><label class="ad-label">Icon <span class="text-[#7A87A0] normal-case">(FA)</span></label><input name="icon" class="ad-input" placeholder="fas fa-shoe-prints" /></div>
        <div class="sm:col-span-2"><label class="ad-label">Parent</label><select name="parent_id" class="ad-input">${parentOptions(null)}</select></div>
        <div class="sm:col-span-1"><label class="ad-label">Order</label><input name="sort_order" type="number" class="ad-input" value="0" /></div>
        <div class="sm:col-span-1"><button type="submit" class="ad-primary ad-btn w-full justify-center"><i class="fas fa-plus"></i></button></div>
      </form>
      <p class="text-xs text-[#7A87A0] mt-3">Tip: find icon names at <span class="text-[#9BA8C0]">fontawesome.com/icons</span> — e.g. <code>fas fa-shoe-prints</code>, <code>fas fa-shirt</code>, <code>fas fa-mobile-screen</code>.</p>
    </section>

    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-[#9BA8C0] text-xs uppercase tracking-wider"><th class="py-3 px-5">Category</th><th>Slug</th><th class="text-center">Products</th><th class="text-center">Posts</th><th class="px-5 text-right">Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="py-12 text-center text-[#9BA8C0]">No categories yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </main>`
  return shell('Categories', body, { flash: data.flash, error: data.error })
}
