# Konfigurasi Routing RIP

Modul ini memperkenalkan dasar perutean dinamis menggunakan *Routing Information Protocol* (RIP). Sebagai protokol *Distance Vector*, RIP berbagi informasi tabel rute berdasarkan kalkulasi *hop count*. Modul ini sangat penting untuk memberikan transisi dari manajemen rute manual (*Static*) menuju manajemen rute otomatis yang mendasari infrastruktur modern.

**Prasyarat:** Modul ini merupakan kelanjutan dari **Modul 3: Konfigurasi Static Routing**. Peserta diharapkan telah memahami konsep tabel *routing* dan cara kerja perutean manual sebelum mempelajari perutean dinamis pada modul ini.

**Tujuan Pembelajaran:**
- Memahami prinsip kerja protokol *Distance Vector* dan limitasi *Hop Count*.
- Mengonfigurasi instance RIP dan *Interface Template* pada MikroTik RouterOS.
- Memantau pertukaran tabel rute secara dinamis antar router.
- Melakukan validasi konektivitas lintas jaringan yang dibentuk secara dinamis.
