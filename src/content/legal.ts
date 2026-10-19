import type { Locale } from "@/i18n/routing";

// Texts of the Privacy policy, Terms of use and FAQ. Keep them true to what the
// site actually does: when a feature or data flow changes, update these too
// (both languages) and the "updated" date.

export type LegalSection = { heading: string; paragraphs: string[]; list?: string[] };
export type LegalDoc = { title: string; intro: string; updated: string; sections: LegalSection[] };
export type Faq = { title: string; intro: string; items: { q: string; a: string }[] };

/** The data controller, published on the legal pages at the owner's request. */
export const LEGAL_OWNER: { name: Record<Locale, string>; email: string } = {
  name: { bg: "Живко Димитров", en: "Zhivko Dimitrov" },
  email: "jivko.dimitrov96@gmail.com",
};

const UPDATED = { en: "19 October 2026", bg: "19 октомври 2026 г." } as const;

export const privacy: Record<Locale, LegalDoc> = {
  bg: {
    title: "Политика за поверителност",
    intro:
      "Тази политика обяснява какви лични данни събира Eau de Fragrances, защо, къде се съхраняват и какви права имаш. Пишем я на разбираем език и описваме само това, което сайтът наистина прави.",
    updated: UPDATED.bg,
    sections: [
      {
        heading: "1. Кой отговаря за данните",
        paragraphs: [
          "Администратор на личните данни е Живко Димитров, собственик на сайта Eau de Fragrances (eaudezhivko.vercel.app, в бъдеще eaudefragrances.com).",
          "За всякакви въпроси за личните ти данни пиши на jivko.dimitrov96@gmail.com или чрез бутона „Feedback“ на всяка страница.",
        ],
      },
      {
        heading: "2. Какви данни събираме",
        paragraphs: ["Събираме само данните, нужни за работата на сайта:"],
        list: [
          "Профил: имейл адрес и парола. Паролата се пази само в криптиран вид (hash) от доставчика ни за вход Supabase и не я виждаме.",
          "Вход с Google: ако влизаш с Google, получаваме имейла ти и основните данни от профила в Google (име и снимка), които Google ни предоставя.",
          "Колекция и списък с желани: парфюмите, които добавяш, личната ти оценка за тях и датите на добавяне.",
          "Общ каталог: парфюмите, които добавяш, стават част от общия каталог и се виждат от други потребители. Пазим кой ги е добавил, но не го показваме публично.",
          "Обратна връзка: съобщението, категорията, страницата, от която е изпратено, езикът и данни за браузъра (user agent). Ако пишеш без профил, по желание и имейл за отговор.",
          "Технически данни: доставчиците на хостинг и база данни (Vercel и Supabase) водят технически логове, например IP адрес и час на заявката, за сигурност и работа на услугата.",
        ],
      },
      {
        heading: "3. За какво ги използваме и на какво основание",
        paragraphs: [],
        list: [
          "За да ти предоставим сайта: профил, вход, колекция и списък с желани. Основание: договор, тоест използването на сайта (чл. 6, ал. 1, буква „б“ от GDPR).",
          "За сигурност, предотвратяване на злоупотреби и поправяне на грешки, включително достъп на администратора за поддръжка (виж т. 5). Основание: легитимен интерес (чл. 6, ал. 1, буква „е“ от GDPR).",
          "За да отговорим на обратна връзка и да подобряваме сайта. Основание: легитимен интерес.",
          "Не използваме данните ти за реклама, не правим профилиране и не продаваме данни на никого.",
        ],
      },
      {
        heading: "4. Кой обработва данните вместо нас",
        paragraphs: ["Използваме следните доставчици (обработващи лични данни):"],
        list: [
          "Supabase: база данни и вход. Данните се съхраняват в Европейския съюз (Франкфурт, Германия). https://supabase.com/privacy",
          "Vercel: хостинг на сайта. Vercel е американска компания и може да обработва технически данни извън ЕС при условията на стандартните договорни клаузи на ЕС. https://vercel.com/legal/privacy-policy",
          "Google: само ако избереш вход с Google. https://policies.google.com/privacy",
        ],
      },
      {
        heading: "5. Достъп на администратора",
        paragraphs: [
          "Администраторът на сайта може да вижда регистрираните профили (имейл, дата на регистрация и последен вход), техните колекции и списъци с желани, както и изпратената обратна връзка.",
          "За да провери проблем, администраторът може временно да влезе в профила ти в режим на поддръжка, както и да изтрие профил при злоупотреба. Всяко такова действие се записва в дневник.",
        ],
      },
      {
        heading: "6. Parfumo и Pazaruvaj",
        paragraphs: [
          "Когато добавиш линк към страница на парфюм в Parfumo, сървърът ни прочита от тази публична страница оценката, нотките и адреса на снимката на флакона и ги обновява най-много веднъж седмично. При това четене не изпращаме твои лични данни.",
          "Снимките на флаконите се зареждат директно от сървърите на Parfumo (media.parfumo.com). Затова, когато разглеждаш карта със снимка или въртележката с парфюми на началната страница, браузърът ти се свързва с Parfumo и те получават IP адреса ти и данни за браузъра, но не и коя страница от нашия сайт гледаш. Обработката на тези данни от Parfumo е по тяхната политика за поверителност: https://www.parfumo.com/Privacy_Policy",
          "Бутоните „Parfumo“ и „Pazaruvaj“ отварят съответния сайт в нов раздел, където важат неговите правила. Докато не натиснеш бутона, на Pazaruvaj не се изпраща нищо.",
        ],
      },
      {
        heading: "7. Бисквитки",
        paragraphs: [
          "Използваме само бисквитки, без които сайтът не може да работи. Затова не искаме отделно съгласие:",
        ],
        list: [
          "Бисквитки за вход (Supabase): поддържат сесията ти, докато използваш профила си.",
          "Език (NEXT_LOCALE): запомня избрания от теб език.",
          "Тема (edf_theme): запомня светлата или тъмната тема, до 1 година.",
          "Режим на поддръжка (edf_support_session): само за администратора, до 4 часа.",
        ],
      },
      {
        heading: "8. Колко дълго пазим данните",
        paragraphs: [
          "Пазим данните на профила ти, докато той съществува. Когато изтриеш профила си от страницата „Профил“, изтриваме профила, колекцията и списъка ти с желани. Парфюмите, добавени от теб в общия каталог, остават в него, но вече не са свързани с теб.",
          "Пазим обратната връзка, докато е нужна за подобряване на сайта. Можеш да поискаш да я изтрием по-рано. Техническите логове се пазят според сроковете на Vercel и Supabase.",
        ],
      },
      {
        heading: "9. Твоите права",
        paragraphs: ["Според GDPR имаш право:"],
        list: [
          "на достъп до данните си и на копие от тях;",
          "да поправиш неточни данни;",
          "на изтриване: можеш сам да изтриеш профила си от страницата „Профил“;",
          "на ограничаване на обработването и на възражение срещу обработване на основание легитимен интерес;",
          "на преносимост на данните;",
          "на жалба до Комисията за защита на личните данни (КЗЛД), https://www.cpdp.bg",
        ],
      },
      {
        heading: "10. Деца",
        paragraphs: ["Сайтът не е предназначен за лица под 16 години и съзнателно не събираме техни данни."],
      },
      {
        heading: "11. Промени",
        paragraphs: [
          "Ако променим начина, по който обработваме данни, ще обновим тази страница и датата в началото ѝ.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    intro:
      "This policy explains what personal data Eau de Fragrances collects, why, where it is kept and what your rights are. It's written in plain language and describes only what the site actually does.",
    updated: UPDATED.en,
    sections: [
      {
        heading: "1. Who is responsible for your data",
        paragraphs: [
          "The data controller is Zhivko Dimitrov, owner of the Eau de Fragrances website (eaudezhivko.vercel.app, later eaudefragrances.com).",
          "For any question about your personal data, write to jivko.dimitrov96@gmail.com or use the “Feedback” button on every page.",
        ],
      },
      {
        heading: "2. What we collect",
        paragraphs: ["We only collect what the site needs to work:"],
        list: [
          "Account: your email address and password. The password is stored only in encrypted (hashed) form by our sign-in provider Supabase; we can't see it.",
          "Google sign-in: if you sign in with Google, we receive your email and the basic profile details Google shares (name and picture).",
          "Collection and wishlist: the perfumes you add, your personal rating of them and when you added them.",
          "Shared catalogue: perfumes you add become part of the shared catalogue that other users see. We keep who added them but don't show it publicly.",
          "Feedback: your message, its category, the page it was sent from, the language and your browser details (user agent). If you aren't signed in, optionally an email for our reply.",
          "Technical data: our hosting and database providers (Vercel and Supabase) keep technical logs, such as IP address and request time, for security and to run the service.",
        ],
      },
      {
        heading: "3. Why we use it, and our legal basis",
        paragraphs: [],
        list: [
          "To provide the site: account, sign-in, collection and wishlist. Basis: contract, i.e. your use of the site (Art. 6(1)(b) GDPR).",
          "For security, preventing abuse and fixing bugs, including administrator support access (see section 5). Basis: legitimate interest (Art. 6(1)(f) GDPR).",
          "To answer feedback and improve the site. Basis: legitimate interest.",
          "We don't use your data for advertising, don't profile you and never sell data.",
        ],
      },
      {
        heading: "4. Who processes data for us",
        paragraphs: ["We use these providers (data processors):"],
        list: [
          "Supabase: database and sign-in. Data is stored in the European Union (Frankfurt, Germany). https://supabase.com/privacy",
          "Vercel: website hosting. Vercel is a US company and may process technical data outside the EU under the EU Standard Contractual Clauses. https://vercel.com/legal/privacy-policy",
          "Google: only if you choose to sign in with Google. https://policies.google.com/privacy",
        ],
      },
      {
        heading: "5. Administrator access",
        paragraphs: [
          "The site administrator can see registered accounts (email, sign-up and last sign-in dates), their collections and wishlists, and submitted feedback.",
          "To investigate a problem, the administrator can temporarily sign in to your account in support mode, and can delete an account in case of abuse. Every such action is recorded in a log.",
        ],
      },
      {
        heading: "6. Parfumo and Pazaruvaj",
        paragraphs: [
          "When you add a link to a perfume's page on Parfumo, our server reads that public page for the perfume's rating, notes and bottle image address, and refreshes them at most once a week. That reading doesn't send any of your personal data.",
          "Bottle images load directly from Parfumo's servers (media.parfumo.com). So when you view a card with a picture, or the perfume carousel on the home page, your browser connects to Parfumo, which receives your IP address and browser details, but not which page of our site you're on. Parfumo handles that data under its own privacy policy: https://www.parfumo.com/Privacy_Policy",
          "The “Parfumo” and “Pazaruvaj” buttons open those sites in a new tab, where their rules apply. Nothing is sent to Pazaruvaj until you press its button.",
        ],
      },
      {
        heading: "7. Cookies",
        paragraphs: ["We only use cookies the site can't work without, so we don't ask for separate consent:"],
        list: [
          "Sign-in cookies (Supabase): keep you signed in.",
          "Language (NEXT_LOCALE): remembers the language you chose.",
          "Theme (edf_theme): remembers light or dark mode, for up to 1 year.",
          "Support mode (edf_support_session): administrator only, for up to 4 hours.",
        ],
      },
      {
        heading: "8. How long we keep data",
        paragraphs: [
          "We keep your account data for as long as your account exists. When you delete your account on the Account page, we delete the account, your collection and your wishlist. Perfumes you added to the shared catalogue stay in it, no longer linked to you.",
          "We keep feedback for as long as it helps improve the site; you can ask us to delete it sooner. Technical logs are kept according to Vercel's and Supabase's retention periods.",
        ],
      },
      {
        heading: "9. Your rights",
        paragraphs: ["Under the GDPR you have the right to:"],
        list: [
          "access your data and get a copy of it;",
          "correct inaccurate data;",
          "erasure: you can delete your account yourself on the Account page;",
          "restrict processing, and object to processing based on legitimate interest;",
          "data portability;",
          "lodge a complaint with the Bulgarian Commission for Personal Data Protection (CPDP), https://www.cpdp.bg, or the authority in your EU country.",
        ],
      },
      {
        heading: "10. Children",
        paragraphs: ["The site isn't intended for people under 16, and we don't knowingly collect their data."],
      },
      {
        heading: "11. Changes",
        paragraphs: ["If we change how we process data, we'll update this page and the date at the top."],
      },
    ],
  },
};

export const terms: Record<Locale, LegalDoc> = {
  bg: {
    title: "Условия за ползване",
    intro:
      "Тези условия уреждат използването на Eau de Fragrances. Като създадеш профил или използваш сайта, приемаш тях и Политиката за поверителност.",
    updated: UPDATED.bg,
    sections: [
      {
        heading: "1. Какво предлагаме",
        paragraphs: [
          "Eau de Fragrances е безплатен сайт, в който можеш да подреждаш колекцията си от парфюми, да водиш списък с желани и да виждаш оценката, нотките и снимката на всеки парфюм според Parfumo, както и да сравняваш цените в българските магазини чрез Pazaruvaj.",
        ],
      },
      {
        heading: "2. Профил",
        paragraphs: [
          "Отговаряш за точността на данните си и за пазенето на паролата си. Ако смяташ, че някой друг използва профила ти, свържи се с нас веднага.",
          "Можеш да изтриеш профила си по всяко време от страницата „Профил“.",
        ],
      },
      {
        heading: "3. Правила за използване",
        paragraphs: ["Когато използваш сайта, се съгласяваш да не:"],
        list: [
          "добавяш съдържание, което е незаконно, обидно или нарушава чужди права;",
          "въвеждаш умишлено грешни данни в общия каталог;",
          "опитваш да получиш достъп до чужди профили или да нарушиш сигурността на сайта;",
          "събираш автоматично данни от сайта или го натоварваш умишлено;",
          "използваш сайта за реклама или спам.",
        ],
      },
      {
        heading: "4. Общ каталог",
        paragraphs: [
          "Парфюмите, които добавяш (марка, име, концентрация, година и линк към Parfumo), стават част от общ каталог, достъпен за всички потребители. Можеш да редактираш парфюмите, добавени от теб. Администраторът може да поправя или премахва записи от каталога.",
        ],
      },
      {
        heading: "5. Данни от трети страни",
        paragraphs: [
          "Оценката, нотките и снимките на флаконите идват от публичните страници на Parfumo и посочваме Parfumo като източник. Снимките принадлежат на съответните им притежатели на права и се показват само като илюстрация, с линк към източника. Не сме свързани с Parfumo и не гарантираме, че тези данни са точни или актуални. Те се обновяват най-много веднъж седмично.",
          "Бутонът „Pazaruvaj“ отваря търсене в Pazaruvaj.com. Цените и наличностите са на Pazaruvaj и на магазините там. Не ги проверяваме и не отговаряме за тях, а покупките стават при съответния магазин.",
          "Линковете към други сайтове се отварят в нов раздел. За съдържанието им отговарят техните собственици.",
        ],
      },
      {
        heading: "6. Поддръжка и администрация",
        paragraphs: [
          "За да отстрани проблем, администраторът може временно да влезе в профила ти в режим на поддръжка. Можем да спрем или изтрием профил, който нарушава тези условия.",
        ],
      },
      {
        heading: "7. Наличност и отговорност",
        paragraphs: [
          "Сайтът се предоставя „както е“. Стараем се да работи без прекъсване, но не можем да го гарантираме и можем да го променяме, временно да го спираме или да прекратим работата му.",
          "Доколкото позволява приложимото право, не носим отговорност за непреки вреди или за загуба на данни, причинени от използването на сайта. Нищо в тези условия не ограничава правата ти като потребител по българското законодателство и законодателството на ЕС.",
        ],
      },
      {
        heading: "8. Промени в условията",
        paragraphs: [
          "Можем да обновяваме тези условия. При съществени промени ще обновим датата в началото на страницата. Ако продължиш да използваш сайта след промяната, приемаш новите условия.",
        ],
      },
      {
        heading: "9. Приложимо право",
        paragraphs: [
          "За тези условия се прилага българското право. Споровете се решават от компетентния съд в България, без това да засяга защитата, която ти дава законодателството на държавата, в която живееш.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of use",
    intro:
      "These terms govern the use of Eau de Fragrances. By creating an account or using the site, you accept them and our Privacy policy.",
    updated: UPDATED.en,
    sections: [
      {
        heading: "1. What we offer",
        paragraphs: [
          "Eau de Fragrances is a free site where you can catalogue your perfume collection, keep a wishlist, see each perfume's rating, notes and picture according to Parfumo, and compare prices in Bulgarian shops through Pazaruvaj.",
        ],
      },
      {
        heading: "2. Your account",
        paragraphs: [
          "You're responsible for keeping your details accurate and your password safe. If you think someone else is using your account, contact us straight away.",
          "You can delete your account at any time on the Account page.",
        ],
      },
      {
        heading: "3. Acceptable use",
        paragraphs: ["When using the site, you agree not to:"],
        list: [
          "add content that is unlawful, offensive or infringes others' rights;",
          "knowingly enter wrong information in the shared catalogue;",
          "try to access other people's accounts or break the site's security;",
          "scrape the site or deliberately overload it;",
          "use the site for advertising or spam.",
        ],
      },
      {
        heading: "4. Shared catalogue",
        paragraphs: [
          "Perfumes you add (brand, name, concentration, year and Parfumo link) become part of a shared catalogue that all users can see. You can edit the perfumes you added. The administrator may correct or remove catalogue entries.",
        ],
      },
      {
        heading: "5. Third-party data",
        paragraphs: [
          "Perfume ratings, notes and bottle pictures come from Parfumo's public pages and are credited to Parfumo. The pictures belong to their rights holders and are shown only for illustration, with a link to the source. We aren't affiliated with Parfumo and don't guarantee that this data is accurate or current; it's refreshed at most once a week.",
          "The “Pazaruvaj” button opens a search on Pazaruvaj.com. Prices and availability are Pazaruvaj's and its shops'; we don't check them and aren't responsible for them, and purchases are made with the shop.",
          "Links to other sites open in a new tab; their owners are responsible for their content.",
        ],
      },
      {
        heading: "6. Support and administration",
        paragraphs: [
          "To fix a problem, the administrator can temporarily sign in to your account in support mode. We may suspend or delete accounts that break these terms.",
        ],
      },
      {
        heading: "7. Availability and liability",
        paragraphs: [
          "The site is provided “as is”. We do our best to keep it running but can't guarantee it, and we may change it, pause it or shut it down.",
          "To the extent permitted by law, we aren't liable for indirect damage or data loss caused by using the site. Nothing in these terms limits your rights as a consumer under Bulgarian and EU law.",
        ],
      },
      {
        heading: "8. Changes to these terms",
        paragraphs: [
          "We may update these terms. For significant changes we'll update the date at the top of this page. Continuing to use the site after a change means you accept the new terms.",
        ],
      },
      {
        heading: "9. Governing law",
        paragraphs: [
          "These terms are governed by Bulgarian law. Disputes go to the competent court in Bulgaria, without affecting the protection the law of your country of residence gives you.",
        ],
      },
    ],
  },
};

export const faq: Record<Locale, Faq> = {
  bg: {
    title: "Често задавани въпроси",
    intro: "Не намираш отговор? Пиши ни чрез бутона „Feedback“ долу вдясно.",
    items: [
      {
        q: "Какво е Eau de Fragrances?",
        a: "Сайт, в който подреждаш парфюмите, които имаш, и водиш списък с тези, които искаш да купиш. За всеки парфюм виждаш оценката, нотките и снимката му от Parfumo и можеш да сравниш цените в Pazaruvaj.",
      },
      { q: "Безплатно ли е?", a: "Да, сайтът е напълно безплатен." },
      {
        q: "Откъде идват оценката, нотките и снимката?",
        a: "От Parfumo. Когато добавиш линк към страницата на парфюма в Parfumo, сайтът сам прочита оценката, нотките (връх, сърце, база) и снимката на флакона и ги обновява веднъж седмично.",
      },
      {
        q: "Защо някой парфюм няма оценка или нотки?",
        a: "Или още няма линк към Parfumo, тогава натисни „Добави линк към Parfumo“ в картата, или в Parfumo все още няма оценки и нотки за него.",
      },
      {
        q: "Как да намеря линка към Parfumo?",
        a: "Във формата за добавяне има линк, който отваря търсене в Parfumo в нов раздел. Отвори страницата на парфюма там, копирай адреса ѝ от браузъра и го постави в полето „Линк към Parfumo“.",
      },
      {
        q: "Сбърках името на парфюм. Как да го поправя?",
        a: "Натисни моливчето в картата на парфюма. Можеш да редактираш парфюмите, добавени от теб в каталога.",
      },
      {
        q: "Каква е разликата между „Колекция“ и „Желани“?",
        a: "„Колекция“ са парфюмите, които имаш, а „Желани“ са тези, които искаш да купиш или опиташ. Когато купиш парфюм от „Желани“, натисни „Купих го“ и той се премества в колекцията.",
      },
      {
        q: "Какво е „Твоята оценка“?",
        a: "Твоята лична оценка от 1 до 10. Не се показва на други потребители.",
      },
      {
        q: "Кой вижда колекцията ми?",
        a: "Само ти. Администраторът на сайта може да я види при поддръжка. Повече за това има в Политиката за поверителност.",
      },
      {
        q: "Как да сменя езика или темата?",
        a: "От бутоните EN/BG и слънцето или луната горе вдясно. Изборът се запомня за следващия път.",
      },
      {
        q: "Как да изтрия профила си?",
        a: "Отвори „Профил“ (иконката горе вдясно) и натисни „Изтрий профила ми“. Колекцията и списъкът ти с желани се изтриват заедно с профила.",
      },
      {
        q: "Къде да видя цените?",
        a: "Натисни бутона „Pazaruvaj“ в картата на парфюма. В нов раздел ще се отвори сравнение на цените в българските онлайн магазини в Pazaruvaj.com.",
      },
    ],
  },
  en: {
    title: "Frequently asked questions",
    intro: "Can't find an answer? Write to us with the “Feedback” button at the bottom right.",
    items: [
      {
        q: "What is Eau de Fragrances?",
        a: "A site to catalogue the perfumes you own and keep a wishlist of the ones you want. For each perfume you see its rating, notes and picture from Parfumo, and can compare prices on Pazaruvaj.",
      },
      { q: "Is it free?", a: "Yes, completely." },
      {
        q: "Where do the rating, notes and picture come from?",
        a: "From Parfumo. When you add a link to the perfume's Parfumo page, the site reads its rating, notes (top, heart, base) and bottle picture by itself and refreshes them weekly.",
      },
      {
        q: "Why does a perfume have no rating or notes?",
        a: "Either it has no Parfumo link yet (press “Add Parfumo link” on the card), or Parfumo doesn't list a rating or notes for it yet.",
      },
      {
        q: "How do I find the Parfumo link?",
        a: "The add form has a link that opens a Parfumo search in a new tab. Open the perfume's page there, copy its address from the browser and paste it into “Parfumo link”.",
      },
      {
        q: "I misspelled a perfume. How do I fix it?",
        a: "Press the pencil on the perfume's card. You can edit perfumes you added to the catalogue.",
      },
      {
        q: "What's the difference between Collection and Wishlist?",
        a: "Collection is what you own; Wishlist is what you want to buy or try. When you buy something from your wishlist, press “I bought it” to move it to your collection.",
      },
      { q: "What is “Your rating”?", a: "Your personal score from 1 to 10. Other users don't see it." },
      {
        q: "Who can see my collection?",
        a: "Only you. The site administrator can see it when providing support; see the Privacy policy for details.",
      },
      {
        q: "How do I change the language or theme?",
        a: "With the EN/BG buttons and the sun or moon at the top right. Your choice is remembered.",
      },
      {
        q: "How do I delete my account?",
        a: "Open Account (the icon at the top right) and press “Delete my account”. Your collection and wishlist are deleted with it.",
      },
      {
        q: "Where can I see prices?",
        a: "Press the “Pazaruvaj” button on a perfume's card. It opens a price comparison across Bulgarian online shops on Pazaruvaj.com in a new tab.",
      },
    ],
  },
};
