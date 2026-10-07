// Test ve yayına alma raporunu (docs/Test-ve-Yayin-Raporu.pdf) üretir: Claude Code'un /test,
// /deploy ve /kurulum komutlarının (.claude/skills/) aşamaları ve son çalıştırmanın sonuçları.
//   node scripts/kilavuz/test-ve-yayin.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const DIR = path.resolve("docs/kilavuz");
const OUT_HTML = path.join(DIR, "test-ve-yayin.html");
const OUT_PDF = path.resolve("docs/Test-ve-Yayin-Raporu.pdf");

// Son çalıştırma: aşamaları yeniden çalıştırınca burayı güncelleyin.
const RUN = {
  date: "8 Ekim 2026",
  version: "v0.47.0",
  // Raporun kendisi (metin, komutlar) en son bu sürümde düzenlendi; test sonuçları `version` içindir.
  revised: "v0.49.1",
  machine: "Windows 11, Node 22, Docker Desktop",
  stages: {
    T1: { result: "geçti", detail: "hata ve uyarı yok", time: "10 sn" },
    T2: { result: "geçti", detail: "hata yok", time: "3 sn" },
    T3: { result: "geçti", detail: "31 dosya, 290 test", time: "22 sn" },
    T4: { result: "geçti", detail: "şema değişikliği yok (14 migration)", time: "birkaç sn" },
    T5: { result: "geçti", detail: "173 test geçti; 12 atlandı (ortak veriyi değiştiren 4 test yalnızca tek ekranda koşar)", time: "2 dk" },
    T6: { result: "geçti", detail: "app 315 MB, tools 1,25 GB (katmanlar önbellekten)", time: "36 sn" },
  },
};

const code = (text) => `<pre>${text}</pre>`;
const note = (title, text) => `<div class="note"><strong>${title}</strong>${text}</div>`;
const tip = (title, text) => `<div class="tip"><strong>${title}</strong>${text}</div>`;
const pill = (result) => `<span class="pill ${result === "geçti" ? "ok" : result === "kaldı" ? "bad" : "skip"}">${result}</span>`;

const LOGO = `<svg viewBox="0 0 120 120" width="64" height="64"><rect width="120" height="120" rx="28" fill="#2b2d42"/>
<path d="M28 94 C64 94 72 74 52 64 C32 54 46 36 82 34" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="0.1 11"/>
<circle cx="28" cy="94" r="10" fill="#2dbe7e"/><circle cx="52" cy="64" r="10" fill="#4fa8ff"/>
<polygon transform="translate(86 33) scale(1.05)" points="0,-17 4.41,-6.07 16.17,-5.25 7.13,2.32 9.99,13.75 0,7.5 -9.99,13.75 -7.13,2.32 -16.17,-5.25 -4.41,-6.07" fill="#ffc83d" stroke="#ffc83d" stroke-width="4" stroke-linejoin="round"/></svg>`;

const TEST_STAGES = [
  {
    id: "T1",
    name: "Lint",
    cmd: "pnpm lint",
    checks: "ESLint kuralları: kullanılmayan kod, React ve Next.js hataları, erişilebilirlik kuralları.",
    pass: "Hata ve uyarı yok.",
    needs: "—",
  },
  {
    id: "T2",
    name: "Tip denetimi",
    cmd: "pnpm typecheck",
    checks: "Rota tiplerini üretir, sonra TypeScript'i katı modda derlemeden denetler.",
    pass: "Hata yok.",
    needs: "—",
  },
  {
    id: "T3",
    name: "Birim ve entegrasyon",
    cmd: "pnpm test",
    checks:
      "Vitest. İş mantığı (puan, XP, seviye, günlük tavan), yetki (veli başka çocuğu göremez, öğretmen başka sınıfı değiştiremez), davet, mesaj, bildirim, KVKK silme ve dışa aktarma. Veritabanı bellek içi Postgres (PGlite).",
    pass: "Tüm testler geçer.",
    needs: "—",
  },
  {
    id: "T4",
    name: "Migration eşitliği",
    cmd: "pnpm db:generate",
    checks: "Drizzle şeması ile <code>drizzle/</code> altındaki migration'lar aynı mı. Unutulmuş bir migration burada yakalanır.",
    pass: "\"No schema changes\"; yeni dosya oluşmaz.",
    needs: "—",
  },
  {
    id: "T5",
    name: "Uçtan uca (e2e)",
    cmd: "pnpm test:e2e",
    checks:
      "Playwright. Üretim derlemesi dört ekranda çalıştırılır: telefon 360, tablet 768, masaüstü 1280, akıllı tahta 1920 piksel. Her ekran için yatay kaydırma, dokunma hedefi boyutu ve axe erişilebilirlik taraması; ayrıca giriş, puanlama, veli kaydı, mesaj akışları, klavye kullanımı, veri silme ve PWA.",
    pass: "Dört projenin tümü geçer.",
    needs: "Docker (Postgres)",
  },
  {
    id: "T6",
    name: "Üretim imajı",
    cmd: "docker build --target app -t gelisim-app:test .\ndocker build --target tools -t gelisim-tools:test .",
    checks: "Sunucuda çalışacak iki Docker imajı (uygulama ve migration/yönetim) temiz bir ortamda derlenebiliyor mu.",
    pass: "İki hedef de derlenir.",
    needs: "Docker",
  },
];

