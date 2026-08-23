# Konfigurasi Routing OSPF

Modul ini membahas *Open Shortest Path First* (OSPF), protokol IGP yang menjadi standar di jaringan perusahaan. Topologinya berbentuk segitiga, sehingga tersedia dua jalur menuju tujuan yang sama: satu jalur pendek tetapi mahal, dan satu jalur lebih panjang tetapi murah. Lab ini membuktikan bahwa OSPF memilih jalur yang lebih panjang, karena yang dihitung adalah *cost*, bukan jumlah lompatan. Inilah perbedaan mendasarnya dengan RIP.

**Prasyarat:** Modul ini melanjutkan **Modul 3: Konfigurasi Routing RIP**, karena pendekatan *distance-vector* dan *link-state* dibandingkan secara langsung, termasuk angka konvergensi yang diukur di sana.

**Tujuan Pembelajaran:**
- Menjelaskan cara kerja *link-state*, peran LSDB, dan algoritma Dijkstra.
- Mengonfigurasi OSPF instance, area backbone, dan *interface template* pada RouterOS v7.
- Mengatur *cost* sebuah interface, lalu membuktikan pengaruhnya terhadap jalur yang dipilih.
- Membedakan fungsi `type=ptp` dan `passive=yes`, serta menjelaskan kapan masing-masing dipakai.
- Memastikan adjacency mencapai status **Full**, dan mengukur kecepatan konvergensi OSPF untuk dibandingkan dengan RIP.
