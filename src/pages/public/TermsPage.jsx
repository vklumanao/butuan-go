import {
  Ban,
  ClipboardCheck,
  HandCoins,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/layout/LegalPageLayout";

const TERMS_SECTIONS = [
  { id: "using-butuango", title: "Using this milestone" },
  { id: "accounts-and-modes", title: "Accounts and active modes" },
  { id: "request-workflow", title: "Request workflow" },
  { id: "in-person-settlement", title: "Direct in-person settlement" },
  { id: "cancellation-and-release", title: "Cancellation and Runner release" },
  { id: "acceptable-use", title: "Acceptable use" },
  {
    id: "responsibility-and-limitations",
    title: "Responsibility and limitations",
  },
  {
    id: "changes-and-production-readiness",
    title: "Changes and production readiness",
  },
];

export function TermsPage() {
  return (
    <LegalPageLayout
      documentKey="terms"
      title="Terms of use"
      description="The current rules, responsibilities, and limitations for using the ButuanGo development milestone."
      lastUpdated="July 31, 2026"
      readingTime="6 min"
      sections={TERMS_SECTIONS}
    >
      <LegalSection
        id="using-butuango"
        title="Using this milestone"
        icon={Scale}
      >
        <p>
          By creating an account and using ButuanGo, you agree to use the
          interface only for lawful, everyday errands and to follow the rules
          described on this page and in the Community Safety guidance.
        </p>
        <p>
          This is a development milestone, not a complete commercial service. Do
          not use it for emergencies, high-value transactions, regulated
          activity, or situations that require professional guarantees.
        </p>
      </LegalSection>

      <LegalSection
        id="accounts-and-modes"
        title="Accounts and active modes"
        icon={UserRound}
      >
        <p>
          Provide accurate onboarding information, protect access to your Google
          account, and use only an account you are authorized to control. Google
          sign-in, profile information, and role labels are not identity
          verification.
        </p>
        <p>
          A new Google-authenticated user must complete ButuanGo onboarding and
          start as either Requestor or Runner. The user may later switch the
          active workspace between Requestor and Runner mode. The initial
          onboarding role remains part of the profile record, while the active
          mode determines which protected actions are currently available.
        </p>
        <p>
          Switching modes does not create a new identity, remove obligations
          from an existing task, bypass database permissions, or grant Admin
          access.
        </p>
      </LegalSection>

      <LegalSection
        id="request-workflow"
        title="Request workflow"
        icon={ClipboardCheck}
      >
        <p>
          Requestors are responsible for describing a task, location needs,
          deadline, expense estimate, and service fee honestly. Runners are
          responsible for reviewing those details before accepting.
        </p>
        <p>
          Only one Runner may be assigned to an open request. Status actions
          record acceptance, start, completion submission, and Requestor
          confirmation. Users must not manipulate a status to misrepresent work
          that did not occur.
        </p>
      </LegalSection>

      <LegalSection
        id="in-person-settlement"
        title="Direct in-person settlement"
        icon={HandCoins}
      >
        <p>
          Each request identifies whether no purchase is needed, the merchant is
          prepaid, or the Runner is asked to advance personal money. It also
          identifies whether the Requestor or recipient will pay the Runner
          directly during meetup or delivery. ButuanGo does not collect, hold,
          transfer, guarantee, refund, or process funds.
        </p>
        <p>
          Displayed expense and fee amounts are estimates or user agreements,
          not platform charges or proof of payment. Participants are responsible
          for checking items, private receipt evidence, actual costs, and agreed
          changes before handing over money. If a Runner requests a higher
          cash-advance maximum after work starts, the Runner must wait for the
          Requestor's approval and then consent to the revised limit before
          buying above the original maximum.
        </p>
        <p>
          A Runner cash advance is voluntary. The Runner must review and consent
          to the displayed maximum before accepting or starting the task, and
          again after an approved increase. Recording consent, a price decision,
          or a receipt does not guarantee reimbursement.
        </p>
        <p>
          The Requestor should reveal the private handoff code only during the
          correct handoff. The Runner must verify it before confirming the
          direct amount received, and the Requestor separately confirms
          settlement when completing the request. Both users must record these
          confirmations truthfully. A confirmation is a participant statement,
          not independent proof or a platform payment guarantee.
        </p>
      </LegalSection>

      <LegalSection
        id="cancellation-and-release"
        title="Cancellation and Runner release"
        icon={RefreshCw}
      >
        <p>
          Before work starts, an eligible Requestor may cancel a request and an
          assigned Runner may release an accepted task. A meaningful reason is
          required, the action is recorded in request history, and the affected
          participant may receive a notification.
        </p>
        <p>
          These controls must not be used to harass another user, repeatedly
          reserve tasks without intent to complete them, or avoid responsibility
          after purchases or work have begun.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use" icon={Ban}>
        <p>
          Government transactions, prohibited goods, fraud, harassment,
          impersonation, unsafe activity, stolen property, dangerous materials,
          and requests that violate applicable rules are not allowed.
        </p>
        <p>
          Do not attempt to access another user's private profile, addresses,
          participant details, notifications, or role-protected actions. Do not
          interfere with platform security, database policies, or normal
          operation.
        </p>
        <p>
          Do not guess or share another request's handoff code, falsely report a
          failed delivery, submit a misleading dispute, fabricate evidence, or
          confirm a handoff or payment that did not occur.
        </p>
        <p>
          Ratings and safety reports must be based on a real shared request and
          relevant facts. Do not use them for retaliation, harassment,
          discrimination, fabricated allegations, or disclosure of unrelated
          personal information. Blocking prevents future matching but does not
          cancel existing responsibilities.
        </p>
        <p>
          An authorized Admin may restrict new marketplace activity, apply a
          temporary read-only suspension, permanently ban an account, or restore
          access after recording a reason. Suspension and permanent ban preserve
          transaction history and access to relevant dispute and safety-report
          records; they do not delete the Google or ButuanGo account. These
          controls are administrative safety measures, not legal findings.
        </p>
        <p>
          A user may request application-level account deletion only after
          unfinished requests and open review matters are resolved. The request
          pauses new marketplace commitments and has a seven-day cancellation
          period. Completion anonymizes reusable profile data but preserves a
          pseudonymous transaction, dispute, safety, audit, and authentication
          safety record. Account deletion cannot be used to erase obligations,
          evidence, reports, or an existing enforcement history.
        </p>
      </LegalSection>

      <LegalSection
        id="responsibility-and-limitations"
        title="Responsibility and limitations"
        icon={ShieldCheck}
      >
        <p>
          Users remain responsible for evaluating an errand, choosing a safe
          meetup, checking goods and receipts, agreeing on costs, protecting
          personal information, and complying with applicable requirements.
        </p>
        <p>
          This milestone does not provide online payment processing, escrow,
          refunds, identity verification, background checks, insurance,
          guarantees, emergency monitoring, or location tracking. It records
          participant disputes and safety reports and provides protected Admin
          resolution functions, but a rating, activity count, report, or Admin
          outcome is not identity verification or a guarantee of trust. The
          service does not yet provide a staffed support desk, guaranteed
          investigation, appeal process, or legal adjudication. Availability may
          be interrupted while development and testing continue.
        </p>
      </LegalSection>

      <LegalSection
        id="changes-and-production-readiness"
        title="Changes and production readiness"
        icon={Scale}
      >
        <p>
          Features and these milestone guidelines may change as the platform is
          developed. The displayed last-updated date should be reviewed whenever
          material behavior changes.
        </p>
        <p>
          Final eligibility rules, enforcement and suspension procedures,
          support contacts, dispute handling, governing terms, and versioned
          acceptance records must be established and professionally reviewed
          before production launch.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
