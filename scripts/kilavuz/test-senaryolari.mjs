// Elle test senaryolarını (docs/Test-Senaryolari.pdf) üretir: sistemi çalıştırma + rol rol senaryolar.
//   node scripts/kilavuz/test-senaryolari.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const DIR = path.resolve("docs/kilavuz");
const OUT_PDF = path.resolve("docs/Test-Senaryolari.pdf");

const steps = (...items) => `<ol class="steps">${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
const tip = (text) => `<div class="tip"><strong>İpucu</strong> ${text}</div>`;
const note = (text) => `<div class="note"><strong>Önemli</strong> ${text}</div>`;
const code = (text) => `<pre>${text}</pre>`;

const allScenarios = [];
/** One test case: who, preconditions, steps, expected results and an empty result box. */
function sc(id, title, { rol, on, adim, bekle }) {
  allScenarios.push({ id, title });
  return `<div class="sc" id="${id}">
<div class="sc-head"><span class="sc-id">${id}</span><span class="sc-title">${title}</span><span class="sc-rol">Hesap: ${rol}</span></div>
${on ? `<div class="sc-on"><b>Ön koşul:</b> ${on}</div>` : ""}
<div class="sc-body"><div><div class="lbl">Adımlar</div><ol>${adim.map((a) => `<li>${a}</li>`).join("")}</ol></div>
<div><div class="lbl">Beklenen sonuç</div><ul>${bekle.map((b) => `<li>${b}</li>`).join("")}</ul></div></div>
<div class="sc-result"><span>☐ Geçti</span><span>☐ Kaldı</span><span class="sc-note">Not: </span></div>
</div>`;
}

const chapters = [];
const chapter = (id, title, lead, body) => chapters.push({ id, title, lead, body });

// ─── 1. Çalıştırma ─────────────────────────────────────────────────────────
chapter("calistirma", "Sistemi Çalıştırma", "Bilgisayarınızda uygulamayı örnek verilerle ayağa kaldırma.", `
<h2>1.1 Gereksinimler</h2>
<table>
<tr><th>Program</th><th>Sürüm</th><th>Kontrol komutu</th></tr>
<tr><td>Node.js</td><td>22 veya üstü</td><td><code>node -v</code></td></tr>
<tr><td>pnpm</td><td>10 (<code>npm i -g pnpm</code> ile kurulur)</td><td><code>pnpm -v</code></td></tr>
<tr><td>Docker Desktop</td><td>Güncel; yalnızca veritabanı (PostgreSQL 17) için</td><td><code>docker -v</code></td></tr>
<tr><td>Tarayıcı</td><td>Chrome veya Edge (bildirim ve PWA testleri için önerilir)</td><td>—</td></tr>
</table>
${note("Docker Desktop'ın <b>açık ve çalışır</b> durumda olması gerekir (görev çubuğundaki balina simgesi). Komutlar proje klasöründe (<code>ClassAttiduteSystem</code>) bir terminalde (PowerShell ya da VS Code terminali) çalıştırılır.")}

