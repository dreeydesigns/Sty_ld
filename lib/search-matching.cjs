// Literal search remains the first match. Only complete known words gain aliases.
const groups = [
  ['hair', 'nywele'],
  ['nail', 'nails', 'kucha'],
  ['braid', 'braids', 'kusuka'],
  ['loc', 'locs', 'dreadlock', 'dreadlocks', 'rasta'],
];
const canonical = new Map(groups.flatMap(group => group.map(word => [word, group[0]])));
const aliasWord = /\b(?:hair|nywele|nail|nails|kucha|braid|braids|kusuka|loc|locs|dreadlock|dreadlocks|rasta)\b/g;
/** @param {string} value */
function normalizeAliases(value) {
  return value.replace(aliasWord, word => '\u0000' + (canonical.get(word) || word) + '\u0000');
}
/** @param {string} searchable @param {string} query */
function matchesBeautySearch(searchable, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = searchable.toLowerCase();
  return haystack.includes(needle) || normalizeAliases(haystack).includes(normalizeAliases(needle));
}
module.exports = { matchesBeautySearch };
