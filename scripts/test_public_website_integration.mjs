/**
 * RICOZ Public Website <-> Backend & Admin CMS Integration Test Suite
 * 
 * Verifies that the public website content is dynamically served from InsForge PostgreSQL,
 * visitor inquiries persist and notify admins, the Admin CMS can manage all content,
 * and security rules prevent unauthorized modifications or exposure of unpublished drafts.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3008";

let sessionCookie = "";
let createdEnquiryId = "";
let testFaqId = "";
let testTestimonialId = "";

const results = [];

function record(name, passed, details = "") {
  results.push({ name, passed, details });
  const status = passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`[${status}] ${name} ${details ? `(${details})` : ""}`);
}

async function request(path, options = {}, withAuth = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (withAuth) {
    headers["Origin"] = BASE_URL;
    headers["Referer"] = `${BASE_URL}/admin/website`;
    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  let body;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/ricoz_admin_session=[^;]+/);
    if (match) {
      sessionCookie = match[0];
    }
  }

  return { status: res.status, headers: res.headers, body };
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`RICOZ: Public Website <-> Backend Integration Test Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  try {
    // ----------------------------------------------------
    // SUITE 1: Public Dynamic Content Retrieval
    // ----------------------------------------------------
    console.log("--- 1. Public Content Delivery & Cache Strategy ---");

    const contentRes = await request("/api/public/content");
    const hasCacheControl = contentRes.headers.get("cache-control")?.includes("s-maxage");
    const hasSections = contentRes.body?.success && contentRes.body?.sections?.hero_section;
    const heroMetrics = contentRes.body?.settings?.hero_metrics;
    const hasSettings = heroMetrics && (heroMetrics.talentCount !== undefined || heroMetrics.talent_count !== undefined);
    const talentCount = heroMetrics?.talentCount ?? heroMetrics?.talent_count;

    record(
      "Public Content API (GET /api/public/content)",
      contentRes.status === 200 && hasSections && hasSettings,
      `Sections: ${Object.keys(contentRes.body?.sections || {}).join(", ")}, TalentCount: ${talentCount}`
    );
    record(
      "Public Edge Cache Headers",
      hasCacheControl === true,
      `Cache-Control: ${contentRes.headers.get("cache-control")}`
    );

    const faqsRes = await request("/api/public/faqs");
    const hasFaqs = faqsRes.status === 200 && Array.isArray(faqsRes.body?.faqs) && faqsRes.body.faqs.length > 0;
    record(
      "Public FAQs API (GET /api/public/faqs)",
      hasFaqs,
      `Published FAQs count: ${faqsRes.body?.faqs?.length}`
    );

    const filteredFaqsRes = await request("/api/public/faqs?category=process");
    const processFaqsValid = filteredFaqsRes.status === 200 &&
      filteredFaqsRes.body?.faqs?.every((f) => f.category === "process");
    record(
      "Public FAQs Category Filtering (?category=process)",
      processFaqsValid,
      `Matched FAQs: ${filteredFaqsRes.body?.faqs?.length}`
    );

    // ----------------------------------------------------
    // SUITE 2: Visitor Briefing / Enquiry Submission
    // ----------------------------------------------------
    console.log("\n--- 2. Public Visitor Enquiry Pipeline ---");

    // Invalid enquiry (validation test)
    const invalidEnquiry = await request("/api/public/enquiry", {
      method: "POST",
      body: JSON.stringify({ fullName: "Incomplete" }),
    });
    record(
      "Enquiry Validation Guard (Reject missing fields)",
      invalidEnquiry.status === 400 && invalidEnquiry.body?.success === false,
      `Status: ${invalidEnquiry.status}`
    );

    // Valid inquiry submission (simulating ConciergeBriefingModal)
    const testEnquiryPayload = {
      fullName: "Seraphina Vance",
      email: `seraphina.${Date.now()}@vancecap.com`,
      company: "Vance Global Capital",
      mandateType: "Brand Architecture & Rebrand",
      timeline: "Within 4 weeks",
      budgetRange: "$60,000 - $90,000",
      projectBrief: "Enterprise rebrand across 14 European markets with complete tokenized design system.",
    };

    const enquiryRes = await request("/api/public/enquiry", {
      method: "POST",
      body: JSON.stringify(testEnquiryPayload),
    });

    createdEnquiryId = enquiryRes.body?.enquiryId || "";
    record(
      "Public Enquiry Submission (POST /api/public/enquiry)",
      enquiryRes.status === 201 && !!createdEnquiryId,
      `Enquiry ID: ${createdEnquiryId}`
    );

    // ----------------------------------------------------
    // SUITE 3: Admin Authentication & CMS Review
    // ----------------------------------------------------
    console.log("\n--- 3. Admin Authentication & CMS Inquiries Management ---");

    const loginRes = await request(
      "/api/admin/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: "aadinathachary@gmail.com",
          password: "Ricozhoo@123",
        }),
      },
      true
    );
    record(
      "Admin Login for CMS verification",
      loginRes.status === 200 && loginRes.body?.success === true,
      `User: ${loginRes.body?.user?.fullName}`
    );

    const adminEnquiriesRes = await request("/api/admin/website/enquiries", {}, true);
    const foundCreatedEnquiry = adminEnquiriesRes.body?.enquiries?.find(
      (e) => e.id === createdEnquiryId
    );
    record(
      "Admin Inquiries List (GET /api/admin/website/enquiries)",
      adminEnquiriesRes.status === 200 && !!foundCreatedEnquiry,
      `Found submitted enquiry for company: ${foundCreatedEnquiry?.company}`
    );

    // Update enquiry status to reviewed
    const updateEnquiryRes = await request(
      "/api/admin/website/enquiries",
      {
        method: "PATCH",
        body: JSON.stringify({
          id: createdEnquiryId,
          status: "reviewed",
          notes: "Curatorial squad identified; lead advisor contacted via NDA.",
        }),
      },
      true
    );
    record(
      "Admin Enquiry Status Transition to 'reviewed'",
      updateEnquiryRes.status === 200 && updateEnquiryRes.body?.enquiry?.status === "reviewed",
      `New Status: ${updateEnquiryRes.body?.enquiry?.status}`
    );

    // ----------------------------------------------------
    // SUITE 4: Dynamic CMS Section & Settings Management
    // ----------------------------------------------------
    console.log("\n--- 4. Admin Content Section & Settings Management ---");

    const sectionsRes = await request("/api/admin/website/sections", {}, true);
    const heroSection = sectionsRes.body?.sections?.find((s) => s.section_key === "hero_section");
    record(
      "Admin CMS Sections Listing (GET /api/admin/website/sections)",
      sectionsRes.status === 200 && !!heroSection,
      `Sections Count: ${sectionsRes.body?.sections?.length}`
    );

    // Update hero subtitle via Admin CMS
    const originalSubtitle = heroSection?.subtitle || "";
    const testSubtitle = `Curated Creative Directors and Specialized Design Teams for enterprise mandates. [Updated ${Date.now()}]`;

    const updateSectionRes = await request(
      "/api/admin/website/sections",
      {
        method: "PATCH",
        body: JSON.stringify({
          id: heroSection?.id,
          subtitle: testSubtitle,
        }),
      },
      true
    );
    record(
      "Admin Update Section (PATCH /api/admin/website/sections)",
      updateSectionRes.status === 200 && updateSectionRes.body?.success === true
    );

    // Confirm update reflects on Public Content API immediately
    const updatedContentRes = await request("/api/public/content");
    const isPublicReflected =
      updatedContentRes.body?.sections?.hero_section?.subtitle === testSubtitle;
    record(
      "Dynamic Content Propagation to Public Website",
      isPublicReflected,
      "Public API returned updated section subtitle"
    );

    // Restore original subtitle
    await request(
      "/api/admin/website/sections",
      {
        method: "PATCH",
        body: JSON.stringify({
          id: heroSection?.id,
          subtitle: originalSubtitle,
        }),
      },
      true
    );

    // Test Settings Update
    const updateSettingsRes = await request(
      "/api/admin/website/settings",
      {
        method: "PATCH",
        body: JSON.stringify({
          key: "hero_metrics",
          value: { talentCount: 58, disciplinesCount: 19, activeMandates: 45 },
        }),
      },
      true
    );
    record(
      "Admin Update Site Settings (hero_metrics)",
      updateSettingsRes.status === 200 && updateSettingsRes.body?.success === true
    );

    // Verify public settings updated
    const publicSettingsCheck = await request("/api/public/content");
    const updatedCount =
      publicSettingsCheck.body?.settings?.hero_metrics?.talentCount ??
      publicSettingsCheck.body?.settings?.hero_metrics?.talent_count;
    record(
      "Public Settings Dynamic Update Check",
      updatedCount === 58,
      `Talent Count: ${updatedCount}`
    );

    // Restore settings
    await request(
      "/api/admin/website/settings",
      {
        method: "PATCH",
        body: JSON.stringify({
          key: "hero_metrics",
          value: { talentCount: 57, disciplinesCount: 19, activeMandates: 42 },
        }),
      },
      true
    );

    // ----------------------------------------------------
    // SUITE 5: FAQ Lifecycle & Publishing Controls
    // ----------------------------------------------------
    console.log("\n--- 5. Dynamic FAQ Lifecycle & Publishing Security ---");

    const createFaqRes = await request(
      "/api/admin/website/faqs",
      {
        method: "POST",
        body: JSON.stringify({
          question: "Can we hire an integrated multi-disciplinary squad on RICOZ?",
          answer: "Yes, RICOZ squads can be assembled with a dedicated Creative Director, Brand Strategist, and specialized designers.",
          category: "process",
          isPublished: true,
          displayOrder: 99,
        }),
      },
      true
    );

    testFaqId = createFaqRes.body?.faqId || "";
    record(
      "Admin Create FAQ (POST /api/admin/website/faqs)",
      createFaqRes.status === 201 && !!testFaqId,
      `FAQ ID: ${testFaqId}`
    );

    // Verify it appears in public FAQs
    const publicCheck1 = await request("/api/public/faqs");
    const appearsInPublic = publicCheck1.body?.faqs?.some((f) => f.id === testFaqId);
    record(
      "New FAQ Visible in Public FAQs",
      appearsInPublic === true,
      "Verified published FAQ appears for website visitors"
    );

    // Unpublish FAQ
    const unpublishRes = await request(
      "/api/admin/website/faqs",
      {
        method: "PATCH",
        body: JSON.stringify({
          id: testFaqId,
          isPublished: false,
        }),
      },
      true
    );
    record(
      "Admin Unpublish FAQ (isPublished = false)",
      unpublishRes.status === 200 && unpublishRes.body?.success === true
    );

    // Verify it NO LONGER appears on public FAQs
    const publicCheck2 = await request("/api/public/faqs");
    const hiddenFromPublic = !publicCheck2.body?.faqs?.some((f) => f.id === testFaqId);
    record(
      "Draft/Unpublished FAQ Hidden from Public Visitors (Security Guard)",
      hiddenFromPublic === true,
      "Confirmed unpublished content is filtered out"
    );

    // Clean up test FAQ
    const deleteFaqRes = await request(
      `/api/admin/website/faqs?id=${encodeURIComponent(testFaqId)}`,
      { method: "DELETE" },
      true
    );
    record(
      "Admin Delete Test FAQ",
      deleteFaqRes.status === 200 && deleteFaqRes.body?.success === true
    );

    // ----------------------------------------------------
    // SUITE 6: Testimonials CMS Lifecycle
    // ----------------------------------------------------
    console.log("\n--- 6. Testimonials CMS Lifecycle ---");

    const createTestimonialRes = await request(
      "/api/admin/website/testimonials",
      {
        method: "POST",
        body: JSON.stringify({
          clientName: "David Sterling",
          company: "Apex Dynamics",
          role: "Chief Product Officer",
          quote: "RICOZ assembled an exceptional brand design team that redefined our digital presence in under 6 weeks.",
          rating: 5,
          isFeatured: true,
          isPublished: true,
        }),
      },
      true
    );

    testTestimonialId = createTestimonialRes.body?.testimonialId || "";
    record(
      "Admin Create Testimonial (POST /api/admin/website/testimonials)",
      createTestimonialRes.status === 201 && !!testTestimonialId,
      `ID: ${testTestimonialId}`
    );

    // Check public content includes testimonial
    const publicContentWithTestimonial = await request("/api/public/content");
    const testimonialFoundInPublic = publicContentWithTestimonial.body?.testimonials?.some(
      (t) => t.id === testTestimonialId
    );
    record(
      "Testimonial Propagated to Public Content",
      testimonialFoundInPublic === true,
      "Verified on GET /api/public/content"
    );

    // Clean up test testimonial
    const deleteTestimonialRes = await request(
      `/api/admin/website/testimonials?id=${encodeURIComponent(testTestimonialId)}`,
      { method: "DELETE" },
      true
    );
    record(
      "Admin Delete Test Testimonial",
      deleteTestimonialRes.status === 200 && deleteTestimonialRes.body?.success === true
    );

    // Clean up test enquiry
    if (createdEnquiryId) {
      const deleteEnquiryRes = await request(
        `/api/admin/website/enquiries?id=${encodeURIComponent(createdEnquiryId)}`,
        { method: "DELETE" },
        true
      );
      record(
        "Admin Clean Up Test Enquiry",
        deleteEnquiryRes.status === 200 && deleteEnquiryRes.body?.success === true
      );
    }

    // ----------------------------------------------------
    // SUITE 7: Security & Unauthorized Access Guards
    // ----------------------------------------------------
    console.log("\n--- 7. Security & Anonymous Request Rejection ---");

    const anonEnquiries = await request("/api/admin/website/enquiries", {}, false);
    record(
      "Anonymous Access to Admin Inquiries Rejected (401)",
      anonEnquiries.status === 401
    );

    const anonFaqs = await request("/api/admin/website/faqs", {}, false);
    record(
      "Anonymous Access to Admin FAQs CMS Rejected (401)",
      anonFaqs.status === 401
    );

    const anonSections = await request("/api/admin/website/sections", {}, false);
    record(
      "Anonymous Access to Admin Sections CMS Rejected (401)",
      anonSections.status === 401
    );

    const anonTestimonials = await request("/api/admin/website/testimonials", {}, false);
    record(
      "Anonymous Access to Admin Testimonials CMS Rejected (401)",
      anonTestimonials.status === 401
    );

    const anonSettings = await request("/api/admin/website/settings", {}, false);
    record(
      "Anonymous Access to Admin Settings CMS Rejected (401)",
      anonSettings.status === 401
    );

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    record("Execution Completed Without Runtime Exceptions", false, err.message);
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log(`\n======================================================`);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
