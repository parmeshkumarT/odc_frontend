import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function AuditorVendors() {
    const navigate = useNavigate();
    const { profile, loading: profileLoading } = useProfile();
    const [vendors, setVendors] = useState([]);
    const [certificateCounts, setCertificateCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("all"); // all, pending, passed, failed

    useEffect(() => {
        if (!profile?.client_id) return;
        loadVendors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.client_id]);

    const loadVendors = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load only vendors for this client (auditor/client scope)
            const { data: vendorData, error: vendorError } = await supabase
                .from("vendors")
                .select("id, name, email, created_at, client_id")
                .eq("client_id", profile.client_id)
                .order("created_at", { ascending: false });

            if (vendorError) {
                console.error("Error loading vendors", vendorError);
                setError("Failed to load vendors: " + (vendorError.message || "Unknown error"));
                setLoading(false);
                return;
            }

            setVendors(vendorData || []);

            // Load certificate counts for each vendor (via vendor's ODCs)
            const vendorIds = (vendorData || []).map(v => v.id);
            if (vendorIds.length > 0) {
                // 1) Fetch all ODCs for these vendors
                const { data: odcData, error: odcError } = await supabase
                    .from("odc_locations")
                    .select("id, vendor_id")
                    .in("vendor_id", vendorIds);

                if (odcError) {
                    console.error("Error loading ODCs for vendors", odcError);
                    setCertificateCounts({});
                    setLoading(false);
                    return;
                }

                const odcs = odcData || [];
                const odcIds = odcs.map(o => o.id);

                // 2) Fetch certificates for those ODCs
                const { data: certData, error: certError } = odcIds.length === 0
                    ? { data: [], error: null }
                    : await supabase
                        .from("certificate_instances")
                        .select("id, odc_id, status")
                        .in("odc_id", odcIds);

                if (certError) {
                    console.error("Error loading certificates", certError);
                    setCertificateCounts({});
                    setLoading(false);
                    return;
                }

                // 3) Aggregate counts by vendor via odc.vendor_id
                const odcVendorMap = new Map(odcs.map(o => [o.id, o.vendor_id]));
                const counts = {};
                vendorIds.forEach((vid) => {
                    counts[vid] = { total: 0, pending: 0, passed: 0, failed: 0 };
                });

                (certData || []).forEach((c) => {
                    const vid = odcVendorMap.get(c.odc_id);
                    if (!vid) return;
                    if (!counts[vid]) counts[vid] = { total: 0, pending: 0, passed: 0, failed: 0 };
                    counts[vid].total += 1;
                    if (c.status === "pending") counts[vid].pending += 1;
                    if (c.status === "approved" || c.status === "passed") counts[vid].passed += 1;
                    if (c.status === "failed" || c.status === "rejected") counts[vid].failed += 1;
                });

                setCertificateCounts(counts);
            }
        } catch (err) {
            console.error("Error loading vendors", err);
            setError("Failed to load vendors");
        } finally {
            setLoading(false);
        }
    };

    const getComplianceStatus = (vendorId) => {
        const counts = certificateCounts[vendorId] || { total: 0, pending: 0, passed: 0, failed: 0 };
        
        if (counts.failed > 0) return { status: "Non-Compliant", color: "#b91c1c", bg: "#fee2e2" };
        if (counts.pending > 0) return { status: "Under Review", color: "#f59e0b", bg: "#fef3c7" };
        if (counts.passed > 0 && counts.failed === 0) return { status: "Compliant", color: "#16a34a", bg: "#d1fae5" };
        return { status: "No Certificates", color: "#6b7280", bg: "#f3f4f6" };
    };

    const filteredVendors = vendors;

    if (profileLoading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading profile...</p>
            </div>
        );
    }

    if (!profile?.client_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Vendors</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is missing a <strong>client_id</strong>. Ask admin to set it on your profile.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Vendors</h1>
            <p style={{ marginBottom: 16, color: "#555" }}>
                Review vendors and their certificate compliance status.
            </p>

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
                    <p style={{ color: "#6b7280" }}>Loading vendors...</p>
                </div>
            ) : filteredVendors.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>No vendors found.</p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>Vendor Name</th>
                                <th style={{ padding: "12px 8px" }}>Email</th>
                                <th style={{ padding: "12px 8px" }}>Certificates</th>
                                <th style={{ padding: "12px 8px" }}>Compliance Status</th>
                                <th style={{ padding: "12px 8px" }}>Created</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVendors.map((vendor, index) => {
                                const counts = certificateCounts[vendor.id] || { total: 0, pending: 0, passed: 0, failed: 0 };
                                const compliance = getComplianceStatus(vendor.id);
                                
                                return (
                                    <tr
                                        key={vendor.id}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                            {vendor.name}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>{vendor.email || "—"}</td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {counts.total > 0 ? (
                                                <span style={{ color: "#6b7280" }}>
                                                    {counts.passed} passed
                                                    {counts.pending > 0 && ` / ${counts.pending} pending`}
                                                    {counts.failed > 0 && ` / ${counts.failed} failed`}
                                                </span>
                                            ) : (
                                                <span style={{ color: "#9ca3af" }}>No certificates</span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 12,
                                                    backgroundColor: compliance.bg,
                                                    color: compliance.color,
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {compliance.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280", fontSize: 13 }}>
                                            {vendor.created_at 
                                                ? new Date(vendor.created_at).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <button
                                                style={linkButtonStyle}
                                                onClick={() => navigate(`/auditor/vendors/${vendor.id}`)}
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

const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "#111827",
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "underline",
    padding: 0
};

