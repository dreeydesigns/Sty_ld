const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function fixture(storage=new Map()) {
 const code=ts.transpileModule(fs.readFileSync('lib/booking-store.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 const window={sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 vm.runInNewContext(`(function(require,module,exports){${code}})`,{window,Date,console})((name)=>name==='@/lib/site-data'?{bookingDates:[],bookingTimes:[]}:require(name),module,module.exports);
 return {...module.exports,storage};
}
test('guest draft survives a fresh store without persisting contact details',()=>{
 const a=fixture();const state=a.useBookingStore.getState();state.setTarget('salons','sample');state.setSelectedServices(['service1']);state.setDate('2099-01-01');state.setTime('10:00');state.setContact('email','private@example.test');state.setContact('note','private address');state.saveBookingDraft();
 const raw=a.storage.get(a.BOOKING_DRAFT_CACHE_KEY);assert.ok(!raw.includes('private'));assert.ok(!raw.includes('contact'));
 const b=fixture(a.storage);assert.equal(b.useBookingStore.getState().restoreBookingDraft(),true);assert.equal(b.useBookingStore.getState().targetId,'sample');assert.equal(b.useBookingStore.getState().contact.email,'');
});
test('expired and malformed draft values are rejected',()=>{
 const a=fixture();a.storage.set(a.BOOKING_DRAFT_CACHE_KEY,JSON.stringify({targetType:'salons',targetId:null,selectedServiceIds:[],selectedDate:'2099-01-01',selectedTime:'10:00',savedAt:'2000-01-01'}));assert.equal(a.useBookingStore.getState().restoreBookingDraft(),false);
 a.storage.set(a.BOOKING_DRAFT_CACHE_KEY,'{broken');assert.equal(a.useBookingStore.getState().restoreBookingDraft(),false);
});
