/** Always use flagcdn for flags — REST Countries often returns Wikimedia URLs instead. */
export function flagCdnUrlFromIso2(cca2: string, width = 320): string {
  return `https://flagcdn.com/w${width}/${cca2.trim().toLowerCase()}.png`;
}
