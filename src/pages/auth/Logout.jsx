import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function Logout() {
    const { signOut } = useAuth();

    useEffect(() => {
        // Automatically sign out when this page is accessed
        signOut();
    }, [signOut]);

    return (
        <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            minHeight: "100vh",
            flexDirection: "column",
            gap: 16
        }}>
            <p style={{ fontSize: 16, color: "#6b7280" }}>Signing out...</p>
        </div>
    );
}

