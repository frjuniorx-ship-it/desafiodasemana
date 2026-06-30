export function darkenHex(hex, factor) {
  const h = (hex || '#5a8a4a').replace('#', '');
  if (h.length !== 6) return hex;
  return '#' + [0, 2, 4]
    .map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * factor)
      .toString(16).padStart(2, '0'))
    .join('');
}
