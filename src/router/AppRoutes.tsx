import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { GuestOnly, RequireAuth } from '@/router/guards';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LotPage } from '@/pages/LotPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SellerDashboardPage } from '@/pages/seller/SellerDashboardPage';
import { NewLotPage } from '@/pages/seller/NewLotPage';
import { ManageLotPage } from '@/pages/seller/ManageLotPage';
import { SellerResultsPage } from '@/pages/seller/SellerResultsPage';
import { WalletPage } from '@/pages/wallet/WalletPage';
import { MySettlementsPage } from '@/pages/settlements/MySettlementsPage';
import { ReceiptPage } from '@/pages/settlements/ReceiptPage';
import { PublicAuditPage } from '@/pages/audit/PublicAuditPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="lotes/:lotId" element={<LotPage />} />
        <Route path="lotes/:lotId/auditoria" element={<PublicAuditPage />} />
        <Route path="recibo/:token" element={<ReceiptPage />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="cadastro" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="carteira" element={<WalletPage />} />
          <Route path="arremates" element={<MySettlementsPage />} />
        </Route>

        <Route element={<RequireAuth roles={['AUCTIONEER', 'ADMIN']} />}>
          <Route path="painel" element={<SellerDashboardPage />} />
          <Route path="painel/lotes/novo" element={<NewLotPage />} />
          <Route path="painel/lotes/:lotId" element={<ManageLotPage />} />
          <Route path="painel/resultados" element={<SellerResultsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
