import sanitizeHtml from 'sanitize-html';

export function cleanContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'h2',
      'h3',
      'h4',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'figure',
      'figcaption',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      ol: ['start'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      figure: ['class'],
    },
    allowedClasses: { figure: ['image', 'table'] },
    allowedSchemes: ['https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === 'img' &&
      !/^\/api\/v1\/media\/[a-f0-9-]{36}$/.test(frame.attribs.src || ''),
  });
}
export function textContent(text: string): string {
  const escape = (v: string) =>
    v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${escape(p).replaceAll('\n', '<br>')}</p>`)
    .join('');
}
