/**
 * filters.js — camera filter definitions and canvas application utilities.
 */

export const FILTERS = [
  { id: 'normal',  label: 'Normal',  css: '',                                                        canvas: null   },
  { id: 'warm',    label: 'Warm',    css: 'sepia(0.35) saturate(1.4) brightness(1.05)',              canvas: 'warm' },
  { id: 'cool',    label: 'Cool',    css: 'hue-rotate(15deg) saturate(0.9) brightness(1.05)',        canvas: 'cool' },
  { id: 'bw',      label: 'B&W',     css: 'grayscale(1) contrast(1.1)',                              canvas: 'bw'   },
  { id: 'vivid',   label: 'Vivid',   css: 'saturate(1.8) contrast(1.15)',                            canvas: 'vivid'},
  { id: 'soft',    label: 'Soft',    css: 'brightness(1.1) contrast(0.85) blur(0.4px)',              canvas: 'soft' },
  { id: 'retro',   label: 'Retro',   css: 'sepia(0.5) contrast(1.2) brightness(0.9)',               canvas: 'retro'},
];

/**
 * Returns the filter definition for the given id, falling back to 'normal'.
 * @param {string} id
 * @returns {object}
 */
export function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || FILTERS[0];
}

/**
 * Apply a filter to a source canvas and return a new canvas with the filter applied.
 * For 'normal', returns the sourceCanvas as-is.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {string} filterId
 * @returns {HTMLCanvasElement}
 */
export function applyFilterToCanvas(sourceCanvas, filterId) {
  if (filterId === 'normal' || !filterId) return sourceCanvas;

  const filter = getFilter(filterId);
  if (!filter || !filter.css) return sourceCanvas;

  const dest = document.createElement('canvas');
  dest.width = sourceCanvas.width;
  dest.height = sourceCanvas.height;

  const ctx = dest.getContext('2d');
  ctx.filter = filter.css;
  ctx.drawImage(sourceCanvas, 0, 0);

  return dest;
}
