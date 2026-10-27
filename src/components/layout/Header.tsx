import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Receipt,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';
import { roleLabel, isAuctioneer } from '@/utils/labels';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const publicNav = [{ to: '/', label: 'Vitrine', end: true }];

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    push({ title: 'Sessão encerrada', tone: 'info' });
    navigate('/');
  };

  const seller = isAuctioneer(user?.role);

  const links = [
    ...publicNav,
    ...(isAuthenticated
      ? seller
        ? [
            { to: '/painel', label: 'Painel do leiloeiro', end: false },
            { to: '/painel/resultados', label: 'Resultados', end: false },
            { to: '/painel/lotes/novo', label: 'Novo lote', end: false },
          ]
        : [
            { to: '/arremates', label: 'Arremates', end: false },
            { to: '/carteira', label: 'Carteira', end: false },
          ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[var(--header-height)] max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-[0.8125rem] font-medium transition-colors',
                  isActive
                    ? 'text-gold'
                    : 'text-mist hover:bg-white/[0.04] hover:text-chalk',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated && seller && (
            <Link
              to="/painel/lotes/novo"
              className="hidden items-center gap-1.5 rounded-lg border border-gold/25 bg-gold/[0.06] px-3 py-2 text-[0.8125rem] font-medium text-gold-bright transition-colors hover:border-gold/45 hover:bg-gold/10 sm:inline-flex"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Novo lote
            </Link>
          )}

          {isAuthenticated && user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-line bg-raised/60 py-1.5 pr-2 pl-1.5 text-left transition-colors hover:border-line-strong hover:bg-elevated"
                  aria-label="Menu da conta"
                >
                  <span className="flex size-7 items-center justify-center rounded-md bg-gold/15 font-mono text-[0.6875rem] font-semibold text-gold-bright">
                    {initials(user.name)}
                  </span>
                  <span className="hidden min-w-0 leading-tight sm:block">
                    <span className="block max-w-[9rem] truncate text-[0.75rem] font-medium text-chalk">
                      {user.name}
                    </span>
                    <span className="block text-[0.625rem] text-mist-dim">
                      {roleLabel[user.role]}
                    </span>
                  </span>
                  <ChevronDown aria-hidden="true" className="size-3.5 text-mist-dim" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="dropdown-content"
                  align="end"
                  sideOffset={8}
                >
                  <div className="border-b border-line px-2.5 py-2">
                    <p className="truncate text-xs font-medium text-chalk">{user.name}</p>
                    <p className="truncate text-[0.6875rem] text-mist-dim">{user.email}</p>
                  </div>
                  <DropdownMenu.Item asChild>
                    <Link to="/arremates" className="dropdown-item mt-1">
                      <Receipt aria-hidden="true" className="size-3.5" />
                      Meus arremates
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link to="/carteira" className="dropdown-item">
                      <Wallet aria-hidden="true" className="size-3.5" />
                      Carteira
                    </Link>
                  </DropdownMenu.Item>
                  {seller && (
                    <>
                      <DropdownMenu.Item asChild>
                        <Link to="/painel" className="dropdown-item">
                          <ShieldCheck aria-hidden="true" className="size-3.5" />
                          Painel do leiloeiro
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link to="/painel/resultados" className="dropdown-item">
                          <Receipt aria-hidden="true" className="size-3.5" />
                          Resultados
                        </Link>
                      </DropdownMenu.Item>
                    </>
                  )}
                  <DropdownMenu.Separator className="my-1 h-px bg-line" />
                  <DropdownMenu.Item
                    className="dropdown-item text-loss data-[highlighted]:text-loss"
                    onSelect={() => void handleLogout()}
                  >
                    <LogOut aria-hidden="true" className="size-3.5" />
                    Sair da conta
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-md px-3 py-2 text-[0.8125rem] font-medium text-mist transition-colors hover:text-chalk sm:block"
              >
                Entrar
              </Link>
              <Link to="/cadastro">
                <Button size="sm" className="hidden sm:inline-flex">
                  Criar conta
                </Button>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-lg border border-line bg-raised/60 text-mist transition-colors hover:text-chalk lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-line/70 bg-ink/95 px-4 pt-3 pb-5 lg:hidden"
        >
          <nav aria-label="Navegação mobile" className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-gold/10 text-gold'
                      : 'text-mist hover:bg-white/[0.04] hover:text-chalk',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {!isAuthenticated && (
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-line px-3 py-2.5 text-center text-sm font-medium text-chalk"
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-gold px-3 py-2.5 text-center text-sm font-semibold text-ink"
                >
                  Criar conta
                </Link>
              </div>
            )}
            {isAuthenticated && seller && (
              <Link
                to="/painel/lotes/novo"
                onClick={() => setMobileOpen(false)}
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.08] px-3 py-2.5 text-sm font-medium text-gold-bright"
              >
                <Plus aria-hidden="true" className="size-4" />
                Publicar novo lote
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
