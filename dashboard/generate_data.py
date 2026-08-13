"""
Regenerates dashboard/data.js from dashboard/data.json (the 22 Short List
contacts, already stage-categorized) plus a newly-generated set of 200
fictional closed-deal ("Wins") records.

Run: python3 generate_data.py
"""
import json
import random
from datetime import datetime, timedelta

random.seed(42)

TODAY = datetime(2026, 8, 10)

# ---------------------------------------------------------------------
# 1. Patch the 22 Short List contacts' Last touch dates so the touch-
#    urgency demo shows a realistic spread instead of 17/22 overdue.
#    (Item 5 — dummy-data-only change; stage/priority/etc. untouched.)
# ---------------------------------------------------------------------

DAYS_AGO_BY_COMPANY = {
    'Dover Ventures': 20,
    'Tacoma Ventures': 4,
    'Edgewood Capital': 70,
    'Ironclad Ventures': 140,
    'Toledo Capital': 38,
    'Upton Ventures': 5,
    'Preston Partners': 18,
    'Ivybridge Partners': 29,
    'Canterbury Equity': 3,
    'Quinton Ventures': 6,
    'Greenhill Ventures': 24,
    'Sacramento Partners': 23,
    'Stonebridge Capital': 7,
    'Lakeland Partners': 12,
    'Orchard Capital': 15,
    'Cromwell Ventures': 9,
    'Jacksonville Partners': 45,
    'Waverly Capital': 11,
    'Alpine Ridge Capital': 95,
    'Cedarwood Capital': 8,
    'Weston Capital': 27,
    'Yarmouth Capital': 210,
}


def touch_severity(days):
    # Four tiers per the Easy to Buy framework: the 10-12 week
    # requalify-or-disengage rule puts the line at 70 days, distinct from
    # (and more severe than) a routine overdue touch at 31-69 days.
    if days is None:
        return 'unknown'
    if days >= 70:
        return 'requalify'
    if days > 30:
        return 'overdue'
    if days >= 14:
        return 'duesoon'
    return 'ontrack'


data = json.load(open('data.json'))
contacts = data['contacts']

for c in contacts:
    days_ago = DAYS_AGO_BY_COMPANY[c['company']]
    new_last_touch = TODAY - timedelta(days=days_ago)
    c['lastTouch'] = new_last_touch.strftime('%Y-%m-%d')
    c['daysSinceLastTouch'] = days_ago
    c['touchSeverity'] = touch_severity(days_ago)

# ---------------------------------------------------------------------
# 1a-bis. Demo case: blank out Touch Ideas for two contacts so their
#     suggestedTouch (below) is forced through the generated-fallback path
#     instead of the common case of reusing the source spreadsheet's Touch
#     ideas text. Proves the fallback actually produces something useful,
#     not just that the pass-through path works.
# ---------------------------------------------------------------------

BLANK_TOUCH_IDEAS_FOR = {'Toledo Capital', 'Jacksonville Partners'}
for c in contacts:
    if c['company'] in BLANK_TOUCH_IDEAS_FOR:
        c['touchIdeas'] = ''

# ---------------------------------------------------------------------
# 1b. Precompute a "suggestedTouch" per contact for the detail popup's
#     overdue call-to-action. Uses the existing Touch ideas field when
#     populated; otherwise generates a tailored fallback from Notes /
#     Nature of work / Priority / Type, drawing on the same four Easy to
#     Buy touch categories used elsewhere in the workbook (deal-sharing,
#     introduction, market update/article, phone check-in). Written once
#     here and stored on the record so the popup is consistent on every
#     open, rather than regenerated at view time.
# ---------------------------------------------------------------------

def generate_fallback_touch(c):
    # Stable across runs (unlike Python's salted hash()).
    category = sum(ord(ch) for ch in c['company']) % 4
    sector = c.get('natureOfWork') or 'their sector'
    partner = c.get('mwPartner') or 'the relationship partner'
    if category == 0:
        return f"Share a recent deal announcement relevant to {sector.lower()} and gauge interest in a follow-up call."
    if category == 1:
        return f"Offer an introduction to {partner} or another sector contact to deepen the relationship."
    if category == 2:
        return f"Send a short market update or article relevant to {sector.lower()} to stay top of mind."
    return "Place a brief phone check-in to see how things are progressing on their end."

for c in contacts:
    touch_ideas = (c.get('touchIdeas') or '').strip()
    c['suggestedTouch'] = touch_ideas if touch_ideas else generate_fallback_touch(c)

