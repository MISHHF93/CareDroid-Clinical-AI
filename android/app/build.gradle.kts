// Kotlin DSL replacement for app/build.gradle
// Compose, Hilt, Room, Retrofit, Accompanist, DataStore removed — quarantined to _deprecated-kotlin/.
// Capacitor WebView shell only: BridgeActivity + minimal AndroidX.

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // id("com.google.gms.google-services") // restore after google-services.json is provisioned
}

android {
    namespace = "com.caredroid.clinical"
    compileSdk = rootProject.extra["compileSdkVersion"] as Int

    val apiBaseUrl: String =
        project.findProperty("API_BASE_URL") as String?
            ?: System.getenv("API_BASE_URL")
            ?: "http://10.0.2.2:3000/"

    val keystorePropertiesFile = rootProject.file("app/keystore.properties")
    val keystoreProperties = java.util.Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
    }

    defaultConfig {
        applicationId = "com.caredroid.clinical"
        minSdk = rootProject.extra["minSdkVersion"] as Int
        targetSdk = rootProject.extra["targetSdkVersion"] as Int
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
    }

    if (keystorePropertiesFile.exists()) {
        signingConfigs {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
            isDebuggable = false
        }
        debug {
            isMinifyEnabled = false
            isDebuggable = true
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

// Capacitor-generated dependency and compile-options extensions (auto-updated by `cap sync`)
apply(from = "../capacitor.build.gradle")

dependencies {
    // Capacitor WebView bridge
    implementation(project(":capacitor-android"))
    implementation(fileTree(mapOf("include" to listOf("*.jar"), "dir" to "libs")))

    // Minimal AndroidX required by BridgeActivity
    implementation("androidx.core:core-ktx:${rootProject.extra["androidxCoreVersion"]}")
    implementation("androidx.appcompat:appcompat:${rootProject.extra["androidxAppCompatVersion"]}")

    // Testing
    testImplementation("junit:junit:${rootProject.extra["junitVersion"]}")
    androidTestImplementation("androidx.test.ext:junit:${rootProject.extra["androidxJunitVersion"]}")
    androidTestImplementation("androidx.test.espresso:espresso-core:${rootProject.extra["androidxEspressoCoreVersion"]}")
}
