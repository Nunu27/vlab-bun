# Solusi Lab: Eksplorasi CLI, Pengalamatan IP, dan Layanan Jaringan (DNS & DHCP)

Berikut panduan langkah demi langkah untuk menyelesaikan konfigurasi pada lab ini.

## Bagian Eksplorasi

### R1 (MikroTik RouterOS)

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

5. **Pasang IP address pada ether2**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   ```

6. **Verifikasi hasilnya**
   ```routeros
   /user print
   /ip service print
   /system note print
   /ip address print
   ```

### PC1 (Ubuntu Linux)

1. **Buat user baru**
   ```bash
   sudo useradd siswa
   ```

2. **Pasang IP address pada eth1**
   ```bash
   sudo ip addr add 192.168.10.2/24 dev eth1
   ```

3. **Atur default gateway ke R1**
   ```bash
   sudo ip route add default via 192.168.10.1
   ```

4. **Verifikasi konfigurasi**
   ```bash
   ip addr show eth1
   ip route
   ```

5. **Uji koneksi ke R1**
   ```bash
   ping -c 4 192.168.10.1
   ```

---

## Bagian DNS

### R1 (MikroTik RouterOS)

1. **Izinkan permintaan DNS dari luar**
   ```routeros
   /ip dns set allow-remote-requests=yes
   ```

2. **Tambahkan entri statis**
   ```routeros
   /ip dns static add name=r1.lab address=192.168.10.1
   ```

3. **Verifikasi**
   ```routeros
   /ip dns print
   /ip dns static print
   ```

### PC1 (Ubuntu Linux)

1. **Arahkan resolver ke R1**
   ```bash
   echo "nameserver 192.168.10.1" | sudo tee /etc/resolv.conf
   ```

2. **Uji resolusi nama**
   ```bash
   nslookup r1.lab
   ping r1.lab
   ```

---

## Bagian DHCP Server & Client

### R1 (MikroTik RouterOS)

1. **Pasang IP address pada ether3**
   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether3
   ```

2. **Buat address pool**
   ```routeros
   /ip pool add name=dhcp-pool ranges=192.168.20.10-192.168.20.20
   ```

3. **Buat DHCP server**
   ```routeros
   /ip dhcp-server add name=dhcp1 interface=ether3 address-pool=dhcp-pool
   ```

4. **Konfigurasikan network DHCP**
   ```routeros
   /ip dhcp-server network add address=192.168.20.0/24 gateway=192.168.20.1 dns-server=192.168.20.1
   ```

5. **Verifikasi lease**
   ```routeros
   /ip dhcp-server lease print
   ```

### PC2 (Ubuntu Linux)

1. **Minta alamat IP otomatis**
   ```bash
   sudo dhcpcd eth1
   ```

2. **Verifikasi**
   ```bash
   ip addr show eth1
   ip route
   cat /etc/resolv.conf
   ping r1.lab
   ```

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Proses `sshd`.** Berjalan sebagai `root`, karena hanya root yang boleh membuka port 22 (port di bawah 1024 bersifat *privileged*). Jika proses ini dihentikan, sesi yang sedang berjalan tidak langsung putus, tetapi tidak ada koneksi baru yang bisa masuk. Praktisnya PC1 menjadi tidak bisa diakses dari luar.

2. **Perbedaan cara kerja CLI.** Linux memakai *File System Hierarchy*: `cd` memindahkan posisi di dalam struktur direktori, dan `ls` selalu berarti "tampilkan isi direktori tempat saya berada". Perintahnya sama, obyeknya yang berubah. RouterOS memakai *Menu Hierarchy*: `ip address` memindahkan posisi ke sebuah menu pengaturan, dan `print` berarti "tampilkan isi menu tempat saya berada". Perintahnya bersifat *context-aware*, sehingga arti `print` di `/ip/address` berbeda dengan `print` di `/interface`.

3. **Pentingnya hostname.** Semua router MikroTik keluar dari pabrik dengan nama `MikroTik`. Ketika banyak sesi terbuka sekaligus, *prompt* semuanya terlihat sama persis, dan sangat mudah menjalankan perintah di router yang salah. Kesalahan seperti ini sering berakhir dengan konfigurasi yang terhapus di perangkat produksi. Hostname yang jelas adalah pengaman paling murah terhadap kesalahan tersebut, sekaligus memudahkan pembacaan log.

4. **Guna banner MOTD.** Banner memang tidak menghalangi siapa pun untuk masuk; fungsinya bersifat administratif dan hukum. Banner menyatakan secara tegas bahwa perangkat tersebut milik organisasi tertentu dan hanya boleh diakses pihak berwenang, sehingga seseorang yang masuk tanpa hak tidak bisa berdalih tidak tahu. Banyak organisasi mewajibkannya sebagai bagian dari kebijakan keamanan atau audit. Banner juga berguna untuk memberi tahu operator lain, misalnya "perangkat produksi, jangan diubah tanpa izin".

