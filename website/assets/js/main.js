/* Renamed from `i18n`: the 8 industry pages also load assets/js/translations.js,
   which declares `const i18n`. Two top-level declarations of the same name is a
   SyntaxError that killed this whole file on those pages. See vcI18n below. */
var vcStrings = {
  en: {
    /* ── Navigation ── */
    'nav.services': 'Services', 'nav.industries': 'Industries',
    'nav.monday': 'monday.com', 'nav.insights': 'Industry Insights',
    'nav.about': 'About', 'nav.cta': 'Book Free Call', 'nav.login': 'Team Log In',
    'nav.s1': 'Paper-to-Digital', 'nav.s2': 'Workflow Automation',
    'nav.s3': 'AI Agent Creation', 'nav.s4': 'monday.com Setup',
    'nav.s5': 'Ongoing Support',

    /* ── monday.com page ── */
    'mon.hero.badge': 'monday.com Implementation Partner',
    'mon.hero.h1': 'Your Business, Fully Organized in <span>monday.com</span>',
    'mon.hero.p': 'Stop managing your business from spreadsheets and sticky notes. We build your monday.com workspace from scratch — boards, automations, CRM, and dashboards — and train your entire team in English and Spanish.',
    'mon.hero.t1l': 'Average setup time<br>for Quick Start',
    'mon.hero.t2l': 'Bilingual training<br>EN / ES',
    'mon.hero.t3l': 'Setup guarantee<br>or your money back',
    'mon.hero.t4l': 'Due before<br>proposal is signed',
    'mon.hero.btn1': 'Book Free Discovery Call', 'mon.hero.btn2': 'See Packages',
    'mon.prod.label': 'monday.com Products We Implement',
    'mon.prod.h2': 'One Platform. Every Part of Your Business.',
    'mon.prod.p': "monday.com is not just a task manager — it's a full operating system for your company. We implement the products that fit your needs, not all of them at once.",
    'mon.p1.name': 'Work Management', 'mon.p1.desc': 'Tasks, projects, team coordination, deadlines, and file sharing — all in one place. Replaces spreadsheets and email chains.', 'mon.p1.tag': 'Core — All Plans',
    'mon.p2.name': 'monday CRM', 'mon.p2.desc': 'Track every lead, contact, deal, and follow-up in a visual pipeline. Never lose a client or forget a callback again.', 'mon.p2.tag': 'Essentials+',
    'mon.p3.name': 'Service & Ticketing', 'mon.p3.desc': 'Manage customer requests, complaints, and service tickets with SLA tracking and automatic routing to the right person.', 'mon.p3.tag': 'Growth+',
    'mon.p4.name': 'Marketing & Campaigns', 'mon.p4.desc': 'Plan launches, track campaigns, manage content calendars, and measure results — integrated with your work boards.', 'mon.p4.tag': 'Growth+',
    'mon.p5.name': 'Automations', 'mon.p5.desc': 'Automatic reminders, status updates, email notifications, and cross-board actions. Stop doing manually what a machine can do.', 'mon.p5.tag': 'All Plans',
    'mon.p6.name': 'Dashboards & Reports', 'mon.p6.desc': 'Real-time views of your pipeline, team workload, revenue, and operations — built for owners, not IT departments.', 'mon.p6.tag': 'All Plans',
    'mon.for.label': 'Who We Work With',
    'mon.for.h2': 'Built for Small Business Owners Who Are Done with the Chaos',
    'mon.for.p': "If you're managing jobs, clients, or inventory from memory, text threads, or a messy spreadsheet — this is for you.",
    'mon.pkg.label': 'monday.com Implementation Packages',
    'mon.pkg.h2': 'One-Time Setup. You Own It Forever.',
    'mon.pkg.p': "No subscriptions for our work — you pay once, we build it, you keep it. Add a monthly retainer only if you want ongoing support and optimization.",
    'mon.pkg.note': '<strong>Not sure which plan?</strong><br>Every engagement begins with a free 30-minute discovery call. We\'ll map your current workflow, identify the right monday.com products, and recommend a package — no pressure, no obligation.',
    'mon.cmp.label': 'Compare Plans', 'mon.cmp.h2': "What's Included in Each Package",
    'mon.proc.label': 'The Implementation Process',
    'mon.proc.h2': 'We Handle Everything. You Just Show Up.',
    'mon.proc.p': 'From your first call to go-live, here\'s exactly how we work together — no surprises, no tech overwhelm.',
    'mon.proc.s1h': 'Discovery Call (Free)', 'mon.proc.s1p': "We spend 30 minutes mapping your current workflow — where the bottlenecks are, what tools you're using, and what's costing you the most time. We recommend a package and a scope. No commitment required.", 'mon.proc.s1d': '30 minutes · Free',
    'mon.proc.s2h': 'Proposal & Scope Sign-Off', 'mon.proc.s2p': 'You receive a written proposal with every deliverable, the timeline, and the exact price. We send a simple service agreement — once signed, we collect your 50% deposit and work begins.', 'mon.proc.s2d': '24–48 hours after call',
    'mon.proc.s3h': 'Workspace Architecture', 'mon.proc.s3p': "We design your board structure, naming conventions, and workflow logic before building anything. You approve the blueprint — so there are no surprises when it's live.", 'mon.proc.s3d': 'Day 1–2 of build',
    'mon.proc.s4h': 'Build, Automate & Connect', 'mon.proc.s4p': "We configure every board, build every automation, set up your CRM pipeline, connect integrations (Gmail, Slack, WhatsApp, QuickBooks), and populate sample data so it's ready to use on day one.", 'mon.proc.s4d': 'Day 2–5 depending on package',
    'mon.proc.s5h': 'Training & Go-Live', 'mon.proc.s5p': 'We walk you and your team through the whole system in English and Spanish. You get a recording of the session, a written reference guide, and hands-on access while we\'re still on the call. Final 50% payment is collected after you\'ve approved and your team is confident.', 'mon.proc.s5d': 'Final day · Bilingual EN/ES',
    'mon.add.label': 'Add-Ons', 'mon.add.h2': 'Extend Any Package', 'mon.add.p': 'Add these to any plan — billed once or monthly. Perfect for teams that want to grow the system after launch.',
    'mon.a1h': 'Monthly Maintenance', 'mon.a1p': 'Monthly board updates, automation fixes, new-hire onboarding setup, and direct access to Andres for questions.', 'mon.a1t': '$197/mo',
    'mon.a2h': 'Extra Automation Pack', 'mon.a2p': '10 additional automations built and tested for your workspace — triggered notifications, cross-board actions, deadline escalations.', 'mon.a2t': '$247 one-time',
    'mon.a3h': 'Training Session (Extra)', 'mon.a3p': '1-on-1 or group walkthrough for new hires, advanced features, or refresher. 60 minutes, bilingual EN/ES, recorded.', 'mon.a3t': '$147/session',
    'mon.a4h': 'CRM Data Migration', 'mon.a4p': 'Migrate existing contacts, leads, and deal history from HubSpot, Salesforce, spreadsheets, or any CSV export into monday CRM.', 'mon.a4t': '$497 one-time',
    'mon.a5h': 'QuickBooks / Accounting Integration', 'mon.a5p': 'Connect monday.com to QuickBooks Online or FreshBooks — sync invoices, client records, and payment statuses automatically.', 'mon.a5t': '$350 one-time',
    'mon.a6h': 'Custom API Integration', 'mon.a6p': 'Connect monday.com to any tool with an API — POS systems, booking platforms, ERP software, or proprietary databases.', 'mon.a6t': 'From $500 — scoped',
    'mon.a7h': 'SOP Documentation Pack', 'mon.a7p': 'Step-by-step written SOPs for each workflow built in monday.com — bilingual EN/ES, formatted for new hire onboarding.', 'mon.a7t': '$297 one-time',
    'mon.a8h': 'Quarterly System Review', 'mon.a8p': 'Every 3 months: a full audit of your workspace, identify inefficiencies, and update automations as your business evolves.', 'mon.a8t': '$247/quarter',
    'mon.faq.label': 'FAQ', 'mon.faq.h2': 'Common Questions',
    'mon.q1': 'Do I need a monday.com subscription before I hire you?', 'mon.a1q': "No — you don't need anything before the discovery call. After we agree on scope, we'll help you select the right monday.com plan for your team size. monday.com starts at $9/user/month. That's a separate cost from our implementation fee.",
    'mon.q2': 'How long does the full setup take?', 'mon.a2q': 'Quick Start is delivered in 5 business days. Operations Essentials takes 7–10 days. Growth Suite takes 2–3 weeks. Custom Build is scoped to your project — typically 3–6 weeks. We give you a firm timeline in the proposal before any money changes hands.',
    'mon.q3': 'What if I already have a monday.com account with some boards set up?', 'mon.a3q': "No problem. We start with an audit of what you have, keep what's working, and rebuild what isn't. We won't charge you to start from scratch if you have a solid foundation already.",
    'mon.q4': 'Is the training really in Spanish?', 'mon.a4q': "Yes. Andres Ramirez is bilingual and conducts all training in the language your team is most comfortable with — English, Spanish, or a mix of both.",
    'mon.q5': "What's the 30-day setup guarantee?", 'mon.a5q': "If your workspace isn't fully built, tested, and your team isn't trained within the agreed timeline, you don't pay the final 50%. We finish what we promised — or we refund the difference.",
    'mon.q6': 'Do I need technical skills to maintain it after setup?', 'mon.a6q': "No. We build systems that non-technical owners can manage day-to-day. Adding items, updating statuses, checking dashboards — all straightforward.",
    'mon.cta.h2': 'Start with a Free Discovery Call',
    'mon.cta.p': "30 minutes. No tech jargon, no sales pitch. We map your current workflow and tell you exactly what monday.com can automate.",
    'mon.cta.btn2': 'View All Services',
    'ind.rest': 'Restaurants & Catering', 'ind.const': 'Construction & Contracting', 'ind.re': 'Real Estate & Property Mgmt',
    'ind.hw': 'Health & Wellness', 'ind.ret': 'Retail & Boutiques', 'ind.ps': 'Professional Services',
    'ind.sb': 'Salons & Beauty', 'ind.log': 'Logistics & Delivery',
    'mon.for.r1': 'Vendor orders, staff schedules, event management', 'mon.for.r2': 'Project timelines, subcontractors, invoicing',
    'mon.for.r3': 'Listings, tenant requests, maintenance tracking', 'mon.for.r4': 'Appointments, client files, billing workflows',
    'mon.for.r5': 'Inventory, suppliers, order tracking', 'mon.for.r6': 'Client work, proposals, billing, team tasks',
    'mon.for.r7': 'Bookings, staff tasks, product inventory', 'mon.for.r8': 'Routes, dispatch, driver coordination',
    'mon.once': 'one-time', 'mon.start': 'starting at', 'mon.popular': 'Most Popular',
    'mon.qs.cad': 'Solo owner or 1–3 person team', 'mon.qs.del': 'Delivered in 5 business days',
    'mon.qs.f1': 'Free 30-min discovery call', 'mon.qs.f2': '1 monday.com product configured', 'mon.qs.f3': 'Up to 3 custom boards',
    'mon.qs.f4': '5 automations (reminders, status, alerts)', 'mon.qs.f5': '1 reporting dashboard',
    'mon.qs.f6': '1-hour walkthrough training (EN/ES)', 'mon.qs.f7': '14-day email support',
    'mon.qs.f8': 'CRM setup', 'mon.qs.f9': 'External integrations',
    'mon.oe.cad': 'Teams of 3–15 employees', 'mon.oe.del': '+ optional $297/mo retainer',
    'mon.oe.f1': 'Everything in Quick Start', 'mon.oe.f2': 'Full workspace architecture design', 'mon.oe.f3': 'Up to 8 custom boards',
    'mon.oe.f4': 'monday CRM — pipeline, contacts, deals', 'mon.oe.f5': '15+ automations across all boards',
    'mon.oe.f6': '2 executive dashboards', 'mon.oe.f7': '1 external integration (Gmail, Slack, or WhatsApp)',
    'mon.oe.f8': 'Full team training up to 5 people (EN/ES)', 'mon.oe.f9': '30-day email + chat support',
    'mon.gs.cad': '15+ employees or multi-location', 'mon.gs.del': '+ optional $497/mo retainer',
    'mon.gs.f1': 'Everything in Essentials', 'mon.gs.f2': 'Full CRM pipeline — leads to deals to clients',
    'mon.gs.f3': 'Service & ticketing module', 'mon.gs.f4': '30+ automations including cross-board triggers',
    'mon.gs.f5': '3 executive dashboards + KPI tracking', 'mon.gs.f6': 'SOP documentation per workflow',
    'mon.gs.f7': 'Up to 3 integrations (QuickBooks, Zapier, etc.)', 'mon.gs.f8': 'Team training up to 10 people (EN/ES)',
    'mon.gs.f9': '30-day support + 1 optimization call',
    'mon.cb.cad': 'Enterprise results, small biz price', 'mon.cb.del': 'Scoped to your exact requirements',
    'mon.cb.f1': 'Full discovery & architecture workshop', 'mon.cb.f2': 'Unlimited boards & workspaces',
    'mon.cb.f3': 'Data migration from existing tools', 'mon.cb.f4': 'Custom automations + API integrations',
    'mon.cb.f5': 'Department-level dashboards', 'mon.cb.f6': 'Full bilingual documentation (EN/ES)',
    'mon.cb.f7': 'Admin + staff + manager training tracks', 'mon.cb.f8': '60-day dedicated support',
    'mon.cb.f9': 'Monthly maintenance available', 'mon.cb.cta': "Let's Talk Scope",
    'mon.cmp.feat': 'Feature', 'mon.cmp.r1': 'Free discovery call', 'mon.cmp.r2': 'Custom boards configured',
    'mon.cmp.r2a': 'Up to 3', 'mon.cmp.r2b': 'Up to 8', 'mon.cmp.r2c': 'Unlimited',
    'mon.cmp.r3': 'Automations built', 'mon.cmp.r3c': 'Unlimited', 'mon.cmp.r4': 'Reporting dashboards', 'mon.cmp.r4c': 'Per dept.',
    'mon.cmp.r5': 'monday CRM setup', 'mon.cmp.r6': 'Service & ticketing module', 'mon.cmp.r7': 'External integrations',
    'mon.cmp.r7b': '1 (Gmail/Slack/WA)', 'mon.cmp.r7c': 'Up to 3', 'mon.cmp.r7c2': 'Unlimited',
    'mon.cmp.r8': 'Data migration', 'mon.cmp.r9': 'SOP documentation', 'mon.cmp.r10': 'Team training (EN/ES)',
    'mon.cmp.r10a': '1-hr / 1 person', 'mon.cmp.r10b': 'Up to 5 people', 'mon.cmp.r10c': 'Up to 10 people', 'mon.cmp.r10d': 'All levels',
    'mon.cmp.r11': 'Bilingual setup & docs', 'mon.cmp.r12': 'Post-launch support',
    'mon.cmp.r12a': '14 days email', 'mon.cmp.r12b': '30 days email+chat', 'mon.cmp.r12c': '30 days + call', 'mon.cmp.r12d': '60 days dedicated',
    'mon.cmp.r13': 'Monthly retainer', 'mon.cmp.r13a': 'Add-on', 'mon.cmp.r13b': '$297/mo optional', 'mon.cmp.r13c': '$497/mo optional', 'mon.cmp.r13d': 'Custom',

    /* ── Homepage ── */
    'hero.tag': 'Trusted by 100+ small business owners',
    'hero.badge': 'Introducing Leak Engine',
    'hero.h1': 'Every Missed Call<br>Could Be a <span>Client.</span>',
    'hero.subtitle': 'Leak Engine helps small business owners stop losing leads from unanswered phone calls. Capture missed-call opportunities, trigger instant follow-up, and turn more callers into real customers.',
    'hero.btn1': 'See Leak Engine', 'hero.btn2': 'Book a Demo',
    'hero.incoming': 'Incoming Call', 'hero.localbiz': 'Local Business', 'hero.missedcall': 'Missed Call',
    'hero.captured': 'Missed Call Captured', 'hero.newlead': 'New Lead',
    'hero.s1t': 'Lead Captured',      'hero.s1s': 'Missed call saved',
    'hero.s2t': 'Auto Follow-Up',     'hero.s2s': 'SMS sent instantly',
    'hero.s3t': 'Callback Scheduled', 'hero.s3s': 'Today at 2:00 PM',

    'lc.eyebrow': 'Revenue Leak Audit',
    'lc.h1': 'How much is your business <em>leaking</em> every month?',
    'lc.sub': 'Roughly 62% of calls to small businesses go unanswered — and 85% of those callers never call back. Enter your real numbers and watch the leak.',
    'lc.yourNumbers': 'Your numbers',
    'lc.industry': 'Your industry',
    'lc.missed': 'Missed calls per week',
    'lc.missedHint': 'Check your phone logs — most owners underestimate this by half.',
    'lc.avgValue': 'Average customer value ($)',
    'lc.valueHint': 'What one new customer is worth to you (first job, not lifetime).',
    'lc.closeRate': 'Your close rate on answered calls',
    'lc.meterLbl': 'Estimated revenue leak',
    'lc.perMonth': 'per month, walking out the door',
    'lc.perYear': 'Per year',
    'lc.recoverable': 'Recoverable with AI*',
    'lc.recoTag': 'Recommended fix',
    'lc.ctaNote': '$497 Leak Audit — credited toward any install.',
    'lc.cta': 'Book your Leak Audit',
    'lc.foot': '*Assumes AI systems capture ~60% of currently missed opportunities. Estimates based on industry research (411 Locals, Invoca, BIA/Kelsey): 62% of calls unanswered, 85% of missed callers never call back. Your audit uses your actual 30-day call data.',
    'hero.m1v': '6+ hrs saved',      'hero.m1l': 'per week, on average',
    'hero.m2v': 'Zero lost files',   'hero.m2l': 'after going digital',
    'hero.m3v': '80% fewer errors',  'hero.m3l': 'in daily operations',
    'hero.m4v': '30-day setup',      'hero.m4l': 'from paper to digital',
    'trust.l1': 'Businesses Helped', 'trust.l2': 'Industries Served',
    'trust.l3': 'Saved Per Week',    'trust.l4': 'Error Reduction', 'trust.l5': 'Day Setup',
    'svc.label': 'What We Do',
    'svc.title': 'Five Services. One Goal: Run Your Business Smarter.',
    'svc.sub': 'Every service replaces a manual process with a system that works for you — built on the tools your team will actually use.',
    'svc.partner': 'Certified Partner', 'svc.partner.label': 'Delivering results through', 'svc.partner.link': 'See our monday.com packages', 'svc.partner.since': 'Since 2024',
    'svc.c1t': 'Paper-to-Digital & Document Management',
    'svc.c1d': 'We digitize, scan, and organize your existing documents, records, contracts, and invoices into a searchable digital system — structured from day one so nothing gets lost.',
    'svc.c2t': 'Workflow Automation',
    'svc.c2d': 'Manual processes become automated. Reminders, approvals, status updates, and cross-team notifications run on schedule — without anyone having to remember to send them.',
    'svc.c3t': 'AI Agent Creation',
    'svc.c3d': 'We build custom AI agents that handle client follow-ups, appointment scheduling, intake forms, and team communications — responding on your behalf, 24 hours a day.',
    'svc.c4t': 'monday.com Implementation',
    'svc.c4d': 'As a certified monday.com partner, we design and build your full workspace — boards, CRM pipeline, project tracking, automations, and reporting dashboards. Then we train your entire team in English and Spanish until they are confident using it daily.',
    'svc.c4tag': 'Setup · CRM · Project Tracking · Training',
    'svc.c5t': 'Ongoing Digital Support',
    'svc.c5d': 'We stay with you after go-live. Monthly maintenance, new-hire training, system updates, and a direct line to Andres as your business grows and your needs change.',
    'ind.label': 'Industries We Serve', 'ind.title': 'We Know Your Industry',
    'ind.sub': 'We don\'t do generic. Every system is built around the specific challenges of your business type.',
    'hiw.label': 'The Process', 'hiw.title': 'From Paper to Digital in 4 Steps',
    'hiw.sub': 'Simple, hands-on, and designed for owners who don\'t have time to learn new tech on their own.',
    'hiw.s1t': 'Free Workflow Assessment',
    'hiw.s1d': '30-minute call to map exactly where you\'re losing time, money, and sleep to manual processes.',
    'hiw.s2t': 'Custom System Design',
    'hiw.s2d': 'We build a digital workflow plan specific to your industry, team size, and biggest bottlenecks.',
    'hiw.s3t': 'Setup & Hands-On Training',
    'hiw.s3d': 'We set it up, migrate your existing data, and train your team until everyone is confident.',
    'hiw.s4t': 'Ongoing Support',
    'hiw.s4d': 'We stay available as your business grows. Add workflows, troubleshoot, or just ask questions.',
    'test.label': 'Real Results', 'test.title': 'What Business Owners Say',
    'test.sub': 'Real stories from real small business owners — in their own words.',
    'test.q1': 'I used to dread inspection week. Now everything is one click away.',
    'test.n1': 'Maria G.',   'test.i1': 'Restaurant Owner · Miami, FL',
    'test.q2': 'We used to bill late every single month. Now invoices go out the same day the job is done.',
    'test.n2': 'Roberto M.', 'test.i2': 'General Contractor · Houston, TX',
    'test.q3': 'We grew from 20 to 40 units without hiring extra staff. The system does the tracking for us.',
    'test.n3': 'Luis T.',    'test.i3': 'Property Manager · Dallas, TX',
    'about.label': 'About Andres', 'about.title': 'A Partner Who Gets It',
    'about.p1': 'I started ValuConnect Solutions because I watched too many hardworking business owners spend their evenings buried in paperwork instead of with their families — not because they wanted to, but because they didn\'t know there was a better way.',
    'about.quote': '"My mission is simple: help small businesses work smarter, not harder — with digital systems that grow with them."',
    'about.p2': 'Every system I build is custom. I take the time to understand your specific workflow before suggesting a solution. I\'m bilingual, I serve the Latino business community with pride, and I stay with you long after setup is complete.',
    'about.p3': 'I\'m also a certified monday.com partner — one of the few bilingual implementation specialists serving the small business community.',
    'about.btn1': 'Book a Free Call with Andres', 'about.btn2': 'Explore Your Industry',
    'about.badge': 'Businesses Helped',
    'cta.title': 'Ready to Stop Running on Paper?',
    'cta.desc': 'Book your free 30-minute workflow assessment. No tech jargon, no pressure — just a real conversation about how your business could work smarter.',
    'cta.btn1': 'Book Free 30-Min Call', 'cta.btn2': 'Explore Your Industry',
    'foot.brand': 'Helping small businesses work smarter, not harder — with digital systems that grow with them.',
    'foot.svcTitle': 'Services',
    'foot.s1': 'Paper-to-Digital', 'foot.s3': 'Workflow Automation',
    'foot.s5': 'AI Agent Creation', 'foot.s6': 'Digital Support',
    'foot.indTitle': 'Industries',
    'foot.i1': 'Restaurants',       'foot.i2': 'Retail & Boutiques',
    'foot.i3': 'Construction',      'foot.i4': 'Health & Wellness',
    'foot.i5': 'Real Estate',       'foot.i6': 'Professional Services',
    'foot.i7': 'Salons & Beauty',   'foot.i8': 'Logistics',
    'foot.conTitle': 'Connect',     'foot.c1': 'Book Free Call',
    'foot.copy': '© 2025–2026 ValuConnect Solutions. All rights reserved. Founder: Andres Ramirez.',
    'foot.privacy': 'Privacy Policy', 'foot.terms': 'Terms of Service',

    /* ── Newsletter modal ── */
    'modal.tag': 'Industry Insights',
    'modal.title': 'Stay Ahead in Your Industry',
    'modal.sub': 'Get practical tips, workflow ideas, and digital transformation insights for small business owners — delivered in English and Spanish. No spam, ever.',
    'modal.ph.name': 'Your first name',
    'modal.ph.email': 'Your email address',
    'modal.ph.industry': 'Your industry (optional)',
    'modal.submit': 'Subscribe to Industry Insights',
    'modal.privacy': 'No spam. Unsubscribe anytime. Your information is never shared.',
    'modal.ok.title': "You're in!",
    'modal.ok.sub': "We'll send your first industry insight soon. Check your inbox.",

    /* ── Chatbot ── */
    'chat.status': 'Typically replies instantly',
    'chat.welcome': 'Hi! I\'m here to help you learn about ValuConnect Solutions. What would you like to know?',
    'chat.qr.services': 'What services do you offer?',
    'chat.qr.pricing': 'How much does it cost?',
    'chat.qr.industries': 'What industries do you serve?',
    'chat.qr.timeline': 'How long does setup take?',
    'chat.qr.training': 'Is training included?',
    'chat.qr.book': 'Book a free call',
    'chat.a.services': 'We offer 5 core services: Paper-to-Digital, Workflow Automation, AI Agent Creation, monday.com Implementation, and Ongoing Digital Support. Each one replaces a manual process with a system that works for you.',
    'chat.a.pricing': 'Pricing depends on scope. Our monday.com packages start at $997 for a Quick Start. All engagements begin with a free 30-minute call — no commitment required.',
    'chat.a.industries': 'We work with Restaurants, Retail, Construction, Health & Wellness, Real Estate, Professional Services, Salons & Beauty, and Logistics. Not sure if we cover yours? Book a free call.',
    'chat.a.timeline': 'Quick Start takes 5 business days. Full implementations range from 7 to 30 days depending on scope. You always get a firm timeline before any payment.',
    'chat.a.training': 'Yes — all packages include bilingual training in English and Spanish for you and your team. Sessions are recorded with written guides included.',
    'chat.a.book': 'You can book your free 30-minute workflow assessment here:'
  },

  es: {
    /* ── Navigation ── */
    'nav.services': 'Servicios', 'nav.industries': 'Industrias',
    'nav.monday': 'monday.com', 'nav.insights': 'Perspectivas del Sector',
    'nav.about': 'Sobre Nosotros', 'nav.cta': 'Llamada Gratis', 'nav.login': 'Acceso Equipo',
    'nav.s1': 'Papel a Digital', 'nav.s2': 'Automatización',
    'nav.s3': 'Agentes de IA', 'nav.s4': 'Configuración monday.com',
    'nav.s5': 'Soporte Continuo',

    /* ── monday.com page ── */
    'mon.hero.badge': 'Socio de Implementación monday.com',
    'mon.hero.h1': 'Tu Negocio, Totalmente Organizado en <span>monday.com</span>',
    'mon.hero.p': 'Deja de manejar tu negocio desde hojas de cálculo y notas adhesivas. Construimos tu espacio de trabajo en monday.com desde cero — tableros, automatizaciones, CRM y paneles — y capacitamos a todo tu equipo en inglés y español.',
    'mon.hero.t1l': 'Tiempo promedio de setup<br>para Quick Start',
    'mon.hero.t2l': 'Capacitación bilingüe<br>EN / ES',
    'mon.hero.t3l': 'Garantía de configuración<br>o te devolvemos tu dinero',
    'mon.hero.t4l': 'Antes de firmar<br>la propuesta',
    'mon.hero.btn1': 'Agenda tu Llamada Gratis', 'mon.hero.btn2': 'Ver Paquetes',
    'mon.prod.label': 'Productos de monday.com que Implementamos',
    'mon.prod.h2': 'Una Plataforma. Para Cada Parte de tu Negocio.',
    'mon.prod.p': 'monday.com no es solo un gestor de tareas — es un sistema operativo completo para tu empresa.',
    'mon.p1.name': 'Gestión de Trabajo', 'mon.p1.desc': 'Tareas, proyectos, coordinación de equipo, plazos y archivos — todo en un solo lugar.', 'mon.p1.tag': 'Core — Todos los Planes',
    'mon.p2.name': 'monday CRM', 'mon.p2.desc': 'Rastrea cada cliente potencial, contacto, negocio y seguimiento en un pipeline visual.', 'mon.p2.tag': 'Essentials+',
    'mon.p3.name': 'Servicio y Tickets', 'mon.p3.desc': 'Gestiona solicitudes de clientes y tickets con seguimiento SLA y enrutamiento automático.', 'mon.p3.tag': 'Growth+',
    'mon.p4.name': 'Marketing y Campañas', 'mon.p4.desc': 'Planifica lanzamientos, rastrea campañas y administra calendarios de contenido.', 'mon.p4.tag': 'Growth+',
    'mon.p5.name': 'Automatizaciones', 'mon.p5.desc': 'Recordatorios automáticos, actualizaciones de estado y notificaciones por correo. Deja de hacer manualmente lo que una máquina puede hacer.', 'mon.p5.tag': 'Todos los Planes',
    'mon.p6.name': 'Paneles e Informes', 'mon.p6.desc': 'Vistas en tiempo real de tu pipeline, carga de trabajo, ingresos y operaciones.', 'mon.p6.tag': 'Todos los Planes',
    'mon.for.label': '¿Con Quién Trabajamos?',
    'mon.for.h2': 'Para Dueños de Negocios Que Ya No Quieren el Caos',
    'mon.for.p': 'Si gestionas trabajos, clientes o inventario desde la memoria, hilos de texto o una hoja de cálculo desordenada — esto es para ti.',
    'mon.pkg.label': 'Paquetes de Implementación monday.com',
    'mon.pkg.h2': 'Configuración Única. Lo Posees Para Siempre.',
    'mon.pkg.p': 'Sin suscripciones por nuestro trabajo — pagas una vez, lo construimos, lo conservas.',
    'mon.pkg.note': '<strong>¿No sabes cuál plan elegir?</strong><br>Todo compromiso comienza con una llamada de descubrimiento gratuita de 30 minutos.',
    'mon.cmp.label': 'Comparar Planes', 'mon.cmp.h2': 'Qué Incluye Cada Paquete',
    'mon.proc.label': 'El Proceso de Implementación',
    'mon.proc.h2': 'Nosotros Nos Encargamos de Todo. Tú Solo Apareces.',
    'mon.proc.p': 'Desde tu primera llamada hasta el lanzamiento, así es exactamente cómo trabajamos juntos.',
    'mon.proc.s1h': 'Llamada de Descubrimiento (Gratis)', 'mon.proc.s1p': 'Pasamos 30 minutos mapeando tu flujo de trabajo actual — dónde están los cuellos de botella y qué te cuesta más tiempo.', 'mon.proc.s1d': '30 minutos · Gratis',
    'mon.proc.s2h': 'Propuesta y Aprobación', 'mon.proc.s2p': 'Recibes una propuesta escrita con cada entregable, el cronograma y el precio exacto.', 'mon.proc.s2d': '24–48 horas después de la llamada',
    'mon.proc.s3h': 'Arquitectura del Espacio', 'mon.proc.s3p': 'Diseñamos la estructura de tu tablero y la lógica del flujo de trabajo antes de construir nada.', 'mon.proc.s3d': 'Días 1–2 de construcción',
    'mon.proc.s4h': 'Construcción, Automatización y Conexión', 'mon.proc.s4p': 'Configuramos cada tablero, construimos cada automatización y conectamos integraciones.', 'mon.proc.s4d': 'Días 2–5 según el paquete',
    'mon.proc.s5h': 'Capacitación y Lanzamiento', 'mon.proc.s5p': 'Llevamos a ti y a tu equipo por todo el sistema en inglés y español. Recibes grabación y guía escrita.', 'mon.proc.s5d': 'Día final · Bilingüe EN/ES',
    'mon.add.label': 'Servicios Adicionales', 'mon.add.h2': 'Extiende Cualquier Paquete', 'mon.add.p': 'Agrégalos a cualquier plan — cobrados una vez o mensualmente.',
    'mon.a1h': 'Mantenimiento Mensual', 'mon.a1p': 'Actualizaciones mensuales, corrección de automatizaciones y acceso directo a Andres.', 'mon.a1t': '$197/mes',
    'mon.a2h': 'Paquete de Automatizaciones Extra', 'mon.a2p': '10 automatizaciones adicionales construidas y probadas para tu espacio de trabajo.', 'mon.a2t': '$247 único',
    'mon.a3h': 'Sesión de Capacitación Extra', 'mon.a3p': 'Walkthrough individual o grupal. 60 minutos, bilingüe EN/ES, grabado.', 'mon.a3t': '$147/sesión',
    'mon.a4h': 'Migración de Datos CRM', 'mon.a4p': 'Migra contactos existentes y negocios desde HubSpot, Salesforce o cualquier CSV.', 'mon.a4t': '$497 único',
    'mon.a5h': 'Integración QuickBooks', 'mon.a5p': 'Conecta monday.com con QuickBooks Online o FreshBooks — sincroniza facturas automáticamente.', 'mon.a5t': '$350 único',
    'mon.a6h': 'Integración API Personalizada', 'mon.a6p': 'Conecta monday.com con cualquier herramienta con API — POS, plataformas de reservas, ERP.', 'mon.a6t': 'Desde $500 — cotizado',
    'mon.a7h': 'Documentación SOP', 'mon.a7p': 'SOPs escritos paso a paso para cada flujo de trabajo — bilingüe EN/ES.', 'mon.a7t': '$297 único',
    'mon.a8h': 'Revisión Trimestral', 'mon.a8p': 'Cada 3 meses: auditoría completa del espacio de trabajo y actualización de automatizaciones.', 'mon.a8t': '$247/trimestre',
    'mon.faq.label': 'Preguntas Frecuentes', 'mon.faq.h2': 'Preguntas Comunes',
    'mon.q1': '¿Necesito una suscripción a monday.com antes de contratarte?', 'mon.a1q': 'No — no necesitas nada antes de la llamada de descubrimiento. Después de acordar el alcance, te ayudaremos a seleccionar el plan correcto.',
    'mon.q2': '¿Cuánto tiempo tarda la configuración completa?', 'mon.a2q': 'Quick Start se entrega en 5 días hábiles. Operations Essentials tarda 7–10 días. Growth Suite tarda 2–3 semanas.',
    'mon.q3': '¿Qué pasa si ya tengo una cuenta con tableros?', 'mon.a3q': 'Sin problema. Comenzamos con una auditoría de lo que tienes, conservamos lo que funciona y reconstruimos lo que no.',
    'mon.q4': '¿La capacitación es realmente en español?', 'mon.a4q': 'Sí. Andres Ramirez es bilingüe y realiza toda la capacitación en el idioma en que tu equipo se sienta más cómodo.',
    'mon.q5': '¿En qué consiste la garantía de 30 días?', 'mon.a5q': 'Si tu espacio de trabajo no está completamente construido y tu equipo no está capacitado dentro del cronograma acordado, no pagas el 50% final.',
    'mon.q6': '¿Necesito conocimientos técnicos para mantenerlo?', 'mon.a6q': 'No. Construimos sistemas que los dueños no técnicos pueden gestionar día a día.',
    'mon.cta.h2': 'Comienza con una Llamada de Descubrimiento Gratis',
    'mon.cta.p': '30 minutos. Sin jerga técnica. Mapeamos tu flujo de trabajo y te decimos exactamente qué puede automatizar monday.com.',
    'mon.cta.btn2': 'Ver Todos los Servicios',
    'ind.rest': 'Restaurantes y Catering', 'ind.const': 'Construcción y Contratos', 'ind.re': 'Bienes Raíces y Propiedades',
    'ind.hw': 'Salud y Bienestar', 'ind.ret': 'Comercio y Boutiques', 'ind.ps': 'Servicios Profesionales',
    'ind.sb': 'Salones y Belleza', 'ind.log': 'Logística y Entregas',
    'mon.for.r1': 'Pedidos a proveedores, horarios del personal, gestión de eventos',
    'mon.for.r2': 'Cronogramas de proyectos, subcontratistas, facturación',
    'mon.for.r3': 'Listados, solicitudes de inquilinos, seguimiento de mantenimiento',
    'mon.for.r4': 'Citas, expedientes de clientes, flujos de facturación',
    'mon.for.r5': 'Inventario, proveedores, seguimiento de pedidos',
    'mon.for.r6': 'Trabajo con clientes, propuestas, facturación, tareas del equipo',
    'mon.for.r7': 'Reservas, tareas del personal, inventario de productos',
    'mon.for.r8': 'Rutas, despacho, coordinación de conductores',
    'mon.once': 'único', 'mon.start': 'desde', 'mon.popular': 'Más Popular',
    'mon.qs.cad': 'Dueño solo o equipo de 1–3 personas', 'mon.qs.del': 'Entregado en 5 días hábiles',
    'mon.qs.f1': 'Llamada de descubrimiento gratis', 'mon.qs.f2': '1 producto monday.com configurado', 'mon.qs.f3': 'Hasta 3 tableros personalizados',
    'mon.qs.f4': '5 automatizaciones (recordatorios, estado, alertas)', 'mon.qs.f5': '1 panel de informes',
    'mon.qs.f6': 'Capacitación de 1 hora (EN/ES)', 'mon.qs.f7': '14 días de soporte por correo',
    'mon.qs.f8': 'Configuración de CRM', 'mon.qs.f9': 'Integraciones externas',
    'mon.oe.cad': 'Equipos de 3–15 empleados', 'mon.oe.del': '+ retainer opcional de $297/mes',
    'mon.oe.f1': 'Todo lo de Quick Start', 'mon.oe.f2': 'Diseño completo de arquitectura', 'mon.oe.f3': 'Hasta 8 tableros personalizados',
    'mon.oe.f4': 'monday CRM — pipeline, contactos, negocios', 'mon.oe.f5': '15+ automatizaciones en todos los tableros',
    'mon.oe.f6': '2 paneles ejecutivos', 'mon.oe.f7': '1 integración externa (Gmail, Slack o WhatsApp)',
    'mon.oe.f8': 'Capacitación completa hasta 5 personas (EN/ES)', 'mon.oe.f9': '30 días de soporte por correo + chat',
    'mon.gs.cad': '15+ empleados o varias ubicaciones', 'mon.gs.del': '+ retainer opcional de $497/mes',
    'mon.gs.f1': 'Todo lo de Essentials', 'mon.gs.f2': 'Pipeline CRM completo',
    'mon.gs.f3': 'Módulo de servicio y tickets', 'mon.gs.f4': '30+ automatizaciones incluyendo acciones entre tableros',
    'mon.gs.f5': '3 paneles ejecutivos + KPIs', 'mon.gs.f6': 'Documentación SOP por flujo de trabajo',
    'mon.gs.f7': 'Hasta 3 integraciones', 'mon.gs.f8': 'Capacitación hasta 10 personas (EN/ES)',
    'mon.gs.f9': '30 días de soporte + 1 llamada de optimización',
    'mon.cb.cad': 'Resultados empresariales, precio para pequeño negocio', 'mon.cb.del': 'Cotizado según tus requisitos exactos',
    'mon.cb.f1': 'Taller completo de descubrimiento y arquitectura', 'mon.cb.f2': 'Tableros y espacios ilimitados',
    'mon.cb.f3': 'Migración de datos desde herramientas existentes', 'mon.cb.f4': 'Automatizaciones + integraciones API',
    'mon.cb.f5': 'Paneles por departamento', 'mon.cb.f6': 'Documentación bilingüe completa (EN/ES)',
    'mon.cb.f7': 'Capacitación para admins, personal y gerentes', 'mon.cb.f8': '60 días de soporte dedicado',
    'mon.cb.f9': 'Mantenimiento mensual disponible', 'mon.cb.cta': 'Hablemos del Alcance',
    'mon.cmp.feat': 'Característica', 'mon.cmp.r1': 'Llamada de descubrimiento gratis', 'mon.cmp.r2': 'Tableros personalizados',
    'mon.cmp.r2a': 'Hasta 3', 'mon.cmp.r2b': 'Hasta 8', 'mon.cmp.r2c': 'Ilimitados',
    'mon.cmp.r3': 'Automatizaciones', 'mon.cmp.r3c': 'Ilimitadas', 'mon.cmp.r4': 'Paneles de informes', 'mon.cmp.r4c': 'Por depto.',
    'mon.cmp.r5': 'Configuración monday CRM', 'mon.cmp.r6': 'Módulo de servicio y tickets', 'mon.cmp.r7': 'Integraciones externas',
    'mon.cmp.r7b': '1 (Gmail/Slack/WA)', 'mon.cmp.r7c': 'Hasta 3', 'mon.cmp.r7c2': 'Ilimitadas',
    'mon.cmp.r8': 'Migración de datos', 'mon.cmp.r9': 'Documentación SOP', 'mon.cmp.r10': 'Capacitación (EN/ES)',
    'mon.cmp.r10a': '1 hr / 1 persona', 'mon.cmp.r10b': 'Hasta 5 personas', 'mon.cmp.r10c': 'Hasta 10 personas', 'mon.cmp.r10d': 'Todos los niveles',
    'mon.cmp.r11': 'Configuración bilingüe', 'mon.cmp.r12': 'Soporte post-lanzamiento',
    'mon.cmp.r12a': '14 días por correo', 'mon.cmp.r12b': '30 días correo+chat', 'mon.cmp.r12c': '30 días + llamada', 'mon.cmp.r12d': '60 días dedicados',
    'mon.cmp.r13': 'Retainer mensual', 'mon.cmp.r13a': 'Adicional', 'mon.cmp.r13b': '$297/mes opcional', 'mon.cmp.r13c': '$497/mes opcional', 'mon.cmp.r13d': 'Personalizado',

    /* ── Homepage ── */
    'hero.tag': 'De confianza de más de 100 dueños de negocios',
    'hero.badge': 'Presentamos Leak Engine',
    'hero.h1': 'Cada Llamada Perdida<br>Puede Ser un <span>Cliente.</span>',
    'hero.subtitle': 'Leak Engine ayuda a los dueños de negocios pequeños a dejar de perder clientes por llamadas sin contestar. Captura las llamadas perdidas, activa el seguimiento inmediato y convierte más llamadas en clientes reales.',
    'hero.btn1': 'Ver Leak Engine', 'hero.btn2': 'Agendar Demo',
    'hero.incoming': 'Llamada Entrante', 'hero.localbiz': 'Negocio Local', 'hero.missedcall': 'Llamada Perdida',
    'hero.captured': 'Llamada Perdida Capturada', 'hero.newlead': 'Nuevo Lead',
    'hero.s1t': 'Lead Capturado',     'hero.s1s': 'Llamada perdida guardada',
    'hero.s2t': 'Seguimiento Automático', 'hero.s2s': 'SMS enviado al instante',
    'hero.s3t': 'Llamada Agendada',   'hero.s3s': 'Hoy a las 2:00 PM',

    'lc.eyebrow': 'Auditoría de Fugas de Ingresos',
    'lc.h1': '¿Cuánto dinero está <em>fugando</em> tu negocio cada mes?',
    'lc.sub': 'Cerca del 62% de las llamadas a negocios pequeños no se contestan — y el 85% de esos clientes nunca vuelve a llamar. Ingresa tus números reales y mira la fuga.',
    'lc.yourNumbers': 'Tus números',
    'lc.industry': 'Tu industria',
    'lc.missed': 'Llamadas perdidas por semana',
    'lc.missedHint': 'Revisa tu registro de llamadas — la mayoría lo subestima a la mitad.',
    'lc.avgValue': 'Valor promedio por cliente ($)',
    'lc.valueHint': 'Lo que vale un cliente nuevo (primer trabajo, no de por vida).',
    'lc.closeRate': 'Tu tasa de cierre en llamadas contestadas',
    'lc.meterLbl': 'Fuga estimada de ingresos',
    'lc.perMonth': 'por mes, saliendo por la puerta',
    'lc.perYear': 'Por año',
    'lc.recoverable': 'Recuperable con IA*',
    'lc.recoTag': 'Solución recomendada',
    'lc.ctaNote': 'Auditoría de Fugas $497 — se acredita a cualquier instalación.',
    'lc.cta': 'Agenda tu Auditoría de Fugas',
    'lc.foot': '*Asume que los sistemas de IA capturan ~60% de las oportunidades perdidas. Estimados basados en investigación de la industria (411 Locals, Invoca, BIA/Kelsey): 62% de llamadas sin contestar, 85% de clientes que no vuelven a llamar. Tu auditoría usa tus datos reales de 30 días.',
    'hero.subtitle': 'ValuConnect Solutions ayuda a dueños de pequeños negocios a digitalizarse — sin complicaciones tecnológicas. Sistemas prácticos, apoyo personalizado y un socio que realmente lo entiende.',
    'hero.btn1': 'Agenda tu Evaluación Gratis', 'hero.btn2': 'Cómo Funciona',
    'hero.m1v': '6+ hrs ahorradas',         'hero.m1l': 'por semana, en promedio',
    'hero.m2v': 'Cero archivos perdidos',   'hero.m2l': 'al digitalizarse',
    'hero.m3v': '80% menos errores',        'hero.m3l': 'en operaciones diarias',
    'hero.m4v': 'Configuración en 30 días', 'hero.m4l': 'del papel a lo digital',
    'trust.l1': 'Negocios Ayudados',   'trust.l2': 'Industrias Atendidas',
    'trust.l3': 'Ahorrado por Semana', 'trust.l4': 'Reducción de Errores', 'trust.l5': 'Días de Configuración',
    'svc.label': 'Lo Que Hacemos',
    'svc.title': 'Cinco Servicios. Un Objetivo: Trabajar con Más Inteligencia.',
    'svc.sub': 'Cada servicio reemplaza un proceso manual con un sistema que trabaja para ti — construido con las herramientas que tu equipo realmente usará.',
    'svc.partner': 'Socio Certificado', 'svc.partner.label': 'Resultados entregados a través de', 'svc.partner.link': 'Ver paquetes monday.com', 'svc.partner.since': 'Desde 2024',
    'svc.c1t': 'Digitalización y Gestión de Documentos',
    'svc.c1d': 'Digitalizamos, escaneamos y organizamos tus documentos, registros, contratos y facturas en un sistema digital buscable — estructurado desde el primer día.',
    'svc.c2t': 'Automatización de Flujos de Trabajo',
    'svc.c2d': 'Los procesos manuales se automatizan. Recordatorios, aprobaciones y notificaciones corren en horario — sin que nadie tenga que recordar enviarlos.',
    'svc.c3t': 'Creación de Agentes de IA',
    'svc.c3d': 'Construimos agentes de IA personalizados que gestionan seguimientos, citas, formularios y comunicaciones — respondiendo en tu nombre las 24 horas.',
    'svc.c4t': 'Implementación de monday.com',
    'svc.c4d': 'Como socio certificado de monday.com, diseñamos y construimos tu espacio de trabajo completo — tableros, CRM, automatizaciones y paneles. Capacitamos a tu equipo en inglés y español.',
    'svc.c4tag': 'Configuración · CRM · Seguimiento de Proyectos · Capacitación',
    'svc.c5t': 'Soporte Digital Continuo',
    'svc.c5d': 'Nos quedamos contigo después del lanzamiento. Mantenimiento mensual, capacitación para nuevos empleados y una línea directa con Andres mientras tu negocio crece.',
    'ind.label': 'Industrias que Servimos', 'ind.title': 'Conocemos tu Industria',
    'ind.sub': 'No hacemos genérico. Cada sistema está construido en torno a los desafíos específicos de tu tipo de negocio.',
    'hiw.label': 'El Proceso', 'hiw.title': 'Del Papel a lo Digital en 4 Pasos',
    'hiw.sub': 'Simple, práctico y diseñado para dueños que no tienen tiempo de aprender tecnología solos.',
    'hiw.s1t': 'Evaluación de Flujo de Trabajo Gratis',
    'hiw.s1d': 'Llamada de 30 minutos para identificar exactamente dónde pierdes tiempo en procesos manuales.',
    'hiw.s2t': 'Diseño de Sistema Personalizado',
    'hiw.s2d': 'Creamos un plan de flujo de trabajo digital específico para tu industria, tamaño de equipo y cuellos de botella.',
    'hiw.s3t': 'Configuración y Capacitación Práctica',
    'hiw.s3d': 'Lo configuramos, migramos tus datos existentes y capacitamos a tu equipo hasta que todos estén seguros.',
    'hiw.s4t': 'Soporte Continuo',
    'hiw.s4d': 'Seguimos disponibles mientras tu negocio crece. Agrega flujos, resuelve problemas o simplemente haz preguntas.',
    'test.label': 'Resultados Reales', 'test.title': 'Lo que Dicen los Dueños',
    'test.sub': 'Historias reales de dueños de pequeños negocios — en sus propias palabras.',
    'test.q1': 'Antes le temía a la semana de inspección. Ahora todo está a un clic de distancia.',
    'test.n1': 'Maria G.',   'test.i1': 'Dueña de Restaurante · Miami, FL',
    'test.q2': 'Antes facturábamos tarde todos los meses. Ahora las facturas salen el mismo día que termina el trabajo.',
    'test.n2': 'Roberto M.', 'test.i2': 'Contratista General · Houston, TX',
    'test.q3': 'Crecimos de 20 a 40 unidades sin contratar personal adicional. El sistema hace el seguimiento por nosotros.',
    'test.n3': 'Luis T.',    'test.i3': 'Administrador de Propiedades · Dallas, TX',
    'about.label': 'Sobre Andres', 'about.title': 'Un Socio Que lo Entiende',
    'about.p1': 'Fundé ValuConnect Solutions porque vi a muchos dueños de negocios trabajadores pasar sus noches enterrados en papeleo en vez de con su familia.',
    'about.quote': '"Mi misión es simple: ayudar a las pequeñas empresas a trabajar con inteligencia, no con esfuerzo — con sistemas digitales que crecen con ellas."',
    'about.p2': 'Cada sistema que construyo es personalizado. Me tomo el tiempo de entender tu flujo de trabajo específico. Soy bilingüe y sirvo a la comunidad de negocios latina con orgullo.',
    'about.p3': 'Soy socio certificado de monday.com — uno de los pocos especialistas bilingües en implementación que sirve a la comunidad de pequeños negocios.',
    'about.btn1': 'Reserva una Llamada Gratis con Andres', 'about.btn2': 'Explora tu Industria',
    'about.badge': 'Negocios Ayudados',
    'cta.title': '¿Listo para Dejar de Funcionar en Papel?',
    'cta.desc': 'Reserva tu evaluación de flujo de trabajo gratuita de 30 minutos. Sin jerga técnica, sin presión.',
    'cta.btn1': 'Reserva Llamada Gratis de 30 Min', 'cta.btn2': 'Explora tu Industria',
    'foot.brand': 'Ayudando a pequeñas empresas a trabajar con inteligencia, no con esfuerzo — con sistemas digitales que crecen con ellas.',
    'foot.svcTitle': 'Servicios',
    'foot.s1': 'Papel a Digital', 'foot.s3': 'Automatización de Flujos',
    'foot.s5': 'Creación de Agentes IA', 'foot.s6': 'Soporte Digital',
    'foot.indTitle': 'Industrias',
    'foot.i1': 'Restaurantes',         'foot.i2': 'Comercio y Boutiques',
    'foot.i3': 'Construcción',         'foot.i4': 'Salud y Bienestar',
    'foot.i5': 'Bienes Raíces',        'foot.i6': 'Servicios Profesionales',
    'foot.i7': 'Salones y Belleza',    'foot.i8': 'Logística',
    'foot.conTitle': 'Conectar',       'foot.c1': 'Llamada Gratis',
    'foot.copy': '© 2025–2026 ValuConnect Solutions. Todos los derechos reservados. Fundador: Andres Ramirez.',
    'foot.privacy': 'Política de Privacidad', 'foot.terms': 'Términos de Servicio',

    /* ── Newsletter modal ── */
    'modal.tag': 'Perspectivas del Sector',
    'modal.title': 'Mantente Adelante en tu Industria',
    'modal.sub': 'Recibe consejos prácticos, ideas de flujos de trabajo y perspectivas de transformación digital para dueños de pequeños negocios — en inglés y español. Sin spam.',
    'modal.ph.name': 'Tu nombre',
    'modal.ph.email': 'Tu correo electrónico',
    'modal.ph.industry': 'Tu industria (opcional)',
    'modal.submit': 'Suscribirme a Perspectivas del Sector',
    'modal.privacy': 'Sin spam. Cancela cuando quieras. Tu información nunca se comparte.',
    'modal.ok.title': '¡Ya estás dentro!',
    'modal.ok.sub': 'Te enviaremos tu primera perspectiva del sector pronto. Revisa tu bandeja de entrada.',

    /* ── Chatbot ── */
    'chat.status': 'Responde al instante',
    'chat.welcome': '¡Hola! Estoy aquí para ayudarte a conocer ValuConnect Solutions. ¿Qué te gustaría saber?',
    'chat.qr.services': '¿Qué servicios ofrecen?',
    'chat.qr.pricing': '¿Cuánto cuesta?',
    'chat.qr.industries': '¿Qué industrias sirven?',
    'chat.qr.timeline': '¿Cuánto tarda la configuración?',
    'chat.qr.training': '¿Incluye capacitación?',
    'chat.qr.book': 'Agendar llamada gratis',
    'chat.a.services': 'Ofrecemos 5 servicios principales: Digitalización de Documentos, Automatización de Flujos, Creación de Agentes IA, Implementación de monday.com y Soporte Digital Continuo.',
    'chat.a.pricing': 'El precio depende del alcance. Nuestros paquetes de monday.com comienzan desde $997 para Quick Start. Todo comienza con una llamada gratuita de 30 minutos.',
    'chat.a.industries': 'Trabajamos con Restaurantes, Comercio, Construcción, Salud y Bienestar, Bienes Raíces, Servicios Profesionales, Salones y Logística.',
    'chat.a.timeline': 'Quick Start toma 5 días hábiles. Las implementaciones completas van de 7 a 30 días según el alcance.',
    'chat.a.training': 'Sí — todos los paquetes incluyen capacitación bilingüe en inglés y español para ti y tu equipo. Las sesiones son grabadas con guías escritas incluidas.',
    'chat.a.book': 'Puedes agendar tu evaluación gratuita de 30 minutos aquí:'
  }
};

