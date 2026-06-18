# Konfigurasi Routing RIP

## Konsep Dasar Dynamic Routing
*Dynamic Routing* diciptakan untuk memecahkan masalah kompleksitas konfigurasi pada *Static Routing*. Dengan routing dinamis, setiap router akan menjalankan sebuah protokol perangkat lunak yang bertugas bertukar informasi "Peta Jaringan" dengan router tetangganya. Jika ada perubahan (seperti kabel terputus atau router mati), algoritma akan mengkalkulasi ulang secara otomatis untuk menemukan jalur alternatif.

## Distance-Vector dan Algoritma Bellman-Ford
Routing Information Protocol (RIP) adalah salah satu protokol tertua yang masuk dalam kategori **Distance-Vector** yang digerakkan oleh algoritma Bellman-Ford.
*   **Distance (Jarak):** Ditentukan murni oleh "Hop Count" (jumlah lompatan router). Kecepatan bandwidth kabel tidak dihiraukan.
*   **Vector (Arah):** Ditentukan oleh IP Next-Hop dari router tetangga.

## Karakteristik dan Limitasi RIP
RIP sangat mudah dikonfigurasi, namun memiliki limitasi yang membuatnya tidak cocok untuk jaringan raksasa:
1. **Batas Maksimal 15 Hop:** RIP menganggap jaringan apa pun yang berjarak 16 lompatan router sebagai *Unreachable* (tidak terjangkau). Ini berfungsi sebagai perlindungan terhadap siklus *routing loop* tiada akhir.
2. **Periodic Updates (30 Detik):** RIP akan membroadcast (atau multicast) seluruh isi tabel rutenya setiap 30 detik. Ini memakan bandwidth secara tidak efisien karena data dikirim meskipun tidak ada perubahan topologi.
3. **Waktu Konvergensi Lambat:** Jika rute mati, butuh waktu yang cukup lama (beberapa menit menunggu timer *Invalid* dan *Flush*) sebelum seluruh jaringan menyadari jalur tersebut terputus.

## Mekanisme Split Horizon & Poison Reverse
RIP menggunakan berbagai trik untuk mencegah paket data berputar-putar dalam lingkaran tanpa henti (*Routing Loop*):
*   **Split Horizon:** Aturan emas RIP yang mengatakan, "Jangan pernah mengirimkan informasi tentang sebuah rute, kembali melalui *interface* yang sama dari mana informasi rute tersebut pertama kali diterima."
*   **Poison Reverse:** Modifikasi dari Split Horizon, di mana rute tetap dikirimkan kembali ke *interface* asal, namun metrik rutenya "diracun" menjadi 16 hop (*Unreachable*).

## Catatan (Best Practices)

> [!WARNING]
> **Status Legacy:** Di lingkungan *Enterprise* atau ISP modern, RIP praktis sudah ditinggalkan dan digantikan oleh OSPF atau BGP karena konvergensinya yang lambat. Namun, RIP tetap menjadi standar akademik wajib untuk memahami cara kerja algoritma *Distance-Vector*.

> [!CAUTION]
> **Bahaya Redistribute Connected:** Pada lab ini, kita menggunakan `redistribute=connected`. Di dunia nyata, praktik ini berbahaya karena router akan secara membabi buta mengiklankan *seluruh* alamat IP miliknya ke jaringan. Solusi amannya adalah menggunakan *Routing Filter* secara spesifik.

> [!TIP]
> **Default RIPv2 & Keamanan (Autentikasi):** Pada RouterOS v7, *Interface Template* secara otomatis mengirim paket menggunakan **RIPv2** sehingga subnet `/30` bisa langsung berfungsi tanpa dikonfigurasi. Namun, router secara default tetap mendengarkan update RIPv1. Di jaringan produksi, selalu gunakan parameter tambahan `receive=v2 auth=md5 auth-key=<rahasia>` untuk mengamankan router dari injeksi rute palsu.

## Referensi Perintah
### MikroTik RouterOS v7

Pada RouterOS v7, RIP telah didesain ulang untuk menggunakan arsitektur *Instance* dan *Interface-Template*.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membuat RIP Instance | `/routing rip instance add name=<nama-instance> redistribute=connected` | Wajib tambahkan `redistribute=connected` agar jaringan lokal diiklankan ke tetangga. |
| Menambah Interface Template | `/routing rip interface-template add instance=<nama-instance> interfaces=<daftar-interface>` | Pada v7, perintah dasar ini secara otomatis akan mentransmisikan paket RIPv2. |
| Mengecek Tabel Rute Dinamis | `/ip route print` | Rute otomatis RIP berstatus **DAr** (Dynamic, Active, RIP). |
