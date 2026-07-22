import { useEffect, useRef, useState } from 'react';
import { MapboxError, searchPlaces, type GeoPlace } from '../../lib/mapbox';

interface LocationSearchProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: GeoPlace) => void;
  proximity?: { longitude: number; latitude: number };
  required?: boolean;
  iconColor?: string;
  hint?: string;
}

export default function LocationSearch({
  label,
  placeholder,
  value,
  onChange,
  onPlaceSelect,
  proximity,
  required,
  iconColor = 'text-gray-400',
  hint,
}: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; name: string; longitude: number; latitude: number }>
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaces(query, proximity);
        setSuggestions(results);
      } catch (error) {
        if (!(error instanceof MapboxError)) {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, isOpen, proximity]);

  const handleSelect = (item: { name: string; longitude: number; latitude: number }) => {
    setQuery(item.name);
    onChange(item.name);
    onPlaceSelect?.({ name: item.name, longitude: item.longitude, latitude: item.latitude });
    setSelectedFromList(true);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconColor}
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <input
          type="text"
          required={required}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setSelectedFromList(false);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 px-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition ${
            onPlaceSelect && query && !selectedFromList
              ? 'border-amber-300 ring-1 ring-amber-100'
              : 'border-gray-200'
          }`}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        )}
        {onPlaceSelect && query && selectedFromList && (
          <div className="absolute inset-y-0 right-3 flex items-center text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
        )}
      </div>

      {hint && (
        <p className="text-xs text-gray-500 mt-1.5">{hint}</p>
      )}
      {onPlaceSelect && query && !selectedFromList && query.length >= 2 && (
        <p className="text-xs text-amber-600 mt-1.5 font-medium">Listeden bir sonuç seçin.</p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition border-b border-gray-50 last:border-0"
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
