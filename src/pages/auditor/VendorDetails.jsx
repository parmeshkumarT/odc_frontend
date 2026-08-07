import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function AuditorVendorDetails() {
    const { id: vendorId } = useParams();
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useProfile();

    const [vendor, setVendor] = useState(null);
    const [odcs, setOdcs] = useState([]);
    const [certificateCounts, setCertificateCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const canQuery = useMemo(() => {
        return Boolean(vendorId) && Boolean(profile?.client_id);
    }, [vendorId, profile?.client_id]);

    useEffect(() => {
        if (!canQuery) return;
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canQuery]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Vendor (scoped to the auditor's client_id)
            const { data: vendorData, error: vendorError } = await supabase
                .from("vendors")
                .select("id, name, email, created_at, client_id")
                .eq("id", vendorId)
                .eq("client_id", profile.client_id)
                .single();

            if (vendorError || !vendorData) {
                setError("Vendor not found (or you don't have access).");
                return;
            }

            setVendor(vendorData);

            // ODCs for this vendor
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location, status, created_at")
                .eq("vendor_id", vendorId)
                .order("created_at", { ascending: false });

            if (odcError) {
                console.error("Error loading ODCs", odcError);
                setError("Failed to load ODCs");
                return;
            }

            const list = odcData || [];
            setOdcs(list);

            // Certificate counts by ODC
            const odcIds = list.map((o) => o.id);
            if (odcIds.length === 0) {
                setCertificateCounts({});
                return;
            }

            const { data: certData, error: certError } = await supabase
                .from("certificate_instances")
                .select("id, odc_id, status")
                .in("odc_id", odcIds);

            if (certError) {
                console.error("Error loading certificates", certError);
                setCertificateCounts({});
                return;
            }

            const counts = {};
            odcIds.forEach((odcId) => {
                const items = (certData || []).filter((c) => c.odc_id === odcId);
                counts[odcId] = {
                    total: items.length,
                    pending: items.filter((c) => c.status === "pending").length,
                    approved: items.filter((c) => c.status === "approved" || c.status === "passed").length,
                    rejected: items.filter((c) => c.status === "rejected" || c.status === "failed").length
                };
            });
            setCertificateCounts(counts);
        } catch (e) {
            console.error("Error loading vendor details", e);
            setError("Failed to load vendor details");
        } finally {
            setLoading(false);
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
                <h1 style={{ fontSize: 24, marginBottom: 8 }}>Vendor</h1>
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
                    <h1 style={{ fontSize: 24, marginBottom: 6 }}>Vendor Details</h1>
                    <p style={{ margin: 0, color: "#555" }}>
                        {vendor ? `${vendor.name}${vendor.email ? ` • ${vendor.email}` : ""}` : "Loading..."}
                    </p>
                </div>
                <button style={secondaryButtonStyle} onClick={() => navigate("/auditor/vendors")}>
                    Back to Vendors
                </button>
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
                    <p style={{ color: "#6b7280" }}>Loading ODCs...</p>
                </div>
            ) : odcs.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>No ODCs found for this vendor.</p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 12 }}>ODCs</h2>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>ODC</th>
                                <th style={{ padding: "12px 8px" }}>Location</th>
                                <th style={{ padding: "12px 8px" }}>Certificates</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {odcs.map((odc, idx) => {
                                const counts = certificateCounts[odc.id] || {
                                    total: 0,
                                    pending: 0,
                                    approved: 0,
                                    rejected: 0
                                };

                                return (
                                    <tr
                                        key={odc.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 600 }}>{odc.name}</td>
                                        <td style={{ padding: "12px 8px" }}>{odc.location || "—"}</td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                                            {counts.total > 0
                                                ? `${counts.approved} approved / ${counts.pending} pending / ${counts.rejected} rejected (total ${counts.total})`
                                                : "No certificates"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/auditor/vendors/${vendorId}/odc/${odc.id}/certificates`)}
                                            >
                                                View Uploaded Certificates
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

