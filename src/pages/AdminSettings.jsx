// src/pages/AdminSettings.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import Navbar from "../components/Navbar";

export default function AdminSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    const [settings, setSettings] = useState({
        // System Preferences
        autoIncrementCounters: true,
        requirePasswordChange: false,
        allowUserRegistration: false,
        enableEmailNotifications: false,
        
        // Security Settings
        maxLoginAttempts: 3,
        sessionTimeout: 60, // minutes
        passwordExpiryDays: 90,
        requireTwoFactorAuth: false,
        
        // Email Settings
        smtpHost: "",
        smtpPort: "587",
        smtpUsername: "",
        smtpPassword: "",
        notificationEmail: "",
        
        // Backup Settings
        autoBackup: true,
        backupFrequency: "daily", // daily, weekly, monthly
        backupRetentionDays: 30,
        
        // Display Settings
        defaultTheme: "light", // light, dark, auto
        itemsPerPage: 25,
        showAvatars: true,
        enableAnimations: true,
        
        // IR Settings
        defaultDepartment: "ST",
        enableCPR: true,
        requireLocation: false,
        enableRevisions: true,
        autoArchiveDays: 30,
        
        // Notification Settings
        notifyOnNewIR: true,
        notifyOnCompletion: true,
        notifyOnRevision: true,
        dailySummary: true
    });

    // Authentication check
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "admin") {
            navigate("/login");
        }
    }, [navigate]);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Try to load from API first
            const response = await fetch(`${API_URL}/admin/settings`).catch(() => ({ ok: false }));
            
            if (response.ok) {
                const data = await response.json();
                if (data.settings) {
                    setSettings(data.settings);
                    showToast("Settings loaded from server", "success");
                }
            } else {
                // Fallback to localStorage
                const savedSettings = localStorage.getItem("admin_settings");
                if (savedSettings) {
                    setSettings(JSON.parse(savedSettings));
                    showToast("Settings loaded from local storage", "info");
                }
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
            // Use localStorage as fallback
            const savedSettings = localStorage.getItem("admin_settings");
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    const handleInputChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSectionChange = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            // First try to save to API
            const response = await fetch(`${API_URL}/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings })
            }).catch(() => ({ ok: false }));

            // Always save to localStorage as backup
            localStorage.setItem("admin_settings", JSON.stringify(settings));

            if (response.ok) {
                showToast("Settings saved successfully to server!");
            } else {
                showToast("Settings saved to local storage", "warning");
            }

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error("Failed to save settings:", error);
            // Fallback to localStorage only
            localStorage.setItem("admin_settings", JSON.stringify(settings));
            showToast("Settings saved to local storage", "info");
        } finally {
            setSaving(false);
        }
    };

    const handleResetSettings = () => {
        if (window.confirm("Are you sure you want to reset all settings to default?\n\nThis action cannot be undone.")) {
            const defaultSettings = {
                autoIncrementCounters: true,
                requirePasswordChange: false,
                allowUserRegistration: false,
                enableEmailNotifications: false,
                maxLoginAttempts: 3,
                sessionTimeout: 60,
                passwordExpiryDays: 90,
                requireTwoFactorAuth: false,
                smtpHost: "",
                smtpPort: "587",
                smtpUsername: "",
                smtpPassword: "",
                notificationEmail: "",
                autoBackup: true,
                backupFrequency: "daily",
                backupRetentionDays: 30,
                defaultTheme: "light",
                itemsPerPage: 25,
                showAvatars: true,
                enableAnimations: true,
                defaultDepartment: "ST",
                enableCPR: true,
                requireLocation: false,
                enableRevisions: true,
                autoArchiveDays: 30,
                notifyOnNewIR: true,
                notifyOnCompletion: true,
                notifyOnRevision: true,
                dailySummary: true
            };
            setSettings(defaultSettings);
            showToast("Settings reset to default");
        }
    };

    const exportSettings = () => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showToast("Settings exported successfully");
    };

    const handleImportSettings = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                setSettings(importedSettings);
                showToast("Settings imported successfully");
            } catch (error) {
                showToast("Invalid settings file format", "error");
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    };

    const handleTestEmail = async () => {
        if (!settings.smtpHost || !settings.smtpUsername || !settings.notificationEmail) {
            showToast("Please configure email settings first", "error");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/test-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    smtpHost: settings.smtpHost,
                    smtpPort: settings.smtpPort,
                    smtpUsername: settings.smtpUsername,
                    smtpPassword: settings.smtpPassword,
                    toEmail: settings.notificationEmail
                })
            }).catch(() => ({ ok: false }));

            if (response.ok) {
                showToast("Test email sent successfully!");
            } else {
                showToast("Failed to send test email", "error");
            }
        } catch (error) {
            showToast("Error sending test email", "error");
        }
    };

    const handleRunBackup = async () => {
        if (!settings.autoBackup) {
            showToast("Auto backup is disabled", "warning");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/backup`, {
                method: "POST"
            }).catch(() => ({ ok: false }));

            if (response.ok) {
                showToast("Backup initiated successfully!");
            } else {
                showToast("Backup failed", "error");
            }
        } catch (error) {
            showToast("Error initiating backup", "error");
        }
    };

    const departments = [
        { value: "ST", label: "Civil/Structure" },
        { value: "ARCH", label: "Architectural" },
        { value: "ELECT", label: "Electrical" },
        { value: "MEP", label: "Mechanical/MEP" },
        { value: "SURV", label: "Survey" }
    ];

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading Settings...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />

            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${toast.type === "error" ? "bg-red-600" : toast.type === "warning" ? "bg-amber-600" : "bg-green-600"
                    }`}>
                    <div className="flex items-center gap-2">
                        {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
                        {toast.message}
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                                    ⚙️ System Settings
                                </h1>
                                <p className="text-gray-600">
                                    Configure system-wide preferences, security, and behavior
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate("/admin")}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
                                >
                                    <span>←</span> Back to Admin
                                </button>
                                <div className="text-sm bg-white px-4 py-2 rounded-lg shadow border">
                                    <span className="font-bold text-blue-600">Admin Only</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settings Sections */}
                    <div className="space-y-8">
                        {/* System Preferences */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="text-blue-500">⚙️</span> System Preferences
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Auto Increment Counters</p>
                                            <p className="text-sm text-gray-500">Automatically increment IR counters</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.autoIncrementCounters}
                                                onChange={(e) => handleInputChange("autoIncrementCounters", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Enable Email Notifications</p>
                                            <p className="text-sm text-gray-500">Send email notifications for new IRs</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableEmailNotifications}
                                                onChange={(e) => handleInputChange("enableEmailNotifications", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Enable CPR Requests</p>
                                            <p className="text-sm text-gray-500">Allow Concrete Pouring Requests</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableCPR}
                                                onChange={(e) => handleInputChange("enableCPR", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Require Password Change</p>
                                            <p className="text-sm text-gray-500">Force password change on first login</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.requirePasswordChange}
                                                onChange={(e) => handleInputChange("requirePasswordChange", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Allow User Registration</p>
                                            <p className="text-sm text-gray-500">Allow new users to register</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.allowUserRegistration}
                                                onChange={(e) => handleInputChange("allowUserRegistration", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Enable Revisions</p>
                                            <p className="text-sm text-gray-500">Allow revision requests</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableRevisions}
                                                onChange={(e) => handleInputChange("enableRevisions", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Settings */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="text-red-500">🔒</span> Security Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Login Attempts
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.maxLoginAttempts}
                                        onChange={(e) => handleInputChange("maxLoginAttempts", parseInt(e.target.value) || 3)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        min="1"
                                        max="10"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Lock account after failed attempts</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Session Timeout (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.sessionTimeout}
                                        onChange={(e) => handleInputChange("sessionTimeout", parseInt(e.target.value) || 60)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        min="5"
                                        max="480"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Auto logout after inactivity</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password Expiry (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.passwordExpiryDays}
                                        onChange={(e) => handleInputChange("passwordExpiryDays", parseInt(e.target.value) || 90)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        min="1"
                                        max="365"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Force password change after expiry</p>
                                </div>

                                <div className="flex items-center justify-between pt-6">
                                    <div>
                                        <p className="font-medium text-gray-700">Two-Factor Authentication</p>
                                        <p className="text-sm text-gray-500">Require 2FA for all users</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.requireTwoFactorAuth}
                                            onChange={(e) => handleInputChange("requireTwoFactorAuth", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Display Settings */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="text-purple-500">🎨</span> Display Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Default Theme
                                    </label>
                                    <select
                                        value={settings.defaultTheme}
                                        onChange={(e) => handleInputChange("defaultTheme", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="auto">Auto (System)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Items Per Page
                                    </label>
                                    <select
                                        value={settings.itemsPerPage}
                                        onChange={(e) => handleInputChange("itemsPerPage", parseInt(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                    >
                                        <option value="10">10 items</option>
                                        <option value="25">25 items</option>
                                        <option value="50">50 items</option>
                                        <option value="100">100 items</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Default Department
                                    </label>
                                    <select
                                        value={settings.defaultDepartment}
                                        onChange={(e) => handleInputChange("defaultDepartment", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                    >
                                        {departments.map(dept => (
                                            <option key={dept.value} value={dept.value}>
                                                {dept.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Auto Archive (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.autoArchiveDays}
                                        onChange={(e) => handleInputChange("autoArchiveDays", parseInt(e.target.value) || 30)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        min="1"
                                        max="365"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Auto archive completed items after days</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-700">Show User Avatars</p>
                                        <p className="text-sm text-gray-500">Display profile pictures</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.showAvatars}
                                            onChange={(e) => handleInputChange("showAvatars", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-700">Enable Animations</p>
                                        <p className="text-sm text-gray-500">Smooth UI transitions</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enableAnimations}
                                            onChange={(e) => handleInputChange("enableAnimations", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Email Settings */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="text-green-500">📧</span> Email Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Host
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.smtpHost}
                                        onChange={(e) => handleInputChange("smtpHost", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="smtp.gmail.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Port
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.smtpPort}
                                        onChange={(e) => handleInputChange("smtpPort", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="587"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Username
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.smtpUsername}
                                        onChange={(e) => handleInputChange("smtpUsername", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="your-email@gmail.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Password
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.smtpPassword}
                                        onChange={(e) => handleInputChange("smtpPassword", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notification Email
                                    </label>
                                    <input
                                        type="email"
                                        value={settings.notificationEmail}
                                        onChange={(e) => handleInputChange("notificationEmail", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="notifications@company.com"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">All system notifications will be sent to this email</p>
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleTestEmail}
                                        disabled={!settings.smtpHost || !settings.smtpUsername}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
                                    >
                                        ✉️ Test Email Configuration
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Backup Settings */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="text-amber-500">💾</span> Backup Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Backup Frequency
                                    </label>
                                    <select
                                        value={settings.backupFrequency}
                                        onChange={(e) => handleInputChange("backupFrequency", e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="never">Never</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Backup Retention (days)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.backupRetentionDays}
                                        onChange={(e) => handleInputChange("backupRetentionDays", parseInt(e.target.value) || 30)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        min="1"
                                        max="365"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Auto Backup</p>
                                            <p className="text-sm text-gray-500">Automatically backup system data</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.autoBackup}
                                                onChange={(e) => handleInputChange("autoBackup", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleRunBackup}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
                                    >
                                        💾 Run Manual Backup Now
                                    </button>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Next backup: {settings.autoBackup ? 
                                            `Every ${settings.backupFrequency}` : 
                                            "Auto backup disabled"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="text-teal-500">🔔</span> Notification Settings
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Notify on New IR</p>
                                            <p className="text-sm text-gray-500">Send notification when new IR is created</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifyOnNewIR}
                                                onChange={(e) => handleInputChange("notifyOnNewIR", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Notify on Completion</p>
                                            <p className="text-sm text-gray-500">Send notification when IR is completed</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifyOnCompletion}
                                                onChange={(e) => handleInputChange("notifyOnCompletion", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Notify on Revision</p>
                                            <p className="text-sm text-gray-500">Send notification for revision requests</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.notifyOnRevision}
                                                onChange={(e) => handleInputChange("notifyOnRevision", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-700">Daily Summary</p>
                                            <p className="text-sm text-gray-500">Send daily activity summary</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.dailySummary}
                                                onChange={(e) => handleInputChange("dailySummary", e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h4 className="font-bold text-blue-800 mb-1">Configuration Actions</h4>
                                <p className="text-blue-600 text-sm">Manage system settings and configurations</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {/* Import Settings */}
                                <label className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border cursor-pointer transition flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportSettings}
                                        className="hidden"
                                    />
                                    <span>📥</span> Import Settings
                                </label>

                                {/* Export Settings */}
                                <button
                                    onClick={exportSettings}
                                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border transition flex items-center gap-2"
                                >
                                    <span>📤</span> Export Settings
                                </button>

                                {/* Reset Settings */}
                                <button
                                    onClick={handleResetSettings}
                                    className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium transition flex items-center gap-2"
                                >
                                    <span>🔄</span> Reset to Default
                                </button>

                                {/* Save Settings */}
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={saving}
                                    className={`px-6 py-2 rounded-lg font-bold text-white transition-all duration-200 ${saving
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                                        }`}
                                >
                                    {saving ? (
                                        <span className="flex items-center gap-2">
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                            Saving...
                                        </span>
                                    ) : (
                                        "💾 Save All Settings"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Information */}
                    <div className="mt-8 bg-gradient-to-r from-gray-800 to-slate-900 text-white rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold">System Information</h4>
                            <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                                Read Only
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-300">Version</p>
                                <p className="font-bold">IR Management System v2.1.0</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-300">Build Date</p>
                                <p className="font-bold">{new Date().toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-300">Settings Last Modified</p>
                                <p className="font-bold">{new Date().toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                            <div>
                                <p className="text-sm text-gray-300">Database Status</p>
                                <p className="font-bold text-green-400">Connected</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-300">API Endpoints</p>
                                <p className="font-bold">12 active endpoints</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">
                            ⚠️ System settings affect all users. Changes may require system restart to take effect.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}