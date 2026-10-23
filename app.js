// Set this to your deployed Cloudflare Worker URL after deployment.
const API_BASE_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";
const $=id=>document.getElementById(id);
const state={consent:false,recognition:null,listening:false,transcript:'',final:'',question:'',profile:'',answer:'',timer:null,toastTimer:null};
for(let i=0;i<43;i++){const s=document.createElement('span');s.style.setProperty('--h',(7+Math.round(Math.abs(Math.sin(i*1.73))*45))+'px');s.style.setProperty('--delay',((i%11)*-70)+'ms');$('wave').appendChild(s)}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function listening(on){state.listening=on;$('wavebox').classList.toggle('listening',on);$('listenState').textContent=on?'● LISTENING':'● STANDBY';$('listenState').style.color=on?'#67e8b1':'';$('waveCaption').textContent=on?'LISTENING FOR A QUESTION':'READY WHEN YOU ARE';$('start').disabled=on;$('stop').disabled=!on}
function stop(){try{state.recognition?.stop()}catch{}listening(false);$('transcriptStatus').textContent=state.transcript?'Capture paused':'Waiting for speech'}
function renderTranscript(){$('transcript').textContent=state.transcript||'Your detected question will appear here…';$('transcript').classList.toggle('muted',!state.transcript)}
function start(){if(!$('consent').checked){toast('Please confirm you have permission before listening.');return}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Speech recognition is not supported in this browser. Type your question instead, or try Chrome/Edge.');return}try{state.recognition?.abort()}catch{}const r=new SR();state.recognition=r;r.continuous=true;r.interimResults=true;r.lang='en-US';state.final='';state.transcript='';renderTranscript();r.onstart=()=>{listening(true);$('transcriptStatus').textContent='Listening…'};r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)state.final+=t.trim()+' ';else interim+=t}state.transcript=(state.final+interim).trim();renderTranscript();$('transcriptStatus').textContent=interim?'Transcribing speech…':'Speech detected';if(state.final.trim().length>=8){clearTimeout(state.timer);state.timer=setTimeout(()=>{const q=state.final.trim();if(q&&q!==state.question){state.question=q;$('question').value=q;generate(q)}},1400)}};r.onerror=e=>{if(['not-allowed','service-not-allowed'].includes(e.error)){toast('Microphone permission denied. Check your browser permissions.');stop()}else if(!['no-speech','aborted'].includes(e.error))toast('Speech recognition issue. You can type the question instead.')};r.onend=()=>listening(false);try{r.start()}catch{toast('Could not start speech recognition. Try again.')}} 
async function generate(q){
  q=String(q||'').trim();
  if(q.length<5){toast('Ask or type a complete interview question first.');return}
  state.question=q;$('question').value=q;
  $('empty').classList.add('hidden');$('answerArea').classList.remove('hidden');
  $('answer').textContent='Generating a personalized answer…';
  $('points').innerHTML='';
  if(!API_BASE_URL || API_BASE_URL.includes('PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE')){
    $('answer').textContent='Connect your secure AI backend first. Follow the README to deploy the Cloudflare Worker, then paste its URL into app.js.';
    $('points').innerHTML='<li>Deploy the Worker backend</li><li>Store your AI API key as a Worker secret</li><li>Set API_BASE_URL in app.js and redeploy the static site</li>';
    $('demoTag').textContent='SETUP REQUIRED';
    toast('The API backend is not configured yet.');
    return;
  }
  try{
    const response=await fetch(API_BASE_URL.replace(/\/$/,'')+'/answer',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question:q,candidateProfile:state.profile,mode:'practice',answerStyle:'natural'})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'AI service request failed.');
    state.answer=data.answer||'No answer was returned.';
    $('answer').textContent=state.answer;
    $('demoTag').textContent='LIVE AI';
    (Array.isArray(data.keyPoints)?data.keyPoints:[]).slice(0,5).forEach(p=>{
      const li=document.createElement('li');li.textContent=String(p);$('points').appendChild(li);
    });
    if(!data.keyPoints?.length)['Answer the question directly','Use a truthful example','Explain your action and result'].forEach(p=>{const li=document.createElement('li');li.textContent=p;$('points').appendChild(li)});
  }catch(err){
    $('answer').textContent='Could not reach the AI backend. Check the Worker URL, API secret, and deployment settings.\\n\\n'+(err.message||'Unknown error');
    $('demoTag').textContent='API ERROR';
    toast('AI request failed. Check the backend setup.');
  }
}
function speak(text){if(!('speechSynthesis'in window)){toast('Voice playback is not supported in this browser.');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=1;speechSynthesis.speak(u)}
$('consent').addEventListener('change',e=>{state.consent=e.target.checked;if(!state.consent)stop();toast(state.consent?'Permission confirmed. Start listening when ready.':'Listening permission switched off.')});
$('start').addEventListener('click',start);$('stop').addEventListener('click',stop);$('generate').addEventListener('click',()=>generate(state.transcript||$('question').value));$('typedGenerate').addEventListener('click',()=>generate($('question').value));$('clear').addEventListener('click',()=>{state.transcript='';state.final='';state.question='';$('question').value='';renderTranscript();$('transcriptStatus').textContent='Waiting for speech'});$('speak').addEventListener('click',()=>state.answer&&speak(state.answer));$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.answer);toast('Answer copied.')}catch{toast('Select and copy the answer manually.')}});
const views={studio:$('studio'),practice:$('practice'),profile:$('profile')};document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('active',n===b));Object.entries(views).forEach(([k,v])=>v.classList.toggle('hidden',k!==b.dataset.view));$('crumb').textContent=b.dataset.view==='studio'?'Live studio':b.dataset.view==='practice'?'Practice mode':'Candidate profile'}));
const qs=['Tell me about yourself and your professional background.','Describe a difficult problem you solved and how you approached it.','Why are you interested in this role?','Tell me about a time you had to learn a new technology quickly.','How do you prioritize multiple incidents or deadlines?','What technical skill are you currently improving?'];let qi=0;$('nextQ').addEventListener('click',()=>{qi=(qi+1)%qs.length;$('qNum').textContent='QUESTION '+String(qi+1).padStart(2,'0');$('practiceQ').textContent=qs[qi];$('practiceAnswer').value='';$('feedbackBox').classList.add('hidden')});$('readQ').addEventListener('click',()=>speak($('practiceQ').textContent));$('feedback').addEventListener('click',()=>{const a=$('practiceAnswer').value.trim();if(a.length<15){toast('Write a little more of your answer first.');return}$('feedbackBox').classList.remove('hidden');$('feedbackBox').textContent='Practice feedback (local guide):\\n\\n• Strength: identify the clearest part of your answer.\\n• Improve: add a concrete example and explain your own actions.\\n• Structure: use Situation, Task, Action, Result for behavioral questions.\\n• Delivery: keep it concise and finish with the outcome.\\n\\nThis is a general practice guide, not AI analysis of your specific answer.'});$('saveProfile').addEventListener('click',()=>{state.profile=$('profileText').value.trim();$('saved').classList.remove('hidden');toast('Profile saved in this page session.')});window.addEventListener('beforeunload',()=>{try{state.recognition?.abort();speechSynthesis?.cancel()}catch{}});
