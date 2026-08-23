# Solusi Lab: Konfigurasi Routing OSPF

Berikut panduan langkah demi langkah untuk mengonfigurasi IP address dan OSPF pada topologi segitiga R1-R2-R3.

Kunci modul ini ada pada parameter `cost=50` di link langsung R1-R3. Tanpa parameter tersebut, OSPF akan memilih link langsung karena cost-nya paling kecil, dan pelajaran utama modul ini tidak akan terlihat.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP address**

   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   /ip address add address=10.10.10.1/30 interface=ether3
   /ip address add address=10.10.30.1/30 interface=ether4
   ```

2. **Konfigurasikan OSPF instance dan area**

   ```routeros
   /routing ospf instance add name=ospf-lab router-id=1.1.1.1
   /routing ospf area add name=backbone-lab instance=ospf-lab area-id=0.0.0.0
   ```

3. **Konfigurasikan interface template**
   ```routeros
   /routing ospf interface-template add area=backbone-lab interfaces=ether3 type=ptp
   /routing ospf interface-template add area=backbone-lab interfaces=ether4 type=ptp cost=50
   /routing ospf interface-template add area=backbone-lab interfaces=ether2 passive
   ```

---

## R2 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP address**

   ```routeros
   /ip address add address=10.10.10.2/30 interface=ether3
   /ip address add address=10.10.20.1/30 interface=ether4
   ```

2. **Konfigurasikan OSPF instance dan area**

   ```routeros
   /routing ospf instance add name=ospf-lab router-id=2.2.2.2
   /routing ospf area add name=backbone-lab instance=ospf-lab area-id=0.0.0.0
   ```

3. **Konfigurasikan interface template**
   ```routeros
   /routing ospf interface-template add area=backbone-lab interfaces=ether3 type=ptp
   /routing ospf interface-template add area=backbone-lab interfaces=ether4 type=ptp
   ```

---

## R3 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R3**:

1. **Konfigurasikan IP address**

   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether2
   /ip address add address=10.10.20.2/30 interface=ether3
   /ip address add address=10.10.30.2/30 interface=ether4
   ```

2. **Konfigurasikan OSPF instance dan area**

   ```routeros
   /routing ospf instance add name=ospf-lab router-id=3.3.3.3
   /routing ospf area add name=backbone-lab instance=ospf-lab area-id=0.0.0.0
   ```

3. **Konfigurasikan interface template**
   ```routeros
   /routing ospf interface-template add area=backbone-lab interfaces=ether3 type=ptp
   /routing ospf interface-template add area=backbone-lab interfaces=ether4 type=ptp cost=50
   /routing ospf interface-template add area=backbone-lab interfaces=ether2 passive
   ```

---

## PC1 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC1**:

1. **Pasang IP address pada eth1**

   ```bash
   sudo ip addr add 192.168.10.2/24 dev eth1
   ```

2. **Atur default gateway ke R1**
   ```bash
   sudo ip route add default via 192.168.10.1
   ```

---

## PC2 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC2**:

1. **Pasang IP address pada eth1**

   ```bash
   sudo ip addr add 192.168.20.2/24 dev eth1
   ```

2. **Atur default gateway ke R3**
   ```bash
   sudo ip route add default via 192.168.20.1
   ```

---

## Verifikasi & Pengujian

1. **Pastikan adjacency terbentuk**

   ```routeros
   /routing ospf neighbor print
   ```

   R1 harus memiliki dua tetangga (`2.2.2.2` dan `3.3.3.3`), keduanya berstatus **Full**.

2. **Pastikan OSPF memilih jalur lewat R2, bukan link langsung**

   ```routeros
   /ip route print detail
   ```

   Rute `192.168.20.0/24` di R1 harus bergateway `10.10.10.2` dengan flag **DAo**. Jika gateway-nya justru `10.10.30.2`, berarti `cost=50` belum terpasang pada ether4.

3. **Uji koneksi end-to-end dari PC1 ke PC2**

   ```bash
   ping -c 4 192.168.20.2
   ```

