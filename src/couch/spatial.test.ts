import { describe, expect, it } from 'vitest'
import { isTvUserAgent, pickNext, score, type Rect } from './spatial'

const box = (left: number, top: number, width = 100, height = 150): Rect => ({ left, top, width, height })

// A 3x2 poster grid:   a b c
//                      d e f
const grid = {
  a: box(0, 0), b: box(120, 0), c: box(240, 0),
  d: box(0, 170), e: box(120, 170), f: box(240, 170),
}
const cands = Object.entries(grid).map(([item, rect]) => ({ item, rect }))
const from = (k: keyof typeof grid) => cands.filter((c) => c.item !== k)

describe('pickNext', () => {
  it('moves along a row and between rows', () => {
    expect(pickNext(grid.a, from('a'), 'right')).toBe('b')
    expect(pickNext(grid.b, from('b'), 'left')).toBe('a')
    expect(pickNext(grid.b, from('b'), 'down')).toBe('e')
    expect(pickNext(grid.f, from('f'), 'up')).toBe('c')
  })

  it('returns null at the edges', () => {
    expect(pickNext(grid.c, from('c'), 'right')).toBeNull()
    expect(pickNext(grid.a, from('a'), 'up')).toBeNull()
    expect(pickNext(grid.d, [], 'right')).toBeNull()
  })

  it('stays in the row instead of jumping to a closer item on the next row', () => {
    const near = box(130, 160) // just below-right, closer by straight-line distance
    const sameRowFar = box(400, 0)
    expect(pickNext(box(0, 0), [{ item: 'near', rect: near }, { item: 'far', rect: sameRowFar }], 'right')).toBe('far')
  })

  it('goes down from a wide element (search box) to the item under it', () => {
    const search = box(200, 0, 480, 44)
    const posters = [box(0, 100), box(240, 100), box(600, 100)].map((rect, i) => ({ item: i, rect }))
    expect(pickNext(search, posters, 'down')).toBe(1)
  })

  it('breaks ties by page order', () => {
    const twins = [{ item: 'first', rect: box(0, 200) }, { item: 'second', rect: box(200, 200) }]
    expect(pickNext(box(100, 0), twins, 'down')).toBe('first')
  })

  it('ignores things behind you', () => {
    expect(score(grid.b, grid.a, 'right')).toBeNull()
    expect(score(grid.e, grid.b, 'down')).toBeNull()
  })
})

describe('isTvUserAgent', () => {
  it('spots TVs, sticks and consoles but not phones or desktops', () => {
    expect(isTvUserAgent('Mozilla/5.0 (Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 TV Safari/537.36')).toBe(true)
    expect(isTvUserAgent('Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/79.0 Safari/537.36')).toBe(true)
    expect(isTvUserAgent('Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7233) AppleWebKit/537.36 Silk/98.6 like Chrome')).toBe(true)
    expect(isTvUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 Edge/44')).toBe(true)
    expect(isTvUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe(false)
    expect(isTvUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0 Safari/537.36')).toBe(false)
  })
})
