'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Grid2X2,
  Menu,
  Moon,
  Play,
  Search,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { Youtube } from '@/components/ui/youtube';
import { Logo } from '@/components/layout/logo';
import { ToolIcon } from '@/components/ui/icon';
import { categories } from '@/config/categories';
import { tools } from '@/config/tools';
import { channels } from '@/config/channels';
import {
  menuGroups,
  navigationMenus,
  type NavigationMenu,
} from '@/config/navigation';

function MegaPanel({ menu }: { menu: NavigationMenu }) {
  const groups = menuGroups(menu);
  return (
    <div
      className="mega-panel"
      id={'menu-' + menu.id}
      aria-label={menu.label + ' menu'}
    >
      <div className="container mega-layout">
        <Link href={menu.href} className={'mega-feature feature-' + menu.id}>
          <span className="mega-feature-art">
            <Grid2X2 size={43} />
            <span>YOUR EVERYDAY TOOLKIT</span>
          </span>
          <span>
            <strong>
              {menu.id === 'all' ? 'All your tools. All here.' : menu.label}
            </strong>
            <p>{menu.description}</p>
            <span className="mega-feature-link">
              Explore {menu.id === 'all' ? 'all tools' : 'the collection'}{' '}
              <ArrowRight size={16} />
            </span>
          </span>
        </Link>
        <div
          className={
            'mega-columns ' + (groups.length > 3 ? 'mega-columns-many' : '')
          }
        >
          {groups.map((g) => (
            <section className="mega-group" key={g.title}>
              <h2 className={g.category.color}>
                <ToolIcon name={g.category.icon} size={19} />
                {g.title}
              </h2>
              <ul>
                {g.items.map((t) => (
                  <li key={t.slug}>
                    <Link href={'/tools/' + t.slug} prefetch={false}>
                      <span className={'mega-tool-icon ' + g.category.color}>
                        <ToolIcon name={t.icon} size={17} />
                      </span>
                      <span>{t.name}</span>
                      {t.popular && <small>Popular</small>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <div className="container mega-bottom">
        <Link href={menu.href}>
          Browse{' '}
          {menu.id === 'all' || menu.id === 'more'
            ? 'all tools'
            : menu.label.toLowerCase()}{' '}
          <ArrowRight size={15} />
        </Link>
        <span>
          <ShieldCheck size={15} />
          Free to use. Files stay on your device.
        </span>
      </div>
    </div>
  );
}
function ChannelLinks() {
  return (
    <>
      {channels.map((channel) => (
        <a
          key={channel.handle}
          className="channel-card"
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={channel.logo}
            width={56}
            height={56}
            alt={channel.name + ' channel logo'}
          />
          <span>
            <small>{channel.label}</small>
            <strong>{channel.name}</strong>
            <span>{channel.description}</span>
            <em>{channel.handle}</em>
          </span>
          <ArrowUpRight size={17} />
        </a>
      ))}
    </>
  );
}

export function HeaderNavigation({
  dark,
  onTheme,
  onSearch,
}: {
  dark: boolean;
  onTheme: () => void;
  onSearch: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const header = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocus = useRef(false);
  const scrollPosition = useRef(0);
  const cancelClose = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const show = (id: string) => {
    cancelClose();
    scrollPosition.current = window.scrollY;
    setOpen(id);
  };
  const close = () => {
    cancelClose();
    setOpen(null);
  };
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) {
        setOpen(null);
        setMobile(false);
      }
    };
    const scroll = () => {
      if (window.scrollY !== scrollPosition.current) {
        scrollPosition.current = window.scrollY;
        setOpen(null);
      }
    };
    const resize = () => {
      setOpen(null);
      setMobile(false);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', scroll);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const disclosure = (
    id: string,
    label: ReactNode,
    panel: ReactNode,
    youtube = false,
  ) => (
    <div
      key={id}
      className={'hover-menu ' + (youtube ? 'youtube-menu' : '')}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') show(id);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') {
          cancelClose();
          timer.current = setTimeout(
            () => setOpen((current) => (current === id ? null : current)),
            140,
          );
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close();
          suppressFocus.current = true;
          e.currentTarget
            .querySelector<HTMLButtonElement>('.menu-trigger')
            ?.focus();
          suppressFocus.current = false;
        }
      }}
    >
      <button
        type="button"
        className={'menu-trigger ' + (youtube ? 'youtube-trigger' : '')}
        aria-label={youtube ? 'YouTube channels' : undefined}
        aria-expanded={open === id}
        aria-controls={'menu-' + id}
        onFocus={(e) => {
          if (
            !suppressFocus.current &&
            e.currentTarget.matches(':focus-visible')
          )
            show(id);
        }}
        onClick={(e) => {
          cancelClose();
          if (e.detail === 0 || !matchMedia('(hover: hover)').matches)
            setOpen((current) => (current === id ? null : id));
          else show(id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            show(id);
            requestAnimationFrame(() =>
              document
                .getElementById('menu-' + id)
                ?.querySelector<HTMLAnchorElement>('a')
                ?.focus(),
            );
          }
        }}
      >
        {label}
        <ChevronDown size={13} />
      </button>
      {open === id && panel}
    </div>
  );
  return (
    <header
      className="site-header"
      ref={header}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) {
          close();
          setMobile(false);
        }
      }}
    >
      <div className="container nav-row">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/" onPointerEnter={close}>
            Home
          </Link>
          {navigationMenus.map((menu) =>
            disclosure(menu.id, menu.label, <MegaPanel menu={menu} />),
          )}
          <Link href="/blog" onPointerEnter={close}>
            Blog
          </Link>
          <Link href="/about" onPointerEnter={close}>
            About
          </Link>
          <Link href="/contact" onPointerEnter={close}>
            Contact
          </Link>
        </nav>
        <div className="nav-actions">
          <button
            className="icon-button"
            aria-label="Search tools"
            onClick={() => {
              close();
              setMobile(false);
              onSearch();
            }}
          >
            <Search size={19} />
          </button>
          <button
            className="icon-button"
            aria-label="Toggle color theme"
            onClick={onTheme}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {disclosure(
            'youtube',
            <>
              <Youtube size={22} />
              <span>
                YouTube<small>Watch & learn</small>
              </span>
            </>,
            <div
              className="youtube-panel"
              id="menu-youtube"
              aria-label="Our YouTube channels"
            >
              <div className="youtube-panel-heading">
                <span>
                  <Play size={15} fill="currentColor" />A little inspiration, on
                  video
                </span>
                <p>Two channels. Plenty to discover.</p>
              </div>
              <ChannelLinks />
              <div className="youtube-panel-foot">
                Find your next idea. Watch on YouTube <Youtube size={16} />
              </div>
            </div>,
            true,
          )}
          <button
            className="icon-button menu-toggle"
            aria-label={mobile ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobile}
            aria-controls="mobile-navigation"
            onClick={() => {
              close();
              setMobile(!mobile);
            }}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobile && (
        <nav
          className="mobile-nav"
          id="mobile-navigation"
          aria-label="Mobile navigation"
        >
          <button className="button secondary full-width" onClick={onTheme}>
            {dark ? 'Switch to light theme' : 'Switch to dark theme'}
          </button>
          <Link href="/">
            Home <ArrowRight size={16} />
          </Link>
          <Link href="/all-tools">
            All Tools <Grid2X2 size={17} />
          </Link>
          {categories.map((c) => (
            <div className="mobile-tool-group" key={c.id}>
              <div className="mobile-category-row">
                <Link href={'/' + c.slug}>
                  <span className={c.color}>
                    <ToolIcon name={c.icon} size={18} />
                  </span>
                  {c.name}
                </Link>
                <button
                  aria-label={'Show ' + c.name}
                  aria-expanded={open === 'mobile-' + c.id}
                  aria-controls={'mobile-' + c.id}
                  onClick={() =>
                    setOpen(open === 'mobile-' + c.id ? null : 'mobile-' + c.id)
                  }
                >
                  <ChevronDown size={17} />
                </button>
              </div>
              {open === 'mobile-' + c.id && (
                <div className="mobile-tool-links" id={'mobile-' + c.id}>
                  {tools
                    .filter((t) => t.category === c.id)
                    .map((t) => (
                      <Link href={'/tools/' + t.slug} key={t.slug}>
                        <ToolIcon name={t.icon} size={16} />
                        {t.name}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
          {['blog', 'about', 'contact'].map((s) => (
            <Link key={s} href={'/' + s}>
              {s[0].toUpperCase() + s.slice(1)}
              <ArrowRight size={16} />
            </Link>
          ))}
          <div className="mobile-channel-links">
            <h2>Watch our channels</h2>
            <ChannelLinks />
          </div>
        </nav>
      )}
    </header>
  );
}
