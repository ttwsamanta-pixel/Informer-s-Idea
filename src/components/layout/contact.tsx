'use client';
import { useState } from 'react';
import { Field } from '@/components/tools/shared';
export function ContactForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  return (
    <form
      className="workspace-card"
      action="https://github.com/ttwsamanta-pixel/Informer-s-Idea/issues/new"
      method="get"
      target="_blank"
      rel="noopener noreferrer"
    >
      <h2>Share your feedback</h2>
      <Field label="Subject">
        <input
          name="title"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="A tool idea or an issue you found"
        />
      </Field>
      <Field label="Details">
        <textarea
          name="body"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what happened or what would help…"
        />
      </Field>
      <p className="tool-note">
        This opens a prefilled GitHub issue for you to review and submit. A
        GitHub account is required. Do not include private files or sensitive
        information.
      </p>
      <button className="button primary" type="submit">
        Continue to GitHub →
      </button>
    </form>
  );
}
