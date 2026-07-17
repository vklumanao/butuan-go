import { Link } from "react-router-dom";
import butuanGoLogo from "@/assets/images/butuango-logo.png";

export function Brand({ compact = false }) {
  return (
    <Link
      to="/"
      aria-label="ButuanGo home"
      className="inline-flex items-center gap-2.5 font-black tracking-tight text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <img src={butuanGoLogo} alt="" className="h-10 w-10 object-cover " />
      {!compact && (
        <span className="text-xl">
          Butuan<span className="text-brand-600">Go</span>
        </span>
      )}
    </Link>
  );
}
