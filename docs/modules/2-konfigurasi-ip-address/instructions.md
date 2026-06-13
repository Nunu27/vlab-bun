### A. Skenario & Topologi

> [!NOTE]
> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Terdapat sebuah topologi sederhana yang menghubungkan **PC1** secara langsung ke router **R1** melalui satu kabel fisik. Tugas Anda adalah mengonfigurasi IP Address secara statis pada kedua perangkat agar berada dalam segmen jaringan yang sama, sehingga mereka dapat saling berkomunikasi.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix / Subnet | Default Gateway |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | - |
| **PC1** | eth1 | 192.168.10.2 | /24 | 192.168.10.1 |

### B. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi Router (R1)
1. Akses konsol **R1**.
2. Alokasikan IP Address `192.168.10.1/24` ke antarmuka **ether2** menggunakan perintah konfigurasi alamat IP.
3. Verifikasi hasil konfigurasi dengan menjalankan perintah `/ip address print`. Pastikan tidak ada flag *Invalid* pada entri tersebut.

#### Tahap II: Konfigurasi Klien (PC1)
1. Akses terminal **PC1**.
2. Alokasikan IP Address `192.168.10.2/24` ke antarmuka **eth1** menggunakan utilitas `ip route`.
3. Secara administratif, ubah status antarmuka **eth1** menjadi aktif (*Up*).
4. Verifikasi bahwa IP berhasil terpasang dengan menjalankan perintah `ip addr show eth1`.

#### Tahap III: Pengujian Konektivitas
1. Dari terminal **PC1**, jalankan ping ke arah router R1: `ping -c 4 192.168.10.1`. Pastikan Anda menerima respons (Reply).
2. Dari konsol **R1**, jalankan ping balik ke arah klien PC1: `/ping 192.168.10.2 count=4`. Pastikan respons juga berhasil diterima.
