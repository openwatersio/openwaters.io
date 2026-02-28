import { type ReactNode, useCallback } from "react";
import { NeapsProvider, StationsMap, StationSearch } from "@neaps/react";
import "@neaps/react/styles.css";
import { API_HOST } from "../../utils/constants";
import { preferredUnits } from "../../utils/units";
import { BottomDrawer } from "../ui/BottomDrawer";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

interface Props {
  children?: ReactNode;
}

export function StationsMapIsland({ children }: Props) {
  const handleStationSelect = useCallback((station: { id: string }) => {
    window.location.href = `/tides/stations/${station.id}`;
  }, []);

  return (
    <NeapsProvider baseUrl={API_HOST} units={preferredUnits}>
      {/* Inline height so h-full on StationsMap resolves; calc subtracts the fixed header */}
      <div className="absolute inset-0 h-full w-full">
        <StationsMap
          mapStyle={MAP_STYLE}
          initialViewState={{
            longitude: -60,
            latitude: 20,
            zoom: 2,
          }}
          onStationSelect={handleStationSelect}
          hash
        >
          {/* Desktop sidebar */}
          <div className="header-padding absolute top-0 left-4 z-10 hidden w-96 flex-col gap-4 md:flex">
            <StationSearch onSelect={handleStationSelect} />
            {children}
          </div>

          {/* Mobile bottom drawer */}
          <BottomDrawer>
            <StationSearch onSelect={handleStationSelect} />
            {children}
          </BottomDrawer>
        </StationsMap>
      </div>
    </NeapsProvider>
  );
}
