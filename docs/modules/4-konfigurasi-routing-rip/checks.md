# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| \`mikrotik.rip-instance-exist\` | \`R1\` | **name**: rip-lab | 1 |
| \`mikrotik.rip-interface-template-exist\` | \`R1\` | **instance**: rip-lab<br>**interfaces**: ether2,ether3 | 1 |
| \`mikrotik.rip-instance-exist\` | \`R2\` | **name**: rip-lab | 1 |
| \`mikrotik.rip-interface-template-exist\` | \`R2\` | **instance**: rip-lab<br>**interfaces**: ether2,ether3 | 1 |
| \`mikrotik.route-exist\` | \`R1\` | **dst**: 192.168.20.0/24<br>**flag**: Dr | 1 |
| \`mikrotik.route-exist\` | \`R2\` | **dst**: 192.168.10.0/24<br>**flag**: Dr | 1 |
