import { Suspense } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { Loading } from './components/Status'
import Connect from './pages/Connect'
import Home from './pages/Home'
import { lazyPage } from './lazy-page'
import { SessionProvider } from './SessionProvider'
import { useSession } from './session-context'

const Library = lazyPage(() => import('./pages/Library'))
const Search = lazyPage(() => import('./pages/Search'))
const Item = lazyPage(() => import('./pages/Item'))
const Player = lazyPage(() => import('./pages/Player'))

function RequireSession() {
  const { session } = useSession()
  return session ? <Outlet /> : <Navigate to="/connect" replace />
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
      <HashRouter>
        <Routes>
          <Route path="/connect" element={<Connect />} />
          <Route element={<RequireSession />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="library/:id" element={<Library />} />
              <Route path="search" element={<Search />} />
              <Route path="item/:id" element={<Item />} />
            </Route>
            <Route
              path="play/:id"
              element={
                <Suspense fallback={<Loading />}>
                  <Player />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  )
}
