/* Fictional people and employers. Universities are real; affiliations are invented. */
const WORLD = {
  "people": {
    "dana": {
      "name": "Dana Selvin",
      "image": "dana-work",
      "headline": "Project coordinator · turning good intentions into actual deadlines",
      "bio": "I translate creative chaos into plans people can follow. Community projects, clear handoffs, and enough room in the schedule for real life. My most-used tool is a well-timed question.",
      "company": "cedar",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "University of Kentucky",
          "degree": "BA, Communication",
          "years": "2002–2006"
        }
      ],
      "skills": [
        "Project coordination",
        "Stakeholder communication",
        "Event logistics",
        "Budget tracking"
      ],
      "history": [
        {
          "company": "cedar",
          "role": "Project coordinator",
          "years": "2021–present",
          "detail": "Coordinates community campaigns and client handoffs. Current focus: a guest-wayfinding pilot."
        },
        {
          "company": "good-enough",
          "role": "Client operations associate",
          "years": "2014–2021",
          "detail": "Built onboarding checklists and learned that “final_v7” is not a filing system."
        }
      ],
      "connections": [
        "lena",
        "sam",
        "morgan",
        "dev",
        "kai"
      ],
      "posts": [
        {
          "id": "dana-1",
          "date": "25 Oct 2026",
          "text": "Weekend fundraiser complete. Found blue icing on my clipboard after we packed the last table. The volunteer who lent us the folding trolley has my lasting gratitude. Monday is for receipts, then back to the Juniper handoff plan.",
          "image": "dana-fundraiser",
          "comments": [
            [
              "dev",
              "Your check-in line moved faster than my badge printer."
            ],
            [
              "tessa",
              "Those outdoor signs held up well!"
            ]
          ],
          "imageAlt": "Dana wiping a clipboard while two volunteers pack up the fundraiser."
        },
        {
          "id": "dana-2",
          "date": "8 Oct 2026",
          "text": "I am interested in operations roles that combine community partnerships with creative delivery. Not looking to move away from Lexington; curious about part-time mentoring and hybrid project leadership.",
          "image": null,
          "comments": [
            [
              "morgan",
              "Your stakeholder examples would make a strong portfolio case study."
            ],
            [
              "sam",
              "Please keep the checklist templates if you become famous."
            ]
          ]
        },
        {
          "id": "dana-3",
          "date": "14 Sep 2026",
          "text": "Good Enough Tomorrow alumni lunch: three people ordered the same sandwich they always used to order, and I apparently still carry our old handoff checklist. We spent longer remembering the broken office kettle than discussing work. Good onboarding is the part I brought with me.",
          "image": "dana-alumni",
          "comments": [
            [
              "ellis",
              "We could use a checklist workshop at the library."
            ],
            [
              "morgan",
              "That kettle had an unofficial onboarding document of its own."
            ]
          ],
          "imageAlt": "Dana sharing lunch and an old notebook with former colleagues."
        }
      ],
      "activity": [
        [
          "open",
          "A small group with a specific question beats a ballroom full of vague introductions."
        ],
        [
          "next",
          "Please put the working hours and location in the first conversation. Families plan around those details."
        ]
      ]
    },
    "lena": {
      "name": "Lena Ortiz",
      "image": "lena-print",
      "headline": "Brand & print designer · making the small details earn their space",
      "bio": "Type nerd. Printmaker. Enthusiastic reader of the tiny text everyone else skips. I build identities that work on a sign, a screen, and a receipt that has been through the wash.",
      "company": "cedar",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "University of Louisville",
          "degree": "BFA, Graphic Design",
          "years": "2006–2010"
        }
      ],
      "skills": [
        "Brand identity",
        "Print production",
        "Typography",
        "Workshop facilitation"
      ],
      "history": [
        {
          "company": "cedar",
          "role": "Brand & print designer",
          "years": "2020–present",
          "detail": "Owns visual systems and print handoffs for community and hospitality clients."
        },
        {
          "company": "press",
          "role": "Production designer",
          "years": "2010–2020",
          "detail": "Ten years of proofs, paper samples, and politely explaining why a screenshot is not a print file."
        }
      ],
      "connections": [
        "dana",
        "sam",
        "tessa",
        "dev",
        "morgan"
      ],
      "posts": [
        {
          "id": "lena-1",
          "date": "21 Oct 2026",
          "text": "A second pair of eyes on the Juniper proofs before they leave the table. We agreed on the paper immediately and debated the smallest border for twenty minutes. Next up: the arts-center printmaking workshop. I would like the next career chapter to include more teaching alongside the design work.",
          "image": "lena-proof-review",
          "comments": [
            [
              "tessa",
              "I can bring uncoated samples to the workshop."
            ],
            [
              "dana",
              "The review dates are on the shared calendar."
            ],
            [
              "sam",
              "The smallest border always gets the longest meeting."
            ]
          ],
          "imageAlt": "Two designers comparing paper proofs on a studio table."
        },
        {
          "id": "lena-2",
          "date": "18 Sep 2026",
          "text": "Ten years married to Alex today. Still choosing the restaurant by the quality of the menu typography. Tessa dug up our old stationery, which is both lovely and evidence that I used too many flourishes.",
          "image": "lena-anniversary",
          "comments": [
            [
              "tessa",
              "The date stamp on the job ticket settled our argument! It is in Paper Stories."
            ],
            [
              "sam",
              "Happy anniversary!"
            ]
          ],
          "imageAlt": "Lena and Alex at a restaurant table with menus and a shared dessert."
        },
        {
          "id": "lena-3",
          "date": "3 Aug 2026",
          "text": "Mochi has promoted himself to studio supervisor. Excellent at sitting on proofs; less interested in the invoicing. Alex says the dog should get his own business cards.",
          "image": "lena-mochi",
          "comments": [
            [
              "dev",
              "Put him on the next speaker list."
            ],
            [
              "lena",
              "He would demand payment in biscuits."
            ],
            [
              "tessa",
              "He has picked the most expensive stock again."
            ]
          ],
          "imageAlt": "Lena coaxing a small cream terrier away from a pile of paper proofs."
        },
        {
          "id": "lena-4",
          "date": "7 May 2026",
          "text": "Found the program from my 2023 Open Chair talk while clearing the sample drawers. The section about accessible print is still useful. The haircut is a historical document.",
          "image": null,
          "comments": [
            [
              "ellis",
              "Our workshop volunteers still use your large-type checklist."
            ]
          ]
        }
      ],
      "activity": [
        [
          "press",
          "Please save two of the textured stocks for my November workshop. The students always ask what happens before the ink."
        ],
        [
          "next",
          "Interested in education partnerships where the designer gets to teach, rather than simply provide the slide template."
        ]
      ]
    },
    "sam": {
      "name": "Sam Reed",
      "image": "sam-garden",
      "headline": "Digital designer · accessible interfaces, optimistic tomatoes",
      "bio": "I make websites easier to use and harder to get lost in. Accessibility, plain language, and prototypes that answer a question. Off-screen: a community garden that ignores all my sprint plans.",
      "company": "cedar",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "Northern Kentucky University",
          "degree": "BS, Media Informatics",
          "years": "2013–2017"
        },
        {
          "school": "University of Illinois Urbana-Champaign",
          "degree": "MS, Information Management",
          "years": "2018–2020"
        }
      ],
      "skills": [
        "Accessibility",
        "UX research",
        "Prototyping",
        "Content design"
      ],
      "history": [
        {
          "company": "cedar",
          "role": "Digital designer",
          "years": "2022–present",
          "detail": "Designs accessible web experiences and the digital companion to the Juniper pilot."
        },
        {
          "company": "good-enough",
          "role": "Service design associate",
          "years": "2020–2022",
          "detail": "Translated internal processes into interfaces that did not require a training novel."
        }
      ],
      "connections": [
        "dana",
        "lena",
        "dev",
        "morgan",
        "ellis"
      ],
      "posts": [
        {
          "id": "sam-1",
          "date": "24 Oct 2026",
          "text": "Saturday at the garden: the last tomatoes and a wheelbarrow that strongly prefers turning left. Ruth got more out of one raised bed than I did out of three. Asking the person who has done it before remains an underrated technique.",
          "image": "sam-garden-workday",
          "comments": [
            [
              "lena",
              "The plants have better naming conventions than our file server."
            ]
          ],
          "imageAlt": "Sam comparing the last tomatoes with another community gardener."
        },
        {
          "id": "sam-2",
          "date": "12 Oct 2026",
          "text": "First rehearsal for the November Open Chair lightning talk on accessible forms. Seven minutes sounds generous until someone starts a stopwatch. One example still needs simplifying. I am also interested in paid reviews of small organizations’ onboarding flows, especially when actual users are part of the conversation.",
          "image": "sam-rehearsal",
          "comments": [
            [
              "dev",
              "I have you down for seven minutes, not seventy."
            ],
            [
              "morgan",
              "That is a useful niche. Happy to talk portfolio structure."
            ],
            [
              "dev",
              "Six minutes forty on the second run. The example with the address form earned its place."
            ]
          ],
          "imageAlt": "Sam rehearsing a presentation while another organizer listens from the front row."
        },
        {
          "id": "sam-3",
          "date": "4 Sep 2026",
          "text": "My old information-management classmates are comparing research notes again. I miss the studio critiques; I do not miss pretending an all-nighter was a methodology.",
          "image": null,
          "comments": [
            [
              "ellis",
              "Our library signup form volunteers would love your checklist."
            ]
          ]
        }
      ],
      "activity": [
        [
          "juniper",
          "I tested the mobile directions using one hand and a very uncooperative coffee. Useful constraints."
        ],
        [
          "open",
          "Can we reserve the quiet room for people who need a break between sessions?"
        ]
      ]
    },
    "morgan": {
      "name": "Morgan Vale",
      "image": "morgan-vale",
      "headline": "Creative recruiter · translating potential into a useful introduction",
      "bio": "I help small teams hire clearly and help candidates tell a specific story. Less “rock star,” more “here is the work.” Collector of excellent questions and spectacularly ordinary coffee mugs.",
      "company": "next",
      "location": "Cincinnati, OH",
      "education": [
        {
          "school": "University of Cincinnati",
          "degree": "BA, Organizational Leadership",
          "years": "2007–2011"
        }
      ],
      "skills": [
        "Recruitment",
        "Portfolio coaching",
        "Interview design",
        "Role scoping"
      ],
      "history": [
        {
          "company": "next",
          "role": "Senior talent partner",
          "years": "2021–present",
          "detail": "Creative and community-sector recruitment across Kentucky and southern Ohio."
        },
        {
          "company": "good-enough",
          "role": "People operations coordinator",
          "years": "2015–2021",
          "detail": "Rewrote role descriptions that had accidentally become wish lists."
        }
      ],
      "connections": [
        "dana",
        "lena",
        "sam",
        "dev",
        "tessa"
      ],
      "posts": [
        {
          "id": "morgan-1",
          "date": "23 Oct 2026",
          "text": "A practice round before the November portfolio roundtable. One project, one decision, one result. The most useful moment was someone asking what had changed after the first version. Nobody needed to claim they had single-handedly transformed the universe.",
          "image": "morgan-roundtable",
          "comments": [
            [
              "dana",
              "Would a volunteer logistics project work?"
            ],
            [
              "morgan",
              "Absolutely. Explain the decisions, not just the size."
            ]
          ],
          "imageAlt": "Morgan discussing a portfolio around a table with three participants."
        },
        {
          "id": "morgan-2",
          "date": "6 Oct 2026",
          "text": "Went to the market for one replacement mug. Came home with two and a very persuasive story about a chipped teapot. Apparently “why this one?” works at a stall as well as in an interview. A good introduction still needs why this person, why this role, and why now. A recognizable company name is context, not verification.",
          "image": "morgan-mugs",
          "comments": [
            [
              "ellis",
              "That distinction belongs in our digital-literacy workshop."
            ],
            [
              "sam",
              "The pale one looks exactly like the mug we keep losing at the studio."
            ],
            [
              "morgan",
              "Mine has a small chip under the handle. I am calling it provenance."
            ]
          ],
          "imageAlt": "Morgan comparing two secondhand mugs at a weekend market."
        },
        {
          "id": "morgan-3",
          "date": "20 Aug 2026",
          "text": "I am building a list of guest reviewers for winter portfolio sessions. Designers who enjoy teaching: tell us about a workshop you have led, not a follower count.",
          "image": null,
          "comments": [
            [
              "lena",
              "This is exactly the kind of partnership I have been looking for."
            ]
          ]
        }
      ],
      "activity": [
        [
          "open",
          "The best conversation last month started with “what part of your job is nobody asking about?”"
        ],
        [
          "press",
          "Production experience deserves more space in creative portfolios."
        ]
      ]
    },
    "tessa": {
      "name": "Tessa Brooks",
      "image": "tessa-brooks",
      "headline": "Print production lead · professional defender of the proof",
      "bio": "I turn impossible files into possible print. Twenty questions before a run beats twenty thousand apologies afterward. Ask me about paper, local exhibitions, or why the tiny type matters.",
      "company": "press",
      "location": "Covington, KY",
      "education": [
        {
          "school": "Indiana University Bloomington",
          "degree": "BA, Studio Art",
          "years": "2001–2005"
        }
      ],
      "skills": [
        "Color management",
        "Print estimating",
        "Vendor coordination",
        "Quality assurance"
      ],
      "history": [
        {
          "company": "press",
          "role": "Production lead",
          "years": "2018–present",
          "detail": "Leads print planning, museum graphics, and materials workshops."
        },
        {
          "company": "press",
          "role": "Prepress specialist",
          "years": "2005–2018",
          "detail": "Learned every way a file can arrive missing its fonts."
        }
      ],
      "connections": [
        "lena",
        "dana",
        "morgan",
        "dev",
        "corey"
      ],
      "posts": [
        {
          "id": "tessa-1",
          "date": "20 Oct 2026",
          "text": "The traveling paper-sample library has reached the stage where every surface contains a small labeled pile. Two boxes, twelve textures, and one lid that no longer closes. Looking for community venues for a November materials clinic. We bring the samples; you supply curious people.",
          "image": "tessa-sample-kits",
          "comments": [
            [
              "ellis",
              "Our meeting room has tables and a very curious volunteer team."
            ],
            [
              "lena",
              "Count me in for a session."
            ]
          ],
          "imageAlt": "Tessa assembling boxes of paper samples for a traveling materials clinic."
        },
        {
          "id": "tessa-2",
          "date": "18 Sep 2026",
          "text": "A familiar job resurfaced in our archive: Lena and Alex’s invitations. We put the story in the company’s Paper Stories collection. A nice reminder that printed things outlast a download folder.",
          "image": null,
          "comments": [
            [
              "lena",
              "Thank you for saving a copy!"
            ]
          ]
        },
        {
          "id": "tessa-3",
          "date": "2 Jul 2026",
          "text": "Ten-minute production briefing this morning: one proof, one decision, and nobody asked for the forty-slide version. Used the rescued time to catch the small-print exhibition after work. One of these pieces was made with a kitchen spoon instead of a press. I have questions.",
          "image": "tessa-gallery",
          "comments": [
            [
              "dana",
              "I would attend this workshop on principle."
            ],
            [
              "lena",
              "Please tell me you asked about the paper too."
            ],
            [
              "tessa",
              "Naturally. It was a very thorough conversation."
            ]
          ],
          "imageAlt": "Tessa talking with a visitor at an exhibition of small prints."
        }
      ],
      "activity": [
        [
          "library",
          "Hands-on demonstrations would be a great fit for the winter learning series."
        ],
        [
          "spoke",
          "The repair checklist labels are holding up. Next time we should try a washable stock."
        ]
      ]
    },
    "dev": {
      "name": "Dev Malik",
      "image": "dev-malik",
      "headline": "Community producer · a useful conversation is an event outcome",
      "bio": "I make small events where people leave with a name, an idea, and their own coat. Speaker programs, accessible spaces, and partnerships that survive after the last biscuit.",
      "company": "open",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "University of Tennessee, Knoxville",
          "degree": "BS, Communication",
          "years": "2011–2015"
        }
      ],
      "skills": [
        "Event production",
        "Partnerships",
        "Speaker coaching",
        "Accessible events"
      ],
      "history": [
        {
          "company": "open",
          "role": "Program producer",
          "years": "2022–present",
          "detail": "Runs the regional creative roundtable and community speaker series."
        },
        {
          "company": "juniper",
          "role": "Guest events coordinator",
          "years": "2015–2022",
          "detail": "Learned to plan around weather, stairs, and unexpected banjo requests."
        }
      ],
      "connections": [
        "sam",
        "lena",
        "dana",
        "morgan",
        "ellis",
        "kai"
      ],
      "posts": [
        {
          "id": "dev-1",
          "date": "25 Oct 2026",
          "text": "Room-layout trial for the November lightning talks. The chairs fit, the aisle stays clear, and the microphone cable finally reaches without crossing a doorway. The program is coming together: accessible forms, portfolios, and production mistakes. Still looking for a facilitator for the small-group discussion.",
          "image": "dev-event-setup",
          "comments": [
            [
              "sam",
              "Seven minutes. I have heard the warning."
            ],
            [
              "morgan",
              "Happy to help with the portfolio group."
            ]
          ],
          "imageAlt": "Dev arranging chairs and a clear aisle before a community event."
        },
        {
          "id": "dev-2",
          "date": "9 Oct 2026",
          "text": "The old speaker-program archive is back in order. Our 2023 Design for Real People session still gets requests from workshop organizers.",
          "image": null,
          "comments": [
            [
              "lena",
              "That was my first talk without a podium to hide behind."
            ]
          ]
        },
        {
          "id": "dev-3",
          "date": "11 Sep 2026",
          "text": "Testing biscuits for the quiet introduction table next month. Batch one spread into a single large biscuit; batch two can be served without a structural engineer. I want the table to make it easier to start a conversation without shouting across a room. A better question at the end is still my favorite event metric.",
          "image": "dev-biscuit-test",
          "comments": [
            [
              "kai",
              "This would work well for new volunteer coaches."
            ],
            [
              "ellis",
              "Happy to help with the trial. I can bring a kettle that works."
            ],
            [
              "morgan",
              "I can apparently supply more mugs than anyone needs."
            ]
          ],
          "imageAlt": "Dev testing a batch of homemade biscuits at a kitchen counter."
        }
      ],
      "activity": [
        [
          "next",
          "Could we pair first-time portfolio presenters with reviewers before the event?"
        ],
        [
          "juniper",
          "Please keep the large-print route cards. They helped more guests than we expected."
        ]
      ]
    },
    "ellis": {
      "name": "Ellis Park",
      "image": "ellis-library",
      "headline": "Community librarian · connecting people, not just Wi-Fi",
      "bio": "Local history, useful workshops, and the art of asking one more question. I build learning programs with neighborhood partners. Yes, the printer is asking for paper again.",
      "company": "library",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "University of Kentucky",
          "degree": "MS, Library Science",
          "years": "2008–2010"
        }
      ],
      "skills": [
        "Community programming",
        "Research",
        "Digital literacy",
        "Partnership building"
      ],
      "history": [
        {
          "company": "library",
          "role": "Community programs librarian",
          "years": "2016–present",
          "detail": "Coordinates local history, practical workshops, and volunteer learning."
        },
        {
          "company": "open",
          "role": "Volunteer program adviser",
          "years": "2023–present",
          "detail": "Helps speakers adapt technical topics for general audiences."
        }
      ],
      "connections": [
        "corey",
        "tessa",
        "sam",
        "dev",
        "kai"
      ],
      "posts": [
        {
          "id": "ellis-1",
          "date": "22 Oct 2026",
          "text": "Sunday history walk: the old photograph settled one argument about the station windows and started another about the steps. We stopped twice because someone remembered a story I had never heard. Monday is for winter-workshop planning and finding people who can explain a practical skill without assuming everyone knows the vocabulary.",
          "image": "ellis-history-walk",
          "comments": [
            [
              "corey",
              "Bike maintenance is available. The bell may need its own session."
            ]
          ],
          "imageAlt": "Ellis comparing an old photograph with a brick building during a history walk."
        },
        {
          "id": "ellis-2",
          "date": "13 Oct 2026",
          "text": "Our next digital-literacy session will compare a polished message with a trustworthy message. They are not the same thing.",
          "image": null,
          "comments": [
            [
              "morgan",
              "Please include recruitment examples."
            ]
          ]
        },
        {
          "id": "ellis-3",
          "date": "8 Sep 2026",
          "text": "The station photographs are finally in sleeves. Two dates remain uncertain, so they are penciled into the notes as questions rather than facts. The boxes are less romantic than the pictures, but a sensible naming scheme is an act of kindness to the next researcher. Open to short-term archive partnerships.",
          "image": "ellis-archive",
          "comments": [
            [
              "dev",
              "That would make a good lightning talk."
            ]
          ],
          "imageAlt": "Ellis sorting railway photographs into sleeves at the archive worktable."
        }
      ],
      "activity": [
        [
          "press",
          "We can host a materials clinic on a weekday afternoon; our volunteer team learns by doing."
        ],
        [
          "spoke",
          "The library bike is officially quieter than the printer. Thank you."
        ]
      ]
    },
    "corey": {
      "name": "Corey Selvin",
      "image": "corey-shop",
      "headline": "Bicycle mechanic · making the daily ride dependable",
      "bio": "I fix bikes and explain the fix. Everyday transport deserves the same care as a weekend race machine. Building more neighborhood repair workshops, one stubborn bell at a time.",
      "company": "spoke",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "Eastern Kentucky University",
          "degree": "BS, Applied Engineering Management",
          "years": "2008–2012"
        }
      ],
      "skills": [
        "Repair education",
        "Workshop planning",
        "Customer service",
        "Mechanical troubleshooting"
      ],
      "history": [
        {
          "company": "spoke",
          "role": "Workshop manager",
          "years": "2019–present",
          "detail": "Repairs everyday bicycles and coordinates practical community sessions."
        },
        {
          "company": "juniper",
          "role": "Facilities technician",
          "years": "2013–2019",
          "detail": "Kept guest bikes, door closers, and impossible maintenance calendars moving."
        }
      ],
      "connections": [
        "ellis",
        "tessa",
        "dev",
        "kai"
      ],
      "posts": [
        {
          "id": "corey-1",
          "date": "24 Oct 2026",
          "text": "The library bike rolls again. Two brake adjustments, one inner tube, and a bell that required diplomacy. The basket stayed: its owner was very firm on that point. A five-minute test ride told us more than another half hour staring at the repair stand.",
          "image": "corey-bench-repair",
          "comments": [
            [
              "ellis",
              "Our volunteers are very grateful."
            ]
          ],
          "imageAlt": "Corey adjusting the front brake on a green city bicycle."
        },
        {
          "id": "corey-2",
          "date": "14 Oct 2026",
          "text": "A small practice session at the library before we plan the winter maintenance workshops. Finding the hole in a tube is easier when everybody can hear the bucket rather than the traffic outside. Interested in a community-education partnership that reaches people who do not think of themselves as cyclists.",
          "image": "corey-library-clinic",
          "comments": [
            [
              "dev",
              "A short demonstration at Open Chair could help find partners."
            ],
            [
              "ellis",
              "Next time we will cover the local-history table before the bucket arrives."
            ],
            [
              "corey",
              "Agreed. The books were an excellent audience, though."
            ]
          ],
          "imageAlt": "Corey demonstrating an inner-tube patch while three workshop attendees watch."
        },
        {
          "id": "corey-3",
          "date": "1 Sep 2026",
          "text": "Facilities work taught me that the person describing the problem has useful information even when they do not know the technical word. Still true at the repair stand.",
          "image": null,
          "comments": [
            [
              "dana",
              "This applies to project briefs too."
            ]
          ]
        }
      ],
      "activity": [
        [
          "library",
          "We can bring two demonstration bikes and keep the jargon to a minimum."
        ],
        [
          "press",
          "Readable labels made the beginner workshop much easier to follow."
        ]
      ]
    },
    "kai": {
      "name": "Kai Morgan",
      "image": "coach-kai",
      "headline": "Science educator & coach · small experiments, strong teams",
      "bio": "I teach students to test an idea and teammates to trust a pass. Practical science, youth coaching, and volunteer development. My whistle has never improved a spreadsheet.",
      "company": "riverdale",
      "location": "Lexington, KY",
      "education": [
        {
          "school": "Western Kentucky University",
          "degree": "BS, Science Education",
          "years": "2005–2009"
        }
      ],
      "skills": [
        "Science education",
        "Youth coaching",
        "Volunteer training",
        "Workshop facilitation"
      ],
      "history": [
        {
          "company": "riverdale",
          "role": "Science educator & youth coach",
          "years": "2014–present",
          "detail": "Connects practical classroom learning with community sport."
        },
        {
          "company": "library",
          "role": "Guest workshop facilitator",
          "years": "2020–present",
          "detail": "Occasional hands-on science activities for family learning days."
        }
      ],
      "connections": [
        "dana",
        "ellis",
        "dev",
        "corey"
      ],
      "posts": [
        {
          "id": "kai-1",
          "date": "24 Oct 2026",
          "text": "Before kickoff: cones, roles, and one quick demonstration. The Thunder volunteers made the morning work because everyone knew who to ask. The quiet preparation rarely makes the photos, so this one is for that part of the day.",
          "image": "kai-volunteer-briefing",
          "comments": [
            [
              "dana",
              "Thanks for making time for the new helpers."
            ]
          ],
          "imageAlt": "Kai demonstrating a field setup to two volunteers before practice."
        },
        {
          "id": "kai-2",
          "date": "7 Oct 2026",
          "text": "Trying the bicycle-wheel demonstration before inviting a room full of questions. The first version mostly demonstrated why you should tighten the stand. Looking for a winter guest session on science in everyday repairs. Students ask better questions when they can hold the object.",
          "image": "kai-science-demo",
          "comments": [
            [
              "corey",
              "Bicycle gears make a good demonstration."
            ],
            [
              "corey",
              "I can bring a wheel that is already retired from road duty."
            ],
            [
              "kai",
              "That would save the wheel from my own bike another trip to school."
            ]
          ],
          "imageAlt": "Kai testing a bicycle-wheel and pulley demonstration in a classroom."
        },
        {
          "id": "kai-3",
          "date": "15 Sep 2026",
          "text": "Trying a new volunteer induction format: one demonstration, one practice, one question. A long document is not the same as a useful first day.",
          "image": null,
          "comments": [
            [
              "dev",
              "Would you share that at a roundtable?"
            ]
          ]
        }
      ],
      "activity": [
        [
          "open",
          "I would happily join a discussion about training volunteers without drowning them in paperwork."
        ],
        [
          "library",
          "The family science afternoon was a highlight. Let us plan another one."
        ]
      ]
    }
  },
  "companies": {
    "cedar": {
      "name": "Cedar & Finch",
      "tag": "Design with a pulse. Meetings with an end time.",
      "sector": "Design services",
      "location": "Lexington, KY",
      "size": "11–50",
      "image": "company-cedar",
      "about": "An independent studio making identities, printed spaces, and websites for organizations with actual humans in them. We ask why before choosing a font. Sometimes twice.",
      "specialties": [
        "Brand systems",
        "Community campaigns",
        "Accessible websites"
      ],
      "updates": [
        {
          "id": "cedar-sign-table",
          "date": "26 Oct 2026",
          "title": "Follow the arrows",
          "text": "Today’s Juniper sign review moved off the screen and onto the floor. Three visitors tried to find reception without coaching. One arrow has been demoted. The studio is also comparing notes with Bluegrass Current on making customer notices easier to read.",
          "image": "org-cedar-sign-review",
          "imageAlt": "Dana and colleagues testing freestanding sign prototypes in the studio.",
          "comments": [
            [
              "robin-hale",
              "Trying it with a suitcase was revealing. You read a room differently when both hands are full."
            ],
            [
              "dana",
              "Nobody gets to explain the sign while the person is trying to use it."
            ]
          ]
        },
        {
          "id": "cedar-archive-1",
          "date": "24 Oct 2026",
          "text": "Community Cup signs survived the wind. A small victory for teamwork and a large victory for gaffer tape.",
          "comments": []
        },
        {
          "id": "cedar-archive-2",
          "date": "15 Oct 2026",
          "text": "The Juniper wayfinding pilot moves to review in November. Dana is coordinating the handoff; Lena owns print proofs and Sam is checking the digital companion.",
          "comments": []
        }
      ],
      "links": [
        [
          "Studio website",
          "../osint/#/work"
        ],
        [
          "Meet the designers",
          "../osint/#/article/designers"
        ]
      ],
      "docs": [
        "speaker-notes"
      ],
      "imageAlt": "A shared design studio with paper mockups, sample shelves, and a wall of prints.",
      "partners": [
        "juniper",
        "press",
        "current"
      ]
    },
    "good-enough": {
      "name": "Good Enough Tomorrow",
      "tag": "Strategy today. A slightly better spreadsheet tomorrow.",
      "sector": "Operations consultancy",
      "location": "Louisville, KY",
      "size": "11–50",
      "image": "org-good-enough-office",
      "about": "We turn “someone should really organize that” into a labeled folder, a sensible schedule, and a meeting that could finally have been an email.",
      "specialties": [
        "Project operations",
        "Client onboarding",
        "Change management"
      ],
      "updates": [
        {
          "id": "good-enough-process-table",
          "date": "26 Oct 2026",
          "title": "The sticky note that moved six times",
          "text": "Our Louisville onboarding workshop ended with fewer steps than it started with. Priya Desai from our operations team kept asking who actually needed each handoff. Next month’s alumni office hours will include RiverSpan Fiber and Frankfort’s Capitol Commons Forum. Somebody has promised better biscuits.",
          "image": "org-good-enough-workshop",
          "imageAlt": "Workshop participants rearranging a process map made from sticky notes.",
          "comments": [
            [
              "wes-booker",
              "The duplicate checklist exercise felt uncomfortably familiar. Keeping the version with fewer boxes."
            ],
            [
              "priya-desai",
              "Our test is whether somebody can follow it when the person who wrote it is on leave."
            ]
          ]
        },
        {
          "id": "good-enough-archive-1",
          "date": "19 Oct 2026",
          "text": "Our onboarding workshop is full. Alumni office hours return in November.",
          "comments": []
        },
        {
          "id": "good-enough-archive-2",
          "date": "6 Oct 2026",
          "text": "A process diagram is not improved by adding seventeen arrows. We tested this so you do not have to.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [],
      "imageAlt": "Shared worktables and a busy planning wall at the Louisville office.",
      "partners": [
        "riverspan",
        "next"
      ]
    },
    "press": {
      "name": "Pressing Matters",
      "tag": "We have strong opinions about paper. Please ask.",
      "sector": "Print & production",
      "location": "Covington, KY",
      "size": "11–50",
      "image": "company-pressroom",
      "about": "A regional print partner for museums, studios, and the occasional wedding with eighteen rounds of revisions. We translate beautiful files into things you can hold.",
      "specialties": [
        "Short-run print",
        "Exhibition graphics",
        "Color matching"
      ],
      "updates": [
        {
          "id": "press-map-folding",
          "date": "24 Oct 2026",
          "title": "Fold, count, start again",
          "text": "The last neighborhood walking maps are folded, counted, and ready for collection. We kept one misfold for the workshop table: paper is an excellent teacher with no interest in your deadline. A small Ashland visitor-guide enquiry from Laurel Bend Health is on the November planning board.",
          "image": "org-press-map-order",
          "imageAlt": "Folded neighborhood walking maps, paper samples, and packed orders on the print shop’s finishing bench.",
          "comments": [
            [
              "inez-foster",
              "The larger map folds down to fit the display rack. A tiny logistical triumph for our exhibition."
            ],
            [
              "tessa",
              "The misfold now has its own protective sleeve."
            ]
          ]
        },
        {
          "id": "press-archive-1",
          "date": "20 Oct 2026",
          "text": "Tessa is gathering samples for the November materials clinic. Recycled stocks, honest pricing, and absolutely no glitter near the rollers.",
          "comments": []
        },
        {
          "id": "press-archive-2",
          "date": "18 Sep 2026",
          "text": "Ten years since our studio printed Lena and Alex’s wedding stationery. We found the job ticket while organizing our sample archive.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [
        "paper-stories"
      ],
      "imageAlt": "Paper proofs and a printing press inside the workshop."
    },
    "juniper": {
      "name": "Juniper House",
      "tag": "Stay curious. Leave the tiny shampoo collection.",
      "sector": "Hospitality",
      "location": "Lexington, KY",
      "size": "51–200",
      "image": "company-juniper",
      "about": "A small collection of independently minded guest houses and cafés. Our guests should be able to find breakfast without a compass or an advanced degree in corridor studies.",
      "specialties": [
        "Guest experience",
        "Community events",
        "Wayfinding"
      ],
      "updates": [
        {
          "id": "juniper-noticeboard-afternoon",
          "date": "25 Oct 2026",
          "title": "A noticeboard with opinions",
          "text": "The poetry flyers have negotiated a truce with the garden club. Our front-desk team made room for both, plus a weekend walking group from Louisville. Cedar & Finch’s new visitor signs are next; first we must solve the smaller mystery of where the pins go.",
          "image": "org-juniper-noticeboard",
          "imageAlt": "Cafe staff and guests making room on the community noticeboard.",
          "comments": [
            [
              "robin-hale",
              "The walking group found the breakfast room on the first attempt. Keeping that success in the notes."
            ],
            [
              "corey",
              "I found two pins in the bicycle basket. Returning them next coffee stop."
            ]
          ]
        },
        {
          "id": "juniper-archive-1",
          "date": "22 Oct 2026",
          "text": "Cedar & Finch’s navigation pilot will be reviewed by our guest-experience team next month. Volunteers tested the first signs with impressive honesty.",
          "comments": []
        },
        {
          "id": "juniper-archive-2",
          "date": "9 Oct 2026",
          "text": "Our café noticeboard has run out of pins again. Demand for local poetry is exceeding infrastructure.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [],
      "imageAlt": "The guesthouse cafe and lobby, with tables and a corridor beyond."
    },
    "next": {
      "name": "Next Chapter People",
      "tag": "Careers are not straight lines. Neither are our office plants.",
      "sector": "Recruitment & career development",
      "location": "Cincinnati, OH",
      "size": "11–50",
      "image": "company-recruiting",
      "about": "We work with small creative and community organizations on clear job descriptions, practical portfolios, and interviews with fewer mysterious acronyms. Introductions are a beginning, not an endorsement.",
      "specialties": [
        "Creative recruitment",
        "Portfolio reviews",
        "Career coaching"
      ],
      "updates": [
        {
          "id": "next-practice-room",
          "date": "24 Oct 2026",
          "title": "A rehearsal counts as experience",
          "text": "Our practice interview room was full of career changers today. Reviewers stopped twice to turn vague achievements into specific stories. One participant brought a beautifully organized folder and forgot their own lunch. Winter reviewer conversations now include Louisville operations teams and an Ashland healthcare-learning group.",
          "image": "org-next-career-room",
          "imageAlt": "Career changers comparing project portfolios with a reviewer during a practice interview session.",
          "comments": [
            [
              "wes-booker",
              "I used a warehouse handover as my project example. It turns out I had a story before I had a portfolio."
            ],
            [
              "morgan",
              "Explaining the decision is more useful than apologizing for your previous job title."
            ]
          ]
        },
        {
          "id": "next-archive-1",
          "date": "23 Oct 2026",
          "text": "Morgan’s portfolio roundtable returns in November. Bring one project you can explain without saying “synergy.”",
          "comments": []
        },
        {
          "id": "next-archive-2",
          "date": "2 Oct 2026",
          "text": "Candidate note: we publish role details before inviting a conversation. Vague excitement is not a job description.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [],
      "imageAlt": "A small recruiting office with conversation chairs and a meeting room."
    },
    "open": {
      "name": "Open Chair Collective",
      "tag": "Networking for people who would rather sit down.",
      "sector": "Community events",
      "location": "Lexington, KY",
      "size": "2–10",
      "image": "company-eventspace",
      "about": "Small gatherings for designers, educators, makers, and people whose job titles do not fit on badges. We value useful conversations over business-card endurance sports.",
      "specialties": [
        "Small events",
        "Speaker programs",
        "Community partnerships"
      ],
      "updates": [
        {
          "id": "open-autumn-evening",
          "date": "26 Oct 2026",
          "title": "The useful conversation happened by the coats",
          "text": "Our small October gathering ran out of chairs before it ran out of stories. First-time guests settled at the quiet table, and RiverSpan’s outreach team compared workshop notes with local volunteers. Frankfort’s Capitol Commons Forum has asked about borrowing the seated-introduction format. The coat rail is not accepting speaking invitations.",
          "image": "org-open-room-in-use",
          "imageAlt": "Small groups talking around tables in a community event hall, with a quiet table and a crowded coat rail nearby.",
          "comments": [
            [
              "camila-ortiz",
              "Being able to sit down before introducing myself made a difference. I stayed longer than planned."
            ],
            [
              "dev",
              "We found the missing chair holding six coats."
            ]
          ]
        },
        {
          "id": "open-archive-1",
          "date": "25 Oct 2026",
          "text": "Our November session is “Useful work, clearly explained.” Dev is confirming the lightning-talk running order.",
          "comments": []
        },
        {
          "id": "open-archive-2",
          "date": "10 Oct 2026",
          "text": "The name-badge printer is working. This is not a drill.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [
        "speaker-notes",
        "roundtable"
      ],
      "imageAlt": "A community event hall with a circle of chairs and a quiet side table.",
      "partners": [
        "riverspan",
        "press"
      ]
    },
    "library": {
      "name": "Lexington Neighborhood Library",
      "tag": "Quietly running half the neighborhood.",
      "sector": "Community learning",
      "location": "Lexington, KY",
      "size": "11–50",
      "image": "company-library",
      "about": "Books, local history, repair afternoons, and a printer that inspires personal growth. Our fictional neighborhood branch brings people together through practical learning.",
      "specialties": [
        "Local history",
        "Community programs",
        "Digital literacy"
      ],
      "updates": [
        {
          "id": "library-seed-table",
          "date": "25 Oct 2026",
          "title": "A seed library starts with envelopes",
          "text": "The first seed donations are finding a home in our reused catalogue drawers. Neighborhood gardeners supplied planting notes, and half the envelopes began life as something else. Lockside Water’s community team is comparing rain-garden workshop ideas with us. The basil is already attracting more attention than the printer.",
          "image": "org-library-seed-drawers",
          "imageAlt": "Reused catalogue drawers filled with seed envelopes, planting notes, and donations at the library’s swap table.",
          "comments": [
            [
              "camila-ortiz",
              "I came for a book and went home with a packet of beans. Very effective branching out."
            ],
            [
              "ellis",
              "We left blank envelopes for people who bring a story with their seeds."
            ]
          ]
        },
        {
          "id": "library-archive-1",
          "date": "22 Oct 2026",
          "text": "Ellis’s Sunday history walk starts at the library steps. The old station photographs are finally catalogued.",
          "comments": []
        },
        {
          "id": "library-archive-2",
          "date": "17 Oct 2026",
          "text": "Community workshop partners met to plan winter sessions. Bike care, printmaking, and learning to spot questionable messages are on the wish list.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [],
      "imageAlt": "Bookshelves, a workshop table, and a local-history cabinet in the neighborhood library.",
      "partners": [
        "spoke",
        "lockside",
        "current"
      ]
    },
    "spoke": {
      "name": "Spoke & Wrench",
      "tag": "Your brakes should be dramatic only when necessary.",
      "sector": "Bicycle repair",
      "location": "Lexington, KY",
      "size": "2–10",
      "image": "company-bikeshop",
      "about": "Neighborhood repairs, patient explanations, and a healthy suspicion of the phrase “it only makes that noise sometimes.” We keep everyday bikes on the road.",
      "specialties": [
        "Bicycle maintenance",
        "Repair education",
        "Community partnerships"
      ],
      "updates": [
        {
          "id": "spoke-bicycle-home",
          "date": "25 Oct 2026",
          "title": "Back to the everyday journey",
          "text": "A commuter bike went home this morning with quieter brakes and a much happier owner. Corey’s rule: explain the repair before you hand over the handlebars. We are collecting unused panniers for a winter errands workshop. Stylish matching pairs are welcome; mismatched ones also know how to carry groceries.",
          "image": "org-spoke-commuter",
          "imageAlt": "Corey returning a repaired commuter bicycle outside the shop.",
          "comments": [
            [
              "ellis",
              "A library-book-sized bag is the correct unit of measurement."
            ],
            [
              "corey",
              "We tested that with three large mysteries."
            ]
          ]
        },
        {
          "id": "spoke-archive-1",
          "date": "24 Oct 2026",
          "text": "The library bicycle is back in service. Corey defeated the bell. The bell has declined an interview.",
          "comments": []
        },
        {
          "id": "spoke-archive-2",
          "date": "14 Oct 2026",
          "text": "Winter maintenance workshop planning is underway with the neighborhood library.",
          "comments": []
        }
      ],
      "links": [
        [
          "Local coverage",
          "../osint/#/article/news-bikes"
        ]
      ],
      "docs": [],
      "imageAlt": "Repair stands and commuter bicycles inside the neighborhood bike shop."
    },
    "riverdale": {
      "name": "Riverdale Learning & Sport",
      "tag": "Teaching teamwork, including in the equipment cupboard.",
      "sector": "Education & youth sport",
      "location": "Lexington, KY",
      "size": "51–200",
      "image": "org-riverdale-campus",
      "about": "A school-and-community program connecting classroom learning with youth sport. Shared spaces, curious students, and a volunteer team with strong opinions about how to store cones.",
      "specialties": [
        "Science education",
        "Youth coaching",
        "Volunteer coordination"
      ],
      "updates": [
        {
          "id": "riverdale-equipment-sorting",
          "date": "26 Oct 2026",
          "title": "The cupboard has a floor again",
          "text": "The volunteer tidy-up found the missing cones underneath the spare pinnies. A clear floor and a repair station should make the shared kit easier for every club to use. Science-club planning is next: Bluegrass Current is bringing a tabletop demonstration in November. Meanwhile the grounds team has requested that “put it somewhere sensible” become a specific location.",
          "image": "org-riverdale-cupboard",
          "imageAlt": "Sorted soccer balls, cones, pinnies, and repair materials in the school’s shared equipment cupboard.",
          "comments": [
            [
              "dana",
              "We can label the shelves after the fundraiser boxes leave my car."
            ],
            [
              "kai",
              "The floor was here all along. A major discovery."
            ]
          ]
        },
        {
          "id": "riverdale-archive-1",
          "date": "24 Oct 2026",
          "text": "Community Cup weekend: thank you to the coaches, families, volunteers, and very patient grounds team.",
          "comments": []
        },
        {
          "id": "riverdale-winter-clubs",
          "date": "5 Oct 2026",
          "title": "More than a match day",
          "text": "Winter clubs are comparing plans for science, reading, and practical repair sessions. Students suggested an entire afternoon about wheels. Nobody from the bike workshop objected.",
          "comments": [
            [
              "corey",
              "A surprisingly versatile theme."
            ]
          ]
        }
      ],
      "links": [
        [
          "Thunder club",
          "../osint/#/club"
        ]
      ],
      "docs": [],
      "imageAlt": "A walkway between the school building and community playing fields.",
      "partners": [
        "current",
        "spoke"
      ]
    },
    "current": {
      "name": "Bluegrass Current Cooperative",
      "tag": "Keeping the lights on. Remembering where we left the tape.",
      "sector": "Electric cooperative",
      "location": "Lexington & central Kentucky",
      "size": "51–200",
      "about": "A member-owned electric cooperative serving fictional communities around Lexington and Frankfort. Our public team handles member questions, energy education, and the sort of community events that require three extension-cord conversations before anyone makes coffee.",
      "specialties": [
        "Member services",
        "Energy education",
        "Community partnerships"
      ],
      "updates": [
        {
          "id": "current-classroom-model",
          "date": "26 Oct 2026",
          "title": "A small house, a lot of questions",
          "text": "Mara Bell and our education volunteers tried the tabletop house before November’s Riverdale science visit. One miniature lamp refused to cooperate and became the most popular part of the demonstration. The lesson kit is travelling to a Frankfort community room next.",
          "image": "org-current-school-demo",
          "imageAlt": "Utility educators preparing a tabletop electricity demonstration with school volunteers.",
          "comments": [
            [
              "kai",
              "We can supply questions. Possibly too many."
            ],
            [
              "mara-bell",
              "The kit packs into two cases now. One for the house, one apparently for the lamp’s enormous personality."
            ],
            [
              "ellis",
              "Would the kit work for a seated library session?"
            ]
          ]
        },
        {
          "id": "current-frankfort-roundtable",
          "date": "19 Oct 2026",
          "title": "Notes from Frankfort",
          "text": "Colleagues joined Lockside Water and the Capitol Commons Forum for a public-communications roundtable. Nobody agreed on the ideal leaflet size. Everyone agreed the print needs to be readable. We will bring the revised samples to the next community drop-in.",
          "comments": [
            [
              "lena",
              "One version on ordinary paper, please. That is how most people will see it."
            ]
          ]
        },
        {
          "id": "current-member-morning",
          "date": "8 Oct 2026",
          "title": "A less mysterious bill",
          "text": "Our member-services desk tested a shorter explanation of seasonal energy use. The most useful feedback was “start with the question I actually asked.” Mara Bell is gathering comments before the winter community sessions.",
          "comments": []
        }
      ],
      "links": [],
      "docs": [],
      "partners": [
        "riverdale",
        "library"
      ],
      "image": "org-current-depot",
      "imageAlt": "Parked service trucks outside the cooperative office and depot."
    },
    "lockside": {
      "name": "Lockside Water",
      "tag": "Good water. Clear answers. Occasionally muddy boots.",
      "sector": "Water services",
      "location": "Frankfort, KY",
      "size": "51–200",
      "about": "An independent water provider for fictional neighborhoods around Frankfort. We work on reliable service, understandable customer notices, and helping people tell the difference between a useful conservation tip and something their uncle invented.",
      "specialties": [
        "Water services",
        "Conservation education",
        "Customer communications"
      ],
      "updates": [
        {
          "id": "lockside-library-dropin",
          "date": "26 Oct 2026",
          "title": "The drop-in table stayed busy",
          "text": "Nina Cho’s conservation team brought a demonstration gauge, a pitcher, and enough spare cups for people who had only intended to return a book. Our Frankfort library hosts supplied the difficult questions. We are swapping workshop notes with Lexington Neighborhood Library for the winter.",
          "image": "org-lockside-library-table",
          "imageAlt": "Water-conservation educators talking with visitors at a library drop-in table.",
          "comments": [
            [
              "ellis",
              "The pitcher is a better opening than a slide deck."
            ],
            [
              "nina-cho",
              "Several visitors asked for a larger-print take-home sheet. That is next on our list."
            ]
          ]
        },
        {
          "id": "lockside-forum-notes",
          "date": "20 Oct 2026",
          "title": "Public information should survive a photocopier",
          "text": "Capitol Commons Forum hosted a useful conversation about accessible public notices. Bluegrass Current brought sample leaflets; our team brought three different versions of the same opening sentence. Franklin Reach Support Association asked about a future session for service-family volunteers.",
          "comments": []
        },
        {
          "id": "lockside-front-garden",
          "date": "9 Oct 2026",
          "title": "The garden is doing some of the explaining",
          "text": "The demonstration rain garden outside our Frankfort office is settling in. Nina Cho’s team has been keeping a plain-language notebook of what visitors ask. “Does it still work when it looks untidy?” remains a very good question.",
          "comments": [
            [
              "sam",
              "The community garden would like that question on a T-shirt."
            ]
          ]
        }
      ],
      "links": [],
      "docs": [],
      "partners": [
        "library",
        "good-enough"
      ],
      "image": "org-lockside-office",
      "imageAlt": "A public service office with a planted rain garden and outdoor demonstration barrel."
    },
    "riverspan": {
      "name": "RiverSpan Fiber",
      "tag": "Connecting the region. Untangling the meeting-room cables.",
      "sector": "Regional connectivity",
      "location": "Louisville, KY · Ashland community programs",
      "size": "51–200",
      "about": "A regional connectivity company with a Louisville office and community-learning partners in Ashland and Lexington. Our public workshops cover everyday digital confidence. The best support question is the one somebody finally feels comfortable asking.",
      "specialties": [
        "Business connectivity",
        "Digital inclusion",
        "Community workshops"
      ],
      "updates": [
        {
          "id": "riverspan-open-lab",
          "date": "26 Oct 2026",
          "title": "Bring the question you thought was too small",
          "text": "Our Ashland digital-help afternoon covered browser tabs, document folders, and the mystery of where downloaded files go. Rafael Cruz and the volunteers kept spare cables on the table and time between appointments. Open Chair’s quiet-table idea travelled well. Somebody came to ask one question and stayed to help with three.",
          "image": "org-riverspan-open-lab",
          "imageAlt": "Community volunteers helping residents with laptops at an Ashland digital-help session.",
          "comments": [
            [
              "dev",
              "Delighted the quiet table found another home."
            ],
            [
              "rafael-cruz",
              "The most popular appointment was five minutes spent organizing a downloads folder. Useful does not have to be complicated."
            ]
          ]
        },
        {
          "id": "riverspan-ashland-partners",
          "date": "21 Oct 2026",
          "title": "More seats at the planning table",
          "text": "Laurel Bend Health’s community-learning team joined our Ashland partners to discuss winter digital-help sessions. These are still planning conversations: dates and venues will follow. Rafael Cruz is collecting suggestions for topics people can use at home, not another stack of acronyms.",
          "comments": []
        },
        {
          "id": "riverspan-office-swap",
          "date": "7 Oct 2026",
          "title": "One shelf, fewer duplicate boxes",
          "text": "A Louisville office tidy turned up six nearly identical cable boxes and the welcome booklet nobody could find. Good Enough Tomorrow is helping us make onboarding easier. The new shelf labels have already survived a very frank staff review.",
          "comments": [
            [
              "morgan",
              "A useful portfolio case study hiding in plain sight."
            ]
          ]
        }
      ],
      "links": [],
      "docs": [],
      "partners": [
        "open",
        "library",
        "good-enough"
      ],
      "image": "org-riverspan-office",
      "imageAlt": "The regional fiber team office with a service van and workshop supplies."
    }
  },
  "docs": {
    "speaker-notes": {
      "company": "open",
      "title": "Design for Real People · 2023 speaker program",
      "date": "16 May 2023 · Program archive",
      "sections": [
        [
          "An evening of practical ideas",
          "Our panel explored accessible print, clearer forms, and better project handoffs. Thanks to our host partners at Cedar & Finch."
        ],
        [
          "Speaker desk",
          "Lena Ortiz — Brand & print designer, Cedar & Finch. Topic: readable print in everyday spaces. Workshop follow-up: lena.ortiz@cedarfinch.example."
        ],
        [
          "Also on the program",
          "Dev Malik moderated. Ellis Park shared notes on public-library workshop design. The closing discussion covered practical teaching formats for small teams."
        ]
      ],
      "people": [
        "lena",
        "dev",
        "ellis"
      ]
    },
    "paper-stories": {
      "company": "press",
      "title": "Paper Stories · a little type, a long memory",
      "date": "18 September 2026 · From the sample archive",
      "sections": [
        [
          "The job ticket",
          "Lena Ortiz + Alex · wedding stationery · event date 09/18/2016. Cream stock, indigo ink, and a small botanical mark that survived several enthusiastic revisions."
        ],
        [
          "Ten years later",
          "Tessa found the retained sample while preparing the materials clinic. Lena remembered arguing about the flourishes. Everyone remembered the excellent cake."
        ],
        [
          "Why we keep samples",
          "A useful print archive records what worked as well as what looked good. Our workshop kits include paper, production notes, and several cautionary tales."
        ]
      ],
      "people": [
        "lena",
        "tessa"
      ]
    },
    "roundtable": {
      "company": "open",
      "title": "Useful work, clearly explained",
      "date": "November 2026 · Program preview",
      "sections": [
        [
          "Small rooms, specific questions",
          "Sam Reed will share a short accessible-forms case study. Morgan Vale will facilitate portfolio conversations. The materials table is being assembled with Pressing Matters."
        ],
        [
          "What to bring",
          "One example of a decision you made, who it helped, and what you would change next time. The evening includes quiet space and a seated introduction table."
        ]
      ],
      "people": [
        "sam",
        "morgan",
        "tessa",
        "dev"
      ]
    }
  },
  "localImages": [
    "morgan-vale",
    "tessa-brooks",
    "dev-malik",
    "dana-fundraiser",
    "dana-alumni",
    "lena-proof-review",
    "lena-anniversary",
    "lena-mochi",
    "sam-garden-workday",
    "sam-rehearsal",
    "morgan-roundtable",
    "morgan-mugs",
    "tessa-sample-kits",
    "tessa-gallery",
    "dev-event-setup",
    "dev-biscuit-test",
    "ellis-history-walk",
    "ellis-archive",
    "corey-bench-repair",
    "corey-library-clinic",
    "kai-volunteer-briefing",
    "kai-science-demo",
    "company-pressroom",
    "company-recruiting",
    "company-eventspace",
    "company-library",
    "company-bikeshop",
    "company-cedar",
    "company-juniper",
    "org-cedar-sign-review",
    "org-good-enough-office",
    "org-good-enough-workshop",
    "org-press-packing",
    "org-juniper-noticeboard",
    "org-next-interviews",
    "org-open-coat-rail",
    "org-library-seed-swap",
    "org-spoke-commuter",
    "org-riverdale-equipment",
    "org-riverdale-campus",
    "org-current-depot",
    "org-current-school-demo",
    "org-lockside-office",
    "org-lockside-library-table",
    "org-riverspan-office",
    "org-riverspan-open-lab",
    "org-press-map-order",
    "org-next-career-room",
    "org-open-room-in-use",
    "org-library-seed-drawers",
    "org-riverdale-cupboard"
  ],
  "community": {
    "priya-desai": {
      "name": "Priya Desai",
      "headline": "Operations team · Good Enough Tomorrow"
    },
    "robin-hale": {
      "name": "Robin Hale",
      "headline": "Facilities coordinator"
    },
    "inez-foster": {
      "name": "Inez Foster",
      "headline": "Local-history exhibition volunteer"
    },
    "wes-booker": {
      "name": "Wes Booker",
      "headline": "Career changer · operations to design"
    },
    "camila-ortiz": {
      "name": "Camila Ortiz",
      "headline": "Community volunteer"
    },
    "mara-bell": {
      "name": "Mara Bell",
      "headline": "Community education · Bluegrass Current Cooperative"
    },
    "nina-cho": {
      "name": "Nina Cho",
      "headline": "Conservation team · Lockside Water"
    },
    "rafael-cruz": {
      "name": "Rafael Cruz",
      "headline": "Community learning · RiverSpan Fiber"
    }
  }
};
