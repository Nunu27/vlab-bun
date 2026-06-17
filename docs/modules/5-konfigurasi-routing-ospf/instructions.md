<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 520, "y": 120 },
    "R2": { "template": "Mikrotik RouterOS", "x": 760, "y": 120 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 380, "y": 280 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 900, "y": 280 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R2", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" }
  ],
  "groups": {
    "Network A": { "color": "#f87171", "x": 360, "y": 70, "width": 260, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#f472b6", "x": 740, "y": 70, "width": 260, "height": 340, "members": ["R2", "PC2"] },
    "Network C": { "color": "#818cf8", "x": 500, "y": 70, "width": 360, "height": 180, "members": ["R1", "R2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Dua router (**R1** dan **R2**) digunakan untuk menginterkoneksikan dua segmen LAN lokal. Anda diminta untuk membangun sistem *Dynamic Routing* level *Enterprise* menggunakan protokol *Link-State* **OSPF**. Seluruh router akan dimasukkan ke dalam konfigurasi *Single Area* (Area 0 Backbone).

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Default Gateway / Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN antar Router |
| **R2** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN antar Router |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

**Tabel Parameter OSPF:**

| Parameter | Konfigurasi pada R1 | Konfigurasi pada R2 |
|---|---|---|
| **Instance Name** | ospf-lab | ospf-lab |
| **Router ID** | `1.1.1.1` | `2.2.2.2` |
| **Area Name** | backbone-lab | backbone-lab |
| **Area ID** | `0.0.0.0` | `0.0.0.0` |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP
1. Konfigurasikan semua IP Address pada antarmuka *ether2* dan *ether3* di kedua router sesuai *Tabel Pengalamatan*. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan R1 dan R2 bisa terhubung langsung via koneksi `10.10.10.x`.

#### Tahap II: Konfigurasi OSPF pada R1
1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan menetapkan Router ID spesifik `1.1.1.1`. <LabCheck node="R1" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan Area:** Buat area baru bernama `backbone-lab`, tetapkan Area ID ke `0.0.0.0` dan pasangkan pada instance `ospf-lab`. <LabCheck node="R1" id="mikrotik.ospf-area-exist" />
3. **Memasukkan Interface WAN:** Menggunakan *interface-template*, masukkan **ether3** ke dalam *area* `backbone-lab` dengan parameter `type=ptp`. Interface ini akan aktif mengirimkan *Hello Packet* ke R2 tanpa melakukan *Election* DR/BDR. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />
4. **Memasukkan Interface LAN (Passive):** Masukkan **ether2** ke dalam *area* `backbone-lab` dengan parameter `passive=yes`. Ini mencegah router mengirimkan *Hello Packet* ke arah PC1 yang tidak menjalankan OSPF. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />

#### Tahap III: Konfigurasi OSPF pada R2
1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan menetapkan Router ID spesifik `2.2.2.2`. <LabCheck node="R2" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan Area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0` dan pasangkan pada instance. <LabCheck node="R2" id="mikrotik.ospf-area-exist" />
3. **Memasukkan Interface WAN:** Masukkan antarmuka **ether3** ke dalam *area* `backbone-lab` dengan parameter `type=ptp`. <LabCheck node="R2" id="mikrotik.ospf-interface-template-exist" />
4. **Memasukkan Interface LAN (Passive):** Masukkan **ether2** ke dalam *area* `backbone-lab` dengan parameter `passive=yes`. <LabCheck node="R2" id="mikrotik.ospf-interface-template-exist" />

#### Tahap IV: Verifikasi Status OSPF
1. **Cek Adjacency Tetangga:** Pada konsol R1, buka status *Neighbor* OSPF (`/routing ospf neighbor print`). Pastikan Anda melihat Router ID `2.2.2.2` berada pada State **Full**. <LabCheck node="R1" id="mikrotik.ospf-neighbor-exist" /> <LabCheck node="R2" id="mikrotik.ospf-neighbor-exist" />
2. **Cek Tabel Rute:** Buka tabel *routing* R1, pastikan jaringan *remote* (`192.168.20.0/24`) muncul dengan flag **DAo** (*Dynamic, Active, OSPF*). <LabCheck node="R1" id="mikrotik.route-exist" /> <LabCheck node="R2" id="mikrotik.route-exist" />
3. **Uji Ping:** Lakukan tes ping lintas router menggunakan utilitas *ping* untuk memastikan transmisi data berhasil dengan baik.
