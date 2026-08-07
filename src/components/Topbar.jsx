import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
    const { user, profile, signOut } = useAuth();
    
    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to logout?")) {
            await signOut();
        }
    };

    return (
        <header style={{ 
            height: 64, 
            borderBottom: "1px solid #e5e7eb", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            padding: "0 20px",
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
        }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
                Welcome, {profile?.full_name || user?.email || "User"}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {profile?.role && (
                    <div style={{ 
                        fontSize: 13, 
                        color: "#6b7280",
                        padding: "4px 12px",
                        borderRadius: 12,
                        backgroundColor: "#f3f4f6",
                        textTransform: "capitalize"
                    }}>
                        {profile.role.replace("_", " ")}
                    </div>
                )}
                <button 
                    onClick={handleLogout}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        backgroundColor: "#fff",
                        color: "#111827",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                        e.target.style.borderColor = "#9ca3af";
                    }}
                    onMouseOut={(e) => {
                        e.target.style.backgroundColor = "#fff";
                        e.target.style.borderColor = "#d1d5db";
                    }}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}
