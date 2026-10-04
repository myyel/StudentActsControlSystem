// Kullanım kılavuzunu (docs/Kullanim-Kilavuzu.pdf) docs/kilavuz/img'deki ekran görüntülerinden üretir.
//   node scripts/kilavuz/ekranlar.mjs   # önce ekran görüntüleri
//   node scripts/kilavuz/kilavuz.mjs
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const DIR = path.resolve("docs/kilavuz");
const OUT_PDF = path.resolve("docs/Kullanim-Kilavuzu.pdf");
const missing = [];

/** A screenshot with a caption. kind: desk (full width), phone (narrow), part (cropped piece). */
function fig(name, caption, kind = "desk") {
  if (!existsSync(path.join(DIR, "img", `${name}.jpg`))) missing.push(name);
  return `<figure class="${kind}"><img src="img/${name}.jpg" alt=""><figcaption>${caption}</figcaption></figure>`;
}
/** Two phone screenshots side by side. */
const pair = (a, b) => `<div class="pair">${a}${b}</div>`;
const steps = (...items) => `<ol class="steps">${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
const tip = (text) => `<div class="tip"><strong>İpucu</strong> ${text}</div>`;
const note = (text) => `<div class="note"><strong>Önemli</strong> ${text}</div>`;

const chapters = [];
const chapter = (id, title, lead, body) => chapters.push({ id, title, lead, body });

// ─── 1. Başlarken ──────────────────────────────────────────────────────────
chapter("baslarken", "Başlarken", "Sistem nedir, kim ne yapar, nasıl giriş yapılır?", `
<h2>1.1 Sistem hakkında</h2>
<p><b>Öğrenci Davranış ve Gelişim Sistemi</b>, ilkokul (6–10 yaş) sınıflarında öğretmenin öğrencilerin davranışlarını puanlayabildiği, akademik ilerlemeyi <b>duraklar</b> üzerinden izleyebildiği ve velilerin yalnızca kendi çocuklarını görüp evdeki davranışları da işaretleyebildiği bir uygulamadır. Olumlu davranışlar, çocukların zamanla gelişen <b>karakterleriyle</b> ödüllendirilir.</p>

<table>
<tr><th>Rol</th><th>Neler yapar?</th></tr>
<tr><td><b>Öğretmen</b></td><td>Sınıf ve öğrenci ekler, davranış puanı verir, ders duraklarını ve ilerlemeyi yönetir, velilere mesaj yazar, veli davet kodu üretir, akıllı tahtada tahta modunu kullanır.</td></tr>
<tr><td><b>Veli</b></td><td>Davet koduyla kaydolur; yalnızca kendi çocuğunun puanlarını, karakterini ve yol haritasını görür, evdeki davranışları işaretler, mesajları okur, bildirim alır, verilerini indirir.</td></tr>
<tr><td><b>Okul yöneticisi</b></td><td>Karakter seviye eşiklerini ve türlerini yönetir, velilerin veri silme taleplerini sonuçlandırır, denetim kaydını inceler.</td></tr>
</table>
<p>Öğrencilerin kendi hesabı yoktur. Çocuklar karakterlerini sınıftaki akıllı tahtada ya da velinin telefonunda görür.</p>

<h3>Temel kavramlar</h3>
<table>
<tr><th>Kavram</th><th>Anlamı</th></tr>
<tr><td><b>XP (gelişim puanı)</b></td><td>Yalnızca olumlu davranışlarla artar. Karakterin seviye atlamasını sağlar. Olumsuz puanlar XP'yi düşürmez.</td></tr>
<tr><td><b>Davranış dengesi</b></td><td>Olumlu ve olumsuz puanların toplamıdır. Yalnızca öğretmen ve veli ekranlarında görünür.</td></tr>
<tr><td><b>Karakter ve seviye</b></td><td>Her çocuğun bir karakteri (Ejderha, Baykuş, Robot, Tohum) vardır. XP arttıkça 5 seviye boyunca gelişir. <b>Seviye hiçbir zaman düşmez.</b></td></tr>
<tr><td><b>Durak</b></td><td>Ders → Konu → Durak şeklinde sıralanan öğrenme adımlarıdır (ör. Türkçe → Okuma → Heceleme). Her durak için "başlamadı / devam ediyor / tamamlandı" işaretlenir.</td></tr>
<tr><td><b>Ev davranışı</b></td><td>Velinin evde işaretlediği olumlu davranıştır. Evden günlük kazanılabilecek XP'nin bir tavanı vardır.</td></tr>
</table>

<h2>1.2 Hangi cihazlarda çalışır?</h2>
<p>Uygulama bir internet tarayıcısında açılır; ayrıca bir program kurmak gerekmez. Telefon, tablet, bilgisayar ve akıllı tahtada çalışır (Pardus, Windows, Android, iPhone/iPad). Ekran boyutuna göre kendini düzenler. Telefona <a href="#yukleme">uygulama gibi yüklenebilir</a>.</p>

