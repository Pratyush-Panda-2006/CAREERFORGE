import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadVoiceCommander } from './voice-commander.js';

test('SaasLaunchpadVoiceCommander - initializes with default states and options', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  assert.strictEqual(commander.status, 'idle');
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.highContrast, false);
  assert.strictEqual(commander.activePage, 'dashboard');
  assert.strictEqual(commander.currentPlan, 'starter');
  assert.strictEqual(commander.metricsFilter, 'all');
  assert.deepEqual(commander.invitedMembers, []);
  assert.strictEqual(commander.lastExport, null);
  assert.deepEqual(commander.getCommandHistory(), []);
});

test('SaasLaunchpadVoiceCommander - initializes with custom configuration options', () => {
  const custom = new SaasLaunchpadVoiceCommander({
    activePage: 'analytics',
    currentPlan: 'enterprise',
    highContrast: true,
    metricsFilter: 'mrr'
  });

  assert.strictEqual(custom.activePage, 'analytics');
  assert.strictEqual(custom.currentPlan, 'enterprise');
  assert.strictEqual(custom.highContrast, true);
  assert.strictEqual(custom.metricsFilter, 'mrr');
});

test('SaasLaunchpadVoiceCommander - handles empty and malformed transcripts gracefully', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const emptyRes = commander.parseVoiceGrammar('');
  assert.strictEqual(emptyRes.action, 'UNKNOWN');
  assert.strictEqual(emptyRes.confidence, 0);

  const nullRes = commander.parseVoiceGrammar(null);
  assert.strictEqual(nullRes.action, 'UNKNOWN');
  assert.strictEqual(nullRes.confidence, 0);

  const undefinedRes = commander.parseVoiceGrammar(undefined);
  assert.strictEqual(undefinedRes.action, 'UNKNOWN');
});

test('SaasLaunchpadVoiceCommander - parses NAVIGATE_PAGE grammars and extracts target page', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const navAnalytics = commander.parseVoiceGrammar('go to analytics');
  assert.strictEqual(navAnalytics.action, 'NAVIGATE_PAGE');
  assert.strictEqual(navAnalytics.payload.page, 'analytics');

  const navBilling = commander.parseVoiceGrammar('open billing');
  assert.strictEqual(navBilling.action, 'NAVIGATE_PAGE');
  assert.strictEqual(navBilling.payload.page, 'billing');

  const navTeam = commander.parseVoiceGrammar('view team settings');
  assert.strictEqual(navTeam.action, 'NAVIGATE_PAGE');
  assert.strictEqual(navTeam.payload.page, 'team settings');

  const navIntegrations = commander.parseVoiceGrammar('navigate to integrations');
  assert.strictEqual(navIntegrations.action, 'NAVIGATE_PAGE');
  assert.strictEqual(navIntegrations.payload.page, 'integrations');

  const navDashboard = commander.parseVoiceGrammar('go to dashboard');
  assert.strictEqual(navDashboard.action, 'NAVIGATE_PAGE');
  assert.strictEqual(navDashboard.payload.page, 'dashboard');

  const navSettings = commander.parseVoiceGrammar('open settings');
  assert.strictEqual(navSettings.action, 'NAVIGATE_PAGE');
  assert.strictEqual(navSettings.payload.page, 'settings');
});

test('SaasLaunchpadVoiceCommander - parses UPGRADE_PLAN grammars and extracts plan tiers', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const upgradePro = commander.parseVoiceGrammar('upgrade to pro');
  assert.strictEqual(upgradePro.action, 'UPGRADE_PLAN');
  assert.strictEqual(upgradePro.payload.plan, 'pro');

  const switchEnterprise = commander.parseVoiceGrammar('switch to enterprise');
  assert.strictEqual(switchEnterprise.action, 'UPGRADE_PLAN');
  assert.strictEqual(switchEnterprise.payload.plan, 'enterprise');

  const downgradeStarter = commander.parseVoiceGrammar('downgrade to starter');
  assert.strictEqual(downgradeStarter.action, 'UPGRADE_PLAN');
  assert.strictEqual(downgradeStarter.payload.plan, 'starter');

  const changeGrowth = commander.parseVoiceGrammar('change plan to growth');
  assert.strictEqual(changeGrowth.action, 'UPGRADE_PLAN');
  assert.strictEqual(changeGrowth.payload.plan, 'growth');

  const changePlanDefault = commander.parseVoiceGrammar('change plan');
  assert.strictEqual(changePlanDefault.action, 'UPGRADE_PLAN');
  assert.strictEqual(changePlanDefault.payload.plan, 'pro');

  const upgradeDefault = commander.parseVoiceGrammar('upgrade plan');
  assert.strictEqual(upgradeDefault.action, 'UPGRADE_PLAN');
  assert.strictEqual(upgradeDefault.payload.plan, 'pro');
});

