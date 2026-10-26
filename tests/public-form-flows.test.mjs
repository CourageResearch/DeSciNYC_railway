import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { detectBot } from '../lib/botProtection.ts';
import { verifyTurnstileToken } from '../lib/turnstile.ts';

function loadRoute(file, mocks, env = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const {outputText} = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports = {};
  const sandbox = {
    exports, process:{env}, console:{error(){},warn(){},log(){},info(){}}, URLSearchParams, AbortSignal,
    fetch: mocks.fetch,
    require(name) {
      if (name === 'next/server') return {NextResponse:{json:Response.json}};
      if (name in mocks) return mocks[name];
      throw new Error('Unexpected import '+name);
    },
  };
  vm.runInNewContext(outputText,sandbox,{filename:file});
  return exports;
}

function subscription({env={LUMA_API_KEY:'qa',LUMA_WEBSITE_TAG:'tag-qa'},upcoming=[],eventError=false,importFailure=false,emailFailure=false}={}) {
  const calls={imports:[],emails:[]};
  const route=loadRoute('app/api/subscribe/route.ts',{
    '@/lib/events':{getUpcomingEvents:async()=>{if(eventError)throw new Error('DB unavailable');return upcoming;}},
    '@/lib/luma':{getLumaEvent:async()=>null},
    '@/lib/form-email-notifications':{sendSubscriptionEmails:async(value)=>{calls.emails.push(value);if(emailFailure)throw new Error('Mail unavailable');}},
    fetch:async(url,options)=>{calls.imports.push({url,body:JSON.parse(options.body)});return Response.json({}, {status:importFailure?503:200});},
  },env);
  return {route,calls};
}
const request=(body)=>new Request('http://localhost/api/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('email signup succeeds without a CAPTCHA and imports the normalized address',async()=>{
  const {route,calls}=subscription();
  const response=await route.POST(request({email:'  qa@example.com  '}));
  assert.equal(response.status,200);
  assert.equal(calls.imports.length,1);
  assert.equal(calls.imports[0].body.infos[0].email,'qa@example.com');
  assert.equal(calls.emails.length,1);
});
test('invalid email and malformed request bodies never reach providers',async()=>{
  for(const value of [{email:'not-an-email'},{email:['qa@example.com']},null,[]]){
    const {route,calls}=subscription();
    assert.equal((await route.POST(request(value))).status,400);
    assert.equal(calls.imports.length,0);
  }
  const {route}=subscription();
  assert.equal((await route.POST(new Request('http://localhost',{method:'POST',body:'{broken'}))).status,400);
});
test('missing Luma configuration cannot claim a successful signup',async()=>{
  for(const env of [{LUMA_API_KEY:'qa'},{LUMA_WEBSITE_TAG:'tag-qa'}]){
    const {route,calls}=subscription({env});
    assert.equal((await route.POST(request({email:'qa@example.com'}))).status,503);
    assert.equal(calls.imports.length,0);
    assert.equal(calls.emails.length,0);
  }
});
test('a rejected Luma import does not send confirmation email',async()=>{
  const {route,calls}=subscription({importFailure:true});
  assert.equal((await route.POST(request({email:'qa@example.com'}))).status,502);
  assert.equal(calls.emails.length,0);
});
test('event lookup failure cannot undo an already completed signup',async()=>{
  const {route,calls}=subscription({eventError:true});
  assert.equal((await route.POST(request({email:'qa@example.com'}))).status,200);
  assert.equal(calls.imports.length,1);
  assert.equal(calls.emails.length,1);
  assert.equal(calls.emails[0].nextEvent,null);
});
test('welcome email failure does not falsely report a failed signup',async()=>{
  const {route}=subscription({emailFailure:true});
  assert.equal((await route.POST(request({email:'qa@example.com'}))).status,200);
});

