import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function ODCDashboard() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const navigate = useNavigate();

    const [odc, setOdc] = useState(null);
    const [stats, setStats] = useState({
        totalCertificates: null,
        pendingValidation: null,
        passedValidation: null,
        failedValidation: null,
        expiringCertificates: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!profile?.odc_id) {
            setLoading(false);
            return;
        }

        loadDashboardData();
    }, [profile?.odc_id]);

    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load ODC details
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location, address, status")
                .eq("id", profile.odc_id)
                .single();

            if (odcError) {
                console.error("Error loading ODC", odcError);
                setError("Failed to load ODC information");
                setLoading(false);
                return;
            }

            setOdc(odcData);

            // Load certificate statistics
            const { data: certData, error: certError } = await supabase
                .from("certificate_instances")
                .select("id, status, period_end")
                .eq("odc_id", profile.odc_id);

            if (certError) {
                console.error("Error loading certificates", certError);
            } else {
                const certs = certData || [];
                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                const pendingValidation = certs.filter(c => c.status === "pending").length;
                const passedValidation = certs.filter(c => c.status === "approved" || c.status === "passed").length;
                const failedValidation = certs.filter(c => c.status === "failed" || c.status === "rejected").length;
                const expiringCertificates = certs.filter(c => 
                    c.period_end && 
                    new Date(c.period_end) >= now && 
                    new Date(c.period_end) <= thirtyDaysFromNow
                ).length;

                setStats({
                    totalCertificates: certs.length,
                    pendingValidation,
                    passedValidation,
                    failedValidation,
                    expiringCertificates
                });
            }
        } catch (err) {
            console.error("Error loading dashboard data", err);
            setError("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    if (!profile?.odc_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>ODC Dashboard</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is not linked to an ODC. Please contact your vendor administrator.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>ODC Dashboard</h1>
                <p style={{ color: "#b91c1c" }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>ODC Dashboard</h1>
            <p style={{ marginBottom: 24, color: "#555" }}>
                Welcome, {user?.email}. Manage certificates for <strong>{odc?.name}</strong> - {odc?.location}
            </p>

            {/* Stats Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 24
                }}
            >
                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Total Certificates</h3>
                    <p style={statValueStyle}>
                        {stats.totalCertificates ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Pending Validation</h3>
                    <p style={{ ...statValueStyle, color: "#f59e0b" }}>
                        {stats.pendingValidation ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Passed</h3>
                    <p style={{ ...statValueStyle, color: "#16a34a" }}>
                        {stats.passedValidation ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Failed</h3>
                    <p style={{ ...statValueStyle, color: "#b91c1c" }}>
                        {stats.failedValidation ?? 0}
                    </p>
                </div>

                <div style={cardStyle}>
                    <h3 style={statTitleStyle}>Expiring Soon</h3>
                    <p style={{ ...statValueStyle, color: stats.expiringCertificates > 0 ? "#b91c1c" : "#111827" }}>
                        {stats.expiringCertificates ?? 0}
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
                <button
                    style={primaryButtonStyle}
                    onClick={() => navigate("/odc/upload")}
                >
                    Upload Certificate
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/odc/certificates")}
                >
                    View All Certificates
                </button>
            </div>

            {/* ODC Information */}
            <div style={cardStyle}>
                <h2 style={cardTitleStyle}>ODC Information</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                    <div>
                        <label style={labelStyle}>ODC Name</label>
                        <p style={valueStyle}>{odc?.name}</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Location</label>
                        <p style={valueStyle}>{odc?.location}</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Status</label>
                        <p style={valueStyle}>
                            <span
                                style={{
                                    padding: "4px 12px",
                                    borderRadius: 12,
                                    backgroundColor: odc?.status === "approved" ? "#d1fae5" : "#fef3c7",
                                    color: odc?.status === "approved" ? "#065f46" : "#92400e",
                                    fontSize: 12,
                                    fontWeight: 500
                                }}
                            >
                                {(odc?.status || "pending").toUpperCase()}
                            </span>
                        </p>
                    </div>
                </div>
                {odc?.address && (
                    <div style={{ marginTop: 16 }}>
                        <label style={labelStyle}>Address</label>
                        <p style={valueStyle}>{odc.address}</p>
                    </div>
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

const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
    marginBottom: 4
};

const valueStyle = {
    fontSize: 14,
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
    marginRight: 12
};

const secondaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#111827"
};
