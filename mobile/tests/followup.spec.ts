import {test,expect} from '@playwright/test';
const base=process.env.E2E_API_URL||'http://127.0.0.1:8010';
test('bem-estar, dores e assistente com interpretação de horários',async({page,request})=>{
 const suffix=String(Date.now()).slice(-8),phone='114'+suffix,password='TesteCuidali2026';
 const registered=await request.post(base+'/auth/register',{data:{role:'elder',name:'Validação do assistente',birth_date:'1960-01-01',phone,email:'assistant'+suffix+'@example.com',password,emergency_contact:{name:'Contato fictício',phone:'11900000000',relationship:'Teste'}}});expect(registered.status()).toBe(201);
 await page.goto('/');await page.getByRole('button',{name:'Já tenho conta · Entrar',exact:true}).click();await page.getByLabel('Telefone com DDD',{exact:true}).fill(phone);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:'Estou bem hoje',exact:true}).click();
 await expect(page.getByText('Seu cuidador já pode ver que você está bem hoje.',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Idoso',exact:true}).click();await page.getByRole('button',{name:'Dores',exact:true}).click();
 const refreshed=page.waitForResponse(r=>r.url().includes('/pains')&&r.request().method()==='GET');await page.getByRole('button',{name:'↻ Ver registros mais recentes',exact:true}).click();expect((await refreshed).ok()).toBeTruthy();
 await page.getByRole('button',{name:'Registrar uma dor',exact:true}).click();
 await expect(page.getByText('Toque onde dói. Selecione a frente ou as costas para encontrar a região.',{exact:true})).toBeVisible();
 await expect(page.getByText('Direita e esquerda são sempre os lados da pessoa que sente a dor.',{exact:true})).toHaveCount(0);
 await page.getByRole('tab',{name:'Assistente',exact:true}).click();
 for(const phrase of ['Que horas é a novela da Globo?','A novela de hoje começa a que horas?']){
  await page.getByLabel('Mensagem para o assistente',{exact:true}).fill(phrase);
  const received=page.waitForResponse(r=>r.url().endsWith('/assistant')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Enviar',exact:true}).click();const reply=await(await received).json();
  expect(reply.reply).toContain('Não tenho acesso');expect(reply.reply).not.toContain('Agora são');expect(reply.action).toBeNull();
 }
 await page.getByLabel('Mensagem para o assistente',{exact:true}).fill('Que horas são?');
 const clock=page.waitForResponse(r=>r.url().endsWith('/assistant')&&r.request().method()==='POST');await page.getByRole('button',{name:'Enviar',exact:true}).click();expect((await(await clock).json()).reply).toContain('Agora são');
 await page.getByLabel('Mensagem para o assistente',{exact:true}).fill('Qual o horário da minha consulta?');
 const agenda=page.waitForResponse(r=>r.url().endsWith('/assistant')&&r.request().method()==='POST');await page.getByRole('button',{name:'Enviar',exact:true}).click();expect((await(await agenda).json()).action).toBe('Consultas');
 await expect(page.getByText('Cuidali',{exact:true})).toHaveCount(1);
});
test('alteração de contato exige senha e persiste depois de entrar novamente',async({page,request})=>{
 const suffix=String(Date.now()).slice(-8),phone='113'+suffix,newPhone='112'+suffix,password='TesteCuidali2026',email='profile'+suffix+'@example.com',newEmail='updated'+suffix+'@example.com';
 const registered=await request.post(base+'/auth/register',{data:{role:'elder',name:'Validação de dados',birth_date:'1960-01-01',phone,email,password,emergency_contact:{name:'Contato fictício',phone:'11900000000',relationship:'Teste'}}});expect(registered.status()).toBe(201);
 await page.goto('/');await page.getByRole('button',{name:'Já tenho conta · Entrar',exact:true}).click();await page.getByLabel('Telefone com DDD',{exact:true}).fill(phone);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('tab',{name:'Idoso',exact:true}).click();await page.getByRole('button',{name:'Meus dados',exact:true}).click();
 await page.getByLabel('Telefone com DDD',{exact:true}).fill(newPhone);await page.getByLabel('E-mail para recuperação',{exact:true}).fill(newEmail);await page.getByLabel('Senha atual para alterar telefone ou e-mail',{exact:true}).fill('SenhaIncorreta');
 await page.getByRole('button',{name:'Salvar meus dados',exact:true}).click();await expect(page.getByText('Confira sua senha atual para alterar telefone ou e-mail.',{exact:true})).toBeVisible();
 const unchanged=await request.post(base+'/auth/login',{data:{phone,password}});expect(unchanged.ok()).toBeTruthy();
 await page.getByLabel('Senha atual para alterar telefone ou e-mail',{exact:true}).fill(password);await page.getByRole('button',{name:'Salvar meus dados',exact:true}).click();await expect(page.getByText('Seus dados foram atualizados.',{exact:true})).toBeVisible();
 const oldLogin=await request.post(base+'/auth/login',{data:{phone,password}});expect(oldLogin.status()).toBe(401);
 const newLogin=await request.post(base+'/auth/login',{data:{phone:newPhone,password}});expect(newLogin.ok()).toBeTruthy();const account=await newLogin.json();expect(account.user.email).toBe(newEmail);
 await page.reload();await page.getByRole('tab',{name:'Idoso',exact:true}).click();await page.getByRole('button',{name:'Meus dados',exact:true}).click();await expect(page.getByLabel('Telefone com DDD',{exact:true})).toHaveValue(newPhone);await expect(page.getByLabel('E-mail para recuperação',{exact:true})).toHaveValue(newEmail);
});
