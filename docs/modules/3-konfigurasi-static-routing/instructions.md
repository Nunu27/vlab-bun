<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 160, "y": 180 },
    "R2": { "template": "Mikrotik RouterOS", "x": 440, "y": 180 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 40, "y": 340 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 560, "y": 340 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R2", "interface": "ether2", "to": "PC2", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "R2", "remoteInterface": "ether3" }
  ],
  "groups": {
    "Network A": { "color": "#f472b6", "x": 20, "y": 130, "width": 240, "height": 340, "members": ["R1", "PC1"] },
    "Network B": { "color": "#818cf8", "x": 140, "y": 130, "width": 400, "height": 180, "members": ["R1", "R2"] },
    "Network C": { "color": "#4ade80", "x": 420, "y": 130, "width": 240, "height": 340, "members": ["R2", "PC2"] }
  },
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

Jaringan pada lab ini terdiri atas dua router (**R1** dan **R2**) serta dua klien (**PC1** dan **PC2**). PC1 dan PC2 berada di segmen jaringan yang berbeda dan saat ini belum bisa saling berhubungan. Konfigurasikan *static routing* agar keduanya bisa bertukar data dari ujung ke ujung.

Perhatikan bahwa link antar-router memakai prefix `/30`, seperti yang dibahas pada Modul 2: link *point-to-point* hanya butuh dua alamat host, jadi `/30` tidak menyisakan alamat yang terbuang.

**Addressing Table:**

| Perangkat | Interface | IP Address | Prefix | Keterangan |
|---|---|---|---|---|
| **R1** | ether2 | 192.168.10.1 | /24 | Segmen LAN PC1 (Network A) |
| **R1** | ether3 | 10.10.10.1 | /30 | Segmen WAN antar-router (Network B) |
| **R2** | ether2 | 192.168.20.1 | /24 | Segmen LAN PC2 (Network C) |
| **R2** | ether3 | 10.10.10.2 | /30 | Segmen WAN antar-router (Network B) |
| **PC1** | eth1 | 192.168.10.2 | /24 | Gateway: 192.168.10.1 |
| **PC2** | eth1 | 192.168.20.2 | /24 | Gateway: 192.168.20.1 |

<!-- command-reference:start -->

### B. Referensi Perintah
#### Linux (Ubuntu) - End Device

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan default gateway | `sudo ip route add default via <ip-gateway>` | Semua tujuan yang tidak dikenal diserahkan ke gateway ini. |
| Melihat tabel routing | `ip route` | - |
| Melacak jalur paket | `tracepath <alamat-tujuan>` | Menunjukkan di router mana paket berhenti. Tambahkan `-m <jumlah>` untuk membatasi jumlah hop yang dicoba, berguna ketika jalurnya memang sedang putus. |

#### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Menambahkan rute statis | `/ip route add dst-address=<network-tujuan/prefix> gateway=<ip-next-hop>` | Tambahkan `check-gateway=ping` untuk deteksi kegagalan. |
| Menambahkan default route | `/ip route add dst-address=0.0.0.0/0 gateway=<ip-isp>` | - |
| Melihat tabel routing | `/ip route print` | Rute statis yang aktif ditandai flag **As**. |

<!-- command-reference:end -->

### C. Langkah-Langkah Konfigurasi

#### Tahap I: Konfigurasi IP dan Gateway
1. **Router R1:** Pasang IP `192.168.10.1/24` pada **ether2** dan `10.10.10.1/30` pada **ether3**. <LabCheck node="R1" id="node-interface.check-ip" /> <LabCheck node="R1" id="node-interface.check-ip" />
2. **Router R2:** Pasang IP `192.168.20.1/24` pada **ether2** dan `10.10.10.2/30` pada **ether3**. <LabCheck node="R2" id="node-interface.check-ip" /> <LabCheck node="R2" id="node-interface.check-ip" />
3. **Klien PC1:** Pasang IP `192.168.10.2/24` pada **eth1**, aktifkan interface-nya, lalu atur *default gateway* ke `192.168.10.1`. <LabCheck node="PC1" id="node-interface.check-ip" /> <LabCheck node="PC1" id="linux.route-exist" />
4. **Klien PC2:** Pasang IP `192.168.20.2/24` pada **eth1**, aktifkan interface-nya, lalu atur *default gateway* ke `192.168.20.1`. <LabCheck node="PC2" id="node-interface.check-ip" /> <LabCheck node="PC2" id="linux.route-exist" />
5. **Uji link antar-router:** Dari R1, ping ke `10.10.10.2` untuk memastikan segmen WAN sudah hidup. Tahap berikutnya bergantung pada link ini.

#### Tahap II: Membuktikan Bahwa Routing Bersifat Satu Arah

Rute dipasang di satu sisi lebih dulu, lalu dilengkapi setelah hasilnya diamati. Urutan inilah yang memunculkan gejalanya.

1. **Rute di R1.** Tambahkan rute statis menuju jaringan `192.168.20.0/24` dengan *gateway* `10.10.10.2`. R2 belum dikonfigurasi pada tahap ini. <LabCheck node="R1" id="mikrotik.route-exist" />

2. **Uji dari R1.** Pada konsol **R1**, jalankan `/ping 192.168.20.2 count=4`.
   **Amati:** ping ini **berhasil**.

3. **Uji dari PC1.** Pada terminal **PC1**, jalankan `ping -c 4 192.168.20.2`.
   **Amati:** ping ini **gagal**, tanpa pesan error sama sekali. Ping hanya diam lalu berakhir dengan `100% packet loss`.

4. **Lacak sampai mana paket berjalan.** Pada terminal **PC1**, jalankan `tracepath -m 5 192.168.20.2`.
   **Amati:** hop pertama dijawab oleh `192.168.10.1`, yaitu R1. Setelah itu hanya ada `no reply`:

   ```
    1:  192.168.10.1                     0.322ms
    2:  192.168.10.1                     0.112ms pmtu 1500
    2:  no reply
    3:  no reply
   ```

   Paket dari PC1 tetap melewati R1 dan diteruskan ke R2. Yang tidak pernah kembali adalah jawabannya. Opsi `-m 5` membatasi pencarian sampai lima hop, supaya perintahnya berhenti cepat dan tidak menelusuri sampai tiga puluh hop.

5. **Pastikan penyebabnya di R2.** Pada konsol **R2**, jalankan `/ip route print`.
   **Amati:** R2 tidak memiliki rute menuju `192.168.10.0/24`. Paket dari PC1 sebenarnya **sudah sampai** ke PC2, tetapi balasannya berhenti di R2 karena R2 tidak tahu harus mengirimkannya ke mana.

6. **Lengkapi rute balikan di R2.** Tambahkan rute statis menuju jaringan `192.168.10.0/24` dengan *gateway* `10.10.10.1`. <LabCheck node="R2" id="mikrotik.route-exist" />

#### Tahap III: Verifikasi Akhir
1. **Periksa tabel rute.** Jalankan `/ip route print` pada R1 dan R2. **Amati:** rute yang baru dibuat harus muncul dengan flag **As** (*Active, Static*).
2. **Uji ulang dari PC1.** Jalankan `ping -c 4 192.168.20.2`. Kali ini harus berhasil. <LabCheck node="PC1" id="connectivity.ping" />
3. **Lacak jalurnya.** Pada **PC1**, jalankan `tracepath 192.168.20.2`. **Amati:** kali ini setiap hop menjawab, berurutan dari `192.168.10.1` (R1), `10.10.10.2` (R2), lalu `192.168.20.2` yang ditandai `reached`. Bandingkan dengan hasil Tahap II nomor 4.
