import { test, expect, Page, Route } from "@playwright/test";
const base = process.env.E2E_API_URL || "http://127.0.0.1:8000";
const elder = {
  id: 1,
  name: "Pessoa protegida",
  phone: "11900000001",
  role: "elder",
};
const caregiver = {
  id: 2,
  name: "Cuidador fictício",
  phone: "11900000002",
  role: "caregiver",
};
const dashboard = {
  elder,
  date: "2026-10-23",
  last_activity: null,
  doses: [
    {
      time_id: 1,
      time: "08:00",
      name: "Remédio protegido",
      dosage: "50 mg",
      status: "unconfirmed",
    },
  ],
  appointments: [],
  dose_history: [],
};
async function setup(
  page: Page,
  user = elder,
  handler?: (route: Route, path: string) => Promise<boolean>,
) {
  await page.route(base + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (handler && (await handler(route, path))) return;
    const body =
      path === "/auth/login"
        ? { token: user.role + "-token", user }
        : path.endsWith("/dashboard")
          ? dashboard
          : path === "/links"
            ? {
                items: [
                  { id: 1, name: "Pessoa A" },
                  { id: 3, name: "Pessoa B" },
                ],
              }
            : { items: [] };
    await route.fulfill({ json: body });
  });
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page.getByRole("button", { name: "Já tenho conta · Entrar" }).click();
  await page.getByLabel("Telefone com DDD", { exact: true }).fill(user.phone);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaTeste123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function open(page: Page, name: string) {
  await page.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}
