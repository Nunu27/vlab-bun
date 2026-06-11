### A. Skenario & Topologi

Pada lab pengenalan ini, Anda diberikan akses ke dua jenis perangkat: sebuah klien berbasis Linux (**PC1**) dan sebuah router MikroTik (**R1**). Tugas Anda adalah mengeksplorasi antarmuka *Command Line Interface* (CLI) pada masing-masing perangkat untuk membiasakan diri dengan lingkungan kerjanya.



### B. Langkah-Langkah Eksplorasi

#### Tahap I: Eksplorasi CLI Linux (PC1)
1. Buka terminal pada **PC1**.
2. Identifikasi *user* yang sedang aktif dengan mengeksekusi perintah `whoami`.
3. Periksa direktori kerja Anda saat ini menggunakan perintah `pwd`.
4. Lihat daftar file dan folder yang ada di lokasi tersebut (termasuk *hidden files*) dengan mengeksekusi `ls -la`.
5. Periksa informasi spesifikasi kernel sistem operasi menggunakan perintah `uname -a`.

#### Tahap II: Eksplorasi CLI MikroTik (R1)
1. Buka konsol terminal pada **R1**.
2. Di posisi *root* (`/`), tekan tombol `?` pada keyboard untuk melihat daftar seluruh menu tingkat atas yang tersedia.
3. Masuk ke sub-menu *IP Address* dengan mengetikkan `ip address` lalu tekan Enter.
4. Periksa daftar IP yang terpasang pada router dengan perintah `print`.
5. Kembali ke menu utama (root) dengan mengeksekusi perintah `/`.
6. Lihat statistik beban CPU, penggunaan memori (RAM), dan arsitektur *board* router dengan perintah `system resource print`.
