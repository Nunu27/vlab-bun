# Solusi Lab: Konfigurasi IP Address

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address secara statis pada kedua perangkat.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP address pada ether2**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   ```

2. **Verifikasi konfigurasi**
   ```routeros
   /ip address print
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

3. **Verifikasi konfigurasi**
   ```bash
   ip addr show eth1
   ```

4. **Uji koneksi ke R1**
   ```bash
   ping -c 4 192.168.10.1
   ```

---

## Kunci Jawaban Pertanyaan Pemahaman

> Bagian ini untuk pengajar. Pertanyaannya ada di `questions.md`.

1. **Perhitungan `192.168.10.0/24`.** Prefix /24 menyisakan 32 − 24 = 8 bit untuk host, sehingga ada 2^8 = 256 alamat. Alamat network `192.168.10.0`, alamat broadcast `192.168.10.255`, jumlah host yang bisa dipakai 2^8 − 2 = **254**, dengan rentang `192.168.10.1` sampai `192.168.10.254`. Karena itu host pertama adalah `.1` (dipasang di R1) dan host kedua adalah `.2` (dipasang di PC1).

2. **Alamat network dan broadcast.** `192.168.10.0` memiliki seluruh bit Host ID bernilai 0, sehingga dipakai untuk menamai jaringannya sendiri. `192.168.10.255` memiliki seluruh bit Host ID bernilai 1, dan paket yang dikirim ke sana akan diterima oleh semua perangkat di segmen tersebut. Keduanya sudah memiliki arti khusus, jadi tidak boleh dipakai sebagai identitas satu perangkat.

3. **Urutan mengaktifkan interface.** Alamat tetap tersimpan di dalam konfigurasi, tetapi tidak aktif selama interface masih *down*. RouterOS menandainya dengan flag `I` (*Invalid*) untuk menunjukkan bahwa entri tersebut ada tetapi belum berlaku. Di Linux, `ip addr show` akan tetap menampilkan alamatnya, namun `state DOWN` dan ping tidak akan berhasil. Jadi urutannya boleh dibalik, asalkan interface pada akhirnya diaktifkan.

4. **Perhitungan `172.16.5.0/28`.** Sisa bit host adalah 32 − 28 = 4, sehingga ada 2^4 = 16 alamat. Jumlah host yang bisa dipakai 2^4 − 2 = **14**, rentangnya `172.16.5.1` sampai `172.16.5.14`, dan alamat broadcast-nya adalah **`172.16.5.15`**.

5. **Ping ke `192.168.10.200`.** Alamat tersebut masih berada di dalam segmen lokal PC1, sehingga PC1 tidak menganggapnya "tidak terjangkau" melainkan mencoba mencari perangkatnya lewat ARP. Karena tidak ada yang menjawab, hasilnya adalah `Destination Host Unreachable` atau ping habis waktu dengan `100% packet loss`. Masalahnya ada di sisi tujuan (tidak ada perangkat dengan alamat tersebut), bukan di sisi PC1. Bandingkan dengan `Network is unreachable`, yang justru menandakan PC1 sendiri tidak tahu jalur menuju tujuan.

6. **Subnet mask yang tidak seragam.** Pada kasus ini keduanya **masih bisa saling ping**. PC1 dengan `/25` menganggap jaringannya `192.168.10.0/25` (rentang `.1`–`.126`), dan R1 di `.1` termasuk di dalamnya. R1 dengan `/24` juga menganggap `.2` sebagai tetangga lokal. Masalah baru muncul jika ada perangkat di atas `.126`: R1 akan menganggapnya satu segmen, sedangkan PC1 akan menganggapnya jaringan lain dan mengirimkannya ke *gateway*. Inilah sebabnya subnet mask harus seragam dalam satu segmen, meskipun kesalahannya tidak selalu langsung terlihat.
