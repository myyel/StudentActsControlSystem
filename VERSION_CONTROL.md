# Sürüm Kontrolü

Her commit bir sürüm numarası alır, bu dosyaya kaydedilir ve aynı numarayla git etiketi (`vX.Y.Z`) oluşturulur.

## Kurallar

Sürümleme [SemVer](https://semver.org/lang/tr/) ile yapılır: `MAJOR.MINOR.PATCH`. Proje 1.0'a (pilot) kadar `0.x` serisinde kalır.

| Commit türü (Conventional Commits) | Artan kısım | Örnek |
|---|---|---|
| `feat` | MINOR | 0.1.1 → 0.2.0 |
| `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `build`, `ci` | PATCH | 0.2.0 → 0.2.1 |
| Geriye uyumsuz değişiklik (`!` veya `BREAKING CHANGE`), 1.0 sonrası | MAJOR | 1.4.2 → 2.0.0 |

Her commit'te:
1. Yeni sürümü belirle ve bu dosyanın **en üstüne** (Sürümler başlığının altına) bir kayıt ekle.
2. Dosyayı commit'e dahil et.
3. Commit'i `git tag -a vX.Y.Z -m "vX.Y.Z"` ile etiketle, `git push --follow-tags` ile gönder.

Commit hash'i, commit'in kendi içinde yazılamayacağı için tabloda tutulmaz; `git show vX.Y.Z` ile bulunur.

## Sürümler

| Sürüm | Tarih | Tür | Özet | Faz |
|---|---|---|---|---|
| 0.30.3 | 2026-09-29 | test | Playwright e2e (`pnpm test:e2e`): 360/768/1280/1920px projeleri (mobile, tablet, desktop, board) ayrı bir `class_attitude_e2e` veritabanına karşı üretim derlemesiyle (`.next-e2e`) çalışır; kurulum projesi DB'yi oluşturur, migration + seed uygular, her rol bir kez giriş yapar. Anahtar ekranlarda yatay kaydırma yok, dokunma hedefleri (dokunmatikte 44px, tahtada 80px), axe WCAG 2 AA (kontrast dahil, açık/karanlık); puan ver/geri al, tahtada olumsuz puan/XP yok, yetki (başka sınıf / başka çocuk → 404), ev davranışı, mesaj tepkisi, PWA manifest/ikonlar ve çevrimdışı ekran; klavye: giriş, pencere odak tuzağı + Esc, sürükle-bırak sıralama. Yeni geliştirme bağımlılıkları: `@playwright/test`, `@axe-core/playwright` | 8 |
| 0.30.2 | 2026-09-29 | fix | Türkçe 404 ("Sayfa bulunamadı"; başkasına ait kayıtlarda da aynı metin, var olduğu belli olmaz) ve hata sayfası ("Bir sorun oluştu", bağlantı kopunca da gösterilir, Tekrar dene); Next'in İngilizce varsayılan sayfalarının yerine | 8 |
| 0.30.1 | 2026-09-29 | fix | Erişilebilirlik: dokunmatik ekranlarda düğme ve girişler en az 44px (`pointer-coarse:min-h-11`; tahta modunun 80px'i korunur), `←` geri bağlantıları ortak `BackLink` ile 44px, davranış penceresindeki öğrenci detayı bağlantısı 44px, pencere kapatma düğmesi 44px ve Türkçe ("Kapat"), pencere kapanınca odak açan öğeye (ör. öğrenci kartı) döner, yol haritasında başlanmamış duraklar opaklık yerine AA kontrastlı soluk renkte, tahta moduna `main` bölgesi | 8 |
| 0.30.0 | 2026-09-29 | feat | PWA: çevrimdışı açılış ekranı (`/cevrimdisi`; service worker yalnızca bu sayfayı ve dosyalarını saklar, oturum açılmış sayfalar asla önbelleğe alınmaz, sayfa açılamazsa bu ekran gösterilir, Tekrar dene), service worker artık her sayfada kaydedilir (push açılmasa da), manifest'e `id`/`orientation`/`categories`, Android için tek renkli bildirim rozeti (`/badge`) | 8 |
| 0.29.2 | 2026-09-28 | docs | Faz 7 tamamlandı: PRD'ye mesaj/okundu/tepki, yalnızca veliye bildirim, gecikmeli davranış push'u, ev girişlerinin bildirim üretmemesi, tercih ve cihaz aboneliği kararları; README ve CLAUDE.md (push:keys, bildirim kalıbı) güncellendi; güncel faz 8 | 7 |
| 0.29.1 | 2026-09-28 | chore | Faz 7 seed: 2-A için iki duyuru ve Ada Y. / Ayşe D. için özel mesaj, 2-B duyurusu; okundu ve tepki kayıtları; puan geçmişinden gelen bildirimler geriye tarihlendi, 1 günden eskiler okundu | 7 |
| 0.29.0 | 2026-09-28 | feat | Veli arayüzü: üst çubukta okunmamış sayılı Mesajlar/Bildirimler/Ayarlar, mesaj listesi (çocuğa göre filtre) ve detay (açınca okundu, Gördüm 👍 / Teşekkürler 🙏 hızlı tepki), bildirim merkezi (tümünü okundu yap), Ayarlar: 4 bildirim tercihi, bu cihazda anlık bildirim aç/kapat, iOS Ana ekrana ekle rehberi; panelde okunmamış mesajlar kartı ve iOS'ta kapatılabilir rehber bandı; çıkışta cihazın push aboneliği silinir | 7 |
| 0.28.0 | 2026-09-28 | feat | Öğretmen Mesajlar sekmesi: sınıf duyurusu veya öğrenciye özel mesaj yazma, gönderilenlerde okundu sayısı ve tepkiler, açılır veli listesi (okudu/okumadı, tepki), onaylı silme; öğrenci detayından velilere mesaj bağlantısı | 7 |
| 0.27.0 | 2026-09-28 | feat | Web Push altyapısı: service worker (`public/sw.js`, push + tıklayınca ilgili ekrana gitme), `/bildirim/[id]` (okundu yapıp yönlendirir), manifest + uygulama ikonları, VAPID ayarları ve `pnpm push:keys`; mesaj, okundu/tepki, bildirim tercihi ve abonelik action'ları; davranış push'u geri alma süresi dolunca, olay duruyorsa gönderilir | 7 |
| 0.26.0 | 2026-09-28 | feat | Mesaj servisi (sınıf duyurusu ve öğrenciye özel mesaj, alıcılar anlık çözülür, okundu bilgisi ve hızlı tepki, öğretmene okundu/tepki özeti, soft delete + audit); bildirim servisi (tercihlere uyan oluşturma, okul davranışında olumlu/olumsuz ve seviye atlama bildirimleri aynı transaction'da, geri alma/silmede davranış bildirimi kaldırılır, ev girişleri bildirim üretmez); push servisi (web-push, abonelik kaydı/silme, bilinen push servisleriyle sınırlı endpoint, 404/410 ve 5 hatada abonelik silinir); veli mesaj guard'ı; yetki testleri | 7 |
| 0.25.0 | 2026-09-28 | feat | Mesaj, okundu/tepki, bildirim, bildirim tercihi ve push aboneliği tabloları | 7 |
| 0.24.2 | 2026-09-28 | docs | Faz 6 tamamlandı: PRD'ye veli geri alma (10 sn), notların veliye kapalı olması, yalnızca bugün için ev girişi, paylaşılan tavan ve tavan ayarı, veli paneli yapısı kararları; README güncellendi; güncel faz 7 | 6 |
| 0.24.1 | 2026-09-28 | chore | Faz 6 seed: veli1 (Ada, Ali) ve veli2 (Ayşe) için son 5 güne yayılmış ev kayıtları; Ada için bir gün günlük tavanı aşıyor | 6 |
| 0.24.0 | 2026-09-28 | feat | Öğretmen zaman çizelgesi: Tümü/Okul/Ev filtresi, her kayıtta Okul/Ev etiketi, ev kayıtlarında girişi yapan veli, tavan nedeniyle XP'si kesilen kayıtlarda açıklama | 6 |
| 0.23.0 | 2026-09-28 | feat | Veli paneli (`/veli/[ogrenciId]`): çocuk seçici ve çocuk ekleme, karakter + XP çubuğu, haftalık denge ve 7 günlük grafik, Evde bugün (ev davranışı girişi, günlük tavan göstergesi ve uyarısı, 10 sn geri alma, seviye kutlaması), son olaylar (Okul/Ev, notsuz), akademik harita özeti, yer tutucu mesaj kartı; /veli ilk çocuğa yönlendirir, davetten sonra bağlanan çocuğun paneli açılır | 6 |
| 0.22.1 | 2026-09-28 | fix | Haftalık grafiğin ekran okuyucu tablosu sr-only kapsayıcıya alındı; 360px'te sayfayı genişletip yatay kaydırma oluşturuyordu | 6 |
| 0.22.0 | 2026-09-28 | feat | Davranışlar sayfasının Ev sekmesinde günlük ev XP tavanı ayarı (0–50, açıklamalı) | 6 |
| 0.21.0 | 2026-09-28 | feat | Ev davranışı servisi: veli yalnızca çocuğunun sınıfının aktif ev davranışlarını bugün için girer; günlük ev XP tavanı okul saat dilimine göre ve yalnızca XP'ye uygulanır (denge tam puan), aynı transaction'da seviye; tekrar gönderime dayanıklı; öğretmen için tavan ayarı servisi; veli paneli verisi (notsuz, parent_student üzerinden); zaman çizelgesinde kaynak filtresi; yetki ve tavan testleri | 6 |
| 0.20.2 | 2026-09-28 | docs | Faz 5 tamamlandı: PRD'ye tür seçimi (yalnızca öğretmen), sabit 5 seviye ve eşik kuralları, admin tür yönetimi, tahta modu oturumu ve kart içeriği kararları; README güncellendi; güncel faz 6 | 5 |
| 0.20.1 | 2026-09-28 | chore | Faz 5 seed: okula ait 4 karakter türü (Ejderha, Baykuş, Robot, Tohum) ve 5'er aşama, demo seviye eşikleri 0/4/8/12/16 XP; öğrenciler geçmişe göre 2–5. seviyelerde | 5 |
| 0.20.0 | 2026-09-28 | feat | Tahta modu (`/tahta/[sinifId]`): öğretmen oturumuyla tam ekran, büyük karakter kartları (ad + seviye çubuğu; XP, denge, sıralama yok), yalnızca olumlu davranışlar, tüm sınıfa puan, 80px dokunma hedefleri, büyük geri alma çubuğu ve seviye kutlaması; sınıf menüsünde bağlantı | 5 |
| 0.19.0 | 2026-09-28 | feat | Öğretmen ekranlarında karakter: öğrenci detayında aşama, seviye, ilerleme çubuğu ve tür seçici (seviye korunur); puanlama kartlarında karakter görseli; seviye atlayınca evrim animasyonu ve konfeti (azaltılmış harekette sade geçiş) | 5 |
| 0.18.0 | 2026-09-28 | feat | Admin karakter sayfası (`/admin/karakterler`): 5 seviyenin XP eşikleri, okulun karakter türlerini adlandırma/aktif-pasif yapma ve aşama adları (önizlemeli); genel türler salt okunur | 5 |
| 0.17.0 | 2026-09-28 | feat | Karakter servisi: seviye eşikleri (varsayılan 0/20/50/100/200, düşürmeden yeniden hesaplama), puan verirken aynı transaction içinde seviye atlama (`levelUps`), tür/aşama düzenleme, öğrenci türü değiştirme, tahta verisi; 4 tür × 5 aşama özgün yer tutucu SVG; yetki ve seviye testleri | 5 |
| 0.16.0 | 2026-09-28 | feat | Karakter tabloları: okul bazlı seviye eşikleri (`character_level`, 1–5) ve tür başına evrim aşamaları (`character_stage`) | 5 |
| 0.15.3 | 2026-09-27 | docs | README: proje tanımı, özellikler, teknoloji, kurulum, örnek hesaplar, komutlar, yapı, mimari ilkeler, testler, yol haritası | 4 |
| 0.15.2 | 2026-09-27 | docs | Faz 4 tamamlandı: PRD'ye sürükle-bırak, arşivleme, matris dokunuş/yıldız/toplu işaretleme ve yol haritası kararları; güncel faz 5 | 4 |
| 0.15.1 | 2026-09-27 | chore | Faz 4 seed: 2-A için Türkçe/Matematik/Hayat Bilgisi (7 konu, 24 durak) ve öğrenci başına tutarlı ilerleme; 2-B için Matematik | 4 |
| 0.15.0 | 2026-09-27 | feat | Veli için çocuğun yol haritası: ders kartları, ilerleme çubuğu, konu başlıkları altında durak patikası (tamamlandı + yıldız, "şu an burada", soluk gelecek duraklar); veli ana sayfasından bağlantı | 4 |
| 0.14.0 | 2026-09-27 | feat | Sınıf matrisi (öğrenci × durak, ders sekmeleri): dokunarak durum döngüsü, yıldız modu, iyimser güncelleme, durak başlığından tüm sınıf/seçili öğrenciler için toplu işaretleme, tamamlayan sayıları | 4 |
| 0.13.0 | 2026-09-27 | feat | Ders → Konu → Durak yönetimi: ekle, yeniden adlandır, arşivle/geri al, @dnd-kit ile dokunmatik ve klavyeyle sürükle-bırak sıralama (Türkçe ekran okuyucu duyuruları) | 4 |
| 0.12.0 | 2026-09-27 | feat | Ders, konu, durak (arşivlenebilir) ve öğrenci ilerlemesi tabloları (durum + yalnızca tamamlanmışta 0–3 yıldız) | 4 |
| 0.11.2 | 2026-09-27 | docs | Faz 3 tamamlandı: PRD'ye puan aralığı, varsayılan liste, 10 sn geri alma, kart görünümü, grafik ve şema değişiklikleri (BehaviorTemplate yok, tek batchId); güncel faz 4 | 3 |
| 0.11.1 | 2026-09-27 | chore | Faz 3 seed: 2-A ve 2-B'ye varsayılan davranışlar, 2-A için son 10 günün hafta içi günlerine yayılmış ~200 puan kaydı (puanlama servisiyle, sabit tohumlu) | 3 |
| 0.11.0 | 2026-09-27 | feat | Öğrenci detayında XP ve denge sayaçları, son 7 gün olumlu/olumsuz grafiği (okul saat dilimi), güne göre gruplu zaman çizelgesi, onaylı kayıt silme, "daha fazla" sayfalama | 3 |
| 0.10.0 | 2026-09-27 | feat | Karta dokun → davranış seç puanlama, çoklu seçimle toplu puanlama, 10 sn geri alma çubuğu, xp/denge sayaçlarının aynı transaction'da güncellenmesi, tekrarlanan isteklere karşı batch kimliği, olay silme servisi | 3 |
| 0.9.0 | 2026-09-27 | feat | Davranış tipleri yönetimi (okul/ev sekmeleri, ekle/düzenle, aktif/pasif, sıralama), yeni sınıfa varsayılan 14 davranış, eski sınıflar için "varsayılan listeyi yükle", sınıf alt menüsü | 3 |
| 0.8.0 | 2026-09-27 | feat | Davranış tipi ve davranış olayı tabloları (puan kısıtları, ev yalnızca pozitif, snapshot'lar, xp/denge farkları, batch benzersizliği) | 3 |
| 0.7.3 | 2026-09-27 | docs | Faz 2 tamamlandı: PRD'ye davet/KVKK kararları, CLAUDE.md'ye kod kalıpları ve `db:reset`, güncel faz 3 | 2 |
| 0.7.2 | 2026-09-27 | fix | Özel mesajı olmayan doğrulama hataları İngilizce yerine Türkçe gösteriliyor (Zod Türkçe dil paketi) | 2 |
| 0.7.1 | 2026-09-27 | chore | Faz 2 seed verisi (2 öğretmen, 2-A/2-B, davet koduyla bağlanan 6 veli, rıza/audit kayıtları, deneme için aktif/iptal/süresi dolmuş kodlar) ve `pnpm db:reset` | 2 |
| 0.7.0 | 2026-09-27 | feat | Davet koduyla veli kaydı ve mevcut hesaba çocuk ekleme, zorunlu KVKK onayları, KVKK metin sayfaları, veli çocuk listesi, girişte güvenli `next` dönüşü; "Veli A, öğrenci B'yi göremez" testleri | 2 |
| 0.6.0 | 2026-09-27 | feat | Öğrenci başına davet kodu + QR (hash'li, tek/çok kullanımlık, süreli, iptal edilebilir), sınıf için yazdırılabilir davet kartları, kilitli kod kullanımı, DB tabanlı rate limit, KVKK taslak metinleri | 2 |
| 0.5.0 | 2026-09-27 | feat | Öğretmen sınıf oluşturma, sınıf listesi, öğrenci ekleme (tekli + önizlemeli toplu), öğrenci düzenleme ve aktif/pasif; audit kaydı | 2 |
| 0.4.0 | 2026-09-27 | feat | Davet kodu, KVKK rıza kaydı ve audit log tabloları; veli–öğrenci bağlantısına davet kodu referansı | 2 |
| 0.3.2 | 2026-09-27 | docs | Faz 1 tamamlandı: CLAUDE.md komutları ve test notları güncellendi, güncel faz 2 | 1 |
| 0.3.1 | 2026-09-27 | test | Yetki testleri (PGlite): guard'lar, oturum yardımcıları, giriş, kapalı kayıt, rol yükseltme engeli, giriş rate limit'i; vite-tsconfig-paths kaldırıldı | 1 |
| 0.3.0 | 2026-09-27 | feat | Better Auth ile e-posta/şifre girişi (açık kayıt kapalı, rol istemciden atanamaz, giriş rate limit), rol bazlı yönlendirme, proxy, rol sayfaları, sahiplik guard'ları, seed | 1 |
| 0.2.0 | 2026-09-27 | feat | Faz 1 şeması ve ilk migration: okul, Better Auth tabloları, sınıf, sınıf–öğretmen, karakter türü, öğrenci, veli–öğrenci | 1 |
| 0.1.2 | 2026-09-27 | chore | Next.js 16 + Tailwind 4 + shadcn/ui iskeleti, Docker Compose (Postgres 17), Drizzle/Vitest yapılandırması, script'ler | 1 |
| 0.1.1 | 2026-09-27 | chore | Sürüm kontrol dosyası ve commit başına sürümleme kuralı eklendi | 1 |
| 0.1.0 | 2026-09-27 | docs | Faz 0: veri modeli kararları, PRD §6 şeması, CLAUDE.md kural 4 güncellendi | 0 |
