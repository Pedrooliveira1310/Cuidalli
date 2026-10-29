"""Smoke test real: python tests/browser_smoke.py (Chromium e Playwright)."""
import os
import socket
import shutil
import subprocess
import tempfile
import time
import unittest
from contextlib import ExitStack
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

class BrowserFlow(unittest.TestCase):
    def test_caregiver_and_senior(self):
        with tempfile.TemporaryDirectory() as directory, socket.socket() as sock, ExitStack() as cleanup:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
            sock.close()
            process = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env={**os.environ, 'HOST':'127.0.0.1', 'PORT':str(port), 'DATABASE_PATH':str(Path(directory)/'test.sqlite')}, stdout=subprocess.DEVNULL)
            # Stop SQLite before TemporaryDirectory removes its files on Windows.
            cleanup.callback(lambda: process.wait(timeout=10))
            cleanup.callback(process.terminate)
            base = f'http://127.0.0.1:{port}'
            for attempt in range(50):
                try:
                    with urlopen(base + '/api/health', timeout=1) as response:
                        if response.status == 200:
                            break
                except OSError:
                    time.sleep(.1)
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or p.chromium.executable_path, args=['--no-sandbox'])
                # Keep geometry checks independent of the decorative entrance animation.
                context = browser.new_context(viewport={'width':1280,'height':900}, reduced_motion='reduce')
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base)
                page.get_by_label('E-mail', exact=True).fill('ana.browser@example.com')
                page.get_by_role('button', name='Entrar', exact=True).click()
                self.assertEqual(page.get_by_label('E-mail', exact=True).input_value(), 'ana.browser@example.com')
                page.get_by_role('button', name='Criar conta', exact=True).click()
                self.assertEqual(page.get_by_label('E-mail', exact=True).input_value(), 'ana.browser@example.com')
                page.get_by_label('Seu nome', exact=True).fill('Ana Cuidadora')
                page.get_by_label('E-mail', exact=True).fill('ana.browser@example.com')
                page.get_by_label('Senha (mínimo de 10 caracteres)', exact=True).fill('senha-navegador-123')
                page.get_by_role('button', name='Criar minha conta').click()
                page.locator('.onboarding-card').get_by_role('button', name='+ Cadastrar idoso').click()
                dialog = page.get_by_role('dialog')
                dialog.get_by_label('Nome completo').fill('Maria Teste')
                dialog.get_by_label('Data de nascimento').fill('1950-05-10')
                dialog.get_by_label('Telefone com DDD').fill('11999991234')
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                page.get_by_role('button', name='Criar acesso do idoso').click()
                dialog.get_by_label('E-mail para acesso').fill('maria.browser@example.com')
                dialog.get_by_label('Senha (mínimo de 10 caracteres)', exact=True).fill('senha-idosa-123')
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                page.locator('[data-action=new-medications]').click()
                dialog.get_by_label('Medicamento', exact=True).fill('Losartana')
                dialog.get_by_label('Dosagem prescrita').fill('50 mg')
                dialog.get_by_label('Horário diário').fill('08:00')
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                page.locator('[data-action=new-contacts]').click()
                dialog.get_by_label('Nome do contato').fill('Ana')
                dialog.get_by_label('Telefone com DDD').fill('11999998888')
                dialog.get_by_label('Parentesco ou relação').fill('Filha')
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                page.locator('[data-action=new-appointments]').click()
                dialog.get_by_label('Especialidade', exact=True).fill('Cardiologia')
                dialog.get_by_label('Data e hora (fuso deste aparelho)').fill('2026-12-30T14:00')
                dialog.get_by_label('Local da consulta').fill('UBS Central')
                dialog.get_by_role('button', name='Salvar', exact=True).click()
                page.get_by_role('heading', name='Cardiologia', exact=True).wait_for()
                with page.expect_download() as download:
                    page.get_by_role('button', name='Adicionar à agenda').click()
                self.assertTrue(download.value.suggested_filename.endswith('.ics'))
                mobile = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
                elder = mobile.new_page()
                elder.on('pageerror', lambda error: errors.append(str(error)))
                elder.goto(base)
                # On narrow screens the login comes before the promotional text.
                self.assertLess(elder.locator('.auth-card').bounding_box()['y'], elder.locator('.hero-title').bounding_box()['y'])
                elder.get_by_label('E-mail', exact=True).fill('maria.browser@example.com')
                elder.get_by_label('Senha (mínimo de 10 caracteres)', exact=True).fill('senha-idosa-123')
                elder.locator('[data-action=toggle-password]').click()
                self.assertEqual(elder.get_by_label('Senha (mínimo de 10 caracteres)', exact=True).get_attribute('type'), 'text')
                elder.locator('[data-action=toggle-password]').click()
                self.assertEqual(elder.get_by_label('Senha (mínimo de 10 caracteres)', exact=True).get_attribute('type'), 'password')
                elder.get_by_role('button', name='Entrar com segurança').click()
                elder.get_by_role('heading', name='Olá, Maria!').wait_for()
                self.assertEqual(elder.locator('[data-action=new-senior]').count(), 0)
                elder.get_by_role('button', name='✓ Já tomei', exact=True).click()
                elder.get_by_text('08:00 · Já tomou').wait_for()
                page.get_by_text('08:00 · Já tomou').wait_for()
                elder.get_by_role('button', name='Assistente', exact=True).click()
                elder.get_by_label('Sua mensagem', exact=True).fill('Mensagem ainda não enviada')
                elder.get_by_role('button', name='Meus remédios', exact=True).click()
                elder.get_by_text('Seus medicamentos cadastrados:', exact=False).wait_for()
                self.assertEqual(elder.get_by_label('Sua mensagem', exact=True).input_value(), 'Mensagem ainda não enviada')
                elder.get_by_role('button', name='↻ Atualizar', exact=True).click()
                elder.get_by_text('Dados atualizados.', exact=True).wait_for()
                self.assertEqual(elder.get_by_label('Sua mensagem', exact=True).input_value(), 'Mensagem ainda não enviada')
                # Offline errors keep the draft and explicitly disclose unavailable SOS.
                mobile.set_offline(True)
                elder.locator('#network-status').wait_for(state='visible')
                elder.get_by_role('button', name='Enviar mensagem', exact=True).click()
                elder.locator('.form-error').get_by_text('Não foi possível conectar ao Cuidali.', exact=False).wait_for()
                self.assertEqual(elder.get_by_label('Sua mensagem', exact=True).input_value(), 'Mensagem ainda não enviada')
                mobile.set_offline(False)
                elder.locator('#network-status').wait_for(state='hidden')
                elder.get_by_role('button', name='↻ Atualizar', exact=True).click()
                expect(elder.get_by_label('Sua mensagem', exact=True)).to_have_value('Mensagem ainda não enviada')
                elder.get_by_role('button', name='Enviar mensagem', exact=True).click()
                expect(elder.get_by_label('Sua mensagem', exact=True)).to_have_value('')
                # Each senior has a separate draft, including across page navigation.
                first_id = page.locator('#senior-picker').input_value()
                response = context.request.post(base + '/api/seniors', data={'name':'João Teste','birth_date':'1952-03-20','phone':'11988887777','timezone':'America/Sao_Paulo'})
                self.assertEqual(response.status, 201)
                second_id = response.json()['id']
                page.get_by_role('button', name='↻ Atualizar', exact=True).click()
                page.get_by_role('button', name='Assistente', exact=True).click()
                page.get_by_label('Sua mensagem', exact=True).fill('Rascunho para Maria')
                page.locator('#senior-picker').select_option(second_id)
                expect(page.get_by_label('Sua mensagem', exact=True)).to_have_value('')
                page.get_by_label('Sua mensagem', exact=True).fill('Rascunho para João')
                page.locator('#senior-picker').select_option(first_id)
                expect(page.get_by_label('Sua mensagem', exact=True)).to_have_value('Rascunho para Maria')
                page.get_by_role('button', name='Histórico', exact=True).click()
                page.get_by_role('button', name='Assistente', exact=True).click()
                expect(page.get_by_label('Sua mensagem', exact=True)).to_have_value('Rascunho para Maria')
                page.get_by_role('button', name='Início', exact=True).click()
                elder.get_by_role('button', name='Início', exact=True).click()
                elder.get_by_role('button', name='☎ SOS · Pedir ajuda').click()
                elder.get_by_role('dialog').get_by_role('link', name='☎ Ligar para Ana').wait_for()
                page.get_by_role('heading', name='SOS · Pedido de ajuda').wait_for()
                page.get_by_role('button', name='Marcar como atendido').click()
                page.get_by_text('Atendido', exact=True).wait_for()
                elder.get_by_role('button', name='Voltar', exact=True).click()
                self.assertFalse(elder.evaluate('document.documentElement.scrollWidth > innerWidth'))
                # Keyboard access and explicit labels for all inputs rendered on login.
                elder.get_by_role('button', name='Sair', exact=True).click()
                elder.get_by_role('button', name='Entrar com segurança').wait_for()
                self.assertEqual(elder.locator('input:not([type=hidden])').count(), 2)
                self.assertTrue(elder.locator('input').evaluate_all('(inputs) => inputs.every(i => i.labels.length > 0)'))
                elder.keyboard.press('Tab')
                self.assertTrue(elder.evaluate('document.activeElement !== document.body'))
                targets = elder.locator('button:visible').evaluate_all('(buttons) => buttons.map(b => ({text:b.textContent, height:b.getBoundingClientRect().height}))')
                self.assertTrue(all(button['height'] >= 56 for button in targets), targets)
                elder.evaluate("document.styleSheets[0].insertRule('html { font-size: 36px; }', document.styleSheets[0].cssRules.length)")
                self.assertFalse(elder.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertEqual(errors, [])
                mobile.close()
                context.close()
                browser.close()

if __name__ == '__main__':
    unittest.main()
