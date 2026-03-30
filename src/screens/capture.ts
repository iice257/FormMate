// @ts-nocheck
import { getState, setState } from '../state';
import { navigateTo } from '../router';
import { toast } from '../components/toast';
import { capturedPayloadToFormData } from '../parser/capture-parser';

function randomToken() {
  return `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildBookmarklet(appOrigin, token) {
  const js = `
(function(){
  try {
    var APP_ORIGIN=${JSON.stringify(appOrigin)};
    var TOKEN=${JSON.stringify(token)};
    function text(el){ return (el && (el.innerText || el.textContent) || '').trim(); }
    function labelFor(el){
      if(!el) return '';
      var id = el.getAttribute('id');
      if(id){
        var lbl = document.querySelector('label[for=\"'+CSS.escape(id)+'\"]');
        if(lbl) return text(lbl);
      }
      if(el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
      var ph = el.getAttribute('placeholder');
      if(ph) return ph.trim();
      var p = el.closest('label');
      if(p) return text(p);
      return '';
    }
    function isHidden(el){
      if(!el) return true;
      if(el.type==='hidden') return true;
      if(el.getAttribute('aria-hidden')==='true') return true;
      var s = window.getComputedStyle(el);
      return s.display==='none' || s.visibility==='hidden';
    }

    var payload={version:1,pageUrl:location.href,title:document.title,description:'',fields:[]};
    var h1 = document.querySelector('h1');
    if(h1) payload.title = text(h1) || payload.title;
    var desc = document.querySelector('meta[name=\"description\"]')?.getAttribute('content');
    if(desc) payload.description = desc.trim();

    var inputs=[].slice.call(document.querySelectorAll('input,textarea,select')).filter(function(el){
      return el && !el.disabled && !isHidden(el);
    });

    // Group radios/checkboxes by name
    var radioGroups=new Map();
    var checkboxGroups=new Map();

    inputs.forEach(function(el){
      var t=(el.tagName.toLowerCase()==='textarea')?'textarea':(el.tagName.toLowerCase()==='select')?'select':(el.getAttribute('type')||'text').toLowerCase();
      if(t==='radio'){
        var name=el.getAttribute('name')||('__radio_'+labelFor(el));
        if(!radioGroups.has(name)) radioGroups.set(name, []);
        radioGroups.get(name).push(el);
        return;
      }
      if(t==='checkbox'){
        var cname=el.getAttribute('name')||('__checkbox_'+labelFor(el));
        if(!checkboxGroups.has(cname)) checkboxGroups.set(cname, []);
        checkboxGroups.get(cname).push(el);
        return;
      }
      var field={label:labelFor(el)||('Field '+(payload.fields.length+1)),type:t,required:!!(el.required||el.getAttribute('aria-required')==='true'),options:[]};
      if(t==='select'){
        field.options=[].slice.call(el.querySelectorAll('option')).map(function(o){return (o.textContent||'').trim();}).filter(Boolean);
      }
      payload.fields.push(field);
    });

    radioGroups.forEach(function(group, name){
      var first=group[0];
      var fieldLabel=labelFor(first) || name.replace(/^__radio_/, '') || 'Radio';
      var opts=group.map(function(r){
        var id=r.getAttribute('id');
        var l=id?document.querySelector('label[for=\"'+CSS.escape(id)+'\"]'):null;
        return (l?text(l):'') || (r.value||'').trim() || (r.getAttribute('aria-label')||'').trim();
      }).filter(Boolean);
      payload.fields.push({label:fieldLabel,type:'radio',required:group.some(function(r){return r.required||r.getAttribute('aria-required')==='true';}),options:opts});
    });

    checkboxGroups.forEach(function(group, name){
      var first=group[0];
      var fieldLabel=labelFor(first) || name.replace(/^__checkbox_/, '') || 'Checkbox';
      var opts=group.map(function(r){
        var id=r.getAttribute('id');
        var l=id?document.querySelector('label[for=\"'+CSS.escape(id)+'\"]'):null;
        return (l?text(l):'') || (r.value||'').trim() || (r.getAttribute('aria-label')||'').trim();
      }).filter(Boolean);
      payload.fields.push({label:fieldLabel,type:'checkbox',required:group.some(function(r){return r.required||r.getAttribute('aria-required')==='true';}),options:opts});
    });

    // Caps
    payload.fields = payload.fields.slice(0, 120);
    payload.fields.forEach(function(f){
      if(Array.isArray(f.options)) f.options = f.options.slice(0, 80);
      f.label = String(f.label||'').slice(0, 200);
    });

    var receiver=APP_ORIGIN + '/capture?t=' + encodeURIComponent(TOKEN);
    var w=window.open(receiver,'formmate_capture');
    var msg={type:'FORMMATE_CAPTURE_V1',token:TOKEN,payload:payload};
    if(!w){
      alert('Popup blocked. Copy the payload JSON from the next prompt and paste it into FormMate Capture.');
      prompt('FormMate Capture Payload (copy this)', JSON.stringify(msg));
      return;
    }
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      try { w.postMessage(msg, '*'); } catch(e){ /* ignore */ }
      if(tries>30) clearInterval(timer);
    }, 300);
  } catch (e) {
    alert('FormMate Capture failed: ' + (e && e.message ? e.message : e));
  }
})();`.trim();

  // Basic minification for bookmarklet
  const compact = js
    .replace(/\s+/g, ' ')
    .replace(/;\s+/g, ';')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}');
  return `javascript:${compact}`;
}

export function captureScreen() {
  const params = new URLSearchParams(window.location.search || '');
  const token = (params.get('t') || '').trim() || randomToken();
  const appOrigin = window.location.origin;
  const bookmarklet = buildBookmarklet(appOrigin, token);

  const html = `
    <div class="min-h-screen w-full bg-mesh flex flex-col">
      <header data-fm-hide-on-scroll="true" class="h-16 border-b border-slate-200 flex items-center px-6 md:px-12 sticky top-0 z-50 glass">
        <button id="btn-back" class="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm btn-press">
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>
        <div class="flex-1"></div>
        <button type="button" class="flex items-center gap-2 btn-press cursor-pointer bg-transparent border-0 p-0" id="btn-home" aria-label="Go to home">
          <div class="size-8 flex shrink-0 items-center justify-center">
            <img src="/logo.png" alt="FormMate Logo" class="w-full h-full object-contain" />
          </div>
          <span class="font-bold text-lg tracking-tighter text-slate-900">Form<span class="text-primary">Mate</span></span>
        </button>
      </header>

      <main class="flex-1 w-full max-w-4xl mx-auto px-6 py-12 md:py-16 animate-screen-enter">
        <div class="mb-10 text-center max-w-2xl mx-auto space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest rounded-full border border-primary/20">
            <span class="material-symbols-outlined text-[14px]">bookmark</span>
            Assisted Capture
          </div>
          <h1 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">Import a sign-in required form</h1>
          <p class="text-slate-500 text-base leading-relaxed">
            Some forms can’t be scanned from a URL because they require sign-in or are rendered client-side.
            Use this capture tool while you’re already signed in on the form page.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900 mb-2">1) Add the bookmarklet</h2>
            <p class="text-sm text-slate-500 leading-relaxed mb-4">
              Drag this link to your bookmarks bar, or copy it and create a new bookmark.
            </p>

            <div class="flex flex-col gap-3">
              <a href="${bookmarklet}" class="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm btn-press">
                <span class="material-symbols-outlined text-[18px]">bookmark_add</span>
                FormMate Capture
              </a>

              <button id="btn-copy-bookmarklet" class="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 text-slate-900 font-bold text-sm hover:bg-slate-200 transition-colors btn-press">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
                Copy bookmarklet
              </button>

              <div class="text-[11px] text-slate-400">
                Token: <span class="font-mono">${token}</span>
              </div>
            </div>
          </section>

          <section class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900 mb-2">2) Run it on the form page</h2>
            <ol class="text-sm text-slate-500 leading-relaxed list-decimal list-inside space-y-2 mb-4">
              <li>Open the target form in a new tab (sign in if needed).</li>
              <li>Click the <strong>FormMate Capture</strong> bookmark.</li>
              <li>Come back here — the fields will import automatically.</li>
            </ol>

            <div class="rounded-2xl border border-dashed border-slate-300 p-4 bg-slate-50">
              <div class="text-xs font-bold text-slate-700 mb-2">Waiting for capture…</div>
              <div id="capture-status" class="text-xs text-slate-500">No payload received yet.</div>
            </div>
          </section>
        </div>

        <section class="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-slate-900 mb-2">Popup blocked? Paste payload instead</h2>
          <p class="text-sm text-slate-500 leading-relaxed mb-4">
            If the bookmarklet couldn’t open this page, it will show you a JSON payload. Paste it below.
          </p>
          <textarea id="payload-input" class="w-full min-h-[140px] rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary p-4 text-xs font-mono text-slate-800 outline-none" placeholder='{"type":"FORMMATE_CAPTURE_V1", ...}'></textarea>
          <div class="flex items-center justify-end gap-3 mt-4">
            <button id="btn-import-payload" class="px-5 py-2.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-sm btn-press">Import</button>
          </div>
        </section>
      </main>
    </div>
  `;

  function init(wrapper) {
    const authed = getState().isAuthenticated;
    const statusEl = wrapper.querySelector('#capture-status');
    const btnCopy = wrapper.querySelector('#btn-copy-bookmarklet');
    const payloadInput = wrapper.querySelector('#payload-input');
    const btnImport = wrapper.querySelector('#btn-import-payload');

    wrapper.querySelector('#btn-back')?.addEventListener('click', () => history.back());
    wrapper.querySelector('#btn-home')?.addEventListener('click', () => navigateTo(authed ? 'dashboard' : 'landing'));

    btnCopy?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bookmarklet);
        toast.success('Bookmarklet copied');
      } catch {
        toast.error('Copy failed — please drag the link to your bookmarks bar.');
      }
    });

    function handleMessage(data) {
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'FORMMATE_CAPTURE_V1') return;
      if (String(data.token || '').trim() !== token) return;

      const payload = data.payload;
      try {
        const formData = capturedPayloadToFormData(payload);
        if (!formData.questions || formData.questions.length === 0) {
          throw new Error('No fields found in captured payload.');
        }

        setState({
          formUrl: formData.url || payload?.pageUrl || '',
          capturePayload: payload
        });

        statusEl.textContent = `Received ${formData.questions.length} fields. Importing…`;
        toast.success('Capture received');
        navigateTo('analyzing');
      } catch (e) {
        statusEl.textContent = `Payload received but invalid: ${e?.message || e}`;
        toast.error('Invalid capture payload');
      }
    }

    const onMsg = (event) => {
      handleMessage(event?.data);
    };
    window.addEventListener('message', onMsg);

    btnImport?.addEventListener('click', () => {
      const raw = payloadInput.value.trim();
      if (!raw) return toast.error('Paste the payload JSON first.');
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return toast.error('Invalid JSON.');
      }
      handleMessage(data);
    });

    return () => {
      window.removeEventListener('message', onMsg);
    };
  }

  return { html, init };
}