4. **Pastikan jalurnya memutar lewat R2**
   ```bash
   tracepath -n 192.168.20.2
   ```
   Hop kedua harus `10.10.10.2` (R2), bukan `10.10.30.2` (link langsung ke R3).

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Perhitungan cost.** Jalur lewat R2 melewati dua link berbiaya default, sehingga totalnya 1 + 1 = **2**. Jalur langsung R1-R3 hanya satu link, tetapi cost-nya sengaja diisi **50**. Karena OSPF selalu memilih total cost terkecil, jalur dua lompatan dengan cost 2 menang atas jalur satu lompatan dengan cost 50. OSPF menganggapnya lebih baik karena _cost_ dimaksudkan sebagai gambaran kualitas link, umumnya berbanding terbalik dengan _bandwidth_. Satu lompatan lewat satelit lambat memang lebih buruk daripada dua lompatan lewat fiber optik.

2. **Perbandingan konvergensi.** Biasanya hanya satu sampai beberapa paket yang hilang pada OSPF, jadi hitungan detik, sedangkan RIP pada Modul 3 butuh puluhan detik hingga beberapa menit. Penyebabnya berbeda secara mendasar. RIP menunggu ketiadaan update sampai timer _invalid_ habis, jadi kesimpulan "jalur mati" diambil dari sesuatu yang tidak terjadi. OSPF langsung mengirim LSA baru begitu link berubah status, lalu semua router menjalankan ulang algoritma Dijkstra memakai peta topologi yang sudah mereka miliki. OSPF diberi tahu, RIP harus menunggu.

3. **Parameter `passive`.** Jika dihilangkan, router akan mengirim _Hello Packet_ ke segmen LAN. Paket tersebut sia-sia karena PC tidak menjalankan OSPF, sekaligus membuka risiko keamanan: siapa pun yang menancapkan perangkat di LAN bisa mencoba membentuk adjacency dan menyuntikkan rute palsu. Jaringan LAN-nya tetap muncul di router lain karena interface pasif tetap dimasukkan ke dalam area, sehingga prefix-nya tetap diiklankan lewat LSA. Yang dimatikan hanya pengiriman Hello, bukan pengiklanan jaringannya.

4. **Parameter `type=ptp`.** Parameter ini memberi tahu OSPF bahwa link tersebut hanya menghubungkan dua router. Dengan begitu proses _election_ DR/BDR dilewati, dan adjacency langsung naik ke status **Full**. Pada link `/30` antara dua router, election tidak ada gunanya dan hanya menambah waktu serta lalu lintas.

5. **Area `0.0.0.0`.** Area ini disebut **backbone area**. Aturannya, seluruh area lain wajib terhubung langsung ke Area 0. Jika ada Area 1 dan Area 2, keduanya harus memiliki router perbatasan (ABR) yang juga berada di Area 0. Dua area non-backbone tidak boleh berkomunikasi langsung tanpa melewati backbone.

6. **Router ID.** Bukan masalah. Router ID hanyalah pengenal unik sepanjang 32 bit yang kebetulan ditulis dalam format alamat IP; ia tidak perlu bisa dijangkau dan tidak harus terpasang pada interface mana pun. Fungsinya adalah membedakan router di dalam LSDB dan menjadi penentu saat terjadi seri pada pemilihan DR/BDR. Yang wajib hanyalah keunikannya dalam satu domain OSPF. Pola `1.1.1.1`, `2.2.2.2`, `3.3.3.3` dipakai karena mudah dibaca saat _troubleshooting_.

7. **Jika kedua jalur putus.** R1 kehilangan seluruh jalur menuju `192.168.20.0/24`, sehingga rute tersebut hilang dari tabel routing, bukan sekadar berpindah gateway. Pengguna di PC1 akan melihat ping gagal, dan kali ini disertai pesan yang jelas seperti `Network is unreachable`, karena PC1 memang benar-benar tidak memiliki jalur. Bandingkan dengan Modul 2, ketika ping gagal dalam diam akibat rute balikan yang belum ada. Pesan error yang berbeda menunjukkan jenis masalah yang berbeda pula.
