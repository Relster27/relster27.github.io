import { FileText } from 'lucide-react'
import { H2, Page, Tags } from '@/components/Card'

const link = 'link-anim text-rose transition-colors hover:text-[#ff9db8]'

const achievements = [
  { title: '5th Place, HackToday 2026', date: 'Oct 2026', org: 'IPB University', pdf: '/images/certificates/HackToday-2026.pdf' },
  { title: '3rd Place, COMPFEST CTF 2026', date: 'Sep 2026', org: 'Universitas Indonesia', pdf: '/images/certificates/compfest-18.pdf' },
  { title: 'Best Defender, Wreck-It CTF 7.0', date: 'Aug 2026', org: 'Politeknik Siber dan Sandi Negara', img: '/images/certificates/wreck-it-7.webp', alt: 'Wreck-IT 7.0 Best Defender certificate' },
  { title: 'Best Defender, PlayIt CTF 2026', date: 'Jun 2026', org: 'Politeknik Negeri Malang', img: '/images/certificates/playit-2026.webp', alt: 'Play IT 2026 Best Defender certificate' },
  { title: 'CBC Promotional', date: 'May 2026', org: 'Cyber Breaker', pdf: '/images/certificates/CBC-promotional.pdf' },
  { title: '2nd Place, ITechnoCup CTF 2025', date: 'Oct 2025', org: 'Politeknik Negeri Jakarta', img: '/images/certificates/itechnocup-2025.webp', alt: 'ITechnoCup 2025 2nd place certificate' },
  { title: 'Finalist, IFEST CTF 2025', date: 'May 2025', org: 'Universitas Atma Jaya Yogyakarta' },
] as { title: string; date: string; org: string; pdf?: string; img?: string; alt?: string }[]

export default function About() {
  return (
    <Page>
      <h1 className="sign-text font-display text-4xl text-bill">About me</h1>
      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-rose">Reinhard Hatcher Waas</p>

      <p className="mt-8 leading-relaxed text-white/70">
        Hola! I'm Reinhard, also known as Relster. I'm an undergraduate student at the School of Computer Science, Bina
        Nusantara University (BINUS), with a strong interest in low-level security and development.
      </p>

      <section aria-labelledby="focus">
        <H2><span id="focus">Focus</span></H2>
        <ul className="list-disc space-y-1 pl-5 text-white/70">
          <li>Binary exploitation</li>
          <li>Reverse engineering</li>
          <li>Vulnerability research</li>
          <li>Linux kernel exploitation</li>
        </ul>
      </section>

      <section aria-labelledby="skills">
        <H2><span id="skills">Skills</span></H2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm text-white/50">Technical</h3>
            <Tags items={['C/C++', 'x86 assembly', 'Python', 'Linux', 'Git', 'Docker', 'QEMU', 'Binary exploitation', 'Reverse engineering', 'Vulnerability research']} />
          </div>
          <div>
            <h3 className="mb-3 text-sm text-white/50">Non-technical</h3>
            <Tags items={['Problem setter', 'Writing', 'Team working', 'Public speaking', 'Mentoring']} />
          </div>
          <div>
            <h3 className="mb-3 text-sm text-white/50">Language</h3>
            <Tags items={['English (Professional proficiency)', 'Indonesian (Native proficiency)']} />
          </div>
        </div>
      </section>

      <section aria-labelledby="experience">
        <H2><span id="experience">Experience</span></H2>
        <ul className="list-disc space-y-2 pl-5 text-white/70">
          <li>Competing and winning in national and international CTFs as a member of team PETIR</li>
          <li>
            Authored several CTF challenges for national competitions{' '}
            <a className={link} href="https://github.com/Relster27/my-ctf-challenges/tree/main" target="_blank" rel="noopener">here</a>
          </li>
          <li>
            Mentored high school students for LKS{' '}
            <a className={link} href="https://github.com/Relster27/pwn-teaching" target="_blank" rel="noopener">here</a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="achievements">
        <H2><span id="achievements">Achievements</span></H2>
        <ol className="space-y-4">
          {achievements.map((a) => (
            <li key={a.title} className="lift rounded-xl border border-white/10 bg-[#120818]/55 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="font-medium text-white">{a.title}</strong>
                <time className="text-sm text-white/40">{a.date}</time>
              </div>
              <span className="text-sm text-white/70">{a.org}</span>
              {a.pdf ? (
                <a className="link-anim mt-3 flex w-fit items-center gap-2 text-sm text-rose transition-colors hover:text-[#ff9db8]" href={a.pdf} target="_blank" rel="noopener">
                  <FileText size={14} /> View certificate (PDF)
                </a>
              ) : null}
              {a.img ? (
                <a className="mt-3 block w-fit overflow-hidden rounded-lg" href={a.img} target="_blank" rel="noopener">
                  <img src={a.img} alt={a.alt} loading="lazy" className="max-h-40 rounded-lg border border-white/10 transition duration-500 hover:scale-105 motion-reduce:transform-none" />
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="currently">
        <H2><span id="currently">Currently</span></H2>
        <p className="leading-relaxed text-white/70">
          Exploring Linux kernel vulnerability research and working on side projects related to the Linux kernel. I'm
          also learning QEMU exploitation, with V8 exploitation next on the list.
        </p>
      </section>
    </Page>
  )
}
