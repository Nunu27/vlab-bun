<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 160, "y": 180 },
    "R2": { "template": "Mikrotik RouterOS", "x": 440, "y": 180 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 40, "y": 340 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 560, "y": 340 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R2", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" }
  ],
  "groups": {
    "Network A": { "color": "#f472b6", "x": 20, "y": 130, "width": 240, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#818cf8", "x": 140, "y": 130, "width": 400, "height": 180, "members": ["R1", "R2"] },
    "Network C": { "color": "#4ade80", "x": 420, "y": 130, "width": 240, "height": 340, "members": ["R2", "PC2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Anda mengelola infrastruktur jaringan yang terdiri dari dua router (**R1** dan **R2**) serta dua klien (**PC1** dan **PC2**). PC1 dan PC2 berada pada jaringan terisolasi yang berbeda. Tugas Anda adalah membangun konfigurasi *static routing* agar PC1 dapat bertukar data dengan PC2 secara *end-to-end*.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Default Gateway / Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 (Network A) |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN antar Router |
| **R2** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 (Network C) |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN antar Router |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP
1. **Router R1:** Konfigurasikan IP `192.168.10.1/24` pada **ether2** dan `10.10.10.1/30` pada **ether3**. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" />
2. **Router R2:** Konfigurasikan IP `192.168.20.1/24` pada **ether2** dan `10.10.10.2/30` pada **ether3**. <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" />
3. **Klien PC1:** Konfigurasikan IP `192.168.10.2/24` pada **eth1**, nyalakan interface, lalu atur *Default Gateway* menunjuk ke `192.168.10.1`. <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" />
4. **Klien PC2:** Konfigurasikan IP `192.168.20.2/24` pada **eth1**, nyalakan interface, lalu atur *Default Gateway* menunjuk ke `192.168.20.1`. <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC2" id="linux.route-exist" />
5. **Uji Interkoneksi WAN:** Dari R1, *ping* ke IP WAN R2 (`10.10.10.2`). Pastikan terhubung sebelum melanjutkan.

#### Tahap II: Konfigurasi Rute Statis (Static Route)
1. **Rute di R1:** Tambahkan rute statis menuju jaringan `192.168.20.0/24`. Tetapkan alamat *Gateway (Next-Hop)* ke `10.10.10.2`. <LabCheck node="R1" id="mikrotik.route-exist" />
2. **Rute di R2:** Tambahkan rute statis balikan menuju jaringan `192.168.10.0/24`. Tetapkan alamat *Gateway (Next-Hop)* ke `10.10.10.1`. <LabCheck node="R2" id="mikrotik.route-exist" />

#### Tahap III: Verifikasi Rute dan Konektivitas
1. **Analisis Tabel Rute:** Buka tabel routing pada R1 dan R2 (`/ip route print`). Pastikan entri rute statis jarak jauh muncul dengan status **As** (*Active, Static*).
2. **Uji Koneksi End-to-End:** Buka terminal pada **PC1** dan lakukan `ping -c 4 192.168.20.2`.
3. **Lacak Jalur (Trace):** Pada **PC1**, eksekusi `tracepath 192.168.20.2` untuk memastikan paket melompat melewati R1 dan R2 sebelum tiba di tujuan.