# ---------------------------------------------------------------------
# 1c. Hand-written "Send touch email" content per contact, for the detail
#     popup's touch-email preview. Written once here (not generated live)
#     so the popup shows the same email every time it's reopened.
#
#     Writing rules (Easy to Buy touch-email principles):
#       - Lead with the specific value item, never "just checking in."
#       - Reference the contact's actual Notes / Nature of work / Priority
#         so it reads as written for them, not a template.
#       - No apologetic/subordinate language ("sorry to bother," "if you
#         have a moment").
#       - Two to three short paragraphs, no corporate filler.
#       - Close light — an offer, not a demand for a meeting.
# ---------------------------------------------------------------------

TOUCH_EMAIL_BY_COMPANY = {
    'Dover Ventures': {
        'subject': 'A whitepaper on cross-border deal structures',
        'body': "Hi Thomas,\n\n"
                "Our M&A team recently put together a whitepaper on cross-border deal structuring — given the interest you mentioned when we met, the section on structuring credit and mezzanine facilities across jurisdictions looked directly relevant to Dover's pipeline.\n\n"
                "Happy to send the full piece over or set up a quick call with the team behind it. Let me know what's useful.",
    },
    'Tacoma Ventures': {
        'subject': "A few thoughts on Tacoma's fund formation",
        'body': "Hi Gary,\n\n"
                "A few recent lower-middle-market buyouts we've advised on raised structuring questions similar to what you flagged for Tacoma's fund formation and portfolio support — worth a quick visit to walk through what we're seeing.\n\n"
                "Happy to work around your schedule whenever it's convenient.",
    },
    'Edgewood Capital': {
        'subject': "Thought this might be useful for Edgewood",
        'body': "Hi Richard,\n\n"
                "Wanted to pass along a whitepaper our team recently published on M&A deal structures — a couple of the healthcare services case studies in it are close to what Edgewood is currently evaluating.\n\n"
                "Given you're actively looking at outside counsel for the healthcare M&A work, I'd also be glad to walk through how we've supported similar mandates. Let me know if you'd like to discuss further.",
    },
    'Ironclad Ventures': {
        'subject': 'Connecting you with our family office specialist',
        'body': "Hi Kenneth,\n\n"
                "Following our last conversation about Ironclad's add-on acquisition, I'd like to connect you directly with the partner on our team who specializes in family office and bespoke advisory structures — his recent work on similar add-on deals could be useful as you move forward.\n\n"
                "Happy to make the introduction whenever convenient.",
    },
    'Toledo Capital': {
        'subject': 'An invite, and a quick note on the mandate',
        'body': "Hi Gary,\n\n"
                "We're hosting a reception at the upcoming conference and would love to have the Toledo team there — a good chance to meet a few of the partners who work on the deal-flow and co-counsel arrangements we discussed.\n\n"
                "Also wanted to follow up on the capability deck — happy to answer any questions before you finalize your thinking on the mandate.",
    },
    'Upton Ventures': {
        'subject': 'Introduction to our industrial services lead',
        'body': "Hi Mark,\n\n"
                "Given Upton's active pipeline in industrial services, I'd like to connect you with Thomas Zahn on our team — he's led several recent growth equity and M&A deals in the space and could be a useful sounding board on your current opportunities.\n\n"
                "Happy to set up the introduction whenever it's convenient.",
    },
    'Preston Partners': {
        'subject': 'Leveraged finance market update',
        'body': "Hi Steven,\n\n"
                "Wanted to share a market update our team put together on leveraged finance trends — a few points on covenant structures are directly relevant to the bespoke advisory work Preston has been building out.\n\n"
                "Also following up on the capability deck we sent — happy to walk through it whenever useful.",
    },
    'Ivybridge Partners': {
        'subject': 'A deal announcement and webinar invite',
        'body': "Hi Amanda,\n\n"
                "Wanted to flag a recent deal announcement closely aligned with the add-on acquisition strategy we discussed for Ivybridge's portfolio companies — thought it might be a useful reference point.\n\n"
                "We're also hosting a webinar on PE trends next month, in case it's of interest. Happy to send the details.",
    },
    'Canterbury Equity': {
        'subject': "Lunch, and a regulatory update worth flagging",
        'body': "Hi Eric,\n\n"
                "There have been a few recent regulatory changes affecting cross-border add-on acquisitions that I think would be worth walking through together — exactly the kind of thing you flagged interest in when we met.\n\n"
                "I'd like to grab lunch sometime in the next few weeks to cover it — happy to find a time that's easy for you.",
    },
    'Quinton Ventures': {
        'subject': 'Introduction to our healthcare PE lead',
        'body': "Hi Carolyn,\n\n"
                "With Quinton's pipeline review underway, I wanted to connect you with Gregory Hawver on our team — he's led several recent healthcare-focused PE transactions and could offer a useful perspective on your current deals.\n\n"
                "Also happy to follow up on the capability deck whenever it's useful.",
    },
    'Greenhill Ventures': {
        'subject': "A whitepaper for Greenhill's active pipeline",
        'body': "Hi Samantha,\n\n"
                "Wanted to share a whitepaper our team recently published on M&A deal structures, with a strong cross-border and regulatory advisory section — given Greenhill's active pipeline in industrial services, a few of the frameworks in it could be directly useful right now.\n\n"
                "Happy to talk through any of it or connect you with the authors.",
    },
    'Sacramento Partners': {
        'subject': 'An invite to our upcoming reception',
        'body': "Hi Emily,\n\n"
                "We're hosting a reception at the upcoming conference and would love to have you there — a good opportunity to continue the cross-border conversation we started and meet more of the team working on technology-sector M&A.\n\n"
                "Let me know if you'd like the details.",
    },
    'Stonebridge Capital': {
        'subject': 'A deal announcement worth sharing',
        'body': "Hi Carolyn,\n\n"
                "Wanted to send along a recent deal announcement that ties directly into the fund formation work Stonebridge has underway — thought it might be a useful reference as you scope things out.\n\n"
                "Also flagging a webinar on PE trends next month, in case it's useful ahead of our intro call.",
    },
    'Lakeland Partners': {
        'subject': 'A recent deal example in healthcare M&A',
        'body': "Hi Anthony,\n\n"
                "Wanted to share a recent deal example from the healthcare services M&A space that's close to what Lakeland is currently evaluating — happy to walk through how the structure came together if it's useful context.\n\n"
                "Given you're actively looking at outside counsel, I'd also welcome the chance to talk through how we could support the fund's next steps.",
    },
    'Orchard Capital': {
        'subject': 'A relevant deal example for Orchard',
        'body': "Hi Katherine,\n\n"
                "Wanted to share a recent deal example from the healthcare services space that's relevant to what Orchard is working through right now — a useful reference point given the bespoke advisory structure you're building.\n\n"
                "Happy to talk through it, or make an introduction to the team that led it.",
    },
    'Cromwell Ventures': {
        'subject': "IS deal structures for Cromwell's legal panel",
        'body': "Hi David,\n\n"
                "With Cromwell building out its legal panel, I wanted to walk through some of our recent industrial services deal structures and cross-border capabilities — a few are close to the deal-flow and co-counsel model you mentioned wanting to set up.\n\n"
                "Happy to put together a short overview or set up time to talk through it.",
    },
    'Jacksonville Partners': {
        'subject': 'An invite, and following up on the deck',
        'body': "Hi Rachel,\n\n"
                "We're hosting a reception at the upcoming conference and would love to have the Jacksonville team there — a good chance to meet more of the group ahead of the Q2 engagement timeline.\n\n"
                "Also wanted to follow up on the capability deck we sent — happy to answer any questions whenever it's useful.",
    },
    'Waverly Capital': {
        'subject': 'Lunch, plus a regulatory update',
        'body': "Hi Ryan,\n\n"
                "There have been some recent regulatory changes affecting credit and mezzanine financing structures that I think would be worth discussing over lunch — particularly relevant given the healthcare M&A work Waverly has planned.\n\n"
                "Let me know a time that works and I'll find somewhere nearby.",
    },
    'Alpine Ridge Capital': {
        'subject': 'Introduction to our sector specialist',
        'body': "Hi Janet,\n\n"
                "Given Alpine Ridge's active pipeline in industrial services, I'd like to connect you with Steven Kraich on our team — his recent work on similar co-counsel and deal-flow arrangements could be a useful resource as things move forward.\n\n"
                "Happy to set up the introduction whenever convenient.",
    },
    'Cedarwood Capital': {
        'subject': 'An invite following our call on fund strategy',
        'body': "Hi Steven,\n\n"
                "Following up on our call about Cedarwood's fund strategy — we're hosting a reception at the upcoming conference and I'd love to have you there to meet more of the team working on technology-sector M&A and growth equity.\n\n"
                "Let me know if you'd like the details.",
    },
    'Weston Capital': {
        'subject': 'IS and cross-border structures for Weston',
        'body': "Hi Samantha,\n\n"
                "With Weston in the process of selecting outside counsel, I wanted to walk through some of our industrial services deal structures and cross-border capabilities that overlap with the healthcare M&A work you're planning.\n\n"
                "Happy to put together a short overview or set up time to talk it through.",
    },
    'Yarmouth Capital': {
        'subject': 'An invite ahead of Q2',
        'body': "Hi Mark,\n\n"
                "We're hosting a reception at the upcoming conference and would love to have you there — a good opportunity to pick back up on the cross-border conversation we started, ahead of the Q2 engagement timeline.\n\n"
                "Let me know if you'd like the details.",
    },
}


