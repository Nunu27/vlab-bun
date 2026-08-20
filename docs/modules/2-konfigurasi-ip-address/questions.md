# Pertanyaan Pemahaman: Konfigurasi IP Address

> Kunci jawaban ada di `solution.md`.

Jawab berdasarkan hasil pengamatan pada lab dan materi modul ini.

1. Tuliskan perhitungan untuk blok `192.168.10.0/24`: berapa alamat network, alamat broadcast, jumlah host yang bisa dipakai, dan rentang alamat host yang valid?
2. Mengapa alamat `192.168.10.0` dan `192.168.10.255` tidak boleh dipasang pada interface PC1, padahal keduanya masih berada di dalam blok yang sama?
3. Pada Tahap II interface diaktifkan sebelum alamat dipasang. Apa yang terjadi jika urutannya dibalik, dan mengapa RouterOS menandai entri IP dengan flag `I` (*Invalid*) dalam situasi serupa?
4. Blok `172.16.5.0/28` akan dibagi untuk sebuah ruangan lab kecil. Berapa jumlah host yang tersedia, dan berapa alamat broadcast-nya? Tuliskan perhitungannya.
5. Pada Tahap III nomor 3, ping ke `192.168.10.200` gagal. Berdasarkan bagian "Membaca Hasil Ping" pada materi, pesan yang muncul menunjukkan masalah di sisi mana: perangkat pengirim, atau perangkat tujuan? Jelaskan alasannya.
6. Jika PC1 dipasangi alamat `192.168.10.2/25` sementara R1 tetap `192.168.10.1/24`, apakah keduanya masih bisa saling ping? Jelaskan apa yang terjadi.
