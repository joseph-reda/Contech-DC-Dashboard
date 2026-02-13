// src/components/SearchableInput.jsx
import { useState, useEffect, useRef } from 'react';

export default function SearchableInput({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    disabled = false,
    loading = false,
    noOptionsMessage = "No options available"
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (options && options.length > 0) {
            const filtered = options.filter(option => {
                if (!option) return false;
                const optionText = String(option).toLowerCase();
                return optionText.includes(searchTerm.toLowerCase());
            });
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions([]);
        }
    }, [searchTerm, options]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        setSearchTerm("");
    };

    const handleInputChange = (e) => {
        if (isOpen) {
            setSearchTerm(e.target.value);
        } else {
            onChange(e.target.value);
        }
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(true);
            setSearchTerm("");
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div className="relative">
                <input
                    type="text"
                    value={isOpen ? searchTerm : (value || "")}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onFocus={() => !disabled && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'
                        }`}
                    readOnly={!isOpen && !disabled}
                />

                {loading && (
                    <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {!loading && !disabled && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        disabled={disabled}
                    >
                        {isOpen ? '▲' : '▼'}
                    </button>
                )}
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            Loading...
                        </div>
                    ) : filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                onClick={() => handleSelect(option)}
                                className={`p-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition ${value === option ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                    }`}
                            >
                                {String(option)}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-gray-500">
                            {noOptionsMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}