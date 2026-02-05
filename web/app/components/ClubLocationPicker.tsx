"use client";

import { useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  Autocomplete,
  useLoadScript,
} from "@react-google-maps/api";

type LocationData = {
  address: string;
  latitude: number;
  longitude: number;
};

const libraries: ("places")[] = ["places"];

export default function ClubLocationPicker({
  onSelect,
  initialLocation,
}: {
  onSelect: (data: LocationData) => void;
  initialLocation?: LocationData | null;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries,
  });

  const autocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);

  //  Center initialized from DB if present
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLocation?.latitude ?? 28.6139,
    lng: initialLocation?.longitude ?? 77.209,
  });

  const [address, setAddress] = useState(
    initialLocation?.address ?? ""
  );

  // Update when initialLocation loads async
  useEffect(() => {
    if (!initialLocation) return;

    setCenter({
      lat: initialLocation.latitude,
      lng: initialLocation.longitude,
    });

    setAddress(initialLocation.address);
  }, [initialLocation]);

  if (!isLoaded) {
    return <p className="text-gray-400 text-sm">Loading map…</p>;
  }

  return (
    <div className="space-y-3">
      {/* Address Search */}
      <Autocomplete
        onLoad={(autocomplete) => {
          autocompleteRef.current = autocomplete;
        }}
        onPlaceChanged={() => {
          const place = autocompleteRef.current?.getPlace();

          if (!place || !place.geometry || !place.geometry.location) {
            return;
          }

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          setCenter({ lat, lng });
          setAddress(place.formatted_address || "");

          onSelect({
            address: place.formatted_address || "",
            latitude: lat,
            longitude: lng,
          });
        }}
      >
        <input
          type="text"
          value={address}
          placeholder="Search club address"
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-md bg-black border border-white/15 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
        />
      </Autocomplete>

      {/* Map */}
      <GoogleMap
        center={center}
        zoom={15}
        mapContainerStyle={{ width: "100%", height: "280px" }}
      >
        <Marker
          position={center}
          draggable
          onDragEnd={(e) => {
            const lat = e.latLng?.lat();
            const lng = e.latLng?.lng();
            if (!lat || !lng) return;

            setCenter({ lat, lng });

            onSelect({
              address,
              latitude: lat,
              longitude: lng,
            });
          }}
        />
      </GoogleMap>
    </div>
  );
}
