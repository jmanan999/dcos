"""
DCOS seed script — populates a fresh database with:
  - 11 districts, 12 zones, 70 assembly constituencies, 272 wards
  - 12 Delhi departments
  - Default SLA policies per department
  - 3 admin/officer users per department + 50 citizen users
  - 520 synthetic-but-realistic grievances across all wards & statuses

Usage (from apps/api/):
    source .venv/bin/activate
    python -m scripts.seed
"""

from __future__ import annotations

import asyncio
import json
import os
import random
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg

DATABASE_URL = (
    os.getenv("DATABASE_URL", "postgresql://dcos:dcos@localhost:5432/dcos")
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("+asyncpg", "")
)

random.seed(42)

# ── Real MCD ward names (ward number → name) ──────────────────────────────────
WARD_NAMES: dict[int, str] = {
    1: "NARELA",
    2: "BANKNER",
    3: "ALIPUR",
    4: "BAKHTAWAR PUR",
    5: "BHALASWA JAHAGIR PUR",
    6: "MUKUND PUR",
    7: "BURARI",
    8: "JHARODA",
    9: "MALKAGANJ",
    10: "TIMAR PUR",
    11: "MUKHERJEE NAGAR",
    12: "G.T.B. NAGAR",
    13: "DHIR PUR",
    14: "ADARSH NAGAR",
    15: "SARAI PIPAL THALA",
    16: "JAHANGIRPURI-I",
    17: "SAMAYPUR BADLI",
    18: "LIBAS PUR",
    19: "BHALSWA",
    20: "JAHANGIR PURI-II",
    21: "ROHINI",
    22: "RITHALA",
    23: "BUDH VIHAR",
    24: "VIJAY VIHAR",
    25: "POOTH KALAN",
    26: "SAHIBABAD DAULAT PUR",
    27: "BEGUMPUR",
    28: "BAWANA",
    29: "KARALA",
    30: "MUNDAKA",
    31: "NANGLOI JAT WEST",
    32: "NILOTHI",
    33: "PREM NAGAR",
    34: "NITHARI",
    35: "KIRARI SULEMAN NAGAR",
    36: "PRATAP VIHAR",
    37: "SULTANPURI EAST",
    38: "MANGOL PURI NORTH",
    39: "SULTANPUR MAJRA",
    40: "SULTANPURI SOUTH",
    41: "GURU HARKISHAN NAGAR",
    42: "PERAGHARHI",
    43: "NANGLOI EAST",
    44: "QUAMMRUDDIN NAGAR",
    45: "ROHINI SOUTH",
    46: "MANGOLPURI EAST",
    47: "MANGOLPURI",
    48: "MANGOLPURI WEST",
    49: "ROHINI NORTH",
    50: "ROHINI CENTRAL",
    51: "ROHINI EAST",
    52: "NAHARPUR",
    53: "PITAMPURA SOUTH",
    54: "PITAMPURA NORTH",
    55: "SHALIMAR BAGH NORTH",
    56: "SHALIMAR BAGH SOUTH",
    57: "PASCHIM VIHAR SOUTH",
    58: "PASCHIM VIHAR NORTH",
    59: "RANI BAGH",
    60: "SARASWATI VIHAR",
    61: "TRI NAGAR",
    62: "RAMPURA",
    63: "KOHAT ENCLAVE",
    64: "SHAKUR PUR",
    65: "NIMRI COLONY",
    66: "SAWAN PARK",
    67: "WAJIRPUR",
    68: "ASHOK VIHAR",
    69: "KAMLA NAGAR",
    70: "RANA PRATAP BAGH",
    71: "SANGAM PARK",
    72: "MODEL TOWN",
    73: "SHASTRI NAGAR",
    74: "INDER LOK COLONY",
    75: "KISHAN GANJ",
    76: "DEPUTY GANJ",
    77: "KASHMERE GATE",
    78: "MAJNU KA TILA",
    79: "JAMA MASJID",
    80: "CHANDNI CHOWK",
    81: "MINTO ROAD",
    82: "KUCHA PANDIT",
    83: "BAZAR SITARAM",
    84: "TURKMAN GATE",
    85: "IDGAH ROAD",
    86: "BALLIMARAN",
    87: "RAM NAGAR",
    88: "QASABPURA",
    89: "PAHAR GANJ",
    90: "MODEL BASTI",
    91: "KAROL BAGH",
    92: "DEV NAGAR",
    93: "BALJIT NAGAR",
    94: "WEST PATEL NAGAR",
    95: "EAST PATEL NAGAR",
    96: "NEW RANJIT NAGAR",
    97: "KIRTI NAGAR",
    98: "MANSAROWER GARDEN",
    99: "MOTI NAGAR",
    100: "KARAM PURA",
    101: "RAJA GARDEN",
    102: "RAGHUBIR NAGAR",
    103: "PUNJABI BAGH",
    104: "MADIPUR",
    105: "RAJOURI GARDEN",
    106: "TAGORE GARDEN",
    107: "VISHNU GARDEN",
    108: "KHYALA",
    109: "JANAK PURI NORTH",
    110: "NANGAL RAYA",
    111: "HARI NAGAR",
    112: "SUBHASH NAGAR",
    113: "MAHAVIR NAGAR",
    114: "TILAK NAGAR",
    115: "MAJOR BHUPINDAR SINGH NAGAR",
    116: "VIKASPURI EAST",
    117: "JANAK PURI WEST",
    118: "JANAK PURI SOUTH",
    119: "MILAP NAGAR",
    120: "SITA PURI",
    121: "KUNWAR SINGH NAGAR",
    122: "HASTSAL",
    123: "VIKAS PURI",
    124: "VIKAS NAGAR",
    125: "MOHAN GARDEN",
    126: "NAWADA",
    127: "UTTAM NAGAR",
    128: "BINDAPUR",
    129: "DABRI",
    130: "MANGLAPURI",
    131: "SAGARPUR",
    132: "SAGARPUR WEST",
    133: "CHHAWLA",
    134: "NANGLI SAKRAVATI",
    135: "KAKRAULA",
    136: "MATIALA",
    137: "ROSHANPURA",
    138: "NAJAFGARH",
    139: "DICHAON KALAN",
    140: "KHERA",
    141: "BIJWASAN",
    142: "RAJ NAGAR",
    143: "KAPASHERA",
    144: "MAHIPALPUR",
    145: "PALAM",
    146: "SADH NAGAR",
    147: "MAHAVIR ENCLAVE",
    148: "MADHU VIHAR",
    149: "RAJENDER NAGAR",
    150: "PUSA",
    151: "INDER PURI",
    152: "NARAINA",
    153: "DARYAGANJ",
    154: "NIZAMUDDIN",
    155: "LAJPAT NAGAR",
    156: "BHOGAL",
    157: "KASTURBA NAGAR",
    158: "KOTLA MUBARAKPUR",
    159: "ANDREWSGANJ",
    160: "AMAR COLONY",
    161: "MALVIYA NAGAR",
    162: "HAUZ RANI",
    163: "SAFDARJANG ENCLAVE",
    164: "HAUZ KHAS",
    165: "VASANT VIHAR",
    166: "MUNIRKA",
    167: "R.K. PURAM",
    168: "NANAK PURA",
    169: "LADOSARAI",
    170: "MEHRAULI",
    171: "VASANTKUNJ",
    172: "KISHANGARH",
    173: "DEOLI",
    174: "CHHATARPUR",
    175: "AYA NAGAR",
    176: "BHATI",
    177: "SAID UL AJAIB",
    178: "SANGAM VIHAR",
    179: "TIGRI",
    180: "DAKSHINPURI EXT.",
    181: "KHANPUR",
    182: "AMBEDKAR NAGAR",
    183: "MADANGIR",
    184: "PUSHP VIHAR",
    185: "TUGHLAKABAD EXTN",
    186: "SANGAM VIHAR WEST",
    187: "SANGAM VIHAR CENTRAL",
    188: "SANGAM VIHAR EAST",
    189: "CHIRAG DELHI",
    190: "CHITRANJAN PARK",
    191: "SHAPUR JAT",
    192: "GREATER KAILASH-I",
    193: "SRI NIWASPURI",
    194: "EAST OF KAILASH",
    195: "GOVIND PURI",
    196: "KALKAJI",
    197: "TUGHLAKABAD",
    198: "PUL PEHLAD",
    199: "TEKHAND",
    200: "HARKESH NAGAR",
    201: "JAITPUR",
    202: "MEETHEYPUR",
    203: "BADAR PUR",
    204: "MOLARBAND",
    205: "ZAKIR NAGAR",
    206: "OKHLA",
    207: "MADANPUR KHADAR",
    208: "SARITA VIHAR",
    209: "MAYUR VIHAR PHASE-I",
    210: "DALLOPURA",
    211: "TRILOK PURI",
    212: "NEW ASHOK NAGAR",
    213: "KALYAN PURI",
    214: "KHICHRIPUR",
    215: "KONDLI",
    216: "GHAROLI",
    217: "VINOD NAGAR",
    218: "MANDAWALI",
    219: "MAYUR VIHAR PHASE II",
    220: "PATPARGANJ",
    221: "KISHAN KUNJ",
    222: "LAXMI NAGAR",
    223: "SHAKARPUR",
    224: "PANDAV NAGAR",
    225: "ANAND VIHAR",
    226: "VISHWASH NAGAR",
    227: "I.P. EXTENSION",
    228: "PREET VIHAR",
    229: "KRISHNA NAGAR",
    230: "GEETA COLONY",
    231: "GHONDLI",
    232: "ANARKALI",
    233: "DHARAMPURA",
    234: "GANDHI NAGAR",
    235: "AZAD NAGAR",
    236: "RAGHUBAR PURA",
    237: "SHAHDARA",
    238: "JHILMIL",
    239: "VIVEK VIHAR",
    240: "DILSHAD COLONY",
    241: "DILSHAD GARDEN",
    242: "NEW SEEMA PURI",
    243: "NAND NAGRI",
    244: "SUNDER NAGARI",
    245: "DURGA PURI",
    246: "ASHOK NAGAR",
    247: "RAM NAGAR",
    248: "WELCOME COLONY",
    249: "CHAUHAN BANGER",
    250: "ZAFFRABAD",
    251: "NEW USMANPUR",
    252: "MAUJPUR",
    253: "BHAJANPURA",
    254: "BRAHAM PURI",
    255: "GHONDA",
    256: "YAMUNA VIHAR",
    257: "SUBHASH MOHALLA",
    258: "KARDAM PURI",
    259: "JANTA COLONY",
    260: "BABAR PUR",
    261: "JIWANPUR",
    262: "GOKALPUR",
    263: "SABOLI",
    264: "HARSH VIHAR",
    265: "SHIV VIHAR",
    266: "KARAWAL NAGAR EAST",
    267: "NEHRU VIHAR",
    268: "MUSTAFABAD",
    269: "KHAJOORI KHAS",
    270: "TUKHMIR PUR",
    271: "KARAWAL NAGAR WEST",
    272: "SONIA VIHAR",
}

