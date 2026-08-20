# Pertanyaan Pemahaman: Pengenalan Command Line Interface (CLI)

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
