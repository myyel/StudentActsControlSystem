# CLAUDE.md

@AGENTS.md

Bu proje, ilkokul (6–10 yaş) sınıfları için öğretmen–veli davranış ve gelişim takip uygulamasıdır. Ürün gereksinimleri: **`docs/PRD.md`** — her oturuma başlamadan oku.

## Teknoloji yığını
- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- PostgreSQL + Drizzle ORM (migration'lar `drizzle/` altında)
- Better Auth (e-posta/şifre, rol alanı: `admin | teacher | parent`)
- Web Push (VAPID) + Service Worker, PWA (`@serwist/next`)
- Zod (tüm girdi doğrulaması)
- Vitest (birim/entegrasyon), Playwright (e2e + responsive)
- Docker Compose (geliştirme ve üretim)

## Klasör yapısı
```
src/
  app/
    (auth)/giris, kayit, davet/[kod]
    ogretmen/...        # teacher rolü
    veli/...            # parent rolü
    admin/...           # admin rolü
    tahta/[sinifId]     # tam ekran tahta modu
    api/...             # yalnızca push, webhook vb. gerektiğinde
  components/ui/        # shadcn bileşenleri
  components/...        # alan bileşenleri
  server/
    db/schema.ts        # Drizzle şeması
    db/index.ts
    auth/               # oturum ve yetki yardımcıları
    services/           # iş mantığı (davranış, ilerleme, karakter, mesaj, push)
  lib/                  # ortak yardımcılar
tests/
  unit/  integration/  e2e/
docs/PRD.md
```

## Mimari kurallar
1. **Yetki her zaman sunucuda.** Her Server Action / route handler şu sırayla çalışır: oturumu al → rolü kontrol et → sahipliği kontrol et (`assertTeacherOfClass`, `assertParentOfStudent` gibi `src/server/auth/guards.ts` yardımcılarıyla) → Zod ile doğrula → servis çağır. Sadece UI'da gizlemek yetki değildir.
2. İş mantığı `src/server/services/` içinde; bileşenler ve action'lar ince kalır.
3. Veli sorguları her zaman `ParentStudent` üzerinden filtrelenir. Veliye başka öğrencinin adı bile dönmez.
4. `BehaviorEvent` eklenir/silinirken `Student.xp`, `Student.balance` ve `Student.characterLevel` **aynı transaction** içinde güncellenir. XP yalnızca pozitif puanlardan artar; silmede olayın `xpDelta`/`balanceDelta` değeri geri düşülür. `characterLevel` yalnızca yükselir, asla düşmez. Ev davranışları yalnızca pozitiftir ve günlük tavan yalnızca XP'ye uygulanır (ayrıntı: PRD §6).
5. Puan, olay kaydına **anlık kopya** (`pointsSnapshot`) olarak yazılır.
6. Kritik işlemler `AuditLog`'a yazılır (puan verme/silme, ilerleme değişikliği, veli bağlama, silme).
7. Tahta modunda ve çocukların göreceği hiçbir ekranda negatif puan, denge veya sıralama gösterilmez.
8. Telifli karakter, logo veya görsel kullanılmaz; karakter görselleri özgün SVG/Lottie'dir.

## UI kuralları
- Tüm arayüz metinleri **Türkçe**; kod, değişken ve commit mesajları İngilizce.
- Mobil öncelikli. Kırılımlar: 360 / 768 / 1280 / 1920px. Yatay kaydırma yok.
- Dokunma hedefleri en az 44×44px; tahta modunda en az 80px.
- Renk kontrastı WCAG AA. Karanlık mod desteklenir.
- Çocuk dostu, sıcak ama sade görünüm; öğretmen ekranları hızlı ve az dokunuşlu.

## Komutlar
```bash
cp .env.example .env           # ilk kurulum; BETTER_AUTH_SECRET'ı değiştir
docker compose up -d db        # Postgres
pnpm dev                       # geliştirme sunucusu
pnpm db:generate               # migration üret
pnpm db:migrate                # migration uygula
pnpm db:seed                   # örnek veri (boş DB'de); şifre: Sifre1234!, davet kodlarını konsola yazar
pnpm db:reset                  # tüm tabloları boşaltıp seed'i yeniden çalıştırır (yalnızca geliştirme)
pnpm lint && pnpm typecheck
pnpm test                      # Vitest — PGlite (bellek içi Postgres) kullanır, Docker gerekmez
pnpm test:e2e                  # Playwright (mobile, tablet, desktop, board projeleri) — Faz 8
```

- Testlerde veritabanı: `tests/helpers/db.ts` → `createTestDb()` (migration'lar uygulanmış PGlite). `@/server/db`'yi kullanan kodu test ederken `vi.mock("@/server/db", …)` ile bu örneğe yönlendir (örnek: `tests/integration/guards.test.ts`).
- Better Auth örneği `createAuth(db, options)` ile üretilir; testte `{ nextjs: false }` geç.

## Kod kalıpları
- **Zod**'u her zaman `@/lib/zod`'dan import et (`"zod"`dan değil): Türkçe hata mesajları orada ayarlı.
- **Servisler** `db` parametresi alır (`Db` veya `DbOrTx`), yetki kontrolü yapmaz; çağıran action/sayfa önce guard'ı çalıştırır. Birlikte atomik olması gereken servisler aynı `tx` ile çağrılır.
- **Action'lar** `ActionResult` döner (`src/server/action-result.ts`): beklenen hatalar `AuthError`/`UserError`/`ZodError` → `toActionError`; kullanıcıya gösterilecek iş hataları `UserError` ile fırlatılır. Değişiklikten sonra `refresh()` (`next/cache`).
- **Sayfalar** sahiplik hatasında 404 verir: `await orNotFound(assertTeacherOfClass(user, id))`.
- **Audit**: kritik işlemler `writeAudit(tx, …)` ile aynı transaction içinde yazılır.
- IP/tarayıcı bilgisi `getRequestMeta()`; üretimde reverse proxy `x-forwarded-for`'u doğru ayarlamalı (Faz 9).

## Çalışma şekli
- Her iş için önce plan çıkar, onay al, sonra uygula.
- Sıra: şema/migration → servis + testler → action/route → UI → e2e.
- Her özellik için **yetki testleri zorunlu**: özellikle "veli A, öğrenci B'nin verisine erişemez" ve "öğretmen başka sınıfı değiştiremez".
- Bir fazı bitirmeden önce `pnpm lint && pnpm typecheck && pnpm test` geçmeli.
- Küçük, anlamlı commit'ler at (Conventional Commits).
- **Her commit sürümlenir:** `VERSION_CONTROL.md` en üstüne yeni sürüm satırı eklenir ve aynı commit'e dahil edilir; commit `vX.Y.Z` olarak etiketlenir, `git push --follow-tags` ile gönderilir. Kurallar dosyanın başında.
- Yeni bağımlılık eklemeden önce gerekçesini söyle.
- Emin olmadığın ürün kararlarında PRD'ye bak; PRD'de yoksa sor, varsayım yapma.

## Yol haritası (fazlar)
0. Hazırlık — PRD, CLAUDE.md, veri modeli onayı
1. İskelet + auth + roller + guard'lar
2. Sınıf/öğrenci yönetimi + veli davet kodu/QR + veli kaydı + KVKK rıza
3. Davranış tipleri + puanlama + geri alma + zaman çizelgesi
4. Akademik duraklar (Ders→Konu→Durak) + sınıf matrisi + veli yol haritası
5. Karakter sistemi + seviye atlama + tahta modu
6. Veli paneli + ev davranışları + günlük tavan
7. Mesajlar + bildirim merkezi + Web Push + iOS rehberi
8. PWA + responsive e2e testleri + erişilebilirlik
9. Güvenlik, KVKK (silme/dışa aktarma, audit), Docker deploy, yedekleme, pilot

Güncel faz: **7**
