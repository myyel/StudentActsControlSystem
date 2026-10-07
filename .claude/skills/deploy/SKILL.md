---
name: deploy
description: Etiketlenmiş bir sürümü üretim sunucusuna SSH ile kurar - ön denetim, yedek, güncelleme, doğrulama ve gerekirse geri dönüş. Yalnızca kullanıcı /deploy yazdığında çalışır.
argument-hint: "<vX.Y.Z> <ssh-hedefi> [sunucudaki-klasör]"
disable-model-invocation: true
---

# Yayına alma aşamaları

Kaynak belge `docs/DEPLOY.md`'dir; bu dosya onun **§5 Güncelleme** bölümünü adım adım uygular. İlk kurulum (sunucu, alan adı, `.env`, ilk hesaplar: DEPLOY.md §1–4) bu komutun işi değildir; onu kullanıcı belgeyi izleyerek yapar.

Argümanlar: sürüm etiketi (ör. `v0.47.0`), SSH hedefi (ör. `gelisim@sunucu` ya da `~/.ssh/config`'deki ad), sunucudaki klasör (varsayılan `~/gelisim`). Etiket ya da SSH hedefi verilmediyse sor; tahmin etme.

Aşağıda `C` = `docker compose -f docker-compose.prod.yml`. Sunucu komutları `ssh <hedef> 'cd <klasör> && …'` ile çalışır.

## Değişmez kurallar

- Sunucuda `pnpm db:seed` ve `pnpm db:reset` **asla** çalıştırılmaz.
- `.env` dosyası okunmaz, yazdırılmaz, kopyalanmaz. Tek istisna alan adını öğrenmek için `grep '^DOMAIN=' .env`.
- `restore.sh` (yedekten dönme) tüm veriyi değiştirir: yalnızca kullanıcı o an açıkça onaylarsa çalıştırılır.
- Uygulama Caddy atlanarak dışarı açılmaz; port ya da güvenlik duvarı ayarına dokunulmaz.
- D2'den önce kullanıcıdan açık onay alınır. Önceki bir yayının onayı bu yayın için geçerli değildir.

## D1 — Ön denetim (yerelde)

1. `git status --short` boş olmalı; `git rev-parse <etiket>` etiketin var olduğunu göstermeli.
2. Etiket uzak depoda olmalı: `git ls-remote --tags origin <etiket>`. Yoksa dur; kullanıcıya `git push --follow-tags` gerektiğini söyle.
3. `VERSION_CONTROL.md`'de bu sürümün satırı olmalı.
4. Testler bu commit için geçmiş olmalı: `/test yayin` (T1–T6) çalıştır ya da bu oturumda aynı commit üzerinde geçtiyse sonucunu kullan. Kalan aşama varsa yayına devam etme.
5. Sunucudaki durumu oku (değişiklik yapmaz): `git describe --tags` (şu an yayındaki sürüm), `C ps`, `df -h .`. Disk %90'ın üstündeyse dur ve bildir.
6. Yayındaki sürüm ile yeni etiket arasında migration var mı: `git diff --stat <eski>..<yeni> -- drizzle/`. Varsa geri dönüşün yedekten yapılacağını planda belirt.

Sonra kullanıcıya planı göster (eski sürüm → yeni sürüm, migration var/yok, yapılacak komutlar) ve onay iste.

## D2 — Yedek

```bash
C run --rm backup backup.sh
ls -lt backups/ | head -3
```

En üstteki dosyanın saati şimdi olmalı ve boyutu sıfırdan büyük olmalı. Yedek alınamadıysa yayına devam etme.

## D3 — Güncelleme

```bash
git fetch --tags
git checkout <etiket>
C up -d --build
```

Derleme birkaç dakika sürer. `tools` servisi migration'ları uygular; `app` ancak o başarıyla bitince başlar.

## D4 — Doğrulama

1. `C ps`: `tools` "exited (0)", `app` "healthy" (3 dakikaya kadar bekle), `db`, `caddy`, `backup` "running".
2. `C logs --since 5m tools app` içinde hata yok.
3. Dışarıdan (yerel makineden), `https://<alan-adı>` için:
   - `/giris` → 200 ve `strict-transport-security` başlığı var
   - `/manifest.webmanifest`, `/sw.js`, `/icon/192` → 200
   - `http://<alan-adı>/giris` → HTTPS'e yönlendirme (301/308)
4. `git describe --tags` yeni etiketi göstermeli.

Hepsi tamam ise D6'ya geç. Biri bile değilse D5.

## D5 — Geri dönüş (yalnızca D4 kaldıysa)

Önce kullanıcıya ne kaldığını ve günlükteki hatayı göster.

- **Migration yoksa:** `git checkout <eski-etiket> && C up -d --build`, sonra D4'ü eski sürüm için yinele.
- **Migration uygulandıysa:** eski kod yeni şemayla çalışmayabilir. Seçenekleri sun (ileri düzeltme ya da D2 yedeğinden dönme) ve kararı kullanıcıya bırak. Yedekten dönme komutları DEPLOY.md §6'dadır; ayrı ve açık onay olmadan çalıştırma.

## D6 — Rapor

Kısa bir özet ver: eski ve yeni sürüm, alınan yedeğin dosya adı, D4'teki her denetimin sonucu, toplam süre. Doğrulayamadığın şeyi doğrulanmış gibi yazma (ör. anlık bildirim ve giriş akışı gerçek hesapla elle denenir). Yayından sonra kullanıcıya bir hesapla giriş yapıp bir sayfa açmasını öner.