/* ────────────────────────────────
   Merged string table
   Industry pages get their page-specific keys (i.*, page.*) from
   assets/js/translations.js; every page gets the shared nav/footer/chat keys
   from this file. Merge both so no page is missing either half. On conflict
   this file wins, since it carries the canonical shared strings.
──────────────────────────────── */
var vcI18n = (function () {
  var merged = { en: {}, es: {} };
  /* typeof guard: `i18n` simply does not exist on index/monday/packages */
  var external = (typeof i18n !== 'undefined' && i18n) ? i18n : null;
  ['en', 'es'].forEach(function (l) {
    if (external && external[l]) {
      Object.keys(external[l]).forEach(function (k) { merged[l][k] = external[l][k]; });
    }
    if (vcStrings[l]) {
      Object.keys(vcStrings[l]).forEach(function (k) { merged[l][k] = vcStrings[l][k]; });
    }
  });
  return merged;
})();

/* ────────────────────────────────
   i18n engine
──────────────────────────────── */
function setLang(lang) {
  var t = vcI18n[lang] || {};
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.innerHTML = t[key];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-ph');
    if (t[key] !== undefined) el.placeholder = t[key];
  });
  document.body.classList.toggle('lang-es', lang === 'es');
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-l]').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-l') === lang);
  });
  localStorage.setItem('vc-lang', lang);

  /* refresh chatbot quick replies if open */
  if (typeof renderChatQR === 'function') renderChatQR(lang);

  /* industry list, CTA label and formula text are language-dependent */
  if (typeof vcCalcRender === 'function') vcCalcRender(lang);
}

