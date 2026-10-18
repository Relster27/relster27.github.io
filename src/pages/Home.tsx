import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FaDiscord, FaGithub, FaLinkedinIn } from 'react-icons/fa6'
import { LivingScene } from '@/components/theme/LivingScene'

const DISCORD = 'relster.'

/** Same tiles as the original site: a dark gradient square, glyph in the brand colour, brand-tinted on hover. */
const iconBtn =
  'relative flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-[#3a3f44] bg-gradient-to-br from-[#2e3236] to-[#1f2225] text-[15px] text-[var(--brand)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-200 hover:-translate-y-1 hover:scale-110 hover:shadow-[0_8px_18px_-6px_var(--brand)] motion-reduce:transform-none hover:border-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] focus-visible:border-[var(--brand)] focus-visible:outline-none'

const brand = (c: string) => ({ '--brand': c }) as CSSProperties

function DiscordButton() {
  const [tip, setTip] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DISCORD)
      setTip(`Copied: ${DISCORD}`)
    } catch {
      setTip(`Discord: ${DISCORD}`)
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setTip(''), 1800)
  }

  return (
    <button
      type="button"
      className={iconBtn}
      onClick={copy}
      style={brand('#5865f2')}
      aria-label={`Copy Discord username: ${DISCORD}`}
      title={`Discord: ${DISCORD} (click to copy)`}
    >
      <FaDiscord />
      <span
        role="status"
        className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#3a3f44] bg-[#1f2225] px-2.5 py-1 text-xs text-white transition ${
          tip ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        {tip}
      </span>
    </button>
  )
}

/**
 * The homepage is one screen and nothing else: the living painting fills the viewport, the copy sits in the
 * forest at the bottom, and the page does not scroll.
 */
export default function Home() {
  return (
    <section className="relative h-svh w-full overflow-hidden bg-ink">
      <LivingScene className="absolute inset-0" />

      {/* keep the nav and the copy legible without hiding the scene */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgb(12 4 14 / 0.6) 0%, rgb(12 4 14 / 0) 18%, rgb(12 4 14 / 0) 46%, rgb(12 4 14 / 0.38) 68%, rgb(12 4 14 / 0.72) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 88%, rgb(12 4 14 / 0.42) 0%, transparent 55%)' }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <img
          src="/images/profile.webp"
          alt="Relster's profile picture"
          width={80}
          height={80}
          className="mb-5 h-16 w-16 rounded-full border-[3px] border-black object-cover shadow-[0_0_0_3px_#ffd23f,0_6px_0_#000] sm:h-20 sm:w-20"
        />
        <h1 className="sign-text font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] text-bill">Hi, I'm Relster.</h1>
        <p className="sign-text mt-2 font-display text-xs uppercase tracking-[0.3em] text-rose">Pwner</p>

        <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/90 [text-shadow:0_1px_8px_#000]">
          I'm into low-level stuff related to security and development. I also play CTFs with pwn as my main category.
        </p>

        <nav className="mt-7 flex items-center gap-3" aria-label="Social links">
          <a className={iconBtn} style={brand('#f0f6fc')} href="https://github.com/Relster27" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">
            <FaGithub />
          </a>
          <a
            className={iconBtn}
            style={brand('#70b5f9')}
            href="https://www.linkedin.com/in/reinhard-hatcher-3209382bb"
            target="_blank"
            rel="noopener"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <FaLinkedinIn />
          </a>
          <DiscordButton />
          <a className={iconBtn} style={brand('#e3000b')} href="https://ctftime.org/user/210770" target="_blank" rel="noopener" aria-label="CTFtime" title="CTFtime">
            <img src="/images/ctftime.png" alt="" width={18} height={18} className="block rounded-[3px]" />
          </a>
          <a className={iconBtn} style={brand('#f0f6fc')} href="https://relster.gitbook.io" target="_blank" rel="noopener" aria-label="CTF writeups" title="My writeups">
            <img src="/images/gitbook.png" alt="" width={18} height={18} className="block rounded-[3px]" />
          </a>
        </nav>
      </div>
    </section>
  )
}
