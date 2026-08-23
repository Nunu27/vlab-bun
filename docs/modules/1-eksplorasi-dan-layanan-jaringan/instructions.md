<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 140, "y": 220 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 380, "y": 120 },
    "PC2": { "template": "Ubuntu 24.04 SSH", "x": 380, "y": 320 }
  },
  "links": [
    { "from": "R1", "interface": "ether2", "to": "PC1", "remoteInterface": "eth1" },
    { "from": "R1", "interface": "ether3", "to": "PC2", "remoteInterface": "eth1" }
  ],
  "groups": {},
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

Setiap terminal pada lab ini, baik ke PC maupun ke router, merupakan sesi SSH sungguhan ke perangkat tersebut yang dijembatani oleh platform lab.

Lab ini menyediakan sebuah router MikroTik (**R1**) dan dua klien berbasis Linux (**PC1** dan **PC2**), yang dikerjakan dalam tiga bagian berurutan:
1. **Eksplorasi**, yaitu mengenali CLI Linux dan RouterOS, melakukan konfigurasi dasar router, lalu memasang IP address statis agar **R1** dan **PC1** bisa saling berkomunikasi.
2. **DNS**, yaitu menjadikan **R1** sebagai resolver DNS bagi **PC1**, agar perangkat lain di jaringan bisa dijangkau melalui nama, bukan hanya alamat IP.
3. **DHCP Server & Client**, yaitu mengonfigurasi **R1** sebagai DHCP server sehingga **PC2**, yang sengaja dibiarkan belum terkonfigurasi sampai bagian ini, mendapatkan alamat IP beserta DNS server secara otomatis.

<!-- command-reference:start -->

### B. Referensi Perintah

#### Eksplorasi CLI dan Pengalamatan IP

##### Linux (Ubuntu)

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Melihat user aktif | `whoami` | Menampilkan nama user yang sedang aktif. |
| Melihat direktori saat ini | `pwd` | (*Print Working Directory*) Menampilkan lokasi direktori saat ini. |
| Melihat isi direktori | `ls -la` | Menampilkan seluruh file secara detail, termasuk *hidden file*. |
| Melihat info sistem | `uname -a` | Menampilkan informasi sistem operasi dan kernel. |
| Melihat proses berjalan | `ps aux` | Menampilkan seluruh proses yang sedang berjalan. |
| Membuat user baru | `sudo useradd <nama>` | Membuat user baru pada sistem. |
| Menambahkan IP sementara | `sudo ip addr add <ip/prefix> dev <nama-interface>` | Bersifat sementara; hilang setelah *restart*. |
| Mengaktifkan interface | `sudo ip link set <nama-interface> up` | Interface baru berstatus *down* secara default. |
| Menambahkan default gateway | `sudo ip route add default via <ip-gateway>` | Semua tujuan yang tidak dikenal diserahkan ke gateway ini. |
| Melihat IP dan statusnya | `ip addr show` | - |
| Melihat tabel routing | `ip route` | - |
| Menguji konektivitas | `ping -c 4 <alamat-ip>` | - |

> **Catatan:** Perintah `ip addr add` bersifat sementara. Jika sistem di-*restart*, alamat tersebut hilang. Di lingkungan produksi (misalnya Ubuntu 24.04), konfigurasi IP permanen diatur melalui file YAML milik **Netplan**.

##### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Naik satu tingkat menu | `..` | - |
| Kembali ke root menu | `/` | - |
| Melihat statistik sistem | `/system resource print` | Menampilkan statistik sistem (CPU, RAM, arsitektur board). |
| Mengubah hostname | `/system identity set name=<nama>` | Mengubah nama atau identitas router (*hostname*). |
| Memasang banner MOTD | `/system note set note="<teks>" show-at-login=yes` | Teks berspasi wajib diapit tanda kutip. |
| Menambahkan user baru | `/user add name=<nama> password=<pass> group=<group>` | Group `read` hanya bisa membaca, `full` bisa mengubah apa pun. |
| Melihat status layanan | `/ip service print` | Menampilkan layanan jaringan router beserta statusnya. |
| Mematikan layanan | `/ip service set <nama> disabled=yes` | Misalnya `telnet` atau `ftp`. |
| Melihat daftar interface | `/interface print` | Menampilkan daftar interface yang tersedia. |
| Mencadangkan konfigurasi | `/export` | Menampilkan seluruh konfigurasi router dalam bentuk skrip teks. |
| Menambahkan IP address | `/ip address add address=<ip/prefix> interface=<nama-interface>` | Prefix wajib ditulis, misalnya `/24`. |
| Melihat daftar IP | `/ip address print` | Pastikan tidak ada flag `I` (*Invalid*); flag itu muncul jika interface-nya belum aktif. |
| Menguji konektivitas | `/ping <alamat-ip> count=4` | - |

#### Konfigurasi DNS

##### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Mengizinkan permintaan DNS dari luar | `/ip dns set allow-remote-requests=yes` | Tanpa ini, router hanya menjawab pertanyaan DNS dari dirinya sendiri. |
| Menambahkan entri DNS statis | `/ip dns static add name=<nama> address=<ip>` | Memetakan satu nama ke satu alamat IP. |
| Melihat pengaturan DNS | `/ip dns print` | Menampilkan server upstream dan status `allow-remote-requests`. |
| Melihat entri statis | `/ip dns static print` | - |

##### Linux (Ubuntu)

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Mengatur DNS server | `echo "nameserver <alamat-ip>" \| sudo tee /etc/resolv.conf` | Bersifat sementara, sama seperti pengaturan IP address dengan `ip addr add`. |
| Menguji resolusi nama | `nslookup <nama>` | Menampilkan hasil terjemahan nama tanpa menguji konektivitas. |
| Menguji nama sekaligus konektivitas | `ping <nama>` | Gagal dengan `Name or service not known` jika resolusi namanya bermasalah. |

#### Konfigurasi DHCP Server & Client

##### MikroTik RouterOS

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membuat address pool | `/ip pool add name=<nama> ranges=<ip-awal>-<ip-akhir>` | Kumpulan alamat yang boleh dipinjamkan. |
| Membuat DHCP server | `/ip dhcp-server add name=<nama> interface=<interface> address-pool=<nama-pool>` | Mengikat sebuah pool ke sebuah interface. |
| Mengatur network DHCP | `/ip dhcp-server network add address=<network/prefix> gateway=<ip> dns-server=<ip>` | Informasi tambahan yang dikirim bersama alamat IP. |
| Melihat daftar lease | `/ip dhcp-server lease print` | Periksa kolom `status`: `waiting` atau `bound`. |

##### Linux (Ubuntu)

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Meminta alamat IP otomatis | `sudo dhcpcd <nama-interface>` | Menjalankan proses DORA pada interface tersebut. |
| Melihat IP dan asalnya | `ip addr show <nama-interface>` | Alamat dari DHCP ditandai `dynamic`, berbeda dari alamat statis. |
| Melihat DNS server aktif | `cat /etc/resolv.conf` | Terisi secara otomatis oleh `dhcpcd` sesuai DNS server dari DHCP. |

<!-- command-reference:end -->

### C. Langkah-Langkah Eksplorasi

Setiap langkah di bawah disertai satu hal yang perlu diamati.

#### Tahap I: Eksplorasi CLI Linux (PC1)
1. Buka terminal pada **PC1**.
2. Jalankan `whoami`. **Amati:** siapa nama user yang sedang aktif?
3. Jalankan `pwd`. **Amati:** direktori apa yang menjadi posisi awal setelah login?
4. Jalankan `ls -la`. **Amati:** berapa banyak file yang namanya diawali titik (*hidden file*)? Mengapa file seperti itu disembunyikan?
5. Jalankan `uname -a`. **Amati:** versi kernel dan arsitektur prosesor yang digunakan.
6. Jalankan `ps aux`. Cari baris yang memuat proses `sshd`. **Amati:** user apa yang menjalankannya, dan mengapa proses itu harus tetap hidup selama lab berlangsung?

