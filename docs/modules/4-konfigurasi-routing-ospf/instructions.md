<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 200, "y": 160 },
    "R2": { "template": "Mikrotik RouterOS", "x": 440, "y": 60 },
    "R3": { "template": "Mikrotik RouterOS", "x": 680, "y": 160 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 60, "y": 320 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 820, "y": 320 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" },
    { "from": "R2", "interface": "ether4", "to": "R3", "remoteInterface": "ether3" },
    { "from": "R1", "interface": "ether4", "to": "R3", "remoteInterface": "ether4" },
    { "from": "R3", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" }
  ],
  "groups": {
    "Network A": { "color": "#f87171", "x": 40, "y": 110, "width": 260, "height": 340, "members": ["R1", "PC1"] },
    "Network D": { "color": "#4ade80", "x": 660, "y": 110, "width": 260, "height": 340, "members": ["R3", "PC2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

Tiga router (**R1**, **R2**, **R3**) menghubungkan dua segmen LAN. Berbeda dengan Modul 3, kali ini ketiganya membentuk **segitiga**: R1 dan R3 tidak hanya terhubung lewat R2, tetapi juga memiliki link langsung satu sama lain.

Artinya ada **dua jalur** dari PC1 menuju PC2:
*   **Jalur langsung:** R1 → R3. Hanya satu lompatan.
*   **Jalur memutar:** R1 → R2 → R3. Dua lompatan.

Jika protokolnya adalah RIP, jalur langsung pasti menang, karena RIP hanya menghitung jumlah lompatan. Pada lab ini OSPF dibuat memilih **jalur yang memutar**, dengan cara menyatakan bahwa link langsung R1-R3 itu mahal. Inilah perbedaan mendasar OSPF dengan RIP: yang dihitung bukan banyaknya router, melainkan *cost*.

Anggap saja link langsung R1-R3 adalah koneksi satelit yang lambat, sementara jalur lewat R2 adalah fiber optik.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 (Network A) |
| **R1** | ether3 | 10.10.10.1 | /30 | Link R1–R2 |
| **R1** | ether4 | 10.10.30.1 | /30 | Link langsung R1–R3 |
| **R2** | ether3 | 10.10.10.2 | /30 | Link R1–R2 |
| **R2** | ether4 | 10.10.20.1 | /30 | Link R2–R3 |
| **R3** | ether3 | 10.10.20.2 | /30 | Link R2–R3 |
| **R3** | ether4 | 10.10.30.2 | /30 | Link langsung R1–R3 |
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
| **Cost link langsung R1–R3** | `50` (ether4) | - | `50` (ether4) |

<!-- command-reference:start -->

### B. Referensi Perintah
#### MikroTik RouterOS v7

Pada v7, konfigurasi Area tidak lagi terikat di menu *Instance*, melainkan dipisahkan menjadi hierarki yang lebih modular.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membuat OSPF Instance | `/routing ospf instance add name=<nama-instance> router-id=<ip-id>` | Router wajib memiliki Router ID unik. |
| Mendefinisikan OSPF Area | `/routing ospf area add name=<nama-area> instance=<nama-instance> area-id=<area-id>` | - |
| Menambahkan Interface WAN ke OSPF | `/routing ospf interface-template add area=<nama-area> interfaces=<interface-wan> type=ptp` | Interface WAN: aktif mengirimkan *Hello Packet*. Parameter `type=ptp` wajib untuk mem-bypass *Election* DR/BDR pada link /30. |
| Menandai Interface LAN sebagai Passive | `/routing ospf interface-template add area=<nama-area> interfaces=<interface-lan> passive=yes` | Interface tidak mengirim *Hello Packet*, namun jaringannya **tetap diiklankan** ke seluruh jaringan OSPF melalui LSA. Gunakan pada interface yang terhubung ke perangkat klien (PC) yang tidak menjalankan OSPF. |
| Memverifikasi Status Adjacency (Wajib) | `/routing ospf neighbor print` | Pastikan state **Full**. |
| Memverifikasi Tabel Rute Dinamis | `/ip route print` | Rute OSPF berstatus **DAo** (Dynamic, Active, OSPF). |

<!-- command-reference:end -->

### C. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP

1. Pasang seluruh IP address pada ketiga router dan kedua klien sesuai *Addressing Table*. Perhatikan bahwa R1 dan R3 kini masing-masing memiliki **tiga** interface yang harus dikonfigurasi. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan ketiga link antar-router hidup: ping dari R1 ke `10.10.10.2`, dari R2 ke `10.10.20.2`, dan dari R1 ke `10.10.30.2`.

#### Tahap II: Konfigurasi OSPF pada R1

1. **Membuat instance:** Buat instance `ospf-lab` dengan Router ID `1.1.1.1`. <LabCheck node="R1" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0` pada instance tersebut. <LabCheck node="R1" id="mikrotik.ospf-area-exist" />
3. **Link ke R2:** Masukkan **ether3** ke area `backbone-lab` dengan `type=ptp`. Biarkan cost-nya default. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />
4. **Link langsung ke R3:** Masukkan **ether4** ke area `backbone-lab` dengan `type=ptp` **dan `cost=50`**. Inilah cara memberi tahu OSPF bahwa link ini mahal. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />
5. **Interface LAN:** Masukkan **ether2** ke area `backbone-lab` dengan `passive=yes`. <LabCheck node="R1" id="mikrotik.ospf-interface-template-exist" />

#### Tahap III: Konfigurasi OSPF pada R2

1. **Membuat instance:** Buat instance `ospf-lab` dengan Router ID `2.2.2.2`. <LabCheck node="R2" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0`. <LabCheck node="R2" id="mikrotik.ospf-area-exist" />
3. **Link ke R1:** Masukkan **ether3** ke area `backbone-lab` dengan `type=ptp`. <LabCheck node="R2" id="mikrotik.ospf-interface-template-exist" />
4. **Link ke R3:** Masukkan **ether4** ke area `backbone-lab` dengan `type=ptp`. <LabCheck node="R2" id="mikrotik.ospf-interface-template-exist" />

#### Tahap IV: Konfigurasi OSPF pada R3

1. **Membuat instance:** Buat instance `ospf-lab` dengan Router ID `3.3.3.3`. <LabCheck node="R3" id="mikrotik.ospf-instance-exist" />
2. **Mendefinisikan area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0`. <LabCheck node="R3" id="mikrotik.ospf-area-exist" />
3. **Link ke R2:** Masukkan **ether3** ke area `backbone-lab` dengan `type=ptp`. <LabCheck node="R3" id="mikrotik.ospf-interface-template-exist" />
4. **Link langsung ke R1:** Masukkan **ether4** ke area `backbone-lab` dengan `type=ptp` **dan `cost=50`**. <LabCheck node="R3" id="mikrotik.ospf-interface-template-exist" />
5. **Interface LAN:** Masukkan **ether2** ke area `backbone-lab` dengan `passive=yes`. <LabCheck node="R3" id="mikrotik.ospf-interface-template-exist" />

#### Tahap V: Verifikasi Adjacency

1. **Periksa tetangga R1.** Jalankan `/routing ospf neighbor print`. **Amati:** R1 sekarang memiliki **dua** tetangga, yaitu `2.2.2.2` dan `3.3.3.3`, karena terhubung ke keduanya. Pastikan keduanya berstatus **Full**. <LabCheck node="R1" id="mikrotik.ospf-neighbor-exist" />
2. **Periksa tetangga R3.** Jalankan perintah yang sama pada R3. Pastikan status ke `2.2.2.2` juga **Full**. <LabCheck node="R3" id="mikrotik.ospf-neighbor-exist" />

#### Tahap VI: Membuktikan OSPF Memilih Berdasarkan Cost

1. **Periksa jalur yang dipilih.** Pada R1, jalankan `/ip route print detail` lalu cari rute menuju `192.168.20.0/24`.
   **Amati:** kolom `gateway`. Alamatnya adalah **`10.10.10.2`**, yaitu R2. OSPF memilih jalur yang **memutar lewat R2** (dua lompatan, total cost 2), dan mengabaikan link langsung ke R3 (satu lompatan, cost 50). <LabCheck node="R1" id="mikrotik.route-exist" />

2. **Bandingkan dengan RIP.** Seandainya jaringan ini memakai RIP, jalur yang dipilih pasti link langsung, karena RIP hanya menghitung lompatan dan tidak mengetahui kualitas link sama sekali. OSPF mengetahuinya, karena setiap link memiliki *cost*.

3. **Verifikasi silang di R3.** Rute menuju `192.168.10.0/24` juga harus melewati R2, dengan gateway `10.10.20.1`. <LabCheck node="R3" id="mikrotik.route-exist" />

4. **Uji koneksi end-to-end.** Dari PC1, jalankan `ping -c 4 192.168.20.2`. <LabCheck node="PC1" id="connectivity.ping" />

5. **Lacak jalurnya.** Pada PC1, jalankan `tracepath -n 192.168.20.2`. **Amati:** hop kedua adalah `10.10.10.2`, yaitu R2. Paket benar-benar memutar lewat R2, bukan menyeberang langsung ke R3.

#### Tahap VII: Mengukur Kecepatan Konvergensi OSPF

Hasilnya dibandingkan langsung dengan angka dari Modul 3 Tahap VI.

1. **Siapkan ping yang berjalan terus.** Pada **PC1**, jalankan `ping 192.168.20.2` tanpa opsi `-c`, sehingga ping berjalan tanpa henti.

2. **Putuskan jalur utama.** Pada konsol **R2**, matikan interface menuju R3: `/interface set ether4 disabled=yes`.

3. **Hitung waktunya.** **Amati:** jendela ping. Berapa banyak paket yang hilang sebelum balasan kembali normal?

4. **Periksa jalur barunya.** Pada R1, jalankan `/ip route print` lagi. **Amati:** gateway rute `192.168.20.0/24` kini berubah menjadi `10.10.30.2`, yaitu link langsung ke R3. Jalur mahal tetap dipakai ketika jalur murah tidak tersedia, dan perpindahannya terjadi otomatis.

5. **Pulihkan jalur.** Jalankan `/interface set ether4 disabled=no` pada R2. **Amati:** setelah beberapa saat, rute kembali melewati R2.

6. Hentikan ping dengan `CTRL + C`.
