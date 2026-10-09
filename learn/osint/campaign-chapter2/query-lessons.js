// Generated from query-lessons.json. Edit the JSON source and rebuild.
window.CAMPAIGN_CHAPTER_TWO_QUERY_LESSONS = [
  {
    "id": "QUERY-Y2-14",
    "questionId": "Y2-14",
    "title": "Compare approval with technical capability",
    "tableName": "SupportApprovals",
    "objective": "Compare two records without confusing approval with a configured permission.",
    "starterQuery": "SupportApprovals\n| where ticket_id == \"REPLACE_ME\"\n| project record_id, approved_from, approved_to, approved_task, allowed_capabilities",
    "steps": [
      "Replace the placeholder with the ticket ID named in the question.",
      "Run a separate SupportGrants query for the same ticket; inspect the Activated record.",
      "Compare task time, technical validity and capabilities. Preserve both record IDs.",
      "Use the source note to distinguish preconfiguration from actual use."
    ],
    "hints": [
      "A ticket links records across sources; it does not make the sources mean the same thing.",
      "Query the two tables separately. A join is not needed for this comparison."
    ]
  },
  {
    "id": "QUERY-Y2-15",
    "questionId": "Y2-15",
    "title": "Find completed support sessions",
    "tableName": "RemoteSupportSessions",
    "objective": "Separate successful control from denied attempts, then compare time with approval.",
    "starterQuery": "RemoteSupportSessions\n| where ticket_id == \"REPLACE_ME\"\n| order by start_time asc",
    "steps": [
      "Replace the ticket placeholder and inspect every result value.",
      "Filter for completed sessions and project their IDs, times and devices.",
      "Compare each interval with the approved task window.",
      "Inspect denied attempts separately and explain what they did not achieve."
    ],
    "hints": [
      "A denied attempt is not successful access.",
      "Use start_time and end_time; this table does not have a timestamp column."
    ]
  },
  {
    "id": "QUERY-Y2-16",
    "questionId": "Y2-16",
    "title": "Follow the endpoint-to-application bridge",
    "tableName": "EndpointEvents",
    "objective": "Use stable session and request IDs to connect records with different source visibility.",
    "starterQuery": "EndpointEvents\n| where support_session_id == \"REPLACE_ME\"\n| order by timestamp asc",
    "steps": [
      "Replace the placeholder with the later completed support-session ID.",
      "Inspect browser and application-link operations alongside the target device.",
      "Record the request ID and application-session ID from the relevant event.",
      "Compare the request with ApplicationSessions and the remote source; keep local user context separate from operator identity."
    ],
    "hints": [
      "An operation filter can narrow the timeline after you inspect its values.",
      "ApplicationSessionLinked is a record type, not proof of who physically typed."
    ]
  },
  {
    "id": "QUERY-Y2-17",
    "questionId": "Y2-17",
    "title": "Read what the session issuer recorded",
    "tableName": "ApplicationSessions",
    "objective": "Compare sign-in context and distinguish session issuance from first gateway observation.",
    "starterQuery": "ApplicationSessions\n| where application_session_id == \"REPLACE_ME\"\n| project record_id, timestamp, application_session_id, device_id, browser_context_id, authentication_context_id, authentication_basis, request_id",
    "steps": [
      "Filter to the incident application session, then inspect its sign-in context.",
      "Find the earlier session using the same device/browser context and compare the source's authentication_basis.",
      "Query the old SessionObservations table separately and sort the incident session's records.",
      "Explain the two sources' different event meanings rather than changing the old first-observed label."
    ],
    "hints": [
      "Two exact session comparisons can be joined with or.",
      "The source explicitly records how sign-in was reused; do not invent a new credential theft."
    ]
  },
  {
    "id": "QUERY-Y2-18",
    "questionId": "Y2-18",
    "title": "Trace source-file origins",
    "tableName": "EndpointEvents",
    "objective": "Distinguish a prior authorized cache from the incident's cloud export and later local transfers.",
    "starterQuery": "EndpointEvents\n| where device_id == \"REPLACE_ME\"\n| order by timestamp asc",
    "steps": [
      "Choose the campaign workstation, then inspect file-related operation values.",
      "Filter to file creation/cache events, retaining object paths, application-session IDs, hashes and times.",
      "Compare each file with the manifest and cache approval.",
      "Use the old document source to explain why a local transfer does not add another cloud export."
    ],
    "hints": [
      "Use or to retain two known operation values after the device filter.",
      "The source timestamp and application-session ID distinguish the files' origins."
    ]
  },
  {
    "id": "QUERY-Y2-19",
    "questionId": "Y2-19",
    "title": "Count completed contents and destinations",
    "tableName": "FileTransfers",
    "objective": "Filter outcome and session before counting distinct content and destination identities.",
    "starterQuery": "FileTransfers\n| where support_session_id == \"REPLACE_ME\"\n| where status == \"REPLACE_ME\"\n| project transfer_id, timestamp, source_device_id, destination_device_id, file_sha256, bytes",
    "steps": [
      "Replace both placeholders using the scope and outcome required by the question.",
      "Save the underlying transfer IDs before aggregation.",
      "Run distinct file_sha256 followed by count for different file contents.",
      "Repeat with destination_device_id; do not include denied attempts."
    ],
    "hints": [
      "A content hash identifies content more reliably than a filename.",
      "The unit being counted must be stated: transfer rows, contents or destination devices."
    ]
  },
  {
    "id": "QUERY-Y2-20",
    "questionId": "Y2-20",
    "title": "Verify an independent receiving record",
    "tableName": "FileTransfers",
    "objective": "Corroborate content identity, destination and completion across separately collected sources.",
    "starterQuery": "FileTransfers\n| where transfer_id == \"REPLACE_ME\"\n| project transfer_id, timestamp, source_device_id, destination_device_id, file_sha256, bytes, receipt_event_id",
    "steps": [
      "Select the restricted-file transfer using the manifest and prior query.",
      "Follow receipt_event_id to a separate EndpointEvents query.",
      "Compare transfer/request ID, content hash, length, receiving path and device.",
      "Check event order and read the receiving source's provenance."
    ],
    "hints": [
      "A sender's Started event is not the independent receiving evidence.",
      "Use exact IDs and hashes; a matching filename alone is weaker."
    ]
  },
  {
    "id": "QUERY-Y2-21",
    "questionId": "Y2-21",
    "title": "Correlate attendee, device and forum account",
    "tableName": "DeviceAssignments",
    "objective": "Use time-valid custody and captured first-party request IDs without inferring identity from IP.",
    "starterQuery": "DeviceAssignments\n| where assigned_to contains \"REPLACE_ME\"\n| project record_id, device_id, assigned_to, valid_from, valid_to, verification_ref",
    "steps": [
      "Find the named attendee's loaner assignment and its validity interval.",
      "Query that device's EndpointEvents around the public post time.",
      "Carry the captured request ID to a separate ForumEvents query.",
      "Explain what the authenticated application record establishes and preserve the source's physical-control/intent limits."
    ],
    "hints": [
      "Neither the assignment nor the forum account alone is the whole identity chain.",
      "No join operator is required: cite the three matching records and compare time explicitly."
    ]
  },
  {
    "id": "QUERY-Y2-22",
    "questionId": "Y2-22",
    "title": "Corroborate preserved coordination",
    "tableName": "CoordinationMessages",
    "objective": "Find relevant messages, then test their claims against independent actions and provenance.",
    "starterQuery": "CoordinationMessages\n| where reference_ids contains \"REPLACE_ME\"\n| order by timestamp asc",
    "steps": [
      "Replace the placeholder with a relevant document, event or ticket ID.",
      "Inspect the exact sender, recipient, time and message body.",
      "Compare a direction with a later application/support/transfer record rather than treating a message as self-proving.",
      "Read the independent retention and account-assignment notes before writing an attribution claim."
    ],
    "hints": [
      "contains is suitable for an ID fragment in the reference list; == would require the whole list to match.",
      "An account mapping and a public association are not enough on their own."
    ]
  },
  {
    "id": "QUERY-Y2-23",
    "questionId": "Y2-23",
    "title": "Separate measured impact from wider claims",
    "tableName": "FileTransfers",
    "objective": "Optionally summarize confirmed transfer scope, then use content and authorization sources to assess impact.",
    "starterQuery": "FileTransfers\n| where status == \"REPLACE_ME\"\n| project transfer_id, destination_device_id, file_sha256, bytes",
    "steps": [
      "Optional retrieval: filter completed transfers and identify their destinations.",
      "Use summarize count() by destination_device_id to inspect completed transfer-row totals, not unique people.",
      "Use the file manifest and restricted-content approval to explain confidentiality; use document versions for integrity.",
      "State what the collection does not establish about availability or other staff's knowledge."
    ],
    "hints": [
      "A larger row count does not settle intent.",
      "Use the source notes and targeted-collection boundaries when considering people absent from a result."
    ]
  }
];
