// qgis2web.js FINAL (legend & table preserved, strict z-order sync, move layer/group up/down)
// Works with window.groupedLayers defined in layerConfig.js
// ===== PATCH: Disable Leaflet auto bringToFront =====
L.Layer.include({
  bringToFront: function () { return this; },
  bringToBack: function () { return this; }
});


(function(){
  if (typeof window.groupedLayers !== 'object') {
    console.error("groupedLayers tidak ditemukan. Pastikan layerConfig.js dimuat sebelum qgis2web.js");
    return;
  }

  // --- MAP ---
  var map = L.map('map', { zoomControl:true }).setView([-6.8, 110.9], 11);

// === [PATCH] Uploaded Layers helpers (ensureUploadedGroup, addUploadedLayerToSidebar, fitToLayer) ===
var uploadedBounds = null;
var upGroupContainer = null;
function getSidebarRoot() {
  return document.getElementById('layer-accordion') || document.getElementById('layerControl') || document.body;
}
function ensureUploadedGroup() {
  if (upGroupContainer) return upGroupContainer;
  var sidebarEl = getSidebarRoot();
  if (!sidebarEl) return null;

  var existing = sidebarEl.querySelector('[data-group="Uploaded Layers"]');
  if (existing) { upGroupContainer = existing; return upGroupContainer; }

  var group = document.createElement('div');
  group.className = 'q2w-group';
  group.setAttribute('data-group', 'Uploaded Layers');

  var header = document.createElement('div');
  header.className = 'q2w-group-header';
  header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:#0a2540;color:#fff;border-radius:6px;margin:8px 0;cursor:pointer;';
  header.innerHTML = '<strong>Uploaded Layers</strong><span style="margin-left:auto;opacity:.8">Zoom All</span>';
  group.appendChild(header);

  var list = document.createElement('div');
  list.className = 'q2w-layer-list';
  group.appendChild(list);

  if (sidebarEl.firstChild) sidebarEl.insertBefore(group, sidebarEl.firstChild);
  else sidebarEl.appendChild(group);

  header.addEventListener('click', function() {
    list.style.display = (list.style.display === 'none') ? 'block' : 'none';
  });

  header.addEventListener('dblclick', function(ev){
    if (uploadedBounds && uploadedBounds.isValid && uploadedBounds.isValid()) {
      map.fitBounds(uploadedBounds.pad(0.15));
    }
  });

  upGroupContainer = group;
  return upGroupContainer;
}

function addUploadedLayerToSidebar(layer, layerName) {
  var grp = ensureUploadedGroup();
  if (!grp) return;
  var list = grp.querySelector('.q2w-layer-list');
  var row = document.createElement('div');
  row.className = 'q2w-layer-row';
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px;border-bottom:1px dashed #e5e7eb';

  var cid = 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  row.innerHTML = ''
    + '<label class="q2w-layer-label" for="'+cid+'" style="display:flex;align-items:center;gap:6px">'
    + '  <input id="'+cid+'" type="checkbox" checked>'
    + '  <span>'+ (layerName || 'Uploaded') +'</span>'
    + '</label>'
    + '<div class="q2w-layer-tools" style="display:flex;gap:6px">'
    + '  <button class="tool-zoom" title="Zoom to layer">🔍</button>'
    + '  <button class="tool-remove" title="Remove">✖</button>'
    + '</div>';

  row.querySelector('#'+cid).addEventListener('change', function(e){
    if (e.target.checked) {
      try { layer.addTo(map); } catch(_) {}
    } else {
      try { map.removeLayer(layer); } catch(_) {}
    }
  });

  row.querySelector('.tool-zoom').addEventListener('click', function(){
    fitToLayer(layer);
  });

  row.querySelector('.tool-remove').addEventListener('click', function(){
    try { map.removeLayer(layer); } catch(_) {}
    row.remove();
  });

  list.prepend(row);
}

function fitToLayer(layer) {
  var b = null;
  try {
    if (typeof layer.getBounds === 'function') b = layer.getBounds();
  } catch(e) { }

  if (!b || !b.isValid || (b.isValid && !b.isValid())) {
    try {
      var ll = [];
      if (layer.eachLayer) {
        layer.eachLayer(function(ly){
          if (ly && typeof ly.getLatLng === 'function') {
            ll.push(ly.getLatLng());
          } else if (ly && typeof ly.getLatLngs === 'function') {
            var pts = ly.getLatLngs();
            var stack = Array.isArray(pts) ? pts.slice() : [pts];
            while (stack.length) {
              var it = stack.pop();
              if (Array.isArray(it)) stack.push.apply(stack, it);
              else if (it && it.lat !== undefined && it.lng !== undefined) ll.push(it);
            }
          }
        });
      }
      if (ll.length) b = L.latLngBounds(ll);
    } catch(e) { }
  }
  if (b && b.isValid && b.isValid()) {
    map.fitBounds(b.pad(0.15));
    if (typeof b.clone === 'function') {
      uploadedBounds = uploadedBounds ? uploadedBounds.extend(b) : b.clone();
    } else {
      uploadedBounds = uploadedBounds ? uploadedBounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
    }
  }
}
// === [/PATCH helpers] ===



var uploadedGroup = L.layerGroup().addTo(map);

// Fungsi popup tabel----
function bindPopupForFeature(feature, layer) {
  if (feature.properties) {
    let html = "<table border='1' style='border-collapse:collapse;width:100%'>";
    for (let key in feature.properties) {
      html += "<tr><th style='padding:2px 5px;background:#f0f0f0;text-align:left'>" 
           + key + "</th><td style='padding:2px 5px'>" 
           + feature.properties[key] + "</td></tr>";
    }
    html += "</table>";
    layer.bindPopup(html);
  }
}

// Fungsi menambahkan layer ke sidebar ------------------------------------
// [patched] legacy addLayerToSidebar removed


  // Tambah checkbox untuk layer
  var layerItem = document.createElement("div");
  var input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.onchange = function() {
    if (this.checked) {
      uploadedGroup.addLayer(layer);
    } else {
      uploadedGroup.removeLayer(layer);
    }
  };

  var label = document.createElement("label");
  label.innerText = name;

  layerItem.appendChild(input);
  layerItem.appendChild(label);
  groupContainer.appendChild(layerItem);


  var row = document.createElement('div');
  row.className = 'layer-row';

  var checkboxId = 'chk-' + layerName.replace(/\s+/g, '_');
  var sliderId = 'sld-' + layerName.replace(/\s+/g, '_');

  row.innerHTML =
    '<label for="'+checkboxId+'" style="display:flex;align-items:center;gap:6px;margin:0;cursor:pointer;">' +
    '<input id="'+checkboxId+'" type="checkbox" checked />' +
    '<span>'+layerName+'</span>' +
    '</label>' +
    '<input id="'+sliderId+'" type="range" min="0" max="1" step="0.1" value="1" style="width:80px;margin-left:auto;" />' +
    '<div style="display:flex;gap:4px;">' +
    '<button class="reorder-btn q2w-zoom" title="Zoom ke layer">🔍</button>' +
    '</div>';

  // checkbox on/off
  row.querySelector('#'+checkboxId).addEventListener('change', function(e) {
    if (this.checked) {
      map.addLayer(layerObj);
    } else {
      map.removeLayer(layerObj);
    }
  });

  // slider transparansi
  row.querySelector('#'+sliderId).addEventListener('input', function(e) {
    if (layerObj.setStyle) {
      layerObj.setStyle({ opacity: this.value, fillOpacity: this.value });
    }
  });

  // tombol zoom
  row.querySelector('.q2w-zoom').addEventListener('click', function(e) {
    e.stopPropagation();
    if (map.hasLayer(layerObj)) {
      try {
        map.fitBounds(layerObj.getBounds(), { padding:[20,20] });
      } catch(err) {
        console.warn("Layer tidak bisa di-zoom:", err);
      }
    } else {
      alert("Layer belum aktif, aktifkan dulu!");
    }
  });

  container.appendChild(row);
})

