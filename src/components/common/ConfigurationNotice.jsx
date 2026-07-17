import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isDemoMode } from "@/lib/supabase";

export function ConfigurationNotice() {
  if (isDemoMode) {
    return (
      <Alert>
        <AlertTitle>Local interface demo</AlertTitle>
        <AlertDescription>
          Supabase is currently disabled. Accounts and profile changes are saved
          only in this browser.
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
