import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function ODCDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useProfile();
    const [odc, setOdc] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Wait for profile to finish loading before proceeding
        if (profileLoading) {
            return;
        }

        // If profile is loaded but vendor_id is missing, show error
        if (!id) {
            setError("ODC ID is missing");
            setLoading(false);
            return;
        }

        if (!profile?.vendor_id) {
            setError("Your profile is not linked to a vendor. Please contact the administrator.");
            setLoading(false);
            return;
        }

        const loadODCDetails = async () => {
            setLoading(true);
            setError(null);

            try {
                // Load ODC details
                const { data: odcData, error: odcError } = await supabase
                    .from("odc_locations")
                    .select("id, name, location, address, status, vendor_id, created_at")
                    .eq("id", id)
                    .eq("vendor_id", profile.vendor_id)
                    .single();

                if (odcError) {
                    console.error("Error loading ODC", odcError);
                    setError("ODC not found or you don't have access to it.");
                    setLoading(false);
                    return;
                }

                setOdc(odcData);

                // Load certificates for this ODC
                const { data: certData, error: certError } = await supabase
                    .from("certificate_instances")
                    .select("id, certificate_type_id, period_start, period_end, status, created_at")
                    .eq("odc_id", id)
                    .order("created_at", { ascending: false });

                if (certError) {
                    console.error("Error loading certificates", certError);
                } else {
                    setCertificates(certData || []);
                }
            } catch (err) {
                console.error("Error loading data", err);
                setError("Failed to load ODC details");
            } finally {
                setLoading(false);
            }
        };

        loadODCDetails();
    }, [id, profile?.vendor_id, profileLoading]);


    if (profileLoading || loading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading ODC details...</p>
            </div>
        );
    }

    if (error || !odc) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>ODC Details</h1>
                <p style={{ color: "#b91c1c" }}>{error || "ODC not found"}</p>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/vendor/odc")}
                >
                    Back to ODC List
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>{odc.name}</h1>
                    <p style={{ color: "#555", margin: 0 }}>ODC Details and Certificate Management</p>
                </div>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/vendor/odc")}
                >
                    Back to List
                </button>
            </div>

            {/* ODC Information */}
            <div style={cardStyle}>
                <h2 style={cardTitleStyle}>ODC Information</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                    <div>
                        <label style={labelStyle}>ODC Name</label>
                        <p style={valueStyle}>{odc.name}</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Location</label>
                        <p style={valueStyle}>{odc.location}</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Status</label>
                        <p style={valueStyle}>
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
                        </p>
                    </div>
                    <div>
                        <label style={labelStyle}>Registered</label>
                        <p style={valueStyle}>
                            {odc.created_at 
                                ? new Date(odc.created_at).toLocaleDateString()
                                : "—"}
                        </p>
                    </div>
                </div>
                {odc.address && (
                    <div style={{ marginTop: 16 }}>
                        <label style={labelStyle}>Address</label>
                        <p style={valueStyle}>{odc.address}</p>
                    </div>
                )}
            </div>

            {/* Certificates */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
                <h2 style={cardTitleStyle}>Certificates ({certificates.length})</h2>
                {certificates.length === 0 ? (
                    <p style={{ color: "#6b7280" }}>
                        No certificates uploaded for this ODC yet.
                    </p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>Period Start</th>
                                <th style={{ padding: "12px 8px" }}>Period End</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Uploaded</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map((cert, index) => (
                                <tr
                                    key={cert.id}
                                    style={{
                                        borderBottom: "1px solid #f3f4f6",
                                        backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                    }}
                                >
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
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                backgroundColor: cert.status === "approved" ? "#d1fae5" : "#fee2e2",
                                                color: cert.status === "approved" ? "#065f46" : "#991b1b",
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        >
                                            {cert.status || "pending"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 8px", color: "#6b7280", fontSize: 13 }}>
                                        {cert.created_at 
                                            ? new Date(cert.created_at).toLocaleDateString()
                                            : "—"}
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

const cardStyle = {
    background: "#fff",
    borderRadius: 8,
    padding: 20,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb"
};

const cardTitleStyle = {
    fontSize: 18,
    marginBottom: 16,
    marginTop: 0
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

const secondaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#111827",
    fontWeight: 500
};

