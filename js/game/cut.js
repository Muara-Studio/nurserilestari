/* Tunas & Hutan Lestari — cut.js. Manifest of the public-domain paper cutouts in assets/img/cut/ (lead supplies the files; full list in assets/img/cut/manifest.json).
   Only list files that exist: a missing file falls back to the SVG sheet, but its 404 would still show in the console.
   player: the tupai plate (faces left, sitting up; the lowest 6 % is grass and gets clipped). Seeds and insects stay drawn in the SVG sheet. */
export const CUT = {
  player: [],   // the hero is now the flat-vector Tunas sheets (assets/illus/tunas-*.svg); the tupai plate is retired
  seed: '', cluster: '',
  wasp: '', beetle: '', fly: '',
  spring: ''
};
export const CUT_FACE = -1;                 // the cutout looks left; the game mirrors it when moving right
export const CUT_CLIP = { player: 0.06 };   // fraction of the image height dropped at the bottom
export const CUT_H = { player: 66, seed: 26, cluster: 44, wasp: 38, beetle: 38, fly: 28, spring: 64 };   // logical px, sized by height
