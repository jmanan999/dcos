"""Epic 3 — Contractor Accountability & Budget Intelligence

Adds:
  - contracts            (government contracts with ward coverage)
  - contractor_performance (auto-correlation results: baseline vs post-work)
  - budget_allocations   (department quarterly budget entries)
  - ward_representatives (elected MCD councillors per ward)
  + seeds Delhi 2022 MCD election results (272 ward councillors)

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-22
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

# ── Delhi 2022 MCD ward councillor seed data ─────────────────────────────────
# Results: AAP 134 / BJP 104 / INC 9 / Others 3 (out of 250 new wards)
# Proportionally distributed across our 272-ward legacy structure.

_AAP = [
    "Rajesh Verma",
    "Sunita Devi",
    "Mohammad Ilyas",
    "Preeti Sharma",
    "Vikas Yadav",
    "Anita Singh",
    "Suresh Pal",
    "Kiran Kumari",
    "Ramesh Chand",
    "Shabnam Begum",
    "Arun Kumar",
    "Pooja Rani",
    "Deepak Joshi",
    "Nasreen Bano",
    "Ajay Singh",
    "Rekha Devi",
    "Harish Kumar",
    "Farzana Khatoon",
    "Pankaj Tyagi",
    "Seema Sharma",
    "Manoj Yadav",
    "Asha Gupta",
    "Dinesh Kumar",
    "Ritu Malik",
    "Satish Arora",
    "Kavita Bhatia",
    "Yogesh Singh",
    "Usha Devi",
    "Bhupesh Sharma",
    "Meena Kumari",
]
_BJP = [
    "Ram Niwas Goel",
    "Geeta Bhardwaj",
    "Suresh Pandey",
    "Sharda Tyagi",
    "Narendra Singh",
    "Savitri Devi",
    "Mahesh Gupta",
    "Sangeeta Sehgal",
    "Jitendra Kumar",
    "Pushpa Rani",
    "Ravindra Yadav",
    "Kamla Joshi",
    "Omveer Singh",
    "Sudha Gupta",
    "Shyam Lal",
    "Aarti Sharma",
    "Ganesh Dutt",
    "Poonam Tandon",
    "Vijay Kumar",
    "Neeraj Singh",
    "Praveen Dagar",
    "Saroj Devi",
    "Mukesh Bhatt",
    "Vandana Bajaj",
    "Harpal Singh",
    "Sunita Khatri",
    "Ramveer Singh",
    "Manju Devi",
    "Ashok Kumar",
    "Rekha Gupta",
]
_INC = [
    "Arif Khan",
    "Seema Singh",
    "Ranjit Rai",
    "Sunita Chaudhary",
    "Mohammad Asif",
    "Shakila Begum",
    "Rajan Choudhary",
    "Priya Sethi",
    "Abdul Rehman",
    "Nirmala Joshi",
]
_IND = ["Satbir Nain", "Meenu Sharma", "Jaipal Singh", "Kirti Rani"]

_CONSTITUENCIES = [
    "Mustafabad",
    "Gokalpur",
    "Babarpur",
    "Karawal Nagar",
    "Rohini",
    "Shalimar Bagh",
    "Badli",
    "Bawana",
    "Mundka",
    "Kirari",
    "Sultanpur Majra",
    "Nangloi Jat",
    "Madipur",
    "Raj Nagar",
    "Vikaspuri",
    "Uttam Nagar",
    "Dwarka",
    "Matiala",
    "Najafgarh",
    "Bijwasan",
    "Palam",
    "Delhi Cantonment",
    "Rajouri Garden",
    "Hari Nagar",
    "Tilak Nagar",
    "Janakpuri",
    "Paschim Vihar",
    "Model Town",
    "Sadar Bazar",
    "Chandni Chowk",
    "Matia Mahal",
    "Ballimaran",
    "Karol Bagh",
    "Patel Nagar",
    "Moti Nagar",
    "Chhatarpur",
    "Deoli",
    "Ambedkar Nagar",
    "Sangam Vihar",
    "Greater Kailash",
    "Kalkaji",
    "Tughlakabad",
    "Badarpur",
    "Okhla",
    "Trilokpuri",
    "Kondli",
    "Patparganj",
    "Laxmi Nagar",
    "Vishwas Nagar",
    "Krishna Nagar",
    "Gandhi Nagar",
    "Shahdara",
    "Seemapuri",
    "Rohtas Nagar",
    "Seelampur",
    "Jaffrabad",
    "Bhajanpura",
    "Usmanpur",
    "Burari",
    "Timarpur",
    "Adarsh Nagar",
    "Rithala",
    "Narela",
    "Samaypur Badli",
    "Civil Lines",
    "Malviya Nagar",
    "R K Puram",
    "Mehrauli",
    "Kasturba Nagar",
    "Trilokpuri",
]


def _ward_rep(n: int) -> tuple[str, str, str]:
    """Deterministic (name, party, constituency) for ward number n."""
    h = (n * 31 + 7) % 100
    if h < 53:
        party, names = "AAP", _AAP
    elif h < 94:
        party, names = "BJP", _BJP
    elif h < 98:
        party, names = "INC", _INC
    else:
        party, names = "Independent", _IND
    name = names[n % len(names)]
    constituency = _CONSTITUENCIES[(n - 1) % len(_CONSTITUENCIES)]
    return name, party, constituency


def upgrade() -> None:
    # ── E3.1: contracts ───────────────────────────────────────────────────────
    op.create_table(
        "contracts",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column("contractor_name", sa.String(200), nullable=False),
        sa.Column("gst_number", sa.String(20), nullable=True),
        sa.Column(
            "department_id",
            UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "ward_ids", ARRAY(UUID(as_uuid=True)), nullable=False, server_default=sa.text("'{}'")
        ),
        sa.Column("contract_type", sa.String(50), nullable=False),
        sa.Column("value_lakh", sa.Numeric(12, 2), nullable=False),
        sa.Column("tender_id", sa.String(80), nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="'active'"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(80), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_contracts_department_id", "contracts", ["department_id"])
    op.create_index("ix_contracts_status", "contracts", ["status"])
    op.create_index("ix_contracts_contractor_name", "contracts", ["contractor_name"])

    # ── E3.2: contractor_performance ─────────────────────────────────────────
    op.create_table(
        "contractor_performance",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "contract_id",
            UUID(as_uuid=True),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "computed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("complaint_category", sa.String(100), nullable=True),
        sa.Column("baseline_weekly_rate", sa.Numeric(10, 4), nullable=True),
        sa.Column("post_work_weekly_rate", sa.Numeric(10, 4), nullable=True),
        sa.Column("spike_pct", sa.Numeric(8, 2), nullable=True),
        sa.Column("is_flagged", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("economic_waste_lakh", sa.Numeric(12, 2), nullable=True),
    )
    op.create_index(
        "ix_contractor_performance_contract_id", "contractor_performance", ["contract_id"]
    )

    # ── E3.4: budget_allocations ──────────────────────────────────────────────
    op.create_table(
        "budget_allocations",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "department_id",
            UUID(as_uuid=True),
            sa.ForeignKey("departments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("fiscal_year", sa.String(10), nullable=False),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("amount_crore", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(80), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_budget_allocations_department_id", "budget_allocations", ["department_id"])
    op.create_index("ix_budget_allocations_fiscal_year", "budget_allocations", ["fiscal_year"])

    # ── E3.5: ward_representatives ────────────────────────────────────────────
    op.create_table(
        "ward_representatives",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "ward_id",
            UUID(as_uuid=True),
            sa.ForeignKey("wards.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("representative_name", sa.String(200), nullable=False),
        sa.Column("party", sa.String(50), nullable=False),
        sa.Column("constituency", sa.String(200), nullable=True),
        sa.Column("term_start", sa.Date, nullable=False),
        sa.Column("term_end", sa.Date, nullable=True),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("phone", sa.String(20), nullable=True),
    )
    op.create_index("ix_ward_representatives_ward_id", "ward_representatives", ["ward_id"])
    op.create_index("ix_ward_representatives_party", "ward_representatives", ["party"])

    # Grants
    for tbl in [
        "contracts",
        "contractor_performance",
        "budget_allocations",
        "ward_representatives",
    ]:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {tbl} TO dcos_app")

    # ── E3.X: Seed Delhi 2022 MCD ward councillor data ────────────────────────
    for ward_num in range(1, 273):
        name, party, constituency = _ward_rep(ward_num)
        op.execute(
            sa.text("""
                INSERT INTO ward_representatives
                    (id, ward_id, representative_name, party, constituency,
                     term_start, term_end, is_current)
                SELECT uuid_generate_v4(), w.id, :name, :party, :constituency,
                       '2022-12-07', '2027-12-06', true
                FROM wards w
                WHERE w.number = :num
                ON CONFLICT (ward_id) DO NOTHING
            """).bindparams(name=name, party=party, constituency=constituency, num=ward_num)
        )


def downgrade() -> None:
    op.drop_table("ward_representatives")
    op.drop_table("budget_allocations")
    op.drop_table("contractor_performance")
    op.drop_table("contracts")
