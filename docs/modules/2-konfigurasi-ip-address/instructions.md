<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 320, "y": 180 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 640, "y": 180 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" }
  ],
  "groups": {},
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

**PC1** terhubung langsung ke router **R1** melalui satu kabel. Konfigurasikan IP address statis pada kedua perangkat agar keduanya berada dalam satu segmen jaringan dan bisa saling berkomunikasi.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix |
|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 |
| **PC1** | eth1 | 192.168.10.2 | /24 |

<!-- command-reference:start -->

### B. Referensi Perintah
#### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan IP address | `/ip address add address=<ip/prefix> interface=<nama-interface>` | Prefix wajib ditulis, misalnya `/24`. |
| Melihat daftar IP | `/ip address print` | Pastikan tidak ada flag `I` (*Invalid*). |
| Menguji konektivitas | `/ping <alamat-ip> count=4` | - |

#### Linux (Ubuntu)

> **Catatan:** Perintah `ip addr add` bersifat sementara. Jika sistem di-*restart*, alamat tersebut hilang. Di lingkungan produksi (misalnya Ubuntu 24.04), konfigurasi IP permanen diatur lewat file YAML milik **Netplan**. Untuk kebutuhan simulasi lab ini, konfigurasi sementara sudah cukup.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan IP sementara | `sudo ip addr add <ip/prefix> dev <nama-interface>` | - |
| Mengaktifkan interface | `sudo ip link set <nama-interface> up` | Interface baru berstatus *down* secara default. |
| Melihat IP dan statusnya | `ip addr show` | - |
| Menguji konektivitas | `ping -c 4 <alamat-ip>` | - |

<!-- command-reference:end -->

### C. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi Router (R1)
1. Akses konsol **R1**.
2. Pasang IP address `192.168.10.1/24` pada interface **ether2**. <LabCheck node="R1" id="node-interface.check-ip" />
3. Jalankan `/ip address print` untuk memverifikasi. **Amati:** tidak boleh ada flag `I` (*Invalid*) pada entri tersebut. Flag itu muncul jika interface-nya belum aktif.

#### Tahap II: Konfigurasi Klien (PC1)
1. Akses terminal **PC1**.
2. Jalankan `ip addr show eth1` terlebih dahulu. **Amati:** kata `state DOWN` pada keluarannya. Interface ini belum aktif.
3. Aktifkan interface **eth1** dengan `sudo ip link set eth1 up`.
4. Pasang IP address `192.168.10.2/24` pada interface **eth1** dengan `sudo ip addr add 192.168.10.2/24 dev eth1`. <LabCheck node="PC1" id="node-interface.check-ip" />
5. Jalankan `ip addr show eth1` sekali lagi. **Amati:** apa saja yang berubah dibandingkan hasil langkah 2?

#### Tahap III: Pengujian Konektivitas
1. Dari terminal **PC1**, jalankan `ping -c 4 192.168.10.1`. Pastikan balasannya diterima. <LabCheck node="PC1" id="connectivity.ping" />
2. Dari konsol **R1**, ping balik ke arah PC1 dengan `/ping 192.168.10.2 count=4`. Pastikan balasannya juga berhasil.
3. Sekarang coba ping ke sebuah alamat yang tidak ada di segmen ini, misalnya `192.168.10.200`. **Amati:** pesan apa yang muncul, dan berapa lama waktu yang dibutuhkan sebelum ping berhenti sendiri?
