import { describe, expect, it } from 'vitest'
import type { BaseItem } from '../api/types'
import { add, has, next, refresh, remove, snapshot, TONIGHT_MAX } from './tonight'

const item = (Id: string, extra: Partial<BaseItem> = {}): BaseItem => ({ Id, Name: `Item ${Id}`, Type: 'Movie', ...extra })

describe('tonight list', () => {
  it('adds in order, once', () => {
    let l = add([], item('a'))
    l = add(l, item('b'))
    l = add(l, item('a'))
    expect(l.map((i) => i.Id)).toEqual(['a', 'b'])
    expect(has(l, 'b')).toBe(true)
  })

  it('removes and never changes the original list', () => {
    const l = [item('a'), item('b')]
    expect(remove(l, 'a').map((i) => i.Id)).toEqual(['b'])
    expect(l).toHaveLength(2)
  })

  it('picks the next item that is not the current one', () => {
    const l = [item('a'), item('b')]
    expect(next(l, 'a')?.Id).toBe('b')
    expect(next(l, 'x')?.Id).toBe('a')
    expect(next([item('a')], 'a')).toBeNull()
  })

  it('keeps only the newest TONIGHT_MAX items', () => {
    let l: BaseItem[] = []
    for (let i = 0; i < TONIGHT_MAX + 5; i++) l = add(l, item(String(i)))
    expect(l).toHaveLength(TONIGHT_MAX)
    expect(l[0].Id).toBe('5')
  })

  it('saves only the fields cards need', () => {
    const s = snapshot(item('a', { Overview: 'long text', ImageTags: { Primary: 'p', Logo: 'l' }, ProductionYear: 2020 }))
    expect(s).toEqual({ Id: 'a', Name: 'Item a', Type: 'Movie', ImageTags: { Primary: 'p' }, ProductionYear: 2020 })
  })

  it('refresh swaps in fresh copies, keeps order and drops deleted items', () => {
    const l = [item('a'), item('b'), item('c')]
    const fresh = [item('c', { UserData: { PlayedPercentage: 40 } }), item('a')]
    const r = refresh(l, fresh)
    expect(r.map((i) => i.Id)).toEqual(['a', 'c'])
    expect(r[1].UserData?.PlayedPercentage).toBe(40)
  })
})
