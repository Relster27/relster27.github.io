import type { ReactNode } from 'react'

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="panel rounded-2xl p-6 md:p-10">{children}</div>
    </div>
  )
}

export function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li key={t} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition duration-200 hover:-translate-y-0.5 hover:border-rose/60 hover:text-white motion-reduce:transform-none">
          {t}
        </li>
      ))}
    </ul>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 mt-12 font-display text-xl tracking-wide text-bill">{children}</h2>
}
