# Pengenalan Command Line Interface (CLI)

## Konsep Dasar CLI
Command Line Interface (CLI) adalah antarmuka teks di mana pengguna berinteraksi dengan sistem menggunakan perintah teks. Di dunia jaringan, CLI lebih disukai daripada Graphical User Interface (GUI) karena sangat efisien, cepat, ringan, dan sangat stabil ketika digunakan untuk *remote access* lewat koneksi dengan *bandwidth* yang sangat rendah (misalnya via SSH). Hindari penggunaan Telnet karena protokol ini mengirimkan seluruh data — termasuk *password* — dalam bentuk teks mentah yang bisa disadap.

## Mengapa Administrator Menggunakan CLI?
Meskipun GUI terlihat lebih modern dan mudah digunakan, seorang *Network Engineer* profesional lebih sering berhadapan dengan CLI karena beberapa alasan krusial:
1. **Otomatisasi & Scripting:** Perintah CLI dapat dengan mudah disimpan dalam bentuk teks dan dieksekusi secara otomatis ke ratusan router sekaligus. GUI tidak bisa diotomatisasi semudah itu.
2. **Kecepatan Eksekusi:** Mengetik beberapa baris perintah jauh lebih cepat dibandingkan mencari, mengklik, dan menyimpan pengaturan di berbagai menu GUI.
3. **Detail Error yang Jelas:** Ketika terjadi kesalahan, CLI memberikan pesan *error* tekstual (log) yang sangat spesifik, membuat *troubleshooting* lebih presisi.

## Arsitektur Sistem: Linux vs MikroTik RouterOS
Meskipun sama-sama CLI, kedua sistem operasi ini memiliki filosofi penggunaan yang berbeda:

*   **Linux (Bash Shell):**
    Linux menggunakan filosofi *File System Hierarchy*. Semuanya dianggap sebagai file. Direktori (folder) dikelola menggunakan perintah seperti `cd` dan isinya dilihat dengan `ls`. Konfigurasi jaringan biasanya dilakukan dengan mengedit file teks (seperti `/etc/network/interfaces` atau netplan) atau mengeksekusi *binary* langsung seperti `ip`.

*   **MikroTik RouterOS:**
    RouterOS menggunakan filosofi *Menu Hierarchy*. Sistem ini tidak menggunakan perpindahan "folder", melainkan perpindahan "menu pengaturan". Pada root `/`, perintah `ip address` akan membuka sub-menu IP. Perintah dalam RouterOS bersifat *Context-Aware*, artinya pada menu `/ip/address`, aksi yang dieksekusi hanya relevan dengan menu IP.

## Tips & Trik Eksplorasi (Best Practices)
Banyak pemula merasa terintimidasi karena harus "menghafal" ribuan perintah. Faktanya, menghafal seluruh perintah tidaklah perlu. Gunakan fitur bantuan bawaan:
*   **Tombol `?` (Tanya):** Tekan tombol tanda tanya kapan saja pada MikroTik untuk melihat daftar perintah atau parameter apa saja yang tersedia di posisi saat ini.
*   **Tombol `Tab` (Auto-Complete):** Jangan mengetik `interface`. Cukup ketik `int` lalu tekan `Tab`, sistem akan melengkapinya secara otomatis. Ini mencegah *typo* (salah ketik) dan mempercepat pekerjaan.
*   **Safe Mode (`CTRL + X`):** Fitur penyelamat paling krusial! Tekan `CTRL + X` sebelum melakukan perubahan berisiko. Jika koneksi Anda terputus (misal karena salah konfigurasi IP), router akan otomatis membatalkan (*rollback*) perubahan tersebut. Tekan `CTRL + X` lagi untuk menyimpan perubahan secara permanen.

## Referensi Perintah
### Linux (Ubuntu)

| Perintah | Keterangan |
|---|---|
| `whoami` | Mengecek nama user aktif. |
| `pwd` | (*Print Working Directory*) Mengecek lokasi direktori saat ini. |
| `ls -la` | Menampilkan file detail & hidden files. |
| `uname -a` | Menampilkan info OS & Kernel. |
| `ps aux` | Menampilkan seluruh proses yang sedang berjalan di sistem. |
| `useradd <nama>` | Membuat akun pengguna baru pada sistem. |

### MikroTik RouterOS

| Perintah | Keterangan |
|---|---|
| `?` | Menampilkan perintah tersedia. |
| `..` | Kembali 1 tingkat menu. |
| `/` | Kembali ke root menu. |
| `system resource print` | Mengecek statistik sistem (CPU, RAM). |
| `ip address print` | Mengecek daftar IP router. |
| `system identity set name=<name>` | Mengubah nama/identitas dari router. |
| `user add name=<nama>` | Menambahkan akun pengguna baru. |
| `interface print` | Mengecek daftar antarmuka (interface) yang tersedia. |
| `/export` | Menampilkan seluruh konfigurasi router dalam format teks (skrip). |
