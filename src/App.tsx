import { Suspense } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { Loading } from './components/Status'
import { CouchNav } from './couch/CouchNav'
import { CouchProvider } from './couch/CouchProvider'
import Connect from './pages/Connect'
import Home from './pages/Home'
import { lazyPage } from './lazy-page'
import { PlaybackProvider } from './playback/PlaybackProvider'
import PlayRoute from './playback/PlayRoute'
import { SessionProvider } from './SessionProvider'
import { useSession } from './session-context'
import { TonightProvider } from './tonight/TonightProvider'

const Library = lazyPage(() => import('./pages/Library'))
const Search = lazyPage(() => import('./pages/Search'))
const Item = lazyPage(() => import('./pages/Item'))
const Accounts = lazyPage(() => import('./pages/Accounts'))
const Me = lazyPage(() => import('./pages/Me'))

function RequireSession() {
  const { session, accounts } = useSession()
  if (session) return <Outlet />
  // Several people saved on this device? Ask who's watching. Nobody yet? Sign in.
  return <Navigate to={accounts.length ? '/accounts' : '/connect'} replace />
}

function Layout() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <Header />
      <div id="main">
        <Suspense fallback={<main className="page"><Loading /></main>}>
          <Outlet />
        </Suspense>
      </div>
    </>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <CouchProvider>
        <HashRouter>
          <TonightProvider>
            {/* The player sits above the pages so a video keeps playing while you browse. */}
            <PlaybackProvider>
              <CouchNav />
              <Routes>
                <Route path="/connect" element={<Connect />} />
                <Route
                  path="/accounts"
                  element={
                    <Suspense fallback={<Loading />}>
                      <Accounts />
                    </Suspense>
                  }
                />
                <Route element={<RequireSession />}>
                  <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="library/:id" element={<Library />} />
                    <Route path="search" element={<Search />} />
                    <Route path="item/:id" element={<Item />} />
                    <Route path="me" element={<Me />} />
                  </Route>
                  <Route path="play/:id" element={<PlayRoute />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PlaybackProvider>
          </TonightProvider>
        </HashRouter>
      </CouchProvider>
    </SessionProvider>
  )
}
