import os
import shutil

# Dossier à exclure
folder = "src/app/dashboard/messages/[id]"
backup_dir = "src/app/_dashboard_backup/messages_[id]"

if os.path.exists(folder):
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)
    os.makedirs(os.path.dirname(backup_dir), exist_ok=True)
    shutil.move(folder, backup_dir)
    print(f"Déplacé : {folder} -> {backup_dir}")
else:
    print(f"Non trouvé : {folder}")

# Créer un script de restauration
restore = """import os
import shutil

folder = "src/app/dashboard/messages/[id]"
backup_dir = "src/app/_dashboard_backup/messages_[id]"

if os.path.exists(backup_dir):
    if os.path.exists(folder):
        shutil.rmtree(folder)
    shutil.move(backup_dir, folder)
    print(f"Restauré : {folder}")
"""
with open("restore_messages.py", "w") as f:
    f.write(restore)
print("Script de restauration créé.")
