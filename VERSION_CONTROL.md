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
| 0.3.0 | 2026-09-27 | feat | Better Auth ile e-posta/şifre girişi (açık kayıt kapalı, rol istemciden atanamaz, giriş rate limit), rol bazlı yönlendirme, proxy, rol sayfaları, sahiplik guard'ları, seed | 1 |
| 0.2.0 | 2026-09-27 | feat | Faz 1 şeması ve ilk migration: okul, Better Auth tabloları, sınıf, sınıf–öğretmen, karakter türü, öğrenci, veli–öğrenci | 1 |
| 0.1.2 | 2026-09-27 | chore | Next.js 16 + Tailwind 4 + shadcn/ui iskeleti, Docker Compose (Postgres 17), Drizzle/Vitest yapılandırması, script'ler | 1 |
| 0.1.1 | 2026-09-27 | chore | Sürüm kontrol dosyası ve commit başına sürümleme kuralı eklendi | 1 |
| 0.1.0 | 2026-09-27 | docs | Faz 0: veri modeli kararları, PRD §6 şeması, CLAUDE.md kural 4 güncellendi | 0 |
