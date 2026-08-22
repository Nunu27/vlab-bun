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

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

Pada lab ini terdapat tiga *Autonomous System* yang berbeda. **R1** adalah *border router* milik **AS 65001** yang mengelola blok `192.0.2.0/24`. **R3** adalah *border router* milik **AS 65002** yang mengelola blok `203.0.113.0/24`. Keduanya tidak terhubung langsung. Mereka dihubungkan melalui **R2**, yang berperan sebagai **AS 65000 (Transit)**. R2 tidak memiliki jaringan klien; tugasnya semata-mata meneruskan rute antara AS 65001 dan AS 65002, seperti layaknya sebuah ISP.

Dengan topologi ini, atribut **AS-Path** bisa diamati secara langsung: rute yang diterima R1 dari R3 membawa jejak `65000,65002`, yang menandakan rute tersebut melewati AS 65000 sebelum sampai.

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

<!-- command-reference:start -->

### B. Referensi Perintah
#### MikroTik RouterOS v7

Pada RouterOS v7, BGP menggunakan dua objek terpisah: *instance* untuk mendefinisikan identitas AS, dan *connection* untuk mengatur setiap sesi *peer*. Pendekatan ini memberikan fleksibilitas ketika satu router perlu menjalankan beberapa sesi BGP dengan identitas yang sama.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Mendefinisikan Prefix yang Diiklankan | `/ip firewall address-list add list=<nama-list> address=<prefix/length>` | Daftarkan blok IP milik AS ini secara eksplisit sebelum diiklankan via BGP. |
| Membuat BGP Instance | `/routing bgp instance add name=<nama-instance> as=<asn-lokal> router-id=<id-lokal>` | Mendefinisikan identitas AS router. |
| Membangun Koneksi eBGP (Peering) | `/routing bgp connection add name=<nama-koneksi> instance=<nama-instance> local.role=ebgp local.address=<ip-lokal> remote.address=<ip-remote> remote.as=<asn-remote> output.network=<nama-list>` | Wajib isi `local.address` agar sesi BGP terikat ke interface yang benar. Parameter `output.network` mengacu pada *address-list* berisi prefix yang diizinkan diiklankan. Transit AS yang tidak mengiklankan prefix miliknya sendiri tidak perlu parameter ini. |
| Mengecek Status Sesi BGP | `/routing bgp session print` | Status wajib **Established**. Status lain berarti sesi belum terbentuk. |
| Mengecek Tabel Rute Dinamis | `/ip route print detail` | Rute BGP berstatus **DAb** (Dynamic, Active, BGP). Gunakan `detail` untuk melihat atribut **AS-PATH** pada setiap rute. |

> **Catatan Troubleshooting:** Sesi BGP beroperasi melalui koneksi **TCP port 179**. Jika status sesi tidak mencapai *Established*, pastikan tidak ada aturan *firewall* yang memblokir port tersebut. Pada RouterOS, periksa dengan `/ip firewall filter print` dan `/ip firewall connection print`.

<!-- command-reference:end -->

### C. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP

1. Pasang seluruh IP address pada ketiga router dan kedua klien sesuai *Addressing Table* di atas. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan kedua link WAN hidup: ping dari R1 ke `198.51.100.2`, dan dari R2 ke `198.51.100.6`.

#### Tahap II: Konfigurasi BGP pada R1 (AS 65001)

1. **Mendefinisikan prefix:** Daftarkan blok IP milik AS 65001 ke dalam *address-list* agar bisa diiklankan secara eksplisit via BGP.
   ```
   /ip firewall address-list add list=bgp-networks address=192.0.2.0/24
   ```
2. **Membuat BGP instance:** Buat instance BGP yang mendefinisikan identitas AS dan Router ID. <LabCheck node="R1" id="mikrotik.bgp-instance-exist" />
   ```
   /routing bgp instance add name=bgp-default as=65001 router-id=1.1.1.1
   ```
3. **Membangun koneksi eBGP ke R2:** Tambahkan koneksi eBGP ke R2 (AS 65000). Parameter `output.network=bgp-networks` memastikan hanya prefix yang ada di address-list yang diiklankan. <LabCheck node="R1" id="mikrotik.bgp-connection-exist" />
   ```
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.2 local.role=ebgp local.address=198.51.100.1 output.network=bgp-networks
   ```