<h2>1.3 Giriş yapma</h2>
${steps(
  "Okulun size verdiği adresi (ör. <i>https://gelisim.okulunuz.k12.tr</i>) tarayıcıda açın.",
  "<b>E-posta</b> ve <b>Şifre</b> alanlarını doldurun.",
  "<b>Giriş yap</b> düğmesine dokunun. Rolünüze göre kendi ana sayfanız açılır: öğretmen için <i>Sınıflarım</i>, veli için çocuğunun paneli, yönetici için <i>Yönetim paneli</i>.",
)}
${pair(fig("giris-telefon", "Telefonda giriş ekranı", "phone"), fig("bulunamadi", "Olmayan ya da görme yetkiniz olmayan bir sayfa", "phone"))}
<p><b>Çıkış yapmak</b> için sağ üstteki <b>Çıkış yap</b> düğmesine dokunun. Ortak kullanılan bir cihazda çıkış yapınca o cihaza artık sizin bildirimleriniz gelmez.</p>
${note("Uygulamada açık kayıt yoktur. Öğretmen ve yönetici hesaplarını okulun bilişim sorumlusu açar. Veliler yalnızca öğretmenin verdiği <b>davet kodu</b> ile kaydolur.")}
<h3>Şifremi unuttum</h3>
<p>Şifrenizi unuttuysanız okulunuzun bilişim sorumlusuna ya da okul yöneticisine başvurun; size yeni bir geçici şifre verilir. Güvenlik için art arda çok sayıda yanlış deneme yapılırsa sistem bir dakika bekletir ("Çok fazla deneme yapıldı").</p>
<h2>1.4 İnternet bağlantısı yokken</h2>
<p>Bağlantınız koptuğunda açılamayan sayfaların yerine <b>İnternet bağlantısı yok</b> ekranı gösterilir. Bağlantı gelince <b>Tekrar dene</b>'ye dokunun. Puanlar, mesajlar ve ev davranışları yalnızca bağlantı varken kaydedilir. Çocuklara ait bilgiler güvenlik nedeniyle cihazda saklanmaz.</p>
${fig("cevrimdisi", "Bağlantı yokken açılan ekran", "phone")}
`);

// ─── 2. Öğretmen ───────────────────────────────────────────────────────────
chapter("ogretmen", "Öğretmen Kılavuzu", "Sınıf kurulumu, puanlama, duraklar, mesajlar ve tahta modu.", `
<h2>2.1 Sınıflarım ve yeni sınıf</h2>
<p>Giriş yapınca <b>Sınıflarım</b> sayfası açılır. Sınıfınızın adına dokunarak sınıf ekranına geçersiniz.</p>
${fig("ogretmen-siniflarim", "Sınıflarım: sınıf listesi ve yeni sınıf oluşturma")}
${steps(
  "<b>Yeni sınıf oluştur</b> bölümünde <b>Sınıf adı</b> (ör. 2-A), <b>Sınıf düzeyi</b> ve <b>Öğretim yılı</b> alanlarını doldurun.",
  "<b>Sınıf oluştur</b> düğmesine dokunun. Yeni sınıfa hazır bir davranış listesi otomatik olarak eklenir.",
)}

<h2>2.2 Sınıf ekranı ve sekmeler</h2>
<p>Sınıf ekranının üstünde şu sekmeler bulunur: <b>Puanlama</b>, <b>Ölçek</b>, <b>Davranışlar</b>, <b>Duraklar</b>, <b>Mesajlar</b> ve <b>Veli davet kartları</b>. Sağ üstteki <b>Tahta modu</b> düğmesi akıllı tahta ekranını açar.</p>
${fig("ogretmen-puanlama", "Puanlama sekmesi: her kartta öğrencinin karakteri, adı ve XP'si")}
${tip("Sınıf ekranı tahtaya yansıtılabileceği için kartlarda yalnızca ad ve XP görünür; davranış dengesi ve olumsuz puanlar yalnızca öğrenci detayındadır.")}

<h2>2.3 Öğrenci ekleme</h2>
<p>Puanlama sekmesinin altında iki yol vardır:</p>
${fig("ogretmen-ogrenci-ekle", "Tek tek ya da listeyi yapıştırarak toplu öğrenci ekleme", "part")}
<ul>
<li><b>Öğrenci ekle:</b> <b>Ad</b> ve <b>Soyad baş harfi</b> yazıp <b>Ekle</b>'ye dokunun.</li>
<li><b>Toplu ekle:</b> e-Okul'dan ya da bir listeden kopyaladığınız adları her satıra bir öğrenci gelecek şekilde yapıştırın. <b>Önizleme</b> kutusunda nasıl kaydedileceğini görürsünüz. Ardından <b>… öğrenciyi ekle</b>'ye dokunun.</li>
</ul>
${note("Kişisel verileri azaltmak için soyadının yalnızca <b>baş harfi</b> saklanır (\"Ada Yılmaz\" → \"Ada Y.\"). Listedeki \"1.\", \"2)\" gibi sıra numaraları yok sayılır.")}

<h2>2.4 Davranış puanı verme</h2>
<p>Puan vermek iki dokunuştur: <b>öğrenci kartına dokun → davranışı seç</b>.</p>
${steps(
  "Puanlama sekmesinde öğrencinin kartına dokunun.",
  "Açılan pencerede <b>Olumlu</b> ya da <b>Olumsuz</b> davranışlardan birine dokunun. Puan hemen kaydedilir.",
  "Ekranın altında <b>Geri al (10)</b> çubuğu belirir. Yanlış öğrenciye ya da yanlış davranışa dokunduysanız 10 saniye içinde <b>Geri al</b>'a dokunun.",
)}
${fig("ogretmen-davranis-sec", "Karta dokununca davranış seçme penceresi açılır")}
${fig("ogretmen-geri-al", "Puan verildi; alttaki çubukla 10 saniye içinde geri alınabilir")}
<h3>Puana not eklemek</h3>
<p>Pencerede davranışı seçmeden önce not alanına kısa bir açıklama yazabilirsiniz (ör. "Arkadaşına matematikte yardım etti"). Notlar öğrenci detayındaki zaman çizelgesinde görünür. <b>Notlar veliye gösterilmez.</b></p>
${fig("ogretmen-not-ekle", "Puanla birlikte kaydedilecek not")}
<h3>Birden çok öğrenciye ya da tüm sınıfa puan</h3>
${steps(
  "<b>Çoklu seç</b> düğmesine dokunun.",
  "Puan vereceğiniz öğrencilerin kartlarına dokunun (seçilenlerde onay işareti görünür) ya da <b>Tümünü seç</b>'e dokunun.",
  "<b>… öğrenciye puan ver</b> düğmesine dokunup davranışı seçin.",
  "Bitince <b>Çoklu seçimi kapat</b>'a dokunun.",
)}
${fig("ogretmen-coklu-secim", "Çoklu seçim: seçilen öğrencilere tek seferde puan")}
<h3>Seviye atlama</h3>
<p>Bir öğrencinin XP'si bir sonraki seviyenin eşiğini geçince karakteri gelişir ve ekranda <b>kutlama</b> penceresi açılır. <b>Harika!</b>'ya dokunarak kapatın. Cihazda "hareketi azalt" ayarı açıksa kutlama sade bir geçişle gösterilir.</p>
${fig("ogretmen-seviye-atlama", "Seviye atlayan öğrenci için kutlama")}

