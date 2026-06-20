# Konfigurasi Routing BGP

Modul ini menyajikan pemahaman *Border Gateway Protocol* (BGP), teknologi *Path Vector* yang menjadi tulang punggung internet global. Fokus pembahasan ditekankan pada konsep *External BGP* (eBGP) dalam skenario tiga AS, termasuk peran *transit AS* sebagai perantara yang meneruskan rute antar-organisasi — model yang mencerminkan cara kerja nyata internet global.

**Tujuan Pembelajaran:**
- Mengidentifikasi perbedaan peran antara *Interior Gateway Protocol* (IGP) dengan BGP (EGP).
- Memahami konsep ASN (*Autonomous System Number*), atribut **AS-Path**, dan mekanisme peering eBGP.
- Mengonfigurasi instance dan sesi eBGP pada router MikroTik dalam skenario *transit AS*.
- Menerapkan injeksi rute secara eksplisit melalui fitur BGP *Network Advertisement* menggunakan *Address List*.
