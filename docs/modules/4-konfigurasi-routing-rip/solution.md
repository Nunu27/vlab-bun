# Solusi Lab: Konfigurasi Routing RIP

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan dynamic routing RIP pada semua perangkat.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP address**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   /ip address add address=10.10.10.1/30 interface=ether3
   ```

2. **Konfigurasikan RIP instance**
   ```routeros
   /routing rip instance add name=rip-lab redistribute=connected,rip
   ```

3. **Konfigurasikan RIP interface template**
   ```routeros
   /routing rip interface-template add instance=rip-lab interfaces=ether2,ether3
   ```

---

## R2 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP address**
   ```routeros
   /ip address add address=10.10.10.2/30 interface=ether3
   /ip address add address=10.10.20.1/30 interface=ether4
   ```

2. **Konfigurasikan RIP instance**
   ```routeros
   /routing rip instance add name=rip-lab redistribute=connected,rip
   ```

3. **Konfigurasikan RIP interface template**
   ```routeros
   /routing rip interface-template add instance=rip-lab interfaces=ether3,ether4
   ```

---

## R3 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R3**:

1. **Konfigurasikan IP address**
   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether2
   /ip address add address=10.10.20.2/30 interface=ether3
   ```

2. **Konfigurasikan RIP instance**
   ```routeros
   /routing rip instance add name=rip-lab redistribute=connected,rip
   ```

3. **Konfigurasikan RIP interface template**
   ```routeros
   /routing rip interface-template add instance=rip-lab interfaces=ether2,ether3
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

3. **Atur default gateway ke R3**
   ```bash
   sudo ip route add default via 192.168.20.1
   ```

---

## Verifikasi & Pengujian

Setelah menunggu sekitar 30 detik untuk konvergensi RIP, lakukan verifikasi:

1. **Cari rute RIP di R1**
   ```routeros
   /ip route print
   ```
   Pastikan terdapat rute ke `192.168.20.0/24` dengan flag **DAr** (Dynamic, Active, RIP).

2. **Uji koneksi end-to-end dari PC1 ke PC2**
   ```bash
   ping -c 4 192.168.20.2
   ```

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Asal angka hop count.** `10.10.20.0/30` diiklankan langsung oleh R2 kepada R1, sehingga jaraknya satu lompatan. `192.168.20.0/24` awalnya diiklankan R3 kepada R2 dengan hop 1; R2 kemudian meneruskannya kepada R1 sambil menambah metrik menjadi 2. R1 mengetahui jaringan milik R3 tanpa terhubung langsung karena setiap router RIP meneruskan isi tabel rutenya kepada tetangga. Inilah propagasi transitif, dan itulah gunanya nilai `rip` pada `redistribute=connected,rip`.

2. **Yang menggantikan pekerjaan manual.** Pertukaran tabel rute secara berkala antar-tetangga. Setiap router mengirim isi tabelnya setiap 30 detik, dan tetangganya memasukkan rute yang belum dimiliki sambil menambah metrik. Rute balikan yang pada Modul 3 harus ditulis tangan kini terbentuk sendiri, karena pertukaran tersebut berjalan dua arah.

3. **Waktu konvergensi.** Jawaban akan bervariasi, umumnya berkisar antara 30 detik hingga sekitar tiga menit. Penyebabnya adalah RIP tidak mengirim pemberitahuan saat link putus; ia hanya berhenti menerima update. Router baru menandai rute sebagai tidak valid setelah timer *invalid* (sekitar 180 detik) habis, lalu benar-benar menghapusnya setelah timer *flush*. Selama jeda tersebut router masih meneruskan paket ke jalur yang sudah mati.

4. **Dampak bagi pengguna.** Selama masa konvergensi, lalu lintas tetap dikirim ke jalur yang sudah putus, sehingga dari sisi pengguna layanan terasa mati total: aplikasi *timeout*, panggilan terputus, transaksi gagal. Yang membuatnya sulit adalah jaringan tampak "sedang memperbaiki diri" tanpa kepastian kapan selesai, dan tidak ada yang bisa dilakukan operator selain menunggu. Untuk layanan yang kritis, jeda beberapa menit sudah tergolong gangguan serius.

5. **Modem lambat vs fiber optik.** RIP akan memilih **jalur A**, karena RIP hanya menghitung jumlah lompatan dan sama sekali tidak melihat kapasitas link. Akibatnya seluruh lalu lintas dipaksa melewati modem lambat, sementara fiber optik yang jauh lebih cepat dibiarkan menganggur. Keterbatasan inilah yang diperbaiki OSPF dengan metrik *cost* berbasis *bandwidth* pada Modul 5.

6. **Bahaya redistribute tanpa filter.** Router akan mengiklankan semua jaringan yang menempel padanya, termasuk yang seharusnya tidak diketahui pihak luar, misalnya subnet manajemen perangkat, jaringan server internal, atau alamat *loopback*. Pihak lain jadi mengetahui peta jaringan internal perusahaan, dan dalam kasus terburuk memperoleh jalur menuju sistem yang semestinya tertutup. Karena itu di jaringan produksi rute yang diiklankan selalu dipilih secara eksplisit dengan *routing filter*.

7. **Batas 15 hop.** Batas ini adalah pengaman terhadap *routing loop*. Pada distance-vector, sebuah router bisa saja mempelajari rute menuju jaringan yang sudah mati dari tetangganya sendiri, lalu keduanya saling menaikkan metrik tanpa henti (*count to infinity*). Dengan menetapkan 16 sebagai nilai tak terhingga, proses tersebut dijamin berhenti. Jika batasnya dihapus, metrik akan naik terus tanpa ujung dan paket bisa berputar di antara router yang sama sampai TTL-nya habis, sambil membebani jaringan.