def generate_fallback_email(c):
    # Safety net for any future contact not in the hand-written map above.
    first_name = c.get('firstName') or (c.get('contactName') or '').split(' ')[0] or 'there'
    return {
        'subject': "Thought you'd find this useful",
        'body': f"Hi {first_name},\n\n{c['suggestedTouch']}\n\nLet me know if you'd like to discuss further.",
    }


for c in contacts:
    email_content = TOUCH_EMAIL_BY_COMPANY.get(c['company']) or generate_fallback_email(c)
    c['touchEmailSubject'] = email_content['subject']
    c['touchEmailBody'] = email_content['body']

# ---------------------------------------------------------------------
# 1d. Whale vs. Minnow tagging.
#
#     Default rule: Type PE / IS / IS-EM -> Whale-leaning; Type Credit ->
#     Minnow-leaning.
#
#     Overridden per-contact where the Notes text clearly signals repeat/
#     expansion potential (-> Whale even if Type is Credit) or frames a
#     single discrete engagement (-> Minnow even if Type is PE/IS/IS-EM).
#     This is a judgment call on freeform text, not an exact science —
#     each override's reasoning is recorded here and was flagged back to
#     the user rather than applied silently.
# ---------------------------------------------------------------------

WHALE_DEFAULT_TYPES = {'PE', 'IS', 'IS/EM'}