5. **Hak akses `group=read`.** Perintah tersebut akan ditolak, karena group `read` hanya mengizinkan pembacaan konfigurasi. *Least privilege* berarti setiap user hanya diberi hak seminimal yang dibutuhkan untuk melakukan tugasnya. Staf yang bertugas memantau cukup diberi akses baca, sehingga kesalahan atau penyalahgunaan tidak bisa mengubah konfigurasi jaringan.

6. **Telnet, FTP, dan SSH.** Telnet dan FTP mengirim seluruh data, termasuk username dan password, sebagai *plain text* yang bisa dibaca siapa pun yang menyadap jaringan. Keduanya tidak memiliki alasan untuk tetap menyala karena sudah ada penggantinya. SSH melakukan pekerjaan yang sama dengan Telnet tetapi seluruh sesinya dienkripsi, jadi justru harus dipertahankan. Jika SSH ikut dimatikan, jalur akses ke router langsung terputus, dan satu-satunya cara memperbaikinya adalah melalui konsol.

7. **Safe Mode.** Ketika mengubah IP dari jarak jauh, ada kemungkinan konfigurasi baru justru memutus jalur akses yang sedang dipakai. Tanpa Safe Mode router tetap menyimpan konfigurasi yang salah itu, dan perbaikannya harus dilakukan langsung di perangkat. Dengan Safe Mode aktif, router mendeteksi sesinya terputus lalu secara otomatis mengembalikan konfigurasi ke kondisi terakhir yang aman.

8. **Kegunaan `/export`.** Dua contoh yang umum: pertama, membuat cadangan konfigurasi sebelum melakukan perubahan besar, sehingga bisa dikembalikan jika terjadi masalah. Kedua, menyalin konfigurasi ke router lain, misalnya saat mengganti perangkat yang rusak atau menyiapkan cabang baru dengan pengaturan serupa. Keluarannya berupa teks biasa, jadi bisa disimpan di Git, dibandingkan antar-versi, atau dikirim melalui email saat meminta bantuan.

9. **Perhitungan `192.168.10.0/24`.** Prefix /24 menyisakan 32 − 24 = 8 bit untuk host, sehingga ada 2^8 = 256 alamat. Alamat network `192.168.10.0`, alamat broadcast `192.168.10.255`, jumlah host yang bisa dipakai 2^8 − 2 = **254**, dengan rentang `192.168.10.1` sampai `192.168.10.254`. Karena itu host pertama adalah `.1` (dipasang di R1) dan host kedua adalah `.2` (dipasang di PC1).

10. **Alamat network dan broadcast.** `192.168.10.0` memiliki seluruh bit Host ID bernilai 0, sehingga dipakai untuk menamai jaringannya sendiri. `192.168.10.255` memiliki seluruh bit Host ID bernilai 1, dan paket yang dikirim ke sana akan diterima oleh semua perangkat di segmen tersebut. Keduanya sudah memiliki arti khusus, jadi tidak boleh dipakai sebagai identitas satu perangkat.

11. **Urutan mengaktifkan interface.** Alamat tetap tersimpan di dalam konfigurasi, tetapi tidak aktif selama interface masih *down*. RouterOS menandainya dengan flag `I` (*Invalid*) untuk menunjukkan bahwa entri tersebut ada tetapi belum berlaku. Di Linux, `ip addr show` akan tetap menampilkan alamatnya, namun `state DOWN` dan ping tidak akan berhasil. Jadi urutannya boleh dibalik, asalkan interface pada akhirnya diaktifkan.

12. **Ping ke `192.168.10.200`.** Alamat tersebut masih berada di dalam segmen lokal PC1, sehingga PC1 tidak menganggapnya "tidak terjangkau" melainkan mencoba mencari perangkatnya melalui ARP. Karena tidak ada yang menjawab, hasilnya adalah `Destination Host Unreachable` atau ping habis waktu dengan `100% packet loss`. Masalahnya ada di sisi tujuan (tidak ada perangkat dengan alamat tersebut), bukan di sisi PC1. Bandingkan dengan `Network is unreachable`, yang justru menandakan PC1 sendiri tidak tahu jalur menuju tujuan.

13. **Perhitungan `172.16.5.0/28`.** Sisa bit host adalah 32 − 28 = 4, sehingga ada 2^4 = 16 alamat. Jumlah host yang bisa dipakai 2^4 − 2 = **14**, rentangnya `172.16.5.1` sampai `172.16.5.14`, dan alamat broadcast-nya adalah **`172.16.5.15`**.

