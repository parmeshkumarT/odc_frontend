import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Notifications from "../../components/Notifications";

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        vendors: null,
        odcs: null,
        pendingODCs: null,
        expiringCertificates: null,
        failedValidations: null
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            setLoadingStats(true);

            let vendorsCount = null;
            let odcCount = null;
            let pendingODCsResult = null;
            let expiring = null;
            let failed = null;

            try {
                const { count } = await supabase.from("vendors").select("*", { count: "exact", head: true });
                vendorsCount = count ?? null;
            } catch {
                vendorsCount = null;
            }

            try {
                const { count } = await supabase.from("odc_locations").select("*", { count: "exact", head: true });
                odcCount = count ?? null;
            } catch {
                odcCount = null;
            }

            try {
                const { data } = await supabase
                    .from("odc_locations")
                    .select("id, status")
                    .or("status.is.null,status.eq.pending");
                pendingODCsResult = data?.length ?? null;
            } catch {
                pendingODCsResult = null;
            }

            try {
                const { data } = await supabase
                    .from("certificate_instances")
                    .select("id, period_end")
                    .gte("period_end", new Date().toISOString())
                    .lte("period_end", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
                expiring = data?.length ?? null;
            } catch {
                expiring = null;
            }

            // NOTE: table field is `validation_status` in your schema elsewhere.
            // Keep this defensive so dashboard doesn't crash if column differs.
            try {
                const { data } = await supabase
                    .from("validation_results")
                    .select("id, validation_status")
                    .eq("validation_status", "failed");
                failed = data?.length ?? null;
            } catch {
                failed = null;
            }

            setStats({
                vendors: vendorsCount ?? null,
                odcs: odcCount ?? null,
                pendingODCs: pendingODCsResult,
                expiringCertificates: expiring,
                failedValidations: failed
            });
            setLoadingStats(false);
        };

        loadStats();
    }, []);

    return (
        <div style={{ padding: "24px" }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Super Admin Dashboard</h1>
            <p style={{ marginBottom: 24, color: "#555" }}>
                Welcome, {user?.email}. You have full control over ODC risk, vendors and compliance flows.
            </p>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                    marginBottom: 24
                }}
            >
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Platform Overview</h2>
                    <p style={cardBodyStyle}>
                        High-level status of vendors, ODCs and certificates across the system.
                    </p>
                    <ul style={{ paddingLeft: 18, margin: 0, color: "#555", fontSize: 14 }}>
                        <li>
                            Total vendors onboarded:{" "}
                            {loadingStats || stats.vendors === null ? "—" : stats.vendors}
                        </li>
                        <li>
                            Active ODCs &amp; locations:{" "}
                            {loadingStats || stats.odcs === null ? "—" : stats.odcs}
                        </li>
                        <li>
                            Certificates expiring in the next 30 days:{" "}
                            {loadingStats || stats.expiringCertificates === null
                                ? "—"
                                : stats.expiringCertificates}
                        </li>
                    </ul>
                </div>

                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Risk &amp; Compliance</h2>
                    <p style={cardBodyStyle}>
                        Monitor risk posture based on OCR + AI validation and manual review outcomes.
                    </p>
                    <ul style={{ paddingLeft: 18, margin: 0, color: "#555", fontSize: 14 }}>
                        <li>
                            Failed certificate validations:{" "}
                            {loadingStats || stats.failedValidations === null
                                ? "—"
                                : stats.failedValidations}
                        </li>
                        <li>Vendors with overdue remediation</li>
                        <li>ODCs with missing mandatory certificates</li>
                    </ul>
                </div>

                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Work Queues</h2>
                    <p style={cardBodyStyle}>
                        Track open actions that require super admin oversight.
                    </p>
                    <ul style={{ paddingLeft: 18, margin: 0, color: "#555", fontSize: 14 }}>
                        <li>
                            Pending ODC registrations:{" "}
                            {loadingStats || stats.pendingODCs === null
                                ? "—"
                                : stats.pendingODCs > 0 ? (
                                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                                        {stats.pendingODCs} pending
                                    </span>
                                ) : (
                                    "0"
                                )}
                        </li>
                        <li>New vendor registrations to approve</li>
                        <li>Escalated audit findings</li>
                    </ul>
                </div>

                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>System Activity</h2>
                    <p style={cardBodyStyle}>
                        Recent high-value events from `audit_logs` and certificate workflows.
                    </p>
                    <ul style={{ paddingLeft: 18, margin: 0, color: "#555", fontSize: 14 }}>
                        <li>Latest uploads and OCR runs</li>
                        <li>Role or permission changes</li>
                        <li>Auditor decisions and overrides</li>
                    </ul>
                </div>
            </div>

            {/* Notifications Section */}
            <div style={{ marginBottom: 24 }}>
                <Notifications />
            </div>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    marginTop: 8
                }}
            >
                <button
                    style={primaryButtonStyle}
                    onClick={() => navigate("/admin/vendors")}
                >
                    Manage Vendors
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/admin/certificates/types")}
                >
                    Configure Certificate Types
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/admin/odc")}
                >
                    {stats.pendingODCs > 0 ? (
                        <>Review ODCs ({stats.pendingODCs} pending)</>
                    ) : (
                        "Manage ODCs"
                    )}
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/admin/logs")}
                >
                    View Audit Logs
                </button>
            </div>
        </div>
    );
}

const cardStyle = {
    background: "#fff",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb"
};

const cardTitleStyle = {
    fontSize: 18,
    marginBottom: 8
};

const cardBodyStyle = {
    marginBottom: 8,
    color: "#4b5563",
    fontSize: 14
};

const baseButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer"
};

const primaryButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: "#111827",
    color: "#fff"
};

const secondaryButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: "#f9fafb",
    color: "#111827",
    borderColor: "#e5e7eb"
};