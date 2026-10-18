import { lazy, Suspense, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { ExternalLink, Menu, X } from 'lucide-react'
const DuskBackdrop = lazy(() => import('@/components/theme/DuskBackdrop').then((m) => ({ default: m.DuskBackdrop })))

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { href: 'https://relster.gitbook.io', label: 'Writeups' },
  { to: '/contact', label: 'Contact' },
] as const

/* Header buttons: dusk-glass pills that borrow the painting's plum and rift-crimson. The active one glows like the rift. */
const base = 'relative rounded-full px-4 py-2 text-sm font-medium transition duration-200 motion-reduce:transform-none'
const idle = 'text-white/75 hover:bg-white/10 hover:text-white'
const active =
  'bg-gradient-to-b from-[#d1486b] to-[#8a2347] text-white shadow-[0_0_18px_-2px_rgb(226_72_112/0.65),inset_0_1px_0_rgb(255_255_255/0.28)]'
const glass = 'border border-white/[0.12] bg-[#150919]/55 backdrop-blur-md shadow-[0_10px_30px_-14px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.07)]'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const overlay = pathname === '/'

  return (
    <div className={`relative isolate flex flex-col bg-ink ${overlay ? 'h-svh overflow-hidden' : 'min-h-svh'}`}>
      {!overlay && (
        <Suspense fallback={null}>
          <DuskBackdrop variant={pathname} />
        </Suspense>
      )}
      <header
        className={`z-30 w-full ${
          overlay ? 'absolute inset-x-0 top-0' : 'sticky top-0 border-b border-white/10 bg-[#120616]/55 backdrop-blur-md'
        }`}
      >
        <div
          className={`flex h-[68px] items-center justify-between ${
            overlay ? 'px-6 sm:px-10 lg:px-20' : 'mx-auto max-w-6xl px-6'
          }`}
        >
          <Link to="/" className="group flex items-center gap-3 font-display text-lg tracking-wide text-bill [text-shadow:0_2px_0_#000]">
            <img src="/images/favicon.png" alt="" width={24} height={24} className="rounded transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-110 motion-reduce:transform-none" />
            Relster
          </Link>

          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:text-white md:hidden ${glass}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav
            className={`${
              open ? 'flex' : 'hidden'
            } absolute inset-x-4 top-[68px] flex-col gap-1 rounded-2xl p-2 md:static md:inset-auto md:flex md:flex-row md:items-center md:rounded-full md:p-1 ${glass} ${open ? 'bg-[#150919]/90' : ''}`}
          >
            {links.map((l) =>
              'href' in l ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener"
                  className={`${base} ${idle} inline-flex items-center gap-1.5`}
                >
                  {l.label}
                  <ExternalLink size={12} aria-hidden />
                </a>
              ) : (
                <NavLink
                  key={l.label}
                  to={l.to}
                  end={'end' in l ? l.end : false}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `${base} ${isActive ? active : idle}`
                  }
                >
                  {l.label}
                </NavLink>
              ),
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      {!overlay && (
      <footer className="border-t border-white/10 bg-[#0d0713]/70 backdrop-blur-md">
        <div
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-6 text-sm text-white/45"
        >
          <span>&copy; 2026 relster</span>
          {/* Atbash. A hint for anyone who reads footers. */}
          <span className="font-mono text-xs tracking-widest text-rose/70" title="Atbash">
            yroo rh dzgxsrmt
          </span>
        </div>
      </footer>
      )}
    </div>
  )
}
