import { useEffect, useRef, useState, type ReactNode } from 'react'
import content from '../content/portfolio.json'
import { FaGithub, FaLinkedinIn, FaDiscord } from 'react-icons/fa6'

const sections = ['About', 'Projects', 'Achievements', 'Contact']
const { profile, projects, contact } = content

function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children} <span aria-hidden="true">↗</span></a>
}
function Tags({ items }: { items: string[] }) {
  return <div className="tags">{items.map(item => <span key={item}>{item}</span>)}</div>
}
function SectionTitle({ title }: { title: string }) {
  return <div className="section-title"><h2>{title}</h2></div>
}
export default function App() {
  const [open, setOpen] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const menu = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) { setOpen(false); menu.current?.focus() }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  async function copyDiscord() {
    try { await navigator.clipboard.writeText(contact.discordUsername); setCopyStatus('Discord username copied.') }
    catch { setCopyStatus(`Copy manually: ${contact.discordUsername}`) }
  }
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header><div className="container header-inner">
      <a href="#home" className="wordmark" onClick={() => setOpen(false)}><img src={content.metadata.favicon} alt="" width={24} height={24}/><span className="brand-name">{profile.alias}<span>.</span></span></a>
      <button ref={menu} className="menu" aria-expanded={open} aria-controls="navigation" onClick={() => setOpen(!open)}>{open ? 'Close −' : 'Menu +'}</button>
      <nav id="navigation" className={open ? 'open' : ''} aria-label="Main navigation">{sections.map(s => <a key={s} href={'#' + s.toLowerCase()} onClick={() => setOpen(false)}>{s}</a>)}</nav>
    </div></header>
    <main id="main">
      <section className="hero container" id="home">
        <div className="hero-grid"><div className="hero-copy">
          <h1>{profile.headline}</h1>
          <p className="eyebrow hero-role"><span className="dot"/>{profile.role}</p>
          <p className="intro">{profile.summary.replace(/here\.$/, '')}<a className="intro-link" href={profile.summaryLink.url} target="_blank" rel="noopener noreferrer">{profile.summaryLink.text}</a>.</p>
          <nav className="social-links" aria-label="Social links">{content.socialLinks.map(link => <a className="social-icon" key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label}>{link.label === 'GitHub' ? <FaGithub aria-hidden="true"/> : link.label === 'LinkedIn' ? <FaLinkedinIn aria-hidden="true"/> : <img src={link.icon} alt="" width={20} height={20}/>}</a>)}<button className="social-icon" onClick={copyDiscord} aria-label={`Copy Discord username: ${contact.discordUsername}`} title={`Discord: ${contact.discordUsername}`}><FaDiscord aria-hidden="true"/></button></nav>
          {copyStatus && <p className="social-feedback">{copyStatus}</p>}
        </div><figure className="hero-portrait"><img src={profile.image} alt={profile.imageAlt} width={256} height={256} fetchPriority="high"/></figure></div>
      </section>
      <section className="tone-secondary" id="about"><div className="section container">
        <SectionTitle title="About me"/>
        <div className="about-layout">
          <section className="about-block" aria-labelledby="background-heading"><h3 className="subheading" id="background-heading">Background</h3><p className="bio">{profile.bio}</p></section>
          <section className="about-block" aria-labelledby="interests-heading"><h3 className="subheading" id="interests-heading">Areas of interest</h3><ul className="focus-list">{content.focus.map((focus, i) => <li key={focus}><span className="small-number">0{i + 1}</span>{focus}</li>)}</ul></section>
          <section className="about-block about-skills" aria-labelledby="skills-heading">
            <h3 className="subheading" id="skills-heading">Skills</h3>
            <div className="skill-groups">
              <div className="skill-group"><h4>Technical</h4><Tags items={content.skills.technical}/></div>
              <div className="skill-group"><h4>Non-technical</h4><Tags items={content.skills.nonTechnical}/></div>
              <div className="skill-group"><h4>Languages</h4><Tags items={content.skills.languages}/></div>
            </div>
          </section>
          <section className="about-block" aria-labelledby="experience-heading"><h3 className="subheading" id="experience-heading">Experience</h3><ul className="experience">{content.experience.map(item => <li key={item.description}>{item.description}{item.url && <> — <ExternalLink href={item.url}>View work</ExternalLink></>}</li>)}</ul></section>
          <section className="about-block" aria-labelledby="currently-heading"><h3 className="subheading" id="currently-heading">Currently</h3><p className="muted">{profile.currently}</p></section>
        </div>
      </div></section>
      <section className="section container" id="projects">
        <SectionTitle title="Projects"/>
        {projects.map((project, projectIndex) => <section className="project-category" key={`${project.title}-${projectIndex}`}>
          <div className="project-group"><h3 className="subheading">{project.title}</h3><p className="muted">{project.description}</p>{project.repository && <ExternalLink href={project.repository}>{project.type === 'challenge-list' ? 'Challenge repository' : 'View project'}</ExternalLink>}</div>
          {project.entries?.map((challenge, challengeIndex) => <article className="project" key={`${challenge.event}-${challenge.name}`}>
            <span className="small-number">{String(challengeIndex + 1).padStart(2, '0')}</span><div><h3>{challenge.event}</h3><p className="challenge-name">{challenge.name}</p>{challenge.description && <p className="challenge-description">{challenge.description}</p>}<Tags items={challenge.tags}/></div>
            {challenge.stage && <span className="project-stage">{challenge.stage}</span>}
          </article>)}
        </section>)}
      </section>
      <section className="section container" id="achievements">
        <SectionTitle title="Achievements"/>
        <div className="achievements">{content.achievements.map(achievement => <article className="achievement" key={achievement.title}>
          <div><span className="award">{achievement.title}</span>{achievement.certificate && <ExternalLink className="certificate-link" href={achievement.certificate.path}>View certificate{achievement.certificate.type === 'pdf' ? ' (PDF)' : ''}</ExternalLink>}</div>
          <span className="organization">{achievement.organization}</span><span className="date">{achievement.date}</span>
        </article>)}</div>
      </section>
      <section className="tone-secondary" id="contact"><div className="section container contact">
        <SectionTitle title="Contact"/><p className="lead">{contact.intro}</p>
        <div className="contact-details"><a href={contact.emailUrl}>{contact.email}</a><ExternalLink href={contact.linkedin.url}>LinkedIn · {contact.linkedin.label}</ExternalLink><button className="discord-button" onClick={copyDiscord} title="Copy Discord username">Discord · {contact.discordUsername} <span aria-hidden="true">⧉</span></button></div>
        <p className="copy-status" role="status">{copyStatus}</p>
      </div></section>
    </main>
    <footer className="container"><span>{content.existingFooter.copyright}</span><a href="#home">Back to top ↑</a></footer>
  </>
}