#### Tahap II: Eksplorasi CLI MikroTik (R1)
1. Buka konsol terminal pada **R1**.
2. Pada posisi root (`/`), ketik `ip addr` lalu tekan `Tab`. **Amati:** RouterOS secara otomatis melengkapinya menjadi `ip address`. Tekan Enter untuk masuk ke sub-menu ini, lalu amati perubahan pada *prompt* CLI.
3. Jalankan `print`. **Amati:** apakah ada IP address yang sudah terpasang? Perhatikan bahwa cukup mengetik `print`, bukan `ip address print`, karena posisi CLI sudah berada di dalam menu tersebut.
4. Kembali ke root menu dengan menjalankan `/`.
5. Jalankan `interface print`. **Amati:** berapa banyak interface yang dimiliki router ini, dan apa saja namanya?
6. Jalankan `system resource print`. **Amati:** penggunaan CPU, memori (RAM), dan arsitektur board router.
7. Jalankan `/export`. **Amati:** seluruh konfigurasi router ditampilkan sebagai skrip teks. Inilah cara tercepat untuk mencadangkan atau memeriksa konfigurasi sebuah router.
8. Uji coba **Safe Mode**. Tekan `CTRL + X`. **Amati:** munculnya penanda `<SAFE>` pada *prompt*. Tekan `CTRL + X` sekali lagi untuk keluar.

#### Tahap III: Konfigurasi Dasar Router

Sekarang lakukan konfigurasi awal yang selalu dikerjakan pada router baru sebelum dipakai: memberi nama, memasang pesan sambutan, membuat user, dan mematikan layanan yang tidak aman.

1. **Ubah identitas (hostname) router.** Router baru selalu bernama `MikroTik`, dan itu membingungkan begitu ada banyak perangkat yang dikelola. Ubah menjadi `Lab-R1`:
   ```
   /system identity set name=Lab-R1
   ```
   **Amati:** nama pada *prompt* CLI ikut berubah. <LabCheck node="R1" id="mikrotik.system-identity" />

2. **Pasang banner MOTD.** Banner adalah pesan yang muncul setiap kali seseorang masuk ke router. Di dunia nyata banner dipakai untuk menyatakan bahwa perangkat ini milik organisasi tertentu dan tidak boleh diakses sembarang orang.
   ```
   /system note set note="Lab Jaringan Komputer" show-at-login=yes
   ```
   Perhatikan tanda kutip pada `note=`. Tanda kutip diperlukan karena teksnya mengandung spasi. <LabCheck node="R1" id="mikrotik.system-note" />

3. **Buat user baru dengan password dan hak akses terbatas.** User `siswa` hanya boleh membaca konfigurasi, tidak boleh mengubahnya:
   ```
   /user add name=siswa password=Lab@12345 group=read
   ```
   Jalankan `/user print` dan perhatikan kolom `group`. **Amati:** perbedaannya dengan user `admin` yang bergroup `full`. <LabCheck node="R1" id="mikrotik.user-exist" />

   > **Jangan mengubah password user `admin`.** Router ini diakses sebagai `admin`, baik oleh terminal yang sedang dipakai maupun oleh sistem penilaian lab. Jika passwordnya diganti, akses ke router bisa hilang dan seluruh pemeriksaan pada R1 akan berhenti bekerja.

4. **Matikan layanan yang tidak aman.** Materi modul ini menjelaskan bahwa Telnet mengirim password sebagai *plain text*. Sekarang matikan layanannya, bersama FTP yang memiliki masalah sama:
   ```
   /ip service set telnet disabled=yes
   /ip service set ftp disabled=yes
   ```
   Jalankan `/ip service print`. **Amati:** tanda `X` pada baris telnet dan ftp. <LabCheck node="R1" id="mikrotik.ip-service" /> <LabCheck node="R1" id="mikrotik.ip-service" />

