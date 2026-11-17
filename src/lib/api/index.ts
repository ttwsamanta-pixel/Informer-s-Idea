export async function api<T=unknown>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch('/api/v1/'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});
 const json=await response.json();if(!response.ok||!json.success)throw new Error(json.message||'Request failed.');return json.data as T;
}