<h2>2.5 Öğrenci detayı</h2>
<p>Davranış penceresindeki <b>Öğrenci detayı ve zaman çizelgesi</b> bağlantısına dokunarak öğrencinin sayfasını açın.</p>
${fig("ogretmen-ogrenci-detay", "Öğrenci detayı: XP, davranış dengesi, karakter ve son 7 gün")}
<ul>
<li><b>Gelişim puanı (XP)</b> ve <b>Davranış dengesi</b> üstte yer alır.</li>
<li><b>Karakter:</b> öğrencinin karakterini ve bir sonraki seviyeye ne kadar kaldığını gösterir. <b>Karakter türü</b> altındaki seçeneklerden türü değiştirebilirsiniz (seviye korunur). Tür yalnızca öğretmen tarafından değiştirilir; çocuk isterse tahtada birlikte seçebilirsiniz.</li>
<li><b>Son 7 gün:</b> gün gün olumlu ve olumsuz puanları gösteren grafik.</li>
</ul>
${fig("ogretmen-zaman-cizelgesi", "Zaman çizelgesi: okul ve ev kayıtları, filtreler ve silme")}
<ul>
<li><b>Zaman çizelgesi:</b> tüm puanlar tarih sırasıyla listelenir. <b>Tümü / Okul / Ev</b> düğmeleriyle süzebilirsiniz. Ev kayıtlarında işaretleyen veli, tavan nedeniyle XP eklenmediyse bu da yazılır.</li>
<li>Geri alma süresi geçmiş yanlış bir puanı <b>Sil</b> ile kaldırabilirsiniz. XP ve denge otomatik düzeltilir, ancak <b>karakterin seviyesi düşmez</b>.</li>
</ul>
${fig("ogretmen-ogrenci-bilgiler", "Bilgiler, bağlı veliler ve veli davet kodu")}
<ul>
<li><b>Bilgiler:</b> öğrencinin adını ve soyad baş harfini düzeltin. <b>Pasif yap</b> ile nakil giden bir öğrenciyi puanlama ekranından kaldırabilirsiniz; kayıtları silinmez ve sınıf sayfasındaki <i>Pasif öğrenciler</i> bölümünden yeniden <b>Aktif yap</b>ılabilir.</li>
<li><b>Bağlı veliler:</b> öğrenciye bağlanmış veliler listelenir. <b>Velilere mesaj gönder</b> ile o öğrenciye özel mesaj yazabilirsiniz.</li>
</ul>

<h2>2.6 Veli davet kodu ve davet kartları</h2>
<p>Veliler sisteme yalnızca öğretmenin ürettiği davet koduyla katılır. Her kod bir öğrenciye aittir.</p>
<h3>Tek öğrenci için kod</h3>
${steps(
  "Öğrenci detayında <b>Veli davet kodu</b> bölümüne gidin.",
  "<b>Geçerlilik</b> süresini seçin. Her velinin ayrı kod kullanması için <b>Tek kullanımlık</b> seçeneğini açık bırakın (önerilir).",
  "<b>Davet kodu üret</b>'e dokunun. QR kodlu bir kart oluşur. <b>Yazdır</b> ile çıktısını alın ya da kodu veliye iletin.",
)}
${fig("ogretmen-davet-kodu", "Üretilen davet kodu, QR kod ve üretilen kodların durumu", "part")}
${note("Güvenlik nedeniyle kod <b>yalnızca bir kez</b> gösterilir; sayfadan ayrılınca tekrar görüntülenemez. Kaybolursa yeni kod üretin. Kullanılmamış bir kodu <b>Üretilen kodlar</b> listesinden <b>İptal et</b> ile geçersiz kılabilirsiniz.")}
<h3>Tüm sınıf için yazdırılabilir kartlar</h3>
<p><b>Veli davet kartları</b> sekmesinde <b>Yalnızca velisi henüz bağlanmamış öğrenciler</b> seçeneğiyle <b>Davet kartlarını üret</b>'e dokunun. Her öğrenci için bir kart oluşur; <b>Kartları yazdır</b> ile A4'e basıp öğrencilerle eve gönderebilirsiniz.</p>
${fig("ogretmen-davet-kartlari", "Sınıf için üretilen, yazdırılabilir veli davet kartları")}

<h2>2.7 Davranışlar</h2>
<p><b>Davranışlar</b> sekmesinde sınıfınızda kullanılan davranışları yönetirsiniz. <b>Okul</b> ve <b>Ev</b> olmak üzere iki liste vardır.</p>
${fig("ogretmen-davranislar", "Davranış listesi ve yeni davranış ekleme")}
<ul>
<li><b>Ekleme:</b> alttaki formda bir <b>Simge</b> seçin (ya da bir emoji yazın), <b>Ad</b> ve <b>Puan</b> girip <b>Ekle</b>'ye dokunun. Puan −10 ile +10 arasında olabilir, 0 olamaz.</li>
<li><b>Düzenle:</b> ad, simge ve puanı değiştirir. Geçmişte verilmiş puanlar değişmez; her kayıt verildiği andaki puanı saklar.</li>
<li><b>Sıralama:</b> ↑ ↓ oklarıyla davranışların penceredeki sırasını ayarlayın.</li>
<li><b>Pasif yap:</b> davranışı listeden kaldırır, geçmiş kayıtlar korunur. Yeniden <b>Aktif yap</b>ılabilir.</li>
<li>Liste boşsa <b>Varsayılan listeyi yükle</b> ile hazır listeyi ekleyebilirsiniz.</li>
</ul>
<h3>Ev davranışları ve günlük ev XP tavanı</h3>
<p><b>Ev</b> sekmesindeki davranışları veliler evde işaretler. Ev davranışları <b>yalnızca olumlu</b> olabilir. Aynı sekmedeki <b>Günlük ev XP tavanı</b> (varsayılan 10), bir öğrencinin bir günde evden kazanabileceği en fazla XP'dir. Tavan dolunca veli işaretlemeye devam edebilir; davranış kaydedilir ama XP eklenmez.</p>

