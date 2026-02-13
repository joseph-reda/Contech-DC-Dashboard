import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../config";

export default function LoginPage({ setUser }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault(); // X reload page on form submit
        setLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    username: username.trim().toLowerCase(),
                    password: password.trim(),
                }),
                credentials: 'include', // for CORS
            });

            if (!res.ok) {
                try {
                    const errorData = await res.json();
                    setErrorMsg(errorData.error || `Login failed (Status: ${res.status})`);
                } catch {
                    setErrorMsg(`Login failed (Status: ${res.status})`);
                }
                setLoading(false);
                return;
            }

            const json = await res.json();

            if (!json.user) {
                setErrorMsg("Invalid response from server");
                setLoading(false);
                return;
            }

            // Save user data
            localStorage.setItem("user", JSON.stringify(json.user));
            setUser(json.user);

            if (json.user.role === "admin") {
                navigate("/admin");
            } else if (json.user.role === "dc") {
                navigate("/dc");
            } else {
                navigate("/engineer");
            }
        } catch (err) {
            console.error("Login error:", err);
            setErrorMsg(err.message === "Failed to fetch" 
                ? "Cannot connect to server. Please check your internet connection." 
                : "Network error, please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleLogin(e);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 px-4">
            <form
                onSubmit={handleLogin}
                className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-300 hover:shadow-2xl"
                onKeyPress={handleKeyPress}
            >
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 tracking-wide">
                    🔐 Login
                </h2>

                {errorMsg && (
                    <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-center text-sm animate-pulse">
                        {errorMsg}
                    </div>
                )}

                {/* USERNAME */}
                <div className="mb-5">
                    <label className="block mb-1 text-gray-600 font-medium">Username</label>
                    <input
                        type="text"
                        className="border w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                        disabled={loading} // Prevent changes while loading
                        placeholder="Enter your username"
                    />
                </div>

                {/* PASSWORD */}
                <div className="mb-6">
                    <label className="block mb-1 text-gray-600 font-medium">Password</label>
                    <input
                        type="password"
                        className="border w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        disabled={loading}
                        placeholder="Enter your password"
                    />
                </div>

                {/* LOGIN BUTTON */}
                <button
                    type="submit"
                    disabled={loading || !username || !password}
                    className={`w-full text-white py-3 rounded-lg font-semibold transition duration-300 ${
                        loading || !username || !password
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1"
                    }`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Logging in...
                        </div>
                    ) : (
                        "Login"
                    )}
                </button>
            </form>
        </div>
    );
}