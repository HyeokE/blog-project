export interface ImageMetadata {
  location?: string;
  lens?: string;
  device?: string;
  dateTime?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const getMapLink = (coordinates: { lat: number; lng: number }) => {
  const { lat, lng } = coordinates;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};


