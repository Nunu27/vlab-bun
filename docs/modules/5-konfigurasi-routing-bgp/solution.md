# Solusi Lab: Konfigurasi Routing BGP

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan dynamic routing BGP (Multi-AS) pada semua perangkat.

## R1 (MikroTik RouterOS - AS 65001)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP address**
   ```routeros
   /ip address add address=192.0.2.1/24 interface=ether2
   /ip address add address=198.51.100.1/30 interface=ether3
   ```

2. **Daftarkan prefix yang akan diiklankan**
   ```routeros
   /ip firewall address-list add list=bgp-networks address=192.0.2.0/24
   ```

3. **Konfigurasikan BGP instance**
   ```routeros
   /routing bgp instance add name=bgp-default as=65001 router-id=1.1.1.1
   ```

4. **Konfigurasikan BGP peering connection ke R2**
   ```routeros
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.2 local.role=ebgp local.address=198.51.100.1 output.network=bgp-networks
   ```

---

## R2 (MikroTik RouterOS - AS 65000 Transit)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP address**
   ```routeros
   /ip address add address=198.51.100.2/30 interface=ether3
   /ip address add address=198.51.100.5/30 interface=ether4
   ```

2. **Konfigurasikan BGP instance**
   ```routeros
   /routing bgp instance add name=bgp-default as=65000 router-id=2.2.2.2
   ```

3. **Konfigurasikan BGP peering connection ke R1 dan R3**
   ```routeros
   /routing bgp connection add name=peer-R1 instance=bgp-default remote.as=65001 remote.address=198.51.100.1 local.role=ebgp local.address=198.51.100.2
   /routing bgp connection add name=peer-R3 instance=bgp-default remote.as=65002 remote.address=198.51.100.6 local.role=ebgp local.address=198.51.100.5
   ```

---

## R3 (MikroTik RouterOS - AS 65002)

Jalankan perintah berikut pada terminal konsol **R3**:

1. **Konfigurasikan IP address**
   ```routeros
   /ip address add address=203.0.113.1/24 interface=ether2
   /ip address add address=198.51.100.6/30 interface=ether3
   ```

2. **Daftarkan prefix yang akan diiklankan**
   ```routeros
   /ip firewall address-list add list=bgp-networks address=203.0.113.0/24
   ```

3. **Konfigurasikan BGP instance**
   ```routeros
   /routing bgp instance add name=bgp-default as=65002 router-id=3.3.3.3
   ```

4. **Konfigurasikan BGP peering connection ke R2**
   ```routeros
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.5 local.role=ebgp local.address=198.51.100.6 output.network=bgp-networks
   ```

---

## PC1 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC1**:

1. **Aktifkan interface eth1**
   ```bash
   sudo ip link set eth1 up
   ```

2. **Pasang IP address pada eth1**
   ```bash
   sudo ip addr add 192.0.2.2/24 dev eth1
   ```

3. **Atur default gateway ke R1**
   ```bash
   sudo ip route add default via 192.0.2.1
   ```

---

## PC2 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC2**:

1. **Aktifkan interface eth1**
   ```bash
   sudo ip link set eth1 up
   ```

2. **Pasang IP address pada eth1**
   ```bash
   sudo ip addr add 203.0.113.2/24 dev eth1
   ```

3. **Atur default gateway ke R3**
   ```bash
   sudo ip route add default via 203.0.113.1
   ```

---

## Verifikasi & Pengujian

1. **Periksa status sesi BGP di semua router**
   ```routeros
   /routing bgp session print
   ```
   Pastikan seluruh status peering connection berada pada state **Established**.

2. **Periksa tabel routing lalu amati AS-Path**
   ```routeros
   /ip route print
   ```
   Pastikan terdapat rute ke network remote dengan flag **DAb** (Dynamic, Active, BGP).

   Gunakan perintah detail berikut pada R1 untuk melihat AS-PATH dari `203.0.113.0/24`:
   ```routeros
   /ip route print detail where dst-address=203.0.113.0/24
   ```
   Atribut `bgp-as-path` harus menunjukkan `65000,65002`.

3. **Uji koneksi end-to-end dari PC1 ke PC2**
   ```bash
   ping -c 4 203.0.113.2
   ```

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Arti AS-Path `65000,65002`.** Dibaca dari kiri ke kanan, daftar ini menunjukkan urutan AS yang dilewati rute tersebut untuk sampai ke R1, dimulai dari yang terdekat. Angka `65000` adalah AS milik R2, tetangga langsung R1 yang mengirimkan rute itu. Angka `65002` adalah AS asal, yaitu pemilik blok `203.0.113.0/24`. Dilihat dari R2, rute yang sama hanya membawa AS-Path `65002`, karena R2 menerimanya langsung dari AS asal dan belum menambahkan nomornya sendiri. Setiap AS baru menambahkan nomornya ketika meneruskan rute keluar.

