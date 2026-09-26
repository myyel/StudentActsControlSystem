# PRD — Öğrenci Davranış ve Gelişim Sistemi

> Sürüm: 0.1 (MVP) · Dil: Türkçe arayüz · Hedef kitle: 6–10 yaş (ilkokul) sınıfları

## 1. Amaç

Öğretmenin sınıfındaki öğrencilerin davranışlarını puanlayabildiği, akademik konulardaki ilerlemeyi "duraklar" üzerinden takip edebildiği ve velilerin yalnızca kendi çocuklarını görüp evdeki davranışları da değerlendirebildiği bir web uygulaması. Olumlu davranışlar, çocukların gelişen karakterleriyle ödüllendirilir.

## 2. Platform gereksinimleri

- Responsive web uygulaması + **PWA** (ana ekrana yüklenebilir, push bildirim alır).
- Hedef ortamlar: Pardus (Firefox/Chromium), Windows, Android (Chrome), iOS/iPadOS 16.4+ (Safari, ana ekrana eklenmiş).
- Kırılım noktaları: telefon (≥360px), tablet (≥768px), masaüstü (≥1280px), akıllı tahta (1920px, dokunmatik).
- İleride Capacitor ile mağaza uygulamasına paketlenebilecek şekilde tasarlanır (native-özel API kullanılmaz).

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

### 4.2 Veli kaydı
- Veli yalnızca davet koduyla kayıt olur / mevcut hesabına çocuk ekler. Açık kayıt yoktur.
- Bir öğrencinin birden fazla velisi, bir velinin birden fazla çocuğu olabilir.
- Kayıt sırasında KVKK aydınlatma metni gösterilir, açık rıza alınır ve kaydedilir.

