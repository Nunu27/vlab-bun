# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| `node-interface.check-ip` | `R1` | **ip**: 192.0.2.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `R1` | **ip**: 198.51.100.1/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `R2` | **ip**: 198.51.100.2/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `R2` | **ip**: 198.51.100.5/30<br>**interface**: ether4 | 1 |
| `node-interface.check-ip` | `R3` | **ip**: 198.51.100.6/30<br>**interface**: ether3 | 1 |
| `node-interface.check-ip` | `R3` | **ip**: 203.0.113.1/24<br>**interface**: ether2 | 1 |
| `node-interface.check-ip` | `PC1` | **ip**: 192.0.2.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC1` | **dst**: default<br>**gateway**: 192.0.2.1 | 1 |
| `node-interface.check-ip` | `PC2` | **ip**: 203.0.113.2/24<br>**interface**: eth1 | 1 |
| `linux.route-exist` | `PC2` | **dst**: default<br>**gateway**: 203.0.113.1 | 1 |
| `mikrotik.bgp-instance-exist` | `R1` | **name**: bgp-default<br>**as**: 65001<br>**routerId**: 1.1.1.1 | 2 |
| `mikrotik.bgp-instance-exist` | `R2` | **name**: bgp-default<br>**as**: 65000<br>**routerId**: 2.2.2.2 | 2 |
| `mikrotik.bgp-instance-exist` | `R3` | **name**: bgp-default<br>**as**: 65002<br>**routerId**: 3.3.3.3 | 2 |
| `mikrotik.bgp-connection-exist` | `R1` | **name**: peer-R2<br>**local.role**: ebgp<br>**remote.as**: 65000<br>**as**: 65001 | 2 |
| `mikrotik.bgp-connection-exist` | `R2` | **name**: peer-R1<br>**local.role**: ebgp<br>**remote.as**: 65001<br>**as**: 65000 | 2 |
| `mikrotik.bgp-connection-exist` | `R2` | **name**: peer-R3<br>**local.role**: ebgp<br>**remote.as**: 65002<br>**as**: 65000 | 2 |
| `mikrotik.bgp-connection-exist` | `R3` | **name**: peer-R2<br>**local.role**: ebgp<br>**remote.as**: 65000<br>**as**: 65002 | 2 |
| `mikrotik.bgp-session-established` | `R1` | **remote.address**: 198.51.100.2 | 2 |
| `mikrotik.bgp-session-established` | `R2` | **remote.address**: 198.51.100.1 | 2 |
| `mikrotik.bgp-session-established` | `R2` | **remote.address**: 198.51.100.6 | 2 |
| `mikrotik.bgp-session-established` | `R3` | **remote.address**: 198.51.100.5 | 2 |
| `mikrotik.route-exist` | `R1` | **dst**: 203.0.113.0/24<br>**flag**: DAb | 2 |
| `mikrotik.route-exist` | `R3` | **dst**: 192.0.2.0/24<br>**flag**: DAb | 2 |
