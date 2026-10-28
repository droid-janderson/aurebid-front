import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70 bg-surface/40">
      <div className="flex justify-evenly max-w-7xl gap-10 px-10 py-8 sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-8" />
            <span className="font-display text-lg text-chalk">
              Aure<span className="text-gold">Bid</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-normal text-mist">
            Casa de leilões dedicada a cartas colecionáveis Pokémon TCG. Lotes
            autenticados por catálogo, lances auditáveis e liquidação
            transparente.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[0.625rem] tracking-[0.12em] text-mist-dim uppercase">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-win" />
            Histórico com cadeia de hashes
          </p>
        </div>

        <div>
          <h2 className="eyebrow">Socials</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-mist">
            <li>
              <a
                href="https://github.com/droid-janderson"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-chalk"
              >
                Github
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/janderson-brito/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-chalk"
              >
                Linkedin
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line/60">
        <div className="flex max-w-7xl gap-2 px-4 py-5 text-xs text-mist-dim  items-center justify-center sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AureBid. Demonstração técnica.</p>
        </div>
      </div>
    </footer>
  );
}
