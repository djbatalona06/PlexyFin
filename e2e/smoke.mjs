// End-to-end smoke test against a REAL Jellyfin server.
// Usage:
//   npm run build && npm run preview          (in one terminal)
//   JF_URL=http://localhost:8096 JF_USER=me JF_PASS=secret npm run e2e
// Optional: APP_URL (default http://localhost:4173), MOVIE (title to play, default "Ember Test"),
//           TRANSCODE_MOVIE (a title the browser can't play directly, e.g. an MPEG-4 Part 2 .mkv),
//           SHORT_MOVIE (a clip under ~20 s, for the Tonight "Up next" check).
// The account checks create a temporary user "smoke-kid" (JF_USER must be an admin) and delete it afterwards.
import { createRequire } from 'node:module'

const { chromium } = createRequire(import.meta.url)('playwright')

const APP = process.env.APP_URL ?? 'http://localhost:4173'
const { JF_URL, JF_USER, JF_PASS = '' } = process.env
const MOVIE = process.env.MOVIE ?? 'Ember Test'
const TRANSCODE_MOVIE = process.env.TRANSCODE_MOVIE
const SHORT_MOVIE = process.env.SHORT_MOVIE
// Jellyfin only saves a resume point after 5% of a video longer than 5 minutes (server defaults).
const PLAY_SECONDS = Number(process.env.PLAY_SECONDS ?? 35)
if (!JF_URL || !JF_USER) throw new Error('Set JF_URL and JF_USER (and JF_PASS) first.')

