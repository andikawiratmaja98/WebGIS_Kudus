
/*!
 * qgis2web.fixed.full.js
 * A self-contained, defensive Leaflet helper for sidebar + uploads (GeoJSON / Shapefile),
 * robust zoom-to-layer, and attribute popup binding.
 *
 * Drop-in replacement for qgis2web.js. Safe to run alongside other scripts.
 * 
 * Author: ChatGPT (rebuild)
 * Date: 2025-08-21
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE DOES
 * ---------------------------------------------------------------------------
 * 1) Initializes (or adopts) a Leaflet map instance and a sidebar container.
 * 2) Adds an "Uploaded Layers" group at the top of the sidebar.
 * 3) Supports uploading:
 *      - GeoJSON (.geojson / .json) → add to map, auto-zoom, popup attributes.
 *      - Shapefile (.zip)           → add to map via shpjs, auto-zoom, popup, etc.
 * 4) Every uploaded layer gets a row in the "Uploaded Layers" group with controls:
 *      - Toggle visibility
 *      - Zoom to layer
 *      - Remove layer
 * 5) Robust `fitToLayer()` that handles polygons/lines/points and feature groups.
 * 6) Keeps track of a union bounds across uploaded layers.
 * 7) Does not assume any QGIS2Web-specific globals. It’s defensive and namespaced.
 *
 * ---------------------------------------------------------------------------
 * HOW TO USE
 * ---------------------------------------------------------------------------
 * 1) Place this file as qgis2web.js (or include after Leaflet in your index.html).
 * 2) Ensure you have:
 *      <div id="map"></div>
 *      <input type="file" id="geojsonUpload" ...>
 *      <input type="file" id="shpUpload" ...>
 *    (IDs can be changed in CONFIG at the top)
 * 3) Ensure Leaflet CSS/JS is loaded before this file.
 * 4) For shapefile support, this file will dynamically load shpjs if not present.
 *
 * ---------------------------------------------------------------------------
 */

