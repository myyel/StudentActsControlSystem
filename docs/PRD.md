# PRD — Öğrenci Davranış ve Gelişim Sistemi

> Sürüm: 0.1 (MVP) · Dil: Türkçe arayüz · Hedef kitle: 6–10 yaş (ilkokul) sınıfları

## 1. Amaç

Öğretmenin sınıfındaki öğrencilerin davranışlarını puanlayabildiği, akademik konulardaki ilerlemeyi "duraklar" üzerinden takip edebildiği ve velilerin yalnızca kendi çocuklarını görüp evdeki davranışları da değerlendirebildiği bir web uygulaması. Olumlu davranışlar, çocukların gelişen karakterleriyle ödüllendirilir.

## 2. Platform gereksinimleri

- Responsive web uygulaması + **PWA** (ana ekrana yüklenebilir, push bildirim alır).
- Hedef ortamlar: Pardus (Firefox/Chromium), Windows, Android (Chrome), iOS/iPadOS 16.4+ (Safari, ana ekrana eklenmiş).
- Kırılım noktaları: telefon (≥360px), tablet (≥768px), masaüstü (≥1280px), akıllı tahta (1920px, dokunmatik).
- İleride Capacitor ile mağaza uygulamasına paketlenebilecek şekilde tasarlanır (native-özel API kullanılmaz).
- **Çevrimdışı (Faz 8 kararı):** oturum açılmış sayfalar cihazda **saklanmaz** (çocuk verisi, paylaşılan cihazlar). Bağlantı yokken açılamayan sayfa yerine "İnternet bağlantısı yok" ekranı (`/cevrimdisi`, "Tekrar dene") gösterilir; puan, mesaj gibi işlemler yalnızca bağlantı varken kaydedilir, çevrimdışı kuyruk yoktur.
- **Erişilebilirlik:** WCAG 2 AA kontrast (açık ve karanlık mod); dokunmatik ekranlarda dokunma hedefleri en az 44px (tahta modunda 80px), fare ile kullanımda kompakt boyutlar korunur (en az 24px); tüm işlemler klavyeyle yapılabilir, odak görünür, pencereler kapanınca odak açan öğeye döner.
- Yetkisiz veya olmayan kayıtlar için Türkçe "Sayfa bulunamadı" (404) gösterilir; metin kaydın var olup olmadığını belli etmez.

## 3. Roller

| Rol | Yetki |
|---|---|
| **admin** | Okul ayarları, öğretmen hesapları, karakter türleri/eşikleri |
| **teacher** | Kendi sınıflarını, öğrencilerini, davranış tiplerini, akademik durakları, mesajları yönetir |
| **parent** | Yalnızca kendisine bağlı öğrencileri görür; ev davranışı girer; mesajları okur |

- Öğrencilerin kendi hesabı **yoktur** (6–10 yaş). Öğrenciler karakterlerini tahta modunda veya velinin cihazında görür.
- Veri modeli çoklu okul (multi-tenant) ve bir sınıfa birden fazla öğretmen atanmasını destekler; MVP tek okulla çalışır.

## 4. Özellikler

### 4.1 Sınıf ve öğrenci yönetimi
- Öğretmen sınıf oluşturur, öğrenci ekler (tek tek veya satır satır isim yapıştırarak toplu).
- Öğrenci: ad, soyad (isteğe bağlı baş harf), karakter türü, aktif/pasif.
- Öğretmen her öğrenci için **veli davet kodu + QR** üretir (tek kullanımlık veya süreli, iptal edilebilir).
  - Varsayılan: **tek kullanımlık, 14 gün**. Öğretmen kod başına tek/çok kullanımlık ve 7/14/30 gün/süresiz seçebilir.
  - Kod 8 karakterdir (`ABCD-EFGH`, karışan 0/O, 1/I/L yok). Veritabanında yalnızca hash'i durur; düz kod yalnızca üretildiği anda gösterilir, kaybolursa yeni kod üretilir.
  - Sınıfın tamamı için yazdırılabilir davet kartları üretilebilir.
