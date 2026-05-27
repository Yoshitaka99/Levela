const S_SETUP = '▶ セットアップ';
const S_APPO = 'アポ原本';
const S_CUST = '顧客管理';
const S_SET = '設定';
const S_KPI = 'KPI分析';
const S_GOAL = '目標';
const S_FIX = '修正分';

const BASE_HEADERS = ['日付','時間','お客様名','eventId','担当者','予定タイトル'];
const SLOTS = ['8:30 - 10:00','10:00 - 11:30','11:30 - 13:00','13:00 - 14:30','14:30 - 16:00','16:00 - 17:30','17:30 - 19:00','19:00 - 20:30','20:30 - 22:00','22:00 - 23:30'];
const APPO_HEADERS = ['eventId','calendarId','担当者','開始日時','終了日時','日付','時間','お客様名','予定タイトル','説明','場所','ゲストメール','最終同期日時'];

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
  const setup=sh(S_SETUP), calendarId=String(setup.getRange('C7').getValue()||'').trim(), name=String(setup.getRange('C8').getValue()||'').trim();
  if(!calendarId) throw new Error('C7にGoogleカレンダーのメールアドレスを入力してください。');
  if(!name) throw new Error('C8に担当者名を入力してください。');
  if(!CalendarApp.getCalendarById(calendarId)) throw new Error('カレンダーを取得できません。');
  PropertiesService.getDocumentProperties().setProperties({calendarId:calendarId,salespersonName:name});
  ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='syncCalendarAppointments')ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('syncCalendarAppointments').timeBased().everyMinutes(1).create();
  syncCalendarAppointments();
}

function syncCalendarAppointments(){
  ensureWorkbookStructure();
  const setup=sh(S_SETUP), props=PropertiesService.getDocumentProperties();
  const calendarId=props.getProperty('calendarId')||String(setup.getRange('C7').getValue()||'').trim();
  const name=props.getProperty('salespersonName')||String(setup.getRange('C8').getValue()||'').trim();
  if(!calendarId){setup.getRange('C10').setValue('⏳ 未設定');return;}
  if(!name){setup.getRange('C10').setValue('⏳ 担当者名未設定');return;}
  const cal=CalendarApp.getCalendarById(calendarId); if(!cal){setup.getRange('C10').setValue('❌ カレンダー取得不可');return;}

  const now=new Date(), events=cal.getEvents(addDays(now,-45),addDays(now,45));
  const old=readStatusByEventId();
  const matched=[], appRows=[];
  events.forEach(e=>{
    const title=e.getTitle()||'', desc=e.getDescription()||'', all=title+'\n'+desc;
    if(norm(all).indexOf(norm(name))<0)return;
    const start=e.getStartTime(), isCancel=/キャンセル/.test(title);
    const cname=(isCancel?'[キャンセル] ':'')+customerName(e,name);
    const item={eventId:e.getId(),date:strip(start),slot:slotFor(start),customer:cname,title:title,person:name,cancel:isCancel};
    matched.push(item);
    appRows.push([e.getId(),calendarId,name,e.getStartTime(),e.getEndTime(),strip(start),fmt(start,'HH:mm'),cname,title,desc,e.getLocation(),e.getGuestList().map(g=>g.getEmail()).join(', '),now]);
  });
  replaceRows(sh(S_APPO),APPO_HEADERS,appRows);
  buildCustomerSchedule(matched,old,now);
  rebuildKpiDashboard();
  setup.getRange('C10').setValue('✅ 最終同期: '+fmt(now,'yyyy/MM/dd HH:mm'));
}

function buildCustomerSchedule(items,old,now){
  const sheet=sh(S_CUST), statusHeaders=fixHeaders(), headers=BASE_HEADERS.concat(statusHeaders);
  const byDate={};
  items.forEach(x=>{const k=fmt(x.date,'yyyy-MM-dd'); if(!byDate[k])byDate[k]=[]; byDate[k].push(x);});
  const rows=[];
  Object.keys(byDate).sort().forEach(k=>{
    const d=byDate[k][0].date;
    rows.push(["'"+fmt(d,'M月d日'),'','','','',''].concat(Array(statusHeaders.length).fill('')));
    SLOTS.forEach(slot=>{
      const evs=byDate[k].filter(x=>x.slot===slot);
      const ev=evs[0];
      if(!ev){rows.push(['',slot,'','','',''].concat(Array(statusHeaders.length).fill('')));return;}
      const status=old[ev.eventId]||Array(statusHeaders.length).fill('');
      if(ev.cancel)status[0]='事前キャンセル';
      rows.push(['',slot,ev.customer,ev.eventId,ev.person,ev.title].concat(status));
    });
  });
  if(sheet.getLastRow()>0)sheet.clear();
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#111827').setFontColor('#fff');
  if(rows.length)sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  applyFixValidation(sheet,rows.length);
  formatSchedule(sheet,rows.length,headers.length);
}