test('SaasLaunchpadVoiceCommander - parses INVITE_MEMBER and extracts email and name parameters', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  // Email extraction
  const inviteEmail = commander.parseVoiceGrammar('invite alex@careerforge.io');
  assert.strictEqual(inviteEmail.action, 'INVITE_MEMBER');
  assert.strictEqual(inviteEmail.payload.email, 'alex@careerforge.io');
  assert.strictEqual(inviteEmail.payload.recipient, 'alex@careerforge.io');

  const addTeamEmail = commander.parseVoiceGrammar('add team member dev@company.com');
  assert.strictEqual(addTeamEmail.action, 'INVITE_MEMBER');
  assert.strictEqual(addTeamEmail.payload.email, 'dev@company.com');
  assert.strictEqual(addTeamEmail.payload.recipient, 'dev@company.com');

  // Name extraction
  const sendInviteName = commander.parseVoiceGrammar('send invite to sarah');
  assert.strictEqual(sendInviteName.action, 'INVITE_MEMBER');
  assert.strictEqual(sendInviteName.payload.name, 'sarah');
  assert.strictEqual(sendInviteName.payload.recipient, 'sarah');

  const inviteName = commander.parseVoiceGrammar('invite john doe');
  assert.strictEqual(inviteName.action, 'INVITE_MEMBER');
  assert.strictEqual(inviteName.payload.name, 'john doe');
});

test('SaasLaunchpadVoiceCommander - parses FILTER_METRICS and extracts date ranges and metrics', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  // Date ranges
  const range30 = commander.parseVoiceGrammar('show last 30 days');
  assert.strictEqual(range30.action, 'FILTER_METRICS');
  assert.strictEqual(range30.payload.range, 'last 30 days');
  assert.strictEqual(range30.payload.days, 30);

  const range7 = commander.parseVoiceGrammar('filter last 7 days');
  assert.strictEqual(range7.action, 'FILTER_METRICS');
  assert.strictEqual(range7.payload.range, 'last 7 days');
  assert.strictEqual(range7.payload.days, 7);

  // Metric fields
  const filterMrr = commander.parseVoiceGrammar('filter mrr');
  assert.strictEqual(filterMrr.action, 'FILTER_METRICS');
  assert.strictEqual(filterMrr.payload.metric, 'mrr');

  const viewChurn = commander.parseVoiceGrammar('view churn rate');
  assert.strictEqual(viewChurn.action, 'FILTER_METRICS');
  assert.strictEqual(viewChurn.payload.metric, 'churn rate');

  const showArr = commander.parseVoiceGrammar('show arr');
  assert.strictEqual(showArr.action, 'FILTER_METRICS');
  assert.strictEqual(showArr.payload.metric, 'arr');

  const filterDau = commander.parseVoiceGrammar('filter daily active users');
  assert.strictEqual(filterDau.action, 'FILTER_METRICS');
  assert.strictEqual(filterDau.payload.metric, 'daily active users');
});

test('SaasLaunchpadVoiceCommander - parses EXPORT_DATA and extracts format', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const expCsv = commander.parseVoiceGrammar('export csv');
  assert.strictEqual(expCsv.action, 'EXPORT_DATA');
  assert.strictEqual(expCsv.payload.format, 'csv');

  const dlReport = commander.parseVoiceGrammar('download report');
  assert.strictEqual(dlReport.action, 'EXPORT_DATA');
  assert.strictEqual(dlReport.payload.format, 'report');

  const expMetrics = commander.parseVoiceGrammar('export metrics');
  assert.strictEqual(expMetrics.action, 'EXPORT_DATA');
  assert.strictEqual(expMetrics.payload.format, 'metrics');

  const expJson = commander.parseVoiceGrammar('export json');
  assert.strictEqual(expJson.action, 'EXPORT_DATA');
  assert.strictEqual(expJson.payload.format, 'json');

  const dlPdf = commander.parseVoiceGrammar('download pdf');
  assert.strictEqual(dlPdf.action, 'EXPORT_DATA');
  assert.strictEqual(dlPdf.payload.format, 'pdf');
});

