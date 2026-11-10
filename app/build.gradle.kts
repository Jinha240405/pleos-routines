plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
val releaseKeystore = providers.environmentVariable("ROUTINE_KEYSTORE").orNull
val releaseStorePassword = providers.environmentVariable("ROUTINE_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("ROUTINE_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("ROUTINE_KEY_PASSWORD").orNull
val hasReleaseSigning = listOf(releaseKeystore, releaseStorePassword, releaseKeyAlias, releaseKeyPassword)
    .all { !it.isNullOrBlank() }

android {
    namespace = "dev.pleoslab"
    compileSdk = 35
    useLibrary("android.car")
    defaultConfig {
        applicationId = "dev.pleoslab"
        minSdk = 28
        targetSdk = 34
        versionCode = 8
        versionName = "0.6.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
    signingConfigs {
        if (hasReleaseSigning) {
            create("submission") {
                storeFile = file(releaseKeystore!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }
    buildTypes {
        getByName("debug") { buildConfigField("String", "COMMUNITY_URL", "\"http://10.0.2.2:8787\"") }
        getByName("release") {
            isDebuggable = false
            signingConfig = signingConfigs.findByName("submission")
            buildConfigField("String", "COMMUNITY_URL", "\"\"")
        }
    }
}
val validateReleaseSigning by tasks.registering {
    doLast {
        check(hasReleaseSigning) {
            "Release signing requires ROUTINE_KEYSTORE, ROUTINE_STORE_PASSWORD, ROUTINE_KEY_ALIAS and ROUTINE_KEY_PASSWORD. See docs/RELEASE.md."
        }
        check(file(releaseKeystore!!).isFile) { "ROUTINE_KEYSTORE must point to an existing signing keystore." }
    }
}
tasks.matching { it.name == "preReleaseBuild" }.configureEach { dependsOn(validateReleaseSigning) }

dependencies {
    implementation("ai.pleos.playground:Vehicle:2.3.2")
    implementation("ai.pleos.playground:NaviHelper:3.0.5")
    implementation("ai.pleos.playground:FusedLocation:1.1.3")
    implementation("ai.pleos.playground:SpeechToText:3.3.1")
    implementation("ai.pleos.playground:TextToSpeech:3.3.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}

val buildEditor by tasks.registering(Exec::class) {
    workingDir(rootProject.projectDir)
    inputs.dir(rootProject.file("web"))
    inputs.file(rootProject.file("package-lock.json"))
    inputs.file(rootProject.file("vite.config.js"))
    inputs.file(rootProject.file("scripts/prepare-web.mjs"))
    inputs.file(rootProject.file("scripts/generate-api-catalog.mjs"))
    inputs.file(rootProject.file("scripts/connect-catalog.mjs"))
    inputs.dir(rootProject.file("sdk"))
    outputs.dir(layout.projectDirectory.dir("src/main/assets/editor"))
    if (System.getProperty("os.name").startsWith("Windows")) {
        commandLine("cmd", "/c", "npm", "run", "build")
    } else {
        commandLine("npm", "run", "build")
    }
}
tasks.named("preBuild") { dependsOn(buildEditor) }
