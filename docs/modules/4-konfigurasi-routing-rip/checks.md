# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| `node-interface.check-ip` | `R1` | **ip**: 192.168.10.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `R1` | **ip**: 10.10.10.1/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `R2` | **ip**: 10.10.10.2/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `R2` | **ip**: 10.10.20.1/30<br>**interface**: ether4 | 1 |
| `node-interface.check-ip` | `R3` | **ip**: 192.168.20.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `R3` | **ip**: 10.10.20.2/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `PC1` | **ip**: 192.168.10.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC1` | **dst**: default<br>**gateway**: 192.168.10.1 | 1 |
| `node-interface.check-ip` | `PC2` | **ip**: 192.168.20.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC2` | **dst**: default<br>**gateway**: 192.168.20.1 | 1 |
| `mikrotik.rip-instance-exist` | `R1` | **name**: rip-lab<br>**redistribute**: connected,rip | 2 |
| `mikrotik.rip-interface-template-exist` | `R1` | **instance**: rip-lab<br>**interfaces**: ether2,ether3 | 2 |
| `mikrotik.rip-instance-exist` | `R2` | **name**: rip-lab<br>**redistribute**: connected,rip | 2 |
| `mikrotik.rip-interface-template-exist` | `R2` | **instance**: rip-lab<br>**interfaces**: ether3,ether4 | 2 |
| `mikrotik.rip-instance-exist` | `R3` | **name**: rip-lab<br>**redistribute**: connected,rip | 2 |
| `mikrotik.rip-interface-template-exist` | `R3` | **instance**: rip-lab<br>**interfaces**: ether2,ether3 | 2 |
| `mikrotik.route-exist` | `R1` | **dst**: 192.168.20.0/24<br>**flag**: DAr | 2 |
| `mikrotik.route-exist` | `R3` | **dst**: 192.168.10.0/24<br>**flag**: DAr | 2 |
