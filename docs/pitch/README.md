# vLab: Materi Pitch

Dokumen di folder ini adalah materi **presentasi/pitch** vLab, ditujukan untuk sidang, panel akademik, calon mitra institusi, atau investor. Ini **bukan** dokumentasi teknis; untuk itu lihat [`docs/system/`](../system/README.md).

Jika membutuhkan versi visual yang dapat langsung ditampilkan (bukan file markdown), lihat artifact HTML yang dihasilkan dari materi ini.

## Daftar isi

Dokumen disusun mengikuti struktur baku sidang yang sama dengan naskah pitch lisan (`07`):

| Dokumen | Isi |
|---|---|
| [01-latar-belakang.md](01-latar-belakang.md) | Kesenjangan keterampilan jaringan, keterbatasan lab fisik & simulator, dominasi MikroTik di Indonesia |
| [02-tujuan.md](02-tujuan.md) | Tujuan perancangan vLab dan batasan lingkup penelitian |
| [03-mekanisme-alat.md](03-mekanisme-alat.md) | Arsitektur sistem, alur kerja lengkap, dan perbandingan langsung dengan alternatif yang ada |
| [04-hasil.md](04-hasil.md) | Hasil pengujian: efisiensi storage container vs. VM, kapasitas pengguna, modul yang diuji, dan skor UAT |
| [05-kesimpulan-dan-saran.md](05-kesimpulan-dan-saran.md) | Kesimpulan, dampak bagi tiap pemangku kepentingan, dan arah pengembangan berikutnya |
| [07-naskah-pitch-3menit.md](07-naskah-pitch-3menit.md) | Naskah lisan padat (± 3 menit): ringkasan seluruh materi di atas, siap dibawakan |

## Cara menggunakan materi ini

- **Sidang/panel akademik**: ikuti urutan `01` → `02` → `03` → `04` → `05` — strukturnya sudah mengikuti alur baku sidang.
- **Pitch ke institusi/mitra (calon pengguna)**: mulai dari `03-mekanisme-alat.md` → `04-hasil.md` → `05-kesimpulan-dan-saran.md`.
- **Pitch lisan bertenggat waktu (mis. sidang, demo day)**: gunakan `07-naskah-pitch-3menit.md` langsung, sudah dipadatkan ke bawah 3 menit dan mencakup semua angka kunci.
- Semua klaim kuantitatif (skills gap, dominasi MikroTik, dll.) mengacu pada sumber yang sama dengan Bab 1 laporan penelitian; lihat `buku/chapters/bab1` untuk sitasi lengkap.
- Aset visual (grafik, diagram, screenshot) direferensikan dari `buku/assets/`.
