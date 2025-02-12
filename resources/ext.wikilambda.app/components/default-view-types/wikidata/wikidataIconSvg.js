// TODO (T375206): Replace the hardcoded logo svg with the icon version in the Codex library
// After discussion with the Design Systems team, it's been agreed to use the Wikidata color icon
// contrary to the monocolor icons available in Codex. The reason for this is that Wikidata
// monocrome icon resembles a barcode instead of a Wikidata reference. Discussion on including color
// versions for project logos in the Codex icon library can be read in T374731.
module.exports = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <path fill="#900" d="M0 16h.721V4H0v12Zm1.49 0H3.7V4H1.49v12ZM4.422 4v11.999h2.21V4h-2.21Z"/>
  <path fill="#396" d="M17.789 16h.72V4h-.72v12Zm1.49-12v12H20V4h-.721ZM7.378 16h.72V4h-.72v12Zm1.49-12v12h.721V4h-.721Z"/>
  <path fill="#069" d="M10.334 16h2.21V4h-2.21v12Zm2.932 0h.769V4h-.77v12Zm1.49-12v12h2.21V4h-2.21Z"/>
</svg>`;
