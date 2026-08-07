import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// Derive the current user's role from the profile table
export const useUserRole = () => {
    const { user, loading } = useAuth();
    const [role, setRole] = useState(null);
    const [roleLoading, setRoleLoading] = useState(true);

    const normalizeRole = (value) => {
        if (typeof value !== "string") return value;
        const r = value.trim().toLowerCase();
        return r || null;
    };

    useEffect(() => {
        if (loading) {
            setRoleLoading(true);
            return;
        }

        if (!user) {
            setRole(null);
            setRoleLoading(false);
            return;
        }

        const fetchRole = async () => {
            setRoleLoading(true);

            try {
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("user_id", user.id)
                    .single();

                if (error) {
                    console.error("Error loading profile role", error);
                    setRole(null);
                } else if (profile?.role) {
                    setRole(normalizeRole(profile.role));
                } else {
                    console.warn("Profile exists but has no role assigned");
                    setRole(null);
                }
            } catch (err) {
                console.error("Error fetching role from profile", err);
                setRole(null);
            } finally {
                setRoleLoading(false);
            }
        };

        fetchRole();
    }, [user, loading]);

    // While auth/profile role are loading return `undefined` so callers can
    // distinguish between "still loading" (undefined) and "no role set"
    // (null).
    if (loading || roleLoading) return undefined;

    return normalizeRole(role);
};

