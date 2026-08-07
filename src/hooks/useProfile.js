import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// Fetch the current user's profile row from public.profiles
export const useProfile = () => {
    const { user, loading, profile: authProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            setProfile(null);
            setProfileLoading(false);
            return;
        }


        // If AuthContext already loaded the profile, use it to avoid a
        // duplicate fetch and potential race that can hang loading state.
        if (authProfile) {
            setProfile(authProfile);
            setProfileLoading(false);
            return;
        }

        const fetchProfile = async () => {
            setProfileLoading(true);
            setError(null);

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (error) {
                    console.error("Error loading profile", error);
                    setError(error);
                    setProfile(null);
                } else {
                    console.log("useProfile: fetched profile", data);
                    setProfile(data);
                }
            } catch (err) {
                console.error("Unexpected error fetching profile", err);
                setError(err);
                setProfile(null);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, [user, loading, authProfile]);

    return { profile, loading: profileLoading || loading, error };
};


