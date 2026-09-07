import { useEffect, useRef } from "react";
import L from "leaflet";

export default function MapPicker({ selected, onPick }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [selected ? selected.latitude : 16.243, selected ? selected.longitude : 80.64],
      zoom: selected ? 9 : 4,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    map.on("click", (e) => {
      onPick({
        name: `Pin ${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)}`,
        latitude: +e.latlng.lat.toFixed(4),
        longitude: +e.latlng.lng.toFixed(4),
        country: "",
      });
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!mapRef.current || !selected) return;
    const map = mapRef.current;
    const ll = [selected.latitude, selected.longitude];
    map.setView(ll, Math.max(map.getZoom(), 8), { animate: true });
    if (markerRef.current) markerRef.current.remove();
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(53 93% 50%);box-shadow:0 0 0 4px hsla(53,93%,50%,0.25),0 0 12px hsla(53,93%,50%,0.8);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    markerRef.current = L.marker(ll, { icon }).addTo(map);
  }, [selected]);

  return (
    <div
      ref={containerRef}
      data-testid="map-picker"
      className="w-full h-full min-h-[280px]"
      style={{ zIndex: 0 }}
    />
  );
}
