---
name: test
description: Projenin test aşamalarını sırayla çalıştırır (lint, typecheck, Vitest, migration eşitliği, Playwright e2e, üretim imajı) ve sonuç tablosu verir. Kullanıcı testleri çalıştırmak, bir sürümü yayına hazırlamak ya da "her şey geçiyor mu" diye sormak istediğinde kullan.
argument-hint: "[hizli | tam | yayin]"
---

# Test aşamaları

Kapsam argümanla seçilir; argüman yoksa `tam`.

| Kapsam | Aşamalar | Ne zaman |
|---|---|---|
| `hizli` | T1–T3 | Küçük değişiklikten sonra, commit öncesi |
| `tam` | T1–T5 | Bir işi bitirirken (varsayılan) |
| `yayin` | T1–T6 | Sürüm etiketlemeden ve `/deploy`'dan önce |

## Hazırlık (T0)

1. `git status --short` çıktısını not et; commit edilmemiş değişiklik varsa raporda belirt (testler çalışma dizinini sınar, etiketi değil).
2. T4 ve T5 Postgres ister: `docker compose up -d db`, ardından `docker compose ps db` çıktısında `healthy` görünene kadar bekle. Docker çalışmıyorsa kullanıcıya söyle; T1–T3 yine de çalışır.
3. `pnpm-lock.yaml` son `pnpm install`'dan sonra değiştiyse `pnpm install --frozen-lockfile`.

## Aşamalar

| # | Aşama | Komut | Geçme ölçütü |
|---|---|---|---|
| T1 | Lint | `pnpm lint` | Hata ve uyarı yok |
| T2 | Tip denetimi | `pnpm typecheck` | Hata yok |
| T3 | Birim + entegrasyon | `pnpm test` | Tüm testler geçer (PGlite; Docker gerekmez) |
| T4 | Migration eşitliği | `pnpm db:generate` | "No schema changes"; `drizzle/` altında yeni dosya oluşmaz |
| T5 | Uçtan uca | `pnpm test:e2e` | mobile, tablet, desktop, board projelerinin tümü geçer |
| T6 | Üretim imajı | `docker build --target app -t gelisim-app:test .` ve `docker build --target tools -t gelisim-tools:test .` | İki hedef de derlenir |

Notlar:

- T1–T3 birbirinden bağımsızdır; biri kalsa da diğerlerini çalıştır ki rapor eksiksiz olsun. T5 ve T6 uzun sürer; T1–T4'ten biri kaldıysa bunları çalıştırma, önce onu bildir.
- T4 yeni bir migration dosyası üretirse şema ile migration'lar ayrışmış demektir. Dosyayı silme; adını raporla ve kullanıcıya sor.
- T5 üretim derlemesini `.next-e2e`'ye alır, 3100 portunda `class_attitude_e2e` veritabanıyla çalışır; geliştirme sunucusuna (3000) ve geliştirme verisine dokunmaz. İlk çalıştırma derleme yüzünden birkaç dakika sürer.
- T6 için `.env` gerekmez (Dockerfile derleme sırasında yer tutucu değer kullanır).

## Kalan bir aşamada

- Önce çıktıyı oku ve nedeni bul. Hata bu oturumdaki değişiklikten geliyorsa düzelt ve yalnızca o aşamayı yeniden çalıştır.
- Bir testi geçirmek için testi zayıflatma, atlama (`.skip`) ya da beklenen değeri hataya uydurma. Testin kendisi yanlışsa nedenini açıkla ve kullanıcıya sor.
- e2e'de bir kez kalıp yeniden çalıştırınca geçen testi "geçti" diye yazma; "kararsız" olarak adıyla raporla.

## Rapor

Sonunda tek tablo ver: aşama, sonuç (geçti / kaldı / çalıştırılmadı), sayı (ör. "290 test"), süre. Kalan her aşama için hata çıktısının ilgili satırlarını ekle. Çalıştırmadığın aşamayı geçmiş gibi gösterme.

Otomatik testlerin kapsamadığı, gerçek cihazda bakılması gerekenler (`docs/Test-Senaryolari.pdf`): iOS Safari ve Android Chrome'da ana ekrana ekleme ve anlık bildirim, akıllı tahta dokunmatiği, Huawei Tarayıcı (kendi koyu modunu uygular). Bir sürüm yayına gidecekse raporun sonunda bunları hatırlat.