test("inputs web, telefone digitado/colado, autocomplete e senha visível", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const phone = page.getByLabel("Telefone com DDD", { exact: true });
  await expect(phone).toHaveAttribute("type", "tel");
  await phone.pressSequentially("abc+55 (11) 99999-0000@");
  await expect(phone).toHaveValue("+55 (11) 99999-0000");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() =>
    navigator.clipboard.writeText("xyz+55 (21) 98888-0000!@"),
  );
  await phone.selectText();
  await phone.press("Control+V");
  await expect(phone).toHaveValue("+55 (21) 98888-0000");
  await expect(phone).toHaveAttribute("autocomplete", "tel");
  await expect(
    page.getByLabel("Nome completo", { exact: true }),
  ).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("Nascimento", { exact: true })).toHaveAttribute(
    "type",
    "date",
  );
  const password = page.getByLabel("Senha (8 a 72 caracteres)", {
    exact: true,
  });
  await expect(password).toHaveAttribute("autocomplete", "new-password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Já tenho conta · Entrar" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await page.route(base + "/auth/login", (route) =>
    route.fulfill({
      status: 422,
      json: { error: "Informe telefone com DDD (10 a 15 dígitos)." },
    }),
  );
  await page
    .getByLabel("Telefone com DDD", { exact: true })
    .fill("11999990000");
  await page.getByLabel("Senha", { exact: true }).fill("SenhaTeste123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Telefone com DDD", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Telefone com DDD", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
});
test("horários individuais, duplicados, datas e bloqueio durante salvamento", async ({
  page,
}) => {
  let resolveSave!: () => void;
  await setup(page, caregiver, async (route, path) => {
    if (path.endsWith("/medications") && route.request().method() === "POST") {
      await new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      await route.fulfill({ json: { message: "Medicamento salvo." } });
      return true;
    }
    return false;
  });
  await page
    .getByRole("button", { name: "Acompanhar esta pessoa" })
    .first()
    .click();
  await open(page, "Medicamentos");
  await expect(
    page.getByRole("tab", { name: "Cuidados", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Adicionar medicamento", exact: true })
    .click();
  await expect(
    page.getByLabel("Início do uso", { exact: true }),
  ).toHaveAttribute("type", "date");
  await expect(page.getByLabel("Horário 1", { exact: true })).toHaveAttribute(
    "type",
    "time",
  );
  await expect(
    page.getByRole("button", { name: "Remover horário 1", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Medicamento", { exact: true }).fill("Teste");
  await page.getByLabel("Dosagem", { exact: true }).fill("1 comprimido");
  await page.getByLabel("Horário 1", { exact: true }).fill("08:00");
  await page
    .getByRole("button", { name: "Adicionar horário", exact: true })
    .click();
  await page.getByLabel("Horário 2", { exact: true }).fill("08:00");
  await page.getByLabel("Início do uso", { exact: true }).fill("2026-10-23");
  await page.getByLabel("Fim do uso", { exact: true }).fill("2026-10-22");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Não repita horários.")).toBeVisible();
  await expect(page.getByLabel("Horário 1", { exact: true })).toBeFocused();
  await page.getByLabel("Horário 2", { exact: true }).fill("20:00");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText(
      "O fim do tratamento deve ser igual ou posterior ao início.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Fim do uso", { exact: true })).toBeFocused();
  await page.getByLabel("Fim do uso", { exact: true }).fill("2026-10-24");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByLabel("Medicamento", { exact: true })).toBeDisabled();
  resolveSave();
  await expect(page.getByText("Medicamento salvo.")).toBeVisible();
});
test("atualização offline preserva dados e bloqueia doses; revogação limpa tela", async ({
  page,
}) => {
  let mode = "ok";
  await setup(page, elder, async (route, path) => {
    if (path.endsWith("/dashboard") && mode !== "ok") {
      if (mode === "offline") await route.abort();
      else await route.fulfill({ status: 403, json: { error: "Sem vínculo" } });
      return true;
    }
    return false;
  });
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  mode = "offline";
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await expect(
    page.getByText(/Não foi possível atualizar os dados/),
  ).toBeVisible();
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "✓ Já tomei", exact: true }),
  ).toBeDisabled();
  mode = "ok";
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "✓ Já tomei", exact: true }),
  ).toBeEnabled();
  mode = "denied";
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toHaveCount(0);
});
test("sair offline encerra localmente e informa falha de revogação", async ({
  page,
}) => {
  await setup(page, elder, async (route, path) => {
    if (path === "/auth/logout") {
      await route.abort();
      return true;
    }
    return false;
  });
  await page.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(
    page.getByText(/Não foi possível revogar a sessão no servidor/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Já tenho conta · Entrar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Cuidados", exact: true }),
  ).toHaveCount(0);
});
test("remoção de outro vínculo preserva seleção e remoção do atual a limpa", async ({
  page,
}) => {
  await setup(page, caregiver);
  await page
    .getByRole("button", { name: "Acompanhar esta pessoa" })
    .first()
    .click();
  await open(page, "Vínculos");
  await page.getByRole("button", { name: "Remover vínculo" }).nth(1).click();
  await page.getByRole("tab", { name: "Início", exact: true }).click();
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  await open(page, "Vínculos");
  await page.getByRole("button", { name: "Remover vínculo" }).first().click();
  await page.getByRole("tab", { name: "Início", exact: true }).click();
  await expect(page.getByText("Quem você vai acompanhar?")).toBeVisible();
});
test("idoso remove cuidador e mantém dados próprios", async ({ page }) => {
  await setup(page);
  await open(page, "Vínculos");
  await page.getByRole("button", { name: "Remover vínculo" }).first().click();
  await page.getByRole("tab", { name: "Início", exact: true }).click();
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
});
test("sessão expirada volta à autenticação com mensagem", async ({ page }) => {
  let expired = false;
  await setup(page, elder, async (route, path) => {
    if (expired && path.endsWith("/dashboard")) {
      await route.fulfill({ status: 401, json: { error: "Expirada" } });
      return true;
    }
    return false;
  });
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  expired = true;
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await expect(
    page.getByText("Sua sessão expirou. Entre novamente."),
  ).toBeVisible();
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toHaveCount(0);
});
test("mapa preserva abdômen/lombar, observação multilinha e largura móvel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setup(page);
  await open(page, "Dores");
  await page
    .getByRole("button", { name: "Registrar uma dor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abdômen", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Costas", exact: true }).click();
  await expect(page.getByText("Local: Lombar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Frente", exact: true }).click();
  await expect(page.getByText("Local: Abdômen", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Observação", { exact: true })).toHaveJSProperty(
    "tagName",
    "TEXTAREA",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/mapa-320.png", fullPage: true });
});
test("SOS sem principal abre contatos; interruptor desabilitado durante envio", async ({
  page,
}) => {
  let release!: () => void;
  await setup(page, elder, async (route, path) => {
    if (path.endsWith("/contacts") && route.request().method() === "POST") {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({ json: { message: "Contato salvo." } });
      return true;
    }
    return false;
  });
  await page.getByRole("tab", { name: "SOS", exact: true }).click();
  await page
    .getByRole("button", { name: "Escolher ou cadastrar contato", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar contato", exact: true })
    .click();
  await page.getByLabel("Nome do contato", { exact: true }).fill("Fictício");
  await page
    .getByLabel("Telefone com DDD", { exact: true })
    .fill("11999990000");
  await page.getByLabel("Parentesco", { exact: true }).fill("Filho");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Contato principal do SOS", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.getByText("Contato salvo.")).toBeVisible();
});
test("retorno à aba e mudança do dia atualizam dados", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-23T20:00:00Z") });
  let requests = 0;
  await setup(page, elder, async (route, path) => {
    if (path.endsWith("/dashboard")) requests++;
    return false;
  });
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  const initial = requests;
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect.poll(() => requests).toBeGreaterThan(initial);
  const beforeMidnight = requests;
  await page.clock.setSystemTime(new Date("2026-10-24T03:01:00Z"));
  await page.clock.runFor(1100);
  await expect.poll(() => requests).toBeGreaterThan(beforeMidnight);
});
test("401 atrasado após saída e novo login não encerra sessão nova", async ({
  page,
}) => {
  let logins = 0,
    dashboards = 0,
    release!: () => void;
  await setup(page, elder, async (route, path) => {
    if (path === "/auth/login") {
      expect(route.request().headers().authorization).toBeUndefined();
      await route.fulfill({
        json: { user: elder, token: `session-${++logins}` },
      });
      return true;
    }
    if (path.endsWith("/dashboard") && ++dashboards === 2) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        status: 401,
        json: { error: "Sessão antiga expirada" },
      });
      return true;
    }
    return false;
  });
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await expect.poll(() => !!release).toBeTruthy();
  await page.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Já tenho conta · Entrar", exact: true })
    .click();
  await page.getByLabel("Telefone com DDD", { exact: true }).fill(elder.phone);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaTeste123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByText("Remédio protegido", { exact: false }),
  ).toBeVisible();
  const response = page.waitForResponse((r) => r.status() === 401);
  release();
  await response;
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Cuidados", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sua sessão expirou. Entre novamente."),
  ).toHaveCount(0);
});