# ── Reference data ────────────────────────────────────────────────────────────

DISTRICTS = [
    ("Central Delhi", "CD"),
    ("East Delhi", "ED"),
    ("New Delhi", "ND"),
    ("North Delhi", "NDE"),
    ("North East Delhi", "NED"),
    ("North West Delhi", "NWD"),
    ("Shahdara", "SHA"),
    ("South Delhi", "SD"),
    ("South East Delhi", "SED"),
    ("South West Delhi", "SWD"),
    ("West Delhi", "WD"),
]

# Zone → (district_code, zone_code)
ZONES = [
    ("Central Zone", "CZ", "CD"),
    ("City SP Zone", "CSP", "CD"),
    ("Civil Lines Zone", "CL", "NDE"),
    ("Karol Bagh Zone", "KB", "CD"),
    ("Keshav Puram Zone", "KP", "NWD"),
    ("Najafgarh Zone", "NJ", "SWD"),
    ("Narela Zone", "NR", "NDE"),
    ("Rohini Zone", "RO", "NWD"),
    ("Shahdara North Zone", "SHN", "SHA"),
    ("Shahdara South Zone", "SHS", "SHA"),
    ("South Zone", "SZ", "SD"),
    ("West Zone", "WZ", "WD"),
]

# 70 Delhi Assembly Constituencies (real names, numbers 1-70)
ACS = [
    (1, "Narela", "NDE"),
    (2, "Burari", "NDE"),
    (3, "Timarpur", "NDE"),
    (4, "Adarsh Nagar", "NDE"),
    (5, "Badli", "NWD"),
    (6, "Rithala", "NWD"),
    (7, "Bawana", "NWD"),
    (8, "Mundka", "WD"),
    (9, "Kirari", "NWD"),
    (10, "Sultanpur Majra", "NWD"),
    (11, "Nangloi Jat", "WD"),
    (12, "Mangol Puri", "NWD"),
    (13, "Rohini", "NWD"),
    (14, "Shalimar Bagh", "NWD"),
    (15, "Shakur Basti", "NWD"),
    (16, "Tri Nagar", "NWD"),
    (17, "Wazirpur", "NDE"),
    (18, "Model Town", "NDE"),
    (19, "Sadar Bazar", "CD"),
    (20, "Chandni Chowk", "CD"),
    (21, "Matia Mahal", "CD"),
    (22, "Ballimaran", "CD"),
    (23, "Kasturba Nagar", "ED"),
    (24, "Gandhi Nagar", "ED"),
    (25, "Shahdara", "SHA"),
    (26, "Seemapuri", "NED"),
    (27, "Rohtas Nagar", "SHA"),
    (28, "Seelampur", "NED"),
    (29, "Ghonda", "NED"),
    (30, "Babarpur", "SHA"),
    (31, "Gokalpur", "NED"),
    (32, "Mustafabad", "NED"),
    (33, "Karawal Nagar", "NED"),
    (34, "Madipur", "WD"),
    (35, "Patparganj", "ED"),
    (36, "Laxmi Nagar", "ED"),
    (37, "Vishwas Nagar", "SHA"),
    (38, "Kondli", "ED"),
    (39, "Trilokpuri", "ED"),
    (40, "Dwarka", "SWD"),
    (41, "Matiala", "SWD"),
    (42, "Uttam Nagar", "WD"),
    (43, "Najafgarh", "SWD"),
    (44, "Bijwasan", "SWD"),
    (45, "Palam", "SWD"),
    (46, "Delhi Cantonment", "SWD"),
    (47, "Rajouri Garden", "WD"),
    (48, "Hari Nagar", "WD"),
    (49, "Tilak Nagar", "WD"),
    (50, "Janakpuri", "WD"),
    (51, "Vikaspuri", "WD"),
    (52, "Uttam Nagar", "WD"),
    (53, "Delhi Cantonment", "SWD"),
    (54, "New Delhi", "ND"),
    (55, "Kashmere Gate", "CD"),
    (56, "Moti Nagar", "WD"),
    (57, "Maliviya Nagar", "SD"),
    (58, "R.K. Puram", "SD"),
    (59, "Mehrauli", "SD"),
    (60, "Chhatarpur", "SD"),
    (61, "Deoli", "SD"),
    (62, "Ambedkar Nagar", "SD"),
    (63, "Sangam Vihar", "SD"),
    (64, "Greater Kailash", "SD"),
    (65, "Kalkaji", "SED"),
    (66, "Tughlakabad", "SED"),
    (67, "Badarpur", "SED"),
    (68, "Okhla", "SED"),
    (69, "Trilokpuri", "ED"),
    (70, "Kondli", "ED"),
]

