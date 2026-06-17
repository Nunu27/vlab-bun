# Konfigurasi Routing OSPF

## Konsep Dasar Algoritma Link-State
Open Shortest Path First (OSPF) adalah standar emas untuk *Dynamic Routing* di lingkungan perusahaan (Enterprise). OSPF masuk ke dalam kategori **Link-State Protocol**.
Berbeda dengan RIP yang sekadar menyalin tabel rute tetangga secara pasif, OSPF mengumpulkan informasi detail mengenai status interface (kecepatan, IP, apakah *up/down*) dari *seluruh router* di jaringan melalui paket LSA (*Link-State Advertisement*).
Setiap router menyusun *database* (LSDB) yang identik. Kemudian, setiap router menggunakan algoritma matematika kompleks bernama **Dijkstra (Shortest Path First / SPF)** untuk menggambar peta topologi secara utuh dan menghitung rute terpendek secara mandiri.

## Metrik OSPF: Cost (Biaya Bandwidth)
OSPF sangat cerdas. Protokol ini tidak menghitung jarak berdasarkan "lompatan router" (hop), melainkan menggunakan kalkulasi **Cost**.
*   Jalur dengan bandwidth besar (seperti Gigabit Fiber) akan memiliki *Cost* yang sangat kecil.
*   Jalur lambat (seperti Modem Satelit) akan memiliki *Cost* yang sangat besar.
OSPF selalu memilih rute dengan total *Cost* (akumulasi) terkecil, sehingga lalu lintas selalu melalui jalur tercepat.

## Arsitektur Hierarki: Konsep Area
OSPF didesain untuk menskalakan jaringan hingga ribuan router. Jika ribuan router bertukar data topologi secara konstan, CPU router akan mengalami beban berlebih (*overload*).
Solusinya adalah membagi jaringan menjadi beberapa **Area**.
*   Router hanya perlu mengetahui detail topologi yang berada di dalam area yang sama (Intra-Area). Rute lintas area akan dirangkum oleh router perbatasan (ABR).
*   **Area 0 (Backbone Area):** Semua desain OSPF harus dimulai dari Area 0. Jika membuat Area 1 dan Area 2, keduanya wajib terhubung secara fisik/logis ke Area 0.

## DR & BDR (Designated Router)
Pada jaringan multi-akses (seperti *switch* dengan banyak router terhubung), OSPF mencegah terbentuknya ratusan sesi komunikasi antar router dengan cara melakukan proses *Election*.
*   **Designated Router (DR):** "Ketua Kelas". Semua router hanya melapor (update rute) ke DR.
*   **Backup DR (BDR):** "Wakil Ketua". Mengambil alih jika DR mati.
*   **DROther:** Router biasa yang tidak memenangkan *Election*.

## Status Siklus Adjacency OSPF
Ketika OSPF aktif, router tetangga tidak langsung bertukar tabel routing. Mereka melewati fase "pengenalan" perlahan-lahan:
1. **Down/Init:** Mengirimkan sapaan (*Hello Packet*).
2. **2-Way:** *Election* DR/BDR berlangsung.
3. **ExStart / Exchange:** Menukar ringkasan database topologi.
4. **Loading:** Meminta rincian data topologi yang kurang.
5. **Full:** Sinkronisasi 100% selesai! Tabel rute mulai dikalkulasi. (Target akhir yang selalu diharapkan saat *troubleshooting*).

## Referensi Perintah
### MikroTik RouterOS v7

Pada v7, konfigurasi Area tidak lagi terikat di menu *Instance*, melainkan dipisahkan menjadi hierarki yang lebih modular.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membuat OSPF Instance | `/routing ospf instance add name=<nama-instance> router-id=<ip-id>` | Router wajib punya Router ID unik. |
| Mendefinisikan OSPF Area | `/routing ospf area add name=<nama-area> instance=<nama-instance> area-id=<area-id>` | - |
| Menambahkan Interface WAN ke OSPF | `/routing ospf interface-template add area=<nama-area> interfaces=<interface-wan> type=ptp` | Interface WAN — aktif mengirimkan *Hello Packet*. Parameter `type=ptp` wajib untuk mem-bypass *Election* DR/BDR pada link /30. |
| Menandai Interface LAN sebagai Passive | `/routing ospf interface-template add area=<nama-area> interfaces=<interface-lan> passive=yes` | Interface LAN tidak perlu mengirim *Hello Packet* ke perangkat klien. |
| Memverifikasi Status Adjacency (Wajib) | `/routing ospf neighbor print` | Pastikan state **Full**. |
| Memverifikasi Tabel Rute Dinamis | `/ip route print` | Rute OSPF berstatus **DAo** (Dynamic, Active, OSPF). |
