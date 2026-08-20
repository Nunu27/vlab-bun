# Pertanyaan Pemahaman: Konfigurasi Routing RIP

> Kunci jawaban ada di `solution.md`.

Jawab berdasarkan hasil pengamatan pada lab dan materi modul ini.

1. Pada Tahap V, rute `192.168.20.0/24` di R1 memiliki *hop count* 2, sedangkan `10.10.20.0/30` hanya 1. Jelaskan dari mana angka-angka tersebut berasal, dan mengapa R1 bisa mengetahui jaringan milik R3 padahal keduanya tidak terhubung langsung.
2. Pada Modul 3, rute harus ditulis di setiap router secara manual, termasuk rute balikannya. Pada modul ini tidak ada satu rute pun yang ditulis, tetapi PC1 tetap bisa menghubungi PC2. Apa yang menggantikan pekerjaan manual tersebut?
3. Berapa lama waktu yang terukur pada Tahap VI, sejak link diputus sampai ping berhenti mendapat balasan? Kaitkan angka itu dengan penjelasan timer *invalid* dan *flush* pada materi.
4. Bayangkan jaringan ini adalah jaringan sebuah perusahaan, dan Tahap VI terjadi pada jam kerja. Apa dampak nyata dari lamanya waktu konvergensi tersebut bagi pengguna?
5. Andaikan ada dua jalur menuju jaringan tujuan: jalur A melewati 1 router tetapi memakai modem lambat, dan jalur B melewati 3 router dengan fiber optik. Jalur mana yang akan dipilih RIP, dan mengapa pilihan itu bisa merugikan?
6. Materi menyebut bahwa `redistribute=connected` berbahaya di jaringan produksi. Jelaskan dengan kalimat sendiri apa yang bisa terjadi jika sebuah router perusahaan mengiklankan seluruh jaringan yang terhubung padanya tanpa disaring.
7. RIP menganggap jaringan berjarak 16 hop sebagai *unreachable*. Mengapa harus ada batas seperti ini, dan apa yang akan terjadi jika batas tersebut dihapus?
