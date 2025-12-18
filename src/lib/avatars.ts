export type Avatar = {
  key: string;
  label: string;
  src: string;
};

const BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const AVATARS: Avatar[] = [
  { key: "pikachu", label: "Pikachu", src: `${BASE}/25.png` },
  { key: "bulbasaur", label: "Bulbasaur", src: `${BASE}/1.png` },
  { key: "charmander", label: "Charmander", src: `${BASE}/4.png` },
  { key: "squirtle", label: "Squirtle", src: `${BASE}/7.png` },
  { key: "eevee", label: "Eevee", src: `${BASE}/133.png` },
  { key: "snorlax", label: "Snorlax", src: `${BASE}/143.png` },
  { key: "gengar", label: "Gengar", src: `${BASE}/94.png` },
  { key: "lucario", label: "Lucario", src: `${BASE}/448.png` },
  { key: "mew", label: "Mew", src: `${BASE}/151.png` },
  { key: "rayquaza", label: "Rayquaza", src: `${BASE}/384.png` },
];

export function avatarSrcFromKey(key?: string | null) {
  return AVATARS.find((a) => a.key === key)?.src ?? AVATARS[0].src;
}