const DEPLOY_STAGES = [
  {
    id: "D1",
    name: "Ön denetim",
    where: "Yerel + sunucu (yalnızca okuma)",
    body: "Çalışma dizini temiz mi, etiket var mı ve GitHub'a gönderilmiş mi, sürüm satırı yazılmış mı, <code>/test yayin</code> bu commit için geçti mi. Sunucuda şu an hangi sürümün çalıştığı, servislerin durumu ve boş disk okunur. Eski ve yeni sürüm arasında migration olup olmadığına bakılır.",
    gate: "Plan size gösterilir. <b>Onayınız olmadan sunucuda hiçbir şey değişmez.</b>",
  },
  {
    id: "D2",
    name: "Yedek",
    where: "Sunucu",
    cmd: "docker compose -f docker-compose.prod.yml run --rm backup backup.sh",
    body: "Güncellemeden hemen önce şifreli veritabanı yedeği alınır ve dosyanın oluştuğu denetlenir.",
    gate: "Yedek alınamazsa yayın durur.",
  },
  {
    id: "D3",
    name: "Güncelleme",
    where: "Sunucu",
    cmd: "git fetch --tags\ngit checkout vX.Y.Z\ndocker compose -f docker-compose.prod.yml up -d --build",
    body: "Etiketli sürüm çekilir ve imajlar yeniden derlenir. <code>tools</code> servisi migration'ları uygular; uygulama ancak migration başarıyla bitince başlar.",
    gate: "—",
  },
  {
    id: "D4",
    name: "Doğrulama",
    where: "Sunucu + dışarıdan",
    body: "Servis durumları (<code>tools</code> \"exited (0)\", <code>app</code> \"healthy\"), son 5 dakikanın günlükleri, dışarıdan <code>/giris</code> (200 ve HSTS başlığı), <code>/manifest.webmanifest</code>, <code>/sw.js</code>, <code>/icon/192</code> ve HTTP'den HTTPS'e yönlendirme.",
    gate: "Biri bile kalırsa D5.",
  },
  {
    id: "D5",
    name: "Geri dönüş",
    where: "Sunucu",
    cmd: "git checkout vÖNCEKİ\ndocker compose -f docker-compose.prod.yml up -d --build",
    body: "Yalnızca doğrulama kalırsa. Migration yoksa önceki etikete dönülür. Migration uygulandıysa eski kod yeni şemayla çalışmayabilir: ileri düzeltme ya da D2 yedeğinden dönme seçenekleri size sunulur.",
    gate: "Yedekten dönme tüm veriyi değiştirir; <b>ayrı ve açık onay</b> ister.",
  },
  {
    id: "D6",
    name: "Rapor",
    where: "—",
    body: "Eski ve yeni sürüm, alınan yedeğin adı, her denetimin sonucu ve süre. Elle bakılması gerekenler (gerçek hesapla giriş, anlık bildirim) ayrıca belirtilir.",
    gate: "—",
  },
];

