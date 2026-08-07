import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function Certificates() {
    const { profile, loading: profileLoading } = useProfile();
    const navigate = useNavigate();
    const [odcs, setOdcs] = useState([]);
    const [certificateCounts, setCertificateCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!profile?.vendor_id) return;
        loadODCs();
    }, [profile?.vendor_id]);

    const loadODCs = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load all ODCs for this vendor (only approved ones)
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location, address, status, created_at")
                .eq("vendor_id", profile.vendor_id)
                .in("status", ["approved", null]) // Show approved ODCs or those without status
                .order("created_at", { ascending: false });

            if (odcError) {
                console.error("Error loading ODCs", odcError);
                setError("Failed to load ODCs: " + (odcError.message || "Unknown error"));
                setLoading(false);
                return;
            }

            setOdcs(odcData || []);

            // Load certificate counts for each ODC
            const odcIds = (odcData || []).map(odc => odc.id);
            if (odcIds.length > 0) {
                const { data: certData, error: certError } = await supabase
                    .from("certificate_instances")
                    .select("id, odc_id, period_end, status")
                    .in("odc_id", odcIds);

                if (!certError && certData) {
                    const counts = {};
                    const now = new Date();
                    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                    odcIds.forEach(odcId => {
                        const odcCerts = certData.filter(c => c.odc_id === odcId);
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

                        counts[odcId] = {
                            total: odcCerts.length,
                            valid: validCerts.length,
                            expiring: expiringCerts.length,
                            expired: expiredCerts.length
                        };
                    });

                    setCertificateCounts(counts);
                }
            }
        } catch (err) {
            console.error("Error loading ODCs", err);
            setError("Failed to load ODCs");
        } finally {
            setLoading(false);
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
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Certificates</h1>
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
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>Certificates</h1>
                    <p style={{ color: "#555", margin: 0 }}>
                        Select an ODC to upload and manage certificates.
                    </p>
                </div>
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
                    <p style={{ color: "#6b7280" }}>
                        No approved ODCs found. Please register and get approval for ODCs first.
                    </p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>ODC Name</th>
                                <th style={{ padding: "12px 8px" }}>Location</th>
                                <th style={{ padding: "12px 8px" }}>Certificates</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {odcs.map((odc, index) => {
                                const counts = certificateCounts[odc.id] || { total: 0, valid: 0, expiring: 0, expired: 0 };
                                
                                return (
                                    <tr
                                        key={odc.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb",
                                            cursor: "pointer"
                                        }}
                                        onClick={() => navigate(`/vendor/certificates/upload/${odc.id}`)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#fff" : "#f9fafb";
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                            {odc.name}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>{odc.location}</td>
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
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: counts.total === 0 ? "#fee2e2" : counts.expired > 0 ? "#fee2e2" : counts.expiring > 0 ? "#fef3c7" : "#d1fae5",
                                                    color: counts.total === 0 ? "#991b1b" : counts.expired > 0 ? "#991b1b" : counts.expiring > 0 ? "#92400e" : "#065f46",
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {counts.total === 0 ? "No Certificates" : counts.expired > 0 ? "Has Expired" : counts.expiring > 0 ? "Expiring Soon" : "Compliant"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    style={linkButtonStyle}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/vendor/certificates/list/${odc.id}`);
                                                    }}
                                                >
                                                    View Certificates
                                                </button>
                                                <span style={{ color: "#d1d5db" }}>|</span>
                                                <button
                                                    style={linkButtonStyle}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/vendor/certificates/upload/${odc.id}`);
                                                    }}
                                                >
                                                    Upload →
                                                </button>
                                            </div>
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

const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "underline",
    padding: 0
};
