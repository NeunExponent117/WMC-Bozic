## **Übung 1**
**Aufgabe:** Bilde aus dem Netz 192.168.0.0 /24 vier Subnetze mit den geforderten Hostzahlen.

**Antwort:**
1. **Netz A**: Benötigt 20 Hosts
Nächstgrößeres Netz: /27
Netzwerkadresse: 192.168.0.0 /27
Broadcastadresse: 192.168.0.31
Nutzbare Hosts: 192.168.0.1 - 192.168.0.30

2. **Netz B**: Benötigt 15 Hosts
Netzwerkadresse: 192.168.0.32 /28
Broadcastadresse: 192.168.0.47
Nutzbare Hosts: 192.168.0.33 - 192.168.0.46

3. **Netz C**: Benötigt 30 Hosts
Netzwerkadresse: 192.168.0.48 /27
Broadcastadresse: 192.168.0.79
Nutzbare Hosts: 192.168.0.49 - 192.168.0.78

4. **Netz D**: Restliche Adressen
Netzwerkadresse: 192.168.0.80 /26
Broadcastadresse: 192.168.0.143
Nutzbare Hosts: 192.168.0.81 - 192.168.0.142

## **Übung 2**
**Aufgabe:** Teile das Netz 193.170.20.0 /24 in 8 gleich große Subnetze.

**Antwort:**
Subnetz: Netzwerkadresse:  Nutzbare Hosts: Broadcastadresse: Subnetzmaske:
1        193.170.20.0      30              193.170.20.31     255.255.255.224 
2        193.170.20.32     30              193.170.20.63     255.255.255.224 
3        193.170.20.64     30              193.170.20.95     255.255.255.224 
4        193.170.20.96     30              193.170.20.127    255.255.255.224 
5        193.170.20.128    30              193.170.20.159    255.255.255.224 
6        193.170.20.160    30              193.170.20.191    255.255.255.224 
7        193.170.20.192    30              193.170.20.223    255.255.255.224 
8        193.170.20.224    30              193.170.20.255    255.255.255.224 

## **Übung 3**
**Aufgabe:** Teile 172.28.40.0 /26 in zwei Subnetze.

**Antwort:**
Subnetz: Netzwerkadresse:  Nutzbare Hosts: Broadcastadresse: Subnetzmaske:
1        172.28.40.0       30              172.28.40.31      255.255.255.224
2        172.28.40.32      30              172.28.40.63      255.255.255.224

## **Übung 4**
**Aufgabe:** Subnetzmaske für 17.0.0.0 mit 10 Subnetzen und mindestens 12 Hosts.

**Antwort:**
Subnetzmaske: 255.255.255.240 /28.

## **Übung 5**
**Aufgabe:** Bestimme die Subnetzmaske für 210.52.190.0 mit 5 Subnetzen und mindestens 10 Hosts.

**Antwort:**
Subnetzmaske: 255.255.255.240. /28

## **Übung 6**
**Aufgabe:** Wozu werden /30 Netze verwendet?

**Antwort:**
/30 hat nur (2 nutzbare Hosts).
Verwendung: Point to Point Verbindungen z. B. zwischen Routern.

## **Übung 7**
**Aufgabe:** Netz- und Hostanteil der Klassen A, B und C.

**Antwort:**
Klasse: Netzwerkanteil: Hostanteil:
A      8 Bit           24 Bit
B      16 Bit          16 Bit
C      24 Bit          8 Bit