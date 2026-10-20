// Database tests: runs every migration in supabase/migrations, in order, on an
// in-memory Postgres (PGlite) with stand-ins for what Supabase provides, then
// checks who may read and change what. `npm run test:db`; exits 1 on a failure.

import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const MIGRATIONS = new URL("../migrations/", import.meta.url);
const PARFUMO_IMAGE = "https://media.parfumo.com/perfumes/x.jpg";

const db = new PGlite({ extensions: { pg_trgm } });
const users = {};
let failures = 0;

const pass = (label) => console.log(`  ok    ${label}`);
const fail = (label, detail = "") => {
  failures++;
  console.log(`  FAIL  ${label} ${detail}`);
};

/** Runs `sql` as a user from `users` (or "anon") through Supabase's roles and auth.uid(). */
async function as(who, sql, params = []) {
  const sub = who === "anon" ? "" : users[who];
  await db.exec(`set request.jwt.claim.sub = '${sub}'; set role ${who === "anon" ? "anon" : "authenticated"};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

async function allowed(label, who, sql, params) {
  try {
    const result = await as(who, sql, params);
    pass(label);
    return result.rows;
  } catch (error) {
    fail(label, `→ ${error.code} ${error.message}`);
    return [];
  }
}

async function refused(label, who, sql, params, code) {
  try {
    await as(who, sql, params);
    fail(label, "→ was allowed");
  } catch (error) {
    if (error.code === code) pass(`${label} (${code})`);
    else fail(label, `→ ${error.code} ${error.message}, expected ${code}`);
  }
}

function expect(label, condition, detail) {
  if (condition) pass(label);
  else fail(label, JSON.stringify(detail));
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0];

// ---------------------------------------------------------------------------
// What Supabase provides: roles, the auth schema, auth.uid()
// ---------------------------------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create schema extensions;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    created_at timestamptz not null default now(),
    last_sign_in_at timestamptz,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, extensions, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

/** The state production had before the owner/admin migration ran. */
async function seedBeforeRoles() {
  for (const [key, confirmed] of [["owner", true], ["alice", true], ["bob", false], ["carol", true]]) {
    const row = await one(
      `insert into auth.users (email, email_confirmed_at) values ($1, ${confirmed ? "now()" : "null"}) returning id`,
      [`${key}@example.com`],
    );
    users[key] = row.id;
  }
  await db.query("insert into public.admins (user_id) values ($1)", [users.owner]);
  // The carousel seed must reuse this entry rather than add a second Sauvage
  await db.query("insert into public.perfumes (brand, name, concentration, created_by) values ('dior', 'SAUVAGE', 'edt', $1)", [
    users.carol,
  ]);
}

// Two names arrived in production garbled by the clipboard (UTF-8 read as Mac Roman)
const GARBLED = { lancome: "Lanc\u221a\u00a5me", n5: "N\u00ac\u221e5" };

async function seedGarbledNames() {
  await db.exec(`
    insert into public.perfumes (brand, name, concentration) values
      ('${GARBLED.lancome}', 'Hypnose', 'edp'),
      ('Chanel', '${GARBLED.n5}', 'parfum'),
      ('${GARBLED.lancome}', 'La Vie est Belle', 'edp');
    insert into public.showcase (position, brand, name, parfumo_url, image_url)
      values (99, 'Chanel', '${GARBLED.n5}', 'https://www.parfumo.com/x', 'https://media.parfumo.com/x.jpg');
  `);
}

// A perfume whose Parfumo page was read before broken links were looked for
const BROKEN_LINK = "https://www.parfumo.com/Perfumes/Dior/sauvage";

async function seedReadLink() {
  await db.query(
    `insert into public.perfumes (brand, name, parfumo_url, parfumo_rating, parfumo_notes, image_url, ratings_updated_at)
     values ('Dior', 'Broken Link', $1, 5, '{}', $2, now())`,
    [BROKEN_LINK, PARFUMO_IMAGE],
  );
}

console.log("migrations");
for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort()) {
  if (file === "20261019120000_showcase_and_admins.sql") await seedBeforeRoles();
  if (file === "20261019170000_parfumo_images_only.sql") await seedGarbledNames();
  if (file === "20261020120000_missing_parfumo_links.sql") await seedReadLink();
  try {
    await db.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));
    pass(file);
  } catch (error) {
    fail(file, error.message);
    process.exit(1);
  }
}

console.log("\nnames garbled by the clipboard");
const names = async (sql) => (await db.query(sql)).rows.map((r) => r.v).sort().join(", ");
expect(
  "Lancome and N 5 are repaired in the catalogue",
  (await names("select brand || ' ' || name || ' ' || concentration as v from public.perfumes where brand in ('Lancôme', 'Chanel') or name = 'Hypnose'")) ===
    "Chanel N°5 edp, Chanel N°5 parfum, Lancôme Hypnose edp, Lancôme La Vie est Belle edp",
  await names("select brand || ' ' || name || ' ' || concentration as v from public.perfumes"),
);
expect(
  "a garbled duplicate of a correct entry is left alone",
  (await names(`select name as v from public.perfumes where brand = '${GARBLED.lancome}'`)) === "La Vie est Belle",
);
expect(
  "the carousel name is repaired",
  (await names(`select name as v from public.showcase where position = 99`)) === "N°5",
);
await db.exec("delete from public.showcase where position = 99");

// ---------------------------------------------------------------------------
console.log("\nshelves and catalogue");
const [sauvage] = await allowed("anon reads the catalogue", "anon", "select id from public.perfumes where name = 'SAUVAGE'");
await allowed("carol puts a perfume on her shelf", "carol", "insert into public.user_perfumes (perfume_id, shelf) values ($1, 'collection')", [
  sauvage.id,
]);
expect(
  "alice can't see carol's shelf",
  (await as("alice", "select * from public.user_perfumes")).rows.length === 0,
);
await refused("anon can't read shelves", "anon", "select * from public.user_perfumes", [], "42501");
// RLS hides other people's entries from UPDATE: no error, nothing changes
await as("alice", "update public.perfumes set name = 'x' where id = $1", [sauvage.id]);
expect(
  "alice can't edit carol's catalogue entry",
  (await one("select name from public.perfumes where id = $1", [sauvage.id])).name === "SAUVAGE",
);

console.log("\ncatalogue pictures come from Parfumo only");
await refused(
  "creator can't set a picture from another site",
  "carol",
  "update public.perfumes set image_url = 'https://evil.example.com/x.png' where id = $1",
  [sauvage.id],
  "23514",
);
await refused(
  "set_parfumo_data refuses a picture from another site",
  "alice",
  "select public.set_parfumo_data($1, 8, '{}'::jsonb, 'https://evil.example.com/x.png')",
  [sauvage.id],
  "23514",
);
await allowed("set_parfumo_data takes a Parfumo picture", "alice", "select public.set_parfumo_data($1, 8, '{}'::jsonb, $2)", [
  sauvage.id,
  PARFUMO_IMAGE,
]);
await allowed("set_parfumo_data takes the no-picture marker", "alice", "select public.set_parfumo_data($1, null, null, 'https://parfumo.com/no-image')", [
  sauvage.id,
]);
await refused("anon can't call set_parfumo_data", "anon", "select public.set_parfumo_data($1, 8, null, null)", [sauvage.id], "42501");

console.log("\nParfumo links that lead to no perfume");
const brokenRow = () => one("select * from public.perfumes where name = 'Broken Link'");
const broken = await brokenRow();
expect("saved links are read again on the next visit", broken.ratings_updated_at === null, broken);
const removeLink = "select public.remove_missing_parfumo_link($1, $2)";
await refused("anon can't remove a link", "anon", removeLink, [broken.id, BROKEN_LINK], "42501");
await allowed("removing a link the perfume no longer has", "alice", removeLink, [broken.id, "https://www.parfumo.com/Perfumes/Dior/other"]);
expect("leaves the current link alone", (await brokenRow()).parfumo_url === BROKEN_LINK);
await allowed("a signed-in user's visit removes the broken link", "alice", removeLink, [broken.id, BROKEN_LINK]);
const removed = await brokenRow();
expect(
  "the link and the rating, notes and picture read from it are gone",
  removed.parfumo_url === null && removed.parfumo_rating === null && removed.parfumo_notes === null && removed.image_url === null,
  removed,
);

console.log("\nfeedback");
await allowed("anon sends feedback", "anon", "select public.submit_feedback('idea', 'Hello there')");
await refused("anon can't read feedback", "anon", "select * from public.feedback", [], "42501");
await refused("users can't read feedback", "carol", "select * from public.feedback", [], "42501");
await refused("users can't read it through the admin function", "carol", "select * from public.admin_feedback()", [], "42501");

// ---------------------------------------------------------------------------
console.log("\nowner and admins");
expect("the existing admin became the owner", (await one("select role from public.admins where user_id = $1", [users.owner])).role === "owner");
expect("owner: is_owner()", (await as("owner", "select public.is_owner() as v")).rows[0].v === true);
await refused("anon can't call is_owner()", "anon", "select public.is_owner()", [], "42501");
await refused("users can't read the admins table", "owner", "select * from public.admins", [], "42501");

await allowed("owner makes alice an admin (any case, spaces)", "owner", "select public.admin_grant_admin('  ALICE@example.com ')");
await refused("granting alice twice", "owner", "select public.admin_grant_admin('alice@example.com')", [], "23505");
await refused("granting an unconfirmed email", "owner", "select public.admin_grant_admin('bob@example.com')", [], "55000");
await refused("granting an unknown email", "owner", "select public.admin_grant_admin('nobody@example.com')", [], "P0002");
await refused("an admin can't make admins", "alice", "select public.admin_grant_admin('carol@example.com')", [], "42501");
await refused("a user can't make admins", "carol", "select public.admin_grant_admin('carol@example.com')", [], "42501");

const admins = await allowed("an admin lists the admins", "alice", "select email, role, added_by_email from public.admin_list_admins()");
expect(
  "owner first, then alice added by the owner",
  admins.map((a) => `${a.email}:${a.role}:${a.added_by_email}`).join(", ") ===
    "owner@example.com:owner:null, alice@example.com:admin:owner@example.com",
  admins,
);
await refused("a user can't list admins", "carol", "select * from public.admin_list_admins()", [], "42501");

await refused("an admin can't remove the owner", "alice", "select public.admin_revoke_admin($1)", [users.owner], "42501");
await refused("the owner can't be removed", "owner", "select public.admin_revoke_admin($1)", [users.owner], "42501");
await refused("an admin can't sign in as the owner", "alice", "select public.admin_begin_impersonation($1)", [users.owner], "42501");
await refused("an admin can't delete the owner", "alice", "select public.admin_delete_user($1)", [users.owner], "42501");
await allowed("owner removes alice", "owner", "select public.admin_revoke_admin($1)", [users.alice]);
expect("alice is no longer an admin", (await as("alice", "select public.is_admin() as v")).rows[0].v === false);

const log = await allowed("owner reads the audit log", "owner", "select action, target_email from public.admin_recent_actions() order by id");
expect(
  "grant and removal are logged",
  log.map((l) => `${l.action}:${l.target_email}`).join(", ") === "grant_admin:alice@example.com, revoke_admin:alice@example.com",
  log,
);

// ---------------------------------------------------------------------------
console.log("\nhomepage carousel");
const slides = async () => (await db.query("select id, name from public.showcase order by position")).rows;
const kept = await allowed("anon reads the carousel", "anon", "select name, parfumo_url, image_url from public.showcase order by position");
expect("today's eight slides were kept, in order", kept.length === 8 && kept[1].name === "SAUVAGE", kept);
await refused("anon can't change the carousel", "anon", "delete from public.showcase", [], "42501");
await refused("users can't change it directly", "carol", "update public.showcase set name = 'x'", [], "42501");

await allowed("owner makes alice an admin again", "owner", "select public.admin_grant_admin('alice@example.com')");
const save = (id, name, url = "https://www.parfumo.com/Perfumes/a/b", image = PARFUMO_IMAGE) =>
  `select public.admin_showcase_save(${id ? `'${id}'` : "null"}, ' Brand ', '${name}', 'edp', '${url}', '${image}', 8.04)`;

await allowed("an admin adds a perfume", "alice", save(null, " New One "));
const added = await one("select * from public.showcase where name = 'New One'");
expect(
  "it goes last, trimmed, rating rounded, read time and author set",
  added?.position === 9 && added.brand === "Brand" && Number(added.parfumo_rating) === 8 && added.parfumo_read_at && added.updated_by === users.alice,
  added,
);
await refused("a user can't add", "carol", save(null, "x"), [], "42501");
await refused("the no-picture marker is refused", "alice", save(null, "x", undefined, "https://parfumo.com/no-image"), [], "23514");
await refused("a picture from another site is refused", "alice", save(null, "x", undefined, "https://evil.example.com/x.jpg"), [], "23514");
await refused("a link to another site is refused", "alice", save(null, "x", "https://evil.example.com/x"), [], "23514");

const [first] = await slides();
await allowed("an admin edits name and link", "alice", save(first.id, "Renamed", "https://www.parfumo.com/Perfumes/new/link"));
const edited = await one("select * from public.showcase where id = $1", [first.id]);
expect("the edit keeps its place", edited.name === "Renamed" && edited.parfumo_url.endsWith("/new/link") && edited.position === 1, edited);
await refused("editing an unknown id", "alice", save("00000000-0000-0000-0000-000000000000", "x"), [], "P0002");

let rows = await slides();
await allowed("an admin moves the 2nd up", "alice", "select public.admin_showcase_move($1, -1)", [rows[1].id]);
expect("it's first now", (await slides())[0].id === rows[1].id);
await allowed("moving the first one up does nothing", "alice", "select public.admin_showcase_move($1, -1)", [rows[1].id]);
await refused("a user can't reorder", "carol", "select public.admin_showcase_move($1, 1)", [rows[0].id], "42501");

for (const name of ["Extra 1", "Extra 2", "Extra 3"]) await as("alice", save(null, name));
expect("twelve slides", (await slides()).length === 12);
await refused("a 13th is refused", "alice", save(null, "Thirteenth"), [], "54000");

rows = await slides();
for (const row of rows.slice(1)) await as("alice", "select public.admin_showcase_remove($1)", [row.id]);
await refused("the last one can't be removed", "alice", "select public.admin_showcase_remove($1)", [rows[0].id], "23514");
await refused("a user can't remove", "carol", "select public.admin_showcase_remove($1)", [rows[0].id], "42501");

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
