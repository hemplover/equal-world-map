/* Which of the 195 equal countries holds a point?
 * Pure functions, no browser needed: works in the page (window.EqualLookup) and in node (require).
 *
 *   var index = EqualLookup.buildIndex(geojson, detail);  // once; detail = optional FeatureCollection
 *   var hit = EqualLookup.lookup(index, lat, lon);        // { feature, exact, km, near } or null (sea)
 *
 * geojson: the 195 regions (the simplified map). detail: full-detail outlines for a few regions, matched
 * by properties.id; they replace the simplified outline of that region in the index (used for the tiny
 * "New York" region, so taps near the Manhattan line follow the full data).
 *
 * exact = true: the point is inside the region's outline.
 * exact = false: the point fell in a small gap of the simplified map; the nearest region within
 *   NEAR_KM is returned, km = distance to it.
 * near: { feature, km } for the closest OTHER region whose edge is within NOTE_KM, else null
 *   (the page uses it to say "you are close to a border").
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EqualLookup = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NEAR_KM = 15;
  var NOTE_KM = 5;
  var KM_PER_DEG = 111.32;

  function normLon(lon) {
    var x = ((lon + 180) % 360 + 360) % 360 - 180;
    return x === -180 && lon > 0 ? 180 : x;
  }

  function ringBox(ring) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    for (var i = 0; i < ring.length; i++) {
      var x = ring[i][0], y = ring[i][1];
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
    return b;
  }

  function polysOf(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return [];
  }

  // Polygons as lists of rings (first = outer), each with its bounding box. Detail polygons come first.
  function buildIndex(geojson, detail) {
    var detailGeom = {};
    if (detail && detail.features) {
      detail.features.forEach(function (f) { detailGeom[f.properties.id] = f.geometry; });
    }
    var first = [], rest = [];
    geojson.features.forEach(function (f) {
      var id = f.properties.id;
      var isDetail = Object.prototype.hasOwnProperty.call(detailGeom, id);
      polysOf(isDetail ? detailGeom[id] : f.geometry).forEach(function (rings) {
        (isDetail ? first : rest).push({ feature: f, rings: rings, box: ringBox(rings[0]), detail: isDetail });
      });
    });
    return { polys: first.concat(rest) };
  }

  // Even-odd ray casting on one ring.
  function inRing(ring, x, y) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function inPoly(rings, x, y) {
    if (!inRing(rings[0], x, y)) return false;
    for (var k = 1; k < rings.length; k++) if (inRing(rings[k], x, y)) return false;
    return true;
  }

  // Distance in km from the point (x, y) to segment a-b, on a flat projection around the point.
  function segKm(x, y, ax, ay, bx, by, c) {
    var x1 = (ax - x) * c, y1 = ay - y, x2 = (bx - x) * c, y2 = by - y;
    var dx = x2 - x1, dy = y2 - y1, len = dx * dx + dy * dy;
    var t = len ? Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / len)) : 0;
    var qx = x1 + t * dx, qy = y1 + t * dy;
    return Math.sqrt(qx * qx + qy * qy) * KM_PER_DEG;
  }

  // Nearest region edge within maxKm, skipping one feature (skip) and, if noDetail, detail outlines.
  function nearest(index, x, y, maxKm, skip, noDetail) {
    var c = Math.cos(y * Math.PI / 180);
    var padY = maxKm / KM_PER_DEG, padX = padY / Math.max(c, 0.05);
    var best = null, bestKm = maxKm;
    for (var i = 0; i < index.polys.length; i++) {
      var p = index.polys[i];
      if (p.feature === skip || (noDetail && p.detail)) continue;
      if (x < p.box[0] - padX || x > p.box[2] + padX || y < p.box[1] - padY || y > p.box[3] + padY) continue;
      for (var r = 0; r < p.rings.length; r++) {
        var ring = p.rings[r];
        for (var k = 1; k < ring.length; k++) {
          var a = ring[k - 1], b = ring[k];
          if (Math.min(a[1], b[1]) > y + padY || Math.max(a[1], b[1]) < y - padY) continue;
          var d = segKm(x, y, a[0], a[1], b[0], b[1], c);
          if (d < bestKm) { bestKm = d; best = p.feature; }
        }
      }
    }
    return best ? { feature: best, km: bestKm } : null;
  }

  function lookup(index, lat, lon) {
    var x = normLon(lon), y = lat;
    var hit = null;
    for (var i = 0; i < index.polys.length && !hit; i++) {
      var p = index.polys[i];
      if (x < p.box[0] || x > p.box[2] || y < p.box[1] || y > p.box[3]) continue;
      if (inPoly(p.rings, x, y)) hit = { feature: p.feature, exact: true, km: 0 };
    }
    if (!hit) {
      // In a gap of the simplified map (or at sea). A detail outline is exact, so it never takes a gap point.
      var n = nearest(index, x, y, NEAR_KM, null, true);
      if (!n) return null;
      hit = { feature: n.feature, exact: false, km: n.km };
    }
    hit.near = nearest(index, x, y, NOTE_KM, hit.feature, false);
    return hit;
  }

  return { buildIndex: buildIndex, lookup: lookup, normLon: normLon, NEAR_KM: NEAR_KM, NOTE_KM: NOTE_KM };
});
