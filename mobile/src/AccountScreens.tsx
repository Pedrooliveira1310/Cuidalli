import React,{useState,useEffect} from 'react';
import {Text,View,Platform} from 'react-native';
import {api,User} from './api';
import {BackButton,Button,Card,Form,styles as s} from './ui';

export function AccountProfile({user,onSaved}:{user:User;onSaved:(user:User)=>void}){
 const [initial,setInitial]=useState<any>(null),[message,setMessage]=useState('');
 useEffect(()=>{if(Platform.OS!=='web')return;const handler=(e:Event)=>setMessage((e as CustomEvent).detail.message);window.addEventListener('cuidali-biometric',handler);return()=>window.removeEventListener('cuidali-biometric',handler);},[]);
 useEffect(()=>{api('/me').then(r=>setInitial(r.user)).catch(e=>setMessage(e.message));},[]);
 return <><Text style={s.title}>Meus dados</Text><Text style={s.text}>Mantenha seus dados atualizados. O e-mail permite recuperar sua senha.</Text>
 {!!message&&<Text style={s.text} accessibilityRole="alert">{message}</Text>}
 {Platform.OS==='web'&&!!window.CuidaliNative?.biometric&&<><Button label="Ativar entrada com biometria" tone="light" onPress={()=>window.CuidaliNative?.biometric?.(true)}/><Button label="Desativar entrada com biometria" tone="light" onPress={()=>{window.CuidaliNative?.disableBiometric?.();setMessage('Biometria desativada.');}}/></>}
 {initial&&<Form initial={initial} fields={[
 {key:'name',label:'Nome completo'},{key:'birth_date',label:'Nascimento',placeholder:'DD/MM/AAAA'},
 {key:'phone',label:'Telefone com DDD',phone:true},{key:'email',label:'E-mail para recuperação'},
 {key:'current_password',label:'Senha atual para alterar telefone ou e-mail',secure:true,optional:true}
 ]} submit="Salvar meus dados" onSave={async v=>{const r=await api('/me','PATCH',v);onSaved(r.user);setMessage(r.message);}}/>}</>;
}
export function PasswordRecovery({onBack}:{onBack:()=>void}){
 const [email,setEmail]=useState(''),[sent,setSent]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 return <><BackButton label="Voltar para entrar" onPress={onBack}/><Text style={s.title}>Recuperar minha senha</Text>
 <Text style={s.text}>{done?'Sua senha foi alterada. Use a nova senha para entrar.':sent?'Confira sua caixa de entrada e a pasta de spam. O código tem seis números e vale por 10 minutos.':'Informe o e-mail cadastrado na sua conta. Enviaremos um código para você criar uma nova senha.'}</Text>
 {!!message&&<Text style={s.text} accessibilityRole="alert">{message}</Text>}
 {!sent&&!done&&<Form fields={[{key:'email',label:'E-mail cadastrado'}]} submit="Receber código por e-mail" onSave={async v=>{const r=await api('/auth/forgot-password','POST',v);setEmail(v.email);setMessage(r.message);setSent(true);}}/>}
 {sent&&!done&&<><Form fields={[{key:'recovery_code',label:'Código de seis números',numeric:true},{key:'password',label:'Nova senha',secure:true}]} submit="Salvar nova senha" onSave={async v=>{const r=await api('/auth/reset-password','POST',{...v,email});setMessage(r.message);setDone(true);}}/><Button label="Usar outro e-mail ou solicitar novo código" tone="light" onPress={()=>{setSent(false);setMessage('');}}/></>}
 {done&&<Button label="Entrar na minha conta" onPress={onBack}/>}</>;
}

export function LegalInformation({kind,onBack}:{kind:'terms'|'privacy';onBack:()=>void}){
 const privacy=kind==='privacy';
 const sections=privacy?[
 ['Quais dados usamos','Seu nome, nascimento, telefone e e-mail identificam sua conta. Medicamentos, consultas, registros de dor, atividade e pedidos de ajuda apoiam sua rotina de cuidado. São informações pessoais, incluindo dados de saúde.'],
 ['Com quem compartilhamos','Os cuidadores vinculados por você podem consultar seus registros e acompanhar os pedidos de ajuda. Você pode remover vínculos em Idoso → Vínculos. Serviços de hospedagem armazenam os dados; o Firebase entrega notificações; o serviço de e-mail entrega códigos de recuperação.'],
 ['Voz e biometria','A voz é reconhecida pelo serviço disponível no aparelho ou navegador. O texto reconhecido e as respostas ficam no histórico do assistente, acessível aos cuidadores vinculados. A biometria é verificada pelo Android; o Cuidali não recebe sua impressão digital nem imagem do rosto.'],
 ['Suas escolhas','Você pode editar seus dados, revogar vínculos, desativar avisos e sair da conta neste aparelho. Informações de acesso são protegidas; senhas são armazenadas como hashes. Os registros persistem para manter seu histórico de cuidado.'],
 ['Acesso, correção e exclusão','A Kannali Corp é responsável pelo Cuidali. Para solicitar acesso, cópia, correção ou exclusão dos seus dados, entre em contato pelo e-mail kannalicorp@gmail.com. Informe o pedido sem enviar senhas. A equipe poderá confirmar sua identidade antes de atender à solicitação.']
 ]:[
 ['Para que serve','O Cuidali ajuda pessoas idosas e seus cuidadores a organizar medicamentos, consultas, registros de dor e pedidos de ajuda. Você controla quais cuidadores podem acompanhar seus dados por meio de vínculos.'],
 ['Cuidados com sua conta','Use dados corretos, mantenha sua senha e seus códigos de recuperação em segredo e compartilhe códigos de vínculo somente com pessoas de confiança. Antes de usar biometria em aparelho compartilhado, considere quem possui biometria cadastrada nele.'],
 ['Medicamentos e consultas','Registre somente informações conferidas com sua prescrição e com os profissionais responsáveis pelo seu cuidado. O assistente não faz diagnósticos e não altera prescrições.'],
 ['Pedidos de ajuda','O SOS registra o pedido e avisa os cuidadores vinculados. O recebimento depende de internet, permissões e condições do aparelho. O discador permite ligar para seu contato; o aplicativo não garante atendimento e não substitui serviços de emergência.'],
 ['Disponibilidade e privacidade','A aplicação pode ficar indisponível por manutenção ou falha de conexão. Você pode interromper o uso, revogar vínculos e solicitar informações à Kannali Corp pelo e-mail kannalicorp@gmail.com. A Política de Privacidade explica o tratamento de dados.']
 ];
 return <><BackButton onPress={onBack}/><Text style={s.title}>{privacy?'Política de Privacidade':'Termos de Uso'}</Text><Text style={s.muted}>Versão de 13 de novembro de 2026</Text>{sections.map(([title,body])=><Card key={title}><Text style={s.subtitle}>{title}</Text><Text selectable style={s.text}>{body}</Text></Card>)}</>;
}
