import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Mail, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldWrapper, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/components/ui/Toast";
import { presentError, type ErrorPresentation } from "@/utils/errors";
import { safeRedirect } from "@/utils/redirect";

const schema = z.object({
  email: z
    .string()
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  useDocumentTitle("Entrar");
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<ErrorPresentation | null>(null);

  const params = new URLSearchParams(location.search);
  const from = safeRedirect(params.get("from"));

  const fillDemo = (email: string, password: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values);
      push({
        title: `Bem-vindo de volta, ${user.name.split(" ")[0]}`,
        description: "Sua sessão está ativa.",
        tone: "success",
      });
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(presentError(error));
    }
  });

  return (
    <AuthShell
      title="Entrar"
      description="Acesse sua carteira, acompanhe arremates e dispute lotes ao vivo."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link
            to={`/cadastro${from !== "/" ? `?from=${encodeURIComponent(from)}` : ""}`}
            className="font-medium text-gold transition-colors hover:text-gold-bright"
          >
            Criar conta
          </Link>
        </>
      }
    >
      {formError && (
        <InlineAlert
          tone={formError.tone}
          title={formError.title}
          className="mb-5"
        >
          {formError.message}
        </InlineAlert>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FieldWrapper
          label="E-mail"
          htmlFor="login-email"
          error={errors.email?.message}
          required
        >
          <div className="relative">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-dim"
            />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              className="pl-9"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
          </div>
        </FieldWrapper>

        <FieldWrapper
          label="Senha"
          htmlFor="login-password"
          error={errors.password?.message}
          required
        >
          <div className="relative">
            <LockKeyhole
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-dim"
            />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Sua senha"
              className="pr-10 pl-9"
              invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-mist-dim transition-colors hover:text-chalk"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </FieldWrapper>

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
        >
          Entrar na casa
        </Button>
      </form>

      <div className="mt-7 rounded-xl border border-dashed border-line-strong/70 p-3.5">
        <p className="font-mono text-[0.5625rem] tracking-[0.14em] text-mist-dim uppercase">
          Contas de teste (seed do backend)
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fillDemo("auctioneer@aurebid.com", "auctioneer123")}
            className="flex items-center justify-between rounded-md px-1 py-0.5 text-left text-xs text-mist transition-colors hover:text-chalk"
          >
            <span>Leiloeiro</span>
            <span className="font-mono text-[0.6875rem] text-mist-dim">
              auctioneer@aurebid.com
            </span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("bidder@aurebid.com", "bidder123")}
            className="flex items-center justify-between rounded-md px-1 py-0.5 text-left text-xs text-mist transition-colors hover:text-chalk"
          >
            <span>Licitante</span>
            <span className="font-mono text-[0.6875rem] text-mist-dim">
              bidder@aurebid.com
            </span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("bidder2@aurebid.com", "bidder123")}
            className="flex items-center justify-between rounded-md px-1 py-0.5 text-left text-xs text-mist transition-colors hover:text-chalk"
          >
            <span>Licitante 2</span>
            <span className="font-mono text-[0.6875rem] text-mist-dim">
              bidder2@aurebid.com
            </span>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