function ensureWorkbookStructure(){
  if(!sh(S_SETUP).getRange('A1').getValue())resetSetup();
  table(S_APPO,APPO_HEADERS);
  if(!sh(S_CUST).getRange('A1').getValue())buildCustomerSchedule([],{},new Date());
  settings(); goals();
}

function prepareTemplateBase(){
  const ui=SpreadsheetApp.getUi();
  if(ui.alert('ひな型化しますか？','連携情報と顧客管理データを空にします。',ui.ButtonSet.OK_CANCEL)!==ui.Button.OK)return;
  resetTemplateBaseNoUi();
}

function resetTemplateBaseNoUi(){
  PropertiesService.getDocumentProperties().deleteAllProperties();
  ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));
  ['シート1','シート2'].forEach(n=>{const s=SpreadsheetApp.getActive().getSheetByName(n); if(s&&SpreadsheetApp.getActive().getSheets().length>1)SpreadsheetApp.getActive().deleteSheet(s);});
  resetSetup(); table(S_APPO,APPO_HEADERS); clearRows(S_APPO,APPO_HEADERS.length); buildCustomerSchedule([],{},new Date()); settings(); goals(); rebuildKpiDashboard();
}

function rebuildKpiDashboard(){
  const s=sh(S_KPI); s.clear(); s.clearFormats(); s.setHiddenGridlines(true);
  s.getCharts().forEach(c=>s.removeChart(c));
  s.getRange('A1:I1').merge().setValue('営業 KPI分析ダッシュボード').setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#fff');
  s.getRange('A2').setValue('最終更新'); s.getRange('B2').setValue(new Date()).setNumberFormat('yyyy/MM/dd HH:mm');
  s.getRange('D2').setValue('参照元'); s.getRange('E2').setValue(S_CUST);

  s.getRange('A4:N4').merge().setValue('全体サマリー').setFontWeight('bold').setBackground('#DBEAFE');
  s.getRange('A5:N5').setValues([['総アポ','','','着席','','','成約','','','失注','','','事前キャンセル','']]).setFontWeight('bold').setBackground('#EFF6FF');
  s.getRange('B6').setFormula(`=TEXT(COUNTIF('${S_CUST}'!C2:C,"?*"),"0")`);
  s.getRange('E6').setFormula(kpiCountFormula_('seated'));
  s.getRange('H6').setFormula(kpiCountFormula_('contract'));
  s.getRange('K6').setFormula(kpiCountFormula_('lost'));
  s.getRange('N6').setFormula(kpiCountFormula_('cancel'));
  s.getRange('B7').setFormula('=SPARKLINE(VALUE(B6),{"charttype","bar";"max",MAX(VALUE(B6),1);"color1","#2563EB"})');
  s.getRange('E7').setFormula('=SPARKLINE(VALUE(E6),{"charttype","bar";"max",MAX(VALUE(B6),1);"color1","#16A34A"})');
  s.getRange('H7').setFormula('=SPARKLINE(VALUE(H6),{"charttype","bar";"max",MAX(VALUE(B6),1);"color1","#F59E0B"})');
  s.getRange('K7').setFormula('=SPARKLINE(VALUE(K6),{"charttype","bar";"max",MAX(VALUE(B6),1);"color1","#DC2626"})');
  s.getRange('N7').setFormula('=SPARKLINE(VALUE(N6),{"charttype","bar";"max",MAX(VALUE(B6),1);"color1","#64748B"})');
  s.getRange('B6:N7').setFontSize(14);

  s.getRange('A9:I9').merge().setValue('率サマリー').setFontWeight('bold').setBackground('#DCFCE7');
  s.getRange('A10:I10').setValues([['着席率','','成約率','','失注率','','キャンセル率','','']]).setFontWeight('bold').setBackground('#F0FDF4');
  s.getRange('B11').setFormula('=IFERROR(VALUE(E6)/VALUE(B6),0)');
  s.getRange('D11').setFormula('=IFERROR(VALUE(H6)/VALUE(E6),0)');
  s.getRange('F11').setFormula('=IFERROR(VALUE(K6)/VALUE(E6),0)');
  s.getRange('H11').setFormula('=IFERROR(VALUE(N6)/VALUE(B6),0)');
  s.getRange('B11:H11').setNumberFormat('0.0%').setFontSize(14);

  s.getRange('A14:I14').merge().setValue('日別KPI').setFontWeight('bold').setBackground('#FEF3C7');
  s.getRange('A16:I16').setValues([['日付','アポ数','着席','事前キャンセル','成約','失注','着席率','成約率','失注率']]).setFontWeight('bold').setBackground('#F8FAFC');
  s.getRange('A17').setFormula(`=IFNA(FILTER('${S_CUST}'!A2:A1000,'${S_CUST}'!A2:A1000<>""),"")`);
  const dateExpr=`LOOKUP(ROW('${S_CUST}'!A$2:A$1000),FILTER(ROW('${S_CUST}'!A$2:A$1000),'${S_CUST}'!A$2:A$1000<>""),FILTER('${S_CUST}'!A$2:A$1000,'${S_CUST}'!A$2:A$1000<>""))`;
  for(let r=17;r<=60;r++){
    s.getRange(r,2).setFormula(`=IF($A${r}="","",TEXT(SUMPRODUCT(N(${dateExpr}=$A${r}),N('${S_CUST}'!C$2:C$1000<>"")),"0"))`);
    s.getRange(r,3).setFormula(kpiDailyFormula_(r,dateExpr,'seated'));
    s.getRange(r,4).setFormula(kpiDailyFormula_(r,dateExpr,'cancel'));
    s.getRange(r,5).setFormula(kpiDailyFormula_(r,dateExpr,'contract'));
    s.getRange(r,6).setFormula(kpiDailyFormula_(r,dateExpr,'lost'));
    s.getRange(r,7).setFormula(`=IF(A${r}="","",TEXT(IFERROR(VALUE(C${r})/VALUE(B${r}),0),"0.0%"))`);
    s.getRange(r,8).setFormula(`=IF(A${r}="","",TEXT(IFERROR(VALUE(E${r})/VALUE(C${r}),0),"0.0%"))`);
    s.getRange(r,9).setFormula(`=IF(A${r}="","",TEXT(IFERROR(VALUE(F${r})/VALUE(C${r}),0),"0.0%"))`);
  }
  s.getRange('A16:I60').setBorder(true,true,true,true,true,true,'#CBD5E1',SpreadsheetApp.BorderStyle.SOLID);
  s.getRange('A16:I16').setFontWeight('bold').setBackground('#F8FAFC');

  s.getRange('A64:E64').merge().setValue('ステータス別内訳').setFontWeight('bold').setBackground('#E0E7FF');
  s.getRange('A65:B65').setValues([['着席ステータス','件数']]).setFontWeight('bold').setBackground('#EEF2FF');
  s.getRange('A66').setFormula(`=QUERY('${S_CUST}'!G2:G,"select G,count(G) where G is not null group by G label G '着席ステータス', count(G) '件数'",0)`);
  s.getRange('D65:E65').setValues([['成約プラン','件数']]).setFontWeight('bold').setBackground('#EEF2FF');
  s.getRange('D66').setFormula(`=QUERY('${S_CUST}'!N2:N,"select N,count(N) where N is not null group by N label N '成約プラン', count(N) '件数'",0)`);
  s.getRange('A78:B78').setValues([['失注理由','件数']]).setFontWeight('bold').setBackground('#FEE2E2');
  s.getRange('A79').setFormula(`=QUERY('${S_CUST}'!P2:P,"select P,count(P) where P is not null group by P label P '失注理由', count(P) '件数'",0)`);

  const chart=s.newChart().asColumnChart().addRange(s.getRange('A16:F60')).setPosition(15,11,0,0)
    .setOption('title','日別 KPI 推移').setOption('legend',{position:'bottom'}).setOption('height',360).setOption('width',620).build();
  s.insertChart(chart);

  [1,2,4,5,7,8,10,11,13,14].forEach(c=>s.setColumnWidth(c,110));
  s.setColumnWidth(3,90); s.setColumnWidth(6,90); s.setFrozenRows(1);
}

