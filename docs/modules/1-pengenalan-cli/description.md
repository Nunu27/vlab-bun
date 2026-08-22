# Pengenalan Command Line Interface (CLI)

Modul ini mengenalkan *Command Line Interface* (CLI) sebagai cara utama mengelola perangkat jaringan. Ada dua lingkungan yang dijelajahi, yaitu shell Linux pada PC dan menu RouterOS pada router MikroTik. Setelah itu dilanjutkan dengan konfigurasi awal yang selalu dikerjakan pada router baru: memberi hostname, memasang banner MOTD, membuat user dengan hak akses terbatas, dan mematikan layanan yang tidak aman.

**Tujuan Pembelajaran:**
- Menjelaskan perbedaan cara kerja antara shell Linux (*File System Hierarchy*) dan RouterOS (*Menu Hierarchy*).
- Menavigasi direktori dan menu melalui CLI, serta memanfaatkan `Tab` untuk mempercepat pekerjaan.
- Membaca informasi dasar sistem: user aktif, proses yang berjalan, dan spesifikasi perangkat.
- Mengubah hostname router dan memasang banner MOTD sebagai pesan sambutan saat login.
- Menambahkan user baru beserta password dan hak aksesnya, sesuai prinsip *least privilege*.
- Mematikan layanan yang tidak aman (Telnet, FTP) dan menjelaskan alasannya.
- Menjelaskan fungsi Safe Mode dan alasan SSH lebih aman daripada Telnet.
