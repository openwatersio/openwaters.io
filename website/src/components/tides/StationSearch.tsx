import { useState, useMemo, useCallback } from "react";
import lunr from "lunr";
import { stations, type Station } from "@neaps/tide-database";

export function StationSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Station[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Build lunr index from stations
  const lunrIndex = useMemo(() => {
    return lunr(function (this: any) {
      this.ref("id");
      this.field("name", { boost: 10 });
      this.field("region", { boost: 5 });
      this.field("country", { boost: 3 });

      stations.forEach((station) => {
        this.add(station);
      });
    });
  }, []);

  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach((station: any) => {
      map.set(station.id, station);
    });
    return map;
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (query.trim().length === 0) {
        setResults([]);
        setShowResults(false);
        return;
      }

      try {
        // Build query with both exact matches and prefix wildcards
        // This allows "Nurse" to match exactly while "Nu" matches via prefix
        const terms = query.split(/\s+/);
        const wildcardQuery = terms.map((term) => `${term} ${term}*`).join(" ");

        const searchResults = lunrIndex.search(wildcardQuery);
        const mapped = searchResults.slice(0, 10).map((result: any) => {
          return stationMap.get(result.ref)!;
        });
        setResults(mapped);
        setShowResults(true);
      } catch (error) {
        // Lunr throws on invalid search syntax, just ignore
        setResults([]);
      }
    },
    [lunrIndex, stationMap],
  );

  const handleSelectResult = useCallback((stationId: string) => {
    window.location.href = `/tides/stations/${stationId}`;
  }, []);

  return (
    <div className="absolute left-4 top-4 z-10 w-80">
      <div className="relative">
        <input
          type="text"
          placeholder="Search stations..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchQuery && setShowResults(true)}
          className="w-full rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm placeholder-navy-400 shadow-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
          >
            ✕
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-navy-200 bg-white shadow-lg">
          <ul className="max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <li key={result.id}>
                <button
                  onClick={() => handleSelectResult(result.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-ocean-50 ${
                    index !== results.length - 1
                      ? "border-b border-navy-100"
                      : ""
                  }`}
                >
                  <div className="font-semibold text-navy-900">
                    {result.name}
                  </div>
                  {(result.country || result.region) && (
                    <div className="text-xs text-navy-500">
                      {[result.country, result.region]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showResults && results.length === 0 && searchQuery.trim() !== "" && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-navy-200 bg-white px-4 py-3 text-center text-sm text-navy-500 shadow-lg">
          No stations found
        </div>
      )}
    </div>
  );
}
