import { api } from '@/lib/api';
import { trackGoogleTool } from '@/lib/google-analytics';
export async function trackEvent(kind:'page_view'|'tool_started',tool?:string){
 try{
  if(localStorage.getItem('idea-analytics-consent')!=='yes'||navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)return;
  if(kind==='tool_started')trackGoogleTool(tool);
  let visitor=localStorage.getItem('idea-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('idea-visitor',visitor);}
  let session=sessionStorage.getItem('idea-session');const last=Number(sessionStorage.getItem('idea-last-event')||0);if(!session||Date.now()-last>1800000){session=crypto.randomUUID();sessionStorage.setItem('idea-session',session);}sessionStorage.setItem('idea-last-event',String(Date.now()));
  let source='Direct';if(document.referrer){const host=new URL(document.referrer).hostname;if(host!==location.hostname)source=/google\./.test(host)?'Google':/bing\./.test(host)?'Bing':/(facebook|instagram|youtube|twitter|t\.co|linkedin)\./.test(host)?'Social':'Referral';}
  const ua=navigator.userAgent;const device=/iPad|Tablet/i.test(ua)?'Tablet':/Mobi|Android/i.test(ua)?'Mobile':'Desktop';
  await api('analytics/event',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),session,visitor,kind,path:location.pathname,tool,source,device})});
 }catch{/* Analytics must never interrupt a tool or download. */}
}
