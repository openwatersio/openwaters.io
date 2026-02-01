import { useState, useEffect } from "react";

const API_HOST =
  import.meta.env.PUBLIC_TIDES_API_URL || "http://localhost:3001";

interface UseNeapsAPIOptions {
  skip?: boolean;
}

export function useNeapsAPI<T>(
  path: string,
  params?: Record<string, any>,
  options?: UseNeapsAPIOptions,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.skip) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchNeapsAPI<T>(path, params)
      .then((data) => {
        console.log("FETCHED DATA:", data);
        setData(data);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [path, JSON.stringify(params), options?.skip]);

  return { data, loading, error };
}

export async function fetchNeapsAPI<T>(
  path: string,
  params?: Record<string, any>,
): Promise<T> {
  const url = new URL(path, API_HOST);
  url.search = new URLSearchParams(params).toString();
  console.log("FETCHING URL:", url.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }
  return res.json();
}
