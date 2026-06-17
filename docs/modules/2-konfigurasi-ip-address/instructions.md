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

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Terdapat sebuah topologi sederhana yang menghubungkan **PC1** secara langsung ke router **R1** melalui satu kabel fisik. Tugas Anda adalah mengonfigurasi IP Address secara statis pada kedua perangkat agar berada dalam segmen jaringan yang sama, sehingga mereka dapat saling berkomunikasi.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix / Subnet |
|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 |
| **PC1** | eth1 | 192.168.10.2 | /24 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi Router (R1)
1. Akses konsol **R1**.
2. Alokasikan IP Address `192.168.10.1/24` ke antarmuka **ether2** menggunakan perintah konfigurasi alamat IP. <LabCheck node="R1" id="node-interface.check-ip" />
3. Verifikasi hasil konfigurasi dengan menjalankan perintah `/ip address print`. Pastikan tidak ada flag *Invalid* pada entri tersebut.

#### Tahap II: Konfigurasi Klien (PC1)
1. Akses terminal **PC1**.
2. Aktifkan antarmuka **eth1** dengan perintah `sudo ip link set eth1 up`.
3. Alokasikan IP Address `192.168.10.2/24` ke antarmuka **eth1** menggunakan perintah `sudo ip addr add 192.168.10.2/24 dev eth1`. <LabCheck node="PC1" id="node-interface.check-ip" />
4. Verifikasi bahwa IP berhasil terpasang dengan menjalankan perintah `ip addr show eth1`.

#### Tahap III: Pengujian Konektivitas
1. Dari terminal **PC1**, jalankan ping ke arah router R1: `ping -c 4 192.168.10.1`. Pastikan Anda menerima respons (Reply).
2. Dari konsol **R1**, jalankan ping balik ke arah klien PC1: `/ping 192.168.10.2 count=4`. Pastikan respons juga berhasil diterima.
