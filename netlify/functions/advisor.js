
const https = require('https');

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Invalid JSON: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const KPI_LIBRARY = {
  "OEE": "Overall Equipment Effectiveness: Availability x Performance x Quality. World-class is 85%+.",
  "overall equipment effectiveness": "OEE = Availability x Performance x Quality. World-class is 85%+.",
  "availability": "The percentage of scheduled production time equipment is actually available to run.",
  "performance rate": "Ratio of actual production speed to theoretical maximum speed.",
  "quality rate": "Proportion of parts meeting specifications on first pass, excluding scrap and rework.",
  "first pass yield": "FPY: percentage of units completing production meeting quality standards without rework.",
  "FPY": "First Pass Yield: percentage of units meeting quality standards without rework or scrapping.",
  "throughput": "Rate at which a system produces finished goods per hour or shift.",
  "cycle time": "Total elapsed time to complete one unit from start to finish.",
  "takt time": "Available production time divided by customer demand -- the required production pace.",
  "scrap rate": "Percentage of produced units that fail specifications and cannot be reworked.",
  "rework rate": "Percentage of units requiring additional processing to meet quality standards.",
  "changeover time": "SMED: elapsed time from last good part of one run to first good part of the next.",
  "SMED": "Single-Minute Exchange of Die: methodology targeting rapid changeover. Measured as time from last good part to first good part of next run.",
  "PSA": "Production Schedule Attainment: percentage of planned schedule actually completed. A primary SQDC indicator.",
  "production schedule attainment": "Percentage of planned production schedule completed within the designated period.",
  "downtime": "Production time lost due to unexpected equipment failures or unscheduled interruptions.",
  "labor efficiency": "Ratio of standard hours produced to actual hours worked.",
  "capacity utilization": "Percentage of total theoretical production capacity actively used.",
  "WIP": "Work-In-Progress: partially completed units between production stages. Key indicator of flow and constraint.",
  "MTBF": "Mean Time Between Failures: average operating time between unplanned failures. Primary reliability indicator.",
  "mean time between failures": "Average operating time between unplanned failures of a repairable asset.",
  "MTTR": "Mean Time To Repair: average time to restore a failed asset to operational condition.",
  "mean time to repair": "Average time required to restore a failed asset to operational condition.",
  "PMC": "Planned Maintenance Compliance: percentage of scheduled PM tasks completed on time.",
  "planned maintenance compliance": "Percentage of scheduled preventive maintenance tasks completed on time.",
  "wrench time": "Percentage of a technician's shift spent on actual hands-on maintenance work, excluding travel and waiting.",
  "reactive maintenance": "Unplanned breakdown maintenance. High reactive ratio signals low maintenance maturity.",
  "maintenance backlog": "Total open approved work orders awaiting execution, in hours. Growing backlog signals capacity or prioritization issues.",
  "RAV": "Replacement Asset Value: used to benchmark maintenance cost as a percentage of total asset value.",
  "OTIF": "On-Time In-Full: percentage of orders delivered on time and complete. Primary supply chain customer service metric.",
  "on-time in-full": "Percentage of customer orders delivered both on time and with complete quantity.",
  "inventory turns": "Times inventory is sold and replaced per period. Cost of Goods Sold divided by Average Inventory Value.",
  "DIO": "Days Inventory Outstanding: average days inventory is held before being sold or consumed.",
  "DSO": "Days Sales Outstanding: average days to collect payment after a sale.",
  "DPO": "Days Payable Outstanding: average days taken to pay suppliers.",
  "CCC": "Cash Conversion Cycle: DIO + DSO minus DPO. Net time between cash out and cash in.",
  "cash conversion cycle": "Net time between cash outflows for inventory and cash inflows from customers: DIO + DSO - DPO.",
  "perfect order rate": "Percentage of orders delivered on time, in full, undamaged, with accurate documentation.",
  "forecast accuracy": "Degree to which demand forecasts match actual demand. Often measured as MAPE.",
  "MAPE": "Mean Absolute Percentage Error: common measure of forecast accuracy.",
  "fill rate": "Percentage of customer demand met from available inventory without backorder.",
  "stockout rate": "Frequency with which requested items are unavailable in inventory.",
  "LTIFR": "Lost Time Injury Frequency Rate: injuries with lost work time per million hours worked. Primary mining safety KPI.",
  "lost time injury": "LTIFR: injuries resulting in lost work time per million hours worked.",
  "TRIFR": "Total Recordable Injury Frequency Rate: all recordable injuries per million hours worked.",
  "total recordable injury": "TRIFR: all recordable injuries per million hours worked.",
  "TPH": "Tonnes Per Hour: volume of material extracted or processed per hour. Primary mining production rate.",
  "tonnes per hour": "Primary mining production rate metric across extraction and processing.",
  "strip ratio": "Ratio of waste material removed to ore extracted in open-cut mining. Key economics measure.",
  "recovery rate": "Percentage of target mineral recovered from ore through the processing plant.",
  "OEE in pharma": "In pharmaceutical, OEE tracks the same Availability x Performance x Quality but batch-based rather than continuous.",
  "batch success rate": "Percentage of production batches meeting all release specifications on first review.",
  "right first time": "RFT: proportion of batches or processes completed correctly without errors on first attempt.",
  "RFT": "Right First Time: proportion completed correctly without errors, corrections, or deviations on first attempt.",
  "deviation rate": "Number of documented deviations from SOPs per batch or time period. Critical regulatory indicator.",
  "OOS": "Out-of-Specification: test results falling outside established quality specifications, triggering regulatory investigation.",
  "out of specification": "Test results outside established quality specs, triggering mandatory investigation under GMP.",
  "CAPA": "Corrective and Preventive Action: structured process to address quality events. CAPA cycle time measures responsiveness.",
  "CAPA cycle time": "Average time to complete a Corrective and Preventive Action from identification to closure.",
  "FAI": "First Article Inspection: aerospace inspection of first production unit confirming design-to-manufacture accuracy.",
  "first article inspection": "Aerospace inspection confirming first production unit meets all design specifications.",
  "NCR": "Nonconformance Rate: frequency of documented nonconformances per unit produced. Primary aerospace quality indicator.",
  "escape rate": "Nonconforming parts passing through inspection undetected and reaching the customer.",
  "COPQ": "Cost of Poor Quality: total cost of internal and external failures as percentage of revenue.",
  "cost of poor quality": "Total financial cost of internal failures (scrap, rework) and external failures (warranty, returns).",
  "FOD": "Foreign Object Debris: incidents of foreign material in production areas. Critical aerospace safety metric.",
  "DPU": "Defects Per Unit: average defects found per unit during production inspection.",
};

