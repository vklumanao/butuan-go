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
  { id: "requests-and-locations", title: "Requests and precise locations" },
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
      lastUpdated="July 18, 2026"
      readingTime="5 min"
      sections={PRIVACY_SECTIONS}
    >
      <LegalSection
        id="information-collected"
        title="Information we collect"
        icon={UserRound}
      >
        <p>
          Registration uses your full name, email address, phone number,
          password, and initial role selection. Your profile also stores your
          current Requestor or Runner mode, account dates, and an optional
          avatar reference.
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
          The registration role is retained as account history. Switching the
          active mode changes the workspace and permissions currently in use;
          it does not create a second account or make private records public.
        </p>
      </LegalSection>

      <LegalSection
        id="requests-and-locations"
        title="Requests and precise locations"
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
      </LegalSection>

      <LegalSection
        id="authentication-and-notifications"
        title="Authentication and notifications"
        icon={Bell}
      >
        <p>
          Supabase Authentication handles account credentials and session
          management. Passwords are not stored in the public profiles table and
          are not displayed to other users through the application.
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
          ButuanGo stores expense estimates and service-fee amounts entered for
          an errand. It does not currently collect card numbers, bank
          credentials, wallet access, payment account data, or confirmation of
          the cash that changes hands.
        </p>
        <p>
          Requestors and Runners settle directly in person. Amounts displayed in
          the app are workflow records and estimates, not proof that payment was
          made.
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
            Demo mode is currently enabled. Demo accounts, including their demo
            passwords, are stored only in this browser's local storage. Use
            fictional information and clear the browser storage after testing.
          </p>
        ) : (
          <p>
            Demo mode is not currently enabled. If a development build enables
            it later, demo accounts and demo passwords will exist only in that
            browser's local storage and must use fictional information.
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