// === Upload GeoJSON ===
const geojsonInput = document.getElementById('geojsonUpload');
if (geojsonInput) {
  geojsonInput.addEventListener('change', function (evt) {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const geojson = JSON.parse(e.target.result);

        // Popup default: tampilkan properti key:value
        const onEach = (feature, layer) => {
          if (!feature || !feature.properties) return;
          const rows = Object.entries(feature.properties)
            .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
          layer.bindPopup(`<table class="popup-table">${rows}</table>`);
        };

        const layer = L.geoJSON(geojson, {
          style: { color: '#00AEEF', weight: 2, fillOpacity: 0.25 },
          onEachFeature: onEach
        }).addTo(map);

        // Sidebar + Zoom
        addUploadedLayerToSidebar(layer, file.name.replace(/\.(geo)?json$/i,''));
        fitToLayer(layer);
      } catch (err) {
        console.error('GeoJSON parse error:', err);
        alert('File bukan GeoJSON yang valid.');
      } finally {
        evt.target.value = '';
      }
    };
    reader.readAsText(file);
  });
}

// === Upload Shapefile (.zip) ===
// Butuh shp.js sudah di-include di index.html
const shpInput = document.getElementById('shpUpload');
if (shpInput) {
  shpInput.addEventListener('change', function (evt) {
    const file = evt.target.files && evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      shp(e.target.result).then((geojson) => {
        // Pastikan minimal file .shp + .dbf + .prj ada → validasi lunak: cukup logging
        // (tidak lagi pakai alert sebelum render)
        try {
          // onEach untuk popup
          const onEach = (feature, layer) => {
            if (!feature || !feature.properties) return;
            const rows = Object.entries(feature.properties)
              .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
            layer.bindPopup(`<table class="popup-table">${rows}</table>`);
          };

          const layer = L.geoJSON(geojson, {
            style: { color: '#FF4D4F', weight: 2, fillOpacity: 0.25 },
            onEachFeature: onEach
          }).addTo(map);

          addUploadedLayerToSidebar(layer, file.name.replace(/\.zip$/i,''));
          if (layer.getBounds && layer.getBounds().isValid()) {
    map.fitBounds(layer.getBounds());
  }
        } catch (err) {
          console.error('Render shapefile error:', err);
          alert('Terjadi kesalahan saat merender shapefile.');
        }
      }).catch((err) => {
        console.error('Error parsing shapefile:', err);
        alert('Gagal membaca shapefile. Pastikan ZIP minimal berisi .shp + .dbf + .prj (tambahan file lain tetap boleh).');
      }).finally(() => {
        evt.target.value = '';
      });
    };
    reader.readAsArrayBuffer(file);
  });
}



