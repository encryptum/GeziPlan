/** Gezi detay URL'sinden trip id çıkarır — Routes dışındaki bileşenler için */
export function getTripIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/gezi\/([^/?#]+)/);
  return match?.[1];
}
