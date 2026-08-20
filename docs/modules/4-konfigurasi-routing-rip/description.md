# Konfigurasi Routing RIP

Modul ini adalah langkah pertama menuju routing dinamis, dengan *Routing Information Protocol* (RIP). Tidak ada satu rute pun yang ditulis manual, tetapi ketiga router tetap saling mengenal jaringan masing-masing. Di akhir modul ada pengukuran langsung: berapa lama waktu yang dibutuhkan RIP untuk pulih ketika sebuah jalur diputus. Angka itu dibandingkan dengan OSPF pada modul berikutnya.

**Prasyarat:** Modul ini melanjutkan **Modul 3: Konfigurasi Static Routing**. Pahami dahulu konsep tabel rute dan static routing.

**Tujuan Pembelajaran:**
- Menjelaskan cara kerja *distance-vector* dan arti *hop count* sebagai metrik.
- Mengonfigurasi RIP instance dan *interface template* pada RouterOS v7.
- Menelusuri propagasi rute secara transitif, termasuk membaca *hop count* pada rute yang dipelajari lewat perantara.
- Mengukur waktu konvergensi RIP saat terjadi kegagalan link, serta menjelaskan penyebab lambatnya.
- Mengenali keterbatasan RIP: batas 15 hop, update berkala, dan metrik yang mengabaikan *bandwidth*.