5. **Buat user baru pada PC1.** Pindah ke terminal **PC1** dan jalankan:
   ```
   sudo useradd siswa
   ```
   Periksa hasilnya dengan `tail -3 /etc/passwd`. **Amati:** Linux menyimpan daftar user sebagai file teks biasa, berbeda dengan RouterOS yang menyimpannya di dalam menu `/user`. <LabCheck node="PC1" id="linux.user-exist" />

#### Tahap IV: Konfigurasi IP pada Router (R1)
1. Akses konsol **R1**.
2. Pasang IP address `192.168.10.1/24` pada interface **ether2**. <LabCheck node="R1" id="node-interface.check-ip" />
3. Jalankan `/ip address print` untuk memverifikasi. **Amati:** tidak boleh ada flag `I` (*Invalid*) pada entri tersebut. Flag itu muncul jika interface-nya belum aktif.

#### Tahap V: Konfigurasi IP pada Klien (PC1)
1. Akses terminal **PC1**.
2. Jalankan `ip addr show eth1` terlebih dahulu. **Amati:** interface ini sudah berstatus `UP`, tetapi belum memiliki alamat IPv4.
3. Pasang IP address `192.168.10.2/24` pada interface **eth1** dengan `sudo ip addr add 192.168.10.2/24 dev eth1`. <LabCheck node="PC1" id="node-interface.check-ip" />
4. Jalankan `ip addr show eth1` sekali lagi. **Amati:** alamat IPv4 yang baru saja dipasang kini muncul pada keluarannya.
5. Atur default gateway ke `192.168.10.1` dengan `sudo ip route add default via 192.168.10.1`. <LabCheck node="PC1" id="linux.route-exist" />

#### Tahap VI: Pengujian Konektivitas
1. Dari terminal **PC1**, jalankan `ping -c 4 192.168.10.1`. Pastikan balasannya diterima. <LabCheck node="PC1" id="connectivity.ping" />
2. Dari konsol **R1**, ping balik ke arah PC1 dengan `/ping 192.168.10.2 count=4`. Pastikan balasannya juga berhasil.
3. Sekarang coba ping ke sebuah alamat yang tidak ada di segmen ini, misalnya `192.168.10.200`. **Amati:** pesan apa yang muncul, dan berapa lama waktu yang dibutuhkan sebelum ping berhenti sendiri?

### D. Langkah-Langkah DNS

**PC1** dan **R1** sekarang sudah bisa saling ping melalui alamat IP. Bagian ini menjadikan **R1** sebagai resolver DNS, sehingga **PC1** bisa menjangkaunya melalui nama `r1.lab`.

#### Tahap I: Konfigurasi DNS Server (R1)
1. Akses konsol **R1**.
2. Izinkan router menjawab pertanyaan DNS dari perangkat lain:
   ```
   /ip dns set allow-remote-requests=yes
   ```
   <LabCheck node="R1" id="mikrotik.dns-allow-remote-requests" />
3. Tambahkan entri statis yang memetakan nama ke alamat R1 sendiri:
   ```
   /ip dns static add name=r1.lab address=192.168.10.1
   ```
   <LabCheck node="R1" id="mikrotik.dns-static-exist" />
4. Verifikasi dengan `/ip dns static print` dan `/ip dns print`.

#### Tahap II: Konfigurasi Resolver (PC1)
1. Akses terminal **PC1**.
2. Arahkan resolver PC1 ke R1:
   ```
   echo "nameserver 192.168.10.1" | sudo tee /etc/resolv.conf
   ```
3. Verifikasi dengan `cat /etc/resolv.conf`. **Amati:** isinya kini menunjuk ke `192.168.10.1`, bukan resolver bawaan lab.

