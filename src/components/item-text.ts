import type { BaseItem } from '../api/types'

export function hrefFor(item: BaseItem): string {
  return item.IsFolder ? `/library/${item.Id}` : `/item/${item.Id}`
}

export function subtitleFor(item: BaseItem): string {
  if (item.Type === 'Episode') {
    const se =
      item.ParentIndexNumber != null && item.IndexNumber != null ? `S${item.ParentIndexNumber}:E${item.IndexNumber} · ` : ''
    return `${se}${item.SeriesName ?? ''}`
  }
  return item.ProductionYear ? String(item.ProductionYear) : ''
}
