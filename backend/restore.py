import subprocess
import os

def restore_postgres_db(host, port, dbname, user, password, dump_file):
    command = [
        "pg_restore",
        f"-h{host}",
        f"-p{port}",
        f"-U{user}",
        "-d", dbname,
        "-v",             # verbose
        "--clean",        # drop existing objects
        dump_file
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = password

    print("Running:", " ".join(command))
    try:
        subprocess.run(command, env=env, check=True)
        print("✔ Restore completed successfully.")
    except subprocess.CalledProcessError as e:
        print("❌ Error during restore:", e)

if __name__ == "__main__":
    HOST = "localhost"
    PORT = 5432
    DBNAME = "DevCove"
    USER = "tbinh"
    PASSWORD = "123456"
    DUMP_FILE = "backups\DevCove_20250819_065345.dump"

    restore_postgres_db(HOST, PORT, DBNAME, USER, PASSWORD, DUMP_FILE)
