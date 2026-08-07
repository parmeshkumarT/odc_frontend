import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ODCList() {
    const [odcs, setOdcs] = useState([]);
    const [vendors, setVendors] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        loadODCs();
    }, []);

    const loadODCs = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load all ODCs
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location, address, status, vendor_id, created_at")
                .order("created_at", { ascending: false });

            if (odcError) {
                console.error("Error loading ODCs", odcError);
                setError("Failed to load ODCs: " + (odcError.message || "Unknown error"));
                setLoading(false);
                return;
            }

            console.log("Loaded all ODCs:", odcData?.length || 0, odcData);
            setOdcs(odcData || []);

            // Load vendor names
            const vendorIds = [...new Set((odcData || []).map(odc => odc.vendor_id))];
            if (vendorIds.length > 0) {
                const { data: vendorData, error: vendorError } = await supabase
                    .from("vendors")
                    .select("id, name")
                    .in("id", vendorIds);

                if (vendorError) {
                    console.error("Error loading vendors", vendorError);
                } else {
                    const vendorMap = {};
                    (vendorData || []).forEach(v => {
                        vendorMap[v.id] = v.name;
                    });
                    setVendors(vendorMap);
                }
            }
        } catch (err) {
            console.error("Error loading data", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (odcId, newStatus) => {
        setProcessingId(odcId);

        try {
            const { error: updateError } = await supabase
                .from("odc_locations")
                .update({ status: newStatus })
                .eq("id", odcId);

            if (updateError) {
                console.error("Error updating ODC status", updateError);
                alert(updateError.message || "Failed to update ODC status");
                setProcessingId(null);
                return;
            }

            // Reload ODCs
            loadODCs();
        } catch (err) {
            console.error("Error updating status", err);
            alert("An unexpected error occurred");
            setProcessingId(null);
        }
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

    const filteredODCs = filter === "all" 
        ? odcs 
        : odcs.filter(odc => (odc.status || "pending") === filter);

    const pendingCount = odcs.filter(odc => (odc.status || "pending") === "pending").length;

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>ODC Locations</h1>
            <p style={{ marginBottom: 16, color: "#555" }}>
                Overview of all ODCs mapped to vendors. Review and approve pending ODC registrations.
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
                    All ({odcs.length})
                </button>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "pending" ? "#111827" : "#fff",
                        color: filter === "pending" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("pending")}
                >
                    Pending {pendingCount > 0 && `(${pendingCount})`}
                </button>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "approved" ? "#111827" : "#fff",
                        color: filter === "approved" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("approved")}
                >
                    Approved
                </button>
                <button
                    style={{
                        ...filterButtonStyle,
                        backgroundColor: filter === "rejected" ? "#111827" : "#fff",
                        color: filter === "rejected" ? "#fff" : "#111827"
                    }}
                    onClick={() => setFilter("rejected")}
                >
                    Rejected
                </button>
            </div>

            {loading ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>Loading ODCs...</p>
                </div>
            ) : filteredODCs.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>
                        {filter === "pending" 
                            ? "No pending ODC registrations." 
                            : "No ODCs found."}
                    </p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>ODC Name</th>
                                <th style={{ padding: "12px 8px" }}>Vendor</th>
                                <th style={{ padding: "12px 8px" }}>Location</th>
                                <th style={{ padding: "12px 8px" }}>Address</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Registered</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredODCs.map((odc, index) => {
                                const status = odc.status || "pending";
                                const isProcessing = processingId === odc.id;
                                
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
                                        <td style={{ padding: "12px 8px" }}>
                                            {vendors[odc.vendor_id] || "—"}
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
                                                    backgroundColor: getStatusColor(status) + "20",
                                                    color: getStatusColor(status),
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}
                                            >
                                                {status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#6b7280", fontSize: 13 }}>
                                            {odc.created_at 
                                                ? new Date(odc.created_at).toLocaleDateString()
                                                : "—"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            {status === "pending" && (
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button
                                                        style={{
                                                            ...actionButtonStyle,
                                                            backgroundColor: "#16a34a",
                                                            color: "#fff",
                                                            opacity: isProcessing ? 0.6 : 1
                                                        }}
                                                        onClick={() => handleStatusChange(odc.id, "approved")}
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? "Processing..." : "Approve"}
                                                    </button>
                                                    <button
                                                        style={{
                                                            ...actionButtonStyle,
                                                            backgroundColor: "#b91c1c",
                                                            color: "#fff",
                                                            opacity: isProcessing ? 0.6 : 1
                                                        }}
                                                        onClick={() => {
                                                            if (window.confirm("Reject this ODC registration?")) {
                                                                handleStatusChange(odc.id, "rejected");
                                                            }
                                                        }}
                                                        disabled={isProcessing}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {status === "approved" && (
                                                <button
                                                    style={{
                                                        ...actionButtonStyle,
                                                        backgroundColor: "#b91c1c",
                                                        color: "#fff"
                                                    }}
                                                    onClick={() => {
                                                        if (window.confirm("Reject this approved ODC?")) {
                                                            handleStatusChange(odc.id, "rejected");
                                                        }
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            )}
                                            {status === "rejected" && (
                                                <button
                                                    style={{
                                                        ...actionButtonStyle,
                                                        backgroundColor: "#16a34a",
                                                        color: "#fff"
                                                    }}
                                                    onClick={() => handleStatusChange(odc.id, "approved")}
                                                >
                                                    Approve
                                                </button>
                                            )}
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

const actionButtonStyle = {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 500
};
