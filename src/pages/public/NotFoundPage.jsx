import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div>
        <MapPinOff className="mx-auto h-14 w-14 text-brand-600" />
        <p className="mt-5 font-bold text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-black">We couldn’t find that page</h1>
        <p className="mt-3 text-slate-600">
          The address may be incorrect or the page may have moved.
        </p>
        <Button asChild className="mt-7">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
