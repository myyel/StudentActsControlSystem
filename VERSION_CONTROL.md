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
