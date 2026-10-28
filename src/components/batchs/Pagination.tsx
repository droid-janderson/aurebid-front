import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ApiMeta } from "@/types/api";

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: ApiMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1 && meta.total <= meta.limit) return null;

  return (
    <nav
      aria-label="Paginação de lotes"
      className="flex flex-col items-center justify-between gap-3 border-t border-line/70 pt-5 sm:flex-row"
    >
      <p className="text-xs text-mist-dim">
        Página <span className="text-mist">{meta.page}</span> de{" "}
        <span className="text-mist">{meta.totalPages}</span> · {meta.total}{" "}
        {meta.total === 1 ? "lote" : "lotes"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="cursor-pointer"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPrev}
          leftIcon={<ChevronLeft aria-hidden="true" className="size-3.5" />}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          className="cursor-pointer"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNext}
          rightIcon={<ChevronRight aria-hidden="true" className="size-3.5" />}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
