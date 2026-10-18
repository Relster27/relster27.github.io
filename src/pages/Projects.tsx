import { FaGithub } from 'react-icons/fa6'
import { Page, Tags } from '@/components/Card'

const REPO = 'https://github.com/Relster27/my-ctf-challenges/tree/main'

const challenges = [
  { event: 'IFEST CTF 2026', stage: 'Final', chall: 'bad ring', dir: 'IFEST-CTF-2026', tags: ['Dangling pointer', 'Use-after-free', 'DirtyPipe / PageJack'] },
  { event: 'Bee CTF 2026', stage: 'Qual', chall: 'toxic', dir: 'Bee-CTF-2026', tags: ['Use-after-free', 'modprobe_path'] },
  { event: 'Techfest CTF 2026', stage: 'Qual', chall: 'ezsc2', dir: 'Techfest-CTF-2026', tags: ['Shellcode', 'Side-channel'] },
  { event: 'PETIR Regeneration 2026', stage: '', chall: 'Double Trouble · Mr Blue Melville', dir: 'PETIR-Regeneration-2026', tags: ['Glibc heap', 'Buffer overflow'] },
]

function RepoLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 rounded-full border border-rose/35 px-3 py-1.5 text-sm text-rose transition duration-200 hover:-translate-y-0.5 hover:border-rose hover:bg-rose/10 hover:text-[#ff9db8] motion-reduce:transform-none"
    >
      <FaGithub size={14} /> {label}
    </a>
  )
}

export default function Projects() {
  return (
    <Page>
      <h1 className="sign-text font-display text-4xl text-bill">Projects</h1>

      <section aria-labelledby="ctf-challenges">
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <h2 id="ctf-challenges" className="font-display text-xl tracking-wide text-bill">CTF Challenges</h2>
          <RepoLink href={REPO} label="my-ctf-challenges" />
        </div>
        <p className="mt-3 text-white/70">
          Pwn challenges I've authored for national CTF competitions, from glibc heap to Linux kernel exploitation.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 [&>*:last-child:nth-child(odd)]:sm:col-span-2">
          {challenges.map((c) => (
            <a
              key={c.dir}
              href={`${REPO}/${c.dir}`}
              target="_blank"
              rel="noopener"
              className="group lift flex flex-col gap-3 rounded-xl border border-white/10 bg-[#120818]/55 p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="font-medium text-white transition-colors group-hover:text-rose">{c.event}</strong>
                {c.stage ? (
                  <span className="rounded-full bg-rose/15 px-2.5 py-0.5 text-xs text-rose">{c.stage}</span>
                ) : null}
              </div>
              <span className="text-sm text-white/70">{c.chall}</span>
              <Tags items={c.tags} />
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="pool-allocator">
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3">
          <h2 id="pool-allocator" className="font-display text-xl tracking-wide text-bill">Pool Allocator</h2>
          <RepoLink href="https://github.com/Relster27/Pool-Allocator" label="Pool-Allocator" />
        </div>
        <p className="mt-3 text-white/70">
          A simple memory allocator written in C, built from scratch on top of{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-white">mmap</code>. It hands out memory from
          page-sized pools, splits chunks to fit each request, and merges neighbouring free chunks back together when
          memory is freed.
        </p>
      </section>
    </Page>
  )
}
