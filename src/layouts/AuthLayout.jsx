import React from "react";

export default function AuthLayout({ children }) {
    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 420, padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
                {children}
            </div>
        </div>
    );
}