- Yeni öğrenciye okulun ilk aktif karakter türü atanır; öğretmen öğrenci detayından değiştirebilir. Öğrenci silme Faz 9'da (KVKK) ele alınır.

### 4.2 Veli kaydı
- Veli yalnızca davet koduyla kayıt olur / mevcut hesabına çocuk ekler. Açık kayıt yoktur.
- Bir öğrencinin birden fazla velisi, bir velinin birden fazla çocuğu olabilir.
- Kayıt sırasında KVKK aydınlatma metni gösterilir, açık rıza alınır ve kaydedilir.
  - "Aydınlatma metnini okudum" ve "açık rıza" kutularının **ikisi de zorunludur**; her bağlanan çocuk için ayrı kayıt (metin sürümü, IP, tarayıcı) tutulur.
  - Metinler şu an **taslaktır** (`src/content/kvkk.ts`); pilot öncesi okulun hukuken onaylı metniyle değiştirilir ve sürüm artırılır.
- Davet sayfası, kodu açan kişiye kayıttan önce çocuğun adını, soyad baş harfini ve sınıfını gösterir ("Ada Y. — 2-A"). Kod doğrulama IP başına dakikada 10 denemeyle sınırlıdır.
- E-posta doğrulama MVP'de yoktur (e-posta gönderim altyapısı yok); pilot öncesi değerlendirilir.

### 4.3 Davranış puanlama
- **Davranış tipi**: ad, ikon/emoji, puan (tam sayı, negatif olabilir), kapsam (`school` | `home`), sınıfa ait, aktif/pasif.
- Puan −10…+10 arasında, 0 olamaz. Ev davranışları yalnızca +1…+10.
- Yeni sınıfa varsayılan davranış listesi yüklenir (öğretmen düzenleyebilir; liste `src/content/default-behaviors.ts`):
  - Okul (+): Yardımlaştı 🤝 +1, Derse katıldı ✋ +1, Ödevini yaptı 📚 +1, Nazik davrandı 💛 +1, Sırasını bekledi ⏳ +1, Düzenli çalıştı 🧹 +1, Harika iş ⭐ +2.
  - Okul (−): Dersi böldü 🔇 −1, Arkadaşını üzdü 💔 −1, Ödevi eksik 📝 −1.
  - Ev (+): Odasını topladı 🛏️ +1, Kitap okudu 📖 +1, Ev işine yardım etti 🍽️ +1, Dişlerini fırçaladı 🪥 +1.
- Kullanılmış davranış tipi silinmez, pasif yapılır.
- Öğretmen: öğrenci kartına dokun → davranış seç. Çoklu öğrenci seçip toplu puanlama. İsteğe bağlı not.
  - Öğretmen yalnızca **okul** kapsamlı davranışlarla puan verir; ev davranışlarını veli girer.
  - Sınıf ekranındaki kartlarda yalnızca **ad + XP** görünür; ekran tahtaya yansıtılabileceği için denge ve olumsuz puanlar yalnızca öğrenci detayındadır.
