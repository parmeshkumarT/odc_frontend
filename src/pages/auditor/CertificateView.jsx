import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import CertificateDetails from "../shared/CertificateDetails";

export default function AuditorCertificateView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [certificate, setCertificate] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        loadCertificate();
    }, [id]);

    const loadCertificate = async () => {
        try {
            const { data, error } = await supabase
                .from("certificate_instances")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error loading certificate", error);
                setError("Certificate not found");
            } else {
                setCertificate(data);
            }
        } catch (err) {
            console.error("Error loading certificate", err);
            setError("Failed to load certificate");
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!window.confirm(`Are you sure you want to ${newStatus === "approved" ? "approve" : "reject"} this certificate?`)) {
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("certificate_instances")
                .update({ 
                    status: newStatus,
                    // You might want to add an auditor_id or reviewed_by field
                })
                .eq("id", id);

            if (updateError) {
                console.error("Error updating certificate status", updateError);
                setError("Failed to update certificate status: " + updateError.message);
                setProcessing(false);
                return;
            }

            // Reload certificate
            await loadCertificate();
            
            // Show success message
            alert(`Certificate ${newStatus === "approved" ? "approved" : "rejected"} successfully!`);
        } catch (err) {
            console.error("Error updating status", err);
            setError("An unexpected error occurred");
            setProcessing(false);
        }
    };

    if (error && !certificate) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Certificate Review</h1>
                <p style={{ color: "#b91c1c" }}>{error}</p>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/auditor/dashboard")}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div>
            <CertificateDetails />
            
            {/* Auditor Actions */}
            {certificate && certificate.status === "pending" && (
                <div style={{ 
                    ...cardStyle, 
                    marginTop: 16,
                    border: "2px solid #f59e0b",
                    backgroundColor: "#fffbeb"
                }}>
                    <h2 style={cardTitleStyle}>Auditor Actions</h2>
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
                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            style={{
                                ...primaryButtonStyle,
                                backgroundColor: "#16a34a",
                                opacity: processing ? 0.6 : 1
                            }}
                            onClick={() => handleStatusChange("approved")}
                            disabled={processing}
                        >
                            {processing ? "Processing..." : "Approve Certificate"}
                        </button>
                        <button
                            style={{
                                ...primaryButtonStyle,
                                backgroundColor: "#b91c1c",
                                opacity: processing ? 0.6 : 1
                            }}
                            onClick={() => handleStatusChange("rejected")}
                            disabled={processing}
                        >
                            {processing ? "Processing..." : "Reject Certificate"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

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

const primaryButtonStyle = {
    padding: "12px 24px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer",
    color: "#fff",
    fontWeight: 500
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

