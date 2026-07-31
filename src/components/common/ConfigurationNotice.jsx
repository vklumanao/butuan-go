import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isDemoMode } from "@/lib/supabase";

export function ConfigurationNotice() {
  if (isDemoMode) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Google sign-in is unavailable in demo mode</AlertTitle>
        <AlertDescription>
          Set <code>VITE_DEMO_MODE=false</code>, configure Supabase, and enable
          its Google provider to authenticate.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Supabase configuration is missing</AlertTitle>
      <AlertDescription>
        Copy <code>.env.example</code> to <code>.env</code>, add your project
        URL and anon key, then restart the development server.
      </AlertDescription>
    </Alert>
  );
}
