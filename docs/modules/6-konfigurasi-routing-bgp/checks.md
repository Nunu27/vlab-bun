# Checks

| Check ID | Target Node | Parameters | Weight |
|---|---|---|---|
| \`mikrotik.bgp-connection-exist\` | \`R1\` | **name**: peer-R2<br>**local.role**: ebgp<br>**remote.as**: 65002<br>**as**: 65001 | 1 |
| \`mikrotik.bgp-connection-exist\` | \`R2\` | **name**: peer-R1<br>**local.role**: ebgp<br>**remote.as**: 65001<br>**as**: 65002 | 1 |
| \`mikrotik.bgp-session-established\` | \`R1\` | **remote.address**: 10.10.10.2 | 1 |
| \`mikrotik.bgp-session-established\` | \`R2\` | **remote.address**: 10.10.10.1 | 1 |
| \`mikrotik.route-exist\` | \`R1\` | **dst**: 192.168.20.0/24<br>**flag**: Db | 1 |
| \`mikrotik.route-exist\` | \`R2\` | **dst**: 192.168.10.0/24<br>**flag**: Db | 1 |
