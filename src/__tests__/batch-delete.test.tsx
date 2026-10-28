import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '@/router/AppRoutes';
import { authenticateAs, renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/server';
import { activeBatch } from '@/test/fixtures';
import type { Batch } from '@/types/domain';
import { env } from '@/utils/env';

const api = env.apiUrl;

const cancelledBatch: Batch = {
  ...activeBatch,
  id: 'batch-cancelled',
  title: 'Mewtwo · Base Set',
  status: 'CANCELLED',
  currentPrice: 900,
  bidCount: 0,
  bids: [],
  settlement: null,
  timing: { status: 'ended', timeRemaining: 0, timeUntilStart: 0 },
};

const serverHeaders = {
  'X-Server-Time': new Date().toISOString(),
};

function json(data: unknown, status = 200) {
  return HttpResponse.json(
    { success: true, data },
    { status, headers: serverHeaders },
  );
}

describe('exclusão de lote cancelado', () => {
  it('remove o lote cancelado do painel do leiloeiro', async () => {
    const user = userEvent.setup();
    let deleted = false;
    let deleteCalls = 0;

    server.use(
      http.get(`${api}/catalog/batchs/mine`, () =>
        HttpResponse.json(
          {
            success: true,
            data: deleted ? [] : [cancelledBatch],
            meta: {
              total: deleted ? 0 : 1,
              page: 1,
              limit: 12,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
          { headers: serverHeaders },
        ),
      ),
      http.get(`${api}/catalog/batchs/:id`, ({ params }) => {
        if (String(params.id) !== cancelledBatch.id) {
          return HttpResponse.json(
            { success: false, error: 'NOT_FOUND', message: 'Batch not found' },
            { status: 404, headers: serverHeaders },
          );
        }
        return json(deleted ? null : cancelledBatch);
      }),
      http.delete(`${api}/catalog/batchs/:id`, ({ params }) => {
        deleteCalls += 1;
        if (String(params.id) === cancelledBatch.id) deleted = true;
        return HttpResponse.json(
          { success: true, message: 'Cancelled batch removed' },
          { headers: serverHeaders },
        );
      }),
    );

    authenticateAs('user-auctioneer');
    renderWithProviders(<AppRoutes />, '/painel');

    expect(await screen.findByText(cancelledBatch.title)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Gerenciar/i }));

    const deleteButton = await screen.findByRole('button', {
      name: /Excluir lote cancelado/i,
    });
    await user.click(deleteButton);

    await user.click(await screen.findByRole('button', { name: 'Excluir lote' }));

    await waitFor(() => expect(deleteCalls).toBe(1));
    await waitFor(() =>
      expect(screen.queryByText(cancelledBatch.title)).not.toBeInTheDocument(),
    );
  });
});