(function(window, document, L){
  "use strict";

  // -------------------------------------------------------------------------
  // CONFIG
  // -------------------------------------------------------------------------
  var CONFIG = {
    // IDs of DOM elements. Change if your index uses different IDs.
    mapId             : "map",
    geojsonInputId    : "geojsonUpload",
    shapefileInputId  : "shpUpload",

    // Sidebar root and group title for uploaded layers.
    sidebarId         : "layers-sidebar",      // optional (auto-create if missing)
    uploadedGroupTitle: "Uploaded Layers",

    // Default styles for uploaded layers
    defaultLineStyle  : { color: "#2b83ba", weight: 2, opacity: 0.9 },
    defaultPolyStyle  : { color: "#2b83ba", weight: 1, opacity: 0.9, fillColor: "#a6d96a", fillOpacity: 0.35 },
    defaultPointStyle : {
      // Leaflet circleMarker options
      radius: 6, fillColor: "#fee08b", color: "#2b83ba", weight: 1, opacity: 1, fillOpacity: 0.8
    },

    // Allow extra files in ZIP; minimally need .shp + .dbf + .prj
    // We do not strictly validate here because shpjs itself can parse common combos.
    requireShpPrjDbf  : false,

    // Whether to auto-zoom to uploaded layer
    autoZoomOnAdd     : true,

    // If no map exists, create one with this view
    defaultMapCenter  : [-6.8047, 110.8405], // Kudus-ish
    defaultMapZoom    : 11,

    // Basemap url template (used only when creating a map)
    basemapUrl        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    basemapAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  };

  // -------------------------------------------------------------------------
  // INTERNAL STATE (namespaced)
  // -------------------------------------------------------------------------
  var Q2W = {
    map: null,
    panesOrder: [],
    uploadedGroupEl: null,
    uploadedBounds: null, // union bounds of all uploaded layers
    uploadedLayers: [],   // keep references for housekeeping
    sidebarRoot: null
  };

  // -------------------------------------------------------------------------
  // INIT MAP
  // -------------------------------------------------------------------------
  function ensureMap() {
    if (window.map && window.map instanceof L.Map) {
      Q2W.map = window.map;
      return Q2W.map;
    }
    var mapContainer = document.getElementById(CONFIG.mapId);
    if (!mapContainer) {
      // create a container if missing
      mapContainer = document.createElement("div");
      mapContainer.id = CONFIG.mapId;
      mapContainer.style.position = "absolute";
      mapContainer.style.top = "0";
      mapContainer.style.left = "0";
      mapContainer.style.right = "0";
      mapContainer.style.bottom = "0";
      document.body.appendChild(mapContainer);
    }
    Q2W.map = L.map(mapContainer).setView(CONFIG.defaultMapCenter, CONFIG.defaultMapZoom);
    window.map = Q2W.map; // expose globally for compatibility

    L.tileLayer(CONFIG.basemapUrl, { attribution: CONFIG.basemapAttribution }).addTo(Q2W.map);
    return Q2W.map;
  }

  // -------------------------------------------------------------------------
  // SIDEBAR UI (very lightweight, but compatible with common QGIS2Web markup)
  // -------------------------------------------------------------------------
  function ensureSidebarRoot() {
    if (Q2W.sidebarRoot && document.body.contains(Q2W.sidebarRoot)) return Q2W.sidebarRoot;

    // Try find existing fancy sidebar content first (.q2w-control or similar)
    var existing = document.querySelector(".q2w-sidebar, .layers-panel, #" + CONFIG.sidebarId);
    if (existing) {
      Q2W.sidebarRoot = existing;
      return existing;
    }

    // Otherwise create a minimalist sidebar on the left
    var sidebar = document.createElement("div");
    sidebar.id = CONFIG.sidebarId;
    sidebar.className = "q2w-sidebar";
    sidebar.style.position = "absolute";
    sidebar.style.left = "10px";
    sidebar.style.top = "10px";
    sidebar.style.bottom = "10px";
    sidebar.style.width = "300px";
    sidebar.style.overflow = "auto";
    sidebar.style.background = "rgba(255,255,255,.95)";
    sidebar.style.borderRadius = "12px";
    sidebar.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)";
    sidebar.style.padding = "10px";
    sidebar.style.zIndex = 999;

    // Title
    var title = document.createElement("div");
    title.textContent = "LayersX";
    title.style.fontWeight = "700";
    title.style.fontSize = "18px";
    title.style.color = "#0b3d91";
    title.style.margin = "6px 8px 12px";
    sidebar.appendChild(title);

    // Groups container
    var groupsWrap = document.createElement("div");
    groupsWrap.className = "q2w-groups";
    sidebar.appendChild(groupsWrap);

    document.body.appendChild(sidebar);
    Q2W.sidebarRoot = sidebar;
    return sidebar;
  }

  function createGroup(title) {
    var wrap = document.createElement("div");
    wrap.className = "q2w-group";
    wrap.style.marginBottom = "8px";

    var header = document.createElement("div");
    header.className = "q2w-group__header";
    header.textContent = title;
    header.style.background = "#0b3d91";
    header.style.color = "#fff";
    header.style.borderRadius = "8px";
    header.style.padding = "10px 12px";
    header.style.fontWeight = "600";
    header.style.cursor = "pointer";
    wrap.appendChild(header);

    var list = document.createElement("div");
    list.className = "q2w-group__list";
    list.style.padding = "8px 6px 2px";
    list.style.display = "none";
    list.style.gap = "6px";
    wrap.appendChild(list);

    // Toggle collapse
    header.addEventListener("click", function(){
      list.style.display = list.style.display === "none" ? "block" : "none";
    });

    return { root: wrap, header: header, list: list };
  }

  function ensureUploadedGroup() {
    var sidebar = ensureSidebarRoot();
    var groupsWrap = sidebar.querySelector(".q2w-groups") || sidebar;

    // Find existing group by title
    var found = null;
    groupsWrap.querySelectorAll(".q2w-group").forEach(function(grp){
      var h = grp.querySelector(".q2w-group__header");
      if (h && (h.textContent || "").trim().toLowerCase() === CONFIG.uploadedGroupTitle.toLowerCase()) {
        found = { root: grp, header: h, list: grp.querySelector(".q2w-group__list") };
      }
    });
    if (found) {
      Q2W.uploadedGroupEl = found;
      // always expanded by default
      found.list.style.display = "block";
      return found;
    }

    // Build new group and insert at top
    var g = createGroup(CONFIG.uploadedGroupTitle);
    g.list.style.display = "block";
    groupsWrap.prepend(g.root);
    Q2W.uploadedGroupEl = g;
    return g;
  }

  function addUploadedLayerRow(layer, layerName) {
    var g = ensureUploadedGroup();
    if (!g) return;

    var row = document.createElement("div");
    row.className = "q2w-layer-row";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr auto";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.background = "#f7f9fc";
    row.style.border = "1px solid #e1e6f0";
    row.style.borderRadius = "8px";
    row.style.padding = "8px 10px";
    row.style.marginBottom = "6px";

    var id = "up_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);

    var left = document.createElement("label");
    left.setAttribute("for", id);
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = true;

    var title = document.createElement("span");
    title.textContent = layerName;
    title.style.fontSize = "13px";
    title.style.fontWeight = "600";
    title.style.color = "#223";

    left.appendChild(checkbox);
    left.appendChild(title);

    var tools = document.createElement("div");
    tools.style.display = "flex";
    tools.style.gap = "6px";

    function makeBtn(txt, title) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = txt;
      b.title = title;
      b.style.border = "1px solid #c8d1e1";
      b.style.background = "#fff";
      b.style.borderRadius = "6px";
      b.style.padding = "4px 6px";
      b.style.cursor = "pointer";
      return b;
    }

    var btnZoom = makeBtn("🔍", "Zoom to layer");
    var btnRemove = makeBtn("✖", "Remove layer");

    tools.appendChild(btnZoom);
    tools.appendChild(btnRemove);

    row.appendChild(left);
    row.appendChild(tools);
    g.list.prepend(row);

    // Interactions
    checkbox.addEventListener("change", function(e){
      if (e.target.checked) {
        try { layer.addTo(Q2W.map); } catch (_) {}
      } else {
        try { Q2W.map.removeLayer(layer); } catch (_) {}
      }
    });

    btnZoom.addEventListener("click", function(){
      fitToLayer(layer);
    });

    btnRemove.addEventListener("click", function(){
      try { Q2W.map.removeLayer(layer); } catch (_) {}
      var idx = Q2W.uploadedLayers.indexOf(layer);
      if (idx >= 0) Q2W.uploadedLayers.splice(idx, 1);
      row.remove();
    });
  }

  // -------------------------------------------------------------------------
  // LAYER HELPERS
  // -------------------------------------------------------------------------
  function styleForGeoJSON(feature) {
    var g = (feature && feature.geometry && feature.geometry.type) || "";
    if (g.match(/Point/i)) {
      // handled via pointToLayer
      return CONFIG.defaultPointStyle;
    }
    if (g.match(/Line/i)) {
      return CONFIG.defaultLineStyle;
    }
    return CONFIG.defaultPolyStyle;
  }

  function pointToLayer(feature, latlng) {
    return L.circleMarker(latlng, CONFIG.defaultPointStyle);
  }

  function bindPopupWithProps(layer, feature) {
    if (!feature || !feature.properties) return;
    var props = feature.properties;
    var html = "<div class='q2w-popup'><table>";
    Object.keys(props).forEach(function(k){
      var v = props[k];
      if (v === null || typeof v === "undefined") v = "";
      html += "<tr><th style='text-align:left;padding-right:8px;'>" +
              escapeHtml(String(k)) +
              "</th><td>" + escapeHtml(String(v)) + "</td></tr>";
    });
    html += "</table></div>";
    layer.bindPopup(html, { maxWidth: 360 });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
  }

  function fitToLayer(layer) {
    var b = null;
    try {
      if (typeof layer.getBounds === "function") {
        b = layer.getBounds();
      }
    } catch(_) {}

    // If b is missing/invalid, brute collect latlngs
    if (!b || !b.isValid || (b.isValid && !b.isValid())) {
      try {
        var pts = [];
        var pushLL = function(ll){
          if (!ll) return;
          if (Array.isArray(ll)) {
            ll.forEach(pushLL);
          } else if (ll.lat !== undefined && ll.lng !== undefined) {
            pts.push(ll);
          }
        };
        layer.eachLayer && layer.eachLayer(function(ly){
          try {
            if (ly.getLatLng) pushLL(ly.getLatLng());
            else if (ly.getLatLngs) pushLL(ly.getLatLngs());
          } catch(_){}
        });
        if (pts.length) b = L.latLngBounds(pts);
      } catch(_) {}
    }

    if (b && b.isValid && b.isValid()) {
      Q2W.map.fitBounds(b.pad(0.15));
      Q2W.uploadedBounds = Q2W.uploadedBounds ? Q2W.uploadedBounds.extend(b) : b.clone();
    }
  }

  // -------------------------------------------------------------------------
  // UPLOAD HANDLERS
  // -------------------------------------------------------------------------
  function hookGeoJSONUpload() {
    var input = document.getElementById(CONFIG.geojsonInputId);
    if (!input) return;

    input.addEventListener("change", function(evt){
      var file = evt.target.files && evt.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(e){
        try {
          var geojson = JSON.parse(e.target.result);

          var layer = L.geoJSON(geojson, {
            style: styleForGeoJSON,
            pointToLayer: pointToLayer,
            onEachFeature: function(feat, lyr){
              bindPopupWithProps(lyr, feat);
            }
          }).addTo(Q2W.map);

          Q2W.uploadedLayers.push(layer);
          addUploadedLayerRow(layer, file.name.replace(/\.(geo)?json$/i, ""));

          if (CONFIG.autoZoomOnAdd) fitToLayer(layer);
        } catch(err) {
          alert("File bukan GeoJSON yang valid.");
          console.error(err);
        }
      };
      reader.readAsText(file);
      // reset so same file re-triggers change
      input.value = "";
    });
  }

  function ensureShpJs(next){
    if (window.shp && typeof window.shp === "function") {
      next();
      return;
    }
    // dynamically inject shpjs CDN
    var url = "https://unpkg.com/shpjs@latest/dist/shp.min.js";
    var s = document.createElement("script");
    s.src = url;
    s.onload = function(){ next(); };
    s.onerror = function(){ alert("Gagal memuat shpjs. Pastikan koneksi internet aktif."); };
    document.head.appendChild(s);
  }

  function hookShapefileUpload() {
    var input = document.getElementById(CONFIG.shapefileInputId);
    if (!input) return;

    input.addEventListener("change", function(evt){
      var file = evt.target.files && evt.target.files[0];
      if (!file) return;

      ensureShpJs(function(){
        var reader = new FileReader();
        reader.onload = function(e){
          shp(e.target.result).then(function(geojson){
            // shpjs may return Feature or FeatureCollection or array of FCs
            var gj = geojson;
            if (Array.isArray(geojson)) {
              // merge arrays into one FC
              gj = {
                type: "FeatureCollection",
                features: geojson.flatMap(function(fc){
                  return (fc && fc.features) ? fc.features : [];
                })
              };
            }

            var layer = L.geoJSON(gj, {
              style: styleForGeoJSON,
              pointToLayer: pointToLayer,
              onEachFeature: function(feat, lyr){
                bindPopupWithProps(lyr, feat);
              }
            }).addTo(Q2W.map);

            Q2W.uploadedLayers.push(layer);
            addUploadedLayerRow(layer, file.name.replace(/\.zip$/i, ""));

            if (CONFIG.autoZoomOnAdd) fitToLayer(layer);
          }).catch(function(err){
            alert("Terjadi kesalahan saat merender shapefile.");
            console.error("Render shapefile error:", err);
          });
        };
        reader.readAsArrayBuffer(file);
        input.value = "";
      });
    });
  }

  // -------------------------------------------------------------------------
  // OPTIONAL: SYNC zIndex of panes from sidebar order (if your project relies on it)
  // -------------------------------------------------------------------------
  function syncPaneZIndicesFromSidebar() {
    // This is a placeholder for advanced projects where pane order matters.
    // We keep it no-op to avoid interfering with QGIS2Web’s own pane logic.
  }

  // -------------------------------------------------------------------------
  // STARTUP
  // -------------------------------------------------------------------------
  function boot() {
    ensureMap();
    ensureSidebarRoot();
    ensureUploadedGroup();
    hookGeoJSONUpload();
    hookShapefileUpload();
    syncPaneZIndicesFromSidebar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})(window, document, L);

