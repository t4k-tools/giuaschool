"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { publicApi, type SchoolPublicInfo } from "@/lib/api/client";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Users,
  Bell,
  Shield,
  Smartphone,
  BarChart3,
  Calendar,
  FileText,
  UserCheck,
  Clock,
  MessageSquare,
  Settings,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Mail,
  Phone,
  Globe,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolPublicInfo | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Carica dati scuola dal database
  useEffect(() => {
    publicApi
      .info()
      .then(setSchoolInfo)
      .catch(() => {});
  }, []);

  const loginHref = user ? "/dashboard" : "/login";
  const loginLabel = user ? "Vai al Registro" : "Accedi";

  // Ensure URLs always have a protocol prefix
  const ensureProtocol = (url: string | undefined | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  // Dati dinamici con fallback
  const schoolName =
    schoolInfo?.istituto?.nomeBreve || "giua@school";
  const schoolFullName =
    schoolInfo?.istituto
      ? `${schoolInfo.istituto.tipo} ${schoolInfo.istituto.nome}`
      : "Registro Elettronico";
  const annoScolastico =
    schoolInfo?.annoScolastico || "2025/2026";
  const sede = schoolInfo?.sedePrincipale;
  const istituto = schoolInfo?.istituto;

  return (
    <div
      className="font-dm-sans min-h-screen"
      style={{ backgroundColor: "#faf9f6" }}
    >
      {/* ===== NAVBAR ===== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0b2a1a]/95 backdrop-blur-md shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <GraduationCap className="h-6 w-6 text-[#8cc63f]" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">
                  {schoolName}
                </span>
                <span className="text-white/60 text-[10px] uppercase tracking-widest">
                  Registro Elettronico
                </span>
              </div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#funzionalita"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Funzionalit&agrave;
              </a>
              <a
                href="#vantaggi"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Vantaggi
              </a>
              <a
                href="#dettagli"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                Dettagli
              </a>
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 bg-[#8cc63f] hover:bg-[#7ab836] text-[#0b2a1a] font-semibold px-5 py-2.5 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-[#8cc63f]/25"
              >
                {loginLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-6 space-y-3 animate-fade-in">
              <a
                href="#funzionalita"
                className="block text-white/80 hover:text-white text-sm py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Funzionalit&agrave;
              </a>
              <a
                href="#vantaggi"
                className="block text-white/80 hover:text-white text-sm py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Vantaggi
              </a>
              <a
                href="#dettagli"
                className="block text-white/80 hover:text-white text-sm py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dettagli
              </a>
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 bg-[#8cc63f] text-[#0b2a1a] font-semibold px-5 py-2.5 rounded-lg text-sm w-full justify-center"
              >
                {loginLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section
        className="relative min-h-svh sm:min-h-[90vh] flex items-center justify-center overflow-hidden"
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
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24 sm:py-28 lg:py-32">
          {/* Badge */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-[#8cc63f]" />
              Anno Scolastico {annoScolastico}
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-dm-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white mt-6 sm:mt-8 mb-4 sm:mb-6 animate-fade-up animation-delay-200 leading-tight">
            Il Registro Elettronico
            <br />
            <span className="text-[#8cc63f]">Completo e Affidabile</span>
          </h1>

          {/* School name subtitle */}
          {schoolInfo?.istituto && (
            <p className="text-white/50 text-base mb-4 animate-fade-up animation-delay-200 font-medium">
              {schoolFullName}
            </p>
          )}

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto mb-8 sm:mb-10 animate-fade-up animation-delay-300 leading-relaxed">
            La piattaforma digitale che semplifica la gestione scolastica
            quotidiana: voti, assenze, scrutini, comunicazioni e molto altro, in
            un unico ambiente sicuro e intuitivo per docenti, famiglie e
            personale scolastico.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up animation-delay-400">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 bg-[#8cc63f] hover:bg-[#7ab836] text-[#0b2a1a] font-bold px-8 py-4 rounded-xl text-base transition-all hover:shadow-xl hover:shadow-[#8cc63f]/20 hover:-translate-y-0.5"
            >
              {loginLabel}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#funzionalita"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold px-8 py-4 rounded-xl text-base transition-all hover:-translate-y-0.5"
            >
              Scopri le Funzionalit&agrave;
              <ChevronDown className="h-5 w-5" />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 sm:gap-8 mt-10 sm:mt-16 max-w-2xl mx-auto animate-fade-up animation-delay-600">
            {[
              { value: "100%", label: "Digitale" },
              { value: "24/7", label: "Accessibile" },
              { value: "GDPR", label: "Conforme" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-[#8cc63f]">
                  {stat.value}
                </p>
                <p className="text-white/50 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 80V40C240 0 480 0 720 20C960 40 1200 80 1440 60V80H0Z"
              fill="#faf9f6"
            />
          </svg>
        </div>
      </section>

      {/* ===== OVERVIEW ===== */}
      <section id="funzionalita" className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 text-[#1B7A3D] text-sm font-bold uppercase tracking-widest mb-4">
              <BookOpen className="h-4 w-4" />
              Panoramica
            </span>
            <h2 className="font-dm-serif text-2xl sm:text-3xl lg:text-4xl text-[#0b2a1a] mb-4 sm:mb-6">
              Una piattaforma pensata per la scuola moderna
            </h2>
            <p className="text-[#0b2a1a]/60 text-base sm:text-lg leading-relaxed">
              giua@school &egrave; il registro elettronico open source che
              digitalizza l&apos;intera gestione scolastica. Conforme alla
              normativa vigente, garantisce trasparenza, efficienza e
              comunicazione continua tra tutti gli attori della comunit&agrave;
              scolastica: dirigenza, docenti, personale ATA, studenti e
              famiglie.
            </p>
          </div>

          {/* Feature cards grid */}
          <div
            id="vantaggi"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: ClipboardCheck,
                title: "Registro di Classe",
                desc: "Firma digitale delle lezioni, registrazione argomenti svolti e compiti assegnati. Gestione completa delle attivit\u00e0 didattiche giornaliere con storico consultabile in ogni momento.",
                color: "#1B7A3D",
                bgColor: "#1B7A3D10",
              },
              {
                icon: BarChart3,
                title: "Voti e Valutazioni",
                desc: "Inserimento voti scritti, orali e pratici con calcolo automatico delle medie. Gestione personalizzata delle tipologie di valutazione per materia e visibilit\u00e0 immediata per le famiglie.",
                color: "#2d8f4e",
                bgColor: "#2d8f4e10",
              },
              {
                icon: Bell,
                title: "Comunicazioni",
                desc: "Circolari, avvisi e bacheca digitale per una comunicazione trasparente scuola-famiglia. Notifiche in tempo reale e conferma di lettura per garantire che ogni messaggio arrivi a destinazione.",
                color: "#3aa35f",
                bgColor: "#3aa35f10",
              },
              {
                icon: Shield,
                title: "Sicurezza e Privacy",
                desc: "Accesso differenziato per ruolo con autenticazione sicura. Dati protetti e conformi al GDPR, con log completo di tutte le operazioni per la massima trasparenza e tracciabilit\u00e0.",
                color: "#0f5c2d",
                bgColor: "#0f5c2d10",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group relative rounded-2xl border border-[#0b2a1a]/8 bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <card.icon
                    className="h-7 w-7"
                    style={{ color: card.color }}
                  />
                </div>
                <h3 className="font-dm-serif text-xl text-[#0b2a1a] mb-3">
                  {card.title}
                </h3>
                <p className="text-[#0b2a1a]/55 text-sm leading-relaxed">
                  {card.desc}
                </p>
                <div
                  className="absolute bottom-0 left-6 right-6 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: card.color }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DETAILED FEATURES ===== */}
      <section
        id="dettagli"
        className="py-12 sm:py-16 lg:py-20"
        style={{
          background:
            "linear-gradient(180deg, #faf9f6 0%, #f0f7f1 50%, #faf9f6 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 text-[#1B7A3D] text-sm font-bold uppercase tracking-widest mb-4">
              <Settings className="h-4 w-4" />
              Funzionalit&agrave; nel Dettaglio
            </span>
            <h2 className="font-dm-serif text-2xl sm:text-3xl lg:text-4xl text-[#0b2a1a] mb-4 sm:mb-6">
              Tutto ci&ograve; che serve per gestire la scuola
            </h2>
            <p className="text-[#0b2a1a]/60 text-base sm:text-lg leading-relaxed">
              Un ecosistema completo di strumenti digitali che copre ogni aspetto
              della vita scolastica, dalla didattica quotidiana alla gestione
              amministrativa.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto">
            {[
              {
                icon: ClipboardCheck,
                title: "Registro di Classe Digitale",
                desc: "Firma presenze, gestione argomenti, compiti assegnati, note disciplinari e annotazioni. Il registro di classe completamente digitalizzato con accesso in tempo reale per docenti e coordinatori.",
              },
              {
                icon: BarChart3,
                title: "Gestione Scrutini ed Esiti",
                desc: "Proposte di voto, voti finali, gestione dei crediti scolastici e formativi, delibere del consiglio di classe, pagelle e tabelloni. Tutto il processo di scrutinio in un flusso digitale guidato.",
              },
              {
                icon: FileText,
                title: "Programmazione Didattica",
                desc: "Pianificazione e condivisione dei piani di lavoro, programmazioni disciplinari e interdisciplinari. Archivio storico consultabile per favorire la continuit\u00e0 didattica.",
              },
              {
                icon: Clock,
                title: "Gestione Assenze e Ritardi",
                desc: "Registrazione assenze, ritardi, uscite anticipate con giustificazione online da parte delle famiglie. Monitoraggio automatico del numero di assenze con alert per superamento soglie.",
              },
              {
                icon: MessageSquare,
                title: "Comunicazioni Scuola-Famiglia",
                desc: "Circolari con conferma di lettura, avvisi personalizzati per classe o singolo alunno, bacheca pubblica e riservata. Colloqui prenotabili online con gestione dei turni.",
              },
              {
                icon: Users,
                title: "Gestione Cattedre e Orari",
                desc: "Assegnazione docenti alle classi, gestione delle cattedre e delle ore di lezione. Definizione dell\u2019orario scolastico settimanale con supporto per orari provvisori e definitivi.",
              },
              {
                icon: UserCheck,
                title: "Gestione Personale ATA",
                desc: "Anagrafica completa del personale amministrativo, tecnico e ausiliario. Importazione massiva da file CSV, gestione sedi e ruoli con accesso differenziato alle funzionalit\u00e0.",
              },
              {
                icon: Smartphone,
                title: "Accesso Multi-Dispositivo",
                desc: "Interfaccia responsive ottimizzata per desktop, tablet e smartphone. Accesso sicuro da qualsiasi dispositivo con design adattivo che garantisce la migliore esperienza d\u2019uso.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 bg-white rounded-xl border border-[#0b2a1a]/6 p-6 hover:shadow-lg hover:border-[#1B7A3D]/20 transition-all duration-300"
              >
                <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-[#1B7A3D]/8 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-[#1B7A3D]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0b2a1a] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#0b2a1a]/55 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROLES SECTION ===== */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12 lg:mb-16">
            <span className="inline-flex items-center gap-2 text-[#1B7A3D] text-sm font-bold uppercase tracking-widest mb-4">
              <Users className="h-4 w-4" />
              Per Ogni Ruolo
            </span>
            <h2 className="font-dm-serif text-2xl sm:text-3xl lg:text-4xl text-[#0b2a1a] mb-4 sm:mb-6">
              Un&apos;esperienza dedicata a ciascun utente
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                role: "Docenti",
                icon: BookOpen,
                items: [
                  "Firma digitale del registro",
                  "Inserimento voti e valutazioni",
                  "Gestione assenze e note",
                  "Programmazione didattica",
                  "Proposte voto scrutinio",
                  "Comunicazioni alle famiglie",
                ],
              },
              {
                role: "Famiglie e Studenti",
                icon: Users,
                items: [
                  "Consultazione voti in tempo reale",
                  "Visualizzazione assenze e ritardi",
                  "Giustificazione assenze online",
                  "Lettura circolari e avvisi",
                  "Prenotazione colloqui",
                  "Pagelle e documenti digitali",
                ],
              },
              {
                role: "Segreteria e Dirigenza",
                icon: Settings,
                items: [
                  "Gestione anagrafica completa",
                  "Configurazione anno scolastico",
                  "Importazione massiva dati",
                  "Gestione classi, corsi e sedi",
                  "Monitoraggio e statistiche",
                  "Archiviazione e backup",
                ],
              },
            ].map((section) => (
              <div
                key={section.role}
                className="bg-white rounded-2xl border border-[#0b2a1a]/8 p-5 sm:p-8 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="h-14 w-14 rounded-xl bg-[#1B7A3D]/10 flex items-center justify-center mb-6">
                  <section.icon className="h-7 w-7 text-[#1B7A3D]" />
                </div>
                <h3 className="font-dm-serif text-2xl text-[#0b2a1a] mb-5">
                  {section.role}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#1B7A3D] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#0b2a1a]/65">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NORMATIVA ===== */}
      <section
        className="py-12 sm:py-16 lg:py-20"
        style={{ backgroundColor: "#f0f7f1" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 text-[#1B7A3D] text-sm font-bold uppercase tracking-widest mb-4">
            <Shield className="h-4 w-4" />
            Conformit&agrave; Normativa
          </span>
          <h2 className="font-dm-serif text-2xl sm:text-3xl lg:text-4xl text-[#0b2a1a] mb-4 sm:mb-6">
            Conforme alla normativa italiana
          </h2>
          <p className="text-[#0b2a1a]/60 text-base sm:text-lg leading-relaxed mb-6 sm:mb-10 max-w-3xl mx-auto">
            Il registro elettronico giua@school &egrave; sviluppato nel rispetto
            della normativa vigente in materia di digitalizzazione della
            Pubblica Amministrazione scolastica. Adottato ai sensi del D.L.
            95/2012 (convertito in L. 135/2012), che ha introdotto l&apos;obbligo
            del registro elettronico nelle scuole, e conforme alle disposizioni
            del Codice dell&apos;Amministrazione Digitale (CAD) e del
            Regolamento UE 2016/679 (GDPR) in materia di protezione dei dati
            personali.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: "D.L. 95/2012", sub: "Obbligo registro elettronico" },
              { label: "L. 135/2012", sub: "Spending review" },
              { label: "CAD", sub: "Codice Amm. Digitale" },
              { label: "GDPR", sub: "Privacy e dati personali" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-xl p-5 border border-[#0b2a1a]/8"
              >
                <p className="font-bold text-[#1B7A3D] text-lg">
                  {item.label}
                </p>
                <p className="text-xs text-[#0b2a1a]/50 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINALE ===== */}
      <section
        className="py-12 sm:py-16 lg:py-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #061a0e 0%, #0b2a1a 30%, #134125 60%, #1B7A3D 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/3 -right-1/4 w-[700px] h-[700px] rounded-full opacity-[0.07]"
            style={{
              background:
                "radial-gradient(circle, #8cc63f 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-dm-serif text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-6">
            Pronto per iniziare?
          </h2>
          <p className="text-white/65 text-base sm:text-lg mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Accedi al registro elettronico per gestire la tua attivit&agrave;
            scolastica in modo semplice, veloce e sicuro. Docenti, famiglie e
            personale scolastico: tutto a portata di click.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 bg-[#8cc63f] hover:bg-[#7ab836] text-[#0b2a1a] font-bold px-10 py-4 rounded-xl text-lg transition-all hover:shadow-xl hover:shadow-[#8cc63f]/20 hover:-translate-y-0.5"
            >
              {loginLabel}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold px-10 py-4 rounded-xl text-lg transition-all hover:-translate-y-0.5"
            >
              <GraduationCap className="h-5 w-5" />
              Area Docenti
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        className="border-t"
        style={{ backgroundColor: "#0b2a1a", borderColor: "#1B7A3D20" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Footer main content */}
          <div className="py-8 sm:py-12 grid gap-8 sm:gap-10 md:grid-cols-3">
            {/* Colonna 1: Brand + Scuola */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-[#8cc63f]" />
                </div>
                <div>
                  <span className="text-white font-bold text-base block leading-tight">
                    {schoolName}
                  </span>
                  <span className="text-white/40 text-xs">
                    Registro Elettronico
                  </span>
                </div>
              </div>
              {istituto && (
                <p className="text-white/50 text-sm leading-relaxed mb-4">
                  {schoolFullName}
                </p>
              )}
              <p className="text-white/35 text-xs leading-relaxed">
                Piattaforma giua@school per la gestione digitale completa della
                scuola. Conforme alla normativa italiana e al GDPR.
              </p>
            </div>

            {/* Colonna 2: Contatti della scuola (dal database) */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">
                Contatti Scuola
              </h4>
              <ul className="space-y-3">
                {sede && (
                  <>
                    <li className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-[#8cc63f] flex-shrink-0 mt-0.5" />
                      <span className="text-white/60 text-sm leading-snug">
                        {sede.indirizzo}
                        <br />
                        {sede.cap} {sede.citta}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#8cc63f] flex-shrink-0" />
                      <span className="text-white/60 text-sm">
                        {sede.telefono}
                      </span>
                    </li>
                  </>
                )}
                {istituto?.email && (
                  <li className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#8cc63f] flex-shrink-0" />
                    <a
                      href={`mailto:${istituto.email}`}
                      className="text-white/60 hover:text-white/90 text-sm transition-colors"
                    >
                      {istituto.email}
                    </a>
                  </li>
                )}
                {istituto?.pec && (
                  <li className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#8cc63f] flex-shrink-0" />
                    <div>
                      <span className="text-white/30 text-[10px] uppercase tracking-wider block">
                        PEC
                      </span>
                      <a
                        href={`mailto:${istituto.pec}`}
                        className="text-white/60 hover:text-white/90 text-sm transition-colors"
                      >
                        {istituto.pec}
                      </a>
                    </div>
                  </li>
                )}
                {istituto?.urlSito && (
                  <li className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-[#8cc63f] flex-shrink-0" />
                    <a
                      href={ensureProtocol(istituto.urlSito)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white/90 text-sm transition-colors inline-flex items-center gap-1"
                    >
                      Sito Istituzionale
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Colonna 3: Link rapidi */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">
                Navigazione
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="#funzionalita"
                    className="text-white/50 hover:text-white/80 text-sm transition-colors"
                  >
                    Funzionalit&agrave;
                  </a>
                </li>
                <li>
                  <a
                    href="#vantaggi"
                    className="text-white/50 hover:text-white/80 text-sm transition-colors"
                  >
                    Vantaggi
                  </a>
                </li>
                <li>
                  <a
                    href="#dettagli"
                    className="text-white/50 hover:text-white/80 text-sm transition-colors"
                  >
                    Dettagli
                  </a>
                </li>
                <li>
                  <Link
                    href={loginHref}
                    className="text-[#8cc63f] hover:text-[#a0d65a] text-sm font-medium transition-colors inline-flex items-center gap-1"
                  >
                    {loginLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              </ul>

              {/* Anno scolastico badge */}
              <div className="mt-6 inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-[#8cc63f]" />
                <span className="text-white/50 text-xs font-medium">
                  A.S. {annoScolastico}
                </span>
              </div>
            </div>
          </div>

          {/* Disclaimer istitutiparitari.com */}
          <div className="border-t border-white/5 py-5 text-center">
            <p className="text-white/35 text-xs leading-relaxed max-w-2xl mx-auto">
              Design e personalizzazione a cura di{" "}
              <a
                href="https://istitutiparitari.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8cc63f]/70 hover:text-[#8cc63f] transition-colors font-medium"
              >
                istitutiparitari.com
              </a>
              . Si ringrazia il team per la cura nella progettazione
              dell&apos;interfaccia e nella personalizzazione grafica del
              registro elettronico.
            </p>
          </div>

          {/* Footer bottom bar */}
          <div className="border-t border-white/5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/25 text-xs">
              &copy; {new Date().getFullYear()}{" "}
              {istituto ? schoolFullName : schoolName} &mdash; Tutti i diritti
              riservati
            </p>
            <p className="text-white/20 text-xs">
              Powered by giua@school &mdash; Registro Elettronico Open Source
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
