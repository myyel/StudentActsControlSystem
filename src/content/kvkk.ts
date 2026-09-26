/**
 * KVKK texts shown at parent registration. DRAFT: must be replaced by the school's
 * legally reviewed texts before the pilot. Bump the version whenever the text changes;
 * consent records store the version the parent accepted.
 */
export const KVKK_DOC_VERSION = "2026-09-v1";

export type KvkkSection = { heading: string; paragraphs: string[] };

export const PRIVACY_NOTICE: { title: string; sections: KvkkSection[] } = {
  title: "Kişisel Verilerin Korunması Hakkında Aydınlatma Metni",
  sections: [
    {
      heading: "Veri sorumlusu",
      paragraphs: [
        "Bu uygulamada işlenen kişisel veriler bakımından veri sorumlusu, çocuğunuzun kayıtlı olduğu okuldur. [Okul unvanı ve iletişim bilgileri eklenecek.]",
      ],
    },
    {
      heading: "İşlenen veriler",
      paragraphs: [
        "Veli olarak: adınız, e-posta adresiniz, çocuğunuzla yakınlık bilginiz, oturum ve cihaz bilgileriniz.",
        "Çocuğunuz için: adı, soyadının baş harfi, sınıfı, öğretmeninin girdiği davranış ve akademik ilerleme kayıtları, sizin girdiğiniz ev davranışları.",
      ],
    },
    {
      heading: "İşleme amaçları",
      paragraphs: [
        "Çocuğunuzun okuldaki davranış ve gelişiminin sizinle paylaşılması, öğretmen ile veli arasındaki iletişimin sağlanması ve uygulamanın güvenli şekilde çalıştırılması.",
      ],
    },
    {
      heading: "Aktarım",
      paragraphs: [
        "Veriler Türkiye'de bulunan sunucularda saklanır; yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz.",
      ],
    },
    {
      heading: "Haklarınız",
      paragraphs: [
        "KVKK'nın 11. maddesi kapsamında verilerinize erişme, düzeltilmesini, silinmesini ve dışa aktarılmasını isteme haklarına sahipsiniz. [Başvuru yöntemi eklenecek.]",
      ],
    },
  ],
};

export const EXPLICIT_CONSENT: { title: string; sections: KvkkSection[] } = {
  title: "Açık Rıza Metni",
  sections: [
    {
      heading: "Rıza beyanı",
      paragraphs: [
        "Aydınlatma metnini okudum. Velisi olduğum çocuğumun davranış ve akademik gelişim verilerinin, aydınlatma metninde belirtilen amaçlarla bu uygulamada işlenmesine ve tarafımla paylaşılmasına açık rıza veriyorum.",
        "Bu rızamı dilediğim zaman geri alabileceğimi biliyorum.",
      ],
    },
  ],
};
