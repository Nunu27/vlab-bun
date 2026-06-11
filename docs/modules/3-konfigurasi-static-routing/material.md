# Konfigurasi Static Routing

## Konsep Dasar Routing
Routing adalah proses mentransmisikan paket data dari satu segmen jaringan (Network ID) ke segmen jaringan lain yang berbeda melalui perangkat **Router**. Jika sebuah PC mencoba mengirim paket ke IP di luar jaringannya, PC tersebut tidak akan melakukan *broadcast*, melainkan akan menyerahkan paket tersebut kepada "pintu keluar" utamanya, yang dikenal sebagai **Default Gateway**.

## Cara Kerja Tabel Routing (Routing Table)
Saat router menerima paket data, ia akan melihat *Destination IP* dari paket tersebut dan mencocokkannya dengan **Tabel Routing** miliknya. 
Tabel routing pada dasarnya adalah "Peta Navigasi". Setiap entri rute minimal berisi dua informasi:
1. **Destination Network:** "Jika paket mau menuju ke jaringan X..."
2. **Next-Hop (Gateway):** "...maka lempar paket tersebut ke Router tetangga Y."

## Static Routing vs Dynamic Routing
**Static Routing** adalah metode di mana administrator *mengetik manual* setiap entri rute ke dalam router.
*   **Kapan harus menggunakan Static Route?**
    *   Topologi jaringan sangat kecil (hanya 1-3 router).
    *   Menginginkan keamanan absolut (tidak ada paket *routing update* yang dikirimkan ke jaringan).
    *   *Stub Network* (jaringan ujung yang hanya punya satu jalan keluar, misalnya dari router kantor Anda menuju router ISP Telkom).
*   **Kekurangan Utama:**
    *   Tingkat kesulitan konfigurasi (*administrative overhead*) sangat tinggi jika jaringan membesar.
    *   Tidak memiliki mekanisme *failover*. Jika kabel utama putus, rute statis tidak bisa mencari jalan memutar secara otomatis.

## Fenomena Asymmetric Routing & Rute Balikan
Prinsip terpenting dalam routing adalah: **Routing itu satu arah (Unidirectional)**.
Jika Anda berhasil mengajari Router 1 jalan menuju LAN Router 2, paket dari R1 akan sampai ke R2. Namun, saat R2 mencoba *membalas* (Reply), paket tersebut akan dibuang (*dropped*) jika Anda lupa mengajari Router 2 jalan pulang menuju LAN Router 1. Inilah mengapa dalam konfigurasi Static Route antarkedua situs, Anda selalu wajib membuat rute bolak-balik.

## Referensi Perintah

### Linux (Ubuntu) - End Device
- **Menambahkan Default Gateway:**
  \`sudo ip route add default via <ip-gateway>\`
  *(Menginstruksikan PC bahwa semua tujuan yang tidak dikenali harus dilempar ke IP Gateway ini).*
- **Melihat Tabel Routing:**
  \`ip route\`
- **Melacak Rute Hop-by-Hop (Trace):**
  \`tracepath <alamat-tujuan>\`
  *(Sangat berguna untuk melihat di router mana sebuah paket berhenti atau nyangkut).*

### MikroTik RouterOS
- **Menambahkan Static Route Spesifik:**
  \`/ip route add dst-address=<network-tujuan/prefix> gateway=<ip-next-hop>\`
- **Menambahkan Default Route (Gateway Internet):**
  \`/ip route add dst-address=0.0.0.0/0 gateway=<ip-isp>\`
- **Melihat Tabel Routing:**
  \`/ip route print\`
  *(Perhatikan *flags* di sisi kiri. Rute yang Anda tambahkan harus memiliki status **AS** / Active Static).*
