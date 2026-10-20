import type { Shelf, ShelfEntry } from "./perfumes";

// Example perfumes for the landing page and for preview mode (no database yet).
const SAMPLES: Omit<ShelfEntry, "shelf">[] = [
  {
    id: "sample-1",
    rating: 9,
    fillLevel: 80,
    perfume: {
      id: "p1",
      brand: "Tom Ford",
      name: "Oud Wood",
      concentration: "edp",
      releaseYear: 2007,
      imageUrl: null,
      parfumoUrl: null,
      parfumoNotes: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
      createdBy: null,
    },
  },
  {
    id: "sample-2",
    rating: 8,
    fillLevel: 40,
    perfume: {
      id: "p2",
      brand: "Dior",
      name: "Sauvage",
      concentration: "edt",
      releaseYear: 2015,
      imageUrl: null,
      parfumoUrl: "https://www.parfumo.com/Perfumes/Dior/Sauvage_Eau_de_Toilette",
      parfumoNotes: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
      createdBy: null,
    },
  },
  {
    id: "sample-3",
    rating: 7,
    fillLevel: null,
    perfume: {
      id: "p3",
      brand: "Le Labo",
      name: "Santal 33",
      concentration: "edp",
      releaseYear: 2011,
      imageUrl: null,
      parfumoUrl: null,
      parfumoNotes: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
      createdBy: null,
    },
  },
  {
    id: "sample-4",
    rating: null,
    fillLevel: null,
    perfume: {
      id: "p4",
      brand: "Maison Francis Kurkdjian",
      name: "Baccarat Rouge 540",
      concentration: "edp",
      releaseYear: 2015,
      imageUrl: null,
      parfumoUrl: null,
      parfumoNotes: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
      createdBy: null,
    },
  },
  {
    id: "sample-5",
    rating: null,
    fillLevel: null,
    perfume: {
      id: "p5",
      brand: "Creed",
      name: "Aventus",
      concentration: "edp",
      releaseYear: 2010,
      imageUrl: null,
      parfumoUrl: null,
      parfumoNotes: null,
      parfumoRating: null,
      ratingsUpdatedAt: null,
      createdBy: null,
    },
  },
];

export function sampleShelf(shelf: Shelf): ShelfEntry[] {
  const picked = { collection: SAMPLES.slice(0, 2), finished: SAMPLES.slice(2, 3), wishlist: SAMPLES.slice(3) }[shelf];
  return picked.map((entry) => ({
    ...entry,
    shelf,
    rating: shelf === "wishlist" ? null : entry.rating,
    fillLevel: shelf === "collection" ? entry.fillLevel : null,
  }));
}
