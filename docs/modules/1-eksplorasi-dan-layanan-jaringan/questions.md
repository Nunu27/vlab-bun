# Pertanyaan Pemahaman: Eksplorasi CLI, Pengalamatan IP, dan Layanan Jaringan (DNS & DHCP)

> Kunci jawaban ada di `solution.md`.

Jawab berdasarkan hasil pengamatan pada lab dan materi modul ini.

1. Pada Tahap I nomor 6, proses `sshd` berjalan sebagai user apa? Apa yang terjadi pada akses ke PC1 jika proses tersebut dihentikan?
2. Di RouterOS cukup mengetik `print` setelah masuk ke menu `/ip/address`, sedangkan di Linux perintah `ls` memberi hasil yang sama di mana pun posisinya. Jelaskan perbedaan cara kerja kedua CLI ini menggunakan istilah *File System Hierarchy* dan *Menu Hierarchy*.
3. Mengapa router baru sebaiknya langsung diberi *hostname* yang jelas? Bayangkan ada sepuluh sesi terminal terbuka sekaligus ke sepuluh router yang semuanya masih bernama `MikroTik`.
4. Banner MOTD tidak mencegah siapa pun masuk ke router. Kalau begitu, apa gunanya memasang banner, dan mengapa banyak organisasi mewajibkannya?
5. User `siswa` dibuat dengan `group=read`. Apa yang terjadi jika user tersebut menjalankan `/system identity set name=Coba`? Kaitkan jawabannya dengan prinsip *least privilege*.
6. Pada lab ini Telnet dan FTP dimatikan, tetapi SSH dibiarkan menyala. Jelaskan alasannya untuk masing-masing layanan, dan apa yang akan terjadi jika SSH ikut dimatikan.
7. Bayangkan sebuah router yang hanya bisa diakses dari jarak jauh melalui SSH, lalu konfigurasi IP-nya harus diubah. Mengapa sebaiknya `CTRL + X` ditekan sebelum mulai mengetik, dan apa yang terjadi jika langkah itu terlewat lalu IP-nya salah?
8. Perintah `/export` menampilkan seluruh konfigurasi router sebagai teks. Sebutkan dua situasi nyata ketika seorang administrator membutuhkan keluaran tersebut.
9. Tuliskan perhitungan untuk blok `192.168.10.0/24`: berapa alamat network, alamat broadcast, jumlah host yang bisa dipakai, dan rentang alamat host yang valid?
10. Mengapa alamat `192.168.10.0` dan `192.168.10.255` tidak boleh dipasang pada interface PC1, padahal keduanya masih berada di dalam blok yang sama?
11. Sebuah interface Linux yang masih berstatus `down` dipasangi IP address sebelum diaktifkan. Apakah alamat tersebut tetap tersimpan? Jelaskan pula mengapa RouterOS menandai entri IP dengan flag `I` (*Invalid*) dalam situasi serupa.
12. Pada Tahap VI nomor 3, ping ke `192.168.10.200` gagal. Berdasarkan bagian "Membaca Hasil Ping" pada materi, pesan yang muncul menunjukkan masalah di sisi mana: perangkat pengirim, atau perangkat tujuan? Jelaskan alasannya.
13. Blok `172.16.5.0/28` akan dibagi untuk sebuah ruangan lab kecil. Berapa jumlah host yang tersedia, dan berapa alamat broadcast-nya? Tuliskan perhitungannya.
14. Jika PC1 dipasangi alamat `192.168.10.2/25` sementara R1 tetap `192.168.10.1/24`, apakah keduanya masih bisa saling ping? Jelaskan apa yang terjadi.
15. PC1 sudah dipasangi default gateway ke `192.168.10.1`, padahal R1 berada di segmen yang sama dengan PC1. Apa gunanya default gateway dalam situasi ini, dan kapan sebenarnya default gateway itu akan dipakai?
16. PC1 sudah bisa ping ke R1 melalui alamat IP sejak bagian Eksplorasi. Mengapa jaringan tetap membutuhkan DNS, padahal konektivitas dasarnya sudah berjalan tanpa itu?
17. Pada Tahap I bagian DNS, `allow-remote-requests` diset menjadi `yes`. Apa yang terjadi pada permintaan DNS dari PC1 jika opsi ini dibiarkan `no` (bawaan)?
18. Pada Tahap III bagian DNS nomor 3, `ping nama-acak.lab` gagal dengan pesan yang berbeda dari `ping 192.168.10.200` pada bagian Eksplorasi. Jelaskan perbedaan kedua kegagalan tersebut dan apa yang ditunjukkan masing-masing.
19. Jelaskan keempat langkah DORA (Discover, Offer, Request, Acknowledge) dan kaitkan setiap langkah dengan perintah atau perilaku yang benar-benar teramati pada Tahap III dan IV bagian DHCP.
20. PC2 mendapatkan alamat `dns-server` dan `gateway` secara otomatis melalui DHCP, padahal keduanya tidak pernah disunting manual seperti pada PC1. Jelaskan bagaimana ini bisa terjadi, mengacu pada konfigurasi `/ip dhcp-server network` yang dipasang.
21. Bayangkan ada dua DHCP server aktif sekaligus di segmen yang sama dengan pool berbeda. Mengapa proses **Request** pada DORA tetap dikirim melalui broadcast, bukan langsung ke DHCP server yang tawarannya dipilih klien?
