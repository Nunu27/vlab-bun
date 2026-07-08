# Latar Belakang

## Ada kesenjangan antara kelas dan industri

Pendidikan rekayasa jaringan (*network engineering*) menuntut keseimbangan antara teori dan keterampilan praktis, dan saat ini keduanya sering timpang. Laporan *Enterprise Horizons 2025* dari Expereo/IDC mencatat talenta jaringan sebagai area kedua tersulit untuk direkrut, dengan **36% perusahaan** menyebut kurangnya pengalaman praktis sebagai penyebab utama.[^1] Laporan *2025 Global Human Capital Trends* dari Deloitte Insights menyoroti hal serupa.[^2]

Tren ini tidak menunjukkan tanda-tanda mereda. *The Future of Jobs Report 2025* dari World Economic Forum menempatkan "networks and cybersecurity" sebagai salah satu kelompok keterampilan dengan pertumbuhan permintaan tercepat menjelang 2030, tepat di bawah AI dan big data, didorong oleh investasi besar-besaran pada 5G, IoT, dan komputasi awan.[^3]

![Skills on the Rise 2025 — WEF Future of Jobs Report](../../../buku/assets/skill_on_the_rise.png)

*"Networks and cybersecurity" berada di urutan ke-2 keterampilan dengan pertumbuhan permintaan tercepat menjelang 2030 (net increase: +70), tepat di bawah AI dan big data. Sumber: WEF Future of Jobs Report 2025.*

Akar masalah ini telah terdokumentasi dalam literatur pendidikan: konsep seperti *layering*, *subnetting*, dan protokol routing bersifat abstrak dan sulit dipahami tanpa pengalaman langsung dengan perangkat nyata.[^4]

## Cara belajar praktis yang ada saat ini tidak cukup

**Lab fisik.** Biaya investasi dan perawatan perangkat tinggi, sulit diskalakan untuk banyak peserta secara bersamaan, dan tidak fleksibel untuk skenario topologi yang kompleks atau dinamis.

**Simulator seperti Cisco Packet Tracer.** Memadai untuk konsep dasar, tetapi terkunci pada ekosistem satu vendor dan tidak menjalankan sistem operasi jaringan yang sesungguhnya, sehingga pengalaman yang diperoleh cenderung dangkal dibandingkan bekerja dengan perangkat fisik.[^5]

## Yang hilang dari keduanya: konteks lokal Indonesia

Di Indonesia, perangkat **MikroTik** mendominasi pasar ISP serta perusahaan kecil dan menengah, didorong oleh kombinasi fitur yang andal dan harga yang terjangkau.[^6] Hal ini terlihat jelas ketika Indonesia menjadi tuan rumah *MikroTik User Meeting* (MUM) terbesar di dunia pada 2018.[^7] Penguasaan RouterOS merupakan kualifikasi dasar bagi profesional jaringan di Indonesia.

Namun, hampir tidak ada simulator atau lab virtual yang dibangun di sekitar ekosistem MikroTik. Akibatnya, lulusan dilatih menggunakan alat yang tidak mencerminkan perangkat yang sesungguhnya mereka temui di lapangan.

## Tiga masalah inti

1. **Keterbatasan lab fisik.** Biaya, skalabilitas, dan fleksibilitas.
2. **Proses pembuatan dan evaluasi lab yang tidak efisien.** Instruktur menyiapkan skenario dan menilai secara manual, sehingga memakan waktu dan lambat dalam memberikan umpan balik kepada peserta.
3. **Keterbatasan alat simulasi.** Terkunci ke satu vendor, tidak mendukung MikroTik, dan tidak memberi pengalaman kerja yang otentik dengan perangkat sungguhan.

## Referensi

[^1]: Expereo / IDC, *Enterprise Horizons 2025*. [expereo.com/resources/reports/enterprise-horizons-2025](https://www.expereo.com/resources/reports/enterprise-horizons-2025)
[^2]: Deloitte Insights, *2025 Global Human Capital Trends*. [deloitte.com/us/en/insights/topics/talent/humancapital-trends.html](https://www.deloitte.com/us/en/insights/topics/talent/humancapital-trends.html)
[^3]: World Economic Forum, *The Future of Jobs Report 2025*. [weforum.org/publications/the-future-of-jobs-report-2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/)
[^4]: Prvan, M. & Ožegović, J. (2020). "Methods in Teaching Computer Networks: A Literature Review." *ACM Transactions on Computing Education*, 20(3), 1-35.
[^5]: Saud et al. (2025). "Evaluating the Effectiveness of Cisco Packet Tracer for Teaching Networking Concepts at the Undergraduate Level." *Pravaha*, 15(1). [nepjol.info/index.php/phe/article/view/80876](https://www.nepjol.info/index.php/phe/article/view/80876)
[^6]: Spiceworks Inc., *Top 10 Enterprise Networking Hardware Companies in 2022*. [spiceworks.com/tech/networking/articles/top-enterprise-networking-hardware-companies](https://www.spiceworks.com/tech/networking/articles/top-enterprise-networking-hardware-companies/)
[^7]: MikroTik, *MUM: MikroTik User Meeting*, agenda Indonesia 2018/2019. [mum.mikrotik.com/2019/ID/agenda](https://mum.mikrotik.com/2019/ID/agenda)

Sitasi lengkap dengan format akademik penuh ada di `buku/references.bib` dan Bab 1 laporan penelitian.
