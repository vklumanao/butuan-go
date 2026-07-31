export function getProfileAvatarUrl(profile, user = null) {
  const candidates = [
    profile?.avatar_url,
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
  ];

  return (
    candidates.find(
      (candidate) =>
        typeof candidate === "string" && candidate.trim().length > 0,
    )?.trim() || null
  );
}

export function getProfileInitials(name) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}