function findRelevantKPIs(question) {
  const q = question.toLowerCase();
  const matches = [];
  for (const [key, def] of Object.entries(KPI_LIBRARY)) {
    if (q.includes(key.toLowerCase())) {
      matches.push(`${key}: ${def}`);
    }
  }
  return matches;
}

// --- Situation-to-action library, built from tagged Tempered Signal / Daily Signal issues ---
// Lives in situations.json, colocated with this function so Netlify bundles it automatically.
// The SAME file (byte-identical) is published at the site root for scenario-finder.html to fetch
// client-side. When new issues get tagged, regenerate both copies from newsletter_topic_tags.csv
// and keep them in sync -- this file is the single source of truth for both surfaces.
const SITUATION_LIBRARY = require('./situations.json');

const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any","are","aren't","as","at","be",
  "because","been","before","being","below","between","both","but","by","can't","cannot","could","couldn't",
  "did","didn't","do","does","doesn't","doing","don't","down","during","each","few","for","from","further",
  "had","hadn't","has","hasn't","have","haven't","having","he","he'd","he'll","he's","her","here","here's",
  "hers","herself","him","himself","his","how","how's","i","i'd","i'll","i'm","i've","if","in","into","is",
  "isn't","it","it's","its","itself","let's","me","more","most","mustn't","my","myself","no","nor","not","of",
  "off","on","once","only","or","other","ought","our","ours","ourselves","out","over","own","same","shan't",
  "she","she'd","she'll","she's","should","shouldn't","so","some","such","than","that","that's","the","their",
  "theirs","them","themselves","then","there","there's","these","they","they'd","they'll","they're","they've",
  "this","those","through","to","too","under","until","up","very","was","wasn't","we","we'd","we'll","we're",
  "we've","were","weren't","what","what's","when","when's","where","where's","which","while","who","who's",
  "whom","why","why's","with","won't","would","wouldn't","you","you'd","you'll","you're","you've","your",
  "yours","yourself","yourselves","just","really","might","one","thing","whether","get","got","going","still",
  "even","actually","already"
]);