<h2>2.8 Duraklar (ders planı)</h2>
<p><b>Duraklar</b> sekmesinde akademik ilerlemeyi izleyeceğiniz yapıyı kurarsınız: <b>Ders → Konu → Durak</b>.</p>
${fig("ogretmen-duraklar", "Ders, konu ve durakların düzenlenmesi")}
<ul>
<li><b>Ekleme:</b> <b>Ders ekle</b>, konu içinde <b>Konu ekle</b>, konu içinde <b>Durak ekle</b>.</li>
<li><b>Yeniden adlandırma:</b> kalem simgesi.</li>
<li><b>Sıralama:</b> soldaki tutamaçtan (⋮⋮) sürükleyin. Klavyede tutamaca gelip <b>boşluk</b>'a basın, <b>ok tuşlarıyla</b> taşıyın, yeniden <b>boşluk</b>'la bırakın.</li>
<li><b>Arşivleme:</b> kutu simgesi. Arşivlenen öğeler ölçekte ve veli ekranında görünmez; öğrencilerin ilerlemesi silinmez ve arşivden geri getirilebilir.</li>
</ul>

<h2>2.9 Sınıf ölçeği (ilerleme işaretleme)</h2>
<p><b>Ölçek</b> sekmesi öğrencileri satırlarda, durakları sütunlarda gösterir. Üstten dersi seçin.</p>
${fig("ogretmen-matris", "Sınıf ölçeği: her hücre bir öğrencinin bir duraktaki durumu")}
<ul>
<li><b>Hücreye dokunun:</b> Başlamadı → Devam ediyor → Tamamlandı sırasıyla değişir.</li>
<li><b>Yıldız modu:</b> <b>★ Yıldız modu</b>'nu açıp tamamlanmış bir hücreye dokunarak 0–3 yıldız verin.</li>
<li><b>Toplu işaretleme:</b> bir durağın başlığına dokunarak o durağı birden çok öğrenci için aynı anda işaretleyin. <b>Öğrenci seç</b> ile yalnızca seçtiğiniz öğrencileri işaretleyebilirsiniz.</li>
</ul>
<p>Veli, çocuğunun durumunu <a href="#veli">yol haritasında</a> görür.</p>

<h2>2.10 Mesajlar</h2>
<p><b>Mesajlar</b> sekmesinden velilere yazarsınız. Veliler yanıt yazamaz; <b>Gördüm 👍</b> ya da <b>Teşekkürler 🙏</b> ile hızlı tepki verebilir.</p>
${fig("ogretmen-mesajlar", "Yeni mesaj formu ve gönderilen mesajlar")}
${steps(
  "<b>Kime</b> listesinden <b>Tüm sınıf (duyuru)</b> ya da bir öğrenci seçin. Öğrenciye özel mesaj yalnızca o öğrencinin velilerine gider.",
  "<b>Başlık</b> ve <b>Mesaj</b> yazıp <b>Gönder</b>'e dokunun. Velilere bildirim gider.",
  "<b>Gönderilenler</b> listesinde kaç velinin okuduğunu ve tepkileri görürsünüz. <b>Kim okudu?</b> ile okuyan ve okumayan veliler açılır.",
  "Bir mesajı <b>Sil</b> ile kaldırabilirsiniz; veliler de artık göremez.",
)}
${tip("Sonradan bağlanan veliler de eski duyuruları görür.")}

<h2>2.11 Tahta modu (akıllı tahta)</h2>
<p>Sınıf ekranındaki <b>Tahta modu</b> düğmesiyle akıllı tahta için tasarlanmış tam ekran görünüm açılır. Kartlar büyüktür ve kolay dokunulur. Çocuklar karakterlerini burada görür.</p>
${fig("tahta", "Tahta modu: büyük karakter kartları ve seviye çubukları", "desk")}
${steps(
  "<b>Tam ekran</b>'a dokunarak tarayıcı çubuklarını gizleyin.",
  "Bir öğrencinin kartına ya da <b>Tüm sınıf</b>'a dokunun.",
  "Açılan pencerede davranışı seçin. Puan kaydedilir, kart kısa süre parlar; seviye atlarsa kutlama gösterilir.",
  "Yanlışlıkla verilen puanı alttaki büyük <b>Geri al</b> düğmesiyle 10 saniye içinde geri alın.",
  "İşiniz bitince <b>Çık</b>'a dokunarak sınıf ekranına dönün.",
)}
${note("Çocukların gördüğü bu ekranda <b>olumsuz puan, davranış dengesi, XP sayısı ve sıralama gösterilmez</b>; kartlar ad sırasıyla dizilir. Olumsuz puan vermek gerekirse bunu kendi cihazınızdan Puanlama sekmesinde yapın.")}
${fig("tahta-davranis-sec", "Tahtada davranış seçme: yalnızca olumlu davranışlar")}
`);

// ─── 3. Veli ──────────────────────────────────────────────────────────────
chapter("veli", "Veli Kılavuzu", "Kayıt, çocuğunuzun paneli, ev davranışları, mesajlar ve ayarlar.", `
<h2>3.1 Davet koduyla kayıt</h2>
<p>Öğretmeniniz size çocuğunuza ait bir <b>davet kartı</b> verir. Kartta bir QR kod, bir adres ve <b>ABCD-EFGH</b> biçiminde 8 karakterlik bir kod bulunur.</p>
${steps(
  "Telefonunuzun kamerasıyla QR kodu okutun ya da karttaki adresi tarayıcınıza yazın (adresin sonunda davet kodu yer alır).",
  "Açılan sayfada kodun hangi çocuk ve sınıf için olduğunu kontrol edin.",
  "<b>Adınız ve soyadınız</b>, <b>E-posta</b> ve en az 8 karakterlik bir <b>Şifre</b> girin, <b>Çocuğunuzla yakınlığınızı</b> (Anne, Baba, Vasi, Diğer) seçin.",
  "<b>Aydınlatma metnini</b> okuyup iki KVKK onay kutusunu işaretleyin.",
  "<b>Hesap oluştur</b>'a dokunun. Doğrudan çocuğunuzun paneline girersiniz.",
)}
${pair(fig("veli-davet-kodu", "Davet kodunun açtığı sayfa", "phone"), fig("veli-kayit-formu", "Veli hesabı oluşturma formu", "phone"))}
${note("Tek kullanımlık kodlar bir kez kullanılabilir. Kod süresi dolmuşsa ya da iptal edildiyse öğretmeninizden yeni kod isteyin. Diğer ebeveyn kendi koduyla ayrı hesap açmalıdır.")}