/* ────────────────────────────────
   Team log in → internal CRM
   Staff-only entry point. Cloudflare Access does the actual authentication;
   this is just the door. Injected from here rather than pasted into all 11
   pages so the URL and the label live in exactly one place.
──────────────────────────────── */
var CRM_URL = 'https://crm.vcsolutions.us/crm';

function addTeamLogin() {
  var navLinks = document.querySelector('.nav-links');
  if (navLinks && !navLinks.querySelector('.nav-login')) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.className = 'nav-login';
    a.href = CRM_URL;
    a.rel = 'noopener nofollow';
    a.setAttribute('data-i18n', 'nav.login');
    a.textContent = 'Team Log In';
    li.appendChild(a);
    /* sits just before the EN/ES picker, so the teal "Book Free Call" stays the loudest thing */
    var langLi = navLinks.querySelector('.lang-li');
    if (langLi) navLinks.insertBefore(li, langLi); else navLinks.appendChild(li);
  }

  var footLinks = document.querySelector('.footer-bottom-links');
  if (footLinks && !footLinks.querySelector('[data-i18n="nav.login"]')) {
    var fa = document.createElement('a');
    fa.href = CRM_URL;
    fa.rel = 'noopener nofollow';
    fa.setAttribute('data-i18n', 'nav.login');
    fa.textContent = 'Team Log In';
    footLinks.appendChild(fa);
  }
}

