(function(global){
  'use strict';
  const CATEGORY = { CALENDAR:'calendar', TASKS:'tasks', IDEAS:'ideas', RECOMMENDATIONS:'recommendations', NOTES:'notes', BRAIN:'brainDump' };
  const QUESTION_RE = /^(do|did|does|am|are|is|was|were|what|when|where|who|why|how|can|could|should|would|have|has)\b|\?$/i;
  const BORED_RE = /\b(i'?m bored|bored|nothing to do|entertain me)\b/i;
  const STUCK_RE = /\b(can'?t start|cannot start|stuck|overwhelmed|too much|paralyzed|don'?t know where to start)\b/i;
  const RECOMMEND_RE = /\b(check out|watch|listen to|try|restaurant|movie|show|song|album|book|podcast|youtube|game|place|sushi|documentary)\b/i;
  const IDEA_RE = /\b(idea|business idea|app idea|song idea|project idea|could build|what if|maybe we should)\b/i;
  const NOTE_RE = /\b(remember that|note that|save this|keep this|password|address|info|reference)\b/i;
  const TASK_RE = /\b(need|need to|have to|gotta|must|todo|to do|buy|call|email|reply|finish|clean|book|schedule|pay|pick up|drop off|check|renew|fix|send|bring)\b/i;
  const DATE_RE = /\b(today|tonight|tomorrow|tmrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;
  const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(at|around|by|before|after)\s+(\d{1,2})(?::(\d{2}))?\b/i;
  const MULTI_RE = /\n|;|\s[-•]\s|,\s*(?=(buy|call|email|watch|schedule|check|finish|clean|pay|book|try|listen|remember)\b)/i;

  function nowISO(){ return new Date().toISOString(); }
  function clean(raw){ return String(raw||'').replace(/\s+/g,' ').trim(); }
  function id(prefix='mm'){ return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); }
  function hasDate(text){ return DATE_RE.test(text); }
  function hasTime(text){ return TIME_RE.test(text); }
  function isMelt(text){ return /^melt\s*it\s*:?/i.test(text) || (MULTI_RE.test(text) && clean(text).length > 30); }
  function splitMelt(raw){
    return String(raw).replace(/^melt\s*it\s*:?/i,'')
      .split(/\n|;|\s[-•]\s|,(?=\s*(?:buy|call|email|watch|schedule|check|finish|clean|pay|book|try|listen|remember)\b)/i)
      .map(s=>clean(s.replace(/^[-•]\s*/,''))).filter(Boolean);
  }
  function inferTime(raw){
    const text = clean(raw).toLowerCase();
    let m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
    if(m) return `${m[1].padStart(2,'0')}:${m[2]||'00'} ${m[3].toUpperCase()}`;
    m = text.match(/\b(?:at|around|by|before|after)\s+(\d{1,2})(?::(\d{2}))?\b/);
    if(m){
      const hour = Number(m[1]);
      const contextPM = /\b(dinner|supper|evening|tonight|after work|gym|practice)\b/.test(text);
      const contextAM = /\b(morning|breakfast|before work)\b/.test(text);
      if(contextPM && hour < 12) return `${String(hour).padStart(2,'0')}:${m[2]||'00'} PM`;
      if(contextAM) return `${String(hour).padStart(2,'0')}:${m[2]||'00'} AM`;
      return `Needs review: ${hour}:${m[2]||'00'}`;
    }
    return '';
  }
  function inferDate(raw){
    const text = clean(raw).toLowerCase();
    const terms = ['today','tonight','tomorrow','monday','tuesday','wednesday','thursday','friday','saturday','sunday','next week','this week'];
    for(const t of terms){ if(text.includes(t)) return t; }
    const month = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/i);
    if(month) return month[0];
    const slash = text.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/);
    return slash ? slash[0] : '';
  }
  function categoryFor(raw){
    const text = clean(raw);
    if((hasDate(text) || hasTime(text)) && /\b(appointment|meeting|dinner|lunch|event|practice|visit|call|dentist|doctor|therapy|pickup|pick up)\b/i.test(text)) return CATEGORY.CALENDAR;
    if(TASK_RE.test(text)) return CATEGORY.TASKS;
    if(RECOMMEND_RE.test(text)) return CATEGORY.RECOMMENDATIONS;
    if(IDEA_RE.test(text)) return CATEGORY.IDEAS;
    if(NOTE_RE.test(text)) return CATEGORY.NOTES;
    if(hasDate(text) || hasTime(text)) return CATEGORY.CALENDAR;
    return CATEGORY.BRAIN;
  }
  function titleFor(raw){
    return clean(raw).replace(/^melt\s*it\s*:?/i,'').replace(/^(remember to|need to|have to|gotta|please)\s+/i,'');
  }
  function confidenceFor(raw, category){
    const text = clean(raw);
    if(category === CATEGORY.BRAIN) return 'ask';
    if(category === CATEGORY.CALENDAR && (hasDate(text) || hasTime(text))){
      const time = inferTime(text);
      return time.startsWith('Needs review') ? 'review' : 'auto';
    }
    if(category === CATEGORY.TASKS && TASK_RE.test(text)) return 'auto';
    if(category === CATEGORY.RECOMMENDATIONS && RECOMMEND_RE.test(text)) return 'auto';
    if(category === CATEGORY.IDEAS && IDEA_RE.test(text)) return 'auto';
    return 'review';
  }
  function classifySingle(raw){
    const text = clean(raw);
    const category = categoryFor(text);
    return {
      id:id('item'), raw:text, title:titleFor(text), category,
      intent:'capture', confidence:confidenceFor(text,category),
      date:inferDate(text), time:inferTime(text), createdAt:nowISO(), done:false
    };
  }
  function decideEntry(raw){
    const text = clean(raw);
    const inbox = { id:id('inbox'), raw:text, createdAt:nowISO() };
    if(!text) return { type:'empty', inbox, actions:[], message:'Nothing entered.' };
    if(isMelt(text)){
      const items = splitMelt(text).map(classifySingle);
      return { type:'melt', inbox, actions:items, message:`Sorted ${items.length} captured thoughts.` };
    }
    if(BORED_RE.test(text)) return { type:'assist-bored', inbox, actions:[], message:'Boredom support ready.' };
    if(STUCK_RE.test(text)) return { type:'assist-stuck', inbox, actions:[], message:'Tiny next step generated.', firstStep:microStep(text) };
    if(QUESTION_RE.test(text)) return { type:'ask', inbox, actions:[], query:text, message:'Searching your MindMelt data.' };
    const item = classifySingle(text);
    return { type:'capture', inbox, actions:[item], message:'Captured.' };
  }
  function microStep(text){
    if(/clean|garage|room|desk|kitchen/i.test(text)) return 'Clear one visible surface for two minutes. Stop there if you need to.';
    if(/email|reply|message/i.test(text)) return 'Open the thread and write only the first sentence.';
    if(/work|report|document|project/i.test(text)) return 'Create a messy first bullet list. Do not make it good yet.';
    return 'Set a two-minute timer and do the smallest visible first step.';
  }
  function searchData(query, store){
    const q = clean(query).toLowerCase().replace(/[?]/g,'').split(/\s+/).filter(w=>w.length>2 && !['have','plans','tonight','today','what','about','anything'].includes(w));
    const all = [].concat(store.calendar||[],store.tasks||[],store.ideas||[],store.recommendations||[],store.notes||[],store.brainDump||[]);
    return all.filter(item => {
      const blob = `${item.title||''} ${item.raw||''} ${item.category||''} ${item.date||''} ${item.time||''}`.toLowerCase();
      if(/plans|tonight|today|tomorrow|calendar/i.test(query)) return item.category === CATEGORY.CALENDAR || item.date;
      return q.length ? q.some(term=>blob.includes(term)) : true;
    }).slice(0,12);
  }
  const API = { CATEGORY, decideEntry, classifySingle, searchData, splitMelt, microStep };
  global.MindMeltEngine = API;
  if(typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
