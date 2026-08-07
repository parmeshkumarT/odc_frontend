import React from "react";
import { Link } from "react-router-dom";

const homeByRole = {
    admin: "/admin/dashboard",
    vendor: "/vendor/dashboard",
    auditor: "/auditor/dashboard",
    client: "/auditor/vendors"
};

export default function AppLogo({ role = "admin" }) {
    const homeTo = homeByRole[role] || "/";

    return (
        <Link
            to={homeTo}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: "#111827",
                padding: "8px 6px",
                borderRadius: 10
            }}
        >
            <svg width="34" height="34" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <defs>
                    <linearGradient id="odcGrad" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#111827" />
                        <stop offset="1" stopColor="#2563EB" />
                    </linearGradient>
                </defs>
                <path
                    d="M32 6C24 12 15 14 12 14v18c0 14 9 22 20 26 11-4 20-12 20-26V14c-3 0-12-2-20-8Z"
                    fill="url(#odcGrad)"
                />
                <path
                    d="M22 33.5 28.5 40l14.5-16"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.2 }}>ODC</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Compliance</div>
            </div>
        </Link>
    );
}

