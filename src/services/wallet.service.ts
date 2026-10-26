import type {
  DepositInput,
  Wallet,
  WalletTransaction,
} from '@/types/domain';
import { buildQuery, request, requestWithMeta } from '@/services/http';

interface DepositResult {
  transaction: WalletTransaction;
  wallet: Wallet;
}

export const walletService = {
  get() {
    return request<Wallet>('/wallets');
  },

  listTransactions(page = 1, limit = 20) {
    return requestWithMeta<WalletTransaction>(
      `/wallets/transactions${buildQuery({ page, limit })}`,
    );
  },

  deposit(input: DepositInput) {
    return request<DepositResult>('/wallets/deposit', {
      method: 'POST',
      body: { amount: input.amount, method: input.method },
    });
  },
};
