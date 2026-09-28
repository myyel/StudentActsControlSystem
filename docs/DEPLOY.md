# Yayına alma (üretim)

Bu belge uygulamanın bir VPS'e Docker ile kurulmasını, güncellenmesini, yedeklenmesini ve yedekten geri dönülmesini anlatır. Komutlar Ubuntu 24.04 / Debian 12 içindir.

## Mimari

```
İnternet ──443/80──▶ caddy (HTTPS, Let's Encrypt) ──▶ app (Next.js, 3000)
                                                         │
                             tools (migration, yönetim) ─┼─▶ db (PostgreSQL 17, dışarı kapalı)
                             backup (gece şifreli yedek) ─┘        │
                                                         ./backups ◀┘  ──(isteğe bağlı)──▶ uzak depolama
```

| Servis | Görevi |
|---|---|
| `caddy` | Sertifikayı kendisi alır ve yeniler, HTTP'yi HTTPS'e yönlendirir, HSTS ekler. Dışarıya açık tek servis. |
| `app` | Uygulama. Root olmayan kullanıcıyla çalışır. |
| `tools` | Her açılışta migration'ları uygulayıp çıkar. Kullanıcı oluşturma gibi yönetim komutları da bununla çalışır. |
| `db` | PostgreSQL. Portu dışarıya açılmaz. |
| `backup` | Her gece `pg_dump` alır, AES-256 ile şifreler, 14 gün saklar, isteğe bağlı uzak depolamaya kopyalar. |

Dosyalar: [`Dockerfile`](../Dockerfile), [`docker-compose.prod.yml`](../docker-compose.prod.yml), [`deploy/Caddyfile`](../deploy/Caddyfile), [`deploy/backup/`](../deploy/backup/), [`.env.production.example`](../.env.production.example).

## 1. Sunucu

**Gereksinim:** Türkiye'de barındırılan bir VPS (KVKK, PRD §5), en az 2 vCPU, 4 GB RAM, 40 GB disk. İlk derleme için 2 GB RAM yetmeyebilir.

```bash
# Güncellemeler ve güvenlik duvarı
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades ufw git
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable

# Docker Engine + Compose eklentisi (resmi betik)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # oturumu kapatıp açın
```

SSH'de parola ile girişi kapatın (`PasswordAuthentication no`) ve yalnızca anahtarla bağlanın.

## 2. Alan adı

Alan adınızın (ör. `gelisim.okulunuz.k12.tr`) **A** (ve varsa **AAAA**) kaydını sunucunun IP adresine yönlendirin. Caddy sertifikayı ancak DNS sunucuyu gösterdiğinde ve 80/443 portları açıkken alabilir.

## 3. Kurulum

```bash
git clone https://github.com/myyel/StudentActsControlSystem.git gelisim
cd gelisim
git checkout vX.Y.Z             # yayınlanacak sürüm etiketi (VERSION_CONTROL.md)

cp .env.production.example .env
chmod 600 .env
```

`.env` dosyasını doldurun:

| Değişken | Açıklama |
|---|---|
| `DOMAIN`, `ACME_EMAIL` | Alan adı ve Let's Encrypt bildirim adresi |
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`. Değiştirilirse herkesin oturumu kapanır. |
| `VAPID_*` | İsteğe bağlı anlık bildirim. Bir geliştirme makinesinde `pnpm push:keys` ile üretin. Anahtarlar değişirse velilerin bildirimi yeniden açması gerekir. |
| `BACKUP_PASSPHRASE` | Yedekleri şifreleyen parola. **Kaybedilirse yedekler açılamaz.** Sunucu dışında, parola yöneticisinde saklayın. |
| `BACKUP_SCHEDULE`, `BACKUP_RETENTION_DAYS` | Varsayılan her gece 02:30 (Türkiye saati), 14 gün |
| `RCLONE_*` | İsteğe bağlı uzak kopya (bkz. [Yedekler](#6-yedekler)) |

Başlatın:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # tools "exited (0)", diğerleri "running"
docker compose -f docker-compose.prod.yml logs -f caddy app
```

`https://ALAN_ADINIZ/giris` açılıyorsa kurulum tamamdır. İlk sertifika birkaç saniye sürebilir.

> `pnpm db:seed` / `db:reset` üretimde **çalıştırılmaz** (örnek veri içindir; `NODE_ENV=production` iken zaten reddeder).

## 4. Okul ve hesaplar

Uygulamada açık kayıt yoktur. Yönetici ve öğretmen hesapları sunucuda komutla açılır; veliler öğretmenin verdiği davet koduyla kaydolur.

```bash
alias yonet='docker compose -f docker-compose.prod.yml run --rm tools pnpm -s admin:cli'

# İlk yönetici: okul yoksa --okul ile oluşturulur (karakter türleri de eklenir)
yonet kullanici-olustur --eposta mudur@okul.k12.tr --ad "Ayşe Yılmaz" --rol admin --okul "Atatürk İlkokulu"

# Öğretmenler (tek okul varsa --okul gerekmez)
yonet kullanici-olustur --eposta ogretmen@okul.k12.tr --ad "Mehmet Demir" --rol teacher

# Şifresini unutan kullanıcı: yeni şifre üretir, açık oturumlarını kapatır
yonet sifre-sifirla --eposta ogretmen@okul.k12.tr

yonet okullar
```

