import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const loadProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (error) {
                console.error("Error loading profile", error);
                setProfile(null);
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error("Error loading profile", err);
            setProfile(null);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let listenerSubscription = null;

        const initAuth = async () => {
            try {
                // Initial session check
                const { data, error } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (error) {
                    console.error("Error getting session:", error);
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                } else {
                    const sessionUser = data.session?.user || null;
                    setUser(sessionUser);
                    setLoading(false);
                    if (sessionUser) {
                        await loadProfile(sessionUser.id);
                    } else {
                        setProfile(null);
                    }
                }

                // Subscribe to auth changes
                const { data: sub, error: subError } = supabase.auth.onAuthStateChange(
                    async (_event, session) => {
                        if (!isMounted) return;
                        try {
                            const nextUser = session?.user || null;
                            setUser(nextUser);
                            setLoading(false);
                            if (nextUser) {
                                await loadProfile(nextUser.id);
                            } else {
                                setProfile(null);
                            }
                        } catch (err) {
                            console.error("Error in auth state change handler:", err);
                            setLoading(false);
                        }
                    }
                );

                if (subError) {
                    console.error("Error setting up auth listener:", subError);
                    setLoading(false);
                }

                listenerSubscription = sub?.subscription || null;
            } catch (err) {
                if (!isMounted) return;
                console.error("Unexpected auth error:", err);
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        };

        initAuth();

        return () => {
            isMounted = false;
            try {
                if (listenerSubscription && typeof listenerSubscription.unsubscribe === "function") {
                    listenerSubscription.unsubscribe();
                }
            } catch (err) {
                console.warn("Failed to unsubscribe auth listener", err);
            }
        };
    }, []);

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Error signing out", error);
                alert("Failed to sign out: " + error.message);
                return;
            }

            // Clear user and profile state
            setUser(null);
            setProfile(null);

            // Redirect to login page
            window.location.href = "/login";
        } catch (err) {
            console.error("Error signing out", err);
            alert("An unexpected error occurred during sign out");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, profile, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
