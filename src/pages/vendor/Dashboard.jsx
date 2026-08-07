import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function VendorDashboard() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalODCs: null,
        approvedODCs: null,
        pendingODCs: null,
        totalCertificates: null,
        expiringCertificates: null,
        highRiskODCs: null,
        pendingValidation: null,
        passedValidation: null,
        failedValidation: null
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [recentODCs, setRecentODCs] = useState([]);
    const [loadingODCs, setLoadingODCs] = useState(true);

    useEffect(() => {
        if (!profile?.vendor_id) {
            console.warn("Profile or vendor_id missing:", profile);
            return;
        }

        console.log("Loading dashboard data for vendor_id:", profile.vendor_id);

        const loadDashboardData = async () => {
            setLoadingStats(true);
            setLoadingODCs(true);

            try {
                // Get all ODCs for this vendor
                const { data: odcs, error: odcError } = await supabase
                    .from("odc_locations")
                    .select("id, name, location, address, status, created_at")
                    .eq("vendor_id", profile.vendor_id)
                    .order("created_at", { ascending: false });

                if (odcError) {
                    console.error("Error loading ODCs", odcError);
                    console.error("Vendor ID being used:", profile.vendor_id);
                }

                const odcList = odcs || [];
                console.log("Loaded ODCs for vendor:", odcList.length, odcList);
                
                // Count ODCs by status
                const approvedODCs = odcList.filter(odc => odc.status === "approved" || !odc.status).length;
                const pendingODCs = odcList.filter(odc => odc.status === "pending").length;

                // Get certificate counts with validation status (by odc_id to avoid missing vendor_id)
                const odcIds = odcList.map((o) => o.id);
                const { data: certificates, error: certError } = odcIds.length === 0
                    ? { data: [], error: null }
                    : await supabase
                        .from("certificate_instances")
                        .select(`
                            id, 
                            period_end, 
                            odc_id, 
                            status,
                            upload_id,
                            validation_results(validation_status, overall_score)
                        `)
                        .in("odc_id", odcIds);

                if (certError) {
                    console.error("Error loading certificates", certError);
                }

                const certList = certificates || [];
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                const expiringCertificates = certList.filter(
                    cert => cert.period_end && 
                    new Date(cert.period_end) >= now && 
                    new Date(cert.period_end) <= thirtyDaysFromNow
                ).length;

                // Calculate validation statistics
                const pendingValidation = certList.filter(cert => {
                    const validation = cert.validation_results?.[0];
                    return !validation || validation.validation_status === "pending";
                }).length;

                const passedValidation = certList.filter(cert => {
                    const validation = cert.validation_results?.[0];
                    return validation && validation.validation_status === "passed";
                }).length;

                const failedValidation = certList.filter(cert => {
                    const validation = cert.validation_results?.[0];
                    return validation && validation.validation_status === "failed";
                }).length;

                // Calculate risk levels (placeholder - you may need to adjust based on your risk calculation logic)
                // For now, we'll consider ODCs with missing/expired certificates as high risk
                const highRiskODCs = odcList.filter(odc => {
                    // This is a placeholder - adjust based on your actual risk calculation
                    const odcCerts = certList.filter(c => c.odc_id === odc.id);
                    return odcCerts.length === 0 || odcCerts.some(c => 
                        c.period_end && new Date(c.period_end) < now
                    );
                }).length;

                setStats({
                    totalODCs: odcList.length,
                    approvedODCs,
                    pendingODCs,
                    totalCertificates: certList.length,
                    expiringCertificates,
                    highRiskODCs,
                    pendingValidation,
                    passedValidation,
                    failedValidation
                });

                // Set recent ODCs (last 5)
                setRecentODCs(odcList.slice(0, 5));
            } catch (error) {
                console.error("Error loading dashboard data", error);
            } finally {
                setLoadingStats(false);
                setLoadingODCs(false);
            }
        };

        loadDashboardData();
    }, [profile?.vendor_id]);

    const getRiskLevel = (odc) => {
        // Placeholder risk calculation - adjust based on your logic
        // You might want to calculate this based on certificate status, expiration, etc.
        return "Medium"; // Default for now
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "approved":
                return "#16a34a";
            case "pending":
                return "#f59e0b";
            case "rejected":
                return "#b91c1c";
            default:
                return "#6b7280";
        }
    };

    // Wait for profile to finish loading
    if (loadingStats && !profile) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading profile...</p>
            </div>
        );
    }

    if (!profile?.vendor_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 28, marginBottom: 8 }}>Vendor Dashboard</h1>
                <p style={{ color: "#b91c1c", marginBottom: 16 }}>
                    Your profile is not linked to a vendor. Please contact the administrator.
                </p>
                <div style={{ 
                    padding: 16, 
                    backgroundColor: "#f3f4f6", 
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#6b7280"
                }}>
                    <p style={{ margin: 0, marginBottom: 8, fontWeight: 500 }}>Debug Information:</p>
                    <pre style={{ 
                        margin: 0, 
                        fontSize: 12, 
                        overflow: "auto",
                        backgroundColor: "#fff",
                        padding: 12,
                        borderRadius: 4
                    }}>
                        {JSON.stringify({ 
                            profile: profile ? { 
                                id: profile.id, 
                                role: profile.role, 
                                vendor_id: profile.vendor_id,
                                user_id: profile.user_id 
                            } : null,
                            user: user ? { id: user.id, email: user.email } : null
                        }, null, 2)}
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Vendor Dashboard</h1>
            <p style={{ marginBottom: 24, color: "#555" }}>
                Welcome, {user?.email}. Manage your ODCs and track compliance status.
            </p>

            {/* Stats Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 16,
                    marginBottom: 24
                }}
            >
                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Total ODCs</h3>
                    <p style={statValueStyle}>
                        {loadingStats ? "—" : stats.totalODCs ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Approved ODCs</h3>
                    <p style={{ ...statValueStyle, color: "#16a34a" }}>
                        {loadingStats ? "—" : stats.approvedODCs ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Pending Approval</h3>
                    <p style={{ ...statValueStyle, color: "#f59e0b" }}>
                        {loadingStats ? "—" : stats.pendingODCs ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Total Certificates</h3>
                    <p style={statValueStyle}>
                        {loadingStats ? "—" : stats.totalCertificates ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Expiring Soon</h3>
                    <p style={{ ...statValueStyle, color: stats.expiringCertificates > 0 ? "#b91c1c" : "#111827" }}>
                        {loadingStats ? "—" : stats.expiringCertificates ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>High Risk ODCs</h3>
                    <p style={{ ...statValueStyle, color: stats.highRiskODCs > 0 ? "#b91c1c" : "#111827" }}>
                        {loadingStats ? "—" : stats.highRiskODCs ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Pending Validation</h3>
                    <p style={{ ...statValueStyle, color: "#f59e0b" }}>
                        {loadingStats ? "—" : stats.pendingValidation ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Passed Validation</h3>
                    <p style={{ ...statValueStyle, color: "#16a34a" }}>
                        {loadingStats ? "—" : stats.passedValidation ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Failed Validation</h3>
                    <p style={{ ...statValueStyle, color: "#b91c1c" }}>
                        {loadingStats ? "—" : stats.failedValidation ?? 0}
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
                <button
                    style={primaryButtonStyle}
                    onClick={() => navigate("/vendor/odc/register")}
                >
                    Register New ODC
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/vendor/odc")}
                >
                    View All ODCs
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/vendor/certificates")}
                >
                    Manage Certificates
                </button>
            </div>

            {/* Recent ODCs */}
            <div style={cardStyle}>
                <h2 style={cardTitleStyle}>Recent ODCs</h2>
                {loadingODCs ? (
                    <p style={{ color: "#6b7280" }}>Loading...</p>
                ) : recentODCs.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>
                        No ODCs registered yet. Click "Register New ODC" to get started.
                    </p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "8px 4px" }}>ODC Name</th>
                                <th style={{ padding: "8px 4px" }}>Location</th>
                                <th style={{ padding: "8px 4px" }}>Status</th>
                                <th style={{ padding: "8px 4px" }}>Risk Level</th>
                                <th style={{ padding: "8px 4px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentODCs.map((odc) => (
                                <tr key={odc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "12px 4px" }}>{odc.name}</td>
                                    <td style={{ padding: "12px 4px" }}>{odc.location}</td>
                                    <td style={{ padding: "12px 4px" }}>
                                        <span
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                backgroundColor: getStatusColor(odc.status || "pending") + "20",
                                                color: getStatusColor(odc.status || "pending"),
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        >
                                            {(odc.status || "pending").toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 4px" }}>
                                        <span style={{ color: "#16a34a" }}>
                                            {getRiskLevel(odc)}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 4px" }}>
                                        <button
                                            style={{
                                                ...linkButtonStyle,
                                                marginRight: 8
                                            }}
                                            onClick={() => navigate(`/vendor/odc/${odc.id}`)}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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

const baseButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer",
    marginRight: 12
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

const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "underline",
    padding: 0
};
