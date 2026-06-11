### A. Skenario & Topologi

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
1. Konfigurasikan semua alamat IP pada Router (R1 & R2) dan Klien (PC1 & PC2) berdasarkan *Addressing Table*.
2. Lakukan *ping* antara `10.10.10.1` dan `10.10.10.2`.

#### Tahap II: Konfigurasi Koneksi BGP R1
1. **Membangun Koneksi eBGP:** Tambahkan koneksi BGP baru menggunakan profil yang ada di *Tabel Parameter BGP* untuk R1.
2. **Network Advertisement:** Injeksikan jaringan LAN R1 (Prefix `192.168.10.0/24`) ke dalam sirkulasi *BGP Network*.

#### Tahap III: Konfigurasi Koneksi BGP R2
1. **Membangun Koneksi eBGP:** Tambahkan koneksi BGP pada R2 sesuai parameter *Tabel Parameter BGP* untuk R2.
2. **Network Advertisement:** Injeksikan jaringan LAN R2 (Prefix `192.168.20.0/24`) ke dalam sirkulasi *BGP Network*.

#### Tahap IV: Verifikasi dan Troubleshooting BGP
1. **Status Koneksi TCP:** Pada konsol mana pun, periksa status sesi BGP (`/routing bgp session print`). Parameter **State** harus menunjukkan **Established**.
2. **Tabel Routing:** Periksa isi tabel *routing* (`/ip route print`). Pastikan Anda melihat rute dari AS tetangga yang ditandai dengan flag **DAb** (*Dynamic, Active, BGP*).
3. Uji *ping end-to-end* dari LAN R1 ke LAN R2.
