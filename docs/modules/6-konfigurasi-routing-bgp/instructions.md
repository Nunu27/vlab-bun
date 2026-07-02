<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 100, "y": 140 },
    "R2": { "template": "Mikrotik RouterOS", "x": 500, "y": 140 },
    "R3": { "template": "Mikrotik RouterOS", "x": 900, "y": 140 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 100, "y": 320 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 900, "y": 320 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" },
    { "from": "R2", "interface": "ether4", "to": "R3", "remoteInterface": "ether3" },
    { "from": "R3", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" }
  ],
  "groups": {
    "AS 65001": { "color": "#4ade80", "x": 40, "y": 90, "width": 200, "height": 350, "members": ["R1", "PC1"] },
    "AS 65000 (Transit)": { "color": "#818cf8", "x": 440, "y": 90, "width": 200, "height": 180, "members": ["R2"] },
    "AS 65002": { "color": "#fb923c", "x": 840, "y": 90, "width": 200, "height": 350, "members": ["R3", "PC2"] }
  },
  "notes": [
    { "content": "eBGP\n198.51.100.0/30", "x": 280, "y": 130 },
    { "content": "eBGP\n198.51.100.4/30", "x": 680, "y": 130 }
  ]
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Pada lab ini terdapat tiga *Autonomous System* yang berbeda. **R1** adalah *border router* milik **AS 65001** yang mengelola blok `192.0.2.0/24`. **R3** adalah *border router* milik **AS 65002** yang mengelola blok `203.0.113.0/24`. Keduanya tidak terhubung langsung. Mereka dihubungkan melalui **R2**, yang berperan sebagai **AS 65000 (Transit)**. R2 tidak memiliki jaringan klien; tugasnya semata-mata meneruskan rute antara AS 65001 dan AS 65002, seperti layaknya sebuah ISP.

Dengan topologi ini, Anda akan dapat mengamati atribut **AS-Path** secara langsung: rute yang diterima R1 dari R3 akan membawa jejak `[65000, 65002]`, membuktikan bahwa rute tersebut melewati AS 65000 sebelum tiba.

> IP yang digunakan (`192.0.2.0/24`, `203.0.113.0/24`, `198.51.100.0/30`, `198.51.100.4/30`) adalah *documentation address* sesuai RFC 5737: dirancang untuk simulasi dan pembelajaran, bukan untuk internet nyata.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.0.2.1 | /24 | Blok IP AS 65001 (LAN PC1) |
| **R1** | ether3 | 198.51.100.1 | /30 | Peering WAN R1–R2 |
| **R2** | ether3 | 198.51.100.2 | /30 | Peering WAN R1–R2 |
| **R2** | ether4 | 198.51.100.5 | /30 | Peering WAN R2–R3 |
| **R3** | ether3 | 198.51.100.6 | /30 | Peering WAN R2–R3 |
| **R3** | ether2 | 203.0.113.1 | /24 | Blok IP AS 65002 (LAN PC2) |
| **PC1** | eth1 | 192.0.2.2 | /24 | Gateway: 192.0.2.1 |
| **PC2** | eth1 | 203.0.113.2 | /24 | Gateway: 203.0.113.1 |

**Tabel Parameter BGP:**

| Parameter | R1 (AS 65001) | R2 (AS 65000, Transit) | R3 (AS 65002) |
|---|---|---|---|
| **Instance Name** | bgp-default | bgp-default | bgp-default |
| **Local AS** | 65001 | 65000 | 65002 |
| **Router ID** | 1.1.1.1 | 2.2.2.2 | 3.3.3.3 |
| **Address List** | bgp-networks | - | bgp-networks |
| **Connection Name** | peer-R2 | peer-R1, peer-R3 | peer-R2 |
| **Remote AS** | 65000 | 65001 / 65002 | 65000 |
| **Local Address** | 198.51.100.1 | 198.51.100.2 / 198.51.100.5 | 198.51.100.6 |
| **Remote Address** | 198.51.100.2 | 198.51.100.1 / 198.51.100.6 | 198.51.100.5 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP

1. Konfigurasikan semua alamat IP pada ketiga Router dan kedua Klien berdasarkan *Addressing Table*. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan kedua sesi peering WAN berfungsi: ping dari R1 ke `198.51.100.2`, dan dari R2 ke `198.51.100.6`.

#### Tahap II: Konfigurasi BGP pada R1 (AS 65001)

1. **Mendefinisikan Prefix:** Daftarkan blok IP milik AS 65001 ke dalam *address-list* agar bisa diiklankan secara eksplisit via BGP.
   ```
   /ip firewall address-list add list=bgp-networks address=192.0.2.0/24
   ```
2. **Membuat BGP Instance:** Buat instance BGP yang mendefinisikan identitas AS dan Router ID. <LabCheck node="R1" id="mikrotik.bgp-instance-exist" />
   ```
   /routing bgp instance add name=bgp-default as=65001 router-id=1.1.1.1
   ```
3. **Membangun Koneksi eBGP ke R2:** Tambahkan koneksi eBGP ke R2 (AS 65000). Parameter `output.network=bgp-networks` memastikan hanya prefix yang ada di address-list yang diiklankan. <LabCheck node="R1" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.2 local.role=ebgp local.address=198.51.100.1 output.network=bgp-networks
   ```

#### Tahap III: Konfigurasi BGP pada R2 (AS 65000, Transit)

R2 adalah *transit AS*. Ia tidak mengiklankan prefix miliknya sendiri: tugasnya hanya meneruskan rute yang dipelajari dari R1 ke R3, dan sebaliknya. Oleh karena itu, R2 tidak memerlukan *address-list* maupun parameter `output.network`.

1. **Membuat BGP Instance:** <LabCheck node="R2" id="mikrotik.bgp-instance-exist" />
   ```
   /routing bgp instance add name=bgp-default as=65000 router-id=2.2.2.2
   ```
2. **Koneksi eBGP ke R1:** <LabCheck node="R2" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R1 instance=bgp-default remote.as=65001 remote.address=198.51.100.1 local.role=ebgp local.address=198.51.100.2
   ```
3. **Koneksi eBGP ke R3:** <LabCheck node="R2" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R3 instance=bgp-default remote.as=65002 remote.address=198.51.100.6 local.role=ebgp local.address=198.51.100.5
   ```

#### Tahap IV: Konfigurasi BGP pada R3 (AS 65002)

1. **Mendefinisikan Prefix:** Daftarkan blok IP milik AS 65002 ke *address-list*.
   ```
   /ip firewall address-list add list=bgp-networks address=203.0.113.0/24
   ```
2. **Membuat BGP Instance:** <LabCheck node="R3" id="mikrotik.bgp-instance-exist" />
   ```
   /routing bgp instance add name=bgp-default as=65002 router-id=3.3.3.3
   ```
3. **Membangun Koneksi eBGP ke R2:** <LabCheck node="R3" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.5 local.role=ebgp local.address=198.51.100.6 output.network=bgp-networks
   ```

#### Tahap V: Verifikasi BGP dan Pengamatan AS-Path

1. **Status Sesi:** Pada setiap router, jalankan `/routing bgp session print`. Semua sesi harus berstatus **Established**. <LabCheck node="R1" id="mikrotik.bgp-session-established" /> <LabCheck node="R2" id="mikrotik.bgp-session-established" /> <LabCheck node="R2" id="mikrotik.bgp-session-established" /> <LabCheck node="R3" id="mikrotik.bgp-session-established" />
2. **Tabel Routing:** Jalankan `/ip route print` pada R1 dan R3. Pastikan rute dari AS lawan muncul dengan flag **DAb**. <LabCheck node="R1" id="mikrotik.route-exist" /> <LabCheck node="R3" id="mikrotik.route-exist" />
3. **Mengamati AS-Path:** Pada R1, jalankan `/ip route print detail` dan cari rute `203.0.113.0/24`. Perhatikan atribut **BGP-AS-PATH**. Nilai yang muncul seharusnya `65000 65002`: membuktikan rute ini melewati AS 65000 (R2) sebelum berasal dari AS 65002 (R3).
4. Lakukan *ping end-to-end* dari PC1 (`192.0.2.2`) ke PC2 (`203.0.113.2`).
