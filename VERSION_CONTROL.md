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
