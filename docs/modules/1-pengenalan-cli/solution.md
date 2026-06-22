# Solusi Lab: Pengenalan CLI

Berikut adalah panduan langkah demi langkah untuk menyelesaikan tugas konfigurasi pada Lab Pengenalan CLI.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Ubah Identitas Router**
   ```routeros
   /system identity set name=Lab-R1
   ```

2. **Buat Pengguna Baru**
   ```routeros
   /user add name=siswa password=Lab@12345 group=read
   ```

---

## PC1 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC1**:

1. **Buat Pengguna Baru**
   ```bash
   sudo useradd siswa
   ```