Her komut geçici şifreyi **bir kez** ekrana yazar; kişiye güvenli bir yoldan iletin. Öğretmen giriş yapıp sınıfını oluşturur; yönetici panelden seviye eşiklerini ayarlar.

## 5. Güncelleme

```bash
cd gelisim
git fetch --tags
git checkout vX.Y.Z
docker compose -f docker-compose.prod.yml up -d --build
```

Migration'lar `tools` servisiyle otomatik uygulanır; uygulama ancak migration başarılı olunca başlar. Güncellemeden önce elle bir yedek alın (aşağıda). Sorun olursa önceki etikete dönüp yeniden başlatın. Migration geri alınmadığı için şema değiştiyse yedekten dönün.

## 6. Yedekler

- Her gece `backups/` klasörüne `class_attitude_YYYY-MM-DD_HHMMSS.dump.gpg` yazılır (`pg_dump` + gpg AES-256).
- Sunucuda `BACKUP_RETENTION_DAYS` gün (varsayılan 14) tutulur, daha eskiler silinir.
- Günlükler: `docker compose -f docker-compose.prod.yml logs backup`

**Elle yedek** (güncellemeden önce):

```bash
docker compose -f docker-compose.prod.yml run --rm backup backup.sh
```

**Uzak kopya (önerilir):** sunucu kaybolursa yedek de kaybolur. Türkiye'de S3 uyumlu bir depolama için `.env`'de şu değerleri doldurun ve `backup` servisini yeniden başlatın. Uzakta da aynı saklama süresi uygulanır.

```
RCLONE_REMOTE=uzak:kova-adi/gelisim
RCLONE_CONFIG_UZAK_TYPE=s3
RCLONE_CONFIG_UZAK_PROVIDER=Other
RCLONE_CONFIG_UZAK_ENDPOINT=https://s3.saglayici.com.tr
RCLONE_CONFIG_UZAK_ACCESS_KEY_ID=...
RCLONE_CONFIG_UZAK_SECRET_ACCESS_KEY=...
```

### Yedekten geri dönme

Geri yükleme veritabanındaki **tüm** veriyi yedektekiyle değiştirir; tek transaction'dır, parola yanlışsa veya dosya bozuksa hiçbir şey değişmez.

```bash
C="docker compose -f docker-compose.prod.yml"
ls -lt backups/ | head                      # dosyayı seçin
$C stop app                                  # kullanıcılar yazmasın
$C run --rm backup restore.sh /backups/class_attitude_2026-10-01_023000.dump.gpg --evet
$C start app
```

Başka bir sunucuya taşırken: kurulumu 3. adıma kadar yapın, `backups/` klasörüne dosyayı kopyalayın, aynı `BACKUP_PASSPHRASE` ile yukarıdaki komutları çalıştırın.

**Ayda bir geri yükleme denemesi yapın:** bir yedeği ayrı bir makinede açmak, yedeğin gerçekten işe yaradığını gösteren tek kanıttır.

## 7. İzleme

```bash
docker compose -f docker-compose.prod.yml ps          # app "healthy" olmalı
docker compose -f docker-compose.prod.yml logs --since 1h app
df -h && du -sh backups/                               # disk
```

## 8. Güvenlik ve KVKK notları

- **Dışarıya açık tek servis Caddy'dir.** Veritabanı ve uygulama yalnızca Docker ağından erişilebilir.
- **İstemci IP'si güvenilirdir:** Caddy `X-Forwarded-For`'u gerçek istemci adresiyle yazar, dışarıdan gönderilen değeri yok sayar. Giriş, davet kodu, dışa aktarma ve silme onayı için hız sınırları ile denetim kaydı IP'leri bu adrese dayanır. Uygulamayı Caddy'yi atlayarak yayına açmayın.
- **Başlıklar:** HSTS (Caddy); `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (uygulama).
- **Silme talepleri:** veliler Ayarlar'dan çocuklarının verilerinin silinmesini ister. Yönetici Yönetim paneli → Silme talepleri ekranından verileri indirip veliye iletebilir, sonra kalıcı olarak siler ya da gerekçesiyle reddeder. Veli kendi hesabını şifresiyle hemen silebilir. Rıza kayıtları ispat için kişiyle bağı koparılarak saklanır.
- **Yedeklerde silinmiş veri:** silinen bir öğrencinin verisi, saklama süresi (14 gün) dolana kadar eski yedeklerde durur. Aydınlatma metninde bu süre belirtilmelidir.
- **KVKK metinleri** (`src/content/kvkk.ts`) taslaktır; pilot öncesi okulun hukuken onaylı metinleriyle değiştirilmelidir.
- Sırlar (`.env`) yalnızca sunucuda ve parola yöneticisinde tutulur; depoya eklenmez.

## 9. Sorun giderme

| Belirti | Olası neden |
|---|---|
| Sertifika alınamıyor | DNS kaydı henüz yayılmadı, 80/443 kapalı ya da `DOMAIN` yanlış. `logs caddy` |
| 502 Bad Gateway | `app` başlamadı: `tools` hata verdi mi (`logs tools`), `.env` eksik mi (`logs app`) |
| Herkesin oturumu kapandı | `BETTER_AUTH_SECRET` değişti |
| Veliye bildirim gitmiyor | `VAPID_*` boş ya da değişti; veli Ayarlar'dan bildirimi yeniden açmalı |
| `restore.sh`: "Bad session key" | `BACKUP_PASSPHRASE` yedeği alan parolayla aynı değil |
