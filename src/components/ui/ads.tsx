'use client';
import { useEffect,useState } from 'react';
import { api } from '@/lib/api';
export function AdSlot({placement='banner'}:{enabled?:boolean;placement?:string}){
 const [ads,setAds]=useState<Record<string,unknown>[]>([]);
 useEffect(()=>{api<Record<string,unknown>[]>('public/ads').then(rows=>setAds(rows.filter(a=>a.placement===placement).sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)))).catch(()=>{});},[placement]);
 if(!ads.length)return null;
 return <aside className="managed-ads" aria-label="Advertisement">{ads.map(a=><div key={String(a.id)} className={'managed-ad ad-device-'+a.device}><small>Advertisement</small>{a.type==='html'?<iframe title={String(a.name)} sandbox="allow-scripts allow-popups" referrerPolicy="no-referrer" srcDoc={String(a.html||'')} loading="lazy"/>:<a href={String(a.destination)} target="_blank" rel="sponsored noopener noreferrer"><img src={String(a.image)} alt={String(a.name)} loading="lazy"/></a>}</div>)}</aside>;
}
export const AdBanner = AdSlot;
export const AdSidebar = AdSlot;
export const AdToolTop = AdSlot;
export const AdToolBottom = AdSlot;
