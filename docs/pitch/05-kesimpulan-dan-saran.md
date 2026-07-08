# Kesimpulan & Saran

## Kesimpulan

vLab terbukti mampu menjalankan lab jaringan yang realistis, dinilai otomatis, dan skalabel, sekaligus relevan dengan kebutuhan pasar MikroTik di Indonesia.

Platform ini berhasil menjawab ketiga masalah yang diidentifikasi di [`01-latar-belakang.md`](01-latar-belakang.md):

| Masalah | Jawaban vLab |
|---|---|
| Keterbatasan lab fisik (biaya & skalabilitas) | Container jauh lebih hemat storage (~98% vs. VM), satu server melayani banyak sesi paralel, kapasitas naik cukup tambah *worker node* |
| Proses pembuatan & evaluasi lab tidak efisien | Editor topologi *drag-and-drop* + evaluasi *event-driven* otomatis, instruktur tidak perlu nilai manual |
| Simulator terkunci vendor, tidak mendukung MikroTik | Berjalan di atas Containerlab yang multi-vendor; kurikulum saat ini fokus MikroTik CHR & Linux, relevan dengan pasar lokal Indonesia |

## Dampak

### Bagi Peserta Didik

Pengalaman belajar praktis di lingkungan yang realistis, aman, dan dapat diakses kapan saja — tidak terikat jadwal lab fisik. Umpan balik instan mendorong *active learning*: peserta langsung mengetahui apakah tindakan mereka benar atau salah, lalu mengembangkan keterampilan pemecahan masalah yang relevan dengan kebutuhan industri lokal.

### Bagi Instruktur & Institusi

Solusi pembelajaran yang efisien dari segi biaya dan skalabel: tidak perlu investasi ulang perangkat fisik setiap kali kapasitas kelas ditambah. Otomatisasi penyiapan lab dan penilaian secara signifikan mengurangi beban kerja administratif instruktur.

### Bagi Industri

Membantu menghasilkan lulusan yang lebih kompeten dan siap kerja dengan keahlian spesifik pada perangkat MikroTik — perangkat yang paling banyak ditemui di lapangan sebagai ISP maupun UKM di Indonesia. Hal ini secara langsung menjawab *skills gap* jaringan yang disebut sebagai salah satu yang tersulit direkrut oleh 36% perusahaan.[^1]

## Saran & Arah Pengembangan

Ke depan, pengembangan diarahkan pada tiga hal utama:

1. **Pengujian penerimaan pengguna dalam skala lebih besar**, melibatkan peran instruktur (bukan hanya peserta) serta jumlah mahasiswa yang lebih representatif.

2. **Perluasan modul praktikum** ke topik lanjutan seperti *firewall*, VLAN, VPN, QoS, dan skenario *troubleshooting* yang lebih kompleks.

3. **Antarmuka pengelolaan kriteria penilaian berbasis *web***, agar instruktur dapat membuat kriteria evaluasi kustom tanpa bergantung pada perubahan kode sumber.

Selain itu, karena Containerlab yang menjadi fondasi orkestrasi sudah mendukung banyak vendor (Nokia, Arista, Juniper, Cisco, dan lainnya), menambahkan dukungan vendor baru ke vLab hanya memerlukan penambahan *handler* evaluator dan modul kurikulum — tanpa mengubah arsitektur inti.

## Referensi

[^1]: Expereo / IDC, *Enterprise Horizons 2025*. [expereo.com/resources/reports/enterprise-horizons-2025](https://www.expereo.com/resources/reports/enterprise-horizons-2025)
