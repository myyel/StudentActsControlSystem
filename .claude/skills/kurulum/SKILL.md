---
name: kurulum
description: İlk yayından önceki açık noktaları kullanıcıyı adım adım yönlendirerek tamamlar - sunucu, SSH, alan adı, .env ve sırlar, ilk başlatma, KVKK metinleri, ilk hesaplar, yedek ve gerçek cihaz denemeleri. Yalnızca kullanıcı /kurulum yazdığında çalışır.
argument-hint: "[K1…K9 | durum]"
disable-model-invocation: true
---

# İlk kurulum rehberi

Kaynak belge `docs/DEPLOY.md` §1–4, §6 ve §8'dir; bu dosya onları kullanıcıyla birlikte, sırayla uygular. Kurulum bittikten sonraki her güncelleme `/deploy`'un işidir.

Argüman: bir adım (`K4`) verilirse oradan başla; `durum` verilirse yalnızca durum tablosunu göster, hiçbir şey değiştirme. Argüman yoksa kaldığın yeri bul (aşağıda).

Aşağıda `C` = `docker compose -f docker-compose.prod.yml`. Sunucu komutları `ssh <hedef> 'cd <klasör> && …'` ile çalışır; klasör varsayılan `~/gelisim`.

## Nasıl yönlendirilir

Kullanıcı sunucu yöneticisi olmayabilir. Her adımda:

1. **Tek adım, tek istek.** Adımın ne için olduğunu bir iki cümleyle söyle, kullanıcının yapacağı işi numaralı ve kısa ver, sonra bekle. Sonraki adımların ayrıntısını önceden dökme.
2. **Yapabildiğini sen yap.** Komutu göster, onay al, çalıştır. Kullanıcıya yalnızca senin yapamayacağın işi bırak (satın alma, panelden ayar, parola yöneticisi, gerçek cihaz).
3. **Söze değil denetime güven.** Kullanıcı "yaptım" dediğinde adımın "Bitti sayılır" denetimini çalıştır. Denetim geçmeden sonraki adıma geçme; kaldıysa nedenini bul (`docs/DEPLOY.md` §9).
4. **Durumu yaz.** Adım bitince `docs/Kurulum-Durumu.md`'deki satırı güncelle.
5. Kullanıcı bir adımı ertelemek isterse (ör. KVKK metni okuldan bekleniyor) durumu "bekliyor" yaz ve ona bağlı olmayan adımla devam et. Bağımlılıklar: K2←K1, K4←K2, K5←K3+K4, K7←K5, K8←K5, K9←K5+K7. K6 bağımsızdır ama **K6 bitmeden hiçbir veli davet edilmez**.

## Değişmez kurallar

