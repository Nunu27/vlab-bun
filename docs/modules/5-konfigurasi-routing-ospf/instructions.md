### A. Skenario & Topologi

> [!NOTE]
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
1. Konfigurasikan semua IP Address pada antarmuka *ether2* dan *ether3* di kedua router sesuai *Tabel Pengalamatan*.
2. Pastikan R1 dan R2 bisa terhubung langsung via koneksi `10.10.10.x`.

#### Tahap II: Konfigurasi OSPF pada R1
1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan menetapkan Router ID spesifik `1.1.1.1`.
2. **Mendefinisikan Area:** Buat area baru bernama `backbone-lab`, tetapkan Area ID ke `0.0.0.0` dan pasangkan pada instance `ospf-lab`.
3. **Memasukkan Interface:** Menggunakan *interface-template*, masukkan **ether2** dan **ether3** ke dalam *area* `backbone-lab`.

#### Tahap III: Konfigurasi OSPF pada R2
1. **Membuat Instance:** Konfigurasikan instance `ospf-lab` dengan menetapkan Router ID spesifik `2.2.2.2`.
2. **Mendefinisikan Area:** Buat area `backbone-lab` dengan Area ID `0.0.0.0` dan pasangkan pada instance.
3. **Memasukkan Interface:** Masukkan antarmuka **ether2** dan **ether3** ke dalam *area* `backbone-lab`.

#### Tahap IV: Verifikasi Status OSPF
1. **Cek Adjacency Tetangga:** Pada konsol R1, buka status *Neighbor* OSPF (`/routing ospf neighbor print`). Pastikan Anda melihat Router ID `2.2.2.2` berada pada State **Full**.
2. **Cek Tabel Rute:** Buka tabel *routing* R1, pastikan jaringan lawan (`192.168.20.0/24`) muncul dengan flag **DAo** (*Dynamic, Active, OSPF*).
3. **Uji Ping:** Lakukan tes ping lintas router menggunakan utilitas *ping* untuk memastikan transmisi data berhasil dengan baik.
