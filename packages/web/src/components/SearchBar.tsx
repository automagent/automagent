import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

interface SearchBarProps {
  totalResults: number | null;
}

export default function SearchBar({ totalResults }: SearchBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(currentQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input when URL changes externally (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(currentQuery);
  }, [currentQuery]);

  function updateParams(value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputValue(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams(value);
    }, 300);
  }

  function handleClear() {
    setInputValue('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchParams({});
  }

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="Search agents..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
      {totalResults !== null && (
        <p className="mt-2 text-sm text-gray-500">
          {totalResults} agent{totalResults === 1 ? '' : 's'} found
        </p>
      )}
    </div>
  );
}
