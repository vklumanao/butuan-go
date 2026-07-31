import {
  Bell,
  HandCoins,
  HardDrive,
  LockKeyhole,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/layout/LegalPageLayout";
import { isDemoMode } from "@/lib/supabase";

const PRIVACY_SECTIONS = [
  { id: "information-collected", title: "Information we collect" },
  { id: "how-information-is-used", title: "How information is used" },
  { id: "requests-and-locations", title: "Requests and location privacy" },
  { id: "authentication-and-notifications", title: "Authentication and notifications" },
  { id: "payment-information", title: "Payment information" },
  { id: "browser-and-demo-data", title: "Browser storage and demo mode" },
  { id: "choices-and-limitations", title: "Your choices and current limitations" },
];

export function PrivacyPage() {
  return (
    <LegalPageLayout
      documentKey="privacy"
      title="Privacy notice"
      description="A plain-language explanation of the information ButuanGo uses, where it is visible, and the controls available in this development milestone."
      lastUpdated="July 31, 2026"
      readingTime="5 min"
      sections={PRIVACY_SECTIONS}
    >
      <LegalSection
        id="information-collected"
        title="Information we collect"
        icon={UserRound}
      >
        <p>
          Google provides the name, email address, and optional avatar associated
          with the account you select. During ButuanGo onboarding, you provide a
          phone number, choose an initial Requestor or Runner workspace, and
          acknowledge the current Terms, Privacy Notice, and Safety guidance.
          Your profile stores those account details, acceptance records, signup
          method, current workspace, and account dates.
        </p>
        <p>
          When you use marketplace features, the platform stores request
          details, estimated costs, agreed service fees, status history,
          participant assignments, saved addresses, location snapshots, and
          notification records needed to operate the workflow.
        </p>
      </LegalSection>

      <LegalSection
        id="how-information-is-used"
        title="How information is used"
        icon={Pencil}
      >
        <p>
          Information is used to create and secure accounts, display the
          correct workspace, publish and manage lawful errands, coordinate
          assigned participants, preserve request history, and show relevant
          notifications.
        </p>
        <p>
          The initial onboarding role is retained as account history. Switching the
          active mode changes the workspace and permissions currently in use;
          it does not create a second account or make private records public.
        </p>
      </LegalSection>

      <LegalSection
        id="requests-and-locations"
        title="Requests and location privacy"
        icon={MapPin}
      >
        <p>
          Open requests expose only the general information needed for a Runner
          to evaluate an errand. Exact pickup or delivery details and private
          participant summaries are restricted to the Requestor and the
          assigned Runner through database access controls.
        </p>
        <p>
          Both Requestor and Runner modes may maintain private saved address
          templates. A Requestor can select an address while creating a request;
          the platform copies a location snapshot into that request so later
          edits to the saved template do not silently change an existing task.
          A Runner's saved addresses are not automatically shared with a
          Requestor or attached to a task.
        </p>
        <p>
          A Requestor may optionally select a public request area using device
          location, a submitted place search, or the map. The browser coarsens
          the selected coordinates before sending them to ButuanGo, and Runners
          see only a shaded approximate area and distance range before
          acceptance. ButuanGo does not store a Runner's device position.
        </p>
        <p>
          Map rendering and place search use configured third-party services.
          Those providers receive ordinary network information needed to show
          the visible map area or process the submitted search words. Do not
          enter a private home address, contact detail, or other sensitive
          information into the public place-search field.
        </p>
      </LegalSection>

      <LegalSection
        id="authentication-and-notifications"
        title="Authentication and notifications"
        icon={Bell}
      >
        <p>
          Supabase Authentication handles the Google sign-in session. Google
          manages the selected account credential and recovery methods;
          ButuanGo does not receive or store your Google password. The Google
          account confirms control of an email identity but is not identity
          verification.
        </p>
        <p>
          In-app notifications store the recipient, related request, message,
          type, creation time, and read state. They are available only to the
          authenticated recipient under the current database policies.
        </p>
      </LegalSection>

      <LegalSection
        id="payment-information"
        title="Payment information"
        icon={HandCoins}
      >
        <p>
          ButuanGo stores expense estimates, service-fee amounts, the selected
          payment arrangement and payer type, and any Runner cash-advance
          consent amount and timestamp. If a recipient will pay or a merchant
          order is prepaid, private payer contact or order-reference details may
          also be stored for the participants.
        </p>
        <p>
          When an in-progress cash-advance price changes, ButuanGo stores the
          old and proposed limits, the Runner's reason, the Requestor's decision
          and optional response, and their timestamps. Purchase receipt files
          and their file name, type, size, amount, note, and uploader are stored
          privately. They are available only to the owning Requestor and
          assigned Runner under the current database and Storage policies.
        </p>
        <p>
          After work starts, ButuanGo stores a private handoff code and its
          attempt and verification state. Only the owning Requestor can retrieve
          the current code; the assigned Runner can submit a code for
          verification but cannot retrieve it. The platform also stores the
          calculated settlement amount and each participant's separate
          confirmation and timestamp.
        </p>
        <p>
          Failed-delivery reports, Requestor acknowledgements, disputes,
          dispute outcomes, and temporary account restrictions may be retained
          with their reasons, descriptions, involved accounts, and timestamps.
          The participants can view the records relevant to their shared
          request. Authorized Admin accounts can review a limited operations
          directory containing account name, email, roles, onboarding state,
          request participation counts, and active restriction state. They can
          also review disputes, record outcomes or restrictions, and view the
          resulting Admin audit events through protected backend functions.
          The Admin request directory intentionally excludes exact private
          pickup and delivery addresses.
        </p>
        <p>
          After a completed request, participants may submit one transaction
          rating. Assigned participants can see a limited aggregate trust
          summary, including rating count and request outcome counts. Rating
          comments are retained with the related request but are not published
          as a public review feed. A user-created block is private and affects
          future matching only.
        </p>
        <p>
          Safety reports store the reporter, reported account, related request,
          category, factual description, review outcome, and timestamps. The
          reported account cannot read the private report record. Authorized
          Admin accounts can review it, record an outcome, and apply a
          temporary restriction. Reports and ratings must not contain
          passwords, banking credentials, government ID images, or unrelated
          personal information.
        </p>
        <p>
          ButuanGo does not collect card numbers, bank credentials, wallet
          access, or payment account data. Participants settle directly in
          person. The app records what each participant confirms, but it cannot
          independently prove that cash changed hands; displayed amounts,
          consent, approval, receipt, handoff, and settlement records are not a
          payment guarantee. Avoid including unrelated personal, banking, or
          account information in a receipt image, failure report, dispute, or
          note.
        </p>
      </LegalSection>

      <LegalSection
        id="browser-and-demo-data"
        title="Browser storage and demo mode"
        icon={HardDrive}
      >
        <p>
          The application uses browser storage for necessary interface settings
          and session persistence, such as keeping you signed in and remembering
          the sidebar state on the same device. Avoid using a shared device, and
          sign out when finished.
        </p>
        {isDemoMode ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            Demo mode is currently enabled, so Google authentication is
            unavailable. Legacy browser-only demo data may remain in local
            storage; use fictional information and clear that storage after
            testing.
          </p>
        ) : (
          <p>
            Demo mode is not currently enabled. Google sign-in and sessions are
            handled through the configured Supabase project.
          </p>
        )}
      </LegalSection>

      <LegalSection
        id="choices-and-limitations"
        title="Your choices and current limitations"
        icon={LockKeyhole}
      >
        <p>
          You may update your full name and phone number, switch between the
          Requestor and Runner workspace, manage your own saved addresses, mark
          notifications as read, and sign out of your session. Database rules
          prevent ordinary users from updating another person's profile or
          directly assigning themselves a protected role.
        </p>
        <p>
          Self-service account deletion, data export, formal privacy-request
          intake, retention schedules, and a production privacy contact are not
          yet implemented. Do not use real sensitive data until those processes
          and final policies are ready.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
