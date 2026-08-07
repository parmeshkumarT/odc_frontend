import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getDownloadUrl } from "../../utils/storageLinks";

export default function CertificateDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [certificate, setCertificate] = useState(null);
    const [upload, setUpload] = useState(null);
    const [ocrData, setOcrData] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    const [certificateType, setCertificateType] = useState(null);
    const [odc, setOdc] = useState(null);
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fileLink, setFileLink] = useState(null);
    const [fileLoading, setFileLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        loadCertificateDetails();
    }, [id]);

    const loadCertificateDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load certificate instance
            const { data: certData, error: certError } = await supabase
                .from("certificate_instances")
                .select("*")
                .eq("id", id)
                .single();

            if (certError) {
                console.error("Error loading certificate", certError);
                setError("Certificate not found");
                setLoading(false);
                return;
            }

            setCertificate(certData);

            // Load related data
            const [uploadData, ocrDataResult, validationData, typeData, odcData, vendorData] = await Promise.all([
                certData.upload_id ? supabase
                    .from("uploads")
                    .select("*")
                    .eq("id", certData.upload_id)
                    .single() : Promise.resolve({ data: null, error: null }),
                certData.upload_id ? supabase
                    .from("ocr_data")
                    .select("*")
                    .eq("upload_id", certData.upload_id)
                    .single() : Promise.resolve({ data: null, error: null }),
                certData.upload_id ? supabase
                    .from("validation_results")
                    .select("*")
                    .eq("upload_id", certData.upload_id)
                    .single() : Promise.resolve({ data: null, error: null }),
                supabase
                    .from("certificate_types")
                    .select("*")
                    .eq("id", certData.certificate_type_id)
                    .single(),
                supabase
                    .from("odc_locations")
                    .select("*")
                    .eq("id", certData.odc_id)
                    .single(),
                supabase
                    .from("vendors")
                    .select("*")
                    .eq("id", certData.vendor_id)
                    .single()
            ]);

            if (!uploadData.error) setUpload(uploadData.data);
            if (!ocrDataResult.error) setOcrData(ocrDataResult.data);
            if (!validationData.error) setValidationResult(validationData.data);
            if (!typeData.error) setCertificateType(typeData.data);
            if (!odcData.error) setOdc(odcData.data);
            if (!vendorData.error) setVendor(vendorData.data);
        } catch (err) {
            console.error("Error loading certificate details", err);
            setError("Failed to load certificate details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const resolve = async () => {
            if (!upload?.file_url) {
                setFileLink(null);
                return;
            }
            try {
                setFileLoading(true);
                const url = await getDownloadUrl({ bucket: "certificates", fileUrlOrKey: upload.file_url });
                if (!cancelled) setFileLink(url);
            } catch (e) {
                console.error("Failed to resolve file link", e);
                if (!cancelled) setFileLink(upload?.file_url || null);
            } finally {
                if (!cancelled) setFileLoading(false);
            }
        };
        resolve();
        return () => {
            cancelled = true;
        };
    }, [upload?.file_url]);

    const getStatusColor = (status) => {
        switch (status) {
            case "approved":
            case "passed":
                return { color: "#16a34a", bg: "#d1fae5", text: "APPROVED" };
            case "pending":
                return { color: "#f59e0b", bg: "#fef3c7", text: "PENDING" };
            case "failed":
            case "rejected":
                return { color: "#b91c1c", bg: "#fee2e2", text: "FAILED" };
            default:
                return { color: "#6b7280", bg: "#f3f4f6", text: status?.toUpperCase() || "UNKNOWN" };
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading certificate details...</p>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Certificate Details</h1>
                <p style={{ color: "#b91c1c" }}>{error || "Certificate not found"}</p>
            </div>
        );
    }

    const statusInfo = getStatusColor(certificate.status);

    return (
        <div style={{ padding: "24px", maxWidth: 1200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>Certificate Details</h1>
                    <p style={{ color: "#555", margin: 0 }}>
                        {certificateType?.name || "Certificate"} - {odc?.name || "ODC"}
                    </p>
                </div>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate(-1)}
                >
                    Back
                </button>
            </div>

            {/* Certificate Information */}
            <div style={cardStyle}>
                <h2 style={cardTitleStyle}>Certificate Information</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                    <div>
                        <label style={labelStyle}>Certificate Type</label>
                        <p style={valueStyle}>{certificateType?.name || "—"}</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Vendor</label>
                        <p style={valueStyle}>{vendor?.name || "—"}</p>
                    </div>
                    <div>
                        <label style={labelStyle}>ODC</label>
                        <p style={valueStyle}>{odc?.name || "—"} ({odc?.location || ""})</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Status</label>
                        <p style={valueStyle}>
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
                        </p>
                    </div>
                    <div>
                        <label style={labelStyle}>Period Start</label>
                        <p style={valueStyle}>
                            {certificate.period_start 
                                ? new Date(certificate.period_start).toLocaleDateString()
                                : "—"}
                        </p>
                    </div>
                    <div>
                        <label style={labelStyle}>Period End</label>
                        <p style={valueStyle}>
                            {certificate.period_end 
                                ? new Date(certificate.period_end).toLocaleDateString()
                                : "—"}
                        </p>
                    </div>
                </div>
            </div>

            {/* OCR Data */}
            {ocrData && (
                <div style={{ ...cardStyle, marginTop: 16 }}>
                    <h2 style={cardTitleStyle}>OCR Extraction Results</h2>
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Extracted Text</label>
                        <div style={{
                            padding: 12,
                            backgroundColor: "#f9fafb",
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            maxHeight: 200,
                            overflowY: "auto",
                            fontSize: 13,
                            whiteSpace: "pre-wrap",
                            fontFamily: "monospace"
                        }}>
                            {ocrData.extracted_text || "No text extracted yet"}
                        </div>
                    </div>
                    {ocrData.structured_data && Object.keys(ocrData.structured_data).length > 0 && (
                        <div>
                            <label style={labelStyle}>Structured Data</label>
                            <pre style={{
                                padding: 12,
                                backgroundColor: "#f9fafb",
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                                maxHeight: 300,
                                overflowY: "auto",
                                fontSize: 12,
                                fontFamily: "monospace"
                            }}>
                                {JSON.stringify(ocrData.structured_data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Validation Results */}
            {validationResult && (
                <div style={{ ...cardStyle, marginTop: 16 }}>
                    <h2 style={cardTitleStyle}>AI Validation Results</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Validation Status</label>
                            <p style={valueStyle}>
                                <span
                                    style={{
                                        padding: "4px 12px",
                                        borderRadius: 12,
                                        backgroundColor: validationResult.validation_status === "passed" ? "#d1fae5" : validationResult.validation_status === "failed" ? "#fee2e2" : "#fef3c7",
                                        color: validationResult.validation_status === "passed" ? "#065f46" : validationResult.validation_status === "failed" ? "#991b1b" : "#92400e",
                                        fontSize: 12,
                                        fontWeight: 500
                                    }}
                                >
                                    {(validationResult.validation_status || "pending").toUpperCase()}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label style={labelStyle}>Overall Score</label>
                            <p style={{ ...valueStyle, fontSize: 24, fontWeight: 600, color: validationResult.overall_score >= 80 ? "#16a34a" : validationResult.overall_score >= 60 ? "#f59e0b" : "#b91c1c" }}>
                                {validationResult.overall_score !== null ? `${validationResult.overall_score}/100` : "—"}
                            </p>
                        </div>
                    </div>
                    {validationResult.issues && Array.isArray(validationResult.issues) && validationResult.issues.length > 0 && (
                        <div>
                            <label style={labelStyle}>Issues Found</label>
                            <ul style={{ margin: 0, paddingLeft: 20, color: "#b91c1c" }}>
                                {validationResult.issues.map((issue, index) => (
                                    <li key={index} style={{ marginBottom: 4 }}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Information */}
            {upload && (
                <div style={{ ...cardStyle, marginTop: 16 }}>
                    <h2 style={cardTitleStyle}>Upload Information</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                        <div>
                            <label style={labelStyle}>File Type</label>
                            <p style={valueStyle}>{upload.file_type || "—"}</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Uploaded</label>
                            <p style={valueStyle}>
                                {upload.created_at 
                                    ? new Date(upload.created_at).toLocaleString()
                                    : "—"}
                            </p>
                        </div>
                        {upload.file_url && (
                            <div>
                                <label style={labelStyle}>File</label>
                                <p style={valueStyle}>
                                    {fileLink ? (
                                        <a
                                            href={fileLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: "#111827", textDecoration: "underline" }}
                                        >
                                            {fileLoading ? "Loading link..." : "View / Download"}
                                        </a>
                                    ) : (
                                        <span style={{ color: "#9ca3af" }}>{fileLoading ? "Loading link..." : "—"}</span>
                                    )}
                                </p>
                            </div>
                        )}
                        {upload.remarks && (
                            <div>
                                <label style={labelStyle}>Remarks</label>
                                <p style={valueStyle}>{upload.remarks}</p>
                            </div>
                        )}
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