const results = []
const check = (name, ok, extra = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const progressCalls = []
const hlsUrls = []
page.on('request', (r) => {
  if (r.url().includes('/Sessions/Playing')) progressCalls.push(new URL(r.url()).pathname)
  if (r.url().includes('.m3u8')) hlsUrls.push(r.url())
})
const videoTime = () => page.evaluate(() => document.querySelector('video')?.currentTime ?? 0)
const focusedNavId = () => page.evaluate(() => document.activeElement?.closest('[data-nav-id]')?.getAttribute('data-nav-id') ?? null)
async function openItem(title) {
  await page.getByRole('searchbox').fill(title)
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('link', { name: new RegExp(title) }).first().click()
  await page.getByRole('link', { name: /^(▶ Play|Start over)$/ }).first().waitFor()
}

async function playAndWait(title, seconds) {
  await page.getByRole('searchbox').fill(title)
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('link', { name: new RegExp(title) }).first().click()
  // Always start from 0 so the run doesn't depend on what an earlier run saved.
  await page.getByRole('link', { name: /^(▶ Play|Start over)$/ }).first().click()
  await page.waitForFunction((s) => (document.querySelector('video')?.currentTime ?? 0) > s, seconds, { timeout: 30_000 + seconds * 2000 })
  return page.evaluate(() => ({ t: document.querySelector('video').currentTime, src: document.querySelector('video').currentSrc }))
}

try {
  // 1. App shell + PWA
  await page.goto(APP)
  await page.getByRole('heading', { name: 'Hearthreel' }).waitFor()
  check('app loads and shows connect screen', true)
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href')
    return href ? (await fetch(href)).json() : null
  })
  check('manifest is valid', manifest?.name === 'Hearthreel' && manifest.icons?.length >= 2 && manifest.display === 'standalone')
  const sw = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 10_000))])
    return Boolean(reg?.active)
  })
  check('service worker registers', sw)

  // 2. Log in
  await page.getByLabel('Server address').fill(JF_URL)
  await page.getByLabel('Username').fill(JF_USER)
  await page.getByLabel('Password').fill(JF_PASS)
  await page.getByRole('button', { name: 'Connect' }).click()
  await page.getByRole('heading', { name: 'Libraries' }).waitFor({ timeout: 15_000 })
  check('log in', true)

  // 3. Browse
  await page.locator('.lib').first().waitFor()
  const libs = await page.locator('.lib').allInnerTexts()
  check('libraries listed', libs.length > 0, libs.join(', '))
  await page.locator('.lib').first().click()
  await page.locator('.card').first().waitFor()
  check('library opens with items', (await page.locator('.card').count()) > 0)

  // 4. Search
  await page.getByRole('searchbox').fill(MOVIE)
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('heading', { name: new RegExp(`Results for`) }).waitFor()
  await page.getByRole('link', { name: new RegExp(MOVIE) }).first().waitFor()
  check('search finds the movie', true)

  // 5. Play (direct) long enough for progress reports and a resume point
  const played = await playAndWait(MOVIE, PLAY_SECONDS)
  check('video plays', played.t > PLAY_SECONDS, `${played.t.toFixed(1)}s, ${played.src.includes('/stream?static=true') ? 'direct play' : 'converted'}`)
  check('progress reported to server', progressCalls.includes('/Sessions/Playing') && progressCalls.includes('/Sessions/Playing/Progress'))
  await page.getByRole('button', { name: '← Back' }).click()
  await page.waitForTimeout(1500)
  check('stop reported to server', progressCalls.includes('/Sessions/Playing/Stopped'))

  // 6. Resume
  await page.reload()
  const resume = page.getByRole('link', { name: /Resume from/ })
  await resume.waitFor({ timeout: 10_000 })
  check('resume button shows saved position', true, await resume.innerText())
  await resume.click()
  await page.waitForFunction((s) => (document.querySelector('video')?.currentTime ?? 0) > s - 12, PLAY_SECONDS, { timeout: 30_000 })
  const resumedAt = await page.evaluate(() => document.querySelector('video').currentTime)
  check('resume starts near saved position', resumedAt > PLAY_SECONDS - 12, `${resumedAt.toFixed(1)}s`)
  await page.getByRole('button', { name: '← Back' }).click()

  // 7. Server-side check: position saved in Jellyfin itself
  const authBase = 'MediaBrowser Client="smoke", Device="cli", DeviceId="smoke-test", Version="1"'
  const login = await fetch(`${JF_URL}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: { Authorization: authBase, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Username: JF_USER, Pw: JF_PASS }),
  }).then((r) => r.json())
  const auth = { Authorization: `${authBase}, Token="${login.AccessToken}"`, Accept: 'application/json' }
  const found = await fetch(`${JF_URL}/Items?userId=${login.User.Id}&recursive=true&searchTerm=${encodeURIComponent(MOVIE)}`, {
    headers: auth,
  }).then((r) => r.json())
  const ticks = found.Items[0]?.UserData?.PlaybackPositionTicks ?? 0
  check('position saved on the server', ticks > 0, `${(ticks / 1e7).toFixed(1)}s`)

  // 8. Optional: a file the browser can't play directly -> server converts it
  if (TRANSCODE_MOVIE) {
    const t = await playAndWait(TRANSCODE_MOVIE, 4)
    check('converted (HLS) playback works', t.t > 4 && !t.src.includes('static=true'), `${t.t.toFixed(1)}s`)
    await page.getByRole('button', { name: '← Back' }).click()
  }

  // 10. Twist: mini-player keeps playing while you browse
  await openItem(MOVIE)
  await page.getByRole('link', { name: /^(▶ Play|Start over)$/ }).first().click()
  await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 3, null, { timeout: 30_000 })
  await page.getByRole('button', { name: 'Mini player' }).click()
  await page.locator('.brand').click()
  await page.getByRole('heading', { name: 'Libraries' }).waitFor()
  const m1 = await videoTime()
  await page.waitForTimeout(3000)
  const m2 = await videoTime()
  check('mini-player keeps playing on other pages', m2 > m1 + 1.5 && (await page.locator('.player-shell.mini').isVisible()), `${m1.toFixed(1)}s → ${m2.toFixed(1)}s`)
  const startsBefore = progressCalls.filter((c) => c === '/Sessions/Playing').length
  await page.getByRole('button', { name: 'Expand player' }).click()
  await page.locator('.player-shell.full').waitFor()
  await page.waitForTimeout(1000)
  const m3 = await videoTime()
  const startsAfter = progressCalls.filter((c) => c === '/Sessions/Playing').length
  check('expand goes full screen without restarting', m3 >= m2 && startsAfter === startsBefore, `${m3.toFixed(1)}s`)

  // 11. Twist: quality picker asks the server for a smaller stream
  await page.getByLabel('Quality').selectOption('480p')
  await page.waitForFunction(() => document.querySelector('.pill')?.textContent?.includes('480p'), null, { timeout: 30_000 })
  await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) > 1, null, { timeout: 30_000 })
  const master = hlsUrls.find((u) => /maxheight=480/i.test(u))
  const vbr = Number(new URL(master ?? 'http://x/?').searchParams.get('VideoBitrate'))
  check('480p restarts as a smaller converted stream', Boolean(master) && vbr > 0 && vbr <= 1_500_000, `VideoBitrate=${vbr}`)
  await page.getByLabel('Quality').selectOption('original') // remembered per server: put it back
  await page.waitForFunction(() => document.querySelector('.pill')?.textContent === 'Direct', null, { timeout: 30_000 })
  await page.getByRole('button', { name: '← Back' }).click()
  await page.waitForTimeout(500)
  check('back closes the player', await page.locator('.player-shell').isHidden())

  // 12. Twist: couch mode (arrow keys move focus; Back returns to the card you opened)
  await page.locator('.brand').click()
  await page.getByRole('button', { name: 'Couch mode' }).click()
  await page.locator('.lib').first().waitFor()
  await page.locator('.lib').first().focus()
  const libId = await focusedNavId()
  await page.keyboard.press('ArrowUp')
  const moved = await page.evaluate(() => {
    const a = document.activeElement
    return a && !a.classList.contains('lib') && a !== document.body ? `${a.tagName.toLowerCase()} ${a.getAttribute('aria-label') ?? a.textContent?.trim().slice(0, 20) ?? ''}` : ''
  })
  await page.keyboard.press('ArrowDown')
  check('arrow keys move focus and the row remembers its item', moved !== '' && (await focusedNavId()) === libId, `up → ${moved}`)
  await page.keyboard.press('Enter')
  await page.locator('.card').first().waitFor()
  await page.waitForFunction(() => document.activeElement?.closest('[data-nav-id]'), null, { timeout: 3000 })
  await page.keyboard.press('ArrowRight')
  const opened = await focusedNavId()
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: /^(▶ Play|Start over|▶ Resume.*)$/ }).first().waitFor()
  await page.goBack()
  await page.waitForFunction((id) => document.activeElement?.closest('[data-nav-id]')?.getAttribute('data-nav-id') === id, opened, { timeout: 3000 }).catch(() => undefined)
  check('back puts focus on the card you opened', opened !== null && (await focusedNavId()) === opened)
  await page.getByRole('button', { name: 'Couch mode' }).click()

  // 13. Twist: Tonight shelf + "Play next" (+ "Up next" when a short clip is available)
  const queue = SHORT_MOVIE ? [SHORT_MOVIE, MOVIE] : [MOVIE]
  for (const title of queue) {
    await openItem(title)
    await page.getByRole('button', { name: 'Add to Tonight' }).click()
  }
  await page.locator('.brand').click()
  await page.getByRole('heading', { name: 'Tonight' }).waitFor()
  const shelf = await page.locator('section[aria-labelledby="h-tonight"] .card-title').allInnerTexts()
  check('Tonight shelf shows on Home in order', shelf.length === queue.length && shelf.every((t, i) => t.includes(queue[i])), shelf.join(', '))
  await page.getByRole('link', { name: /Play next/ }).click()
  await page.waitForFunction((t) => document.querySelector('.player-title')?.textContent?.includes(t), queue[0], { timeout: 30_000 })
  check('Play next starts the first Tonight item', true, queue[0])
  if (SHORT_MOVIE) {
    await page.locator('.up-next').waitFor({ timeout: 60_000 })
    const txt = await page.locator('.up-next').innerText()
    check('Up next offers the next Tonight item', txt.includes(MOVIE), txt.split('\n')[0])
    await page.getByRole('button', { name: 'Cancel' }).click()
  }
  await page.getByRole('button', { name: '← Back' }).click()
  await page.locator('.brand').click()
  await page.getByRole('heading', { name: 'Libraries' }).waitFor()
  if (SHORT_MOVIE) {
    const left = await page.locator('section[aria-labelledby="h-tonight"] .card-title').allInnerTexts()
    check('finished item leaves the shelf', !left.some((t) => t.includes(SHORT_MOVIE)), left.join(', '))
  }
  // empty the shelf again
  await openItem(MOVIE)
  await page.getByRole('button', { name: 'Remove from Tonight' }).click()

  // 14. Saved accounts: add a second one, switch, and sign a "TV" in with a code
  const admin = { ...auth, 'Content-Type': 'application/json' }
  const kidRes = await fetch(`${JF_URL}/Users/New`, { method: 'POST', headers: admin, body: JSON.stringify({ Name: 'smoke-kid', Password: 'kidpass' }) })
  const kid = kidRes.ok ? await kidRes.json() : null
  if (!kid) {
    console.log(`SKIP  account checks (could not create a test user: ${kidRes.status}; JF_USER must be an admin)`)
  } else {
    try {
      await page.locator('.me-link').click()
      await page.getByRole('link', { name: /Add another account/ }).click()
      await page.getByLabel('Username').fill('smoke-kid')
      await page.getByLabel('Password').fill('kidpass')
      await page.getByRole('button', { name: 'Connect' }).click()
      await page.getByRole('heading', { name: 'Libraries' }).waitFor()
      check('add a second account', (await page.locator('.me-name').innerText()) === 'smoke-kid')
      await page.getByRole('button', { name: 'Switch user' }).click()
      await page.getByRole('heading', { name: "Who's watching?" }).waitFor()
      const names = await page.locator('.account-name').allInnerTexts()
      await page.getByRole('button', { name: new RegExp(`^${JF_USER}\\b`) }).click() // avatar letter is hidden from screen readers
      await page.getByRole('heading', { name: 'Libraries' }).waitFor()
      check("Who's watching? lists both and switches", names.includes('smoke-kid') && names.includes(JF_USER) && (await page.locator('.me-name').innerText()) === JF_USER, names.join(', '))

      const tvCtx = await browser.newContext()
      const tv = await tvCtx.newPage()
      await tv.goto(APP)
      await tv.getByLabel('Server address').fill(JF_URL)
      await tv.getByRole('button', { name: 'Sign in with a code instead' }).click()
      const code = (await tv.locator('.qc-code').innerText()).replace(/\D/g, '')
      await page.locator('.me-link').click()
      await page.getByLabel('Code from the other device').fill(code)
      await page.getByRole('button', { name: 'Approve' }).click()
      await tv.getByRole('heading', { name: 'Libraries' }).waitFor({ timeout: 15_000 })
      check('sign in a TV with a code approved from another device', (await tv.locator('.me-name').innerText()) === JF_USER, `code ${code}`)
      await tvCtx.close()

      await page.getByRole('button', { name: 'Switch user' }).first().click()
      await page.getByRole('button', { name: 'Manage accounts' }).click()
      await page.getByRole('button', { name: 'Remove smoke-kid' }).click()
      await page.getByRole('button', { name: 'Done' }).click()
      await page.waitForURL(/#\/(accounts)?$/)
      check('remove a saved account', !(await page.locator('.account-name').allInnerTexts()).includes('smoke-kid'))
      if (page.url().includes('/accounts')) await page.locator('.account').first().click()
    } finally {
      await fetch(`${JF_URL}/Users/${kid.Id}`, { method: 'DELETE', headers: auth })
    }
  }

  // 9. Offline shell: app still opens with no network
  await page.context().setOffline(true)
  await page.goto(APP)
  check('app shell opens offline', await page.getByText('Hearthreel').first().isVisible())
  await page.context().setOffline(false)
} catch (e) {
  check('unexpected error', false, e.message)
  await page.screenshot({ path: 'e2e/failure.png' })
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
