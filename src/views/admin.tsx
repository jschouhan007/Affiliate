import { html, raw } from 'hono/html'
import { SITE, type Category, type Post } from '../types'

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
    body { font-family: 'Inter', system-ui, sans-serif; background:#0F0E0D; color:#E7E2DC; }
    h1,h2,h3 { font-family:'Playfair Display', serif; }
    .ad-input { background:#1A1816; border:1px solid #34302B; border-radius:.6rem; padding:.65rem .9rem; width:100%; color:#F2EDE7; outline:none; transition:border-color .2s; }
    .ad-input:focus { border-color:#FB7234; }
    .ad-label { font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#9A8E82; font-weight:600; margin-bottom:.4rem; display:block; }
    .ad-btn { display:inline-flex; align-items:center; gap:.5rem; font-weight:600; padding:.6rem 1.1rem; border-radius:.6rem; cursor:pointer; transition:transform .15s, background .2s; font-size:.9rem; }
    .ad-btn:active { transform:scale(.97); }
    .ad-primary { background:linear-gradient(135deg,#FACC15,#FB7234 45%,#E11D48); color:#fff; }
    .ad-line { border:1px solid #34302B; color:#E7E2DC; }
    .ad-line:hover { border-color:#FB7234; color:#FB7234; }
    .ad-danger { color:#F87171; border:1px solid #4a2222; }
    .ad-danger:hover { background:#3a1a1a; }
    .card { background:#161412; border:1px solid #2A2622; border-radius:1rem; }
  </style>
</head>
<body class="min-h-screen">
  ${raw(opts.flash ? `<div class="bg-emerald-900/40 border-b border-emerald-700/40 text-emerald-200 text-sm px-5 py-3 text-center">${opts.flash}</div>` : '')}
  ${raw(opts.error ? `<div class="bg-red-900/40 border-b border-red-700/40 text-red-200 text-sm px-5 py-3 text-center">${opts.error}</div>` : '')}
  ${raw(body)}
</body>
</html>`
}

export function AdminLogin(opts: { error?: string } = {}) {
  const body = `
  <main class="min-h-screen flex items-center justify-center px-5">
    <div class="card p-10 w-full max-w-sm">
      <div class="text-center mb-8">
        <i class="fas fa-fire-flame-curved text-3xl" style="color:#FB7234"></i>
        <h1 class="text-2xl mt-3">${SITE.name} Admin</h1>
        <p class="text-sm text-[#9A8E82] mt-1">Restricted area — sign in to continue</p>
      </div>
      <form method="post" action="/admin/login" class="space-y-5">
        <div>
          <label class="ad-label">Password</label>
          <input type="password" name="password" required autofocus class="ad-input" placeholder="••••••••" />
        </div>
        <button type="submit" class="ad-primary ad-btn w-full justify-center">Sign in <i class="fas fa-arrow-right text-xs"></i></button>
      </form>
      <a href="/" class="block text-center text-xs text-[#9A8E82] hover:text-[#FB7234] mt-6">← Back to site</a>
    </div>
  </main>`
  return shell('Sign in', body, { error: opts.error })
}

function topbar(active: string): string {
  return `<header class="border-b border-[#2A2622] sticky top-0 bg-[#0F0E0D]/90 backdrop-blur z-10">
    <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="/admin" class="flex items-center gap-2.5"><i class="fas fa-fire-flame-curved" style="color:#FB7234"></i><span class="font-semibold">${SITE.name} Admin</span></a>
      <nav class="flex items-center gap-5 text-sm">
        <a href="/admin" class="${active === 'dash' ? 'text-[#FB7234]' : 'text-[#C9BFB5] hover:text-white'}">Posts</a>
        <a href="/admin/new" class="${active === 'new' ? 'text-[#FB7234]' : 'text-[#C9BFB5] hover:text-white'}">New post</a>
        <a href="/" target="_blank" class="text-[#C9BFB5] hover:text-white">View site <i class="fas fa-arrow-up-right-from-square text-[0.6rem]"></i></a>
        <form method="post" action="/admin/logout" class="inline"><button class="text-[#9A8E82] hover:text-red-300">Log out</button></form>
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
          <div class="text-xs text-[#9A8E82] uppercase tracking-wider mt-1">${label}</div>
        </div>
        <i class="${icon} text-xl" style="color:${color}"></i>
      </div>
    </div>`

  const rows = data.posts
    .map(
      (p) => `<tr class="post-row border-t border-[#2A2622] hover:bg-[#1A1816] transition"
        data-status="${p.published ? 'published' : 'draft'}"
        data-title="${escapeAttr(p.title.toLowerCase())}"
        data-slug="${escapeAttr(p.slug.toLowerCase())}">
      <td class="py-3.5 px-5">
        <div class="font-medium text-[#F2EDE7] break-words">${escapeHtml(p.title)}</div>
        <a href="/blog/${p.slug}" target="_blank" class="text-xs text-[#9A8E82] hover:text-[#FB7234] break-all">/blog/${p.slug} <i class="fas fa-arrow-up-right-from-square text-[0.55rem]"></i></a>
      </td>
      <td class="py-3.5 pr-3 text-sm text-[#C9BFB5] whitespace-nowrap">${p.category_name || '—'}</td>
      <td class="py-3.5 pr-3 text-sm whitespace-nowrap">${p.pillar ? '<span class="text-[#FB7234]">Guide</span>' : `<span class="text-[#9A8E82] capitalize">${p.post_type}</span>`}</td>
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
        <p class="text-[#9A8E82] text-sm mt-1">Manage your blog posts, drafts &amp; SEO</p>
      </div>
      <a href="/admin/new" class="ad-primary ad-btn"><i class="fas fa-plus"></i> New post</a>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      ${statCard('Total posts', total, 'fas fa-newspaper', '#8ab4f8')}
      ${statCard('Published', published, 'fas fa-circle-check', '#34d399')}
      ${statCard('Drafts', drafts, 'fas fa-pen-ruler', '#fbbf24')}
      ${statCard('Guides', guides, 'fas fa-compass', '#FB7234')}
    </div>

    <div class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#2A2622]">
        <div class="flex items-center gap-1.5 text-sm" id="status-tabs">
          <button data-filter="all" class="filter-tab active px-3 py-1.5 rounded-md">All <span class="opacity-60">${total}</span></button>
          <button data-filter="published" class="filter-tab px-3 py-1.5 rounded-md">Published <span class="opacity-60">${published}</span></button>
          <button data-filter="draft" class="filter-tab px-3 py-1.5 rounded-md">Drafts <span class="opacity-60">${drafts}</span></button>
        </div>
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b635a]"></i>
          <input id="post-search" type="text" placeholder="Search posts…" class="ad-input !py-2 !pl-9 !w-56 text-sm" />
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-left text-[#9A8E82] text-xs uppercase tracking-wider"><th class="py-3 px-5">Title</th><th>Category</th><th>Type</th><th>Status</th><th class="px-5 text-right">Actions</th></tr></thead>
          <tbody id="posts-tbody">${rows || '<tr><td colspan="5" class="py-12 text-center text-[#9A8E82]">No posts yet. <a href="/admin/new" class="text-[#FB7234] underline">Create your first post →</a></td></tr>'}</tbody>
        </table>
        <div id="no-results" class="hidden py-12 text-center text-[#9A8E82]">No posts match your filter.</div>
      </div>
    </div>
  </main>
  <style>
    .filter-tab { color:#9A8E82; transition:all .2s; }
    .filter-tab:hover { color:#E7E2DC; }
    .filter-tab.active { background:#2A2622; color:#FB7234; }
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
  const catOpts = data.categories
    .map((c) => `<option value="${c.id}" ${p && p.category_id === c.id ? 'selected' : ''}>${c.name}</option>`)
    .join('')

  const typeOpts = ['blog', 'review', 'comparison', 'guide']
    .map((t) => `<option value="${t}" ${p && p.post_type === t ? 'selected' : ''}>${t}</option>`)
    .join('')

  const body = `${topbar(isEdit ? 'dash' : 'new')}
  <main class="max-w-3xl mx-auto px-5 py-10">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl">${isEdit ? 'Edit post' : 'New post'}</h1>
      <a href="/admin" class="text-sm text-[#9A8E82] hover:text-white">← All posts</a>
    </div>
    <form method="post" action="${isEdit ? `/admin/edit/${p!.id}` : '/admin/new'}" class="space-y-6">
      <div>
        <label class="ad-label">Title *</label>
        <input name="title" required class="ad-input" value="${p ? escapeAttr(p.title) : ''}" placeholder="Best Wireless Earbuds Under ₹2,000" oninput="if(!this.dataset.t){var s=document.querySelector('[name=slug]');if(s&&!s.value){s.value=this.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}}" />
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="ad-label">Slug * <span class="text-[#6b635a] normal-case">(/blog/…)</span></label>
          <input name="slug" required class="ad-input" value="${p ? escapeAttr(p.slug) : ''}" placeholder="best-wireless-earbuds" />
        </div>
        <div>
          <label class="ad-label">Cover image URL</label>
          <input name="cover_image" class="ad-input" value="${p ? escapeAttr(p.cover_image || '') : ''}" placeholder="https://…" />
        </div>
      </div>
      <div>
        <label class="ad-label">Dek <span class="text-[#6b635a] normal-case">(italic standfirst under the title)</span></label>
        <input name="dek" class="ad-input" value="${p ? escapeAttr(p.dek || '') : ''}" />
      </div>
      <div>
        <label class="ad-label">Excerpt <span class="text-[#6b635a] normal-case">(meta description / card preview)</span></label>
        <textarea name="excerpt" rows="2" class="ad-input">${p ? escapeHtml(p.excerpt || '') : ''}</textarea>
      </div>
      <div>
        <label class="ad-label">Body (Markdown) *</label>
        <textarea name="body" rows="18" required class="ad-input font-mono text-sm leading-relaxed" placeholder="## The short answer&#10;Write your review in Markdown…">${p ? escapeHtml(p.body) : ''}</textarea>
        <p class="text-xs text-[#6b635a] mt-1.5">Supports Markdown: ## headings, **bold**, lists, [links](url), &gt; quotes, tables.</p>
      </div>
      <div class="grid sm:grid-cols-3 gap-4">
        <div>
          <label class="ad-label">Category</label>
          <select name="category_id" class="ad-input"><option value="">— None —</option>${catOpts}</select>
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
        <label class="flex items-center gap-2.5 cursor-pointer text-sm"><input type="checkbox" name="published" value="1" ${!p || p.published ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#FB7234" /> Published</label>
        <label class="flex items-center gap-2.5 cursor-pointer text-sm"><input type="checkbox" name="pillar" value="1" ${p && p.pillar ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#FB7234" /> Buying guide (pillar)</label>
      </div>

      <!-- ============ SEO PANEL ============ -->
      <section class="card p-6 mt-2">
        <div class="flex items-center gap-2.5 mb-1">
          <i class="fas fa-magnifying-glass-chart" style="color:#FB7234"></i>
          <h2 class="text-xl">Search &amp; Social (SEO)</h2>
        </div>
        <p class="text-xs text-[#9A8E82] mb-6">Control exactly how this post appears on Google and when shared. Leave blank to fall back to the title &amp; excerpt.</p>

        <!-- Live Google preview -->
        <div class="rounded-lg p-4 mb-6" style="background:#1A1816;border:1px solid #2A2622">
          <div class="text-[0.7rem] text-[#6b635a] uppercase tracking-wider mb-2">Google preview</div>
          <div id="seo-prev-url" style="color:#9aa0a6;font-size:.8rem">${SITE.url}/blog/${p ? escapeHtml(p.slug) : 'your-post'}</div>
          <div id="seo-prev-title" style="color:#8ab4f8;font-size:1.05rem;line-height:1.3;margin:.15rem 0">${escapeHtml((p && (p.meta_title || p.title)) || 'Your post title')}</div>
          <div id="seo-prev-desc" style="color:#bdc1c6;font-size:.82rem;line-height:1.45">${escapeHtml((p && (p.meta_description || p.excerpt)) || 'Your meta description will appear here. Aim for 150–160 characters that summarise the post and entice the click.')}</div>
        </div>

        <div class="space-y-5">
          <div>
            <div class="flex items-center justify-between">
              <label class="ad-label !mb-0">Meta title</label>
              <span id="mt-count" class="text-[0.68rem] text-[#6b635a]">0 / 60</span>
            </div>
            <input id="seo-meta-title" name="meta_title" maxlength="70" class="ad-input mt-1.5" value="${p ? escapeAttr(p.meta_title || '') : ''}" placeholder="Defaults to the post title" />
          </div>
          <div>
            <div class="flex items-center justify-between">
              <label class="ad-label !mb-0">Meta description</label>
              <span id="md-count" class="text-[0.68rem] text-[#6b635a]">0 / 160</span>
            </div>
            <textarea id="seo-meta-desc" name="meta_description" rows="2" maxlength="200" class="ad-input mt-1.5" placeholder="Defaults to the excerpt">${p ? escapeHtml(p.meta_description || '') : ''}</textarea>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="ad-label">Focus keywords <span class="text-[#6b635a] normal-case">(comma separated)</span></label>
              <input name="meta_keywords" class="ad-input" value="${p ? escapeAttr(p.meta_keywords || '') : ''}" placeholder="wireless earbuds, budget, review" />
            </div>
            <div>
              <label class="ad-label">Social share image (OG) URL</label>
              <input name="og_image" class="ad-input" value="${p ? escapeAttr(p.og_image || '') : ''}" placeholder="Defaults to cover image" />
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-4 items-end">
            <div>
              <label class="ad-label">Canonical URL <span class="text-[#6b635a] normal-case">(optional)</span></label>
              <input name="canonical_url" class="ad-input" value="${p ? escapeAttr(p.canonical_url || '') : ''}" placeholder="Leave blank for default" />
            </div>
            <label class="flex items-center gap-2.5 cursor-pointer text-sm pb-1.5"><input type="checkbox" name="noindex" value="1" ${p && p.noindex ? 'checked' : ''} style="width:1.1rem;height:1.1rem;accent-color:#FB7234" /> Hide from search engines (noindex)</label>
          </div>
        </div>
      </section>

      <div class="flex items-center gap-3 pt-4 border-t border-[#2A2622]">
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
    function count(el,out,max){ if(!el||!out)return; var n=(el.value||'').length; out.textContent=n+' / '+max; out.style.color=n>max?'#F87171':(n>max*0.92?'#FBBF24':'#6b635a'); }
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
