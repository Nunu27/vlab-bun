# Solusi Lab: Konfigurasi Routing OSPF

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan dynamic routing OSPF (Single Area 0 Backbone) pada semua perangkat.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   /ip address add address=10.10.10.1/30 interface=ether3
   ```

2. **Konfigurasikan OSPF Instance**
   ```routeros
   /routing ospf instance add name=ospf-lab router-id=1.1.1.1
   ```

3. **Konfigurasikan OSPF Area**
   ```routeros
   /routing ospf area add name=backbone-lab instance=ospf-lab area-id=0.0.0.0
   ```

4. **Konfigurasikan OSPF Interface Templates**
   ```routeros
   /routing ospf interface-template add area=backbone-lab interfaces=ether3 type=ptp
   /routing ospf interface-template add area=backbone-lab interfaces=ether2 passive=yes
   ```

---

## R2 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=10.10.10.2/30 interface=ether3
   /ip address add address=10.10.20.1/30 interface=ether4
   ```

2. **Konfigurasikan OSPF Instance**
   ```routeros
   /routing ospf instance add name=ospf-lab router-id=2.2.2.2
   ```

3. **Konfigurasikan OSPF Area**
   ```routeros
   /routing ospf area add name=backbone-lab instance=ospf-lab area-id=0.0.0.0
   ```

4. **Konfigurasikan OSPF Interface Templates**
   ```routeros
   /routing ospf interface-template add area=backbone-lab interfaces=ether3 type=ptp
   /routing ospf interface-template add area=backbone-lab interfaces=ether4 type=ptp
   ```

---

## R3 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R3**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether2
   /ip address add address=10.10.20.2/30 interface=ether3
   ```

2. **Konfigurasikan OSPF Instance**
   ```routeros
   /routing ospf instance add name=ospf-lab router-id=3.3.3.3
   ```

3. **Konfigurasikan OSPF Area**
   ```routeros
   /routing ospf area add name=backbone-lab instance=ospf-lab area-id=0.0.0.0
   ```

4. **Konfigurasikan OSPF Interface Templates**
   ```routeros
   /routing ospf interface-template add area=backbone-lab interfaces=ether3 type=ptp
   /routing ospf interface-template add area=backbone-lab interfaces=ether2 passive=yes
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
   sudo ip addr add 192.168.10.2/24 dev eth1
   ```

3. **Atur Default Gateway ke R1**
   ```bash
   sudo ip route add default via 192.168.10.1
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
   sudo ip addr add 192.168.20.2/24 dev eth1
   ```

3. **Atur Default Gateway ke R3**
   ```bash
   sudo ip route add default via 192.168.20.1
   ```

---

## Verifikasi & Pengujian

1. **Cek Adjacency OSPF Neighbor di R1/R3**
   ```routeros
   /routing ospf neighbor print
   ```
   Pastikan status neighbor dengan `2.2.2.2` (R2) berada pada state **Full**.

2. **Cek Tabel Routing**
   ```routeros
   /ip route print
   ```
   Pastikan terdapat rute dengan flag **DAo** (Dynamic, Active, OSPF).

3. **Uji Konektivitas End-to-End dari PC1 ke PC2**
   ```bash
   ping -c 4 192.168.20.2
   ```