WHALE_OVERRIDES = {
    # Credit-type contacts whose Notes signal repeat/expansion potential.
    'Ironclad Ventures': ('Whale', 'Notes read "repeat meeting - deepening relationship" plus an add-on acquisition in progress — ongoing activity, not a one-off.'),
    'Greenhill Ventures': ('Whale', 'Notes explicitly say "active deal pipeline."'),
    'Cromwell Ventures': ('Whale', 'Notes describe a newly raised $750M fund building out its legal panel — a large, newly-formed fund implies an ongoing multi-deal need, not a single mandate.'),
    'Alpine Ridge Capital': ('Whale', 'Notes explicitly say "active deal pipeline."'),
    # PE/IS/IS-EM-type contacts whose Notes frame a single, discrete ask.
    'Toledo Capital': ('Minnow', 'Notes frame the ask as "awaiting response on specific mandate" — a single discrete engagement, not an ongoing relationship.'),
    'Preston Partners': ('Minnow', 'Notes frame the ask as "awaiting response on specific mandate" — a single discrete engagement.'),
    'Jacksonville Partners': ('Minnow', 'Notes frame the ask as "awaiting response on specific mandate" — a single discrete engagement.'),
}


def whale_tag(c):
    default = 'Whale' if c.get('type') in WHALE_DEFAULT_TYPES else 'Minnow'
    override = WHALE_OVERRIDES.get(c['company'])
    return override[0] if override else default


for c in contacts:
    c['whaleTag'] = whale_tag(c)

# ---------------------------------------------------------------------
# 2. Generate 200 fictional closed-deal ("Wins") records.
# ---------------------------------------------------------------------

