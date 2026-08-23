# Eksplorasi CLI, Pengalamatan IP, dan Layanan Jaringan (DNS & DHCP)

Modul ini merupakan titik awal dari seluruh rangkaian praktikum jaringan. Modul dimulai dengan pengenalan *Command Line Interface* (CLI) pada shell Linux dan menu RouterOS, dilanjutkan dengan konfigurasi awal pada router baru (hostname, banner, user, dan penonaktifan layanan yang tidak aman), kemudian pengalamatan IPv4 secara statis agar dua perangkat dapat saling berkomunikasi. Setelah dasar-dasar tersebut dikuasai, pembahasan dilanjutkan ke dua layanan jaringan yang menopang hampir seluruh aktivitas sehari-hari, yaitu DNS yang menerjemahkan nama menjadi alamat IP, dan DHCP yang membuat pemberian alamat IP beserta konfigurasinya berjalan secara otomatis.

**Tujuan Pembelajaran:**
- Menjelaskan perbedaan cara kerja antara shell Linux (*File System Hierarchy*) dan RouterOS (*Menu Hierarchy*).
- Menavigasi direktori dan menu melalui CLI, serta memanfaatkan `Tab` untuk mempercepat pekerjaan.
- Membaca informasi dasar sistem: user aktif, proses yang berjalan, dan spesifikasi perangkat.
- Mengubah hostname router dan memasang banner MOTD sebagai pesan sambutan saat login.
- Menambahkan user baru beserta password dan hak aksesnya, sesuai prinsip *least privilege*.
- Mematikan layanan yang tidak aman (Telnet, FTP) dan menjelaskan alasannya.
- Menjelaskan fungsi Safe Mode dan alasan SSH lebih aman daripada Telnet.
- Menghitung alamat network, alamat broadcast, jumlah host, dan rentang alamat yang valid dari sebuah prefix.
- Menjelaskan mengapa alamat network dan broadcast tidak bisa dipasang pada perangkat.
- Memasang IP address statis pada interface Linux maupun MikroTik RouterOS, serta memastikan interface tersebut aktif sebelum dipakai.
- Mengatur default gateway pada klien Linux dan menjelaskan fungsinya.
- Menguji konektivitas dengan `ping` dan membaca hasilnya untuk menentukan letak masalah.
- Menjelaskan fungsi DNS dan mengapa jaringan tetap membutuhkannya meskipun alamat IP sudah terpasang.
- Mengonfigurasi router sebagai resolver DNS menggunakan entri statis dan opsi `allow-remote-requests`.
- Mengarahkan klien Linux ke sebuah DNS server dan menguji resolusi nama dengan `nslookup`/`ping`.
- Menjelaskan masalah yang diselesaikan DHCP dibandingkan pengalamatan statis manual.
- Mengonfigurasi DHCP server pada MikroTik RouterOS, meliputi address pool, DHCP server, dan network (termasuk opsi gateway dan DNS server).
- Meminta dan memverifikasi alamat IP otomatis pada klien Linux sebagai DHCP client.
