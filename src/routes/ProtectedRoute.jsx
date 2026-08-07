import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();
    const role = useUserRole();
    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : role;

    // While auth or role are loading
    if (loading || role === undefined) return <div>Loading...</div>;

    if (!user) return <Navigate to="/" replace />;

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        const normalizedAllowed = allowedRoles.map((r) =>
            typeof r === "string" ? r.trim().toLowerCase() : r
        );
        if (!normalizedAllowed.includes(normalizedRole)) {
            // Logged in but wrong role -> go back to root which will redirect correctly
            return <Navigate to="/" replace />;
        }
    }

    return children;
}


