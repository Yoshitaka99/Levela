const S_SETUP = '▶ セットアップ';
const S_APPO = 'アポ原本';
const S_CUST = '顧客管理';
const S_SET = '設定';
const S_KPI = 'KPI分析';
const S_GOAL = '目標';

const H_APPO = ['eventId','calendarId','担当者','開始日時','終了日時','日付','時間','お客様名','予定タイトル','説明','場所','ゲストメール','最終同期日時'];
const H_CUST = ['顧客ID','eventId','担当者','お客様名','面談日','面談時間','セミナー','流入経路','流入','着席','成約予定NA','着金予定日','決着日(着金日)','成約プラン','支払方法','失注理由','保留理由','失注理由詳細','証明動画','勉強会参加日','Lステ顧客ID','最終同期日時','手動メモ'];

const OPT = {
  status:['未入力','未対応','着席','飛び','キャンセル','2回目予定','成約','失注','保留','クーリングオフ'],
  yn:['未入力','対象','対象外'],
  source:['未入力','Lステ','Instagram','広告','紹介','セミナー','その他'],
  plan:['未入力','ライト','スタンダード','プレミアム','個別相談'],
  pay:['未入力','一括','分割','銀行振込','カード','その他'],
  lost:['未入力','金額','タイミング','家族反対','競合','連絡不通','その他'],
  hold:['未入力','検討中','日程待ち','家族相談','資金準備','その他']
};

function onOpen(){
  SpreadsheetApp.getUi().createMenu('🔧 dormswap')
    .addItem('🔗 カレンダー連携セットアップ','setupCalendarIntegration')
    .addItem('🔄 今すぐ同期','syncCalendarAppointments')
    .addSeparator()
    .addItem('📊 KPIを再生成','rebuildKpiDashboard')
    .addItem('🧱 シート構成を修復','ensureWorkbookStructure')
    .addItem('🧼 ひな型化（連携解除）','prepareTemplateBase')
    .addToUi();
}

function setupCalendarIntegration(){
  ensureWorkbookStructure();
  const st=sh(S_SETUP), cal=String(st.getRange('C7').getValue()||'').trim(), name=String(st.getRange('C8').getValue()||'').trim();
  if(!cal) throw new Error('C7にGoogleカレンダーのメールアドレスを入力してください。');
  if(!name) throw new Error('C8に担当者名を入力してください。');
  if(!CalendarApp.getCalendarById(cal)) throw new Error('カレンダーを取得できません。');
  PropertiesService.getDocumentProperties().setProperties({calendarId:cal,salespersonName:name});
  ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='syncCalendarAppointments')ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('syncCalendarAppointments').timeBased().everyMinutes(1).create();
  syncCalendarAppointments();
}

function syncCalendarAppointments(){
  ensureWorkbookStructure();
  const st=sh(S_SETUP), p=PropertiesService.getDocumentProperties();
  const cal=p.getProperty('calendarId')||String(st.getRange('C7').getValue()||'').trim();
  const name=p.getProperty('salespersonName')||String(st.getRange('C8').getValue()||'').trim();
  if(!cal){st.getRange('C10').setValue('⏳ 未設定');return;}
  if(!name){st.getRange('C10').setValue('⏳ 担当者名未設定');return;}
  const c=CalendarApp.getCalendarById(cal); if(!c){st.getRange('C10').setValue('❌ カレンダー取得不可');return;}
  const now=new Date(), evs=c.getEvents(addDays(now,-45),addDays(now,45));
  const old=readByKey(sh(S_CUST),H_CUST,'eventId'), app=[], byId={};
  evs.forEach(e=>{
    const text=(e.getTitle()||'')+'\n'+(e.getDescription()||'');
    if(norm(text).indexOf(norm(name))<0)return;
    const start=e.getStartTime(), cname=customerName(e,name), id=e.getId();
    app.push([id,cal,name,e.getStartTime(),e.getEndTime(),strip(start),fmt(start,'HH:mm'),cname,e.getTitle(),e.getDescription(),e.getLocation(),e.getGuestList().map(g=>g.getEmail()).join(', '),now]);
    byId[id]=customerRow(e,name,cname,now,old[id]);
  });
  replaceRows(sh(S_APPO),H_APPO,app);
  upsertCustomer(sh(S_CUST),old,byId);
  validations(); rebuildKpiDashboard();
  st.getRange('C10').setValue('✅ 最終同期: '+fmt(now,'yyyy/MM/dd HH:mm'));
}

function prepareTemplateBase(){
  if(SpreadsheetApp.getUi().alert('ひな型化しますか？','連携情報とデータを空にします。',SpreadsheetApp.getUi().ButtonSet.OK_CANCEL)!==SpreadsheetApp.getUi().Button.OK)return;
  resetTemplateBaseNoUi();
}