function kpiJoinedStatusRange_(){
  const parts=[];
  for(let c=7;c<=16;c++){
    const col=columnLetter_(c);
    parts.push(`'${S_CUST}'!${col}$2:${col}$1000`);
  }
  return parts.join('&" "&');
}

function kpiNonEmptyStatusExpr_(){
  return `MMULT(N('${S_CUST}'!G$2:P$1000<>""),TRANSPOSE(COLUMN('${S_CUST}'!G$1:P$1)^0))`;
}

function kpiCountFormula_(type){
  const joined=kpiJoinedStatusRange_();
  const base=`N('${S_CUST}'!C$2:C$1000<>"")`;
  if(type==='seated'){
    return `=TEXT(SUMPRODUCT(${base},N('${S_CUST}'!G$2:G$1000<>"事前キャンセル"),N(${kpiNonEmptyStatusExpr_()}>0)),"0")`;
  }
  if(type==='contract'){
    return `=TEXT(SUMPRODUCT(${base},N((('${S_CUST}'!N$2:N$1000<>"")*('${S_CUST}'!N$2:N$1000<>"未入力"))+REGEXMATCH(${joined},"成約|契約|着金|入金")>0)),"0")`;
  }
  if(type==='lost'){
    return `=TEXT(SUMPRODUCT(${base},N((('${S_CUST}'!P$2:P$1000<>"")*('${S_CUST}'!P$2:P$1000<>"未入力"))+REGEXMATCH(${joined},"失注|見送り|辞退|NG|不成約")>0)),"0")`;
  }
  return `=TEXT(SUMPRODUCT(${base},N(REGEXMATCH('${S_CUST}'!G$2:G$1000&" "&'${S_CUST}'!F$2:F$1000,"キャンセル"))),"0")`;
}

