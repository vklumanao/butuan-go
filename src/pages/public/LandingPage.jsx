import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CircleCheckBig,
  ClipboardList,
  HandHeart,
  Handshake,
  MapPin,
  PackageCheck,
  Printer,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  Utensils,
  WashingMachine,
  WalletCards,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const workflowSteps = [
  {
    icon: ClipboardList,
    title: "Post a Task",
    description:
      "Describe the errand, choose a saved address, and set the expected budget and Runner fee.",
  },
  {
    icon: Handshake,
    title: "Connect with a Runner",
    description:
      "A local Runner accepts the request and receives the private task details.",
  },
  {
    icon: Route,
    title: "Track the Progress",
    description:
      "Follow status updates from acceptance through active completion.",
  },
  {
    icon: CircleCheckBig,
    title: "Confirm Completion",
    description:
      "Review the result, settle the agreed amount in person, and confirm completion.",
  },
];

const taskExamples = [
  { icon: ShoppingBasket, text: "Groceries" },
  { icon: Utensils, text: "Food pickup" },
  { icon: WashingMachine, text: "Laundry pickup" },
  { icon: Printer, text: "Document printing" },
  { icon: Truck, text: "Small deliveries" },
  { icon: Store, text: "Store errands" },
];

const roleExperiences = {
  requestor: {
    icon: ClipboardList,
    eyebrow: "I need help",
    title: "Turn an everyday errand into a clear local request.",
    description:
      "Set the task details once, reuse your saved addresses, and follow the assigned Runner from acceptance to completion.",
    iconClass: "bg-brand-100 text-brand-700",
    accentClass: "border-brand-200 bg-brand-50",
    steps: [
      "Create a lawful everyday request",
      "Share exact details only with the assigned Runner",
      "Review the result and pay in person",
    ],
  },
  runner: {
    icon: HandHeart,
    eyebrow: "I want to help",
    title: "Find a nearby task you are prepared to complete.",
    description:
      "Browse open requests, accept one active task at a time, and keep the Requestor informed as work progresses.",
    iconClass: "bg-accent-100 text-accent-700",
    accentClass: "border-accent-200 bg-accent-50",
    steps: [
      "Review the area, deadline, budget, and fee",
      "Access private details only after acceptance",
      "Complete the errand and receive payment in person",
    ],
  },
};

