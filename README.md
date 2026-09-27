# Öğrenci Davranış ve Gelişim Sistemi

İlkokul (6–10 yaş) sınıfları için öğretmen–veli davranış ve gelişim takip uygulaması.

- **Öğretmen** öğrencilerin davranışlarını puanlar ve akademik ilerlemeyi "duraklar" üzerinden takip eder.
- **Veli** yalnızca kendi çocuğunu görür.
- Olumlu davranışlar çocukların gelişen karakterleriyle ödüllendirilir.

Ürün gereksinimleri: [`docs/PRD.md`](docs/PRD.md) · Sürüm geçmişi: [`VERSION_CONTROL.md`](VERSION_CONTROL.md)

> **Durum:** geliştirme aşamasında (MVP, Faz 7 / 9). Pilot kullanıma henüz hazır değildir.

## Özellikler

### Hazır olanlar
| Alan | Ne yapılabiliyor |
|---|---|
| **Giriş ve roller** | Yönetici, öğretmen ve veli rolleriyle e-posta/şifre girişi. Açık kayıt yok; giriş denemeleri hız sınırlı. |
| **Sınıf ve öğrenci** | Öğretmen sınıf oluşturur, öğrencileri tek tek veya liste yapıştırarak toplu ekler. Soyadının yalnızca baş harfi saklanır. |
| **Veli daveti** | Öğrenci başına davet kodu + QR (tek/çok kullanımlık, süreli, iptal edilebilir) ve sınıf için yazdırılabilir davet kartları. |
| **Veli kaydı** | Veli yalnızca davet koduyla kayıt olur veya hesabına çocuk ekler. KVKK aydınlatma ve açık rıza onayları sürümüyle kaydedilir. |
| **Davranış puanlama** | Karta dokun → davranış seç (2 dokunuş), toplu puanlama, 10 sn geri alma, zaman çizelgesinden silme. |
| **Davranış tipleri** | Okul/ev kapsamlı, olumlu/olumsuz puanlı davranışlar; her yeni sınıfa varsayılan liste gelir. |
| **XP ve denge** | XP yalnızca olumlu puanlardan artar; davranış dengesi olumlu + olumsuz toplamdır. Sayaçlar olayla aynı transaction'da güncellenir. |
| **Öğrenci detayı** | Zaman çizelgesi (Tümü/Okul/Ev filtresi), son 7 günün olumlu/olumsuz grafiği, bağlı veliler, davet kodları. |
| **Akademik duraklar** | Ders → Konu → Durak yönetimi, sürükle-bırak sıralama (dokunmatik + klavye), arşivleme. |
| **Sınıf matrisi** | Öğrenci × durak tablosu. Dokunarak durum değiştirme, 0–3 yıldız, durak başlığından toplu işaretleme. |
| **Veli yol haritası** | Çocuğun her dersteki ilerlemesi: tamamlanan duraklar, "şu an burada", gelecek duraklar. |
| **Karakterler** | 4 özgün tür × 5 evrim aşaması. XP ile seviye atlama (seviye asla düşmez), animasyonlu kutlama. Öğretmen öğrencinin türünü değiştirir. |
| **Karakter yönetimi** | Yönetici seviye eşiklerini, tür ve aşama adlarını ayarlar, türleri aktif/pasif yapar. |
| **Veli paneli** | Çocuk seçici, karakter, haftalık denge, son olaylar, akademik harita özeti; mesaj kartı Faz 7'de dolacak. |
| **Ev davranışları** | Veli bugün evde yapılanları işaretler; günlük ev XP tavanı (öğretmen ayarlar) yalnızca XP'yi sınırlar; 10 sn geri alma. |
| **Tahta modu** | Akıllı tahtada tam ekran: büyük karakter kartları, yalnızca olumlu puan, tüm sınıfa puan; XP, denge ve sıralama yok. |

