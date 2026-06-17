# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| `node-interface.check-ip` | `R1` | **ip**: 192.168.10.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `R1` | **ip**: 10.10.10.1/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `R2` | **ip**: 192.168.20.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `R2` | **ip**: 10.10.10.2/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `PC1` | **ip**: 192.168.10.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC1` | **dst**: default<br>**gateway**: 192.168.10.1 | 1 |
| `node-interface.check-ip` | `PC2` | **ip**: 192.168.20.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC2` | **dst**: default<br>**gateway**: 192.168.20.1 | 1 |
| `mikrotik.route-exist` | `R1` | **dst**: 192.168.20.0/24<br>**gateway**: 10.10.10.2<br>**flag**: As | 2 |
| `mikrotik.route-exist` | `R2` | **dst**: 192.168.10.0/24<br>**gateway**: 10.10.10.1<br>**flag**: As | 2 |
