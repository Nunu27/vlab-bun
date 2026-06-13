### A. Skenario & Topologi

> [!NOTE]
> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Dua jaringan kantor yang berbeda dihubungkan menggunakan dua buah router (**R1** dan **R2**). Jika dikonfigurasi secara statis, setiap perubahan jaringan akan merepotkan. Oleh karena itu, tugas Anda adalah mengotomatiskan pertukaran tabel *routing* antar kedua router menggunakan protokol **RIP** (*Routing Information Protocol*).

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Default Gateway / Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN antar Router |
| **R2** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN antar Router |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP
1. Konfigurasikan seluruh IP Address pada Router (R1 & R2) dan Klien (PC1 & PC2) sesuai dengan *Tabel Pengalamatan* di atas.
2. Pastikan kedua router dapat saling *ping* melalui interkoneksi di `ether3` (`10.10.10.1` dan `10.10.10.2`).

#### Tahap II: Konfigurasi RIP pada R1
1. **Membuat Instance:** Buat sebuah instance RIP baru dengan nama `rip-lab`.
2. **Mendefinisikan Interface:** Tambahkan *Interface Template* dan pasangkan pada instance `rip-lab`. Izinkan distribusi RIP pada antarmuka **ether2** (LAN) dan **ether3** (WAN).

#### Tahap III: Konfigurasi RIP pada R2
1. **Membuat Instance:** Buat sebuah instance RIP baru dengan nama `rip-lab`.
2. **Mendefinisikan Interface:** Sama seperti R1, izinkan distribusi RIP pada antarmuka **ether2** dan **ether3** menggunakan fitur *Interface Template*.

#### Tahap IV: Verifikasi Pertukaran Rute
1. Tunggu sejenak (sekitar 30 detik), lalu buka tabel *routing* pada R1 (`/ip route print`).
2. Cari keberadaan rute menuju `192.168.20.0/24`. Rute ini harus memiliki flag **Dr** (*Dynamic, RIP*).
3. Lakukan verifikasi silang pada tabel *routing* di R2, pastikan rute `192.168.10.0/24` muncul dengan flag **Dr**.
4. Terakhir, lakukan pengujian ping dari PC1 (`192.168.10.2`) ke PC2 (`192.168.20.2`).