### Sıradakiler
Mesajlar ve Web Push bildirimleri → PWA ve uçtan uca testler → güvenlik, KVKK araçları ve yayına alma. Ayrıntılar: [Yol haritası](#yol-haritası).

## Teknoloji

- **Uygulama:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)
- **Arayüz:** Tailwind CSS 4, shadcn/ui (Radix), `@dnd-kit` (sürükle-bırak)
- **Veri:** PostgreSQL 17, Drizzle ORM (migration'lar `drizzle/` altında)
- **Kimlik doğrulama:** Better Auth (e-posta/şifre, rol: `admin | teacher | parent`)
- **Doğrulama ve test:** Zod (Türkçe hata mesajları), Vitest + PGlite (testler için Docker gerekmez)
- **Geliştirme ortamı:** Docker Compose (Postgres)

## Kurulum

### Gereksinimler
- Node.js 22+
- pnpm 10 (`npm i -g pnpm`)
- Docker (Desktop) — yalnızca geliştirme veritabanı için

### İlk çalıştırma
```bash
git clone https://github.com/myyel/StudentActsControlSystem.git
cd StudentActsControlSystem
pnpm install

cp .env.example .env            # BETTER_AUTH_SECRET'ı rastgele 32+ karakterle değiştirin
docker compose up -d db         # Postgres 17
pnpm db:migrate                 # tabloları oluştur
pnpm db:seed                    # örnek veri
pnpm dev                        # http://localhost:3000
```

`BETTER_AUTH_SECRET` için rastgele bir değer üretmek:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Örnek hesaplar
`pnpm db:seed` ve `pnpm db:reset` aşağıdaki verileri oluşturur. Tüm hesapların şifresi `Sifre1234!`.

| Hesap | Rol | İçerik |
|---|---|---|
| `admin@ornek.okul` | Yönetici | Karakter türleri ve seviye eşikleri (demo için düşük: 0/4/8/12/16 XP) |
| `ogretmen@ornek.okul` | Öğretmen | 2-A: 20 öğrenci, davranış geçmişi, 3 ders ve ilerleme |
| `ogretmen2@ornek.okul` | Öğretmen | 2-B: 8 öğrenci, 1 ders |
| `veli1@ornek.okul` | Veli | Ada Y. ve Ali K. (2-A), son 5 günün ev kayıtları |
| `veli2` … `veli5@ornek.okul` | Veli | Birer çocuk (2-A) |
| `veli6@ornek.okul` | Veli | Arda C. (2-B) |

Seed, veli kaydını denemek için kullanılabilir, iptal edilmiş ve süresi dolmuş **davet kodlarını konsola yazar**. Örnek davet adresi: `http://localhost:3000/davet/ABCD-EFGH`.

> Seed yalnızca geliştirme içindir, `NODE_ENV=production` iken çalışmaz.

## Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build` / `pnpm start` | Üretim derlemesi / çalıştırma |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Route tiplerini üretip `tsc --noEmit` |
| `pnpm test` | Vitest (birim + entegrasyon, PGlite ile) |
| `pnpm db:generate` | Şema değişikliğinden migration üret |
| `pnpm db:migrate` | Migration'ları uygula |
| `pnpm db:seed` | Boş veritabanına örnek veri |
| `pnpm db:reset` | Tüm tabloları boşaltıp seed'i yeniden çalıştır (yalnızca geliştirme) |
| `pnpm db:studio` | Drizzle Studio |

Bir değişikliği göndermeden önce: `pnpm lint && pnpm typecheck && pnpm test`

## Proje yapısı

```
src/
  app/
    (auth)/giris, davet/[kod]      # giriş, davet koduyla veli kaydı
    ogretmen/                      # öğretmen: sınıflar, puanlama, matris, duraklar, davranışlar, davetler
    veli/                          # veli: panel, ev davranışları, yol haritası, çocuk ekleme
    admin/                         # yönetici: karakterler ve seviye eşikleri
    tahta/[sinifId]                # tam ekran tahta modu
    kvkk/[belge]                   # aydınlatma ve açık rıza metinleri
    api/auth/[...all]              # Better Auth uç noktaları
  components/                      # arayüz bileşenleri (ui/ = shadcn)
  content/                         # varsayılan davranışlar, KVKK metinleri
  lib/                             # istemci ve sunucunun paylaştığı yardımcılar
  server/
    auth/                          # Better Auth, oturum, guard'lar (sahiplik kontrolleri)
    db/                            # Drizzle şeması, bağlantı, seed
    services/                      # iş mantığı
    validation/                    # Zod şemaları
  proxy.ts                         # oturum çerezine göre iyimser yönlendirme
drizzle/                           # SQL migration'lar
tests/
  unit/  integration/  helpers/
docs/PRD.md                        # ürün gereksinimleri
```

## Mimari ilkeler

- **Yetki her zaman sunucuda.** Her Server Action şu sırayla çalışır: oturum → rol → sahiplik (`src/server/auth/guards.ts`) → Zod doğrulama → servis. Arayüzde gizlemek yetki sayılmaz.
- **Veli verisi izolasyonu.** Veli sorguları her zaman veli–öğrenci bağlantısı üzerinden yapılır; veliye başka bir öğrencinin adı bile dönmez. Bu kural otomatik testlerle doğrulanır.
- **Tutarlı sayaçlar.** Davranış olayı eklenip silinirken XP ve denge aynı transaction içinde güncellenir. Her olay puanın anlık kopyasını saklar; davranış tipi değişse de geçmiş değişmez.
- **Denetim kaydı.** Puan verme/silme, ilerleme değişikliği, veli bağlama gibi kritik işlemler `audit_log`'a yazılır.
- **Çocuk dostu ekranlar.** Tahta modunda ve çocukların göreceği ekranlarda negatif puan, denge veya sıralama gösterilmez.
- **Veri azaltma.** Öğrencinin soyadının yalnızca baş harfi saklanır; davet kodları veritabanında yalnızca hash olarak durur.

Geliştirme kuralları ve kod kalıpları: [`CLAUDE.md`](CLAUDE.md).

## Testler

`pnpm test` bellek içi PostgreSQL (PGlite) üzerinde gerçek migration'larla çalışır; Docker gerekmez. Her özellik için yetki testleri zorunludur, özellikle:

- **Veli izolasyonu:** "veli A, öğrenci B'nin verisine erişemez" (liste, detay, yol haritası),
- **Sınıf izolasyonu:** "öğretmen başka sınıfı değiştiremez" (öğrenci, puan, davranış tipi, müfredat, matris),
- **Sayaç tutarlılığı:** XP ve denge her senaryoda silinmemiş olayların toplamına eşittir.

## Yol haritası

| Faz | Kapsam | Durum |
|---|---|---|
| 0 | PRD, veri modeli | ✅ |
| 1 | İskelet, kimlik doğrulama, roller, guard'lar | ✅ |
| 2 | Sınıf/öğrenci yönetimi, davet kodu + QR, veli kaydı, KVKK rızası | ✅ |
| 3 | Davranış tipleri, puanlama, geri alma, zaman çizelgesi | ✅ |
| 4 | Akademik duraklar, sınıf matrisi, veli yol haritası | ✅ |
| 5 | Karakter sistemi, seviye atlama, tahta modu | ✅ |
| 6 | Veli paneli, ev davranışları, günlük ev XP tavanı | ✅ |
| 7 | Mesajlar, bildirim merkezi, Web Push, iOS rehberi | ⏳ sıradaki |
| 8 | PWA, responsive uçtan uca testler, erişilebilirlik | |
| 9 | Güvenlik, KVKK (silme/dışa aktarma), Docker ile yayına alma, yedekleme, pilot | |

## Sürümleme

Her commit [Conventional Commits](https://www.conventionalcommits.org/) biçimindedir ve bir sürüm numarası alır. Sürüm [`VERSION_CONTROL.md`](VERSION_CONTROL.md)'ye yazılır ve `vX.Y.Z` etiketiyle işaretlenir:

- `feat` ortadaki sayıyı artırır,
- diğer türler son sayıyı artırır.

## Önemli notlar

- **KVKK metinleri taslaktır** (`src/content/kvkk.ts`). Pilot öncesi okulun hukuken onaylı metinleriyle değiştirilmelidir.
- Karakter görselleri özgündür (`public/characters/`, şimdilik yer tutucu SVG); telifli karakter, logo veya görsel kullanılmaz.
- Lisans henüz belirlenmedi.
