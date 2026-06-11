# Konfigurasi Routing BGP

## Protokol Tulang Punggung Internet
Border Gateway Protocol (BGP) adalah satu-satunya **Exterior Gateway Protocol (EGP)** yang dipakai di dunia nyata. Protokol lain (seperti RIP dan OSPF) adalah IGP (*Interior Gateway Protocol*) yang tugasnya mencari jalan di *dalam* gedung kantor.
BGP bertugas mencari jalan di *luar* gedung, menghubungkan jaringan ISP lokal menuju ke Google, Meta, atau benua lain. Tanpa BGP, Internet global tidak bisa terjalin.

## Autonomous System Number (ASN)
BGP tidak melihat dunia sebagai kumpulan router individu, melainkan kumpulan "Kerajaan" raksasa yang disebut **Autonomous System (AS)**.
Setiap kerajaan dikelola oleh satu organisasi (misal: Telkom Indonesia, Cloudflare, Amazon AWS) dan memiliki nomor identitas global unik yang disebut ASN.
BGP menggunakan mekanisme algoritma **Path-Vector**, yang artinya metrik terbaik dinilai berdasarkan seberapa sedikit ASN / Kerajaan yang dilewati oleh lalu lintas data (*AS-Path length*).

## Kategori Peering BGP: eBGP vs iBGP
Karena BGP berjalan menggunakan koneksi TCP port 179 yang harus eksplisit, BGP dibagi menjadi dua sesi:
1. **eBGP (External BGP):** Sesi *peering* (koneksi bersalaman) antara dua router yang memiliki ASN berbeda. Digunakan saat AS Lokal ingin mengambil data rute dari ISP (AS Eksternal).
2. **iBGP (Internal BGP):** Sesi *peering* antar dua router yang masih berada dalam ASN yang sama. Digunakan untuk transfer tabel rute raksasa antar router internal tanpa merubah data ASN.

## Kebijakan Routing (Routing Policy)
BGP tidak mencari jalur tercepat. BGP mencari **jalur teraman secara ekonomi dan politis**. BGP memungkinkan administrator untuk memanipulasi lalu lintas menggunakan atribut (*BGP Attributes*) seperti Local Preference, MED, atau AS-Path Prepend. Administrator dapat mengonfigurasi contoh kebijakan seperti: "Lewat jalur Telkomsel untuk *download*, tapi lewat jalur Indosat untuk *upload*."

## Referensi Perintah
### MikroTik RouterOS v7

Pada versi lawas, *instance* harus didefinisikan secara terpisah dari *peer*. Di versi 7, BGP sangat disederhanakan dengan menyatukan semuanya ke dalam sub-menu `connection`.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Membangun Koneksi eBGP (Peering) | `/routing bgp connection add name=<nama-koneksi> local.role=ebgp local.address=<ip-lokal> remote.address=<ip-remote> remote.as=<asn-remote> as=<asn-lokal> router-id=<id-lokal>` | Identifikasi *local* & *remote peer* secara tegas. |
| Mengumumkan (Advertise) Network | `/routing bgp network add network=<prefix-lokal>` | Wajib inject network yang akan disebar (advertise). |
| Mengecek Status Sesi BGP | `/routing bgp session print` | Status wajib **Established**. Selain itu = Error. |
| Mengecek Tabel Rute Dinamis | `/ip route print` | Rute BGP berstatus **Db** (Dynamic, BGP). |
