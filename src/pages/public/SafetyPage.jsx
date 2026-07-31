import {
  Ban,
  ClipboardCheck,
  HandCoins,
  LockKeyhole,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/layout/LegalPageLayout";

const SAFETY_SECTIONS = [
  { id: "before-an-errand", title: "Before posting or accepting" },
  { id: "protect-information", title: "Protect personal information" },
  { id: "safe-meetups", title: "Plan a safer meetup" },
  { id: "payment-and-receipts", title: "Handle payment and receipts carefully" },
  { id: "appropriate-tasks", title: "Keep tasks appropriate" },
  { id: "changes-and-recovery", title: "Use cancellation and release responsibly" },
  { id: "unsafe-situations", title: "If something feels unsafe" },
  { id: "current-limitations", title: "Current safety limitations" },
];

export function SafetyPage() {
  return (
    <LegalPageLayout
      documentKey="safety"
      title="Community safety"
      description="Practical checks for safer local errands, clearer handoffs, and responsible in-person coordination."
      lastUpdated="July 31, 2026"
      readingTime="5 min"
      sections={SAFETY_SECTIONS}
    >
      <LegalSection
        id="before-an-errand"
        title="Before posting or accepting"
        icon={ClipboardCheck}
      >
        <p>
          Describe the task, general area, deadline, expected purchase cost, and
          service fee clearly. Do not place sensitive information in the public
          request description.
        </p>
        <p>
          Before accepting, a Runner should review the full estimate, distance,
          due time, payer, and payment arrangement. A cash advance is voluntary;
          accept it only when the displayed maximum is within your practical
          capacity and the task is lawful and understandable.
        </p>
      </LegalSection>

      <LegalSection
        id="protect-information"
        title="Protect personal information"
        icon={LockKeyhole}
      >
        <p>
          Never share passwords, one-time codes, PINs, bank credentials,
          government IDs, private documents, or account recovery links through
          an errand. Share only the contact and location details reasonably
          needed to complete the assigned task.
        </p>
      </LegalSection>

      <LegalSection
        id="safe-meetups"
        title="Plan a safer meetup"
        icon={MapPin}
      >
        <p>
          Prefer a well-lit, familiar, and publicly accessible handoff point.
          Confirm the meeting place and expected arrival time before traveling,
          and tell someone you trust where you are going when appropriate.
        </p>
        <p>
          Check the participant name shown on the assigned request before
          handing over an item or money. Do not proceed when the person, place,
          or requested activity does not match the task.
        </p>
      </LegalSection>

      <LegalSection
        id="payment-and-receipts"
        title="Handle payment and receipts carefully"
        icon={HandCoins}
      >
        <p>
          The selected Requestor or recipient pays the Runner directly in
          person. Review the payment arrangement, payer, item, official receipt,
          actual expense, and agreed service fee together before settling.
        </p>
        <p>
          A Runner should accept a cash advance only voluntarily and only up to
          the displayed maximum. If the price becomes higher, submit the new
          limit in the task and wait for the Requestor's approval before buying;
          after approval, confirm the revised limit first. Upload only the
          relevant official receipt, avoid including unrelated personal or
          banking information, avoid carrying unnecessary cash, and remember
          that ButuanGo does not provide escrow, refunds, payment guarantees, or
          guaranteed dispute outcomes or fund recovery.
        </p>
        <p>
          The Requestor should share the six-digit handoff code only when the
          correct person and delivery are present and the selected payer is
          ready to review settlement. Do not post the code publicly or send it
          to an unrelated person. The Runner should verify it in the assigned
          task and record only the amount actually received; the Requestor
          separately confirms settlement at completion.
        </p>
      </LegalSection>

      <LegalSection
        id="appropriate-tasks"
        title="Keep tasks appropriate"
        icon={Ban}
      >
        <p>
          Use the platform only for simple, lawful, everyday errands.
          Government transactions and requests involving dangerous, regulated,
          stolen, fraudulent, or prohibited items are outside the platform.
        </p>
        <p>
          Do not use a request to harass, deceive, impersonate, monitor, or
          pressure another person. A user may refuse an arrangement that appears
          materially different from the posted task.
        </p>
      </LegalSection>

      <LegalSection
        id="changes-and-recovery"
        title="Use cancellation and release responsibly"
        icon={RefreshCw}
      >
        <p>
          Before work starts, a Requestor may cancel an eligible request and an
          assigned Runner may release an accepted task by providing a reason.
          Use these recovery actions promptly so the other participant is not
          left waiting or spending money unnecessarily.
        </p>
        <p>
          Once work is in progress, do not rely on pre-start recovery controls.
          Participants should stop and prioritize safety if continuing would be
          unlawful or dangerous.
        </p>
        <p>
          If a handoff cannot be completed, the Runner should choose the most
          accurate failed-delivery reason and describe only relevant facts. A
          participant may open a dispute when the recorded facts or settlement
          are contested. Do not include passwords, banking credentials, or
          unrelated private information in either record.
        </p>
        <p>
          Use the private safety-report control for harassment, impersonation,
          spam, or unsafe participant behavior. Blocking prevents future
          matching with that account but does not cancel the current request.
          Ratings and activity summaries provide context only; they are not
          proof of identity, safety, or fault.
        </p>
        <p>
          Admins can restrict new activity or place an account into read-only
          suspension or permanent-ban status after recording a reason. The app
          does not delete transaction history through these controls. Affected
          users can still review existing records and submit a relevant dispute
          or private safety report; these tools are not emergency assistance or
          a guaranteed appeal process.
        </p>
      </LegalSection>

      <LegalSection
        id="unsafe-situations"
        title="If something feels unsafe"
        icon={TriangleAlert}
      >
        <p>
          Do not continue merely to complete a status step. Move to a safe
          location, stop sharing information, and contact local emergency
          services or a trusted person when immediate help is needed.
        </p>
        <p>
          ButuanGo is not an emergency service and does not currently provide
          live monitoring or an in-app incident response team.
        </p>
      </LegalSection>

      <LegalSection
        id="current-limitations"
        title="Current safety limitations"
        icon={ShieldCheck}
      >
        <p>
          This milestone does not provide identity verification, background
          checks, insurance, guarantees, emergency monitoring, location
          tracking, or a staffed dispute-response team. The app can preserve a
          dispute or private safety report and an authorized Admin can record
          an outcome, but review is not guaranteed and is not emergency or
          legal assistance. A profile, role label, rating, activity summary, or
          task assignment is not proof that a participant has been verified.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
