import Link from 'next/link';

interface NavBarProps {
  here?: 'home' | 'how';
}

export default function NavBar({ here }: NavBarProps) {
  return (
    <nav className="nav-bar">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Logo mark */}
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral shadow-pillowy-sm
                          transition-transform duration-200 group-hover:scale-105">
            <span className="font-display text-sm font-bold text-white" aria-hidden>?</span>
          </div>
          <span className="font-display text-lg font-bold text-ink">
            FAQ<span className="text-coral">Widget</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            className={`rounded-pill px-4 py-2 font-display text-sm font-semibold transition-colors duration-150
                        ${here === 'home'
                          ? 'bg-blush text-coral'
                          : 'text-ink-soft hover:bg-blush hover:text-coral'}`}
          >
            Playground
          </Link>
          <Link
            href="/how-it-works"
            className={`rounded-pill px-4 py-2 font-display text-sm font-semibold transition-colors duration-150
                        ${here === 'how'
                          ? 'bg-blush text-coral'
                          : 'text-ink-soft hover:bg-blush hover:text-coral'}`}
          >
            How it works
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="badge">Portfolio #5</span>
          <a
            href="https://github.com/0CCHacker"
            className="font-display text-sm font-semibold text-ink-quiet hover:text-coral transition-colors"
          >
            Tai Huynh
          </a>
        </div>
      </div>
    </nav>
  );
}
