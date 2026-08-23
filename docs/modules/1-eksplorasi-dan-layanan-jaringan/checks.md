# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| `mikrotik.system-identity` | `R1` | **name**: Lab-R1 | 2 |
| `mikrotik.system-note` | `R1` | **note**: Lab Jaringan Komputer<br>**showAtLogin**: yes | 2 |
| `mikrotik.user-exist` | `R1` | **username**: siswa<br>**group**: read | 2 |
| `mikrotik.ip-service` | `R1` | **name**: telnet<br>**disabled**: yes | 2 |
| `mikrotik.ip-service` | `R1` | **name**: ftp<br>**disabled**: yes | 2 |
| `linux.user-exist` | `PC1` | **username**: siswa | 1 |
| `node-interface.check-ip` | `R1` | **ip**: 192.168.10.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `PC1` | **ip**: 192.168.10.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC1` | **dst**: default<br>**gateway**: 192.168.10.1 | 1 |
| `connectivity.ping` | `PC1` | **target**: 192.168.10.1 | 1 |
| `mikrotik.dns-allow-remote-requests` | `R1` | - | 1 |
| `mikrotik.dns-static-exist` | `R1` | **name**: r1.lab<br>**address**: 192.168.10.1 | 1 |
| `connectivity.ping` | `PC1` | **target**: r1.lab | 2 |
| `node-interface.check-ip` | `R1` | **ip**: 192.168.20.1/24<br>**interface**: ether3 | 1 |
| `mikrotik.dhcp-pool-exist` | `R1` | **name**: dhcp-pool<br>**ranges**: 192.168.20.10-192.168.20.20 | 1 |
| `mikrotik.dhcp-server-exist` | `R1` | **name**: dhcp1<br>**interface**: ether3<br>**addressPool**: dhcp-pool | 1 |
| `mikrotik.dhcp-network-exist` | `R1` | **address**: 192.168.20.0/24<br>**gateway**: 192.168.20.1<br>**dnsServer**: 192.168.20.1 | 1 |
| `mikrotik.dhcp-lease-bound` | `R1` | **server**: dhcp1 | 1 |
| `linux.route-exist` | `PC2` | **dst**: default<br>**gateway**: 192.168.20.1 | 1 |
| `connectivity.ping` | `PC2` | **target**: r1.lab | 2 |
