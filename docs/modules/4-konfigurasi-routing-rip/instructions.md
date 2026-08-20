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

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

Dua jaringan klien (**Network A** dan **Network D**) terpisah dan dihubungkan melalui dua router ujung (**R1** dan **R3**) dengan sebuah router perantara (**R2**) di tengahnya. R2 berperan sebagai router *transit* murni tanpa jaringan klien sendiri.

Skenario ini dipilih untuk menunjukkan kemampuan inti RIP sebagai protokol *Distance-Vector*: **propagasi rute secara transitif**. R1 tidak terhubung langsung ke R3, sehingga R1 hanya bisa mengenal jaringan R3 *melalui* R2. Rute tersebut akan muncul di tabel R1 dengan *hop count* = **2**.

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

<!-- command-reference:start -->

### B. Referensi Perintah
#### MikroTik RouterOS v7

Pada RouterOS v7, RIP dikonfigurasi lewat dua objek: *instance* dan *interface template*.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membuat RIP instance | `/routing rip instance add name=<nama-instance> redistribute=connected,rip` | `connected` mengiklankan jaringan lokal, `rip` meneruskan rute dari tetangga. |
| Menambahkan interface template | `/routing rip interface-template add instance=<nama-instance> interfaces=<daftar-interface>` | Menentukan interface mana yang ikut bertukar informasi RIP. |
| Melihat tabel rute dinamis | `/ip route print` | Rute hasil RIP ditandai flag **DAr** (*Dynamic, Active, RIP*). |
| Melihat detail rute | `/ip route print detail` | Menampilkan `distance`, yang untuk RIP setara dengan jumlah *hop*. |

<!-- command-reference:end -->

### C. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP

1. Pasang seluruh IP address pada ketiga router (R1, R2, R3) dan kedua klien (PC1, PC2) sesuai *Addressing Table* di atas. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="R3" id="node-interface.check-ip" /> <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" /> <LabCheck node="PC2" id="linux.route-exist" />
2. Pastikan kedua link antar-router hidup: ping dari R1 ke `10.10.10.2`, dan dari R2 ke `10.10.20.2`. Konfigurasi RIP bergantung pada kedua link ini.

#### Tahap II: Konfigurasi RIP pada R1

1. **Membuat instance:** Buat sebuah instance RIP baru dengan nama `rip-lab` dan atur `redistribute=connected,rip`. <LabCheck node="R1" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan interface:** Tambahkan *Interface Template* pada instance `rip-lab` untuk interface **ether2** (LAN) dan **ether3** (WAN ke R2). <LabCheck node="R1" id="mikrotik.rip-interface-template-exist" />

#### Tahap III: Konfigurasi RIP pada R2

1. **Membuat instance:** Buat instance RIP baru dengan nama `rip-lab` dan `redistribute=connected,rip`. <LabCheck node="R2" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan interface:** Tambahkan *Interface Template* pada instance `rip-lab` untuk interface **ether3** (WAN ke R1) dan **ether4** (WAN ke R3). <LabCheck node="R2" id="mikrotik.rip-interface-template-exist" />

#### Tahap IV: Konfigurasi RIP pada R3

1. **Membuat instance:** Buat instance RIP baru dengan nama `rip-lab` dan `redistribute=connected,rip`. <LabCheck node="R3" id="mikrotik.rip-instance-exist" />
2. **Mendefinisikan interface:** Tambahkan *Interface Template* pada instance `rip-lab` untuk interface **ether2** (LAN) dan **ether3** (WAN ke R2). <LabCheck node="R3" id="mikrotik.rip-interface-template-exist" />

#### Tahap V: Verifikasi Propagasi Rute

1. **Tunggu konvergensi.** RIP mengirim update setiap 30 detik, dan rute dari R3 harus melewati R2 dulu sebelum sampai ke R1. Karena itu tabel rute yang lengkap baru terbentuk setelah **60 sampai 90 detik**. Jika tabel masih kosong pada detik ke-30, hal itu normal; isinya akan lengkap setelah satu siklus berikutnya.

2. **Periksa tabel rute R1.** Jalankan `/ip route print detail` pada R1, lalu bandingkan dua entri berikut. Perhatikan kolom `distance`, yang pada RIP setara dengan jumlah *hop*:
   - Rute `10.10.20.0/30` (Network C): dipelajari langsung dari R2, sehingga *hop count* = **1**.
   - Rute `192.168.20.0/24` (Network D): R1 tidak terhubung ke R3 sama sekali, jadi rute ini dipelajari dari R2 yang sebelumnya mendapatkannya dari R3. *Hop count* = **2**. Inilah propagasi rute secara *transitif*, inti dari cara kerja *distance-vector*. <LabCheck node="R1" id="mikrotik.route-exist" />

3. **Verifikasi silang pada R3.** Rute `192.168.10.0/24` harus muncul dengan flag **DAr**. **Amati:** berapa *hop count*-nya dari sisi R3? <LabCheck node="R3" id="mikrotik.route-exist" />

4. **Uji koneksi end-to-end.** Dari PC1, jalankan `ping -c 4 192.168.20.2`. <LabCheck node="PC1" id="connectivity.ping" />

#### Tahap VI: Mengukur Kecepatan Konvergensi RIP

Tahap ini mengukur kelemahan utama RIP. Hasilnya dibandingkan dengan OSPF pada modul berikutnya.

1. **Siapkan ping yang berjalan terus.** Pada terminal **PC1**, jalankan `ping 192.168.20.2` tanpa opsi `-c`, sehingga ping berjalan tanpa henti. Jendela ini dibiarkan terbuka selama tahap berikutnya.

2. **Putuskan jalur.** Pada konsol **R2**, matikan interface menuju R3: `/interface set ether4 disabled=yes`.

3. **Hitung waktunya.** **Amati:** jendela ping. Berapa detik dari saat link diputus sampai ping berhenti mendapat balasan, dan berapa lama lagi sampai rute `192.168.20.0/24` hilang dari `/ip route print` di R1?

4. **Pulihkan jalur.** Aktifkan kembali interface tersebut: `/interface set ether4 disabled=no`. **Amati:** berapa lama sampai ping kembali mendapat balasan?

5. Hentikan ping dengan `CTRL + C`. Angka-angka tadi dipakai lagi di Modul 5.
