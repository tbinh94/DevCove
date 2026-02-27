import psycopg2
try:
    conn = psycopg2.connect("postgresql://neondb_owner:npg_tSTPl5GNWIw9@ep-delicate-forest-a17kaugt-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
    print("Connection successful!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(cur.fetchone())
    cur.close()
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