/* ────────────────────────────────
   Revenue leak calculator
   Ported from valuconnect-leak-calculator.html. The math is unchanged:
     missed/month = missed/week × 4.33
     leak/month   = missed/month × customer value × close rate × 0.85
                    (0.85 = the share of missed callers who never call back)
     recoverable  = leak/month × 0.60   (what AI capture is assumed to recover)
   Flat labels live in vcStrings as lc.* keys; the nested package copy and the
   formula template live here because the i18n engine only does flat keys.
──────────────────────────────── */
var LC_INDUSTRIES = [
  { id: 'hvac',   en: 'HVAC / Home services',    es: 'HVAC / Servicios del hogar', value: 450 },
  { id: 'dental', en: 'Dental practice',         es: 'Consultorio dental',         value: 250 },
  { id: 'medspa', en: 'Med spa / Aesthetics',    es: 'Med spa / Estética',         value: 300 },
  { id: 'auto',   en: 'Auto repair shop',        es: 'Taller mecánico',            value: 250 },
  { id: 'law',    en: 'Law firm (intake)',       es: 'Bufete de abogados',         value: 2000 },
  { id: 'clean',  en: 'Cleaning company',        es: 'Empresa de limpieza',        value: 180 },
  { id: 'salon',  en: 'Salon / Barbershop',      es: 'Salón / Barbería',           value: 75 },
  { id: 'other',  en: 'Other service business',  es: 'Otro negocio de servicios',  value: 200 }
];

