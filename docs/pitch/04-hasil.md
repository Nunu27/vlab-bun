# Hasil

Semua angka di bagian ini bersumber dari pengujian *end-to-end* dan UAT yang didokumentasikan di `buku/chapters/bab5`.

## Efisiensi Penyimpanan: Container vs. VM

Salah satu keunggulan teknis utama vLab adalah efisiensi penyimpanan yang jauh lebih baik dibandingkan pendekatan VM konvensional.

Satu image MikroTik CHR dalam format VM (`chr-7.x.qcow2`) berukuran **~128 MB per instance**. Dengan vLab, berkat mekanisme *overlay filesystem* Docker (shared base image), setiap container tambahan hanya memerlukan penyimpanan untuk lapisan perubahan (*writable layer*) — bukan salinan penuh image.

![Pertumbuhan storage seiring bertambahnya pengguna aktif](../../../buku/assets/storage_usage.png)

*Grafik di atas menunjukkan storage yang digunakan saat sesi lab aktif berjalan bertahap dari 5 hingga 20 pengguna. Pertumbuhan bersifat linear dan sangat ringan.*

### Perbandingan Storage: Container (vLab) vs. VM Konvensional

| Jumlah Instance | VM Konvensional (QCOW2/instance) | Container vLab (overlay) | Penghematan |
|---|---|---|---|
| 5 | ~640 MB | ~22,3 MiB | **~97%** |
| 10 | ~1.280 MB | ~45,8 MiB | **~96%** |
| 15 | ~1.920 MB | ~65,7 MiB | **~97%** |
| 20 | ~2.560 MB | ~92,9 MiB | **~96%** |
| 40 | ~5.120 MB | ~93 MiB* | **~98%** |

*\*Karena overlay filesystem berbagi base image yang ter-cache, storage tidak tumbuh secara linear setelah sejumlah container aktif.*

> **Implikasi praktis:** Sebuah server dengan penyimpanan 500 GB dapat menjalankan ribuan sesi container secara bergilir — dibandingkan hanya puluhan sesi VM konvensional dengan kebutuhan yang sama.

## Kapasitas dan Skalabilitas

![Kapasitas maksimum pengguna simultan per konfigurasi server](../../../buku/assets/load_test_max_user.png)

*Uji beban menunjukkan kapasitas maksimum pengguna simultan sesuai konfigurasi server. Platform menskalakan kapasitas secara linear seiring penambahan vCPU dan RAM.*

Dengan konfigurasi **12 vCPU / 12 GB RAM**, platform mampu melayani **35 pengguna aktif** secara stabil, dengan maksimum pengujian mencapai **40 pengguna** sebelum terjadi degradasi. Kapasitas dapat ditambah lebih lanjut hanya dengan menambah *worker node* baru — tanpa mengubah arsitektur inti atau cara instruktur/peserta menggunakan platform.

## Penggunaan Sumber Daya Selama UAT

![Resource usage selama UAT — CPU, Memory, dan Storage](../../../buku/assets/uat_resource_usage.png)

*Pemantauan sumber daya selama sesi Uji Penerimaan Pengguna (UAT) dengan 15 mahasiswa untuk modul OSPF. Storage (garis kuning) tetap stabil selama sesi berlangsung.*

## Modul Praktikum yang Diuji

Enam modul MikroTik berikut telah diuji *end-to-end* secara otomatis — termasuk simulasi penyebaran nyata yang berjalan pada setiap perubahan kode (CI):

| No | Modul | Topik |
|---|---|---|
| 1 | Pengenalan CLI | Navigasi antarmuka RouterOS |
| 2 | IP Addressing | Konfigurasi alamat IP dan subnet |
| 3 | Static Routing | Rute statis antar perangkat |
| 4 | Dynamic Routing: RIP | Routing Information Protocol |
| 5 | Dynamic Routing: OSPF | Open Shortest Path First |
| 6 | Dynamic Routing: BGP | Border Gateway Protocol |

## Uji Penerimaan Pengguna (UAT)

- **Peserta**: 15 mahasiswa
- **Modul yang diuji**: Lab OSPF (*end-to-end*)
- **Skor System Usability Scale (SUS)**: rata-rata **69,1** — kategori ***Good***

## Ringkasan Metrik Kunci

| Metrik | Hasil |
|---|---|
| Modul praktikum diuji *end-to-end* | **6 modul** |
| Storage untuk 40 container aktif | **~93 MiB** (vs. ~5.120 MB untuk VM) |
| Penghematan storage vs. VM | **~98%** |
| Kapasitas maks. pengguna (12 vCPU/12 GB RAM) | **35 stabil / 40 maksimum** |
| Skor SUS (UAT) | **69,1 — Good** |
| Peserta UAT | 15 mahasiswa |
