import React,{useState,useEffect} from 'react';
import {Text,Platform,Linking} from 'react-native';
import {api,getServer,User} from './api';
import {isBrowserDemo} from './demo';
import {BackButton,Button,Form,colors,sexField,styles as s} from './ui';

export function LegalLink({kind}:{kind:'terms'|'privacy'}) {
 const label=kind==='terms'?'Termos de Uso':'Política de Privacidade';
 const path=kind==='terms'?'/termos-de-uso.html':'/privacidade.html';
 const href=(getServer()||'https://cuidali-production.up.railway.app')+path;
 if(Platform.OS==='web') return <a href={href} target="_blank" rel="noopener noreferrer"
   style={{color:colors.blue,fontSize:18,lineHeight:"24px",paddingBlock:10}}>{label}</a>;
 return <Text accessibilityRole="link" onPress={()=>{void Linking.openURL(href);}}
   style={{color:colors.blue,fontSize:18,lineHeight:24,textDecorationLine:'underline',paddingVertical:10}}>{label}</Text>;
}

export function AccountProfile({user,onSaved}:{user:User;onSaved:(user:User)=>void}){
 const [initial,setInitial]=useState<any>(null),[message,setMessage]=useState(''),[changingPassword,setChangingPassword]=useState(false);
 useEffect(()=>{if(Platform.OS!=='web')return;const handler=(e:Event)=>setMessage((e as CustomEvent).detail.message);window.addEventListener('cuidali-biometric',handler);return()=>window.removeEventListener('cuidali-biometric',handler);},[]);
 useEffect(()=>{api('/me').then(r=>setInitial(r.user)).catch(e=>setMessage(e.message));},[]);
 if(changingPassword) return <>
  <Text style={s.title}>Alterar senha</Text>
  <Form fields={[
    {key:'current_password',label:'Senha atual',secure:true},
    {key:'password',label:'Nova senha',secure:true,newPassword:true},
    {key:'confirm_password',label:'Confirme a nova senha',secure:true,newPassword:true},
  ]} submit="Salvar nova senha" onCancel={()=>setChangingPassword(false)} onSave={async v=>{
    const result=await api('/me/password','POST',v);
    setMessage(result.message);
    setChangingPassword(false);
  }}/>
 </>;
 return <><Text style={s.title}>Meus dados</Text><Text style={s.text}>Mantenha seus dados atualizados. O e-mail permite recuperar sua senha.</Text>
 {!!message&&<Text style={s.text} accessibilityRole="alert">{message}</Text>}
 {!isBrowserDemo()&&<Button label="Alterar senha" tone="light" onPress={()=>setChangingPassword(true)} />}
 {Platform.OS==='web'&&!!window.CuidaliNative?.biometric&&<><Button label="Ativar entrada com biometria" tone="light" onPress={()=>window.CuidaliNative?.biometric?.(true)}/><Button label="Desativar entrada com biometria" tone="light" onPress={()=>{window.CuidaliNative?.disableBiometric?.();setMessage('Biometria desativada.');}}/></>}
 {initial&&<Form initial={initial} fields={[
 {key:'name',label:'Nome completo'},{key:'birth_date',label:'Nascimento',placeholder:'DD/MM/AAAA'},
 ...(user.role==='elder'?[{...sexField,optional:true}]:[]),
 {key:'phone',label:'Telefone com DDD',phone:true},{key:'email',label:'E-mail para recuperação'},
 {key:'current_password',label:'Senha atual para alterar telefone ou e-mail',secure:true,optional:true}
 ]} submit="Salvar meus dados" onSave={async v=>{const r=await api('/me','PATCH',v);setInitial(r.user);onSaved(r.user);setMessage(r.message);}}/>}</>;
}
export function PasswordRecovery({onBack}:{onBack:()=>void}){
 const [email,setEmail]=useState(''),[sent,setSent]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 return <><BackButton label="Voltar para entrar" onPress={onBack}/><Text style={s.title}>Recuperar minha senha</Text>
 <Text style={s.text}>{done?'Sua senha foi alterada. Use a nova senha para entrar.':sent?'Confira sua caixa de entrada e a pasta de spam. O código tem seis números e vale por 10 minutos.':'Informe o e-mail cadastrado na sua conta. Enviaremos um código para você criar uma nova senha.'}</Text>
 {!!message&&<Text style={s.text} accessibilityRole="alert">{message}</Text>}
 {!sent&&!done&&<Form fields={[{key:'email',label:'E-mail cadastrado'}]} submit="Receber código por e-mail" onSave={async v=>{const r=await api('/auth/forgot-password','POST',v);setEmail(v.email);setMessage(r.message);setSent(true);}}/>}
 {sent&&!done&&<><Form fields={[{key:'recovery_code',label:'Código de seis números',numeric:true},{key:'password',label:'Nova senha',secure:true,newPassword:true}]} submit="Salvar nova senha" onSave={async v=>{const r=await api('/auth/reset-password','POST',{...v,email});setMessage(r.message);setDone(true);}}/><Button label="Usar outro e-mail ou solicitar novo código" tone="light" onPress={()=>{setSent(false);setMessage('');}}/></>}
 {done&&<Button label="Entrar na minha conta" onPress={onBack}/>}</>;
}
