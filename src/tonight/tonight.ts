// "Tonight": a short list of things to watch, saved on this device only.
// These helpers never change the list in place; they return a new one (React state friendly).
import type { BaseItem } from '../api/types'

export const TONIGHT_MAX = 50

/** Only what a poster card and the player need, so the saved list stays small. */
export function snapshot(item: BaseItem): BaseItem {
  const s: BaseItem = { Id: item.Id, Name: item.Name, Type: item.Type }
  const keep = [
    'MediaType',
    'IsFolder',
    'SeriesId',
    'SeriesName',
    'SeriesPrimaryImageTag',
    'ProductionYear',
    'ParentIndexNumber',
    'IndexNumber',
    'RunTimeTicks',
  ] as const
  for (const k of keep) if (item[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = item[k]
  if (item.ImageTags?.Primary) s.ImageTags = { Primary: item.ImageTags.Primary }
  if (item.UserData) s.UserData = { ...item.UserData }
  return s
}

export const has = (list: readonly BaseItem[], id: string) => list.some((i) => i.Id === id)

/** Adds to the end (watch order = order added). Adding twice does nothing. */
export function add(list: readonly BaseItem[], item: BaseItem): BaseItem[] {
  if (has(list, item.Id)) return [...list]
  return [...list, snapshot(item)].slice(-TONIGHT_MAX)
}

export const remove = (list: readonly BaseItem[], id: string): BaseItem[] => list.filter((i) => i.Id !== id)

/** What to play after `currentId` finishes: the first other item on the list. */
export function next(list: readonly BaseItem[], currentId?: string): BaseItem | null {
  return list.find((i) => i.Id !== currentId) ?? null
}

/**
 * Put fresh server copies in place of the saved ones (new progress bars), keeping the list order.
 * Items the server no longer has are dropped.
 */
export function refresh(list: readonly BaseItem[], fresh: readonly BaseItem[]): BaseItem[] {
  const byId = new Map(fresh.map((i) => [i.Id, i]))
  return list.flatMap((i) => {
    const f = byId.get(i.Id)
    return f ? [snapshot(f)] : []
  })
}
