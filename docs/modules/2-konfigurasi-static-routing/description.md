# Konfigurasi Static Routing

Modul ini memperkenalkan routing, yaitu proses meneruskan paket antar-segmen jaringan yang berbeda. Tabel rute dikelola secara manual pada dua router MikroTik. Bagian intinya adalah pembuktian bahwa **routing hanya berlaku satu arah**. Rute dipasang di satu sisi lebih dulu, koneksinya gagal tanpa pesan error apa pun, baru kemudian rute di sisi lain ditambahkan.

**Prasyarat:** Modul ini melanjutkan **Modul 1: Eksplorasi CLI, Pengalamatan IP, dan Layanan Jaringan (DNS & DHCP)**, karena routing baru bisa berjalan setelah setiap interface memiliki alamat.

**Tujuan Pembelajaran:**
- Menjelaskan cara router membaca tabel rute dan memilih *next-hop*.
- Mengatur *default gateway* pada klien Linux dan rute statis pada MikroTik.
- Menjelaskan mengapa rute harus dibuat di kedua sisi, berdasarkan percobaan yang dilakukan sendiri di lab.
- Membedakan penyebab kegagalan koneksi dari gejalanya, termasuk kegagalan yang tidak memunculkan pesan error.
- Menilai kapan static routing masih layak dipakai dan kapan beban pengelolaannya menjadi terlalu besar.
