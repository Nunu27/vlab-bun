### A. Skenario & Topologi

> [!NOTE]
> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Anda mengelola infrastruktur jaringan yang terdiri dari dua router (**R1** dan **R2**) serta dua klien (**PC1** dan **PC2**). PC1 dan PC2 berada pada jaringan terisolasi yang berbeda. Tugas Anda adalah membangun konfigurasi *static routing* agar PC1 dapat bertukar data dengan PC2 secara *end-to-end*.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Default Gateway / Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 (Network A) |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN antar Router |
| **R2** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 (Network B) |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN antar Router |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP
1. **Router R1:** Konfigurasikan IP `192.168.10.1/24` pada **ether2** dan `10.10.10.1/30` pada **ether3**.
2. **Router R2:** Konfigurasikan IP `192.168.20.1/24` pada **ether2** dan `10.10.10.2/30` pada **ether3**.
3. **Klien PC1:** Konfigurasikan IP `192.168.10.2/24` pada **eth1**, nyalakan interface, lalu atur *Default Gateway* menunjuk ke `192.168.10.1`.
4. **Klien PC2:** Konfigurasikan IP `192.168.20.2/24` pada **eth1**, nyalakan interface, lalu atur *Default Gateway* menunjuk ke `192.168.20.1`.
5. **Uji Interkoneksi WAN:** Dari R1, *ping* ke IP WAN R2 (`10.10.10.2`). Pastikan terhubung sebelum melanjutkan.

#### Tahap II: Konfigurasi Rute Statis (Static Route)
1. **Rute di R1:** Tambahkan rute statis menuju jaringan `192.168.20.0/24`. Tetapkan alamat *Gateway (Next-Hop)* ke `10.10.10.2`.
2. **Rute di R2:** Tambahkan rute statis balikan menuju jaringan `192.168.10.0/24`. Tetapkan alamat *Gateway (Next-Hop)* ke `10.10.10.1`.

#### Tahap III: Verifikasi Rute dan Konektivitas
1. **Analisis Tabel Rute:** Buka tabel routing pada R1 dan R2 (`/ip route print`). Pastikan entri rute statis jarak jauh muncul dengan status **As** (*Active, Static*).
2. **Uji Koneksi End-to-End:** Buka terminal pada **PC1** dan lakukan `ping -c 4 192.168.20.2`.
3. **Lacak Jalur (Trace):** Pada **PC1**, eksekusi `tracepath 192.168.20.2` untuk memastikan paket melompat melewati R1 dan R2 sebelum tiba di tujuan.