var LC_COPY = {
  en: {
    formula: '{m} missed/mo × ${v} × {c}% close × 0.85 never call back',
    pkgs: {
      t1: { name: 'Leak Stopper', line: 'AI receptionist 24/7 + missed-call text-back + speed-to-lead. $2,500 setup + $597/mo — recovering ~{R}/mo is a {X}× return on the retainer.' },
      t2: { name: 'Revenue Recovery System', line: 'Everything in Leak Stopper plus quote follow-ups, no-show recovery, database reactivation and a review engine. $5,500 setup + $1,197/mo — recovering ~{R}/mo is a {X}× return.' },
      t3: { name: 'AI Operations Partner', line: 'Full install: AI intake, dispatch optimization, custom workflows, bilingual engagement. From $8,500 setup + $1,997/mo — recovering ~{R}/mo is a {X}× return.' }
    },
    mailSubject: 'I want my Leak Audit',
    mailBody: "Hi ValuConnect, my estimated leak is {L}/month. I'd like to book my audit."
  },
  es: {
    formula: '{m} perdidas/mes × ${v} × {c}% cierre × 0.85 no vuelven a llamar',
    pkgs: {
      t1: { name: 'Tapa Fugas', line: 'Recepcionista IA 24/7 + texto automático por llamada perdida + respuesta inmediata a leads. $2,500 instalación + $597/mes — recuperar ~{R}/mes es un retorno de {X}× sobre la mensualidad.' },
      t2: { name: 'Sistema de Recuperación de Ingresos', line: 'Todo lo del Tapa Fugas más seguimiento de cotizaciones, recuperación de citas perdidas, reactivación de clientes y motor de reseñas. $5,500 + $1,197/mes — recuperar ~{R}/mes es un retorno de {X}×.' },
      t3: { name: 'Socio de Operaciones IA', line: 'Instalación completa: intake con IA, optimización de agenda, flujos personalizados, atención bilingüe. Desde $8,500 + $1,997/mes — recuperar ~{R}/mes es un retorno de {X}×.' }
    },
    mailSubject: 'Quiero mi Auditoría de Fugas',
    mailBody: 'Hola ValuConnect, mi fuga estimada es {L}/mes. Quiero agendar mi auditoría.'
  }
};