test('SaasLaunchpadVoiceCommander - parses TOGGLE_HIGH_CONTRAST accessibility triggers', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const toggleContrast = commander.parseVoiceGrammar('toggle contrast');
  assert.strictEqual(toggleContrast.action, 'TOGGLE_HIGH_CONTRAST');

  const highContrastMode = commander.parseVoiceGrammar('high contrast mode');
  assert.strictEqual(highContrastMode.action, 'TOGGLE_HIGH_CONTRAST');

  const a11yMode = commander.parseVoiceGrammar('accessibility mode');
  assert.strictEqual(a11yMode.action, 'TOGGLE_HIGH_CONTRAST');

  const enableContrast = commander.parseVoiceGrammar('enable high contrast');
  assert.strictEqual(enableContrast.action, 'TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(enableContrast.payload.explicit, true);

  const disableContrast = commander.parseVoiceGrammar('disable high contrast');
  assert.strictEqual(disableContrast.action, 'TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(disableContrast.payload.explicit, false);
});

test('SaasLaunchpadVoiceCommander - parses HELP and UNKNOWN fallback commands', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const helpCmd = commander.parseVoiceGrammar('help');
  assert.strictEqual(helpCmd.action, 'HELP');
  assert.ok(Array.isArray(helpCmd.payload.availableActions));

  const listCommands = commander.parseVoiceGrammar('list commands');
  assert.strictEqual(listCommands.action, 'HELP');

  const whatCanISay = commander.parseVoiceGrammar('what can I say');
  assert.strictEqual(whatCanISay.action, 'HELP');

  const unknown = commander.parseVoiceGrammar('order pizza with extra cheese');
  assert.strictEqual(unknown.action, 'UNKNOWN');
  assert.strictEqual(unknown.confidence, 0.1);
});

test('SaasLaunchpadVoiceCommander - executes commands and mutates workspace state', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  // Test NAVIGATE_PAGE state mutation
  const navRes = commander.executeCommand('NAVIGATE_PAGE', { page: 'billing' });
  assert.strictEqual(navRes.success, true);
  assert.strictEqual(commander.activePage, 'billing');
  assert.strictEqual(navRes.page, 'billing');

  // Test UPGRADE_PLAN state mutation
  const planRes = commander.executeCommand('UPGRADE_PLAN', { plan: 'enterprise' });
  assert.strictEqual(planRes.success, true);
  assert.strictEqual(commander.currentPlan, 'enterprise');
  assert.strictEqual(planRes.plan, 'enterprise');

  // Test INVITE_MEMBER state mutation
  const inviteRes = commander.executeCommand('INVITE_MEMBER', { email: 'team@careerforge.io', recipient: 'team@careerforge.io' });
  assert.strictEqual(inviteRes.success, true);
  assert.ok(commander.invitedMembers.includes('team@careerforge.io'));

  // Test FILTER_METRICS state mutation
  const filterRes = commander.executeCommand('FILTER_METRICS', { range: 'last 30 days' });
  assert.strictEqual(filterRes.success, true);
  assert.strictEqual(commander.metricsFilter, 'last 30 days');

  // Test EXPORT_DATA state mutation
  const exportRes = commander.executeCommand('EXPORT_DATA', { format: 'csv' });
  assert.strictEqual(exportRes.success, true);
  assert.strictEqual(commander.lastExport.format, 'csv');

  // Test TOGGLE_HIGH_CONTRAST state mutation
  assert.strictEqual(commander.highContrast, false);
  const hcRes1 = commander.executeCommand('TOGGLE_HIGH_CONTRAST', {});
  assert.strictEqual(hcRes1.success, true);
  assert.strictEqual(commander.highContrast, true);
  const hcRes2 = commander.executeCommand('TOGGLE_HIGH_CONTRAST', {});
  assert.strictEqual(commander.highContrast, false);

  // Test HELP command execution
  const helpRes = commander.executeCommand('HELP', {});
  assert.strictEqual(helpRes.success, true);
  assert.ok(Array.isArray(helpRes.commands));

  // Test UNKNOWN command execution
  const unkRes = commander.executeCommand('UNKNOWN', { raw: 'unknown command' });
  assert.strictEqual(unkRes.success, false);
  assert.strictEqual(unkRes.action, 'UNKNOWN');
});

