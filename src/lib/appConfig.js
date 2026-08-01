const publicAuthSetting = import.meta.env.VITE_PUBLIC_AUTH_ENABLED;

export const isPublicAuthEnabled = publicAuthSetting
  ? publicAuthSetting === "true"
  : import.meta.env.MODE === "development";
