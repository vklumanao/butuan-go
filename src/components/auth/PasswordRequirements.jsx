import { CheckCircle2, Circle, CircleX } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "@/validation/passwordRules";

export function PasswordRequirements({ id, password }) {
  if (!password) return null;

  return (
    <div
      id={id}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
      aria-live="polite"
    >
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        Password requirements
      </p>
      <ul className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const complete = requirement.test(password);
          return (
            <li
              key={requirement.id}
              className={`flex items-center gap-2 font-semibold ${
                complete ? "text-brand-700" : "text-slate-500"
              }`}
            >
              {complete ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="h-4 w-4 shrink-0 text-slate-300"
                  aria-hidden="true"
                />
              )}
              <span>
                <span className="sr-only">
                  {complete ? "Completed: " : "Not completed: "}
                </span>
                {requirement.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PasswordMatchIndicator({ id, password, confirmPassword }) {
  if (!confirmPassword) return null;

  const matches = password === confirmPassword;
  return (
    <p
      id={id}
      className={`flex items-center gap-2 text-xs font-semibold ${
        matches ? "text-brand-700" : "text-red-600"
      }`}
      aria-live="polite"
    >
      {matches ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CircleX className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {matches ? "Passwords match" : "Passwords do not match yet"}
    </p>
  );
}
