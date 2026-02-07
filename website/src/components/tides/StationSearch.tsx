import { useState, useCallback } from "react";
import { fetchNeapsAPI } from "../../utils/useNeapsAPI";

interface Station {
  id: string;
  name: string;
  country?: string;
  region?: string;
}

interface StationSearchProps {
  onFocus?: () => void;
}

export function StationSearch({ onFocus }: StationSearchProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Station[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    fetchNeapsAPI<Station[]>("/tides/stations", { query })
      .then((data) => {
        setResults(data.slice(0, 10));
        setShowResults(true);
      })
      .catch((error) => {
        console.error("Failed to search stations:", error);
        setResults([]);
      });
  }, []);

  const handleSelectResult = useCallback((stationId: string) => {
    window.location.href = `/tides/stations/${stationId}`;
  }, []);

  return (
    <div>
      <input
        type="search"
        placeholder="Search Tide Stations..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => {
          onFocus?.();
          searchQuery && setShowResults(true);
        }}
        className="card card-glass w-full rounded-full px-5 py-3 text-base placeholder-navy-400 shadow-md transition-all duration-300 ease-in-out focus:bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500"
      />

      {showResults && (
        <div className="card card-glass mt-4 w-full overflow-hidden rounded-3xl border-none p-0">
          <ul className="max-h-80 divide-y divide-navy-200 overflow-y-auto">
            {results.map((result, index) => (
              <li key={result.id}>
                <button
                  onClick={() => handleSelectResult(result.id)}
                  className={"w-full px-5 py-3 text-left hover:bg-ocean-200/50"}
                >
                  <div className="text-navy-90s0 text-base font-semibold">
                    {result.name}
                  </div>
                  {(result.country || result.region) && (
                    <div className="text-sm text-navy-500">
                      {[result.country, result.region]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </button>
              </li>
            ))}
            {results.length === 0 && searchQuery.trim() !== "" && (
              <li className="px-5 py-4 text-center text-lg text-navy-500">
                No stations found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
