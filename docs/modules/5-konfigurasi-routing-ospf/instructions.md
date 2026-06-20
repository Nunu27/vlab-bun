<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 200, "y": 160 },
    "R2": { "template": "Mikrotik RouterOS", "x": 420, "y": 160 },
    "R3": { "template": "Mikrotik RouterOS", "x": 640, "y": 160 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 60, "y": 320 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 800, "y": 320 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" },
    { "from": "R2", "interface": "ether4", "to": "R3", "remoteInterface": "ether3" },
    { "from": "R3", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" }
  ],
  "groups": {
    "Network A": { "color": "#f87171", "x": 40, "y": 110, "width": 280, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#818cf8", "x": 180, "y": 110, "width": 340, "height": 180, "members": ["R1", "R2"] },
    "Network C": { "color": "#f472b6", "x": 400, "y": 110, "width": 340, "height": 180, "members": ["R2", "R3"] },
    "Network D": { "color": "#4ade80", "x": 620, "y": 110, "width": 280, "height": 340, "members": ["R3", "PC2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Tiga router (**R1**, **R2**, **R3**) digunakan untuk menginterkoneksikan dua segmen LAN lokal dengan **R2** sebagai router *transit*. Anda diminta untuk membangun sistem *Dynamic Routing* level *Enterprise* menggunakan protokol *Link-State* **OSPF** dalam konfigurasi *Single Area* (Area 0 Backbone).

Dengan tiga router, keunggulan LSDB (*Link-State Database*) menjadi nyata: R1 dan R3 tidak terhubung langsung, namun keduanya memiliki peta topologi yang identik karena R2 mendistribusikan paket LSA ke seluruh area.

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

**Tabel Parameter OSPF:**

| Parameter | R1 | R2 | R3 |
|---|---|---|---|
| **Instance Name** | ospf-lab | ospf-lab | ospf-lab |
| **Router ID** | `1.1.1.1` | `2.2.2.2` | `3.3.3.3` |
| **Area Name** | backbone-lab | backbone-lab | backbone-lab |
| **Area ID** | `0.0.0.0` | `0.0.0.0` | `0.0.0.0` |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP

1. Konfigurasikan semua IP Address pada antarmuka di ketiga Router dan kedua Klien sesuai *Tabel Pengalamatan*. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan R1 bisa ping ke `10.10.10.2` dan R2 bisa ping ke `10.10.20.2` sebelum melanjutkan.

#### Tahap II: Konfigurasi OSPF pada R1

1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan menetapkan Router ID `1.1.1.1`. <LabCheck node="R1" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan Area:** Buat area baru bernama `backbone-lab`, tetapkan Area ID ke `0.0.0.0` dan pasangkan pada instance `ospf-lab`. <LabCheck node="R1" id="mikrotik.ospf-area-exist" />
3. **Interface WAN:** Masukkan **ether3** ke dalam area `backbone-lab` dengan parameter `type=ptp`. Interface ini akan aktif mengirimkan *Hello Packet* ke R2 tanpa melakukan *Election* DR/BDR. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />
4. **Interface LAN (Passive):** Masukkan **ether2** ke dalam area `backbone-lab` dengan parameter `passive=yes`. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />

#### Tahap III: Konfigurasi OSPF pada R2

1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan Router ID `2.2.2.2`. <LabCheck node="R2" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan Area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0` dan pasangkan pada instance. <LabCheck node="R2" id="mikrotik.ospf-area-exist" />
3. **Interface WAN ke R1:** Masukkan **ether3** ke dalam area `backbone-lab` dengan parameter `type=ptp`. <LabCheck node="R2" id="mikrotik.ospf-interface-template-exist" />
4. **Interface WAN ke R3:** Masukkan **ether4** ke dalam area `backbone-lab` dengan parameter `type=ptp`. <LabCheck node="R2" id="mikrotik.ospf-interface-template-exist" />

#### Tahap IV: Konfigurasi OSPF pada R3

1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan Router ID `3.3.3.3`. <LabCheck node="R3" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan Area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0` dan pasangkan pada instance. <LabCheck node="R3" id="mikrotik.ospf-area-exist" />
3. **Interface WAN:** Masukkan **ether3** ke dalam area `backbone-lab` dengan parameter `type=ptp`. <LabCheck node="R3" id="mikrotik.ospf-interface-template-exist" />
4. **Interface LAN (Passive):** Masukkan **ether2** ke dalam area `backbone-lab` dengan parameter `passive=yes`. <LabCheck node="R3" id="mikrotik.ospf-interface-template-exist" />

#### Tahap V: Verifikasi Status OSPF

1. **Cek Adjacency R1:** Pada konsol R1, jalankan `/routing ospf neighbor print`. Pastikan Router ID `2.2.2.2` berada pada state **Full**. <LabCheck node="R1" id="mikrotik.ospf-neighbor-exist" />
2. **Cek Adjacency R3:** Pada konsol R3, jalankan `/routing ospf neighbor print`. Pastikan Router ID `2.2.2.2` berada pada state **Full**. <LabCheck node="R3" id="mikrotik.ospf-neighbor-exist" />
3. **Cek Tabel Rute:** Buka tabel *routing* R1, pastikan jaringan remote (`192.168.20.0/24`) muncul dengan flag **DAo**. Lakukan hal yang sama di R3 untuk `192.168.10.0/24`. <LabCheck node="R1" id="mikrotik.route-exist" /> <LabCheck node="R3" id="mikrotik.route-exist" />
4. **Uji Ping:** Lakukan tes ping lintas router dari PC1 ke PC2 untuk memastikan transmisi data berhasil.

#### Tahap VI: Uji Konvergensi OSPF (Opsional)

1. **Simulasi Kegagalan Link:** Dari konsol **R1**, nonaktifkan interface **ether3**: `/interface set ether3 disabled=yes`.
2. **Amati Tabel Rute:** Periksa kembali tabel *routing* di R1. Rute `192.168.20.0/24` dengan flag **DAo** seharusnya menghilang karena *Adjacency* dengan R2 terputus.
3. **Pulihkan Link:** Aktifkan kembali interface **ether3**: `/interface set ether3 disabled=no`.
4. **Amati Re-Adjacency:** Monitor `/routing ospf neighbor print` secara berulang. Amati router melalui fase *Init → 2-Way → Full*. Rute akan muncul kembali otomatis setelah adjacency kembali ke **Full**.
