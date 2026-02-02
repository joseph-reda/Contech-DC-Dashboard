import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar() {
    const [user, setUser] = useState(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("user") || "null");
        setUser(saved);
    }, [location]);

    // Close mobile menu when route changes
    useEffect(() => {
        setShowMobileMenu(false);
    }, [location.pathname]);

    if (!user || !user.role) return null;

    const logout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes("/dc") && !path.includes("archive")) return "DC Dashboard";
        if (path.includes("/dc-archive")) return "DC Archive";
        if (path.includes("/engineer")) {
            const searchParams = new URLSearchParams(location.search);
            const type = searchParams.get("type");
            if (type === "CPR") return "Concrete Pouring Request";
            if (type === "IR") return "Inspection Request";
            return "Engineer Dashboard";
        }
        if (path.includes("/engineer-records")) return "My Records";
        if (path.includes("/admin")) return "Admin Panel";
        if (path.includes("/login")) return "Login";
        return "IR System";
    };

    const getNavColor = () => {
        if (!user?.role) return "from-blue-900 to-blue-700";
        if (user.role === "admin") return "from-purple-900 to-purple-700";
        if (user.role === "dc") return "from-blue-900 to-blue-700";
        if (user.role === "engineer") {
            const path = location.pathname;
            const searchParams = new URLSearchParams(location.search);
            const type = searchParams.get("type");
            if (type === "CPR") return "from-green-900 to-green-700";
            return "from-indigo-900 to-indigo-700";
        }
        return "from-blue-900 to-blue-700";
    };

    const isEngineerCivil = user.department?.toLowerCase().includes("civil") || 
                           user.department?.toLowerCase().includes("structure");

    return (
        <>
            <nav className={`bg-gradient-to-r ${getNavColor()} text-white shadow-lg sticky top-0 z-40`}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo/Brand */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="md:hidden p-2 rounded-lg hover:bg-white/10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                </svg>
                            </button>
                            <Link to={user.role === "admin" ? "/admin" : user.role === "dc" ? "/dc" : "/engineer"} 
                                  className="text-xl font-bold tracking-wide select-none flex items-center gap-2">
                                {user.role === "admin" && "👑 "}
                                {user.role === "dc" && "📁 "}
                                {user.role === "engineer" && "👷 "}
                                {getPageTitle()}
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6">
                            {user.role === "admin" && (
                                <>
                                    <NavItem to="/dc" label="DC Dashboard" active={location.pathname === "/dc"} />
                                    <NavItem to="/engineer" label="Engineer" active={location.pathname === "/engineer"} />
                                    <NavItem to="/projects-admin" label="Projects" active={location.pathname.includes("projects")} />
                                    <NavItem to="/users-admin" label="Users" active={location.pathname.includes("users")} />
                                    <NavItem to="/dc-archive" label="DC Archive" active={location.pathname.includes("archive")} />
                                </>
                            )}

                            {user.role === "dc" && (
                                <>
                                    <NavItem to="/dc" label="Dashboard" active={location.pathname === "/dc"} />
                                    <NavItem to="/dc-archive" label="Archive" active={location.pathname.includes("archive")} />
                                </>
                            )}

                            {user.role === "engineer" && (
                                <div className="flex items-center gap-6">
                                    <div className="flex gap-4 border-l pl-4 border-white/30">
                                        <NavItem 
                                            to="/engineer?type=IR" 
                                            label="IR" 
                                            active={location.pathname === "/engineer" && 
                                                   (!location.search || location.search.includes("type=IR"))} 
                                        />
                                        {isEngineerCivil && (
                                            <NavItem 
                                                to="/engineer?type=CPR" 
                                                label="CPR" 
                                                active={location.pathname === "/engineer" && 
                                                       location.search.includes("type=CPR")} 
                                            />
                                        )}
                                    </div>
                                    <NavItem to="/engineer-records" label="My Records" active={location.pathname.includes("records")} />
                                </div>
                            )}

                            {/* User Info & Logout */}
                            <div className="flex items-center gap-4 pl-6 border-l border-white/30">
                                <div className="text-sm">
                                    <div className="font-medium">{user.username}</div>
                                    <div className="text-white/70 text-xs">{user.department}</div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* Mobile Logout Button */}
                        <div className="md:hidden">
                            <button
                                onClick={logout}
                                className="p-2 rounded-lg hover:bg-white/10"
                                title="Logout"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {showMobileMenu && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileMenu(false)}>
                    <div className="absolute top-16 left-0 right-0 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-lg" 
                         onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-6 space-y-4">
                            {/* User Info */}
                            <div className="px-4 py-3 bg-white/10 rounded-lg mb-4">
                                <div className="font-bold text-lg">{user.username}</div>
                                <div className="text-white/70 text-sm">{user.department}</div>
                                <div className="text-xs text-white/50 mt-1">{user.role.toUpperCase()}</div>
                            </div>

                            {/* Navigation Links */}
                            <div className="space-y-2">
                                {user.role === "admin" && (
                                    <>
                                        <MobileNavItem to="/dc" label="DC Dashboard" />
                                        <MobileNavItem to="/engineer" label="Engineer" />
                                        <MobileNavItem to="/projects-admin" label="Projects" />
                                        <MobileNavItem to="/users-admin" label="Users" />
                                        <MobileNavItem to="/dc-archive" label="DC Archive" />
                                    </>
                                )}

                                {user.role === "dc" && (
                                    <>
                                        <MobileNavItem to="/dc" label="Dashboard" />
                                        <MobileNavItem to="/dc-archive" label="Archive" />
                                    </>
                                )}

                                {user.role === "engineer" && (
                                    <>
                                        <div className="px-4 py-2 text-xs font-bold text-white/50">REQUEST TYPE</div>
                                        <MobileNavItem to="/engineer?type=IR" label="Inspection Request (IR)" />
                                        {isEngineerCivil && (
                                            <MobileNavItem to="/engineer?type=CPR" label="Concrete Pouring (CPR)" />
                                        )}
                                        <div className="border-t border-white/20 my-2"></div>
                                        <MobileNavItem to="/engineer-records" label="My Records" />
                                    </>
                                )}
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={logout}
                                className="w-full mt-6 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-semibold shadow-md transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function NavItem({ to, label, active = false }) {
    return (
        <Link
            to={to}
            className={`relative group font-medium transition select-none px-1 py-2 ${
                active ? "text-white font-semibold" : "text-white/90 hover:text-white"
            }`}
        >
            <span>{label}</span>
            <div className={`absolute left-0 -bottom-1 h-[2px] bg-white transition-all ${
                active ? "w-full" : "w-0 group-hover:w-full"
            }`}></div>
        </Link>
    );
}

function MobileNavItem({ to, label }) {
    const location = useLocation();
    const isActive = location.pathname + location.search === to || 
                    (to.includes("engineer?") && location.pathname === "/engineer" && location.search === to.split("?")[1]);

    return (
        <Link
            to={to}
            className={`block px-4 py-3 rounded-lg transition ${
                isActive 
                    ? "bg-white/20 text-white font-semibold" 
                    : "hover:bg-white/10 text-white/90"
            }`}
        >
            <div className="flex items-center justify-between">
                <span>{label}</span>
                {isActive && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </div>
        </Link>
    );
}