const browserData = () => ({
  timestamp:Date.now(),formStartTime:Date.now()-10000,screenResolution:'1920x1080',
  honeypot:'',honeypot2:'',honeypot3:'',userAgent:'Mozilla/5.0',
});
function messageRoute(kind,{
  deliveryFailure=false,
  verificationPass=true,
  verificationAction=kind === 'send-email' ? 'contact_form' : 'suggest_speaker',
  verificationHostname='desci.nyc',
  verificationError=false,
  secretKey='qa-secret',
}={}) {
  const calls=[];
  const send=async data=>{calls.push(data);if(deliveryFailure)throw new Error('QA delivery failure');};
  const route=loadRoute(`app/api/${kind}/route.ts`,{
    '@/lib/botProtection':{detectBot},
    '@/lib/form-email-notifications':{sendContactEmails:send,sendSpeakerSuggestionEmails:send},
    '@/lib/public-form-rate-limit':{runPublicFormAction:async(_req,_scope,action)=>({allowed:true,result:await action()})},
    '@/lib/turnstile':{verifyTurnstileToken:options=>verifyTurnstileToken({
      ...options,
      fetchImpl:async()=>{
        if (verificationError) throw new Error('Verification unavailable');
        return Response.json({success:verificationPass,hostname:verificationHostname,action:verificationAction});
      },
    })},
  },{TURNSTILE_SECRET_KEY:secretKey});
  return {route,calls};
}
const contact = (overrides = {}) => ({
  ...browserData(),type:'contact',message:'A useful message',captchaToken:'qa-token',...overrides,
});
test('verified contact messages accept an omitted email and reject invalid provided email',async()=>{
  const {route,calls}=messageRoute('send-email');
  for(const email of ['', 'qa@example.com']) assert.equal((await route.POST(request(contact({email})))).status,200);
  assert.equal(calls.length,2);
  assert.equal((await route.POST(request(contact({email:'invalid'})))).status,400);
  assert.equal(calls.length,2);
});
test('contact empty messages, honeypots, malformed JSON, and invalid types do not send mail',async()=>{
  const {route,calls}=messageRoute('send-email');
  for(const body of [null,{}, contact({message:' '}),contact({honeypot:'spam'})]) assert.equal((await route.POST(request(body))).status,400);
  assert.equal((await route.POST(new Request('http://localhost',{method:'POST',body:'{broken'}))).status,400);
  assert.equal(calls.length,0);
});
test('failed contact delivery reports failure so the user can retry',async()=>{
  const {route}=messageRoute('send-email',{deliveryFailure:true});
  assert.equal((await route.POST(request(contact()))).status,500);
});
test('direct contact spam cannot send email without a genuine verification token',async()=>{
  const {route,calls}=messageRoute('send-email');
  for (const captchaToken of [undefined,'',null,123,{},'x'.repeat(2049)]) {
    const response=await route.POST(request(contact({
      name:'fjpgSkUcmHVhledQNYjx',email:'spam-test@example.com',
      phone:'5550101234',message:'sZlxHmVfDrZLvObs',captchaToken,
    })));
    assert.equal(response.status,400);
    assert.match((await response.json()).error,/human verification/i);
  }
  assert.equal(calls.length,0);
});
test('contact rejects forged tokens, tokens for another form/site, and verification outages',async()=>{
  for (const [options,status] of [
    [{verificationPass:false},400],
    [{verificationAction:'suggest_speaker'},400],
    [{verificationHostname:'other.example'},400],
    [{verificationError:true},503],
    [{secretKey:''},503],
  ]) {
    const {route,calls}=messageRoute('send-email',options);
    assert.equal((await route.POST(request(contact()))).status,status);
    assert.equal(calls.length,0);
  }
});
const suggestion = () => ({...browserData(),yourName:'QA Tester',yourEmail:'qa@example.com',speakerName:'QA Speaker',speakerEmail:'speaker@example.com',speakerBio:'A qualified test speaker.',captchaToken:'qa-token'});
test('speaker suggestions only send after valid human verification',async()=>{
  const accepted=messageRoute('suggest-speaker');
  assert.equal((await accepted.route.POST(request(suggestion()))).status,200);
  assert.equal(accepted.calls.length,1);
  const rejected=messageRoute('suggest-speaker',{verificationPass:false});
  assert.equal((await rejected.route.POST(request(suggestion()))).status,400);
  assert.equal(rejected.calls.length,0);
  assert.equal((await accepted.route.POST(request({...suggestion(),captchaToken:''}))).status,400);
  assert.equal(accepted.calls.length,1);
});
test('speaker malformed bodies and invalid fields are rejected without mail',async()=>{
  const {route,calls}=messageRoute('suggest-speaker');
  for(const body of [null,[],{...suggestion(),speakerEmail:'invalid'},{...suggestion(),speakerBio:'x'}]) assert.equal((await route.POST(request(body))).status,400);
  assert.equal(calls.length,0);
});
test('subscription welcome email is attempted even when the admin notification fails',async()=>{
  const emails=[];
  const module=loadRoute('lib/form-email-notifications.ts',{
    'server-only':{},
    '@/lib/admin-email-preferences':{shouldSendAdminEmailNotification:async()=>true},
    '@/types/adminEmails':{ADMIN_EMAILS:['admin@example.com']},
    'resend': {
      Resend: class {
        emails = {
          send: async (email) => {
            emails.push(email);
            return email.to.includes('admin@example.com')
              ? {error:{message:'QA failure'}}
              : {data:{id:'qa-sent'}};
          },
        };
      },
    },
  },{RESEND_API_KEY:'qa-key'});
  await module.sendSubscriptionEmails({email:'subscriber@example.com',nextEvent:null});
  assert.equal(emails.length,2);
  assert.equal(emails[1].to[0],'subscriber@example.com');
  assert.equal(emails[1].subject,'Welcome to DeSciNYC!');
});
