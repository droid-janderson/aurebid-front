import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { GuestOnly, RequireAuth } from '@/router/guards';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { BatchPage } from '@/pages/BatchPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SellerDashboardPage } from '@/pages/seller/SellerDashboardPage';
import { NewBatchPage } from '@/pages/seller/NewBatchPage';
import { ManageBatchPage } from '@/pages/seller/ManageBatchPage';
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
        <Route path="lotes/:batchId" element={<BatchPage />} />
        <Route path="lotes/:batchId/auditoria" element={<PublicAuditPage />} />
        <Route path="recibo/:token" element={<ReceiptPage />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="cadastro" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth roles={['BIDDER']} />}>
          <Route path="carteira" element={<WalletPage />} />
          <Route path="arremates" element={<MySettlementsPage />} />
        </Route>

        <Route element={<RequireAuth roles={['AUCTIONEER']} />}>
          <Route path="painel" element={<SellerDashboardPage />} />
          <Route path="painel/lotes/novo" element={<NewBatchPage />} />
          <Route path="painel/lotes/:batchId" element={<ManageBatchPage />} />
          <Route path="painel/resultados" element={<SellerResultsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