<h2>3.2 Hesabınıza ikinci çocuk ekleme</h2>
<p>Birden çok çocuğunuz varsa her biri için ayrı hesap açmanıza gerek yoktur. Giriş yaptıktan sonra panelde <b>Çocuk ekle</b>'ye dokunun, çocuğun davet kodunu girin, onayları işaretleyip <b>Bu çocuğu hesabıma ekle</b>'ye dokunun.</p>
${fig("veli-cocuk-ekle", "Mevcut hesaba davet koduyla çocuk ekleme", "phone")}

<h2>3.3 Çocuğunuzun paneli</h2>
<p>Giriş yapınca çocuğunuzun paneli açılır. Üst çubukta <b>Mesajlar</b>, <b>Bildirimler</b> ve <b>Ayarlar</b> bulunur; okunmamış olanların sayısı rozetle gösterilir. Birden çok çocuğunuz varsa üstteki adlara dokunarak çocuklar arasında geçersiniz.</p>
${pair(fig("veli-panel-ust", "Panel: üst çubuk, çocuk seçici ve karakter", "phone"), fig("veli-bu-hafta", "Bu hafta ve Evde bugün", "phone"))}
<ul>
<li><b>Karakter:</b> çocuğunuzun karakteri, seviyesi ve bir sonraki seviyeye ilerleme çubuğu.</li>
<li><b>Bu hafta:</b> son 7 günün davranış dengesi ve gün gün olumlu/olumsuz puanlar.</li>
<li><b>Evde bugün:</b> evde yapılan davranışları işaretlediğiniz bölüm (aşağıda).</li>
<li><b>Son olaylar:</b> okulda ve evde verilen son 10 puan.</li>
<li><b>Akademik yol haritası:</b> her dersteki ilerleme özeti.</li>
</ul>
${pair(fig("veli-son-olaylar", "Son olaylar", "phone"), fig("veli-yol-haritasi-ozet", "Akademik yol haritası özeti", "phone"))}
${tip("Öğretmenin notları ve puanı kimin verdiği velilere gösterilmez. Veli yalnızca kendi çocuğunu görür; sınıftaki diğer çocukların adları bile gösterilmez.")}
${fig("veli-panel-masaustu", "Aynı panel bilgisayarda")}

<h2>3.4 Evde bugün: ev davranışı işaretleme</h2>
${steps(
  "Panelde <b>Evde bugün</b> bölümüne gidin.",
  "Çocuğunuzun bugün yaptığı davranışa dokunun (ör. <i>Kitap okudu</i>). Hemen kaydedilir.",
  "Yanlışlıkla dokunduysanız alttaki <b>Geri al</b> ile 10 saniye içinde geri alın.",
)}
${pair(fig("veli-ev-davranisi", "Ev davranışları ve günlük tavan çubuğu", "phone"), fig("veli-ev-geri-al", "Kaydedildi; 10 saniye içinde geri alınabilir", "phone"))}
<p><b>Bugün evden kazanılan XP</b> çubuğu günlük tavana ne kadar kaldığını gösterir. Tavan dolunca işaretlemeye devam edebilirsiniz; davranış kaydedilir ama karaktere XP eklenmez. Tavan her gün sıfırlanır.</p>

<h2>3.5 Yol haritası</h2>
<p>Paneldeki <b>Akademik yol haritası</b> bağlantısından çocuğunuzun her dersteki ilerlemesini görürsünüz: tamamlanan duraklar ✓, <b>Şu an burada</b> etiketi ve gelecek duraklar.</p>
${fig("veli-yol-haritasi", "Yol haritası: tamamlanan, devam eden ve gelecek duraklar", "phone")}

<h2>3.6 Mesajlar</h2>
${steps(
  "Üst çubukta <b>Mesajlar</b>'a dokunun. Okunmamış mesajlar belirgin görünür; birden çok çocuğunuz varsa çocuğa göre süzebilirsiniz.",
  "Mesaja dokunarak açın. Açtığınızda öğretmene <b>okundu</b> bilgisi gider.",
  "İsterseniz <b>Gördüm 👍</b> ya da <b>Teşekkürler 🙏</b> ile tepki verin. Aynı düğmeye yeniden dokunarak tepkiyi geri alabilirsiniz.",
)}
${pair(fig("veli-mesajlar", "Mesaj listesi", "phone"), fig("veli-mesaj-detay", "Mesaj ve hızlı tepki düğmeleri", "phone"))}

<h2>3.7 Bildirimler</h2>
<p><b>Bildirimler</b> sayfasında yeni mesajlar, olumlu ve olumsuz davranışlar ve seviye atlamaları listelenir. Bir bildirime dokunduğunuzda ilgili ekran açılır. <b>Tümünü okundu yap</b> ile hepsini okundu işaretleyebilirsiniz.</p>
${fig("veli-bildirimler", "Bildirim merkezi", "phone")}
${tip("Davranış bildirimleri, öğretmenin 10 saniyelik geri alma süresi bittikten sonra gelir. Böylece yanlışlıkla verilip geri alınan puanlar size bildirilmez. Kendi işaretlediğiniz ev davranışları bildirim oluşturmaz.")}

