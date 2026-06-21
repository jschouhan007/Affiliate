export function formatPrice(value?: number, currency = 'INR'): string {
  if (value == null) return ''
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : ''
  return `${symbol}${value.toLocaleString('en-IN')}`
}

export function discountPct(price?: number, original?: number): number | null {
  if (!price || !original || original <= price) return null
  return Math.round(((original - price) / original) * 100)
}

export function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.floor(months / 12)} yr ago`
}

export function retailerMeta(retailer: string): { name: string; color: string; icon: string } {
  switch (retailer?.toLowerCase()) {
    case 'amazon':
      return { name: 'Amazon', color: 'bg-[#FF9900] text-black', icon: 'fab fa-amazon' }
    case 'flipkart':
      return { name: 'Flipkart', color: 'bg-[#2874F0] text-white', icon: 'fas fa-shopping-bag' }
    default:
      return { name: retailer || 'Store', color: 'bg-slate-700 text-white', icon: 'fas fa-store' }
  }
}
