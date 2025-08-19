# File để backup dữ liệu db
# Cách dùng: chạy cmd và gõ 
# pg_restore -h localhost -p 5432 -U postgres -d DevCove -v --clean "full_path_to_file.dump"

import subprocess
import datetime
import os

def backup_postgres_db(host, port, dbname, user, password, output_folder="./backups"):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_folder, f"{dbname}_{timestamp}.dump")

    command = [
        "pg_dump",
        f"-h{host}",
        f"-p{port}",
        f"-U{user}",
        "-F", "c",      # custom format .dump
        "-b",           # include blobs
        "-v",           # verbose
        "-f", output_file,
        dbname
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = password

    print("Running:", " ".join(command))
    try:
        subprocess.run(command, env=env, check=True)
        print("✔ Backup successfully created at:", output_file)
        return output_file
    except subprocess.CalledProcessError as e:
        print("❌ Error during backup:", e)
        return None

if __name__ == "__main__":
    HOST = "localhost"
    PORT = 5432
    DBNAME = "DevCove"
    USER = "tbinh"
    PASSWORD = "123456"

    backup_postgres_db(HOST, PORT, DBNAME, USER, PASSWORD)
