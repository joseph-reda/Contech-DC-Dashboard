// src/pages/DcPage.jsx - النسخة النهائية مع فصل CPR/IR وتحسين typesMap
import { useEffect, useState, useCallback, memo, useRef } from "react";
import { copyRow, copyAllRows } from "../firebaseService";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import {
    formatDateShort,
    getDepartmentAbbr,
    extractTime
} from "../utils/formatters";

// ==================== RevisionChip Component ====================
const RevisionChip = memo(({ rev, onMarkDone, onArchive }) => {
    const getRevDisplayNumber = (rev) => {
        if (!rev) return "REV";
        if (rev.displayNumber) return rev.displayNumber;
        if (rev.userRevNumber) {
            const prefix = rev.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
            return `${prefix}${rev.userRevNumber}`;
        }
        if (rev.revText) {
            const prefix = rev.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
            return `${prefix}${rev.revText}`;
        }
        return rev.revNo || "REV";
    };

    const getRevTypeClass = (rev) => {
        if (!rev) return "bg-gray-100 text-gray-800";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "bg-green-200 text-green-800";
        }
        return "bg-amber-200 text-amber-800";
    };

    const getRevTypeText = (rev) => {
        if (!rev) return "REVISION";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "CPR REV";
        }
        return "IR REV";
    };

    const displayNumber = getRevDisplayNumber(rev);
    const revTypeClass = getRevTypeClass(rev);
    const revTypeText = getRevTypeText(rev);
    const time = extractTime(rev.sentAt);

    return (
        <div className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${revTypeClass}`}>
                        {revTypeText}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-800 rounded">
                        {displayNumber}
                    </span>
                </div>
            </div>

            <div className="space-y-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        📌 {rev.project || "Unknown"}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        🏢 {getDepartmentAbbr(rev.department)}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        👤 {rev.user || "Unknown"}
                    </span>
                </div>
            </div>

            <div className="text-sm text-gray-700 mb-4 line-clamp-2">
                {rev.revNote || rev.desc || "No description"}
            </div>

            <div className="text-xs text-gray-500 mb-4">
                ⏰ {time} • {formatDateShort(rev.sentAt)}
            </div>

            <div className="flex gap-2">
                {!rev.isDone && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkDone(rev.irNo || rev.revNo);
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-black text-white rounded-lg transition flex-1"
                    >
                        Mark Done
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onArchive(rev.irNo || rev.revNo);
                    }}
                    className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition flex-1"
                >
                    Archive
                </button>
            </div>
        </div>
    );
});

// ==================== CPRTableRow Component (خاص بـ CPR) ====================
const CPRTableRow = memo(({ 
    ir, 
    customNumber, 
    isSaving,
    onUpdateSerial,
    onCopy,
    onDownloadWord,
    onArchive,
    isDownloaded,
    getTypeClass,
    getStatusClass,
    typesMap
}) => {
    const inputRef = useRef(null);
    const isLoading = isSaving[ir.irNo];
    
    // الحصول على نوع الموقع من typesMap
    const locationType = typesMap && ir.location ? typesMap[ir.location] : "CPR";

    const handleInputChange = (e) => {
        const value = e.target.value;
        onUpdateSerial(ir.irNo, value, false);
    };

    const handleUpdateClick = (e) => {
        e.stopPropagation();
        onUpdateSerial(ir.irNo, null, true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUpdateClick(e);
        }
    };

    const handleCopyClick = (e) => {
        e.stopPropagation();
        // تمرير typesMap مع الـ item للنسخ
        const itemWithType = {
            ...ir,
            typesMap: typesMap,
            locationType: locationType
        };
        onCopy(itemWithType);
    };

    return (
        <tr className="border-b bg-green-50 hover:bg-green-100 transition-colors">
            <td className="p-3 align-top">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                            CPR
                        </span>
                        <div className="relative flex-1 min-w-[300px]">
                            <div className="text-xs text-gray-500 mb-1 font-mono">
                                {ir.irNo}
                            </div>
                            <div className="relative mt-1">
                                <input
                                    ref={inputRef}
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none pr-20 font-mono bg-white"
                                    value={customNumber !== undefined ? customNumber : ir.irNo}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Change CPR number..."
                                    autoComplete="off"
                                    disabled={isLoading}
                                />
                                <button
                                    disabled={isLoading}
                                    onClick={handleUpdateClick}
                                    className={`absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded text-sm font-medium transition ${
                                        isLoading
                                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700 text-white"
                                    }`}
                                >
                                    {isLoading ? "..." : "Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="font-medium text-gray-800 line-clamp-2">{ir.desc}</div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                    {ir.location && <span>📍 {ir.location}</span>}
                    {ir.concreteGrade && <span>🧪 {ir.concreteGrade}</span>}
                    {ir.pouringElement && <span>🏗️ {ir.pouringElement}</span>}
                </div>
            </td>

            <td className="p-3 align-top">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                    CPR
                </span>
                <div className="text-xs text-gray-500 mt-1">
                    👤 {ir.user || "—"}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="space-y-1 min-w-[150px]">
                    {ir.tags?.engineer && ir.tags.engineer.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-blue-700">IR Attach:</span>
                            <div className="flex flex-wrap gap-1">
                                {ir.tags.engineer.map((tag, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs border border-blue-200 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {ir.tags?.sd && ir.tags.sd.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2">
                            <span className="text-xs font-semibold text-green-700">SD Attach:</span>
                            <div className="flex flex-wrap gap-1">
                                {ir.tags.sd.map((tag, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs border border-green-200 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* عرض نوع الموقع */}
                    {locationType && locationType !== "CPR" && (
                        <div className="mt-2 text-xs">
                            <span className="font-semibold text-purple-700">Type:</span>
                            <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                                {locationType}
                            </span>
                        </div>
                    )}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="text-gray-600 whitespace-pre-line text-sm">
                    {formatDateShort(ir.sentAt)}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="space-y-2">
                    {isDownloaded ? (
                        <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusClass(ir)}`}>
                                <span>✅</span> Done
                            </span>

                            {ir.downloadedBy && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    <span className="font-medium">📄 Downloaded by:</span> {ir.downloadedBy}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(ir)}`}>
                            ⏳ Pending
                        </span>
                    )}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="flex flex-col gap-2 min-w-[160px]">
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyClick}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition"
                        >
                            <span>📋</span> Copy
                        </button>
                        <button
                            onClick={() => onDownloadWord(ir)}
                            className={`flex-1 px-3 py-2 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition ${
                                isDownloaded
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                        >
                            <span>{isDownloaded ? "✅" : "📄"}</span>
                            {isDownloaded ? "Again" : "Word"}
                        </button>
                    </div>
                    <button
                        onClick={() => onArchive(ir.irNo)}
                        className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition"
                    >
                        <span>📁</span> Archive
                    </button>
                </div>
            </td>
        </tr>
    );
}, (prevProps, nextProps) => {
    return prevProps.ir.irNo === nextProps.ir.irNo &&
           prevProps.customNumber === nextProps.customNumber &&
           prevProps.isSaving[prevProps.ir.irNo] === nextProps.isSaving[nextProps.ir.irNo] &&
           prevProps.isDownloaded === nextProps.isDownloaded;
});

