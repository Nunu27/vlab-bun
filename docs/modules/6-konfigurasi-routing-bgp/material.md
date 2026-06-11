# Konfigurasi Routing BGP

## Protokol Tulang Punggung Internet
Border Gateway Protocol (BGP) adalah satu-satunya **Exterior Gateway Protocol (EGP)** yang dipakai di dunia nyata. Protokol lain (seperti RIP dan OSPF) adalah IGP (*Interior Gateway Protocol*) yang tugasnya mencari jalan di *dalam* gedung kantor Anda.
BGP bertugas mencari jalan di *luar* gedung, menghubungkan jaringan ISP lokal Anda menuju ke Google, Meta, atau benua lain. Tanpa BGP, Internet global tidak bisa terjalin.

## Autonomous System Number (ASN)
BGP tidak melihat dunia sebagai kumpulan router individu, melainkan kumpulan "Kerajaan" raksasa yang disebut **Autonomous System (AS)**.
Setiap kerajaan dikelola oleh satu organisasi (misal: Telkom Indonesia, Cloudflare, Amazon AWS) dan memiliki nomor identitas global unik yang disebut ASN.
BGP menggunakan mekanisme algoritma **Path-Vector**, yang artinya metrik terbaik dinilai berdasarkan seberapa sedikit ASN / Kerajaan yang dilewati oleh lalu lintas data (*AS-Path length*).

## Kategori Peering BGP: eBGP vs iBGP
Karena BGP berjalan menggunakan koneksi TCP port 179 yang harus eksplisit, BGP dibagi menjadi dua sesi:
1. **eBGP (External BGP):** Sesi *peering* (koneksi bersalaman) antara dua router yang memiliki ASN berbeda. Digunakan saat Anda (AS Lokal) ingin mengambil data rute dari ISP (AS Eksternal).
2. **iBGP (Internal BGP):** Sesi *peering* antar dua router yang masih berada dalam ASN yang sama. Digunakan oleh ISP untuk mentransfer tabel rute raksasa dari router ujung utara ke router ujung selatan tanpa merubah data ASN.

## Kebijakan Routing (Routing Policy)
BGP tidak mencari jalur tercepat. BGP mencari **jalur teraman secara ekonomi dan politis**. BGP memungkinkan administrator untuk memanipulasi lalu lintas menggunakan atribut (*BGP Attributes*) seperti Local Preference, MED, atau AS-Path Prepend. Anda bisa menyeting: "Lewat jalur Telkomsel untuk *download*, tapi lewat jalur Indosat untuk *upload*."

## Referensi Perintah

### MikroTik RouterOS v7
Pada versi lawas, Anda harus mendefinisikan *instance* terpisah dari *peer*. Di versi 7, BGP sangat disederhanakan dengan menyatukan semuanya ke dalam sub-menu `connection`.

- **Membangun Koneksi eBGP (Peering):**
  \`/routing bgp connection add name=<nama-koneksi> local.role=ebgp local.address=<ip-lokal> remote.address=<ip-remote> remote.as=<asn-remote> as=<asn-lokal> router-id=<id-lokal>\`
  *(Perintah ini mendefinisikan dengan pasti siapa kita (IP Lokal, AS Lokal) dan dengan siapa kita akan berinteraksi (IP Remote, AS Remote)).*
- **Mengumumkan (Advertise) Network Lokal Secara Spesifik:**
  \`/routing bgp network add network=<prefix-lokal>\`
  *(BGP tidak secara otomatis membocorkan rute Anda. Anda HARUS menginjeksikan IP mana saja yang boleh diketahui oleh dunia luar melalui perintah ini).*
- **Melihat Status Sesi TCP BGP:**
  \`/routing bgp session print\`
  *(Ini adalah perintah mutlak untuk troubleshooting. Status harus menunjukkan **Established**. Jika berstatus 'Active', 'Connect', atau 'Idle', artinya ada masalah IP Address atau Firewal antara kedua belah pihak).*
- **Melihat Tabel Rute Dinamis:**
  \`/ip route print\`
  *(Rute yang berhasil diimpor dari pertukaran BGP memiliki *flag* spesifik **Db** (Dynamic, BGP)).*