// ============ MEASUREMENT (Leaflet-Geoman + Turf.js) ============
(function(){
  // Tampilkan tombol geoman di kanan bawah
  map.pm.addControls({
    position: 'bottomright',
    drawMarker: true,
    drawCircle: true,
    drawCircleMarker: true,
    drawRectangle: false,
    drawText: true,
    cutPolygon: false,
    rotateMode: false,
    dragMode: true,
    editMode: true,
    removalMode: true,
    drawPolyline: true,   // ukur jarak
    drawPolygon: true     // ukur luas
  });

  // Opsi snapping biar enak digambar
  map.pm.setGlobalOptions({
    continueDrawing: false,
    snappable: true,
    snapDistance: 20
  });

// === Pilih warna dengan prompt saat menggambar ===
map.on('pm:create', function(e) {
  // tanya user warna
  var chosenColor = prompt("Masukkan warna (contoh: 'red' atau '#00ff00'):", "#3388ff");
  
  // kalau user isi warna → apply style
  if (chosenColor) {
    e.layer.setStyle({
      color: chosenColor,      // warna garis
      fillColor: chosenColor,  // warna isi polygon
      fillOpacity: 0.4
    });
  }
});


  // Layer untuk menampung label-label
  var measureLabels = L.layerGroup().addTo(map);

  function fmtLength(m){
    if (m < 1000) return m.toFixed(0) + ' m';
    return (m/1000).toFixed(2) + ' km';
  }
  function fmtArea(m2){
    if (m2 < 1e6) return m2.toLocaleString(undefined, {maximumFractionDigits:0}) + ' m²';
    return (m2/1e6).toFixed(2) + ' km²';
  }

  // Ambil koordinat latlngs polyline (flatten kalau multi)
  function getLineLatLngs(layer){
    var latlngs = layer.getLatLngs();
    // Polyline biasa: [LatLng,...], Multi: [[LatLng,...], ...]
    if (Array.isArray(latlngs) && Array.isArray(latlngs[0])){
      // ambil ring pertama
      latlngs = latlngs[0];
    }
    return latlngs;
  }

  // Ambil ring terluar polygon (flatten)
  function getPolyRing(layer){
    var ll = layer.getLatLngs();
    // Polygon: [[LatLng,...]] ; MultiPolygon: [[[LatLng,...]], ...]
    if (Array.isArray(ll) && Array.isArray(ll[0]) && Array.isArray(ll[0][0])){
      ll = ll[0]; // ambil polygon pertama
    }
    return ll;
  }

  function addOrUpdateLengthLabel(layer){
    var latlngs = getLineLatLngs(layer);
    if (!latlngs || latlngs.length < 2) return;

    // LineString untuk Turf (lng,lat)
    var line = turf.lineString(latlngs.map(function(p){ return [p.lng, p.lat]; }));
    var totalKm = turf.length(line, {units:'kilometers'});
    var midPt   = turf.along(line, totalKm/2, {units:'kilometers'});
    var midLL   = L.latLng(midPt.geometry.coordinates[1], midPt.geometry.coordinates[0]);
    var meters  = totalKm * 1000;

    var html = fmtLength(meters);
    if (!layer._lenLabel){
      layer._lenLabel = L.marker(midLL, {
        interactive:false,
        icon: L.divIcon({className:'measure-label measure-label--line', html: html})
      }).addTo(measureLabels);
    } else {
      layer._lenLabel.setLatLng(midLL);
      layer._lenLabel.setIcon(L.divIcon({className:'measure-label measure-label--line', html: html}));
    }
  }

function addOrUpdateAreaLabel(layer){
  var latlngs = layer.getLatLngs()[0];
  if (!latlngs || latlngs.length < 3) return;

  // pastikan polygon tertutup
  var coords = latlngs.map(function(p){ return [p.lng, p.lat]; });
  if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]){
    coords.push(coords[0]);
  }

  var poly = turf.polygon([coords]);
  var area = turf.area(poly); // hasil dalam m²

  // cari titik tengah
  var centroid = turf.centroid(poly);
  var cLL = L.latLng(centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]);

  var html = fmtArea(area);
  if (!layer._areaLabel){
    layer._areaLabel = L.marker(cLL, {
      interactive:false,
      icon: L.divIcon({
        className:'measure-label measure-label--area',
        html: html
      })
    }).addTo(measureLabels);
  } else {
    layer._areaLabel.setLatLng(cLL);
    layer._areaLabel.setIcon(L.divIcon({
      className:'measure-label measure-label--area',
      html: html
    }));
  }
}



  // Saat selesai menggambar
  map.on('pm:create', function(e){
    var layer = e.layer;
    if (e.shape === 'Line' || e.shape === 'Polyline'){
      addOrUpdateLengthLabel(layer);
    } else if (e.shape === 'Polygon'){
      addOrUpdateAreaLabel(layer);
    }

    // Update label saat diedit
    layer.on('pm:edit', function(){
      if (layer instanceof L.Polygon){
        addOrUpdateAreaLabel(layer);
      } else if (layer instanceof L.Polyline){
        addOrUpdateLengthLabel(layer);
      }
    });

    // Bersihkan label saat layer dihapus
    layer.on('remove', function(){
      if (layer._lenLabel){ measureLabels.removeLayer(layer._lenLabel); layer._lenLabel = null; }
      if (layer._areaLabel){ measureLabels.removeLayer(layer._areaLabel); layer._areaLabel = null; }
    });
  });

  // Jika user hapus dengan mode removal
  map.on('pm:remove', function(e){
    var layer = e.layer;
    if (layer && layer._lenLabel){ measureLabels.removeLayer(layer._lenLabel); }
    if (layer && layer._areaLabel){ measureLabels.removeLayer(layer._areaLabel); }
  });
})();


