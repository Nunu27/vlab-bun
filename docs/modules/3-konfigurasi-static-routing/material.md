# Konfigurasi Static Routing

> **Prasyarat:** Materi ini melanjutkan **Modul 1: Pengenalan CLI** dan **Modul 2: Konfigurasi IP Address**. Pengalamatan IP harus sudah dikuasai karena *routing* baru dapat dibahas setelah setiap *interface* memiliki alamat IP.

## Konsep Dasar Routing
Routing adalah proses mentransmisikan paket data dari satu segmen jaringan (Network ID) ke segmen jaringan lain yang berbeda melalui perangkat **Router**. Jika sebuah PC mencoba mengirim paket ke IP di luar jaringannya, PC tersebut tidak akan melakukan *broadcast*, melainkan akan menyerahkan paket tersebut kepada "pintu keluar" utamanya, yang dikenal sebagai **Default Gateway**.

## Cara Kerja Tabel Routing (Routing Table)
Saat router menerima paket data, sistem akan melihat *Destination IP* dari paket tersebut dan mencocokkannya dengan **Tabel Routing** miliknya. 
Tabel routing pada dasarnya adalah "Peta Navigasi". Setiap entri rute minimal berisi dua informasi:
1. **Destination Network:** "Jika paket mau menuju ke jaringan X..."
2. **Next-Hop (Gateway):** "...maka lempar paket tersebut ke Router tetangga Y."

## Static Routing vs Dynamic Routing
**Static Routing** adalah metode di mana administrator *mengetik manual* setiap entri rute ke dalam router.
*   **Kapan harus menggunakan Static Route?**
    *   Topologi jaringan sangat kecil (hanya 1-3 router).
    *   Menginginkan keamanan absolut (tidak ada paket *routing update* yang dikirimkan ke jaringan).
    *   *Stub Network* (jaringan ujung yang hanya memiliki satu jalur keluar, misalnya dari router kantor menuju router ISP Telkom).
*   **Kekurangan Utama:**
    *   Tingkat kesulitan konfigurasi (*administrative overhead*) sangat tinggi jika jaringan membesar.
    *   Tidak memiliki mekanisme *failover* secara otomatis layaknya routing dinamis. Jika kabel utama putus, rute statis tidak bisa mencari jalur alternatif. Namun di lingkungan produksi, hal ini dapat diatasi dengan menambahkan parameter `check-gateway=ping` agar rute otomatis non-aktif jika gateway tujuan terputus.

## Fenomena Asymmetric Routing & Rute Balikan
Prinsip terpenting dalam routing adalah: **Routing itu satu arah (Unidirectional)**.
Jika Router 1 berhasil dikonfigurasi dengan rute menuju LAN Router 2, paket dari R1 akan sampai ke R2. Namun, saat R2 mencoba *membalas* (Reply), paket tersebut akan dibuang (*dropped*) jika Router 2 belum dikonfigurasi dengan rute kembali (*return route*) menuju LAN Router 1. Inilah mengapa dalam konfigurasi Static Route antarkedua jaringan, pembuatan rute bolak-balik selalu diwajibkan.

## Referensi Perintah
### Linux (Ubuntu) - End Device

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan Default Gateway | `sudo ip route add default via <ip-gateway>` | Lempar *unknown destination* ke *Gateway* ini. |
| Mengecek Tabel Routing | `ip route` | - |
| Melacak Rute (Trace) | `tracepath <alamat-tujuan>` | Lacak router *hop* tempat paket *dropped*. |

### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan Rute Statis | `/ip route add dst-address=<network-tujuan/prefix> gateway=<ip-next-hop>` | Gunakan `check-gateway=ping` untuk fitur deteksi kegagalan. |
| Menambahkan Default Route | `/ip route add dst-address=0.0.0.0/0 gateway=<ip-isp>` | - |
| Mengecek Tabel Routing | `/ip route print` | Pastikan flag rute **AS** (Active Static). |
