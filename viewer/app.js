/* Equal world viewer: tap, search or locate a place and see which of the 195 equal countries holds it.
 * Plain script, no build step. Everything it loads is in this folder; nothing is sent anywhere.
 */
(function () {
  'use strict';

  // Set to the video's YouTube link after upload; while empty the video is named as plain text.
  var VIDEO_URL = '';
  var VIDEO_TITLE = 'I Redrew the World So Every Country Makes the Same Money';

  var DATA = 'equal-world-195-countries-small.geojson';
  var DETAIL = 'viewer/new-york-detail.json';
  var LABELS = 'viewer/labels.json';
  var BORDERS = 'viewer/borders.json';
  var CITIES = 'viewer/cities.txt';

  var SHARE = 575.2e9;              // world GDP 2024 / 195, US$ (README, STATS.md)
  var TINT = ['#E4CF9C', '#C3D0AA', '#E2B8A0', '#BCD0D3', '#D4C0D0']; // the film's atlas paper tints
  var INK = '#211C1A';

  // Short country names in the data, written out for the card.
  var LONG = {
    'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Dem. Rep. Congo': 'DR Congo', 'Dominican Rep.': 'the Dominican Republic',
    'N. Cyprus': 'Northern Cyprus', 'Fr. Polynesia': 'French Polynesia', 'United States of America': 'the United States',
    'United Kingdom': 'the United Kingdom', 'Netherlands': 'the Netherlands', 'Philippines': 'the Philippines',
    'United Arab Emirates': 'the United Arab Emirates', 'Bahamas': 'the Bahamas', 'Maldives': 'the Maldives',
    'Cyprus U.N. Buffer Zone': 'the UN buffer zone in Cyprus', 'Isle of Man': 'the Isle of Man'
  };

  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $('status'), card = $('card'), cardBody = $('cardBody');
  var index = null, regionsLayer = null, chosenLayer = null, pointMarker = null, detail = null;
  var byId = {};

  /* ---------- text helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cleanName(n) { return String(n).replace(/\s+/g, ' ').trim(); }
  function cname(n) { return LONG[n] || n; }
  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pct(x) {
    var p = Math.round(x * 100);
    if (p === 0 && x > 0) return 'under 1%';
    if (p === 100 && x < 1) return 'over 99%';
    return p + '%';
  }
  function people(n) {
    if (n >= 1e9) return 'about ' + (n / 1e9).toFixed(1) + ' billion';
    if (n >= 10e6) return 'about ' + Math.round(n / 1e6) + ' million';
    if (n >= 1e6) return 'about ' + (Math.round(n / 1e5) / 10) + ' million';
    if (n >= 1e5) return 'about ' + (Math.round(n / 1e4) * 1e4).toLocaleString('en-US');
    return 'about ' + (Math.round(n / 1e3) * 1000).toLocaleString('en-US');
  }
  function money(x) { return '$' + Math.round(x / 1e9) + ' billion'; }
  function km(x) { return x < 1 ? 'less than 1 km' : 'about ' + Math.round(x) + ' km'; }

  /* ---------- map ---------- */
  var map = L.map('map', {
    renderer: L.canvas({ padding: 0.5 }),
    zoomSnap: 0.25, minZoom: 0, maxZoom: 16,
    worldCopyJump: false, maxBounds: [[-88, -230], [88, 230]], maxBoundsViscosity: 0.8,
    attributionControl: false, zoomControl: false
  });
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.attribution({ position: 'bottomright', prefix: '<a href="viewer/leaflet/LICENSE">Leaflet</a>' })
    .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> and others via geoBoundaries (ODbL), Natural Earth, Kummu et al. 2025, GeoNames &middot; <a href="#" data-about="1">About</a>')
    .addTo(map);
  map.fitBounds([[-56, -170], [76, 190]]);

  var bordersLayer = L.layerGroup();
  var labelsLayer = L.layerGroup().addTo(map);
  var labelMarkers = [];

  function setStatus(t) { statusEl.textContent = t || ''; }

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  function styleRegion(f) {
    return { fillColor: TINT[f.properties.tint] || TINT[0], fillOpacity: 1, color: INK, weight: 0.7, opacity: 0.85 };
  }

  Promise.all([getJSON(DATA), getJSON(DETAIL).catch(function () { return null; })]).then(function (res) {
    var gj = res[0];
    detail = res[1];
    gj.features.forEach(function (f) { byId[f.properties.id] = f; });
    index = EqualLookup.buildIndex(gj, detail);
    // Draw the full-detail outline for the regions that have one (New York).
    var drawn = { type: 'FeatureCollection', features: gj.features.map(function (f) {
      var d = detail && detail.features.filter(function (x) { return x.properties.id === f.properties.id; })[0];
      return d ? { type: 'Feature', properties: f.properties, geometry: d.geometry } : f;
    }) };
    regionsLayer = L.geoJSON(drawn, { style: styleRegion, interactive: false }).addTo(map);
    regionsLayer.bringToBack();
    setStatus('');
    if (bordersLayer.getLayers().length && $('today').checked) bordersLayer.addTo(map);
    fromHash(true);
    loadLabels();
  }).catch(function () {
    setStatus('Could not load the map. Check your connection and reload the page.');
  });

  getJSON(BORDERS).then(function (b) {
    L.polyline(b.lines.map(function (ln) { return ln.map(function (p) { return [p[1], p[0]]; }); }), {
      color: INK, weight: 1, opacity: 0.6, dashArray: '4 3', interactive: false
    }).addTo(bordersLayer);
    if ($('today').checked && regionsLayer) bordersLayer.addTo(map);
  }).catch(function () {});

  $('today').addEventListener('change', function () {
    if (this.checked) bordersLayer.addTo(map); else map.removeLayer(bordersLayer);
  });

  function loadLabels() {
    getJSON(LABELS).then(function (list) {
      list.forEach(function (l) {
        var f = byId[l[0]];
        if (!f) return;
        var m = L.marker([l[1], l[2]], {
          interactive: false, keyboard: false,
          icon: L.divIcon({ className: 'lbl', iconSize: null, html: '<span>' + esc(cleanName(f.properties.name)) + '</span>' })
        });
        m._minZoom = l[3];
        labelMarkers.push(m);
      });
      updateLabels();
    }).catch(function () {});
  }
  function updateLabels() {
    var z = map.getZoom();
    labelMarkers.forEach(function (m) {
      var on = z >= m._minZoom;
      if (on && !labelsLayer.hasLayer(m)) labelsLayer.addLayer(m);
      else if (!on && labelsLayer.hasLayer(m)) labelsLayer.removeLayer(m);
    });
  }
  map.on('zoomend', updateLabels);

  /* ---------- choosing a point ---------- */
  map.on('click', function (e) {
    choose(e.latlng.lat, EqualLookup.normLon(e.latlng.lng), { pan: 'ifHidden', digits: 4 });
  });

  // Keep the point visible above the bottom sheet (phones) or beside the side card (desktop).
  function showPoint(latlng, zoom) {
    var size = map.getSize();
    var wide = window.innerWidth >= 800;
    var target = map.project(latlng, zoom);
    var visibleCenter = wide
      ? L.point((452 + size.x) / 2, size.y / 2)
      : L.point(size.x / 2, (130 + size.y * 0.54) / 2);
    var offset = visibleCenter.subtract(size.divideBy(2));
    map.setView(map.unproject(target.subtract(offset), zoom), zoom, { animate: true });
  }
  function panIfHidden(latlng) {
    var p = map.latLngToContainerPoint(latlng);
    var size = map.getSize();
    var wide = window.innerWidth >= 800;
    var cardRect = card.getBoundingClientRect();
    var hidden = wide ? (p.x < cardRect.right + 10 && p.y > cardRect.top && p.y < cardRect.bottom)
      : (p.y > cardRect.top - 20 || p.y < 130);
    if (hidden) showPoint(latlng, map.getZoom());
  }

  function choose(lat, lon, opt) {
    opt = opt || {};
    if (!index) return;
    var hit = EqualLookup.lookup(index, lat, lon);
    var ll = L.latLng(lat, lon);
    if (pointMarker) map.removeLayer(pointMarker);
    pointMarker = L.circleMarker(ll, { radius: 7, color: '#fff', weight: 3, fillColor: INK, fillOpacity: 1, interactive: false }).addTo(map);
    if (chosenLayer) { map.removeLayer(chosenLayer); chosenLayer = null; }
    if (hit) {
      var f = hit.feature;
      var d = detail && detail.features.filter(function (x) { return x.properties.id === f.properties.id; })[0];
      var geom = d ? d.geometry : f.geometry;
      chosenLayer = L.layerGroup([
        L.geoJSON(geom, { style: { color: '#fff', weight: 7, opacity: 0.9, fill: false }, interactive: false }),
        L.geoJSON(geom, { style: { color: INK, weight: 3.5, opacity: 1, fill: false }, interactive: false })
      ]).addTo(map);
    }
    renderCard(hit, lat, lon);
    var digits = opt.digits || 4;
    var h = '#' + lat.toFixed(digits) + ',' + lon.toFixed(digits);
    if (location.hash !== h) history.replaceState(null, '', h);
    if (opt.zoom) showPoint(ll, opt.zoom);
    else if (opt.pan === 'ifHidden') panIfHidden(ll);
  }

  function renderCard(hit, lat, lon) {
    var html;
    if (!hit) {
      html = '<h2>That point is at sea.</h2><p>Tap on land, or search a city.</p>';
    } else {
      var p = hit.feature.properties;
      var name = cleanName(p.name);
      var cs = p.countries || [];
      html = '<h2>You would live in <b>' + esc(name) + '</b>.</h2>';
      html += '<p>' + esc(capFirst(people(p.people))) + ' people live there.</p>';
      if (p.id === 176) {
        html += '<p class="warn">This number is far too low: the data grid is too coarse for Manhattan. The real number is several times higher.</p>';
      }
      html += '<p>It earns about ' + money(p.gdp) + ' in a year (' + (p.gdp / SHARE).toFixed(2) +
        ' of a share). Every one of the 195 earns close to $575 billion.</p>';
      if (cs.length) {
        var first = cs[0];
        html += '<p>' + pct(first.gdp_share) + ' of its money comes from ' + esc(cname(first.name)) + '.';
        if (cs.length > 1) {
          html += ' The rest:</p><ul>';
          var sum = first.gdp_share;
          cs.slice(1).forEach(function (c) {
            sum += c.gdp_share;
            var line = pct(c.gdp_share) + ' from ' + esc(cname(c.name));
            if (Math.round(c.gdp_share * 100) < 1 && c.area_share >= 0.05) line += ' (' + pct(c.area_share) + ' of its land)';
            html += '<li>' + line + '</li>';
          });
          if (sum < 0.985) html += '<li>' + pct(1 - sum) + ' from smaller pieces of other countries</li>';
          html += '</ul>';
        } else {
          html += '</p>';
        }
      }
      if (p.main_country) {
        var w = p.main_country_whole;
        html += '<p>It holds ' + (w >= 0.9995 ? 'all' : pct(w)) + ' of the economy of ' + esc(cname(p.main_country)) + '.</p>';
      }
      var notes = [];
      if (!hit.exact || hit.near) {
        var other = hit.near ? cleanName(hit.near.feature.properties.name) : null;
        notes.push('You are close to a line' + (other ? ' (' + esc(other) + ' is ' + km(hit.near.km) + ' away)' : '') +
          '. Near a line this simplified map can be a few km off.');
      }
      if (p.payroll_proxy_split) notes.push('Part of its border follows payroll data, not GDP.');
      if (p.grid_only_split) notes.push('Some of its borders are straight cuts on a grid, not real district lines.');
      notes.forEach(function (n) { html += '<p class="small">' + n + '</p>'; });
      html += '<div class="actions"><button type="button" class="btn" id="share">Copy link</button>' +
        '<button type="button" class="btn" id="more">What is this?</button></div>';
      html += '<p class="small">Names are working names, mostly the biggest city inside.</p>';
    }
    cardBody.innerHTML = html;
    card.hidden = false;
    var s = $('share');
    if (s) s.addEventListener('click', function () { share(hit, s); });
    var m = $('more');
    if (m) m.addEventListener('click', openAbout);
  }

  function share(hit, btn) {
    var url = location.href;
    var name = cleanName(hit.feature.properties.name);
    var text = 'On the equal world map I would live in ' + name + '.';
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      navigator.share({ title: 'Equal world map', text: text, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { btn.textContent = 'Link copied'; }, function () { showCopyField(url); });
    } else {
      showCopyField(url);
    }
  }
  function showCopyField(url) {
    var f = document.createElement('input');
    f.className = 'copyField'; f.readOnly = true; f.value = url; f.setAttribute('aria-label', 'Link to this place');
    var a = cardBody.querySelector('.actions');
    a.parentNode.insertBefore(f, a.nextSibling);
    f.focus(); f.select();
  }

  $('cardClose').addEventListener('click', function () {
    card.hidden = true;
    if (chosenLayer) { map.removeLayer(chosenLayer); chosenLayer = null; }
    if (pointMarker) { map.removeLayer(pointMarker); pointMarker = null; }
    history.replaceState(null, '', location.pathname + location.search);
  });

  /* ---------- link with a point: #lat,lon ---------- */
  function fromHash(first) {
    var m = /^#(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(location.hash);
    if (!m) return;
    var lat = parseFloat(m[1]), lon = parseFloat(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    var digits = (m[1].split('.')[1] || '').length || 3;
    choose(lat, lon, { zoom: first ? 5 : Math.max(map.getZoom(), 5), digits: Math.min(Math.max(digits, 2), 5) });
  }
  window.addEventListener('hashchange', function () { fromHash(false); });

  /* ---------- where I am ---------- */
  if ('geolocation' in navigator) {
    var loc = $('locate');
    loc.hidden = false;
    loc.addEventListener('click', function () {
      setStatus('Finding where you are...');
      navigator.geolocation.getCurrentPosition(function (pos) {
        setStatus('');
        // Rounded to 2 decimals (about 1 km) so a shared link does not give away an exact address.
        var lat = Math.round(pos.coords.latitude * 100) / 100, lon = Math.round(pos.coords.longitude * 100) / 100;
        choose(lat, lon, { zoom: Math.max(map.getZoom(), 6), digits: 2 });
      }, function () {
        setStatus('Could not get your location. Search a city or tap the map instead.');
        setTimeout(function () { setStatus(''); }, 3500);
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  }

  /* ---------- about panel ---------- */
  var vl = $('videoLine');
  if (VIDEO_URL) {
    vl.innerHTML = 'From the Nils Explains video <a href="' + esc(VIDEO_URL) + '">‘' + esc(VIDEO_TITLE) + '’</a>.';
  } else {
    vl.textContent = "From the Nils Explains video '" + VIDEO_TITLE + "'";
  }
  function openAbout() { $('about').hidden = false; $('aboutClose').focus(); }
  function closeAbout() { $('about').hidden = true; }
  $('info').addEventListener('click', openAbout);
  $('aboutClose').addEventListener('click', closeAbout);
  $('about').addEventListener('click', function (e) { if (e.target === this) closeAbout(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAbout(); hideResults(); } });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-about]');
    if (a) { e.preventDefault(); openAbout(); }
  });

  /* ---------- city search (offline, GeoNames cities15000) ---------- */
  var q = $('q'), results = $('results');
  var cities = null, countryNames = {}, citiesLoading = null;

  function fold(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
      .replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/ı/g, 'i').replace(/[‘’'`.\-]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function loadCities() {
    if (citiesLoading) return citiesLoading;
    citiesLoading = fetch(CITIES).then(function (r) {
      if (!r.ok) throw new Error('cities');
      return r.text();
    }).then(function (txt) {
      var out = [];
      txt.split('\n').forEach(function (line) {
        if (!line) return;
        if (line.charAt(0) === '#') {
          if (line.indexOf('#C ') === 0) line.slice(3).split('|').forEach(function (kv) {
            var i = kv.indexOf('='); countryNames[kv.slice(0, i)] = kv.slice(i + 1).trim();
          });
          return;
        }
        var c = line.split('|');
        out.push({ name: c[0], region: c[1], cc: c[2], lat: +c[3], lon: +c[4], pop: +c[5], key: fold(c[0]) });
      });
      cities = out; // already sorted by population, biggest first
      return out;
    });
    return citiesLoading;
  }

  function search(text) {
    var parts = text.split(',');
    var nq = fold(parts[0]);
    var where = parts.length > 1 ? fold(parts.slice(1).join(' ')) : '';
    if (nq.length < 2) return [];
    var tiers = [[], [], []], limit = 8;
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      var k = c.key, t;
      if (k.indexOf(nq) === 0) t = 0;
      else if (k.indexOf(' ' + nq) >= 0) t = 1;
      else if (nq.length >= 3 && k.indexOf(nq) > 0) t = 2;
      else continue;
      if (where) {
        var cn = fold(countryNames[c.cc] || ''), rg = fold(c.region);
        if (cn.indexOf(where) !== 0 && rg.indexOf(where) !== 0 && c.cc.toLowerCase() !== where) continue;
      }
      if (tiers[t].length < limit) tiers[t].push(c);
      if (tiers[0].length >= limit) break;
    }
    return tiers[0].concat(tiers[1], tiers[2]).slice(0, limit);
  }

  var active = -1, current = [];
  function hideResults() { results.hidden = true; active = -1; q.setAttribute('aria-expanded', 'false'); }
  function showResults(list, text) {
    current = list;
    active = -1;
    var html = list.map(function (c, i) {
      var sub = [c.region, countryNames[c.cc] || c.cc].filter(Boolean).join(', ');
      return '<li role="option"><button type="button" data-i="' + i + '">' + esc(c.name) +
        '<br><small>' + esc(sub) + '</small></button></li>';
    }).join('');
    if (!list.length && text) html = '<li class="note">No city found. Small town? Tap the map instead.</li>';
    else html += '<li class="note">Small town? Tap the map instead.</li>';
    results.innerHTML = html;
    results.hidden = false;
    q.setAttribute('aria-expanded', 'true');
  }
  function pick(c) {
    hideResults();
    q.value = c.name;
    q.blur();
    choose(c.lat, c.lon, { zoom: Math.max(map.getZoom(), 7), digits: 4 });
  }

  var timer = null;
  function onInput() {
    var text = q.value.trim();
    if (!text) { hideResults(); return; }
    if (!cities) {
      results.innerHTML = '<li class="note">Loading the city list...</li>';
      results.hidden = false;
      loadCities().then(onInput, function () {
        results.innerHTML = '<li class="note">Could not load the city list. Tap the map instead.</li>';
      });
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(function () { showResults(search(text), text); }, 80);
  }
  q.addEventListener('focus', function () { loadCities().catch(function () {}); if (q.value.trim()) onInput(); });
  q.addEventListener('input', onInput);
  q.addEventListener('keydown', function (e) {
    var btns = results.querySelectorAll('button');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!btns.length) return;
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
      btns.forEach(function (b, i) { b.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
      btns[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (current.length) pick(current[active >= 0 ? active : 0]);
    }
  });
  results.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (b) pick(current[+b.getAttribute('data-i')]);
  });
  document.addEventListener('click', function (e) {
    if (!results.hidden && !e.target.closest('.search')) hideResults();
  });
})();