DEPARTMENTS = [
    ("Municipal Corporation of Delhi", "MCD", "Roads, garbage, drainage, stray animals, building"),
    ("Delhi Jal Board", "DJB", "Water supply, sewage, drainage, pipe network"),
    ("Public Works Department", "PWD", "Roads, flyovers, bridges, public buildings"),
    ("Delhi Police", "DP", "Crime, traffic, safety, emergency response"),
    ("Delhi Transport Corporation", "DTC", "Bus services, routes, bus stops"),
    ("BSES Rajdhani Power Limited", "BSES-R", "Electricity: South & West Delhi"),
    ("BSES Yamuna Power Limited", "BSES-Y", "Electricity: East & Central Delhi"),
    ("Tata Power Delhi Distribution Limited", "TPDDL", "Electricity: North & North-West Delhi"),
    ("Delhi Pollution Control Committee", "DPCC", "Air quality, noise, industrial pollution"),
    ("New Delhi Municipal Council", "NDMC", "Central Delhi civic amenities, parks, streets"),
    ("Delhi Metro Rail Corporation", "DMRC", "Metro stations, safety, services"),
    ("GNCT Department of Health", "HEALTH", "Government hospitals, mohalla clinics, medicines"),
]

CATEGORIES = {
    "MCD": [
        "Pothole / Road Damage",
        "Garbage Not Collected",
        "Stray Animal Menace",
        "Illegal Construction",
        "Waterlogging / Flooding",
        "Park Not Maintained",
        "Street Dog Menace",
        "Unauthorized Signboard",
    ],
    "DJB": [
        "No Water Supply",
        "Low Water Pressure",
        "Sewage Overflow",
        "Pipe Leakage / Burst",
        "Blocked Drain",
        "Water Quality Issue",
        "New Connection Delay",
    ],
    "PWD": [
        "Road Repair Required",
        "Flyover / Bridge Damage",
        "Footpath Broken",
        "Streetlight Not Working",
        "Divider Damaged",
        "Road Cutting Not Restored",
    ],
    "DP": [
        "Vehicle Theft",
        "Noise Pollution",
        "Traffic Signal Fault",
        "Illegal Parking",
        "Street Light Out",
        "Anti-social Activity",
    ],
    "DTC": [
        "Bus Not Available on Route",
        "Bus Delay",
        "Overcrowded Bus",
        "Bus Stop Damaged",
        "Reckless Driving",
        "Wrong Route",
    ],
    "BSES-R": [
        "Power Outage",
        "Low Voltage",
        "Meter Fault",
        "Billing Dispute",
        "Overhead Wire Hanging",
        "Transformer Fault",
    ],
    "BSES-Y": [
        "Power Outage",
        "Low Voltage",
        "Meter Fault",
        "Billing Dispute",
        "Overhead Wire Hanging",
        "Frequent Tripping",
    ],
    "TPDDL": [
        "Power Outage",
        "Low Voltage",
        "Meter Issue",
        "Street Light Fault",
        "Wire Down",
        "New Connection Delay",
    ],
    "DPCC": [
        "Industrial Air Pollution",
        "Vehicle Emissions",
        "Construction Dust",
        "Illegal Burning / Biomass",
        "Noise From Factory",
        "Water Pollution",
    ],
    "NDMC": [
        "Garbage Collection",
        "Park Maintenance",
        "Street Light",
        "Road Repair",
        "Drain Cleaning",
        "Public Toilet Condition",
    ],
    "DMRC": [
        "Platform Overcrowding",
        "AC Not Working in Coach",
        "Lift / Escalator Fault",
        "Token Machine Issue",
        "Security Concern",
        "Cleanliness Issue",
    ],
    "HEALTH": [
        "Medicine Not Available",
        "Doctor Absent",
        "Long Queue at Hospital",
        "Ambulance Delay",
        "Poor Sanitation at Hospital",
        "Equipment Not Working",
    ],
}

