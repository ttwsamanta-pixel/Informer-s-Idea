import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="container section empty-state">
      <span className="eyebrow">404 · A SMALL DETOUR</span>
      <h1>That page isn’t in our toolkit.</h1>
      <p style={{ margin: '20px 0' }}>
        Let’s find the tool you were looking for.
      </p>
      <Link href="/all-tools" className="button primary">
        Explore all tools →
      </Link>
    </section>
  );
}
