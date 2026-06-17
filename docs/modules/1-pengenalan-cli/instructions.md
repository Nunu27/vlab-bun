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

> **Informasi Kredensial:** Perangkat klien (PC) pada lab ini dikonfigurasi menggunakan username `ubuntu` dan password `ubuntu`.

Pada lab pengenalan ini, Anda diberikan akses ke dua jenis perangkat: sebuah klien berbasis Linux (**PC1**) dan sebuah router MikroTik (**R1**). Tugas Anda adalah mengeksplorasi antarmuka *Command Line Interface* (CLI) pada masing-masing perangkat untuk membiasakan diri dengan lingkungan kerjanya, dan melakukan sedikit konfigurasi dasar.



### B. Langkah-Langkah Eksplorasi

#### Tahap I: Eksplorasi CLI Linux (PC1)
1. Buka terminal pada **PC1**.
2. Identifikasi *user* yang sedang aktif dengan mengeksekusi perintah `whoami`.
3. Periksa direktori kerja Anda saat ini menggunakan perintah `pwd`.
4. Lihat daftar file dan folder yang ada di lokasi tersebut (termasuk *hidden files*) dengan mengeksekusi `ls -la`.
5. Periksa informasi spesifikasi kernel sistem operasi menggunakan perintah `uname -a`.
6. Lihat daftar proses yang sedang berjalan dengan mengeksekusi perintah `ps aux`. Perhatikan proses `sshd` yang menjadi jalur akses utama ke perangkat ini.

#### Tahap II: Eksplorasi CLI MikroTik (R1)
1. Buka konsol terminal pada **R1**.
2. Di posisi *root* (`/`), tekan tombol `?` pada keyboard untuk melihat daftar seluruh menu tingkat atas yang tersedia.
3. Masuk ke sub-menu *IP Address* dengan mengetikkan `ip address` lalu tekan Enter.
4. Periksa daftar IP yang terpasang pada router dengan perintah `print`.
5. Kembali ke menu utama (root) dengan mengeksekusi perintah `/`.
6. Lihat daftar antarmuka fisik maupun virtual dengan perintah `interface print`.
7. Lihat statistik beban CPU, penggunaan memori (RAM), dan arsitektur *board* router dengan perintah `system resource print`.
8. Tampilkan seluruh konfigurasi sistem saat ini dalam bentuk skrip teks dengan perintah `/export`.
9. Uji coba **Safe Mode**. Tekan tombol `CTRL + X` pada keyboard. Perhatikan perubahan pada *prompt* CLI (muncul huruf `<SAFE>`). Tekan `CTRL + X` lagi untuk keluar dari Safe Mode.

#### Tahap III: Konfigurasi Dasar
1. Pada **R1**, ubah identitas (nama) router menjadi `R1` dengan mengeksekusi perintah `/system identity set name=R1`. <LabCheck node="R1" id="mikrotik.system-identity" />
2. Pada **R1**, buat pengguna baru bernama `siswa` dengan hak akses baca menggunakan perintah `/user add name=siswa password=Lab@12345 group=read`. <LabCheck node="R1" id="mikrotik.user-exist" />
3. Pada **PC1**, buat pengguna baru bernama `siswa` dengan mengeksekusi perintah `sudo useradd siswa`. <LabCheck node="PC1" id="linux.user-exist" />
