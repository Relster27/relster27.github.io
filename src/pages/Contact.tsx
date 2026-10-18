import { Mail } from 'lucide-react'
import { FaLinkedinIn } from 'react-icons/fa6'
import { Page } from '@/components/Card'

const item =
  'group lift flex items-center gap-4 rounded-xl border border-white/10 bg-[#120818]/55 p-5'

export default function Contact() {
  return (
    <Page>
      <h1 className="sign-text font-display text-4xl text-bill">Contact</h1>
      <p className="mt-4 text-white/70">Feel free to reach out.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a className={item} href="https://www.linkedin.com/in/reinhard-hatcher-3209382bb" target="_blank" rel="noopener">
          <FaLinkedinIn className="text-rose" size={22} />
          <span className="flex flex-col">
            <strong className="font-medium text-white transition-colors group-hover:text-rose">LinkedIn</strong>
            <small className="text-white/50">Reinhard Hatcher</small>
          </span>
        </a>
        <a className={item} href="mailto:varelwaas25@gmail.com">
          <Mail className="text-rose" size={22} />
          <span className="flex flex-col">
            <strong className="font-medium text-white transition-colors group-hover:text-rose">Email</strong>
            <small className="text-white/50">varelwaas25@gmail.com</small>
          </span>
        </a>
      </div>
    </Page>
  )
}