COMPLAINT_TEMPLATES = [
    "The {category} issue near {location_hint} has been going on for {days} days now. "
    "Multiple residents have complained but no action taken. Please resolve urgently.",
    "{category} problem at {location_hint}. This is causing inconvenience to hundreds of "
    "residents daily. I have tried calling the helpline but got no response.",
    "Reporting a serious {category} issue in our area ({location_hint}). The situation "
    "has worsened in the last {days} days and needs immediate attention.",
    "{location_hint} mein {category} ki samasya bahut gambhir ho gayi hai. {days} din "
    "se koi samadhan nahi hua. Kripa karke turat dhyan den.",
    "Complaint regarding {category} at {location_hint}. We have been suffering for "
    "{days} days. Children and elderly are especially affected. Urgent action needed.",
    "I wish to bring to your attention a {category} problem near {location_hint}. "
    "Despite previous complaints (reference numbers lost), no resolution has been provided.",
    "Yahan par {days} din se {category} ki samasya hai. {location_hint} ke niwasi bahut "
    "pareshan hain. Kripya is par tatkaal karyawahi karen.",
    "The {category} at {location_hint} is causing safety hazard. I am writing this "
    "complaint on behalf of our RWA. Immediate intervention is requested.",
    "Concerned citizen reporting {category} at {location_hint}. Attached photos show "
    "the severity. SLA has likely already breached. Please escalate.",
    "Emergency! {category} at {location_hint} requires immediate attention. "
    "The situation is dangerous and could lead to accidents.",
]