- Son işlem **10 saniye** içinde geri alınabilir (yalnızca puanı veren öğretmen); sonrasında sınıfın herhangi bir öğretmeni kaydı zaman çizelgesinden silebilir (audit log'a düşer).
- Her olay (`BehaviorEvent`) puanın **anlık kopyasını** saklar; tipin puanı değişirse geçmiş değişmez.
- İki sayaç:
  - **XP (gelişim puanı)**: yalnızca pozitif puanların toplamı; negatif puan XP'yi düşürmez; karakteri evrimleştirir.
  - **Davranış dengesi**: pozitif + negatif toplam; öğretmen ve veli görür.
- Bir olay geri alınır veya silinirse, o olayın kazandırdığı XP ve denge etkisi (`xpDelta`, `balanceDelta`) aynen geri düşülür. **Karakter seviyesi (`characterLevel`) ise hiçbir koşulda düşmez**; en yüksek ulaşılan seviye korunur.
- Toplu puanlama tek bir `batchId` ile kaydedilir; geri alma batch bazında yapılır.

### 4.4 Ev davranışları
- Ev kapsamlı davranış listesini öğretmen belirler; veli yalnızca listeden seçer.
- Ev davranışları **yalnızca pozitif** puanlı olabilir.
- Günlük ev XP tavanı (sınıf ayarı, varsayılan 10). Tavan yalnızca XP'ye uygulanır; tavanı aşan kısım XP'ye eklenmez. "Gün" okulun saat dilimine (`Europe/Istanbul`) göre hesaplanır.
  - Tavan çocuk başınadır; birden fazla velinin girişleri aynı tavanı paylaşır. Tavanı aşan giriş yine kaydedilir ve dengeye tam puanla eklenir; veliye "tavan doldu" bilgisi gösterilir.
  - Öğretmen tavanı Davranışlar → Ev sekmesinden 0–50 arasında ayarlar (0: ev girişleri XP kazandırmaz). Değişiklik audit log'a düşer.
  - Geri alınan veya silinen ev girişi o günün tavanını yeniden açar.
- Veli ev davranışını **yalnızca bugün** için girer (kayıt giriş anına yazılır); geçmiş güne giriş yoktur.
- Veli kendi girdiği kaydı **10 saniye içinde geri alabilir**; sonrasında yanlış kaydı yalnızca öğretmen zaman çizelgesinden silebilir. Başka velinin veya öğretmenin kaydını geri alamaz.
- Ev olayları öğretmen ekranında "Ev" etiketiyle ayrı görünür: zaman çizelgesinde Tümü/Okul/Ev filtresi, girişi yapan velinin adı ve tavan nedeniyle XP'si kesilen kayıtlar için açıklama.

### 4.5 Akademik duraklar
- Hiyerarşi: **Ders → Konu → Durak** (sıralı; sürükle-bırak ile sıralama).
  - Sürükle-bırak dokunmatik ekranda ve klavyeyle çalışır (`@dnd-kit`). Sıralama aynı üst öğe içindedir; durağı başka konuya taşımak henüz yok.
  - Silme yerine **arşivleme**: arşivlenen öğe (ve altındakiler) matriste ve veli ekranında görünmez, ilerleme kayıtları korunur, geri alınabilir.
- Her öğrenci × durak için durum: `not_started` | `in_progress` | `completed` (+ isteğe bağlı 0–3 yıldız).
  - Yıldız yalnızca tamamlanan duraklarda olabilir.
- Öğretmen görünümü: sınıf matrisi (satır öğrenci, sütun durak), hücreye dokunarak durum değiştirme, toplu işaretleme.
  - Matris ders ders gösterilir; sütunlar konu başlıkları altında gruplanır.
  - Dokunuş durumu döndürür: Başlamadı → Devam ediyor → Tamamlandı → Başlamadı. "Yıldız modu" açıkken tamamlanmış hücreye dokunmak yıldızı 0→1→2→3→0 yapar.
  - Toplu işaretleme durak başlığından yapılır: tüm sınıf veya seçili öğrenciler için Tamamlandı / Devam ediyor / Başlamadı. Zaten tamamlanmış hücrelerin yıldızı korunur.
- Veli görünümü: çocuğun her ders için ilerlediği "yol haritası" görseli.
  - Tüm duraklar görünür: tamamlananlar renkli + yıldız, devam eden "şu an burada" vurgulu, gelecek duraklar soluk. Ders başına ilerleme çubuğu var. Başka öğrenciyle kıyas yoktur.
- İlerleme değişiklikleri veliye bildirim göndermez.

### 4.6 Karakterler
- Birden fazla karakter türü (ejderha, baykuş, robot, tohum→ağaç).
  - Türü **yalnızca öğretmen** seçer/değiştirir (öğrenci detayı; çocuk isterse tahtada öğretmenle birlikte seçer). Veli değiştiremez. Değişiklik audit log'a düşer.
- **Sabit 5 seviye.** XP eşikleri **tüm türler için ortaktır** (okul bazlı tek tablo, admin ayarlar); varsayılan 0 / 20 / 50 / 100 / 200 XP. 1. seviyenin eşiği 0'dır, her eşik bir öncekinden büyüktür.
  - Eşikler düşürülürse yeni eşiğe ulaşan öğrenciler hemen yükselir; eşikler yükseltilirse kimse düşmez. Değişiklik audit log'a düşer.
- Her tür, her seviye için kendi görselini ve adını (evrim aşaması) sağlar; tür değişse de seviye aynı kalır.
  - Admin okulunun türlerini adlandırır, aşama adlarını değiştirir, aktif/pasif yapar. En az bir tür aktif kalmalıdır. Pasif tür yeni seçimlerde görünmez; kullanan öğrencinin karakteri değişmez. Genel (okula ait olmayan) türler salt okunurdur.
  - Yeni tür ekleme ve görsel yükleme henüz yoktur; görseller kodla gelir (`public/characters/<tür>/<seviye>.svg`).
- Seviye atlandığında animasyonlu kutlama (evrim + konfeti; hareket azaltma tercihinde sade geçiş). Hem öğretmen puanlama ekranında hem tahta modunda gösterilir.
- Karakter **hiçbir koşulda geri gitmez**.
- Görseller özgündür (telifli karakter kullanılmaz); SVG veya Lottie. MVP'de yer tutucu SVG kullanılır.

### 4.7 Tahta modu
- Öğretmen sınıfı tam ekran açar (`/tahta/[sinifId]`): büyük karakter kartları, dokunarak olumlu puan verme.
  - **Oturum:** öğretmenin normal oturumu ve aynı yetki kontrolleri; ayrı tahta bağlantısı/kodu yoktur.
  - Kartta karakter, ad ve bir sonraki seviyeye ilerleme çubuğu bulunur; **XP sayısı gösterilmez** (kıyas olmasın). Kartlar ada göre sıralıdır.
  - Yalnızca olumlu davranışlar listelenir; tek öğrenciye veya "Tüm sınıf"a puan verilir. Not alanı yoktur. 10 saniyelik geri alma burada da vardır.
  - Dokunma hedefleri en az 80px; tam ekran düğmesi ve sınıfa dönüş bağlantısı vardır.
- Tahta modunda **negatif puanlar ve denge gösterilmez**, sıralama/liderlik tablosu yoktur. Sunucu bu ekrana XP, denge veya olumsuz olay verisi göndermez.

### 4.8 Mesajlar ve bildirimler
- Mesaj türleri: **sınıf duyurusu** (tüm veliler) ve **öğrenciye özel mesaj** (o öğrencinin velileri).
- Alıcılar gönderim anında sabitlenmez; sonradan bağlanan veli, çocuğunun sınıfına ve çocuğuna ait eski mesajları da görür.
- Veli mesajı okuyunca okundu bilgisi düşer; veli hızlı tepki verebilir ("Gördüm 👍", "Teşekkürler"). MVP'de serbest yanıt yoktur.
- Uygulama içi bildirim merkezi + **Web Push** (VAPID). Bildirime tıklayınca ilgili ekran açılır.
- iOS için "Ana ekrana ekle" rehberi.
- Veli bildirim tercihleri: mesajlar, olumlu davranışlar, olumsuz davranışlar, seviye atlama.
  - Kapatılan tür için ne uygulama içi bildirim ne push oluşur; mesajlar yine Mesajlar sayfasında görünür. Kayıt yoksa tür açıktır.
- Kararlar (Faz 7):
  - Mesajı yalnızca sınıfın öğretmeni gönderir ve siler (soft delete, audit). Başlık en fazla 120, gövde en fazla 2000 karakter.
  - Öğretmen her mesajda "okuyan / toplam veli" sayısını, tepki sayılarını ve veli bazında okundu/tepki listesini görür (alıcılar o anki bağlı velilerdir).
  - Tepki değiştirilebilir veya kaldırılabilir; tepki vermek okundu sayılır. Mesaj açılınca ilgili bildirim de okundu olur.
  - Bildirim merkezi ve push **yalnızca veliler** içindir. Bildirim yalnızca bildirim anında bağlı velilere gider; sonradan bağlanan veli eski mesajları listede görür ama bildirim almaz.
  - Okul davranışı bildirimleri puanlamayla aynı transaction'da oluşur; geri alınan veya silinen olayın bildirimi kaldırılır. Push, 10 sn geri alma süresi bitince, olay hâlâ duruyorsa gönderilir (sunucu tam o anda yeniden başlarsa push kaybolabilir, uygulama içi bildirim kalır).
  - Ev davranışı girişleri bildirim üretmez. Seviye atlama bildirimi, seviye düşmediği için geri almada kaldırılmaz.
  - Bildirimde öğretmenin notu ve puanı kimin verdiği yer almaz.
  - Push her cihazda ayrıca açılır (Ayarlar). Çıkış yapılınca o cihazın aboneliği silinir; aynı tarayıcıda başka kullanıcı girip bildirimi açarsa abonelik ona geçer. Sunucu yalnızca bilinen push servislerine (Google, Mozilla, Apple, Microsoft) istek atar.
  - iOS/iPadOS'ta push yalnızca ana ekrana eklenmiş uygulamada çalışır (16.4+); Ayarlar'da adım adım rehber, iOS tarayıcısında panelde kapatılabilir bant gösterilir.

### 4.9 Veli paneli
- `/veli` ilk çocuğun paneline (`/veli/[ogrenciId]`) yönlendirir; çocuk yoksa davet kodu girişi gösterilir. Davetle bağlanan çocuğun paneli açılır.
- Çocuk seçici (birden fazla çocuk varsa) ve "Çocuk ekle" bağlantısı.
- Kartlar: karakter + XP ilerleme çubuğu, haftalık davranış dengesi (son 7 gün grafiği), "Evde bugün" (ev davranışı girişi ve günlük tavan göstergesi), son 10 olay (okul/ev), akademik yol haritası özeti (ders başına tamamlanan durak ve "şu an"), okunmamış mesajlar (çocuğa ait en fazla 3 okunmamış mesaj ve "Tüm mesajlar" bağlantısı).
- Son olaylarda öğretmenin **notları ve puanı kimin verdiği gösterilmez**; not öğretmene özeldir.
- Veli başka hiçbir öğrenciye ait veri göremez (isim listesi dahil).

### 4.10 Öğretmen paneli
- Sınıf listesi → sınıf ekranı (öğrenci kartları grid).
- Öğrenci detayı: zaman çizelgesi, haftalık/aylık grafik, akademik durum, bağlı veliler, davet kodları.
  - Grafik: son 7 gün, gün gün olumlu/olumsuz puan (okulun saat dilimine göre). Aylık görünüm henüz yok.
- Ayarlar: davranış tipleri, dersler/duraklar, ev XP tavanı.

## 5. Gizlilik, güvenlik, KVKK

- Her sunucu işleminde **rol + sahiplik** kontrolü (öğretmen yalnızca kendi sınıfı, veli yalnızca bağlı öğrencisi).
- Aydınlatma metni + açık rıza kaydı (`ConsentRecord`: kullanıcı, metin sürümü, tarih).
- **Veri silme (Faz 9 kararları):**
  - Veli, çocuğunun verisinin silinmesini **talep eder** (Ayarlar); **okul yöneticisi** talebi görür, isterse verileri indirir, sonra kalıcı siler ya da gerekçesiyle reddeder. Çocuk başına tek açık talep olur.
  - Silme **kalıcıdır** (hard delete): öğrenci ve bağlı tüm kayıtlar (puanlar, ilerleme, davet kodları, veli bağlantıları, çocuğa özel mesajlar, çocukla ilgili bildirimler) silinir. `AuditLog` satırları kalır ama içlerindeki kişisel alanlar (ad, baş harf, mesaj başlığı, not) temizlenir; kimlik (uuid) ve işlem türü durur. Onay için yönetici öğrencinin adını yazar.
  - Veli **kendi hesabını** şifresiyle hemen silebilir; isterse aynı adımda çocukları için silme talebi açar. Talep yoksa çocuğun okul kayıtları okulda kalır. Velinin audit kayıtlarındaki IP silinir.
  - **Rıza kayıtları** hesap ya da öğrenci silinse de ispat için saklanır: kişiyle bağı koparılır (`userId`/`studentId` null), hesap silinince `withdrawnAt` işlenir.
  - Silinen veri, yedek saklama süresi (14 gün) dolana kadar şifreli yedeklerde kalır; aydınlatma metninde belirtilmelidir.
- **Veri dışa aktarma:** veli, kendi hesabının ve çocuklarının verisini JSON (tamamı) ve CSV (davranış geçmişi, Excel için `;` ayraçlı) olarak indirir; yalnızca uygulamada zaten gördüklerini içerir (öğretmen notu ve puanı kimin verdiği yok). Yönetici bir öğrencinin tam kaydını (notlar ve bağlı veliler dahil) indirebilir.
- `AuditLog`: puan verme/silme, durum değişikliği, veli bağlama/kaldırma, silme talebi/silme/reddetme, hesap silme, dışa aktarma. Yönetici kendi okulunun kayıtlarını işlem, kişi ve tarihe göre süzerek görür (`/admin/denetim`).
- Rate limiting: giriş (5/dk), davet kodu ve veli kaydı (10/dk), dışa aktarma (veli 5/saat), silme onayı şifresi (5/15 dk), silme talebi (10/saat); kötüye kullanım tavanı: mesaj gönderme (30/10 dk), ev davranışı (60/10 dk). İstemci IP'si reverse proxy'nin (Caddy) yazdığı `X-Forwarded-For`'dan alınır.
- Hesaplar: açık kayıt yok; yönetici ve öğretmen hesapları sunucuda komutla açılır, unutulan şifre aynı komutla sıfırlanır (`docs/DEPLOY.md`). Uygulama içi şifre değiştirme henüz yok.
- Barındırma: Türkiye'de VPS, günlük şifreli veritabanı yedeği, HTTPS zorunlu.

## 6. Veri modeli (Faz 0'da onaylandı)

Kurallar: `uuid` PK, `timestamptz`, snake_case tablo/kolon adları. `?` = null olabilir.

**Enum'lar:** `user_role(admin, teacher, parent)` · `behavior_scope(school, home)` · `progress_status(not_started, in_progress, completed)` · `parent_relation(mother, father, guardian, other)` · `message_reaction(seen, thanks)` · `notification_type(message, positive_behavior, negative_behavior, level_up)` · `consent_kind(privacy_notice, explicit_consent)`

```
School(id, name, timezone='Europe/Istanbul', settings jsonb, createdAt)
User(id, email, emailVerified, name, image, role, schoolId?, createdAt, updatedAt)
  -- Better Auth tablosu; şifre Better Auth'un account tablosunda. Veli için schoolId null.
Session / Account / Verification  -- Better Auth standart tabloları
Class(id, schoolId, name, gradeLevel 1–4, academicYear, homeDailyXpCap=10, archivedAt?, createdAt)
ClassTeacher(classId, userId, createdAt)                         PK(classId, userId)
CharacterType(id, schoolId?, name, active, sortOrder)             -- schoolId null = genel tür
CharacterLevel(schoolId, level 1–5, xpThreshold ≥ 0)              PK(schoolId, level); tüm türler için ortak
  -- okulda kayıt yoksa varsayılan eşikler (src/lib/character.ts) kullanılır
CharacterStage(id, characterTypeId, level 1–5, name, assetUrl)    unique(characterTypeId, level)
  -- aşama yoksa genel yer tutucu görsel gösterilir
Student(id, classId, firstName, lastInitial?, characterTypeId, xp=0, balance=0,
        characterLevel=1, active, createdAt, deletedAt?)
ParentStudent(parentId, studentId, relation, inviteCodeId?, createdAt)  PK(parentId, studentId)
InviteCode(id, studentId, codeHash, singleUse, expiresAt?, usedAt?, usedById?, revokedAt?,
           createdById, createdAt)                                -- düz kod saklanmaz
BehaviorType(id, classId, name, icon, points, scope, active, sortOrder, createdAt)
  -- check: points <> 0 ve −10…10; scope='home' ⇒ points > 0
  -- varsayılan liste kodda sabit (src/content/default-behaviors.ts); BehaviorTemplate tablosu yok
BehaviorEvent(id, studentId, classId, behaviorTypeId?, nameSnapshot, iconSnapshot, pointsSnapshot,
              xpDelta ≥ 0, balanceDelta, source, givenById?, note?, batchId,
              createdAt, deletedAt?, deletedById?, deleteReason? (undo|delete))
  -- batchId istemcide dokunuş başına üretilir; unique(studentId, batchId) çift gönderimi engeller
  -- ve toplu puanlamayı gruplar
Subject(id, classId, name, sortOrder, archivedAt?)
Topic(id, subjectId, name, sortOrder, archivedAt?)
Stage(id, topicId, name, sortOrder, archivedAt?)
StudentProgress(studentId, stageId, status, stars 0–3?, updatedById?, updatedAt)  PK(studentId, stageId)
  -- satır yoksa "başlamadı"; başlamadı'ya dönüş satırı siler. check: stars yalnızca status='completed'
Message(id, classId, studentId?, authorId?, title, body, createdAt, deletedAt?)
MessageRead(messageId, parentId, readAt, reaction?)                PK(messageId, parentId)
Notification(id, userId, type, payload jsonb, url, readAt?, createdAt)
NotificationPreference(userId, type, enabled)                      PK(userId, type); kayıt yoksa açık
PushSubscription(id, userId, endpoint unique, p256dh, auth, userAgent, failureCount, lastSuccessAt?, createdAt)
ConsentRecord(id, userId?, studentId?, kind, docVersion, ip, userAgent, acceptedAt, withdrawnAt?)
  -- kullanıcı/öğrenci silinince SET NULL: ispat için saklanır (Faz 9)
DeletionRequest(id, schoolId?, studentId?, requestedById?, status(pending|completed|rejected), note?,
                resolvedById?, resolvedAt?, rejectReason?, createdAt)
  -- öğrenci başına tek pending talep (kısmi unique index); öğrenci silinince studentId null olur
AuditLog(id, schoolId?, actorId?, action, entity, entityId, data jsonb, ip?, createdAt)
  -- yalnızca ekleme; istisna: öğrenci silinince kişisel alanlar, veli silinince IP'si temizlenir
```

**Türetilmiş alanlar ve puanlama kuralları**
- `Student.xp`, `Student.balance` ve `Student.characterLevel` olay eklenip silindiğinde **aynı transaction** içinde güncellenir (öğrenci satırı `FOR UPDATE` ile kilitlenir).
- Olay eklenirken: okul olayında `xpDelta = max(points, 0)`; ev olayında `xpDelta = min(points, tavan − bugün kullanılan ev XP'si)` (en az 0). `balanceDelta = points`.
- `characterLevel = GREATEST(characterLevel, xp'ye karşılık gelen seviye)` — seviye asla düşmez.
- Olay silinirken: `xp -= xpDelta`, `balance -= balanceDelta`; `characterLevel` değişmez.

**Silme davranışları:** öğrenciye ait tablolar öğrenci silinince `CASCADE`; `givenById`, `authorId`, `actorId`, `updatedById` gibi aktör kolonları kullanıcı silinince `SET NULL`.

**İleride karar verilecek:** yıl sonu sınıf geçişi. (KVKK silme Faz 9'da kararlaştırıldı: kalıcı silme, bkz. §5.)

## 7. MVP kapsamı dışı (sonraki sürümler)
- Veli ↔ öğretmen serbest sohbet
- Mağaza uygulamaları (Capacitor)
- Çok okullu SaaS yönetimi, faturalama
- Rapor PDF'leri, dönem sonu karnesi
- Karakter aksesuarları / ödül mağazası

## 8. Başarı ölçütleri (pilot)
- Öğretmen bir öğrenciye 2 dokunuşta puan verebiliyor.
- Velilerin ≥%70'i ilk hafta içinde kayıt oluyor.
- Push bildirimleri Android ve ana ekrana eklenmiş iOS'ta ulaşıyor.
- Hiçbir veli, kendisine bağlı olmayan öğrencinin verisine erişemiyor (otomatik testle doğrulanır).
