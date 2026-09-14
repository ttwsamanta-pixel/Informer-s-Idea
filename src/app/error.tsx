'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container section empty-state">
      <h1>Something didn’t load correctly.</h1>
      <p style={{ margin: '20px 0' }}>
        Please try again. Your original files have not been changed.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