#### Tahap III: Konfigurasi BGP pada R2 (AS 65000, Transit)

Mulai tahap ini perintahnya tidak lagi dituliskan. Gunakan Tahap II sebagai contoh, lalu sesuaikan nilainya dengan *Tabel Parameter BGP* di atas. Menyalin pola dari satu contoh ke kasus berikutnya adalah cara kerja sehari-hari seorang network engineer.

R2 berperan sebagai *transit AS*. Ia tidak mengiklankan prefix miliknya sendiri, melainkan hanya meneruskan rute yang dipelajari dari R1 ke R3 dan sebaliknya. Karena itu R2 **tidak** memerlukan *address-list* maupun parameter `output.network`.

1. **Membuat BGP instance:** Buat instance `bgp-default` dengan AS `65000` dan Router ID `2.2.2.2`. <LabCheck node="R2" id="mikrotik.bgp-instance-exist" />
2. **Koneksi eBGP ke R1:** Buat koneksi bernama `peer-R1` menuju AS 65001. Isi `local.address`, `remote.address`, dan `local.role=ebgp` sesuai tabel parameter. <LabCheck node="R2" id="mikrotik.bgp-connection-exist" />
3. **Koneksi eBGP ke R3:** Buat koneksi bernama `peer-R3` menuju AS 65002, dengan pola yang sama. <LabCheck node="R2" id="mikrotik.bgp-connection-exist" />

#### Tahap IV: Konfigurasi BGP pada R3 (AS 65002)

R3 adalah *border router* yang mengelola blok `203.0.113.0/24`, jadi strukturnya sama persis dengan R1, hanya berbeda nilainya.

1. **Mendefinisikan prefix:** Daftarkan blok `203.0.113.0/24` ke dalam *address-list* bernama `bgp-networks`.
2. **Membuat BGP instance:** Buat instance `bgp-default` dengan AS `65002` dan Router ID `3.3.3.3`. <LabCheck node="R3" id="mikrotik.bgp-instance-exist" />
3. **Membangun koneksi eBGP ke R2:** Buat koneksi bernama `peer-R2` menuju AS 65000, lengkap dengan `output.network=bgp-networks` supaya blok milik AS 65002 ikut diiklankan. <LabCheck node="R3" id="mikrotik.bgp-connection-exist" />

> **Jika sesi tidak mencapai Established,** periksa tiga hal ini lebih dulu: `local.address` sudah benar dan sesuai interface yang menghadap peer, `remote.as` cocok dengan AS milik lawan, dan kedua sisi sudah bisa saling ping. Kesalahan tersering pemula adalah tertukar antara `local.address` dan `remote.address`.

#### Tahap V: Verifikasi BGP dan Pengamatan AS-Path

1. **Status sesi:** Pada setiap router, jalankan `/routing bgp session print`. Semua sesi harus berstatus **Established**. <LabCheck node="R1" id="mikrotik.bgp-session-established" /> <LabCheck node="R2" id="mikrotik.bgp-session-established" /> <LabCheck node="R2" id="mikrotik.bgp-session-established" /> <LabCheck node="R3" id="mikrotik.bgp-session-established" />
2. **Tabel routing:** Jalankan `/ip route print` pada R1 dan R3. Pastikan rute dari AS lawan muncul dengan flag **DAb**. <LabCheck node="R1" id="mikrotik.route-exist" /> <LabCheck node="R3" id="mikrotik.route-exist" />
3. **Mengamati AS-Path:** Pada R1, jalankan `/ip route print detail` dan cari rute `203.0.113.0/24`. Perhatikan atribut **bgp-as-path**. Nilai yang muncul seharusnya `65000,65002`, artinya rute ini berasal dari AS 65002 (R3) dan melewati AS 65000 (R2) dalam perjalanannya.
4. **Uji koneksi end-to-end.** Dari PC1, jalankan `ping -c 4 203.0.113.2`. <LabCheck node="PC1" id="connectivity.ping" />
