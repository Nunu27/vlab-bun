# Pertanyaan Pemahaman: Konfigurasi Routing BGP

> Kunci jawaban ada di `solution.md`.

Jawab berdasarkan hasil pengamatan pada lab dan materi modul ini.

1. Pada Tahap V, atribut AS-Path pada rute `203.0.113.0/24` di R1 bernilai `65000 65002`. Jelaskan arti setiap angka tersebut dan urutannya. Nilai apa yang muncul untuk rute yang sama jika dilihat dari R2?
2. R2 tidak memakai `output.network` sama sekali, tetapi R1 dan R3 tetap saling mengenal jaringan masing-masing. Jelaskan bagaimana hal itu bisa terjadi, dan apa peran R2 dalam proses tersebut.
3. Apa perbedaan mendasar antara BGP dan OSPF dalam hal cara memilih jalur terbaik? Sebutkan istilah metrik yang dipakai masing-masing.
4. Materi menyebut bahwa BGP memilih jalur berdasarkan *routing policy*, bukan performa teknis. Berikan satu contoh situasi bisnis yang membuat sebuah ISP sengaja memilih jalur yang secara teknis lebih lambat.
5. Sesi BGP berjalan di atas TCP port 179. Apa akibatnya jika ada aturan firewall yang memblokir port tersebut, dan pada perintah apa gejalanya terlihat lebih dulu: `/routing bgp session print` atau `/ip route print`?
6. Materi memperingatkan bahaya `output.redistribute=connected`. Jelaskan apa yang bisa bocor ke internet jika sebuah *border router* memakai konfigurasi tersebut, dan mengapa memakai *address-list* eksplisit lebih aman.
7. Ketiga AS pada lab ini memakai nomor 65000, 65001, dan 65002. Cari tahu mengapa rentang nomor tersebut dipakai untuk latihan dan tidak boleh dipakai di internet publik.
8. Sampai di sini static routing, RIP, OSPF, dan BGP sudah dipelajari semua. Untuk tiga situasi berikut, pilih protokol yang paling tepat beserta alasannya: (a) satu router kantor cabang dengan satu jalur menuju kantor pusat, (b) jaringan kampus dengan 30 router yang saling terhubung, (c) sebuah ISP yang perlu bertukar rute dengan ISP lain.
