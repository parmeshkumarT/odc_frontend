import { useState } from "react";
import { supabase } from "../../lib/supabase";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("password"); // "password" | "magic"
    const [loading, setLoading] = useState(false);

    const handleMagicLinkLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: "http://localhost:5173",
            },
        });

        setLoading(false);

        if (error) {
            alert(error.message);
        } else {
            alert("Magic link sent! Check your email.");
        }
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            alert(error.message);
        }
    };

    const onSubmit = mode === "magic" ? handleMagicLinkLogin : handlePasswordLogin;

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-md">
                <h2 className="text-3xl font-bold mb-4">Login</h2>

                <div className="flex mb-4 border rounded-md overflow-hidden text-sm">
                    <button
                        type="button"
                        className={`flex-1 py-2 ${mode === "password" ? "bg-black text-white" : "bg-white"}`}
                        onClick={() => setMode("password")}
                    >
                        Password
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-2 ${mode === "magic" ? "bg-black text-white" : "bg-white"}`}
                        onClick={() => setMode("magic")}
                    >
                        Magic link
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        className="w-full border p-3 rounded-md mb-3"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {mode === "password" && (
                        <input
                            type="password"
                            placeholder="Your password"
                            className="w-full border p-3 rounded-md mb-4"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800"
                    >
                        {loading
                            ? "Processing..."
                            : mode === "magic"
                            ? "Send magic link (first login)"
                            : "Login"}
                    </button>
                </form>

                <hr className="my-6" />

                <p className="text-sm text-gray-600">
                    Vendors: use the magic link you received for your **first** login. After setting your
                    password, use the Password tab for all future logins.
                </p>
            </div>
        </div>
    );
};

export default Login;
