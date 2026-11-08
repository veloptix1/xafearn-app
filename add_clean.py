file_path = ".github/workflows/build-apk.yml"

with open(file_path, "r") as f:
    content = f.read()

# Vérifier si le clean est déjà là
if "Clean Gradle Cache" in content:
    print("✅ L'étape Clean est déjà présente.")
else:
    old_build = """      - name: Build Debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug"""

    new_build = """      - name: Clean Gradle Cache
        run: |
          cd android
          ./gradlew clean

      - name: Build Debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug"""

    if old_build in content:
        content = content.replace(old_build, new_build)
        with open(file_path, "w") as f:
            f.write(content)
        print("✅ Étape Clean ajoutée.")
    else:
        print("⚠️ Impossible de trouver l'étape Build Debug APK.")
