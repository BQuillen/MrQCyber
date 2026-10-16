'use strict';

// Reading help only: this module never reads data rows, runs queries or saves work.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampaignTableGuides = api;
})(typeof window === 'object' ? window : null, function () {
  const COMMON = {
    record_id: 'The reference for this row. Use it when citing this record.',
    timestamp: 'When this recorded action happened, in UTC. A Z at the end means UTC.',
    event_id: 'The reference for the recorded event.',
    observation_id: 'The reference for this recorded observation.',
    document_id: 'The document reference. Use its version as well when comparing copies.',
    version: 'Which numbered version of the document this row concerns.',
    account_id: 'The account recorded by the service. An account name and a person are not always the same thing.',
    actor_account_id: 'The account that the service recorded for this action.',
    operator_account_id: 'The support account used for the action or approved task.',
    device_id: 'The device reference. DeviceAssignments can explain who was assigned the device.',
    source_device_id: 'The device the connection or transfer started from.',
    target_device_id: 'The device being accessed or supported.',
    destination_device_id: 'The device the file was sent to.',
    session_id: 'The application session reference. Matching values connect actions within the same session.',
    application_session_id: 'The campaign application session reference, separate from a remote-support session.',
    support_session_id: 'The remote-support session reference, separate from the campaign application session.',
    ticket_id: 'The support request reference. Matching tickets connect the task, its approval and support records.',
    grant_id: 'The reference for a configured support permission.',
    request_id: 'The reference for one application request. Match the exact value to follow it between records.',
    thread_id: 'The conversation or discussion reference. Rows with the same value belong to that thread.',
    message_id: 'The reference for a preserved message.',
    sender_account_id: 'The account that sent the message.',
    recipient_account_id: 'The account the message was addressed to.',
    sender_address: 'The sender address recorded for this message or delivery.',
    recipient_address: 'The recipient address recorded for this message or delivery.',
    body: 'The message text. Read what was requested or said, along with its sender and time.',
    operation: 'What kind of action the row records.',
    action: 'What kind of action the row records.',
    result: 'The outcome of the recorded action. Read this before deciding whether an attempt succeeded.',
    source_collection_id: 'The collection the record came from. This helps you find its source information.',
    file_sha256: 'A fingerprint of the file contents. Matching fingerprints let you check that two records concern the same contents.',
    bytes: 'The file content size in bytes when a file is involved. A byte is a unit of digital storage.',
    exchange_id: 'The shared-file delivery reference. Match the exact value across delivery records.',
    source: 'Where this record was collected, such as an application log or a device log.',
    reference_id: 'A reference to a related document, message or approval.',
    destination_host: 'The service or website contacted. This is a host name, not the person who received a file.'
  };
  const specs = {};
  function guide(name, title, purpose, rowMeaning, columns, readSteps, comparisons = []) {
    specs[name] = { tableName: name, title, purpose, rowMeaning,
      columns: Object.fromEntries(Object.entries(columns).map(([key, value]) => [key, value || COMMON[key]])),
      readSteps, comparisons };
  }
  const compare = (tableName, columns, targetColumns, text) => ({ tableName, columns, targetColumns, text });

  guide('EventRevisions', 'Event revision ledger',
    'Shows changes to event arrangements, including the venue and registration settings.',
    'One row is one scheduling-system action, with the old and new values when something changed.', {
      record_id: '', timestamp: '', event_id: 'The event whose arrangements were being changed.', action: '',
      old_value: 'The setting or information before the change. A dash means there was no earlier value shown.',
      new_value: 'The setting or information after the change.',
      requested_by: 'Who asked for the change.', recorded_by: 'The account that entered the change in the system.',
      reference: 'The related request or notice reference.'
    }, ['Read action, old_value and new_value together to see what changed.',
      'Then check timestamp and compare requested_by with recorded_by: asking for a change and entering it are different jobs.']);

  guide('EventRegistrations', 'Event registration excerpt',
    'Shows who registered or checked in, their listed organization, and why they attended.',
    'One row is a named registration or staff check-in.', {
      registration_id: 'The reference for this registration.', name: 'The attendee name on the registration.',
      affiliation: 'The organization listed for this registration.', purpose: 'The attendee’s listed reason or role at the event.',
      check_in_utc: 'The recorded check-in time, in UTC.'
    }, ['Start with name, affiliation and purpose to understand the attendee’s role.',
      'A check-in shows attendance. To investigate computer activity, use the relevant computer records.']);

  guide('NetworkConnections', 'Venue network context',
    'Shows examples of devices using the venue’s guest network and the destinations they contacted.',
    'One row is a network observation from a device at a particular time.', {
      observation_id: '', timestamp: '', device_label: 'The label recorded for a guest device; this table does not give its owner’s name.',
      internal_ip: 'The device’s address inside the venue network.',
      public_ip: 'The address visible outside the venue. Several devices can share this address.',
      observed_destination: 'The website or service the device contacted.'
    }, ['Compare device_label and internal_ip with public_ip to see how devices share an outside address.',
      'A website visit shows a connection. It does not show which forum username was used or what the visitor posted.']);

  guide('ApprovalEvents', 'Campaign approval ledger',
    'Shows which document versions were approved and what that approval covered. A ledger is simply a list of recorded decisions.',
    'One row is one approval decision for a particular document version.', {
      approval_id: 'The reference for this approval decision.', timestamp: '', document_id: '', version: '',
      decision: 'The recorded decision about this version.', approver_role: 'The role or team that approved it.',
      purpose: 'What the approval was intended to cover.'
    }, ['Read document_id, version, decision and purpose together.',
      'Approval of one version does not automatically approve a later version.'], [
      compare('DocumentEvents', ['document_id', 'version'], ['document_id', 'version_from', 'version_to'],
        'Compare the approved version with the versions recorded before and after an edit.'),
      compare('PublishingEvents', ['document_id', 'version'], ['source_document', 'source_version'],
        'Compare the approved document and version with the document and version used for a post.')
    ]);

  guide('AccountPermissions', 'Application accounts and permissions',
    'Explains what each account could do in the application and the campaign rules for using it.',
    'One row describes an account’s permissions for one resource during the supplied period.', {
      account_id: '', custodian_or_role: 'The person or role responsible for the account.',
      resource: 'The application or material the account can access.',
      technical_permission: 'What the software allows this account to do.',
      workflow_condition: 'The approval or review rules the campaign expects the account to follow.'
    }, ['Read technical_permission beside workflow_condition.',
      'Being able to perform an action in the software is different from having approval to perform that action.'], [
      compare('PublishingEvents', ['account_id'], ['actor_account_id'], 'Match the account to see which publishing actions were recorded for it.')
    ]);

  guide('PublishingEvents', 'Publishing audit excerpt',
    'Shows recorded actions on campaign posts, including drafting, scheduling and publishing.',
    'One row is one completed publishing-application action.', {
      event_id: '', timestamp: '', post_id: 'The post reference. Match it to follow the same post through several actions.',
      action: '', actor_account_id: '', session_id: '',
      source_document: 'The document used as the source for the post.', source_version: 'The version of that source document used.', result: ''
    }, ['Choose a post_id and read its actions in timestamp order.',
      'Creating a draft, scheduling it, and publishing it are separate actions. A scheduled post can publish automatically.'], [
      compare('ApprovalEvents', ['source_document', 'source_version'], ['document_id', 'version'], 'Check whether the source version had approval.'),
      compare('SessionObservations', ['session_id'], ['session_id'], 'Match the application session to its recorded observations.')
    ]);

  guide('SessionObservations', 'Application session observations',
    'Shows when a gateway recorded activity from a campaign application session. A session lets an application recognize a signed-in connection.',
    'One row is one observed action from an application session.', {
      observation_id: '', timestamp: '', session_id: '', account_id: '',
      client_label: 'The browser or application-client label in this export; it is not a person’s name.', action: '', source: ''
    }, ['Follow the same session_id across its timestamps and actions.',
      'The first observation in this excerpt may be later than sign-in. An automatic scheduled publication does not require someone to be online then.'], [
      compare('ApplicationSessions', ['session_id'], ['application_session_id'], 'Match the session to the record showing when the application issued it.'),
      compare('PublishingEvents', ['session_id'], ['session_id'], 'Check which publishing actions used the same session.')
    ]);

  guide('DocumentEvents', 'Document activity excerpt',
    'Shows edits and exports of campaign documents. Export means making a file copy from the application.',
    'One row is one operation on a document.', {
      event_id: '', timestamp: '', document_id: '', operation: '',
      version_from: 'The document version before the operation.', version_to: 'The document version after the operation.',
      actor_account_id: '', session_id: '', result: ''
    }, ['Read operation, version_from and version_to to distinguish an edit from an export.',
      'An export makes a copy. A delivery record is needed to follow where a copy was sent.'], [
      compare('ApprovalEvents', ['document_id', 'version_to'], ['document_id', 'version'], 'Compare the edited version with the approval ledger.'),
      compare('PublishingEvents', ['document_id', 'version_to'], ['source_document', 'source_version'], 'Check which version was later used for a post.')
    ]);

  guide('SupportApprovals', 'Approved support tasks',
    'Shows the support work the campaign authorized, including the device, task and allowed times.',
    'One row is an approval for a particular support task, account, device and time window.', {
      record_id: '', timestamp: 'When the approval was recorded, in UTC; the allowed working period is in approved_from and approved_to.',
      ticket_id: '', event_id: 'The campaign event associated with this support task.', target_device_id: '', operator_account_id: '',
      approved_from: 'The earliest time the approved work could start, in UTC.', approved_to: 'The time the approval ended, in UTC.',
      approved_task: 'What the support worker was authorized to do.', allowed_capabilities: 'The tool functions allowed for that approved task.',
      decision: 'Whether this task was approved.', approved_by: 'The role or team that gave the approval.'
    }, ['Start with approved_task and the approved_from / approved_to window.',
      'Use the matching ticket to compare the allowed work with what actually happened.'], [
      compare('SupportGrants', ['ticket_id'], ['ticket_id'], 'Compare the task approval with the tool’s configured capabilities and expiry time.'),
      compare('RemoteSupportSessions', ['ticket_id', 'target_device_id'], ['ticket_id', 'target_device_id'], 'Compare the actual start and end times with the approved window.')
    ]);

  guide('SupportGrants', 'Support-service grant audit',
    'Shows when remote-support permissions were switched on or off. A grant is the software setting that allows access.',
    'One row is an activation or revocation of a support permission.', {
      record_id: '', timestamp: '', grant_id: '', ticket_id: '', target_device_id: '', operator_account_id: '',
      operation: 'Whether the permission was activated or revoked.', valid_from: 'When the configured permission starts, in UTC.',
      valid_to: 'When the configured permission ends, in UTC.', capabilities: 'The functions enabled in the tool, such as remote control or file transfer.',
      recorded_by: 'The account that entered the permission change.', reason_ref: 'The request reference explaining why the configuration was changed.'
    }, ['Read capabilities and valid_from / valid_to to see what the tool would allow.',
      'Compare that configuration with the approved task; the software settings may allow more than the task requires.'], [
      compare('SupportApprovals', ['ticket_id'], ['ticket_id'], 'Check the task, capabilities and times that were actually approved.'),
      compare('RemoteSupportSessions', ['grant_id'], ['grant_id'], 'Find attempts made using the same configured permission.')
    ]);

  guide('RemoteSupportSessions', 'Support-session records',
    'Shows attempts to connect to another device through the remote-support tool.',
    'One row is one support-session attempt, including its outcome.', {
      record_id: '', start_time: 'When the support-session attempt started, in UTC.', end_time: 'When the session or attempt ended, in UTC.',
      support_session_id: '', grant_id: '', ticket_id: '', operator_account_id: '', source_device_id: '', target_device_id: '',
      control_mode: 'The kind of remote access requested.',
      result: 'Completed means a session was established and its end recorded. DeniedExpired means the attempt did not gain control.'
    }, ['Check result first, then the source device, target device and start/end times.',
      'Compare a completed session’s interval with the approved task window.'], [
      compare('SupportApprovals', ['ticket_id'], ['ticket_id'], 'Compare the session times and device with the task approval.'),
      compare('DeviceAssignments', ['source_device_id', 'target_device_id'], ['device_id'], 'Look up the devices and check who was assigned each at the session time.'),
      compare('EndpointEvents', ['support_session_id'], ['support_session_id'], 'Follow the session reference to actions recorded on a device.')
    ]);

  guide('DeviceAssignments', 'Device allocation records',
    'Shows who was assigned a computer or loaner device, and during which period.',
    'One row is one time-limited device assignment.', {
      record_id: '', device_id: '', assigned_to: 'The person or role assigned the device.', account_id: '',
      organization: 'The organization responsible for the device or assignment.',
      valid_from: 'When the assignment began, in UTC.', valid_to: 'When the assignment ended, in UTC.',
      assignment_type: 'What kind of device assignment this was.', verification_ref: 'The asset or check-out record supporting the assignment.'
    }, ['Match device_id, then make sure the event time falls between valid_from and valid_to.',
      'This tells you who had the device assigned to them. Use activity records to see what happened on it.']);

  guide('EndpointEvents', 'Preserved endpoint and managed-browser events',
    'Shows actions recorded on computers and managed browsers. An endpoint is simply a device, such as a laptop.',
    'One row is one device or browser event; source tells you which collected log it came from.', {
      record_id: '', timestamp: '', device_id: '', user_context: 'The local profile or device context. A remote operator may be different from this local user.',
      operation: '', object_id: 'The file path or other object involved in this event.', support_session_id: '', application_session_id: '', request_id: '',
      file_sha256: '', bytes: 'The file content size when a file is involved; zero is used for non-file events.', result: '', source: ''
    }, ['Start with device_id, operation, timestamp and result to describe the action in ordinary words.',
      'not_applicable means that field is not used for that event. When following a file, a FileReceived row is the receiving computer’s record.'], [
      compare('DeviceAssignments', ['device_id'], ['device_id'], 'Look up the device assignment for the event time.'),
      compare('FileTransfers', ['record_id', 'request_id', 'file_sha256', 'bytes'], ['receipt_event_id', 'transfer_id', 'file_sha256', 'bytes'],
        'For a receiving event, compare its record and request references with the transfer’s receipt_event_id and transfer_id; the fingerprint and size check the contents.'),
      compare('ForumEvents', ['request_id'], ['request_id'], 'Match a browser request to the forum action recorded by the provider.')
    ]);

  guide('ApplicationSessions', 'Campaign application session issuance',
    'Shows when the campaign application created a session for a managed device and browser.',
    'One row is one session issued by the campaign application.', {
      record_id: '', timestamp: '', application_session_id: '', account_id: '', device_id: '',
      browser_context_id: 'The managed browser context associated with the session.',
      authentication_context_id: 'The reference for the sign-in context used by the service.',
      authentication_basis: 'How the service accepted the sign-in. ExistingManagedSignIn means it reused an existing managed sign-in without a new password prompt.',
      request_id: '', result: '', source: ''
    }, ['Read account_id, device_id, timestamp and authentication_basis together.',
      'The session reference can connect later application actions to this issued session.'], [
      compare('SessionObservations', ['application_session_id'], ['session_id'], 'Compare the issue time with later gateway observations of the session.'),
      compare('EndpointEvents', ['application_session_id', 'request_id'], ['application_session_id', 'request_id'], 'Compare the session and request references with the device’s records.')
    ]);

  guide('FileTransfers', 'Support-service file transfer records',
    'Shows files the support tool tried to send from one computer to another, and whether the transfer completed.',
    'One row is one completed or denied file-transfer outcome reported by the support service.', {
      transfer_id: 'The reference for this file-transfer attempt.', timestamp: 'When the transfer completed or was denied, in UTC.',
      support_session_id: '', source_device_id: '', destination_device_id: '',
      source_path: 'The file’s location on the sending computer.', destination_path: 'The intended file location on the receiving computer.',
      file_sha256: '', bytes: 'The number of file bytes transferred. A denied attempt records zero.',
      status: 'The transfer outcome. Completed means the service reports delivery; a denied status means the transfer did not complete.',
      operator_account_id: '', receipt_event_id: 'The reference for a separate receiving-computer record in EndpointEvents. Think of it as the computer recording “file received.”',
      authorization_ref: 'The support ticket to check for the approved task.'
    }, ['Read status, source_path and destination_device_id first: what file, where from, where to, and did it complete?',
      'A receipt here is a computer’s receiving record, not a shopping receipt. It helps check the transfer from the receiving side.'], [
      compare('EndpointEvents', ['receipt_event_id', 'transfer_id', 'file_sha256', 'bytes'], ['record_id', 'request_id', 'file_sha256', 'bytes'],
        'Find receipt_event_id in EndpointEvents.record_id. Compare the transfer reference, file fingerprint and size to check that both records concern the same delivery.'),
      compare('DeviceAssignments', ['destination_device_id'], ['device_id'], 'Look up who was assigned the receiving computer at the transfer time.'),
      compare('SupportApprovals', ['authorization_ref'], ['ticket_id'], 'Check whether the approved task covered copying the file.')
    ]);

  guide('ForumEvents', 'Forum provider application audit',
    'Shows actions recorded by the forum service for signed-in forum accounts.',
    'One row is one forum action, such as signing in, viewing a thread or creating a post.', {
      record_id: '', timestamp: '', forum_account_id: 'The forum’s account reference, separate from its public display name.',
      display_name: 'The username shown on the forum. It is not necessarily the person’s real name.',
      forum_session_id: 'The forum session reference.', thread_id: '', action: '', request_id: '', result: ''
    }, ['Compare action with thread_id: viewing a discussion and posting to it are different actions.',
      'Use the display name to connect public posts to the account, then the request reference when a device comparison is needed.'], [
      compare('EndpointEvents', ['request_id'], ['request_id'], 'Match the exact request reference to a managed-browser event.')
    ]);

  guide('CoordinationMessages', 'Preserved workplace message excerpts',
    'Contains retained workplace messages, including their senders, recipients and references to other records.',
    'One row is one preserved workplace message.', {
      message_id: '', timestamp: '', sender_account_id: '', recipient_account_id: '', body: '',
      reference_ids: 'References to related documents, devices, tickets or messages mentioned with this message.', source_collection_id: ''
    }, ['Read body with the sender, recipient and timestamp to understand the request or reply.',
      'A request describes what someone wanted. Compare it with activity records to see what was actually done.']);

  guide('EmailEvents', 'Preserved email conversations',
    'Contains email conversations, including subjects, message text and references to shared documents.',
    'One row is one message preserved from matching sender and recipient copies.', {
      record_id: '', timestamp: '', message_id: '', thread_id: '', sender_address: '', recipient_address: '',
      subject: 'The email subject line.', body: '',
      exchange_id: 'The shared-document delivery reference linked from this email. The document itself is not embedded in this table.',
      status: 'MatchedCopies means the preserved sender and recipient copies agree on the message.', source_collection_id: ''
    }, ['Read a thread in timestamp order, keeping track of who is writing to whom.',
      'Use exchange_id to find a linked document delivery when the email mentions a shared file.'], [
      compare('DocumentExchanges', ['exchange_id', 'message_id'], ['exchange_id', 'message_id'], 'Find the delivery linked to the email and read its document version, recipient and result.')
    ]);

  guide('DocumentExchanges', 'Document-exchange service outcomes',
    'Shows attempts to deliver shared documents through CivicShare, including the sender, recipient, version and outcome.',
    'One row is the final service record for a delivery attempt to one named recipient.', {
      record_id: '', timestamp: 'When the delivery service recorded completion or denial, in UTC. Completed follows the recipient’s download acknowledgment.',
      exchange_id: '', message_id: 'The preserved email reference linked to this share.', request_id: '', sender_address: '', recipient_address: '',
      source_device_id: '', destination_host: '', document_id: '', version: '', file_sha256: '',
      file_bytes: 'The full size of the intended file.', bytes_transferred: 'The number of file bytes delivered. A denied attempt records zero.',
      result: 'Completed means the service recorded delivery; Denied or another unsuccessful result is an attempt that did not complete.',
      receipt_id: 'The reference for the receiving device’s entry in DocumentReceipts.', source_collection_id: ''
    }, ['Start with sender_address, recipient_address, document_id, version and result.',
      'Compare file_bytes with bytes_transferred when checking an outcome. The receiving device’s record provides a second view of the delivery.'], [
      compare('DocumentReceipts', ['receipt_id', 'exchange_id', 'file_sha256', 'file_bytes'], ['record_id', 'exchange_id', 'file_sha256', 'bytes'],
        'Find the receiving entry by receipt_id, then compare the delivery reference, file fingerprint and file size.'),
      compare('EmailEvents', ['message_id', 'exchange_id'], ['message_id', 'exchange_id'], 'Read the email associated with the shared document.')
    ]);

  guide('DocumentReceipts', 'Independently collected recipient file journals',
    'Shows files saved on receiving computers. A receipt here is the receiving computer’s “file saved” record, not a financial receipt.',
    'One row is one successful file write recorded on the identified receiving device.', {
      record_id: '', timestamp: '', exchange_id: '', request_id: '', recipient_address: '', device_id: '', document_id: '', version: '',
      file_sha256: '', bytes: '', result: 'FileWritten means the receiving device recorded saving the file.', source_collection_id: ''
    }, ['Read recipient_address, device_id, document_id and version to see where the file arrived.',
      'These entries were collected from the receiving computers, separately from the sharing service. Matching references connect the two views.'], [
      compare('DocumentExchanges', ['record_id', 'exchange_id', 'file_sha256', 'bytes'], ['receipt_id', 'exchange_id', 'file_sha256', 'file_bytes'],
        'Compare this receiving entry with the sharing service’s receipt reference, delivery reference, fingerprint and file size.')
    ]);

  guide('OutboundConnections', 'Outbound connection and request observations',
    'Shows computers contacting outside websites or services, with application request references where available.',
    'One row is one outgoing connection or request observed on a managed device.', {
      record_id: '', timestamp: '', device_id: '', account_id: '', destination_host: '', request_id: '',
      bytes_sent: 'The traffic sent, including connection information and headers. It is not the same as a file’s content size.',
      connection_result: 'TLSConnected means a secure connection was established. It does not by itself mean a file was delivered.', source_collection_id: ''
    }, ['Read device_id, destination_host, timestamp and connection_result to describe the connection.',
      'For a file delivery, follow a matching request reference to the delivery record for its recipient and outcome.'], [
      compare('DocumentExchanges', ['request_id'], ['request_id'], 'Match the request to a delivery attempt, if one exists, then check its recipient and result.')
    ]);

  guide('DisclosurePublicationEvents', 'Approval and publication times for the photographed plans',
    'Shows when plans could be released publicly and when related posts or official announcements were published.',
    'One row is an approval or publication event collected from a campaign or Frame record.', {
      record_id: '', timestamp: '', object_id: 'The plan or post involved in this event.',
      operation: 'The kind of event, such as release approval or publication.',
      authorized_public_at: 'The earliest approved public release time for ReleaseApproved rows. Other rows use none because they do not grant release approval.',
      reference_id: '', source_collection_id: ''
    }, ['Compare timestamp for a publication with authorized_public_at for the relevant plan.',
      'The time an approval was recorded and the time it permits public release can be different. Read operation before comparing times.']);

  guide('PaigeMessages', 'Friendship and workplace-message excerpts',
    'Contains messages from personal and workplace conversations, so you can follow how requests and responses developed.',
    'One row is one preserved message in a named conversation and channel.', {
      record_id: '', timestamp: '', thread_id: '', channel: 'Where the conversation took place, such as the forum or a workplace channel.',
      sender_account_id: '', recipient_account_ids: 'The account or accounts the message was addressed to.', body: '', reference_id: '', source_collection_id: ''
    }, ['Read each thread in timestamp order; check sender_account_id and recipient_account_ids before interpreting the body.',
      'Distinguish a request, a reply, and a statement about somebody else. Use the words in the message to explain what was shared or refused.']);

  guide('DisclosureUseEvents', 'Response intake and publication events',
    'Shows when response material was received and published, alongside the campaign announcement time.',
    'One row is an intake or publication event from the named source collection.', {
      record_id: '', timestamp: '', operation: '', object_id: 'The document or announcement involved in this event.',
      source_reference: 'The message or other record linked to the received or published material.',
      file_sha256: 'The fingerprint of the preserved response text. none means this entry does not supply a preserved file fingerprint.',
      bytes: 'The preserved response text size. Zero is used when the entry supplies a publication time rather than preserved file contents.',
      source_collection_id: ''
    }, ['Read operation and timestamp to put receipt and publication in order.',
      'Matching file fingerprints identify the same preserved response text. The campaign announcement is a different text whose time can be compared.'], [
      compare('PaigeMessages', ['source_reference'], ['record_id'], 'When the source reference names a preserved message, read that message for the surrounding request or reply.')
    ]);

  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  freeze(specs);
  function generic(name) {
    return { tableName: String(name || 'Table'), title: 'Table reading guide',
      purpose: 'This table is a list of supplied records. Read its source description and column names to understand what was recorded.',
      rowMeaning: 'Each row is one record in this source. The source description explains the kind of record.',
      columns: {}, readSteps: ['Start with the time, action and outcome columns when they are present. Use exact reference values to compare related records.'], comparisons: [] };
  }
  function get(name) { return Object.prototype.hasOwnProperty.call(specs, name) ? specs[name] : generic(name); }
  function names() { return Object.keys(specs); }
  function fallbackColumn(name, type) {
    if (type === 'datetime') return 'A date and time. UTC is shown with Z at the end of the value.';
    if (type === 'long') return 'A whole-number value; the source description explains what is being counted or measured.';
    return COMMON[name] || 'A text value from the source. Read it with the other columns in the same row.';
  }
  function render(container, options = {}) {
    if (!container?.ownerDocument?.createElement || typeof container.replaceChildren !== 'function') return null;
    const { tableName, table } = options;
    const help = get(tableName);
    const doc = container.ownerDocument;
    const node = (tag, text, className) => {
      const el = doc.createElement(tag);
      if (text !== undefined) el.textContent = String(text);
      if (className) el.className = className;
      return el;
    };
    const panel = node('section', undefined, 'campaign-table-guide');
    panel.setAttribute('aria-label', 'How to read ' + help.tableName);
    const heading = node('h3', help.tableName + ' · What this table shows');
    const source = node('p', help.title + (table?.artifactId ? ' · ' + table.artifactId : ''), 'campaign-table-guide-source');
    panel.append(heading, source, node('p', help.purpose), node('p', help.rowMeaning, 'campaign-table-guide-row'));
    const details = node('details', undefined, 'campaign-table-guide-details');
    details.append(node('summary', 'Column meanings and reading tips'));
    const steps = node('ul', undefined, 'campaign-table-guide-steps');
    help.readSteps.forEach(text => steps.append(node('li', text)));
    details.append(steps);
    const columns = node('dl', undefined, 'campaign-table-guide-columns');
    const actualColumns = Array.isArray(table?.columns) ? table.columns : Object.keys(help.columns);
    for (const column of actualColumns) {
      const term = node('dt');
      term.append(node('code', column));
      const type = table?.types?.[column];
      const friendlyType = { string: 'text', long: 'whole number', datetime: 'date and time' }[type];
      if (friendlyType) term.append(node('span', friendlyType, 'campaign-table-guide-type'));
      columns.append(term, node('dd', help.columns[column] || fallbackColumn(column, type)));
    }
    if (actualColumns.length) details.append(columns);
    // An omitted list must not advertise later collections. The host supplies
    // only table names available to this student at this point in the activity.
    const available = new Set(Array.isArray(options.availableTableNames) ? options.availableTableNames : []);
    const comparisons = help.comparisons.filter(item => available.has(item.tableName));
    if (comparisons.length) {
      const section = node('div', undefined, 'campaign-table-guide-comparisons');
      section.append(node('h4', 'If you need to compare records'));
      const list = node('ul');
      for (const item of comparisons) {
        const li = node('li');
        li.append(node('strong', item.tableName + ': '), node('span', item.text)); list.append(li);
      }
      section.append(list); details.append(section);
    }
    panel.append(details); container.replaceChildren(panel);
    return panel;
  }
  return Object.freeze({ get, names, render });
});
