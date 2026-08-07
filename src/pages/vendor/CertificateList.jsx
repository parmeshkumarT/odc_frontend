import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function CertificateList() {
    const { id: odcId } = useParams();
    const { profile, loading: profileLoading } = useProfile();
    const navigate = useNavigate();
    const [certificates, setCertificates] = useState([]);
    const [odc, setOdc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!profile?.vendor_id || !odcId) return;
        loadData();
    }, [profile?.vendor_id, odcId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load ODC details
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location")
                .eq("id", odcId)
                .eq("vendor_id", profile.vendor_id)
                .single();

            if (odcError) {
                setError("ODC not found");
                setLoading(false);
                return;
            }

            setOdc(odcData);

            // Load certificates with validation results
            const { data: certData, error: certError } = await supabase
                .from("certificate_instances")
                .select(`
                    id,
                    certificate_type_id,
                    period_start,
                    period_end,
                    status,
                    created_at,
                    upload_id,
                    certificate_types(name, category),
                    uploads(id),
                    validation_results(validation_status, overall_score, issues, created_at)
                `)
                .eq("odc_id", odcId)
                .order("created_at", { ascending: false });

            if (certError) {
                console.error("Error loading certificates", certError);
                setError("Failed to load certificates");
            } else {
                setCertificates(certData || []);
            }
        } catch (err) {
            console.error("Error loading data", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "approved":
            case "passed":
                return { bg: "#d1fae5", color: "#065f46" };
            case "failed":
            case "rejected":
                return { bg: "#fee2e2", color: "#991b1b" };
            case "pending":
                return { bg: "#fef3c7", color: "#92400e" };
            default:
                return { bg: "#f3f4f6", color: "#6b7280" };
        }
    };

    const getValidationStatus = (cert) => {
        const validation = cert.validation_results?.[0];
        if (!validation) {
            return { status: "pending", score: null, issues: null };
        }
        return {
            status: validation.validation_status || "pending",
            score: validation.overall_score,
            issues: validation.issues
        };
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
                    Your profile is not linked to a vendor.
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
                        {odc ? `${odc.name} - ${odc.location}` : "Loading..."}
                    </p>
                </div>
                <div>
                    <button
                        style={secondaryButtonStyle}
                        onClick={() => navigate(`/vendor/certificates/upload/${odcId}`)}
                    >
                        Upload New Certificate
                    </button>
                    <button
                        style={secondaryButtonStyle}
                        onClick={() => navigate("/vendor/certificates")}
                    >
                        Back to ODC List
                    </button>
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
                    <p style={{ color: "#6b7280" }}>Loading certificates...</p>
                </div>
            ) : certificates.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280", marginBottom: 16 }}>
                        No certificates uploaded for this ODC yet.
                    </p>
                    <button
                        style={primaryButtonStyle}
                        onClick={() => navigate(`/vendor/certificates/upload/${odcId}`)}
                    >
                        Upload First Certificate
                    </button>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>Certificate Type</th>
                                <th style={{ padding: "12px 8px" }}>Period</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Validation</th>
                                <th style={{ padding: "12px 8px" }}>Score</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map((cert, index) => {
                                const statusColors = getStatusColor(cert.status);
                                const validation = getValidationStatus(cert);
                                const validationColors = getStatusColor(validation.status);
                                
                                return (
                                    <tr
                                        key={cert.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                            {cert.certificate_types?.name || "Unknown"}
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                                            {cert.period_start && cert.period_end ? (
                                                <>
                                                    {new Date(cert.period_start).toLocaleDateString()} - {" "}
                                                    {new Date(cert.period_end).toLocaleDateString()}
                                                </>
                                            ) : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: statusColors.bg,
                                                    color: statusColors.color,
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {(cert.status || "pending").toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: validationColors.bg,
                                                    color: validationColors.color,
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {validation.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {validation.score !== null ? (
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: validation.score >= 80 ? "#16a34a" : 
                                                           validation.score >= 60 ? "#f59e0b" : "#b91c1c"
                                                }}>
                                                    {validation.score}/100
                                                </span>
                                            ) : (
                                                <span style={{ color: "#9ca3af" }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/vendor/certificates/view/${cert.id}`)}
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

const secondaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#111827",
    marginLeft: 8
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
