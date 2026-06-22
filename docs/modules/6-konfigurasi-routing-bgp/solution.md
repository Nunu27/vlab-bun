# Solusi Lab: Konfigurasi Routing BGP

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan dynamic routing BGP (Multi-AS) pada semua perangkat.

## R1 (MikroTik RouterOS - AS 65001)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=192.0.2.1/24 interface=ether2
   /ip address add address=198.51.100.1/30 interface=ether3
   ```

2. **Daftarkan Prefix untuk Diiklankan**
   ```routeros
   /ip firewall address-list add list=bgp-networks address=192.0.2.0/24
   ```

3. **Konfigurasikan BGP Instance**
   ```routeros
   /routing bgp instance add name=bgp-default as=65001 router-id=1.1.1.1
   ```

4. **Konfigurasikan BGP Peering Connection ke R2**
   ```routeros
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.2 local.role=ebgp local.address=198.51.100.1 output.network=bgp-networks
   ```

---

## R2 (MikroTik RouterOS - AS 65000 Transit)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=198.51.100.2/30 interface=ether3
   /ip address add address=198.51.100.5/30 interface=ether4
   ```

2. **Konfigurasikan BGP Instance**
   ```routeros
   /routing bgp instance add name=bgp-default as=65000 router-id=2.2.2.2
   ```

3. **Konfigurasikan BGP Peering Connection ke R1 dan R3**
   ```routeros
   /routing bgp connection add name=peer-R1 instance=bgp-default remote.as=65001 remote.address=198.51.100.1 local.role=ebgp local.address=198.51.100.2
   /routing bgp connection add name=peer-R3 instance=bgp-default remote.as=65002 remote.address=198.51.100.6 local.role=ebgp local.address=198.51.100.5
   ```

---

## R3 (MikroTik RouterOS - AS 65002)

Jalankan perintah berikut pada terminal konsol **R3**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=203.0.113.1/24 interface=ether2
   /ip address add address=198.51.100.6/30 interface=ether3
   ```

2. **Daftarkan Prefix untuk Diiklankan**
   ```routeros
   /ip firewall address-list add list=bgp-networks address=203.0.113.0/24
   ```

3. **Konfigurasikan BGP Instance**
   ```routeros
   /routing bgp instance add name=bgp-default as=65002 router-id=3.3.3.3
   ```

4. **Konfigurasikan BGP Peering Connection ke R2**
   ```routeros
   /routing bgp connection add name=peer-R2 instance=bgp-default remote.as=65000 remote.address=198.51.100.5 local.role=ebgp local.address=198.51.100.6 output.network=bgp-networks
   ```

---

## PC1 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC1**:

1. **Aktifkan Interface eth1**
   ```bash
   sudo ip link set eth1 up
   ```

2. **Alokasikan IP Address pada eth1**
   ```bash
   sudo ip addr add 192.0.2.2/24 dev eth1
   ```

3. **Atur Default Gateway ke R1**
   ```bash
   sudo ip route add default via 192.0.2.1
   ```

---

## PC2 (Ubuntu Linux)

Jalankan perintah berikut pada terminal **PC2**:

1. **Aktifkan Interface eth1**
   ```bash
   sudo ip link set eth1 up
   ```

2. **Alokasikan IP Address pada eth1**
   ```bash
   sudo ip addr add 203.0.113.2/24 dev eth1
   ```

3. **Atur Default Gateway ke R3**
   ```bash
   sudo ip route add default via 203.0.113.1
   ```

---

## Verifikasi & Pengujian

1. **Cek Status Sesi BGP di Semua Router**
   ```routeros
   /routing bgp session print
   ```
   Pastikan seluruh status peering connection berada pada state **Established**.

2. **Cek Tabel Routing dan Pengamatan AS-Path**
   ```routeros
   /ip route print
   ```
   Pastikan terdapat rute ke network remote dengan flag **DAb** (Dynamic, Active, BGP).

   Gunakan perintah detail berikut pada R1 untuk melihat AS-PATH dari `203.0.113.0/24`:
   ```routeros
   /ip route print detail where dst-address=203.0.113.0/24
   ```
   Atribut `bgp-as-path` harus menunjukkan `65000,65002`.

3. **Uji Konektivitas End-to-End dari PC1 ke PC2**
   ```bash
   ping -c 4 203.0.113.2
   ```
