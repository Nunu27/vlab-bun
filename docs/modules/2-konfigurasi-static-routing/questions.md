# Pertanyaan Pemahaman: Konfigurasi Static Routing

> Kunci jawaban ada di `solution.md`.

Jawab berdasarkan hasil pengamatan pada lab dan materi modul ini.

1. Pada Tahap II, ping dari **R1** ke `192.168.20.2` berhasil, tetapi ping dari **PC1** ke alamat yang sama gagal, padahal saat itu konfigurasinya sama persis. Jelaskan mengapa keduanya berbeda. (Petunjuk: perhatikan alamat pengirim yang dipakai masing-masing.)
2. Pada Tahap II nomor 3, ping dari PC1 gagal tanpa pesan error apa pun, hanya `100% packet loss`. Mengapa PC1 tidak menerima pesan seperti `Network is unreachable`? Apa yang sebenarnya sudah terjadi pada paket tersebut?
3. Jelaskan dengan kalimat sendiri mengapa dalam *static routing* antara dua jaringan, rute selalu harus dibuat di kedua sisi.
4. Flag **As** pada `/ip route print` berarti *Active* dan *Static*. Apa yang membuat sebuah rute statis menjadi tidak aktif, dan bagaimana hal itu terlihat dari keluaran perintah tersebut?
5. Andaikan jaringan ini berkembang menjadi 20 router yang saling terhubung. Berapa banyak rute statis yang kira-kira harus ditulis dan dipelihara secara manual? Kaitkan jawabannya dengan istilah *administrative overhead* pada materi.
6. Kabel antara R1 dan R2 tiba-tiba putus, padahal ada jalur cadangan lewat router lain. Apa yang terjadi pada rute statis yang sudah dibuat, dan mengapa hal ini menjadi alasan utama orang beralih ke *dynamic routing* pada modul berikutnya?
