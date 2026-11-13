import {test,expect} from '@playwright/test';
test('assistente e sessão web',async({page,request})=>{
 page.on('pageerror',e=>console.log('ERROR '+e.message));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE '+m.text());});
 const phone='117'+String(Date.now()).slice(-8), password='TesteCuidali123';
 const r=await request.post('http://127.0.0.1:8010/auth/register',{data:{role:'elder',name:'Teste Assistente',birth_date:'1960-01-01',phone,password,emergency_contact:{name:'Contato teste',phone:'11900000000',relationship:'Família'}}});expect(r.status()).toBe(201);
 await page.goto('/');await page.getByRole('button',{name:'Já tenho conta · Entrar'}).click();await page.getByLabel('Telefone com DDD',{exact:true}).fill(phone);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Assistente',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Assistente',exact:true}).click();
 console.log('AFTER CLICK',await page.getByRole('tab',{name:'Assistente',exact:true}).getAttribute('aria-selected'));
 await expect(page.getByText('Seu assistente',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Minhas consultas',exact:true}).click();
 await expect(page.getByText('Você não tem próximas consultas cadastradas.',{exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/assistente-final.png',fullPage:true});
 await page.reload();await expect(page.getByRole('tab',{name:'Início',exact:true})).toBeVisible();
});
