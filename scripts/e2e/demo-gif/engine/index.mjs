/**
 * Demo GIF Engine — Public API
 *
 * Re-exports the engine primitives so consumers can do:
 *
 *   import { renderGif, effects, assembleGif } from './engine/index.mjs'
 */

export { assembleGif, checkFfmpeg } from './assembler.mjs'
export {
  crossfade,
  easeInOutCubic,
  esc,
  highlightSvg,
  labelBadgeSvg,
  lerp,
  zoomAtT,
  zoomCrop,
  zoomRect,
} from './effects.mjs'
export { renderGif } from './renderer.mjs'
