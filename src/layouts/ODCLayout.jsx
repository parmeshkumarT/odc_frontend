import React from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function ODCLayout({ children }) {
    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar role="odc" />
            <div style={{ flex: 1 }}>
                <Topbar />
                <main style={{ padding: 20 }}>{children}</main>
            </div>
        </div>
    );
}
