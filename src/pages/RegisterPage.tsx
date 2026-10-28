import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Gavel, Landmark } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldWrapper, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/components/ui/Toast";
import {
  fieldErrorFor,
  presentError,
  type ErrorPresentation,
} from "@/utils/errors";
import { safeRedirect } from "@/utils/redirect";
import { cn } from "@/utils/cn";

const schema = z
  .object({
    name: z
      .string()
      .min(2, "Informe ao menos 2 caracteres.")
      .max(100, "Use no máximo 100 caracteres."),
    email: z
      .string()
      .min(1, "Informe seu e-mail.")
      .email("Informe um e-mail válido."),
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
    role: z.enum(["BIDDER", "AUCTIONEER"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

type RegisterForm = z.infer<typeof schema>;

const roles = [
  {
    value: "BIDDER" as const,
    icon: Gavel,
    title: "Quero dar lances",
    description: "Carteira para reservar saldo e disputar lotes.",
  },
  {
    value: "AUCTIONEER" as const,
    icon: Landmark,
    title: "Quero leiloar",
    description: "Painel para publicar lotes e acompanhar resultados.",
  },
];

export function RegisterPage() {
  useDocumentTitle("Criar conta");
  const { register: registerUser } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<ErrorPresentation | null>(null);

  const from = safeRedirect(new URLSearchParams(location.search).get("from"));

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "BIDDER",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      push({
        title: "Conta criada",
        description: "Sua sessão já está ativa. Boas disputas.",
        tone: "success",
      });
      navigate(from, { replace: true });
    } catch (error) {
      const nameError = fieldErrorFor(error, "name");
      const emailError = fieldErrorFor(error, "email");
      const passwordError = fieldErrorFor(error, "password");

      if (nameError) setError("name", { message: nameError });
      if (emailError) setError("email", { message: emailError });
      if (passwordError) setError("password", { message: passwordError });
      setFormError(presentError(error));
    }
  });

  return (
    <AuthShell
      title="Criar conta"
      description="Escolha como participa da casa. Você poderá entrar e sair a qualquer momento."
      footer={
        <>
          Já possui conta?{" "}
          <Link
            to={`/login${from !== "/" ? `?from=${encodeURIComponent(from)}` : ""}`}
            className="font-medium text-gold transition-colors hover:text-gold-bright"
          >
            Entrar
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
        <fieldset>
          <legend className="text-[0.8125rem] font-medium text-chalk">
            Perfil de acesso
          </legend>
          <div className="mt-2 grid gap-2">
            {roles.map((role) => (
              <label
                key={role.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                  selectedRole === role.value
                    ? "border-gold/50 bg-gold/[0.07]"
                    : "border-line bg-ink/40 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  value={role.value}
                  className="sr-only"
                  {...register("role")}
                />
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
                    selectedRole === role.value
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-line-strong bg-surface text-mist-dim",
                  )}
                >
                  <role.icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-medium text-chalk">
                    {role.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mist-dim">
                    {role.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <FieldWrapper
          label="Nome completo"
          htmlFor="register-name"
          error={errors.name?.message}
          required
        >
          <Input
            id="register-name"
            autoComplete="name"
            placeholder="Como devemos chamar você"
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            {...register("name")}
          />
        </FieldWrapper>

        <FieldWrapper
          label="E-mail"
          htmlFor="register-email"
          error={errors.email?.message}
          required
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            {...register("email")}
          />
        </FieldWrapper>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper
            label="Senha"
            htmlFor="register-password"
            error={errors.password?.message}
            hint={!errors.password ? "Mínimo de 8 caracteres." : undefined}
            required
          >
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Crie uma senha"
                className="pr-10"
                invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "register-password-error" : undefined
                }
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-mist-dim transition-colors hover:text-chalk"
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

          <FieldWrapper
            label="Confirmar senha"
            htmlFor="register-confirm"
            error={errors.confirmPassword?.message}
            required
          >
            <div className="relative">
              <Input
                id="register-confirm"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repita a senha"
                invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "register-confirm-error" : undefined
                }
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-mist-dim transition-colors hover:text-chalk"
                aria-label={
                  showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          </FieldWrapper>
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          loading={isSubmitting}
          rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
        >
          Criar minha conta
        </Button>

        <p className="text-center text-[0.6875rem] leading-relaxed text-mist-dim">
          Ao criar a conta, você concorda com o uso dos dados para operação dos
          leilões. A autorização de cada ação é validada pelo servidor.
        </p>
      </form>
    </AuthShell>
  );
}