PLACE_WORDS = [
    'Dover', 'Tacoma', 'Edgewood', 'Ironclad', 'Toledo', 'Upton', 'Preston',
    'Ivybridge', 'Canterbury', 'Quinton', 'Greenhill', 'Sacramento',
    'Stonebridge', 'Lakeland', 'Orchard', 'Cromwell', 'Jacksonville',
    'Waverly', 'Alpine Ridge', 'Cedarwood', 'Weston', 'Yarmouth', 'Kelton',
    'Linton', 'Ember', 'Valleystone', 'Oakmont', 'Exeter', 'Claridge',
    'Upland', 'Crestline', 'Baltimore', 'Ashford', 'Brighton', 'Carrington',
    'Dunmore', 'Elmsworth', 'Fairhaven', 'Glenridge', 'Harlow', 'Ibbotson',
    'Juniper', 'Kingsley', 'Lockwood', 'Merriton', 'Northgate', 'Oakhurst',
    'Pinehollow', 'Queensgate', 'Ridgemont', 'Southbrook', 'Thornfield',
    'Underwood', 'Vantage', 'Westbridge', 'Yorkshire', 'Ashcroft',
    'Birchwood', 'Copperfield', 'Dexbury', 'Everton', 'Fenwick', 'Graystone',
    'Hartwell', 'Ironwood', 'Kestrel', 'Larkspur', 'Millbrook', 'Norwich',
    'Overland', 'Pemberton', 'Rosecliff', 'Sterling', 'Thackeray',
]

SUFFIXES = ['Capital', 'Ventures', 'Partners', 'Equity']

FIRST_NAMES = [
    'Thomas', 'Gary', 'Richard', 'Kenneth', 'Mark', 'Steven', 'Amanda',
    'Nicole', 'Christine', 'Samantha', 'Brian', 'Katherine', 'Rachel',
    'Emily', 'Eric', 'Jennifer', 'Karen', 'Elizabeth', 'James', 'Gregory',
    'Laura', 'Robert', 'Michael', 'Sarah', 'David', 'Jessica', 'Daniel',
    'Lauren', 'Andrew', 'Melissa', 'Justin', 'Rebecca', 'Ryan', 'Stephanie',
    'Matthew', 'Ashley', 'Joshua', 'Megan', 'Jonathan', 'Christina',
    'William', 'Victoria', 'Charles', 'Natalie', 'Peter', 'Danielle',
]

LAST_NAMES = [
    'Baker', 'Vaughn', "O'Brien", 'Edwards', 'Mercer', 'Jensen', 'Ingram',
    'Irving', 'Patterson', 'Norwood', 'Thompson', 'Quinn', 'Crawford',
    'Ellsworth', 'Underwood', 'Langford', 'Gibson', 'Fletcher', 'Reynolds',
    'Anderson', 'Bennett', 'Carver', 'Dawson', 'Ferris', 'Grayson',
    'Holbrook', 'Isley', 'Jorgensen', 'Kennedy', 'Lindqvist', 'Marsh',
    'Nolan', 'Osgood', 'Prescott', 'Quimby', 'Rutledge', 'Sinclair',
    'Talbot', 'Upton', 'Vance', 'Whitfield', 'Ashworth', 'Blackwood',
]

NATURE_OF_WORK = [
    'Credit facilities and mezzanine financing',
    'Lower middle market private equity buyouts, consulting services',
    'Technology sector M&A and growth equity deals',
    'Family office relationship - bespoke advisory services',
    'Deal flow sharing / potential co-counsel arrangements',
    'Private equity - leveraged buyouts, add-on acquisitions',
    'Infrastructure and energy private equity investments',
    'Healthcare-focused private equity transactions',
    'Cross-border M&A transactions and regulatory advisory',
    'Industrial services growth equity',
]

MW_PARTNERS = [
    'Brooker, James A.',
    'Zahn, Thomas R.',
    'Donovan, Karen L.',
    'Whitfield, Laura B.',
    'Chambers, Robert D.',
    'Hawver, Gregory P.',
    'Palmer, Elizabeth A.',
    'Gallagher, Mark T.',
    'Kraich, Steven M.',
]

FEE_CHOICES = [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900,
               1000, 1200, 1500, 1800, 2000, 2200, 2500]

EXISTING_COMPANY_NAMES = {c['company'] for c in contacts}

def random_close_date():
    start = datetime(2018, 1, 1)
    end = datetime(2026, 7, 15)
    delta_days = (end - start).days
    return start + timedelta(days=random.randint(0, delta_days))

used_names = set()
def unique_company_name():
    for _ in range(50):
        name = f"{random.choice(PLACE_WORDS)} {random.choice(SUFFIXES)}"
        if name not in used_names and name not in EXISTING_COMPANY_NAMES:
            used_names.add(name)
            return name
    # fallback: allow reuse with a numeric suffix if we somehow exhaust options
    name = f"{random.choice(PLACE_WORDS)} {random.choice(SUFFIXES)} {random.randint(2,9)}"
    used_names.add(name)
    return name

