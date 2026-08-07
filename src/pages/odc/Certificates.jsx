import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function ODCCertificates() {
    const { profile } = useProfile();
    const navigate = useNavigate();
    const [certificates, setCertificates] = useState([]);
    const [certificateTypes, setCertificateTypes] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("all"); // all, pending, passed, failed

    useEffect(() => {
        if (!profile?.odc_id) return;
        loadCertificates();
    }, [profile?.odc_id]);

    const loadCertificates = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load all certificates for this ODC
            const { data: certData, error: certError } = await supabase
                .from("certificate_instances")
                .select("id, certificate_type_id, period_start, period_end, status, created_at, upload_id")
                .eq("odc_id", profile.odc_id)
                .order("created_at", { ascending: false });

            if (certError) {
                console.error("Error loading certificates", certError);
                setError("Failed to load certificates: " + (certError.message || "Unknown error"));
                setLoading(false);
                return;
            }

            setCertificates(certData || []);

            // Load certificate type names
            const certTypeIds = [...new Set((certData || []).map(c => c.certificate_type_id))];
            if (certTypeIds.length > 0) {
                const { data: typeData, error: typeError } = await supabase
                    .from("certificate_types")
                    .select("id, name")
                    .in("id", certTypeIds);

                if (!typeError && typeData) {
                    const typeMap = {};
                    typeData.forEach(type => {
                        typeMap[type.id] = type.name;
                    });
                    setCertificateTypes(typeMap);
                }
            }
        } catch (err) {
            console.error("Error loading certificates", err);
            setError("Failed to load certificates");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "approved":
            case "passed":
                return { color: "#16a34a", bg: "#d1fae5", text: "PASSED" };
            case "pending":
                return { color: "#f59e0b", bg: "#fef3c7", text: "PENDING" };
            case "failed":
            case "rejected":
                return { color: "#b91c1c", bg: "#fee2e2", text: "FAILED" };
            default:
                return { color: "#6b7280", bg: "#f3f4f6", text: status?.toUpperCase() || "UNKNOWN" };
        }
    };

    const filteredCertificates = filter === "all" 
        ? certificates 
        : certificates.filter(cert => {
            if (filter === "pending") return cert.status === "pending";
            if (filter === "passed") return cert.status === "approved" || cert.status === "passed";
            if (filter === "failed") return cert.status === "failed" || cert.status === "rejected";
            return true;
        });

    if (!profile?.odc_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Certificates</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is not linked to an ODC. Please contact your vendor administrator.
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
                        View and manage certificates for your ODC.
                    </p>
                </div>
                <button
                    style={primaryButtonStyle}
                    onClick={() => navigate("/odc/upload")}
                >
                    Upload New Certificate
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

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "all" ? "#111827" : "#fff",
                        color: filter === "all" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("all")}
                >
                    All ({certificates.length})
                </button>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "pending" ? "#111827" : "#fff",
                        color: filter === "pending" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("pending")}
                >
                    Pending
                </button>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "passed" ? "#111827" : "#fff",
                        color: filter === "passed" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("passed")}
                >
                    Passed
                </button>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "failed" ? "#111827" : "#fff",
                        color: filter === "failed" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("failed")}
                >
                    Failed
                </button>
            </div>

            {loading ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>Loading certificates...</p>
                </div>
            ) : filteredCertificates.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>
                        {filter === "all" 
                            ? "No certificates found. Upload your first certificate to get started."
                            : `No ${filter} certificates found.`}
                    </p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>Certificate Type</th>
                                <th style={{ padding: "12px 8px" }}>Period Start</th>
                                <th style={{ padding: "12px 8px" }}>Period End</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Uploaded</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCertificates.map((cert, index) => {
                                const statusInfo = getStatusColor(cert.status);
                                
                                return (
                                    <tr
                                        key={cert.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                            {certificateTypes[cert.certificate_type_id] || "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {cert.period_start 
                                                ? new Date(cert.period_start).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {cert.period_end 
                                                ? new Date(cert.period_end).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: statusInfo.bg,
                                                    color: statusInfo.color,
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {statusInfo.text}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280", fontSize: 13 }}>
                                            {cert.created_at 
                                                ? new Date(cert.created_at).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/odc/certificates/${cert.id}`)}
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

const filterButtonStyle = {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500
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

