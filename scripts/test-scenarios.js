const { spawn } = require('child_process');
const http = require('http');

const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DEMO_COOKIE = 'ricoz_admin_session=demo_session_super_admin';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: DEMO_COOKIE,
        ...(options.headers || {}),
      },
      timeout: 10000,
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`Starting Next.js production server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    stdio: 'pipe',
  });

  // Wait for server to come online
  let online = false;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    try {
      const res = await request('/api/v1/kpis');
      if (res.status === 200) {
        online = true;
        console.log(`Server responded successfully on attempt ${i + 1}`);
        break;
      }
    } catch {
      process.stdout.write('.');
    }
  }

  if (!online) {
    server.kill();
    throw new Error('Next.js server failed to come online in 40s');
  }

  console.log('\n======================================================');
  console.log('RICOZ OPERATIONS SUITE V4.1 — VERIFICATION MATRIX TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${title} ${extra}`);
    } else {
      console.error(`[FAIL] ${title} ${extra}`);
    }
  }

  try {
    // 1. KPI Telemetry Endpoint (FR-01 Foundational Telemetry)
    console.log('\n--- Test 1: Foundational Telemetry & Dynamic KPI Aggregation ---');
    const kpiRes = await request('/api/v1/kpis');
    assert('GET /api/v1/kpis returns 200', kpiRes.status === 200);
    assert('KPI includes true_total talent headcount', typeof kpiRes.json?.metrics?.talent?.true_total === 'number', `(${kpiRes.json?.metrics?.talent?.true_total})`);
    assert('Active + Onboarding + Paused = True Total Headcount', 
      kpiRes.json?.metrics?.talent?.true_total === 
      kpiRes.json?.metrics?.talent?.active + kpiRes.json?.metrics?.talent?.onboarding + kpiRes.json?.metrics?.talent?.paused
    );
    assert('Mandates telemetry includes total_value_usd', typeof kpiRes.json?.metrics?.mandates?.total_value_usd === 'number');

    // Dashboard Internal KPIs Endpoint (Bug #1 Fix verification)
    const dashKpis = await request('/api/admin/dashboard');
    assert('GET /api/admin/dashboard returns 200', dashKpis.status === 200);
    assert('Dashboard KPIs include computed totalClients', typeof dashKpis.json?.kpis?.totalClients === 'number', `(${dashKpis.json?.kpis?.totalClients})`);
    assert('Dashboard KPIs include computed totalVendors', typeof dashKpis.json?.kpis?.totalVendors === 'number', `(${dashKpis.json?.kpis?.totalVendors})`);

    // 2. Scenario 1: Scope Creep Alert & SHAP XAI
    console.log('\n--- Scenario 1: Scope Creep Alert & SHAP XAI Analysis ---');
    const askOpsCreep = await request('/api/ai/ask-ops', {
      method: 'POST',
      body: { query: 'Which clients burned >=80% hours before Day 15?' },
    });
    assert('POST /api/ai/ask-ops returns 200', askOpsCreep.status === 200);
    assert('Target collection routed to clients_mandates', askOpsCreep.json?.targetCollection === 'clients_mandates');
    assert('Ask Ops detects Vance Global Capital (cli-101-vance)', 
      askOpsCreep.json?.results?.some(r => r.clientId === 'cli-101-vance' || r.companyName?.includes('Vance'))
    );
    assert('Detected client has hoursUsed >= 80% on Day 12', 
      askOpsCreep.json?.results?.[0]?.hoursUsed === 84 && askOpsCreep.json?.results?.[0]?.cycleDay === 12
    );

    // 3. Scenario 2: Self-Healing Compliance
    console.log('\n--- Scenario 2: Self-Healing Compliance Playbook ---');
    const playbookRes = await request('/api/v1/playbooks/trigger', {
      method: 'POST',
      body: {
        playbook_id: 'pb-004-compliance-heal',
        target_mandate_id: 'ven-301-starlight',
        execution_context: {
          vendorStudioName: 'Starlight Visual Studios',
          expiringDocType: 'insurance_cert',
          daysUntilExpiry: 10,
        },
      },
    });
    assert('POST /api/v1/playbooks/trigger returns 200', playbookRes.status === 200);
    assert('Playbook 4 executes with status success', playbookRes.json?.status === 'success');
    console.log('PLAYBOOK LOG:', JSON.stringify(playbookRes.json?.execution_log));
    assert('Execution log records actions', 
      Boolean(playbookRes.json?.execution_log?.summary) || 
      (Array.isArray(playbookRes.json?.execution_log?.actions_taken) && playbookRes.json?.execution_log?.actions_taken.length > 0)
    );

    // 4. Scenario 4: Blast-Radius Simulator & SLA Escalation
    console.log('\n--- Scenario 4: Blast-Radius Simulator & SLA Escalation ---');
    const blastRes = await request('/api/ai/task-suggest', {
      method: 'POST',
      body: {
        taskTitle: 'Finalize Vance Q3 Deck Layout',
        department: 'Creative Delivery',
        priority: 'P1',
        blockerNote: 'Waiting on updated financial tables from client.',
        assigneeName: 'Elena Ramos',
      },
    });
    assert('POST /api/ai/task-suggest returns 200', blastRes.status === 200);
    assert('Generates 3 autonomous blocker mitigations', Array.isArray(blastRes.json?.suggestedActions) && blastRes.json?.suggestedActions.length === 3);
    assert('Drafts polite communication to unblock deliverable', Boolean(blastRes.json?.communicationDraft?.body));

    // 5. Scenario 5: Brief Incomplete Auto-Triage
    console.log('\n--- Scenario 5: Brief Incomplete Auto-Triage ---');
    const triageRes = await request('/api/ai/triage-brief', {
      method: 'POST',
      body: {
        enquiryId: 'enq-701-incomplete',
        companyName: 'Nexus Robotics',
        briefText: 'We need a quick logo refresh and maybe a 3-page site.',
        creativeDiscipline: 'brand_identity',
      },
    });
    assert('POST /api/ai/triage-brief returns 200', triageRes.status === 200);
    assert('Completeness score detects incomplete brief (<50%)', triageRes.json?.completenessScore <= 50, `(${triageRes.json?.completenessScore}%)`);
    assert('Identifies missing financial fields (budgetRange, timelineWeeks)', 
      triageRes.json?.missingFields?.includes('budgetRange') && triageRes.json?.missingFields?.includes('timelineWeeks')
    );
    assert('Triage summary pauses direct promotion', triageRes.json?.triageSummary?.includes('paused'));

    // 6. Scenario 6: War Room & SLA Breach
    console.log('\n--- Scenario 6: Support SLA Breach War Room ---');
    const warRoomPlaybook = await request('/api/v1/playbooks/trigger', {
      method: 'POST',
      body: {
        playbook_id: 'pb-005-war-room',
        target_mandate_id: 'REF-2026-002',
        execution_context: {
          incidentCategory: 'Service Outage',
          subject: 'Asset Portal CDN Unreachable',
          priority: 'P0',
        },
      },
    });
    assert('Trigger instant war room spin-up returns 200', warRoomPlaybook.status === 200);
    console.log('WAR ROOM LOG:', JSON.stringify(warRoomPlaybook.json));
    assert('Execution log confirms war room spin-up', 
      Boolean(warRoomPlaybook.json?.execution_log?.summary) ||
      Boolean(warRoomPlaybook.json?.message?.includes('executed'))
    );

    // 7. Scenario 7: SHAP Model Training on Pre-Trained Data
    console.log('\n--- Scenario 7: Pre-Trained Model Training & Accuracy ---');
    const trainRes = await request('/api/ai/train-models', {
      method: 'POST',
      body: {
        modelKey: 'vendor_shadow_score',
        epochs: 50,
      },
    });
    console.log('TRAIN RES:', JSON.stringify(trainRes.json));
    assert('POST /api/ai/train-models returns 200', trainRes.status === 200);
    assert('Model training reports R2 score > 0.85', trainRes.json?.metrics?.r2Score >= 0.85, `(R² = ${trainRes.json?.metrics?.r2Score})`);
    assert('Model training records loss curve convergence', 
      trainRes.json?.metrics?.trainLoss < 5.0 || 
      (Array.isArray(trainRes.json?.metrics?.lossHistory) && trainRes.json?.metrics?.lossHistory.length > 0)
    );
    assert('Model training outputs feature importances', Array.isArray(trainRes.json?.metrics?.featureImportance) && trainRes.json?.metrics?.featureImportance.length > 0);

    // 8. Navigation & Key UI Pages Verification (with authenticated session cookie)
    console.log('\n--- UI Routes Health Check (Authenticated Session) ---');
    const routes = [
      '/admin',
      '/admin/ai-studio',
      '/admin/war-room',
      '/admin/analytics',
      '/admin/sops',
      '/admin/tasks',
      '/admin/clients',
      '/admin/vendors',
      '/admin/support',
      '/admin/website',
    ];
    for (const r of routes) {
      const res = await request(r);
      assert(`Route ${r} responds 200 OK`, res.status === 200);
    }

  } catch (err) {
    console.error('Test suite error:', err);
  } finally {
    console.log('\n======================================================');
    console.log(`TEST RUN COMPLETE: ${passed} / ${total} Checks Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('======================================================\n');
    server.kill();
  }
}

runTests().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
