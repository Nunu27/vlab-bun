# Solusi Lab: Konfigurasi Routing RIP

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan dynamic routing RIP pada semua perangkat.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   /ip address add address=10.10.10.1/30 interface=ether3
   ```

2. **Konfigurasikan RIP Instance**
   ```routeros
   /routing rip instance add name=rip-lab redistribute=connected,rip
   ```

3. **Konfigurasikan RIP Interface Template**
   ```routeros
   /routing rip interface-template add instance=rip-lab interfaces=ether2,ether3
   ```

---

## R2 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=10.10.10.2/30 interface=ether3
   /ip address add address=10.10.20.1/30 interface=ether4
   ```

2. **Konfigurasikan RIP Instance**
   ```routeros
   /routing rip instance add name=rip-lab redistribute=connected,rip
   ```

3. **Konfigurasikan RIP Interface Template**
   ```routeros
   /routing rip interface-template add instance=rip-lab interfaces=ether3,ether4
   ```

---

## R3 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R3**:

1. **Konfigurasikan IP Address**
   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether2
   /ip address add address=10.10.20.2/30 interface=ether3
   ```

2. **Konfigurasikan RIP Instance**
   ```routeros
   /routing rip instance add name=rip-lab redistribute=connected,rip
   ```

3. **Konfigurasikan RIP Interface Template**
   ```routeros
   /routing rip interface-template add instance=rip-lab interfaces=ether2,ether3
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

Setelah menunggu sekitar 30 detik untuk konvergensi RIP, lakukan verifikasi:

1. **Cari rute RIP di R1**
   ```routeros
   /ip route print
   ```
   Pastikan terdapat rute ke `192.168.20.0/24` dengan flag **DAr** (Dynamic, Active, RIP).

2. **Uji Konektivitas End-to-End dari PC1 ke PC2**
   ```bash
   ping -c 4 192.168.20.2
   ```