function kpiDailyFormula_(row,dateExpr,type){
  const joined=kpiJoinedStatusRange_();
  const base=`N(${dateExpr}=$A${row}),N('${S_CUST}'!C$2:C$1000<>"")`;
  if(type==='seated'){
    return `=IF($A${row}="","",TEXT(SUMPRODUCT(${base},N('${S_CUST}'!G$2:G$1000<>"事前キャンセル"),N(${kpiNonEmptyStatusExpr_()}>0)),"0"))`;
  }
  if(type==='contract'){
    return `=IF($A${row}="","",TEXT(SUMPRODUCT(${base},N((('${S_CUST}'!N$2:N$1000<>"")*('${S_CUST}'!N$2:N$1000<>"未入力"))+REGEXMATCH(${joined},"成約|契約|着金|入金")>0)),"0"))`;
  }
  if(type==='lost'){
    return `=IF($A${row}="","",TEXT(SUMPRODUCT(${base},N((('${S_CUST}'!P$2:P$1000<>"")*('${S_CUST}'!P$2:P$1000<>"未入力"))+REGEXMATCH(${joined},"失注|見送り|辞退|NG|不成約")>0)),"0"))`;
  }
  return `=IF($A${row}="","",TEXT(SUMPRODUCT(${base},N(REGEXMATCH('${S_CUST}'!G$2:G$1000&" "&'${S_CUST}'!F$2:F$1000,"キャンセル"))),"0"))`;
}

