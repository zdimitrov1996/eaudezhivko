# Настройка: Supabase и вход с Google

Това ръководство свързва сайта с база данни и включва входа с имейл и с Google. Докато не е направено, сайтът работи в **режим на преглед**: показва примерни парфюми, а регистрацията и входът са изключени.

> **Пароли и тайни ключове не се пращат в чата и не се записват в кода.** Секретният ключ на Google и паролата на базата данни ги поставяш само в Supabase. В `.env.local` влизат само двете публични стойности.

---

## 1. Проект в Supabase

1. Влез в https://supabase.com с **Sign in with GitHub**.
2. **New project** → име `eaudefragrances`, регион **Central EU (Frankfurt)**.
3. Генерирай паролата на базата и я запази при себе си (в мениджър на пароли).

## 2. Таблици и правила за достъп

1. В проекта отвори **SQL Editor → New query**.
2. Копирай цялото съдържание на [`supabase/migrations/20261016000000_init.sql`](../supabase/migrations/20261016000000_init.sql) и натисни **Run**.
3. Трябва да видиш `Success. No rows returned`. В **Table Editor** ще се появят таблиците `perfumes` и `user_perfumes`.

Скриптът се пуска **веднъж**. При повторно пускане ще даде грешка, че таблиците вече съществуват. Това е нормално.

## 3. Връзка между сайта и Supabase

1. **Project Settings → API Keys** (или бутона **Connect** горе).
2. Копирай **Project URL** и **Publishable key** (започва със `sb_publishable_`).
   Не копирай `secret` / `service_role` ключа, сайтът не го ползва.
3. Отвори файла `.env.local` в папката на проекта (вече е създаден, с празни стойности) и постави двете стойности след знака `=`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   `.env.local` не се качва в GitHub.
4. Рестартирай `npm run dev`.

## 4. Настройки за вход

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:3000` (при пускането става `https://eaudefragrances.com`)
- **Redirect URLs:** добави `http://localhost:3000/**`
  (при пускането добави и `https://eaudefragrances.com/**`)

**Authentication → Sign In / Providers → Email**: включено е по подразбиране. Остави **Confirm email** включено.

### Имейл шаблони (препоръчително)

Стандартните линкове в имейлите работят само ако потребителят ги отвори в същия браузър, в който се е регистрирал. С тези шаблони работят навсякъде. Отвори **Authentication → Emails → Templates** и смени линка (`href`):

- **Confirm signup:**
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/collection`
- **Reset password:**
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

> Вграденият имейл на Supabase изпраща само по няколко писма на час и е за тестове. Преди пускането ще вържем собствен SMTP (например Resend или Brevo, и двата имат безплатен план).

## 5. Вход с Google

### В Google Cloud

1. Отвори https://console.cloud.google.com и създай проект **Eau de Fragrances**.
2. **Google Auth Platform → Branding:** име на приложението `Eau de Fragrances` и имейл за поддръжка.
3. **Audience:** тип **External**. Докато приложението е в режим **Testing**, само добавените **Test users** могат да влизат, така че добави своя Google акаунт там. Преди пускането натискаш **Publish app**.
4. **Clients → Create client → Web application**:
   - **Authorized JavaScript origins:** `http://localhost:3000` (по-късно и `https://eaudefragrances.com`)
   - **Authorized redirect URIs:** адресът за обратно извикване от Supabase. Виждаш го в **Supabase → Authentication → Sign In / Providers → Google** (изглежда така: `https://xxxx.supabase.co/auth/v1/callback`).
5. Запази. Google показва **Client ID** и **Client secret**.

### В Supabase

1. **Authentication → Sign In / Providers → Google** → включи го.
2. Постави **Client ID** и **Client secret** и запази.
   Тайният ключ го поставяш **само тук**, не в чата и не в кода.

## 6. Проверка

1. `npm run dev` → http://localhost:3000
2. **Регистрация** с имейл → потвърди от имейла → озоваваш се в „Моята колекция“.
3. **Изход** (иконата на профила горе вдясно) → **Вход → Продължи с Google**.
4. Добави парфюм в колекцията и в желани, премести го и му дай оценка.

Ако нещо не тръгне, пусни отново `npm run dev` и копирай грешката от терминала.
