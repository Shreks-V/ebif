"""
Migration: Merge PRE_REGISTRO into PACIENTE.
Adds ESTATUS_REGISTRO and PASO_ACTUAL columns to PACIENTE, then drops PRE_REGISTRO.
"""
import sys
sys.path.insert(0, ".")

from app.core.database import get_db

STATEMENTS = [
    # Add ESTATUS_REGISTRO column (PENDIENTE / APROBADO / RECHAZADO)
    # Default APROBADO for existing records (they're already accepted beneficiarios)
    "ALTER TABLE PACIENTE ADD (ESTATUS_REGISTRO VARCHAR2(20) DEFAULT 'APROBADO')",

    # Add PASO_ACTUAL for multi-step form tracking
    "ALTER TABLE PACIENTE ADD (PASO_ACTUAL NUMBER DEFAULT 1)",

    # Update any NULL values to APROBADO (existing patients)
    "UPDATE PACIENTE SET ESTATUS_REGISTRO = 'APROBADO' WHERE ESTATUS_REGISTRO IS NULL",

    # Drop the orphan table
    "DROP TABLE PRE_REGISTRO",
]

def main():
    with get_db() as conn:
        cursor = conn.cursor()
        for stmt in STATEMENTS:
            try:
                print(f"Executing: {stmt[:60]}...")
                cursor.execute(stmt)
                print("  OK")
            except Exception as e:
                err_msg = str(e)
                # Skip if column already exists or table doesn't exist
                if "ORA-01430" in err_msg:  # column already added
                    print(f"  SKIP (column already exists)")
                elif "ORA-00942" in err_msg:  # table doesn't exist
                    print(f"  SKIP (table does not exist)")
                else:
                    print(f"  ERROR: {e}")
                    raise
        conn.commit()
        print("\nMigration complete!")

if __name__ == "__main__":
    main()
