# Konfigurasi IP

> **Prasyarat:** Materi ini melanjutkan **Modul 1: Pengenalan CLI**. Pastikan Anda sudah terbiasa dengan navigasi dan perintah dasar CLI sebelum melanjutkan.

## Konsep Dasar Pengalamatan IP
Alamat IP (Internet Protocol) adalah identitas numerik (mirip seperti nomor telepon atau alamat rumah) yang dipasang pada setiap perangkat jaringan agar bisa saling mengenali dan bertukar paket data. Tanpa alamat IP, PC, Router, atau Server tidak akan pernah bisa berkomunikasi.

## Anatomi Alamat IPv4
Sebuah alamat IPv4 terdiri dari 32-bit biner yang dibagi menjadi 4 blok desimal (oktet). Setiap alamat IPv4 selalu terbagi menjadi dua porsi utama:
1. **Network ID:** Identitas jaringan atau "nama jalan" tempat perangkat tersebut berada.
2. **Host ID:** Identitas spesifik dari perangkat atau "nomor rumah" perangkat tersebut di dalam jaringan.

Cara perangkat mengetahui batas pemisah antara porsi *Network* dan *Host* adalah melalui **Subnet Mask** atau **Prefix Length** (misalnya `/24` atau `255.255.255.0`).

## Aturan Pengalamatan (IP Spesial)
Di dalam satu segmen jaringan (misal `192.168.10.0/24`), tidak semua alamat IP bisa digunakan oleh PC atau Router. Ada aturan baku yang harus diikuti:
*   **IP Network (`192.168.10.0`):** Alamat pertama (Host ID = 0 biner) dialokasikan sebagai "nama jalan". Tidak bisa dipasang ke PC.
*   **IP Broadcast (`192.168.10.255`):** Alamat terakhir (Host ID = 1 biner semua) digunakan untuk mengirim paket ke *seluruh penghuni* di jalan tersebut sekaligus. Tidak bisa dipasang ke PC.
*   **IP Host / Valid (`192.168.10.1` hingga `.254`):** Alamat di antara Network dan Broadcast inilah yang dapat dipasangkan pada interface PC atau Router.

## Menghitung Rentang Alamat

Untuk menentukan rentang alamat dari suatu jaringan, gunakan rumus:

**Jumlah Host = 2^(32 - prefix) - 2**

| Network | Prefix | Jumlah Host | Rentang IP Host |
|---|---|---|---|
| 192.168.10.0 | /24 | 2^(32-24) - 2 = **254** | 192.168.10.1 – 192.168.10.254 |
| 10.10.10.0 | /30 | 2^(32-30) - 2 = **2** | 10.10.10.1 – 10.10.10.2 |

Prefix `/30` sering digunakan pada **link *point-to-point*** antar router karena hanya membutuhkan 2 alamat host, sehingga tidak ada pemborosan IP.

## Memahami Output Troubleshooting (Ping)
Administrator jaringan menggunakan utilitas `ping` (protokol ICMP) untuk menguji apakah alamat IP tujuan bisa dijangkau. Pemahaman dalam membaca *output* ping sangat diperlukan untuk mengetahui letak masalahnya:
*   **Reply dari tujuan:** Jaringan sehat, kabel terhubung, dan routing benar.
*   **Request Timed Out (RTO):** Paket berhasil dikirim, tetapi tujuan tidak membalas dalam batas waktu. Sering kali disebabkan oleh *Firewall* yang memblokir ICMP di sisi penerima.
*   **Destination Host Unreachable:** Router atau PC tidak mengetahui rute ke tujuan, atau PC tujuan sama sekali tidak terhubung di segmen lokal.

## Referensi Perintah
### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan Alamat IP | `/ip address add address=<ip/prefix> interface=<nama-interface>` | Wajib tulis prefix (misal: /24). |
| Mengecek Daftar IP | `/ip address print` | Pastikan tanpa flag 'I' (Invalid). |
| Menguji Konektivitas (Ping) | `/ping <alamat-ip> count=4` | - |

### Linux (Ubuntu)

> **Catatan:** Perintah `ip addr add` pada Linux bersifat *sementara* (volatile). Jika sistem direstart, alamat IP tersebut akan hilang. Di lingkungan produksi (seperti Ubuntu 24.04), konfigurasi IP permanen umumnya dikelola menggunakan file konfigurasi YAML melalui layanan **Netplan**. Namun untuk kebutuhan simulasi lab interaktif, konfigurasi sementara sudah mencukupi.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan IP Sementara | `sudo ip addr add <ip/prefix> dev <nama-interface>` | - |
| Mengaktifkan Interface | `sudo ip link set <nama-interface> up` | Default interface baru adalah 'down'. |
| Mengecek IP dan Status | `ip addr show` | - |
| Menguji Konektivitas (Ping) | `ping -c 4 <alamat-ip>` | - |
