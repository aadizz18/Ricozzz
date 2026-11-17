const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const DEMO_COOKIE = 'ricoz_admin_session=demo_session_usr-001-aadinath';

function req(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': DEMO_COOKIE,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/admin`,
        'Host': `localhost:${PORT}`,
        ...(options.headers || {}),
      },
      timeout: 15000,
    };

    const r = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    r.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (options.body) {
      r.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    r.end();
  });
}

async function runFullVerification() {
  console.log('================================================================');
  console.log('   RICOZ OPERATIONS SUITE V4.1 — ZERO-BUG SYSTEM VERIFICATION   ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, ok, details = '') {
    total++;
    if (ok) {
      passed++;
      console.log(`  [PASS] ${name} ${details ? '— ' + details : ''}`);
    } else {
      console.error(`  [FAIL] ${name} ${details ? '— ' + details : ''}`);
    }
  }

  // --- 1. AUTH & SESSIONS ---
  console.log('--- [Module 1: Authentication & Sessions] ---');
  const me = await req('/api/admin/auth/me');
  test('Auth Me', me.status === 200 && me.json?.user?.email === 'aadinath@ricoz.io', `User: ${me.json?.user?.fullName}`);

  // --- 2. DEPARTMENTS & TEAM ---
  console.log('\n--- [Module 2: Departments & Team Hierarchy] ---');
  const depts = await req('/api/admin/departments');
  test('List Departments', depts.status === 200 && depts.json?.departments?.length > 0, `Count: ${depts.json?.departments?.length}`);
  const members = await req('/api/admin/departments/members');
  test('List Department Members', members.status === 200 && members.json?.members?.length > 0, `Count: ${members.json?.members?.length}`);
  const users = await req('/api/admin/team/users');
  test('List Users', users.status === 200 && users.json?.users?.length > 0, `Count: ${users.json?.users?.length}`);

  // --- 3. CLIENTS & CRM ---
  console.log('\n--- [Module 3: Clients & Onboarding Mandates] ---');
  const clientList = await req('/api/admin/clients');
  test('List Clients', clientList.status === 200 && clientList.json?.clients?.length > 0, `Count: ${clientList.json?.clients?.length}`);
  const clientDetail = await req('/api/admin/clients/cli-101-vance');
  test('Get Client Detail (cli-101-vance)', clientDetail.status === 200 && clientDetail.json?.client?.id === 'cli-101-vance');
  const clientUpdate = await req('/api/admin/clients/cli-101-vance', {
    method: 'PATCH',
    body: { onboardingStage: 'active' },
  });
  test('Update Client Stage (cli-101-vance)', clientUpdate.status === 200 && clientUpdate.json?.success === true);

  // --- 4. SUPPORT & TICKETS ---
  console.log('\n--- [Module 4: Customer Support & SLA Tickets] ---');
  const tickets = await req('/api/admin/support');
  test('List Support Tickets', tickets.status === 200 && tickets.json?.tickets?.length > 0, `Count: ${tickets.json?.tickets?.length}`);
  const ticketDetail = await req('/api/admin/support/REF-2026-001');
  test('Get Ticket Detail (REF-2026-001)', ticketDetail.status === 200 && Boolean(ticketDetail.json?.ticket));
  const ticketUpdate = await req('/api/admin/support/REF-2026-001', {
    method: 'PATCH',
    body: { status: 'in_progress' },
  });
  test('Update Ticket Status (REF-2026-001)', ticketUpdate.status === 200 && ticketUpdate.json?.success === true);
  const ticketResponse = await req('/api/admin/support/REF-2026-001/responses', {
    method: 'POST',
    body: { message: 'Engineer is actively investigating SLA protocol.', isInternalNote: true },
  });
  test('Add Ticket Internal Note', ticketResponse.status === 200 && ticketResponse.json?.success === true);

  // --- 5. TASKS & WORKFLOW MANAGEMENT ---
  console.log('\n--- [Module 5: Task Management & Kanban Board] ---');
  const taskList = await req('/api/admin/tasks');
  test('List Tasks', taskList.status === 200 && taskList.json?.tasks?.length > 0, `Count: ${taskList.json?.tasks?.length}`);
  const taskDetail = await req('/api/admin/tasks/tsk-503-blocked');
  test('Get Task Detail (tsk-503-blocked)', taskDetail.status === 200 && taskDetail.json?.task?.id === 'tsk-503-blocked');
  const taskComment = await req('/api/admin/tasks/tsk-503-blocked/comments', {
    method: 'POST',
    body: { comment: 'Multi-agent review in progress.', isBlockerUpdate: true },
  });
  test('Add Task Blocker Comment', taskComment.status === 200 && taskComment.json?.success === true);

  // --- 6. VENDORS & PARTNERS ---
  console.log('\n--- [Module 6: Vendors & Supply Chain] ---');
  const vendorList = await req('/api/admin/vendors');
  test('List Vendors', vendorList.status === 200 && vendorList.json?.vendors?.length > 0, `Count: ${vendorList.json?.vendors?.length}`);
  const vendorDetail = await req('/api/admin/vendors/ven-301-starlight');
  test('Get Vendor Detail (ven-301-starlight)', vendorDetail.status === 200 && Boolean(vendorDetail.json?.vendor));

  // --- 7. SOPS & COMPLIANCE ---
  console.log('\n--- [Module 7: SOP Governance & Playbooks] ---');
  const sopList = await req('/api/admin/sops');
  test('List SOPs', sopList.status === 200 && sopList.json?.sops?.length > 0, `Count: ${sopList.json?.sops?.length}`);

  // --- 8. MULTI-AGENT AUTONOMOUS SOLVER ---
  console.log('\n--- [Module 8: Multi-Agent Autonomous Resolution Engine] ---');
  const singleSolveAuto = await req('/api/ai/solve-tasks', {
    method: 'POST',
    body: { taskId: 'tsk-503-blocked', mode: 'single' },
  });
  test(
    'Solve Single Task (Auto-Solved: tsk-503-blocked)',
    singleSolveAuto.status === 200 && singleSolveAuto.json?.resolution?.outcome === 'auto_solved',
    `Outcome: ${singleSolveAuto.json?.resolution?.outcome}, Confidence: ${singleSolveAuto.json?.resolution?.confidenceScore}%`
  );

  const singleSolveManual = await req('/api/ai/solve-tasks', {
    method: 'POST',
    body: { taskId: 'tsk-103', mode: 'single' },
  });
  test(
    'Solve Single Task (Needs Manual Action: tsk-103)',
    singleSolveManual.status === 200 && singleSolveManual.json?.resolution?.outcome === 'needs_manual_interaction',
    `Action: ${singleSolveManual.json?.resolution?.manualActionRequired}`
  );

  const batchSolve = await req('/api/ai/solve-tasks', {
    method: 'POST',
    body: { mode: 'all' },
  });
  test(
    'Solve All Tasks (Batch Swarm)',
    batchSolve.status === 200 &&
      batchSolve.json?.report?.totalTasks >= 8 &&
      batchSolve.json?.report?.autoSolvedCount >= 6 &&
      batchSolve.json?.report?.manualActionCount >= 2,
    `Total: ${batchSolve.json?.report?.totalTasks}, Auto: ${batchSolve.json?.report?.autoSolvedCount}, Manual: ${batchSolve.json?.report?.manualActionCount}`
  );

  // --- 9. AGENT TRAINING & BENCHMARK SUITE ---
  console.log('\n--- [Module 9: Agent Training Hub & Loss Convergence] ---');
  const training = await req('/api/ai/train-agents', {
    method: 'POST',
    body: { epochs: 40 },
  });
  test(
    'Fine-Tune Swarm Agents (40 Epochs)',
    training.status === 200 &&
      training.json?.session?.lossHistory?.length === 40 &&
      training.json?.session?.accuracy > 95,
    `Model: ${training.json?.session?.modelName}, Accuracy: ${training.json?.session?.accuracy}%, Final Loss: ${training.json?.session?.finalLoss}`
  );

  // --- 10. DOWNLOADABLE EXECUTIVE REPORTS ---
  console.log('\n--- [Module 10: Downloadable Audit & Swarm Reports] ---');
  const reportMd = await req('/api/ai/download-report?format=markdown');
  test(
    'Download Markdown Report (.md)',
    reportMd.status === 200 &&
      reportMd.headers['content-disposition']?.includes('.md') &&
      reportMd.data.includes('MULTI-AGENT SWARM RESOLUTION REPORT'),
    `Bytes: ${reportMd.data.length}`
  );

  const reportHtml = await req('/api/ai/download-report?format=html');
  test(
    'Download Printable HTML Report (.html)',
    reportHtml.status === 200 &&
      reportHtml.headers['content-disposition']?.includes('.html') &&
      reportHtml.data.includes('<!DOCTYPE html>'),
    `Bytes: ${reportHtml.data.length}`
  );

  // --- 11. FRONTEND UI ROUTES VERIFICATION ---
  console.log('\n--- [Module 11: Frontend UI Admin Pages] ---');
  const uiPages = [
    '/admin',
    '/admin/tasks',
    '/admin/clients',
    '/admin/support',
    '/admin/departments',
    '/admin/vendors',
    '/admin/sops',
    '/admin/team',
    '/admin/audit-log',
    '/admin/notifications',
    '/admin/reports',
    '/admin/analytics',
    '/admin/war-room',
    '/admin/ai-studio',
  ];

  for (const page of uiPages) {
    const res = await req(page);
    test(`Render UI Page: ${page}`, res.status === 200 && res.data.length > 1000, `Bytes: ${res.data.length}`);
  }

  console.log('\n================================================================');
  console.log(`   VERIFICATION COMPLETE: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFullVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