// .claude/skills/kurulum/SKILL.md ile aynı adımlar.
const SETUP_STAGES = [
  {
    id: "K1",
    name: "Sunucu",
    you: "Türkiye'de barındırılan bir VPS alırsınız: en az 2 vCPU, 4 GB RAM, 40 GB disk, Ubuntu 24.04 ya da Debian 12. IP adresini Claude'a verirsiniz.",
    claude: "Ölçütleri söyler (sağlayıcı önermez). Bilgisayarınızda SSH anahtarı yoksa üretir, sağlayıcı paneline ekleyeceğiniz açık anahtarı gösterir.",
    done: "Claude sunucuya bağlanıp işlemci, bellek, disk ve işletim sistemini okur; gereksinim karşılanıyor.",
  },
  {
    id: "K2",
    name: "Erişim ve sıkılaştırma",
    you: "Anahtar panelden eklenemediyse bir kez parolayla yüklersiniz (Claude komutu verir). Her değişikliği onaylarsınız.",
    claude: "Güncellemeleri ve Docker'ı kurar, <code>gelisim</code> kullanıcısını açar, <code>~/.ssh/config</code> kaydını yazar, güvenlik duvarını açar, parolayla girişi kapatır. Erişimi kesebilecek komuttan önce anahtarla girişi yeni bir bağlantıda dener.",
    done: "<code>ssh gelisim</code> çalışır, parolayla giriş reddedilir, yalnızca 22, 80, 443 açıktır.",
  },
  {
    id: "K3",
    name: "Alan adı",
    you: "Alan adını alırsınız (okulun <code>k12.tr</code> alt alanı da olur) ve A kaydını sunucunun IP adresine yönlendirirsiniz. <code>gelisimyolculugu.com</code> ve <code>.com.tr</code> başkasında; <code>.tr</code>, <code>.net</code>, <code>.app</code> 7 Ekim'de boştu.",
    claude: "Panelde hangi kaydı hangi değerle gireceğinizi yazar. Yayılmayı beklerken K4'e geçer.",
    done: "Alan adı iki ayrı DNS sunucusunda da sunucunun IP adresini döner.",
  },
  {
    id: "K4",
    name: "Depo, .env ve sırlar",
    you: "<code>BACKUP_PASSPHRASE</code>'i parola yöneticinizde üretip saklar, <code>.env</code>'e kendiniz yazarsınız. Anlık bildirim istiyorsanız <code>pnpm push:keys</code>'i kendi terminalinizde çalıştırıp anahtarları aynı yolla yazarsınız.",
    claude: "Depoyu etiketli sürümle çeker, <code>.env</code>'i <code>600</code> izniyle oluşturur, alan adı ve e-postayı yazar. <code>POSTGRES_PASSWORD</code> ve <code>BETTER_AUTH_SECRET</code>'ı sunucuda üretip ekrana basmadan dosyaya yazar.",
    done: "Zorunlu beş ayar dolu (Claude değerleri değil, yalnızca adları ve dolu/boş bilgisini görür), dosya izni <code>600</code>.",
  },
  {
    id: "K5",
    name: "İlk başlatma",
    you: "Planı onaylarsınız. K3 bitmeden başlatılmaz: sertifika alınamaz.",
    claude: "İmajları derler ve servisleri başlatır (ilk derleme 5–10 dakika), sonra <code>/deploy</code>'un D4 aşamasındaki denetimleri yapar.",
    done: "Servisler sağlıklı, günlükte hata yok, <code>https://alan-adınız/giris</code> 200 ve HSTS başlığıyla açılıyor.",
  },
  {
    id: "K6",
    name: "KVKK metinleri",
    you: "Okulun hukuken onayladığı aydınlatma ve açık rıza metinlerini verirsiniz. <b>Bu adım bitmeden hiçbir veli davet edilmez.</b>",
    claude: "Metni <code>src/content/kvkk.ts</code>'e birebir aktarır (hukuki metni kendisi yazmaz, değiştirmez), sürümünü artırır. Veri sorumlusu bilgisi, kalan yer tutucu ve yedeklerin 14 gün saklandığı bilgisini denetler. Test eder, sürümler, <code>/deploy</code> ile yayınlar.",
    done: "Yayındaki kayıt ekranında yeni metin görünüyor.",
  },
  {
    id: "K7",
    name: "İlk hesaplar",
    you: "Claude'un hazırladığı komutları kendi terminalinizde çalıştırırsınız: geçici şifre ekrana bir kez yazılır ve sohbete girmemelidir. Şifreleri kişilere güvenli bir yoldan iletirsiniz.",
    claude: "Yönetici ve öğretmen hesapları için komutları sizin bilgilerinizle hazırlar, sonra okulun oluştuğunu denetler.",
    done: "Okul listeleniyor; yönetici hesabıyla giriş yapabildiniz.",
  },
  {
    id: "K8",
    name: "Yedek",
    you: "Türkiye'de S3 uyumlu bir depolama hesabı açar, erişim anahtarını <code>.env</code>'e kendiniz yazarsınız. Geri yükleme denemesinde yedek parolasını kendi terminalinizde girersiniz.",
    claude: "Elle bir yedek alır, uzak kopyanın gittiğini günlükten doğrular. Yedeği bilgisayarınızda geçici bir veritabanına geri yükletir, kayıt sayılarını karşılaştırır, sonra indirilen dosyayı ve geçici veritabanını siler.",
    done: "Yedek alındı, uzak kopya gitti, ayrı makinede geri yüklendi ve sayılar tutuyor. Çalışan bir yedeğin tek kanıtı budur.",
  },
  {
    id: "K9",
    name: "Gerçek cihaz denemeleri",
    you: "Telefonda ve akıllı tahtada denersiniz: öğretmen ve veli girişi, iPhone ve Android'de ana ekrana ekleme ve anlık bildirim, tahtada dokunmatik.",
    claude: "Senaryoları tek tek sorar, her birinde ne yapacağınızı ve ne görmeniz gerektiğini yazar, sonucu kaydeder. Kalan olursa düzeltmeyi ayrı bir iş olarak önerir.",
    done: "Beş senaryo geçti; deneme için açılan sınıf ve hesaplar silindi.",
  },
];

