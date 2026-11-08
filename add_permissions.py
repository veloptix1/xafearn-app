file_path = "android/app/src/main/AndroidManifest.xml"

with open(file_path, "r") as f:
    content = f.read()

# Vérifier si les permissions sont déjà là
if "android.permission.CAMERA" in content:
    print("✅ Les permissions sont déjà présentes.")
else:
    # Ajouter les permissions avant la balise </manifest>
    permissions = """
    <!-- Permissions Caméra -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <!-- Permissions Micro -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    
    <!-- Permissions Notifications Push -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Permissions Réseau -->
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
</manifest>"""
    
    content = content.replace("</manifest>", permissions)
    
    with open(file_path, "w") as f:
        f.write(content)
    print("✅ Permissions ajoutées avec succès.")
