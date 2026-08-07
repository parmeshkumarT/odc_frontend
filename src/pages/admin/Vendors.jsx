import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [vendorName, setVendorName] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [phone, setPhone] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [editingId, setEditingId] = useState(null);

    const { profile } = useProfile();

    const loadVendors = async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("vendors")
            .select("id, client_id, created_at, name, contact_person, phone, email")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading vendors", error);
            setError("Failed to load vendors");
        } else {
            setVendors(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadVendors();
    }, []);

    const handleCreateVendor = async (e) => {
        e.preventDefault();
        setCreateError(null);

        if (!vendorName || !adminEmail) {
            setCreateError("Vendor name and admin email are required.");
            return;
        }

        if (!profile?.client_id) {
            setCreateError(
                "Your profile is missing a client_id. Ask an admin to set client_id on your profile before creating vendors."
            );
            return;
        }

        setCreating(true);

        const payload = {
            client_id: profile.client_id,
            name: vendorName,
            contact_person: contactPerson || null,
            phone: phone || null,
            email: adminEmail
        };

        let vendorError = null;

        if (editingId) {
            const { error } = await supabase
                .from("vendors")
                .update(payload)
                .eq("id", editingId);
            vendorError = error;
        } else {
            const { error } = await supabase.from("vendors").insert([payload]);
            vendorError = error;
        }

        if (vendorError) {
            console.error("Error saving vendor", vendorError);
            setCreateError(vendorError.message || "Failed to save vendor");
            setCreating(false);
            return;
        }

        setVendorName("");
        setContactPerson("");
        setPhone("");
        setAdminEmail("");
        setEditingId(null);
        setCreating(false);
        loadVendors();
    };

    const handleEditClick = (vendor) => {
        setEditingId(vendor.id);
        setVendorName(vendor.name || "");
        setContactPerson(vendor.contact_person || "");
        setPhone(vendor.phone || "");
        setAdminEmail(vendor.email || "");
        setCreateError(null);
    };

    const handleDeleteVendor = async (id) => {
        if (!window.confirm("Delete this vendor? This cannot be undone.")) return;

        const { error: deleteError } = await supabase.from("vendors").delete().eq("id", id);
        if (deleteError) {
            console.error("Error deleting vendor", deleteError);
            alert(deleteError.message || "Failed to delete vendor");
            return;
        }

        loadVendors();
    };

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Vendors</h1>
            <p style={{ marginBottom: 16, color: "#555" }}>
                Central list of all vendor organizations onboarded into the ODC compliance program.
            </p>

            {/* Super admin: register a new vendor + vendor admin email */}
            <div
                style={{
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: 16,
                    marginBottom: 16
                }}
            >
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>
                    {editingId ? "Edit vendor" : "Register new vendor"}
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                    This creates a vendor record. <strong>After creating the vendor, you need to:</strong>
                </p>
                <ol style={{ fontSize: 13, color: "#6b7280", marginLeft: 20, marginBottom: 8 }}>
                    <li>Create a user account in Supabase Auth (Authentication → Users) with the vendor admin email</li>
                    <li>Create a profile record in the <code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>profiles</code> table with:
                        <ul style={{ marginTop: 4, marginLeft: 20 }}>
                            <li><code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>user_id</code>: The user's UUID</li>
                            <li><code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>vendor_id</code>: This vendor's UUID</li>
                            <li><code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>role</code>: <strong>"vendor_admin"</strong> (required)</li>
                            <li><code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>is_first_login</code>: <strong>true</strong></li>
                            <li><code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>client_id</code>: Same as your admin's client_id</li>
                            <li><code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: 3 }}>email</code>: Vendor admin email</li>
                        </ul>
                    </li>
                </ol>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                    The vendor can then use the magic link login for their first login, then set their password.
                </p>

                {createError && (
                    <p style={{ color: "#b91c1c", marginBottom: 8 }}>{createError}</p>
                )}

                <form
                    onSubmit={handleCreateVendor}
                    style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}
                >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: 12, marginBottom: 4 }}>Vendor name</label>
                        <input
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            required
                            style={{
                                padding: 6,
                                borderRadius: 4,
                                border: "1px solid #e5e7eb",
                                minWidth: 220
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: 12, marginBottom: 4 }}>Contact person</label>
                        <input
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            style={{
                                padding: 6,
                                borderRadius: 4,
                                border: "1px solid #e5e7eb",
                                minWidth: 200
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: 12, marginBottom: 4 }}>Phone</label>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{
                                padding: 6,
                                borderRadius: 4,
                                border: "1px solid #e5e7eb",
                                minWidth: 180
                            }}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: 12, marginBottom: 4 }}>Vendor admin email</label>
                        <input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            required
                            style={{
                                padding: 6,
                                borderRadius: 4,
                                border: "1px solid #e5e7eb",
                                minWidth: 260
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={creating}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 6,
                            border: "1px solid transparent",
                            backgroundColor: "#111827",
                            color: "#fff",
                            fontSize: 14,
                            cursor: "pointer"
                        }}
                    >
                        {creating ? "Saving..." : editingId ? "Save changes" : "Create vendor"}
                    </button>
                </form>
            </div>

            <div
                style={{
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: 16
                }}
            >
                {loading && <p>Loading vendors...</p>}
                {error && (
                    <p style={{ color: "#b91c1c", marginBottom: 8 }}>
                        {error}
                    </p>
                )}

                {!loading && !error && vendors.length === 0 && (
                    <p style={{ color: "#6b7280" }}>No vendors found yet.</p>
                )}

                {vendors.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "8px 4px" }}>Vendor</th>
                                <th style={{ padding: "8px 4px" }}>Contact person</th>
                                <th style={{ padding: "8px 4px" }}>Email</th>
                                <th style={{ padding: "8px 4px" }}>Phone</th>
                                <th style={{ padding: "8px 4px" }}>Created at</th>
                                <th style={{ padding: "8px 4px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendors.map((v, index) => (
                                <tr
                                    key={v.id}
                                    style={{
                                        backgroundColor: index % 2 === 1 ? "#f9fafb" : "transparent"
                                    }}
                                >
                                    <td style={{ padding: "8px 4px" }}>{v.name}</td>
                                    <td style={{ padding: "8px 4px" }}>{v.contact_person || "-"}</td>
                                    <td style={{ padding: "8px 4px" }}>{v.email || "-"}</td>
                                    <td style={{ padding: "8px 4px" }}>{v.phone || "-"}</td>
                                    <td style={{ padding: "8px 4px" }}>
                                        {v.created_at
                                            ? new Date(v.created_at).toLocaleDateString()
                                            : "-"}
                                    </td>
                                    <td style={{ padding: "8px 4px" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleEditClick(v)}
                                            style={{
                                                marginRight: 8,
                                                padding: "4px 8px",
                                                fontSize: 12,
                                                borderRadius: 4,
                                                border: "1px solid #e5e7eb",
                                                backgroundColor: "#fff",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteVendor(v.id)}
                                            style={{
                                                padding: "4px 8px",
                                                fontSize: 12,
                                                borderRadius: 4,
                                                border: "1px solid #fecaca",
                                                backgroundColor: "#fee2e2",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Delete
                                        </button>
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

