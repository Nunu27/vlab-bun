# Konfigurasi Routing OSPF

Modul ini mengupas protokol *Open Shortest Path First* (OSPF), standar industri untuk perutean internal (IGP) berskala enterprise. Dibandingkan RIP, OSPF lebih cerdas karena menggunakan algoritma *Link-State* (Dijkstra) yang mempertimbangkan bandwidth sebagai metrik, dan mendukung struktur hierarkis (*Areas*).

**Prasyarat:** Peserta diharapkan telah menyelesaikan **Modul 4: Konfigurasi Routing RIP** untuk memahami dasar *routing* dinamis, karena modul ini akan membandingkan pendekatan *Distance Vector* pada RIP dengan pendekatan *Link-State* pada OSPF.

**Tujuan Pembelajaran:**
- Memahami arsitektur *Link-State*, Konsep Area, dan *Router ID*.
- Mengonfigurasi parameter *OSPF Instance* dan *Area Backbone* secara benar pada RouterOS.
- Memvalidasi pembentukan status *Neighbor/Adjacency* antar router OSPF.
- Memastikan konvergensi rute secara mulus dalam skenario kegagalan konektivitas parsial.
