import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AuditorDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        pendingReview: null,
        passedCertificates: null,
        failedCertificates: null,
        totalVendors: null,
        totalODCs: null
    });
    const [loading, setLoading] = useState(true);
    const [recentCertificates, setRecentCertificates] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);

        try {
            // Pending certificates count (avoid using `.catch` on query builder)
            let pendingCerts = null;
            try {
                const { count } = await supabase
                    .from("certificate_instances")
                    .select("*", { count: "exact", head: true })
                    .eq("status", "pending");
                pendingCerts = count ?? 0;
            } catch {
                pendingCerts = null;
            }

            // Load validation results
            const { data: validationData, error: validationError } = await supabase
                .from("validation_results")
                .select("id, upload_id, validation_status, overall_score")
                .order("created_at", { ascending: false })
                .limit(100);

            if (!validationError && validationData) {
                const passed = validationData.filter(v => v.validation_status === "passed").length;
                const failed = validationData.filter(v => v.validation_status === "failed").length;

                setStats({
                    pendingReview: pendingCerts,
                    passedCertificates: passed,
                    failedCertificates: failed,
                    totalVendors: null,
                    totalODCs: null
                });

                // Load recent certificates with validation results for review
                const uploadIds = validationData.map(v => v.upload_id).filter(Boolean);
                if (uploadIds.length > 0) {
                    const { data: uploadsData } = await supabase
                        .from("uploads")
                        .select(`
                            id,
                            created_at,
                            certificate_instance_id,
                            certificate_instances!inner(
                                id,
                                certificate_type_id,
                                odc_id,
                                vendor_id,
                                status,
                                certificate_types(name),
                                odc_locations(name, location),
                                vendors(name)
                            )
                        `)
                        .in("id", uploadIds.slice(0, 10))
                        .order("created_at", { ascending: false });

                    if (uploadsData) {
                        setRecentCertificates(uploadsData.slice(0, 5));
                    }
                }
            }

            // Load vendor and ODC counts
            const [{ count: vendorsCount }, { count: odcCount }] = await Promise.all([
                supabase.from("vendors").select("*", { count: "exact", head: true }),
                supabase.from("odc_locations").select("*", { count: "exact", head: true })
            ]);

            setStats(prev => ({
                ...prev,
                totalVendors: vendorsCount ?? null,
                totalODCs: odcCount ?? null
            }));
        } catch (err) {
            console.error("Error loading dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Auditor Dashboard</h1>
            <p style={{ marginBottom: 24, color: "#555" }}>
                Welcome, {user?.email}. Review and validate certificates across all vendors and ODCs.
            </p>

            {/* Stats Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 24
                }}
            >
                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Pending Review</h3>
                    <p style={{ ...statValueStyle, color: "#f59e0b" }}>
                        {loading ? "—" : stats.pendingReview ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Passed</h3>
                    <p style={{ ...statValueStyle, color: "#16a34a" }}>
                        {loading ? "—" : stats.passedCertificates ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Failed</h3>
                    <p style={{ ...statValueStyle, color: "#b91c1c" }}>
                        {loading ? "—" : stats.failedCertificates ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Total Vendors</h3>
                    <p style={statValueStyle}>
                        {loading ? "—" : stats.totalVendors ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Total ODCs</h3>
                    <p style={statValueStyle}>
                        {loading ? "—" : stats.totalODCs ?? 0}
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
                <button
                    style={primaryButtonStyle}
                    onClick={() => navigate("/auditor/vendors")}
                >
                    Review Vendors & Certificates
                </button>
            </div>

            {/* Recent Certificates for Review */}
            {recentCertificates.length > 0 && (
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Recent Certificates for Review</h2>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>Certificate</th>
                                <th style={{ padding: "12px 8px" }}>Vendor</th>
                                <th style={{ padding: "12px 8px" }}>ODC</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Uploaded</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentCertificates.map((upload, index) => {
                                const cert = upload.certificate_instances;
                                
                                return (
                                    <tr
                                        key={upload.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                            {cert?.certificate_types?.name || "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {cert?.vendors?.name || "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {cert?.odc_locations?.name || "—"} ({cert?.odc_locations?.location || ""})
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: cert?.status === "pending" ? "#fef3c7" : cert?.status === "approved" ? "#d1fae5" : "#fee2e2",
                                                    color: cert?.status === "pending" ? "#92400e" : cert?.status === "approved" ? "#065f46" : "#991b1b",
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {(cert?.status || "pending").toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280", fontSize: 13 }}>
                                            {upload.created_at 
                                                ? new Date(upload.created_at).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/auditor/review/${cert?.id}`)}
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
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
    marginBottom: 16,
    marginTop: 0
};

const statTitleStyle = {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 0,
    fontWeight: 500
};

const statValueStyle = {
    fontSize: 32,
    fontWeight: 600,
    color: "#111827",
    margin: 0
};

const primaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#111827",
    color: "#fff",
    fontWeight: 500
};

const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "underline",
    padding: 0
};