var lcLang = 'en', lcShown = 0, lcRaf = null;

function lcMoney(n) {
  return '$' + Math.round(n).toLocaleString(lcLang === 'es' ? 'es-US' : 'en-US');
}

function lcAnimateTo(target) {
  var el = document.getElementById('lcLeakMo');
  if (!el) return;
  if (lcRaf) cancelAnimationFrame(lcRaf);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lcShown = target; el.textContent = lcMoney(target); return;
  }
  var start = lcShown, t0 = performance.now();
  (function step(t) {
    var p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
    lcShown = start + (target - start) * e;
    el.textContent = lcMoney(lcShown);
    if (p < 1) lcRaf = requestAnimationFrame(step);
  })(t0);
}

function lcCalc() {
  var missed = document.getElementById('lcMissed');
  if (!missed) return; /* not on this page */
  var wk = +missed.value,
      v  = +document.getElementById('lcValue').value || 0,
      c  = +document.getElementById('lcClose').value;

  document.getElementById('lcMissedVal').textContent = wk;
  document.getElementById('lcCloseVal').textContent = c + '%';

  var perMonth = wk * 4.33;
  var leakMo   = perMonth * v * (c / 100) * 0.85;
  var recov    = leakMo * 0.6;

  lcAnimateTo(leakMo);
  document.getElementById('lcLeakYr').textContent = lcMoney(leakMo * 12);
  document.getElementById('lcRecov').textContent  = lcMoney(recov);

  var copy = LC_COPY[lcLang] || LC_COPY.en;
  document.getElementById('lcFormula').textContent = copy.formula
    .replace('{m}', Math.round(perMonth))
    .replace('{v}', v.toLocaleString())
    .replace('{c}', c);

  /* tier by leak size, ROI against that tier's monthly retainer */
  var pkg, retainer;
  if (leakMo < 1500)      { pkg = copy.pkgs.t1; retainer = 597; }
  else if (leakMo < 5000) { pkg = copy.pkgs.t2; retainer = 1197; }
  else                    { pkg = copy.pkgs.t3; retainer = 1997; }
  var roi = recov > 0 ? Math.max(1, recov / retainer).toFixed(1) : '—';

  document.getElementById('lcPkgName').textContent = pkg.name;
  document.getElementById('lcPkgLine').textContent = pkg.line
    .replace('{R}', lcMoney(recov))
    .replace('{X}', roi);

  var cta = document.getElementById('lcCta');
  if (cta) {
    var leak = document.getElementById('lcLeakMo').textContent;
    cta.href = 'mailto:info@vcsolutions.us'
      + '?subject=' + encodeURIComponent(copy.mailSubject)
      + '&body='    + encodeURIComponent(copy.mailBody.replace('{L}', leak));
  }
}

