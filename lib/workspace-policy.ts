export const WORKSPACE_ROLES = ['client','professional','salon','shop','delivery'] as const;
export type WorkspaceRole = typeof WORKSPACE_ROLES[number];
export interface IdentityWorkspace {id:string;role:WorkspaceRole;status:string;profile:Record<string,unknown>;}
export function workspaceAvailable(role:string){return ['client','professional','salon'].includes(role);}
export function workspaceHome(role:string){return role==='shop'?'/shop/dashboard':role==='delivery'?'/delivery/dashboard':'/home';}
export function workspaceProfile(user:{id:string;first_name?:string;created_at?:unknown},workspace:IdentityWorkspace){
 const p=workspace.profile;
 const theme=typeof p.theme==='string'&&p.theme?p.theme:'not_set';
 return {
 ...p,id:user.id,workspaceId:workspace.id,role:workspace.role,
 firstName:typeof p.firstName==='string'?p.firstName:(user.first_name||''),
 displayName:p.displayName||p.firstName||user.first_name||'',
 salonName:p.salonName||p.firstName||user.first_name||'',
 phone:p.phone||'',theme,tribeBadge:p.tribeBadge||'Finding your world',
 quizCompleted:!!p.theme&&p.theme!=='not_set',subscription:{tier:'none',status:'teaser'},
 createdAt:user.created_at,
 };}
