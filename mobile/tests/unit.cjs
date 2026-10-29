const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
function moduleFor(file, extra = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require,
    Date,
    Intl,
    Set,
    AbortController,
    setTimeout,
    clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: "http://test.invalid" } },
    ...extra,
  });
  return exports;
}
const validation = moduleFor("src/validation.ts");
test("telefone: filtro compartilhado preserva formatação e remove letras digitadas/coladas", () => {
  assert.equal(
    validation.filterPhone("+55 (11) 99999-0000abc@/💊"),
    "+55 (11) 99999-0000",
  );
  let typed = "";
  for (const char of "a+55b (11)c 99999-0000")
    typed = validation.filterPhone(typed + char);
  assert.equal(typed, "+55 (11) 99999-0000");
  assert.equal(validation.filterCode("aZb!cd12345678xxxx"), "ABCD12345678");
});
test("datas brasileiras e ISO, impossíveis, bissextos e máscaras nativas", () => {
  assert.equal(validation.isoDate("29/02/2024"), "2024-02-29");
  assert.equal(validation.isoDate("2024-02-29"), "2024-02-29");
  for (const date of [
    "29/02/2025",
    "31/04/2026",
    "2026-13-01",
    "1900-02-29",
    "0000-01-01",
  ])
    assert.equal(validation.isoDate(date), null);
  assert.equal(validation.isoDate("2000-02-29"), "2000-02-29");
  assert.equal(validation.isoDateTime("23/10/2026 14:30"), "2026-10-23T14:30");
  assert.equal(validation.isoDateTime("2026-10-23T24:00"), null);
  assert.equal(validation.numericMask("23012026", "date"), "23/01/2026");
  assert.equal(
    validation.numericMask("230120261430", "datetime-local"),
    "23/01/2026 14:30",
  );
  assert.equal(validation.numericMask("1430", "time"), "14:30");
  assert.equal(validation.numericMask("2026-01-23", "date"), "23/01/2026");
  assert.equal(
    validation.numericMask("2026-01-23T14:30", "datetime-local"),
    "23/01/2026 14:30",
  );
  assert.equal(validation.isoDateTime("2026-01-23T14:30 extra"), null);
  for (const time of ["24:00", "12:60", "8:00", "08:"])
    assert.equal(validation.validTime(time), false);
  assert.equal(validation.validTime("23:59"), true);
});
const response = (status, body = {}) => ({
  status,
  ok: status < 400,
  json: async () => body,
});
function client(fetch, storage = {}) {
  return moduleFor("src/api.ts", {
    fetch,
    require: (name) =>
      name === "react-native"
        ? { Platform: { OS: storage.native ? "android" : "web" } }
        : name === "expo-secure-store"
          ? storage
          : require(name),
  });
}
test("401 antigo não encerra login novo; login/cadastro não enviam token", async () => {
  let finish;
  const calls = [];
  const api = client((url, opts) => {
    calls.push({ url, opts });
    if (url.endsWith("/old"))
      return new Promise((resolve) => {
        finish = resolve;
      });
    return Promise.resolve(response(200));
  });
  let expired = 0;
  api.setExpiredHandler(() => expired++);
  await api.saveToken("old");
  const pending = api.api("/old").catch((e) => e);
  await api.saveToken("new");
  finish(response(401, { error: "Expirada" }));
  await pending;
  assert.equal(expired, 0);
  await api.api("/me");
  assert.equal(calls.at(-1).opts.headers.Authorization, "Bearer new");
  await api.api("/auth/login", "POST", {});
  assert.equal(calls.at(-1).opts.headers.Authorization, undefined);
  await api.api("/auth/register", "POST", {});
  assert.equal(calls.at(-1).opts.headers.Authorization, undefined);
});
test("401 atual limpa memória mesmo se SecureStore falhar; 403/404 notificam proteção", async () => {
  let lastHeaders,
    status = 401,
    expired = 0;
  const denied = [];
  const api = client(
    async (url, opts) => {
      lastHeaders = opts.headers;
      return response(status, { error: "Sem acesso" });
    },
    {
      native: true,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {
        throw Error("storage offline");
      },
    },
  );
  api.setExpiredHandler(() => expired++);
  api.onAccessDenied((p, s) => denied.push(s));
  await api.saveToken("old");
  await assert.rejects(api.api("/me"));
  assert.equal(expired, 1);
  status = 200;
  await api.api("/me");
  assert.equal(lastHeaders.Authorization, undefined);
  await api.saveToken("new");
  for (const code of [403, 404]) {
    status = code;
    await assert.rejects(api.api("/elders/1/contacts"));
  }
  assert.deepEqual(denied, [401, 403, 404]);
});

test("discador: falha tratada e sucesso não afirma ligação concluída", async () => {
  let fail = true;
  const phone = moduleFor("src/phone.ts", {
    require: () => ({
      Linking: {
        openURL: async (url) => {
          assert.equal(url, "tel:11999990000");
          if (fail) throw Error("Sem discador");
        },
      },
    }),
  });
  assert.match(await phone.openDialer("11999990000"), /não conseguiu abrir/);
  fail = false;
  assert.match(
    await phone.openDialer("11999990000"),
    /Não há confirmação de ligação/,
  );
});