/* Called by setLang: refills the industry list and CTA in the new language. */
function vcCalcRender(lang) {
  var sel = document.getElementById('lcIndustry');
  if (!sel) return;
  lcLang = lang === 'es' ? 'es' : 'en';

  var current = sel.value || 'hvac';
  sel.innerHTML = '';
  LC_INDUSTRIES.forEach(function (ind) {
    var o = document.createElement('option');
    o.value = ind.id;
    o.textContent = ind[lcLang];
    sel.appendChild(o);
  });
  sel.value = current;

  var cta = document.getElementById('lcCta');
  if (cta) cta.textContent = (vcI18n[lcLang] && vcI18n[lcLang]['lc.cta']) || 'Book your Leak Audit';

  lcCalc();
}

function initLeakCalculator() {
  var missed = document.getElementById('lcMissed');
  if (!missed) return;

  missed.addEventListener('input', lcCalc);
  document.getElementById('lcValue').addEventListener('input', lcCalc);
  document.getElementById('lcClose').addEventListener('input', lcCalc);

  /* picking an industry pre-fills a typical ticket, which the owner then corrects */
  document.getElementById('lcIndustry').addEventListener('change', function (e) {
    var ind = LC_INDUSTRIES.filter(function (i) { return i.id === e.target.value; })[0];
    if (ind) document.getElementById('lcValue').value = ind.value;
    lcCalc();
  });
}