// ==================== IRTableRow Component (خاص بـ IR) ====================
const IRTableRow = memo(({ 
    ir, 
    customNumber, 
    isSaving,
    onUpdateSerial,
    onCopy,
    onDownloadWord,
    onArchive,
    isDownloaded,
    getTypeClass,
    getStatusClass,
    typesMap
}) => {
    const inputRef = useRef(null);
    const isLoading = isSaving[ir.irNo];
    
    // الحصول على نوع الموقع من typesMap
    const locationType = typesMap && ir.location ? typesMap[ir.location] : "IR";

    const handleInputChange = (e) => {
        const value = e.target.value;
        onUpdateSerial(ir.irNo, value, false);
    };

    const handleUpdateClick = (e) => {
        e.stopPropagation();
        onUpdateSerial(ir.irNo, null, true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUpdateClick(e);
        }
    };

    const handleCopyClick = (e) => {
        e.stopPropagation();
        // تمرير typesMap مع الـ item للنسخ
        const itemWithType = {
            ...ir,
            typesMap: typesMap,
            locationType: locationType
        };
        onCopy(itemWithType);
    };

    return (
        <tr className="border-b bg-blue-50 hover:bg-blue-100 transition-colors">
            <td className="p-3 align-top">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">
                            IR
                        </span>
                        <div className="relative flex-1 min-w-[300px]">
                            <div className="text-xs text-gray-500 mb-1 font-mono">
                                {ir.irNo}
                            </div>
                            <div className="relative mt-1">
                                <input
                                    ref={inputRef}
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-20 font-mono bg-white"
                                    value={customNumber !== undefined ? customNumber : ir.irNo}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Change IR number..."
                                    autoComplete="off"
                                    disabled={isLoading}
                                />
                                <button
                                    disabled={isLoading}
                                    onClick={handleUpdateClick}
                                    className={`absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded text-sm font-medium transition ${
                                        isLoading
                                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                >
                                    {isLoading ? "..." : "Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="font-medium text-gray-800 line-clamp-2">{ir.desc}</div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                    {ir.location && <span>📍 {ir.location}</span>}
                    {ir.floor && <span>🏢 {ir.floor}</span>}
                </div>
            </td>

            <td className="p-3 align-top">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                    IR
                </span>
                <div className="text-xs text-gray-500 mt-1">
                    👤 {ir.user || "—"}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="space-y-1 min-w-[150px]">
                    {ir.tags?.engineer && ir.tags.engineer.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-blue-700">IR Attach:</span>
                            <div className="flex flex-wrap gap-1">
                                {ir.tags.engineer.map((tag, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs border border-blue-200 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {ir.tags?.sd && ir.tags.sd.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2">
                            <span className="text-xs font-semibold text-green-700">SD Attach:</span>
                            <div className="flex flex-wrap gap-1">
                                {ir.tags.sd.map((tag, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs border border-green-200 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* عرض نوع الموقع */}
                    {locationType && locationType !== "IR" && (
                        <div className="mt-2 text-xs">
                            <span className="font-semibold text-purple-700">Type:</span>
                            <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                                {locationType}
                            </span>
                        </div>
                    )}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="text-gray-600 whitespace-pre-line text-sm">
                    {formatDateShort(ir.sentAt)}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="space-y-2">
                    {isDownloaded ? (
                        <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusClass(ir)}`}>
                                <span>✅</span> Done
                            </span>

                            {ir.downloadedBy && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    <span className="font-medium">📄 Downloaded by:</span> {ir.downloadedBy}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(ir)}`}>
                            ⏳ Pending
                        </span>
                    )}
                </div>
            </td>

            <td className="p-3 align-top">
                <div className="flex flex-col gap-2 min-w-[160px]">
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyClick}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition"
                        >
                            <span>📋</span> Copy
                        </button>
                        <button
                            onClick={() => onDownloadWord(ir)}
                            className={`flex-1 px-3 py-2 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition ${
                                isDownloaded
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                        >
                            <span>{isDownloaded ? "✅" : "📄"}</span>
                            {isDownloaded ? "Again" : "Word"}
                        </button>
                    </div>
                    <button
                        onClick={() => onArchive(ir.irNo)}
                        className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition"
                    >
                        <span>📁</span> Archive
                    </button>
                </div>
            </td>
        </tr>
    );
}, (prevProps, nextProps) => {
    return prevProps.ir.irNo === nextProps.ir.irNo &&
           prevProps.customNumber === nextProps.customNumber &&
           prevProps.isSaving[prevProps.ir.irNo] === nextProps.isSaving[nextProps.ir.irNo] &&
           prevProps.isDownloaded === nextProps.isDownloaded;
});

// ==================== ProjectSection Component ====================
const ProjectSection = memo(({ 
    project, 
    depts, 
    customNumbers, 
    savingSerials,
    onUpdateSerial,
    onCopy,
    onDownloadWord,
    onArchive,
    onMarkRevDone,
    onCopyAll,
    downloadedIRs,
    getTypeClass,
    getStatusClass,
    typesMap
}) => {
    const projectRevs = Object.values(depts).flat().filter(x => x.isRevision);
    const projectCPRs = Object.values(depts).flat().filter(x => !x.isRevision && (x.isCPR || x.requestType === "CPR"));
    const projectIRs = Object.values(depts).flat().filter(x => !x.isRevision && !x.isCPR && x.requestType !== "CPR");

    return (
        <section className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <div className="bg-gradient-to-r from-sky-700 to-sky-600 text-white p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            📌 {project}
                            <span className="text-sm font-normal bg-sky-800 px-3 py-1 rounded-full">
                                {Object.values(depts).flat().length} items
                            </span>
                        </h2>
                        <div className="flex flex-wrap gap-3 mt-2">
                            <span className="text-sky-200">
                                IR: {projectIRs.length}
                            </span>
                            <span className="text-green-200">
                                CPR: {projectCPRs.length}
                            </span>
                            <span className="text-amber-200">
                                REV: {projectRevs.length}
                            </span>
                            <span className="text-yellow-200">
                                Pending: {projectIRs.filter(x => !x.isDone).length + projectCPRs.filter(x => !x.isDone).length}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const allItems = Object.values(depts).flat();
                                onCopyAll(allItems.filter(item => !item.isRevision));
                            }}
                            className="px-4 py-2 bg-sky-800 hover:bg-sky-900 rounded-lg font-medium flex items-center gap-2 transition"
                        >
                            📋 Copy All IRs
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* REV Chips - Revision Section */}
                {projectRevs.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                            🔄 Pending Revisions ({projectRevs.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {projectRevs.map((rev) => (
                                <RevisionChip
                                    key={`${rev.irNo}-${rev.sentAt || ''}`}
                                    rev={rev}
                                    onMarkDone={onMarkRevDone}
                                    onArchive={onArchive}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* CPR Section - منفصل */}
                {projectCPRs.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white">
                                    C
                                </span>
                                Concrete Pouring Requests (CPR)
                                <span className="text-sm font-normal text-gray-500">
                                    ({projectCPRs.length} items)
                                </span>
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onCopyAll(projectCPRs)}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition"
                                >
                                    Copy All CPRs
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-green-200">
                            <table className="w-full">
                                <thead className="bg-green-700 text-white">
                                    <tr>
                                        <th className="p-3 text-left">CPR Number</th>
                                        <th className="p-3 text-left">Description</th>
                                        <th className="p-3 text-left">Type</th>
                                        <th className="p-3 text-left">Attachments</th>
                                        <th className="p-3 text-left">Sent At</th>
                                        <th className="p-3 text-left">Status</th>
                                        <th className="p-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectCPRs.map((ir) => (
                                        <CPRTableRow
                                            key={ir.irNo}
                                            ir={ir}
                                            customNumber={customNumbers[ir.irNo]}
                                            isSaving={savingSerials}
                                            onUpdateSerial={onUpdateSerial}
                                            onCopy={onCopy}
                                            onDownloadWord={onDownloadWord}
                                            onArchive={onArchive}
                                            isDownloaded={downloadedIRs.has(ir.irNo) || ir.isDone}
                                            getTypeClass={getTypeClass}
                                            getStatusClass={getStatusClass}
                                            typesMap={typesMap}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* IR Section - منفصل */}
                {projectIRs.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                    I
                                </span>
                                Inspection Requests (IR)
                                <span className="text-sm font-normal text-gray-500">
                                    ({projectIRs.length} items)
                                </span>
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onCopyAll(projectIRs)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
                                >
                                    Copy All IRs
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-blue-200">
                            <table className="w-full">
                                <thead className="bg-blue-700 text-white">
                                    <tr>
                                        <th className="p-3 text-left">IR Number</th>
                                        <th className="p-3 text-left">Description</th>
                                        <th className="p-3 text-left">Type</th>
                                        <th className="p-3 text-left">Attachments</th>
                                        <th className="p-3 text-left">Sent At</th>
                                        <th className="p-3 text-left">Status</th>
                                        <th className="p-3 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectIRs.map((ir) => (
                                        <IRTableRow
                                            key={ir.irNo}
                                            ir={ir}
                                            customNumber={customNumbers[ir.irNo]}
                                            isSaving={savingSerials}
                                            onUpdateSerial={onUpdateSerial}
                                            onCopy={onCopy}
                                            onDownloadWord={onDownloadWord}
                                            onArchive={onArchive}
                                            isDownloaded={downloadedIRs.has(ir.irNo) || ir.isDone}
                                            getTypeClass={getTypeClass}
                                            getStatusClass={getStatusClass}
                                            typesMap={typesMap}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
});

// ==================== Main DcPage Component ====================
export default function DcPage() {
    const navigate = useNavigate();
    
    // State
    const [irs, setIRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");
    const [customNumbers, setCustomNumbers] = useState({});
    const [savingSerials, setSavingSerials] = useState({});
    const [downloadedIRs, setDownloadedIRs] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);
    const [typesMap, setTypesMap] = useState({}); // إضافة typesMap
    
    // Refs
    const customNumbersRef = useRef({});
    const tableContainerRef = useRef(null);
    const scrollPositionRef = useRef(0);
    const searchTimeoutRef = useRef(null);

    // Filters
    const [filters, setFilters] = useState({
        project: "all",
        type: "all",
        status: "all",
        dateRange: "all",
        department: "all"
    });

    // Check authentication
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            navigate("/login");
        }
    }, [navigate]);

    // Helper functions
    const parseJsonSafe = async (response) => {
        const ct = response.headers.get("content-type") || "";
        if (ct.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            const text = await response.text();
            throw new Error(text || `Unexpected response (status ${response.status})`);
        }
    };

    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 2200);
    }, []);

    // Load locations and typesMap for a project
    const loadTypesMap = useCallback(async (project) => {
        if (!project) return {};
        
        try {
            const res = await fetch(`${API_URL}/locations?project=${project}`);
            if (res.ok) {
                const data = await res.json();
                return data.types_map || {};
            }
        } catch (err) {
            console.error("Error loading typesMap:", err);
        }
        return {};
    }, []);

    // Load all data
    const loadAllData = useCallback(async (preserveScroll = true) => {
        setLoading(true);
        setError(null);
        
        if (preserveScroll && tableContainerRef.current) {
            scrollPositionRef.current = tableContainerRef.current.scrollTop;
        }
        
        try {
            const [resIrs, resRevs] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`)
            ]);

            if (!resIrs.ok) throw new Error(`Failed to load IRs: ${resIrs.status}`);
            if (!resRevs.ok) throw new Error(`Failed to load Revisions: ${resRevs.status}`);

            const dataIrs = await parseJsonSafe(resIrs);
            const dataRevs = await parseJsonSafe(resRevs);

            const listIrs = dataIrs.irs || [];
            const listRevs = dataRevs.revs || [];

            // Load typesMap for each project
            const projects = [...new Set(listIrs.map(ir => ir.project).filter(Boolean))];
            const typesMapData = {};
            
            for (const project of projects) {
                const map = await loadTypesMap(project);
                typesMapData[project] = map;
            }
            setTypesMap(typesMapData);

            // Normalize IRs
            const normalizedIrs = listIrs.map((ir) => ({
                ...ir,
                isRevision: false,
                isCPR: ir.requestType === "CPR",
                floor: ir.floor || "",
                tags: ir.tags || { engineer: [], sd: [] },
                departmentAbbr: getDepartmentAbbr(ir.department),
                projectTypesMap: typesMapData[ir.project] || {} // إضافة typesMap الخاص بالمشروع
            }));

            // Normalize Revisions
            const normalizedRevs = listRevs.map((rev) => ({
                ...rev,
                isRevision: true,
                revText: rev.revText || rev.revNo?.split("-").pop() || "R1",
                irNo: rev.revNo || rev.irNo || "",
                department: rev.department || "UNKNOWN",
                project: rev.project || "UNKNOWN",
                sentAt: rev.sentAt || null,
                desc: rev.desc || rev.revNote || "",
                revisionType: rev.revisionType || "IR_REVISION",
                parentRequestType: rev.parentRequestType || "IR",
                tags: rev.tags || { engineer: [], sd: [] },
                downloadedBy: rev.downloadedBy || "",
                downloadedAt: rev.downloadedAt || "",
                isDone: rev.isDone || false,
                departmentAbbr: getDepartmentAbbr(rev.department),
                userRevNumber: rev.userRevNumber || rev.revText,
                displayNumber: rev.displayNumber ||
                    (rev.userRevNumber ?
                        `REV-${rev.revisionType === "CPR_REVISION" ? "CPR-" : "IR-"}${rev.userRevNumber}` :
                        rev.revNo),
                isCPRRevision: rev.revisionType === "CPR_REVISION" || rev.isCPRRevision,
                isIRRevision: rev.revisionType === "IR_REVISION" || rev.isIRRevision,
                projectTypesMap: typesMapData[rev.project] || {}
            }));

            // Merge
            const merged = [...normalizedIrs, ...normalizedRevs];
            setIRs(merged);

            // Initialize custom numbers map
            const map = {};
            merged.forEach((item) => {
                if (!item.isRevision && item.irNo) {
                    map[item.irNo] = item.irNo;
                }
            });
            setCustomNumbers(map);
            customNumbersRef.current = map;

            setError(null);
        } catch (err) {
            console.error("Load error:", err);
            setError("Failed to load data. Please try again.");
            showToast("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [showToast, loadTypesMap]);

    // Load all data once
    useEffect(() => {
        loadAllData(false);
    }, [loadAllData]);

    // Debounced search
    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
        }, 300);
    }, []);

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Helper Functions for styling
    const getStatusClass = useCallback((item) => {
        if (item.isDone) return "bg-emerald-100 text-emerald-800";
        if (item.isRevision) return "bg-amber-100 text-amber-800";
        return "bg-yellow-100 text-yellow-800";
    }, []);

    const getTypeClass = useCallback((item) => {
        if (item.isRevision) {
            if (item.revisionType === "CPR_REVISION" || item.isCPRRevision) {
                return "bg-green-100 text-green-800";
            }
            return "bg-purple-100 text-purple-800";
        }
        if (item.isCPR || item.requestType === "CPR") return "bg-green-100 text-green-800";
        return "bg-blue-100 text-blue-800";
    }, []);

    const getTodayDateStr = useCallback(() => {
        const now = new Date();
        return now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, ' ');
    }, []);

    // Filter and search logic
    const filteredIRs = useCallback(() => {
        return irs.filter(ir => {
            if (filters.project !== "all" && ir.project !== filters.project) return false;

            if (filters.type !== "all") {
                if (filters.type === "ir" && (ir.isCPR || ir.isRevision)) return false;
                if (filters.type === "cpr" && (!ir.isCPR || ir.isRevision)) return false;
                if (filters.type === "revision" && !ir.isRevision) return false;
            }

            if (filters.status !== "all") {
                if (filters.status === "pending" && ir.isDone) return false;
                if (filters.status === "completed" && !ir.isDone) return false;
            }

            if (filters.department !== "all") {
                const dept = getDepartmentAbbr(ir.department);
                if (dept !== filters.department) return false;
            }

            if (filters.dateRange !== "all") {
                const itemDate = new Date(ir.sentAt || ir.receivedDate);
                const today = new Date();

                switch (filters.dateRange) {
                    case "today":
                        if (itemDate.toDateString() !== today.toDateString()) return false;
                        break;
                    case "week":
                        const weekAgo = new Date(today);
                        weekAgo.setDate(today.getDate() - 7);
                        if (itemDate < weekAgo) return false;
                        break;
                    case "month":
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(today.getMonth() - 1);
                        if (itemDate < monthAgo) return false;
                        break;
                }
            }

            // Search in full number
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const fullNumber = (ir.irNo || "").toLowerCase();
                
                return (
                    fullNumber.includes(term) ||
                    (ir.desc && ir.desc.toLowerCase().includes(term)) ||
                    (ir.project && ir.project.toLowerCase().includes(term)) ||
                    (ir.user && ir.user.toLowerCase().includes(term)) ||
                    (ir.location && ir.location.toLowerCase().includes(term))
                );
            }

            return true;
        });
    }, [irs, filters, searchTerm]);

    // Action Handlers
    const handleArchive = useCallback(async (irNo) => {
        const item = irs.find((x) => x.irNo === irNo || x.revNo === irNo);
        if (!item) {
            showToast("Item not found");
            return;
        }

        const itemName = item.isRevision ? "Revision" : (item.isCPR ? "CPR" : "IR");

        if (!window.confirm(`Archive ${itemName} ${irNo}?`)) return;

        try {
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo,
                    role: "dc",
                    isRevision: item.isRevision || false,
                }),
            });

            const json = await parseJsonSafe(res);
            if (!res.ok) throw new Error(json.error || "Archive failed");

            setIRs((prev) => prev.filter((x) => x.irNo !== irNo && x.revNo !== irNo));
            
            setCustomNumbers(prev => {
                const newMap = { ...prev };
                delete newMap[irNo];
                return newMap;
            });
            
            delete customNumbersRef.current[irNo];

            showToast(`✅ ${itemName} archived successfully!`);

        } catch (err) {
            console.error("Archive failed:", err);
            showToast(`❌ Archive failed: ${err.message}`);
        }
    }, [irs, showToast]);

    const markRevDone = useCallback(async (irNo) => {
        if (!window.confirm(`Mark revision ${irNo} as done?`)) return;

        try {
            const res = await fetch(`${API_URL}/revs/mark-done`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ irNo, role: "dc" }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to mark revision as done");

            setIRs((prev) =>
                prev.map((x) =>
                    (x.irNo === irNo || x.revNo === irNo) ? {
                        ...x,
                        isDone: true,
                        completedAt: new Date().toISOString()
                    } : x
                )
            );

            showToast("✅ Revision marked as done!");
        } catch (err) {
            console.error("markRevDone error:", err);
            showToast(`❌ Error: ${err.message}`);
        }
    }, [showToast]);

    const handleCopy = useCallback(async (ir) => {
        try {
            // الحصول على typesMap المناسب للمشروع
            const projectTypesMap = typesMap[ir.project] || {};
            
            // إضافة typesMap إلى الـ item قبل النسخ
            const itemWithType = {
                ...ir,
                typesMap: projectTypesMap,
                locationType: ir.location ? projectTypesMap[ir.location] : (ir.isCPR ? "CPR" : "IR")
            };
            await copyRow(itemWithType);
            showToast("✔ Copied!");
        } catch (err) {
            console.error("copy error:", err);
            showToast("Copy failed");
        }
    }, [typesMap, showToast]);

    const handleCopyAll = useCallback(async (list) => {
        try {
            // إضافة typesMap لجميع العناصر
            const listWithTypes = list.map(ir => {
                const projectTypesMap = typesMap[ir.project] || {};
                return {
                    ...ir,
                    typesMap: projectTypesMap,
                    locationType: ir.location ? projectTypesMap[ir.location] : (ir.isCPR ? "CPR" : "IR")
                };
            });
            await copyAllRows(listWithTypes);
            showToast("✔ All Non-REV Copied!");
        } catch (err) {
            console.error("copyAll error:", err);
            showToast("Copy all failed");
        }
    }, [typesMap, showToast]);

    const markItemAsDone = useCallback(async (item, newIrNo = null) => {
        const irNoToUse = newIrNo || item.irNo;

        try {
            const endpoint = item.isRevision ? `${API_URL}/revs/mark-done` : `${API_URL}/irs/mark-done`;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ irNo: irNoToUse, role: "dc" }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to mark item as done");
            }

            setIRs(prev =>
                prev.map(x =>
                    x.irNo === item.irNo
                        ? {
                            ...x,
                            isDone: true,
                            downloadedBy: JSON.parse(localStorage.getItem("user") || "null")?.username || "dc",
                            downloadedAt: new Date().toISOString(),
                            ...(newIrNo && { irNo: newIrNo })
                        }
                        : x
                )
            );

            if (newIrNo && newIrNo !== item.irNo) {
                setCustomNumbers(prev => {
                    const newMap = { ...prev };
                    delete newMap[item.irNo];
                    newMap[newIrNo] = newIrNo;
                    return newMap;
                });
                
                delete customNumbersRef.current[item.irNo];
                customNumbersRef.current[newIrNo] = newIrNo;
            }

            setDownloadedIRs(prev => new Set([...prev, item.irNo]));

        } catch (err) {
            console.error("Mark as done error:", err);
            showToast(`⚠️ File downloaded but failed to mark as done: ${err.message}`);
        }
    }, [showToast]);

    const handleDownloadWord = useCallback(async (ir) => {
        if (ir.isRevision) {
            showToast("REV items don't have Word files");
            return;
        }

        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            showToast("Please login as DC user");
            return;
        }

        const customNumber = customNumbers[ir.irNo] || customNumbersRef.current[ir.irNo];
        const finalIR = customNumber && customNumber.trim() !== "" ? customNumber : ir.irNo;

        try {
            const payload = {
                irNo: finalIR,
                desc: ir.desc || "",
                receivedDate: getTodayDateStr(),
                project: ir.project || "",
                department: ir.department || "",
                downloadedBy: user.username,
                requestType: ir.requestType || "IR",
                floor: ir.floor || "",
                oldIrNo: ir.irNo
            };

            const res = await fetch(`${API_URL}/generate-word`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const contentType = res.headers.get("content-type");

            if (!res.ok) {
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || `Server error: ${res.status}`);
                } else {
                    const text = await res.text();
                    throw new Error(text || `Server error: ${res.status}`);
                }
            }

            if (contentType && contentType.includes("application/json")) {
                const jsonData = await res.json();
                throw new Error(jsonData.error || "Unexpected JSON response");
            }

            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty file received");

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${finalIR.includes("BADYA-CON") ? finalIR : `IR-${finalIR}`}.docx`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await markItemAsDone(ir, finalIR);
            showToast(`✅ Word file with updated number ${finalIR} downloaded and marked as done!`);

        } catch (err) {
            console.error("Download failed:", err);
            showToast(`❌ Download failed: ${err.message}`);
        }
    }, [customNumbers, getTodayDateStr, markItemAsDone, showToast]);

    const handleUpdateSerial = useCallback(async (irNo, newValue, shouldSave = true) => {
        if (!shouldSave) {
            setCustomNumbers(prev => ({
                ...prev,
                [irNo]: newValue
            }));
            customNumbersRef.current[irNo] = newValue;
            return;
        }

        const ir = irs.find(x => x.irNo === irNo);
        if (!ir || ir.isRevision) {
            showToast("Cannot update revision numbers");
            return;
        }

        const valueToSave = newValue || customNumbers[irNo] || customNumbersRef.current[irNo];
        if (!valueToSave) {
            showToast("Please enter a new IR number");
            return;
        }

        // Extract serial number from the FULL number
        const parts = valueToSave.split("-");
        const lastPart = parts[parts.length - 1];
        const numericSerial = parseInt(lastPart);

        if (isNaN(numericSerial) || numericSerial < 1) {
            showToast("IR must end with valid number (e.g., 001)");
            return;
        }

        setSavingSerials((s) => ({ ...s, [irNo]: true }));

        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");

            const res = await fetch(`${API_URL}/irs/update-ir-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo,
                    newSerial: numericSerial,
                    role: user?.role || "dc",
                    project: ir.project,
                    department: ir.department,
                    requestType: ir.requestType || "IR"
                }),
            });

            const json = await parseJsonSafe(res);
            if (!res.ok) throw new Error(json.error || "Failed to update IR number");

            // Generate new IR number WITHOUT extra location info
            const cleanProject = ir.project.replace(/ /g, "-").toUpperCase();
            const deptCode = getDepartmentAbbr(ir.department);
            let newIrNo;

            if (ir.requestType === "CPR" || ir.isCPR) {
                newIrNo = `BADYA-CON-${cleanProject}-CPR-${numericSerial.toString().padStart(3, '0')}`;
            } else {
                newIrNo = `BADYA-CON-${cleanProject}-IR-${deptCode}-${numericSerial.toString().padStart(3, '0')}`;
            }

            setIRs(prev =>
                prev.map(item => {
                    if (item.irNo === irNo) {
                        return {
                            ...item,
                            irNo: newIrNo
                        };
                    }
                    return item;
                })
            );

            setCustomNumbers(prev => {
                const newMap = { ...prev };
                delete newMap[irNo];
                newMap[newIrNo] = newIrNo;
                return newMap;
            });

            delete customNumbersRef.current[irNo];
            customNumbersRef.current[newIrNo] = newIrNo;

            showToast(`✅ IR number updated to ${newIrNo}`);

        } catch (err) {
            console.error("Update failed:", err);
            showToast(`❌ Update failed: ${err.message}`);
        } finally {
            setSavingSerials((s) => {
                const map = { ...s };
                delete map[irNo];
                return map;
            });
        }
    }, [irs, showToast]);

    // Get projects list for filters
    const projects = [...new Set(irs.map(item => item.project).filter(Boolean))].sort();
    const departments = [...new Set(irs.map(item => getDepartmentAbbr(item.department)).filter(Boolean))].sort();

    // Stats
    const stats = {
        total: irs.length,
        pending: irs.filter(ir => !ir.isDone && !ir.isRevision).length,
        revisions: irs.filter(ir => ir.isRevision).length,
        cpr: irs.filter(ir => ir.isCPR).length,
        completed: irs.filter(ir => ir.isDone).length,
        ir: irs.filter(ir => !ir.isRevision && !ir.isCPR).length
    };

    // Reset all filters
    const resetAllFilters = useCallback(() => {
        setFilters({
            project: "all",
            type: "all",
            status: "all",
            dateRange: "all",
            department: "all"
        });
        setSearchTerm("");
    }, []);

    // Navigate to archive
    const navigateToArchive = useCallback(() => {
        navigate("/dc-archive");
    }, [navigate]);

    // Main render
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading DC Dashboard...</p>
                </div>
            </div>
        );
    }

    const filteredList = filteredIRs();
    
    // Group data
    const groupedData = {};
    filteredList.forEach(ir => {
        const project = ir.project || "UNKNOWN";
        const deptKey = getDepartmentAbbr(ir.department);
        if (!groupedData[project]) groupedData[project] = {};
        if (!groupedData[project][deptKey]) groupedData[project][deptKey] = [];
        groupedData[project][deptKey].push(ir);
    });

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {toast && (
                <div className="fixed top-5 right-5 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    {toast}
                </div>
            )}

            <div className="flex flex-col gap-6 w-full px-4 md:px-8 lg:px-32 py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                            📊 DC Dashboard
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Total Items: <span className="font-bold text-blue-600">{irs.length}</span>
                            <span className="mx-3">•</span>
                            Showing: <span className="font-bold text-green-600">{filteredList.length}</span>
                            <span className="mx-3">•</span>
                            <button
                                onClick={() => loadAllData(true)}
                                className="text-blue-500 hover:text-blue-700 font-medium"
                            >
                                🔄 Refresh
                            </button>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={navigateToArchive}
                            className="px-4 py-2 bg-gray-800 hover:bg-black text-white rounded-lg font-medium transition flex items-center gap-2"
                        >
                            📁 View Archive
                        </button>
                        <div className="text-sm bg-white/80 px-4 py-2 rounded-full shadow">
                            DC User Dashboard
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="text-red-500 text-xl">⚠️</div>
                            <div className="flex-1">
                                <p className="font-medium text-red-700">{error}</p>
                                <button
                                    onClick={() => loadAllData(true)}
                                    className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                    Click here to retry
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-gray-800">{filteredList.length}</div>
                        <div className="text-sm text-gray-500">Showing</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {filteredList.filter(ir => !ir.isDone && !ir.isRevision).length}
                        </div>
                        <div className="text-sm text-gray-500">Pending</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {filteredList.filter(ir => ir.isRevision).length}
                        </div>
                        <div className="text-sm text-gray-500">Revisions</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                            {filteredList.filter(ir => ir.isDone).length}
                        </div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                🔍 Search
                            </label>
                            <input
                                type="text"
                                placeholder="Search by full number, description, user, project..."
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                onChange={handleSearchChange}
                                defaultValue={searchTerm}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                if (searchTimeoutRef.current) {
                                    clearTimeout(searchTimeoutRef.current);
                                }
                                const input = document.querySelector('input[placeholder*="Search by"]');
                                if (input) input.value = "";
                            }}
                            className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">🎯 Filters</h3>
                        <button onClick={resetAllFilters} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">
                            Reset All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <select 
                            value={filters.project} 
                            onChange={(e) => setFilters({...filters, project: e.target.value})} 
                            className="p-2 border rounded-lg"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select 
                            value={filters.type} 
                            onChange={(e) => setFilters({...filters, type: e.target.value})} 
                            className="p-2 border rounded-lg"
                        >
                            <option value="all">All Types</option>
                            <option value="ir">IR</option>
                            <option value="cpr">CPR</option>
                            <option value="revision">Revisions</option>
                        </select>
                        <select 
                            value={filters.status} 
                            onChange={(e) => setFilters({...filters, status: e.target.value})} 
                            className="p-2 border rounded-lg"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select 
                            value={filters.department} 
                            onChange={(e) => setFilters({...filters, department: e.target.value})} 
                            className="p-2 border rounded-lg"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select 
                            value={filters.dateRange} 
                            onChange={(e) => setFilters({...filters, dateRange: e.target.value})} 
                            className="p-2 border rounded-lg"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                </div>

                {/* Main Content */}
                {Object.keys(groupedData).length === 0 ? (
                    <div className="bg-white rounded-2xl shadow p-12 text-center">
                        <div className="text-gray-400 text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Items Found</h3>
                        <button onClick={resetAllFilters} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.keys(groupedData).map((project) => (
                            <ProjectSection
                                key={project}
                                project={project}
                                depts={groupedData[project]}
                                customNumbers={customNumbers}
                                savingSerials={savingSerials}
                                onUpdateSerial={handleUpdateSerial}
                                onCopy={handleCopy}
                                onDownloadWord={handleDownloadWord}
                                onArchive={handleArchive}
                                onMarkRevDone={markRevDone}
                                onCopyAll={handleCopyAll}
                                downloadedIRs={downloadedIRs}
                                getTypeClass={getTypeClass}
                                getStatusClass={getStatusClass}
                                typesMap={typesMap[project] || {}} // تمرير typesMap الخاص بالمشروع
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}