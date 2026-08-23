# Pertanyaan Pemahaman: Konfigurasi Routing OSPF

> Kunci jawaban ada di `solution.md`.

Jawab berdasarkan hasil pengamatan pada lab dan materi modul ini.

1. Pada Tahap VI, OSPF memilih jalur dua lompatan lewat R2 dan mengabaikan jalur satu lompatan langsung ke R3. Tunjukkan perhitungan cost kedua jalur tersebut, lalu jelaskan mengapa OSPF menganggap jalur yang lebih panjang justru lebih baik.
2. Berapa banyak paket yang hilang pada Tahap VII saat link R2–R3 diputus? Bandingkan dengan waktu konvergensi RIP yang tercatat pada Modul 3. Apa yang menyebabkan perbedaannya sebesar itu?
3. Interface **ether2** pada R1 dan R3 dikonfigurasi dengan `passive=yes`. Apa yang terjadi jika parameter tersebut dihilangkan, dan mengapa jaringan LAN-nya tetap muncul di tabel rute router lain meskipun interface-nya pasif?
4. Parameter `type=ptp` dipakai pada semua link antar-router. Apa fungsinya, dan proses apa yang dilewati karena parameter ini?
5. Ketiga router memakai Area ID `0.0.0.0`. Apa nama khusus area ini, dan apa aturannya jika suatu saat ada Area 1 yang ditambahkan?
6. Router ID R1 diisi `1.1.1.1`, yang bukan alamat IP mana pun di jaringan ini. Apakah hal tersebut menjadi masalah? Jelaskan fungsi Router ID pada OSPF.
7. Pada Tahap VII langkah 4, rute berpindah ke link langsung yang cost-nya 50. Seandainya link langsung tersebut juga putus, apa yang akan terjadi pada tabel rute R1, dan apa yang akan dilihat pengguna di PC1?
