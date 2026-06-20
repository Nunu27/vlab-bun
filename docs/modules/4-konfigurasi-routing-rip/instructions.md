<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 180, "y": 160 },
    "R2": { "template": "Mikrotik RouterOS", "x": 390, "y": 160 },
    "R3": { "template": "Mikrotik RouterOS", "x": 600, "y": 160 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 40, "y": 320 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 720, "y": 320 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" },
    { "from": "R2", "interface": "ether4", "to": "R3", "remoteInterface": "ether3" },
    { "from": "R3", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" }
  ],
  "groups": {
    "Network A": { "color": "#818cf8", "x": 20, "y": 110, "width": 260, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#f472b6", "x": 160, "y": 110, "width": 330, "height": 180, "members": ["R1", "R2"] },
    "Network C": { "color": "#fb923c", "x": 370, "y": 110, "width": 330, "height": 180, "members": ["R2", "R3"] },
    "Network D": { "color": "#4ade80", "x": 580, "y": 110, "width": 260, "height": 340, "members": ["R3", "PC2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Dua jaringan klien (**Network A** dan **Network D**) terpisah dan dihubungkan melalui dua router ujung (**R1** dan **R3**) dengan sebuah router perantara (**R2**) di tengahnya. R2 berperan sebagai router *transit* murni tanpa jaringan klien sendiri.

Skenario ini dirancang khusus untuk menunjukkan kemampuan inti RIP sebagai protokol *Distance-Vector*: **propagasi rute secara transitif**. R1 tidak terhubung langsung ke R3, sehingga R1 hanya bisa belajar tentang jaringan R3 *melalui* R2. Rute tersebut akan muncul di tabel R1 dengan *hop count* = **2**.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 (Network A) |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN R1–R2 (Network B) |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN R1–R2 (Network B) |
| **R2** | ether4 | 10.10.20.1 | /30 | Segmen WAN R2–R3 (Network C) |
| **R3** | ether3 | 10.10.20.2 | /30 | Segmen WAN R2–R3 (Network C) |
| **R3** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 (Network D) |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP

1. Konfigurasikan seluruh IP Address pada ketiga Router (R1, R2, R3) dan kedua Klien (PC1, PC2) sesuai *Tabel Pengalamatan* di atas. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan koneksi antar-router berfungsi: ping dari R1 ke `10.10.10.2`, dan dari R2 ke `10.10.20.2`. Lanjutkan hanya jika kedua koneksi berhasil.

#### Tahap II: Konfigurasi RIP pada R1

1. **Membuat Instance:** Buat sebuah instance RIP baru dengan nama `rip-lab` dan atur `redistribute=connected,rip`. <LabCheck node="R1" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan Interface:** Tambahkan *Interface Template* pada instance `rip-lab` untuk antarmuka **ether2** (LAN) dan **ether3** (WAN ke R2). <LabCheck node="R1" id="mikrotik.rip-interface-template-exist" />

#### Tahap III: Konfigurasi RIP pada R2

1. **Membuat Instance:** Buat instance RIP baru dengan nama `rip-lab` dan `redistribute=connected,rip`. <LabCheck node="R2" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan Interface:** Tambahkan *Interface Template* pada instance `rip-lab` untuk antarmuka **ether3** (WAN ke R1) dan **ether4** (WAN ke R3). <LabCheck node="R2" id="mikrotik.rip-interface-template-exist" />

#### Tahap IV: Konfigurasi RIP pada R3

1. **Membuat Instance:** Buat instance RIP baru dengan nama `rip-lab` dan `redistribute=connected,rip`. <LabCheck node="R3" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan Interface:** Tambahkan *Interface Template* pada instance `rip-lab` untuk antarmuka **ether2** (LAN) dan **ether3** (WAN ke R2). <LabCheck node="R3" id="mikrotik.rip-interface-template-exist" />

#### Tahap V: Verifikasi Propagasi Rute

1. Tunggu sejenak (sekitar 30 detik), lalu buka tabel *routing* pada R1 (`/ip route print`).
2. Cari dua entri rute RIP berikut dan perhatikan perbedaan *hop count*-nya:
   - Rute `10.10.20.0/30` (Network C) — dipelajari langsung dari R2, *hop count* = **1**.
   - Rute `192.168.20.0/24` (Network D) — dipelajari dari R2 yang mendapatkannya dari R3, *hop count* = **2**. Inilah propagasi rute *transitif* yang menjadi inti dari *Distance-Vector*. <LabCheck node="R1" id="mikrotik.route-exist" />
3. Lakukan verifikasi silang pada R3: rute `192.168.10.0/24` harus muncul dengan flag **DAr**. <LabCheck node="R3" id="mikrotik.route-exist" />
4. Lakukan pengujian ping *end-to-end* dari PC1 ke PC2: `ping -c 4 192.168.20.2`.