<h2 id="ayarlar">3.8 Ayarlar ve anlık bildirimler</h2>
${fig("veli-ayarlar", "Ayarlar: bildirim tercihleri ve bu cihazda anlık bildirimler", "phone")}
<ul>
<li><b>Bildirim tercihleri:</b> hangi türlerde bildirim almak istediğinizi seçin (mesaj, olumlu davranış, olumsuz davranış, seviye atlama).</li>
<li><b>Anlık bildirimler (bu cihaz):</b> <b>Bu cihazda bildirimleri aç</b>'a dokunun ve tarayıcının izin sorusuna <b>İzin ver</b> deyin. Uygulama kapalıyken de bildirim gelir. Her cihazda ayrıca açılır.</li>
</ul>
<h3 id="yukleme">iPhone ve iPad: Ana ekrana ekle</h3>
<p>iPhone/iPad'de anlık bildirim yalnızca uygulama <b>ana ekrana eklenmişse</b> çalışır (iOS 16.4 ve sonrası).</p>
${fig("veli-ios-rehberi", "Ayarlar'daki iPhone ve iPad rehberi", "phone")}
${steps(
  "Uygulamayı <b>Safari</b>'de açın.",
  "Alttaki <b>Paylaş</b> düğmesine (yukarı ok bulunan kare) dokunun.",
  "<b>Ana Ekrana Ekle</b>'yi seçip <b>Ekle</b>'ye dokunun.",
  "Ana ekrandaki <b>Gelişim</b> simgesinden açın, giriş yapın ve Ayarlar'dan bildirimleri açın.",
)}
<p><b>Android</b>'de Chrome menüsünden (⋮) <b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>'yi seçin. <b>Bilgisayarda</b> Chrome/Edge adres çubuğundaki yükleme simgesini kullanabilirsiniz.</p>

<h2>3.9 Verileriniz (KVKK)</h2>
<p>Ayarlar'daki <b>Verileriniz</b> bölümünden kişisel verilerinizle ilgili haklarınızı kullanırsınız.</p>
${fig("veli-verileriniz", "Verileri indirme ve çocuğun verilerinin silinmesini talep etme", "phone")}
<ul>
<li><b>Tüm verilerimi indir (JSON):</b> hesabınızın, onaylarınızın, bildirimlerinizin ve çocuklarınıza ait kayıtların tamamı.</li>
<li><b>Davranış geçmişi (Excel/CSV):</b> çocuklarınızın puan geçmişi, Excel'de açılabilen tablo.</li>
<li><b>Çocuğunuzun verilerinin silinmesi:</b> <b>… için silme talebi</b>'ne dokunun, isterseniz not yazıp <b>Talebi gönder</b>'e dokunun. Talep okul yönetimine iletilir; incelendikten sonra çocuğunuza ait tüm kayıtlar kalıcı olarak silinir. Talep beklerken bölümde "Silme talebi … tarihinde iletildi" yazar.</li>
</ul>
${note("Silme işlemi geri alınamaz. Silmeden önce verilerinizi indirmenizi öneririz. Aynı çocuk için diğer velinin açtığı bekleyen bir talep varsa yeni talep açılmaz.")}

<h2>3.10 Hesabınızı silme</h2>
${steps(
  "Ayarlar → Verileriniz → <b>Hesabımı sil</b>'e dokunun.",
  "İsterseniz çocuklarınızın okul kayıtlarının da silinmesini talep etmek için kutuları işaretleyin. İşaretlemezseniz kayıtlar okulda kalır; diğer veli ve öğretmen görmeye devam eder.",
  "Onaylamak için <b>şifrenizi</b> girip <b>Hesabımı kalıcı olarak sil</b>'e dokunun.",
)}
${fig("veli-hesabi-sil", "Hesap silme ekranı", "phone")}
<p>Hesabınız, çocuklarınızla bağlantınız, bildirimleriniz ve cihaz abonelikleriniz hemen silinir; giriş sayfasına "Hesabınız silindi" mesajıyla dönülür. Verdiğiniz KVKK onaylarının kaydı, yasal ispat için adınız olmadan saklanır.</p>
`);

// ─── 4. Yönetici ──────────────────────────────────────────────────────────
chapter("yonetici", "Okul Yöneticisi Kılavuzu", "Karakterler, silme talepleri, denetim kaydı ve hesaplar.", `
<h2>4.1 Yönetim paneli</h2>
${fig("yonetici-panel", "Yönetim paneli; bekleyen silme talebi sayısı kırmızı rozetle gösterilir")}

<h2>4.2 Karakterler ve seviye eşikleri</h2>
${fig("yonetici-karakterler", "Seviye eşikleri ve karakter türleri")}
<ul>
<li><b>Seviye eşikleri:</b> her seviye için gereken XP'yi girin (1. seviye her zaman 0'dır) ve <b>Eşikleri kaydet</b>'e dokunun. Eşikler tüm karakter türleri için ortaktır. Eşikleri düşürmek yeni eşiğe ulaşan öğrencileri hemen yükseltir; yükseltmek kimsenin seviyesini düşürmez.</li>
<li><b>Karakter türleri:</b> tür adını ve her seviyedeki aşamanın adını değiştirebilirsiniz. <b>Öğretmenler seçebilir (aktif)</b> işaretini kaldırılan türler yeni seçimlerde görünmez; o türü kullanan öğrencilerin karakteri değişmez.</li>
</ul>

<h2>4.3 Silme talepleri (KVKK)</h2>
<p>Velilerin çocukları için açtığı veri silme talepleri <b>Silme talepleri</b> ekranında listelenir. <b>Bekleyen</b>, <b>Silinen</b> ve <b>Reddedilen</b> sekmeleriyle geçmiş talepleri de görürsünüz.</p>
${fig("yonetici-silme-talepleri", "Bekleyen bir silme talebi: öğrenci, sınıf, talep eden veli ve not")}
${steps(
  "Talebi inceleyin. Gerekirse <b>Verileri indir (JSON)</b> ya da <b>Davranış geçmişi (CSV)</b> ile öğrencinin tüm kaydını indirip veliye iletin.",
  "<b>Kalıcı olarak sil</b>'e dokunun, onaylamak için <b>öğrencinin adını</b> yazın ve <b>Evet, kalıcı olarak sil</b>'e dokunun.",
  "Silmemek için yasal bir gerekçe varsa <b>Reddet</b>'e dokunup gerekçeyi yazın. Gerekçe kayda geçer; veliyi ayrıca bilgilendirin.",
)}
${fig("yonetici-silme-onay", "Kalıcı silme onayı: öğrencinin adı yazılmadan silme yapılmaz")}
${note("Silinen öğrencinin puanları, ilerlemesi, davet kodları, veli bağlantıları ve kendisine yazılan mesajlar kalıcı olarak silinir; geri getirilemez. Denetim kayıtları kalır ama öğrencinin adı kayıtlardan çıkarılır. Silinen veri, 14 günlük yedek saklama süresi dolana kadar şifreli yedeklerde durur.")}

