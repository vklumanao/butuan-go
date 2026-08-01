import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Globe2,
  HandHeart,
  Handshake,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Printer,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  Utensils,
  UsersRound,
  WashingMachine,
  WalletCards,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isPublicAuthEnabled } from "@/lib/appConfig";

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

const safetySteps = [
  {
    icon: BellRing,
    title: "Stay informed",
    text: "Use status updates and notifications to follow each task.",
    guidance:
      "Check the latest status and confirm the handoff details before moving to the next step.",
  },
  {
    icon: MapPin,
    title: "Protect private locations",
    text: "Exact task addresses are limited to the assigned participants.",
    guidance:
      "Share an exact pickup or delivery address only after a Runner accepts the request.",
  },
  {
    icon: WalletCards,
    title: "Settle directly",
    text: "Review receipts and pay the agreed amount in person after meeting.",
    guidance:
      "Compare the receipt, approved expenses, and Runner fee before confirming direct payment.",
  },
];

const launchStages = [
  {
    icon: PackageCheck,
    title: "Private development",
    status: "Current stage",
    description:
      "Core Requestor, Runner, payment, safety, and Admin workflows are being refined before public access opens.",
  },
  {
    icon: UsersRound,
    title: "Community testing",
    status: "Next stage",
    description:
      "Selected testers can try realistic scenarios and help identify confusing, missing, or unsafe steps.",
  },
  {
    icon: Globe2,
    title: "Public access",
    status: "Later",
    description:
      "Google access can open after community feedback, safety safeguards, and release checks are ready.",
  },
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
  const [activeSafetyIndex, setActiveSafetyIndex] = useState(0);
  const [activeLaunchIndex, setActiveLaunchIndex] = useState(0);
  const safetyTrackRef = useRef(null);
  const safetyIconRefs = useRef([]);
  const role = roleExperiences[activeRole];
  const RoleIcon = role.icon;
  const activeLaunchStage = launchStages[activeLaunchIndex];
  const safetyActiveY =
    24 + (activeSafetyIndex / Math.max(safetySteps.length - 1, 1)) * 52;

  useLayoutEffect(() => {
    const track = safetyTrackRef.current;
    const icons = safetyIconRefs.current.slice(0, safetySteps.length);
    if (!track || icons.some((icon) => !icon)) return undefined;

    const updateTrack = () => {
      const trackRect = track.getBoundingClientRect();
      const centers = icons.map((icon) => {
        const iconRect = icon.getBoundingClientRect();
        return iconRect.top - trackRect.top + iconRect.height / 2;
      });
      const firstCenter = centers[0];
      const lastCenter = centers[centers.length - 1];
      const activeCenter = centers[activeSafetyIndex];

      track.style.setProperty("--safety-track-top", `${firstCenter}px`);
      track.style.setProperty(
        "--safety-track-height",
        `${Math.max(lastCenter - firstCenter, 0)}px`,
      );
      track.style.setProperty(
        "--safety-progress-height",
        `${Math.max(activeCenter - firstCenter, 0)}px`,
      );
    };

    updateTrack();
    const resizeObserver = new ResizeObserver(updateTrack);
    resizeObserver.observe(track);
    icons.forEach((icon) => resizeObserver.observe(icon));
    window.addEventListener("resize", updateTrack);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTrack);
    };
  }, [activeSafetyIndex]);

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
                {isPublicAuthEnabled ? (
                  <Button size="lg" asChild className="group sm:w-auto">
                    <Link to="/login">
                      Continue with Google
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                ) : (
                  <div className="flex max-w-md items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold">Public access is not open yet</p>
                      <p className="mt-1 leading-5 text-amber-900">
                        ButuanGo is currently in private development while we
                        validate the experience with the community.
                      </p>
                    </div>
                  </div>
                )}
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
                  {isPublicAuthEnabled && (
                    <Button asChild className="group mt-7">
                      <Link to="/login">
                        Continue with Google
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section
          id="safety"
          className="landing-safety-section relative isolate scroll-mt-20 overflow-hidden bg-brand-900 px-4 py-20 text-white sm:px-6 lg:py-24"
          style={{ "--safety-active-y": `${safetyActiveY}%` }}
        >
          <div
            className="landing-safety-background pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <span className="landing-safety-field absolute inset-0" />
            <span className="landing-safety-orb landing-safety-orb-one absolute rounded-full" />
            <span className="landing-safety-orb landing-safety-orb-two absolute rounded-full" />
            <span className="landing-safety-radar absolute rounded-full">
              <span className="landing-safety-radar-rings absolute inset-0 rounded-full" />
              <span className="landing-safety-radar-sweep absolute inset-0 rounded-full" />
              <span className="landing-safety-beacon absolute left-1/2 top-1/2 rounded-full" />
            </span>
            <span className="landing-safety-active-glow absolute rounded-full" />
          </div>

          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <ScrollReveal className="landing-safety-copy">
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
                <Link to="/safety" className="group">
                  Read the safety reminder
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </ScrollReveal>

            <ScrollReveal className="landing-safety-list relative" delay={120}>
              <div ref={safetyTrackRef} className="relative">
                <div
                  className="landing-safety-track absolute left-9 w-px bg-white/15"
                  aria-hidden="true"
                >
                  <span className="landing-safety-progress block w-full bg-gradient-to-b from-accent-300 to-accent-500" />
                </div>

                <div className="relative grid gap-3">
                  {safetySteps.map(
                    ({ icon: Icon, title, text, guidance }, index) => {
                      const isActive = activeSafetyIndex === index;

                      return (
                        <div
                          key={title}
                          className="landing-safety-item"
                          style={{ "--safety-delay": `${index * 110}ms` }}
                        >
                          <button
                            type="button"
                            className={`landing-safety-card group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 ${
                              isActive
                                ? "is-active border-accent-300/60 bg-white/[0.14] shadow-xl shadow-slate-950/15"
                                : "border-white/10 bg-white/[0.07] hover:border-white/25 hover:bg-white/[0.1]"
                            }`}
                            aria-pressed={isActive}
                            aria-expanded={isActive}
                            aria-controls={`safety-guidance-${index}`}
                            onClick={() => setActiveSafetyIndex(index)}
                          >
                            <span
                              ref={(element) => {
                                safetyIconRefs.current[index] = element;
                              }}
                              className="landing-safety-icon relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-accent-200"
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="relative z-10 min-w-0 flex-1">
                              <span className="block font-bold">{title}</span>
                              <span className="mt-1 block text-sm leading-6 text-brand-100/80">
                                {text}
                              </span>
                              <span
                                id={`safety-guidance-${index}`}
                                className={`landing-safety-detail ${isActive ? "is-active" : ""}`}
                              >
                                <span className="overflow-hidden">
                                  <span className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-sm leading-6 text-white">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-200" />
                                    {guidance}
                                  </span>
                                </span>
                              </span>
                            </span>
                            <ChevronRight
                              className={`landing-safety-chevron relative z-10 mt-2 h-4 w-4 shrink-0 text-brand-200 ${isActive ? "is-active" : ""}`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              <p
                className="mt-4 text-right text-xs font-semibold text-brand-200/80"
                aria-live="polite"
              >
                Safety step {activeSafetyIndex + 1} of {safetySteps.length}
              </p>
            </ScrollReveal>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <ScrollReveal className="landing-launch-panel relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-8 text-center text-white shadow-2xl shadow-brand-900/20 sm:p-12">
            <span
              className="landing-launch-orb landing-launch-orb-one absolute -left-24 top-8 h-64 w-64 rounded-full bg-accent-300/15 blur-3xl"
              aria-hidden="true"
            />
            <span
              className="landing-launch-orb landing-launch-orb-two absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-200/15 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative">
              <div className="relative mx-auto h-16 w-16" aria-hidden="true">
                <span className="landing-launch-ring absolute inset-0 rounded-full border border-accent-200/60" />
                <span className="landing-launch-ring landing-launch-ring-two absolute inset-0 rounded-full border border-accent-200/40" />
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white/10 text-accent-200 shadow-lg shadow-slate-950/15 backdrop-blur-sm">
                  <PackageCheck className="h-8 w-8" />
                </span>
              </div>

              <p className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-accent-200">
                Product launch status
              </p>
              <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                {isPublicAuthEnabled
                  ? "Try the current ButuanGo development experience."
                  : "ButuanGo is being prepared for community testing."}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-brand-100">
                {isPublicAuthEnabled
                  ? "Explore the current Requestor and Runner experience while the product remains in private development."
                  : "We are refining the request, Runner, payment, and safety experience before inviting public beta testers."}
              </p>

              <div
                className="mx-auto mt-8 h-1.5 max-w-xl overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="ButuanGo launch progress"
                aria-valuemin="1"
                aria-valuemax={launchStages.length}
                aria-valuenow="1"
                aria-valuetext="Private development, stage 1 of 3"
              >
                <span className="landing-launch-progress block h-full w-1/3 origin-left rounded-full bg-gradient-to-r from-accent-300 to-accent-500" />
              </div>

              <div
                className="mt-8 grid gap-3 sm:grid-cols-3"
                aria-label="ButuanGo launch stages"
              >
                {launchStages.map(({ icon: Icon, title, status }, index) => {
                  const isActive = activeLaunchIndex === index;

                  return (
                    <div
                      key={title}
                      className="landing-launch-stage-item"
                      style={{ "--launch-delay": `${index * 110}ms` }}
                    >
                      <button
                        type="button"
                        className={`landing-launch-stage group flex h-full w-full items-center gap-3 rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800 sm:block sm:text-center ${
                          isActive
                            ? "is-active border-accent-300/60 bg-white/[0.14]"
                            : "border-white/10 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.1]"
                        }`}
                        aria-pressed={isActive}
                        onClick={() => setActiveLaunchIndex(index)}
                        onFocus={() => setActiveLaunchIndex(index)}
                        onMouseEnter={() => setActiveLaunchIndex(index)}
                      >
                        <span className="landing-launch-stage-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-accent-200 sm:mx-auto">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-bold sm:mt-3">
                            {title}
                          </span>
                          <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.1em] text-brand-200">
                            {status}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div
                key={activeLaunchIndex}
                className="landing-launch-detail mx-auto mt-5 max-w-2xl rounded-2xl border border-white/10 bg-slate-950/15 px-5 py-4 text-sm leading-6 text-brand-50 backdrop-blur-sm"
                aria-live="polite"
              >
                <span className="font-bold text-accent-200">
                  {activeLaunchStage.status}:
                </span>{" "}
                {activeLaunchStage.description}
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="secondary" size="lg" className="group">
                  {isPublicAuthEnabled ? (
                    <Link to="/login">
                      Continue with Google
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <a href="#how-it-works">
                      Explore how ButuanGo works
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </a>
                  )}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/25 bg-white/[0.06] text-white hover:bg-white/[0.12] hover:text-white"
                >
                  <Link to="/safety">Read the safety guide</Link>
                </Button>
              </div>
            </div>
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