function resetTemplateBaseNoUi(){
  PropertiesService.getDocumentProperties().deleteAllProperties();
  ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));
  ['シート1','シート2'].forEach(n=>{const s=SpreadsheetApp.getActive().getSheetByName(n); if(s&&SpreadsheetApp.getActive().getSheets().length>1)SpreadsheetApp.getActive().deleteSheet(s);});
  resetSetup(); ensureWorkbookStructure(); clearRows(S_APPO,H_APPO.length); clearRows(S_CUST,H_CUST.length); rebuildKpiDashboard();
}

function ensureWorkbookStructure(){
  if(!sh(S_SETUP).getRange('A1').getValue())resetSetup();
  settings(); goals(); table(S_APPO,H_APPO); table(S_CUST,H_CUST); validations();
}

function rebuildKpiDashboard(){
  const s=sh(S_KPI); s.clear(); s.setHiddenGridlines(true);
  s.getRange('A1:I1').merge().setValue('営業 KPI ダッシュボード').setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#fff');
  s.getRange('A2').setValue('最終更新'); s.getRange('B2').setValue(new Date());
  s.getRange('A4:I4').merge().setValue('▼ 全体サマリー');
  s.getRange('A5:I5').setValues([['総アポ数','着席数','着席率','成約数','成約率(着席比)','飛び','キャンセル','失注','保留']]);
  s.getRange('A6').setFormula(`=COUNTA('${S_CUST}'!B2:B)`);
  s.getRange('B6').setFormula(`=COUNTIF('${S_CUST}'!J2:J,"着席")`);
  s.getRange('C6').setFormula('=IFERROR(B6/A6,0)');
  s.getRange('D6').setFormula(`=COUNTIFS('${S_CUST}'!N2:N,"<>",'${S_CUST}'!N2:N,"<>未入力")`);
  s.getRange('E6').setFormula('=IFERROR(D6/B6,0)');
  s.getRange('F6').setFormula(`=COUNTIF('${S_CUST}'!J2:J,"飛び")`);
  s.getRange('G6').setFormula(`=COUNTIF('${S_CUST}'!J2:J,"キャンセル")`);
  s.getRange('H6').setFormula(`=COUNTIFS('${S_CUST}'!P2:P,"<>",'${S_CUST}'!P2:P,"<>未入力")`);
  s.getRange('I6').setFormula(`=COUNTIFS('${S_CUST}'!Q2:Q,"<>",'${S_CUST}'!Q2:Q,"<>未入力")`);
  s.getRange('A4:I5').setFontWeight('bold').setBackground('#E5E7EB'); s.getRange('C6:E6').setNumberFormat('0.0%'); s.autoResizeColumns(1,9);
}

function resetSetup(){
  const s=sh(S_SETUP); s.clear();
  s.getRange('A1:C12').setValues([
    ['dormswap 営業管理システム — セットアップ','',''],['','',''],['','STEP 1','ファイル → コピーを作成 → 自分のGoogleドライブにコピーしてください'],['','',''],
    ['','STEP 2','C7にGoogleカレンダーのメールアドレス、C8に担当者名を入力'],['','',''],['','📧 カレンダーメール',''],['','担当者名',''],
    ['','STEP 3','メニュー「🔧 dormswap」→「🔗 カレンダー連携セットアップ」をクリック'],['','ステータス','⏳ 未設定'],['','',''],['','⚠️ 初回実行時に権限確認が表示されます。許可してください。','']
  ]);
  s.getRange('A1:C1').merge().setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#fff');
  s.getRange('B3:B10').setFontWeight('bold').setBackground('#E0F2FE'); s.getRange('C7:C8').setBackground('#FEF3C7'); s.setColumnWidth(3,560);
}