function HeroJourney() {
  const journey = [
    { icon: ClipboardList, label: "Request posted", detail: "Grocery pickup" },
    { icon: Handshake, label: "Runner connected", detail: "Task accepted" },
    { icon: Route, label: "Errand in progress", detail: "Status shared" },
    {
      icon: CircleCheckBig,
      label: "Ready to confirm",
      detail: "Meet and pay in person",
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-lg lg:mr-0">
      <div
        className="landing-float landing-float-one absolute -left-5 top-14 z-20 hidden items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-800 shadow-lg sm:flex"
        aria-hidden="true"
      >
        <MapPin className="h-4 w-4" />
        Local request
      </div>
      <div
        className="landing-float landing-float-two absolute -right-3 bottom-16 z-20 hidden items-center gap-2 rounded-full border border-accent-200 bg-white px-3 py-2 text-xs font-bold text-accent-800 shadow-lg sm:flex"
        aria-hidden="true"
      >
        <WalletCards className="h-4 w-4" />
        Pay in person
      </div>
      <div
        className="absolute -inset-10 rounded-full bg-brand-300/25 blur-3xl"
        aria-hidden="true"
      />
      <Card className="relative overflow-hidden border-white/80 bg-white/90 shadow-2xl shadow-brand-900/15 backdrop-blur-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 to-accent-50 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                Example task journey
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-950">
                One errand, clearly tracked
              </h2>
            </div>
            <span className="landing-pulse-dot h-3 w-3 shrink-0 rounded-full bg-brand-500 ring-8 ring-brand-100" />
          </div>
        </div>
        <CardContent className="p-5 sm:p-6">
          <ol className="space-y-1">
            {journey.map(({ icon: Icon, label, detail }, index) => (
              <li
                key={label}
                className="hero-journey-step relative flex gap-4 pb-5 last:pb-0"
                style={{ "--journey-delay": `${300 + index * 220}ms` }}
              >
                <div className="relative flex shrink-0 flex-col items-center">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${
                      index === journey.length - 1
                        ? "bg-accent-100 text-accent-700 ring-accent-200"
                        : "bg-brand-50 text-brand-700 ring-brand-100"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {index < journey.length - 1 && (
                    <span className="mt-2 h-full w-px bg-gradient-to-b from-brand-300 to-slate-200" />
                  )}
                </div>
                <div className="min-w-0 pt-1">
                  <p className="font-bold text-slate-950">{label}</p>
                  <p className="mt-1 text-sm text-slate-500">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Exact addresses stay private until a Runner accepts the task.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LandingPage() {
  const [activeRole, setActiveRole] = useState("requestor");
  const role = roleExperiences[activeRole];
  const RoleIcon = role.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <PublicHeader />
      <main>
        <section className="landing-hero-grid relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-accent-50">
          <div
            className="landing-orb landing-orb-one absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="landing-orb landing-orb-two absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent-300/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)] lg:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-brand-800 shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Built for our local community
              </span>
              <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
                Get everyday tasks done with help from{" "}
                <span className="landing-gradient-text">local Runners.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Post a simple errand or switch workspaces and earn by helping
                someone complete one—all from a single account.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button size="lg" asChild className="group sm:w-auto">
                  <Link to="/login">
                    Continue with Google
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  One dual-workspace account
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  Direct in-person payment
                </span>
              </div>
            </div>
            <HeroJourney />
          </div>
        </section>

        <section
          className="border-y border-slate-100 bg-white py-5"
          aria-label="Supported everyday task examples"
        >
          <div className="landing-marquee-mask overflow-hidden">
            <div className="landing-marquee">
              {[0, 1].map((groupIndex) => (
                <div
                  key={groupIndex}
                  className="landing-marquee-group"
                  aria-hidden={groupIndex === 1}
                >
                  {taskExamples.map(({ icon: Icon, text }) => (
                    <div
                      key={`${groupIndex}-${text}`}
                      className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      <Icon className="h-4 w-4 text-brand-600" />
                      {text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="relative scroll-mt-20 overflow-hidden bg-white px-4 py-20 sm:px-6 lg:py-24"
        >
          <div
            className="landing-float absolute -left-8 top-28 hidden h-24 w-24 rounded-3xl border border-brand-100 bg-brand-50/70 sm:block"
            aria-hidden="true"
          />
          <div
            className="landing-float landing-float-two absolute -right-10 bottom-24 hidden h-28 w-28 rounded-full border border-accent-100 bg-accent-50/70 sm:block"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <p className="font-bold text-brand-700">How it works</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                From request to completion in four clear steps
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Each status keeps both participants aware of what should happen
                next.
              </p>
            </ScrollReveal>

            <ScrollReveal className="relative mt-14" delay={100}>
              <div className="landing-progress-track absolute left-[12.5%] right-[12.5%] top-11 hidden h-0.5 bg-slate-200 md:block">
                <span className="landing-progress-fill block h-full origin-left bg-gradient-to-r from-brand-500 to-accent-400" />
              </div>
              <ol className="relative grid gap-5 md:grid-cols-4">
                {workflowSteps.map(
                  ({ icon: Icon, title, description }, index) => (
                    <li
                      key={title}
                      className="landing-step-float group relative"
                      style={{ "--step-float-delay": `${index * -1.1}s` }}
                    >
                      <div className="landing-step-card relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <span
                          className="absolute -right-5 -top-7 h-20 w-20 rounded-full bg-brand-100/60 blur-xl transition-all duration-300 group-hover:scale-150 group-hover:bg-accent-100/70"
                          aria-hidden="true"
                        />
                        <div className="relative flex items-start justify-between gap-3">
                          <span className="landing-step-icon grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-700/20">
                            <Icon className="h-6 w-6" />
                          </span>
                          <span className="text-4xl font-black text-slate-950">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="relative">
                          <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-brand-700">
                            Step {index + 1}
                          </p>
                          <h3 className="mt-2 font-black text-slate-950">
                            {title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {description}
                          </p>
                          <span className="mt-5 block h-1 w-10 rounded-full bg-brand-200 transition-all duration-300 group-hover:w-20 group-hover:bg-accent-400" />
                        </div>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            </ScrollReveal>
          </div>
        </section>

        <section
          id="roles"
          className="scroll-mt-20 bg-slate-50 px-4 py-20 sm:px-6 lg:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <p className="font-bold text-brand-700">
                Two ways to participate
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Choose what you need today
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Your account can switch between Requestor and Runner at any
                time.
              </p>
            </ScrollReveal>

            <ScrollReveal className="mt-10" delay={100}>
              <div
                className="mx-auto grid max-w-lg grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
                role="tablist"
                aria-label="Choose a ButuanGo workspace"
              >
                <button
                  type="button"
                  role="tab"
                  id="requestor-tab"
                  aria-selected={activeRole === "requestor"}
                  aria-controls="workspace-panel"
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                    activeRole === "requestor"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setActiveRole("requestor")}
                >
                  I need help
                </button>
                <button
                  type="button"
                  role="tab"
                  id="runner-tab"
                  aria-selected={activeRole === "runner"}
                  aria-controls="workspace-panel"
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                    activeRole === "runner"
                      ? "bg-accent-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setActiveRole("runner")}
                >
                  I want to help
                </button>
              </div>

              <div
                key={activeRole}
                id="workspace-panel"
                role="tabpanel"
                aria-labelledby={`${activeRole}-tab`}
                className="landing-role-panel mt-6 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-[0.9fr_1.1fr]"
              >
                <div
                  className={`flex min-h-64 items-center justify-center border-b p-8 lg:border-b-0 lg:border-r ${role.accentClass}`}
                >
                  <div className="text-center">
                    <span
                      className={`mx-auto grid h-20 w-20 place-items-center rounded-3xl shadow-sm ${role.iconClass}`}
                    >
                      <RoleIcon className="h-10 w-10" />
                    </span>
                    <p className="mt-5 text-sm font-black uppercase tracking-[0.14em] text-slate-600">
                      {role.eyebrow}
                    </p>
                  </div>
                </div>
                <div className="p-6 sm:p-9">
                  <h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {role.title}
                  </h3>
                  <p className="mt-4 leading-7 text-slate-600">
                    {role.description}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {role.steps.map((step) => (
                      <li key={step} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                        <span className="text-sm leading-6 text-slate-700">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="group mt-7">
                    <Link to="/login">
                      Continue with Google
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section
          id="safety"
          className="scroll-mt-20 bg-brand-900 px-4 py-20 text-white sm:px-6 lg:py-24"
        >
          <ScrollReveal className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-white/10 px-3 py-1.5 text-sm font-bold text-brand-100">
                <ShieldCheck className="h-4 w-4" />
                Community safety
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                Keep every errand safe, lawful, and sensible.
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-brand-100">
                Avoid sharing sensitive credentials, review task details before
                accepting, and never use ButuanGo for government transactions.
              </p>
              <Button asChild variant="secondary" className="mt-7">
                <Link to="/safety">Read the safety reminder</Link>
              </Button>
            </div>

            <div className="grid gap-3">
              {[
                {
                  icon: BellRing,
                  title: "Stay informed",
                  text: "Use status updates and notifications to follow each task.",
                },
                {
                  icon: MapPin,
                  title: "Protect private locations",
                  text: "Exact task addresses are limited to the assigned participants.",
                },
                {
                  icon: WalletCards,
                  title: "Settle directly",
                  text: "Review receipts and pay the agreed amount in person after meeting.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-accent-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-brand-100/80">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <ScrollReveal className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 p-8 text-center text-white shadow-2xl shadow-brand-900/20 sm:p-12">
            <PackageCheck className="mx-auto h-11 w-11 text-accent-200" />
            <h2 className="mt-5 text-3xl font-black tracking-tight">
              Ready to use ButuanGo your way?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-brand-100">
              Create one account, choose a starting workspace, and switch when
              your day changes.
            </p>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="group mt-7"
            >
              <Link to="/login">
                Continue with Google
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </ScrollReveal>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 ButuanGo. Local task marketplace.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terms" className="hover:text-brand-700 hover:underline">
              Terms
            </Link>
            <Link
              to="/privacy"
              className="hover:text-brand-700 hover:underline"
            >
              Privacy
            </Link>
            <Link to="/safety" className="hover:text-brand-700 hover:underline">
              Safety
            </Link>
            <p className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              Everyday errands, locally.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