// === SEARCH (OSM Geocoder) ===
try {
  var geocoderCtl = L.Control.geocoder({
    defaultMarkGeocode: true,
    placeholder: "Cari lokasi...",
    errorMessage: "Lokasi tidak ditemukan"
  }).on('markgeocode', function(e) {
    var center = e.geocode.center;
    map.setView(center, 16);
  }).addTo(map);
} catch(e){ console.warn('Geocoder init failed:', e); }


// === PATCH: disable auto bringToFront / bringToBack ===
if (L && L.Path && !L.Path.__patched) {
    L.Path.include({
        bringToFront: function () { return this; },
        bringToBack: function () { return this; }
    });
    L.Path.__patched = true;
}

// --- PATCH: Matikan efek klik/hover "naik ke atas" ---
L.Path.include({
  bringToFront: function () { return this; },
  bringToBack: function () { return this; }
});


// PATCH: Disable auto bringToFront
L.Layer.include({
  bringToFront: function () { return this; },
  bringToBack: function () { return this; }
});

  // basemaps
  var baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 20}).addTo(map);
  var baseSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:20});
  var baseDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom:20});
  L.control.layers(
    {"OSM": baseOSM, "Esri Satellite": baseSat, "Carto Dark": baseDark},
    {},
    {position: "topright"}
  ).addTo(map);

  // --- SIDEBAR ---
  var sidebar = L.control.sidebar({ container: 'sidebar', autopan: false }).addTo(map);
  try { sidebar.open('home'); } catch(e) {}

  // === Uploaded Layers: helper & state ===
const UP_GROUP_ID = 'uploaded-group';
let upGroupContainer = null;   // DOM accordion group for "Uploaded Layers"
let uploadedBounds = null;     // union bounds of uploaded layers

function ensureUploadedGroup() {
  if (upGroupContainer) return upGroupContainer;

  const sidebarEl = document.getElementById('layer-accordion'); // id accordion utama
  if (!sidebarEl) return null;

  // Cek kalau sudah ada
  let exists = sidebarEl.querySelector(`[data-group-id="${UP_GROUP_ID}"]`);
  if (exists) { upGroupContainer = exists; return upGroupContainer; }

  // Buat group baru paling atas
  const group = document.createElement('div');
  group.className = 'layer-group';
  group.dataset.groupId = UP_GROUP_ID;

  group.innerHTML = `
    <div class="group-header">
      <button class="group-toggle" type="button">Uploaded Layers</button>
      <div class="group-tools"></div>
    </div>
    <div class="group-body" style="display:none">
      <div class="layers-list"></div>
    </div>
  `;

  // Sisipkan di paling atas
  sidebarEl.insertBefore(group, sidebarEl.firstChild);
  // Tambah tombol "Zoom All" pada header
const tools = group.querySelector('.group-tools');
const zoomAllBtn = document.createElement('button');
zoomAllBtn.className = 'tool-zoom-all';
zoomAllBtn.textContent = 'Zoom All';
zoomAllBtn.title = 'Zoom ke semua Uploaded Layers';
zoomAllBtn.addEventListener('click', () => {
  if (uploadedBounds && uploadedBounds.isValid && uploadedBounds.isValid()) {
    map.fitBounds(uploadedBounds.pad(0.15));
  }
});
tools.appendChild(zoomAllBtn);

  // Toggle expand/collapse
  const btn = group.querySelector('.group-toggle');
  const body = group.querySelector('.group-body');
  btn.addEventListener('click', () => {
    body.style.display = (body.style.display === 'none') ? 'block' : 'none';
  });

  upGroupContainer = group;
  return upGroupContainer;
}