14. **Subnet mask yang tidak seragam.** Pada kasus ini keduanya **masih bisa saling ping**. PC1 dengan `/25` menganggap jaringannya `192.168.10.0/25` (rentang `.1`–`.126`), dan R1 di `.1` termasuk di dalamnya. R1 dengan `/24` juga menganggap `.2` sebagai tetangga lokal. Masalah baru muncul jika ada perangkat di atas `.126`: R1 akan menganggapnya satu segmen, sedangkan PC1 akan menganggapnya jaringan lain dan mengirimkannya ke *gateway*. Inilah sebabnya subnet mask harus seragam dalam satu segmen, meskipun kesalahannya tidak selalu langsung terlihat.

15. **Gunanya default gateway walau satu segmen.** Selama tujuan pengiriman paket masih berada di segmen `192.168.10.0/24` yang sama, PC1 tidak pernah membutuhkan default gateway, karena PC1 bisa langsung mengirim paket ke perangkat tujuan melalui ARP tanpa perantara. Default gateway baru benar-benar dipakai ketika PC1 mengirim paket ke alamat di luar segmennya sendiri, sesuatu yang tidak terjadi pada topologi modul ini karena hanya ada satu segmen per klien. Default gateway tetap dipasang sebagai kebiasaan konfigurasi standar, sehingga PC1 sudah siap begitu ada tujuan di luar segmennya.

16. **Kenapa tetap butuh DNS.** Konektivitas IP dan penerjemahan nama adalah dua hal berbeda. Ping ke alamat IP bekerja karena paket hanya butuh alamat tujuan yang benar, tetapi manusia tidak berurusan dengan alamat IP sehari-hari. Nama jauh lebih mudah diingat, dan nama itu bisa tetap sama meskipun alamat IP di baliknya berubah, misalnya ketika server dipindahkan. DNS adalah lapisan penerjemah antara nama yang dipakai manusia dengan alamat yang dipakai jaringan. Tanpanya, setiap orang harus menghafal alamat IP setiap layanan yang mereka pakai.

17. **`allow-remote-requests=no`.** Router tetap bisa menerjemahkan nama untuk dirinya sendiri, tetapi menolak menjawab pertanyaan DNS yang datang dari perangkat lain seperti PC1. Akibatnya `nslookup r1.lab` dari PC1 akan gagal atau *timeout*, meskipun entri statisnya sudah benar, karena router menolak permintaan itu sebelum sempat memeriksa entrinya.

18. **Perbedaan dua kegagalan ping.** `ping 192.168.10.200` gagal di tahap *konektivitas*: nama sudah berupa alamat IP, tidak ada yang perlu diterjemahkan, tetapi tidak ada perangkat yang menjawab di alamat tersebut, sehingga hasilnya `Destination Host Unreachable` atau `100% packet loss`. `ping nama-acak.lab` gagal lebih awal, di tahap *resolusi nama*: sebelum satu paket pun dikirim, sistem sudah tidak tahu alamat IP mana yang harus dituju, sehingga pesannya adalah semacam `Name or service not known`. Pesan pertama berarti "tujuan tidak menjawab", pesan kedua berarti "tidak tahu harus mengirim ke mana".

19. **Empat langkah DORA.** **Discover**: begitu `dhcpcd eth1` dijalankan pada PC2, PC2 belum mempunyai alamat sehingga menyiarkan permintaan ke seluruh segmen. **Offer**: R1, sebagai satu-satunya DHCP server pada segmen ini, menjawab dengan menawarkan sebuah alamat dari `dhcp-pool` (langkah Tahap II bagian DHCP). **Request**: PC2 meminta secara eksplisit alamat yang ditawarkan tadi. **Acknowledge**: R1 mengonfirmasi alamat tersebut sebagai milik PC2 dan mencatatnya sebagai *lease* berstatus `bound`, seperti yang terlihat pada `/ip dhcp-server lease print` di Tahap IV.

20. **DNS server dan gateway otomatis melalui DHCP.** Opsi `dns-server=192.168.20.1` dan `gateway=192.168.20.1` pada `/ip dhcp-server network` dikirim bersama alamat IP saat proses *Acknowledge*. `dhcpcd` di sisi PC2 membaca kedua opsi ini dan langsung menulis `/etc/resolv.conf` serta tabel routing sesuai nilai tersebut, tanpa campur tangan manual. Inilah bedanya dengan PC1 pada bagian Eksplorasi dan DNS, yang default gateway maupun resolvernya harus diatur satu per satu secara manual karena tidak mendapat alamat melalui DHCP.

21. **Request tetap melalui broadcast.** Pada saat itu klien belum benar-benar memiliki alamat IP karena statusnya masih tahap negosiasi, sehingga ia belum bisa mengirim paket tertuju (*unicast*) ke satu DHCP server saja. Secara teknis PC2 belum mempunyai alamat sumber yang sah untuk sebuah percakapan unicast biasa. Selain itu, broadcast memastikan seluruh DHCP server lain di segmen yang ikut menawarkan alamat juga menerima pesan Request tersebut, sehingga mereka tahu tawaran mereka tidak dipilih dan bisa langsung melepas kembali alamat yang sempat dicadangkan.
