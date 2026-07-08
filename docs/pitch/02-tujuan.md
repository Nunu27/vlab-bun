# Tujuan

Penelitian ini bertujuan merancang dan membangun **vLab**: *platform* laboratorium jaringan *virtual* yang menjawab ketiga masalah yang diidentifikasi di [`01-latar-belakang.md`](01-latar-belakang.md).

## Tujuan Utama

vLab dirancang untuk:

1. **Menjalankan perangkat jaringan sungguhan** — bukan simulasi. Peserta bekerja dengan image asli MikroTik RouterOS dan Linux di dalam *container*, sehingga keterampilan yang diperoleh langsung relevan dengan pekerjaan lapangan.

2. **Menyediakan editor topologi visual untuk instruktur** — kanvas *drag-and-drop* berbasis *web* untuk menyusun topologi, menulis instruksi, dan mendefinisikan kriteria penilaian, tanpa perlu menulis konfigurasi Containerlab secara manual.

3. **Menghadirkan evaluasi otomatis *real-time*** — mekanisme *event-driven* yang langsung mendeteksi perubahan konfigurasi dan mencocokkannya dengan kriteria penilaian. Peserta mendapat umpan balik instan; instruktur tidak perlu menilai satu per satu secara manual.

4. **Memberikan akses CLI dan GUI langsung dari *browser*** — melalui integrasi Apache Guacamole, peserta membuka terminal SSH atau desktop RDP/VNC ke perangkat lab tanpa menginstal aplikasi apa pun.

## Batasan Lingkup (Disengaja)

Batasan berikut dipilih secara sadar untuk menjaga penelitian tetap fokus dan dapat diselesaikan tepat waktu. Ini adalah batasan cakupan kurikulum dan sistem evaluasi, **bukan** batasan teknis arsitektur:

- Kurikulum dan kriteria penilaian otomatis baru dibuat untuk **MikroTik CHR** dan **Linux**, meskipun Containerlab yang menjadi fondasi orkestrasi sudah mendukung vendor lain (Nokia, Arista, Juniper, Cisco, dll.).
- Materi awal dibatasi pada topik fundamental: CLI, IP addressing, static routing, dan dynamic routing (RIP, OSPF, BGP).
- Kriteria evaluasi dipilih dari katalog sistem; belum mendukung skrip evaluasi kustom bebas.

Untuk arah pengembangan di luar batasan ini, lihat [`05-kesimpulan-dan-saran.md`](05-kesimpulan-dan-saran.md).
