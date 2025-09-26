// layerConfig.js
// Konfigurasi lengkap layer untuk qgis2web.js modern

window.groupedLayers = {
  "Administrasi": {
    "Batas Administrasi": {
      type: "category",
      field: "KECAMATAN",
      categories: ["Kecamatan Kaliwungu","Kecamatan Jekulo","Kecamatan Mejobo","Kecamatan Bae","Kecamatan Dawe","Kecamatan Gebog","Kecamatan Undaan","Kecamatan Kudus","Kecamatan Jati"],
      colors: ["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33","#a65628","#f781bf","#999999"],
      data: window.json_BatasAdministrasi_2,
      popupFields: [
        { field: "PROVINSI", label: "Provinsi" },
        { field: "KABUPATEN", label: "Kabupaten" },
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "DESA", label: "Desa" },
        { field: "luas_km2", label: "Luas (km²)" }
      ]
    }
  },

  "Ekonomi (Jumlah Perusahaan & UMKM)": {
    "Jumlah UMKM Tahun 2023": {
      type: "numeric",
      field: "Jumlah UMKM 2023",
      breaks: [500, 1000, 1500, 2000, 2500, 3000],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#fdae61","#f46d43","#d73027"],
      data: window.json_JumlahUMKMTahun2023_9,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "Jumlah UMKM 2023", label: "Jumlah UMKM" }
      ]
    },
    "Jumlah Perusahaan Besar": {
      type: "numeric",
      field: "PBesar_JP",
      breaks: [10, 20, 30, 40, 50],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#f46d43","#d73027"],
      data: window.json_JumlahPerusahaanBesar_8,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "PBesar_JP", label: "Jumlah Perusahaan Besar" }
      ]
    },
    "Jumlah Perusahaan Sedang": {
      type: "numeric",
      field: "PSedang_JP",
      breaks: [10, 20, 30, 40, 50],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#f46d43","#d73027"],
      data: window.json_JumlahPerusahaanSedang_6,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "PSedang_JP", label: "Jumlah Perusahaan Sedang" }
      ]
    },
    "Jumlah Perusahaan Kecil/Mikro": {
      type: "numeric",
      field: "PKecil_JP",
      breaks: [500, 1000, 1500, 2000, 2500, 3000, 3500],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#fdae61","#f46d43","#e34a33","#b30000"],
      data: window.json_JumlahPerusahaanKecilMikro_4,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "PKecil_JP", label: "Jumlah Perusahaan Kecil/Mikro" }
      ]
    }
  },

  "Tenaga Kerja": {
    "Tenaga Kerja Perusahaan Besar": {
      type: "numeric",
      field: "PBesar_JTK",
      breaks: [5000, 10000, 15000, 20000],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#f46d43"],
      data: window.json_JumlahTenagaKerjaPerusahaanBesar_7,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "PBesar_JTK", label: "Tenaga Kerja Besar" }
      ]
    },
    "Tenaga Kerja Perusahaan Sedang": {
      type: "numeric",
      field: "PSedang_JTK",
      breaks: [5000, 10000, 15000, 20000],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#f46d43"],
      data: window.json_JumlahTenagaKerjaPerusahaanSedang_5,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "PSedang_JTK", label: "Tenaga Kerja Sedang" }
      ]
    },
    "Tenaga Kerja Perusahaan Kecil/Mikro": {
      type: "numeric",
      field: "PKecil_JTK",
      breaks: [5000, 10000, 15000, 20000],
      colors: ["#1a9850","#66bd63","#a6d96a","#fee08b","#f46d43"],
      data: window.json_JumlahTenagaKerjaPerusahaanKecilMikro_3,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "PKecil_JTK", label: "Tenaga Kerja Kecil/Mikro" }
      ]
    }
  },

  "Lingkungan": {
    "Tutupan Lahan": {
      type: "category",
      field: "Klasifikas",
      categories: ["Lahan Kosong","Hutan","Kebun","Pertambangan","Industri","Permukiman/Tempat Kegiatan","Kebun Campur","Sawah","Sungai","Tambak","Tegalan/Ladang"],
      colors: ["#f7fcf0","#ccebc5","#7bccc4","#2b8cbe","#f03b20","#bd0026","#26bd00ff","#bd0026","#bd0026","#bd0026","#bd0026"],
      data: window.json_TutupanLahan_10,
      popupFields: [
        { field: "Klasifikas", label: "Jenis Tutupan" },
        { field: "Luas_km2", label: "Luas (km²)" }
      ]
    },
    "Waduk dan Tambak": {
      type: "category",
      field: "Klasifikas",
      categories: ["Waduk","Tambak"],
      colors: ["#3182bd","#31a354"],
      data: window.json_WadukdanTambak_11,
      popupFields: [
        { field: "Klasifikas", label: "Jenis" },
        { field: "Luas_km2", label: "Luas (km²)" }
      ]
    }
  },

  "Infrastruktur": {
    "Jaringan Transportasi": {
      type: "line",
      field: "STATUS",
      categories: ["Sistem Jaringan Jalan Nasional","Jaringan Jalan Provinsi","Jaringan Jalan Kabupaten"],
      colors: ["#e41a1c","#377eb8","#4daf4a"],
      data: window.json_JaringanTransportasi_13,
      popupFields: [
        { field: "NAMA", label: "Nama Jalan" },
        { field: "FUNGSI", label: "Fungsi" }
      ]
    },
    "Jaringan Perairan": {
      type: "line",
      field: "JENIS",
      categories: ["Sungai Permanen","Sungai","Sungai Musiman"],
      colors: ["#1f78b4","#a6cee3","#b2df8a"],
      data: window.json_JaringanPerairan_14,
      popupFields: [
        { field: "NAMA", label: "Nama Sungai" },
        { field: "STATUS", label: "Status" }
      ]
    }
  },

  "Industri (Titik)": {
    "Industri Jekulo": {
      type: "point",
      field: "Uraian Jenis Perusahaan",
      categories: ["Perorangan","Perseroan Terbatas (PT) Perorangan","Perseroan Terbatas (PT)","Persekutuan Komanditer (CV / Commanditaire Vennootschap)","Koperasi","Yayasan"],
      colors: ["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#5500ffff"],
      data: window.json_SitusIndustriTerdaftardiKecamatanJekulo_16,
      popupFields: [
        { field: "nama_proyek", label: "Nama Industri" },
        { field: "Uraian Jenis Perusahaan", label: "Jenis" },
        { field: "Uraian Status Penanaman Modal", label: "Status" },
        { field: "Uraian Skala Usaha", label: "Skala" },
        { field: "Alamat Usaha", label: "Alamat" } 
      ]
    },
    "Industri Kaliwungu": {
      type: "point",
      field: "Uraian Jenis Perusahaan",
      categories: ["Perorangan","Perseroan Terbatas (PT) Perorangan","Perseroan Terbatas (PT)","Persekutuan Komanditer (CV / Commanditaire Vennootschap)","Koperasi","Yayasan"],
      colors: ["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#5500ffff"],
      data: window.json_SitusIndustriTerdaftardiKecamatanKaliwungu_15,
      popupFields: [
        { field: "nama_proyek", label: "Nama Industri" },
        { field: "Uraian Jenis Perusahaan", label: "Jenis" },
        { field: "Uraian Status Penanaman Modal", label: "Status" },
        { field: "Uraian Skala Usaha", label: "Skala" },
        { field: "Alamat Usaha", label: "Alamat" } 
      ]
    }
  },

  "Potensi": {
    "Potensi Kawasan Investasi": {
      type: "category",
      field: "Arahan Pemanfaatan",
      categories: ["Kawasan Tanaman Pangan","Kawasan Peruntukan Industri"],
      colors: ["#1f78b4","#a6cee3"],
      data: window.json_PotensiKawasanInvestasi_12,
      popupFields: [
        { field: "KECAMATAN", label: "Kecamatan" },
        { field: "DESA", label: "Desa" },
        { field: "Penggunaan Lahan Eksisting", label: "Penggunaan Lahan Eksisting" },
        { field: "Arahan Pemanfaatan", label: "Arahan" },
        { field: "Luas (Ha)", label: "Luas (Ha)" }
      ]
    }
  }
};
