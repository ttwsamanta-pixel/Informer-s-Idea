import Link from 'next/link';
export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Informer's Idea home">
      <img src="/logo/icon.svg" width="40" height="48" alt="" />
      <span>
        <strong>
          Informer’s <em>Idea</em>
        </strong>
        <small>Smart Tools for a Smarter You</small>
      </span>
    </Link>
  );
}
