# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| \`node-interface.check-ip\` | \`R1\` | **ip**: 192.168.10.1/24<br>**interface**: ether2 | 1 |
| \`node-interface.check-ip\` | \`R1\` | **ip**: 10.10.10.1/30<br>**interface**: ether3 | 1 |
| \`node-interface.check-ip\` | \`R2\` | **ip**: 192.168.20.1/24<br>**interface**: ether2 | 1 |
| \`node-interface.check-ip\` | \`R2\` | **ip**: 10.10.10.2/30<br>**interface**: ether3 | 1 |
| \`mikrotik.ospf-instance-exist\` | \`R1\` | **name**: ospf-lab<br>**routerId**: 1.1.1.1 | 1 |
| \`mikrotik.ospf-area-exist\` | \`R1\` | **name**: backbone-lab<br>**instance**: ospf-lab<br>**areaId**: 0.0.0.0 | 1 |
| \`mikrotik.ospf-interface-template-exist\` | \`R1\` | **area**: backbone-lab<br>**interfaces**: ether2 | 1 |
| \`mikrotik.ospf-interface-template-exist\` | \`R1\` | **area**: backbone-lab<br>**interfaces**: ether3 | 1 |
| \`mikrotik.ospf-instance-exist\` | \`R2\` | **name**: ospf-lab<br>**routerId**: 2.2.2.2 | 1 |
| \`mikrotik.ospf-area-exist\` | \`R2\` | **name**: backbone-lab<br>**instance**: ospf-lab<br>**areaId**: 0.0.0.0 | 1 |
| \`mikrotik.ospf-interface-template-exist\` | \`R2\` | **area**: backbone-lab<br>**interfaces**: ether2 | 1 |
| \`mikrotik.ospf-interface-template-exist\` | \`R2\` | **area**: backbone-lab<br>**interfaces**: ether3 | 1 |
| \`mikrotik.ospf-neighbor-exist\` | \`R1\` | **state**: Full<br>**interface**: ether3 | 1 |
| \`mikrotik.ospf-neighbor-exist\` | \`R2\` | **state**: Full<br>**interface**: ether3 | 1 |
| \`mikrotik.route-exist\` | \`R1\` | **dst**: 192.168.20.0/24<br>**flag**: DAo | 1 |
| \`mikrotik.route-exist\` | \`R2\` | **dst**: 192.168.10.0/24<br>**flag**: DAo | 1 |
| \`node-interface.check-ip\` | \`PC1\` | **ip**: 192.168.10.2/24<br>**interface**: eth1 | 1 |
| \`linux.route-exist\` | \`PC1\` | **dst**: default<br>**gateway**: 192.168.10.1 | 1 |
| \`node-interface.check-ip\` | \`PC2\` | **ip**: 192.168.20.2/24<br>**interface**: eth1 | 1 |
| \`linux.route-exist\` | \`PC2\` | **dst**: default<br>**gateway**: 192.168.20.1 | 1 |
