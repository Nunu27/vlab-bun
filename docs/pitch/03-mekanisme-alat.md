# Mekanisme Alat

vLab adalah **platform laboratorium jaringan virtual** yang menyediakan lingkungan praktikum realistis, aman, dan terukur. Berbeda dari simulator seperti Packet Tracer, vLab tidak meniru perilaku perangkat — melainkan benar-benar menjalankan image perangkat jaringan nyata di dalam *container* yang diorkestrasi dengan Containerlab.

## Arsitektur Sistem

![Arsitektur sistem vLab — Manager, Worker, dan Client](../../../buku/assets/diagram_sistem.png)

*Platform mengadopsi arsitektur Manager–Worker yang dapat diskalakan secara horizontal. Manager mengelola orkestrasi, otentikasi, REST API, WebSocket, dan akses Guacamole. Worker menjalankan container perangkat jaringan menggunakan Containerlab + Docker, beserta daemon Evaluator dan guacd.*

## Alur Kerja Lengkap

```
Instruktur menyusun Lab
(topologi drag-and-drop + instruksi markdown + kriteria penilaian dari katalog)
        │
Peserta memulai Sesi Lab
        │
vLab men-deploy container perangkat sungguhan ke Worker node
(MikroTik CHR & Linux via Containerlab + Docker)
        │
Peserta akses & konfigurasi perangkat langsung dari browser
(CLI via SSH atau Desktop via RDP/VNC — melalui Apache Guacamole)
        │
Evaluator event-driven memantau perubahan secara real-time
(RouterOS API /listen & ip monitor Linux — bukan polling berkala)
        │
Status lulus/gagal per kriteria langsung ditampilkan ke peserta
        │
Skor akhir dihitung otomatis, sesi diarsipkan, container dibersihkan
```

## Tiga Pilar Mekanisme

### 1. Editor Topologi Visual untuk Instruktur

Instruktur menyusun topologi jaringan melalui kanvas *drag-and-drop* berbasis web: menambahkan perangkat, menghubungkan *link*, menulis instruksi, dan mendefinisikan kriteria penilaian dari katalog yang tersedia — tanpa perlu menulis file konfigurasi Containerlab secara manual.

### 2. Evaluasi Otomatis, Event-Driven, Real-Time

Begitu peserta mengubah konfigurasi perangkat melalui `/listen` pada RouterOS API atau `ip monitor` di Linux, vLab segera mendeteksinya — bukan melalui *polling* berkala, melainkan notifikasi instan. Setiap perubahan dicocokkan dengan kriteria penilaian yang telah ditentukan, dan hasilnya (lulus/gagal per kriteria) langsung ditampilkan kepada peserta. Inilah yang memungkinkan *active learning*: peserta mengetahui seketika apakah langkah yang mereka ambil sudah benar.

### 3. Akses CLI dan GUI Langsung dari Browser

Melalui integrasi Apache Guacamole, peserta dapat membuka terminal (SSH) atau desktop (RDP/VNC) ke perangkat lab langsung dari *browser*, tanpa perlu menginstal aplikasi *client* apa pun di sisi peserta.

![Akses CLI MikroTik dan desktop Linux langsung dari browser](../../../buku/assets/exp_remote.png)

*Peserta mengakses terminal MikroTik RouterOS (kiri) dan desktop Ubuntu (kanan) secara bersamaan — semuanya dari tab browser, tanpa instalasi aplikasi tambahan.*

## Perbandingan dengan Alternatif yang Ada

| Aspek | Lab Fisik | Cisco Packet Tracer | **vLab** |
|---|---|---|---|
| Biaya investasi & perawatan | Tinggi (perangkat fisik per kelas) | Rendah | Rendah, satu server untuk banyak sesi paralel |
| Skalabilitas peserta | Terbatas jumlah perangkat fisik | Tinggi (software) | Tinggi, horizontal — tinggal tambah *worker node* |
| Keaslian OS jaringan | ✅ Asli (fisik) | ❌ Simulasi/disederhanakan | ✅ Asli, OS sungguhan di *container* |
| Dukungan MikroTik | Tergantung stok | ❌ Tidak ada | ✅ Fokus utama kurikulum saat ini |
| Penilaian | Manual oleh instruktur | Terbatas/manual | ✅ Otomatis, event-driven, real-time |
| Akses | Harus hadir di lab fisik | Aplikasi desktop lokal | ✅ Browser, kapan saja, di mana saja |
| Fleksibilitas skenario | Terbatas kabel & rak fisik | Terbatas fitur simulator | ✅ Bebas — topologi apa pun yang didukung Containerlab |

*Referensi perbandingan: Saud et al. (2025). "Evaluating the Effectiveness of Cisco Packet Tracer…" — Pravaha, 15(1).*
