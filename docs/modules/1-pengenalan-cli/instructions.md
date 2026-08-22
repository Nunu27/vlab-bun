<!-- topology
{
  "devices": {
    "R1": { "template": "Mikrotik RouterOS", "x": 140, "y": 200 },
    "PC1": { "template": "Ubuntu 24.04 SSH", "x": 340, "y": 200 }
  },
  "links": [],
  "groups": {},
  "notes": []
}
-->

### A. Skenario & Topologi

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini menggunakan username `ubuntu` dan password `ubuntu`.

Setiap terminal pada lab ini, baik ke PC maupun ke router, adalah sesi SSH sungguhan ke perangkat tersebut, dijembatani oleh platform lab, bukan sekadar tampilan.

Lab pengenalan ini menyediakan dua jenis perangkat: sebuah klien berbasis Linux (**PC1**) dan sebuah router MikroTik (**R1**). Jelajahi *Command Line Interface* (CLI) pada masing-masing perangkat agar terbiasa dengan lingkungan kerjanya, lalu lakukan sedikit konfigurasi dasar.

Perhatikan bahwa kedua perangkat ini **belum terhubung satu sama lain**. Pada modul ini cukup mengenali CLI masing-masing perangkat terlebih dahulu. Keduanya baru dihubungkan pada Modul 2.

<!-- command-reference:start -->

### B. Referensi Perintah
#### Linux (Ubuntu)

| Perintah | Keterangan |
|---|---|
| `whoami` | Menampilkan nama user yang sedang aktif. |
| `pwd` | (*Print Working Directory*) Menampilkan lokasi direktori saat ini. |
| `ls -la` | Menampilkan seluruh file secara detail, termasuk *hidden file*. |
| `uname -a` | Menampilkan informasi sistem operasi dan kernel. |
| `ps aux` | Menampilkan seluruh proses yang sedang berjalan. |
| `sudo useradd <nama>` | Membuat user baru pada sistem. |

#### MikroTik RouterOS

| Perintah | Keterangan |
|---|---|
| `..` | Naik satu tingkat menu. |
| `/` | Kembali ke root menu. |
| `system resource print` | Menampilkan statistik sistem (CPU, RAM, arsitektur board). |
| `ip address print` | Menampilkan daftar IP address pada router. |
| `system identity set name=<nama>` | Mengubah nama atau identitas router (*hostname*). |
| `system note set note="<teks>" show-at-login=yes` | Memasang banner MOTD yang muncul saat login. Teks berspasi wajib diapit tanda kutip. |
| `user add name=<nama> password=<pass> group=<group>` | Menambahkan user baru. Group `read` hanya bisa membaca, `full` bisa mengubah apa pun. |
| `ip service print` | Menampilkan layanan jaringan router beserta statusnya. |
| `ip service set <nama> disabled=yes` | Mematikan sebuah layanan, misalnya `telnet` atau `ftp`. |
| `interface print` | Menampilkan daftar interface yang tersedia. |
| `/export` | Menampilkan seluruh konfigurasi router dalam bentuk skrip teks. |

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
2. Pada posisi root (`/`), ketik `ip addr` lalu tekan `Tab`. **Amati:** RouterOS melengkapi otomatis menjadi `ip address`. Tekan Enter untuk masuk ke sub-menu ini, lalu amati perubahan pada *prompt* CLI.
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
