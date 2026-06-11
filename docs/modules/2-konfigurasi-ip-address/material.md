# Konfigurasi IP Address

## Konsep Dasar Pengalamatan IP
Alamat IP (Internet Protocol) adalah identitas numerik (mirip seperti nomor telepon atau alamat rumah) yang dipasang pada setiap perangkat jaringan agar bisa saling mengenali dan bertukar paket data. Tanpa alamat IP, PC, Router, atau Server Anda tidak akan pernah bisa berkomunikasi.

## Anatomi Alamat IPv4
Sebuah alamat IPv4 terdiri dari 32-bit biner yang dibagi menjadi 4 blok desimal (oktet). Setiap alamat IPv4 selalu terbagi menjadi dua porsi utama:
1. **Network ID:** Identitas jaringan atau "nama jalan" tempat perangkat tersebut berada.
2. **Host ID:** Identitas spesifik dari perangkat atau "nomor rumah" perangkat tersebut di dalam jaringan.

Cara perangkat mengetahui batas pemisah antara porsi *Network* dan *Host* adalah melalui **Subnet Mask** atau **Prefix Length** (misalnya `/24` atau `255.255.255.0`).

## Aturan Pengalamatan (IP Spesial)
Di dalam satu segmen jaringan (misal `192.168.10.0/24`), tidak semua alamat IP bisa digunakan oleh PC atau Router. Ada aturan baku yang harus diikuti:
*   **IP Network (`192.168.10.0`):** Alamat pertama (Host ID = 0 biner) dialokasikan sebagai "nama jalan". Tidak bisa dipasang ke PC.
*   **IP Broadcast (`192.168.10.255`):** Alamat terakhir (Host ID = 1 biner semua) digunakan untuk mengirim paket ke *seluruh penghuni* di jalan tersebut sekaligus. Tidak bisa dipasang ke PC.
*   **IP Host / Valid (`192.168.10.1` hingga `.254`):** Alamat di antara Network dan Broadcast inilah yang bebas Anda pasangkan pada interface PC atau Router.

## Memahami Output Troubleshooting (Ping)
Administrator jaringan menggunakan utilitas `ping` (protokol ICMP) untuk menguji apakah alamat IP lawan bisa dijangkau. Anda harus bisa membaca *output* ping untuk mengetahui letak masalahnya:
*   **Reply dari tujuan:** Jaringan sehat, kabel terhubung, dan routing benar.
*   **Request Timed Out (RTO):** Paket berhasil dikirim, tetapi tujuan tidak membalas dalam batas waktu. Sering kali disebabkan oleh *Firewall* yang memblokir ICMP di sisi penerima.
*   **Destination Host Unreachable:** Router atau PC Anda tidak tahu jalan ke tujuan, atau PC tujuan sama sekali tidak terhubung di segmen lokal.

## Referensi Perintah

### MikroTik RouterOS
- **Menambahkan IP Address:**
  \`/ip address add address=<ip/prefix> interface=<nama-interface>\`
  *(Jangan lupa menuliskan prefix seperti /24, agar router otomatis menghitung nilai IP Network).*
- **Melihat Daftar IP:**
  \`/ip address print\`
  *(Pastikan IP tidak memiliki flag 'I' / Invalid).*
- **Uji Konektivitas (Ping):**
  \`/ping <alamat-ip> count=4\`

### Linux (Ubuntu)
- **Menambahkan IP Address Sementara (di RAM):**
  \`sudo ip addr add <ip/prefix> dev <nama-interface>\`
- **Mengaktifkan Interface (Up):**
  \`sudo ip link set <nama-interface> up\`
  *(Secara default, interface baru biasanya berstatus 'down' atau mati secara administratif).*
- **Melihat Daftar IP dan Status Interface:**
  \`ip addr show\`
- **Uji Konektivitas (Ping):**
  \`ping -c 4 <alamat-ip>\`
