import type { Shelf, ShelfEntry } from "./perfumes";

// Example perfumes for the landing page and for preview mode (no database yet).
// Community numbers are made up for illustration.
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
    },
    stats: { avgRating: 8.6, ratingCount: 41, collectors: 58, wishers: 23 },
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
    },
    stats: { avgRating: 7.4, ratingCount: 112, collectors: 140, wishers: 12 },
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
    },
    stats: { avgRating: 8.1, ratingCount: 27, collectors: 33, wishers: 49 },
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
    },
    stats: { avgRating: 7.9, ratingCount: 64, collectors: 37, wishers: 88 },
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
    },
    stats: { avgRating: 8.3, ratingCount: 76, collectors: 51, wishers: 70 },
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