const SETUP_NEEDS = { K1: "—", K2: "K1", K3: "—", K4: "K2", K5: "K3, K4", K6: "—", K7: "K5", K8: "K5", K9: "K5, K7" };

const flow = (items, cls) =>
  `<div class="flow ${cls}">${items.map((s) => `<div class="step"><b>${s.id}</b><span>${s.name}</span></div>`).join('<i class="arrow">›</i>')}</div>`;

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Test ve Yayın Raporu</title>
<style>
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { --ink: #2b2d42; --muted: #5d6175; --line: #e3ddd0; --cream: #fff8ec; --grass: #13734a; --grass-soft: #e3f7e8; --sky: #1f5fad; --sky-soft: #e2f0ff; --sun-soft: #fff1c9; --sun-ink: #7a5200; --coral: #b4362a; --coral-soft: #ffedea; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Noto Sans", Arial, sans-serif; color: var(--ink); font-size: 10pt; line-height: 1.5; margin: 0; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 9pt; background: #f4efe4; border-radius: 3px; padding: 0 1mm; }
pre { font-family: Consolas, "Cascadia Mono", monospace; font-size: 8.8pt; background: var(--ink); color: #f1f2f8; border-radius: 5px; padding: 2.5mm 4mm; margin: 1.5mm 0 2mm; white-space: pre-wrap; page-break-inside: avoid; }
h1 { font-size: 20pt; margin: 0 0 2mm; line-height: 1.15; }
h2 { font-size: 13pt; margin: 7mm 0 2mm; page-break-after: avoid; }
h3 { font-size: 11pt; margin: 0; }
p { margin: 1.5mm 0 2.5mm; }
ul, ol { margin: 1mm 0 3mm; padding-left: 6mm; }
li { margin: .8mm 0; }
.lead { color: var(--muted); font-size: 11pt; margin: 0 0 5mm; }
.cover { height: 257mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .band { background: var(--cream); border-radius: 12px; padding: 16mm 14mm; border: 1px solid var(--line); }
.cover .brand { display: flex; align-items: center; gap: 5mm; font-size: 15pt; font-weight: 700; }
.cover h1 { font-size: 30pt; margin: 12mm 0 3mm; }
.cover .sub { font-size: 13pt; color: var(--muted); max-width: 130mm; }
.cover dl { display: grid; grid-template-columns: 38mm 1fr; gap: 1.5mm 4mm; margin: 14mm 0 0; font-size: 10pt; }
.cover dt { color: var(--muted); } .cover dd { margin: 0; font-weight: 600; }
section { page-break-before: always; }
.flow { display: flex; align-items: stretch; gap: 1.5mm; margin: 3mm 0 2mm; }
.flow .step { flex: 1; border-radius: 6px; padding: 2.5mm 2mm; text-align: center; font-size: 8.6pt; line-height: 1.25; }
.flow .step b { display: block; font-size: 11pt; }
.flow.test .step { background: var(--sky-soft); color: var(--sky); }
.flow.deploy .step { background: var(--grass-soft); color: var(--grass); }
.flow.setup .step { background: var(--sun-soft); color: var(--sun-ink); padding: 2.5mm 1mm; font-size: 7.6pt; }
.flow .arrow { align-self: center; font-style: normal; color: var(--muted); font-size: 12pt; }
.between { text-align: center; color: var(--muted); font-size: 9.5pt; margin: 2mm 0; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 4mm; font-size: 9.3pt; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid var(--line); padding: 1.8mm 3mm; text-align: left; vertical-align: top; }
th { background: var(--cream); font-weight: 700; }
td.id { font-weight: 800; white-space: nowrap; width: 11mm; }
td.num { white-space: nowrap; }
.pill { display: inline-block; border-radius: 10px; padding: 0 2.5mm; font-weight: 700; font-size: 8.8pt; white-space: nowrap; }
.pill.ok { background: var(--grass-soft); color: var(--grass); }
.pill.bad { background: var(--coral-soft); color: var(--coral); }
.pill.skip { background: #f1eee6; color: var(--muted); }
.stage { border: 1px solid var(--line); border-radius: 7px; margin: 0 0 4mm; page-break-inside: avoid; overflow: hidden; }
.stage-head { display: flex; align-items: baseline; gap: 3mm; padding: 2mm 4mm; border-bottom: 1px solid var(--line); }
.stage.t .stage-head { background: var(--sky-soft); } .stage.d .stage-head { background: var(--grass-soft); } .stage.k .stage-head { background: var(--sun-soft); }
.stage-head .sid { font-weight: 800; font-size: 11pt; }
.stage-head h3 { flex: 1; }
.stage-head .where { font-size: 8.6pt; color: var(--muted); white-space: nowrap; }
.stage-body { padding: 2mm 4mm 2.5mm; font-size: 9.5pt; }
.stage-body p { margin: 1mm 0; }
.kv { display: grid; grid-template-columns: 26mm 1fr; gap: .8mm 3mm; margin-top: 1.5mm; font-size: 9.2pt; }
.kv dt { color: var(--muted); } .kv dd { margin: 0; }
.tip, .note { border-radius: 6px; padding: 3mm 4mm; margin: 3mm 0 4mm; font-size: 9.6pt; page-break-inside: avoid; }
.tip { background: var(--sky-soft); border-left: 4px solid var(--sky); }
.note { background: var(--sun-soft); border-left: 4px solid #c98a00; }
.tip strong, .note strong { display: block; margin-bottom: .5mm; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.cols > div { border: 1px solid var(--line); border-radius: 7px; padding: 3mm 4mm; page-break-inside: avoid; }
.cols h3 { margin-bottom: 1.5mm; }
ul.check { list-style: none; padding-left: 0; }
ul.check li { padding-left: 7mm; position: relative; margin: 1.6mm 0; }
ul.check li::before { content: ""; position: absolute; left: 0; top: .6mm; width: 3.6mm; height: 3.6mm; border: 1.3px solid var(--ink); border-radius: 1mm; }
</style></head><body>

<div class="cover">
  <div class="band">
    <div class="brand">${LOGO}<span>Gelişim Yolculuğu</span></div>
    <h1>Test ve Yayın Raporu</h1>
    <div class="sub">Claude Code ile projenin test edilmesi, sunucunun ilk kurulumu ve üretime alınması: aşamalar, komutlar, son çalıştırmanın sonuçları ve açık kalan işler.</div>
    <dl>
      <dt>Test edilen sürüm</dt><dd>${RUN.version}</dd>
      <dt>Tarih</dt><dd>${RUN.date}</dd>
      <dt>Rapor düzenlemesi</dt><dd>${RUN.revised}</dd>
      <dt>Test ortamı</dt><dd>${RUN.machine}</dd>
      <dt>Komutlar</dt><dd><code>/test</code>, <code>/kurulum</code> ve <code>/deploy</code> (<code>.claude/skills/</code>)</dd>
    </dl>
  </div>
</div>

<section style="page-break-before: auto">
<h1>1. Özet</h1>
<p class="lead">Test tarafı hazır ve ${RUN.date} günü baştan sona çalıştırıldı. Kurulum ve yayın tarafı tanımlandı ama denenmedi, çünkü henüz bir üretim sunucusu yok. Açık kalan işlerin tümü artık Claude Code'un sizi yönlendirdiği adımlardır.</p>

<p>Projede üç Claude Code komutu var. Claude Code'da proje klasöründeyken yazmanız yeterli:</p>
<table>
<tr><th style="width:42mm">Komut</th><th>Ne yapar</th><th style="width:40mm">Durum</th></tr>
<tr><td><code>/test</code></td><td>Altı test aşamasını sırayla çalıştırır, kalanın nedenini bulur, sonuç tablosu verir.</td><td>${pill("geçti")} aşamaları elle çalıştırıldı</td></tr>
<tr><td><code>/kurulum</code></td><td>İlk yayından önceki açık noktaları dokuz adımda sizinle birlikte tamamlar: sunucu, erişim, alan adı, sırlar, ilk başlatma, KVKK metinleri, hesaplar, yedek, gerçek cihaz. Bir kez yapılır; yarıda bırakılırsa kaldığı yerden sürer.</td><td>${pill("denenmedi")} sunucu yok</td></tr>
<tr><td><code>/deploy vX.Y.Z sunucu</code></td><td>Kurulu sunucuyu etiketli sürüme geçirir: ön denetim, yedek, güncelleme, doğrulama, gerekirse geri dönüş.</td><td>${pill("denenmedi")} sunucu yok</td></tr>
</table>

<h2>Akış</h2>
<div class="between">bir kez: <code>/kurulum</code></div>
${flow(SETUP_STAGES, "setup")}
<div class="between">her sürümde: <code>/test yayin</code></div>
${flow(TEST_STAGES, "test")}
<div class="between">hepsi geçerse → sürüm satırı, commit, <code>vX.Y.Z</code> etiketi, <code>git push --follow-tags</code> → <code>/deploy</code></div>
${flow(DEPLOY_STAGES, "deploy")}

<h2>Son çalıştırma (${RUN.date}, ${RUN.version})</h2>
<table>
<tr><th style="width:11mm">#</th><th>Aşama</th><th style="width:24mm">Sonuç</th><th>Ayrıntı</th><th style="width:22mm">Süre</th></tr>
${TEST_STAGES.map((s) => {
  const r = RUN.stages[s.id];
  return `<tr><td class="id">${s.id}</td><td>${s.name}</td><td>${pill(r.result)}</td><td>${r.detail}</td><td class="num">${r.time}</td></tr>`;
}).join("\n")}
</table>

${note("Açık kalan işler", "Sunucu ve alan adı, <code>.env</code> sırları, okulun onayladığı KVKK metinleri, ilk hesaplar, yedek denemesi ve gerçek cihaz denemeleri henüz yapılmadı. Hiçbirini tek başınıza yapmanız gerekmiyor: <code>/kurulum</code> yazın, Claude Code sıradaki adımı söyler, yapabildiğini kendisi yapar, sizin yaptığınızı denetler. Adımlar 5. bölümde.")}
</section>

<section>
<h1>2. Test aşamaları</h1>
<p class="lead"><code>/test</code> komutu bu aşamaları çalıştırır. Kapsamı bir kelimeyle seçersiniz.</p>

<table>
<tr><th style="width:30mm">Yazdığınız</th><th style="width:24mm">Aşamalar</th><th>Ne zaman</th></tr>
<tr><td><code>/test hizli</code></td><td>T1–T3</td><td>Küçük bir değişiklikten sonra, commit öncesi. Docker gerekmez.</td></tr>
<tr><td><code>/test</code></td><td>T1–T5</td><td>Bir işi bitirirken. Varsayılan.</td></tr>
<tr><td><code>/test yayin</code></td><td>T1–T6</td><td>Sürüm etiketlemeden ve yayına almadan önce.</td></tr>
</table>

${TEST_STAGES.map(
  (s) => `<div class="stage t"><div class="stage-head"><span class="sid">${s.id}</span><h3>${s.name}</h3><span class="where">Gerekli: ${s.needs}</span></div>
<div class="stage-body">${code(s.cmd)}<dl class="kv"><dt>Neyi denetler</dt><dd>${s.checks}</dd><dt>Geçme ölçütü</dt><dd>${s.pass}</dd></dl></div></div>`,
).join("\n")}

<h2>Bir aşama kalırsa</h2>
<ul>
<li>Claude Code çıktıyı okur, nedeni bulur. Hata o oturumdaki değişiklikten geliyorsa düzeltir ve yalnızca o aşamayı yeniden çalıştırır.</li>
<li>Bir testi geçirmek için testi zayıflatmaz ya da atlamaz. Testin kendisi yanlışsa nedenini açıklayıp size sorar.</li>
<li>Bir kez kalıp sonra geçen e2e testini "geçti" diye yazmaz; "kararsız" olarak adıyla bildirir.</li>
<li>T1–T4'ten biri kaldıysa uzun süren T5 ve T6'yı çalıştırmaz.</li>
</ul>

${tip("e2e geliştirme verinize dokunmaz", "T5 kendi veritabanını (<code>class_attitude_e2e</code>) ve 3100 portunu kullanır. <code>pnpm dev</code> açıkken de çalıştırabilirsiniz.")}

<h2>Otomatik testlerin kapsamadıkları</h2>
<p>Bunlar gerçek cihazda elle denenir; adımları <code>docs/Test-Senaryolari.pdf</code> içinde (64 senaryo):</p>
<ul>
<li>iPhone/iPad Safari ve Android Chrome'da ana ekrana ekleme ve anlık bildirim (HTTPS gerekir, yani yayından sonra).</li>
<li>Akıllı tahtada dokunmatik kullanım.</li>
<li>Huawei Tarayıcı: kendi koyu modunu sitenin isteğine bakmadan uygular; tarayıcı ayarından kapatılır.</li>
<li>Otomatik testler Chromium'da koşar. Safari (WebKit) ve Firefox'ta sayfa taşması 7 Ekim'de ayrıca elle tarandı (360 denetim, taşma yok); bu tarama <code>/test</code>'in parçası değildir.</li>
</ul>
</section>

<section>
<h1>3. Yayın aşamaları</h1>
<p class="lead"><code>/deploy vX.Y.Z sunucu</code> komutu, kurulu bir sunucuyu yeni sürüme geçirir. Kaynağı <code>docs/DEPLOY.md</code> belgesinin "Güncelleme" bölümüdür.</p>

${note("İlk kurulum bu komutun işi değil", "Sunucunun hazırlanması, alan adı, <code>.env</code> dosyası ve ilk yönetici hesabı bir kez, <code>/kurulum</code> ile yapılır (5. bölüm). <code>/deploy</code> ondan sonraki her güncelleme içindir.")}

${DEPLOY_STAGES.map(
  (s) => `<div class="stage d"><div class="stage-head"><span class="sid">${s.id}</span><h3>${s.name}</h3><span class="where">${s.where}</span></div>
<div class="stage-body">${s.cmd ? code(s.cmd) : ""}<p>${s.body}</p>${s.gate === "—" ? "" : `<dl class="kv"><dt>Durma noktası</dt><dd>${s.gate}</dd></dl>`}</div></div>`,
).join("\n")}

<h2>Komutun hiçbir koşulda yapmayacakları</h2>
<ul>
<li>Sunucuda <code>pnpm db:seed</code> ya da <code>pnpm db:reset</code> çalıştırmaz (örnek veri, gerçek veriyi siler).</li>
<li><code>.env</code> dosyasını okumaz, yazdırmaz, kopyalamaz. Tek istisna alan adını öğrenmek için <code>DOMAIN=</code> satırıdır.</li>
<li>Açık onayınız olmadan yedekten geri yükleme yapmaz.</li>
<li>Güvenlik duvarına ve portlara dokunmaz; uygulamayı Caddy'yi atlayarak dışarı açmaz.</li>
<li>Kendiliğinden çalışmaz: yalnızca siz <code>/deploy</code> yazdığınızda başlar.</li>
</ul>
</section>

<section>
<h1>4. Claude Code ile kullanım</h1>
<p class="lead">Bir kez kurulum; sonra her sürümde üç adım: test et, sürümle, yayına al.</p>

${code(`/kurulum                          (bir kez; yarıda kalırsa yeniden yazın)
    → durum tablosu gelir, Claude sıradaki adımı söyler
/kurulum durum
    → yalnızca hangi adımın bittiğini gösterir, bir şey değiştirmez
/kurulum K6
    → doğrudan o adıma gider (ör. KVKK metni okuldan geldiğinde)`)}

${code(`/test yayin
    → T1–T6 çalışır, sonuç tablosu gelir

"versiyonlayıp commit edelim"
    → VERSION_CONTROL.md satırı, commit, vX.Y.Z etiketi, push

/deploy v0.47.0 gelisim@sunucu
    → plan gösterilir, onaylarsınız, yedek + güncelleme + doğrulama`)}

<div class="cols">
<div><h3>Claude Code yapar</h3>
<ul>
<li>Sıradaki adımı ve sizden ne beklediğini söyler; "yaptım" dediğinizde denetler.</li>
<li>Aşamaları sırayla çalıştırır, çıktıları okur.</li>
<li>Kalan testin nedenini bulur, kendi değişikliğinden kaynaklanıyorsa düzeltir.</li>
<li>Sunucuda yedek alır, sürümü günceller, servisleri ve adresleri denetler.</li>
<li>Çalıştırmadığı ya da doğrulayamadığı şeyi raporda açıkça yazar.</li>
</ul></div>
<div><h3>Siz yaparsınız</h3>
<ul>
<li>Satın alma ve panel işlerini yaparsınız: sunucu, alan adı, DNS kaydı, depolama hesabı.</li>
<li>Sırları siz saklarsınız: yedek parolası ve geçici şifreler sohbete yazılmaz.</li>
<li>Sunucuda değişiklik yapan her adımı ve yayın planını onaylarsınız.</li>
<li>Geri yükleme gibi veriyi değiştiren kararları siz verirsiniz.</li>
<li>Yayından sonra bir hesapla girip bir sayfa açarsınız.</li>
</ul></div>
</div>

<h2>SSH erişimi</h2>
<p>Claude Code sunucuya sizin bilgisayarınızdaki <code>ssh</code> komutuyla, sizin anahtarınızla bağlanır. Anahtarı ve aşağıdaki kaydı <code>/kurulum</code> K2 adımında birlikte kurarsınız; elle yazmanız gerekmez:</p>
${code(`Host gelisim
    HostName 203.0.113.10        # sunucunuzun IP adresi
    User gelisim
    IdentityFile ~/.ssh/id_ed25519`)}
<p>Sonra: <code>/deploy v0.47.0 gelisim</code>. Sunucudaki klasör <code>~/gelisim</code> değilse üçüncü kelime olarak yazılır.</p>

${tip("İzinler", "Claude Code sunucuda komut çalıştırmadan önce izin ister. Yayın sırasında her komutu tek tek onaylamak istemezseniz yalnızca o oturum için izin verin; kalıcı izin tanımlamayın.")}
</section>

<section>
<h1>5. Açık noktalar: Claude ile adım adım</h1>
<p class="lead"><code>/kurulum</code> komutu, ilk yayından önce kalan işleri dokuz adımda sizinle birlikte tamamlar. Sunucu yönetimi bilmeniz gerekmez.</p>

<h2>Nasıl ilerler</h2>
<ul>
<li><b>Tek adım, tek istek.</b> Claude adımın ne için olduğunu ve sizden ne beklediğini söyler, sonra bekler.</li>
<li><b>Yapabildiğini Claude yapar.</b> Komutu gösterir, onayınızı alır, çalıştırır. Size yalnızca onun yapamayacağı kalır: satın alma, panel ayarı, parola yöneticisi, gerçek cihaz.</li>
<li><b>Her adım denetlenir.</b> "Yaptım" demeniz yetmez; Claude adımın "bitti sayılır" denetimini çalıştırır, geçmeden sonraki adıma geçmez.</li>
<li><b>Yarıda bırakabilirsiniz.</b> Durum <code>docs/Kurulum-Durumu.md</code> dosyasına yazılır (sır ve IP adresi içermez). Yeniden <code>/kurulum</code> yazdığınızda Claude dosyayı ve sunucunun gerçek durumunu okuyup kaldığı yerden sürer.</li>
<li><b>Bekleyen adım diğerlerini durdurmaz.</b> Örneğin KVKK metni okuldan beklenirken sunucu kurulabilir.</li>
</ul>

<table>
<tr><th style="width:11mm">#</th><th>Adım</th><th style="width:32mm">Önce bitmeli</th><th style="width:24mm">Durum</th></tr>
${SETUP_STAGES.map((s) => `<tr><td class="id">${s.id}</td><td>${s.name}</td><td>${SETUP_NEEDS[s.id]}</td><td>${pill("bekliyor")}</td></tr>`).join("\n")}
</table>

${SETUP_STAGES.map(
  (s) => `<div class="stage k"><div class="stage-head"><span class="sid">${s.id}</span><h3>${s.name}</h3></div>
<div class="stage-body"><dl class="kv"><dt>Siz</dt><dd>${s.you}</dd><dt>Claude</dt><dd>${s.claude}</dd><dt>Bitti sayılır</dt><dd>${s.done}</dd></dl></div></div>`,
).join("\n")}

<h2>Sırlar sohbete girmez</h2>
<ul>
<li>Claude <code>.env</code> dosyasının içeriğini okumaz ve yazdırmaz; yalnızca hangi ayarın dolu, hangisinin boş olduğuna bakar.</li>
<li>Rastgele sırlar sunucuda üretilir ve doğrudan dosyaya yazılır; ekranda görünmez.</li>
<li><code>BACKUP_PASSPHRASE</code> yalnızca sizde ve parola yöneticinizde durur. Kaybolursa yedekler açılamaz.</li>
<li>Geçici şifre üreten komutları (hesap açma, şifre sıfırlama) kendi terminalinizde çalıştırırsınız.</li>
<li>Bir sırrı yanlışlıkla sohbete yapıştırırsanız Claude onu kullanmaz ve yeniden üretilmesini ister.</li>
</ul>

<h2>Komutun hiçbir koşulda yapmayacakları</h2>
<ul>
<li>Sunucuda <code>pnpm db:seed</code> ya da <code>pnpm db:reset</code> çalıştırmaz.</li>
<li>Üretim veritabanına yedekten geri yükleme yapmaz; geri yükleme denemesi ayrı makinede, geçici veritabanında yapılır.</li>
<li>Anahtarla girişi yeni bir bağlantıda görmeden parolayla girişi kapatmaz.</li>
<li>22, 80 ve 443 dışında port açmaz; uygulamayı Caddy'yi atlayarak dışarı açmaz.</li>
<li>KVKK metnini kendisi yazmaz, onaylanmış metni değiştirmez.</li>
<li>Kendiliğinden çalışmaz: yalnızca siz <code>/kurulum</code> yazdığınızda başlar.</li>
</ul>

${note("Bu raporda doğrulanmayanlar", "Kurulum (K1–K9) ve yayın (D1–D6) adımları gerçek bir sunucuda çalıştırılmadı; komutlar <code>docs/DEPLOY.md</code> ile aynıdır ama ilk kullanım bir denemedir. İlk seferinde her komutu tek tek onaylayarak ilerleyin; kalıcı izin tanımlamayın.")}
</section>

</body></html>`;

writeFileSync(OUT_HTML, html, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "load" });
await page.pdf({
  path: OUT_PDF,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-size:8px;color:#5d6175;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif"><span>Gelişim Yolculuğu · Test ve Yayın Raporu · ${RUN.version}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await browser.close();
console.log(`${OUT_PDF} yazıldı`);
