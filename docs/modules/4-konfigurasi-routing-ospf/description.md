# Konfigurasi Routing OSPF

Modul ini membahas _Open Shortest Path First_ (OSPF), protokol IGP yang menjadi standar di jaringan perusahaan. Topologinya berbentuk segitiga, sehingga tersedia dua jalur menuju tujuan yang sama: satu jalur pendek tetapi mahal, dan satu jalur lebih panjang tetapi murah. Lab ini membuktikan bahwa OSPF memilih jalur yang lebih panjang, karena yang dihitung adalah _cost_, bukan jumlah lompatan. Inilah perbedaan mendasarnya dengan RIP.

**Prasyarat:** Modul ini melanjutkan **Modul 3: Konfigurasi Routing RIP**, karena pendekatan _distance-vector_ dan _link-state_ dibandingkan secara langsung, termasuk angka konvergensi yang diukur di sana.

**Tujuan Pembelajaran:**

- Menjelaskan cara kerja _link-state_, peran LSDB, dan algoritma Dijkstra.
- Mengonfigurasi OSPF instance, area backbone, dan _interface template_ pada RouterOS v7.
- Mengatur _cost_ sebuah interface, lalu membuktikan pengaruhnya terhadap jalur yang dipilih.
- Membedakan fungsi `type=ptp` dan `passive`, serta menjelaskan kapan masing-masing dipakai.
- Memastikan adjacency mencapai status **Full**, dan mengukur kecepatan konvergensi OSPF untuk dibandingkan dengan RIP.
