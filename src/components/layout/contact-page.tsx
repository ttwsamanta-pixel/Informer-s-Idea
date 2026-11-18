import { Mail, Phone, MapPin } from 'lucide-react';
import { settings } from '@/server/content';
import { ContactForm } from './contact';
export async function ContactPage() {
  const s = await settings();
  const socials = [
    ['facebook', 'Facebook', 'f'],
    ['instagram', 'Instagram', 'camera'],
    ['linkedin', 'LinkedIn', 'in'],
    ['youtubeBangla', 'YouTube Bangla', 'play'],
    ['youtube', 'YouTube', 'play'],
    ['x', 'X', 'X'],
  ] as const;
  return (
    <>
      <section className="page-intro">
        <div className="container">
          <span className="eyebrow">LET&apos;S TALK</span>
          <h1>We&apos;d love to hear from you.</h1>
          <p>
            Questions, feedback, or a bright idea? Get in touch with
            Informer&apos;s Idea.
          </p>
        </div>
      </section>
      <section className="container section contact-layout">
        <aside className="contact-details">
          <span className="eyebrow">GET IN TOUCH</span>
          <h2>A conversation starts here.</h2>
          <p>
            We&apos;re here to help you get more from our tools. Send us a
            message using the form.
          </p>
          {Boolean(s.contactEmail) && (
            <a className="contact-detail" href={'mailto:' + s.contactEmail}>
              <Mail />
              <span>
                <small>Email us</small>
                <strong>{String(s.contactEmail)}</strong>
              </span>
            </a>
          )}
          {Boolean(s.contactMobile) && (
            <a
              className="contact-detail"
              href={'tel:' + String(s.contactMobile).replace(/[^+0-9]/g, '')}
            >
              <Phone />
              <span>
                <small>Call us</small>
                <strong>{String(s.contactMobile)}</strong>
              </span>
            </a>
          )}
          {Boolean(s.contactAddress) && (
            <div className="contact-detail">
              <MapPin />
              <span>
                <small>Our address</small>
                <strong style={{ whiteSpace: 'pre-line' }}>
                  {String(s.contactAddress)}
                </strong>
              </span>
            </div>
          )}
          <div className="contact-socials">
            {socials
              .filter(([k]) => Boolean(s[k]))
              .map(([k, label, icon]) => (
                <a
                  key={k}
                  href={String(s[k])}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                >
                  <span aria-hidden="true">
                    {icon === 'camera' ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="18" cy="6" r="1" fill="currentColor" />
                      </svg>
                    ) : icon === 'play' ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect x="1" y="4" width="22" height="16" rx="5" />
                        <path d="m10 8 6 4-6 4z" fill="white" />
                      </svg>
                    ) : (
                      icon
                    )}
                  </span>
                </a>
              ))}
          </div>
        </aside>
        <ContactForm />
      </section>
    </>
  );
}
