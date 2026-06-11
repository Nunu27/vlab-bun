# Konfigurasi Routing OSPF

## Konsep Dasar Algoritma Link-State
Open Shortest Path First (OSPF) adalah standar emas untuk *Dynamic Routing* di lingkungan perusahaan (Enterprise). OSPF masuk ke dalam kategori **Link-State Protocol**.
Berbeda dengan RIP yang "menyontek" tabel rute tetangga secara buta, OSPF mengumpulkan informasi detail mengenai status interface (kecepatan, IP, apakah *up/down*) dari *seluruh router* di jaringan melalui paket LSA (*Link-State Advertisement*).
Setiap router menyusun *database* (LSDB) yang identik. Kemudian, setiap router menggunakan algoritma matematika kompleks bernama **Dijkstra (Shortest Path First / SPF)** untuk menggambar peta topologi secara utuh dan menghitung rute terpendek secara mandiri.

## Metrik OSPF: Cost (Biaya Bandwidth)
OSPF sangat cerdas. Ia tidak menghitung jarak berdasarkan "lompatan router" (hop), melainkan menggunakan kalkulasi **Cost**.
*   Jalur dengan bandwidth besar (seperti Gigabit Fiber) akan memiliki *Cost* yang sangat kecil.
*   Jalur lambat (seperti Modem Satelit) akan memiliki *Cost* yang sangat besar.
OSPF selalu memilih rute dengan total *Cost* (akumulasi) terkecil, sehingga lalu lintas selalu melalui jalur tercepat.

## Arsitektur Hierarki: Konsep Area
OSPF didesain untuk menskalakan jaringan hingga ribuan router. Jika ribuan router bertukar data topologi secara konstan, CPU router akan jebol.
Solusinya adalah membagi jaringan menjadi beberapa **Area**.
*   Router hanya perlu mengetahui detail topologi yang berada di dalam area yang sama (Intra-Area). Rute lintas area akan dirangkum oleh router perbatasan (ABR).
*   **Area 0 (Backbone Area):** Semua desain OSPF harus dimulai dari Area 0. Jika Anda membuat Area 1 dan Area 2, keduanya wajib terhubung secara fisik/logis ke Area 0.

## DR & BDR (Designated Router)
Pada jaringan multi-akses (seperti *switch* dengan banyak router terhubung), OSPF mencegah terbentuknya ratusan sesi komunikasi antar router dengan cara melakukan "Pemilu" (Election).
*   **Designated Router (DR):** "Ketua Kelas". Semua router hanya melapor (update rute) ke DR.
*   **Backup DR (BDR):** "Wakil Ketua". Mengambil alih jika DR mati.
*   **DROther:** Router biasa yang tidak menang pemilu.

## Status Siklus Adjacency OSPF
Ketika OSPF aktif, router tetangga tidak langsung bertukar tabel routing. Mereka melewati fase "pengenalan" perlahan-lahan:
1. **Down/Init:** Mengirimkan sapaan (*Hello Packet*).
2. **2-Way:** Pemilu DR/BDR berlangsung.
3. **ExStart / Exchange:** Menukar ringkasan database topologi.
4. **Loading:** Meminta rincian data topologi yang kurang.
5. **Full:** Sinkronisasi 100% selesai! Tabel rute mulai dikalkulasi. (Target akhir yang selalu Anda harapkan saat *troubleshooting*).

## Referensi Perintah

### MikroTik RouterOS v7
Pada v7, konfigurasi Area tidak lagi terikat di menu *Instance*, melainkan dipisahkan menjadi hierarki yang lebih modular.

- **Membuat OSPF Instance:**
  \`/routing ospf instance add name=<nama-instance> router-id=<ip-id>\`
  *(Setiap router wajib memiliki pengenal identitas unik bernama Router ID).*
- **Mendefinisikan OSPF Area (Backbone):**
  \`/routing ospf area add name=<nama-area> instance=<nama-instance> area-id=<area-id>\`
- **Memasukkan Interface ke OSPF Area:**
  \`/routing ospf interface-template add area=<nama-area> interfaces=<daftar-interface>\`
  *(Menentukan port mana saja yang menyiarkan Hello Packet dan IP mana saja yang dimasukkan ke topologi OSPF).*
- **Verifikasi Status Adjacency (Wajib):**
  \`/routing ospf neighbor print\`
  *(Pastikan kolom state bernilai **Full**).*
- **Verifikasi Tabel Rute Dinamis:**
  \`/ip route print\`
  *(Rute jarak jauh yang dihitung OSPF akan ditandai dengan flag **Do** (Dynamic, OSPF)).*