function columnLetter_(col){
  let s='';
  while(col>0){const m=(col-1)%26; s=String.fromCharCode(65+m)+s; col=Math.floor((col-m)/26);}
  return s;
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

function fixHeaders(){return sh(S_FIX).getRange('A1:J1').getValues()[0].map(x=>String(x||''));}
function applyFixValidation(sheet,n){if(n<=0)return; const src=sh(S_FIX).getRange('A2:J2'), dst=sheet.getRange(2,7,n,10); src.copyTo(dst,SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,false);}
function formatSchedule(s,n,c){s.setFrozenRows(1); s.setColumnWidth(1,90); s.setColumnWidth(2,120); s.setColumnWidth(3,180); s.hideColumns(4,3); if(n<=0)return; for(let r=2;r<=n+1;r+=11){s.getRange(r,1,1,c).setBackground('#DBEAFE').setFontWeight('bold'); s.getRange(r+1,1,10,c).setBorder(true,null,true,null,null,null,'#E5E7EB',SpreadsheetApp.BorderStyle.SOLID);}}
function settings(){const s=sh(S_SET); if(s.getLastRow()>0)return; s.getRange('A1').setValue('設定');}
function goals(){const s=sh(S_GOAL); if(s.getLastRow()>1)return; s.getRange('A1:C2').setValues([['項目','目標値','単位'],['成約数',25,'件']]);}
function table(n,h){const s=sh(n); s.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#111827').setFontColor('#fff');}
function replaceRows(s,h,rows){s.clear(); table(s.getName(),h); if(rows.length)s.getRange(2,1,rows.length,h.length).setValues(rows);}
function clearRows(n,c){const s=sh(n); if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,Math.max(c,s.getLastColumn())).clearContent();}
function readStatusByEventId(){const s=sh(S_CUST), out={}; if(s.getLastRow()<2)return out; const vals=s.getRange(2,1,s.getLastRow()-1,Math.max(s.getLastColumn(),16)).getValues(); vals.forEach(r=>{if(r[3])out[r[3]]=r.slice(6,16);}); return out;}
function customerName(e,name){let t=String(e.getTitle()||'').split(name).join(' '), d=String(e.getDescription()||'').split(name).join(' '); const m=(t+'\n'+d).match(/(?:お客様名|顧客名|氏名|名前)[:：]\s*([^\n\r]+)/); return clean(m?m[1]:t);}
function clean(t){return String(t||'').replace('[キャンセル]','').replace('［キャンセル］','').replace(/\[[^\]]+\]/g,'').replace(/【[^】]+】/g,'').replace(/(面談|相談|個別相談|セミナー|説明会|アポ|予約|MTG|meeting|zoom)/gi,'').replace(/^\s*\d{1,2}[:：]\d{2}\s*/,'').replace(/[【】\[\]()（）]/g,' ').replace(/[-_＿|｜]/g,' ').replace(/\s+/g,' ').trim()||'名称未設定';}
function slotFor(d){const m=d.getHours()*60+d.getMinutes(); const starts=[510,600,690,780,870,960,1050,1140,1230,1320]; for(let i=starts.length-1;i>=0;i--)if(m>=starts[i])return SLOTS[i]; return SLOTS[0];}
function norm(t){return String(t||'').toLowerCase().replace(/\s+/g,'').trim();}
function sh(n){return SpreadsheetApp.getActive().getSheetByName(n)||SpreadsheetApp.getActive().insertSheet(n);}
function addDays(d,x){const n=new Date(d); n.setDate(n.getDate()+x); return n;}
function strip(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function fmt(d,p){return Utilities.formatDate(d,Session.getScriptTimeZone(),p);}

function repairCustomerScheduleDisplay(){
  const sheet = sh(S_CUST);
  const header = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),16)).getValues()[0].map(String);
  if (header.indexOf('面談日') >= 0 && header.indexOf('面談時間') >= 0) {
    repairScheduleFromFlatRows_();
  } else {
    repairScheduleFromCurrentLayout_();
  }
  rebuildKpiDashboard();
}

function repairScheduleFromCurrentLayout_(){
  const sheet = sh(S_CUST);
  const last = sheet.getLastRow();
  if (last < 2) return;
  const width = Math.max(sheet.getLastColumn(),16);
  const values = sheet.getRange(2,1,last-1,width).getValues();
  values.forEach((row,i) => {
    const rowNo = i + 2;
    const dateText = String(row[0] || '').trim();
    const timeText = String(row[1] || '').trim();
    const customer = String(row[2] || '').trim();
    const title = String(row[5] || '').trim();
    if (dateText && !timeText && !customer) {
      sheet.getRange(rowNo,1,1,width).setBackground('#DBEAFE').setFontWeight('bold');
      sheet.getRange(rowNo,1).setNumberFormat('@');
      return;
    }
    if (!timeText) return;
    const cancelled = isCancelTitle_(title) || isCancelTitle_(customer);
    if (cancelled) {
      sheet.getRange(rowNo,3).setValue(addCancelPrefix_(customer));
      sheet.getRange(rowNo,7).setValue('事前キャンセル');
    }
  });
  applyFixValidation(sheet, Math.max(last-1, 1));
  formatSchedule(sheet, last-1, width);
}