test('SaasLaunchpadVoiceCommander - records command history and supports clearHistory', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  commander.executeCommand('NAVIGATE_PAGE', { page: 'analytics', raw: 'go to analytics' });
  commander.executeCommand('UPGRADE_PLAN', { plan: 'pro', raw: 'upgrade to pro' });

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 2);

  assert.strictEqual(history[0].action, 'NAVIGATE_PAGE');
  assert.strictEqual(history[0].status, 'success');
  assert.strictEqual(history[0].transcript, 'go to analytics');
  assert.ok(history[0].timestamp);
  assert.ok(history[0].id);

  assert.strictEqual(history[1].action, 'UPGRADE_PLAN');
  assert.strictEqual(history[1].status, 'success');
  assert.strictEqual(history[1].transcript, 'upgrade to pro');

  // Clear history
  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('SaasLaunchpadVoiceCommander - event emitter pattern correctly emits events and unregisters', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  let statusChangeCalled = 0;
  let listeningChangeCalled = 0;
  let commandEventCalled = 0;
  let contrastEventCalled = 0;
  let synthesizeCalled = 0;
  let historyClearCalled = 0;

  const unsubStatus = commander.on('statusChange', (newStatus) => {
    statusChangeCalled++;
  });

  commander.on('listeningChange', (isListening) => {
    listeningChangeCalled++;
  });

  commander.on('command', (cmdData) => {
    commandEventCalled++;
  });

  commander.on('contrastChange', (hc) => {
    contrastEventCalled++;
  });

  commander.on('synthesize', (msg) => {
    synthesizeCalled++;
  });

  commander.on('historyClear', () => {
    historyClearCalled++;
  });

  // Trigger events
  commander.startListening();
  assert.strictEqual(commander.isListening, true);
  assert.strictEqual(commander.status, 'listening');

  commander.executeCommand('NAVIGATE_PAGE', { page: 'integrations' });
  assert.strictEqual(commandEventCalled, 1);
  assert.ok(synthesizeCalled >= 1);

  commander.executeCommand('TOGGLE_HIGH_CONTRAST', {});
  assert.strictEqual(contrastEventCalled, 1);

  commander.stopListening();
  assert.strictEqual(commander.isListening, false);

  commander.clearHistory();
  assert.strictEqual(historyClearCalled, 1);

  // Test unsubscribe
  unsubStatus();
  const currentStatusCount = statusChangeCalled;
  commander.setStatus('processing');
  assert.strictEqual(statusChangeCalled, currentStatusCount);
});

test('SaasLaunchpadVoiceCommander - headless simulator listening toggle and speech synthesis', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  assert.strictEqual(commander.isListening, false);
  const toggledOn = commander.toggleListening();
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(commander.isListening, true);
  assert.strictEqual(commander.status, 'listening');

  const toggledOff = commander.toggleListening();
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'idle');

  // Test synthesize in headless environment
  const msg = commander.synthesizeResponse('System test synthesis response');
  assert.strictEqual(msg, 'System test synthesis response');
  assert.strictEqual(commander.status, 'idle');
});

test('SaasLaunchpadVoiceCommander - processTranscript end-to-end integration', () => {
  const commander = new SaasLaunchpadVoiceCommander();

  const { parsed, result } = commander.processTranscript('switch to enterprise');

  assert.strictEqual(parsed.action, 'UPGRADE_PLAN');
  assert.strictEqual(parsed.payload.plan, 'enterprise');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.plan, 'enterprise');
  assert.strictEqual(commander.currentPlan, 'enterprise');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'UPGRADE_PLAN');
  assert.strictEqual(history[0].transcript, 'switch to enterprise');
});
