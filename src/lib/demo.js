import data from '../../data/elisabeth-2026.json';
export const demoProductions=[data.production];
export const demoSessions=data.performances;
export function demoImport(production,existing){return existing.slice(0,3).map(row=>({...structuredClone(row),id:crypto.randomUUID()}));}
