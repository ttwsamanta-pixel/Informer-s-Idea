'use client';
import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
export function ContactForm() {
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="contact-form workspace-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setError('');
        setSent(false);
        try {
          await api('public/contact', {
            method: 'POST',
            body: JSON.stringify(Object.fromEntries(f)),
          });
          setSent(true);
          form.reset();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="eyebrow">DROP US A NOTE</span>
      <h2>How can we help?</h2>
      <p>Ask a question, suggest a tool, or tell us what we can improve.</p>
      <div className="contact-form-grid">
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Your full name"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </label>
        <label className="contact-full">
          Mobile number
          <input
            name="mobile"
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            maxLength={40}
            placeholder="Include your country code"
          />
        </label>
        <label className="contact-full">
          Your message
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            placeholder="Tell us a little more..."
          />
        </label>
      </div>
      <div hidden aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="tool-note">
        Your message and contact details will be sent to our team. Please do not
        include passwords or private files.
      </p>
      {error && <p role="alert">{error}</p>}
      {sent && (
        <p role="status" className="contact-success">
          <CheckCircle2 size={20} /> Message received. Thank you for getting in
          touch.
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? 'Sending...' : 'Send message'} <Send size={18} />
      </button>
    </form>
  );
}
