# Konfigurasi Routing BGP

## Protokol Tulang Punggung Internet
Border Gateway Protocol (BGP) adalah satu-satunya **Exterior Gateway Protocol (EGP)** yang dipakai di dunia nyata. Protokol lain (seperti RIP dan OSPF) adalah IGP (*Interior Gateway Protocol*) yang tugasnya mencari rute di *dalam* jaringan internal.
BGP bertugas mencari rute di *luar* jaringan internal, menghubungkan jaringan ISP lokal menuju ke Google, Meta, atau benua lain. Tanpa BGP, Internet global tidak bisa terjalin.

## Autonomous System Number (ASN)
BGP tidak melihat dunia sebagai kumpulan router individu, melainkan kumpulan domain administrasi raksasa yang disebut **Autonomous System (AS)**.
Setiap domain (AS) dikelola oleh satu organisasi (misal: Telkom Indonesia, Cloudflare, Amazon AWS) dan memiliki nomor identitas global unik yang disebut ASN.
BGP menggunakan mekanisme algoritma **Path-Vector**, yang artinya metrik terbaik dinilai berdasarkan seberapa sedikit ASN yang dilewati oleh lalu lintas data (*AS-Path length*).

## Atribut AS-Path

Setiap kali sebuah rute berpindah melewati satu AS, nomor AS tersebut ditambahkan ke dalam daftar yang disebut **AS-Path**. Daftar ini bersifat kumulatif dan terus bertambah di setiap lompatan AS.

Contoh: jika rute `192.0.2.0/24` milik **AS 65001** melewati **AS 65000** (transit) sebelum sampai ke **AS 65002**, maka router di AS 65002 akan menerima rute tersebut dengan:

```
AS-PATH: 65000 65001
```

Ini berarti paket dari AS 65002 menuju `192.0.2.0/24` akan melalui AS 65000 terlebih dahulu. Anda dapat mengamati atribut ini secara langsung pada output `/ip route print detail` setelah sesi BGP terbentuk.

## Kategori Peering BGP: eBGP vs iBGP
Karena BGP berjalan menggunakan koneksi TCP port 179 yang harus eksplisit, BGP dibagi menjadi dua sesi:
1. **eBGP (External BGP):** Sesi *peering* antara dua router yang memiliki ASN berbeda. Digunakan saat AS Lokal ingin bertukar rute dengan ISP atau AS lain. Ini yang akan dipraktikkan pada lab ini.
2. **iBGP (Internal BGP):** Sesi *peering* antar dua router dalam ASN yang sama. Digunakan saat sebuah AS memiliki lebih dari satu *border router* yang perlu berbagi tabel rute BGP secara internal tanpa mengubah atribut AS-Path. Konfigurasi iBGP berada di luar cakupan lab ini.

## Kebijakan Routing (Routing Policy)
BGP tidak mencari jalur tercepat. BGP memilih jalur berdasarkan ***routing policy*** — hubungan bisnis antar-AS dan prioritas yang ditetapkan administrator, bukan performa teknis semata. BGP memungkinkan administrator memanipulasi traffic menggunakan *BGP Attributes* seperti Local Preference, MED, atau AS-Path Prepend. Contoh: "Gunakan jalur Telkomsel untuk *download*, tapi jalur Indosat untuk *upload*." Konfigurasi *Routing Policy* berada di luar cakupan lab ini — namun memahami bahwa BGP beroperasi atas dasar *policy* dan bukan sekadar metrik numerik adalah fondasi penting sebelum mempelajarinya lebih lanjut.

## Catatan (Best Practices)

> **Perhatian — Bahaya `output.redistribute=connected`:** Kesalahan umum pemula adalah menggunakan `output.redistribute=connected` pada koneksi BGP karena terlihat lebih singkat. Konfigurasi ini **sangat tidak disarankan** di jaringan produksi karena router akan mengiklankan *seluruh* alamat IP yang terpasang ke jaringan BGP — termasuk IP manajemen, IP loopback, dan subnet internal yang seharusnya tidak diketahui publik. Selalu gunakan `output.network` dengan *Address List* yang eksplisit, seperti yang dipraktikkan pada lab ini. Selain itu, sesi *peering* BGP di jaringan produksi selalu diamankan menggunakan autentikasi (MD5).

## Referensi Perintah
### MikroTik RouterOS v7

Pada RouterOS v7, BGP menggunakan dua objek terpisah: *instance* untuk mendefinisikan identitas AS, dan *connection* untuk mengatur setiap sesi *peer*. Pendekatan ini memberikan fleksibilitas ketika satu router perlu menjalankan beberapa sesi BGP dengan identitas yang sama.

| Aksi / Fungsi | Perintah | Keterangan |
|---|---|---|
| Mendefinisikan Prefix yang Diiklankan | `/ip firewall address-list add list=<nama-list> address=<prefix/length>` | Daftarkan blok IP milik AS ini secara eksplisit sebelum diiklankan via BGP. |
| Membuat BGP Instance | `/routing bgp instance add name=<nama-instance> as=<asn-lokal> router-id=<id-lokal>` | Mendefinisikan identitas AS router. |
| Membangun Koneksi eBGP (Peering) | `/routing bgp connection add name=<nama-koneksi> instance=<nama-instance> local.role=ebgp local.address=<ip-lokal> remote.address=<ip-remote> remote.as=<asn-remote> output.network=<nama-list>` | Wajib isi `local.address` agar sesi BGP terikat ke interface yang benar. Parameter `output.network` mengacu pada *address-list* berisi prefix yang diizinkan diiklankan. Transit AS yang tidak mengiklankan prefix miliknya sendiri tidak perlu parameter ini. |
| Mengecek Status Sesi BGP | `/routing bgp session print` | Status wajib **Established**. Selain itu = Error. |
| Mengecek Tabel Rute Dinamis | `/ip route print detail` | Rute BGP berstatus **DAb** (Dynamic, Active, BGP). Gunakan `detail` untuk melihat atribut **AS-PATH** pada setiap rute. |

> **Catatan Troubleshooting:** Sesi BGP beroperasi melalui koneksi **TCP port 179**. Jika status sesi tidak mencapai *Established*, pastikan tidak ada aturan *firewall* yang memblokir port tersebut. Pada RouterOS, periksa dengan `/ip firewall filter print` dan `/ip firewall connection print`.
