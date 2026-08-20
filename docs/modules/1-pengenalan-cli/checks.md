# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| `mikrotik.system-identity` | `R1` | **name**: Lab-R1 | 2 |
| `mikrotik.system-note` | `R1` | **note**: Lab Jaringan Komputer<br>**showAtLogin**: yes | 2 |
| `mikrotik.user-exist` | `R1` | **username**: siswa<br>**group**: read | 2 |
| `mikrotik.ip-service` | `R1` | **name**: telnet<br>**disabled**: yes | 2 |
| `mikrotik.ip-service` | `R1` | **name**: ftp<br>**disabled**: yes | 2 |
| `linux.user-exist` | `PC1` | **username**: siswa | 1 |