// ---------------------------------------------------------------------------
// COMPATIBILITY SHIMS (OPTIONAL)
// ---------------------------------------------------------------------------
// If a QGIS2Web project expects window.highlightFeature or similar helpers,
// we provide lightweight fallbacks that do nothing harmful.
(function(){
  if (!window.highlightFeature) {
    window.highlightFeature = function(e){
      // no-op fallback
    };
  }
  if (!window.resetHighlight) {
    window.resetHighlight = function(e){
      // no-op fallback
    };
  }
  if (!window.zoomToFeature) {
    window.zoomToFeature = function(e){
      try {
        var layer = e && (e.target || e.layer);
        if (!layer) return;
        var map = (window.map && window.map.fitBounds) ? window.map : null;
        if (!map) return;
        var b = null;
        try { b = layer.getBounds && layer.getBounds(); } catch(_){}
        if (b && b.isValid && b.isValid()) map.fitBounds(b.pad(0.2));
      } catch(_){}
    };
  }
})();

// ---------------------------------------------------------------------------
// STYLE INJECTOR (for minimal CSS if host page lacks it)
// ---------------------------------------------------------------------------
(function(){
  var css = String.raw`
  .q2w-sidebar .q2w-group__header:hover{ filter:brightness(0.95); }
  .q2w-sidebar button:hover{ background:#f3f6fb; }
  .q2w-popup table{ border-collapse:collapse; font-size:12px; }
  .q2w-popup th,.q2w-popup td{ border-bottom:1px solid #e6eef7; padding:6px 8px; }
  `;
  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
})();

// ---------------------------------------------------------------------------
// DEBUG UTILITIES (toggle from console if needed)
// ---------------------------------------------------------------------------
window.Q2W_DEBUG = window.Q2W_DEBUG || {
  dumpUploadedLayers: function(){
    try {
      console.log("Uploaded layers:", (window.map && window.map._layers) || {});
    } catch(err) {
      console.warn(err);
    }
  },
  zoomAllUploaded: function(){
    try {
      var b = null;
      (window.map && Object.values(window.map._layers).forEach(function(ly){
        if (ly.getBounds) {
          var bb = null;
          try { bb = ly.getBounds(); } catch(_){}
          if (bb && bb.isValid && bb.isValid()) {
            b = b ? b.extend(bb) : bb.clone();
          }
        }
      }));
      if (b && b.isValid && b.isValid()) window.map.fitBounds(b.pad(0.15));
    } catch(_){}
  }
};
// End of file.
