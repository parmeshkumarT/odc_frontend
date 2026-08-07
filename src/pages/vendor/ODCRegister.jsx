import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function ODCRegister() {
    const { profile } = useProfile();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        address: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!formData.name || !formData.location) {
            setError("ODC name and location are required.");
            return;
        }

        if (!profile?.vendor_id) {
            setError("Your profile is not linked to a vendor. Please contact the administrator.");
            console.error("Profile vendor_id missing:", profile);
            return;
        }

        console.log("Registering ODC with vendor_id:", profile.vendor_id);

        setSubmitting(true);

        try {
            const { data, error: insertError } = await supabase
                .from("odc_locations")
                .insert([
                    {
                        vendor_id: profile.vendor_id,
                        name: formData.name.trim(),
                        location: formData.location.trim(),
                        address: formData.address.trim() || null,
                        status: "pending" // Requires admin approval
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error("Error registering ODC", insertError);
                setError(insertError.message || "Failed to register ODC. Please try again.");
                setSubmitting(false);
                return;
            }

            if (!data) {
                setError("ODC was created but no data was returned. Please refresh the page.");
                setSubmitting(false);
                return;
            }

            console.log("ODC registered successfully:", data);
            setSuccess(true);
            setFormData({ name: "", location: "", address: "" });
            
            // Redirect to ODC list after 2 seconds
            setTimeout(() => {
                navigate("/vendor/odc");
            }, 2000);
        } catch (err) {
            console.error("Error registering ODC", err);
            setError("An unexpected error occurred. Please try again.");
            setSubmitting(false);
        }
    };

    if (!profile?.vendor_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Register ODC</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is not linked to a vendor. Please contact the administrator.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px", maxWidth: 600 }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Register New ODC</h1>
            <p style={{ color: "#555", marginBottom: 24 }}>
                Register a new ODC location. Your registration will be reviewed and approved by the administrator.
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

            {success && (
                <div style={{
                    padding: 12,
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                    borderRadius: 6,
                    marginBottom: 16
                }}>
                    ODC registered successfully! It is now pending admin approval. Redirecting to ODC list...
                </div>
            )}

            <div style={cardStyle}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>
                            ODC Name <span style={{ color: "#b91c1c" }}>*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Bangalore ODC-1"
                            style={inputStyle}
                            disabled={submitting || success}
                        />
                        <p style={helpTextStyle}>
                            Enter a unique name for this ODC location.
                        </p>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>
                            Location <span style={{ color: "#b91c1c" }}>*</span>
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Bangalore, India"
                            style={inputStyle}
                            disabled={submitting || success}
                        />
                        <p style={helpTextStyle}>
                            City and country where the ODC is located.
                        </p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={labelStyle}>Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Full street address (optional)"
                            rows={4}
                            style={{ ...inputStyle, resize: "vertical" }}
                            disabled={submitting || success}
                        />
                        <p style={helpTextStyle}>
                            Complete physical address of the ODC facility (optional).
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            type="submit"
                            style={primaryButtonStyle}
                            disabled={submitting || success}
                        >
                            {submitting ? "Registering..." : "Register ODC"}
                        </button>
                        <button
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={() => navigate("/vendor/odc")}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            <div style={{ ...cardStyle, marginTop: 16, backgroundColor: "#fef3c7", borderColor: "#fbbf24" }}>
                <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 8 }}>Note</h3>
                <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>
                    After registration, your ODC will be in "pending" status until approved by the administrator. 
                    You will be able to upload certificates and manage the ODC once it's approved.
                </p>
            </div>
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

const labelStyle = {
    display: "block",
    fontSize: 14,
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

const helpTextStyle = {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 0
};

const primaryButtonStyle = {
    padding: "10px 20px",
    borderRadius: 6,
    border: "1px solid transparent",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#111827",
    color: "#fff",
    fontWeight: 500
};

const secondaryButtonStyle = {
    padding: "10px 20px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#111827",
    fontWeight: 500
};

