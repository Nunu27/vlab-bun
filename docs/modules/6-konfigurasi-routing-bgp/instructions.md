<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 280, "y": 140 },
    "R2": { "template": "Mikrotik RouterOS", "x": 500, "y": 140 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 120, "y": 300 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 660, "y": 300 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R2", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" }
  ],
  "groups": {
    "Network A": { "color": "#4ade80", "x": 100, "y": 90, "width": 280, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#fb923c", "x": 480, "y": 90, "width": 280, "height": 340, "members": ["R2", "PC2"] },
    "Network C": { "color": "#f472b6", "x": 260, "y": 90, "width": 340, "height": 180, "members": ["R1", "R2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Pada lab ini, **R1** dan **R2** diandaikan berada di luar batas operasional institusi yang sama, dan keduanya merepresentasikan dua jaringan internet yang terpisah (Beda *Autonomous System*). Tugas Anda adalah menghubungkan kedua institusi tersebut menggunakan sesi **eBGP** (External Border Gateway Protocol).

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Default Gateway / Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN antar Router |
| **R2** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN antar Router |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

**Tabel Parameter BGP (Sesi eBGP):**

| Parameter | Konfigurasi R1 | Konfigurasi R2 |
|---|---|---|
| **Connection Name** | `peer-R2` | `peer-R1` |
| **Local Role** | `ebgp` | `ebgp` |
| **Local AS** | `65001` | `65002` |
| **Remote AS** | `65002` | `65001` |
| **Router ID** | `1.1.1.1` | `2.2.2.2` |
| **Local Address** | `10.10.10.1` | `10.10.10.2` |
| **Remote Address**| `10.10.10.2` | `10.10.10.1` |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP
1. Konfigurasikan semua alamat IP pada Router (R1 & R2) dan Klien (PC1 & PC2) berdasarkan *Addressing Table*. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Lakukan *ping* antara `10.10.10.1` dan `10.10.10.2`.

#### Tahap II: Konfigurasi BGP R1
1. **Membuat BGP Instance:** Buat instance BGP pada R1 yang mendefinisikan identitas router (AS number dan Router ID). <LabCheck node="R1" id="mikrotik.bgp-instance-exist" />
   ```
   /routing bgp instance add name=bgp-default as=65001 router-id=1.1.1.1
   ```
2. **Membangun Koneksi eBGP:** Tambahkan koneksi BGP baru menggunakan profil yang ada di *Tabel Parameter BGP* untuk R1. Atur `output.redistribute=connected` agar jaringan LAN yang terhubung langsung (termasuk `192.168.10.0/24`) diiklankan ke peer BGP. <LabCheck node="R1" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65002 remote.address=10.10.10.2 local.role=ebgp local.address=10.10.10.1 output.redistribute=connected
   ```

#### Tahap III: Konfigurasi BGP R2
1. **Membuat BGP Instance:** Buat instance BGP pada R2. <LabCheck node="R2" id="mikrotik.bgp-instance-exist" />
   ```
   /routing bgp instance add name=bgp-default as=65002 router-id=2.2.2.2
   ```
2. **Membangun Koneksi eBGP:** Tambahkan koneksi BGP pada R2 sesuai parameter *Tabel Parameter BGP* untuk R2, dengan `output.redistribute=connected`. <LabCheck node="R2" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R1 instance=bgp-default remote.as=65001 remote.address=10.10.10.1 local.role=ebgp local.address=10.10.10.2 output.redistribute=connected
   ```

#### Tahap IV: Verifikasi dan Troubleshooting BGP
1. **Status Koneksi TCP:** Pada konsol mana pun, periksa status sesi BGP (`/routing bgp session print`). Parameter **State** harus menunjukkan **Established**. <LabCheck node="R1" id="mikrotik.bgp-session-established" /> <LabCheck node="R2" id="mikrotik.bgp-session-established" />
2. **Tabel Routing:** Periksa isi tabel *routing* (`/ip route print`). Pastikan Anda melihat rute dari AS tetangga yang ditandai dengan flag **DAb** (*Dynamic, Active, BGP*). <LabCheck node="R1" id="mikrotik.route-exist" /> <LabCheck node="R2" id="mikrotik.route-exist" />
3. Uji *ping end-to-end* dari LAN R1 ke LAN R2.
