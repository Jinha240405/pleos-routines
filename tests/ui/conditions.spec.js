import {mockNative} from './native-fixture.js';
import {test,expect} from '@playwright/test';
import {readyEditor,runRoutine} from './editor-fixture.js';
const ready=readyEditor;
test.use({hasTouch:true});
test.beforeEach(async({page})=>{await mockNative(page);await page.goto('/');await ready(page)});
async function number(page,label,value){await page.getByRole('button',{name:label+' 숫자판 열기',exact:true}).tap();const pad=page.getByRole('group',{name:label+' 숫자판',exact:true});await pad.getByRole('button',{name:'지우기',exact:true}).tap();for(const digit of String(value))await pad.getByRole('button',{name:digit,exact:true}).tap();await pad.getByRole('button',{name:'숫자 적용',exact:true}).tap();}
async function prepareReads(page,location=false){await page.evaluate(async location=>{
 const {apiNode,literal}=await import('/api.js');const {setSample}=window.__device;const first=apiNode(location?'Location.lastKnown':'Door.getCurrentDoorPosition');first.id='read-first';const second=apiNode('EvBattery.getEvBatteryStateOfCharge');second.id='read-second';
 const message=text=>({type:'action_notify',inputs:{TEXT:{block:literal(text)}}});
 const condition={type:'flow_if',id:'check',inputs:{CONDITION:{block:{type:'logic_compare',fields:{OP:'GT'},inputs:{A:{block:{type:'vehicle_signal',fields:{SIGNAL:'temperature'}}},B:{block:literal(26)}}}},THEN:{block:message('조건 연결 성공')},ELSE:{block:message('조건 미충족')}}};
 first.next={block:second};second.next={block:condition};setSample(first.fields.API,location?[]:['ROW_1_LEFT'],location?{latitude:37.5,longitude:127,accuracy:5}:0);setSample(second.fields.API,[],72);
 window.__app.addRoutine('조회 연결',{blocks:{blocks:[{type:'routine_start',next:{block:first}}]}});
},location);}
test('simple condition can be changed and executed entirely by tapping',async({page})=>{
 await page.locator('[data-type="flow_if"] .card-main').tap();await expect(page.locator('.flow-dialog .expression')).toHaveCount(0);await expect(page.locator('.flow-dialog select')).toHaveCount(0);
 await page.locator('.condition-source').tap();await page.getByRole('button',{name:'배터리 잔량',exact:true}).tap();await page.getByRole('button',{name:'미만',exact:true}).tap();await number(page,'비교할 값',30);await expect(page.locator('.condition-preview')).toContainText('배터리 잔량 30% 미만');await page.getByRole('button',{name:'적용',exact:true}).tap();
 await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').tap();await expect(page.locator('#logList')).toContainText('지금 온도가 좋아요');
});
test('an earlier result is selected by its feature name without saving a variable',async({page})=>{
 await prepareReads(page);await page.locator('[data-type="flow_if"] .card-main').tap();await page.locator('.condition-source').tap();await page.getByRole('button',{name:/문 위치 · 운전석.*읽은 결과/}).tap();await page.getByRole('button',{name:'같음',exact:true}).tap();await page.getByRole('button',{name:'적용',exact:true}).tap();
 const state=await page.evaluate(()=>window.__app.snapshot());expect(JSON.stringify(state)).toContain('"SOURCE":"read-first"');
 await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').tap();await expect(page.locator('#logList')).toContainText('조건 연결 성공');await page.reload();await ready(page);await expect(page.locator('[data-type="flow_if"]')).toContainText('문 위치');
});
test('structured results expose labelled fields with no path or JSON entry',async({page})=>{
 await prepareReads(page,true);await page.locator('[data-type="flow_if"] .card-main').tap();await page.locator('.condition-source').tap();await page.getByRole('button',{name:/현재 위치.*읽은 결과/}).tap();await page.getByRole('button',{name:'위치 정확도',exact:true}).tap();await page.getByRole('button',{name:'이하',exact:true}).tap();await number(page,'비교할 값',10);await page.getByRole('button',{name:'적용',exact:true}).tap();
 await expect(page.locator('[data-type="flow_if"]')).toContainText('위치 정확도');await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').tap();await expect(page.locator('#logList')).toContainText('조건 연결 성공');
});
test('multiple conditions use all or any and can be removed without changing the remaining condition',async({page})=>{
 await page.locator('[data-type="flow_if"] .card-main').tap();await page.getByRole('button',{name:'조건 추가',exact:true}).tap();await expect(page.locator('.condition-row')).toHaveCount(2);await page.getByRole('button',{name:'하나라도 맞으면',exact:true}).tap();await page.getByRole('button',{name:'조건 2 삭제',exact:true}).tap();await expect(page.locator('.condition-row')).toHaveCount(1);await expect(page.locator('.condition-preview')).toContainText('실내 온도 26°C 초과');await page.getByRole('button',{name:'적용',exact:true}).tap();
});
test('seventeen templates are filtered by situation and API examples still run after reload',async({page})=>{
 await page.locator('#libraryTab').tap();await expect(page.locator('#templateRoutines .routine-card')).toHaveCount(17);await page.getByRole('group',{name:'템플릿 분류'}).getByRole('button',{name:'출발',exact:true}).tap();await expect(page.locator('#templateRoutines .routine-card')).toHaveCount(3);await page.getByRole('button',{name:/동승석 안전벨트 확인.*조회 2개/}).tap();
 await page.getByRole('button',{name:'이 템플릿으로 만들기',exact:true}).tap();await expect(page.locator('[data-type="api_call"]')).toHaveCount(2);await page.reload();await ready(page);await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');await page.locator('#resultButton').tap();await expect(page.locator('#logList')).toContainText('동승석 안전벨트를 확인해 주세요');
});
test('condition dialogs keep their primary controls readable at desktop and mobile widths',async({page})=>{
 for(const [width,height] of [[1440,1000],[1220,880],[375,812]]){await page.setViewportSize({width,height});await page.locator('[data-type="flow_if"] .card-main').tap();expect(await page.locator('.flow-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);const add=await page.getByRole('button',{name:'조건 추가',exact:true}).boundingBox(),footer=await page.locator('.flow-dialog form>.dialog-actions').boundingBox();expect(add.y+add.height).toBeLessThanOrEqual(footer.y+2);await page.getByRole('button',{name:'취소',exact:true}).tap();}
});
test('an API state can be queried directly inside a condition without adding a read step',async({page})=>{
 await page.locator('[data-type="flow_if"] .card-main').tap();await page.locator('.condition-source').tap();await page.getByRole('button',{name:'다른 차량·연결 상태',exact:true}).tap();await page.getByRole('button',{name:'공조',exact:true}).tap();await page.getByRole('button',{name:/공조 전원.*상태 읽기/}).tap();await page.getByRole('button',{name:'이 상태 사용',exact:true}).tap();await page.getByRole('button',{name:'꺼짐 / 해당 없음',exact:true}).tap();await page.getByRole('button',{name:'적용',exact:true}).tap();
 await page.evaluate(async()=>{const {operation}=await import('/api.js');const op=operation('HVAC.getHvacPowerState');window.__device.setSample(op.id,op.params.map(p=>p.default),false)});
 await expect(page.locator('[data-type="api_call"]')).toHaveCount(0);await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');expect(await page.evaluate(()=>window.__device.climate)).toBe(22);
});
test('an action input can reuse an earlier read through the same simple source picker',async({page})=>{
 await page.evaluate(async()=>{const {apiNode,operation}=await import('/api.js');const read=apiNode('HVAC.getHvacTemperatureCurrent');read.id='read-temperature';read.next={block:apiNode('HVAC.setHvacTemperature')};window.__device.setSample(read.fields.API,operation(read.fields.API).params.map(p=>p.default),24);window.__app.addRoutine('읽은 온도 사용',{blocks:{blocks:[{type:'routine_start',next:{block:read}}]}})});
 await page.locator('[data-type="api_call"] .card-main').last().tap();await page.locator('.api-argument').filter({hasText:'설정 온도'}).getByRole('button',{name:'읽은 값 사용',exact:true}).tap();await page.getByRole('button',{name:/실내 온도 · 운전석.*읽은 결과/}).tap();await page.getByRole('button',{name:'적용',exact:true}).tap();
 expect(JSON.stringify(await page.evaluate(()=>window.__app.snapshot()))).toContain('"SOURCE":"read-temperature"');await runRoutine(page,'tap');await expect(page.locator('#executionState')).toHaveText('실행 완료');
});
