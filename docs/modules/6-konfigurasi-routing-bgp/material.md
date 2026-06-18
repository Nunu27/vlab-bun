# Konfigurasi Routing BGP

## Protokol Tulang Punggung Internet
Border Gateway Protocol (BGP) adalah satu-satunya **Exterior Gateway Protocol (EGP)** yang dipakai di dunia nyata. Protokol lain (seperti RIP dan OSPF) adalah IGP (*Interior Gateway Protocol*) yang tugasnya mencari rute di *dalam* jaringan internal.
BGP bertugas mencari rute di *luar* jaringan internal, menghubungkan jaringan ISP lokal menuju ke Google, Meta, atau benua lain. Tanpa BGP, Internet global tidak bisa terjalin.

## Autonomous System Number (ASN)
BGP tidak melihat dunia sebagai kumpulan router individu, melainkan kumpulan domain administrasi raksasa yang disebut **Autonomous System (AS)**.
Setiap domain (AS) dikelola oleh satu organisasi (misal: Telkom Indonesia, Cloudflare, Amazon AWS) dan memiliki nomor identitas global unik yang disebut ASN.
BGP menggunakan mekanisme algoritma **Path-Vector**, yang artinya metrik terbaik dinilai berdasarkan seberapa sedikit ASN yang dilewati oleh lalu lintas data (*AS-Path length*).

## Kategori Peering BGP: eBGP vs iBGP
Karena BGP berjalan menggunakan koneksi TCP port 179 yang harus eksplisit, BGP dibagi menjadi dua sesi:
1. **eBGP (External BGP):** Sesi *peering* (pembentukan sesi koneksi) antara dua router yang memiliki ASN berbeda. Digunakan saat AS Lokal ingin mengambil data rute dari ISP (AS Eksternal).
2. **iBGP (Internal BGP):** Sesi *peering* antar dua router yang masih berada dalam ASN yang sama. Digunakan untuk transfer tabel rute raksasa antar router internal tanpa merubah data ASN.

## Kebijakan Routing (Routing Policy)
BGP tidak mencari jalur tercepat. BGP mencari **jalur teraman secara ekonomi dan politis**. BGP memungkinkan administrator untuk memanipulasi lalu lintas menggunakan atribut (*BGP Attributes*) seperti Local Preference, MED, atau AS-Path Prepend. Administrator dapat mengonfigurasi contoh kebijakan seperti: "Lewat jalur Telkomsel untuk *download*, tapi lewat jalur Indosat untuk *upload*."

## Catatan (Best Practices)

> [!CAUTION] Ancaman Route Leaks (Kebocoran Rute)
> Pada lab ini, kita menggunakan `output.redistribute=connected` agar praktis. Di dunia nyata (ISP), konfigurasi ini **sangat tidak disarankan** jika tanpa *Routing Filter*. Jika Anda me-redistribute semua antarmuka lokal ke BGP tanpa filter, Anda berisiko membocorkan IP privat atau manajemen ke tabel routing global internet.
> 
> **Praktik Produksi (RouterOS v7):** Daripada melakukan *redistribute*, *Network Engineer* biasanya mendefinisikan IP Publik yang mereka miliki secara eksplisit menggunakan fitur *Address List*, lalu memanggilnya pada konfigurasi BGP menggunakan parameter `output.network=<nama-address-list>`. Selain itu, sesi *peering* BGP di dunia nyata selalu diamankan menggunakan autentikasi (MD5).

## Referensi Perintah
### MikroTik RouterOS v7

Pada RouterOS v7, BGP menggunakan dua objek terpisah: *instance* untuk mendefinisikan identitas AS, dan *connection* untuk mengatur setiap sesi *peer*. Pendekatan ini memberikan fleksibilitas ketika satu router perlu menjalankan beberapa sesi BGP dengan identitas yang sama.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membuat BGP Instance | `/routing bgp instance add name=<nama-instance> as=<asn-lokal> router-id=<id-lokal>` | Mendefinisikan identitas AS router. |
| Membangun Koneksi eBGP (Peering) | `/routing bgp connection add name=<nama-koneksi> instance=<nama-instance> local.role=ebgp local.address=<ip-lokal> remote.address=<ip-remote> remote.as=<asn-remote> output.redistribute=connected` | Wajib isi `local.address` agar sesi BGP terikat ke interface yang benar dan tidak flapping. |
| Mengecek Status Sesi BGP | `/routing bgp session print` | Status wajib **Established**. Selain itu = Error. |
| Mengecek Tabel Rute Dinamis | `/ip route print` | Rute BGP berstatus **DAb** (Dynamic, Active, BGP). |