### 4.3 Davranış puanlama
- **Davranış tipi**: ad, ikon/emoji, puan (tam sayı, negatif olabilir), kapsam (`school` | `home`), sınıfa ait, aktif/pasif.
- Yeni sınıfa varsayılan davranış listesi yüklenir (öğretmen düzenleyebilir).
- Öğretmen: öğrenci kartına dokun → davranış seç. Çoklu öğrenci seçip toplu puanlama. İsteğe bağlı not.
- Son işlem birkaç saniye içinde **geri alınabilir**; sonrasında öğretmen kaydı silebilir (audit log'a düşer).
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
- Ev olayları öğretmen ekranında "Ev" etiketiyle ayrı görünür.

### 4.5 Akademik duraklar
- Hiyerarşi: **Ders → Konu → Durak** (sıralı; sürükle-bırak ile sıralama).
- Her öğrenci × durak için durum: `not_started` | `in_progress` | `completed` (+ isteğe bağlı 0–3 yıldız).
- Öğretmen görünümü: sınıf matrisi (satır öğrenci, sütun durak), hücreye dokunarak durum değiştirme, toplu işaretleme.
- Veli görünümü: çocuğun her ders için ilerlediği "yol haritası" görseli.

### 4.6 Karakterler
- Birden fazla karakter türü (örn. ejderha, baykuş, robot, tohum→ağaç); öğrenci/öğretmen seçer.
- Seviye XP eşikleri **tüm türler için ortaktır** (okul bazlı tek tablo, admin ayarlar). Her tür, her seviye için kendi görselini (evrim aşaması) sağlar; tür değişse de seviye aynı kalır.
- Seviye atlandığında animasyonlu kutlama.
- Karakter **hiçbir koşulda geri gitmez**.
- Görseller özgündür (telifli karakter kullanılmaz); SVG veya Lottie. MVP'de yer tutucu SVG kullanılır.

### 4.7 Tahta modu
- Öğretmen sınıfı tam ekran açar: büyük karakter kartları, dokunarak olumlu puan verme.
- Tahta modunda **negatif puanlar ve denge gösterilmez**, sıralama/liderlik tablosu yoktur.

### 4.8 Mesajlar ve bildirimler
- Mesaj türleri: **sınıf duyurusu** (tüm veliler) ve **öğrenciye özel mesaj** (o öğrencinin velileri).
- Alıcılar gönderim anında sabitlenmez; sonradan bağlanan veli, çocuğunun sınıfına ve çocuğuna ait eski mesajları da görür.
- Veli mesajı okuyunca okundu bilgisi düşer; veli hızlı tepki verebilir ("Gördüm 👍", "Teşekkürler"). MVP'de serbest yanıt yoktur.
- Uygulama içi bildirim merkezi + **Web Push** (VAPID). Bildirime tıklayınca ilgili ekran açılır.
- iOS için "Ana ekrana ekle" rehberi.
- Veli bildirim tercihleri: mesajlar, olumlu davranışlar, olumsuz davranışlar, seviye atlama.

### 4.9 Veli paneli
- Çocuk seçici (birden fazla çocuk varsa).
- Kartlar: karakter + XP ilerleme çubuğu, haftalık davranış dengesi, son olaylar (okul/ev), akademik yol haritası, okunmamış mesajlar.
- Veli başka hiçbir öğrenciye ait veri göremez (isim listesi dahil).

### 4.10 Öğretmen paneli
- Sınıf listesi → sınıf ekranı (öğrenci kartları grid).
- Öğrenci detayı: zaman çizelgesi, haftalık/aylık grafik, akademik durum, bağlı veliler, davet kodları.
- Ayarlar: davranış tipleri, dersler/duraklar, ev XP tavanı.

## 5. Gizlilik, güvenlik, KVKK

- Her sunucu işleminde **rol + sahiplik** kontrolü (öğretmen yalnızca kendi sınıfı, veli yalnızca bağlı öğrencisi).
- Aydınlatma metni + açık rıza kaydı (`ConsentRecord`: kullanıcı, metin sürümü, tarih).
- Veli hesabını ve çocuğa ait veriyi silme talebi; veri dışa aktarma (JSON/CSV).
- `AuditLog`: puan verme/silme, durum değişikliği, veli bağlama/kaldırma, silme işlemleri.
- Rate limiting (giriş, davet kodu doğrulama).
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
CharacterLevel(schoolId, level, xpThreshold)                      PK(schoolId, level); tüm türler için ortak
CharacterStage(id, characterTypeId, level, name, assetUrl)        unique(characterTypeId, level)
Student(id, classId, firstName, lastInitial?, characterTypeId, xp=0, balance=0,
        characterLevel=1, active, createdAt, deletedAt?)
ParentStudent(parentId, studentId, relation, inviteCodeId?, createdAt)  PK(parentId, studentId)
InviteCode(id, studentId, codeHash, singleUse, expiresAt?, usedAt?, usedById?, revokedAt?,
           createdById, createdAt)                                -- düz kod saklanmaz
BehaviorTemplate(id, schoolId, name, icon, points, scope, sortOrder)  -- yeni sınıfa kopyalanır
BehaviorType(id, classId, name, icon, points, scope, active, sortOrder)
  -- check: scope='home' ⇒ points > 0
BehaviorEvent(id, studentId, classId, behaviorTypeId?, nameSnapshot, iconSnapshot, pointsSnapshot,
              xpDelta ≥ 0, balanceDelta, source, givenById?, note?, batchId?, clientRequestId?,
              createdAt, deletedAt?, deletedById?)
  -- unique(studentId, clientRequestId): çift gönderimi engeller
Subject(id, classId, name, sortOrder, archivedAt?)
Topic(id, subjectId, name, sortOrder, archivedAt?)
Stage(id, topicId, name, sortOrder, archivedAt?)
StudentProgress(studentId, stageId, status, stars 0–3?, updatedById?, updatedAt)  PK(studentId, stageId)
Message(id, classId, studentId?, authorId?, title, body, createdAt, deletedAt?)
MessageRead(messageId, parentId, readAt, reaction?)                PK(messageId, parentId)
Notification(id, userId, type, payload jsonb, url, readAt?, createdAt)
NotificationPreference(userId, type, enabled)                      PK(userId, type); kayıt yoksa açık
PushSubscription(id, userId, endpoint unique, p256dh, auth, userAgent, failureCount, lastSuccessAt?, createdAt)
ConsentRecord(id, userId, studentId?, kind, docVersion, ip, userAgent, acceptedAt, withdrawnAt?)
AuditLog(id, schoolId?, actorId?, action, entity, entityId, data jsonb, ip?, createdAt)  -- yalnızca ekleme
```

**Türetilmiş alanlar ve puanlama kuralları**
- `Student.xp`, `Student.balance` ve `Student.characterLevel` olay eklenip silindiğinde **aynı transaction** içinde güncellenir (öğrenci satırı `FOR UPDATE` ile kilitlenir).
- Olay eklenirken: okul olayında `xpDelta = max(points, 0)`; ev olayında `xpDelta = min(points, tavan − bugün kullanılan ev XP'si)` (en az 0). `balanceDelta = points`.
- `characterLevel = GREATEST(characterLevel, xp'ye karşılık gelen seviye)` — seviye asla düşmez.
- Olay silinirken: `xp -= xpDelta`, `balance -= balanceDelta`; `characterLevel` değişmez.

**Silme davranışları:** öğrenciye ait tablolar öğrenci silinince `CASCADE`; `givenById`, `authorId`, `actorId`, `updatedById` gibi aktör kolonları kullanıcı silinince `SET NULL`.

**İleride karar verilecek:** karakter türünü kimin seçtiği (Faz 5), tahta modunun oturum biçimi (Faz 5), yıl sonu sınıf geçişi, KVKK silmede hard delete / anonimleştirme (Faz 9).

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
