import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { CalendarCheck, Clock, MapPin, Menu, Phone, X } from 'lucide-react'

import logo from '@/assets/images/logo.png'
import govLogo from '@/assets/images/gov logo.png'
import textLogo from '@/assets/images/text logo.png'
import { navItems } from '@/data/navigation'
import { LanguageToggle } from './LanguageToggle'
import { useLanguage } from '@/providers/LanguageProvider'
import { cn } from '@/utils/cn'

const topBarContent = {
  phone: '0427-2912197',
  location: {
    en: 'Kurumbapatti, Salem',
    ta: 'குரும்பப்பட்டி, சேலம்',
  },
  schedule: {
    en: 'Open Daily (Closed Tuesdays)',
    ta: 'தினமும் திறந்திருக்கும் (செவ்வாய்க்கிழமை மூடப்படும்)',
  },
  timings: {
    en: '9:00 AM – 5:00 PM',
    ta: 'காலை 9:00 – மாலை 5:00',
  },
}

export function Header() {
  const { language } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [expandedMobile, setExpandedMobile] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const activePath = location.pathname
  const headerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMobileOpen(false)
    setOpenMenu(null)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setOpenMenu(null)
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflowY = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflowY = 'auto'
      document.body.style.touchAction = 'auto'
    }

    return () => {
      document.body.style.overflowY = 'auto'
      document.body.style.touchAction = 'auto'
    }
  }, [mobileOpen])

  const toggleMobileDropdown = (path: string) => {
    setExpandedMobile((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))
  }

  const closeMobileMenu = () => {
    setMobileOpen(false)
    setExpandedMobile({})
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-50 shadow-forest-sm">
      <div className="bg-gradient-forest text-white">
        <div className="container flex flex-wrap items-center justify-center gap-4 py-2 text-xs font-semibold sm:justify-between sm:text-sm">
          <span className="inline-flex items-center gap-2">
            <Phone size={14} aria-hidden="true" />
            {topBarContent.phone}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock size={14} aria-hidden="true" />
            {topBarContent.timings[language]}
          </span>
          <span className="hidden items-center gap-2 sm:inline-flex">
            <MapPin size={14} aria-hidden="true" />
            {topBarContent.location[language]}
          </span>
          <span className="inline-flex items-center gap-2 text-white/90">
            <CalendarCheck size={14} aria-hidden="true" />
            {topBarContent.schedule[language]}
          </span>
        </div>
      </div>

      <div className="border-b border-forest-green/10 bg-white">
        <div className="header-container">
          <Link to="/" className="header-logo-group">
            <div className="header-logo-row">
              <img
                src={govLogo}
                alt="Government Logo"
                className="header-logo-left"
                loading="lazy"
              />
              <img
                src={textLogo}
                alt="Kurumbapatti Text Logo"
                className="header-logo-center"
                loading="lazy"
              />
              <img
                src={logo}
                alt="Zoo Logo"
                className="header-logo-right"
                loading="lazy"
              />
            </div>
          </Link>

          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center rounded-full border border-forest-green/20 p-2 text-forest-green transition-colors duration-200 ease-smooth hover:bg-forest-green/10 lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav className="hidden items-center header-nav-wrapper lg:flex">
            <ul className="flex items-center justify-center gap-3 text-[14px] font-medium lg:gap-4 xl:gap-5 header-nav-links">
              {navItems.map((item) => {
                const hasChildren = Boolean(item.children?.length)
                const isChildActive = hasChildren && item.children
                  ? item.children.some((child) => activePath.startsWith(child.path))
                  : false
                const isOpen = openMenu === item.path

                return (
                  <li
                    key={item.path}
                    className="relative"
                    onMouseEnter={() => hasChildren && setOpenMenu(item.path)}
                    onMouseLeave={() => hasChildren && setOpenMenu(null)}
                  >
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            cn(
                              'header-nav-link flex items-center gap-1 rounded-full px-3 py-2 leading-tight transition-colors duration-200',
                              // no heavy background; color handled by CSS (default and active/hover)
                              (isActive || isChildActive || isOpen) && 'is-active'
                            )
                          }
                      onClick={() => setOpenMenu(null)}
                    >
                      <span className="text-[14px] font-medium tracking-[0.05em]">
                        {item.labels[language]}
                        </span>
                        {hasChildren && (
                          <button
                            type="button"
                            className="nav-arrow relative z-50 ml-1 align-middle text-[10px] text-forest-green"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setOpenMenu((prev) => (prev === item.path ? null : item.path))
                            }}
                            aria-label={openMenu === item.path ? 'Collapse submenu' : 'Expand submenu'}
                          >
                            ▼
                          </button>
                        )}
                    </NavLink>

                    {hasChildren && (
                      <div
                        className={cn(
                          'absolute left-1/2 top-full z-50 min-w-[240px] -translate-x-1/2 pt-3 transition-all duration-200 ease-out',
                          isOpen
                            ? 'pointer-events-auto visible translate-y-0 opacity-100'
                            : 'pointer-events-none invisible -translate-y-2 opacity-0',
                        )}
                      >
                        <ul className="rounded-2xl border border-forest-green/10 bg-white py-3 shadow-forest-xl">
                          {item.children?.map((child) => (
                            <li key={child.path}>
                              <NavLink
                                to={child.path}
                                className={({ isActive }) =>
                                  cn(
                                    'flex flex-col gap-0.5 px-4 py-2 text-left text-sm font-semibold text-forest-green transition-colors duration-150 hover:bg-forest-green/5',
                                    isActive && 'bg-forest-green/10 text-forest-green'
                                  )
                                }
                                onClick={() => setOpenMenu(null)}
                              >
                                <span>{child.labels[language]}</span>
                                <span className="text-xs text-forest-green/60">
                                  {child.labels[language === 'en' ? 'ta' : 'en']}
                                </span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="hidden items-center justify-end md:flex">
            <LanguageToggle />
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-nav"
            className="ml-auto flex h-full w-[85%] max-w-xs flex-col gap-6 overflow-y-auto border-l border-forest-green/10 bg-white p-6 shadow-forest-lg"
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-forest-green">Menu</p>
              <button
                type="button"
                className="rounded-full border border-forest-green/20 p-1 text-forest-green"
                onClick={() => setMobileOpen(false)}
                aria-label="Close Menu"
              >
                <X size={18} />
              </button>
            </div>
            <LanguageToggle />
            <nav className="space-y-4">
              {navItems.map((item) => {
                const hasChildren = Boolean(item.children?.length)
                const isChildActive = hasChildren && item.children
                  ? item.children.some((child) => activePath.startsWith(child.path))
                  : false
                const isExpanded = Boolean(expandedMobile[item.path])

                return (
                  <div key={item.path} className="rounded-2xl border border-forest-green/10">
                    <div className="flex items-center justify-between rounded-2xl px-4 py-3">
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            'flex-1 text-base font-semibold text-forest-green transition-colors duration-200',
                            (isActive || isChildActive) && 'text-forest-green'
                          )
                        }
                        onClick={() => {
                          if (hasChildren) {
                            closeMobileMenu()
                          } else {
                            setMobileOpen(false)
                          }
                        }}
                      >
                        <span>
                          {item.labels[language]}
                          <span className="block text-xs text-forest-green/70">
                            {item.labels[language === 'en' ? 'ta' : 'en']}
                          </span>
                        </span>
                      </NavLink>
                      {hasChildren && (
                        <button
                          type="button"
                          className={cn(
                            'relative z-50 ml-2 text-xs font-semibold uppercase tracking-[0.3em] text-forest-green transition-transform',
                            isExpanded && 'rotate-180',
                          )}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            toggleMobileDropdown(item.path)
                          }}
                          aria-label="Toggle submenu"
                        >
                          ▼
                        </button>
                      )}
                    </div>

                    {hasChildren && (
                      <div
                        className={cn(
                          'space-y-1 border-t border-forest-green/10 bg-soft-bg/80 p-3 transition-all duration-200',
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 overflow-hidden opacity-0',
                        )}
                      >
                        {item.children?.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              cn(
                                'relative z-50 flex flex-col rounded-2xl px-3 py-2 text-sm font-semibold text-forest-green transition-colors duration-150',
                                isActive && 'bg-forest-green/10'
                              )
                            }
                            onClick={(event) => {
                              event.stopPropagation()
                              closeMobileMenu()
                            }}
                          >
                            <span>{child.labels[language]}</span>
                            <span className="text-xs text-forest-green/60">
                              {child.labels[language === 'en' ? 'ta' : 'en']}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </aside>
        </div>
      )}
    </header>
  )
}
