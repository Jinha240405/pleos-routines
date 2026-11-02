plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "dev.pleoslab"
    compileSdk = 35
    useLibrary("android.car")
    defaultConfig {
        applicationId = "dev.pleoslab"
        minSdk = 28
        targetSdk = 34
        versionCode = 6
        versionName = "0.5.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
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
