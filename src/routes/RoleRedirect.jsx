import { Navigate } from "react-router-dom";
import { useUserRole } from "../hooks/useUserRole";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";

const RoleRedirect = () => {
    const role = useUserRole();
    const { profile, loading } = useProfile();
    const { user, loading: authLoading } = useAuth();
    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : role;

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const debug = params.get("debug") === "1" || params.get("debug") === "true";

    // Show loading while role or profile is being fetched. `useUserRole`
    // returns `undefined` while loading, and `null` when the user has no
    // role assigned. Treat `undefined` as loading and `null` as "no role".
    if (loading || normalizedRole === undefined) {
        if (debug) {
            return (
                <div style={{ padding: 12 }}>
                    <div style={{ marginBottom: 12, fontWeight: 600 }}>Loading (debug):</div>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                        {JSON.stringify({ user: user?.id || null, authLoading, profile, role: normalizedRole, loading }, null, 2)}
                    </pre>
                </div>
            );
        }

        return <p>Loading...</p>;
    }

    // If role is explicitly null (not just loading), show error
    if (normalizedRole === null) {
        return (
            <div style={{ padding: 24 }}>
                <h2>Role Not Assigned</h2>
                <p style={{ color: "#b91c1c" }}>
                    Your account does not have a role assigned. Please contact an administrator.
                </p>
                <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
                    Expected roles: super_admin, vendor_admin, auditor, client
                </p>
            </div>
        );
    }

    switch (normalizedRole) {
        case "super_admin":
            return <Navigate to="/admin/dashboard" replace />;
        case "vendor_admin":
            // Force first-time vendors to reset their password
            if (profile?.is_first_login) {
                return <Navigate to="/reset-password" replace />;
            }
            return <Navigate to="/vendor/dashboard" replace />;
        case "auditor":
            return <Navigate to="/auditor/dashboard" replace />;
        case "client":
            // Client users go to vendors list (logo = home)
            return <Navigate to="/auditor/vendors" replace />;
        default:
            return (
                <div style={{ padding: 24 }}>
                    <h2>Unknown Role</h2>
                    <p style={{ color: "#b91c1c" }}>
                        Your account has an unrecognized role: <strong>{String(role)}</strong>
                    </p>
                    <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
                        Please contact an administrator to fix your role assignment.
                    </p>
                </div>
            );
    }
};

export default RoleRedirect;