<h2>1.2 İlk kurulum (bir kez)</h2>
${steps(
  "Bağımlılıkları kurun:" + code("pnpm install"),
  "Ortam dosyasını oluşturun:" + code("Copy-Item .env.example .env        # PowerShell\ncp .env.example .env               # Git Bash / macOS / Linux"),
  "Rastgele bir gizli anahtar üretin ve çıktıyı <code>.env</code> dosyasındaki <code>BETTER_AUTH_SECRET=</code> satırına yapıştırın:" + code("node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""),
  "Veritabanını başlatın (ilk seferde imaj indirilir):" + code("docker compose up -d db"),
  "Tabloları oluşturun ve örnek verileri yükleyin:" + code("pnpm db:migrate\npnpm db:seed"),
  "<b>Seed çıktısını not alın.</b> Terminale hesaplar ve <b>davet kodları</b> yazılır (ör. <code>K7PQ-M3XT  Efe Ç.  http://localhost:3000/davet/K7PQM3XT</code>). Bu kodlar her seed'de yeniden üretilir; veli kaydı senaryolarında kullanacaksınız.",
  "<i>İsteğe bağlı</i>, anlık (push) bildirim testleri için VAPID anahtarı üretin ve çıkan <i>Public Key</i> / <i>Private Key</i> değerlerini <code>.env</code>'deki <code>VAPID_PUBLIC_KEY</code> ve <code>VAPID_PRIVATE_KEY</code> alanlarına yazın. Boş bırakırsanız uygulama içi bildirimler yine çalışır, yalnızca telefona/masaüstüne push gelmez." + code("pnpm push:keys"),
)}

<h2>1.3 Her test oturumunda</h2>
${steps(
  "Veritabanının çalıştığından emin olun:" + code("docker compose up -d db"),
  "Geliştirme sunucusunu başlatın:" + code("pnpm dev"),
  "Tarayıcıda <b>http://localhost:3000</b> adresini açın. Giriş sayfası gelir.",
  "Bitirince terminalde <b>Ctrl + C</b> ile sunucuyu durdurun. Veritabanını da kapatmak için: <code>docker compose stop db</code>",
)}

<h2>1.4 Verileri başa döndürme</h2>
<p>Senaryolar veriyi değiştirir (puan, silme, yeni veli…). Her şeyi ilk hâline getirmek için:</p>
${code("pnpm db:reset")}
<p>Tüm tablolar boşaltılır ve örnek veriler yeniden yüklenir. <b>Davet kodları değişir</b>; yeni çıktıyı not alın. Tarayıcıda açık oturumlar geçersiz olur, yeniden giriş yapın.</p>
${tip("Senaryoları bölüm bölüm yapın ve her bölümün başında <code>pnpm db:reset</code> çalıştırın; böylece beklenen sonuçlar (XP, sayılar) örnek verilerle tutarlı olur.")}

<h2>1.5 Üretim kipinde çalıştırma (bazı senaryolar için)</h2>
<p>Giriş denemesi sınırı (dakikada 5) yalnızca üretim kipinde açıktır. <a href="#A5">A5</a> senaryosu için:</p>
${code("pnpm build\npnpm start          # yine http://localhost:3000")}

<h2>1.6 Aynı anda birden çok rolle test</h2>
<p>Bir tarayıcı penceresinde tek bir oturum açık kalır. Öğretmen ve veliyi yan yana görmek için:</p>
<ul>
<li>Öğretmen için normal pencere, veli için <b>gizli pencere</b> (Ctrl + Shift + N) kullanın,</li>
<li>ya da iki farklı tarayıcı (Chrome ve Edge) açın.</li>
</ul>

<h2>1.7 Telefonda test</h2>
<p>Telefon ve bilgisayar aynı Wi-Fi ağındaysa, <code>pnpm dev</code> çıktısındaki <b>Network</b> adresini (ör. <code>http://192.168.1.20:3000</code>) telefonda açabilirsiniz. Bu durumda <code>.env</code>'deki <code>BETTER_AUTH_URL</code> değerini o adresle değiştirip sunucuyu yeniden başlatın. Not: anlık bildirim ve "ana ekrana ekle" tarayıcılarda yalnızca <b>HTTPS</b> ya da <b>localhost</b> üzerinde çalışır; bunları bilgisayarda test edin. Ekran boyutlarını bilgisayarda denemek için Chrome'da <b>F12 → cihaz simgesi (Ctrl + Shift + M)</b> kullanılır.</p>

<h2>1.8 Sık karşılaşılan sorunlar</h2>
<table class="faq">
<tr><th>Belirti</th><th>Çözüm</th></tr>
<tr><td><code>ECONNREFUSED 5432</code> / veritabanına bağlanamıyor</td><td>Docker Desktop açık mı? <code>docker compose up -d db</code> çalıştırıp birkaç saniye bekleyin; <code>docker compose ps</code> ile durumun <i>healthy</i> olduğunu görün.</td></tr>
<tr><td>Port 5432 kullanımda</td><td>Bilgisayarda başka bir PostgreSQL çalışıyordur; onu durdurun ya da <code>docker-compose.yml</code>'deki portu ve <code>DATABASE_URL</code>'i değiştirin.</td></tr>
<tr><td>Seed "Veritabanında zaten veri var" diyor</td><td>Normaldir. Başa döndürmek için <code>pnpm db:reset</code>.</td></tr>
<tr><td>Port 3000 kullanımda</td><td>Açık kalmış eski sunucuyu kapatın ya da <code>pnpm dev -p 3001</code> ile başlatıp <code>BETTER_AUTH_URL</code>'i güncelleyin.</td></tr>
<tr><td>Giriş yapınca hemen giriş sayfasına dönüyor</td><td><code>BETTER_AUTH_URL</code> tarayıcıdaki adresle aynı olmalı (ör. <code>http://localhost:3000</code>, <i>127.0.0.1</i> değil).</td></tr>
<tr><td>Kod değişikliği sonrası hata</td><td><code>pnpm install</code> ve <code>pnpm db:migrate</code> çalıştırın.</td></tr>
</table>

<h2>1.9 Otomatik testler (isteğe bağlı)</h2>
<p>Elle testlere ek olarak kodun kendi testleri de çalıştırılabilir:</p>
${code("pnpm lint && pnpm typecheck     # kod denetimi\npnpm test                       # birim + entegrasyon testleri (Docker gerekmez)\npnpm test:e2e                   # uçtan uca tarayıcı testleri (Postgres açık olmalı)")}
`);

// ─── 2. Test verisi ────────────────────────────────────────────────────────
chapter("veri", "Test Hesapları ve Örnek Veri", "Seed'in oluşturduğu okul, sınıflar, hesaplar ve davet kodları.", `
<h2>2.1 Hesaplar</h2>
<p>Tüm hesapların şifresi: <b><code>Sifre1234!</code></b></p>
<table>
<tr><th>E-posta</th><th>Rol</th><th>Kapsam</th></tr>
<tr><td>admin@ornek.okul</td><td>Yönetici</td><td>Örnek İlkokulu</td></tr>
<tr><td>ogretmen@ornek.okul</td><td>Öğretmen (Ayşe Öğretmen)</td><td>2-A, 20 öğrenci</td></tr>
<tr><td>ogretmen2@ornek.okul</td><td>Öğretmen (Mehmet Öğretmen)</td><td>2-B, 8 öğrenci</td></tr>
<tr><td>veli1@ornek.okul</td><td>Veli</td><td>Ada Y. ve Ali K. (2-A) — iki çocuk</td></tr>
<tr><td>veli2@ornek.okul</td><td>Veli</td><td>Ayşe D. (2-A)</td></tr>
<tr><td>veli3@ornek.okul</td><td>Veli</td><td>Can Ö. (2-A)</td></tr>
<tr><td>veli4@ornek.okul</td><td>Veli</td><td>Deniz A. (2-A)</td></tr>
<tr><td>veli5@ornek.okul</td><td>Veli</td><td>Ece B. (2-A)</td></tr>
<tr><td>veli6@ornek.okul</td><td>Veli</td><td>Arda C. (2-B)</td></tr>
</table>

<h2>2.2 Örnek içerik</h2>
<ul>
<li><b>Duraklar:</b> 2-A için Türkçe (Okuma, Yazma), Matematik (Sayılar, Toplama, Çıkarma), Hayat Bilgisi (Okulumuz, Ailem); 2-B için Matematik. 2-A öğrencilerinin bir kısmı işaretlenmiş.</li>
<li><b>Davranışlar:</b> her sınıfta varsayılan liste. Okul: Yardımlaştı +1, Derse katıldı +1, Ödevini yaptı +1, Nazik davrandı +1, Sırasını bekledi +1, Düzenli çalıştı +1, Harika iş +2, Dersi böldü −1, Arkadaşını üzdü −1, Ödevi eksik −1. Ev: Odasını topladı, Kitap okudu, Ev işine yardım etti, Dişlerini fırçaladı (hepsi +1).</li>
<li><b>Karakter seviye eşikleri (demo):</b> 0 / 4 / 8 / 12 / 16 XP. Birkaç puanla seviye atlama görülebilir.</li>
<li><b>Geçmiş:</b> 2-A için son 10 güne yayılmış puanlar; veli1 ve veli2'nin ev kayıtları (Ada Y. için bir gün tavan aşılmış).</li>
<li><b>Mesajlar:</b> 2-A duyuruları (Veli toplantısı, Yarın müze gezisi), Ada Y. ve Ayşe D.'ye özel mesaj, 2-B duyurusu. veli1'in okunmamış mesajı ve bildirimleri var.</li>
<li><b>Günlük ev XP tavanı:</b> 10.</li>
</ul>

<h2>2.3 Davet kodları (seed çıktısından)</h2>
<table>
<tr><th>Öğrenci (2-A)</th><th>Kod türü</th><th>Kullanım</th></tr>
<tr><td>Efe Ç., Elif Ş., Emir T.</td><td>Tek kullanımlık, 14 gün</td><td>Yeni veli kaydı (F2, F3)</td></tr>
<tr><td>Eylül G.</td><td>Çok kullanımlık, 30 gün</td><td>Aynı kodla iki veli (F4), çocuk ekleme (F7)</td></tr>
<tr><td>Göktuğ I.</td><td>İptal edilmiş</td><td>Hata ekranı (F5)</td></tr>
<tr><td>İpek S.</td><td>Süresi dolmuş</td><td>Hata ekranı (F5)</td></tr>
</table>
${note("Kodların kendisi seed çıktısındadır ve <code>pnpm db:reset</code> sonrası değişir. Çıktıyı kaybettiyseniz <code>pnpm db:reset</code> çalıştırın ya da öğretmen hesabıyla yeni kod üretin (F1).")}

<h2>2.4 Nasıl kullanılır?</h2>
<p>Her senaryoda <b>Ön koşul</b>, <b>Adımlar</b> ve <b>Beklenen sonuç</b> bulunur. Beklenen sonucun tamamı gerçekleşiyorsa <b>☐ Geçti</b>, biri bile gerçekleşmiyorsa <b>☐ Kaldı</b> işaretleyin ve <b>Not</b> alanına ne gördüğünüzü (mümkünse ekran görüntüsüyle) yazın. Sonda bir <a href="#ozet">özet tablosu</a> ve <a href="#hata">hata bildirim şablonu</a> vardır.</p>
<p>Kısaltmalar: <b>Ö</b> = öğretmen (ogretmen@ornek.okul), <b>Ö2</b> = ogretmen2@ornek.okul, <b>V1…V6</b> = veli1…veli6, <b>Y</b> = admin@ornek.okul.</p>
`);

// ─── 3. Giriş ve roller ────────────────────────────────────────────────────
chapter("giris", "A · Giriş ve Roller", "Giriş, yönlendirme, çıkış ve giriş sınırı.", `
${sc("A1", "Her rolün kendi ana sayfasına girmesi", {
  rol: "Y, Ö, V1",
  adim: ["http://localhost:3000 adresini açın.", "Ö ile giriş yapın, sonra <b>Çıkış yap</b>.", "Aynısını V1 ve Y ile tekrarlayın."],
  bekle: ["Ö → <i>Sınıflarım</i> (2-A görünür, 2-B görünmez).", "V1 → çocuğunun paneli; üstte Ada Y. ve Ali K. seçici.", "Y → <i>Yönetim paneli</i>.", "Çıkıştan sonra giriş sayfasına dönülür."],
})}
${sc("A2", "Yanlış şifre ve boş alanlar", {
  rol: "—",
  adim: ["E-posta ve şifreyi boş bırakıp <b>Giriş yap</b>'a basın.", "ogretmen@ornek.okul ile yanlış bir şifre deneyin.", "Olmayan bir e-posta deneyin."],
  bekle: ["Alanların altında Türkçe hata mesajları çıkar.", "Yanlış şifre ve olmayan e-postada aynı \"E-posta veya şifre hatalı.\" mesajı gösterilir (hangisinin yanlış olduğu söylenmez).", "Giriş yapılmaz."],
})}
${sc("A3", "Başka rolün sayfasına adresle gitmek", {
  rol: "V1, Ö",
  adim: ["V1 ile giriş yapın; adres çubuğuna <code>localhost:3000/ogretmen</code> yazın.", "Aynı oturumda <code>localhost:3000/admin</code> deneyin.", "Ö ile giriş yapıp <code>localhost:3000/admin</code> ve <code>localhost:3000/veli</code> deneyin."],
  bekle: ["Her denemede kullanıcı kendi rolünün ana sayfasına geri yönlendirilir.", "Başka role ait hiçbir veri görünmez."],
})}
${sc("A4", "Oturum açmadan korumalı sayfa", {
  rol: "—",
  adim: ["Çıkış yapın (ya da gizli pencere açın).", "<code>localhost:3000/ogretmen</code>, <code>/veli</code>, <code>/admin</code> adreslerini deneyin."],
  bekle: ["Her birinde giriş sayfası açılır."],
})}
${sc("A5", "Giriş denemesi sınırı", {
  rol: "—",
  on: "Uygulama üretim kipinde (<code>pnpm build && pnpm start</code>, bkz. 1.5).",
  adim: ["Aynı e-postayla 6 kez art arda yanlış şifre girin.", "1 dakika bekleyip doğru şifreyle deneyin."],
  bekle: ["6. denemede \"Çok fazla deneme yapıldı\" uyarısı çıkar.", "Bir dakika sonra doğru şifreyle giriş yapılır."],
})}
`);

// ─── 4. Sınıf ve öğrenci ───────────────────────────────────────────────────
chapter("sinif", "B · Sınıf ve Öğrenci Yönetimi", "Sınıf oluşturma, öğrenci ekleme, düzenleme ve pasif yapma.", `
${sc("B1", "Yeni sınıf oluşturma", {
  rol: "Ö",
  adim: ["<i>Sınıflarım</i>'da Sınıf adı: <b>3-C</b>, düzey ve öğretim yılını doldurun.", "<b>Sınıf oluştur</b>'a basın ve sınıfı açın.", "<b>Davranışlar</b> sekmesine geçin."],
  bekle: ["3-C listede görünür.", "Davranışlar sekmesinde varsayılan okul ve ev davranışları hazır gelir.", "Ad boş bırakılırsa Türkçe hata mesajı çıkar."],
})}
${sc("B2", "Tek öğrenci ekleme", {
  rol: "Ö",
  on: "B1'deki 3-C sınıfı açık.",
  adim: ["Puanlama sekmesinin altında Ad: <b>Zehra</b>, Soyad baş harfi: <b>K</b> girip <b>Ekle</b>'ye basın."],
  bekle: ["\"Zehra K.\" kartı puanlama ekranında görünür, XP 0, karakter 1. seviye."],
})}
${sc("B3", "Toplu öğrenci ekleme", {
  rol: "Ö",
  adim: ["<b>Toplu ekle</b> kutusuna şunu yapıştırın:<br><code>1. Ahmet Yılmaz</code><br><code>2) Büşra Demir</code><br><code>Çağan Öztürk</code>", "Önizlemeyi kontrol edin, <b>3 öğrenciyi ekle</b>'ye basın."],
  bekle: ["Önizlemede sıra numaraları atılmış, adlar \"Ahmet Y.\", \"Büşra D.\", \"Çağan Ö.\" olarak görünür.", "Üç öğrenci sınıfa eklenir; soyadların tamamı hiçbir yerde saklanmaz."],
})}
${sc("B4", "Öğrenci bilgisi düzeltme, pasif / aktif yapma", {
  rol: "Ö",
  adim: ["2-A'da bir öğrencinin kartına dokunup <b>Öğrenci detayı</b>'na gidin.", "<b>Bilgiler</b>'de adı düzeltip kaydedin.", "<b>Pasif yap</b>'a basın; sınıf sayfasına dönün.", "<i>Pasif öğrenciler</i> bölümünden <b>Aktif yap</b>."],
  bekle: ["Ad değişikliği karta yansır.", "Pasif öğrenci puanlama ekranından kalkar, <i>Pasif öğrenciler</i>'de görünür; puan geçmişi silinmez.", "Aktif yapınca XP'si ve geçmişiyle geri gelir."],
})}
`);

// ─── 5. Puanlama ───────────────────────────────────────────────────────────
chapter("puanlama", "C · Davranış Puanlama", "Puan verme, geri alma, not, çoklu seçim, silme ve seviye atlama.", `
${tip("XP ve denge değerlerini doğrulamak için işlemden önce öğrenci detayındaki <b>Gelişim puanı (XP)</b> ve <b>Davranış dengesi</b> değerlerini not alın.")}
${sc("C1", "Olumlu puan verme (2 dokunuş)", {
  rol: "Ö",
  adim: ["2-A Puanlama'da <b>Can Ö.</b>'nün XP'sini not alın.", "Kartına dokunup <b>Harika iş (+2)</b>'yi seçin."],
  bekle: ["Pencere kapanır, kartta XP 2 artar.", "Altta <b>Geri al (10)</b> çubuğu belirir ve geri sayar.", "Öğrenci detayında XP +2, davranış dengesi +2 artmıştır; zaman çizelgesinin en üstünde kayıt görünür."],
})}
${sc("C2", "Olumsuz puan XP'yi düşürmez", {
  rol: "Ö",
  adim: ["Can Ö.'ye <b>Dersi böldü (−1)</b> verin.", "Öğrenci detayını açın."],
  bekle: ["XP <b>değişmez</b>.", "Davranış dengesi 1 azalır.", "Kartta ve tahta modunda olumsuz puan gösterilmez; yalnızca öğrenci detayında görünür."],
})}
${sc("C3", "10 saniye içinde geri alma", {
  rol: "Ö",
  adim: ["Bir öğrenciye olumlu puan verin.", "Geri sayım bitmeden <b>Geri al</b>'a basın.", "Başka bir puan verip 10 saniyeden fazla bekleyin."],
  bekle: ["Geri alınınca XP ve denge eski değerine döner, kayıt zaman çizelgesinde yoktur.", "Süre dolunca çubuk kaybolur; puan kalıcıdır."],
})}
${sc("C4", "Puana not ekleme", {
  rol: "Ö",
  adim: ["Karta dokunun, not alanına \"Arkadaşına matematikte yardım etti\" yazın.", "<b>Yardımlaştı</b>'yı seçin.", "Öğrenci detayını açın. Sonra bu öğrencinin velisiyle (ör. Ayşe D. → V2) giriş yapın."],
  bekle: ["Not, öğretmenin zaman çizelgesinde kaydın altında görünür.", "Veli panelinde kayıt görünür ama <b>not ve puanı veren kişi görünmez</b>."],
})}
${sc("C5", "Çoklu seçim ve tüm sınıfa puan", {
  rol: "Ö",
  adim: ["<b>Çoklu seç</b>'e basıp 3 öğrenci seçin.", "<b>3 öğrenciye puan ver</b> → <b>Derse katıldı</b>.", "<b>Tümünü seç</b> → bir davranış seçin; sonra <b>Geri al</b>.", "<b>Çoklu seçimi kapat</b>."],
  bekle: ["Seçilen üç öğrencinin her birinin XP'si 1 artar.", "Tüm sınıfa verilen puan tek <b>Geri al</b> ile hepsinden geri alınır.", "Seçili kartlarda onay işareti görünür."],
})}
${sc("C6", "Zaman çizelgesinden silme — seviye düşmez", {
  rol: "Ö",
  adim: ["Seviye atlamaya yakın bir öğrenci seçin (eşikler 4/8/12/16).", "Seviye atlayana kadar olumlu puan verin (kutlama penceresi açılır → <b>Harika!</b>).", "Öğrenci detayında zaman çizelgesinden son olumlu puanı <b>Sil</b>."],
  bekle: ["Seviye atlayınca kutlama gösterilir, karakter görseli değişir.", "Silince XP ve denge o puan kadar düşer.", "<b>Karakter seviyesi düşmez.</b>"],
})}
${sc("C7", "Zaman çizelgesi filtreleri ve son 7 gün", {
  rol: "Ö",
  adim: ["2-A'da <b>Ada Y.</b>'nin detayını açın.", "<b>Tümü / Okul / Ev</b> filtrelerini deneyin."],
  bekle: ["Ev filtresi yalnızca velinin işaretlediği kayıtları gösterir; işaretleyen veli yazılır.", "Tavan nedeniyle XP eklenmeyen ev kayıtlarında bu durum belirtilir.", "Son 7 gün grafiği gün gün olumlu/olumsuz puanları gösterir."],
})}
`);

// ─── 6. Davranış tipleri ───────────────────────────────────────────────────
chapter("davranislar", "D · Davranış Tipleri", "Davranış ekleme, doğrulama, düzenleme, sıralama ve ev tavanı.", `
${sc("D1", "Yeni davranış ekleme", {
  rol: "Ö",
  adim: ["2-A → <b>Davranışlar</b> → <b>Okul</b>.", "Simge 🎨, Ad \"Resim yaptı\", Puan 3 → <b>Ekle</b>.", "Puanlama sekmesinde bir karta dokunun."],
  bekle: ["Davranış listede ve puanlama penceresinde <i>Olumlu</i> altında görünür."],
})}
${sc("D2", "Geçersiz puan değerleri", {
  rol: "Ö",
  adim: ["Puanı <b>0</b> girip ekleyin.", "Puanı <b>11</b> ve <b>−11</b> girip deneyin.", "<b>Ev</b> sekmesinde puanı <b>−1</b> olan bir davranış eklemeyi deneyin.", "Adı boş bırakın."],
  bekle: ["Her durumda Türkçe hata mesajı çıkar, kayıt eklenmez.", "Puan −10…+10 aralığında ve 0'dan farklı olmalı; ev davranışları yalnızca olumlu olabilir."],
})}
${sc("D3", "Düzenleme geçmiş puanları değiştirmez", {
  rol: "Ö",
  adim: ["Bir öğrenciye <b>Yardımlaştı (+1)</b> verin.", "Davranışlar'da <b>Yardımlaştı</b>'yı <b>Düzenle</b>, puanı 5 yapın.", "Öğrencinin zaman çizelgesine bakın; yeniden aynı davranışı verin."],
  bekle: ["Eski kayıt hâlâ +1 görünür, XP değişmez.", "Yeni verilen puan +5 olarak kaydedilir."],
})}
${sc("D4", "Sıralama ve pasif yapma", {
  rol: "Ö",
  adim: ["↑ ↓ oklarıyla bir davranışı en üste taşıyın.", "Başka bir davranışı <b>Pasif yap</b>.", "Puanlama penceresini açın; sonra davranışı yeniden <b>Aktif yap</b>."],
  bekle: ["Penceredeki sıra yeni sıralamayla aynıdır.", "Pasif davranış pencerede görünmez; geçmişteki kayıtları silinmez.", "Aktif yapınca geri gelir."],
})}
${sc("D5", "Günlük ev XP tavanını değiştirme", {
  rol: "Ö, V3",
  adim: ["Davranışlar → <b>Ev</b> sekmesinde <b>Günlük ev XP tavanı</b>'nı <b>2</b> yapıp kaydedin.", "V3 ile giriş yapıp Can Ö. için 3 farklı ev davranışı işaretleyin."],
  bekle: ["Çubuk 2/2'de dolar.", "3. işaret kaydedilir ama XP eklenmez; bu durum ekranda belirtilir."],
})}
`);

// ─── 7. Duraklar ve matris ─────────────────────────────────────────────────
chapter("duraklar", "E · Duraklar ve Sınıf Matrisi", "Ders → Konu → Durak yönetimi ve ilerleme işaretleme.", `
${sc("E1", "Ders, konu ve durak ekleme / yeniden adlandırma", {
  rol: "Ö",
  adim: ["2-A → <b>Duraklar</b> → <b>Ders ekle</b>: \"Müzik\".", "İçine konu \"Ritim\", konuya duraklar \"Alkış\", \"Tempo\" ekleyin.", "Kalem simgesiyle \"Tempo\"yu \"Tempo tutma\" yapın."],
  bekle: ["Hiyerarşi doğru görünür; ad değişikliği kaydedilir.", "Matris sekmesinde ders seçicide <b>Müzik</b> çıkar."],
})}
${sc("E2", "Sürükle-bırak ve klavyeyle sıralama", {
  rol: "Ö",
  adim: ["Bir durağı ⋮⋮ tutamacından sürükleyip yerini değiştirin.", "Klavyede Tab ile bir tutamaca gelin, <b>Boşluk</b> → <b>↓</b> → <b>Boşluk</b>.", "Sayfayı yenileyin (F5)."],
  bekle: ["Her iki yöntemle de sıra değişir ve yenilemeden sonra korunur.", "Matris sütunları yeni sırayla görünür."],
})}
${sc("E3", "Arşivleme", {
  rol: "Ö, V1",
  adim: ["Türkçe → Yazma → \"Cümle kurma\" durağını arşivleyin (kutu simgesi).", "Matris'e ve V1 ile Ada Y.'nin yol haritasına bakın.", "Durağı arşivden geri getirin."],
  bekle: ["Arşivlenen durak matriste ve veli yol haritasında görünmez.", "Geri getirince öğrencilerin önceki ilerlemesiyle birlikte döner."],
})}
${sc("E4", "Matriste durum ve yıldız", {
  rol: "Ö",
  adim: ["Matris → Matematik. Bir öğrencinin boş hücresine üç kez dokunun.", "<b>★ Yıldız modu</b>'nu açıp tamamlanmış bir hücreye dokunun (birkaç kez)."],
  bekle: ["Hücre sırasıyla Başlamadı → Devam ediyor → Tamamlandı olur.", "Yıldız modunda 0–3 yıldız arasında döner; yalnızca tamamlanmış hücrelere yıldız verilir."],
})}
${sc("E5", "Toplu işaretleme ve veliye yansıma", {
  rol: "Ö, V1",
  adim: ["Matris'te bir durağın başlığına dokunun, <b>Öğrenci seç</b> ile Ada Y. ve Ali K.'yı seçip <b>Tamamlandı</b> işaretleyin.", "V1 ile giriş yapıp Ada Y. ve Ali K. için <b>Akademik yol haritası</b>'nı açın."],
  bekle: ["Yalnızca seçilen iki öğrencinin hücresi değişir.", "Veli yol haritasında durak ✓ tamamlandı görünür; <b>Şu an burada</b> etiketi bir sonraki durağa geçer."],
})}
`);

// ─── 8. Davet ve veli kaydı ────────────────────────────────────────────────
chapter("davet", "F · Veli Daveti ve Kaydı", "Davet kodu, QR, kayıt, KVKK onayı ve hata durumları.", `
${sc("F1", "Davet kodu üretme — yalnızca bir kez gösterilir", {
  rol: "Ö",
  adim: ["2-A'da <b>Kerem U.</b>'nun detayına gidin → <b>Veli davet kodu</b>.", "Geçerlilik 7 gün, <b>Tek kullanımlık</b> açık → <b>Davet kodu üret</b>.", "Kodu not alın; sayfayı yenileyin."],
  bekle: ["QR kodlu kart ve ABCD-EFGH biçiminde kod görünür; <b>Yazdır</b> çalışır.", "Yenileyince kodun kendisi tekrar görünmez; <b>Üretilen kodlar</b> listesinde durumu (kullanılmadı, bitiş tarihi) görünür."],
})}
${sc("F2", "Yeni veli kaydı", {
  rol: "Yeni veli",
  on: "Gizli pencere; seed çıktısındaki <b>Efe Ç.</b> kodu (ya da F1'deki kod).",
  adim: ["Seed çıktısındaki adresi açın (<code>localhost:3000/davet/…</code>).", "Sayfada çocuk ve sınıf bilgisini kontrol edin.", "Ad Soyad, e-posta (ör. <code>test1@ornek.okul</code>), şifre, yakınlık girin.", "Önce KVKK kutularını işaretlemeden, sonra işaretleyerek <b>Hesap oluştur</b>."],
  bekle: ["Sayfa \"Efe Ç. · 2-A\" için olduğunu gösterir.", "Onaylar işaretlenmeden hesap oluşmaz, uyarı çıkar.", "Onaylarla hesap oluşur ve doğrudan Efe Ç.'nin paneli açılır.", "Öğretmenin Efe Ç. detayında <b>Bağlı veliler</b>'de yeni veli görünür."],
})}
${sc("F3", "Tek kullanımlık kod ikinci kez kullanılamaz", {
  rol: "Yeni veli",
  adim: ["Çıkış yapın, F2'de kullanılan aynı kodun adresini açın."],
  bekle: ["Kodun kullanılmış/geçersiz olduğunu söyleyen Türkçe mesaj çıkar; kayıt formu açılmaz."],
})}
${sc("F4", "Çok kullanımlık kod", {
  rol: "İki yeni veli",
  adim: ["<b>Eylül G.</b> koduyla <code>anne@ornek.okul</code> hesabı açın.", "Çıkış yapıp aynı kodla <code>baba@ornek.okul</code> hesabı açın."],
  bekle: ["İki hesap da oluşur ve ikisi de Eylül G.'yi görür.", "Öğretmenin ekranında iki bağlı veli listelenir."],
})}
${sc("F5", "İptal edilmiş, süresi dolmuş ve hatalı kod", {
  rol: "—",
  adim: ["<b>Göktuğ I.</b> (iptal) kodunun adresini açın.", "<b>İpek S.</b> (süresi dolmuş) kodunun adresini açın.", "<code>localhost:3000/davet/AAAABBBB</code> gibi uydurma bir kod deneyin."],
  bekle: ["Her birinde kodun kullanılamadığını anlatan Türkçe mesaj çıkar; öğrenci adı gösterilmez."],
})}
${sc("F6", "Kodu iptal etme", {
  rol: "Ö",
  adim: ["F1'de üretilen (kullanılmamış) kodu <b>Üretilen kodlar</b>'dan <b>İptal et</b>.", "Gizli pencerede o kodun adresini açın."],
  bekle: ["Liste durumu \"iptal\" olur.", "Kod ile kayıt yapılamaz."],
})}
${sc("F7", "Mevcut hesaba ikinci çocuk ekleme", {
  rol: "V2",
  adim: ["V2 ile giriş yapın → <b>Çocuk ekle</b>.", "Eylül G.'nin çok kullanımlık kodunu girin, onayları işaretleyin → <b>Bu çocuğu hesabıma ekle</b>."],
  bekle: ["Panelin üstünde Ayşe D. ve Eylül G. arasında geçiş yapılabilir."],
})}
${sc("F8", "Sınıf için davet kartları", {
  rol: "Ö",
  adim: ["2-A → <b>Veli davet kartları</b> → <b>Yalnızca velisi henüz bağlanmamış öğrenciler</b> → <b>Davet kartlarını üret</b>.", "<b>Kartları yazdır</b> (baskı önizlemesi yeterli)."],
  bekle: ["Velisi bağlı öğrenciler (Ada, Ali, Ayşe, Can, Deniz, Ece…) için kart üretilmez.", "Baskı önizlemesinde kartlar A4'e düzgün yerleşir."],
})}
`);

// ─── 9. Veli paneli ────────────────────────────────────────────────────────
chapter("veli", "G · Veli Paneli ve Ev Davranışları", "Çocuk seçici, panel, ev işaretleme, tavan ve gizlilik.", `
${sc("G1", "Panel içeriği ve çocuk seçici", {
  rol: "V1",
  adim: ["V1 ile giriş yapın.", "Üstteki adlardan Ada Y. ile Ali K. arasında geçin."],
  bekle: ["Karakter, seviye ve ilerleme çubuğu; <i>Bu hafta</i>, <i>Evde bugün</i>, <i>Son olaylar</i>, <i>Akademik yol haritası</i> bölümleri görünür.", "Seçilen çocuğa göre tüm bölümler değişir.", "Sınıftaki diğer çocukların adları hiçbir yerde geçmez."],
})}
${sc("G2", "Ev davranışı işaretleme ve geri alma", {
  rol: "V1, Ö",
  adim: ["Ali K. seçiliyken <b>Evde bugün</b>'de <b>Kitap okudu</b>'ya dokunun.", "Başka birine dokunup 10 saniye içinde <b>Geri al</b>'a basın.", "Ö ile Ali K.'nın zaman çizelgesinde <b>Ev</b> filtresine bakın."],
  bekle: ["Kaydedilir, XP 1 ve tavan çubuğu 1 artar.", "Geri alınan kayıt her iki tarafta da görünmez.", "Öğretmen ekranında kayıt, işaretleyen veliyle birlikte görünür."],
})}
${sc("G3", "Günlük tavan dolunca", {
  rol: "V1",
  on: "Tavan 10 (D5'i yaptıysanız tavanı 10'a geri getirin ya da <code>pnpm db:reset</code>).",
  adim: ["Ali K. için çubuk dolana kadar ev davranışı işaretleyin (aynı davranışa birden çok kez dokunabilirsiniz).", "Bir kez daha işaretleyin."],
  bekle: ["Çubuk 10/10'da durur.", "Son kayıt eklenir ama XP artmaz; \"Bugünkü ev XP tavanı doldu: davranış kaydedildi, ama karaktere XP eklenmedi.\" mesajı çıkar."],
})}
${sc("G4", "Veliye görünmeyenler", {
  rol: "V2, Ö",
  adim: ["Ö, Ayşe D.'ye notlu bir <b>olumsuz</b> puan verir.", "V2 panelinde <i>Son olaylar</i>'a bakın."],
  bekle: ["Olumsuz puan veliye görünür (davranış adı ve puan).", "Öğretmenin notu ve puanı kimin verdiği görünmez."],
})}
`);

// ─── 10. Mesajlar ve bildirimler ───────────────────────────────────────────
chapter("mesajlar", "H · Mesajlar ve Bildirimler", "Duyuru, öğrenciye özel mesaj, okundu, tepki ve bildirimler.", `
${sc("H1", "Sınıf duyurusu", {
  rol: "Ö, V1, V6",
  adim: ["2-A → <b>Mesajlar</b> → Kime: <b>Tüm sınıf (duyuru)</b>, başlık \"Test duyurusu\", metin yazın → <b>Gönder</b>.", "V1 ve V6 ile <b>Mesajlar</b>'a bakın."],
  bekle: ["V1'de mesaj okunmamış olarak ve üst çubukta rozetle görünür.", "V6 (2-B) mesajı <b>görmez</b>."],
})}
${sc("H2", "Öğrenciye özel mesaj", {
  rol: "Ö, V2, V3",
  adim: ["Kime: <b>Ayşe D.</b> seçip mesaj gönderin.", "V2 ve V3 ile mesajlara bakın."],
  bekle: ["Yalnızca V2 (Ayşe D.'nin velisi) görür; V3 görmez."],
})}
${sc("H3", "Okundu bilgisi ve tepkiler", {
  rol: "V1, Ö",
  adim: ["V1 ile H1'deki mesajı açın, <b>Gördüm 👍</b>'ye basın; sonra aynı düğmeye tekrar basın; ardından <b>Teşekkürler 🙏</b>.", "Ö ile <b>Gönderilenler</b>'de mesaja bakın, <b>Kim okudu?</b>'yu açın."],
  bekle: ["Tepki ikinci dokunuşta geri alınır, sonra Teşekkürler seçili kalır.", "Öğretmen okuyan sayısını ve tepkiyi görür; <i>Kim okudu?</i> okuyan ve okumayan velileri listeler."],
})}
${sc("H4", "Mesaj silme", {
  rol: "Ö, V1",
  adim: ["Ö, H1'deki mesajı <b>Sil</b>.", "V1 mesaj listesini yenileyin."],
  bekle: ["Mesaj velinin listesinden de kalkar."],
})}
${sc("H5", "Davranış bildirimi 10 saniye sonra gelir", {
  rol: "Ö, V3",
  adim: ["V3 <b>Bildirimler</b> sayfasını açık tutsun.", "Ö, Can Ö.'ye olumlu puan verip hemen <b>Geri al</b>.", "Ö, tekrar olumlu puan verip 10 saniyeden fazla bekler; V3 sayfayı yeniler."],
  bekle: ["Geri alınan puan için bildirim oluşmaz.", "İkinci puan için bildirim gelir; dokununca ilgili ekran açılır.", "<b>Tümünü okundu yap</b> rozetleri sıfırlar."],
})}
${sc("H6", "Bildirim tercihleri", {
  rol: "V3, Ö",
  adim: ["V3 → <b>Ayarlar</b> → bildirim tercihlerinde <b>olumlu davranış</b>'ı kapatın.", "Ö, Can Ö.'ye olumlu puan verir; 15 saniye bekleyip V3 bildirimlere bakar.", "Aynı ayarı geri açın."],
  bekle: ["Kapalıyken olumlu davranış bildirimi gelmez; puan panelde yine görünür.", "Mesaj bildirimleri etkilenmez."],
})}
${sc("H7", "Anlık bildirim (push) — isteğe bağlı", {
  rol: "V3, Ö",
  on: "<code>.env</code>'de VAPID anahtarları dolu (1.2 adım 7); Chrome/Edge, adres <b>localhost</b>.",
  adim: ["V3 → Ayarlar → <b>Bu cihazda bildirimleri aç</b> → tarayıcı sorusuna <b>İzin ver</b>.", "V3 sekmesini kapatın (tarayıcı açık kalsın).", "Ö, Can Ö.'ye mesaj gönderin."],
  bekle: ["İşletim sisteminin bildirimi olarak mesaj bildirimi görünür.", "Bildirime tıklayınca ilgili mesaj açılır."],
})}
`);

// ─── 11. Tahta modu ────────────────────────────────────────────────────────
chapter("tahta", "I · Tahta Modu", "Akıllı tahtada çocuklara dönük ekran.", `
${sc("I1", "Tahtada çocuklara gösterilmeyenler", {
  rol: "Ö",
  adim: ["2-A sınıf ekranında <b>Tahta modu</b>'na basın.", "Kartları inceleyin; bir karta dokunun."],
  bekle: ["Kartlar büyük; ad, karakter ve seviye çubuğu görünür.", "<b>XP sayısı, davranış dengesi, olumsuz puan ve sıralama yoktur</b>; kartlar ad sırasıyla dizilir.", "Açılan pencerede yalnızca <b>olumlu</b> davranışlar vardır."],
})}
${sc("I2", "Tahtada puan, tüm sınıf ve geri alma", {
  rol: "Ö",
  adim: ["Bir öğrenciye puan verin.", "<b>Tüm sınıf</b>'a dokunup bir davranış seçin.", "Alttaki büyük <b>Geri al</b>'a 10 saniye içinde basın.", "<b>Tam ekran</b> ve <b>Çık</b> düğmelerini deneyin."],
  bekle: ["Puan verilen kart kısa süre parlar; seviye atlarsa kutlama çıkar.", "Tüm sınıfa verilen puan tek dokunuşla geri alınır.", "Tam ekran tarayıcı çubuklarını gizler; Çık sınıf ekranına döner."],
})}
${sc("I3", "Başka öğretmenin tahtası", {
  rol: "Ö2",
  adim: ["Ö ile 2-A tahtasının adresini kopyalayın (<code>/tahta/…</code>).", "Ö2 ile giriş yapıp bu adresi açın."],
  bekle: ["\"Sayfa bulunamadı\" ekranı çıkar; 2-A öğrencileri görünmez."],
})}
`);

// ─── 12. Yönetici ──────────────────────────────────────────────────────────
chapter("yonetici", "J · Yönetici", "Karakter ayarları ve denetim kaydı.", `
${sc("J1", "Seviye eşiklerini değiştirme", {
  rol: "Y, Ö",
  adim: ["Y → <b>Karakterler</b>'de eşikleri 0/2/4/6/8 yapıp <b>Eşikleri kaydet</b>.", "Ö ile 2-A'ya bakın.", "Y ile eşikleri 0/20/50/100/200 yapıp tekrar kaydedin."],
  bekle: ["Eşik düşünce yeni eşiği geçen öğrencilerin seviyesi hemen yükselir.", "Eşik yükselince <b>kimsenin seviyesi düşmez</b>.", "1. seviye eşiği 0'dan farklı ya da artan sırada olmayan eşikler (ör. 0/10/5/…) girilirse Türkçe hata çıkar, kaydedilmez."],
})}
${sc("J2", "Karakter türü ve aşama adları", {
  rol: "Y, Ö",
  adim: ["Bir türün adını ve bir aşama adını değiştirip kaydedin.", "Bir türün <b>Öğretmenler seçebilir (aktif)</b> işaretini kaldırın.", "Ö ile bir öğrencinin detayında <b>Karakter türü</b> seçeneklerine bakın."],
  bekle: ["Yeni adlar öğretmen ve veli ekranlarında görünür.", "Pasif tür yeni seçimlerde çıkmaz; o türü kullanan öğrencinin karakteri değişmez."],
})}
${sc("J3", "Denetim kaydı ve filtreler", {
  rol: "Y",
  adim: ["Önceki senaryolardan sonra <b>Denetim kaydı</b>'nı açın.", "İşlem: <b>Puan verildi</b>, kişi: \"ogretmen\" ile <b>Filtrele</b>.", "Bir kaydın <b>Ayrıntı</b>'sını açın; <b>Daha eski →</b> ile sayfa değiştirin; <b>Temizle</b>."],
  bekle: ["Puan verme/silme, ilerleme, veli bağlama, mesaj, dışa aktarma gibi işlemler kişi, tarih ve IP ile listelenir.", "Filtreler doğru çalışır; kayıtlar düzenlenemez."],
})}
`);

// ─── 13. KVKK ─────────────────────────────────────────────────────────────
chapter("kvkk", "K · KVKK: Dışa Aktarma, Silme Talebi, Hesap Silme", "Veli hakları ve yöneticinin talepleri sonuçlandırması.", `
${sc("K1", "Veri indirme", {
  rol: "V1",
  adim: ["V1 → Ayarlar → <b>Verileriniz</b> → <b>Tüm verilerimi indir (JSON)</b>.", "<b>Davranış geçmişi (Excel/CSV)</b>'yi indirip Excel'de açın."],
  bekle: ["JSON'da hesap, onaylar, bildirimler ve yalnızca Ada Y. ile Ali K.'ya ait kayıtlar vardır; başka öğrenci adı yoktur.", "CSV Excel'de Türkçe karakterler bozulmadan açılır.", "Denetim kaydında dışa aktarma işlemi görünür."],
})}
${sc("K2", "Silme talebi ve reddetme", {
  rol: "V2, Y",
  adim: ["V2 → Verileriniz → <b>Ayşe D. için silme talebi</b> → not yazıp <b>Talebi gönder</b>.", "Aynı talebi tekrar açmayı deneyin.", "Y → <b>Silme talepleri</b> → talebi <b>Reddet</b>, gerekçe yazın."],
  bekle: ["Velinin ekranında \"Silme talebi … tarihinde iletildi\" yazar; bekleyen talep varken ikincisi açılmaz.", "Yönetim panelinde bekleyen talep rozeti görünür.", "Reddedilen talep <b>Reddedilen</b> sekmesine geçer, gerekçe kayda girer; öğrenci verileri durur."],
})}
${sc("K3", "Kalıcı silme", {
  rol: "V3, Y, Ö",
  adim: ["V3, Can Ö. için silme talebi açar.", "Y → talepte önce <b>Verileri indir (JSON)</b>, sonra <b>Kalıcı olarak sil</b>.", "Onayda önce yanlış ad, sonra doğru öğrenci adını yazın → <b>Evet, kalıcı olarak sil</b>.", "Ö ile 2-A'ya, V3 ile paneline bakın; Y ile denetim kaydına bakın."],
  bekle: ["Yanlış adla silme yapılmaz.", "Can Ö. sınıftan, puanlardan, mesajlardan ve velinin panelinden tamamen kalkar.", "Denetim kaydında işlemler durur ama öğrencinin adı kayıtlarda görünmez."],
})}
${sc("K4", "Veli hesabını silme", {
  rol: "V5",
  adim: ["V5 → Verileriniz → <b>Hesabımı sil</b>.", "Önce yanlış şifre, sonra doğru şifre (<code>Sifre1234!</code>) girin → <b>Hesabımı kalıcı olarak sil</b>.", "veli5 ile yeniden giriş yapmayı deneyin; Ö ile Ece B.'nin bağlı velilerine bakın."],
  bekle: ["Yanlış şifreyle silinmez.", "Doğru şifreyle giriş sayfasına \"Hesabınız silindi\" mesajıyla dönülür; tekrar giriş yapılamaz.", "Kutucuk işaretlenmediyse Ece B.'nin okul kayıtları durur, bağlı veli listesinden V5 kalkar."],
})}
`);

// ─── 14. Yetki ─────────────────────────────────────────────────────────────
chapter("yetki", "L · Yetki ve Güvenlik Testleri", "Kimse başkasının verisine adresi elle yazarak ulaşamamalı.", `
<p>Bu testler en önemlileridir. Kimlikleri (id) adres çubuğundan kopyalarsınız: öğretmen sınıf adresi <code>/ogretmen/siniflar/<i>sınıfId</i></code>, öğrenci detayı <code>…/ogrenciler/<i>öğrenciId</i></code>, veli paneli <code>/veli/<i>öğrenciId</i></code> biçimindedir.</p>
${sc("L1", "Veli başka öğrencinin paneline giremez", {
  rol: "V6, V1",
  adim: ["V6 ile giriş yapın; adres çubuğundaki Arda C. adresini (<code>/veli/…</code>) kopyalayın.", "V1 ile giriş yapıp bu adresi açın.", "Adresin sonuna <code>/yol-haritasi</code> ekleyip tekrar deneyin."],
  bekle: ["Her iki denemede \"Sayfa bulunamadı\" ekranı çıkar.", "Arda C.'nin adı, puanı ya da karakteri hiçbir yerde görünmez."],
})}
${sc("L2", "Öğretmen başka sınıfı açamaz ve değiştiremez", {
  rol: "Ö2, Ö",
  adim: ["Ö2 ile 2-B sınıf adresini ve bir öğrenci detay adresini kopyalayın.", "Ö ile bu adresleri, ayrıca sonuna <code>/matris</code>, <code>/davranislar</code>, <code>/mesajlar</code> ekleyerek açın."],
  bekle: ["Hepsinde \"Sayfa bulunamadı\" çıkar; 2-B verisi görünmez ve değiştirilemez."],
})}
${sc("L3", "Yönetici veri indirme adresi yalnızca yöneticiye açık", {
  rol: "Y, V1, Ö",
  adim: ["Y ile bir silme talebinde <b>Verileri indir (JSON)</b> bağlantısının adresini kopyalayın (sağ tık → bağlantı adresini kopyala; <code>/admin/ogrenciler/<i>id</i>/disa-aktar</code>).", "Bu adresi V1 ile, sonra Ö ile açın.", "Adresin sonuna <code>?bicim=xml</code> ekleyip Y ile açın."],
  bekle: ["Veli ve öğretmen için dosya inmez; yetki hatası (403) döner.", "Geçersiz biçimde hata (400) döner.", "Velinin kendi indirme bağlantısı (<code>/veli/disa-aktar</code>) kimlik almaz, her zaman yalnızca kendi çocuklarının verisini verir (K1)."],
})}
${sc("L4", "Çıkıştan sonra geri tuşu", {
  rol: "V1",
  adim: ["V1 panelindeyken <b>Çıkış yap</b>.", "Tarayıcının geri tuşuna basın, sayfayı yenileyin."],
  bekle: ["Çocuk verisi gösterilmez; giriş sayfasına yönlendirilir."],
})}
`);

// ─── 15. Görünüm ───────────────────────────────────────────────────────────
chapter("gorunum", "M · Ekran Boyutu, Erişilebilirlik ve PWA", "Telefon, tablet, masaüstü, karanlık mod, klavye ve çevrimdışı.", `
${sc("M1", "Ekran boyutları", {
  rol: "Ö, V1",
  adim: ["Chrome'da F12 → Ctrl + Shift + M; genişliği sırasıyla <b>360</b>, <b>768</b>, <b>1280</b>, <b>1920</b> px yapın.", "Her genişlikte öğretmen puanlama, matris, veli paneli ve tahta modunu gezin."],
  bekle: ["Hiçbir ekranda yatay kaydırma çubuğu yok (matris tablosu kendi kutusunda kayabilir).", "Metinler taşmaz, düğmeler parmakla rahat basılacak büyüklükte."],
})}
${sc("M2", "Karanlık mod", {
  rol: "Herkes",
  adim: ["Windows Ayarlar → Kişiselleştirme → Renkler → <b>Koyu</b> (ya da DevTools → Rendering → <i>prefers-color-scheme: dark</i>).", "Ana ekranları gezin."],
  bekle: ["Tüm ekranlar koyu temaya geçer; yazılar okunaklı, beyaz kutu kalmaz."],
})}
${sc("M3", "Yalnızca klavyeyle kullanım", {
  rol: "Ö",
  adim: ["Fareyi bırakın; Tab / Shift+Tab / Enter / Boşluk / Esc ile giriş yapın, bir öğrenciye puan verin, pencereyi Esc ile kapatın."],
  bekle: ["Odaklanan öğe belirgin bir çerçeveyle görünür.", "Tüm işlemler klavyeyle yapılabilir; pencere açıkken odak pencerenin içinde kalır."],
})}
${sc("M4", "Çevrimdışı ekranı", {
  rol: "V1",
  adim: ["V1 panelini bir kez açın.", "DevTools → Network → <b>Offline</b>; başka bir sayfaya geçin.", "Online'a alıp <b>Tekrar dene</b>."],
  bekle: ["\"İnternet bağlantısı yok\" ekranı çıkar; çocuk verisi önbellekten gösterilmez.", "Bağlantı gelince sayfa açılır."],
})}
${sc("M5", "Uygulama olarak yükleme", {
  rol: "Herkes",
  adim: ["Chrome/Edge adres çubuğundaki <b>yükle</b> simgesine basın.", "Yüklenen uygulamayı başlat menüsünden açın."],
  bekle: ["Uygulama kendi penceresinde, <b>Gelişim</b> adı ve simgesiyle açılır."],
})}
`);

// ─── 16. Özet ve hata şablonu ──────────────────────────────────────────────
const summaryRows = () =>
  allScenarios.map((s) => `<tr><td><b>${s.id}</b></td><td>${s.title}</td><td class="c">☐</td><td class="c">☐</td><td></td></tr>`).join("");

chapter("ozet", "Özet ve Hata Bildirimi", "Tüm senaryoların sonuç tablosu ve hata bildirme şablonu.", `
<h2>Sonuç tablosu</h2>
<table class="summary"><tr><th>No</th><th>Senaryo</th><th>Geçti</th><th>Kaldı</th><th style="width:30%">Not</th></tr>
__SUMMARY__
</table>
<h2 id="hata">Hata bildirim şablonu</h2>
<p>Bir senaryo \"Kaldı\" olduğunda aşağıdaki bilgileri toplayın:</p>
<table class="form">
<tr><th>Senaryo no</th><td></td></tr>
<tr><th>Tarih / saat</th><td></td></tr>
<tr><th>Hesap (rol)</th><td></td></tr>
<tr><th>Cihaz / tarayıcı / ekran genişliği</th><td></td></tr>
<tr><th>Adres (URL)</th><td></td></tr>
<tr><th>Yaptığım adımlar</th><td class="tall"></td></tr>
<tr><th>Beklenen</th><td class="tall"></td></tr>
<tr><th>Gerçekleşen (hata mesajı)</th><td class="tall"></td></tr>
<tr><th>Ekran görüntüsü / terminal çıktısı</th><td></td></tr>
</table>
${tip("Hata ekranında terminalde (<code>pnpm dev</code> penceresi) kırmızı bir hata satırı çıktıysa onu da kopyalayın; Chrome'da F12 → <b>Console</b> sekmesindeki kırmızı satırlar da işe yarar.")}
`);

// ─── HTML ─────────────────────────────────────────────────────────────────
const today = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date());
const letter = (c) => c.title.match(/^([A-Z]) · /)?.[1];
const toc = chapters
  .map((c, i) => {
    const ids = allScenarios.filter((s) => s.id[0] === letter(c)).map((s) => s.id);
    return `<li><a href="#${c.id}"><span class="n">${i + 1}</span>${c.title}</a><div class="lead">${c.lead}${ids.length ? ` <span class="ids">(${ids[0]}–${ids.at(-1)})</span>` : ""}</div></li>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Test Senaryoları</title>
<style>
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { --accent: #2563eb; --ink: #1f2937; --muted: #6b7280; --line: #e5e7eb; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Noto Sans", Arial, sans-serif; color: var(--ink); font-size: 10pt; line-height: 1.45; margin: 0; }
a { color: var(--accent); text-decoration: none; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 9pt; background: #f3f4f6; border-radius: 3px; padding: 0 1mm; }
pre { font-family: Consolas, "Cascadia Mono", monospace; font-size: 9pt; background: #111827; color: #e5e7eb; border-radius: 5px; padding: 2.5mm 4mm; margin: 1.5mm 0 1mm; white-space: pre-wrap; page-break-inside: avoid; }
.cover { height: 257mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover .band { background: var(--accent); color: #fff; border-radius: 10px; padding: 18mm 14mm; }
.cover .star { font-size: 40pt; color: #fde047; line-height: 1; }
.cover h1 { font-size: 28pt; margin: 6mm 0 2mm; line-height: 1.15; }
.cover .sub { font-size: 14pt; opacity: .95; }
.cover .meta { margin-top: 14mm; color: var(--muted); font-size: 10pt; }
.cover .roles { display: flex; gap: 5mm; margin-top: 10mm; }
.cover .roles div { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 4mm; font-size: 9.5pt; }
.cover .roles b { display: block; color: var(--accent); font-size: 11pt; margin-bottom: 1mm; }
.toc { page-break-after: always; }
.toc h1 { font-size: 20pt; color: var(--accent); margin: 0 0 5mm; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { border-bottom: 1px solid var(--line); padding: 2.2mm 0; }
.toc li > a { font-size: 12pt; font-weight: 600; color: var(--ink); }
.toc .n { display: inline-block; width: 8mm; color: var(--accent); }
.toc .lead { color: var(--muted); margin: 0 0 0 8mm; font-size: 9.5pt; }
.toc .ids { color: var(--accent); }
section.chapter { page-break-before: always; }
.chapter-head { border-left: 6px solid var(--accent); padding: 2mm 0 2mm 5mm; margin-bottom: 6mm; }
.chapter-head .num { color: var(--accent); font-weight: 700; font-size: 11pt; letter-spacing: .05em; }
.chapter-head h1 { margin: 1mm 0; font-size: 21pt; }
.chapter-head p { margin: 0; color: var(--muted); }
h2 { font-size: 13.5pt; color: var(--accent); margin: 7mm 0 2mm; page-break-after: avoid; }
p { margin: 1.5mm 0 2.5mm; }
ul, ol { margin: 1mm 0 3mm; padding-left: 6mm; }
li { margin: .8mm 0; }
ol.steps { counter-reset: s; list-style: none; padding-left: 0; }
ol.steps > li { counter-increment: s; position: relative; padding-left: 9mm; margin: 2mm 0; }
ol.steps > li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 6mm; height: 6mm; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 700; font-size: 9pt; text-align: center; line-height: 6mm; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 4mm; font-size: 9.3pt; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid var(--line); padding: 1.8mm 3mm; text-align: left; vertical-align: top; }
th { background: #eff6ff; color: #1e3a8a; }
td.c { text-align: center; width: 13mm; }
table.form th { width: 38%; }
table.form td.tall { height: 18mm; }
.tip, .note { border-radius: 6px; padding: 3mm 4mm; margin: 3mm 0 4mm; font-size: 9.6pt; page-break-inside: avoid; }
.tip { background: #eff6ff; border-left: 4px solid var(--accent); }
.note { background: #fff7ed; border-left: 4px solid #ea580c; }
.tip strong, .note strong { display: block; font-size: 9pt; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5mm; }
.tip strong { color: #1d4ed8; } .note strong { color: #c2410c; }
.sc { border: 1px solid #cbd5e1; border-radius: 7px; margin: 0 0 5mm; page-break-inside: avoid; overflow: hidden; }
.sc-head { display: flex; align-items: baseline; gap: 3mm; background: #eff6ff; padding: 2mm 4mm; border-bottom: 1px solid #cbd5e1; }
.sc-id { font-weight: 800; color: #fff; background: var(--accent); border-radius: 4px; padding: 0 2mm; font-size: 9.5pt; }
.sc-title { font-weight: 700; font-size: 11pt; flex: 1; }
.sc-rol { font-size: 8.5pt; color: #1e3a8a; border: 1px solid #93c5fd; border-radius: 10px; padding: 0 2.5mm; white-space: nowrap; }
.sc-on { padding: 1.8mm 4mm 0; font-size: 9.3pt; }
.sc-body { display: grid; grid-template-columns: 1.15fr 1fr; gap: 4mm; padding: 1.5mm 4mm 1mm; font-size: 9.3pt; }
.sc-body ol, .sc-body ul { padding-left: 5mm; margin: .5mm 0 1mm; }
.lbl { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-top: 1mm; }
.sc-result { display: flex; gap: 6mm; border-top: 1px dashed #cbd5e1; padding: 1.8mm 4mm; font-size: 9.3pt; color: #374151; }
.sc-note { flex: 1; border-bottom: 1px dotted #9ca3af; }
</style></head><body>
<div class="cover">
  <div class="band">
    <div class="star">✓</div>
    <h1>Öğrenci Davranış ve<br>Gelişim Sistemi</h1>
    <div class="sub">Elle Test Senaryoları ve Çalıştırma Rehberi</div>
  </div>
  <div class="roles">
    <div><b>1. Çalıştır</b>Kurulum, örnek veri, sıfırlama ve sorun giderme</div>
    <div><b>2. Test et</b>${allScenarios.length} senaryo: öğretmen, veli, yönetici, yetki, erişilebilirlik</div>
    <div><b>3. Bildir</b>Sonuç tablosu ve hata bildirim şablonu</div>
  </div>
  <div class="meta">Sürüm 0.35 · ${today}<br>Senaryolar <code>pnpm db:seed</code> ile yüklenen örnek verilere göre yazılmıştır.</div>
</div>
<div class="toc"><h1>İçindekiler</h1><ol>${toc}</ol></div>
${chapters
  .map((c, i) => `<section class="chapter" id="${c.id}"><div class="chapter-head"><div class="num">BÖLÜM ${i + 1}</div><h1>${c.title}</h1><p>${c.lead}</p></div>${c.body.replace("__SUMMARY__", summaryRows())}</section>`)
  .join("\n")}
</body></html>`;

const htmlPath = path.join(DIR, "test-senaryolari.html");
writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
await page.pdf({
  path: OUT_PDF,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-size:8pt;color:#6b7280;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif"><span>Öğrenci Davranış ve Gelişim Sistemi · Test Senaryoları</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" },
});
await browser.close();
console.log(`PDF yazıldı: ${path.relative(process.cwd(), OUT_PDF)} (${allScenarios.length} senaryo)`);
