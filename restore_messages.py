import os
import shutil

folder = "src/app/dashboard/messages/[id]"
backup_dir = "src/app/_dashboard_backup/messages_[id]"

if os.path.exists(backup_dir):
    if os.path.exists(folder):
        shutil.rmtree(folder)
    shutil.move(backup_dir, folder)
    print(f"Restauré : {folder}")