// Tambah satu layer ke sidebar Uploaded Layers
function addUploadedLayerToSidebar(layer, layerName) {
  const grp = ensureUploadedGroup();
  if (!grp) return;

  const list = grp.querySelector('.layers-list');
  const row  = document.createElement('div');
  row.className = 'layer-row';

  // ID unik untuk checkbox
  const cid = `up_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

  row.innerHTML = `
    <label class="layer-row__label" for="${cid}">
      <input id="${cid}" type="checkbox" checked>
      <span class="layer-row__title">${layerName}</span>
    </label>
    <div class="layer-row__tools">
      <button class="tool-zoom" title="Zoom to layer">🔍</button>
      <button class="tool-remove" title="Remove">✖</button>
    </div>
  `;

  // Show/Hide
  row.querySelector(`#${cid}`).addEventListener('change', (e) => {
    if (e.target.checked) {
      try { layer.addTo(map); } catch(_) {}
    } else {
      try { map.removeLayer(layer); } catch(_) {}
    }
  });

  // Zoom
  row.querySelector('.tool-zoom').addEventListener('click', () => {
    fitToLayer(layer);
  });

  // Remove
  row.querySelector('.tool-remove').addEventListener('click', () => {
    try { map.removeLayer(layer); } catch(_) {}
    row.remove();
  });

  list.prepend(row); // paling atas
}

// Fit ke bounds layer; kalau tidak valid, coba hitung manual
function fitToLayer(layer) {
  let b = null;
  try {
    if (typeof layer.getBounds === 'function') b = layer.getBounds();
  } catch(_) {}

  if (!b || !b.isValid || (b.isValid && !b.isValid())) {
    // Fallback untuk MarkerCollection dll.
    try {
      const ll = [];
      layer.eachLayer && layer.eachLayer((ly) => {
        if (ly.getLatLng) ll.push(ly.getLatLng());
        else if (ly.getLatLngs) {
          const flatten = (arr) => arr.flatMap(a => Array.isArray(a) ? flatten(a) : [a]);
          flatten(ly.getLatLngs()).forEach(pt => ll.push(pt));
        }
      });
      if (ll.length) b = L.latLngBounds(ll);
    } catch(_) {}
  }
  if (b && b.isValid && b.isValid()) {
    map.fitBounds(b.pad(0.15));
    // simpan union bounds
    uploadedBounds = uploadedBounds ? uploadedBounds.extend(b) : b.clone();
  }
}


  // --- DOM targets ---
  var layerCtl = document.getElementById('layerControl');
  var legendEl = document.getElementById('legendContent');
  var tableHeadRow = document.getElementById('table-head-row');
  var tableBody = document.getElementById('table-body');

  // --- State ---
  var layerRefs = {};   // map layerName -> {cfg, geojson, paneId}
  var activeLayers = {};


var layerOpacity = {}; // map layerName -> 0..1

function applyOpacityToLayer(layerName){
  var alpha = (layerOpacity[layerName] != null) ? layerOpacity[layerName] : 1;
  var layer = activeLayers[layerName];
  if (!layer) return;
  if (typeof layer.eachLayer === 'function') {
    layer.eachLayer(function(l){
      if (l && typeof l.setStyle === 'function') {
        var newStyle = {};
        if (l.options && 'opacity' in l.options) newStyle.opacity = alpha;
        if (l.options && 'fillOpacity' in l.options) newStyle.fillOpacity = alpha;
        l.setStyle(newStyle);
      } else if (l && typeof l.setOpacity === 'function') {
        l.setOpacity(alpha);
      }
    });
  }
}
 // map layerName -> L.GeoJSON

  // --- helpers ---
  function ensureDataTablesDestroyed(){
    if (window.jQuery && jQuery.fn && jQuery.fn.DataTable && jQuery.fn.DataTable.isDataTable('#attributeTable')) {
      jQuery('#attributeTable').DataTable().clear().destroy();
    }
    while (tableHeadRow.firstChild) tableHeadRow.removeChild(tableHeadRow.firstChild);
    while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
  }

  function buildPopup(props, cfg){
    if (!cfg.popupFields || !cfg.popupFields.length) return '';
    var html = '<div class="popup-card">';
    cfg.popupFields.forEach(function(p){
      var val = props[p.field];
      if (val === undefined || val === null) val = '';
      html += '<div class="popup-row"><span class="popup-label">'+p.label+'</span><span class="popup-value">'+val+'</span></div>';
    });
    html += '</div>';
    return html;
  }

  function styleForFeature(f, cfg){
    var style = { color:'#333', weight:1, fillOpacity:0.7, fillColor:'#cccccc' };
    var val = cfg.field ? f.properties[cfg.field] : null;

    if (cfg.type === 'line') {
      style.fillOpacity = 0;
      style.weight = cfg.weight || 2;
    }
    if (cfg.type === 'point') {
      // ditangani di pointToLayer
    }

    if (Array.isArray(cfg.categories)) {
      var idx = cfg.categories.map(function(x){return String(x).toLowerCase().trim();})
                              .indexOf(String(val).toLowerCase().trim());
      var color = idx>=0 ? cfg.colors[idx] : '#cccccc';
      if (cfg.type === 'line') return { color: color, weight: cfg.weight || 2 };
      if (cfg.type === 'point') return { radius:5, color:'#333', fillColor:color, fillOpacity:0.9 };
      return { color:'#333', weight:1, fillColor:color, fillOpacity:0.7 };
    }

    if (Array.isArray(cfg.breaks)) {
      var i=0;
      for (; i<cfg.breaks.length; i++){
        if (Number(val) <= Number(cfg.breaks[i])) break;
      }
      var col = cfg.colors[Math.min(i, cfg.colors.length-1)] || '#cccccc';
      if (cfg.type === 'line') return { color: col, weight: cfg.weight || 2 };
      if (cfg.type === 'point') return { radius:5, color:'#333', fillColor:col, fillOpacity:0.9 };
      return { color:'#333', weight:1, fillColor:col, fillOpacity:0.7 };
    }

    return style;
  }

  function updateLegend(layerName, cfg){
    var html = '<b>'+layerName+'</b><br/>';
    if (Array.isArray(cfg.categories)) {
      cfg.categories.forEach(function(cat, i){
        html += '<i style="background:'+cfg.colors[i]+';width:14px;height:14px;display:inline-block;margin-right:6px;border:1px solid #999"></i>'+cat+'<br/>';
      });
    } else if (Array.isArray(cfg.breaks)) {
      cfg.breaks.forEach(function(b, i){
        html += '<i style="background:'+cfg.colors[i]+';width:14px;height:14px;display:inline-block;margin-right:6px;border:1px solid #999"></i> ≤ '+b+'<br/>';
      });
    } else {
      html += '<i>Tidak ada legenda</i>';
    }
    legendEl.innerHTML = html;
  }

  function renderTable(geojsonLayer){
    ensureDataTablesDestroyed();
    var data = [];
    var cols = [];
    if (!geojsonLayer) return;

    geojsonLayer.eachLayer(function(l){
      data.push(l.feature.properties);
    });

    if (data.length){
      Object.keys(data[0]).forEach(function(k){
        var th = document.createElement('th');
        th.textContent = k;
        tableHeadRow.appendChild(th);
        cols.push({data: k, title: k});
      });

      var tbodyFrag = document.createDocumentFragment();
      data.forEach(function(row){
        var tr = document.createElement('tr');
        Object.keys(data[0]).forEach(function(k){
          var td = document.createElement('td');
          var v = row[k];
          td.textContent = (v===undefined || v===null) ? '' : v;
          tr.appendChild(td);
        });
        tbodyFrag.appendChild(tr);
      });
      tableBody.appendChild(tbodyFrag);

      jQuery('#attributeTable').DataTable({
        scrollX: true,
        paging: true,
        searching: true,
        ordering: true
      });
    }
  }

  // -------- Pane + ZIndex management --------
  function getPaneId(layerName){ return 'pane_'+layerName.replace(/[^\w\-]/g,'_'); }

