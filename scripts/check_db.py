import os
os.environ['DATABASE_URL'] = 'sqlite:///./trade_opportunities_v2.db'

from app.database import SessionLocal, Analysis, User

db = SessionLocal()
try:
    analyses = db.query(Analysis).all()
    print(f"Analyses found: {len(analyses)}")
    for a in analyses[:3]:
        print(f"  ID={a.id}, sector={a.sector}, user_id={a.user_id}")
    
    users = db.query(User).all()
    print(f"\nUsers found: {len(users)}")
    for u in users:
        print(f"  ID={u.id}, email={u.email}, tier={u.tier}, analysis_count={u.analysis_count_month}")
finally:
    db.close()
