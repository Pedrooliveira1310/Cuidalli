import { test, expect } from "@playwright/test";
const base = process.env.E2E_API_URL || "http://127.0.0.1:8000";
test("cadastro, vínculo e cuidados com API e banco reais", async ({
  page,
  request,
  browser,
}) => {
  const suffix = String(Date.now()).slice(-8),
    elderPhone = "119" + suffix,
    caregiverPhone = "118" + suffix;
  const password = "TesteCuidali123";
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByText("Preencha todos os campos obrigatórios."),
  ).toBeVisible();
  const elderFields: Record<string, string> = {
    "Nome completo": "Idoso fictício E2E",
    Nascimento: "1960-05-01",
    "Telefone com DDD": elderPhone,
    "Senha (8 a 72 caracteres)": password,
    "Nome do contato de emergência": "Contato fictício",
    "Telefone do contato com DDD": "11900000000",
    "Parentesco do contato": "Filho",
  };
  for (const [label, value] of Object.entries(elderFields))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByText("Conta criada. Entre com telefone e senha."),
  ).toBeVisible();
  await page.getByLabel("Telefone com DDD", { exact: true }).fill(elderPhone);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByText("Nenhuma dose prevista para hoje."),
  ).toBeVisible();
  await expect(
    page.getByText("Nenhuma consulta marcada para hoje."),
  ).toBeVisible();
  const login = await request.post(base + "/auth/login", {
    data: { phone: elderPhone, password },
  });
  expect(login.ok()).toBeTruthy();
  const elderLogin = await login.json(),
    elder = elderLogin.user.id;
  const register = await request.post(base + "/auth/register", {
    data: {
      role: "caregiver",
      name: "Cuidador fictício E2E",
      birth_date: "1990-05-01",
      phone: caregiverPhone,
      password,
    },
  });
  expect(register.status()).toBe(201);
  await page.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await page.getByRole("button", { name: "Vínculos", exact: true }).click();
  await page
    .getByRole("button", { name: "Gerar código por 10 minutos" })
    .click();
  const code = await page.getByText(/^[A-F0-9]{12}$/).innerText();
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    caregiver = await context.newPage();
  await caregiver.goto("/");
  await caregiver
    .getByRole("button", { name: "Já tenho conta · Entrar" })
    .click();
  await caregiver
    .getByLabel("Telefone com DDD", { exact: true })
    .fill(caregiverPhone);
  await caregiver.getByLabel("Senha", { exact: true }).fill(password);
  await caregiver.getByRole("button", { name: "Entrar", exact: true }).click();
  await caregiver
    .getByLabel("Código de vinculação", { exact: true })
    .fill(code);
  await caregiver
    .getByRole("button", { name: "Concluir vinculação", exact: true })
    .click();
  await expect(
    caregiver.getByText("Ainda não há atividade registrada pelo idoso."),
  ).toBeVisible();
  await caregiver
    .getByRole("button", { name: "Ver todos os medicamentos" })
    .click();
  await caregiver
    .getByRole("button", { name: "Adicionar medicamento" })
    .click();
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const meds: Record<string, string> = {
    Medicamento: "Remédio E2E",
    Dosagem: "50 mg",
    "Horário 1": "08:00",
    "Início do uso": date,
    "Fim do uso": date,
  };
  for (const [label, value] of Object.entries(meds))
    await caregiver.getByLabel(label, { exact: true }).fill(value);
  await caregiver
    .getByRole("button", { name: "Adicionar horário", exact: true })
    .click();
  await caregiver.getByLabel("Horário 2", { exact: true }).fill("20:00");
  await caregiver.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(caregiver.getByText("Medicamento salvo.")).toBeVisible();
  await caregiver.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(caregiver.getByLabel("Horário 1", { exact: true })).toHaveValue(
    "08:00",
  );
  await expect(caregiver.getByLabel("Horário 2", { exact: true })).toHaveValue(
    "20:00",
  );
  await caregiver.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(caregiver.getByText("Medicamento salvo.")).toBeVisible();
  await page.getByRole("tab", { name: "Início", exact: true }).click();
  await expect(page.getByText("♧ 08:00 · Remédio E2E")).toBeVisible();
  await page
    .getByRole("button", { name: "Ainda não", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Ainda não — pode confirmar depois"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "✓ Já tomei", exact: true })
    .first()
    .click();
  await expect(page.getByText("✓ Já tomou", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Registros de dores", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar uma dor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar registro de dor", exact: true })
    .click();
  await expect(
    page.getByText(
      "Dor registrada e disponível aos cuidadores vinculados. Nenhuma notificação remota foi enviada.",
    ),
  ).toBeVisible();
  await caregiver.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await caregiver.getByRole("button", { name: "Dores", exact: true }).click();
  await expect(caregiver.getByText("4/10 · Joelho esquerdo")).toBeVisible();
  await caregiver
    .getByRole("button", { name: "Marcar como visto", exact: true })
    .click();
  await expect(
    caregiver.getByText(/Visto por Cuidador fictício E2E/),
  ).toBeVisible();
  const dash = await request.get(`${base}/elders/${elder}/dashboard`, {
    headers: { Authorization: `Bearer ${elderLogin.token}` },
  });
  expect((await dash.json()).doses[0].status).toBe("taken");
  await page.screenshot({
    path: "test-results/idoso-dores.png",
    fullPage: true,
  });
  await caregiver.screenshot({
    path: "test-results/cuidador-dores.png",
    fullPage: true,
  });
  // Consultas e contatos também usam a API real do banco isolado.
  await caregiver.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await caregiver
    .getByRole("button", { name: "Consultas", exact: true })
    .click();
  await caregiver
    .getByRole("button", { name: "Adicionar consulta", exact: true })
    .click();
  await expect(
    caregiver.getByLabel("Data e hora (São Paulo)", { exact: true }),
  ).toHaveAttribute("type", "datetime-local");
  for (const [label, value] of Object.entries({
    "Médico(a)": "Dra. E2E",
    Especialidade: "Clínica geral",
    "Data e hora (São Paulo)": date + "T14:30",
    Local: "Sala fictícia",
  }))
    await caregiver.getByLabel(label, { exact: true }).fill(value);
  await caregiver.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(caregiver.getByText("Consulta salva.")).toBeVisible();
  await caregiver.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(
    caregiver.getByLabel("Data e hora (São Paulo)", { exact: true }),
  ).toHaveValue(date + "T14:30");
  await caregiver.getByLabel("Local", { exact: true }).fill("Sala 2 fictícia");
  await caregiver.getByRole("button", { name: "Salvar", exact: true }).click();
  caregiver.once("dialog", (d) => d.accept());
  await caregiver
    .getByRole("button", { name: "Cancelar consulta", exact: true })
    .click();
  await expect(caregiver.getByText("Consulta cancelada.")).toBeVisible();
  await caregiver.getByRole("tab", { name: "Cuidados", exact: true }).click();
  await caregiver
    .getByRole("button", { name: "Contatos", exact: true })
    .click();
  await caregiver
    .getByRole("button", { name: "Adicionar contato", exact: true })
    .click();
  for (const [label, value] of Object.entries({
    "Nome do contato": "Contato SOS E2E",
    "Telefone com DDD": "+55 (11) 98888-7777",
    Parentesco: "Irmã",
  }))
    await caregiver.getByLabel(label, { exact: true }).fill(value);
  await caregiver.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(caregiver.getByText("Contato salvo.")).toBeVisible();
  const primarySaved = caregiver.waitForResponse(
    (r) => r.url().includes("/contacts/") && r.request().method() === "PATCH",
  );
  await caregiver
    .getByRole("button", { name: "Usar no SOS", exact: true })
    .click();
  expect((await primarySaved).ok()).toBeTruthy();
  await expect(
    caregiver.getByRole("button", { name: "Usar no SOS", exact: true }),
  ).toHaveCount(1);
  const contacts = await request.get(`${base}/elders/${elder}/contacts`, {
    headers: { Authorization: `Bearer ${elderLogin.token}` },
  });
  expect(
    (await contacts.json()).items.find((c: any) => Number(c.is_primary) === 1)
      .name,
  ).toBe("Contato SOS E2E");
  await page.getByRole("tab", { name: "SOS", exact: true }).click();
  await expect(
    page.getByText("Contato SOS E2E (Irmã)", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5511988887777", { exact: true })).toBeVisible();
  await expect(page.getByText(/Você precisa iniciar a/)).toBeVisible();
  await page.screenshot({
    path: "test-results/sos-mobile.png",
    fullPage: true,
  });
  await context.close();
});
test("falha da API exibe mensagem sem simular login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Já tenho conta · Entrar" }).click();
  await page
    .getByLabel("Telefone com DDD", { exact: true })
    .fill("11911112222");
  await page.getByLabel("Senha", { exact: true }).fill("SenhaTeste123");
  await page.route("**/auth/login", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByText(
      "Não foi possível conectar à API. Verifique sua conexão e tente novamente.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeEnabled();
});