2. **Peran R2 tanpa `output.network`.** Parameter `output.network` hanya mengatur prefix milik sendiri yang ingin diiklankan. R2 tidak memiliki blok IP untuk diiklankan, jadi parameter itu memang tidak diperlukan. Yang dilakukan R2 adalah meneruskan rute yang ia pelajari dari satu peer ke peer lainnya, yang merupakan perilaku bawaan eBGP. Inilah definisi sebuah *transit AS*, dan persis seperti cara kerja ISP di dunia nyata: mereka menjual jalur, bukan mengiklankan jaringan sendiri.

3. **BGP vs OSPF.** OSPF adalah IGP yang bertugas mencari jalur tercepat di dalam satu organisasi, dan metriknya adalah **cost**, yang dihitung dari bandwidth. BGP adalah EGP yang menghubungkan antar-organisasi, dan pertimbangan utamanya adalah **AS-Path** beserta sekumpulan atribut kebijakan lain. OSPF menjawab "mana yang paling cepat", BGP menjawab "mana yang paling sesuai dengan kesepakatan kami".

4. **Contoh routing policy.** Sebuah ISP memiliki dua jalur keluar: satu ke ISP mitra dengan biaya per-gigabyte yang murah tetapi latensi lebih tinggi, satu lagi ke ISP premium yang cepat tetapi mahal. Untuk lalu lintas biasa seperti unduhan besar, ISP tersebut sengaja mengarahkan trafik ke jalur murah walaupun lebih lambat, karena selisih biayanya jauh lebih berarti daripada selisih kecepatannya. Pengaturan seperti ini dilakukan dengan atribut Local Preference atau AS-Path Prepend.

5. **Port 179 diblokir.** Sesi BGP tidak akan pernah terbentuk, karena BGP membangun koneksi TCP terlebih dahulu sebelum bertukar rute apa pun. Gejalanya terlihat lebih dulu pada `/routing bgp session print`: statusnya tidak akan mencapai **Established**, biasanya berhenti di `connect` atau `active`. Pada `/ip route print` yang terlihat hanya ketiadaan rute, tanpa penjelasan penyebabnya. Karena itu saat *troubleshooting* BGP, status sesi selalu diperiksa lebih dulu sebelum melihat tabel rute.

6. **Bahaya `output.redistribute=connected`.** Router akan mengiklankan seluruh jaringan yang menempel padanya, termasuk subnet manajemen perangkat, alamat loopback, dan jaringan internal yang seharusnya tidak diketahui publik. Akibatnya peta jaringan internal organisasi tersebar ke internet, dan pihak luar bisa memperoleh jalur menuju sistem yang semestinya tertutup. Dengan *address-list* eksplisit, hanya blok yang benar-benar didaftarkan yang keluar, sehingga penambahan interface baru tidak otomatis membocorkan apa pun.

7. **Rentang ASN 64512–65534.** Rentang ini dicadangkan sebagai *private ASN* (RFC 6996), setara dengan alamat IP privat seperti `192.168.0.0/16`. Nomor tersebut boleh dipakai bebas untuk lab, dokumentasi, atau jaringan internal, tetapi tidak boleh muncul di tabel routing internet global karena tidak unik: banyak organisasi memakai nomor yang sama secara bersamaan. ASN publik dialokasikan oleh RIR seperti APNIC untuk kawasan Asia Pasifik.

8. **Memilih protokol yang tepat.**
   - **(a) Kantor cabang dengan satu jalur:** *static routing*. Hanya ada satu jalur keluar, sehingga tidak ada yang perlu dihitung. Static route paling sederhana, paling ringan, dan tidak mengirim paket update ke jaringan. Ini kasus *stub network* seperti yang dibahas pada Modul 2.
   - **(b) Kampus dengan 30 router:** *OSPF*. Jumlah routernya terlalu banyak untuk dikelola manual, seluruhnya berada dalam satu organisasi (sehingga IGP yang tepat), dan OSPF menawarkan konvergensi cepat serta pemilihan jalur berbasis bandwidth. RIP tidak cocok karena batas 15 hop dan konvergensinya lambat.
   - **(c) ISP bertukar rute dengan ISP lain:** *BGP*. Ini pertukaran antar-organisasi yang berbeda, masing-masing dengan kebijakan sendiri. Hanya BGP yang menyediakan konsep AS beserta atribut kebijakan untuk mengatur hubungan seperti itu.