function tokenize(text) {
  const words = (text.toLowerCase().match(/[a-z']+/g)) || [];
  return words.filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function formatSituation(item) {
  const source = item.issue > 0 ? ('Issue #' + item.issue + ' -- ' + item.subject) : 'Framework Calibration (not tied to a dated issue)';
  return 'Reader situation: "' + item.situation + '"\n' +
    'Framework concept: ' + item.framework + '\n' +
    'If you do one thing: ' + item.action + '\n' +
    'Source: ' + source;
}

function findRelevantSituations(question, limit) {
  limit = limit || 2;
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0) return [];
  const scored = SITUATION_LIBRARY
    .map(item => ({ item, overlap: item.tokens.filter(t => qTokens.has(t)).length }))
    .filter(s => s.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
  return scored.map(s => formatSituation(s.item));
}

const CORE_PROMPT = `You are the MOSei Advisor -- a sharp, direct operations advisor built on The Norman System framework by Norman Applegate. You help plant managers, operations leaders, and consultants diagnose organizational instability, strengthen management systems, and lead under pressure.

FRAMEWORK:
- Norman's Gap (Law #2): Gap Score = External Pressure minus Internal Regulation. Positive = strain.
- Gap Index: Stable (0 or below), Early Strain (+1 to +3), High Risk (+4 to +6), Critical (+7+)
- The Three Failure Points (Norman's Law): Signal Compression, Window Separation, and Ownership Diffusion. Any one alone degrades performance; all three together produce the Norman Failure Condition.
- Signal Compression: Information distortion as it moves through organizational layers. Bad news softens upward. Ancient pattern, more dangerous in the AI era because compression can now happen at machine speed.
- Window Separation: The growing distance between when the Norman Decision Window opens and when the organization actually acts inside it. Structurally inevitable without deliberate intervention.
- Norman Decision Window (NDW): The time available to make a quality decision before conditions degrade. The window is predictable, not random, and runs on its own clock regardless of whether leadership notices.
- Norman Failure Condition: When the gap widens faster than the organization can respond, failure becomes structural rather than situational. Traceable through a causal chain, not a single event.
- Institutional Hallucination: When a system's leadership keeps acting on a picture of reality that no longer matches the ground truth. Distinct from Signal Compression -- this distortion originates inside leadership's own perception, not from information degrading on the way up.
- Decision Velocity: The speed at which a quality decision moves from identified problem to committed action. Norman's Law treats this as the primary leadership metric, not a secondary one.
- Signal Integrity: Whether an organization's information channels preserve or distort truth under pressure. Highest before a crisis is visible, most tested during one.
- Escalation Architecture: The designed structure for how issues move up through the tiers when local resolution fails. Poor architecture leaves problems oscillating instead of resolving.
- The Regulated Leader: A leader whose internal regulation holds under pressure, so personal dysregulation doesn't compound organizational dysregulation. Built through practice, not found through personality.
- Ownership Diffusion Index: How accountability is spread or lost across roles and layers.
- KPI Truth: Whether a metric reveals or conceals operational reality.
- Tier Meeting Governance: Sits above Meeting Decision Framework and Meeting Signal Review -- describes how tiers of meetings relate to and resolve issues from one another.
- Tiered Meetings (T1-T4): Daily floor huddles (T1) to strategic reviews (T4). Each tier resolves what the tier below couldn't.
- Meeting Decision Framework: Structured agreement defining a meeting's scope, roles, and expectations.
- Meeting Signal Review: Structured review of whether meetings are producing real decisions, not just discussion.
- MOS (Management Operating System): Integrated routines, rhythms, and accountabilities that regulate an operation.
- SQDC: Safety, Quality, Delivery, Cost -- four primary performance domains.
- Signal Walk: The actual place where work happens. Leaders who don't go manage assumptions, not reality.
- Leader Cadence: Defined daily/weekly activities that sustain system regulation.
- IMI (Implementation Maturity Index): How deeply a practice is embedded versus merely performed. Seven levels from Dark to Compounding. Embedded (Level 6) means the practice runs without the original champion pushing it. Compounding (Level 7) means leaders are improving the practice based on what the Signal Flow Dashboard shows, unprompted.
- Leader Regulation Score: Individual leader capacity to stay effective under pressure.
- System Regulation Score: Overall management system capacity to maintain stability under pressure.

BOOKS: Norman's Law (the flagship, most complete diagnostic framework -- Norman's Gap, the three failure points, Norman Decision Window, Norman Failure Condition, Institutional Hallucination, Decision Velocity, Signal Integrity, the Regulated Leader, and civilizational case studies including Rome, Vietnam, and financial collapse). Building a Management Operating System (MOS structure, KPIs, Tiered Meetings, Signal Walk, Standard Work). Regulate (personal regulation: Breath, Movement, Strength, Cold, Heat, Food, Meditation). The Eight Limbs of Consulting (trust architecture, leadership under pressure). Treat Norman's Law as the primary source for any question touching Norman's Gap, the three failure points, or the Norman Failure Condition.

ECOSYSTEM: MOSei.org is the knowledge platform. The Tempered Signal is the newsletter/podcast ("Judgment Formed Under Pressure"). Target audience: plant managers, operations leaders, operations consultants. TOOLS: Free Regulation App at mosei.org/regulation-app -- companion to Regulate, lets an individual measure their own Norman's Gap (external pressure vs personal regulation) rather than an organization's. Points toward the paid MOSei tool suite on Gumroad for readers who want to apply the framework to their team. Free Scenario Finder at mosei.org/scenario-finder.html -- lets a reader search or browse the tagged Tempered Signal archive directly and get the exact Action for their situation without going through chat.

KEY Q&A CALIBRATION:
Norman's Gap: diagnostic distance between External Pressure and Internal Regulation. Not a character judgment -- a system measurement.
Signal Compression: structural, not personal. Fix by stopping messenger punishment, asking harder questions, going to Signal Walk.
Green KPIs in a struggling plant: classic compression. Find the metric nobody is reporting -- that's where the real signal is.
T1 meetings: transfer ownership, not just information. 5-10 min, at the work location, with the people who own the next 4 hours.
90-day fade: initiative launched without embedding new behaviors in Leader Cadence and Tier Meeting Governance. Not in the rhythm = not in the system.
Firefighting cycle: gap between when problems form and when you see them is too wide. Move attention upstream to leading indicators.
Gaming metrics: rational behavior when the system rewards the metric not the outcome. Fix: Signal Walk + reward the conversation the metric generates.
New plant manager: observe before acting. 30-day structured observation beats a 30-day action plan.
Toxic culture: start with safety reporting as a protected, rewarded act. Culture changes through daily rhythms, not announcements.

SUSTAINING THE SYSTEM:
The test for sustaining: remove the person who built it. Does the practice survive? If not, it was performed, not embedded.
Sustaining isn't a phase after deployment. It's a property of the cadence. A Leader Cadence that only runs when things are calm isn't sustaining anything.
Common failure: leaders sustain the meeting but not the decision. Tier Meeting Governance still happens, but decisions stop closing inside the Norman Decision Window.
Erosion is sequential, not sudden: KPI Truth degrades first (metrics stay green, reality doesn't), then Ownership Diffusion creeps back in, then Leader Cadence becomes a check-the-box activity. Catch it at the first stage.

USING MATCHED READER SITUATIONS: When a "MATCHED READER SITUATIONS FROM THE NEWSLETTER ARCHIVE" block appears below, it means a past Tempered Signal issue addressed a problem close to what this reader is describing. Lead your answer with that issue's Action as the concrete, ownable next step, name the Framework Concept it teaches, and cite the source issue by number. Don't just summarize the match -- use it as the answer. If the reader wants to browse the full archive themselves instead of describing their problem in chat, point them to the Scenario Finder tool.

Answer concisely and practically. Keep responses under 250 words. Speak like a trusted advisor, not a textbook. When answering KPI questions, connect the definition to what it reveals about system or management health. Do not start with "I" or use excessive preamble.`;

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const messages = body.messages || [{ role: 'user', content: body.question }];
    const question = messages.filter(m => m.role === 'user').map(m => m.content).pop() || '';

    const relevantKPIs = findRelevantKPIs(question);
    const kpiContext = relevantKPIs.length > 0
      ? '\n\nRELEVANT KPI DEFINITIONS:\n' + relevantKPIs.join('\n')
      : '';

    const relevantSituations = findRelevantSituations(question);
    const situationContext = relevantSituations.length > 0
      ? '\n\nMATCHED READER SITUATIONS FROM THE NEWSLETTER ARCHIVE:\n' + relevantSituations.join('\n\n')
      : '';

    const systemPrompt = CORE_PROMPT + kpiContext + situationContext;

    const payload = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    const data = await httpsPost({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    }, payload);

    if (!data.content || !data.content[0]) {
      console.error('Unexpected API response:', JSON.stringify(data).substring(0, 300));
      throw new Error('Unexpected API response: ' + JSON.stringify(data).substring(0, 100));
    }

    const answer = data.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, content: [{ text: answer }] })
    };

  } catch (error) {
    console.error('Advisor error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Advisor unavailable. Please try again.', detail: error.message })
    };
  }
};
