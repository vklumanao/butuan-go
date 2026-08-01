import { useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isPublicAuthEnabled } from "@/lib/appConfig";
import { devLog } from "@/lib/errors";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { Brand } from "@/components/layout/Brand";
import { ConfigurationNotice } from "@/components/common/ConfigurationNotice";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label="Google">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.32-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.35 2.62C7.19 7.7 9.4 5.94 12 5.94Z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [formError, setFormError] = useState("");
  const googleUnavailable = isDemoMode || !isSupabaseConfigured;

  async function handleGoogleSignIn() {
    setFormError("");
    setSigningIn(true);
    const { error } = await signInWithGoogle();
    if (error) {
      devLog("Google sign-in failed", error);
      setFormError(
        error.message ||
          "We could not start Google sign-in. Check the authentication configuration and try again.",
      );
      setSigningIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-900 px-12 py-10 text-white lg:flex lg:flex-col xl:px-20 xl:py-14">
        <div
          className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10">
          <span className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-xl shadow-slate-950/15">
            <Brand />
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-brand-100 backdrop-blur-sm">
            <MapPin className="h-4 w-4" />
            Local help around Butuan
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            One Google account. Two local workspaces.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-brand-100 xl:text-lg">
            Request help or complete local errands without creating another
            password.
          </p>

          <ul className="mt-8 grid gap-3">
            <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-400/20 text-brand-100">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold">
                  {isPublicAuthEnabled
                    ? "New and returning users"
                    : "Private development access"}
                </p>
                <p className="mt-0.5 text-sm text-brand-100/80">
                  {isPublicAuthEnabled
                    ? "The same Google button creates or opens your account."
                    : "Public Google access is temporarily unavailable."}
                </p>
              </div>
            </li>
            <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-400/20 text-accent-200">
                <ArrowLeftRight className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold">Requestor and Runner</p>
                <p className="mt-0.5 text-sm text-brand-100/80">
                  Choose where to start, then switch workspaces when needed.
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-300/25 bg-accent-400/10 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-200" />
            <p className="text-sm leading-6 text-brand-50">
              Google confirms access to the email account. It is not identity
              verification or a ButuanGo safety guarantee.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Brand />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-white hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>

          <Link
            to="/"
            className="mb-8 hidden w-fit items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700 lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-700">
            {isPublicAuthEnabled
              ? "Get started or continue"
              : "Private development"}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {isPublicAuthEnabled ? (
              <>
                Continue to Butuan<span className="text-brand-600">Go</span>
              </>
            ) : (
              "Public access is not open yet"
            )}
          </h2>
          <p className="mt-3 leading-6 text-slate-600">
            {isPublicAuthEnabled
              ? "Use your Google account. New users complete a short profile setup before entering the marketplace."
              : "ButuanGo is currently being prepared and validated before public beta testing begins."}
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-7">
            {isPublicAuthEnabled && googleUnavailable && (
              <div className="mb-5">
                <ConfigurationNotice />
              </div>
            )}
            {isPublicAuthEnabled && formError && (
              <Alert variant="destructive" className="mb-5">
                {formError}
              </Alert>
            )}

            {isPublicAuthEnabled ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  disabled={googleUnavailable || signingIn}
                  onClick={handleGoogleSignIn}
                >
                  {signingIn ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  {signingIn ? "Opening Google…" : "Continue with Google"}
                </Button>

                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                  By continuing, you will be asked to accept the{" "}
                  <Link to="/terms" className="font-semibold text-brand-700">
                    Terms
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="font-semibold text-brand-700">
                    Privacy Notice
                  </Link>
                  , and{" "}
                  <Link to="/safety" className="font-semibold text-brand-700">
                    Safety guidance
                  </Link>{" "}
                  during first-time setup.
                </p>
              </>
            ) : (
              <>
                <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                  <LockKeyhole className="h-5 w-5" />
                  <div>
                    <p className="font-bold">Google access is hidden</p>
                    <p className="mt-1 text-sm leading-6">
                      Account access will be opened when ButuanGo is ready to
                      invite public beta testers.
                    </p>
                  </div>
                </Alert>

                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                  You can review the current{" "}
                  <Link to="/terms" className="font-semibold text-brand-700">
                    Terms
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="font-semibold text-brand-700">
                    Privacy Notice
                  </Link>
                  , and{" "}
                  <Link to="/safety" className="font-semibold text-brand-700">
                    Safety guidance
                  </Link>{" "}
                  while public access is closed.
                </p>
              </>
            )}
          </div>

          <p className="mt-7 text-center text-sm leading-6 text-slate-500">
            {isPublicAuthEnabled
              ? "ButuanGo does not receive or store your Google password."
              : "No public account-access button is available in this production release."}
          </p>
        </div>
      </section>
    </main>
  );
}
