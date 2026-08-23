# Solusi Lab: Konfigurasi Static Routing

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan Static Routing pada semua perangkat agar dapat saling terhubung secara *end-to-end*.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP address pada ether2 (LAN PC1) dan ether3 (WAN ke R2)**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   /ip address add address=10.10.10.1/30 interface=ether3
   ```

2. **Tambahkan rute statis ke network PC2 (192.168.20.0/24)**
   ```routeros
   /ip route add dst-address=192.168.20.0/24 gateway=10.10.10.2
   ```

3. **Verifikasi tabel routing**
   ```routeros
   /ip route print
   ```

---

## R2 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP address pada ether2 (LAN PC2) dan ether3 (WAN ke R1)**
   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether2
   /ip address add address=10.10.10.2/30 interface=ether3
   ```

2. **Tambahkan rute statis ke network PC1 (192.168.10.0/24)**
   ```routeros
   /ip route add dst-address=192.168.10.0/24 gateway=10.10.10.1
   ```

3. **Verifikasi tabel routing**
   ```routeros
   /ip route print
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
   sudo ip addr add 192.168.10.2/24 dev eth1
   ```

3. **Atur default gateway ke R1**
   ```bash
   sudo ip route add default via 192.168.10.1
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
   sudo ip addr add 192.168.20.2/24 dev eth1
   ```

3. **Atur default gateway ke R2**
   ```bash
   sudo ip route add default via 192.168.20.1
   ```

---

## Pengujian Konektivitas

Setelah semua konfigurasi selesai, jalankan tes ping dari terminal **PC1** ke **PC2**:
```bash
ping -c 4 192.168.20.2
```

Lalu pastikan jalurnya benar-benar melewati kedua router:
```bash
tracepath -n 192.168.20.2
```
Urutan hop yang benar adalah `192.168.10.1` (R1), `10.10.10.2` (R2), lalu `192.168.20.2` dengan penanda `reached`.

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Ping dari R1 berhasil, ping dari PC1 gagal.** Perbedaannya ada pada alamat pengirim. Ketika R1 melakukan ping, paket keluar lewat ether3 sehingga alamat pengirimnya adalah `10.10.10.1`. PC2 membalas ke `10.10.10.1`, dan R2 tahu jalur ke sana karena `10.10.10.0/30` terhubung langsung ke interface-nya. Balasan pun sampai. Ketika PC1 melakukan ping, alamat pengirimnya `192.168.10.2`. PC2 membalas ke alamat itu lewat gateway-nya (R2), tetapi pada saat itu R2 belum memiliki rute menuju `192.168.10.0/24`, sehingga balasannya dibuang. Inti pelajarannya: sebuah jalur bisa terlihat "sudah jalan" dari router, padahal perangkat di belakangnya belum bisa lewat.

2. **Gagal tanpa pesan error.** `Network is unreachable` hanya muncul jika perangkat pengirim sendiri tidak memiliki jalur menuju tujuan. Dalam kasus ini PC1 memiliki *default gateway*, jadi dari sudut pandang PC1 semuanya normal: paket berhasil dikirim keluar. Paket itu bahkan benar-benar sampai ke PC2. Yang hilang adalah balasannya, yang dibuang oleh R2 di tengah jalan. PC1 tidak memiliki cara untuk mengetahui hal itu, sehingga ia hanya menunggu sampai waktunya habis dan melaporkan `100% packet loss`.

3. **Mengapa rute harus dibuat di kedua sisi.** Karena router hanya memutuskan ke mana sebuah paket diteruskan berdasarkan alamat tujuannya, dan tidak menyimpan ingatan apa pun tentang paket yang sudah lewat. Paket permintaan dan paket balasan adalah dua perjalanan yang berbeda, dengan tujuan yang berbeda pula. Masing-masing perlu barisnya sendiri di tabel routing.

4. **Rute statis yang tidak aktif.** Rute akan kehilangan flag `A` (*Active*) jika *next-hop*-nya tidak bisa dijangkau, misalnya karena interface menuju gateway tersebut sedang *down* atau alamat gateway-nya salah ketik. Pada keluaran `/ip route print`, rute seperti ini tetap terdaftar tetapi flag-nya hanya `s` tanpa `A`, dan sering disertai tanda `I` (*Inactive*). Rute yang terdaftar belum tentu rute yang dipakai.

5. **Skala 20 router.** Setiap router pada dasarnya perlu tahu jalur menuju setiap jaringan lain yang bukan tetangganya. Untuk 20 router dengan masing-masing satu LAN, jumlah baris rute yang harus ditulis dan dipelihara bisa mencapai ratusan (dalam kasus terburuk mendekati 20 × 19 baris). Lebih berat lagi, setiap penambahan satu jaringan baru menuntut penyuntingan di banyak router sekaligus, dan satu saja yang terlewat akan menghasilkan gejala persis seperti Tahap II: gagal diam-diam tanpa pesan error. Inilah yang dimaksud *administrative overhead*.

6. **Kabel putus.** Rute statis tidak berubah sama sekali. Rute tersebut tetap menunjuk ke *next-hop* yang sudah tidak bisa dijangkau, dan lalu lintas tetap dikirim ke jalur mati itu, meskipun ada jalur cadangan yang sebenarnya bisa dipakai. Router tidak akan berpindah sendiri karena tidak ada mekanisme yang memberitahunya. Perbaikannya harus dilakukan manual oleh administrator. Kemampuan menghitung ulang jalur secara otomatis inilah yang ditawarkan *dynamic routing*, mulai dari RIP pada Modul 3.