function settings(){const s=sh(S_SET); s.clear(); [['ステータス',OPT.status],['流入経路',OPT.source],['流入',OPT.yn],['着席',OPT.status],['成約予定NA',OPT.yn],['成約プラン',OPT.plan],['支払方法',OPT.pay],['失注理由',OPT.lost],['保留理由',OPT.hold]].forEach((b,i)=>{s.getRange(1,i+1).setValue(b[0]).setFontWeight('bold').setBackground('#E5E7EB');s.getRange(2,i+1,b[1].length,1).setValues(b[1].map(v=>[v]));});}
function goals(){const s=sh(S_GOAL); if(s.getLastRow()>1)return; s.getRange('A1:C6').setValues([['項目','目標値','単位'],['成約数',25,'件'],['成約率',41,'%'],['着席率',80,'%'],['着金成約率',90,'%'],['成約予定率',60,'%']]);}
function table(n,h){const s=sh(n); s.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#111827').setFontColor('#fff'); s.setFrozenRows(1);}
function validations(){const s=sh(S_CUST), r=Math.max(s.getMaxRows()-1,1); val(s.getRange(2,8,r,1),OPT.source); val(s.getRange(2,9,r,1),OPT.yn); val(s.getRange(2,10,r,1),OPT.status); val(s.getRange(2,11,r,1),OPT.yn); val(s.getRange(2,14,r,1),OPT.plan); val(s.getRange(2,15,r,1),OPT.pay); val(s.getRange(2,16,r,1),OPT.lost); val(s.getRange(2,17,r,1),OPT.hold);}
function val(r,a){r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(a,true).setAllowInvalid(false).build());}
function customerRow(e,name,cname,now,ex){const o=ex?ex.values:null, start=e.getStartTime(); const keep=(h,f)=>{if(!o)return f; const i=H_CUST.indexOf(h),v=o[i]; return v===''||v===null?f:v;}; return [keep('顧客ID','C-'+String(e.getId()).replace(/[^a-zA-Z0-9]/g,'').slice(0,12)),e.getId(),name,cname,strip(start),fmt(start,'HH:mm'),keep('セミナー',''),keep('流入経路','未入力'),keep('流入','未入力'),keep('着席','未入力'),keep('成約予定NA','未入力'),keep('着金予定日',''),keep('決着日(着金日)',''),keep('成約プラン','未入力'),keep('支払方法','未入力'),keep('失注理由','未入力'),keep('保留理由','未入力'),keep('失注理由詳細',''),keep('証明動画',''),keep('勉強会参加日',''),keep('Lステ顧客ID',''),now,keep('手動メモ','')];}
function upsertCustomer(s,old,byId){const rows=[],used={}; Object.keys(old).forEach(id=>{rows.push(byId[id]||old[id].values.slice(0,H_CUST.length)); used[id]=true;}); Object.keys(byId).forEach(id=>{if(!used[id])rows.push(byId[id]);}); replaceRows(s,H_CUST,rows);}
function replaceRows(s,h,rows){if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,Math.max(s.getLastColumn(),h.length)).clearContent(); s.getRange(1,1,1,h.length).setValues([h]); if(rows.length)s.getRange(2,1,rows.length,h.length).setValues(rows); const f=s.getFilter(); if(f)f.remove(); s.getRange(1,1,Math.max(rows.length+1,2),h.length).createFilter(); if(s.getName()===S_CUST)groupDays(s,rows.length,h.length);}
function clearRows(n,c){const s=sh(n); if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,Math.max(s.getLastColumn(),c)).clearContent(); if(s.getLastColumn()>c)s.getRange(1,c+1,s.getMaxRows(),s.getLastColumn()-c).clearContent().clearFormat().clearDataValidations();}
function groupDays(s,n,c){if(n<=0)return; s.getRange(2,1,n,c).sort([{column:5,ascending:true},{column:6,ascending:true}]); const v=s.getRange(2,1,n,c).getValues(), colors=[]; let prev='', block=-1; v.forEach((r,i)=>{const k=r[4] instanceof Date?fmt(r[4],'yyyy-MM-dd'):String(r[4]||''); if(k!==prev){prev=k; block++; s.getRange(i+2,1,1,c).setBorder(true,null,null,null,null,null,'#111827',SpreadsheetApp.BorderStyle.SOLID_MEDIUM);} colors.push(Array(c).fill(block%2?'#F8FAFC':'#FFFFFF'));}); s.getRange(2,1,n,c).setBackgrounds(colors); s.getRange(2,5,n,1).setNumberFormat('yyyy/mm/dd'); s.getRange(2,6,n,1).setNumberFormat('hh:mm'); s.getRange(2,12,n,2).setNumberFormat('yyyy/mm/dd');}
function readByKey(s,h,key){const out={}; if(!s||s.getLastRow()<2)return out; const i=h.indexOf(key), v=s.getRange(2,1,s.getLastRow()-1,Math.min(s.getLastColumn(),h.length)).getValues(); v.forEach(r=>{if(r[i])out[r[i]]={values:r};}); return out;}
function customerName(e,name){let t=String(e.getTitle()||'').split(name).join(' '), d=String(e.getDescription()||'').split(name).join(' '); const m=(t+'\n'+d).match(/(?:お客様名|顧客名|氏名|名前)[:：]\s*([^\n\r]+)/); return clean(m?m[1]:t);}
function clean(t){return String(t||'').replace(/\[[^\]]+\]/g,'').replace(/【[^】]+】/g,'').replace(/(面談|相談|個別相談|セミナー|説明会|アポ|予約|MTG|meeting|zoom)/gi,'').replace(/[【】\\[\\]()（）]/g,' ').replace(/[-_＿|｜]/g,' ').replace(/\s+/g,' ').trim()||'名称未設定';}
function norm(t){return String(t||'').toLowerCase().replace(/\s+/g,'').trim();}
function sh(n){return SpreadsheetApp.getActive().getSheetByName(n)||SpreadsheetApp.getActive().insertSheet(n);}
function addDays(d,x){const n=new Date(d); n.setDate(n.getDate()+x); return n;}
function strip(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function fmt(d,p){return Utilities.formatDate(d,Session.getScriptTimeZone(),p);}
