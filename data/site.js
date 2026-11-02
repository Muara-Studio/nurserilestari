/* Nurseri Lestari — business facts. The single place for contact details, links and nav. Loaded before every script. */
window.TL = window.TL || {};
TL.site = {
  name: "Nurseri Lestari",
  brand: "Nurseri Lestari",
  legalName: "Toko & Nursery Lestari",
  tagline: "Your Gardening Needs Solution",
  shortDesc: "Toko perkebunan di Cilandak, Jakarta Selatan. Tanaman hias, benih, media tanam racikan sendiri, pupuk, pot, dan alat kebun. Ada juga di Tokopedia dan Shopee.",
  email: "nurserilestari@gmail.com",
  whatsapp: [
    { label: "Admin Toko Cipete", number: "6287889115475", display: "0878-8911-5475", shop: "cipete" },   /* the number on the Cipete Google Maps listing (facts.md) */
    { label: "Admin Toko BSD", number: "6287777600374", display: "0877-7760-0374", shop: "bsd" }          /* assumed the other line serves BSD: confirm with the client */
  ],
  waGreeting: "Halo Nurseri Lestari, saya mau tanya ",
  locations: [
    { id: "cipete", name: "Nurseri Lestari Cipete", shortName: "Cipete, Jakarta Selatan",
      address: "Jl. Gaharu I No. 7, RT 3/RW 11, Cilandak Barat, Kec. Cilandak, Jakarta Selatan 12430",
      hours: "Setiap hari, 08.00–17.00 WIB", hoursNote: "",
      coords: { lat: -6.2795087, lng: 106.8042021 },
      maps: "https://maps.app.goo.gl/hXxVJjxYTK2USExG7", mapsEmbed: "https://www.google.com/maps?q=-6.2795087,106.8042021&z=16&output=embed",
      rating: 4.8, ratingSource: "Google Maps", freeDelivery: "Gratis ongkir sekitar Jl. Gaharu: MPR, BDN, dan Cipete",
      tokopedia: "https://www.tokopedia.com/nurserilestari", shopee: "https://shopee.co.id/nurserilestari",
      tokopediaStats: { rating: "5.0", reviews: "23,6 rb", sold: "205 rb" } },
    { id: "bsd", name: "Nurseri Lestari BSD", shortName: "Tangerang BSD",
      address: "Jl. Statistika Blok H–I EE No. 6, RT 1/RW 1, Pagedangan, Kab. Tangerang, Banten 15339", hours: "Setiap hari, 08.00–17.00 WIB", hoursNote: "",
      coords: { lat: -6.2988438, lng: 106.6316441 }, plusCode: "PJ2J+FM Pagedangan",
      maps: "https://maps.google.com/?cid=3229749008144282684", mapsEmbed: "https://www.google.com/maps?q=-6.2988438,106.6316441&z=16&output=embed", rating: 5.0, ratingSource: "Google Maps", freeDelivery: "Gratis ongkir sekitar BSD",
      tokopedia: "https://www.tokopedia.com/nurserilestaritangerang", shopee: "https://shopee.co.id/nurserilestaritangerang",
      tokopediaStats: { rating: "4.9", reviews: "452", sold: "5.189" } }
  ],
  social: {
    instagram: { handle: "@nurseri.lestari", url: "https://www.instagram.com/nurseri.lestari/" },
    tiktok: { handle: "@nurserilestari", url: "https://www.tiktok.com/@nurserilestari" },
    linktree: { url: "https://linktr.ee/nurserilestari" }
  },
  marketplaces: [
    { name: "Tokopedia Cipete", url: "https://www.tokopedia.com/nurserilestari", shop: "cipete", platform: "tokopedia" },
    { name: "Tokopedia BSD", url: "https://www.tokopedia.com/nurserilestaritangerang", shop: "bsd", platform: "tokopedia" },
    { name: "Shopee Cipete", url: "https://shopee.co.id/nurserilestari", shop: "cipete", platform: "shopee" },
    { name: "Shopee BSD", url: "https://shopee.co.id/nurserilestaritangerang", shop: "bsd", platform: "shopee" }
  ],
  /* nav copy (1 Nov 2026): verbs and warmth instead of bare nouns; alternatives in docs/keputusan.md */
  nav: [
    { label: "Belanja", href: "produk.html" },
    { label: "Tips rawat", href: "tips.html" },
    { label: "Cerita toko", href: "tentang.html" },
    { label: "Main game", href: "main.html" },
    { label: "Hubungi", href: "kontak.html" }
  ],
  /* Instagram post codes with a local thumbnail in assets/img/ig/<code>.jpg, newest first (grabbed 20 Oct 2026). */
  instagramPosts: ["DeicXKdkiT2", "DedKz0dEss4", "DeYLFbtEt-z", "DeVYp0EEpNz", "DeLUX1jkoSS", "DeDf9mVEnHP", "Dd-9eLaErSk", "Dd7tez1Eh-2", "Dd2oUk6kq2p", "DdsPkjHEuUX", "DdplghTksz5", "Ddiw5mcktKQ"]
};
