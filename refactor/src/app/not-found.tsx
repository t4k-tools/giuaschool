import Link from "next/link";
import { GraduationCap, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="font-dm-sans min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #061a0e 0%, #0b2a1a 30%, #134125 60%, #1B7A3D 100%)",
      }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, #8cc63f 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle, #8cc63f 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* Logo */}
          <div className="mx-auto mb-8 h-20 w-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-[#8cc63f]" />
          </div>

          {/* 404 number */}
          <h1 className="font-dm-serif text-8xl sm:text-9xl font-bold text-[#8cc63f]/30 leading-none mb-2">
            404
          </h1>

          {/* Message */}
          <h2 className="font-dm-serif text-2xl sm:text-3xl text-white mb-4">
            Pagina non trovata
          </h2>
          <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            La pagina che stai cercando non esiste o potrebbe essere stata spostata.
            Verifica l&apos;indirizzo o torna alla pagina principale.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#8cc63f] hover:bg-[#7ab836] text-[#0b2a1a] font-bold px-8 py-3.5 rounded-xl text-base transition-all hover:shadow-xl hover:shadow-[#8cc63f]/20 hover:-translate-y-0.5"
            >
              <Home className="h-5 w-5" />
              Torna alla Home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold px-8 py-3.5 rounded-xl text-base transition-all hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-5 w-5" />
              Accedi al Registro
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-6 text-center">
        <p className="text-white/25 text-xs">
          Registro Elettronico &mdash; Powered by giua@school
        </p>
      </footer>
    </div>
  );
}
