import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { useUserRole } from "../hooks/useUserRole";

export default function AuditorLayout({ children }) {
    const role = useUserRole();
    // Treat anything except explicit "auditor" as client menu (hides dashboard).
    // This also prevents the client briefly seeing auditor menu while role loads.
    const sidebarRole = role === "auditor" ? "auditor" : "client";

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar role={sidebarRole} />
            <div style={{ flex: 1 }}>
                <Topbar />
                <main style={{ padding: 20 }}>{children}</main>
            </div>
        </div>
    );
}