- **Sırlar sohbete girmez.** `.env` okunmaz, yazdırılmaz, kopyalanmaz (`cat`, `grep` ile değer gösterme yok). İzin verilenler: adların dolu/boş denetimi (K4'teki komut) ve `grep '^DOMAIN=' .env`. Rastgele sırlar sunucuda üretilip doğrudan dosyaya yazılır. Kullanıcı bir sırrı sohbete yapıştırırsa kullanma; o sırrın yeniden üretilmesi gerektiğini söyle.
- **Geçici şifre üreten komutları kullanıcı kendi terminalinde çalıştırır** (`admin:cli kullanici-olustur`, `sifre-sifirla`, `pnpm push:keys`). Sen komutu hazırlarsın, çıktısını istemezsin.
- Sunucuda `pnpm db:seed` ve `pnpm db:reset` **asla** çalıştırılmaz.
- `restore.sh` üretim veritabanında çalıştırılmaz. K8'deki geri yükleme denemesi ayrı bir makinede, geçici bir veritabanında yapılır.
- SSH parola girişini kapatmadan önce anahtarla girişin **yeni bir bağlantıda** çalıştığını gör. Güvenlik duvarını açmadan önce `OpenSSH` izni verilmiş olmalı. Sunucuya erişimi kesebilecek her komuttan önce bunu söyle.
- Uygulama Caddy atlanarak dışarı açılmaz; 22, 80, 443 dışında port açılmaz.
- Sunucuda bir şey değiştiren her adımdan önce açık onay al. Bir adımın onayı sonraki adım için geçerli değildir.
- Doğrulayamadığın şeyi yapılmış sayma; durum dosyasına "kullanıcı bildirdi" diye yaz.

## Başlangıç: kaldığın yeri bul

1. `docs/Kurulum-Durumu.md` varsa oku. Yoksa aşağıdaki şablonla oluştur.
2. SSH hedefi biliniyorsa yalnızca okuyan denetimlerle dosyayı doğrula: `ssh <hedef> true`, `test -f <klasör>/.env`, `C ps`, alan adı için `nslookup`. Dosya ile gerçek durum çelişiyorsa gerçek durumu esas al ve dosyayı düzelt.
3. Kullanıcıya durum tablosunu göster ve sıradaki adımı öner.

Durum dosyası şablonu (sır, IP adresi ve kişi adı yazılmaz):

```markdown
# Kurulum durumu

`/kurulum` komutu bu dosyayı günceller. SSH hedefi: — · Alan adı: —

| Adım | Durum | Tarih | Not |
|---|---|---|---|
| K1 Sunucu | bekliyor | | |
| K2 Erişim ve sıkılaştırma | bekliyor | | |
| K3 Alan adı | bekliyor | | |
| K4 Depo, .env ve sırlar | bekliyor | | |
| K5 İlk başlatma | bekliyor | | |
| K6 KVKK metinleri | bekliyor | | |
| K7 İlk hesaplar | bekliyor | | |
| K8 Yedek | bekliyor | | |
| K9 Gerçek cihaz denemeleri | bekliyor | | |
```

Durum değerleri: `bekliyor`, `sürüyor`, `tamam`, `tamam (kullanıcı bildirdi)`. Dosya değiştiyse oturumun sonunda commit etmeyi öner (proje kuralı: sürüm satırı + etiket).

## K1 — Sunucu

**Kullanıcı:** Türkiye'de barındırılan bir VPS alır (KVKK, PRD §5): en az 2 vCPU, 4 GB RAM, 40 GB disk, Ubuntu 24.04 ya da Debian 12. Sağlayıcı panelinde SSH anahtarı eklenebiliyorsa K2'deki açık anahtarı orada ekler (parolayla ilk giriş gerekmez).

**Sen:** Sağlayıcı önerme ya da fiyat söyleme; ölçütleri ver. Bu makinede anahtar var mı bak (`~/.ssh/id_ed25519.pub`); yoksa `ssh-keygen -t ed25519` için onay al ve açık anahtarı (yalnızca `.pub`) göster.

**Bitti sayılır:** Kullanıcı IP adresini verdi ve `ssh root@<ip> 'nproc; free -g; df -h /; . /etc/os-release; echo $PRETTY_NAME'` gereksinimi karşılıyor. Anahtar henüz yüklü değilse denetim K2'nin ilk adımından sonra yapılır.

## K2 — Erişim ve sıkılaştırma

1. Anahtar sunucuda değilse kullanıcı kendi terminalinde bir kez parolayla yükler (PowerShell):
   `type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<ip> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`
2. Onayla, root olarak: `apt update && apt upgrade -y`, `apt install -y unattended-upgrades ufw git`, Docker (`curl -fsSL https://get.docker.com | sh`).
3. `gelisim` kullanıcısını oluştur, `docker` grubuna ekle, root'un `authorized_keys` dosyasını ona kopyala (sahiplik `gelisim`, izin `700`/`600`).
4. `~/.ssh/config`'e `Host gelisim` kaydını ekle (HostName, User gelisim, IdentityFile). **Yeni bağlantıda** `ssh gelisim 'docker ps'` çalışmalı.
5. Güvenlik duvarı: `ufw allow OpenSSH`, `80/tcp`, `443/tcp`, `443/udp`, sonra `ufw --force enable`.
6. Ancak 4. madde geçtiyse: `/etc/ssh/sshd_config.d/` altına `PasswordAuthentication no` ve `PermitRootLogin prohibit-password` yaz, `sshd -t` ile sına, servisi yeniden yükle. Mevcut oturumu kapatmadan yeni bağlantıyla dene.

**Bitti sayılır:** `ssh gelisim 'docker compose version'` çalışır; `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password gelisim true` reddedilir; `ufw status` yalnızca OpenSSH, 80, 443'ü gösterir.

## K3 — Alan adı

**Kullanıcı:** Alan adını alır (okulun `k12.tr` alt alanı da olur) ve **A** kaydını sunucunun IP adresine yönlendirir; IPv6 kullanılıyorsa **AAAA** da.

**Sen:** Hangi kaydın nereye girileceğini (ad, tür, değer) açıkça yaz. Yayılma birkaç dakikadan birkaç saate sürebilir; beklerken K4'e geç.

**Bitti sayılır:** `nslookup <alan-adı>` ve `nslookup <alan-adı> 1.1.1.1` sunucunun IP'sini döner.

## K4 — Depo, `.env` ve sırlar

1. Depoyu çek: `git clone https://github.com/myyel/StudentActsControlSystem.git gelisim && cd gelisim && git checkout <etiket>`. Etiket `VERSION_CONTROL.md`'deki en son sürümdür; yerelde `/test yayin` o commit için geçmiş olmalı. Depo özelse ve kimlik sorarsa kullanıcıya salt okunur "deploy key" eklemesini anlat.
2. `cp .env.production.example .env && chmod 600 .env`.
3. Sır olmayanları sen yaz (`sed -i`): `DOMAIN`, `ACME_EMAIL`, `VAPID_SUBJECT`.
4. Rastgele sırları sunucuda üret, ekrana basmadan dosyaya yaz. **Yalnızca boşsa**; dolu bir `POSTGRES_PASSWORD` değiştirilirse veritabanına bağlanılamaz, `BETTER_AUTH_SECRET` değişirse herkesin oturumu kapanır:
   `sed -i "s|^POSTGRES_PASSWORD=$|POSTGRES_PASSWORD=$(openssl rand -hex 32)|; s|^BETTER_AUTH_SECRET=$|BETTER_AUTH_SECRET=$(openssl rand -hex 32)|" .env`
   (`-hex`: veritabanı parolası bağlantı adresinin içine yazılır; `/` ve `+` içeren base64 adresi bozabilir.)
5. **`BACKUP_PASSPHRASE` kullanıcının işidir:** parola yöneticisinde uzun bir parola üretir, orada saklar, sonra kendi terminalinde `ssh gelisim` ile bağlanıp `nano ~/gelisim/.env` ile yazar. Kaybolursa yedekler açılamaz; bunu açıkça söyle ve "parola yöneticisine kaydettim" yanıtını al.
6. Anlık bildirim isteniyorsa kullanıcı kendi terminalinde `pnpm push:keys` çalıştırır ve iki anahtarı aynı yolla `.env`'e yazar. İstenmiyorsa boş kalır (push kapalı).

**Bitti sayılır** (değerleri göstermez, yalnızca ad ve dolu/boş):

```bash
stat -c '%a %U' .env    # 600 gelisim
awk -F= '/^[A-Z_]+=/{print $1, (length($0) > length($1)+1 ? "dolu" : "BOŞ")}' .env
```

`DOMAIN`, `ACME_EMAIL`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `BACKUP_PASSPHRASE` dolu olmalı.

## K5 — İlk başlatma

K3'ün denetimi geçmeden başlatma: Caddy sertifikayı alamaz ve Let's Encrypt deneme sınırına takılabilir.

Planı göster, onay al, sonra `C up -d --build` (ilk derleme 5–10 dakika). Doğrulama `/deploy`'un D4 aşamasıyla aynıdır:

1. `C ps`: `tools` "exited (0)", `app` "healthy", `db`, `caddy`, `backup` "running".
2. `C logs --since 10m tools app caddy` içinde hata yok.
3. Dışarıdan: `https://<alan-adı>/giris` → 200 ve `strict-transport-security`; `/manifest.webmanifest`, `/sw.js`, `/icon/192` → 200; `http://…/giris` → HTTPS'e yönlendirme.

**Bitti sayılır:** üçü de tamam. Kalırsa `docs/DEPLOY.md` §9.

## K6 — KVKK metinleri

`src/content/kvkk.ts` taslaktır. **Kullanıcı** okulun hukuken onayladığı aydınlatma ve açık rıza metinlerini getirir (dosya ya da yapıştırma). Hukuki metni sen yazmaz, onaylanmış metni değiştirmez ya da "iyileştirmezsin"; eksik gördüğünü kullanıcıya bildirirsin, kararı okul verir.

**Sen:**

1. Metni dosyanın yapısına (`sections`, `heading`, `paragraphs`) birebir aktar; `KVKK_DOC_VERSION`'ı artır (rıza kayıtları kabul edilen sürümü saklar); dosya başındaki DRAFT notunu kaldır.
2. Şunları denetle ve eksikse kullanıcıya sor: veri sorumlusunun unvanı ve iletişimi var mı, köşeli parantezli yer tutucu kaldı mı (`grep -n '\[' src/content/kvkk.ts`), silinen verinin yedeklerde 14 gün kaldığı yazıyor mu (`BACKUP_RETENTION_DAYS` değiştiyse o süre).
3. `/test hizli`, sonra sürüm satırı + commit + etiket + push, sonra `/deploy <etiket> gelisim`.

**Bitti sayılır:** yayındaki `/kayit` akışında yeni metin görünüyor (kullanıcı bakar) ve sunucuda `git describe --tags` yeni etiketi gösteriyor.

## K7 — İlk hesaplar

Komutları hazırla; **kullanıcı kendi terminalinde** `ssh gelisim` ile bağlanıp çalıştırır, çünkü geçici şifre ekrana bir kez yazılır:

```bash
cd ~/gelisim
alias yonet='docker compose -f docker-compose.prod.yml run --rm tools pnpm -s admin:cli'
yonet kullanici-olustur --eposta <e-posta> --ad "<Ad Soyad>" --rol admin --okul "<Okul adı>"
yonet kullanici-olustur --eposta <e-posta> --ad "<Ad Soyad>" --rol teacher
```

Kullanıcıya şifreleri kişilere güvenli bir yoldan iletmesini ve ilk girişte değiştirilmesini söyle.

**Bitti sayılır:** `C run --rm tools pnpm -s admin:cli okullar` okulu listeler; kullanıcı yönetici hesabıyla `https://<alan-adı>/giris`'ten girebildiğini bildirir.

## K8 — Yedek

1. **Elle yedek:** `C run --rm backup backup.sh`, sonra `ls -lt backups/ | head -3`: dosyanın saati şimdi, boyutu sıfırdan büyük.
2. **Uzak kopya:** kullanıcı Türkiye'de S3 uyumlu bir depolama hesabı ve kova açar; `RCLONE_*` değerlerini (erişim anahtarı sırdır) kendi terminalinde `.env`'e yazar (`docs/DEPLOY.md` §6'daki satırlar). Sonra `C up -d backup` ve bir elle yedek daha; günlükte "uzak kopya" satırı görünmeli (`C logs --tail 20 backup`). Kullanıcı uzak kopya istemezse riskini söyle (sunucu kaybolursa yedek de kaybolur) ve durumu öyle yaz.
3. **Geri yükleme denemesi (ayrı makinede, bu bilgisayarda Docker ile):**
   - En yeni yedeği boş bir geçici klasöre indir (`scp`), `docker build -t gelisim-backup ./deploy/backup`.
   - Geçici bir ağda geçici `postgres:17-alpine` kapsayıcısı başlat (adı `gelisim-deneme-db`, veri birimi yok).
   - Kullanıcı kendi terminalinde parolayı ortam değişkenine alıp `restore.sh`'yi çalıştırır; komutu sen hazırlarsın (`docker run --rm --network … -e PGHOST=gelisim-deneme-db -e PGUSER -e PGPASSWORD -e PGDATABASE -e BACKUP_PASSPHRASE -v <klasör>:/backups gelisim-backup restore.sh /backups/<dosya> --evet`).
   - Sen yalnızca sayıları oku (`select count(*)` — `school`, `"user"`, `student`); satır içeriği gösterme.
   - Sonunda kapsayıcıyı, ağı ve indirilen yedek dosyasını sil; silindiğini doğrula. Yedek gerçek kişisel veri içerir.

**Bitti sayılır:** üç madde de tamam ve sayılar üretimdekiyle tutuyor. Durum dosyasına geri yükleme denemesinin tarihini yaz (ayda bir yinelenir).

## K9 — Gerçek cihaz denemeleri

Otomatik testlerin kapsamadıkları (`docs/Test-Senaryolari.pdf`). Senaryoları **tek tek** sor; her birinde ne yapılacağını ve ne görülmesi gerektiğini yaz, yanıtı (geçti / kaldı / denenmedi) al:

1. Öğretmen hesabıyla telefonda giriş, bir öğrenciye puan verme, geri alma.
2. Veli hesabıyla (öğretmenin davet koduyla kayıt) telefonda giriş; rıza metni K6'daki metin mi.
3. iPhone/iPad Safari: ana ekrana ekleme, uygulamayı oradan açma, bildirime izin, öğretmen puan verince bildirimin gelmesi.
4. Android Chrome: aynı dört adım.
5. Akıllı tahta: `/tahta/<sınıf>` dokunmatikle puan verme; negatif puan, sayı ve sıralama görünmemeli.
6. Huawei Tarayıcı varsa: koyu mod tarayıcı ayarından kapatılınca görünüm.

Kalan her senaryo için cihazı, tarayıcı sürümünü ve görüleni not et; düzeltmeyi ayrı bir iş olarak öner (bu komutun içinde koda girme). Deneme için açılan sınıf, öğrenci ve veli hesaplarının pilottan önce silinmesini hatırlat.

**Bitti sayılır:** 1–5 geçti. Sonuç tablosunu durum dosyasının altına ekle (cihaz, senaryo, sonuç; kişi adı yok).

## Rapor

Her oturumun sonunda durum tablosunu ver: adım, durum, bu oturumda ne yapıldı, sıradaki iş ve kimin yapacağı. K1–K9'un tümü "tamam" ise pilotun başlayabileceğini, bundan sonraki güncellemelerin `/test yayin` → sürüm → `/deploy` ile yapılacağını söyle.
