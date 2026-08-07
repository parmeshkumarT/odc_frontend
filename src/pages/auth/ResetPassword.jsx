import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const ResetPassword = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!user) {
        // Should always be wrapped in ProtectedRoute, but guard just in case
        return <p className="p-4">You must be logged in to reset your password.</p>;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        // 1) Update auth password
        const { error: updateError } = await supabase.auth.updateUser({
            password
        });

        if (updateError) {
            console.error("Error updating password", updateError);
            setError(updateError.message || "Failed to update password");
            setLoading(false);
            return;
        }

        // 2) Mark profile as not first login anymore
        const { error: profileError } = await supabase
            .from("profiles")
            .update({ is_first_login: false })
            .eq("user_id", user.id);

        if (profileError) {
            console.error("Error updating profile after password reset", profileError);
            // Non-fatal for the user, but log it
        }

        setLoading(false);
        navigate("/vendor/dashboard", { replace: true });
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Set your password</h2>
                <p className="text-sm text-gray-600 mb-4">
                    This is your first time login as a vendor administrator. Please set a strong password
                    to use for future logins.
                </p>

                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="New password"
                        className="w-full border p-3 rounded-md mb-3"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm password"
                        className="w-full border p-3 rounded-md mb-4"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800"
                    >
                        {loading ? "Saving..." : "Save password"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;