<h2>4.4 Denetim kaydı</h2>
<p><b>Denetim kaydı</b> ekranı; puan verme ve silme, ilerleme değişikliği, veli bağlama, mesaj, silme talepleri, hesap silme ve veri dışa aktarma gibi kritik işlemleri kimin, ne zaman ve hangi IP adresinden yaptığını gösterir. Kayıtlar değiştirilemez.</p>
${fig("yonetici-denetim", "Denetim kaydı ve filtreler")}
<ul>
<li><b>İşlem</b>, <b>Kişi (ad veya e-posta)</b>, <b>Başlangıç</b> ve <b>Bitiş</b> alanlarıyla süzüp <b>Filtrele</b>'ye dokunun; <b>Temizle</b> filtreleri kaldırır.</li>
<li>Her kayıttaki <b>Ayrıntı</b> ile işlemin teknik ayrıntılarını açın.</li>
<li>Sayfanın altındaki <b>Daha eski →</b> / <b>← Daha yeni</b> ile sayfalar arasında gezin.</li>
</ul>
${fig("yonetici-denetim-filtre", "Yalnızca \"Puan verildi\" işlemleri, bir kaydın ayrıntısı açık")}

<h2>4.5 Öğretmen hesapları ve şifre sıfırlama</h2>
<p>Öğretmen ve yönetici hesapları ile şifre sıfırlama, güvenlik nedeniyle uygulama içinden değil, okulun bilişim sorumlusu tarafından sunucuda bir komutla yapılır. Komut yeni kullanıcıya geçici bir şifre üretir. Ayrıntılar kurulum belgesindedir (<i>docs/DEPLOY.md</i>, "Okul ve hesaplar").</p>
`);

// ─── 5. Sık sorulanlar ─────────────────────────────────────────────────────
chapter("sss", "Sık Sorulan Sorular ve Sorun Giderme", "Karşılaşabileceğiniz durumlar ve çözümleri.", `
<table class="faq">
<tr><th>Soru / belirti</th><th>Yanıt</th></tr>
<tr><td>Yanlış öğrenciye puan verdim.</td><td>10 saniye içinde alttaki <b>Geri al</b>'a dokunun. Süre geçtiyse öğrenci detayındaki zaman çizelgesinden <b>Sil</b>.</td></tr>
<tr><td>Puanı sildim ama karakter seviyesi düşmedi.</td><td>Bu bilinçli bir kuraldır: çocukların emeği boşa gitmesin diye seviye hiçbir zaman düşmez.</td></tr>
<tr><td>Evden işaretleme yaptım ama XP artmadı.</td><td>Günlük ev XP tavanı dolmuştur. Davranış kaydedilir; tavan ertesi gün sıfırlanır.</td></tr>
<tr><td>Davet kodu "geçersiz" ya da "süresi dolmuş" diyor.</td><td>Kodu doğru yazdığınızdan emin olun (8 karakter, ör. ABCD-EFGH). Tek kullanımlık kod başka biri tarafından kullanılmış, iptal edilmiş ya da süresi dolmuş olabilir; öğretmenden yeni kod isteyin.</td></tr>
<tr><td>Öğretmen olarak davet kodunu tekrar göremiyorum.</td><td>Kodlar güvenlik nedeniyle bir kez gösterilir. Eski kodu <b>İptal et</b>, yenisini üretin.</td></tr>
<tr><td>Bildirim gelmiyor.</td><td>Ayarlar'da <b>Bu cihazda bildirimleri aç</b>'ın açık olduğunu, tarayıcı/telefon ayarlarında bildirim izninin verildiğini ve ilgili bildirim türünün açık olduğunu kontrol edin. iPhone'da uygulama ana ekrana eklenmiş olmalıdır.</td></tr>
<tr><td>"İnternet bağlantısı yok" ekranı görünüyor.</td><td>Cihazınız çevrimdışıdır. Bağlantı gelince <b>Tekrar dene</b>'ye dokunun. Puanlar ve mesajlar yalnızca bağlantı varken kaydedilir; çocuk verisi güvenlik için cihazda saklanmaz.</td></tr>
<tr><td>"Sayfa bulunamadı" görüyorum.</td><td>Sayfa yoktur ya da görme yetkiniz yoktur (ör. başka bir sınıf veya başka bir çocuk). <b>Ana sayfaya dön</b>'e dokunun.</td></tr>
<tr><td>"Çok fazla deneme yapıldı" uyarısı.</td><td>Güvenlik için kısa süreli bir sınırdır. Bir süre bekleyip tekrar deneyin.</td></tr>
<tr><td>Şifremi unuttum / değiştirmek istiyorum.</td><td>Okulun bilişim sorumlusuna başvurun; yeni geçici şifre verilir.</td></tr>
</table>
`);

// ─── 6. Gizlilik ──────────────────────────────────────────────────────────
chapter("gizlilik", "Gizlilik ve Güvenlik", "Verileriniz nasıl korunuyor?", `
<ul>
<li><b>Yalnızca gerekli veri:</b> öğrencilerin soyadının yalnızca baş harfi saklanır; davet kodları şifrelenmiş olarak tutulur.</li>
<li><b>Veli yalnızca kendi çocuğunu görür.</b> Öğretmen yalnızca kendi sınıfını, yönetici yalnızca kendi okulunu yönetir. Bu kurallar sunucuda her işlemde denetlenir.</li>
<li><b>Çocuk dostu ekranlar:</b> tahta modunda ve çocukların gördüğü ekranlarda olumsuz puan, denge ya da sıralama gösterilmez.</li>
<li><b>KVKK onayları:</b> aydınlatma metni ve açık rıza, sürümü ve tarihiyle kaydedilir.</li>
<li><b>Haklarınız:</b> verilerinizi indirebilir, çocuğunuzun verilerinin silinmesini isteyebilir ve hesabınızı silebilirsiniz (bkz. Veli Kılavuzu 3.9–3.10).</li>
<li><b>Denetim kaydı:</b> kritik işlemler kim tarafından ve ne zaman yapıldığıyla kaydedilir.</li>
<li><b>Güvenli bağlantı ve yedek:</b> tüm bağlantılar şifrelidir (HTTPS). Veritabanının her gece şifreli yedeği alınır ve 14 gün saklanır. Veriler Türkiye'deki bir sunucuda barındırılır.</li>
<li><b>Özgün görseller:</b> karakter görselleri okul için özgün olarak tasarlanmıştır; telifli karakter kullanılmaz.</li>
</ul>
`);

// ─── HTML ─────────────────────────────────────────────────────────────────
const today = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date());
const toc = chapters
  .map((c, i) => `<li><a href="#${c.id}"><span class="n">${i + 1}</span>${c.title}</a><div class="lead">${c.lead}</div>${
    [...c.body.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => `<span class="sub">${m[1]}</span>`).join("")
  }</li>`)
  .join("");

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Kullanım Kılavuzu</title>
<style>
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { --accent: #059669; --ink: #1f2937; --muted: #6b7280; --line: #e5e7eb; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Noto Sans", Arial, sans-serif; color: var(--ink); font-size: 10.5pt; line-height: 1.5; margin: 0; }
a { color: var(--accent); text-decoration: none; }
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
.toc h1 { font-size: 20pt; color: var(--accent); margin: 0 0 6mm; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { border-bottom: 1px solid var(--line); padding: 3mm 0; }
.toc li > a { font-size: 13pt; font-weight: 600; color: var(--ink); }
.toc .n { display: inline-block; width: 8mm; color: var(--accent); }
.toc .lead { color: var(--muted); margin: 0 0 1mm 8mm; font-size: 9.5pt; }
.toc .sub { display: inline-block; margin: 0 4mm 0 8mm; font-size: 9pt; color: var(--ink); }
section.chapter { page-break-before: always; }
.chapter-head { border-left: 6px solid var(--accent); padding: 2mm 0 2mm 5mm; margin-bottom: 6mm; }
.chapter-head .num { color: var(--accent); font-weight: 700; font-size: 11pt; letter-spacing: .05em; }
.chapter-head h1 { margin: 1mm 0; font-size: 22pt; }
.chapter-head p { margin: 0; color: var(--muted); }
h2 { font-size: 14pt; color: var(--accent); margin: 8mm 0 2mm; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 5mm 0 1.5mm; page-break-after: avoid; }
p { margin: 1.5mm 0 2.5mm; }
ul, ol { margin: 1mm 0 3mm; padding-left: 6mm; }
li { margin: 1mm 0; }
ol.steps { counter-reset: s; list-style: none; padding-left: 0; }
ol.steps li { counter-increment: s; position: relative; padding-left: 9mm; margin: 1.8mm 0; }
ol.steps li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 6mm; height: 6mm; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 700; font-size: 9pt; text-align: center; line-height: 6mm; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 4mm; font-size: 9.5pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid var(--line); padding: 2mm 3mm; text-align: left; vertical-align: top; }
th { background: #ecfdf5; color: #065f46; }
.tip, .note { border-radius: 6px; padding: 3mm 4mm; margin: 3mm 0 4mm; font-size: 9.8pt; page-break-inside: avoid; }
.tip { background: #ecfdf5; border-left: 4px solid var(--accent); }
.note { background: #fff7ed; border-left: 4px solid #ea580c; }
.tip strong, .note strong { display: block; font-size: 9pt; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5mm; }
.tip strong { color: #047857; } .note strong { color: #c2410c; }
figure { margin: 3mm auto 5mm; text-align: center; page-break-inside: avoid; }
figure img { border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.08); display: block; margin: 0 auto; }
figure.desk img { max-width: 100%; max-height: 112mm; object-fit: contain; }
figure.part img { max-width: 100%; max-height: 100mm; }
figure.phone img { width: 54mm; max-height: 116mm; object-fit: cover; object-position: top; }
figcaption { color: var(--muted); font-size: 8.8pt; margin-top: 1.5mm; font-style: italic; }
.pair { display: flex; gap: 8mm; justify-content: center; page-break-inside: avoid; }
.pair figure { margin: 3mm 0 5mm; }
</style></head><body>
<div class="cover">
  <div class="band">
    <div class="star">★</div>
    <h1>Öğrenci Davranış ve<br>Gelişim Sistemi</h1>
    <div class="sub">Kullanım Kılavuzu: öğretmen, veli ve okul yöneticisi için</div>
  </div>
  <div class="roles">
    <div><b>Öğretmen</b>Sınıf kurulumu, puanlama, duraklar, mesajlar, tahta modu</div>
    <div><b>Veli</b>Kayıt, çocuğun paneli, ev davranışları, bildirimler, verileriniz</div>
    <div><b>Yönetici</b>Karakterler, silme talepleri, denetim kaydı</div>
  </div>
  <div class="meta">Sürüm 0.35 · ${today}<br>Ekran görüntülerindeki kişi ve okul adları örnek verilerdir.</div>
</div>
<div class="toc"><h1>İçindekiler</h1><ol>${toc}</ol></div>
${chapters
  .map((c, i) => `<section class="chapter" id="${c.id}"><div class="chapter-head"><div class="num">BÖLÜM ${i + 1}</div><h1>${c.title}</h1><p>${c.lead}</p></div>${c.body}</section>`)
  .join("\n")}
</body></html>`;

if (missing.length) {
  console.error(`Eksik ekran görüntüleri: ${missing.join(", ")}`);
  process.exit(1);
}

const htmlPath = path.join(DIR, "kilavuz.html");
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
  footerTemplate: `<div style="width:100%;font-size:8pt;color:#6b7280;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif"><span>Öğrenci Davranış ve Gelişim Sistemi · Kullanım Kılavuzu</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" },
});
await browser.close();
console.log(`PDF yazıldı: ${path.relative(process.cwd(), OUT_PDF)}`);
