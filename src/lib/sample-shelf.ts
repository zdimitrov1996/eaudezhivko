import type { Shelf, ShelfEntry } from "./perfumes";

// Example perfumes for the landing page and for preview mode (no database yet).
const SAMPLES: Omit<ShelfEntry, "shelf">[] = [
  {
    id: "sample-1",
    rating: 9,
    perfume: {
      id: "p1",
      brand: "Tom Ford",
      name: "Oud Wood",
      concentration: "edp",
      releaseYear: 2007,
      fragranticaUrl: null,
      parfumoUrl: null,
      fragranticaRating: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
    },
  },
  {
    id: "sample-2",
    rating: 8,
    perfume: {
      id: "p2",
      brand: "Dior",
      name: "Sauvage",
      concentration: "edt",
      releaseYear: 2015,
      fragranticaUrl: null,
      parfumoUrl: "https://www.parfumo.com/Perfumes/Dior/Sauvage_Eau_de_Toilette",
      fragranticaRating: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
    },
  },
  {
    id: "sample-3",
    rating: null,
    perfume: {
      id: "p3",
      brand: "Le Labo",
      name: "Santal 33",
      concentration: "edp",
      releaseYear: 2011,
      fragranticaUrl: null,
      parfumoUrl: null,
      fragranticaRating: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
    },
  },
  {
    id: "sample-4",
    rating: null,
    perfume: {
      id: "p4",
      brand: "Maison Francis Kurkdjian",
      name: "Baccarat Rouge 540",
      concentration: "edp",
      releaseYear: 2015,
      fragranticaUrl: null,
      parfumoUrl: null,
      fragranticaRating: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
    },
  },
  {
    id: "sample-5",
    rating: null,
    perfume: {
      id: "p5",
      brand: "Creed",
      name: "Aventus",
      concentration: "edp",
      releaseYear: 2010,
      fragranticaUrl: null,
      parfumoUrl: null,
      fragranticaRating: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
    },
  },
];

export function sampleShelf(shelf: Shelf): ShelfEntry[] {
  const picked = shelf === "collection" ? SAMPLES.slice(0, 3) : SAMPLES.slice(3);
  return picked.map((entry) => ({
    ...entry,
    shelf,
    rating: shelf === "collection" ? entry.rating : null,
  }));
}
