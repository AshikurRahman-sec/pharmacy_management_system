import csv
import os
import sys

# Ensure sqlalchemy and psycopg2 are installed: pip install sqlalchemy psycopg2-binary
try:
    from sqlalchemy import create_engine, Column, Integer, String, Float, Date
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("Error: Required libraries not found. Please run: pip install sqlalchemy psycopg2-binary")
    sys.exit(1)

# --- CONFIGURATION ---
# Since your DB is in Docker and mapped to 5433 on your host:
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DB_URL = "postgresql://user:password@localhost:5433/pharmacy"
CSV_FILE = "bd_medicines_page_2_to_2.csv" 

# --- DATABASE MODEL (Self-Contained) ---
Base = declarative_base()

class Medicine(Base):
    __tablename__ = "medicines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    generic_name = Column(String, index=True)
    manufacturer = Column(String, index=True)
    strength = Column(String)
    medicine_type = Column(String)
    stock_quantity = Column(Integer, default=0)
    purchase_price = Column(Float)
    selling_price = Column(Float)
    purchase_date = Column(Date, nullable=True)

# --- IMPORT LOGIC ---
def run_import():
    # 1. Detect CSV Location
    file_path = CSV_FILE
    if not os.path.exists(file_path):
        # Try look in current directory if parent fails
        file_path = "bd_medicines_page_2_to_2.csv"
        if not os.path.exists(file_path):
            print(f"Error: Could not find CSV file at {CSV_FILE} or current directory.")
            return

    # 2. Setup DB Connection
    print(f"Connecting to database at {DB_URL}...")
    try:
        engine = create_engine(DB_URL)
        # Test connection immediately
        engine.connect()
    except Exception as e:
        print(f"\nCONNECTION ERROR: {e}")
        print("\nPossible fixes:")
        print("1. Ensure your Docker containers are running: 'docker-compose up -d'")
        print("2. Ensure port 5433 is correctly mapped in docker-compose.yml")
        print("3. Check if username/password/dbname in the script matches your .env file")
        return

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print(f"Reading data from {file_path}...")
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            skipped = 0
            
            for row in reader:
                name = row.get('medicine_name', '').strip()
                strength = row.get('strength', '').strip()
                m_type = row.get('type', '').strip()
                
                if not name: continue

                # Mrp is selling price
                try:
                    mrp = float(row.get('mrp', 0))
                except:
                    mrp = 0.0

                # Check if exact variant exists to avoid duplicates
                exists = db.query(Medicine).filter(
                    Medicine.name == name,
                    Medicine.strength == strength,
                    Medicine.medicine_type == m_type
                ).first()

                if exists:
                    skipped += 1
                    continue

                new_med = Medicine(
                    name=name,
                    generic_name=row.get('generic_name', ''),
                    manufacturer=row.get('manufacturer', ''),
                    strength=strength,
                    medicine_type=m_type,
                    selling_price=mrp,
                    purchase_price=round(mrp * 0.88, 2), # Defaulting to 12% margin
                    stock_quantity=0
                )
                db.add(new_med)
                count += 1
                
                # Commit in batches of 50
                if count % 50 == 0:
                    db.commit()
                    print(f"Imported {count} items...")
            
            db.commit()
            print(f"\nSUCCESS!")
            print(f"-------------------------")
            print(f"- Added to Database: {count} new medicines")
            print(f"- Skipped:           {skipped} (already exist)")
            print(f"-------------------------")

    except Exception as e:
        print(f"FATAL ERROR during data processing: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_import()
