# Konfigurasi Routing BGP

Modul ini membahas *Border Gateway Protocol* (BGP), protokol yang menyatukan jaringan-jaringan di seluruh dunia menjadi satu internet. Skenarionya melibatkan tiga *Autonomous System*, dengan satu AS di tengah yang berperan sebagai *transit*, persis seperti cara kerja sebuah ISP. Atribut **AS-Path** diamati langsung: daftar ini terbentuk dan bertambah setiap kali rute berpindah antar-AS.

**Prasyarat:** Modul ini melanjutkan **Modul 5: Konfigurasi Routing OSPF**, karena di sini dibahas perbedaan mendasar antara IGP (di dalam satu organisasi) dan EGP (antar-organisasi).

**Tujuan Pembelajaran:**
- Membedakan peran IGP (di dalam satu organisasi) dan EGP (antar-organisasi).
- Menjelaskan konsep AS, ASN, dan cara atribut AS-Path terbentuk di setiap lompatan AS.
- Mengonfigurasi BGP instance dan sesi eBGP pada RouterOS v7, termasuk peran sebuah *transit AS*.
- Mengiklankan prefix secara eksplisit lewat *address-list*, dan menjelaskan bahaya mengiklankan seluruh jaringan tanpa disaring.
- Memilih protokol yang tepat untuk sebuah situasi, dari static routing sampai BGP.
