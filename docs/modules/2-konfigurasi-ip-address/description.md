# Konfigurasi IP Address

Modul ini membahas pengalamatan IPv4 pada perangkat jaringan. Alamat IP statis dipasang pada sebuah router dan sebuah klien agar keduanya berada dalam satu segmen jaringan dan bisa saling berkomunikasi.

**Prasyarat:** Modul ini melanjutkan **Modul 1: Pengenalan CLI**. Navigasi dan perintah dasar CLI sebaiknya sudah dikuasai.

**Tujuan Pembelajaran:**
- Menghitung alamat network, alamat broadcast, jumlah host, dan rentang alamat yang valid dari sebuah prefix.
- Menjelaskan mengapa alamat network dan broadcast tidak bisa dipasang pada perangkat.
- Memasang IP address statis pada interface Linux maupun MikroTik RouterOS, serta mengaktifkan interface yang masih *down*.
- Menguji konektivitas dengan `ping` dan membaca hasilnya untuk menentukan letak masalah.