#### Tahap III: Pengujian Resolusi Nama
1. Dari **PC1**, jalankan `nslookup r1.lab`. **Amati:** apakah alamat yang dikembalikan sesuai dengan entri statis yang dipasang?
2. Jalankan `ping r1.lab`. **Amati:** baris pertama menampilkan alamat IP hasil terjemahan nama, sebelum ping benar-benar mengirim paket. <LabCheck node="PC1" id="connectivity.ping" />
3. Sekarang coba `ping nama-acak.lab`, yang tidak pernah didaftarkan. **Amati:** pesan errornya, lalu bandingkan dengan pesan `100% packet loss` yang muncul ketika resolusi nama berhasil, tetapi perangkat tujuannya yang tidak menjawab.

### E. Langkah-Langkah DHCP Server & Client

**PC2** pada topologi belum memiliki konfigurasi apa pun. Bagian ini menjadikan **R1** sebagai DHCP server, agar **PC2** bisa mendapatkan alamat IP sekaligus DNS server secara otomatis.

#### Tahap I: Konfigurasi IP pada Router (R1)
1. Akses konsol **R1**.
2. Pasang IP address `192.168.20.1/24` pada interface **ether3**, segmen tempat PC2 terhubung. <LabCheck node="R1" id="node-interface.check-ip" />

#### Tahap II: Konfigurasi DHCP Server (R1)
1. Buat address pool yang akan dipinjamkan ke klien:
   ```
   /ip pool add name=dhcp-pool ranges=192.168.20.10-192.168.20.20
   ```
   <LabCheck node="R1" id="mikrotik.dhcp-pool-exist" />
2. Ikat pool tersebut ke interface **ether3**:
   ```
   /ip dhcp-server add name=dhcp1 interface=ether3 address-pool=dhcp-pool
   ```
   <LabCheck node="R1" id="mikrotik.dhcp-server-exist" />
3. Tambahkan informasi gateway dan DNS server yang ikut dikirim ke klien. Perhatikan bahwa `dns-server` diisi dengan alamat R1 sendiri, memakai konfigurasi DNS yang sudah dipasang pada bagian sebelumnya:
   ```
   /ip dhcp-server network add address=192.168.20.0/24 gateway=192.168.20.1 dns-server=192.168.20.1
   ```
   <LabCheck node="R1" id="mikrotik.dhcp-network-exist" />

#### Tahap III: DHCP Client (PC2)
1. Akses terminal **PC2**.
2. Jalankan `ip addr show eth1`. **Amati:** belum ada alamat IPv4 sama sekali pada interface ini.
3. Minta alamat IP secara otomatis:
   ```
   sudo dhcpcd eth1
   ```
4. Jalankan `ip addr show eth1` sekali lagi. **Amati:** alamat yang didapat ditandai `dynamic`, diambil dari rentang pool yang dibuat pada Tahap II.

#### Tahap IV: Verifikasi Lease dan Konektivitas
1. Dari konsol **R1**, jalankan `/ip dhcp-server lease print`. **Amati:** kolom `status` pada baris milik PC2 harus bernilai `bound`. <LabCheck node="R1" id="mikrotik.dhcp-lease-bound" />
2. Dari terminal **PC2**, periksa `cat /etc/resolv.conf`. **Amati:** DNS server yang terisi secara otomatis adalah `192.168.20.1`, sesuai opsi `dns-server` yang dikirim DHCP server, tanpa perlu disunting manual seperti pada bagian DNS.
3. Jalankan `ip route`. **Amati:** sudah ada rute `default` melalui gateway `192.168.20.1`, sesuai opsi `gateway` yang dikirim DHCP server, padahal tidak pernah diatur manual seperti default gateway pada PC1. <LabCheck node="PC2" id="linux.route-exist" />
4. Jalankan `ping r1.lab`. **Amati:** PC2 berhasil menerjemahkan nama dan menjangkau R1, padahal resolvernya tidak pernah diatur secara manual. Semuanya didapat secara otomatis melalui DHCP. <LabCheck node="PC2" id="connectivity.ping" />
