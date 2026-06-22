# Solusi Lab: Konfigurasi Static Routing

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address dan Static Routing pada semua perangkat agar dapat saling terhubung secara *end-to-end*.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP Address pada ether2 (LAN PC1) dan ether3 (WAN ke R2)**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   /ip address add address=10.10.10.1/30 interface=ether3
   ```

2. **Tambahkan Rute Statis ke Network PC2 (192.168.20.0/24)**
   ```routeros
   /ip route add dst-address=192.168.20.0/24 gateway=10.10.10.2
   ```

3. **Verifikasi Tabel Routing**
   ```routeros
   /ip route print
   ```

---

## R2 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R2**:

1. **Konfigurasikan IP Address pada ether2 (LAN PC2) dan ether3 (WAN ke R1)**
   ```routeros
   /ip address add address=192.168.20.1/24 interface=ether2
   /ip address add address=10.10.10.2/30 interface=ether3
   ```

2. **Tambahkan Rute Statis ke Network PC1 (192.168.10.0/24)**
   ```routeros
   /ip route add dst-address=192.168.10.0/24 gateway=10.10.10.1
   ```

3. **Verifikasi Tabel Routing**
   ```routeros
   /ip route print
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

3. **Atur Default Gateway ke R2**
   ```bash
   sudo ip route add default via 192.168.20.1
   ```

---

## Pengujian Konektivitas

Setelah semua konfigurasi selesai, jalankan tes ping dari terminal **PC1** ke **PC2**:
```bash
ping -c 4 192.168.20.2
```
