import { describe, expect, it } from 'vitest'
import { accountKey, initial, migrateAccounts, removeAccount, upsertAccount } from './accounts'
import type { Session } from './types'

const acct = (userId: string, serverId = 's1', token = 't'): Session => ({
  serverUrl: 'https://jf.example.com',
  serverName: 'Home',
  serverId,
  userId,
  userName: userId,
  token,
})

describe('saved accounts', () => {
  it('one account per user per server', () => {
    expect(accountKey(acct('u1'))).toBe('s1:u1')
    expect(accountKey(acct('u1', 's2'))).not.toBe(accountKey(acct('u1')))
  })

  it('upsert puts the newest first and replaces the old token', () => {
    let l = upsertAccount([], acct('a'))
    l = upsertAccount(l, acct('b'))
    l = upsertAccount(l, acct('a', 's1', 'new'))
    expect(l.map((a) => a.userId)).toEqual(['a', 'b'])
    expect(l[0].token).toBe('new')
  })

  it('removes by key', () => {
    expect(removeAccount([acct('a'), acct('b')], 's1:a').map((a) => a.userId)).toEqual(['b'])
  })

  it('keeps people from before this update signed in', () => {
    expect(migrateAccounts(undefined, acct('a')).map(accountKey)).toEqual(['s1:a'])
    expect(migrateAccounts([acct('b')], acct('a')).map(accountKey)).toEqual(['s1:a', 's1:b'])
    expect(migrateAccounts([acct('a')], acct('a'))).toHaveLength(1)
    expect(migrateAccounts(undefined, undefined)).toEqual([])
  })

  it('avatar letter', () => {
    expect(initial('kid')).toBe('K')
    expect(initial('  ')).toBe('?')
  })
})
