import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function ODCList() {
    const { profile, loading: profileLoading } = useProfile();
    const navigate = useNavigate();
    const [odcs, setOdcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [certificateCounts, setCertificateCounts] = useState({});

    useEffect(() => {
        if (!profile?.vendor_id) return;

        const loadODCs = async () => {
            setLoading(true);
            setError(null);

            try {
                // Load ODCs for this vendor
                const { data: odcData, error: odcError } = await supabase
                    .from("odc_locations")
                    .select("id, name, location, address, status, created_at")
                    .eq("vendor_id", profile.vendor_id)
                    .order("created_at", { ascending: false });

                if (odcError) {
                    console.error("Error loading ODCs", odcError);
                    console.error("Vendor ID being used:", profile.vendor_id);
                    setError("Failed to load ODCs: " + (odcError.message || "Unknown error"));
                    setLoading(false);
                    return;
                }

                console.log("Loaded ODCs for vendor:", odcData?.length || 0, odcData);
                setOdcs(odcData || []);

                // Load certificate counts and calculate risk for each ODC
                const { data: certData, error: certError } = await supabase
                    .from("certificate_instances")
                    .select("id, odc_id, period_end, status")
                    .eq("vendor_id", profile.vendor_id);

                if (certError) {
                    console.error("Error loading certificates", certError);
                } else {
                    // Calculate certificate counts and risk per ODC
                    const counts = {};
                    const now = new Date();
                    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                    (odcData || []).forEach(odc => {
                        const odcCerts = (certData || []).filter(c => c.odc_id === odc.id);
                        const validCerts = odcCerts.filter(c => 
                            c.period_end && new Date(c.period_end) > now && c.status !== "rejected"
                        );
                        const expiringCerts = odcCerts.filter(c => 
                            c.period_end && 
                            new Date(c.period_end) >= now && 
                            new Date(c.period_end) <= thirtyDaysFromNow
                        );
                        const expiredCerts = odcCerts.filter(c => 
                            c.period_end && new Date(c.period_end) <= now
                        );

                        counts[odc.id] = {
                            total: odcCerts.length,
                            valid: validCerts.length,
                            expiring: expiringCerts.length,
                            expired: expiredCerts.length
                        };
                    });

                    setCertificateCounts(counts);
                }
            } catch (err) {
                console.error("Error loading data", err);
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        loadODCs();
    }, [profile?.vendor_id]);

    const getRiskLevel = (odc) => {
        const counts = certificateCounts[odc.id] || { total: 0, expired: 0, expiring: 0 };
        
        if (counts.expired > 0) return { level: "High", color: "#b91c1c" };
        if (counts.expiring > 0) return { level: "Medium", color: "#f59e0b" };
        if (counts.total === 0) return { level: "High", color: "#b91c1c" };
        return { level: "Low", color: "#16a34a" };
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

    if (profileLoading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading profile...</p>
            </div>
        );
    }

    if (!profile?.vendor_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>ODC List</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is not linked to a vendor. Please contact the administrator.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>ODC Locations</h1>
                    <p style={{ color: "#555", margin: 0 }}>
                        Manage and monitor all ODCs registered under your vendor account.
                    </p>
                </div>
                <button
                    style={primaryButtonStyle}
                    onClick={() => navigate("/vendor/odc/register")}
                >
                    Register New ODC
                </button>
            </div>

            {error && (
                <div style={{ 
                    padding: 12, 
                    backgroundColor: "#fee2e2", 
                    color: "#b91c1c", 
                    borderRadius: 6, 
                    marginBottom: 16 
                }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>Loading ODCs...</p>
                </div>
            ) : odcs.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280", marginBottom: 16 }}>
                        No ODCs registered yet. Register your first ODC to get started.
                    </p>
                    <button
                        style={primaryButtonStyle}
                        onClick={() => navigate("/vendor/odc/register")}
                    >
                        Register New ODC
                    </button>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>ODC Name</th>
                                <th style={{ padding: "12px 8px" }}>Location</th>
                                <th style={{ padding: "12px 8px" }}>Address</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Certificates</th>
                                <th style={{ padding: "12px 8px" }}>Risk Level</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {odcs.map((odc, index) => {
                                const risk = getRiskLevel(odc);
                                const counts = certificateCounts[odc.id] || { total: 0, valid: 0, expiring: 0 };
                                
                                return (
                                    <tr 
                                        key={odc.id} 
                                        style={{ 
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                            {odc.name}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>{odc.location}</td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280", maxWidth: 300 }}>
                                            {odc.address || "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: getStatusColor(odc.status || "pending") + "20",
                                                    color: getStatusColor(odc.status || "pending"),
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {(odc.status || "pending").toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {counts.total > 0 ? (
                                                <span style={{ color: "#6b7280" }}>
                                                    {counts.valid} valid
                                                    {counts.expiring > 0 && ` / ${counts.expiring} expiring`}
                                                    {counts.expired > 0 && ` / ${counts.expired} expired`}
                                                </span>
                                            ) : (
                                                <span style={{ color: "#b91c1c" }}>No certificates</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span style={{ color: risk.color, fontWeight: 500 }}>
                                                {risk.level}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/vendor/odc/${odc.id}`)}
                                            >
                                                View Details
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

const primaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#111827",
    color: "#fff"
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

