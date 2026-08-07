import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";

export default function Users() {
    const { profile, loading: profileLoading } = useProfile();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [formData, setFormData] = useState({
        email: "",
        full_name: "",
        role: "odc_user"
    });

    useEffect(() => {
        if (!profile?.vendor_id) return;
        loadUsers();
    }, [profile?.vendor_id]);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load all users for this vendor
            const { data: userData, error: userError } = await supabase
                .from("profiles")
                .select("id, user_id, email, full_name, role, odc_id, is_active, created_at")
                .eq("vendor_id", profile.vendor_id)
                .order("created_at", { ascending: false });

            if (userError) {
                console.error("Error loading users", userError);
                setError("Failed to load users: " + (userError.message || "Unknown error"));
                setLoading(false);
                return;
            }

            // Load ODC names for users
            const odcIds = [...new Set((userData || []).map(u => u.odc_id).filter(Boolean))];
            const odcMap = {};
            
            if (odcIds.length > 0) {
                const { data: odcData, error: odcError } = await supabase
                    .from("odc_locations")
                    .select("id, name")
                    .in("id", odcIds);

                if (!odcError && odcData) {
                    odcData.forEach(odc => {
                        odcMap[odc.id] = odc.name;
                    });
                }
            }

            // Add ODC names to user data
            const usersWithODC = (userData || []).map(user => ({
                ...user,
                odc_name: user.odc_id ? odcMap[user.odc_id] : null
            }));

            setUsers(usersWithODC);
        } catch (err) {
            console.error("Error loading users", err);
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError(null);

        if (!formData.email || !formData.full_name) {
            setCreateError("Email and full name are required.");
            return;
        }

        if (!profile?.vendor_id) {
            setCreateError("Your profile is not linked to a vendor.");
            return;
        }

        setCreating(true);

        try {
            // Note: This creates a profile record, but you'll need to create the auth user separately
            // In production, you'd want to create the auth user first, then the profile
            setCreateError("User creation requires creating an auth user first. Please create the user in Supabase Auth, then link the profile manually, or implement a backend function for this.");
            setCreating(false);
        } catch (err) {
            console.error("Error creating user", err);
            setCreateError("Failed to create user. Please try again.");
            setCreating(false);
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ is_active: !currentStatus })
                .eq("id", userId);

            if (updateError) {
                console.error("Error updating user status", updateError);
                alert(updateError.message || "Failed to update user status");
                return;
            }

            loadUsers();
        } catch (err) {
            console.error("Error updating user status", err);
            alert("An unexpected error occurred");
        }
    };

    if (profileLoading) {
        return (
            <div style={{ padding: "24px" }}>
                <p style={{ color: "#6b7280" }}>Loading profile...</p>
            </div>
        );
    }

    if (!profile?.vendor_id) {
        return (
            <div style={{ padding: "24px" }}>
                <h1 style={{ fontSize: 24, marginBottom: 12 }}>Users</h1>
                <p style={{ color: "#b91c1c" }}>
                    Your profile is not linked to a vendor. Please contact the administrator.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: "24px" }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Users</h1>
            <p style={{ marginBottom: 16, color: "#555" }}>
                Manage users associated with your vendor account.
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

            {/* Create User Form */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 18, marginBottom: 12 }}>Add New User</h2>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                    To add a new user, create them in Supabase Auth first, then create a profile record with vendor_id linked.
                </p>
                
                {createError && (
                    <p style={{ color: "#b91c1c", marginBottom: 8, fontSize: 14 }}>{createError}</p>
                )}
            </div>

            {/* Users List */}
            {loading ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>Loading users...</p>
                </div>
            ) : users.length === 0 ? (
                <div style={cardStyle}>
                    <p style={{ color: "#6b7280" }}>No users found for this vendor.</p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "12px 8px" }}>Name</th>
                                <th style={{ padding: "12px 8px" }}>Email</th>
                                <th style={{ padding: "12px 8px" }}>Role</th>
                                <th style={{ padding: "12px 8px" }}>ODC</th>
                                <th style={{ padding: "12px 8px" }}>Status</th>
                                <th style={{ padding: "12px 8px" }}>Created</th>
                                <th style={{ padding: "12px 8px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, index) => (
                                <tr
                                    key={user.id}
                                    style={{
                                        borderBottom: "1px solid #f3f4f6",
                                        backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb"
                                    }}
                                >
                                    <td style={{ padding: "12px 8px", fontWeight: 500 }}>
                                        {user.full_name || "—"}
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>{user.email || "—"}</td>
                                    <td style={{ padding: "12px 8px" }}>
                                        <span
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                backgroundColor: user.role === "vendor_admin" ? "#dbeafe" : "#f3f4f6",
                                                color: user.role === "vendor_admin" ? "#1e40af" : "#374151",
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        >
                                            {user.role || "—"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 8px", color: "#6b7280" }}>
                                        {user.odc_name || "—"}
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>
                                        <span
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                backgroundColor: user.is_active ? "#d1fae5" : "#fee2e2",
                                                color: user.is_active ? "#065f46" : "#991b1b",
                                                fontSize: 12,
                                                fontWeight: 500
                                            }}
                                        >
                                            {user.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 8px", color: "#6b7280", fontSize: 13 }}>
                                        {user.created_at 
                                            ? new Date(user.created_at).toLocaleDateString()
                                            : "—"}
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>
                                        <button
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: 4,
                                                border: "1px solid #d1d5db",
                                                fontSize: 12,
                                                cursor: "pointer",
                                                backgroundColor: "#fff"
                                            }}
                                            onClick={() => handleToggleActive(user.id, user.is_active)}
                                        >
                                            {user.is_active ? "Deactivate" : "Activate"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
    border: "1px solid #e5e7eb",
    marginBottom: 16
};

