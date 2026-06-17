<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 240, "y": 160 },
    "R2": { "template": "Mikrotik RouterOS", "x": 460, "y": 160 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 80, "y": 320 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 620, "y": 320 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R2", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" }
  ],
  "groups": {
    "Network A": { "color": "#818cf8", "x": 60, "y": 110, "width": 280, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#fb923c", "x": 440, "y": 110, "width": 280, "height": 340, "members": ["R2", "PC2"] },
    "Network C": { "color": "#818cf8", "x": 220, "y": 110, "width": 340, "height": 180, "members": ["R1", "R2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

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
1. **Membuat Instance:** Buat sebuah instance RIP baru dengan nama `rip-lab`. Atur parameter `redistribute=connected` agar router mengiklankan jaringan yang terhubung langsung via RIP. <LabCheck node="R1" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan Interface:** Tambahkan *Interface Template* dan pasangkan pada instance `rip-lab`. Izinkan distribusi RIP pada antarmuka **ether2** (LAN) dan **ether3** (WAN). <LabCheck node="R1" id="mikrotik.rip-interface-template-exist" />

#### Tahap III: Konfigurasi RIP pada R2
1. **Membuat Instance:** Buat sebuah instance RIP baru dengan nama `rip-lab` dengan `redistribute=connected`. <LabCheck node="R2" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan Interface:** Sama seperti R1, izinkan distribusi RIP pada antarmuka **ether2** dan **ether3** menggunakan fitur *Interface Template*. <LabCheck node="R2" id="mikrotik.rip-interface-template-exist" />

#### Tahap IV: Verifikasi Pertukaran Rute
1. Tunggu sejenak (sekitar 30 detik), lalu buka tabel *routing* pada R1 (`/ip route print`).
2. Cari keberadaan rute menuju `192.168.20.0/24`. Rute ini harus memiliki flag **DAr** (*Dynamic, Active, RIP*). <LabCheck node="R1" id="mikrotik.route-exist" />
3. Lakukan verifikasi silang pada tabel *routing* di R2, pastikan rute `192.168.10.0/24` muncul dengan flag **DAr**. <LabCheck node="R2" id="mikrotik.route-exist" />
4. Terakhir, lakukan pengujian ping dari PC1 (`192.168.10.2`) ke PC2 (`192.168.20.2`).
