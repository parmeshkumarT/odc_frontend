import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";
import { getDownloadUrl } from "../../utils/storageLinks";

export default function AuditorODCCertificates() {
    const { vendorId, odcId } = useParams();
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useProfile();

    const [vendor, setVendor] = useState(null);
    const [odc, setOdc] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openingId, setOpeningId] = useState(null);

    const canQuery = useMemo(() => {
        return Boolean(vendorId) && Boolean(odcId) && Boolean(profile?.client_id);
    }, [vendorId, odcId, profile?.client_id]);

    useEffect(() => {
        if (!canQuery) return;
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canQuery]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Vendor (scoped to client_id)
            const { data: vendorData, error: vendorError } = await supabase
                .from("vendors")
                .select("id, name, email, client_id")
                .eq("id", vendorId)
                .eq("client_id", profile.client_id)
                .single();

            if (vendorError || !vendorData) {
                setError("Vendor not found (or you don't have access).");
                return;
            }
            setVendor(vendorData);

            // ODC (must belong to the vendor)
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location, vendor_id")
                .eq("id", odcId)
                .eq("vendor_id", vendorId)
                .single();

            if (odcError || !odcData) {
                setError("ODC not found (or it doesn't belong to this vendor).");
                return;
            }
            setOdc(odcData);

            // Certificates for this ODC, including uploads and validation
            const { data: certData, error: certError } = await supabase
                .from("certificate_instances")
                .select(
                    `
                    id,
                    certificate_type_id,
                    period_start,
                    period_end,
                    status,
                    created_at,
                    upload_id,
                    certificate_types(name, category),
                    validation_results(validation_status, overall_score, issues, created_at)
                `
                )
                .eq("odc_id", odcId)
                .order("created_at", { ascending: false });

            if (certError) {
                console.error("Error loading certificates", certError);
                setError(`Failed to load certificates: ${certError.message || "Unknown error"}`);
                return;
            }

            const certs = certData || [];

            // Fetch uploads by upload_id (works even if foreign-key embedding isn't configured)
            const uploadIds = certs.map((c) => c.upload_id).filter(Boolean);
            const uploadsById = new Map();
            if (uploadIds.length > 0) {
                const { data: uploadRows, error: uploadErr } = await supabase
                    .from("uploads")
                    .select("id, file_url, file_type, created_at")
                    .in("id", uploadIds);

                if (uploadErr) {
                    console.error("Error loading uploads", uploadErr);
                    setError((prev) => prev || `Failed to load uploads: ${uploadErr.message || "Unknown error"}`);
                } else {
                    (uploadRows || []).forEach((u) => uploadsById.set(u.id, u));
                }
            }

            setCertificates(
                certs.map((c) => ({
                    ...c,
                    _upload: c.upload_id ? uploadsById.get(c.upload_id) || null : null
                }))
            );
        } catch (e) {
            console.error("Error loading ODC certificates", e);
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

    const getValidation = (cert) => {
        const v = cert.validation_results?.[0];
        if (!v) return { status: "pending", score: null };
        return { status: v.validation_status || "pending", score: v.overall_score };
    };

    const handleOpenFile = async (certId, upload) => {
        try {
            setOpeningId(certId);
            const url = await getDownloadUrl({ bucket: "certificates", fileUrlOrKey: upload?.file_url });
            if (!url) {
                alert("No file available for this certificate.");
                return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
            console.error("Failed to open file", e);
            alert(e?.message || "Failed to open file");
        } finally {
            setOpeningId(null);
        }
    };

    if (profileLoading) {
        return (
            <div style={{ padding: 24 }}>
                <p style={{ color: "#6b7280" }}>Loading profile...</p>
            </div>
        );
    }

    if (!profile?.client_id) {
        return (
            <div style={{ padding: 24 }}>
                <h1 style={{ fontSize: 24, marginBottom: 8 }}>Certificates</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is missing a <strong>client_id</strong>. Ask admin to set it on your profile.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, marginBottom: 6 }}>Uploaded Certificates</h1>
                    <p style={{ margin: 0, color: "#555" }}>
                        {vendor?.name ? `${vendor.name} • ` : ""}
                        {odc ? `${odc.name}${odc.location ? ` (${odc.location})` : ""}` : "Loading..."}
                    </p>
                </div>
                <div>
                    <button style={secondaryButtonStyle} onClick={() => navigate(`/auditor/vendors/${vendorId}`)}>
                        Back to ODCs
                    </button>
                </div>
            </div>

            {error && (
                <div
                    style={{
                        padding: 12,
                        backgroundColor: "#fee2e2",
                        color: "#b91c1c",
                        borderRadius: 6,
                        marginBottom: 16
                    }}
                >
                    {error}
                </div>
            )}

            {loading ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>Loading certificates...</p>
                </div>
            ) : certificates.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>No certificates uploaded for this ODC yet.</p>
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
                                <th style={{ padding: "12px 8px" }}>File</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map((cert, index) => {
                                const statusColors = getStatusColor(cert.status);
                                const validation = getValidation(cert);
                                const validationColors = getStatusColor(validation.status);
                                const upload = cert._upload;

                                return (
                                    <tr
                                        key={cert.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 600 }}>
                                            {cert.certificate_types?.name || "Unknown"}
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                                            {cert.period_start && cert.period_end ? (
                                                <>
                                                    {new Date(cert.period_start).toLocaleDateString()} -{" "}
                                                    {new Date(cert.period_end).toLocaleDateString()}
                                                </>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: statusColors.bg,
                                                    color: statusColors.color,
                                                    fontSize: 12,
                                                    fontWeight: 600
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
                                                    fontWeight: 600
                                                }}
                                            >
                                                {(validation.status || "pending").toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {validation.score !== null && validation.score !== undefined ? (
                                                <span style={{ fontWeight: 700 }}>{validation.score}/100</span>
                                            ) : (
                                                <span style={{ color: "#9ca3af" }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {upload?.file_url ? (
                                                <button
                                                    style={linkButtonStyle}
                                                    onClick={() => handleOpenFile(cert.id, upload)}
                                                    disabled={openingId === cert.id}
                                                >
                                                    {openingId === cert.id ? "Opening..." : "View/Download"}
                                                </button>
                                            ) : (
                                                <span style={{ color: "#9ca3af" }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/auditor/certificates/${cert.id}`)}
                                            >
                                                Open Details
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

const secondaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#111827",
    marginLeft: 8,
    fontWeight: 500
};

const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "underline",
    padding: 0,
    fontWeight: 600
};

