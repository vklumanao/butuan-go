import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./Brand";

const LEGAL_DOCUMENTS = [
  {
    key: "terms",
    title: "Terms of use",
    description: "Platform rules and user responsibilities",
    to: "/terms",
    icon: Scale,
  },
  {
    key: "privacy",
    title: "Privacy notice",
    description: "How milestone data is handled",
    to: "/privacy",
    icon: LockKeyhole,
  },
  {
    key: "safety",
    title: "Community safety",
    description: "Guidance for safer local errands",
    to: "/safety",
    icon: ShieldCheck,
  },
];

export function LegalSection({ id, icon: Icon, title, children }) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="legal-section scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2
            id={headingId}
            className="text-xl font-black tracking-tight text-slate-950"
          >
            {title}
          </h2>
          <div className="mt-3 space-y-3 text-[0.95rem] leading-7 text-slate-600">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LegalPageLayout({
  documentKey,
  title,
  description,
  readingTime,
  sections,
  children,
}) {
  const relatedDocuments = LEGAL_DOCUMENTS.filter(
    (document) => document.key !== documentKey,
  );

  return (
    <div className="legal-print-page min-h-screen bg-slate-50">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-9 text-white shadow-xl shadow-brand-900/10 sm:px-10 sm:py-12">
          <div
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-100">
              <FileText className="h-4 w-4" aria-hidden="true" />
              ButuanGo information
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-brand-50 sm:text-lg">
              {description}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-brand-100">
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {readingTime} read
              </span>
            </div>
          </div>
        </header>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
              On this page
            </p>
            <nav className="mt-4" aria-label={`${title} sections`}>
              <ol className="space-y-1">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span className="mt-0.5 font-black text-slate-300 transition group-hover:text-brand-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="space-y-5">{children}</div>

            <section className="no-print mt-10" aria-labelledby="related-pages">
              <h2
                id="related-pages"
                className="text-xl font-black tracking-tight text-slate-950"
              >
                Related information
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {relatedDocuments.map(
                  ({
                    title: relatedTitle,
                    description: relatedDescription,
                    to,
                    icon: Icon,
                  }) => (
                    <Link
                      key={to}
                      to={to}
                      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 font-black text-slate-950 group-hover:text-brand-800">
                        {relatedTitle}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {relatedDescription}
                      </p>
                    </Link>
                  ),
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