function applyZIndices(){
  var zBase = 400;
  var groups = layerCtl.querySelectorAll('.q2w-group');
  var ordered = [];

  groups.forEach(function(g){
    var lnameNodes = g.querySelectorAll('.q2w-layer');
    lnameNodes.forEach(function(node){
      var lname = node.getAttribute('data-layer');
      if (layerRefs[lname]) ordered.push(lname);
    });
  });

  // Bikin urutan sesuai dari atas ke bawah sidebar
for (var i=0;i<ordered.length;i++){
  var lname = ordered[i];
  var ref = layerRefs[lname];
  if (!ref) continue;
  var pane = map.getPane(ref.paneId);
  if (pane) pane.style.zIndex = String(zBase + (ordered.length - i));

  // --- Tambahan khusus point/titik ---
  var targetLayer = ref.geojson || ref;
  if (targetLayer && targetLayer.eachLayer) {
    targetLayer.eachLayer(function(subLayer){
      if (subLayer.setZIndexOffset) {
        // gunakan offset lebih besar supaya marker selalu di atas polygon/line
        subLayer.setZIndexOffset((zBase + (ordered.length - i)) * 1000);
      }
    });
  }
}
}



function addLayer(layerName, cfg){
    var paneId = getPaneId(layerName);

    // Buat pane khusus untuk layer kalau belum ada
    if (!map.getPane(paneId)) {
        map.createPane(paneId);
        map.getPane(paneId).style.zIndex = '400';
    }

    // Tambahkan layer ke map kalau belum ada
    var lyr = layerRefs[layerName];
    if (lyr) {
        var targetLayer = lyr.geojson || lyr;
        if (!map.hasLayer(targetLayer)) {
            targetLayer.addTo(map);
        }
    }

    // Pastikan urutan zIndex sesuai urutan sidebar
    applyZIndices();



    if (!layerRefs[layerName] || !layerRefs[layerName].geojson){
      var gj = L.geoJSON(cfg.data, {
        pane: paneId,
        style: function(f){ return styleForFeature(f, cfg); },
        onEachFeature: function(f, l){
          var html = buildPopup(f.properties, cfg);
          if (html) l.bindPopup(html);
        },
        pointToLayer: function(f, latlng){
          var st = styleForFeature(f, cfg);
          return L.circleMarker(latlng, st);
        }
      });
      layerRefs[layerName] = { cfg: cfg, geojson: gj, paneId: paneId };
    }

    if (!map.hasLayer(layerRefs[layerName].geojson)){
      layerRefs[layerName].geojson.addTo(map);
    }
    activeLayers[layerName] = layerRefs[layerName].geojson;
    if (layerOpacity[layerName] != null) { applyOpacityToLayer(layerName); }

    updateLegend(layerName, cfg);
    renderTable(layerRefs[layerName].geojson);
    applyZIndices();
  }

  function removeLayer(layerName){
    var ref = layerRefs[layerName];
    if (ref && map.hasLayer(ref.geojson)){
      map.removeLayer(ref.geojson);
    }
    delete activeLayers[layerName];
    // tidak mengosongkan legend/table agar tetap tampil info terakhir
  }

  // -------- UI builder --------
  function buildUI(){
    layerCtl.innerHTML = '';

          // === Tambah grup "Uploaded Layers" sekali saja ===
if (!document.querySelector('[data-group="Uploaded Layers"]')) {
    var uploadGroupDiv = document.createElement('div');
    uploadGroupDiv.className = 'q2w-group';
    uploadGroupDiv.setAttribute('data-group', 'Uploaded Layers');

    var header = document.createElement('div');
    header.className = 'q2w-group-header';
    header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:#0a2540;color:#fff;border-radius:6px;margin:8px 0;cursor:pointer;';
    header.innerHTML = '<strong>Uploaded Layers</strong>';
    uploadGroupDiv.appendChild(header);

    var list = document.createElement('div');
    list.className = 'q2w-layer-list';
    uploadGroupDiv.appendChild(list);

    // collapse/expand
    list.style.display = 'block';
    header.addEventListener('click', function(e){
      if (list.style.display === 'none') list.style.display = 'block'; 
      else list.style.display = 'none';
    });

    // simpan global supaya addLayerToSidebar bisa akses
    window.uploadLayerList = list;

    layerCtl.appendChild(uploadGroupDiv);
}

    Object.keys(window.groupedLayers).forEach(function(groupName){
      var groupObj = window.groupedLayers[groupName];
      var groupDiv = document.createElement('div');
      groupDiv.className = 'q2w-group';
      groupDiv.setAttribute('data-group', groupName);

      var header = document.createElement('div');
      header.className = 'q2w-group-header';
      header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:#0a2540;color:#fff;border-radius:6px;margin:8px 0;';
      header.innerHTML = '<strong>'+groupName+'</strong>' +
        '<div style="margin-left:auto;display:flex;gap:4px;">' +
        '<button class="reorder-btn q2w-group-up" title="Naik Grup">↑</button>' +
        '<button class="reorder-btn q2w-group-down" title="Turun Grup">↓</button>' +
        '</div>';
      groupDiv.appendChild(header);

      var list = document.createElement('div');
      list.className = 'q2w-layer-list';
      groupDiv.appendChild(list);
      
       // default: tampil
      list.style.display = 'block';
      header.addEventListener('click', function(e){
        // supaya klik tombol ↑/↓ tidak ikut collapse
        if (e.target.closest('button')) return;
        if (list.style.display === 'none') {
          list.style.display = 'block';
        } else {
          list.style.display = 'none';
        }
      });

      var layerNames = Object.keys(groupObj);
      layerNames.forEach(function(layerName){
        var cfg = groupObj[layerName];

        var row = document.createElement('div');
        row.className = 'q2w-layer';
        row.setAttribute('data-layer', layerName);
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;margin:6px 0;background:#fff;';

        var checkboxId = 'chk_'+Math.random().toString(36).slice(2);
        var sliderId = 'sld_'+Math.random().toString(36).slice(2);
        row.innerHTML =
          '<label for="'+checkboxId+'" style="display:flex;align-items:center;gap:6px;margin:0;cursor:pointer;">' +
          '<input id="'+checkboxId+'" type="checkbox" />' +
          '<span>'+layerName+'</span>' +
          '</label>' +
          '<input id="'+sliderId+'" type="range" min="0" max="1" step="0.1" value="1" style="width:80px;margin-left:auto;" />' +
          '<div style="display:flex;gap:4px;">' +
          '<button class="reorder-btn q2w-up" title="Naik">↑</button>' +
          '<button class="reorder-btn q2w-down" title="Turun">↓</button>' +
          '<button class="reorder-btn q2w-zoom" title="Zoom ke layer">🔍</button>' +   // ⬅ Tambahan ini
          '</div>';
        
        // tombol zoom to layer
        row.querySelector('.q2w-zoom').addEventListener('click', function(e){
        e.stopPropagation();
        var lyr = activeLayers[layerName];
        if (lyr && map.hasLayer(lyr)) {
        try {
        map.fitBounds(lyr.getBounds(), { padding:[20,20] });
        } catch(err) {
        console.warn("Tidak bisa zoom ke layer", layerName, err);
       }
        } else {
        alert("Layer belum aktif, aktifkan dulu!");
      }
    });
 
          
        // toggle layer
        row.querySelector('#'+checkboxId).addEventListener('change', function(e){
          if (e.target.checked) addLayer(layerName, cfg); else removeLayer(layerName);
        });


// opacity slider
row.querySelector('#'+sliderId).addEventListener('input', function(e){
  var val = parseFloat(e.target.value);
  layerOpacity[layerName] = val;
  if (activeLayers[layerName]) applyOpacityToLayer(layerName);
});

        // dblclick -> fokus legend & tabel tanpa mengubah visibilitas
        row.addEventListener('dblclick', function(){
          if (activeLayers[layerName]) {
            updateLegend(layerName, cfg);
            renderTable(activeLayers[layerName]);
          }
        });

        // naik/turun layer hanya di dalam grupnya
        row.querySelector('.q2w-up').addEventListener('click', function(e){
          e.stopPropagation();
          var prev = row.previousElementSibling;
          if (prev) {
            row.parentNode.insertBefore(row, prev);
            applyZIndices();
          }
        });
        row.querySelector('.q2w-down').addEventListener('click', function(e){
          e.stopPropagation();
          var next = row.nextElementSibling;
          if (next) {
            row.parentNode.insertBefore(next, row);
            applyZIndices();
          }
        });

        list.appendChild(row);
      });

      // pindah grup (blok isi grup ikut pindah)
      header.querySelector('.q2w-group-up').addEventListener('click', function(){
        var prev = groupDiv.previousElementSibling;
        if (prev) {
          groupDiv.parentNode.insertBefore(groupDiv, prev);
          applyZIndices();
        }
      });
      header.querySelector('.q2w-group-down').addEventListener('click', function(){
        var next = groupDiv.nextElementSibling;
        if (next) {
          groupDiv.parentNode.insertBefore(next, groupDiv);
          applyZIndices();
        }
      });

      layerCtl.appendChild(groupDiv);
    });

    applyZIndices();
  }

  // build awal
  buildUI();

  // pastikan panel legenda & tabel bisa diklik
  var style = document.createElement('style');
  style.textContent = '#legendContent, #attributeTable { pointer-events:auto !important; z-index:1000; }';
  document.head.appendChild(style);