wins = []
for i in range(1, 201):
    close_date = random_close_date()
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    win = {
        'id': i,
        'company': unique_company_name(),
        'contactName': f"{first} {last}",
        'natureOfWork': random.choice(NATURE_OF_WORK),
        'mwPartner': random.choice(MW_PARTNERS),
        'closeDate': close_date.strftime('%Y-%m-%d'),
        'feeValue': random.choice(FEE_CHOICES),
    }
    wins.append(win)

wins.sort(key=lambda w: w['closeDate'], reverse=True)
for i, w in enumerate(wins, start=1):
    w['id'] = i

# ---------------------------------------------------------------------
# 3. Recompute meta
# ---------------------------------------------------------------------

total_fee_potential = sum(c['feePotential'] for c in contacts if c['feePotential'])
closing_stage_value = sum(c['feePotential'] for c in contacts if c['stage'] == 'Closing' and c['feePotential'])
stage_counts = {}
for c in contacts:
    stage_counts[c['stage']] = stage_counts.get(c['stage'], 0) + 1
overdue_count = sum(1 for c in contacts if c['touchSeverity'] == 'overdue')
duesoon_count = sum(1 for c in contacts if c['touchSeverity'] == 'duesoon')
ontrack_count = sum(1 for c in contacts if c['touchSeverity'] == 'ontrack')
requalify_count = sum(1 for c in contacts if c['touchSeverity'] == 'requalify')

whale_count = sum(1 for c in contacts if c['whaleTag'] == 'Whale')
minnow_count = sum(1 for c in contacts if c['whaleTag'] == 'Minnow')

closed_deals_count = len(wins)
closed_deals_total_fee_all_time = sum(w['feeValue'] for w in wins)

# "Last 12 months" so the hero's two headline numbers share a comparable
# time horizon, instead of an all-time total dwarfing the current pipeline.
cutoff_12mo = (TODAY - timedelta(days=365)).strftime('%Y-%m-%d')
wins_12mo = [w for w in wins if w['closeDate'] >= cutoff_12mo]
closed_deals_count_12mo = len(wins_12mo)
closed_deals_total_fee_12mo = sum(w['feeValue'] for w in wins_12mo)

meta = {
    'today': TODAY.strftime('%Y-%m-%d'),
    'activeProspects': len(contacts),
    'closedDeals': closed_deals_count,
    'closedDealsTotalFeeAllTime': closed_deals_total_fee_all_time,
    'closedDealsCount12mo': closed_deals_count_12mo,
    'closedDealsTotalFee12mo': closed_deals_total_fee_12mo,
    'overdueTouches': overdue_count,
    'dueSoonTouches': duesoon_count,
    'onTrackTouches': ontrack_count,
    'requalifyTouches': requalify_count,
    'whaleCount': whale_count,
    'minnowCount': minnow_count,
    'totalFeePotential': total_fee_potential,
    'closingStageValue': closing_stage_value,
    'stageCounts': stage_counts,
    'natureOfWorkOptions': NATURE_OF_WORK,
    'mwPartnerOptions': MW_PARTNERS,
}

out = {'meta': meta, 'contacts': contacts, 'wins': wins}

with open('data.json', 'w') as f:
    json.dump(out, f, indent=2)

with open('data.js', 'w') as f:
    f.write('const DASHBOARD_DATA = ')
    json.dump(out, f, indent=2)
    f.write(';\n')

print(json.dumps(meta, indent=2))
print()
print('Touch severity spread:', {
    'requalify': requalify_count, 'overdue': overdue_count,
    'duesoon': duesoon_count, 'ontrack': ontrack_count,
})
print('Requalify-tier contacts (70+ days):',
      [c['company'] for c in contacts if c['touchSeverity'] == 'requalify'])
print('Whale/Minnow spread:', {'Whale': whale_count, 'Minnow': minnow_count})
print('Whale/Minnow overrides applied:')
for company, (tag, reason) in WHALE_OVERRIDES.items():
    print(f'  {company} -> {tag}: {reason}')
print('Contacts with blanked Touch ideas (fallback demo):', sorted(BLANK_TOUCH_IDEAS_FOR))
for c in contacts:
    if c['company'] in BLANK_TOUCH_IDEAS_FOR:
        print(f"  {c['company']} suggestedTouch (fallback) -> {c['suggestedTouch']}")
print('Wins generated:', len(wins))
print('Sample win:', wins[0])
