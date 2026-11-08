file_path = ".github/workflows/build-apk.yml"

with open(file_path, "r") as f:
    content = f.read()

# 1. Remplacer "npm install" par "npm install @capacitor/share"
old_install = "        run: npm install\n"
new_install = "        run: npm install @capacitor/share\n"

if old_install in content:
    content = content.replace(old_install, new_install)
    print("✅ Commande d'installation mise à jour.")
else:
    print("⚠️ La ligne 'run: npm install' n'a pas été trouvée.")

# 2. Ajouter le script python pour exclure messages/[id]
# On l'ajoute juste avant "Build Next.js static"
old_build = "      - name: Build Next.js static"
new_build = """      - name: Exclude dynamic pages from build
        run: python3 fix_messages_build.py

      - name: Build Next.js static"""

if old_build in content:
    content = content.replace(old_build, new_build, 1)
    print("✅ Étape d'exclusion ajoutée.")
else:
    print("⚠️ Impossible d'ajouter l'étape d'exclusion.")

with open(file_path, "w") as f:
    f.write(content)

print("\n✅ Fichier workflow mis à jour.")
