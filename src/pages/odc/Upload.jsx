import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";
import { useAuth } from "../../context/AuthContext";
import { processOCR } from "../../utils/ocrService";
import { processValidation } from "../../utils/aiValidationService";

export default function ODCUpload() {
    const { profile } = useProfile();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [odc, setOdc] = useState(null);
    const [certificateTypes, setCertificateTypes] = useState([]);
    const [selectedType, setSelectedType] = useState("");
    const [file, setFile] = useState(null);
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!profile?.odc_id) return;
        loadData();
    }, [profile?.odc_id]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load ODC details
            const { data: odcData, error: odcError } = await supabase
                .from("odc_locations")
                .select("id, name, location, address, status, vendor_id")
                .eq("id", profile.odc_id)
                .single();

            if (odcError) {
                console.error("Error loading ODC", odcError);
                setError("Failed to load ODC information");
                setLoading(false);
                return;
            }

            if (odcData.status !== "approved" && odcData.status !== null) {
                setError("This ODC is not approved yet. Please wait for admin approval.");
                setLoading(false);
                return;
            }

            setOdc(odcData);

            // Load certificate types
            const { data: typesData, error: typesError } = await supabase
                .from("certificate_types")
                .select("id, name, category, description")
                .order("name", { ascending: true });

            if (typesError) {
                console.error("Error loading certificate types", typesError);
                setError("Failed to load certificate types.");
            } else {
                setCertificateTypes(typesData || []);
            }
        } catch (err) {
            console.error("Error loading data", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!selectedType) {
            setError("Please select a certificate type.");
            return;
        }

        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setSubmitting(true);

        try {
            // Upload file to Supabase Storage
            let fileUrl = null;
            let fileType = file.type || file.name.split('.').pop();
            
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${profile.odc_id}/${selectedType}/${Date.now()}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('certificates')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) {
                    console.warn("Storage upload failed:", uploadError);
                    fileUrl = `failed:${file.name}`;
                } else {
                    const { data: urlData } = supabase.storage
                        .from('certificates')
                        .getPublicUrl(fileName);
                    fileUrl = urlData?.publicUrl || fileName;
                }
            } catch (storageErr) {
                console.warn("Storage not available:", storageErr);
                fileUrl = `local:${file.name}`;
            }

            // Create certificate instance
            const certificateData = {
                certificate_type_id: selectedType,
                odc_id: profile.odc_id,
                vendor_id: odc.vendor_id,
                period_start: periodStart || null,
                period_end: periodEnd || null,
                uploaded_by: user.id,
                status: "pending"
            };

            const { data: certInstance, error: certError } = await supabase
                .from("certificate_instances")
                .insert([certificateData])
                .select()
                .single();

            if (certError) {
                console.error("Error creating certificate instance:", certError);
                setError("Failed to create certificate record: " + certError.message);
                setSubmitting(false);
                return;
            }

            // Create upload record
            const uploadData = {
                certificate_instance_id: certInstance.id,
                uploaded_by: user.id,
                file_url: fileUrl,
                file_type: fileType,
                remarks: `Uploaded by ODC user for ${certificateTypes.find(t => t.id === selectedType)?.name || 'certificate'}`
            };

            const { data: uploadRecord, error: uploadRecordError } = await supabase
                .from("uploads")
                .insert([uploadData])
                .select()
                .single();

            if (uploadRecordError) {
                console.error("Error creating upload record:", uploadRecordError);
                setError("Failed to create upload record: " + uploadRecordError.message);
                setSubmitting(false);
                return;
            }

            // Update certificate_instance with upload_id
            await supabase
                .from("certificate_instances")
                .update({ upload_id: uploadRecord.id })
                .eq("id", certInstance.id);

            // Trigger OCR extraction (async)
            processOCR(uploadRecord.id).then(async (ocrResult) => {
                if (ocrResult) {
                    // After OCR completes, trigger AI validation
                    try {
                        await processValidation(uploadRecord.id, ocrResult.id, selectedType);
                    } catch (valErr) {
                        console.error("AI validation failed:", valErr);
                    }
                }
            }).catch(err => {
                console.error("OCR extraction failed:", err);
            });

            setSuccess(true);
            setFile(null);
            setSelectedType("");
            setPeriodStart("");
            setPeriodEnd("");

            // Redirect after 2 seconds
            setTimeout(() => {
                navigate("/odc/certificates");
            }, 2000);
        } catch (err) {
            console.error("Error submitting certificate", err);
            setError("An unexpected error occurred. Please try again.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading...</p>
            </div>
        );
    }

    if (error && !odc) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Upload Certificate</h1>
                <p style={{ color: "#b91c1c" }}>{error}</p>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/odc/dashboard")}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px", maxWidth: 800 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>Upload Certificate</h1>
                    <p style={{ color: "#555", margin: 0 }}>
                        Upload a certificate for <strong>{odc?.name}</strong> - {odc?.location}
                    </p>
                </div>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/odc/dashboard")}
                >
                    Back to Dashboard
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

            {success && (
                <div style={{
                    padding: 12,
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                    borderRadius: 6,
                    marginBottom: 16
                }}>
                    Certificate uploaded successfully! It is now pending OCR extraction and AI validation. Redirecting...
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Certificate Details</h2>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>
                            Certificate Type <span style={{ color: "#b91c1c" }}>*</span>
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            required
                            style={inputStyle}
                            disabled={submitting || success}
                        >
                            <option value="">Select certificate type</option>
                            {certificateTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name} ({type.category})
                                </option>
                            ))}
                        </select>
                        {selectedType && (
                            <p style={helpTextStyle}>
                                {certificateTypes.find(t => t.id === selectedType)?.description || "No description available"}
                            </p>
                        )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Period Start</label>
                            <input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                style={inputStyle}
                                disabled={submitting || success}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Period End</label>
                            <input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                style={inputStyle}
                                disabled={submitting || success}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={labelStyle}>
                            Certificate File <span style={{ color: "#b91c1c" }}>*</span>
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileChange}
                            required
                            style={fileInputStyle}
                            disabled={submitting || success}
                        />
                        {file && (
                            <p style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>
                                ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                        <p style={helpTextStyle}>
                            Supported formats: PDF, JPG, PNG, DOC, DOCX
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            type="submit"
                            style={primaryButtonStyle}
                            disabled={submitting || success}
                        >
                            {submitting ? "Uploading..." : "Upload & Submit for Validation"}
                        </button>
                        <button
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={() => navigate("/odc/dashboard")}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

const cardStyle = {
    background: "#fff",
    borderRadius: 8,
    padding: 24,
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
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: "#111827"
};

const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box"
};

const fileInputStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "inherit"
};

const helpTextStyle = {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 0
};

const primaryButtonStyle = {
    padding: "12px 24px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#111827",
    color: "#fff",
    fontWeight: 500
};

const secondaryButtonStyle = {
    padding: "12px 24px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#111827",
    fontWeight: 500
};

