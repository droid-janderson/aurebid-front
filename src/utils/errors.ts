import { ApiError, toApiError } from '@/services/api-error';
import { formatBRL } from '@/utils/money';

export type FeedbackTone = 'error' | 'warning' | 'info' | 'success';

export interface ErrorPresentation {
  title: string;
  message: string;
  tone: FeedbackTone;
}

const SESSION_TITLES: Record<string, string> = {
  TOKEN_EXPIRED: 'Sua sessão expirou',
  TOKEN_INVALID: 'Sessão inválida',
  AUTHENTICATION_ERROR: 'Entre para continuar',
  REFRESH_TOKEN_INVALID: 'Sua sessão expirou',
  REFRESH_TOKEN_EXPIRED: 'Sua sessão expirou',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos',
};

const GENERIC_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS:
    'Confira o e-mail e a senha informados e tente novamente.',
  AUTHENTICATION_ERROR: 'Faça login para acessar este recurso.',
  UNAUTHORIZED: 'Faça login para continuar.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Entre novamente para continuar.',
  TOKEN_INVALID: 'Sua sessão não é mais válida. Entre novamente.',
  REFRESH_TOKEN_INVALID: 'Sua sessão expirou. Entre novamente.',
  AUTHORIZATION_ERROR: 'Sua conta não tem permissão para esta ação.',
  FORBIDDEN: 'Sua conta não tem permissão para esta ação.',
  INSUFFICIENT_PERMISSIONS: 'Sua conta não tem permissão para esta ação.',
  NOT_FOUND: 'O recurso solicitado não foi encontrado.',
  VALIDATION_ERROR: 'Revise os campos destacados e tente novamente.',
  CONFLICT: 'A operação não pôde ser concluída por um conflito de dados.',
  DUPLICATE_ENTRY: 'Este registro já existe.',
  RATE_LIMIT_EXCEEDED:
    'Muitas solicitações em sequência. Aguarde um instante e tente novamente.',
  NETWORK_ERROR:
    'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  REQUEST_ABORTED: 'A solicitação foi cancelada.',
  INTERNAL_ERROR: 'O servidor encontrou um problema. Tente novamente em instantes.',
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
  LOT_NOT_ACTIVE: 'Este lote não está mais em andamento.',
  LOT_NOT_OPEN: 'O período de lances deste lote não está aberto.',
  AUCTION_NOT_LIVE: 'Este leilão não está ao vivo.',
  AUCTION_NOT_STARTED: 'Este lote ainda não foi iniciado.',
  AUCTION_ENDED: 'Este lote já foi encerrado.',
  AUCTION_CANCELLED: 'Este lote foi cancelado.',
  BID_BELOW_MINIMUM: 'O valor informado está abaixo do mínimo permitido.',
  BELOW_MINIMUM_BID: 'O valor informado está abaixo do mínimo permitido.',
  BELOW_BID_INCREMENT: 'O lance precisa respeitar o incremento mínimo do lote.',
  INVALID_BID_AMOUNT: 'O valor do lance não é aceito para este lote.',
  INSUFFICIENT_BALANCE:
    'Seu saldo disponível não é suficiente para este lance.',
  INSUFFICIENT_FUNDS: 'Seu saldo disponível não é suficiente para este lance.',
  ALREADY_LEADING: 'Você já está liderando este lote.',
  CANNOT_BID_OWN_LOT: 'Você não pode dar lance no seu próprio lote.',
  CANNOT_BID_OWN_AUCTION: 'Você não pode dar lance no seu próprio lote.',
  WALLET_NOT_FOUND: 'Carteira não encontrada para esta conta.',
  HOLD_AMOUNT_EXCEEDS_BALANCE: 'O valor reservado excede seu saldo disponível.',
  INVALID_DATE_RANGE: 'A data de encerramento precisa ser posterior à de início.',
  LOT_ERROR: 'Não foi possível concluir a operação neste lote.',
  BID_ERROR: 'Não foi possível registrar o lance.',
  SETTLEMENT_ERROR: 'Não foi possível concluir a liquidação.',
  SETTLEMENT_FAILED: 'A liquidação deste arremate falhou.',
  LOT_NOT_FINISHED: 'O lote ainda não foi encerrado.',
  LOT_NOT_SETTLEABLE: 'Este lote não pode ser liquidado neste estado.',
  NO_WINNING_BID: 'Este lote foi encerrado sem lance vencedor.',
  EMAIL_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
  INVALID_SELLER: 'Esta conta não pode publicar lotes.',
};

function looksEnglish(message: string) {
  return /\b(the|must|invalid|required|cannot|not found|insufficient|token)\b/i.test(
    message,
  );
}

export function presentError(error: unknown): ErrorPresentation {
  const apiError = toApiError(error);
  const code = apiError.code || 'UNKNOWN_ERROR';
  const title =
    SESSION_TITLES[code] ??
    (apiError.status === 429
      ? 'Muitas solicitações'
      : apiError.status >= 500
        ? 'Instabilidade no serviço'
        : apiError.status === 0
          ? 'Falha de conexão'
          : 'Não foi possível concluir');

  const mapped = GENERIC_MESSAGES[code];
  const message =
    mapped ??
    (looksEnglish(apiError.message)
      ? 'A operação não pôde ser concluída. Tente novamente.'
      : apiError.message);

  const tone: FeedbackTone =
    code === 'ALREADY_LEADING'
      ? 'info'
      : code === 'INSUFFICIENT_BALANCE' || code === 'INSUFFICIENT_FUNDS'
        ? 'warning'
        : code === 'AUCTION_ENDED' ||
            code === 'AUCTION_CANCELLED' ||
            code === 'AUCTION_NOT_STARTED'
          ? 'info'
          : 'error';

  return { title, message, tone };
}

export function presentBidError(
  error: unknown,
  minimumNextBidValue?: number,
): ErrorPresentation {
  const apiError = toApiError(error);
  const code = apiError.code;

  if (
    (code === 'INVALID_BID_AMOUNT' ||
      code === 'BID_BELOW_MINIMUM' ||
      code === 'BELOW_MINIMUM_BID') &&
    minimumNextBidValue !== undefined
  ) {
    return {
      title: 'Lance abaixo do mínimo',
      message: `O próximo lance aceito parte de ${formatBRL(minimumNextBidValue)}.`,
      tone: 'warning',
    };
  }

  if (code === 'CONFLICT' || code === 'DUPLICATE_ENTRY') {
    return {
      title: 'Lance simultâneo',
      message:
        'Outro participante avançou no mesmo instante. Atualize os valores e tente novamente.',
      tone: 'warning',
    };
  }

  if (code === 'ALREADY_LEADING') {
    return {
      title: 'Você já está ganhando',
      message: 'Seu lance é o mais alto deste lote neste momento.',
      tone: 'info',
    };
  }

  return presentError(apiError);
}

export function isSessionError(error: unknown): boolean {
  const apiError = toApiError(error);
  return (
    apiError.status === 401 ||
    apiError.code === 'TOKEN_EXPIRED' ||
    apiError.code === 'REFRESH_TOKEN_INVALID' ||
    apiError.code === 'REFRESH_TOKEN_EXPIRED'
  );
}

export function fieldErrorFor(
  error: unknown,
  field: string,
): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.fields.find((item) => item.field.endsWith(field))?.message;
}