// --- PATCH: Sinkron zIndex pane sesuai urutan sidebar ---
function q2w_applyZIndicesFromSidebar() {
  var ctl = document.querySelector('#layerControl') || document;
  var groups = ctl.querySelectorAll('.q2w-group');
  var orderedPaneIds = [];
  groups.forEach(function(group){
    var rows = group.querySelectorAll('.q2w-layer');
    rows.forEach(function(row){
      var lname = row.getAttribute('data-layer');
      if (!lname) return;
      var paneId = 'pane_'+lname.replace(/[^\w\-]/g,'_');
      if (map.getPane(paneId)) orderedPaneIds.push(paneId);
    });
  });
  var base = 400;
  var n = orderedPaneIds.length;
  for (var i=0;i<n;i++){
    var pane = map.getPane(orderedPaneIds[i]);
    if (pane) pane.style.zIndex = String(base + (n - i));
  }
}



// === [PATCH] Safe Upload Handlers ===
(function(){
  var gj = document.getElementById('geojsonUpload');
  if (gj) {
    gj.addEventListener('change', function(evt){
      var file = evt.target.files && evt.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e){
        try {
          var geojson = JSON.parse(e.target.result);
          var onEach = function(feature, layer){
            if (!feature || !feature.properties) return;
            var rows = Object.keys(feature.properties).map(function(k){
              return '<tr><th>'+k+'</th><td>'+feature.properties[k]+'</td></tr>';
            }).join('');
            layer.bindPopup('<table class="popup-table">'+rows+'</table>');
          };
          var lyr = L.geoJSON(geojson, { style:{color:'#00AEEF',weight:2,fillOpacity:.25}, onEachFeature:onEach }).addTo(map);
          addUploadedLayerToSidebar(lyr, file.name.replace(/\.(geo)?json$/i,''));
          fitToLayer(lyr);
        } catch(err) {
          console.error('GeoJSON parse error', err);
          alert('File bukan GeoJSON yang valid.');
        } finally {
          evt.target.value='';
        }
      };
      reader.readAsText(file);
    });
  }
  var shpI = document.getElementById('shpUpload');
  if (shpI) {
    shpI.addEventListener('change', function(evt){
      var file = evt.target.files && evt.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e){
        shp(e.target.result).then(function(geojson){
          try {
            var onEach = function(feature, layer){
              if (!feature || !feature.properties) return;
              var rows = Object.keys(feature.properties).map(function(k){
                return '<tr><th>'+k+'</th><td>'+feature.properties[k]+'</td></tr>';
              }).join('');
              layer.bindPopup('<table class="popup-table">'+rows+'</table>');
            };
            var lyr = L.geoJSON(geojson, { style:{color:'#FF4D4F',weight:2,fillOpacity:.25}, onEachFeature:onEach }).addTo(map);
            addUploadedLayerToSidebar(lyr, file.name.replace(/\.zip$/i,''));
            fitToLayer(lyr);
          } catch (err) {
            console.error('Render shapefile error:', err);
            alert('Terjadi kesalahan saat merender shapefile.');
          } finally {
            evt.target.value='';
          }
        }).catch(function(err){
          console.error('Error parsing shapefile:', err);
          alert('Gagal membaca shapefile. Pastikan ZIP minimal berisi .shp + .dbf + .prj (tambahan file lain boleh).');
          evt.target.value='';
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }
})(); 
// === [/PATCH Upload Handlers] ===
