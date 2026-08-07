import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";
import { useAuth } from "../../context/AuthContext";
import { triggerOCRAndValidation } from "../../utils/edgeFunctionService";

export default function CertificateUpload() {
    const { id: odcId } = useParams();
    const navigate = useNavigate();
    const { profile } = useProfile();
    const { user } = useAuth();
    const [odc, setOdc] = useState(null);
    const [certificateTypes, setCertificateTypes] = useState([]);
    const [uploads, setUploads] = useState({}); // { certificateTypeId: File }
    const [periods, setPeriods] = useState({}); // { certificateTypeId: { start, end } }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState([]);
    const [success, setSuccess] = useState(false);

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
                .select("id, name, location, address, status")
                .eq("id", odcId)
                .eq("vendor_id", profile.vendor_id)
                .single();

            if (odcError) {
                console.error("Error loading ODC", odcError);
                setError("ODC not found or you don't have access to it.");
                setLoading(false);
                return;
            }

            if (odcData.status !== "approved" && odcData.status !== null) {
                setError("This ODC is not approved yet. Please wait for admin approval.");
                setLoading(false);
                return;
            }

            setOdc(odcData);

            // Load all certificate types
            const { data: typesData, error: typesError } = await supabase
                .from("certificate_types")
                .select("id, name, category, description")
                .order("name", { ascending: true });

            if (typesError) {
                console.error("Error loading certificate types", typesError);
                setError("Failed to load certificate types.");
            } else {
                setCertificateTypes(typesData || []);
                
                // Initialize uploads and periods
                const initialUploads = {};
                const initialPeriods = {};
                (typesData || []).forEach(type => {
                    initialUploads[type.id] = null;
                    initialPeriods[type.id] = { start: "", end: "" };
                });
                setUploads(initialUploads);
                setPeriods(initialPeriods);
            }
        } catch (err) {
            console.error("Error loading data", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (certificateTypeId, file) => {
        setUploads(prev => ({
            ...prev,
            [certificateTypeId]: file
        }));
        setError(null);
    };

    const handlePeriodChange = (certificateTypeId, field, value) => {
        setPeriods(prev => ({
            ...prev,
            [certificateTypeId]: {
                ...prev[certificateTypeId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setErrorDetails([]);
        setSuccess(false);

        if (!user?.id) {
            setError("You are not logged in. Please sign in again.");
            return;
        }

        // Validate that at least one certificate is uploaded
        const uploadedCount = Object.values(uploads).filter(f => f !== null).length;
        if (uploadedCount === 0) {
            setError("Please upload at least one certificate.");
            return;
        }

        setSubmitting(true);

        try {
            const results = [];
            const detailErrors = [];
            let successCount = 0;
            let errorCount = 0;

            // Process each certificate type
            for (const type of certificateTypes) {
                const file = uploads[type.id];
                if (!file) continue; // Skip if no file uploaded

                const period = periods[type.id] || { start: "", end: "" };
                // Require period_start to satisfy NOT NULL constraint in DB
                if (!period.start) {
                    throw new Error("Period start date is required.");
                }

                try {
                    // Upload file to Supabase Storage
                    let fileUrl = null;
                    let fileType = file.type || file.name.split('.').pop();
                    let storageKey = null;
                    let storageUploaded = false;
                    
                    try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${odcId}/${type.id}/${Date.now()}.${fileExt}`;
                        storageKey = fileName;
                        
                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('certificates')
                            .upload(fileName, file, { upsert: true });

                        if (uploadError) {
                            console.warn(`Storage upload failed for ${type.name}:`, uploadError);
                            fileUrl = `failed:${file.name}`;
                        } else {
                            storageUploaded = true;
                            // Get public URL
                            const { data: urlData } = supabase.storage
                                .from('certificates')
                                .getPublicUrl(fileName);
                            fileUrl = urlData?.publicUrl || fileName;
                        }
                    } catch (storageErr) {
                        console.warn(`Storage not available:`, storageErr);
                        fileUrl = `local:${file.name}`;
                    }

                    // Create certificate instance first
                    const certificateData = {
                        certificate_type_id: type.id,
                        odc_id: odcId,
                        vendor_id: profile.vendor_id,
                        period_start: period.start || null,
                        period_end: period.end || null,
                        uploaded_by: user.id,
                        status: "pending" // Pending AI validation
                    };

                    const { data: certInstance, error: certError } = await supabase
                        .from("certificate_instances")
                        .insert([certificateData])
                        .select()
                        .single();

                    if (certError) {
                        console.error(`Error creating certificate instance for ${type.name}:`, certError);
                        errorCount++;
                        const msg = certError.message || "Failed to create certificate record";
                        detailErrors.push(`Certificate "${type.name}": ${msg}`);
                        results.push({ type: type.name, success: false, error: msg });
                        continue;
                    }

                    // Create upload record
                    const uploadData = {
                        certificate_instance_id: certInstance.id,
                        uploaded_by: user.id,
                        file_url: fileUrl,
                        file_type: fileType,
                        remarks: `Uploaded for ${type.name}`
                    };

                    const { data: uploadRecord, error: uploadRecordError } = await supabase
                        .from("uploads")
                        .insert([uploadData])
                        .select("id, certificate_instance_id")
                        .single();

                    if (uploadRecordError) {
                        console.error(`Error creating upload record for ${type.name}:`, uploadRecordError);
                        errorCount++;
                        const msg = uploadRecordError.message || "Failed to create upload record";
                        detailErrors.push(`Upload "${type.name}": ${msg}`);
                        results.push({ type: type.name, success: false, error: msg });
                        continue;
                    }

                    // Update certificate_instance with upload_id
                    await supabase
                        .from("certificate_instances")
                        .update({ upload_id: uploadRecord.id })
                        .eq("id", certInstance.id);

                    // Create validation_results record first (Edge Function will update it)
                    const { error: validationInsertError } = await supabase
                        .from("validation_results")
                        .insert([{
                            upload_id: uploadRecord.id,
                            validation_status: "pending",
                            overall_score: null,
                            issues: null
                        }]);

                    if (validationInsertError) {
                        console.warn(`Failed to create validation_results for ${type.name}:`, validationInsertError);
                        // Continue anyway - Edge Function might create it
                    }

                    // Trigger Edge Function for OCR and validation (async, don't wait)
                    if (storageUploaded && storageKey) {
                        triggerOCRAndValidation(uploadRecord.id, "certificates", storageKey)
                            .then((result) => {
                                if (result) {
                                    console.log(`✅ Edge Function completed for ${type.name}:`, result);
                                } else {
                                    console.warn(`⚠️ Edge Function returned no result for ${type.name}`);
                                }
                            })
                            .catch((err) => {
                                console.error(`❌ Edge Function failed for ${type.name}:`, err);
                            });
                    } else {
                        console.warn(`⚠️ Skipping Edge Function for ${type.name} - invalid storage key or file URL`);
                        console.warn(`   storageKey: ${storageKey}, fileUrl: ${fileUrl}`);
                    }

                    successCount++;
                    results.push({ type: type.name, success: true });
                } catch (err) {
                    console.error(`Error processing ${type.name}:`, err);
                    errorCount++;
                    const msg = err.message || "Unexpected error";
                    detailErrors.push(`"${type.name}": ${msg}`);
                    results.push({ type: type.name, success: false, error: msg });
                }
            }

            if (errorCount > 0) {
                setError(`Uploaded ${successCount} certificates successfully, but ${errorCount} failed.`);
                setErrorDetails(detailErrors);
            } else if (successCount > 0) {
                setSuccess(true);
                // Clear form
                const clearedUploads = {};
                const clearedPeriods = {};
                certificateTypes.forEach(type => {
                    clearedUploads[type.id] = null;
                    clearedPeriods[type.id] = { start: "", end: "" };
                });
                setUploads(clearedUploads);
                setPeriods(clearedPeriods);

                // Redirect after 2 seconds
                setTimeout(() => {
                    navigate("/vendor/certificates");
                }, 2000);
            } else {
                setError("No certificates were uploaded. Please select at least one file.");
            }
        } catch (err) {
            console.error("Error submitting certificates", err);
            setError("An unexpected error occurred. Please try again.");
            setErrorDetails([err.message || "Unknown error"]);
        } finally {
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
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Upload Certificates</h1>
                <p style={{ color: "#b91c1c" }}>{error}</p>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/vendor/certificates")}
                >
                    Back to Certificates
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px", maxWidth: 1000 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>Upload Certificates</h1>
                    <p style={{ color: "#555", margin: 0 }}>
                        Upload certificates for <strong>{odc?.name}</strong> - {odc?.location}
                    </p>
                </div>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate("/vendor/certificates")}
                >
                    Back to List
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
                    <div>{error}</div>
                    {errorDetails.length > 0 && (
                        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                            {errorDetails.map((e, idx) => (
                                <li key={idx} style={{ fontSize: 13 }}>{e}</li>
                            ))}
                        </ul>
                    )}
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
                    Certificates uploaded successfully! They are now pending AI validation. Redirecting...
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Certificate Uploads</h2>
                    <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
                        Upload certificates for each certificate type. You can upload all 12 certificates or select specific ones.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {certificateTypes.map((type, index) => {
                            const file = uploads[type.id];
                            const period = periods[type.id] || { start: "", end: "" };

                            return (
                                <div key={type.id} style={{
                                    padding: 20,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                }}>
                                    <div style={{ marginBottom: 12 }}>
                                        <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 600 }}>
                                            {type.name}
                                        </h3>
                                        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                                            {type.category} • {type.description || "No description"}
                                        </p>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                                        <div>
                                            <label style={labelStyle}>Period Start</label>
                                            <input
                                                type="date"
                                                value={period.start}
                                                onChange={(e) => handlePeriodChange(type.id, "start", e.target.value)}
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Period End</label>
                                            <input
                                                type="date"
                                                value={period.end}
                                                onChange={(e) => handlePeriodChange(type.id, "end", e.target.value)}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={labelStyle}>Certificate File</label>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => handleFileChange(type.id, e.target.files[0] || null)}
                                            style={fileInputStyle}
                                        />
                                        {file && (
                                            <p style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>
                                                ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                    <button
                        type="submit"
                        style={primaryButtonStyle}
                        disabled={submitting || success}
                    >
                        {submitting ? "Uploading and Submitting..." : "Submit for AI Validation"}
                    </button>
                    <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => navigate("/vendor/certificates")}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
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
    marginBottom: 8,
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

