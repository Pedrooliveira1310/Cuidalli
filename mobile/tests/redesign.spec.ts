import {test,expect} from '@playwright/test';
const base=process.env.E2E_API_URL||'http://127.0.0.1:8010';

test('a demonstração web preserva os dois perfis no navegador sem usar a API de contas', async ({page,browser})=>{
 const origin = process.env.E2E_WEB_URL || 'http://localhost:8081';
 await page.route('**/auth/demo',route=>route.fulfill({json:{items:[]}}));
 const realRequests:string[]=[];
 page.on('request',request=>{
   const path=new URL(request.url()).pathname;
   if (request.method()!=='GET' || /^\/(me|links|elders|notifications)(\/|$)/.test(path)) {
     realRequests.push(request.method()+' '+path);
   }
 });
 await page.goto(origin);
 const elder=page.getByRole('button',{name:/maria\.cuidali@example\.com/});
 const caregiver=page.getByRole('button',{name:/ana\.cuidali@example\.com/});
 await expect(elder).toBeVisible();
 await expect(page.getByRole('button',{name:'Continuar',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Já tenho conta · Entrar',exact:true})).toBeVisible();
 realRequests.length=0;
 await elder.click();
 await expect(page.getByText('Dados de demonstração',{exact:true})).toBeVisible();
 const progress=page.getByRole('progressbar',{name:'Doses confirmadas'});
 await expect(progress).toHaveAttribute('aria-valuenow','1');
 await page.getByRole('button',{name:'✓ Já tomei',exact:true}).click();
 await expect(progress).toHaveAttribute('aria-valuenow','2');
 await page.reload();
 await expect(progress).toHaveAttribute('aria-valuenow','2');
 await page.getByRole('button',{name:'Sair da demonstração',exact:true}).click();
 await caregiver.click();
 await page.getByRole('button',{name:'Acompanhar esta pessoa',exact:true}).click();
 await expect(progress).toHaveAttribute('aria-valuenow','2');
 await expect(page.getByRole('tab',{name:'SOS',exact:true})).toHaveCount(0);
 await page.getByRole('tab',{name:'Alertas',exact:true}).click();
 await page.getByRole('button',{name:'Aguardando (1)',exact:true}).click();
 await page.getByRole('button',{name:'Vou acompanhar',exact:true}).click();
 await expect(page.getByText('Nenhum alerta com esse status.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Em acompanhamento (1)',exact:true}).click();
 await expect(page.getByText('Em acompanhamento',{exact:true})).toBeVisible();
 expect(realRequests).toEqual([]);

 const separate=await browser.newContext();
 try{
   const untouched=await separate.newPage();
   await untouched.route('**/auth/demo',route=>route.fulfill({json:{items:[]}}));
   await untouched.goto(origin);
   await untouched.getByRole('button',{name:/maria\.cuidali@example\.com/}).click();
   await expect(untouched.getByRole('progressbar',{name:'Doses confirmadas'})).toHaveAttribute('aria-valuenow','1');
 }finally{await separate.close();}
});

test('menu de cuidados no celular e barra recolhível no computador',async({page})=>{
 await page.route('**/auth/demo',route=>route.fulfill({json:{items:[]}}));
 await page.goto('/');
 await page.getByRole('button',{name:/maria\.cuidali@example\.com/}).click();
 const openMenu=page.getByRole('button',{name:'Abrir menu',exact:true});
 const closeMenu=page.getByRole('button',{name:'Fechar menu',exact:true});
 await openMenu.click();
 await expect(closeMenu).toBeVisible();
 await expect(page.locator('[aria-controls="cuidali-mobile-menu"]')).toHaveAttribute('aria-expanded','true');
 const routine=page.getByRole('button',{name:'Rotina de cuidados',exact:true});
 await routine.click();
 await expect(routine).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('button',{name:'Ir para Consultas',exact:true})).toHaveCount(0);
 await routine.click();
 await page.getByRole('button',{name:'Ir para Consultas',exact:true}).click();
 await expect(closeMenu).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Adicionar consulta',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:'Idoso',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('tab',{name:'SOS',exact:true})).toBeVisible();
 await openMenu.click();
 await expect(closeMenu).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(closeMenu).toHaveCount(0);
 await expect(openMenu).toHaveAttribute('aria-expanded','false');

 await page.setViewportSize({width:1280,height:900});
 const collapse=page.getByRole('button',{name:'Recolher menu',exact:true});
 const expand=page.getByRole('button',{name:'Expandir menu',exact:true});
 await collapse.click();
 await expect(expand).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('tab',{name:'SOS',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ir para Medicamentos',exact:true})).toHaveCount(0);
 await page.reload();
 await expand.click();
 await expect(collapse).toHaveAttribute('aria-expanded','true');
 await page.getByRole('button',{name:'Ir para Medicamentos',exact:true}).click();
 await expect(page.getByRole('button',{name:'Adicionar medicamento',exact:true})).toBeVisible();
});

test('entrada, recuperação e textos de privacidade são acessíveis',async({page})=>{
 await page.goto('/');
 await expect(page.getByLabel('Logo Cuidali: cuidado entre gerações')).toBeVisible();
 await page.getByRole('button',{name:'Já tenho conta · Entrar',exact:true}).click();
 await page.getByRole('button',{name:'Esqueci minha senha',exact:true}).click();
 await expect(page.getByText('Recuperar minha senha',{exact:true})).toBeVisible();
 await expect(page.getByLabel('E-mail cadastrado',{exact:true})).toHaveAttribute('type','email');
 await page.getByRole('button',{name:'Voltar · Voltar para entrar',exact:true}).click();
 await page.getByRole('button',{name:'Política de Privacidade',exact:true}).click();
 await expect(page.getByText('Quais dados usamos',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Voltar',exact:true}).click();
 await expect(page.getByRole('button',{name:'Esqueci minha senha',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/redesign-entrada.png',fullPage:true});
});
test('idoso edita seus dados e cadastra medicamento e consulta',async({page,request})=>{
 const suffix=String(Date.now()).slice(-8),phone='116'+suffix,email='redesign'+suffix+'@example.com',password='TesteCuidali123';
 const r=await request.post(base+'/auth/register',{data:{role:'elder',name:'Pessoa de teste visual',phone,email,password,birth_date:'1960-01-01',emergency_contact:{name:'Contato fictício',phone:'11900000000',relationship:'Teste'}}});expect(r.status()).toBe(201);
 await page.goto('/');await page.getByRole('button',{name:'Já tenho conta · Entrar',exact:true}).click();
 await page.getByLabel('Telefone com DDD',{exact:true}).fill(phone);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('tab',{name:'Idoso',exact:true}).click();await page.getByRole('button',{name:'Meus dados',exact:true}).click();
 await page.getByLabel('Nome completo',{exact:true}).fill('Nome corrigido');await page.getByRole('button',{name:'Salvar meus dados',exact:true}).click();await expect(page.getByText('Seus dados foram atualizados.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Voltar',exact:true}).click();await page.getByRole('button',{name:'Medicamentos',exact:true}).click();
 await page.getByRole('button',{name:'Adicionar medicamento',exact:true}).click();
 await page.getByLabel('Medicamento',{exact:true}).fill('Medicamento cadastrado pelo idoso');await page.getByLabel('Dosagem',{exact:true}).fill('1 comprimido');
 await page.getByLabel('Início do uso',{exact:true}).fill('2026-11-13');await page.getByLabel('Fim do uso',{exact:true}).fill('2026-12-13');await page.getByLabel('Horário 1',{exact:true}).fill('20:00');
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByText('Medicamento salvo.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Editar',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Voltar',exact:true}).click();await page.getByRole('button',{name:'Consultas',exact:true}).click();await page.getByRole('button',{name:'Adicionar consulta',exact:true}).click();
 await page.getByLabel('Médico(a)',{exact:true}).fill('Dra. Teste');await page.getByLabel('Especialidade',{exact:true}).fill('Clínica geral');await page.getByLabel('Data e hora (São Paulo)',{exact:true}).fill('2026-12-01T14:00');await page.getByLabel('Local',{exact:true}).fill('Clínica fictícia');
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByText('Consulta salva.',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Início',exact:true}).click();await expect(page.getByText('Olá, Nome',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/redesign-inicio.png',fullPage:true});
});