function repairScheduleFromFlatRows_(){
  const sheet = sh(S_CUST);
  const fix = sh(S_FIX);
  const oldValues = sheet.getDataRange().getValues();
  const oldHeader = oldValues[0].map(String);
  const at = name => oldHeader.indexOf(name);
  const statusHeaders = fix.getRange('A1:J1').getValues()[0].map(String);
  const headers = BASE_HEADERS.concat(statusHeaders);
  const rowsByDate = {};
  for (let i = 1; i < oldValues.length; i++) {
    const r = oldValues[i];
    const eventId = r[at('eventId')];
    const customer = r[at('お客様名')];
    const dateVal = r[at('面談日')];
    const timeVal = r[at('面談時間')];
    if (!eventId || !customer || !dateVal) continue;
    const date = toDateOnly_(dateVal);
    const key = fmt(date,'yyyy-MM-dd');
    const title = String(customer || '') + ' ' + String(at('予定タイトル') >= 0 ? r[at('予定タイトル')] : '');
    const cancelled = isCancelTitle_(title);
    const item = {
      eventId: eventId,
      date: date,
      slot: slotFromAny_(timeVal),
      customer: cancelled ? addCancelPrefix_(customer) : customer,
      person: at('担当者') >= 0 ? r[at('担当者')] : '',
      title: title,
      status: [
        cancelled ? '事前キャンセル' : (at('着席') >= 0 ? r[at('着席')] : ''),
        '', '', '',
        at('成約予定NA') >= 0 ? r[at('成約予定NA')] : '',
        at('着金予定日') >= 0 ? r[at('着金予定日')] : '',
        at('決着日(着金日)') >= 0 ? r[at('決着日(着金日)')] : (at('決着日') >= 0 ? r[at('決着日')] : ''),
        at('成約プラン') >= 0 ? r[at('成約プラン')] : '',
        at('支払方法') >= 0 ? r[at('支払方法')] : '',
        at('失注理由') >= 0 ? r[at('失注理由')] : ''
      ]
    };
    if (!rowsByDate[key]) rowsByDate[key] = [];
    rowsByDate[key].push(item);
  }
  const rows = [];
  Object.keys(rowsByDate).sort().forEach(key => {
    const dayItems = rowsByDate[key];
    rows.push([fmt(dayItems[0].date,'M月d日'),'','','','',''].concat(Array(10).fill('')));
    SLOTS.forEach(slot => {
      const evs = dayItems.filter(x => x.slot === slot);
      if (!evs.length) {
        rows.push(['',slot,'','','',''].concat(Array(10).fill('')));
        return;
      }
      const ev = evs[0];
      rows.push(['',slot,ev.customer,ev.eventId,ev.person,ev.title].concat(ev.status));
    });
  });
  sheet.clear();
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#111827').setFontColor('#fff');
  if (rows.length) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  applyFixValidation(sheet, rows.length);
  formatSchedule(sheet, rows.length, headers.length);
}

function isCancelTitle_(text){
  return /キャンセル/.test(String(text || ''));
}

function addCancelPrefix_(name){
  const text = String(name || '').trim();
  if (!text) return '[キャンセル]';
  return isCancelTitle_(text) ? text : '[キャンセル] ' + text;
}

function toDateOnly_(v){
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const d = new Date(v);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function slotFromAny_(v){
  if (v instanceof Date) return slotFor(v);
  let minutes = 0;
  if (typeof v === 'number') {
    minutes = Math.round(v * 24 * 60);
  } else {
    const m = String(v || '').match(/(\d{1,2})[:：](\d{2})/);
    minutes = m ? Number(m[1]) * 60 + Number(m[2]) : 510;
  }
  const starts = [510,600,690,780,870,960,1050,1140,1230,1320];
  for (let i = starts.length - 1; i >= 0; i--) if (minutes >= starts[i]) return SLOTS[i];
  return SLOTS[0];
}
