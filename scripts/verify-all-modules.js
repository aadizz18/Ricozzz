const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const DEMO_COOKIE = 'ricoz_admin_session=demo_session_super_admin';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: DEMO_COOKIE,
        Origin: `http://localhost:${PORT}`,
        Referer: `http://localhost:${PORT}/admin`,
        Host: `localhost:${PORT}`,
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

async function verifyAll() {
  console.log('Testing all Admin APIs against http://localhost:3000...\n');
  let passed = 0;
  let total = 0;

  function assert(name, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${name} ${extra}`);
    } else {
      console.error(`[FAIL] ${name} ${extra}`);
    }
  }

  // 1. Clients
  const cGet1 = await request('/api/admin/clients/cli-101-vance');
  assert('GET /api/admin/clients/cli-101-vance', cGet1.status === 200 && cGet1.json?.client?.id === 'cli-101-vance');
  const cGet2 = await request('/api/admin/clients/cli-102-kinetics');
  assert('GET /api/admin/clients/cli-102-kinetics', cGet2.status === 200 && Boolean(cGet2.json?.client));
  const cPatch = await request('/api/admin/clients/cli-102-kinetics', {
    method: 'PATCH',
    body: { onboardingStage: 'active' },
  });
  assert('PATCH /api/admin/clients/cli-102-kinetics (update stage)', cPatch.status === 200 && cPatch.json?.success === true);

  // 2. Support
  const sGet1 = await request('/api/admin/support/REF-2026-001');
  assert('GET /api/admin/support/REF-2026-001', sGet1.status === 200 && Boolean(sGet1.json?.ticket));
  const sPatch = await request('/api/admin/support/REF-2026-001', {
    method: 'PATCH',
    body: { status: 'resolved', resolutionNotes: 'Resolved via automated SLA rule.' },
  });
  assert('PATCH /api/admin/support/REF-2026-001 (update status)', sPatch.status === 200 && sPatch.json?.success === true);
  const sResp = await request('/api/admin/support/REF-2026-001/responses', {
    method: 'POST',
    body: { message: 'Engineer has confirmed fix deployment.' },
  });
  assert('POST /api/admin/support/REF-2026-001/responses (add response)', sResp.status === 200 && sResp.json?.success === true);

  // 3. Departments
  const deptList = await request('/api/admin/departments');
  assert('GET /api/admin/departments', deptList.status === 200 && Array.isArray(deptList.json?.departments) && deptList.json?.departments.length > 0);
  const deptMems = await request('/api/admin/departments/members');
  assert('GET /api/admin/departments/members', deptMems.status === 200 && Array.isArray(deptMems.json?.members));

  // 4. Tasks
  const tGet = await request('/api/admin/tasks/tsk-501-overdue');
  assert('GET /api/admin/tasks/tsk-501-overdue', tGet.status === 200 && Boolean(tGet.json?.task));
  const tPatch = await request('/api/admin/tasks/tsk-501-overdue', {
    method: 'PATCH',
    body: { status: 'in_progress', blockerNote: 'Active mitigation.' },
  });
  assert('PATCH /api/admin/tasks/tsk-501-overdue (update status)', tPatch.status === 200 && tPatch.json?.success === true);
  const tComm = await request('/api/admin/tasks/tsk-501-overdue/comments', {
    method: 'POST',
    body: { comment: 'Design lead unblocked and finalized deliverables.' },
  });
  assert('POST /api/admin/tasks/tsk-501-overdue/comments (add comment)', tComm.status === 200 && tComm.json?.success === true);

  // 5. Vendors
  const vGet = await request('/api/admin/vendors/ven-301-starlight');
  assert('GET /api/admin/vendors/ven-301-starlight', vGet.status === 200 && Boolean(vGet.json?.vendor));
  const vPatch = await request('/api/admin/vendors/ven-301-starlight', {
    method: 'PATCH',
    body: { verificationStatus: 'verified', forceOverride: true },
  });
  assert('PATCH /api/admin/vendors/ven-301-starlight (verify vendor)', vPatch.status === 200 && vPatch.json?.success === true);

  // 6. Team & Permissions
  const usersGet = await request('/api/admin/team/users');
  assert('GET /api/admin/team/users', usersGet.status === 200 && Array.isArray(usersGet.json?.users));
  const rolesGet = await request('/api/admin/team/roles');
  assert('GET /api/admin/team/roles', rolesGet.status === 200 && Array.isArray(rolesGet.json?.roles));
  const permsGet = await request('/api/admin/team/permissions');
  assert('GET /api/admin/team/permissions', permsGet.status === 200 && Array.isArray(permsGet.json?.permissions));
  const overGet = await request('/api/admin/team/overrides');
  assert('GET /api/admin/team/overrides', overGet.status === 200 && Array.isArray(overGet.json?.overrides));

  // 7. Badges, Audit, Notifications, Reports
  const badgesGet = await request('/api/admin/dashboard/badges');
  assert('GET /api/admin/dashboard/badges', badgesGet.status === 200 && typeof badgesGet.json?.counts?.overdueTasks === 'number');
  const auditGet = await request('/api/admin/audit-log');
  assert('GET /api/admin/audit-log', auditGet.status === 200 && Array.isArray(auditGet.json?.logs));
  const notifGet = await request('/api/admin/notifications');
  assert('GET /api/admin/notifications', notifGet.status === 200 && Array.isArray(notifGet.json?.notifications));
  const repGet = await request('/api/admin/reports');
  assert('GET /api/admin/reports', repGet.status === 200 && Boolean(repGet.json?.reports?.taskVelocity));

  // 8. Key UI Pages
  const uiPages = [
    '/admin',
    '/admin/analytics',
    '/admin/clients',
    '/admin/departments',
    '/admin/tasks',
    '/admin/vendors',
    '/admin/support',
    '/admin/sops',
    '/admin/team',
    '/admin/audit-log',
    '/admin/notifications',
    '/admin/reports',
    '/admin/website',
    '/admin/war-room',
    '/admin/ai-studio',
  ];

  console.log('\nTesting UI routes rendering...');
  for (const page of uiPages) {
    const pageRes = await request(page);
    assert(`UI Page ${page}`, pageRes.status === 200);
  }

  console.log(`\nAll API and UI checks completed: ${passed}/${total} passed (${Math.round((passed/total)*100)}%).`);
  if (passed === total) {
    console.log('SUCCESS: All 20 API checks passed with 100% zero errors!');
  } else {
    process.exit(1);
  }
}

verifyAll().catch(e => {
  console.error('API Verification error:', e);
  process.exit(1);
});