LOCATION_HINTS = [
    "main market",
    "sector road",
    "near metro station",
    "residential colony",
    "near school",
    "main chowk",
    "colony gali no. 3",
    "park area",
    "near hospital",
    "market road",
    "DDA flats area",
    "B-block",
    "near railway crossing",
    "outer ring road",
    "inner lane",
    "service road",
    "near govt office",
    "housing society",
    "block C",
    "phase 2",
]

STATUSES_WEIGHTED = (
    ["RECEIVED"] * 5
    + ["CLASSIFIED"] * 8
    + ["ASSIGNED"] * 12
    + ["IN_PROGRESS"] * 15
    + ["ACTION_TAKEN"] * 10
    + ["RESOLVED"] * 20
    + ["VERIFIED"] * 10
    + ["CLOSED"] * 15
    + ["ESCALATED"] * 3
    + ["REOPENED"] * 2
)

PRIORITIES_WEIGHTED = ["CRITICAL"] * 5 + ["HIGH"] * 20 + ["MEDIUM"] * 50 + ["LOW"] * 25

# Delhi bounding box lat/lng ranges per district (approximate)
DISTRICT_BOUNDS: dict[str, tuple[float, float, float, float]] = {
    "CD": (28.60, 77.18, 28.67, 77.26),
    "ED": (28.60, 77.27, 28.67, 77.34),
    "ND": (28.59, 77.17, 28.64, 77.22),
    "NDE": (28.69, 77.18, 28.82, 77.26),
    "NED": (28.68, 77.27, 28.82, 77.36),
    "NWD": (28.68, 77.08, 28.82, 77.20),
    "SHA": (28.64, 77.27, 28.70, 77.34),
    "SD": (28.48, 77.16, 28.59, 77.26),
    "SED": (28.50, 77.26, 28.60, 77.34),
    "SWD": (28.48, 76.90, 28.60, 77.16),
    "WD": (28.60, 77.05, 28.69, 77.18),
}


