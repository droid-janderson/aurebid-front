import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { safeRedirect } from '@/utils/redirect';
import type { UserRole } from '@/types/domain';

export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader label="Verificando sua sessão" />;
  }

  if (status === 'anonymous' || !user) {
    const from = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(from)}`}
        replace
        state={{ from }}
      />
    );
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <section className="mx-auto flex min-h-[62vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <span className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-loss/25 bg-loss/10">
          <LockKeyhole aria-hidden="true" className="size-6 text-loss" />
        </span>
        <p className="eyebrow">Acesso restrito</p>
        <h1 className="display mt-2 text-4xl text-chalk">
          Esta área não é da sua conta
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-mist">
          O painel do leiloeiro é exclusivo para contas de leiloeiro. A
          autorização definitiva é feita pelo servidor.
        </p>
        <Link
          to="/"
          className="mt-6 text-sm font-medium text-gold transition-colors hover:text-gold-bright"
        >
          Voltar para a vitrine
        </Link>
      </section>
    );
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  if (status === 'loading') {
    return <PageLoader label="Verificando sua sessão" />;
  }

  if (isAuthenticated) {
    return <Navigate to={safeRedirect(params.get('from'))} replace />;
  }

  return <Outlet />;
}
