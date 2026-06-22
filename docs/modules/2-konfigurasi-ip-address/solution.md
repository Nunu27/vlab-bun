# Solusi Lab: Konfigurasi IP Address

Berikut adalah panduan langkah demi langkah untuk melakukan konfigurasi IP Address secara statis pada kedua perangkat.

## R1 (MikroTik RouterOS)

Jalankan perintah berikut pada terminal konsol **R1**:

1. **Konfigurasikan IP Address pada ether2**
   ```routeros
   /ip address add address=192.168.10.1/24 interface=ether2
   ```

2. **Verifikasi Konfigurasi**
   ```routeros
   /ip address print
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

3. **Verifikasi Konfigurasi**
   ```bash
   ip addr show eth1
   ```

4. **Uji Konektivitas (Ping R1)**
   ```bash
   ping -c 4 192.168.10.1
   ```