def rand_latng(district_code: str) -> tuple[float, float]:
    bounds = DISTRICT_BOUNDS.get(district_code, (28.55, 77.15, 28.70, 77.25))
    lat = round(random.uniform(bounds[0], bounds[2]), 6)
    lng = round(random.uniform(bounds[1], bounds[3]), 6)
    return lat, lng


def make_tracking_id(n: int) -> str:
    return f"DCOS-{datetime.now(UTC).strftime('%Y%m%d')}-{n:06d}"


def make_complaint_text(category: str, district_code: str) -> str:
    tmpl = random.choice(COMPLAINT_TEMPLATES)
    return tmpl.format(
        category=category,
        location_hint=random.choice(LOCATION_HINTS),
        days=random.randint(1, 30),
    )


# ── Seed runner ───────────────────────────────────────────────────────────────


async def seed() -> None:
    print(f"Connecting to: {DATABASE_URL}")
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        async with conn.transaction():
            print("Seeding districts…")
            district_ids: dict[str, str] = {}
            for name, code in DISTRICTS:
                did = str(uuid.uuid4())
                district_ids[code] = did
                await conn.execute(
                    "INSERT INTO districts (id, name, code) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                    did,
                    name,
                    code,
                )

            print("Seeding zones…")
            zone_ids: dict[str, str] = {}
            for name, code, district_code in ZONES:
                zid = str(uuid.uuid4())
                zone_ids[code] = zid
                await conn.execute(
                    "INSERT INTO zones (id, name, code, district_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                    zid,
                    name,
                    code,
                    district_ids[district_code],
                )

            print("Seeding assembly constituencies…")
            for number, name, district_code in ACS:
                await conn.execute(
                    "INSERT INTO assembly_constituencies (id, name, number, district_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                    str(uuid.uuid4()),
                    name,
                    number,
                    district_ids[district_code],
                )

            print("Seeding 272 wards…")
            ward_ids: list[tuple[str, str]] = []  # (ward_id, district_code)
            zone_list = list(zone_ids.values())
            {zid: ZONES[i][2] for i, zid in enumerate(zone_list)}

            for ward_num in range(1, 273):
                zone_code = ZONES[ward_num % len(ZONES)][1]
                zone_id = zone_ids[zone_code]
                district_code = ZONES[ward_num % len(ZONES)][2]
                district_id = district_ids[district_code]
                lat, lng = rand_latng(district_code)
                ward_name = WARD_NAMES.get(ward_num, f"Ward {ward_num}")
                wid = str(uuid.uuid4())
                ward_ids.append((wid, district_code))
                await conn.execute(
                    """INSERT INTO wards (id, name, number, zone_id, district_id, centroid_lat, centroid_lng)
                       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING""",
                    wid,
                    ward_name,
                    ward_num,
                    zone_id,
                    district_id,
                    lat,
                    lng,
                )

            print("Seeding departments…")
            dept_ids: dict[str, str] = {}
            for name, code, desc in DEPARTMENTS:
                did = str(uuid.uuid4())
                dept_ids[code] = did
                await conn.execute(
                    """INSERT INTO departments (id, name, short_code, description)
                       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING""",
                    did,
                    name,
                    code,
                    desc,
                )

            print("Seeding SLA policies…")
            sla_matrix = {
                "CRITICAL": (4, 2),
                "HIGH": (24, 8),
                "MEDIUM": (72, 24),
                "LOW": (168, 48),
            }
            for _dept_code, dept_id in dept_ids.items():
                for priority, (resolution_h, escalation_h) in sla_matrix.items():
                    await conn.execute(
                        """INSERT INTO sla_policies
                           (id, department_id, priority, resolution_hours, first_escalation_hours)
                           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING""",
                        str(uuid.uuid4()),
                        dept_id,
                        priority,
                        resolution_h,
                        escalation_h,
                    )

            print("Seeding users and officers…")
            officer_ids: dict[str, list[str]] = {}  # dept_code → [officer_user_ids]
            for dept_code, dept_id in dept_ids.items():
                officer_ids[dept_code] = []
                for i in range(3):
                    uid = str(uuid.uuid4())
                    oid = str(uuid.uuid4())
                    emp_id = f"{dept_code}-{i + 1:04d}"
                    await conn.execute(
                        """INSERT INTO users (id, name, email, role, language_pref)
                           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING""",
                        uid,
                        f"Officer {dept_code}-{i + 1}",
                        f"officer.{dept_code.lower()}.{i + 1}@dcos.delhi.gov.in",
                        "field_officer",
                        "hi",
                    )
                    await conn.execute(
                        """INSERT INTO officers (id, user_id, department_id, designation, employee_id)
                           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING""",
                        oid,
                        uid,
                        dept_id,
                        f"Junior Engineer / Inspector ({dept_code})",
                        emp_id,
                    )
                    officer_ids[dept_code].append(oid)

            # Citizen users
            citizen_uids: list[str] = []
            for i in range(50):
                cuid = str(uuid.uuid4())
                citizen_uids.append(cuid)
                await conn.execute(
                    """INSERT INTO users (id, name, phone, role, language_pref)
                       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING""",
                    cuid,
                    f"Citizen {i + 1:03d}",
                    f"+91987654{i:04d}",
                    "citizen",
                    random.choice(["hi", "en", "pa"]),
                )

            print("Seeding 520 grievances…")
            dept_codes = list(dept_ids.keys())
            now = datetime.now(UTC)

            for n in range(1, 521):
                dept_code = random.choice(dept_codes)
                dept_id = dept_ids[dept_code]
                category = random.choice(CATEGORIES[dept_code])
                status = random.choice(STATUSES_WEIGHTED)
                priority = random.choice(PRIORITIES_WEIGHTED)
                ward_id, district_code = random.choice(ward_ids)
                lat, lng = rand_latng(district_code)
                citizen_id = random.choice(citizen_uids) if random.random() > 0.15 else None
                channel = random.choice(["web", "whatsapp", "web", "web", "api"])
                days_ago = random.randint(0, 90)
                created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                severity = random.randint(10, 95)
                tracking_id = make_tracking_id(n)

                # Assign officer for non-RECEIVED/CLASSIFIED statuses
                officer_id: str | None = None
                if status not in ("RECEIVED", "CLASSIFIED", "REJECTED_SPAM"):
                    officer_id = random.choice(officer_ids[dept_code])

                # SLA due date
                sla_h = sla_matrix.get(priority, (72, 24))[0]
                sla_due = created_at + timedelta(hours=sla_h)
                closed_at = None
                if status in ("CLOSED", "REJECTED_SPAM"):
                    closed_at = created_at + timedelta(hours=random.randint(2, sla_h * 2))

                raw_text = make_complaint_text(category, district_code)

                gid = str(uuid.uuid4())
                await conn.execute(
                    """INSERT INTO grievances (
                        id, tracking_id, citizen_id, channel, raw_text, language,
                        category, severity, department_id, assigned_officer_id,
                        status, priority, ward_id, latitude, longitude,
                        sla_due_at, is_anonymous, created_at, updated_at, closed_at,
                        ai_confidence, spam_score
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                        $16,$17,$18,$19,$20,$21,$22
                    )""",
                    gid,
                    tracking_id,
                    citizen_id,
                    channel,
                    raw_text,
                    random.choice(["hi", "en", "hi", "en", "pa"]),
                    category,
                    severity,
                    dept_id,
                    officer_id,
                    status,
                    priority,
                    ward_id,
                    lat,
                    lng,
                    sla_due,
                    citizen_id is None,
                    created_at,
                    created_at,
                    closed_at,
                    round(random.uniform(0.6, 0.98), 2),
                    round(random.uniform(0.01, 0.15), 2),
                )

                # Status event chain
                transitions = {
                    "RECEIVED": ["RECEIVED"],
                    "CLASSIFIED": ["RECEIVED", "CLASSIFIED"],
                    "ASSIGNED": ["RECEIVED", "CLASSIFIED", "ASSIGNED"],
                    "IN_PROGRESS": ["RECEIVED", "CLASSIFIED", "ASSIGNED", "IN_PROGRESS"],
                    "ACTION_TAKEN": [
                        "RECEIVED",
                        "CLASSIFIED",
                        "ASSIGNED",
                        "IN_PROGRESS",
                        "ACTION_TAKEN",
                    ],
                    "RESOLVED": [
                        "RECEIVED",
                        "CLASSIFIED",
                        "ASSIGNED",
                        "IN_PROGRESS",
                        "ACTION_TAKEN",
                        "RESOLVED",
                    ],
                    "VERIFIED": [
                        "RECEIVED",
                        "CLASSIFIED",
                        "ASSIGNED",
                        "IN_PROGRESS",
                        "ACTION_TAKEN",
                        "RESOLVED",
                        "VERIFIED",
                    ],
                    "CLOSED": [
                        "RECEIVED",
                        "CLASSIFIED",
                        "ASSIGNED",
                        "IN_PROGRESS",
                        "ACTION_TAKEN",
                        "RESOLVED",
                        "VERIFIED",
                        "CLOSED",
                    ],
                    "ESCALATED": ["RECEIVED", "CLASSIFIED", "ASSIGNED", "ESCALATED"],
                    "REOPENED": [
                        "RECEIVED",
                        "CLASSIFIED",
                        "ASSIGNED",
                        "IN_PROGRESS",
                        "ACTION_TAKEN",
                        "RESOLVED",
                        "REOPENED",
                    ],
                    "REJECTED_SPAM": ["RECEIVED", "REJECTED_SPAM"],
                }
                chain = transitions.get(status, ["RECEIVED"])
                prev = None
                for i, s in enumerate(chain):
                    event_ts = created_at + timedelta(hours=i * random.randint(1, 12))
                    await conn.execute(
                        """INSERT INTO status_events (id, grievance_id, from_status, to_status, actor_id, ts)
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        str(uuid.uuid4()),
                        gid,
                        prev,
                        s,
                        officer_id or "system",
                        event_ts,
                    )
                    prev = s

            # Add 20 grievances with synthetic embeddings for vector query testing
            print("Seeding 20 grievances with embeddings for vector test…")
            for n in range(521, 541):
                dept_code = "MCD"
                dept_id = dept_ids[dept_code]
                ward_id, district_code = random.choice(ward_ids)
                lat, lng = rand_latng(district_code)
                embedding = [round(random.gauss(0, 0.1), 6) for _ in range(768)]
                gid = str(uuid.uuid4())
                tracking_id = make_tracking_id(n)
                await conn.execute(
                    """INSERT INTO grievances (
                        id, tracking_id, channel, raw_text, language,
                        category, severity, department_id, status, priority,
                        ward_id, latitude, longitude, embedding,
                        sla_due_at, created_at, updated_at
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                        $14::vector,$15,$16,$17
                    )""",
                    gid,
                    tracking_id,
                    "web",
                    f"Pothole near main market causing accidents. Urgent repair needed. (vector-test-{n})",
                    "hi",
                    "Pothole / Road Damage",
                    random.randint(40, 90),
                    dept_id,
                    "ASSIGNED",
                    "HIGH",
                    ward_id,
                    lat,
                    lng,
                    json.dumps(embedding),
                    now + timedelta(hours=24),
                    now,
                    now,
                )

            print("Done! Summary:")
            counts = await conn.fetch("""
                SELECT 'districts' AS t, COUNT(*) FROM districts UNION ALL
                SELECT 'zones', COUNT(*) FROM zones UNION ALL
                SELECT 'wards', COUNT(*) FROM wards UNION ALL
                SELECT 'departments', COUNT(*) FROM departments UNION ALL
                SELECT 'users', COUNT(*) FROM users UNION ALL
                SELECT 'officers', COUNT(*) FROM officers UNION ALL
                SELECT 'grievances', COUNT(*) FROM grievances UNION ALL
                SELECT 'status_events', COUNT(*) FROM status_events
            """)
            for row in counts:
                print(f"  {row['t']:20s} {row['count']}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
