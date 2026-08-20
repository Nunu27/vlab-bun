# Solusi Lab: Pengenalan CLI

Berikut panduan langkah demi langkah untuk menyelesaikan konfigurasi pada Lab Pengenalan CLI.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Ubah identitas (hostname) router**
   ```routeros
   /system identity set name=Lab-R1
   ```

2. **Pasang banner MOTD**
   ```routeros
   /system note set note="Lab Jaringan Komputer" show-at-login=yes
   ```

3. **Buat user baru dengan hak akses baca**
   ```routeros
   /user add name=siswa password=Lab@12345 group=read
   ```

4. **Matikan layanan yang tidak aman**
   ```routeros
   /ip service set telnet disabled=yes
   /ip service set ftp disabled=yes
   ```

5. **Verifikasi hasilnya**
   ```routeros
   /user print
   /ip service print
   /system note print
   ```

---

## PC1 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC1**:

1. **Buat user baru**
   ```bash
   sudo useradd siswa
   ```

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Proses `sshd`.** Berjalan sebagai `root`, karena hanya root yang boleh membuka port 22 (port di bawah 1024 bersifat *privileged*). Jika proses ini dihentikan, sesi yang sedang berjalan tidak langsung putus, tetapi tidak ada koneksi baru yang bisa masuk. Praktisnya PC1 menjadi tidak bisa diakses dari luar.

2. **Perbedaan cara kerja CLI.** Linux memakai *File System Hierarchy*: `cd` memindahkan posisi di dalam struktur direktori, dan `ls` selalu berarti "tampilkan isi direktori tempat saya berada". Perintahnya sama, obyeknya yang berubah. RouterOS memakai *Menu Hierarchy*: `ip address` memindahkan posisi ke sebuah menu pengaturan, dan `print` berarti "tampilkan isi menu tempat saya berada". Perintahnya bersifat *context-aware*, sehingga arti `print` di `/ip/address` berbeda dengan `print` di `/interface`.

3. **Pentingnya hostname.** Semua router MikroTik keluar dari pabrik dengan nama `MikroTik`. Ketika banyak sesi terbuka sekaligus, *prompt* semuanya terlihat sama persis, dan sangat mudah menjalankan perintah di router yang salah. Kesalahan seperti ini sering berakhir dengan konfigurasi yang terhapus di perangkat produksi. Hostname yang jelas adalah pengaman paling murah terhadap kesalahan tersebut, sekaligus memudahkan pembacaan log.

4. **Guna banner MOTD.** Banner memang tidak menghalangi siapa pun untuk masuk; fungsinya bersifat administratif dan hukum. Banner menyatakan secara tegas bahwa perangkat tersebut milik organisasi tertentu dan hanya boleh diakses pihak berwenang, sehingga seseorang yang masuk tanpa hak tidak bisa berdalih tidak tahu. Banyak organisasi mewajibkannya sebagai bagian dari kebijakan keamanan atau audit. Banner juga berguna untuk memberi tahu operator lain, misalnya "perangkat produksi, jangan diubah tanpa izin".

5. **Hak akses `group=read`.** Perintah tersebut akan ditolak, karena group `read` hanya mengizinkan pembacaan konfigurasi. *Least privilege* berarti setiap user hanya diberi hak seminimal yang dibutuhkan untuk melakukan tugasnya. Staf yang bertugas memantau cukup diberi akses baca, sehingga kesalahan atau penyalahgunaan tidak bisa mengubah konfigurasi jaringan.

6. **Telnet, FTP, dan SSH.** Telnet dan FTP mengirim seluruh data, termasuk username dan password, sebagai *plain text* yang bisa dibaca siapa pun yang menyadap jaringan. Keduanya tidak memiliki alasan untuk tetap menyala karena sudah ada penggantinya. SSH melakukan pekerjaan yang sama dengan Telnet tetapi seluruh sesinya dienkripsi, jadi justru harus dipertahankan. Jika SSH ikut dimatikan, jalur akses ke router langsung terputus, dan satu-satunya cara memperbaikinya adalah lewat konsol.

7. **Safe Mode.** Ketika mengubah IP dari jarak jauh, ada kemungkinan konfigurasi baru justru memutus jalur akses yang sedang dipakai. Tanpa Safe Mode router tetap menyimpan konfigurasi yang salah itu, dan perbaikannya harus dilakukan langsung di perangkat. Dengan Safe Mode aktif, router mendeteksi sesinya terputus lalu otomatis mengembalikan konfigurasi ke kondisi terakhir yang aman.

8. **Kegunaan `/export`.** Dua contoh yang umum: pertama, membuat cadangan konfigurasi sebelum melakukan perubahan besar, sehingga bisa dikembalikan jika terjadi masalah. Kedua, menyalin konfigurasi ke router lain, misalnya saat mengganti perangkat yang rusak atau menyiapkan cabang baru dengan pengaturan serupa. Keluarannya berupa teks biasa, jadi bisa disimpan di Git, dibandingkan antar-versi, atau dikirim lewat email saat meminta bantuan.
