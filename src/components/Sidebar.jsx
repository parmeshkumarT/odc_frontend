import React from "react";
import { Link } from "react-router-dom";
import AppLogo from "./AppLogo";

const linksByRole = {
    admin: [
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/vendors", label: "Vendors" },
        { to: "/admin/odc", label: "ODCs" },
        { to: "/admin/certificates/types", label: "Certificate Types" },
        { to: "/admin/logs", label: "Audit Logs" }
    ],
    vendor: [
        { to: "/vendor/odc", label: "ODCs" },
        { to: "/vendor/certificates", label: "Certificates" },
        { to: "/vendor/users", label: "Users" }
    ],
    auditor: [
        { to: "/auditor/dashboard", label: "Dashboard" },
        { to: "/auditor/vendors", label: "Vendors" }
    ],
    client: [
        { to: "/auditor/vendors", label: "Vendors" }
    ]
};

export default function Sidebar({ role = "admin" }) {
    const links = linksByRole[role] || [];
    return (
        <aside style={{ width: 240, borderRight: "1px solid #eee", padding: 16 }}>
            <div style={{ marginBottom: 14 }}>
                <AppLogo role={role} />
            </div>
            <nav>
                {links.map((l) => (
                    <div key={l.to} style={{ margin: "10px 0" }}>
                        <Link to={l.to} style={{ textDecoration: "none" }}>{l.label}</Link>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
