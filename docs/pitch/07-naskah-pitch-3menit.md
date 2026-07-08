# Naskah Pitch vLab (± 3 Menit)

Ini adalah **naskah lisan** yang dipadatkan dari seluruh materi di folder ini (`01`–`05`) ditambah data hasil pengujian dari `buku/chapters/bab5`, disusun mengikuti struktur baku sidang: **latar belakang → tujuan → mekanisme alat → hasil → kesimpulan dan saran**.

Total naskah di bawah ini **± 350 kata**. Pada tempo bicara presentasi yang wajar (130–150 kata/menit), ini setara **2 menit 20 detik – 2 menit 45 detik**, menyisakan sedikit ruang jeda/nafas agar tetap di bawah 3 menit. Estimasi waktu per bagian dicantumkan sebagai panduan latihan, bukan untuk dibacakan.

---

## 1. Latar Belakang *(± 20 detik)*

Industri jaringan komputer menghadapi kesenjangan keterampilan yang nyata: laporan *Enterprise Horizons 2025* mencatat **36% perusahaan** kesulitan merekrut talenta jaringan karena minimnya pengalaman praktis. Penyebabnya, lab fisik mahal dan sulit diskalakan, sementara simulator seperti Cisco Packet Tracer terkunci pada satu vendor dan tidak mendukung MikroTik — padahal MikroTik justru mendominasi pasar ISP dan UKM di Indonesia.

## 2. Tujuan *(± 15 detik)*

Penelitian ini bertujuan merancang dan membangun **vLab**: *platform* laboratorium jaringan *virtual* yang menjalankan perangkat jaringan sungguhan, bukan simulasi, dilengkapi editor topologi visual untuk instruktur, evaluasi otomatis *real-time*, dan akses CLI/GUI langsung dari *browser* untuk peserta.

## 3. Mekanisme Alat *(± 40 detik)*

Instruktur menyusun topologi lewat kanvas *drag-and-drop*, menulis instruksi, dan memilih kriteria penilaian dari katalog siap pakai. vLab lalu menyebarkan *container* perangkat sungguhan — MikroTik CHR dan Linux — lewat Containerlab ke *worker node*, dan peserta mengaksesnya langsung dari *browser* lewat Apache Guacamole. Begitu peserta mengubah konfigurasi, evaluator *event-driven* vLab langsung mencocokkannya dengan kriteria penilaian dan menampilkan status lulus atau gagal secara *real-time* — bukan menunggu instruktur menilai manual. Skor akhir dihitung otomatis saat sesi berakhir, dan *container* dibersihkan dengan sendirinya.

## 4. Hasil *(± 35 detik)*

Dari sisi performa, arsitektur ini terbukti efisien: 40 *container* berjalan bersamaan hanya memakai sekitar **93 MiB** penyimpanan, dan satu server dengan **12 vCPU/12 GB RAM** mampu melayani **35 pengguna aktif** secara stabil, dengan kapasitas yang bisa ditambah lewat *worker node* baru. Enam modul praktikum MikroTik — dari CLI, *IP addressing*, hingga *routing* dinamis RIP/OSPF/BGP — sudah diuji *end-to-end* secara otomatis. Uji penerimaan pengguna pada 15 mahasiswa untuk lab OSPF menghasilkan skor *System Usability Scale* rata-rata **69,1**, kategori *Good*.

## 5. Kesimpulan dan Saran *(± 25 detik)*

vLab terbukti mampu menjalankan lab jaringan yang realistis, dinilai otomatis, dan skalabel, sekaligus relevan dengan kebutuhan pasar MikroTik di Indonesia. Ke depan, pengembangan diarahkan pada tiga hal: pengujian penerimaan pengguna dalam skala lebih besar dan melibatkan peran instruktur, perluasan modul praktikum ke topik lanjutan seperti *firewall* dan VLAN, serta antarmuka pengelolaan kriteria penilaian berbasis *web* agar tidak lagi bergantung pada perubahan kode sumber.

---

## Sumber materi

- **Latar Belakang**: [`01-latar-belakang.md`](01-latar-belakang.md), `buku/chapters/bab1/1_latar_belakang.tex`
- **Tujuan**: [`02-tujuan.md`](02-tujuan.md), `buku/chapters/bab1/4_tujuan.tex`
- **Mekanisme Alat**: [`03-mekanisme-alat.md`](03-mekanisme-alat.md)
- **Hasil**: [`04-hasil.md`](04-hasil.md), `buku/chapters/bab5/1_kesimpulan.tex` (angka pengujian & UAT)
- **Kesimpulan dan Saran**: [`05-kesimpulan-dan-saran.md`](05-kesimpulan-dan-saran.md), `buku/chapters/bab5/1_kesimpulan.tex`, `buku/chapters/bab5/2_saran.tex`

## Catatan latihan

- Berlatih dengan pengatur waktu (*timer*). Jika melebihi 3 menit, bagian **Mekanisme Alat** dan **Hasil** paling aman dipangkas lebih lanjut karena paling padat detail.
- Istilah teknis (*platform*, *container*, *real-time*, dsb.) sengaja tetap dalam Bahasa Inggris dan dicetak miring, mengikuti gaya penulisan `buku/`.
- Untuk versi visual (slide) dari naskah ini, lihat artifact HTML yang dihasilkan dari materi ini bila tersedia.
