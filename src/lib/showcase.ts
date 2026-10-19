import type { Concentration } from "./perfumes";

export type ShowcasePerfume = {
  id: string;
  brand: string;
  name: string;
  concentration: Concentration | null;
  parfumoUrl: string;
  /** Bottle photo on Parfumo's CDN, as their perfume page shows it */
  imageUrl: string;
  parfumoRating: number | null;
};

/** Most perfumes the carousel holds (the database enforces it too). */
export const SHOWCASE_MAX = 12;

// Admins edit the carousel in the panel (the showcase table). This list is
// what it started with, and what the homepage shows without a database.
// Images are hotlinked from Parfumo (credited, each slide links to its page).
const DEFAULT_SHOWCASE: Omit<ShowcasePerfume, "id" | "parfumoRating">[] = [
  {
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Maison_Francis_Kurkdjian/Baccarat_Rouge_540_Eau_de_Parfum",
    imageUrl:
      "https://media.parfumo.com/perfumes/50/50639a-baccarat-rouge-540-eau-de-parfum-maison-francis-kurkdjian_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Dior",
    name: "Sauvage",
    concentration: "edt",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Dior/Sauvage_Eau_de_Toilette",
    imageUrl:
      "https://media.parfumo.com/perfumes/a2/a28d94-sauvage-eau-de-toilette-dior_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Chanel",
    name: "N°5",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Chanel/N5_Eau_de_Parfum",
    imageUrl:
      "https://media.parfumo.com/perfumes/23/23c42a-n-5-eau-de-parfum-chanel_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Tom Ford",
    name: "Oud Wood",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Tom_Ford/Oud_Wood_Eau_de_Parfum",
    imageUrl:
      "https://media.parfumo.com/perfumes/cf/cf90e7-oud-wood-eau-de-parfum-tom-ford_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Yves Saint Laurent",
    name: "Black Opium",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Yves_Saint_Laurent/Black_Opium",
    imageUrl:
      "https://media.parfumo.com/perfumes/2a/2a5099-black-opium-eau-de-parfum-yves-saint-laurent_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Creed",
    name: "Aventus",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Creed/aventus",
    imageUrl: "https://media.parfumo.com/perfumes/66/66dd48_aventus-creed_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Le Labo",
    name: "Santal 33",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Le_Labo/Santal_33_Eau_de_Parfum",
    imageUrl:
      "https://media.parfumo.com/perfumes/81/818cc5-santal-33-eau-de-parfum-le-labo_1200.jpg?width=720&aspect_ratio=1:1",
  },
  {
    brand: "Lancôme",
    name: "La Vie est Belle",
    concentration: "edp",
    parfumoUrl: "https://www.parfumo.com/Perfumes/Lancome/la-vie-est-belle-l-eau-de-parfum",
    imageUrl:
      "https://media.parfumo.com/perfumes/3b/3b0c61-la-vie-est-belle-l-eau-de-parfum-lancome_1200.jpg?width=720&aspect_ratio=1:1",
  },
];

export const SHOWCASE: ShowcasePerfume[] = DEFAULT_SHOWCASE.map((perfume, index) => ({
  ...perfume,
  id: `default-${index + 1}`,
  parfumoRating: null,
}));