/* ────────────────────────────────
   DOMContentLoaded
──────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  /* before setLang, so the injected links get translated on first paint */
  addTeamLogin();
  initLeakCalculator();

  var currentLang = localStorage.getItem('vc-lang') || 'en';
  setLang(currentLang);

  /* Language buttons */
  document.querySelectorAll('[data-l]').forEach(function(btn) {
    btn.addEventListener('click', function() { setLang(btn.getAttribute('data-l')); });
  });

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      toggle.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
    });
  }
  document.querySelectorAll('.nav-links a').forEach(function(link) {
    link.addEventListener('click', function () {
      if (navLinks) navLinks.classList.remove('open');
      if (toggle) toggle.textContent = '☰';
    });
  });

  /* Smooth scroll */
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ── Scroll-reveal animations ── */
  var revealObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  var revealEls = document.querySelectorAll(
    '.service-card, .industry-card, .step, .testimonial-card, .about-inner, .partner-strip'
  );
  revealEls.forEach(function(el, i) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px) scale(0.97)';
    el.style.transition = 'opacity 0.55s ease ' + (i % 4 * 80) + 'ms, transform 0.55s ease ' + (i % 4 * 80) + 'ms';
    revealObserver.observe(el);
  });

  /* Section headers fade in */
  var headerObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.section-title, .section-label, .section-subtitle').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    headerObserver.observe(el);
  });

  var styleEl = document.createElement('style');
  styleEl.textContent = '.visible { opacity: 1 !important; transform: translateY(0) scale(1) !important; }';
  document.head.appendChild(styleEl);

  /* ── Newsletter modal ── */
  var modal = document.getElementById('insightsModal');
  var modalClose = document.getElementById('modalClose');
  var newsletterForm = document.getElementById('newsletterForm');
  var modalSuccess = document.getElementById('modalSuccess');
  var modalFormEl = document.getElementById('modalForm');

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.nav-insights-trigger').forEach(function(el) {
    el.addEventListener('click', function(e) { e.preventDefault(); openModal(); });
  });

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('nlEmail');
      if (!email || !email.value.includes('@')) {
        if (email) { email.style.borderColor = '#ef4444'; setTimeout(function() { email.style.borderColor = ''; }, 2000); }
        return;
      }
      if (modalFormEl) modalFormEl.style.display = 'none';
      if (modalSuccess) modalSuccess.style.display = 'block';
      setTimeout(closeModal, 3200);
      /* TODO: wire to your email service (Mailchimp, ConvertKit, etc.) */
    });
  }

  /* ── Chatbot widget ── */
  var chatTrigger   = document.getElementById('chatbotTrigger');
  var chatWindow    = document.getElementById('chatbotWindow');
  var chatClose     = document.getElementById('chatbotClose');
  var chatMessages  = document.getElementById('chatMessages');
  var chatQR        = document.getElementById('chatQR');
  var chatInputArea  = document.getElementById('chatInputArea');
  var chatEmailInput = document.getElementById('chatEmailInput');
  var chatTextInput  = document.getElementById('chatTextInput');
  var chatSendBtn    = document.getElementById('chatSendBtn');
  /* ── monday.com config ─────────────────────────────────────────────
     1. Get your Personal API Token:
        monday.com → Avatar (top-right) → Developers → My Access Tokens
     2. Get your Board ID:
        Open the "Website Chat Messages" board → look at the URL:
        monday.com/boards/1234567890  ← that number is the board ID
  ─────────────────────────────────────────────────────────────────── */
  var MONDAY_API_TOKEN = 'YOUR_MONDAY_API_TOKEN';
  var MONDAY_BOARD_ID  = 'YOUR_MONDAY_BOARD_ID';
  var chatOpened    = false;
  var chatLangChosen = null; /* 'en' | 'es' — set by language picker inside chat */

  var quickReplies = ['services', 'pricing', 'industries', 'timeline', 'training', 'book'];

  function addMsg(text, type) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.innerHTML = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /* Phase 1: language picker */
  function showLangPicker() {
    if (!chatQR) return;
    chatQR.innerHTML = '';
    if (chatInputArea) chatInputArea.style.display = 'none';
    [{ l: 'en', label: 'English' }, { l: 'es', label: 'Español' }].forEach(function(item) {
      var btn = document.createElement('button');
      btn.className = 'qr-btn lang-pick-btn';
      btn.textContent = item.label;
      btn.addEventListener('click', function() {
        chatLangChosen = item.l;
        addMsg(item.label, 'user');
        chatQR.innerHTML = '';
        setTimeout(function() {
          var t = vcI18n[chatLangChosen] || vcI18n['en'];
          addMsg(t['chat.welcome'] || 'Hi! How can I help?', 'bot');
          renderChatQR(chatLangChosen);
        }, 380);
      });
      chatQR.appendChild(btn);
    });
  }

  /* Phase 2: topic quick-replies + "Send a message" */
  window.renderChatQR = function(lang) {
    if (!chatQR) return;
    chatQR.innerHTML = '';
    if (chatInputArea) chatInputArea.style.display = 'none';
    var t = vcI18n[lang] || vcI18n['en'];

    quickReplies.forEach(function(key) {
      var btn = document.createElement('button');
      btn.className = 'qr-btn';
      btn.textContent = t['chat.qr.' + key] || key;
      btn.addEventListener('click', function() {
        addMsg(t['chat.qr.' + key] || key, 'user');
        chatQR.innerHTML = '';
        setTimeout(function() {
          var answer = t['chat.a.' + key] || '';
          if (key === 'book') {
            answer += ' <a href="https://calendar.app.google/1Yjhmfe37T4gFvLk7" target="_blank" rel="noopener" style="color:var(--teal);font-weight:700;">'
              + (lang === 'es' ? 'Agendar Llamada Gratis' : 'Book Free Call') + '</a>';
          }
          addMsg(answer, 'bot');
          setTimeout(function() { renderChatQR(chatLangChosen || lang); }, 650);
        }, 380);
      });
      chatQR.appendChild(btn);
    });

    /* "Send a message" option */
    var msgBtn = document.createElement('button');
    msgBtn.className = 'qr-btn';
    msgBtn.textContent = lang === 'es' ? 'Enviar un mensaje' : 'Send a message';
    msgBtn.addEventListener('click', function() {
      chatQR.innerHTML = '';
      if (chatInputArea) {
        chatInputArea.style.display = 'flex';
        updateInputPlaceholders(lang);
        if (chatEmailInput) chatEmailInput.focus();
      }
    });
    chatQR.appendChild(msgBtn);
  };

  /* Also update placeholder on email input when language is chosen */
  function updateInputPlaceholders(lang) {
    if (chatEmailInput) chatEmailInput.placeholder = lang === 'es' ? 'Tu correo (para responderte)' : 'Your email (so we can reply)';
    if (chatTextInput)  chatTextInput.placeholder  = lang === 'es' ? 'Escribe tu mensaje...'         : 'Type your message...';
  }

  /* Send free-form message → monday.com API → creates item + update on board */
  function mondayPost(query, variables) {
    return fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_TOKEN,
        'API-Version': '2024-01'
      },
      body: JSON.stringify({ query: query, variables: variables })
    }).then(function(r) { return r.json(); });
  }

  function sendFreeMessage() {
    if (!chatTextInput) return;
    var text  = chatTextInput.value.trim();
    var email = chatEmailInput ? chatEmailInput.value.trim() : '';
    if (!text) return;

    var lang = chatLangChosen || 'en';
    var displayMsg = email
      ? text + '<br><span style="font-size:.75rem;opacity:.6;">' + email + '</span>'
      : text;
    addMsg(displayMsg, 'user');
    chatTextInput.value = '';
    if (chatEmailInput) chatEmailInput.value = '';
    if (chatInputArea) chatInputArea.style.display = 'none';

    var configured = MONDAY_API_TOKEN !== 'YOUR_MONDAY_API_TOKEN'
                  && MONDAY_BOARD_ID  !== 'YOUR_MONDAY_BOARD_ID';

    if (!configured) {
      /* Not wired yet — graceful mailto fallback */
      var fallbackReply = lang === 'es'
        ? 'Gracias por tu mensaje. Escríbenos a <a href="mailto:info@vcsolutions.com" style="color:var(--teal);font-weight:700;">info@vcsolutions.com</a> y Andres te responderá pronto.'
        : 'Thanks! Reach Andres directly at <a href="mailto:info@vcsolutions.com" style="color:var(--teal);font-weight:700;">info@vcsolutions.com</a>';
      addMsg(fallbackReply, 'bot');
      setTimeout(function() { renderChatQR(lang); }, 650);
      return;
    }

    /* Step 1 — create item on the board */
    var itemName = email
      ? (lang === 'es' ? 'Chat de: ' : 'Chat from: ') + email
      : (lang === 'es' ? 'Mensaje de chat — sitio web' : 'Website chat message') + ' — ' + new Date().toLocaleDateString();

    mondayPost(
      'mutation ($board: ID!, $name: String!) { create_item(board_id: $board, item_name: $name) { id } }',
      { board: MONDAY_BOARD_ID, name: itemName }
    )
    .then(function(data) {
      var itemId = data && data.data && data.data.create_item && data.data.create_item.id;
      if (!itemId) throw new Error('No item ID returned');

      /* Step 2 — add update (comment) with full message details */
      var updateBody = [
        'Language: ' + lang.toUpperCase(),
        'Email: '    + (email || 'not provided'),
        '',
        'Message:',
        text
      ].join('\n');

      return mondayPost(
        'mutation ($item: ID!, $body: String!) { create_update(item_id: $item, body: $body) { id } }',
        { item: itemId, body: updateBody }
      );
    })
    .then(function() {
      var reply = lang === 'es'
        ? 'Gracias. Tu mensaje llegó a Andres en monday.com y te responderá pronto.'
        : 'Got it! Your message landed in Andres\'s monday.com board. He\'ll be in touch soon.';
      addMsg(reply, 'bot');
      setTimeout(function() { renderChatQR(lang); }, 650);
    })
    .catch(function() {
      var errReply = lang === 'es'
        ? 'Hubo un problema. Escríbenos directamente a <a href="mailto:info@vcsolutions.com" style="color:var(--teal);">info@vcsolutions.com</a>'
        : 'Something went wrong. Email us at <a href="mailto:info@vcsolutions.com" style="color:var(--teal);">info@vcsolutions.com</a>';
      addMsg(errReply, 'bot');
      setTimeout(function() { renderChatQR(lang); }, 650);
    });
  }

  if (chatSendBtn) chatSendBtn.addEventListener('click', sendFreeMessage);
  if (chatTextInput) {
    chatTextInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') sendFreeMessage();
    });
  }

  /* Init — always starts with language picker */
  function initChat() {
    if (!chatMessages) return;
    chatMessages.innerHTML = '';
    chatLangChosen = null;
    addMsg('Hi! / ¡Hola!<br><span style="font-size:.8rem;color:var(--text-gray);">Choose your language — Elige tu idioma</span>', 'bot');
    showLangPicker();
  }

  if (chatTrigger) {
    chatTrigger.addEventListener('click', function() {
      chatWindow.classList.toggle('open');
      if (chatWindow.classList.contains('open') && !chatOpened) {
        chatOpened = true;
        initChat();
      }
    });
  }
  if (chatClose) {
    chatClose.addEventListener('click', function() { chatWindow.classList.remove('open'); });
  }

});
