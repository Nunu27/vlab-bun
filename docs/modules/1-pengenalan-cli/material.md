# Pengenalan Command Line Interface (CLI)

## Konsep Dasar CLI
Command Line Interface (CLI) adalah antarmuka teks di mana pengguna berinteraksi dengan sistem menggunakan perintah teks. Di dunia jaringan, CLI lebih disukai daripada Graphical User Interface (GUI) karena sangat efisien, cepat, ringan, dan sangat stabil ketika digunakan untuk *remote access* lewat koneksi dengan *bandwidth* yang sangat rendah (misalnya via SSH atau Telnet).

## Mengapa Administrator Menggunakan CLI?
Meskipun GUI terlihat lebih modern dan mudah digunakan, seorang *Network Engineer* profesional lebih sering berhadapan dengan CLI karena beberapa alasan krusial:
1. **Otomatisasi & Scripting:** Perintah CLI dapat dengan mudah disimpan dalam bentuk teks dan dieksekusi secara otomatis ke ratusan router sekaligus. GUI tidak bisa diotomatisasi semudah itu.
2. **Kecepatan Eksekusi:** Mengetik beberapa baris perintah jauh lebih cepat dibandingkan mencari, mengklik, dan menyimpan pengaturan di berbagai menu GUI.
3. **Detail Error yang Jelas:** Ketika terjadi kesalahan, CLI memberikan pesan *error* tekstual (log) yang sangat spesifik, membuat *troubleshooting* lebih presisi.

## Arsitektur Sistem: Linux vs MikroTik RouterOS
Meskipun sama-sama CLI, kedua sistem operasi ini memiliki filosofi penggunaan yang berbeda:

*   **Linux (Bash Shell):**
    Linux menggunakan filosofi *File System Hierarchy*. Semuanya dianggap sebagai file. Anda menavigasi direktori (folder) menggunakan perintah seperti `cd` dan melihat isi folder menggunakan `ls`. Konfigurasi jaringan biasanya dilakukan dengan mengedit file teks (seperti `/etc/network/interfaces` atau netplan) atau mengeksekusi *binary* langsung seperti `ip`.

*   **MikroTik RouterOS:**
    RouterOS menggunakan filosofi *Menu Hierarchy*. Anda tidak berpindah "folder", melainkan berpindah "menu pengaturan". Jika Anda berada di root `/`, Anda bisa mengetik `ip address` untuk masuk ke sub-menu IP Address. Perintah dalam RouterOS bersifat *Context-Aware*, artinya jika Anda berada di menu `/ip/address`, Anda hanya bisa menjalankan aksi yang relevan dengan IP Address.

## Tips & Trik Eksplorasi (Best Practices)
Banyak pemula merasa terintimidasi karena harus "menghafal" ribuan perintah. Faktanya, Anda tidak perlu menghafal semuanya. Gunakan fitur bantuan bawaan:
*   **Tombol `?` (Tanya):** Tekan tombol tanda tanya kapan saja pada MikroTik untuk melihat daftar perintah atau parameter apa saja yang tersedia di posisi Anda saat ini.
*   **Tombol `Tab` (Auto-Complete):** Jangan mengetik `interface`. Cukup ketik `int` lalu tekan `Tab`, sistem akan melengkapinya secara otomatis. Ini mencegah *typo* (salah ketik) dan mempercepat pekerjaan.

## Referensi Perintah

### Linux (Ubuntu)
- \`whoami\` : Melihat nama user yang sedang aktif digunakan.
- \`pwd\` : (*Print Working Directory*) Melihat lokasi direktori Anda saat ini.
- \`ls -la\` : Menampilkan daftar file secara detail beserta *hidden files* (file tersembunyi yang diawali tanda titik).
- \`uname -a\` : Menampilkan informasi detail mengenai OS dan versi Kernel.

### MikroTik RouterOS
- \`?\` : Menampilkan daftar perintah yang tersedia di direktori saat ini.
- \`..\` : Mundur/naik satu tingkat ke hierarki menu sebelumnya.
- \`/\` : Kembali langsung ke *root* menu (menu teratas).
- \`system resource print\` : Melihat statistik penggunaan sistem (beban CPU, sisa RAM, dan arsitektur perangkat keras keras router).
- \`ip address print\` : Melihat daftar alamat IP yang sedang terpasang pada router.
