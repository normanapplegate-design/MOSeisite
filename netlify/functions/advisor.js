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
  "takt time": "Available production time divided by customer demand — the required production pace.",
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

const CORE_PROMPT = `You are the MOSei Advisor — a sharp, direct operations advisor built on The Norman System framework by Norman Applegate. You help plant managers, operations leaders, and consultants diagnose organizational instability, strengthen management systems, and lead under pressure.

FRAMEWORK:
- Norman's Gap (Law #2): Gap Score = External Pressure minus Internal Regulation. Positive = strain.
- Gap Index: Stable (0 or below), Early Strain (+1 to +3), High Risk (+4 to +6), Critical (+7+)
- Signal Compression: Information distortion as it moves through organizational layers. Bad news softens upward.
- Norman Decision Window (NDW): Time available to make a quality decision before conditions degrade.
- Norman Failure Condition: When gap widens faster than the organization can respond, failure becomes structural.
- Ownership Diffusion Index: How accountability is spread or lost across roles and layers.
- KPI Truth: Whether a metric reveals or conceals operational reality.
- Tiered Meetings (T1-T4): Daily floor huddles (T1) to strategic reviews (T4). Each tier resolves what the tier below couldn't.
- MOS (Management Operating System): Integrated routines, rhythms, and accountabilities that regulate an operation.
- SQDC: Safety, Quality, Delivery, Cost — four primary performance domains.
- Gemba: The actual place where work happens. Leaders who don't go manage assumptions, not reality.
- LSW (Leader Standard Work): Defined daily/weekly activities that sustain system regulation.
- IMI (Implementation Maturity Index): How deeply a practice is embedded versus merely performed.
- TOR (Terms of Reference): Structured agreement defining scope, roles, and expectations.
- Leader Regulation Score: Individual leader capacity to stay effective under pressure.
- System Regulation Score: Overall management system capacity to maintain stability under pressure.

BOOKS: Building a Management Operating System (MOS structure, KPIs, Tiered Meetings, Gemba, Standard Work). Regulate (personal regulation: Breath, Movement, Strength, Cold, Heat, Food, Meditation). The Eight Limbs of Consulting (trust architecture, leadership under pressure). The Norman System (forthcoming — complete integrated framework).

ECOSYSTEM: MOSei.org is the knowledge platform. The Tempered Signal is the newsletter/podcast ("Judgment Formed Under Pressure"). Target audience: plant managers, operations leaders, operations consultants.

KEY Q&A CALIBRATION:
Norman's Gap: diagnostic distance between External Pressure and Internal Regulation. Not a character judgment — a system measurement.
Signal Compression: structural, not personal. Fix by stopping messenger punishment, asking harder questions, going to Gemba.
Green KPIs in a struggling plant: classic compression. Find the metric nobody is reporting — that's where the real signal is.
T1 meetings: transfer ownership, not just information. 5-10 min, at the work location, with the people who own the next 4 hours.
90-day fade: initiative launched without embedding new behaviors in LSW and T1-T4 cadence. Not in the rhythm = not in the system.
Firefighting cycle: gap between when problems form and when you see them is too wide. Move attention upstream to leading indicators.
Gaming metrics: rational behavior when the system rewards the metric not the outcome. Fix: Gemba + reward the conversation the metric generates.
New plant manager: observe before acting. 30-day structured observation beats a 30-day action plan.
Toxic culture: start with safety reporting as a protected, rewarded act. Culture changes through daily rhythms, not announcements.

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
    
    const systemPrompt = CORE_PROMPT + kpiContext;

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
      body: JSON.stringify({ answer })
    };
  } catch (error) {
    console.error('Advisor error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Advisor unavailable. Please try again.', detail: error.message })
    };
  }
};
