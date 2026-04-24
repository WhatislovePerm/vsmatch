export interface Court {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lon: number;
  sport: string | null;
  surface: string | null;
  rating: number | null;
}
