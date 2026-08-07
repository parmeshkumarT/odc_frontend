import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Certificatetypes() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTypes = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("certificate_types")
                .select("id, name, category")
                .order("name", { ascending: true });

            if (error) {
                console.error("Error loading certificate types", error);
                setError(error.message || "Failed to load certificate types");
            } else {
                setTypes(data || []);
            }

            setLoading(false);
        };

        fetchTypes();
    }, []);

    const total = types.length;
    const logicalCount = types.filter((t) => t.category === "logical").length;
    const physicalCount = types.filter((t) => t.category === "physical").length;

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Certificate Types</h1>
            <p style={{ marginBottom: 16, color: "#555" }}>
                Fixed catalogue of {total || "‑"} review checklists split into logical and physical access
                controls.
            </p>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                <SummaryCard label="Total certificates" value={total || "‑"} />
                <SummaryCard label="Logical certificates" value={logicalCount || "‑"} />
                <SummaryCard label="Physical certificates" value={physicalCount || "‑"} />
            </div>

            <div
                style={{
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: 16
                }}
            >
                {loading && <p>Loading certificate types...</p>}

                {error && (
                    <p style={{ color: "#b91c1c", marginBottom: 8 }}>
                        {error}
                    </p>
                )}

                {!loading && !error && types.length === 0 && (
                    <p style={{ color: "#6b7280" }}>No certificate types defined yet.</p>
                )}

                {types.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "8px 4px" }}>Name</th>
                                <th style={{ padding: "8px 4px" }}>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map((t, index) => (
                                <tr
                                    key={t.id}
                                    style={{
                                        backgroundColor: index % 2 === 1 ? "#f9fafb" : "transparent"
                                    }}
                                >
                                    <td style={{ padding: "8px 4px" }}>{t.name}</td>
                                    <td style={{ padding: "8px 4px", textTransform: "capitalize" }}>
                                        {t.category}
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

function SummaryCard({ label, value }) {
    return (
        <div
            style={{
                minWidth: 180,
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                padding: 12
            }}
        >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20 }}>{value}</div>
        </div>
    );
}


