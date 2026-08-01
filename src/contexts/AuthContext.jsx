import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase, isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { getDemoSession, subscribeToDemoAuth } from "@/services/demoService";
import { signInWithGoogle, signOutUser } from "@/services/authService";
import { getProfile, switchProfileActiveRole } from "@/services/profileService";
import { devLog } from "@/lib/errors";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const activeUserId = useRef(null);
  const profileRef = useRef(null);
  const profileRequestRef = useRef(null);

  const loadProfile = useCallback(async (userId, force = false) => {
    if (!userId) {
      activeUserId.current = null;
      profileRef.current = null;
      setProfile(null);
      setProfileError(null);
      return null;
    }
    if (!force && activeUserId.current === userId && profileRef.current)
      return profileRef.current;
    if (!force && profileRequestRef.current?.userId === userId)
      return profileRequestRef.current.promise;
    const request = getProfile(userId);
    profileRequestRef.current = { userId, promise: request };
    const { data, error } = await request;
    if (profileRequestRef.current?.promise === request)
      profileRequestRef.current = null;
    if (error) {
      devLog("Profile retrieval failed", error);
      activeUserId.current = null;
      profileRef.current = null;
      setProfile(null);
      setProfileError(
        error.code === "PGRST116"
          ? "Your account profile is missing. Please contact support."
          : "We could not load your profile. Please try again.",
      );
      return null;
    }
    activeUserId.current = userId;
    profileRef.current = data;
    setProfile(data);
    setProfileError(null);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;
    function applySession(nextSession) {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        activeUserId.current = null;
        profileRef.current = null;
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      } else {
        loadProfile(nextSession.user.id).finally(
          () => mounted && setLoading(false),
        );
      }
    }

    if (isDemoMode) {
      applySession(getDemoSession());
      const unsubscribe = subscribeToDemoAuth(applySession);
      return () => {
        mounted = false;
        unsubscribe();
      };
    }

    async function initialize() {
      if (!isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) devLog("Session retrieval failed", error);
      const currentSession = data?.session || null;
      setSession(currentSession);
      if (currentSession?.user) await loadProfile(currentSession.user.id);
      if (mounted) setLoading(false);
    }
    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setTimeout(() => applySession(nextSession), 0);
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(
    () =>
      session?.user
        ? loadProfile(session.user.id, true)
        : Promise.resolve(null),
    [session, loadProfile],
  );
  const switchRole = useCallback(
    async (role) => {
      if (!session?.user)
        return { data: null, error: { message: "Authentication is required" } };
      const result = await switchProfileActiveRole(session.user.id, role);
      if (result.error) return result;
      const refreshedProfile = await loadProfile(session.user.id, true);
      return { data: refreshedProfile || result.data, error: null };
    },
    [session, loadProfile],
  );
  const value = useMemo(
    () => ({
      user: session?.user || null,
      profile,
      session,
      loading,
      profileError,
      signInWithGoogle,
      signOut: signOutUser,
      refreshProfile,
      switchRole,
    }),
    [session, profile, loading, profileError, refreshProfile, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
