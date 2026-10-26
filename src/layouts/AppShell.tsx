import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { ScrollToTop } from '@/components/layout/ScrollToTop';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
