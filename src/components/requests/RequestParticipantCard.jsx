import { CalendarDays, Phone, ShieldAlert, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/requestUtils";
import { ParticipantTrustPanel } from "./ParticipantTrustPanel";

function initials(name) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function RequestParticipantCard({
  participant,
  type,
  acceptedAt = null,
  requestId = null,
}) {
  const isRunner = type === "runner";
  const title = isRunner ? "Assigned Runner" : "Requestor";

  if (!participant) {
    return (
      <Card className="border-dashed">
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-5 pt-3 sm:p-6 sm:pt-3">
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="font-semibold text-slate-800">
              Waiting for a Runner
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Runner information will appear here after someone accepts this
              request.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-3 sm:p-6 sm:pt-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {participant.avatar_url && (
              <AvatarImage
                src={participant.avatar_url}
                alt={`${participant.full_name} avatar`}
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback>{initials(participant.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">
              {participant.full_name}
            </p>
            <Badge className="mt-1 capitalize">{type}</Badge>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
          {participant.phone_number ? (
            <a
              href={`tel:${participant.phone_number}`}
              className="flex min-w-0 items-start gap-2 font-semibold text-brand-700 hover:underline"
            >
              <Phone className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-all">{participant.phone_number}</span>
            </a>
          ) : (
            <p className="flex items-start gap-2 text-slate-500">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" />
              <span>No account phone provided</span>
            </p>
          )}
          <p className="flex items-start gap-2 text-slate-600">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Member since{" "}
              {formatDateTime(participant.member_since, "Unknown")}
            </span>
          </p>
          {isRunner && acceptedAt && (
            <p className="text-xs text-slate-500">
              Accepted this request {formatDateTime(acceptedAt, "")}
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Profile information is user-provided. Identity verification is not
            available in this milestone.
          </p>
        </div>

        {requestId && (
          <ParticipantTrustPanel
            requestId={requestId}
            participant={participant}
            type={type}
          />
        )}
      </CardContent>
    </Card>
  );
}
