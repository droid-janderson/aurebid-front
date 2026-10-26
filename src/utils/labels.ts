import type {
  LotStatus,
  ReservationStatus,
  SettlementStatus,
  UserRole,
  WalletTransactionType,
} from '@/types/domain';

export const lotStatusLabel: Record<LotStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  ACTIVE: 'Ao vivo',
  ENDED: 'Encerrado',
  SETTLED: 'Liquidado',
  CANCELLED: 'Cancelado',
};

export const settlementStatusLabel: Record<SettlementStatus, string> = {
  PENDING: 'Aguardando liquidação',
  PROCESSING: 'Em processamento',
  COMPLETED: 'Liquidação concluída',
  FAILED: 'Liquidação falhou',
};

export const transactionTypeLabel: Record<WalletTransactionType, string> = {
  DEPOSIT: 'Depósito',
  BUYER_SETTLEMENT_DEBIT: 'Débito de arremate',
  SELLER_SETTLEMENT_CREDIT: 'Crédito de arremate',
  REFUND: 'Estorno',
  ADJUSTMENT: 'Ajuste',
};

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  ACTIVE: 'Reservado',
  RELEASED: 'Liberado',
  CONSUMED: 'Utilizado',
};

export const roleLabel: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  AUCTIONEER: 'Leiloeiro',
  BIDDER: 'Licitante',
};

export function canBid(role: UserRole | undefined): boolean {
  return role === 'BIDDER' || role === 'AUCTIONEER' || role === 'ADMIN';
}

export function isAuctioneer(role: UserRole | undefined): boolean {
  return role === 'AUCTIONEER' || role === 'ADMIN';
}
